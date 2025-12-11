"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, startOfDay } from "date-fns"
import { ko } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  disableWeekends?: boolean
  disablePastDates?: boolean
  minDate?: Date
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "날짜 선택",
  disabled = false,
  className,
  disableWeekends = false,
  disablePastDates = false,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // 날짜 비활성화 로직
  const isDateDisabled = (dateToCheck: Date) => {
    // 과거 날짜 비활성화
    if (disablePastDates && dateToCheck < startOfDay(new Date())) {
      return true
    }
    // minDate 이전 날짜 비활성화
    if (minDate && dateToCheck < startOfDay(minDate)) {
      return true
    }
    // 주말 비활성화 (0: 일요일, 6: 토요일)
    if (disableWeekends && (dateToCheck.getDay() === 0 || dateToCheck.getDay() === 6)) {
      return true
    }
    return false
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    onDateChange?.(selectedDate)
    setOpen(false) // 날짜 선택 시 팝오버 닫기
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-[var(--muted-foreground)]",
            className
          )}
          style={{
            fontSize: 'var(--font-size-body)',
            lineHeight: 1.5,
            height: '42px',
          }}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: ko }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          locale={ko}
          initialFocus
          disabled={isDateDisabled}
        />
      </PopoverContent>
    </Popover>
  )
}
