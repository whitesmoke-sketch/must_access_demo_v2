'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MemberCombobox } from '@/components/ui/member-combobox'
import { User, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface ReferenceStep {
  id: string
  memberId: string
  memberName: string
  memberPosition: string
  role?: 'cc' | 'reviewer' // 참조자 vs 합의자
}

interface Member {
  id: string
  name: string
  email?: string
  position?: string
  department_id?: number
  team?: string
  role_id?: number
}

interface ReferenceSelectorProps {
  referenceSteps: ReferenceStep[]
  setReferenceSteps: (steps: ReferenceStep[]) => void
  members: Member[]
}

export function ReferenceSelector({
  referenceSteps,
  setReferenceSteps,
  members
}: ReferenceSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  function handleAdd() {
    if (!selectedId) {
      toast.error('구성원을 선택해주세요')
      return
    }

    const member = members.find(m => m.id === selectedId)
    if (!member) return

    setReferenceSteps([...referenceSteps, {
      id: `ref-${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      memberPosition: member.position || '직원',
      role: 'cc' // 기본값: 참조자
    }])

    toast.success('결재 관련자 추가 완료', {
      description: `${member.name}님이 참조자로 추가되었습니다.`,
    })
    setIsDialogOpen(false)
    setSelectedId('')
  }

  function handleRemove(id: string) {
    setReferenceSteps(referenceSteps.filter(r => r.id !== id))
    toast.success('제거 완료')
  }

  function handleRoleChange(id: string, role: 'cc' | 'reviewer') {
    setReferenceSteps(referenceSteps.map(r =>
      r.id === id ? { ...r, role } : r
    ))
    toast.success('역할이 변경되었습니다')
  }

  return (
    <>
      <Card className="rounded-2xl" style={{
        borderRadius: 'var(--radius)',
        boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
      }}>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(22, 205, 199, 0.3)', color: 'white' }}
              >
                <User className="w-4 h-4" />
              </div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 500,
                color: 'var(--card-foreground)',
                lineHeight: 1.5
              }}>
                결재 관련자 지정 (선택)
              </h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              관련자 추가
            </Button>
          </div>

          {referenceSteps.length === 0 ? (
            <div className="text-center py-8">
              <p style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--muted-foreground)',
                lineHeight: 1.5
              }}>
                지정된 결재 관련자가 없습니다
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referenceSteps.map((reference) => {
                const roleStyles = reference.role === 'cc'
                  ? { bg: 'rgba(22, 205, 199, 0.1)', border: 'rgba(22, 205, 199, 0.3)', color: 'var(--secondary)' }
                  : { bg: 'rgba(248, 198, 83, 0.1)', border: 'rgba(248, 198, 83, 0.3)', color: 'var(--accent)' };

                return (
                  <div
                    key={reference.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg"
                    style={{
                      backgroundColor: roleStyles.bg,
                      border: `1px solid ${roleStyles.border}`
                    }}
                  >
                    <User className="w-4 h-4 flex-shrink-0" style={{ color: roleStyles.color }} />
                    <div className="flex-1">
                      <p style={{
                        fontSize: 'var(--font-size-body)',
                        fontWeight: 600,
                        color: 'var(--card-foreground)',
                        lineHeight: 1.5
                      }}>
                        {reference.memberName}
                      </p>
                      <p style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--muted-foreground)',
                        lineHeight: 1.4
                      }}>
                        {reference.memberPosition}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={reference.role || 'cc'}
                        onValueChange={(value: 'cc' | 'reviewer') => handleRoleChange(reference.id, value)}
                      >
                        <SelectTrigger className="w-[110px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cc">참조자</SelectItem>
                          <SelectItem value="reviewer">합의자</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => handleRemove(reference.id)}
                        className="p-1.5 rounded hover:bg-red-100 transition-colors"
                      >
                        <X className="w-4 h-4" style={{ color: '#EF4444' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 결재 관련자 추가 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent style={{ backgroundColor: '#F8FAFC' }}>
          <DialogHeader>
            <DialogTitle style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 'var(--font-weight-h2)',
              lineHeight: 1.3
            }}>
              결재 관련자 추가
            </DialogTitle>
            <DialogDescription style={{
              fontSize: 'var(--font-size-body)',
              lineHeight: 1.5
            }}>
              참조자 또는 합의자로 추가할 구성원을 선택하세요
            </DialogDescription>
          </DialogHeader>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
          }}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label style={{
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 500,
                  lineHeight: 1.5
                }}>
                  구성원 선택 *
                </Label>
                <MemberCombobox
                  members={members}
                  value={selectedId}
                  onValueChange={setSelectedId}
                  placeholder="구성원 검색 및 선택"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false);
              setSelectedId('');
            }}>
              취소
            </Button>
            <Button onClick={handleAdd} style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
            }}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
