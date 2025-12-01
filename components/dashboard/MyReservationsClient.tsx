'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  DoorOpen,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cancelBooking } from '@/app/actions/meeting-room'
import { toast } from 'sonner'

interface Attendee {
  id: string
  name: string
}

interface MeetingRoomBooking {
  id: string
  booked_by: string
  room_name: string
  booking_date: string
  start_time: string
  end_time: string
  title: string
  attendees: Attendee[]
}

interface MyReservationsClientProps {
  seatNumber: string | null
  lockerNumber: string | null
  meetingBookings: MeetingRoomBooking[]
  currentUserId: string
}

export const MyReservationsClient: React.FC<MyReservationsClientProps> = ({
  seatNumber,
  lockerNumber,
  meetingBookings,
  currentUserId,
}) => {
  const router = useRouter()
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRoomBooking | null>(null)
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancelBooking = async () => {
    if (!selectedMeeting) return

    setIsCancelling(true)
    try {
      await cancelBooking(selectedMeeting.id)
      toast.success('예약이 취소되었습니다')
      setIsMeetingModalOpen(false)
      router.refresh() // Refresh to get updated data
    } catch (error: any) {
      console.error('Cancel booking failed:', error)
      toast.error(error.message || '예약 취소에 실패했습니다')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <TooltipProvider>
      <Card
        className="rounded-2xl flex flex-col h-full"
        style={{
          borderRadius: '16px',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardHeader style={{ paddingBottom: '12px' }}>
          <CardTitle
            style={{
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: '24px',
              color: '#29363D',
            }}
          >
            나의 예약 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 현재 좌석 및 사물함 - 가로 배치 */}
          <div className="flex gap-2.5">
            {/* 현재 좌석 */}
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '16px' }}>🪑</span>
                <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: '19.6px', color: '#5B6A72' }}>
                  현재 좌석
                </p>
              </div>
              <p style={{ fontSize: '16px', lineHeight: '24px', color: '#5B6A72' }}>
                {seatNumber || '-'}
              </p>
            </div>

            {/* 현재 사물함 */}
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '16px' }}>📦</span>
                <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: '19.6px', color: '#5B6A72' }}>
                  현재 사물함
                </p>
              </div>
              <p style={{ fontSize: '16px', lineHeight: '24px', color: '#5B6A72' }}>
                {lockerNumber || '-'}
              </p>
            </div>
          </div>

          {/* 회의실 예약 */}
          <div className="space-y-2 pt-3" style={{ borderTop: '1px solid #E5E8EB' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '16px' }}>🚪</span>
              <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: '19.6px', color: '#5B6A72' }}>
                회의실 예약
              </p>
            </div>
            <div className="space-y-2">
              {meetingBookings.length === 0 ? (
                <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#9BA4AB', textAlign: 'center', padding: '16px 0' }}>
                  예약된 회의실이 없습니다
                </p>
              ) : (
                meetingBookings.map((meeting) => {
                  const maxVisibleAttendees = 3
                  const visibleAttendees = meeting.attendees.slice(0, maxVisibleAttendees)
                  const remainingCount = meeting.attendees.length - maxVisibleAttendees

                  return (
                    <div
                      key={meeting.id}
                      className="p-3 transition-all cursor-pointer"
                      style={{
                        backgroundColor: '#F6F8F9',
                        borderRadius: '8px',
                        transitionDuration: '150ms',
                        transitionTimingFunction: 'ease-in-out',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.filter = 'brightness(0.97)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = 'brightness(1)'
                      }}
                      onClick={() => {
                        setSelectedMeeting(meeting)
                        setIsMeetingModalOpen(true)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p style={{ fontSize: '16px', fontWeight: 500, lineHeight: '24px', color: '#29363D' }}>
                            {meeting.room_name}
                          </p>
                          <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
                            {meeting.start_time.slice(0, 5)} - {meeting.end_time.slice(0, 5)}
                          </p>
                        </div>
                        {meeting.attendees.length > 0 && (
                          <div className="flex items-center">
                            {visibleAttendees.map((attendee, idx) => (
                              <Tooltip key={attendee.id}>
                                <TooltipTrigger asChild>
                                  <div
                                    className="relative rounded-full size-8 mr-[-6px] flex items-center justify-center cursor-pointer"
                                    style={{
                                      border: '2px solid white',
                                      backgroundColor: '#635BFF',
                                      color: 'white',
                                      fontSize: '14px',
                                      fontWeight: 500,
                                    }}
                                  >
                                    {attendee.name.charAt(0)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  style={{
                                    backgroundColor: '#29363D',
                                    color: '#FFFFFF',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '14px',
                                    padding: '6px 12px',
                                  }}
                                >
                                  <p>{attendee.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            {remainingCount > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="relative rounded-full size-8 mr-[-6px] flex items-center justify-center cursor-pointer"
                                    style={{
                                      border: '2px solid white',
                                      backgroundColor: '#635BFF',
                                      color: 'white',
                                      fontSize: '14px',
                                      fontWeight: 500,
                                    }}
                                  >
                                    +{remainingCount}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  style={{
                                    backgroundColor: '#29363D',
                                    color: '#FFFFFF',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '14px',
                                    padding: '6px 12px',
                                  }}
                                >
                                  <div className="space-y-1">
                                    {meeting.attendees.slice(maxVisibleAttendees).map((attendee) => (
                                      <p key={attendee.id}>{attendee.name}</p>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 회의실 예약 모달 */}
      <Dialog open={isMeetingModalOpen} onOpenChange={setIsMeetingModalOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle
              style={{
                fontSize: '20px',
                fontWeight: 500,
                lineHeight: '26px',
                color: '#29363D',
              }}
            >
              회의실 예약 정보
            </DialogTitle>
            <DialogDescription
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: '#5B6A72',
              }}
            >
              예약 정보를 확인하고 취소할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          {selectedMeeting && (
            <DialogBody>
              <div className="space-y-3">
                <div className="flex items-center gap-3 pb-3" style={{ borderBottom: '1px solid #E5E8EB' }}>
                  <DoorOpen className="w-5 h-5" style={{ color: '#635BFF' }} />
                  <p style={{ fontSize: '18px', fontWeight: 500, lineHeight: '23.4px', color: '#29363D' }}>
                    {selectedMeeting.room_name}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" style={{ color: '#5B6A72' }} />
                    <span style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>날짜:</span>
                    <span style={{ fontSize: '14px', lineHeight: '19.6px', color: '#29363D', fontWeight: 500 }}>
                      {selectedMeeting.booking_date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: '#5B6A72' }} />
                    <span style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>시작 시간:</span>
                    <span style={{ fontSize: '14px', lineHeight: '19.6px', color: '#29363D', fontWeight: 500 }}>
                      {selectedMeeting.start_time.slice(0, 5)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: '#5B6A72' }} />
                    <span style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>종료 시간:</span>
                    <span style={{ fontSize: '14px', lineHeight: '19.6px', color: '#29363D', fontWeight: 500 }}>
                      {selectedMeeting.end_time.slice(0, 5)}
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 16 16" style={{ marginTop: '2px' }}>
                      <circle
                        cx="8"
                        cy="5.33"
                        r="2.67"
                        stroke="#5B6A72"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.33333"
                      />
                      <path
                        d="M13.3333 14.6667C13.3333 12.0893 10.946 10 8 10C5.05401 10 2.66667 12.0893 2.66667 14.6667"
                        stroke="#5B6A72"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.33333"
                      />
                    </svg>
                    <div className="flex-1">
                      <span style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>참석자:</span>
                      <div className="mt-1">
                        {selectedMeeting.attendees.map((attendee, idx) => (
                          <span key={attendee.id} style={{ fontSize: '14px', lineHeight: '19.6px', color: '#29363D', fontWeight: 500 }}>
                            {attendee.name}
                            {idx < selectedMeeting.attendees.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4" style={{ color: '#5B6A72', marginTop: '2px' }} />
                    <div className="flex-1">
                      <span style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>사용 목적:</span>
                      <p className="mt-1" style={{ fontSize: '14px', lineHeight: '19.6px', color: '#29363D', fontWeight: 500 }}>
                        {selectedMeeting.title}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedMeeting.booked_by === currentUserId && (
                <div className="flex gap-2 mt-4">
                  <Button
                    className="flex-1"
                    style={{
                      backgroundColor: '#DC2626',
                      color: '#FFFFFF',
                    }}
                    onClick={handleCancelBooking}
                    disabled={isCancelling}
                  >
                    {isCancelling ? '취소 중...' : '예약 취소'}
                  </Button>
                </div>
              )}
            </DialogBody>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
