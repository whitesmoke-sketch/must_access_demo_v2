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
}

export function TimePicker({
  value,
  onValueChange,
  placeholder = "시간 선택",
  disabled = false,
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)

  // 시간 목록 생성 (00:00 ~ 23:30, 30분 간격) - 24시간 사용 가능
  const timeSlots = React.useMemo(() => {
    const slots = []
    for (let hour = 0; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
    return slots
  }, [])

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
            {timeSlots.map((time) => (
              <button
                key={time}
                onClick={() => handleTimeSelect(time)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md transition-all duration-150",
                  value === time
                    ? "font-medium"
                    : "hover:brightness-95"
                )}
                style={{
                  fontSize: 'var(--font-size-body)',
                  lineHeight: 1.5,
                  backgroundColor: value === time ? 'var(--primary)' : 'transparent',
                  color: value === time ? 'var(--primary-foreground)' : 'var(--foreground)',
                }}
              >
                {time}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
