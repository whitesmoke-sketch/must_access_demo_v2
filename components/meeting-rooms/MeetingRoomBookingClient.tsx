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
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
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
  currentUser: {
    id: string
    name: string
    email: string
  }
}

export const MeetingRoomBookingClient: React.FC<MeetingRoomBookingClientProps> = ({ room, employees, currentUser }) => {
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
  // 본인을 기본 참석자로 포함
  const [attendees, setAttendees] = useState<Member[]>([currentUser])
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

  // Time slots (09:00 ~ 19:00, 30min intervals)
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 9; hour <= 19; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      if (hour < 19) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`)
      }
    }
    return slots
  }, [])

  // Get end time for a slot (30 minutes later)
  const getSlotEndTime = (time: string): string => {
    const [hour, minute] = time.split(':').map(Number)
    let endHour = hour
    let endMinute = minute + 30
    if (endMinute >= 60) {
      endMinute = 0
      endHour += 1
    }
    return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
  }

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

  // 로컬 날짜를 YYYY-MM-DD 문자열로 변환 (타임존 이슈 방지)
  const formatDateToLocalString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 문자열을 로컬 Date로 변환 (타임존 이슈 방지)
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // Date navigation
  const handlePreviousDay = () => {
    const newDate = new Date(timelineDate)
    newDate.setDate(newDate.getDate() - 1)

    // 과거 날짜 선택 불가
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (newDate < today) return

    setTimelineDate(newDate)
    setSelectedDate(formatDateToLocalString(newDate))
  }

  const handleNextDay = () => {
    const newDate = new Date(timelineDate)
    newDate.setDate(newDate.getDate() + 1)
    setTimelineDate(newDate)
    setSelectedDate(formatDateToLocalString(newDate))
  }

  // Check if time is in selected range (considering booked slots)
  const isTimeInSelectedRange = (time: string): boolean => {
    if (selectedTimeSlots.length === 0) return false

    const sorted = [...selectedTimeSlots].sort()
    const minTime = sorted[0]
    const maxTime = sorted[sorted.length - 1]

    // Check if time is within range
    if (time < minTime || time > maxTime) return false

    // Check if there's a booking between minTime and this time
    // If there is, this time should not be considered selected
    for (const slot of timeSlots) {
      if (slot >= minTime && slot < time) {
        const booking = isTimeBooked(slot)
        if (booking) {
          // There's a booking before this time, so this time is not in continuous range
          return false
        }
      }
    }

    return true
  }

  // Check if there's a booking between two times
  const hasBookingBetween = (startTime: string, endTime: string): boolean => {
    const [start, end] = [startTime, endTime].sort()

    for (const slot of timeSlots) {
      if (slot > start && slot < end) {
        const booking = isTimeBooked(slot)
        if (booking) return true
      }
    }
    return false
  }

  // Check if clicking this time would exceed 2 hours or has booking between
  const isTimeClickDisabled = (time: string): boolean => {
    if (selectedTimeSlots.length === 0) return false
    if (selectedTimeSlots.includes(time)) return false // Can always deselect

    const sorted = [...selectedTimeSlots].sort()
    const minTime = sorted[0]
    const maxTime = sorted[sorted.length - 1]

    // Check if there's a booking between existing selections and this time
    if (time < minTime) {
      // Clicking before the current range
      if (hasBookingBetween(time, minTime)) return true
    } else if (time > maxTime) {
      // Clicking after the current range
      if (hasBookingBetween(maxTime, time)) return true
    }

    // Check if adding this time exceeds 2 hours
    const newSlots = [...selectedTimeSlots, time].sort()
    const newMinTime = newSlots[0]
    const newMaxTime = newSlots[newSlots.length - 1]

    // Calculate time difference in minutes
    const [minHour, minMinute] = newMinTime.split(':').map(Number)
    const [maxHour, maxMinute] = newMaxTime.split(':').map(Number)
    const diffMinutes = (maxHour * 60 + maxMinute) - (minHour * 60 + minMinute)

    // Maximum 2 hours (120 minutes)
    return diffMinutes > 120
  }

  // Timeline slot click
  const handleTimeSlotClick = (time: string) => {
    const booking = isTimeBooked(time)
    if (booking) return // Already booked, can't click

    // Check if disabled due to 2-hour limit or booking between
    if (isTimeClickDisabled(time)) return

    setSelectedTimeSlots((prev) => {
      // Check if this time is in the selected range (not just in the array)
      const inRange = prev.length > 0 && isTimeInSelectedRange(time)

      if (inRange) {
        // Time is in selected range, deselect this time and clear one side
        if (prev.length === 1) {
          // Only one selected, just deselect it
          return []
        }

        const sorted = [...prev].sort()
        const minTime = sorted[0]
        const maxTime = sorted[sorted.length - 1]

        // Calculate middle point
        const minMinutes = parseInt(minTime.split(':')[0]) * 60 + parseInt(minTime.split(':')[1])
        const maxMinutes = parseInt(maxTime.split(':')[0]) * 60 + parseInt(maxTime.split(':')[1])
        const clickMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1])
        const midMinutes = (minMinutes + maxMinutes) / 2

        if (clickMinutes >= midMinutes) {
          // Clicked on the right half, update maxTime to clicked time
          return [minTime, time]
        } else {
          // Clicked on the left half, update minTime to clicked time
          return [time, maxTime]
        }
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

  // Remove member (본인은 제거 불가)
  const handleRemoveMember = (memberId: string) => {
    // 본인은 제거할 수 없음
    if (memberId === currentUser.id) return
    setAttendees(attendees.filter(m => m.id !== memberId))
  }

  // Filtered members (본인 제외)
  const filteredMembers = useMemo(() => {
    return allEmployees.filter((member) => {
      // 본인은 검색 결과에서 제외
      if (member.id === currentUser.id) return false
      
      const matchesSearch =
        member.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
      const notAdded = !attendees.find(a => a.id === member.id)
      return matchesSearch && notAdded
    })
  }, [allEmployees, memberSearchQuery, attendees, currentUser.id])

  // Helper function to add minutes to time
  const addMinutes = (time: string, minutes: number): string => {
    const [h, m] = time.split(':').map(Number)
    const date = new Date()
    date.setHours(h, m + minutes)
    return date.toTimeString().slice(0, 5)
  }

  // Submit booking
  const handleSubmit = async () => {
    // Check if time is selected either via timeline or form fields
    let calculatedStartTime: string
    let calculatedEndTime: string

    if (selectedTimeSlots.length > 0) {
      // Time selected from timeline
      const sortedSlots = [...selectedTimeSlots].sort()
      calculatedStartTime = sortedSlots[0]
      calculatedEndTime = addMinutes(sortedSlots[sortedSlots.length - 1], 30)
    } else if (startTime && endTime) {
      // Time entered in form fields
      calculatedStartTime = startTime
      calculatedEndTime = endTime
    } else {
      toast.error('시간을 선택해주세요')
      return
    }

    // Validate maximum 2 hours
    const [startHour, startMinute] = calculatedStartTime.split(':').map(Number)
    const [endHour, endMinute] = calculatedEndTime.split(':').map(Number)
    const diffMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)

    if (diffMinutes > 120) {
      toast.error('최대 예약 시간은 2시간입니다', {
        description: '더 짧은 시간을 선택해주세요',
      })
      return
    }

    // Check if start time is before end time
    if (diffMinutes <= 0) {
      toast.error('종료 시간은 시작 시간보다 이후여야 합니다')
      return
    }

    // Use default title if empty
    const bookingTitle = purpose.trim() || '회의'

    setIsSubmitting(true)

    const bookingData = {
      room_id: room.id,
      title: bookingTitle,
      description: '',
      booking_date: selectedDate,
      start_time: calculatedStartTime,
      end_time: calculatedEndTime,
      attendee_ids: attendees.map(a => a.id),
    }

    console.log('[Booking Form] Submitting booking:', {
      attendeesCount: attendees.length,
      attendees: attendees,
      attendeeIds: bookingData.attendee_ids
    })

    try {
      await createBooking(bookingData)

      toast.success('예약이 완료되었습니다', {
        description: `${selectedDate} ${calculatedStartTime} - ${calculatedEndTime}`,
      })

      router.push('/meeting-rooms')
      router.refresh() // Force server component to re-fetch data
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
            fontSize: 'var(--font-size-h1)',
            fontWeight: 'var(--font-weight-h1)',
            lineHeight: 1.25,
            color: 'var(--foreground)',
          }}
        >
          공간 예약
        </h1>
        <p
          style={{
            fontSize: '16px',
            lineHeight: 1.5,
            color: 'var(--muted-foreground)',
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
                      color: 'var(--foreground)',
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
                            color: 'var(--muted-foreground)',
                          }}
                        >
                          위치
                        </p>
                        <p
                          style={{
                            fontSize: '16px',
                            fontWeight: 500,
                            lineHeight: 1.5,
                            color: 'var(--foreground)',
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
                            color: 'var(--muted-foreground)',
                          }}
                        >
                          수용 인원
                        </p>
                        <p
                          style={{
                            fontSize: '16px',
                            fontWeight: 500,
                            lineHeight: 1.5,
                            color: 'var(--foreground)',
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
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    제공 장비
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {meetingRoom.equipment.whiteboard && (
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: 'var(--muted)',
                        }}
                      >
                        <PenTool className="w-3 h-3" />
                        <p
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            lineHeight: 1.33,
                            color: 'var(--foreground)',
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
                          backgroundColor: 'var(--muted)',
                        }}
                      >
                        <Monitor className="w-3 h-3" />
                        <p
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            lineHeight: 1.33,
                            color: 'var(--foreground)',
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
                          backgroundColor: 'var(--muted)',
                        }}
                      >
                        <Plug className="w-3 h-3" />
                        <p
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            lineHeight: 1.33,
                            color: 'var(--foreground)',
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
                          backgroundColor: 'var(--muted)',
                        }}
                      >
                        <Cable className="w-3 h-3" />
                        <p
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            lineHeight: 1.33,
                            color: 'var(--foreground)',
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
                    disabled={(() => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const checkDate = new Date(timelineDate)
                      checkDate.setHours(0, 0, 0, 0)
                      return checkDate.getTime() <= today.getTime()
                    })()}
                    style={{ padding: '6px' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: 1.5,
                      color: 'var(--foreground)',
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
                  const isSelected = isTimeInSelectedRange(time)
                  const isDisabled = isTimeClickDisabled(time)

                  return (
                    <div
                      key={time}
                      className="flex items-center gap-3 transition-all"
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: isBooked || isDisabled
                          ? 'var(--disabled-bg)'
                          : isSelected
                          ? 'var(--primary-bg)'
                          : 'var(--hover-bg)',
                        cursor: isBooked || isDisabled ? 'not-allowed' : 'pointer',
                        border: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                        opacity: isDisabled ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isBooked && !isSelected && !isDisabled) {
                          e.currentTarget.style.backgroundColor = 'var(--hover-bg)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isBooked && !isSelected && !isDisabled) {
                          e.currentTarget.style.backgroundColor = 'var(--hover-bg)'
                        }
                      }}
                      onClick={() => handleTimeSlotClick(time)}
                    >
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          lineHeight: 1.4,
                          color: isBooked || isDisabled ? '#9BA4AB' : isSelected ? 'var(--primary)' : '#29363D',
                          minWidth: '100px',
                        }}
                      >
                        {time} ~ {getSlotEndTime(time)}
                      </div>
                      {isBooked && booking ? (
                        <div className="flex-1">
                          <p
                            style={{
                              fontSize: '14px',
                              fontWeight: 500,
                              lineHeight: 1.4,
                              color: 'var(--disabled-text)',
                            }}
                          >
                            {booking.title}
                          </p>
                          <p
                            style={{
                              fontSize: '14px',
                              lineHeight: 1.4,
                              color: 'var(--disabled-text)',
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
                              color: isDisabled ? '#9BA4AB' : isSelected ? 'var(--primary)' : '#29363D',
                            }}
                          >
                            {isDisabled ? '선택 불가' : isSelected ? '선택됨' : '예약 가능'}
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
                    fontSize: 'var(--font-size-caption)',
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  날짜 *
                </Label>
                <DatePicker
                  date={selectedDate ? parseLocalDate(selectedDate) : undefined}
                  onDateChange={(date) => setSelectedDate(date ? formatDateToLocalString(date) : '')}
                  placeholder="날짜 선택"
                  disablePastDates
                />
              </div>

              {/* Start time */}
              <div className="space-y-2">
                <Label
                  htmlFor="startTime"
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  시작 시간 *
                </Label>
                <TimePicker
                  value={startTime}
                  onValueChange={(time) => {
                    setStartTime(time)
                    // 종료 시간이 시작 시간보다 작거나 같으면 초기화
                    if (endTime && time >= endTime) {
                      setEndTime('')
                    }
                  }}
                  placeholder="시작 시간 선택"
                  minTime="09:00"
                  maxTime="18:30"
                />
              </div>

              {/* End time */}
              <div className="space-y-2">
                <Label
                  htmlFor="endTime"
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  종료 시간 *
                </Label>
                <TimePicker
                  value={endTime}
                  onValueChange={setEndTime}
                  placeholder="종료 시간 선택"
                  minTime="09:30"
                  maxTime="19:00"
                  minSelectableTime={startTime}
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
                    {attendees.map((attendee) => {
                      const isCurrentUser = attendee.id === currentUser.id
                      return (
                        <div
                          key={attendee.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg"
                          style={{
                            backgroundColor: isCurrentUser ? 'var(--primary-bg)' : 'var(--muted)',
                            border: isCurrentUser ? '1px solid var(--primary)' : 'none',
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
                              color: 'var(--foreground)',
                            }}
                          >
                            {attendee.name}
                            {isCurrentUser && (
                              <span style={{ color: 'var(--primary)', marginLeft: '4px', fontSize: '12px' }}>
                                (주최자)
                              </span>
                            )}
                          </span>
                          {/* 본인이 아닌 경우에만 제거 버튼 표시 */}
                          {!isCurrentUser && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(attendee.id)}
                              className="ml-1 hover:opacity-70 transition-opacity"
                            >
                              <X className="w-4 h-4" style={{ color: '#5B6A72' }} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.4,
                      color: 'var(--disabled-text)',
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
                        color: 'var(--foreground)',
                      }}
                    >
                      회의실 이용 정책
                    </p>
                    <ul
                      style={{
                        fontSize: '14px',
                        lineHeight: 1.4,
                        color: 'var(--muted-foreground)',
                        paddingLeft: '16px',
                      }}
                    >
                      <li>회의실은 함께 쓰는 공간입니다. 항상 깨끗하게 정리해주세요.</li>
                      <li>최대 예약 시간: 2시간</li>
                      <li>장비에 문제가 있을 시 담당자에게 즉시 연락 주세요.</li>
                      <li>다음 예약이 있을 시 최소 15분 전까지 비워주세요.</li>
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
                      border: '1px solid var(--border)',
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
                            color: 'var(--foreground)',
                          }}
                        >
                          {member.name}
                        </p>
                        <p
                          style={{
                            fontSize: '14px',
                            lineHeight: 1.4,
                            color: 'var(--muted-foreground)',
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
                      color: 'var(--disabled-text)',
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
