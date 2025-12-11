'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createEmployee, updateEmployee, type AdditionalPosition } from '@/app/actions/employee'
import { DepartmentCombobox } from './DepartmentCombobox'
import { RoleSelect } from './RoleSelect'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

interface Role {
  id: number
  name: string
  code: string
  level: number
}

interface EmployeeModalProps {
  mode: 'create' | 'edit'
  employee?: any
  children: React.ReactNode
  onSuccess?: () => void
}

export function EmployeeModal({
  mode,
  employee,
  children,
  onSuccess,
}: EmployeeModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department_id: 0,
    role_id: 0,
    employment_date: '',
    phone: '',
    location: '',
    annual_leave_days: 0,
    used_days: 0,
    reward_leave: 0,
  })

  // 추가 소속 관리용 상태
  const [positionsList, setPositionsList] = useState<Array<{
    department_id: number | null
    role_id: number | null
  }>>( [])

  // 모달이 열릴 때만 roles를 fetch (중복 호출 방지)
  useEffect(() => {
    if (open && roles.length === 0) {
      loadRoles()
    }
  }, [open])

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        department_id: employee.department_id || 0,
        role_id: employee.role_id || 0,
        employment_date: employee.employment_date || '',
        phone: employee.phone || '',
        location: employee.location || '',
        annual_leave_days: employee.annual_leave_balance?.[0]?.total_days || 0,
        used_days: employee.annual_leave_balance?.[0]?.used_days || 0,
        reward_leave: 0, // 하드코딩
      })

      // 추가 소속 로드 (is_primary=false인 항목들)
      if (employee.all_positions) {
        const additionalPos = employee.all_positions
          .filter((pos: any) => !pos.is_primary)
          .map((pos: any) => ({
            department_id: pos.department_id,
            role_id: pos.role_id,
          }))
        setPositionsList(additionalPos)
      } else {
        setPositionsList([])
      }
    }
  }, [employee])

  async function loadRoles() {
    const supabase = createClient()
    const { data } = await supabase
      .from('role')
      .select('*')
      .order('level', { ascending: true })

    if (data) {
      setRoles(data)
    }
  }

  // 추가 소속 핸들러
  const addPosition = () => {
    setPositionsList([...positionsList, { department_id: null, role_id: null }])
  }

  const removePosition = (index: number) => {
    setPositionsList(positionsList.filter((_, i) => i !== index))
  }

  const updatePosition = (
    index: number,
    field: 'department_id' | 'role_id',
    value: number
  ) => {
    const updated = positionsList.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
    setPositionsList(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.department_id || !formData.role_id) {
      toast.error('필수 항목을 입력해주세요')
      return
    }

    // 추가 소속 데이터 정리 (빈 항목 제거, 주 소속과 중복 체크)
    const validAdditionalPositions: AdditionalPosition[] = positionsList
      .filter((pos) => pos.department_id && pos.role_id) // null 제거
      .filter((pos) =>
        // 주 소속과 동일한 부서/역할 조합 제거
        !(pos.department_id === formData.department_id && pos.role_id === formData.role_id)
      )
      .map((pos) => ({
        department_id: pos.department_id!,
        role_id: pos.role_id!,
      }))

    const submitData = {
      ...formData,
      additional_positions: validAdditionalPositions,
    }

    setLoading(true)

    try {
      let result
      if (mode === 'create') {
        result = await createEmployee(submitData)
      } else {
        result = await updateEmployee(employee.id, submitData)
      }

      if (result.success) {
        toast.success(
          mode === 'create'
            ? '구성원이 추가되었습니다'
            : '구성원 정보가 수정되었습니다'
        )
        setOpen(false)
        onSuccess?.()
      } else {
        toast.error(result.error || '작업에 실패했습니다')
      }
    } catch (error: any) {
      toast.error('오류가 발생했습니다')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '구성원 추가' : '구성원 수정'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? '새로운 구성원을 추가합니다.'
              : '구성원 정보를 수정합니다.'}
          </DialogDescription>
        </DialogHeader>

        <Card className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
            {/* 이름 */}
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="홍길동"
                required
              />
            </div>

            {/* 이메일 */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="hong@must.com"
                required
                disabled={mode === 'edit'} // 수정 시 이메일 변경 불가
              />
            </div>

            {/* 주 소속 섹션 */}
            <div className="col-span-2 space-y-3">
              <Label className="text-base font-semibold">주 소속</Label>

              <div className="grid grid-cols-2 gap-4">
                {/* 조직 (부서/팀 통합) */}
                <div className="space-y-2 col-span-2">
                  <Label>조직/부서 *</Label>
                  <DepartmentCombobox
                    value={formData.department_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, department_id: value })
                    }
                  />
                </div>

                {/* 역할 */}
                <div className="space-y-2">
                  <Label>역할 *</Label>
                  <RoleSelect
                    value={formData.role_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role_id: value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* 추가 소속 섹션 (겸직) */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">추가 소속 (겸직)</Label>
                <span className="text-xs text-muted-foreground">선택사항</span>
              </div>

              {positionsList.length > 0 && (
                <div className="space-y-3">
                  {positionsList.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-3 items-start p-3 bg-muted/50 rounded-lg border"
                    >
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-sm">부서</Label>
                          <DepartmentCombobox
                            value={item.department_id || undefined}
                            onValueChange={(val) => updatePosition(index, 'department_id', val)}
                            placeholder="부서 선택"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">역할</Label>
                          <RoleSelect
                            value={item.role_id}
                            onValueChange={(val) => updatePosition(index, 'role_id', val)}
                            placeholder="역할 선택"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePosition(index)}
                        className="mt-6 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={addPosition}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                추가 소속 추가
              </Button>
            </div>

            {/* 입사일 */}
            <div className="space-y-2">
              <Label htmlFor="employment_date">입사일</Label>
              <Input
                id="employment_date"
                type="date"
                value={formData.employment_date}
                onChange={(e) =>
                  setFormData({ ...formData, employment_date: e.target.value })
                }
              />
            </div>

            {/* 연락처 */}
            <div className="space-y-2">
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="010-1234-5678"
              />
            </div>

            {/* 연차 정보 (읽기 전용) */}
            {mode === 'edit' && (
              <div className="space-y-2 col-span-2">
                <Label>현재 연차 현황</Label>
                <div className="p-3 bg-gray-50 rounded-md border">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">총 연차</p>
                      <p className="font-semibold">{formData.annual_leave_days}일</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">사용</p>
                      <p className="font-semibold">{formData.used_days}일</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">잔여</p>
                      <p className="font-semibold text-blue-600">
                        {formData.annual_leave_days - formData.used_days}일
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    * 연차는 별도 관리 메뉴에서 부여/조정할 수 있습니다
                  </p>
                </div>
              </div>
            )}
              </div>

              {/* 버튼 */}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  취소
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading
                    ? mode === 'create'
                      ? '추가 중...'
                      : '수정 중...'
                    : mode === 'create'
                    ? '추가'
                    : '수정'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
