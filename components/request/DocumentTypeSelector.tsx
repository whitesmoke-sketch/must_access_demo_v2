'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, Gift, FileText, DollarSign } from 'lucide-react'

type DocumentType =
  | 'annual_leave'
  | 'half_day'
  | 'reward_leave'
  | 'condolence'
  | 'overtime'
  | 'expense'
  | 'other'

interface DocumentTypeSelectorProps {
  value: DocumentType | ''
  onChange: (value: DocumentType) => void
}

export function DocumentTypeSelector({ value, onChange }: DocumentTypeSelectorProps) {
  const documentTypeOptions = [
    { value: 'annual_leave', label: '연차 신청', icon: Calendar },
    { value: 'half_day', label: '반차 / 시간차 신청', icon: Clock },
    { value: 'reward_leave', label: '포상휴가 사용 신청', icon: Gift },
    { value: 'condolence', label: '경조사비 신청', icon: FileText },
    { value: 'overtime', label: '야근수당 신청', icon: Clock },
    { value: 'expense', label: '지출결의서', icon: DollarSign },
    { value: 'other', label: '기타 회사 문서', icon: FileText },
  ]

  return (
    <Card className="rounded-2xl" style={{
      borderRadius: 'var(--radius)',
      boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
    }}>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--primary)', color: 'white' }}
          >
            1
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--card-foreground)',
            lineHeight: 1.5
          }}>
            문서 양식 선택
          </h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="documentType">문서 유형 *</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger id="documentType">
              <SelectValue placeholder="작성할 문서 유형을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {documentTypeOptions.map(option => {
                const Icon = option.icon
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
