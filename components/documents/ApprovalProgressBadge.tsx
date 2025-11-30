'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'

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

// 툴팁 컴포넌트 - Portal로 렌더링
function TooltipPortal({
  children,
  position
}: {
  children: React.ReactNode
  position: { top: number; left: number }
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted || typeof window === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-auto"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%)',
      }}
    >
      {children}
    </div>,
    document.body
  )
}

export function ApprovalProgressBadge({ approvers }: ApprovalProgressBadgeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const badgeRef = useRef<HTMLDivElement>(null)

  const updateTooltipPosition = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect()
      setTooltipPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      })
    }
  }

  const handleMouseEnter = () => {
    updateTooltipPosition()
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

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
    <div
      ref={badgeRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 진행 상태 뱃지 (숫자만 표시) */}
      <div
        className="relative rounded-[6.8px] inline-flex items-center px-2 cursor-pointer"
        style={{
          height: '22px',
          backgroundColor: 'var(--secondary-bg)',
          transition: 'all 150ms ease-in-out'
        }}
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
                <div className="flex items-center gap-[4px]">
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
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* 호버 시 나타나는 툴팁 */}
      {isHovered && (
        <TooltipPortal position={tooltipPosition}>
          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              animation: 'tooltipFadeIn 150ms ease-in-out',
            }}
          >
            <div
              className="rounded-lg shadow-lg p-3 min-w-[280px] max-w-[350px]"
              style={{
                backgroundColor: 'var(--card-foreground)',
                color: 'var(--card)',
              }}
            >
              {stages.map((stage, stageIndex) => (
                <div
                  key={stageIndex}
                  className="flex flex-col gap-2"
                  style={{
                    paddingTop: stageIndex > 0 ? '8px' : 0,
                    marginTop: stageIndex > 0 ? '8px' : 0,
                    borderTop: stageIndex > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                  }}
                >
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
              ))}
            </div>
            {/* 툴팁 화살표 */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid var(--card-foreground)',
              }}
            />
          </div>
        </TooltipPortal>
      )}

      {/* 전역 CSS 애니메이션 */}
      <style jsx global>{`
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
