import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default'
  priority?: 'very-high' | 'high' | 'medium' | 'low'
}

/**
 * Badge - Figma Guidelines
 * 
 * Status Badge:
 * - Success: #4CD471 / white
 * - Warning: #F8C653 / dark
 * - Error: #FF6B6B / white
 * 
 * Priority Badge:
 * - Very High: #16CDC7 / white
 * - High: #FF6B6B / white
 * - Medium: #F8C653 / dark
 * - Low: #4CD471 / white
 */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', priority, ...props }, ref) => {
    // Priority Badge가 설정되면 variant보다 우선
    if (priority) {
      const priorityStyles = {
        'very-high': 'bg-secondary text-white',
        'high': 'bg-error text-white',
        'medium': 'bg-warning text-[#29363D]',
        'low': 'bg-success text-white',
      }

      return (
        <div
          ref={ref}
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            priorityStyles[priority],
            className
          )}
          {...props}
        />
      )
    }

    // Status Badge
    const variants = {
      default: 'bg-gray-100 text-gray-700 border border-gray-300',
      success: 'bg-success text-white',
      warning: 'bg-warning text-[#29363D]',
      error: 'bg-error text-white',
      info: 'bg-info text-white',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'

export { Badge }

