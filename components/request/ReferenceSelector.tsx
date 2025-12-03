'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MemberCombobox } from '@/components/ui/member-combobox'
import { User, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReferenceStep {
  id: string
  memberId: string
  memberName: string
  memberPosition: string
  role: 'cc' // 참조자만 (합의자는 결재선에서 처리)
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

    toast.success('참조자 추가 완료', {
      description: `${member.name}님이 참조자로 추가되었습니다.`,
    })
    setIsDialogOpen(false)
    setSelectedId('')
  }

  function handleRemove(id: string) {
    setReferenceSteps(referenceSteps.filter(r => r.id !== id))
    toast.success('제거 완료')
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
                style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
              >
                <User className="w-4 h-4" />
              </div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 500,
                color: 'var(--card-foreground)',
                lineHeight: 1.5
              }}>
                참조자 지정 (선택)
              </h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              참조자 추가
            </Button>
          </div>

          {referenceSteps.length === 0 ? (
            <div className="text-center py-8">
              <p style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--muted-foreground)',
                lineHeight: 1.5
              }}>
                지정된 참조자가 없습니다
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referenceSteps.map((reference) => (
                <div
                  key={reference.id}
                  className="rounded-lg p-3"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(22, 205, 199, 0.1)' }}
                      >
                        <User className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{
                          fontSize: 'var(--font-size-body)',
                          fontWeight: 600,
                          color: 'var(--foreground)',
                          lineHeight: 1.5
                        }}>
                          {reference.memberName}
                        </p>
                        <p style={{
                          fontSize: 'var(--font-size-caption)',
                          color: 'var(--muted-foreground)',
                          lineHeight: 1.4
                        }}>
                          참조자 · {reference.memberPosition}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(reference.id)}
                        className="h-8 w-9 p-0"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: 'var(--destructive)' }} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </CardContent>
      </Card>

      {/* 참조자 추가 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="!p-4 !border-0"
          style={{ backgroundColor: 'var(--background)' }}
        >
          <DialogHeader>
            <DialogTitle style={{
              fontSize: 'var(--font-size-h4)',
              fontWeight: 'var(--font-weight-h4)',
              lineHeight: 1.3,
              color: 'var(--foreground)',
            }}>
              참조자 추가
            </DialogTitle>
            <DialogDescription style={{
              fontSize: 'var(--font-size-caption)',
              lineHeight: 1.4,
              color: 'var(--muted-foreground)',
            }}>
              참조자로 추가할 구성원을 선택하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--foreground)',
                lineHeight: 1.5
              }}>
                구성원
              </Label>
              <MemberCombobox
                members={members}
                value={selectedId}
                onValueChange={setSelectedId}
                placeholder="구성원 검색 및 선택"
                autoCloseOnSelect={false}
              />
            </div>
          </div>

          <DialogFooter>
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
