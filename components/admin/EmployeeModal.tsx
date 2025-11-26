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
import { createEmployee, updateEmployee } from '@/app/actions/employee'
import { DepartmentCombobox } from './DepartmentCombobox'
import { createClient } from '@/lib/supabase/client'

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

  useEffect(() => {
    loadRoles()
  }, [])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.department_id || !formData.role_id) {
      toast.error('필수 항목을 입력해주세요')
      return
    }

    setLoading(true)

    try {
      let result
      if (mode === 'create') {
        result = await createEmployee(formData)
      } else {
        result = await updateEmployee(employee.id, formData)
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

            {/* 조직 (부서/팀 통합) */}
            <div className="space-y-2 col-span-2">
              <Label>조직 *</Label>
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
              <Select
                value={formData.role_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, role_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="역할 선택" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
      </DialogContent>
    </Dialog>
  )
}
