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
        className="rounded-2xl flex flex-col h-full w-full"
        style={{
          borderRadius: '16px',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
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
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                  <path
                    d="M12.6667 6V4C12.6667 3.64638 12.5262 3.30724 12.2761 3.05719C12.0261 2.80714 11.687 2.66667 11.3333 2.66667H4.66667C4.31304 2.66667 3.97391 2.80714 3.72386 3.05719C3.47381 3.30724 3.33333 3.64638 3.33333 4V6"
                    stroke="#635BFF"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.33333"
                  />
                  <path
                    d="M2 10.6667C2 11.0203 2.14048 11.3594 2.39052 11.6095C2.64057 11.8595 2.97971 12 3.33333 12H12.6667C13.0203 12 13.3594 11.8595 13.6095 11.6095C13.8595 11.3594 14 11.0203 14 10.6667V7.33333C14 6.97971 13.8595 6.64057 13.6095 6.39052C13.3594 6.14048 13.0203 6 12.6667 6C12.313 6 11.9739 6.14048 11.7239 6.39052C11.4738 6.64057 11.3333 6.97971 11.3333 7.33333V8.33333C11.3333 8.42174 11.2982 8.50652 11.2357 8.56904C11.1732 8.63155 11.0884 8.66667 11 8.66667H5C4.91159 8.66667 4.82681 8.63155 4.7643 8.56904C4.70179 8.50652 4.66667 8.42174 4.66667 8.33333V7.33333C4.66667 6.97971 4.52619 6.64057 4.27614 6.39052C4.02609 6.14048 3.68696 6 3.33333 6C2.97971 6 2.64057 6.14048 2.39052 6.39052C2.14048 6.64057 2 6.97971 2 7.33333V10.6667Z"
                    stroke="#635BFF"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.33333"
                  />
                  <path d="M3.33333 12V13.3333" stroke="#635BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  <path d="M12.6667 12V13.3333" stroke="#635BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                </svg>
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
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                  <path
                    d="M13.3333 2H2.66667C1.93029 2 1.33333 2.59695 1.33333 3.33333V12.6667C1.33333 13.403 1.93029 14 2.66667 14H13.3333C14.0697 14 14.6667 13.403 14.6667 12.6667V3.33333C14.6667 2.59695 14.0697 2 13.3333 2Z"
                    stroke="#635BFF"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.33333"
                  />
                  <path d="M1.33333 8H14.6667" stroke="#635BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  <path d="M10.6667 5.33333H10.6733" stroke="#635BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                  <path d="M10.6667 10.6667H10.6733" stroke="#635BFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                </svg>
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
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                <path
                  d="M7.33333 3.04134V13.8127C7.33336 13.9139 7.35646 14.0139 7.40087 14.1049C7.44528 14.1959 7.50984 14.2756 7.58965 14.3379C7.66946 14.4002 7.76242 14.4436 7.86148 14.4646C7.96053 14.4856 8.06308 14.4838 8.16133 14.4593L12.6667 13.3333V3.70801C12.6666 3.41068 12.5672 3.1219 12.3842 2.88756C12.2012 2.65323 11.9451 2.48678 11.6567 2.41468L8.99 1.74801C8.7935 1.69889 8.58839 1.69519 8.39025 1.73718C8.1921 1.77917 8.00613 1.86575 7.84644 1.99035C7.68675 2.11495 7.55755 2.2743 7.46865 2.45629C7.37974 2.63828 7.33347 2.8388 7.33333 3.04134Z"
                  stroke="#16CDC7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.33333"
                />
                <path
                  d="M7.33333 2.66667H5.33333C4.97971 2.66667 4.64057 2.80714 4.39052 3.05719C4.14048 3.30724 4 3.64638 4 4V13.3333"
                  stroke="#16CDC7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.33333"
                />
                <path d="M7.33333 13.3333H1.33333" stroke="#16CDC7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                <path d="M14.6667 13.3333H12.6667" stroke="#16CDC7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                <path d="M9.33333 8H9.34" stroke="#16CDC7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
              </svg>
              <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: '19.6px', color: '#5B6A72' }}>
                회의실 예약
              </p>
            </div>
            {/* 2개 이상일 때 스크롤 가능, 최대 높이 약 2개 아이템 */}
            <div 
              className="space-y-2"
              style={{
                maxHeight: meetingBookings.length > 2 ? '140px' : 'auto',
                overflowY: meetingBookings.length > 2 ? 'auto' : 'visible',
              }}
            >
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
