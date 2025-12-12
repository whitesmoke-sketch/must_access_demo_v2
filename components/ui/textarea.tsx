import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "resize-none placeholder:text-muted-foreground focus-visible:ring-primary/20 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content w-full rounded-md border border-[var(--border)] text-foreground px-3 py-2 transition-all outline-none focus-visible:border-primary focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        "bg-[var(--input-background)]",
        className
      )}
      style={{
        minHeight: '80px',
        fontSize: 'var(--font-size-body)',
        lineHeight: 1.5,
      }}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
