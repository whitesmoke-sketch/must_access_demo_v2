'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MemberCombobox } from '@/components/ui/member-combobox'
import { User, Plus, Edit2, ChevronRight, Upload, Save } from 'lucide-react'
import { toast } from 'sonner'
import { generateDefaultApprovers } from '@/app/actions/approval'
import { ApprovalTemplateLoadModal } from '@/components/approval/approval-template-modal'
import { ApprovalTemplateSaveModal } from '@/components/approval/approval-template-save-modal'

interface ApprovalStep {
  order: number
  approverId: string
  approverName: string
  approverPosition: string
  isDelegated?: boolean
  delegateId?: string
  delegateName?: string
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

interface CurrentUser {
  id: string
  name: string
  position?: string
}

interface ApprovalLineSelectorProps {
  approvalSteps: ApprovalStep[]
  setApprovalSteps: (steps: ApprovalStep[]) => void
  members: Member[]
  currentUser: CurrentUser
}

export function ApprovalLineSelector({
  approvalSteps,
  setApprovalSteps,
  members,
  currentUser
}: ApprovalLineSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isDelegating, setIsDelegating] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)

  // 결재 가능한 구성원만 필터링 (현재 사용자 제외)
  const approvalMembers = members.filter(m => m.id !== currentUser?.id)

  // 자동 결재선 생성 (컴포넌트 마운트 시)
  useEffect(() => {
    if (approvalSteps.length === 0) {
      loadDefaultApprovers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDefaultApprovers() {
    const result = await generateDefaultApprovers('leave')
    if (result.success && result.data) {
      const defaultSteps: ApprovalStep[] = result.data.map((approver, index) => ({
        order: index + 1,
        approverId: approver.id,
        approverName: approver.name,
        approverPosition: approver.role.name
      }))
      setApprovalSteps(defaultSteps)
      toast.success('자동 결재선이 설정되었습니다')
    }
  }

  function handleLoadTemplate(template: {
    approvers: Array<{
      id: string
      name: string
      role: string
    }>
  }) {
    const loadedSteps: ApprovalStep[] = template.approvers.map((approver, index) => ({
      order: index + 1,
      approverId: approver.id,
      approverName: approver.name,
      approverPosition: approver.role
    }))
    setApprovalSteps(loadedSteps)
    toast.success('템플릿을 불러왔습니다')
  }

  function openDialog(index: number | null, delegating: boolean = false) {
    setEditingIndex(index)
    setIsDelegating(delegating)
    setSelectedId('')
    setIsDialogOpen(true)
  }

  function handleConfirm() {
    if (!selectedId) {
      toast.error('구성원을 선택해주세요')
      return
    }

    const member = members.find(m => m.id === selectedId)
    if (!member) return

    if (editingIndex === null) {
      // 새 결재자 추가
      setApprovalSteps([...approvalSteps, {
        order: approvalSteps.length + 1,
        approverId: member.id,
        approverName: member.name,
        approverPosition: member.position || '직원'
      }])
      toast.success('결재자 추가 완료')
    } else if (isDelegating) {
      // 대결자 지정
      const updated = [...approvalSteps]
      updated[editingIndex] = {
        ...updated[editingIndex],
        isDelegated: true,
        delegateId: member.id,
        delegateName: member.name
      }
      setApprovalSteps(updated)
      toast.success('대결자 지정 완료')
    } else {
      // 결재자 변경
      const updated = [...approvalSteps]
      updated[editingIndex] = {
        ...updated[editingIndex],
        approverId: member.id,
        approverName: member.name,
        approverPosition: member.position || '직원',
        isDelegated: false,
        delegateId: undefined,
        delegateName: undefined
      }
      setApprovalSteps(updated)
      toast.success('결재자 변경 완료')
    }

    setIsDialogOpen(false)
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
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                3
              </div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 500,
                color: 'var(--card-foreground)',
                lineHeight: 1.5
              }}>
                결재선 지정
              </h3>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowLoadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                불러오기
              </Button>
              {approvalSteps.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowSaveModal(true)}>
                  <Save className="w-4 h-4 mr-2" />
                  저장하기
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => openDialog(null)}>
                <Plus className="w-4 h-4 mr-2" />
                결재자 추가
              </Button>
            </div>
          </div>

          {approvalSteps.length === 0 ? (
            <div className="text-center py-8">
              <p style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--muted-foreground)',
                lineHeight: 1.5
              }}>
                결재선이 설정되지 않았습니다
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 신청자 */}
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <User className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <div className="flex-1">
                  <p style={{
                    fontSize: 'var(--font-size-body)',
                    fontWeight: 600,
                    color: 'var(--card-foreground)',
                    lineHeight: 1.5
                  }}>
                    {currentUser?.name}
                  </p>
                  <p style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.4
                  }}>
                    신청자 · {currentUser?.position || '직원'}
                  </p>
                </div>
                <Badge style={{
                  backgroundColor: 'rgba(22, 205, 199, 0.1)',
                  color: 'var(--secondary)',
                  fontSize: 'var(--font-size-caption)',
                }}>
                  작성 중
                </Badge>
              </div>

              {/* 결재자들 */}
              {approvalSteps.map((step, index) => (
                <div key={step.order}>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(99, 91, 255, 0.1)' }}
                    >
                      <User className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="flex-1">
                      <p style={{
                        fontSize: 'var(--font-size-body)',
                        fontWeight: 600,
                        color: 'var(--card-foreground)',
                        lineHeight: 1.5
                      }}>
                        {step.isDelegated && step.delegateName
                          ? `${step.delegateName} (대결)`
                          : step.approverName}
                      </p>
                      <p style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--muted-foreground)',
                        lineHeight: 1.4
                      }}>
                        결재자 {step.order} · {step.approverPosition}
                        {step.isDelegated && ` (원 결재자: ${step.approverName})`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(index, false)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(index, true)}
                      >
                        대결
                      </Button>
                    </div>
                  </div>

                  {index < approvalSteps.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ChevronRight className="w-5 h-5 rotate-90" style={{ color: 'var(--muted-foreground)' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 결재자 선택 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIndex === null ? '결재자 추가' : (isDelegating ? '대결자 지정' : '결재자 변경')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {editingIndex === null ? '결재자 선택 *' : (isDelegating ? '대결자 선택 *' : '결재자 선택 *')}
              </Label>
              <MemberCombobox
                members={approvalMembers}
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
            <Button onClick={handleConfirm}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 템플릿 불러오기 모달 */}
      <ApprovalTemplateLoadModal
        open={showLoadModal}
        onOpenChange={setShowLoadModal}
        requestType="leave"
        onSelectTemplate={handleLoadTemplate}
      />

      {/* 템플릿 저장 모달 */}
      <ApprovalTemplateSaveModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        requestType="leave"
        approverIds={approvalSteps.map(step => step.approverId)}
      />
    </>
  )
}
