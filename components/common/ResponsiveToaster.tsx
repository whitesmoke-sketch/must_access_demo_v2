'use client'

import { Toaster } from '@/components/ui/sonner'
import { useEffect, useState } from 'react'

/**
 * Figma 디자인 시스템에 맞춘 토스터
 * - 모든 플랫폼: 상단 중앙
 * - Figma 스타일: 원형 아이콘 + 타입별 컬러 + 액션 버튼
 */
export function ResponsiveToaster() {
  return (
    <Toaster
      position="top-center"
    />
  )
}
