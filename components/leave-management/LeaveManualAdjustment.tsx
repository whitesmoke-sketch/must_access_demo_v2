'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

interface LeaveManualAdjustmentProps {
  onBack: () => void
}

export function LeaveManualAdjustment({ onBack }: LeaveManualAdjustmentProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h3 style={{ fontSize: 'var(--font-size-h2)', fontWeight: 'var(--font-weight-h2)', lineHeight: 1.3 }}>
            연차 수동 관리
          </h3>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}>
            구성원의 연차를 검색하고 수동으로 조정합니다
          </p>
        </div>
      </div>

      <div className="p-12 text-center">
        <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}>
          수동 조정 기능은 추후 구현 예정입니다
        </p>
      </div>
    </div>
  )
}
