'use client'

// ================================================================
// PDF 다운로드 버튼 컴포넌트
// ================================================================

import React from 'react'
import { pdf } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { LeaveRequestPDF } from './LeaveRequestPDF'
import { LeaveRequestPDFData } from './types'

interface PDFDownloadButtonProps {
  data: LeaveRequestPDFData
  fileName?: string
  className?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
}

export const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  data,
  fileName = '휴가신청서.pdf',
  className,
  variant = 'primary',
  size = 'md',
  children,
}) => {
  const [isGenerating, setIsGenerating] = React.useState(false)

  const handleDownload = async () => {
    setIsGenerating(true)

    try {
      const blob = await pdf(<LeaveRequestPDF data={data} />).toBlob()
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF 생성 오류:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={isGenerating}
      variant={variant}
      size={size}
      className={className}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          생성 중...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {children || 'PDF 다운로드'}
        </>
      )}
    </Button>
  )
}

export default PDFDownloadButton
