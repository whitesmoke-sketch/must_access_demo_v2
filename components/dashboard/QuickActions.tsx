'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { toast } from 'sonner'

const actions = [
  {
    emoji: '🗓️',
    label: '회의실 예약',
    href: '/meeting-rooms',
    implemented: true
  },
  {
    emoji: '🪑',
    label: '좌석 등록',
    href: '/resources/seats',
    implemented: false
  },
  {
    emoji: '📋',
    label: '결재 문서',
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
              <span style={{ fontSize: '24px' }}>
                {action.emoji}
              </span>
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
