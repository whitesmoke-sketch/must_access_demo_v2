'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, Briefcase, Home, Palmtree } from 'lucide-react'

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
  icon
}: WorkStatusModalProps) {
  const getIconComponent = () => {
    switch (icon) {
      case 'fieldwork':
        return <Briefcase className="w-5 h-5" style={{ color: '#635BFF' }} />
      case 'remote':
        return <Home className="w-5 h-5" style={{ color: '#16CDC7' }} />
      case 'vacation':
        return <Palmtree className="w-5 h-5" style={{ color: '#F8C653' }} />
    }
  }

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
        className="max-w-2xl"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: 0,
        }}
      >
        <DialogHeader
          style={{
            padding: '24px',
            borderBottom: '1px solid #E5E8EB',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getIconComponent()}
              <DialogTitle style={{
                fontSize: '18px',
                fontWeight: 600,
                lineHeight: '24px',
                color: '#29363D'
              }}>
                {title}
              </DialogTitle>
              <span style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#5B6A72',
              }}>
                ({members.length}명)
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" style={{ color: '#5B6A72' }} />
            </button>
          </div>
        </DialogHeader>

        <div
          className="p-6"
          style={{
            maxHeight: '500px',
            overflowY: 'auto',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 transition-all"
                style={{
                  backgroundColor: '#F6F8F9',
                  borderRadius: '8px',
                }}
              >
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
                <div className="flex-1 min-w-0">
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#29363D',
                    lineHeight: '20px',
                  }}>
                    {member.name}
                  </p>
                  <p style={{
                    fontSize: '12px',
                    color: '#5B6A72',
                    marginTop: '2px',
                    lineHeight: '16px',
                  }}>
                    {member.department}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {members.length === 0 && (
            <div className="text-center py-12">
              <p style={{
                fontSize: '14px',
                color: '#5B6A72',
                lineHeight: '20px',
              }}>
                해당 인원이 없습니다
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
