'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Monitor,
  Plug,
  Cable,
  PenTool,
  MapPin,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  UserPlus,
} from 'lucide-react'
import { MeetingRoom as DBMeetingRoom } from '@/app/actions/meeting-room'
import { createBooking, getBookings } from '@/app/actions/meeting-room'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Equipment {
  whiteboard: boolean
  monitor: boolean
  camera: boolean
  outlet: boolean
  hdmi: boolean
}

interface TimeSlot {
  start: string
  end: string
  bookedBy?: string
  title?: string
}

interface MeetingRoom {
  id: string
  name: string
  floor: number
  capacity: number
  equipment: Equipment
  todayBookings?: TimeSlot[]
}

interface Member {
  id: string
  name: string
  email: string
}

interface MeetingRoomBookingClientProps {
  room: DBMeetingRoom
  employees: Array<{
    id: string
    name: string
    email: string
    department: { name: string } | null
  }>
}

export const MeetingRoomBookingClient: React.FC<MeetingRoomBookingClientProps> = ({ room, employees }) => {
  const router = useRouter()

  // Transform DB room to UI format
  const meetingRoom: MeetingRoom = useMemo(() => ({
    id: room.id,
    name: room.name,
    floor: room.floor,
    capacity: room.capacity,
    equipment: {
      whiteboard: room.has_whiteboard,
      monitor: room.has_monitor,
      camera: room.has_camera,
      outlet: room.has_outlet,
      hdmi: room.has_hdmi,
    },
    todayBookings: [],
  }), [room])

  // Transform employees to members format
  const allEmployees: Member[] = useMemo(() =>
    employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      email: emp.email,
    })),
    [employees]
  )

  // Booking form state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [attendees, setAttendees] = useState<Member[]>([])
  const [purpose, setPurpose] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Member add modal
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')

  // Timeline date navigation
  const [timelineDate, setTimelineDate] = useState(new Date())

  // Selected time slots
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([])

  // Bookings state
  const [bookings, setBookings] = useState<TimeSlot[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)

  // Fetch bookings when selectedDate changes
  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoadingBookings(true)
      try {
        const dateBookings = await getBookings(room.id, selectedDate)

        // Transform bookings to TimeSlot format
        const transformedBookings: TimeSlot[] = dateBookings.map(booking => ({
          start: booking.start_time.substring(0, 5), // HH:MM:SS to HH:MM
          end: booking.end_time.substring(0, 5),
          bookedBy: booking.employee?.name || 'Unknown',
          title: booking.title,
        }))

        setBookings(transformedBookings)
      } catch (error) {
        console.error('Failed to fetch bookings:', error)
        toast.error('예약 정보를 불러오는데 실패했습니다')
        setBookings([])
      } finally {
        setIsLoadingBookings(false)
      }
    }

    fetchBookings()
  }, [room.id, selectedDate])

  // Time slots (09:00 ~ 18:00)
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 9; hour <= 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      if (hour < 18) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`)
      }
    }
    return slots
  }, [])

  // Check if time is booked
  const isTimeBooked = (time: string): TimeSlot | null => {
    if (!bookings.length) return null

    return bookings.find(booking => {
      const bookingStart = booking.start.replace(':', '')
      const bookingEnd = booking.end.replace(':', '')
      const currentTime = time.replace(':', '')

      return currentTime >= bookingStart && currentTime < bookingEnd
    }) || null
  }

  // Sync timeline date with selected date
  useEffect(() => {
    setTimelineDate(new Date(selectedDate))
  }, [selectedDate])

  // Date navigation
  const handlePreviousDay = () => {
    const newDate = new Date(timelineDate)
    newDate.setDate(newDate.getDate() - 1)
    setTimelineDate(newDate)
    setSelectedDate(newDate.toISOString().split('T')[0])
  }

  const handleNextDay = () => {
    const newDate = new Date(timelineDate)
    newDate.setDate(newDate.getDate() + 1)
    setTimelineDate(newDate)
    setSelectedDate(newDate.toISOString().split('T')[0])
  }

  // Timeline slot click
  const handleTimeSlotClick = (time: string) => {
    const booking = isTimeBooked(time)
    if (booking) return // Already booked, can't click

    setSelectedTimeSlots((prev) => {
      if (prev.includes(time)) {
        // Already selected, deselect
        return prev.filter(t => t !== time)
      } else {
        // Newly select
        return [...prev, time].sort()
      }
    })
  }

  // Auto-set start/end time from selected time slots
  useMemo(() => {
    if (selectedTimeSlots.length > 0) {
      const sorted = [...selectedTimeSlots].sort()
      setStartTime(sorted[0])

      // Add 30 minutes to last slot
      const lastSlot = sorted[sorted.length - 1]
      const [hour, minute] = lastSlot.split(':').map(Number)
      let endHour = hour
      let endMinute = minute + 30

      if (endMinute >= 60) {
        endHour += 1
        endMinute = 0
      }

      setEndTime(`${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`)
    }
  }, [selectedTimeSlots])

  // Add member
  const handleAddMember = (member: Member) => {
    if (attendees.find(m => m.id === member.id)) {
      toast.error('이미 추가된 참석자입니다')
      return
    }

    if (attendees.length >= meetingRoom.capacity) {
      toast.error(`최대 ${meetingRoom.capacity}명까지 추가 가능합니다`)
      return
    }

    setAttendees([...attendees, member])
    setMemberSearchQuery('')
  }

  // Remove member
  const handleRemoveMember = (memberId: string) => {
    setAttendees(attendees.filter(m => m.id !== memberId))
  }

  // Filtered members
  const filteredMembers = useMemo(() => {
    return allEmployees.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
      const notAdded = !attendees.find(a => a.id === member.id)
      return matchesSearch && notAdded
    })
  }, [allEmployees, memberSearchQuery, attendees])

  // Helper function to add minutes to time
  const addMinutes = (time: string, minutes: number): string => {
    const [h, m] = time.split(':').map(Number)
    const date = new Date()
    date.setHours(h, m + minutes)
    return date.toTimeString().slice(0, 5)
  }

  // Submit booking
  const handleSubmit = async () => {
    if (!selectedTimeSlots.length || !purpose.trim()) {
      toast.error('회의 제목과 시간을 선택해주세요')
      return
    }

    // Calculate start and end time from selectedTimeSlots
    const sortedSlots = [...selectedTimeSlots].sort()
    const calculatedStartTime = sortedSlots[0]
    const calculatedEndTime = addMinutes(sortedSlots[sortedSlots.length - 1], 30)

    setIsSubmitting(true)

    try {
      await createBooking({
        room_id: room.id,
        title: purpose,
        description: '',
        booking_date: selectedDate,
        start_time: calculatedStartTime,
        end_time: calculatedEndTime,
        attendee_ids: attendees.map(a => a.id),
      })

      toast.success('예약이 완료되었습니다', {
        description: `${selectedDate} ${calculatedStartTime} - ${calculatedEndTime}`,
      })

      router.push('/meeting-rooms')
    } catch (error: any) {
      console.error('Booking failed:', error)
      toast.error(error.message || '예약에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4">
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 500,
            lineHeight: 1.25,
            color: '#29363D',
          }}
        >
          회의실 예약
        </h1>
        <p
          style={{
            fontSize: '16px',
            lineHeight: 1.5,
            color: '#5B6A72',
            marginTop: '4px',
          }}
        >
          회의실 정보를 확인하고 예약을 진행하세요
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Meeting room info + timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Meeting room basic info card */}
          <Card
            className="rounded-2xl"
            style={{
              borderRadius: '16px',
              boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
            }}
          >
            <CardHeader>
              <CardTitle style={{ fontSize: '16px', fontWeight: 500, lineHeight: 1.5 }}>
                회의실 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Grid Layout: 2 columns x 3 rows */}
              <div className="grid grid-cols-2 gap-6" style={{ gridTemplateRows: 'auto auto auto' }}>
                {/* Row 1, Col 1: Meeting room name */}
                <div className="flex items-center justify-start pt-5" style={{ gridArea: '1 / 1' }}>
                  <p
                    style={{
                      fontSize: '20px',
                      fontWeight: 500,
                      lineHeight: 1.3,
                      color: '#29363D',
                    }}
                  >
                    {meetingRoom.name}
                  </p>
                </div>

                {/* Row 1-3, Col 2: Meeting room photo (spans all 3 rows) */}
                <div
                  className="relative rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center"
                  style={{
                    gridArea: '1 / 2 / 4 / 2',
                    width: '244px',
                    height: '244px',
                  }}
                >
                  <Monitor className="w-16 h-16 text-gray-400" />
                  {/* Meeting room image will be added in the future */}
                </div>

                {/* Row 2, Col 1: Location and capacity */}
                <div style={{ gridArea: '2 / 1' }}>
                  <div className="flex flex-col gap-2.5 pr-6">
                    {/* Location */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(99, 91, 255, 0.1)' }}
                      >
                        <MapPin className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: '14px',
                            lineHeight: 1.4,
                            color: '#5B6A72',
                          }}
                        >
                          위치
                        </p>
                        <p
                          style={{
                            fontSize: '16px',
                            fontWeight: 500,
                            lineHeight: 1.5,
                            color: '#29363D',
                          }}
                        >
                          {meetingRoom.floor}층
                        </p>
                      </div>
                    </div>

                    {/* Capacity */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(22, 205, 199, 0.1)' }}
                      >
                        <Users className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: '14px',
                            lineHeight: 1.4,
                            color: '#5B6A72',
                          }}
                        >
                          수용 인원
                        </p>
                        <p
                          style={{
                            fontSize: '16px',
                            fontWeight: 500,
                            lineHeight: 1.5,
                            color: '#29363D',
                          }}
                        >
                          최대 {meetingRoom.capacity}명
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 3, Col 1: Equipment */}
                <div className="flex flex-col gap-2 justify-end" style={{ gridArea: '3 / 1' }}>
                  <p
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.4,
                      color: '#5B6A72',
                    }}
                  >
                    제공 장비
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {meetingRoom.equipment.whiteboard && (
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: '#F6F8F9',
                        }}
                      >
                        <PenTool className="w-3 h-3" />
                        <p
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            lineHeight: 1.33,
                            color: '#29363D',
                          }}
                        >
                          화이트보드
                        </p>
                      </div>
                    )}
                    {meetingRoom.equipment.monitor && (
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: '#F6F8F9',
                        }}
                      >
                        <Monitor className="w-3 h-3" />
                        <p
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            lineHeight: 1.33,
                            color: '#29363D',
                          }}
                        >
                          모니터
                        </p>
                      </div>
                    )}
                    {meetingRoom.equipment.outlet && (
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: '#F6F8F9',
                        }}
                      >
                        <Plug className="w-3 h-3" />
                        <p
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            lineHeight: 1.33,
                            color: '#29363D',
                          }}
                        >
                          콘센트
                        </p>
                      </div>
                    )}
                    {meetingRoom.equipment.hdmi && (
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: '#F6F8F9',
                        }}
                      >
                        <Cable className="w-3 h-3" />
                        <p
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            lineHeight: 1.33,
                            color: '#29363D',
                          }}
                        >
                          HDMI
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Booking status timeline */}
          <Card
            className="rounded-2xl"
            style={{
              borderRadius: '16px',
              boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle style={{ fontSize: '16px', fontWeight: 500, lineHeight: 1.5 }}>
                  예약 현황
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousDay}
                    style={{ padding: '6px' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: 1.5,
                      color: '#29363D',
                      minWidth: '120px',
                      textAlign: 'center',
                    }}
                  >
                    {timelineDate.toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextDay}
                    style={{ padding: '6px' }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {timeSlots.map((time) => {
                  const booking = isTimeBooked(time)
                  const isBooked = !!booking
                  const isSelected = selectedTimeSlots.includes(time)

                  return (
                    <div
                      key={time}
                      className="flex items-center gap-3 transition-all"
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: isBooked
                          ? 'rgba(246, 248, 249, 0.5)'
                          : isSelected
                          ? 'rgba(99, 91, 255, 0.15)'
                          : 'rgba(41, 54, 61, 0.05)',
                        cursor: isBooked ? 'not-allowed' : 'pointer',
                        border: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isBooked && !isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(41, 54, 61, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isBooked && !isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(41, 54, 61, 0.05)'
                        }
                      }}
                      onClick={() => handleTimeSlotClick(time)}
                    >
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          lineHeight: 1.4,
                          color: isBooked ? '#9BA4AB' : isSelected ? 'var(--primary)' : '#29363D',
                          minWidth: '50px',
                        }}
                      >
                        {time}
                      </div>
                      {isBooked && booking ? (
                        <div className="flex-1">
                          <p
                            style={{
                              fontSize: '14px',
                              fontWeight: 500,
                              lineHeight: 1.4,
                              color: '#9BA4AB',
                            }}
                          >
                            {booking.title}
                          </p>
                          <p
                            style={{
                              fontSize: '14px',
                              lineHeight: 1.4,
                              color: '#9BA4AB',
                            }}
                          >
                            {booking.bookedBy} · {booking.start} - {booking.end}
                          </p>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <p
                            style={{
                              fontSize: '14px',
                              lineHeight: 1.4,
                              fontWeight: isSelected ? 500 : 400,
                              color: isSelected ? 'var(--primary)' : '#29363D',
                            }}
                          >
                            {isSelected ? '선택됨' : '예약 가능'}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Booking input form */}
        <div className="lg:col-span-1">
          <Card
            className="rounded-2xl sticky top-6"
            style={{
              borderRadius: '16px',
              boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
            }}
          >
            <CardHeader>
              <CardTitle style={{ fontSize: '16px', fontWeight: 500, lineHeight: 1.5 }}>
                예약 정보 입력
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date selector */}
              <div className="space-y-2">
                <Label
                  htmlFor="date"
                  style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  날짜 *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Start time */}
              <div className="space-y-2">
                <Label
                  htmlFor="startTime"
                  style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  시작 시간 *
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              {/* End time */}
              <div className="space-y-2">
                <Label
                  htmlFor="endTime"
                  style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  종료 시간 *
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>

              {/* Attendees */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: 1.5,
                    }}
                  >
                    참석자
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMemberDialogOpen(true)}
                    style={{
                      fontSize: '14px',
                      padding: '4px 12px',
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    추가
                  </Button>
                </div>

                {attendees.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {attendees.map((attendee) => (
                      <div
                        key={attendee.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{
                          backgroundColor: '#F6F8F9',
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
                          {attendee.name.charAt(0)}
                        </div>
                        <span
                          style={{
                            fontSize: '14px',
                            lineHeight: 1.4,
                            color: '#29363D',
                          }}
                        >
                          {attendee.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(attendee.id)}
                          className="ml-1 hover:opacity-70 transition-opacity"
                        >
                          <X className="w-4 h-4" style={{ color: '#5B6A72' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.4,
                      color: '#9BA4AB',
                    }}
                  >
                    참석자를 추가해주세요
                  </p>
                )}
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <Label
                  htmlFor="purpose"
                  style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  사용 목적 *
                </Label>
                <Textarea
                  id="purpose"
                  placeholder="회의 목적을 입력하세요"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Policy notice */}
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'rgba(248, 198, 83, 0.1)' }}
              >
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                  <div className="space-y-1">
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        lineHeight: 1.4,
                        color: '#29363D',
                      }}
                    >
                      회의실 이용 정책
                    </p>
                    <ul
                      style={{
                        fontSize: '14px',
                        lineHeight: 1.4,
                        color: '#5B6A72',
                        paddingLeft: '16px',
                      }}
                    >
                      <li>예약 시간 10분 전까지 미사용 시 자동 취소</li>
                      <li>사용 후 정리정돈 필수</li>
                      <li>최대 예약 시간: 4시간</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/meeting-rooms')}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                  }}
                >
                  {isSubmitting ? '예약 중...' : '예약하기'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Member add modal */}
      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle
              style={{
                fontSize: '20px',
                fontWeight: 500,
                lineHeight: 1.3,
              }}
            >
              참석자 추가
            </DialogTitle>
            <DialogDescription>
              회의 참석자를 검색하여 추가하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <Input
              placeholder="이름 또는 이메일로 검색"
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
            />

            {/* Member list */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    style={{
                      border: '1px solid #E8EBED',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 500,
                        }}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: '16px',
                            fontWeight: 500,
                            lineHeight: 1.5,
                            color: '#29363D',
                          }}
                        >
                          {member.name}
                        </p>
                        <p
                          style={{
                            fontSize: '14px',
                            lineHeight: 1.4,
                            color: '#5B6A72',
                          }}
                        >
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        handleAddMember(member)
                      }}
                      style={{
                        fontSize: '14px',
                      }}
                    >
                      추가
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.4,
                      color: '#9BA4AB',
                    }}
                  >
                    검색 결과가 없습니다
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsMemberDialogOpen(false)
                setMemberSearchQuery('')
              }}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
