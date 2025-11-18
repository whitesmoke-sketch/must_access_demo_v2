import * as React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'purple' | 'orange' | 'cyan' | 'pink' | 'green' | 'primary' | 'secondary'
  className?: string
}

/**
 * Stats Card - Figma Guidelines
 * - 구조: 아이콘 + 제목 + 주요 수치
 * - 아이콘 배경: 추가 대시보드 컬러 (purple/orange/cyan/pink/green)
 * - 배경: 해당 색상의 light tone
 * - Radius: 16px
 */
export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  color = 'primary',
  className 
}: StatsCardProps) {
  const colorStyles = {
    purple: {
      iconBg: 'bg-purple-light',
      iconColor: 'text-purple',
    },
    orange: {
      iconBg: 'bg-orange-light',
      iconColor: 'text-orange',
    },
    cyan: {
      iconBg: 'bg-cyan-light',
      iconColor: 'text-cyan',
    },
    pink: {
      iconBg: 'bg-pink-light',
      iconColor: 'text-pink',
    },
    green: {
      iconBg: 'bg-green-light',
      iconColor: 'text-green',
    },
    primary: {
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    secondary: {
      iconBg: 'bg-secondary/10',
      iconColor: 'text-secondary',
    },
  }

  const style = colorStyles[color]

  return (
    <div
      className={cn(
        'rounded-card bg-surface border border-border card-shadow p-6',
        'hover:shadow-lg interactive',
        className
      )}
    >
      {/* Icon */}
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', style.iconBg)}>
        <Icon className={cn('w-6 h-6', style.iconColor)} />
      </div>

      {/* Title */}
      <h3 className="text-caption text-gray-500 mb-1">{title}</h3>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold">{value}</p>
        {trend && (
          <span
            className={cn(
              'text-sm font-medium',
              trend.isPositive ? 'text-success' : 'text-error'
            )}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  )
}

