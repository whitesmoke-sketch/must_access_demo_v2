import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 * Figma Guidelines 준수를 위해 클래스 충돌 방지
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

