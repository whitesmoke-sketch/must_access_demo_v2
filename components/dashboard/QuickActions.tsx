'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { DoorOpen, Armchair, FileText } from 'lucide-react'

const actions = [
  {
    icon: DoorOpen,
    label: '회의실 예약',
    href: '/resources/meeting-rooms'
  },
  {
    icon: Armchair,
    label: '좌석 등록',
    href: '/resources/seats'
  },
  {
    icon: FileText,
    label: '결재 문서',
    href: '/documents'
  }
]

export function QuickActions() {
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
              href={action.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-4 transition-all hover:brightness-95"
              style={{
                backgroundColor: '#F6F8F9',
                borderRadius: '8px'
              }}
            >
              <Icon
                className="w-6 h-6"
                style={{ color: '#5B6A72' }}
              />
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
