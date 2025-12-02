'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { markAsRead } from '@/app/actions/notification'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/app/actions/notification'
import MeetingInvitationModal from './MeetingInvitationModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface NotificationDropdownProps {
  notifications: Notification[]
  userId: string
}

export default function NotificationDropdown({ notifications: initialNotifications, userId }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [selectedMeetingNotification, setSelectedMeetingNotification] = useState<Notification | null>(null)
  const router = useRouter()

  // 서버에서 새로운 초기 알림이 오면 동기화
  useEffect(() => {
    setNotifications(initialNotifications)
  }, [initialNotifications])

  // Supabase Realtime postgres_changes 구독 - DB INSERT 감지
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`notification-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification',
        },
        (payload) => {
          const newNotification = payload.new as Notification

          // 본인 알림만 처리 (RLS 비활성화 상태이므로 클라이언트에서 필터링)
          if (newNotification.recipient_id !== userId) {
            return
          }

          // 새 알림을 목록 맨 앞에 추가
          setNotifications((prev) => {
            // 중복 방지
            if (prev.some(n => n.id === newNotification.id)) {
              return prev
            }
            return [newNotification, ...prev]
          })

          // 토스트 알림 표시
          toast.info(newNotification.title, {
            description: newNotification.message,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // 읽지 않은 알림 개수
  const unreadCount = notifications.filter(n => !n.is_read).length

  // 모두 읽음 처리
  async function handleMarkAllAsRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)

    if (unreadIds.length === 0) return

    // 모든 읽지 않은 알림을 읽음 처리
    for (const id of unreadIds) {
      await markAsRead(id)
    }

    router.refresh()
  }

  async function handleNotificationClick(notification: Notification) {
    // 회의 초대인 경우 모달 표시
    if (notification.type === 'meeting_invitation') {
      setSelectedMeetingNotification(notification)
      return
    }

    // 읽음 처리
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // action_url이 있으면 해당 페이지로 이동
    if (notification.action_url) {
      router.push(notification.action_url)
    }

    router.refresh()
  }

  function handleUpdate() {
    // 모달에서 응답 후 목록 새로고침
    router.refresh()
  }

  return (
    <>
      {/* Figma Design - Notification Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="relative p-2 rounded-lg transition-all"
            style={{
              backgroundColor: 'var(--muted)',
              transitionDuration: '150ms',
              transitionTimingFunction: 'ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(0.97)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)'
            }}
          >
            <Bell className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
            {unreadCount > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full"
                style={{ backgroundColor: 'var(--primary)', fontSize: '10px' }}
              >
                {unreadCount}
              </Badge>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-80"
        >
          {/* 헤더 - Figma Design */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span style={{ color: 'var(--foreground)' }}>알림</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                style={{ color: 'var(--primary)' }}
              >
                모두 읽음
              </Button>
            )}
          </div>

          {/* 알림 목록 - Figma Design */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
                알림이 없습니다
              </div>
            ) : (
              notifications
                .slice(0, 10)
                .map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="px-4 py-3 cursor-pointer"
                    style={{
                      backgroundColor: !notification.is_read ? 'var(--accent)' : 'transparent'
                    }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                        {notification.message}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                        {new Date(notification.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 회의 초대 모달 */}
      {selectedMeetingNotification && selectedMeetingNotification.type === 'meeting_invitation' && selectedMeetingNotification.metadata?.meeting_data && (
        <MeetingInvitationModal
          meeting={selectedMeetingNotification.metadata.meeting_data}
          onClose={() => setSelectedMeetingNotification(null)}
          onUpdate={handleUpdate}
        />
      )}
    </>
  )
}
