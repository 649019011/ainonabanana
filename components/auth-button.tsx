'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

interface AuthButtonProps {
  initialUser: User | null
  isSupabaseConfigured: boolean
}

export function AuthButton({ initialUser, isSupabaseConfigured }: AuthButtonProps) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // 监听认证状态变化（通过轮询服务器来保持同步）
  useEffect(() => {
    if (!isSupabaseConfigured) return

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/user')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        }
      } catch {
        // 忽略错误
      }
    }

    // 页面可见时检查认证状态
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 初始检查
    if (!initialUser) {
      checkAuth()
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [initialUser, isSupabaseConfigured])

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
          <DropdownMenuLabel>我的账户</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">邮箱</span>
            <span className="text-sm truncate">{userEmail}</span>
          </DropdownMenuItem>
          {user.user_metadata?.full_name && (
            <DropdownMenuItem className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">姓名</span>
              <span className="text-sm">{user.user_metadata.full_name}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer" disabled={loading}>
            {loading ? '退出中...' : '退出登录'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // 用户未登录
  return (
    <Button variant="outline" size="sm" asChild>
      <a href="/auth/signin">Google 登录</a>
    </Button>
  )
}
