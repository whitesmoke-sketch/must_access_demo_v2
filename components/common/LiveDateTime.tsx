'use client'

import { useState, useEffect } from 'react'

interface LiveDateTimeProps {
  className?: string
  style?: React.CSSProperties
}

export function LiveDateTime({ className, style }: LiveDateTimeProps) {
  // Hydration mismatch 방지: 초기값을 null로 설정
  // 서버와 클라이언트의 시간이 다를 수 있으므로 클라이언트 마운트 후에만 표시
  const [mounted, setMounted] = useState(false)
  const [dateTime, setDateTime] = useState<string>('')

  useEffect(() => {
    // 마운트 완료 표시
    setMounted(true)

    // 현재 시간 포맷팅 함수
    const formatDateTime = () => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const date = String(now.getDate()).padStart(2, '0')
      const dayNames = ['일', '월', '화', '수', '목', '금', '토']
      const day = dayNames[now.getDay()]
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')

      return `${year}.${month}.${date} (${day}) ${hours}:${minutes}:${seconds}`
    }

    // 초기 시간 설정
    setDateTime(formatDateTime())

    // 1초마다 업데이트
    const intervalId = setInterval(() => {
      setDateTime(formatDateTime())
    }, 1000)

    // cleanup: 컴포넌트 언마운트 시 interval 정리
    return () => clearInterval(intervalId)
  }, [])

  // 마운트 전에는 스켈레톤 또는 고정 텍스트 표시 (Hydration mismatch 방지)
  if (!mounted) {
    return (
      <p className={className} style={style}>
        {/* 서버/클라이언트 동일한 플레이스홀더 */}
        <span style={{ visibility: 'hidden' }}>0000.00.00 (월) 00:00:00</span>
      </p>
    )
  }

  return (
    <p className={className} style={style}>
      {dateTime}
    </p>
  )
}
