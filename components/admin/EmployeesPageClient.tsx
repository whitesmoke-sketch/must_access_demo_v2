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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">조직구성원 관리</h1>
          <p className="text-muted-foreground">
            구성원 정보를 등록, 수정, 조회, 삭제할 수 있습니다
          </p>
        </div>
        <EmployeeModal mode="create" onSuccess={handleEmployeeCreated}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            구성원 추가
          </Button>
        </EmployeeModal>
      </div>

      {/* 구성원 테이블 */}
      <EmployeeTable key={refreshKey} />
    </div>
  )
}
