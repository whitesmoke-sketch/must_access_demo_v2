'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { EmployeeTable } from './EmployeeTable'
import { EmployeeModal } from './EmployeeModal'

export function EmployeesPageClient() {
  const [refreshKey, setRefreshKey] = useState(0)

  function handleEmployeeCreated() {
    // 테이블을 새로고침하기 위해 key를 변경
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2
            style={{
              color: 'var(--foreground)',
              fontSize: 'var(--font-size-h1)',
              fontWeight: 'var(--font-weight-h1)',
              lineHeight: 1.25
            }}
          >
            구성원 관리
          </h2>
          <p
            style={{
              color: 'var(--muted-foreground)',
              fontSize: 'var(--font-size-body)',
              lineHeight: 1.5
            }}
            className="mt-1"
          >
            회사 구성원 정보를 조회·수정·등록합니다
          </p>
        </div>
        <EmployeeModal mode="create" onSuccess={handleEmployeeCreated}>
          <Button
            className="w-full lg:w-auto"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              fontSize: 'var(--font-size-body)',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            신규 구성원 등록
          </Button>
        </EmployeeModal>
      </div>

      {/* 구성원 테이블 */}
      <EmployeeTable key={refreshKey} />
    </div>
  )
}
