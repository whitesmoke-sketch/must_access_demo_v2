import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Button - Figma Guidelines
 * - Variants: Primary / Secondary / Ghost / Outline
 * - Radius: 8px
 * - Transition: 150ms ease-in-out
 * - Hover: 10-15% darker
 * - Active: scale(0.98)
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-button font-medium interactive'
    
    const variants = {
      primary: 'bg-primary text-white hover:brightness-90 focus-visible:outline-primary',
      secondary: 'bg-secondary text-white hover:brightness-90 focus-visible:outline-secondary',
      ghost: 'bg-transparent border border-border text-foreground hover:bg-muted',
      outline: 'bg-white border border-border text-foreground hover:bg-muted',
      danger: 'bg-error text-white hover:brightness-90 focus-visible:outline-error',
    }
    
    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-body',
      lg: 'h-12 px-6 text-lg',
    }

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }

