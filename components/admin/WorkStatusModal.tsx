'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Briefcase, Home, Palmtree, Search } from 'lucide-react'

interface Member {
  id: string
  name: string
  department: string
}

interface WorkStatusModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  members: Member[]
  icon: 'fieldwork' | 'remote' | 'vacation'
}

export function WorkStatusModal({
  isOpen,
  onClose,
  title,
  members,
  icon,
}: WorkStatusModalProps) {
  const [searchQuery, setSearchQuery] = React.useState('')

  // 모달이 닫힐 때 검색어 초기화
  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  // 검색 필터링
  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase()
    return (
      member.name.toLowerCase().includes(query) ||
      member.department.toLowerCase().includes(query)
    )
  })

  const getAvatarColor = () => {
    switch (icon) {
      case 'fieldwork':
        return '#635BFF'
      case 'remote':
        return '#16CDC7'
      case 'vacation':
        return '#F8C653'
    }
  }

  const avatarColor = getAvatarColor()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        aria-describedby={undefined}
        style={{
          maxWidth: '480px',
          padding: '0',
          backgroundColor: '#FFFFFF',
        }}
      >
        <DialogHeader style={{ padding: '24px 24px 16px' }}>
          <DialogTitle style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#29363D',
          }}>
            {title} ({members.length}명)
          </DialogTitle>
        </DialogHeader>

        <div
          style={{
            margin: '0 16px 16px',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <div className="space-y-3">
            {/* 검색 입력 */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: '#5B6A72' }}
              />
              <input
                type="text"
                placeholder="이름 또는 부서 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  paddingLeft: '40px',
                  paddingRight: '12px',
                  fontSize: '14px',
                  color: '#29363D',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E8EB',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'all 150ms ease-in-out',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#635BFF'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E8EB'
                }}
              />
            </div>

            {/* 멤버 목록 - 1열 리스트 */}
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 transition-all"
                  style={{
                    backgroundColor: '#F6F8F9',
                    borderRadius: '8px',
                  }}
                >
                  {/* 프로필 아바타 (이름 첫 글자) */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: avatarColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#29363D',
                    }}>
                      {member.name}
                    </p>
                    <p style={{
                      fontSize: '12px',
                      color: '#5B6A72',
                      marginTop: '2px',
                    }}>
                      {member.department}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#5B6A72',
                  fontSize: '14px',
                }}
              >
                검색 결과가 없습니다
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
