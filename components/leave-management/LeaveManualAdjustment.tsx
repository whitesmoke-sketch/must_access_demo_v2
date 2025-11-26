'use client'

import React, { useState } from 'react'
import { Plus, Minus, Check, ChevronsUpDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Member } from '@/lib/leave-management/types'
import { addLeaveManual, deductLeaveManual } from '@/lib/leave-management/actions'
import { useRouter } from 'next/navigation'

interface LeaveManualAdjustmentProps {
  onBack: () => void
  members: Member[]
}

export function LeaveManualAdjustment({ onBack, members }: LeaveManualAdjustmentProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeductDialogOpen, setIsDeductDialogOpen] = useState(false)
  const [adjustmentDays, setAdjustmentDays] = useState(1)
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const memberList = members || []

  const handleSelectMember = (memberId: string) => {
    const member = memberList.find((m) => m.id === memberId)
    setSelectedMember(member || null)
    setOpen(false)
  }

  const handleAddLeave = async () => {
    if (!selectedMember) return
    if (!adjustmentReason.trim()) {
      toast.error('사유를 입력해주세요.')
      return
    }

    setIsLoading(true)
    try {
      await addLeaveManual(selectedMember.id, adjustmentDays, adjustmentReason)

      toast.success(`${selectedMember.name}님에게 연차 ${adjustmentDays}일이 추가되었습니다.`)
      setIsAddDialogOpen(false)
      setAdjustmentDays(1)
      setAdjustmentReason('')

      // 선택된 멤버 정보 업데이트
      setSelectedMember({
        ...selectedMember,
        annualLeave: selectedMember.annualLeave + adjustmentDays,
      })

      router.refresh()
    } catch (error) {
      console.error('Failed to add leave:', error)
      toast.error('연차 추가에 실패했습니다', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeductLeave = async () => {
    if (!selectedMember) return
    if (!adjustmentReason.trim()) {
      toast.error('사유를 입력해주세요.')
      return
    }

    const remaining = selectedMember.annualLeave - selectedMember.usedAnnualLeave
    if (adjustmentDays > remaining) {
      toast.error('차감 일수가 잔여 연차보다 많습니다.')
      return
    }

    setIsLoading(true)
    try {
      await deductLeaveManual(selectedMember.id, adjustmentDays, adjustmentReason)

      toast.success(`${selectedMember.name}님의 연차 ${adjustmentDays}일이 차감되었습니다.`)
      setIsDeductDialogOpen(false)
      setAdjustmentDays(1)
      setAdjustmentReason('')

      // 선택된 멤버 정보 업데이트
      setSelectedMember({
        ...selectedMember,
        usedAnnualLeave: selectedMember.usedAnnualLeave + adjustmentDays,
      })

      router.refresh()
    } catch (error) {
      console.error('Failed to deduct leave:', error)
      toast.error('연차 차감에 실패했습니다', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Section */}
      <Card style={{ borderRadius: 'var(--radius)', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
        <CardHeader>
          <CardTitle style={{ color: 'var(--card-foreground)', fontSize: 'var(--font-size-h2)', fontWeight: 'var(--font-weight-h2)', lineHeight: 1.3 }}>
            구성원 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between h-11"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: selectedMember ? 'var(--foreground)' : 'var(--muted-foreground)',
                }}
              >
                {selectedMember ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback
                        className="text-xs"
                        style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                      >
                        {selectedMember.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{selectedMember.name}</span>
                    <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--font-size-caption)' }}>
                      {selectedMember.position} · {selectedMember.team}
                    </span>
                  </div>
                ) : (
                  "구성원을 선택하세요"
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0" align="start">
              <Command>
                <CommandInput placeholder="이름 또는 팀으로 검색..." />
                <CommandList>
                  <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                  <CommandGroup>
                    {memberList.map((member) => (
                      <CommandItem
                        key={member.id}
                        value={`${member.name} ${member.team} ${member.position}`}
                        onSelect={() => handleSelectMember(member.id)}
                        className="flex items-center justify-between py-3"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, color: 'var(--card-foreground)', lineHeight: 1.5 }}>
                              {member.name}
                            </p>
                            <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                              {member.position} · {member.team}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                              잔여
                            </p>
                            <p style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, color: 'var(--primary)', lineHeight: 1.5 }}>
                              {member.annualLeave - member.usedAnnualLeave}일
                            </p>
                          </div>
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedMember?.id === member.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* 연차 원장 상세 조회 */}
      {selectedMember && (
        <>
          <Card className="rounded-2xl" style={{ borderRadius: 'var(--radius)', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
            <CardHeader>
              <CardTitle style={{ color: 'var(--card-foreground)', fontSize: 'var(--font-size-h2)', fontWeight: 'var(--font-weight-h2)', lineHeight: 1.3 }}>
                연차 원장 상세 조회
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 구성원 정보 */}
                <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <Avatar className="w-16 h-16">
                    <AvatarFallback style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', fontSize: '24px' }}>
                      {selectedMember.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p style={{ fontSize: 'var(--font-size-h4)', fontWeight: 500, color: 'var(--card-foreground)', lineHeight: 1.5 }}>
                      {selectedMember.name}
                    </p>
                    <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                      {selectedMember.position} · {selectedMember.team}
                    </p>
                  </div>
                </div>

                {/* 연차 현황 */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg flex flex-col justify-between" style={{ backgroundColor: 'var(--muted)', minHeight: '100px' }}>
                    <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                      총 부여 연차
                    </p>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.2 }}>
                      {selectedMember.annualLeave}일
                    </p>
                  </div>
                  <div className="p-4 rounded-lg flex flex-col justify-between" style={{ backgroundColor: 'var(--muted)', minHeight: '100px' }}>
                    <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                      사용 연차
                    </p>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--muted-foreground)', lineHeight: 1.2 }}>
                      {selectedMember.usedAnnualLeave}일
                    </p>
                  </div>
                  <div className="p-4 rounded-lg flex flex-col justify-between" style={{ backgroundColor: 'rgba(99, 91, 255, 0.1)', minHeight: '100px' }}>
                    <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--primary)', lineHeight: 1.4 }}>
                      잔여 연차
                    </p>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', lineHeight: 1.2 }}>
                      {selectedMember.annualLeave - selectedMember.usedAnnualLeave}일
                    </p>
                  </div>
                  <div className="p-4 rounded-lg flex flex-col justify-between" style={{ backgroundColor: 'rgba(255, 102, 146, 0.1)', minHeight: '100px' }}>
                    <p style={{ fontSize: 'var(--font-size-caption)', color: '#FF6692', lineHeight: 1.4 }}>
                      포상휴가 잔여량
                    </p>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#FF6692', lineHeight: 1.2 }}>
                      {(selectedMember.rewardLeave || 0) - (selectedMember.usedRewardLeave || 0)}일
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 수동 조정 기능 */}
          <Card className="rounded-2xl" style={{ borderRadius: 'var(--radius)', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
            <CardHeader>
              <CardTitle style={{ color: 'var(--card-foreground)', fontSize: 'var(--font-size-h2)', fontWeight: 'var(--font-weight-h2)', lineHeight: 1.3 }}>
                수동 조정
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="flex-1"
                  style={{
                    backgroundColor: 'rgba(76, 212, 113, 0.1)',
                    color: '#4CD471',
                    fontSize: 'var(--font-size-body)',
                    fontWeight: 500,
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  연차 추가 부여
                </Button>
                <Button
                  onClick={() => setIsDeductDialogOpen(true)}
                  className="flex-1"
                  style={{
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    color: '#FF6B6B',
                    fontSize: 'var(--font-size-body)',
                    fontWeight: 500,
                  }}
                >
                  <Minus className="w-4 h-4 mr-2" />
                  연차 차감
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 연차 추가 모달 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontSize: 'var(--font-size-h2)', fontWeight: 'var(--font-weight-h2)', lineHeight: 1.3 }}>
              연차 추가 부여
            </DialogTitle>
            <DialogDescription style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}>
              {selectedMember?.name}님에게 연차를 추가로 부여합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>추가 일수 *</Label>
              <Input
                type="number"
                min="1"
                value={adjustmentDays}
                onChange={(e) => setAdjustmentDays(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>사유 *</Label>
              <Textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="연차 추가 부여 사유를 입력하세요"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isLoading}>
              취소
            </Button>
            <Button
              onClick={handleAddLeave}
              disabled={isLoading}
              style={{ backgroundColor: '#4CD471', color: 'white' }}
            >
              {isLoading ? '처리 중...' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 연차 차감 모달 */}
      <Dialog open={isDeductDialogOpen} onOpenChange={setIsDeductDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontSize: 'var(--font-size-h2)', fontWeight: 'var(--font-weight-h2)', lineHeight: 1.3 }}>
              연차 차감
            </DialogTitle>
            <DialogDescription style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}>
              {selectedMember?.name}님의 연차를 차감합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 107, 107, 0.1)' }}>
              <p style={{ fontSize: 'var(--font-size-caption)', color: '#FF6B6B', lineHeight: 1.4 }}>
                잔여 연차: {selectedMember ? selectedMember.annualLeave - selectedMember.usedAnnualLeave : 0}일
              </p>
            </div>

            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>차감 일수 *</Label>
              <Input
                type="number"
                min="1"
                max={selectedMember ? selectedMember.annualLeave - selectedMember.usedAnnualLeave : 0}
                value={adjustmentDays}
                onChange={(e) => setAdjustmentDays(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>사유 *</Label>
              <Textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="연차 차감 사유를 입력하세요 (필수)"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeductDialogOpen(false)} disabled={isLoading}>
              취소
            </Button>
            <Button
              onClick={handleDeductLeave}
              disabled={isLoading}
              style={{ backgroundColor: '#FF6B6B', color: 'white' }}
            >
              {isLoading ? '처리 중...' : '차감'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
