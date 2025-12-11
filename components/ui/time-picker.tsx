"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TimePickerProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minTime?: string // 최소 선택 가능 시간 (예: "09:00")
  maxTime?: string // 최대 선택 가능 시간 (예: "19:00")
  minSelectableTime?: string // 이 시간 이후만 선택 가능 (시작 시간보다 큰 값만)
}

export function TimePicker({
  value,
  onValueChange,
  placeholder = "시간 선택",
  disabled = false,
  className,
  minTime = "00:00",
  maxTime = "23:30",
  minSelectableTime,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)

  // 시간을 분으로 변환하는 헬퍼 함수
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  // 시간 목록 생성 (minTime ~ maxTime, 30분 간격)
  const timeSlots = React.useMemo(() => {
    const slots = []
    const minMinutes = timeToMinutes(minTime)
    const maxMinutes = timeToMinutes(maxTime)

    for (let hour = 0; hour < 24; hour++) {
      for (const minute of [0, 30]) {
        const currentMinutes = hour * 60 + minute
        if (currentMinutes >= minMinutes && currentMinutes <= maxMinutes) {
          slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
        }
      }
    }
    return slots
  }, [minTime, maxTime])

  // 시간이 선택 가능한지 확인
  const isTimeDisabled = (time: string) => {
    if (!minSelectableTime) return false
    return timeToMinutes(time) <= timeToMinutes(minSelectableTime)
  }

  const handleTimeSelect = (time: string) => {
    onValueChange?.(time)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-[var(--muted-foreground)]",
            className
          )}
          style={{
            fontSize: 'var(--font-size-body)',
            lineHeight: 1.5,
            height: '42px',
            backgroundColor: 'var(--input-background)',
          }}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        style={{
          backgroundColor: 'var(--input-background)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <ScrollArea
          className="h-[240px]"
          style={{
            padding: '4px',
          }}
        >
          <div className="grid gap-1 p-2">
            {timeSlots.map((time) => {
              const isDisabled = isTimeDisabled(time)
              return (
                <button
                  key={time}
                  onClick={() => !isDisabled && handleTimeSelect(time)}
                  disabled={isDisabled}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md transition-all duration-150",
                    value === time
                      ? "font-medium"
                      : isDisabled
                        ? "cursor-not-allowed opacity-40"
                        : "hover:brightness-95"
                  )}
                  style={{
                    fontSize: 'var(--font-size-body)',
                    lineHeight: 1.5,
                    backgroundColor: value === time ? 'var(--primary)' : 'transparent',
                    color: value === time ? 'var(--primary-foreground)' : isDisabled ? 'var(--muted-foreground)' : 'var(--foreground)',
                  }}
                >
                  {time}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
