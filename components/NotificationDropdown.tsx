'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { markAsRead } from '@/app/actions/notification'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/app/actions/notification'
import MeetingInvitationModal from './MeetingInvitationModal'

interface NotificationDropdownProps {
  notifications: Notification[]
  userId: string
}

export default function NotificationDropdown({ notifications: initialNotifications, userId }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [selectedMeetingNotification, setSelectedMeetingNotification] = useState<Notification | null>(null)
  const router = useRouter()

  // 서버에서 새로운 초기 알림이 오면 동기화
  useEffect(() => {
    setNotifications(initialNotifications)
  }, [initialNotifications])

  // Supabase Realtime 구독 - 새 알림 실시간 수신
  useEffect(() => {
    const supabase = createClient()

    // RLS가 자동으로 recipient_id 필터링을 처리함
    // filter 없이 구독하고 RLS에 의존
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification',
        },
        (payload) => {
          console.log('[Realtime] Notification event received:', payload)
          const newNotification = payload.new as Notification

          // RLS가 없는 경우를 대비해 클라이언트에서도 필터링
          if (newNotification.recipient_id !== userId) {
            console.log('[Realtime] Ignoring notification for different user')
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
      .subscribe((status, err) => {
        console.log('[Realtime] Subscription status:', status, err || '')
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to notifications for user:', userId)
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error:', err)
        }
        if (status === 'TIMED_OUT') {
          console.error('[Realtime] Subscription timed out')
        }
      })

    return () => {
      console.log('[Realtime] Unsubscribing from notifications')
      supabase.removeChannel(channel)
    }
  }, [userId])

  // 읽지 않은 알림 개수
  const unreadCount = notifications.filter(n => !n.is_read).length

  // 알림 타입별 아이콘 및 스타일
  function getNotificationStyle(type: string) {
    switch (type) {
      case 'meeting_invitation':
        return {
          icon: '📅',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
      case 'leave_approval':
        return {
          icon: '✅',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      case 'leave_rejection':
        return {
          icon: '❌',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      case 'document_approval':
        return {
          icon: '📄',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        }
      case 'system':
        return {
          icon: '🔔',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
      default:
        return {
          icon: '📬',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  async function handleNotificationClick(notification: Notification) {
    // 회의 초대인 경우 모달 표시
    if (notification.type === 'meeting_invitation') {
      setSelectedMeetingNotification(notification)
      setIsOpen(false)
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

    setIsOpen(false)
    router.refresh()
  }

  function handleUpdate() {
    // 모달에서 응답 후 목록 새로고침
    router.refresh()
  }

  // 날짜 포맷팅
  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <>
      {/* 알림 아이콘 */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-lg transition-all"
          aria-label="알림"
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
          <Bell className="w-5 h-5" style={{ color: '#5B6A72' }} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 rounded-full w-5 h-5 text-xs flex items-center justify-center font-medium text-white"
              style={{ backgroundColor: '#F04438' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* 드롭다운 */}
        {isOpen && (
          <>
            {/* 오버레이 */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* 드롭다운 메뉴 */}
            <div
              className="absolute right-0 mt-2 w-96 bg-white shadow-lg rounded-lg border z-20 max-h-[500px] overflow-y-auto"
              style={{ borderColor: '#E5E8EB' }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold" style={{ color: '#29363D' }}>알림</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs" style={{ color: '#635BFF' }}>
                      {unreadCount}개의 새 알림
                    </span>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="text-center py-8" style={{ color: '#A0ACB3' }}>
                    새로운 알림이 없습니다
                  </p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => {
                      const style = getNotificationStyle(notification.type)

                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-3 rounded-lg cursor-pointer border transition-colors ${style.bgColor} ${style.borderColor} hover:opacity-80`}
                          style={{
                            opacity: notification.is_read ? 0.6 : 1
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-2xl flex-shrink-0">
                              {style.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-medium mb-1"
                                style={{ color: '#29363D' }}
                              >
                                {notification.title}
                              </p>
                              <p
                                className="text-sm mb-2"
                                style={{ color: '#5B6A72' }}
                              >
                                {notification.message}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: '#A0ACB3' }}
                              >
                                {formatDate(notification.created_at)}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                                style={{ backgroundColor: '#635BFF' }}
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

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
