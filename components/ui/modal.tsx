'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

/**
 * Modal/Dialog - Figma Guidelines
 * - Overlay: 40% blur background
 * - Transition: 200ms ease-out
 * - Close button: Lucide X icon
 */
export function Modal({ 
  open, 
  onClose, 
  children, 
  title, 
  description,
  className 
}: ModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="fixed inset-0 modal-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className={cn(
          'relative bg-surface rounded-card shadow-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-auto',
          'animate-in fade-in-0 zoom-in-95 duration-modal',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1">
            {title && (
              <h2 id="modal-title" className="text-h2 font-semibold">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-caption text-gray-500">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1 rounded-lg hover:bg-gray-100 interactive"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export function ModalFooter({ 
  children,
  className 
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-end gap-2 pt-4 border-t border-border', className)}>
      {children}
    </div>
  )
}

