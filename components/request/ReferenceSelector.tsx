'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MemberCombobox } from '@/components/ui/member-combobox'
import { User, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface ReferenceStep {
  id: string
  memberId: string
  memberName: string
  memberPosition: string
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
      toast.error('참조자를 선택해주세요')
      return
    }

    const member = members.find(m => m.id === selectedId)
    if (!member) return

    setReferenceSteps([...referenceSteps, {
      id: `ref-${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      memberPosition: member.position || '직원'
    }])

    toast.success('참조자 추가 완료')
    setIsDialogOpen(false)
    setSelectedId('')
  }

  function handleRemove(id: string) {
    setReferenceSteps(referenceSteps.filter(r => r.id !== id))
    toast.success('참조자 제거 완료')
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
            <div className="flex flex-wrap gap-3">
              {referenceSteps.map((reference) => (
                <div
                  key={reference.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(22, 205, 199, 0.1)',
                    border: '1px solid rgba(22, 205, 199, 0.3)'
                  }}
                >
                  <User className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
                  <span style={{
                    fontSize: 'var(--font-size-body)',
                    color: 'var(--card-foreground)',
                    lineHeight: 1.5
                  }}>
                    {reference.memberName}
                  </span>
                  <span style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.4
                  }}>
                    ({reference.memberPosition})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(reference.id)}
                    className="ml-1 p-1 rounded hover:bg-red-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: 'var(--muted-foreground)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 참조자 추가 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>참조자 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>참조자 선택 *</Label>
              <MemberCombobox
                members={members}
                value={selectedId}
                onValueChange={setSelectedId}
                placeholder="구성원 검색 및 선택"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAdd}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
