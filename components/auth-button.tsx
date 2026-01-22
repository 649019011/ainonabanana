'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createSupabaseClient } from '@/lib/supabase/client'

interface AuthButtonProps {
  initialUser: User | null
  isSupabaseConfigured: boolean
}

export function AuthButton({ initialUser, isSupabaseConfigured }: AuthButtonProps) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 监听认证状态变化
  useEffect(() => {
    if (!isSupabaseConfigured) return

    const checkAuth = async () => {
      try {
        console.log('[AuthButton] 检查登录状态...')
        const res = await fetch('/api/auth/user')
        if (res.ok) {
          const data = await res.json()
          console.log('[AuthButton] 登录状态检查结果:', data.user ? `已登录: ${data.user.email}` : '未登录')
          setUser(data.user)
        } else {
          console.log('[AuthButton] 登录状态检查失败，状态码:', res.status)
        }
      } catch (err) {
        console.error('[AuthButton] 登录状态检查错误:', err)
      }
    }

    // 页面可见时检查认证状态
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[AuthButton] 页面变为可见，检查登录状态')
        checkAuth()
      }
    }

    // 检测 URL 参数中的认证状态
    const authError = searchParams.get('auth')
    if (authError) {
      console.log('[AuthButton] 检测到认证错误参数:', authError)
      // 清除 URL 参数
      router.replace('/')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 初始检查
    if (!initialUser) {
      console.log('[AuthButton] 初始用户为空，立即检查登录状态')
      checkAuth()
    }

    // 设置轮询检查（登录后的前 10 秒，每秒检查一次）
    checkIntervalRef.current = setInterval(() => {
      checkAuth()
    }, 1000)

    // 10 秒后停止轮询
    const timeoutId = setTimeout(() => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
        console.log('[AuthButton] 停止登录状态轮询')
      }
    }, 10000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
      clearTimeout(timeoutId)
    }
  }, [initialUser, isSupabaseConfigured, searchParams, router])

  const handleSignOut = async () => {
    setLoading(true)
    await fetch('/auth/signout', { method: 'POST' })
    setUser(null)
    router.push('/')
    router.refresh()
    setLoading(false)
  }

  if (!isSupabaseConfigured) {
    return null
  }

  if (user) {
    // 用户已登录
    const userInitials = user.email?.charAt(0).toUpperCase() ?? 'U'
    const userEmail = user.email ?? '用户'

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline-block max-w-[120px] truncate">{userEmail}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">Email</span>
            <span className="text-sm truncate">{userEmail}</span>
          </DropdownMenuItem>
          {user.user_metadata?.full_name && (
            <DropdownMenuItem className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">Name</span>
              <span className="text-sm">{user.user_metadata.full_name}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer" disabled={loading}>
            {loading ? 'Signing out...' : 'Sign out'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // 用户未登录 - 使用服务器端 Supabase OAuth 登录
  const handleSignIn = async () => {
    setLoading(true)
    console.log('[AuthButton] 开始登录流程')
    // 直接跳转到服务器端登录路由
    window.location.href = '/auth/signin?next=/'
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignIn} disabled={loading}>
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </Button>
  )
}
