'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'

interface ApproverInfo {
  name: string
  status: 'completed' | 'pending' | 'waiting'
  department?: string
  role?: string
  stepType?: string // 'approval' | 'agreement' 등
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

  const getApproverColor = (status: 'completed' | 'pending' | 'waiting') => {
    switch (status) {
      case 'completed':
        return { iconFill: 'var(--info)', textColor: 'var(--info)' }
      case 'pending':
        return { iconFill: 'var(--info)', textColor: 'var(--info)' }
      case 'waiting':
        return { iconFill: 'var(--color-gray-500)', textColor: 'var(--muted-foreground)' }
      default:
        return { iconFill: 'var(--color-gray-500)', textColor: 'var(--muted-foreground)' }
    }
  }

  // 합의자 그룹화 (stepType이 'agreement'인 경우)
  const groupedApprovers = approvers.reduce((acc, approver) => {
    if (approver.stepType === 'agreement') {
      const lastGroup = acc[acc.length - 1]
      if (lastGroup && lastGroup.agreements) {
        lastGroup.agreements.push(approver)
      } else if (lastGroup) {
        lastGroup.agreements = [approver]
      }
    } else {
      acc.push({ ...approver, agreements: [] as ApproverInfo[] })
    }
    return acc
  }, [] as (ApproverInfo & { agreements: ApproverInfo[] })[])

  // 승인자만 필터링 (합의자 제외)
  const mainApprovers = approvers.filter(a => a.stepType !== 'agreement')

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
          backgroundColor: 'var(--info-bg)',
          transition: 'all 150ms ease-in-out'
        }}
      >
        <div className="flex items-center gap-[8px]">
          {mainApprovers.map((approver, index) => {
            const colors = getApproverColor(approver.status)
            const stepNumber = index + 1
            return (
              <React.Fragment key={index}>
                {index > 0 && (
                  <div className="w-[8px] h-[1px]">
                    <svg
                      className="block w-full h-full"
                      fill="none"
                      preserveAspectRatio="none"
                      viewBox="0 0 8 1"
                    >
                      <line
                        stroke="var(--info)"
                        strokeOpacity="0.3"
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
                  {approver.status === 'completed' && (
                    <div className="size-[12px] relative">
                      <svg
                        className="block size-full"
                        fill="none"
                        preserveAspectRatio="none"
                        viewBox="0 0 12 12"
                      >
                        <circle cx="6" cy="6" fill={colors.iconFill} r="6" />
                        <path
                          d="M4 6L5.5 7.5L8 5"
                          stroke="var(--info-bg)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </div>
                  )}
                  {approver.status === 'pending' && (
                    <div className="size-[12px] relative">
                      <svg
                        className="block size-full"
                        fill="none"
                        preserveAspectRatio="none"
                        viewBox="0 0 12 12"
                      >
                        <circle
                          cx="6"
                          cy="6"
                          fill={colors.iconFill}
                          opacity="0.3"
                          r="6"
                        />
                        <circle cx="6" cy="6" fill={colors.iconFill} r="3" />
                      </svg>
                    </div>
                  )}
                  {approver.status === 'waiting' && (
                    <div className="size-[6px] relative">
                      <svg
                        className="block size-full"
                        fill="none"
                        preserveAspectRatio="none"
                        viewBox="0 0 6 6"
                      >
                        <circle cx="3" cy="3" fill={colors.iconFill} r="3" />
                      </svg>
                    </div>
                  )}
                  <p
                    className="font-['Pretendard',sans-serif] not-italic text-nowrap whitespace-pre"
                    style={{
                      fontSize: 'var(--font-size-copyright)',
                      lineHeight: 'var(--line-height-caption)',
                      color: colors.textColor,
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    {stepNumber}
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
              className="rounded-lg shadow-lg px-4 py-3 min-w-[280px]"
              style={{
                backgroundColor: 'var(--card-foreground)',
                color: 'var(--card)',
              }}
            >
              {groupedApprovers.map((approver, index) => (
                <div key={index}>
                  {/* 메인 승인자 */}
                  <div
                    className="flex items-center gap-2 py-2"
                    style={{
                      borderBottom: index < groupedApprovers.length - 1 || approver.agreements.length > 0
                        ? '1px solid rgba(255,255,255,0.1)'
                        : 'none'
                    }}
                  >
                    {approver.status === 'completed' ? (
                      <Check
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: 'var(--secondary)' }}
                      />
                    ) : (
                      <div className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      {approver.name}
                      {(approver.role || approver.department) && (
                        <span style={{ opacity: 0.8, marginLeft: '4px' }}>
                          | {approver.role || ''}{approver.role && approver.department ? ' | ' : ''}{approver.department || ''}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* 합의자 그룹 */}
                  {approver.agreements && approver.agreements.length > 0 && (
                    <div className="py-2" style={{ borderBottom: index < groupedApprovers.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                      <p
                        className="mb-1"
                        style={{
                          fontSize: 'var(--font-size-copyright)',
                          color: 'var(--secondary)',
                          fontWeight: 'var(--font-weight-medium)'
                        }}
                      >
                        [합의자]
                      </p>
                      {approver.agreements.map((agreement, aIndex) => (
                        <div key={aIndex} className="flex items-center gap-2 py-1">
                          {agreement.status === 'completed' ? (
                            <Check
                              className="w-4 h-4 flex-shrink-0"
                              style={{ color: 'var(--secondary)' }}
                            />
                          ) : (
                            <div className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span
                            style={{
                              fontSize: 'var(--font-size-caption)',
                              fontWeight: 'var(--font-weight-medium)',
                            }}
                          >
                            {agreement.name}
                            {(agreement.role || agreement.department) && (
                              <span style={{ opacity: 0.8, marginLeft: '4px' }}>
                                | {agreement.role || ''}{agreement.role && agreement.department ? ' | ' : ''}{agreement.department || ''}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
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
