'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MeetingRoom as DBMeetingRoom, Booking, cancelBooking } from '@/app/actions/meeting-room'
import {
  Search,
  Users,
  Monitor,
  Camera,
  Plug,
  Cable,
  PenTool,
  Calendar,
  Clock,
  MapPin,
  Filter,
  List,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
  attendees?: string[]
  bookingId?: string
}

interface MeetingRoom {
  id: string
  name: string
  floor: number
  capacity: number
  equipment: Equipment
  currentBooking?: TimeSlot
  nextAvailable?: string
  todayBookings?: TimeSlot[]
}

interface MeetingRoomsClientProps {
  initialRooms: DBMeetingRoom[]
  initialBookings: Booking[]
}

export const MeetingRoomsClient: React.FC<MeetingRoomsClientProps> = ({
  initialRooms,
  initialBookings
}) => {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [capacityFilter, setCapacityFilter] = useState<string>('all')
  const [equipmentFilter, setEquipmentFilter] = useState<string[]>([])
  const [selectedFloor] = useState<string>('all')
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)

  // Modal date state
  const [modalDate, setModalDate] = useState(new Date())

  // Transform DB data to UI format
  const meetingRooms = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    return initialRooms.map((room) => {
      // Get today's bookings for this room
      const todayRoomBookings = initialBookings.filter(
        (booking) => booking.room_id === room.id && booking.booking_date === today
      )

      // Map bookings to TimeSlot format
      const todayBookings: TimeSlot[] = todayRoomBookings.map((booking) => {
        const attendees = [
          booking.employee?.name || booking.booked_by,
          ...(booking.attendees?.map((a) => a.employee.name) || []),
        ]

        return {
          start: booking.start_time,
          end: booking.end_time,
          bookedBy: booking.employee?.name || booking.booked_by,
          title: booking.title,
          attendees,
          bookingId: booking.id,
        }
      })

      // Find current booking (if time is within a booking)
      const currentBooking = todayBookings.find((booking) => {
        const bookingStart = booking.start.replace(':', '')
        const bookingEnd = booking.end.replace(':', '')
        const current = currentTime.replace(':', '')
        return current >= bookingStart && current < bookingEnd
      })

      // Find next available time
      let nextAvailable: string | undefined
      if (currentBooking) {
        // Check if there's a booking immediately after current
        const nextBooking = todayBookings.find(
          (booking) => booking.start === currentBooking.end
        )
        if (!nextBooking) {
          nextAvailable = currentBooking.end
        }
      }

      return {
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
        currentBooking,
        nextAvailable,
        todayBookings,
      } as MeetingRoom
    })
  }, [initialRooms, initialBookings])

  // Cancel booking handler
  const handleCancelBooking = async (bookingId: string) => {
    try {
      await cancelBooking(bookingId)
      router.refresh() // Refresh server component data
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      alert('예약 취소에 실패했습니다.')
    }
  }

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return meetingRooms.filter((room) => {
      const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCapacity =
        capacityFilter === 'all' ||
        (capacityFilter === '1-4' && room.capacity <= 4) ||
        (capacityFilter === '5-8' && room.capacity >= 5 && room.capacity <= 8) ||
        (capacityFilter === '9+' && room.capacity >= 9)

      const matchesFloor =
        selectedFloor === 'all' || room.floor === parseInt(selectedFloor)

      const matchesEquipment =
        equipmentFilter.length === 0 ||
        equipmentFilter.every((eq) => {
          switch (eq) {
            case 'whiteboard':
              return room.equipment.whiteboard
            case 'monitor':
              return room.equipment.monitor
            case 'camera':
              return room.equipment.camera
            case 'hdmi':
              return room.equipment.hdmi
            default:
              return true
          }
        })

      return matchesSearch && matchesCapacity && matchesFloor && matchesEquipment
    })
  }, [meetingRooms, searchQuery, capacityFilter, selectedFloor, equipmentFilter])

  // Group by floor
  const roomsByFloor = useMemo(() => {
    const grouped: Record<number, MeetingRoom[]> = {}
    filteredRooms.forEach((room) => {
      if (!grouped[room.floor]) {
        grouped[room.floor] = []
      }
      grouped[room.floor].push(room)
    })
    return grouped
  }, [filteredRooms])

  const floors = Object.keys(roomsByFloor)
    .map(Number)
    .sort((a, b) => a - b)

  // Toggle equipment filter
  const toggleEquipmentFilter = (equipment: string) => {
    setEquipmentFilter((prev) =>
      prev.includes(equipment)
        ? prev.filter((eq) => eq !== equipment)
        : [...prev, equipment]
    )
  }

  // Render equipment icon
  const renderEquipmentIcon = (type: keyof Equipment, available: boolean) => {
    if (!available) return null

    const iconProps = {
      className: 'w-4 h-4',
      style: { color: '#5B6A72' },
    }

    const icons = {
      whiteboard: <PenTool {...iconProps} />,
      monitor: <Monitor {...iconProps} />,
      camera: <Camera {...iconProps} />,
      outlet: <Plug {...iconProps} />,
      hdmi: <Cable {...iconProps} />,
    }

    const labels = {
      whiteboard: '화이트보드',
      monitor: '모니터',
      camera: '캠',
      outlet: '콘센트',
      hdmi: 'HDMI',
    }

    return (
      <div
        key={type}
        className="flex items-center gap-1 px-2 py-1 rounded"
        style={{
          backgroundColor: '#F6F8F9',
          fontSize: 'var(--font-size-caption)',
          color: '#5B6A72',
        }}
        title={labels[type]}
      >
        {icons[type]}
        <span>{labels[type]}</span>
      </div>
    )
  }

  // Get room status
  const getRoomStatus = (room: MeetingRoom) => {
    if (room.currentBooking) {
      return {
        status: 'occupied',
        label: '사용 중',
        color: '#EF4444',
        bgColor: '#FEF2F2',
      }
    }
    return {
      status: 'available',
      label: '사용 가능',
      color: '#10B981',
      bgColor: '#F0FDF4',
    }
  }

  // Render attendees
  const renderAttendees = (attendees?: string[]) => {
    if (!attendees || attendees.length === 0) return null

    const displayAttendees = attendees.slice(0, 3)
    const remainingCount = attendees.length - 3

    return (
      <div className="flex items-center">
        {displayAttendees.map((attendee, index) => {
          return (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="relative rounded-full size-7 cursor-pointer"
                    style={{
                      border: '2px solid white',
                      marginLeft: index === 0 ? '0' : '-6px',
                    }}
                  >
                    <div
                      className="rounded-full size-full flex items-center justify-center"
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      {attendee.charAt(0)}
                    </div>
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
                  <p>{attendee}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
        {remainingCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="relative rounded-full size-7 cursor-pointer flex items-center justify-center"
                  style={{
                    border: '2px solid white',
                    marginLeft: '-6px',
                    backgroundColor: '#5B6A72',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
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
                <p>{attendees.slice(3).join(', ')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  const handleBookRoom = (roomId: string) => {
    router.push('/meeting-room-booking?roomId=' + roomId)
  }

  // Modal date navigation
  const handleModalPreviousDay = () => {
    const newDate = new Date(modalDate)
    newDate.setDate(newDate.getDate() - 1)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (newDate >= today) {
      setModalDate(newDate)
    }
  }

  const handleModalNextDay = () => {
    const newDate = new Date(modalDate)
    newDate.setDate(newDate.getDate() + 1)

    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    if (newDate <= maxDate) {
      setModalDate(newDate)
    }
  }

  // Time slots (09:00 ~ 18:00, 30min intervals)
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

  // Check if time slot is booked
  const isTimeSlotBooked = (time: string, bookings?: TimeSlot[]): TimeSlot | null => {
    if (!bookings) return null

    return bookings.find(booking => {
      const bookingStart = booking.start.replace(':', '')
      const bookingEnd = booking.end.replace(':', '')
      const currentTime = time.replace(':', '')

      return currentTime >= bookingStart && currentTime < bookingEnd
    }) || null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: 'var(--font-size-h1)',
            fontWeight: 'var(--font-weight-h1)',
            lineHeight: 1.25,
            color: '#29363D',
          }}
        >
          회의실 예약 현황
        </h1>
        <p
          style={{
            fontSize: 'var(--font-size-body)',
            lineHeight: 1.5,
            color: '#5B6A72',
            marginTop: '4px',
          }}
        >
          모든 층의 회의실 현황을 확인하고 예약하세요
        </p>
      </div>

      {/* Search and filters */}
      <Card style={{ borderRadius: 'var(--radius)', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label
                style={{
                  fontSize: 'var(--font-size-caption)',
                  fontWeight: 500,
                  lineHeight: 1.4,
                  color: '#29363D',
                }}
              >
                회의실 검색
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: '#A0ACB3' }}
                />
                <Input
                  placeholder="회의실 이름 입력"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  style={{
                    fontSize: 'var(--font-size-body)',
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </div>

            {/* Capacity filter */}
            <div className="space-y-2">
              <label
                style={{
                  fontSize: 'var(--font-size-caption)',
                  fontWeight: 500,
                  lineHeight: 1.4,
                  color: '#29363D',
                }}
              >
                인원 수
              </label>
              <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="1-4">1-4명</SelectItem>
                  <SelectItem value="5-8">5-8명</SelectItem>
                  <SelectItem value="9+">9명 이상</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Equipment filter */}
            <div className="space-y-2">
              <label
                style={{
                  fontSize: 'var(--font-size-caption)',
                  fontWeight: 500,
                  lineHeight: 1.4,
                  color: '#29363D',
                }}
              >
                장비
              </label>
              <div className="flex flex-wrap gap-2">
                {['whiteboard', 'monitor', 'camera', 'hdmi'].map((eq) => {
                  const isSelected = equipmentFilter.includes(eq)
                  const labels: Record<string, string> = {
                    whiteboard: '화이트보드',
                    monitor: '모니터',
                    camera: '캠',
                    hdmi: 'HDMI',
                  }

                  return (
                    <button
                      key={eq}
                      onClick={() => toggleEquipmentFilter(eq)}
                      className="px-3 py-1.5 rounded-lg transition-all text-sm"
                      style={{
                        backgroundColor: isSelected ? '#635BFF' : '#F6F8F9',
                        color: isSelected ? 'white' : '#5B6A72',
                        border: isSelected ? 'none' : '1px solid #E5E8EB',
                        fontSize: 'var(--font-size-caption)',
                        fontWeight: 500,
                        lineHeight: 1.4,
                      }}
                    >
                      {labels[eq]}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Active filters */}
          {(searchQuery || capacityFilter !== 'all' || selectedFloor !== 'all' || equipmentFilter.length > 0) && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: '#E5E8EB' }}>
              <Filter className="w-4 h-4" style={{ color: '#5B6A72' }} />
              <span style={{ fontSize: 'var(--font-size-caption)', color: '#5B6A72' }}>
                활성 필터:
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setCapacityFilter('all')
                  setSelectedFloor('all')
                  setEquipmentFilter([])
                }}
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: '#635BFF',
                }}
              >
                모두 초기화
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting rooms by floor - using tabs */}
      {floors.length === 0 ? (
        <Card style={{ borderRadius: 'var(--radius)', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
          <CardContent className="py-16">
            <div className="text-center">
              <Search className="w-12 h-12 mx-auto mb-3" style={{ color: '#A0ACB3' }} />
              <p
                style={{
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 600,
                  lineHeight: 1.5,
                  color: '#29363D',
                }}
              >
                검색 결과가 없습니다
              </p>
              <p
                className="mt-1"
                style={{
                  fontSize: 'var(--font-size-caption)',
                  lineHeight: 1.4,
                  color: '#5B6A72',
                }}
              >
                다른 검색 조건을 시도해보세요
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={floors[0].toString()} className="w-full">
          <TabsList
            className="w-full"
            style={{
              backgroundColor: 'white',
              height: '48px',
              boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
            }}
          >
            {[2, 3, 6].map((floor) => {
              const floorRooms = meetingRooms.filter((r) => r.floor === floor)
              const availableCount = floorRooms.filter((r) => !r.currentBooking).length
              const occupiedCount = floorRooms.filter((r) => r.currentBooking).length

              return (
                <TabsTrigger
                  key={floor}
                  value={floor.toString()}
                  className="flex-1"
                >
                  <div className="flex items-center gap-2 justify-center flex-wrap">
                    <span>{floor}층</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
                      <span>{availableCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                      <span>{occupiedCount}</span>
                    </div>
                  </div>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {[2, 3, 6].map((floor) => {
            const floorRooms = roomsByFloor[floor] || []

            return (
              <TabsContent key={floor} value={floor.toString()} className="mt-6">
                {floorRooms.length === 0 ? (
                  <Card style={{ borderRadius: 'var(--radius)', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
                    <CardContent className="py-16">
                      <div className="text-center">
                        <Search className="w-12 h-12 mx-auto mb-3" style={{ color: '#A0ACB3' }} />
                        <p
                          style={{
                            fontSize: 'var(--font-size-body)',
                            fontWeight: 600,
                            lineHeight: 1.5,
                            color: '#29363D',
                          }}
                        >
                          이 층에 해당하는 회의실이 없습니다
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {floorRooms.map((room) => {
                      const status = getRoomStatus(room)

                      return (
                        <Card
                          key={room.id}
                          className="transition-all duration-150 hover:shadow-lg flex flex-col"
                          style={{
                            borderRadius: 'var(--radius)',
                            boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
                          }}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle
                                  style={{
                                    fontSize: 'var(--font-size-h4)',
                                    fontWeight: 600,
                                    lineHeight: 1.3,
                                    color: '#29363D',
                                  }}
                                >
                                  {room.name}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-2">
                                  <MapPin className="w-3.5 h-3.5" style={{ color: '#A0ACB3' }} />
                                  <span
                                    style={{
                                      fontSize: 'var(--font-size-caption)',
                                      color: '#5B6A72',
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {room.floor}층
                                  </span>
                                  <span style={{ color: '#E5E8EB' }}>•</span>
                                  <Users className="w-3.5 h-3.5" style={{ color: '#A0ACB3' }} />
                                  <span
                                    style={{
                                      fontSize: 'var(--font-size-caption)',
                                      color: '#5B6A72',
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    최대 {room.capacity}명
                                  </span>
                                </div>
                              </div>
                              <Badge
                                style={{
                                  backgroundColor: status.bgColor,
                                  color: status.color,
                                  border: 'none',
                                  fontSize: 'var(--font-size-caption)',
                                  fontWeight: 500,
                                  padding: '4px 10px',
                                }}
                              >
                                {status.label}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col">
                            <div className="flex-1 space-y-4">
                              {/* Current booking info */}
                              {room.currentBooking ? (
                                <div
                                  className="p-3 rounded-lg"
                                  style={{
                                    backgroundColor: '#F6F8F9',
                                    border: '1px solid #E5E8EB',
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-3.5 h-3.5" style={{ color: '#5B6A72' }} />
                                      <span
                                        style={{
                                          fontSize: 'var(--font-size-caption)',
                                          fontWeight: 600,
                                          color: '#5B6A72',
                                          lineHeight: 1.4,
                                        }}
                                      >
                                        {room.currentBooking.start} - {room.currentBooking.end}
                                      </span>
                                    </div>
                                    {renderAttendees(room.currentBooking.attendees)}
                                  </div>
                                  <p
                                    style={{
                                      fontSize: 'var(--font-size-caption)',
                                      color: '#29363D',
                                      fontWeight: 500,
                                      lineHeight: 1.4,
                                      marginBottom: '2px',
                                    }}
                                  >
                                    {room.currentBooking.title}
                                  </p>
                                  {room.nextAvailable && (
                                    <p
                                      style={{
                                        fontSize: 'var(--font-size-caption)',
                                        color: '#5B6A72',
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      다음 예약 가능: {room.nextAvailable}
                                    </p>
                                  )}
                                </div>
                              ) : null}

                              {/* Equipment list */}
                              <div>
                                <p
                                  className="mb-2"
                                  style={{
                                    fontSize: 'var(--font-size-caption)',
                                    fontWeight: 600,
                                    color: '#29363D',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  회의실 장비
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(room.equipment).map(([key, value]) =>
                                    renderEquipmentIcon(key as keyof Equipment, value)
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Button group - fixed at bottom */}
                            <div className="grid grid-cols-2 gap-2 mt-4">
                              <Button
                                className="w-full"
                                onClick={() => handleBookRoom(room.id)}
                                style={{
                                  backgroundColor: '#635BFF',
                                  color: 'white',
                                  fontSize: 'var(--font-size-body)',
                                  fontWeight: 500,
                                  lineHeight: 1.5,
                                }}
                              >
                                <Calendar className="w-4 h-4 mr-2" />
                                예약하기
                              </Button>
                              <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRoom(room)
                                  setBookingModalOpen(true)
                                }}
                                style={{
                                  fontSize: 'var(--font-size-body)',
                                  fontWeight: 500,
                                  lineHeight: 1.5,
                                  borderColor: '#E5E8EB',
                                  color: '#5B6A72',
                                }}
                              >
                                <List className="w-4 h-4 mr-2" />
                                예약 현황
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      )}

      {/* Booking status modal */}
      <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle
              style={{
                fontSize: 'var(--font-size-h2)',
                fontWeight: 'var(--font-weight-h2)',
                lineHeight: 1.3,
                color: '#29363D',
              }}
            >
              {selectedRoom?.name} - 예약 현황
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4" style={{ color: '#5B6A72' }} />
              <span style={{ fontSize: 'var(--font-size-caption)', color: '#5B6A72' }}>
                {selectedRoom?.floor}층 • 최대 {selectedRoom?.capacity}명
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            {/* Date selector */}
            <div className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ backgroundColor: '#F6F8F9' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleModalPreviousDay}
                disabled={modalDate.toDateString() === new Date().toDateString()}
                style={{ padding: '6px' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div
                style={{
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 500,
                  lineHeight: 1.5,
                  color: '#29363D',
                  minWidth: '120px',
                  textAlign: 'center',
                }}
              >
                {modalDate.toLocaleDateString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleModalNextDay}
                style={{ padding: '6px' }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Timeline */}
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {timeSlots.map((time) => {
                const booking = isTimeSlotBooked(time, selectedRoom?.todayBookings)
                const isBooked = !!booking

                return (
                  <div
                    key={time}
                    className="flex items-center gap-3 transition-all"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      backgroundColor: isBooked ? 'rgba(99, 91, 255, 0.08)' : 'rgba(246, 248, 249, 0.5)',
                      border: isBooked ? '1px solid rgba(99, 91, 255, 0.2)' : '1px solid transparent',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        fontWeight: 600,
                        lineHeight: 1.4,
                        color: isBooked ? 'var(--primary)' : '#5B6A72',
                        minWidth: '50px',
                      }}
                    >
                      {time}
                    </div>
                    {isBooked && booking ? (
                      <>
                        <div className="flex-1">
                          <p
                            style={{
                              fontSize: 'var(--font-size-caption)',
                              fontWeight: 600,
                              lineHeight: 1.4,
                              color: '#29363D',
                            }}
                          >
                            {booking.title}
                          </p>
                          <p
                            style={{
                              fontSize: 'var(--font-size-caption)',
                              lineHeight: 1.4,
                              color: '#5B6A72',
                              marginTop: '2px',
                            }}
                          >
                            {booking.bookedBy} • {booking.start} - {booking.end}
                          </p>
                        </div>
                        {booking.bookingId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('이 예약을 취소하시겠습니까?')) {
                                handleCancelBooking(booking.bookingId!)
                              }
                            }}
                            style={{
                              padding: '4px',
                              height: 'auto',
                              color: '#EF4444',
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    ) : (
                      <div className="flex-1">
                        <p
                          style={{
                            fontSize: 'var(--font-size-caption)',
                            lineHeight: 1.4,
                            color: '#9BA4AB',
                          }}
                        >
                          예약 가능
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* No bookings message */}
            {(!selectedRoom?.todayBookings || selectedRoom.todayBookings.length === 0) && (
              <div
                className="py-8 text-center rounded-lg"
                style={{
                  backgroundColor: '#F6F8F9',
                }}
              >
                <Calendar className="w-10 h-10 mx-auto mb-2" style={{ color: '#A0ACB3' }} />
                <p
                  style={{
                    fontSize: 'var(--font-size-body)',
                    fontWeight: 500,
                    lineHeight: 1.5,
                    color: '#29363D',
                  }}
                >
                  예약 내역 없음
                </p>
                <p
                  className="mt-1"
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    lineHeight: 1.4,
                    color: '#5B6A72',
                  }}
                >
                  이 날짜에 예약된 일정이 없습니다
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setBookingModalOpen(false)
                  handleBookRoom(selectedRoom?.id || '')
                }}
                style={{
                  backgroundColor: '#635BFF',
                  color: 'white',
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                예약하기
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}
