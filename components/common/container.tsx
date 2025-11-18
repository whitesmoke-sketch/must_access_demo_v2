import { cn } from '@/lib/utils'

interface ContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'container' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

/**
 * Container - Figma Guidelines
 * - Max-width: 1280px
 * - Base Grid: 8px 단위
 * - Responsive padding
 */
export function Container({ 
  children, 
  className,
  maxWidth = 'container',
  padding = 'md'
}: ContainerProps) {
  const paddingClasses = {
    none: '',
    sm: 'px-4 py-2',
    md: 'px-6 py-4',
    lg: 'px-8 py-6',
  }

  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidth === 'container' && 'max-w-container',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  )
}

