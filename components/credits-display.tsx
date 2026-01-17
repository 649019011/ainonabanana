'use client'

import { useState, useEffect } from 'react'
import { Coins, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchUserBalance } from '@/lib/credits/client'
import type { User } from '@supabase/supabase-js'

interface CreditsDisplayProps {
  initialUser: User | null
}

export function CreditsDisplay({ initialUser }: CreditsDisplayProps) {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBalance = async () => {
    if (!initialUser) {
      setBalance(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const result = await fetchUserBalance()
    if (result.success && result.balance !== undefined) {
      setBalance(result.balance)
    } else {
      setBalance(0)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBalance()
  }, [initialUser])

  // 公开刷新方法，供父组件调用
  useEffect(() => {
    // 将刷新方法挂载到 window 对象上，供其他组件调用
    if (typeof window !== 'undefined') {
      (window as any).refreshCreditsDisplay = fetchBalance
    }
  }, [initialUser])

  if (!initialUser) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-accent rounded-lg border border-border">
      <Coins className="h-4 w-4 text-primary" />
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <span className="text-sm font-medium">
          {balance?.toLocaleString() || 0} <span className="text-muted-foreground">credits</span>
        </span>
      )}
    </div>
  )
}
