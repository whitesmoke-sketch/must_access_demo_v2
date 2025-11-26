import React from 'react'

interface ApprovalProgressBadgeProps {
  approvers: Array<{
    name: string
    status: 'completed' | 'pending' | 'waiting'
  }>
}

export function ApprovalProgressBadge({ approvers }: ApprovalProgressBadgeProps) {
  const getApproverColor = (status: 'completed' | 'pending' | 'waiting') => {
    switch (status) {
      case 'completed':
        return { iconFill: '#1F99FF', textColor: '#1F99FF' }
      case 'pending':
        return { iconFill: '#1F99FF', textColor: '#1F99FF' }
      case 'waiting':
        return { iconFill: '#A0ACB3', textColor: '#5B6A72' }
      default:
        return { iconFill: '#A0ACB3', textColor: '#5B6A72' }
    }
  }

  return (
    <div
      className="bg-[#e7f4ff] relative rounded-[6.8px] inline-flex items-center px-2"
      style={{ height: '22px' }}
    >
      <div className="flex items-center gap-[8px]">
        {approvers.map((approver, index) => {
          const colors = getApproverColor(approver.status)
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
                      stroke="#AAD8F3"
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
                        stroke="#E7F4FF"
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
                    fontSize: '12px',
                    lineHeight: 1.4,
                    color: colors.textColor,
                    fontWeight: 500,
                  }}
                >
                  {approver.name}
                </p>
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
