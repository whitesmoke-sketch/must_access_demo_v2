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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Search, Edit, Trash2 } from 'lucide-react'
import { EmployeeModal } from './EmployeeModal'
import { toast } from 'sonner'
import { getEmployees, deleteEmployee } from '@/app/actions/employee'
import { createClient } from '@/lib/supabase/client'

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

  async function handleDelete(employeeId: string, employeeName: string) {
    const result = await deleteEmployee(employeeId)

    if (result.success) {
      toast.success(`${employeeName} 구성원이 삭제되었습니다`)
      loadData()
    } else {
      toast.error(result.error || '삭제에 실패했습니다')
    }
  }

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
                <TableHead>이메일</TableHead>
                <TableHead>부서</TableHead>
                <TableHead>팀</TableHead>
                <TableHead>직급</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>입사일</TableHead>
                <TableHead className="text-center">잔여 연차</TableHead>
                <TableHead className="text-center">포상휴가</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => {
                  const balance = employee.annual_leave_balance?.[0]
                  const remainingDays = balance?.remaining_days || 0
                  const totalDays = balance?.total_days || 0
                  const awardLeaveDays = employee.award_leave_balance || 0
                  const topDepartment = getTopLevelDepartment(employee.department_id)

                  return (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.name}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{topDepartment}</TableCell>
                      <TableCell>{employee.department?.name || '-'}</TableCell>
                      <TableCell>사람</TableCell>
                      <TableCell>
                        <RoleBadge roleCode={employee.role?.code} roleName={employee.role?.name} />
                      </TableCell>
                      <TableCell>
                        {employee.employment_date
                          ? new Date(employee.employment_date).toLocaleDateString('ko-KR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {remainingDays}/{totalDays}일
                      </TableCell>
                      <TableCell className="text-center text-pink-600 font-medium">
                        {awardLeaveDays}일
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <EmployeeModal mode="edit" employee={employee} onSuccess={loadData}>
                            <Button variant="ghost" size="icon">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </EmployeeModal>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>구성원 삭제</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <strong>{employee.name}</strong> 구성원을 삭제하시겠습니까?
                                  <br />이 작업은 되돌릴 수 없습니다.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(employee.id, employee.name)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  삭제
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
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

function RoleBadge({ roleCode, roleName }: { roleCode?: string; roleName?: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    ceo: {
      label: '대표',
      className: 'bg-purple-100 text-purple-700',
    },
    hr: {
      label: 'HR',
      className: 'bg-pink-100 text-pink-700',
    },
    business_leader: {
      label: '사업리더',
      className: 'bg-blue-100 text-blue-700',
    },
    department_leader: {
      label: '부서리더',
      className: 'bg-green-100 text-green-700',
    },
    team_leader: {
      label: '팀리더',
      className: 'bg-yellow-100 text-yellow-700',
    },
    employee: {
      label: '일반사원',
      className: 'bg-gray-100 text-gray-700',
    },
  }

  const config = (roleCode && configs[roleCode]) || {
    label: roleName || '구성원',
    className: 'bg-gray-100 text-gray-700',
  }

  return <Badge className={config.className}>{config.label}</Badge>
}
