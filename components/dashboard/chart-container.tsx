import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ChartContainerProps {
  title: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/**
 * Chart Container - Figma Guidelines
 * - 배경: --color-surface
 * - 시리즈 컬러:
 *   - Primary: #635BFF
 *   - Secondary: #16CDC7
 *   - Extra: purple, orange, cyan, pink, green 순
 */
export function ChartContainer({ 
  title, 
  description, 
  children, 
  action,
  className 
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        'rounded-card bg-surface card-shadow',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b border-border">
        <div>
          <h3 className="text-h2 font-semibold">{title}</h3>
          {description && (
            <p className="mt-1 text-caption text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="ml-4">{action}</div>}
      </div>

      {/* Chart Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

/**
 * Chart 색상 팔레트 - Figma Guidelines
 * 이 색상들을 Recharts 등의 차트 라이브러리에서 사용
 */
export const CHART_COLORS = {
  primary: '#635BFF',
  secondary: '#16CDC7',
  purple: '#9B51E0',
  orange: '#FF8A5C',
  cyan: '#16CDC7',
  pink: '#FF6BA9',
  green: '#4CD471',
} as const

/**
 * 차트 색상 배열 (순서대로 사용)
 */
export const CHART_COLOR_ARRAY = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.purple,
  CHART_COLORS.orange,
  CHART_COLORS.cyan,
  CHART_COLORS.pink,
  CHART_COLORS.green,
] as const

