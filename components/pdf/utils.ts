// ================================================================
// 휴가신청서 PDF 유틸리티 함수
// ================================================================

import { LeaveType } from '@/types/document'
import { LeavePeriodRow } from './types'

/**
 * 주어진 날짜가 주말인지 확인
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // 0: 일요일, 6: 토요일
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 날짜를 MM.DD (요일) 형식으로 포맷
 */
export function formatDateWithDay(dateStr: string): string {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const dayName = dayNames[date.getDay()]
  return `${month}.${day} (${dayName})`
}

/**
 * 날짜 범위를 MM.DD ~ MM.DD 형식으로 포맷
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const startMonth = String(start.getMonth() + 1).padStart(2, '0')
  const startDay = String(start.getDate()).padStart(2, '0')
  const endMonth = String(end.getMonth() + 1).padStart(2, '0')
  const endDay = String(end.getDate()).padStart(2, '0')

  if (startDate === endDate) {
    return `${startMonth}.${startDay}`
  }

  return `${startMonth}.${startDay} ~ ${endMonth}.${endDay}`
}

/**
 * 두 날짜 사이의 평일(주말 제외) 수 계산
 */
export function countWeekdays(startDate: Date, endDate: Date): number {
  let count = 0
  const current = new Date(startDate)

  while (current <= endDate) {
    if (!isWeekend(current)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

/**
 * 휴가 기간을 주말 기준으로 분리
 *
 * 예시:
 * - 입력: 12/5(목) ~ 12/10(화)
 * - 출력: [
 *     { startDate: '2024-12-05', endDate: '2024-12-06', days: 2 }, // 목~금
 *     { startDate: '2024-12-09', endDate: '2024-12-10', days: 2 }, // 월~화
 *   ]
 */
export function splitLeavePeriodByWeekend(
  startDateStr: string,
  endDateStr: string,
  leaveType: LeaveType
): LeavePeriodRow[] {
  const periods: LeavePeriodRow[] = []
  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)

  // 반차나 반반차는 분리하지 않음
  if (leaveType === 'half_day' || leaveType === 'quarter_day') {
    return [{
      startDate: startDateStr,
      endDate: endDateStr,
      leaveType,
      days: leaveType === 'half_day' ? 0.5 : 0.25,
    }]
  }

  let periodStart: Date | null = null
  const current = new Date(startDate)

  while (current <= endDate) {
    if (!isWeekend(current)) {
      // 평일인 경우
      if (!periodStart) {
        periodStart = new Date(current)
      }
    } else {
      // 주말인 경우 - 진행 중인 기간이 있으면 종료
      if (periodStart) {
        const periodEnd = new Date(current)
        periodEnd.setDate(periodEnd.getDate() - 1) // 주말 전날까지

        const days = countWeekdays(periodStart, periodEnd)
        if (days > 0) {
          periods.push({
            startDate: formatDate(periodStart),
            endDate: formatDate(periodEnd),
            leaveType,
            days,
          })
        }
        periodStart = null
      }
    }

    current.setDate(current.getDate() + 1)
  }

  // 마지막 기간 처리 (주말로 끝나지 않는 경우)
  if (periodStart) {
    const days = countWeekdays(periodStart, endDate)
    if (days > 0) {
      periods.push({
        startDate: formatDate(periodStart),
        endDate: formatDate(endDate),
        leaveType,
        days,
      })
    }
  }

  return periods
}

/**
 * 날짜를 한글 형식으로 포맷 (YYYY년 MM월 DD일)
 */
export function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}년 ${month}월 ${day}일`
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getTodayString(): string {
  return formatDate(new Date())
}

/**
 * 기간 문자열 생성 (n일)
 */
export function formatDaysCount(days: number): string {
  if (days === 0.5) return '0.5일'
  if (days === 0.25) return '0.25일'
  return `${days}일`
}
