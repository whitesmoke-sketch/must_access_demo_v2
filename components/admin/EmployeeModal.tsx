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
import { Badge } from '@/components/ui/badge'
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
    resignation_date: '',
    phone: '',
    location: '',
    status: 'active',
    annual_leave_days: 0,
    used_days: 0,
    reward_leave: 0,
  })

  // 직무/부서 목록 (첫 번째 = 주 소속)
  const [positionsList, setPositionsList] = useState<Array<{
    role_id: number | null
    department_id: number | null
  }>>([{ role_id: null, department_id: null }])

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
        resignation_date: employee.resignation_date || '',
        phone: employee.phone || '',
        location: employee.location || '',
        status: employee.status || 'active',
        annual_leave_days: employee.annual_leave_balance?.[0]?.total_days || 0,
        used_days: employee.annual_leave_balance?.[0]?.used_days || 0,
        reward_leave: 0, // 하드코딩
      })

      // 전체 소속 로드 (all_positions 배열)
      if (employee.all_positions && employee.all_positions.length > 0) {
        const allPos = employee.all_positions.map((pos: any) => ({
          role_id: pos.role_id,
          department_id: pos.department_id,
        }))
        setPositionsList(allPos)
      } else {
        // all_positions 없으면 기존 department_id, role_id로 초기화
        setPositionsList([
          {
            role_id: employee.role_id || null,
            department_id: employee.department_id || null,
          },
        ])
      }
    } else {
      // 신규 생성 모드
      setPositionsList([{ role_id: null, department_id: null }])
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

    // 유효한 직무/부서 항목만 필터링
    const validPositions = positionsList.filter(
      (pos) => pos.role_id && pos.department_id
    )

    if (!formData.name || !formData.email || validPositions.length === 0) {
      toast.error('필수 항목을 입력해주세요', {
        description: '이름, 이메일, 최소 1개의 직무/부서는 필수입니다.',
      })
      return
    }

    // 첫 번째 항목 = 주 소속
    const primaryPosition = validPositions[0]
    const additionalPositions = validPositions.slice(1)

    const submitData = {
      ...formData,
      department_id: primaryPosition.department_id!,
      role_id: primaryPosition.role_id!,
      additional_positions: additionalPositions.map((pos) => ({
        department_id: pos.department_id!,
        role_id: pos.role_id!,
      })),
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

            {/* 연락처 */}
            <div className="space-y-2 col-span-2">
              <Label
                style={{
                  fontSize: 'var(--font-size-caption)',
                  fontWeight: 500,
                  lineHeight: 1.5
                }}
              >
                연락처
              </Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="010-1234-5678"
                className="md:text-[var(--font-size-body)] text-[var(--font-size-caption)]"
              />
            </div>

            {/* 직무/직책 + 부서 목록 */}
            <div className="space-y-2 col-span-2">
              <div className="flex items-center justify-between">
                <Label
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    fontWeight: 500,
                    lineHeight: 1.5
                  }}
                >
                  직무/직책 + 부서
                </Label>
              </div>

              <div className="space-y-3">
                {positionsList.map((item, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label
                          style={{
                            fontSize: 'var(--font-size-caption)',
                            fontWeight: 500,
                            lineHeight: 1.5,
                            color: 'var(--muted-foreground)'
                          }}
                        >
                          부서
                        </Label>
                        <DepartmentCombobox
                          value={item.department_id || undefined}
                          onValueChange={(val) => updatePosition(index, 'department_id', val)}
                          placeholder="부서 선택"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          style={{
                            fontSize: 'var(--font-size-caption)',
                            fontWeight: 500,
                            lineHeight: 1.5,
                            color: 'var(--muted-foreground)'
                          }}
                        >
                          직무/직책
                        </Label>
                        <RoleSelect
                          value={item.role_id}
                          onValueChange={(val) => updatePosition(index, 'role_id', val)}
                          placeholder="선임연구원"
                        />
                      </div>
                    </div>
                    {positionsList.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePosition(index)}
                        style={{ height: '42px', width: '42px', marginTop: '24px' }}
                      >
                        <Trash2 className="w-4 h-4" style={{ color: 'var(--destructive)' }} />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPosition}
                  className="w-full"
                  style={{ height: '42px' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  직무/부서 추가
                </Button>
              </div>
            </div>

            {/* 입사일, 퇴사일 */}
            <div className="space-y-2">
              <Label
                style={{
                  fontSize: 'var(--font-size-caption)',
                  fontWeight: 500,
                  lineHeight: 1.5
                }}
              >
                입사일
              </Label>
              <Input
                type="date"
                value={formData.employment_date}
                onChange={(e) =>
                  setFormData({ ...formData, employment_date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label
                style={{
                  fontSize: 'var(--font-size-caption)',
                  fontWeight: 500,
                  lineHeight: 1.5
                }}
              >
                퇴사일
              </Label>
              <Input
                type="date"
                value={formData.resignation_date}
                onChange={(e) =>
                  setFormData({ ...formData, resignation_date: e.target.value })
                }
                placeholder="퇴사 시 입력"
              />
            </div>

            {/* 근무 상태 (읽기 전용, edit 모드만) */}
            {employee && (
              <div className="space-y-2 col-span-2">
                <Label
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    fontWeight: 500,
                    lineHeight: 1.5
                  }}
                >
                  근무 상태
                </Label>
                <div>
                  <Badge
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      lineHeight: 1.4,
                      fontWeight: 600,
                      padding: '2px 8px',
                      border: 'none',
                      ...(formData.status === 'active'
                        ? { backgroundColor: 'var(--success-bg)', color: 'var(--success)' }
                        : formData.status === 'leave'
                        ? { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }
                        : { backgroundColor: 'var(--destructive-bg)', color: 'var(--destructive)' })
                    }}
                  >
                    {formData.status === 'active' ? '재직' :
                     formData.status === 'leave' ? '휴직' : '퇴사'}
                  </Badge>
                </div>
              </div>
            )}

            {/* 안내 문구 (신규 등록 시에만) */}
            {!employee && (
              <div
                className="p-3 rounded-lg col-span-2"
                style={{
                  backgroundColor: 'var(--primary-bg)',
                  border: '1px solid var(--primary-border)'
                }}
              >
                <p
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    lineHeight: 1.5,
                    color: 'var(--muted-foreground)'
                  }}
                >
                  💡 구성원 등록 시 Hubstaff 온보딩 API가 자동으로 트리거되어 계정 생성 및 초기 설정이 진행됩니다.
                </p>
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
