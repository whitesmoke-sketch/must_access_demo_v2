'use client'

import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'

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
      position={isMobile ? 'bottom-center' : 'top-center'}
      richColors
      toastOptions={{
        style: {
          background: 'var(--card)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        },
      }}
    />
  )
}
