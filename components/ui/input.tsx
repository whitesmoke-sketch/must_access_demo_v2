import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

/**
 * Input Field - Figma Guidelines
 * - Types: Text / Email / Password
 * - Focus: 2px solid primary
 * - Disabled: gray-300 color
 * - Border radius: 8px
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, ...props }, ref) => {
    const inputId = React.useId()

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-caption font-medium text-foreground mb-1"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-button border border-border px-3 py-2',
            'bg-[var(--input-background)]',
            'text-body placeholder:text-muted-foreground',
            'transition-all duration-fast',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
            error && 'border-error focus-visible:ring-error',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-caption text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-caption text-muted-foreground">{helperText}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }

