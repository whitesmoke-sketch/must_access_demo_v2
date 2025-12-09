'use client'

// ================================================================
// PDF 미리보기 컴포넌트
// ================================================================

import React, { useState, useEffect } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Loader2 } from 'lucide-react'
import { LeaveRequestPDF } from './LeaveRequestPDF'
import { LeaveRequestPDFData } from './types'

interface PDFPreviewProps {
  data: LeaveRequestPDFData
  width?: number | string
  height?: number | string
  className?: string
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  data,
  width = '100%',
  height = 600,
  className,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const generatePDF = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const blob = await pdf(<LeaveRequestPDF data={data} />).toBlob()

        if (isMounted) {
          const url = URL.createObjectURL(blob)
          setPdfUrl(url)
        }
      } catch (err) {
        console.error('PDF 미리보기 생성 오류:', err)
        if (isMounted) {
          setError('PDF를 생성할 수 없습니다.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    generatePDF()

    return () => {
      isMounted = false
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [data])

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width, height }}
      >
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="text-sm text-gray-500">PDF 생성 중...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width, height }}
      >
        <span className="text-sm text-red-500">{error}</span>
      </div>
    )
  }

  return (
    <iframe
      src={pdfUrl || ''}
      width={width}
      height={height}
      className={className}
      title="PDF 미리보기"
      style={{ border: 'none' }}
    />
  )
}

export default PDFPreview
