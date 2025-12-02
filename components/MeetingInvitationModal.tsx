'use client'

import { useState } from 'react'
import { X, Calendar, MapPin, Users, Clock } from 'lucide-react'
import { respondToMeetingInvitation } from '@/app/actions/meeting-room'
import { toast } from 'sonner'

interface MeetingInvitationModalProps {
  meeting: {
    id: string
    response_status: string
    booking: {
      id: string
      title: string
      description?: string
      booking_date: string
      start_time: string
      end_time: string
      calendar_event_url?: string
      room: {
        name: string
        location?: string
      }
      organizer?: {
        name: string
        email: string
      }
    }
  }
  onClose: () => void
  onUpdate?: () => void
}

export default function MeetingInvitationModal({
  meeting,
  onClose,
  onUpdate
}: MeetingInvitationModalProps) {
  const [loading, setLoading] = useState(false)

  async function handleResponse(status: 'accepted' | 'declined') {
    setLoading(true)

    const result = await respondToMeetingInvitation(meeting.booking.id, status)

    if (result.success) {
      toast.success(
        status === 'accepted'
          ? '회의 참석으로 응답했습니다. 캘린더에 추가되었습니다.'
          : '회의 불참으로 응답했습니다.'
      )
      onUpdate?.()
      onClose()
    } else {
      toast.error(result.error || '응답 처리 중 오류가 발생했습니다')
    }

    setLoading(false)
  }

  const startDate = new Date(`${meeting.booking.booking_date}T${meeting.booking.start_time}`)
  const endDate = new Date(`${meeting.booking.booking_date}T${meeting.booking.end_time}`)
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-start justify-between p-6 border-b">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{meeting.booking.title}</h2>
            {meeting.booking.organizer && (
              <p className="text-sm text-gray-600">
                {meeting.booking.organizer.name}님이 초대했습니다
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-4">
          {/* 일시 */}
          <div className="flex items-start gap-3">
            <Calendar className="text-gray-400 mt-1 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium">
                {startDate.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short'
                })}
              </p>
              <p className="text-gray-600">
                {startDate.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                {' ~ '}
                {endDate.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* 소요 시간 */}
          <div className="flex items-start gap-3">
            <Clock className="text-gray-400 mt-1 flex-shrink-0" size={20} />
            <p className="text-gray-600">{durationMinutes}분</p>
          </div>

          {/* 장소 */}
          <div className="flex items-start gap-3">
            <MapPin className="text-gray-400 mt-1 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium">{meeting.booking.room.name}</p>
              {meeting.booking.room.location && (
                <p className="text-sm text-gray-600">{meeting.booking.room.location}</p>
              )}
            </div>
          </div>

          {/* 설명 */}
          {meeting.booking.description && (
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-2">회의 내용</h3>
              <p className="text-gray-600 whitespace-pre-wrap">
                {meeting.booking.description}
              </p>
            </div>
          )}

          {/* 주최자 */}
          {meeting.booking.organizer && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} className="text-gray-400" />
                <h3 className="font-medium">주최자</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  {meeting.booking.organizer.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{meeting.booking.organizer.name}</p>
                  <p className="text-xs text-gray-500">{meeting.booking.organizer.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Google Calendar 링크 */}
          {meeting.booking.calendar_event_url && (
            <div className="pt-4 border-t">
              <a
                href={meeting.booking.calendar_event_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm flex items-center gap-2"
              >
                <Calendar size={16} />
                Google Calendar에서 보기
              </a>
            </div>
          )}
        </div>

        {/* 푸터 - 응답 버튼 */}
        {meeting.response_status === 'needsAction' && (
          <div className="flex gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={() => handleResponse('accepted')}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? '처리중...' : '참석'}
            </button>
            <button
              onClick={() => handleResponse('declined')}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-border rounded-lg font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
              style={{ color: '#FF6B6B' }}
            >
              {loading ? '처리중...' : '불참'}
            </button>
          </div>
        )}

        {meeting.response_status === 'accepted' && (
          <div className="p-6 border-t bg-green-50">
            <p className="text-center text-green-800 font-medium">
              이미 참석으로 응답하셨습니다
            </p>
          </div>
        )}

        {meeting.response_status === 'declined' && (
          <div className="p-6 border-t bg-red-50">
            <p className="text-center text-red-800 font-medium">
              불참으로 응답하셨습니다
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
