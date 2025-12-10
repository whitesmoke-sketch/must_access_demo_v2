'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { DoorOpen, FileText, FileCheck } from 'lucide-react'
import { toast } from 'sonner'

const actions = [
  {
    icon: DoorOpen,
    label: '공간 예약',
    href: '/meeting-rooms',
    implemented: true
  },
  {
    icon: FileText,
    label: '기안함',
    href: '/documents/my-documents',
    implemented: true
  },
  {
    icon: FileCheck,
    label: '결재함',
    href: '/documents',
    implemented: true
  }
]

export function QuickActions() {
  const handleClick = (action: typeof actions[0]) => (e: React.MouseEvent) => {
    if (!action.implemented) {
      e.preventDefault()
      toast.info('기능 준비중입니다', {
        description: '곧 제공될 예정입니다.'
      })
    }
  }

  return (
    <Card
      className="rounded-2xl"
      style={{
        height: '182px'
      }}
    >
      <CardHeader style={{ paddingBottom: '12px' }}>
        <CardTitle style={{
          fontSize: '16px',
          fontWeight: 500,
          lineHeight: '24px',
          color: '#29363D'
        }}>
          빠른 메뉴
        </CardTitle>
      </CardHeader>
      <CardContent className="flex gap-4">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.implemented ? action.href : '#'}
              onClick={handleClick(action)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-4 transition-all hover:brightness-95 ${
                !action.implemented ? 'cursor-pointer' : ''
              }`}
              style={{
                backgroundColor: '#F6F8F9',
                borderRadius: '8px',
                opacity: action.implemented ? 1 : 0.7
              }}
            >
              <Icon className="w-6 h-6" style={{ color: '#5B6A72' }} />
              <span style={{
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '18px',
                color: '#5B6A72',
                marginTop: '4px'
              }}>
                {action.label}
              </span>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
