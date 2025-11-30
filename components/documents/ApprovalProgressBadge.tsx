'use client'

import React from 'react'
import { Check } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ApproverInfo {
  name: string
  status: 'completed' | 'pending' | 'waiting'
  department?: string
  role?: string
  stepType?: string // 'single' | 'agreement'
  stepOrder?: number
}

interface ApprovalStage {
  stepOrder: number
  approvers: ApproverInfo[]
  reviewers: ApproverInfo[] // 합의자
}

interface ApprovalProgressBadgeProps {
  approvers: ApproverInfo[]
}

export function ApprovalProgressBadge({ approvers }: ApprovalProgressBadgeProps) {
  // approvers를 단계별로 그룹화 (stages 생성)
  const stages: ApprovalStage[] = React.useMemo(() => {
    const stageMap = new Map<number, ApprovalStage>()

    approvers.forEach((approver, index) => {
      const stepOrder = approver.stepOrder ?? (index + 1)

      if (!stageMap.has(stepOrder)) {
        stageMap.set(stepOrder, {
          stepOrder,
          approvers: [],
          reviewers: [],
        })
      }

      const stage = stageMap.get(stepOrder)!

      // agreement 타입이면 reviewers(합의자)로, 아니면 approvers로
      if (approver.stepType === 'agreement') {
        stage.reviewers.push(approver)
      } else {
        stage.approvers.push(approver)
      }
    })

    // stepOrder 순으로 정렬
    return Array.from(stageMap.values()).sort((a, b) => a.stepOrder - b.stepOrder)
  }, [approvers])

  const getStageStatus = (stage: ApprovalStage): 'completed' | 'pending' | 'waiting' => {
    const allMembers = [...stage.approvers, ...stage.reviewers]

    if (allMembers.every(member => member.status === 'completed')) {
      return 'completed'
    }

    if (allMembers.some(member => member.status === 'pending')) {
      return 'pending'
    }

    return 'waiting'
  }

  const getStageColor = (status: 'completed' | 'pending' | 'waiting') => {
    switch (status) {
      case 'completed':
        return { iconFill: 'var(--secondary)', textColor: 'var(--secondary)' }
      case 'pending':
        return { iconFill: 'var(--secondary)', textColor: 'var(--secondary)' }
      case 'waiting':
        return { iconFill: 'var(--muted-foreground)', textColor: 'var(--muted-foreground)' }
      default:
        return { iconFill: 'var(--muted-foreground)', textColor: 'var(--muted-foreground)' }
    }
  }

  const getCheckIconColor = (status: 'completed' | 'pending' | 'waiting') => {
    return status === 'completed' ? 'var(--secondary)' : 'var(--muted-foreground)'
  }

  const renderStageIcon = (status: 'completed' | 'pending' | 'waiting', colors: ReturnType<typeof getStageColor>) => {
    if (status === 'completed') {
      return (
        <div className="size-[12px] relative">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
            <circle cx="6" cy="6" fill={colors.iconFill} r="6" />
            <path
              d="M4 6L5.5 7.5L8 5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
      )
    }

    if (status === 'pending') {
      return (
        <div className="size-[12px] relative">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
            <circle cx="6" cy="6" fill={colors.iconFill} opacity="0.3" r="6" />
            <circle cx="6" cy="6" fill={colors.iconFill} r="3" />
          </svg>
        </div>
      )
    }

    return (
      <div className="size-[6px] relative">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 6">
          <circle cx="3" cy="3" fill={colors.iconFill} r="3" />
        </svg>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="relative rounded-[6.8px] inline-flex items-center px-2"
        style={{
          height: '22px',
          backgroundColor: 'var(--secondary-bg)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-[8px]">
          {stages.map((stage, stageIndex) => {
            const stageStatus = getStageStatus(stage)
            const colors = getStageColor(stageStatus)

            return (
              <React.Fragment key={stageIndex}>
                {stageIndex > 0 && (
                  <div className="w-[8px] h-[1px]">
                    <svg
                      className="block w-full h-full"
                      fill="none"
                      preserveAspectRatio="none"
                      viewBox="0 0 8 1"
                    >
                      <line
                        stroke="var(--color-gray-300)"
                        strokeWidth="1"
                        x1="0"
                        x2="8"
                        y1="0.5"
                        y2="0.5"
                      />
                    </svg>
                  </div>
                )}

                {/* 각 단계마다 개별 Tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center gap-[4px] cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderStageIcon(stageStatus, colors)}
                      <p
                        className="font-['Pretendard',sans-serif] not-italic text-nowrap whitespace-pre"
                        style={{
                          fontSize: '12px',
                          lineHeight: 1.4,
                          color: colors.textColor,
                          fontWeight: 600,
                        }}
                      >
                        {stage.stepOrder}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    className="p-3 max-w-[300px]"
                    style={{
                      backgroundColor: 'var(--card-foreground)',
                      color: 'var(--card)',
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      {/* 결재자 목록 */}
                      {stage.approvers.map((approver, idx) => (
                        <div
                          key={`approver-${idx}`}
                          className="flex items-center gap-2"
                        >
                          <Check
                            size={14}
                            style={{
                              color: getCheckIconColor(approver.status),
                              flexShrink: 0,
                            }}
                          />
                          <span
                            className="whitespace-nowrap"
                            style={{
                              fontSize: '13px',
                              lineHeight: 1.4,
                            }}
                          >
                            {approver.name}
                            {(approver.role || approver.department) && (
                              <span style={{ opacity: 0.8 }}>
                                {' | '}{approver.role || ''}{approver.role && approver.department ? ' | ' : ''}{approver.department || ''}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}

                      {/* 합의자 섹션 */}
                      {stage.reviewers.length > 0 && (
                        <>
                          <div
                            className="mt-1 pt-2 relative"
                            style={{
                              fontWeight: 600,
                              opacity: 0.7,
                              fontSize: '12px',
                            }}
                          >
                            <div
                              className="absolute top-0 left-0 right-0"
                              style={{
                                height: '1px',
                                backgroundColor: 'var(--border)',
                                opacity: 0.3,
                              }}
                            />
                            [합의자]
                          </div>
                          {stage.reviewers.map((reviewer, idx) => (
                            <div
                              key={`reviewer-${idx}`}
                              className="flex items-center gap-2"
                            >
                              <Check
                                size={14}
                                style={{
                                  color: getCheckIconColor(reviewer.status),
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                className="whitespace-nowrap"
                                style={{
                                  fontSize: '13px',
                                  lineHeight: 1.4,
                                }}
                              >
                                {reviewer.name}
                                {(reviewer.role || reviewer.department) && (
                                  <span style={{ opacity: 0.8 }}>
                                    {' | '}{reviewer.role || ''}{reviewer.role && reviewer.department ? ' | ' : ''}{reviewer.department || ''}
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
