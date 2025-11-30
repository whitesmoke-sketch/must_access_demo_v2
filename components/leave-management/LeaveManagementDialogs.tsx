'use client'

import { useState } from 'react'
import { Member, LeaveRequest } from '@/lib/leave-management/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LeavePolicySettings } from './LeavePolicySettings'
import { LeaveManualAdjustment } from './LeaveManualAdjustment'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeaveManagementDialogsProps {
  // Reward Grant Dialog
  isRewardGrantDialogOpen: boolean
  setIsRewardGrantDialogOpen: (open: boolean) => void
  rewardGrantFormData: {
    memberId: string
    days: number
    reason: string
    attachment: File | null
  }
  setRewardGrantFormData: (data: any) => void
  members: Member[]
  handleGrantReward: () => void
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void

  // Reject Dialog
  isRejectDialogOpen: boolean
  setIsRejectDialogOpen: (open: boolean) => void
  rejectReason: string
  setRejectReason: (reason: string) => void
  setSelectedRequestId: (id: string | null) => void
  handleRejectLeave: () => void

  // Detail Dialog
  isDetailDialogOpen: boolean
  setIsDetailDialogOpen: (open: boolean) => void
  selectedMember: Member | null
  getMemberLeaveHistory: (memberId: string) => LeaveRequest[]
  getStatusBadge: (status: string) => JSX.Element | null

  // Policy Dialog
  isPolicyDialogOpen: boolean
  setIsPolicyDialogOpen: (open: boolean) => void

  // Manual Dialog
  isManualDialogOpen: boolean
  setIsManualDialogOpen: (open: boolean) => void
}

export function LeaveManagementDialogs({
  isRewardGrantDialogOpen,
  setIsRewardGrantDialogOpen,
  rewardGrantFormData,
  setRewardGrantFormData,
  members,
  handleGrantReward,
  handleFileChange,
  isRejectDialogOpen,
  setIsRejectDialogOpen,
  rejectReason,
  setRejectReason,
  setSelectedRequestId,
  handleRejectLeave,
  isDetailDialogOpen,
  setIsDetailDialogOpen,
  selectedMember,
  getMemberLeaveHistory,
  getStatusBadge,
  isPolicyDialogOpen,
  setIsPolicyDialogOpen,
  isManualDialogOpen,
  setIsManualDialogOpen,
}: LeaveManagementDialogsProps) {
  const [memberComboOpen, setMemberComboOpen] = useState(false)

  return (
    <>
      {/* 포상휴가 부여 모달 */}
      <Dialog open={isRewardGrantDialogOpen} onOpenChange={setIsRewardGrantDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle
              style={{ fontSize: 'var(--font-size-h2)', fontWeight: 'var(--font-weight-h2)', lineHeight: 1.3 }}
            >
              포상휴가 부여
            </DialogTitle>
            <DialogDescription style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}>
              구성원에게 포상휴가를 부여합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>대상자 *</Label>
              <Popover open={memberComboOpen} onOpenChange={setMemberComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={memberComboOpen}
                    className="w-full justify-between"
                  >
                    {rewardGrantFormData.memberId
                      ? members.find(member => member.id === rewardGrantFormData.memberId)?.name +
                        ' (' +
                        members.find(member => member.id === rewardGrantFormData.memberId)?.team +
                        ' · ' +
                        members.find(member => member.id === rewardGrantFormData.memberId)?.position +
                        ')'
                      : '구성원 선택'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="구성원 검색..." />
                    <CommandList>
                      <CommandEmpty>구성원을 찾을 수 없습니다.</CommandEmpty>
                      <CommandGroup>
                        {members.map(member => (
                          <CommandItem
                            key={member.id}
                            value={`${member.name} ${member.team} ${member.position}`}
                            onSelect={() => {
                              setRewardGrantFormData({ ...rewardGrantFormData, memberId: member.id })
                              setMemberComboOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                rewardGrantFormData.memberId === member.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {member.name} ({member.team} · {member.position})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>일수 *</Label>
              <Input
                type="number"
                min="1"
                value={rewardGrantFormData.days}
                onChange={e =>
                  setRewardGrantFormData({
                    ...rewardGrantFormData,
                    days: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>사유 *</Label>
              <Textarea
                value={rewardGrantFormData.reason}
                onChange={e => setRewardGrantFormData({ ...rewardGrantFormData, reason: e.target.value })}
                placeholder="포상휴가 부여 사유를 입력하세요"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>
                첨부파일 (선택)
              </Label>
              <Input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
              <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                PDF, DOC, DOCX, JPG, PNG 파일만 업로드 가능
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRewardGrantDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleGrantReward}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              포상휴가 부여
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 반려 사유 입력 모달 */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle
              style={{ fontSize: 'var(--font-size-h2)', fontWeight: 'var(--font-weight-h2)', lineHeight: 1.3 }}
            >
              연차 신청 반려
            </DialogTitle>
            <DialogDescription style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}>
              반려 사유를 입력해주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>
                반려 사유 *
              </Label>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="반려 사유를 입력하세요"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false)
                setRejectReason('')
                setSelectedRequestId(null)
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleRejectLeave}
              style={{
                backgroundColor: '#FF6B6B',
                color: 'white',
              }}
            >
              반려 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상세 연차 내역 모달 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontSize: '20px', fontWeight: 500, lineHeight: 1.3, color: '#29363D' }}>
              연차 상세 내역
            </DialogTitle>
            <DialogDescription style={{ fontSize: '16px', lineHeight: 1.5, color: '#5B6A72' }}>
              구성원의 연차 현황과 사용 이력을 확인합니다
            </DialogDescription>
          </DialogHeader>

          <div>
            {selectedMember && (
              <div className="space-y-4">
                {/* 사용자 정보 */}
                <div className="flex items-center gap-4 p-4 rounded-lg" style={{ backgroundColor: '#F6F8F9' }}>
                  <Avatar className="h-16 w-16">
                    <AvatarFallback
                      style={{ backgroundColor: 'var(--primary)', color: 'white', fontSize: '20px', fontWeight: 600 }}
                    >
                      {selectedMember.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#29363D', lineHeight: 1.5 }}>
                      {selectedMember.name}
                    </h3>
                    <p style={{ fontSize: '16px', color: '#5B6A72', lineHeight: 1.5 }}>
                      {selectedMember.team} · {selectedMember.position}
                    </p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: '14px', color: '#5B6A72', lineHeight: 1.5 }}>잔여 연차</p>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', lineHeight: 1.2 }}>
                      {selectedMember.annualLeave - selectedMember.usedAnnualLeave}일
                    </p>
                  </div>
                </div>

                {/* 연차 통계 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(41, 54, 61, 0.05)' }}>
                    <p style={{ fontSize: '14px', color: '#5B6A72', lineHeight: 1.5 }}>총 연차</p>
                    <p
                      style={{ fontSize: '20px', fontWeight: 700, color: '#29363D', lineHeight: 1.2, marginTop: '4px' }}
                    >
                      {selectedMember.annualLeave}일
                    </p>
                  </div>
                  <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(91, 106, 114, 0.05)' }}>
                    <p style={{ fontSize: '14px', color: '#5B6A72', lineHeight: 1.5 }}>사용 연차</p>
                    <p
                      style={{ fontSize: '20px', fontWeight: 700, color: '#5B6A72', lineHeight: 1.2, marginTop: '4px' }}
                    >
                      {selectedMember.usedAnnualLeave}일
                    </p>
                  </div>
                  <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#FFE5EC' }}>
                    <p style={{ fontSize: '14px', color: '#FF6692', lineHeight: 1.5 }}>포상 휴가</p>
                    <p
                      style={{ fontSize: '20px', fontWeight: 700, color: '#FF6692', lineHeight: 1.2, marginTop: '4px' }}
                    >
                      {selectedMember.rewardLeave - selectedMember.usedRewardLeave}일
                    </p>
                  </div>
                </div>

                {/* 사용 이력 */}
                <div>
                  <h4
                    style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      color: '#29363D',
                      lineHeight: 1.5,
                      marginBottom: '16px',
                    }}
                  >
                    연차 사용 이력
                  </h4>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {getMemberLeaveHistory(selectedMember.id).length === 0 ? (
                      <p className="text-center py-8" style={{ color: '#5B6A72', fontSize: '16px', lineHeight: 1.5 }}>
                        사용 이력이 없습니다
                      </p>
                    ) : (
                      getMemberLeaveHistory(selectedMember.id).map(leave => (
                        <div key={leave.id} className="p-3 rounded-lg" style={{ backgroundColor: '#F6F8F9' }}>
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <p style={{ fontSize: '16px', fontWeight: 600, color: '#29363D', lineHeight: 1.5 }}>
                                {leave.leaveType === 'annual'
                                  ? '연차'
                                  : leave.leaveType === 'reward'
                                  ? '포상휴가'
                                  : '연차'}{' '}
                                · {leave.days || 1}일
                              </p>
                              <p
                                style={{
                                  fontSize: '14px',
                                  color: '#5B6A72',
                                  lineHeight: 1.5,
                                  marginTop: '4px',
                                }}
                              >
                                {new Date(leave.startDate).toLocaleDateString('ko-KR')} ~{' '}
                                {new Date(leave.endDate).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                            {getStatusBadge(leave.status)}
                          </div>
                          {leave.reason && (
                            <p style={{ fontSize: '14px', color: '#5B6A72', lineHeight: 1.5, marginTop: '8px' }}>
                              사유: {leave.reason}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 정책 설정 모달 */}
      <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              style={{ fontSize: 'var(--font-size-h1)', fontWeight: 'var(--font-weight-h1)', lineHeight: 1.25 }}
            >
              휴가 정책 설정
            </DialogTitle>
            <DialogDescription style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}>
              회사의 휴가 정책과 부재유형을 설정합니다
            </DialogDescription>
          </DialogHeader>
          <LeavePolicySettings onBack={() => setIsPolicyDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* 연차 수동 관리 모달 */}
      <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              style={{ fontSize: 'var(--font-size-h1)', fontWeight: 'var(--font-weight-h1)', lineHeight: 1.25 }}
            >
              연차 수동 관리
            </DialogTitle>
            <DialogDescription style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}>
              구성원의 연차를 검색하고 수동으로 조정합니다
            </DialogDescription>
          </DialogHeader>
          <LeaveManualAdjustment onBack={() => setIsManualDialogOpen(false)} members={members} />
        </DialogContent>
      </Dialog>
    </>
  )
}
