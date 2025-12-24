import { useEffect, useRef, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabaseClient } from './supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { getDataAccessStrategyService } from '@/services/DataAccessStrategyService'

export function useSupabaseLiveQuery<T>(table: string, primaryKey: string[] = ['id']) {
  const { user } = useAuth()
  const client = supabaseClient()
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [canUseRemote, setCanUseRemote] = useState(false)
  const channelRef = useRef<any>(null)

  // Check if user can access remote data
  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setCanUseRemote(false)
        return
      }
      
      const strategyService = getDataAccessStrategyService()
      const canAccess = await strategyService.canAccessRemoteData()
      setCanUseRemote(canAccess)
    }
    
    checkAccess()
  }, [user])

  useEffect(() => {
    let mounted = true
    async function init() {
      try {
        setIsLoading(true)
        
        // 未登录用户或无权限用户不能访问远程数据
        if (!canUseRemote) {
          setError(new Error('未登录用户无法访问远程数据'))
          setIsLoading(false)
          return
        }
        
        const { data: initial, error } = await client.from(table).select('*')
        if (error) throw error
        if (!mounted) return
        setData((initial || []) as T[])
        const channel = client
          .channel(`public:${table}`)
          .on(
            'postgres_changes' as any,
            { event: '*', schema: 'public', table },
            (payload: RealtimePostgresChangesPayload<any>) => {
              const pkVals = primaryKey.map(k => (payload.new ?? payload.old)?.[k])
              setData(prev => {
                switch (payload.eventType) {
                  case 'INSERT':
                    return [...prev, payload.new as T]
                  case 'UPDATE':
                    return prev.map(row => {
                      const match = primaryKey.every(k => (row as any)[k] === (payload.new as any)[k])
                      return match ? (payload.new as T) : row
                    })
                  case 'DELETE':
                    return prev.filter(row => primaryKey.every((k, i) => (row as any)[k] !== pkVals[i]))
                  default:
                    return prev
                }
              })
            }
          )
          .subscribe()
        channelRef.current = channel
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)))
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    init()
    return () => {
      mounted = false
      if (channelRef.current) client.removeChannel(channelRef.current)
    }
  }, [client, table, canUseRemote])

  return { data, isLoading, error, canUseRemote }
}