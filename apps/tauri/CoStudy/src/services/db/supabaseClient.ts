import { getSupabaseClient } from '@make-gold/lib/supabase-ios14'
import { getDataAccessStrategyService } from '@/services/DataAccessStrategyService'

export function supabaseClient() {
  return getSupabaseClient()
}

/**
 * 安全的 Supabase 查询方法
 * 只有已认证用户可以访问远程数据
 */
export async function selectAll<T>(table: string) {
  // 检查用户访问权限
  const strategyService = getDataAccessStrategyService()
  const canAccessRemote = await strategyService.canAccessRemoteData()
  
  if (!canAccessRemote) {
    throw new Error('未登录用户无法访问远程数据')
  }

  const client = supabaseClient()
  const { data, error } = await client.from(table).select('*')
  if (error) throw error
  return data as T[]
}