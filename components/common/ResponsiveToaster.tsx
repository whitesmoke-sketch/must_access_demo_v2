'use client'

import { Toaster } from '@/components/ui/sonner'
import { useEffect, useState } from 'react'

/**
 * Figma 디자인 시스템에 맞춘 반응형 토스터
 * - 모바일: 하단 중앙
 * - 데스크톱: 우측 상단
 * - Figma 스타일: 원형 아이콘 + 타입별 컬러 + 액션 버튼
 */
export function ResponsiveToaster() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // 초기 체크
    checkMobile()

    // 리사이즈 이벤트 리스너
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <Toaster
      position={isMobile ? 'bottom-center' : 'top-right'}
    />
  )
}
