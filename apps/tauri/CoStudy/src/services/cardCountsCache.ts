/**
 * 卡片计数缓存服务 - iOS 14 优化版
 * 
 * 优化策略：
 * 1. 批量查询：一次API调用获取所有需要的计数
 * 2. 智能缓存：不同类型数据使用不同缓存时间
 * 3. 增量更新：只更新变化的数据
 * 4. 降级处理：网络失败时返回缓存数据
 */

import type { CardRow, FsrsState } from '@make-gold/lib/schema'

interface CardCounts {
  new: number
  learning: number
  review: number
  total: number
}

interface DeckCountsSummary {
  [deckId: string]: CardCounts
}

interface CacheMetadata {
  timestamp: number
  totalCount: number
  lastModified?: string
}

class CardCountsCache {
  private cache = new Map<string, { data: CardCounts; metadata: CacheMetadata }>()
  private supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  private supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  private requestQueue = new Map<string, Promise<CardCounts>>()

  /**
   * 批量获取多个deck的卡片计数
   * 这是iOS 14用户的主要入口点
   */
  async getBatchCardCounts(deckIds: string[]): Promise<DeckCountsSummary> {
    const results: DeckCountsSummary = {}
    const toFetch: string[] = []
    const now = Date.now()

    // 检查缓存，找出需要重新获取的deck
    for (const deckId of deckIds) {
      const cached = this.cache.get(deckId)
      const isExpired = !cached || (now - cached.metadata.timestamp > 3 * 60 * 1000) // 3分钟过期
      
      if (!isExpired) {
        results[deckId] = cached.data
      } else {
        toFetch.push(deckId)
      }
    }

    // 批量获取需要更新的数据
    if (toFetch.length > 0) {
      try {
        const freshCounts = await this.fetchBatchCountsFromSupabase(toFetch)
        
        // 更新缓存
        for (const [deckId, counts] of Object.entries(freshCounts)) {
          this.cache.set(deckId, {
            data: counts,
            metadata: {
              timestamp: now,
              totalCount: counts.total
            }
          })
          results[deckId] = counts
        }
      } catch (error) {
        console.warn('Failed to fetch fresh counts, using stale cache:', error)
        
        // 降级：返回过期的缓存数据
        for (const deckId of toFetch) {
          const cached = this.cache.get(deckId)
          if (cached) {
            results[deckId] = cached.data
          } else {
            results[deckId] = { new: 0, learning: 0, review: 0, total: 0 }
          }
        }
      }
    }

    return results
  }

  /**
   * 获取单个deck的卡片计数（带去重）
   */
  async getCardCounts(deckId: string): Promise<CardCounts> {
    // 如果正在请求，返回现有的Promise
    if (this.requestQueue.has(deckId)) {
      return this.requestQueue.get(deckId)!
    }

    // 检查缓存
    const cached = this.cache.get(deckId)
    const now = Date.now()
    const isExpired = !cached || (now - cached.metadata.timestamp > 3 * 60 * 1000)

    if (!isExpired) {
      return cached.data
    }

    // 创建新的请求Promise
    const promise = this.fetchSingleDeckCounts(deckId)
    this.requestQueue.set(deckId, promise)

    try {
      const counts = await promise
      
      // 更新缓存
      this.cache.set(deckId, {
        data: counts,
        metadata: {
          timestamp: now,
          totalCount: counts.total
        }
      })

      return counts
    } finally {
      // 清理请求队列
      this.requestQueue.delete(deckId)
    }
  }

  /**
   * 从Supabase批量获取卡片计数
   * 使用一次API调用获取所有需要的数据
   */
  private async fetchBatchCountsFromSupabase(deckIds: string[]): Promise<DeckCountsSummary> {
    if (deckIds.length === 0) return {}

    const now = new Date().toISOString()
    
    // 构建批量查询
    const url = `${this.supabaseUrl}/rest/v1/rpc/get_batch_card_counts`
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          deck_ids: deckIds,
          due_cutoff: now
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // 转换数据格式
      const results: DeckCountsSummary = {}
      for (const item of data) {
        results[item.deck_id] = {
          new: item.new_count || 0,
          learning: item.learning_count || 0,
          review: item.review_count || 0,
          total: item.total_count || 0
        }
      }

      return results
    } catch (error) {
      console.error('Batch fetch failed, falling back to individual queries:', error)
      
      // 降级：逐个查询
      const results: DeckCountsSummary = {}
      for (const deckId of deckIds) {
        try {
          results[deckId] = await this.fetchSingleDeckCounts(deckId)
        } catch (singleError) {
          console.warn(`Failed to fetch counts for deck ${deckId}:`, singleError)
          results[deckId] = { new: 0, learning: 0, review: 0, total: 0 }
        }
      }
      
      return results
    }
  }

  /**
   * 获取单个deck的卡片计数（从Supabase）
   */
  private async fetchSingleDeckCounts(deckId: string): Promise<CardCounts> {
    const now = new Date().toISOString()
    
    try {
      // 并行查询各种状态的卡片计数
      const [totalRes, newRes, learningRes, reviewRes] = await Promise.all([
        this.countCards(`deck_id=eq.${deckId}`),
        this.countCards(`deck_id=eq.${deckId}&state=eq.new&due=lte.${now}`),
        this.countCards(`deck_id=eq.${deckId}&state=in.(learning,relearning)&due=lte.${now}`),
        this.countCards(`deck_id=eq.${deckId}&state=in.(review)&due=lte.${now}`)
      ])

      return {
        total: totalRes,
        new: newRes,
        learning: learningRes,
        review: reviewRes
      }
    } catch (error) {
      console.error(`Failed to fetch counts for deck ${deckId}:`, error)
      throw error
    }
  }

  /**
   * 通用卡片计数查询
   */
  private async countCards(filter: string): Promise<number> {
    const url = `${this.supabaseUrl}/rest/v1/cards?${filter}&select=count`
    
    const response = await fetch(url, {
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Prefer': 'count=exact'
      }
    })

    if (!response.ok) {
      throw new Error(`Count query failed: ${response.status}`)
    }

    const contentRange = response.headers.get('content-range')
    return contentRange ? parseInt(contentRange.split('/')[1]) : 0
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, value] of this.cache.entries()) {
      if (now - value.metadata.timestamp > 10 * 60 * 1000) { // 10分钟后清理
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key)
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
    this.requestQueue.clear()
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size
    }
  }
}

// 单例实例
export const cardCountsCache = new CardCountsCache()

// 定期清理缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    cardCountsCache.cleanup()
  }, 5 * 60 * 1000) // 每5分钟清理一次
}