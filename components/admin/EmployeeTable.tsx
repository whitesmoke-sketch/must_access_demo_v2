'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Edit, Ellipsis } from 'lucide-react'
import { EmployeeModal } from './EmployeeModal'
import { toast } from 'sonner'
import { getEmployees } from '@/app/actions/employee'
import { createClient } from '@/lib/supabase/client'
import { TooltipSimple } from '@/components/ui/tooltip-simple'

interface Department {
  id: number
  name: string
  code: string
  parent_department_id: number | null
}

export function EmployeeTable() {
  const [employees, setEmployees] = useState<any[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Department 목록 로드 (최상위 부서 찾기 위해)
    const supabase = createClient()
    const { data: deptData } = await supabase.from('department').select('*')
    if (deptData) {
      setDepartments(deptData)
    }

    // Employee 목록 로드
    const result = await getEmployees()
    if (result.success) {
      setEmployees(result.data)
    } else {
      toast.error('구성원 목록을 불러오는데 실패했습니다')
    }

    setLoading(false)
  }

  // 최상위 부서 찾기
  function getTopLevelDepartment(departmentId: number): string {
    const dept = departments.find((d) => d.id === departmentId)
    if (!dept) return '-'

    // parent가 없으면 최상위
    if (!dept.parent_department_id) return dept.name

    // parent를 재귀적으로 찾기
    let current = dept
    while (current.parent_department_id) {
      const parent = departments.find((d) => d.id === current.parent_department_id)
      if (!parent) break
      current = parent
    }

    return current.name
  }

  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase()
    return (
      emp.name?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.department?.name?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {/* 검색 */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="이름, 이메일, 조직으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>부서/직급</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead>입사일</TableHead>
                <TableHead className="text-right">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => {
                  const balance = employee.annual_leave_balance?.[0]
                  const remainingDays = balance?.remaining_days || 0
                  const totalDays = balance?.total_days || 0
                  const topDepartment = getTopLevelDepartment(employee.department_id)

                  return (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.name}
                      </TableCell>
                      <TableCell>
                        {employee.all_positions && employee.all_positions.length > 0 ? (
                          (() => {
                            const primary = employee.all_positions.find((p: any) => p.is_primary) || employee.all_positions[0]

                            if (employee.all_positions.length === 1) {
                              return (
                                <>
                                  <div>{primary.department_name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {primary.role_name}
                                  </div>
                                </>
                              )
                            }

                            const tooltipContent = (
                              <div className="space-y-1">
                                {employee.all_positions.map((pos: any, idx: number) => (
                                  <div key={idx} style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.5 }}>
                                    {pos.department_name} - {pos.role_name}
                                  </div>
                                ))}
                              </div>
                            )

                            return (
                              <div className="flex items-center gap-2">
                                <span>{primary.department_name} - {primary.role_name}</span>
                                <TooltipSimple content={tooltipContent}>
                                  <span
                                    className="cursor-help inline-flex items-center justify-center"
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      backgroundColor: 'var(--color-gray-200)',
                                      color: 'var(--foreground)',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <Ellipsis className="w-3 h-3" />
                                  </span>
                                </TooltipSimple>
                              </div>
                            )
                          })()
                        ) : (
                          <>
                            <div>{employee.department?.name || '-'}</div>
                            <div className="text-sm text-muted-foreground">
                              {employee.role?.name || '-'}
                            </div>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={employee.status} />
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.phone || '-'}</TableCell>
                      <TableCell>
                        {employee.employment_date
                          ? new Date(employee.employment_date).toLocaleDateString('ko-KR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <EmployeeModal mode="edit" employee={employee} onSuccess={loadData}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </EmployeeModal>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? '검색 결과가 없습니다'
                        : '등록된 구성원이 없습니다'}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 직원 상태 Badge
 *
 * 상태 판단 기준:
 * 1. deleted_at IS NOT NULL → 퇴사 (가장 우선)
 * 2. status = 'leave' → 휴직
 * 3. status = 'active' → 재직 (연차 사용 중 포함)
 *
 * ⚠️ 현재는 employee 객체에서 deleted_at를 받지 못하므로
 * status 값만으로 판단. 추후 deleted_at 추가 시 수정 필요.
 */
function StatusBadge({ status }: { status?: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    active: {
      label: '재직',
      className: 'bg-green-100 text-green-700',
    },
    leave: {  // inactive → leave로 변경
      label: '휴직',
      className: 'bg-yellow-100 text-yellow-700',
    },
    // resigned는 사용 안 함 (deleted_at으로 판단)
  }

  const config = (status && configs[status]) || {
    label: '재직',
    className: 'bg-green-100 text-green-700',
  }

  return <Badge className={`${config.className} !border-0`}>{config.label}</Badge>
}
