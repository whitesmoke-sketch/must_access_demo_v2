'use client'

import React, { useState, useRef } from 'react'
import { User, Mail, Camera, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface UserData {
  id: string
  name: string
  email: string
  phone: string
  location: string
  employmentDate: string
  status: string
  departmentName: string
  roleName: string
  roleCode: string
}

interface MyAccountClientProps {
  user: UserData
}

export function MyAccountClient({ user }: MyAccountClientProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 편집 가능한 필드들의 state
  const [phone, setPhone] = useState(user.phone)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [isHoveringProfile, setIsHoveringProfile] = useState(false)

  // 변경사항 감지
  const hasChanges =
    phone !== user.phone ||
    profileImage !== null

  // 조직 정보
  const companyName = 'MUST Access'

  // 역할 표시
  const getRoleLabel = (code: string) => {
    switch (code) {
      case 'super_admin':
        return '최고관리자'
      case 'admin':
        return '관리자'
      default:
        return '구성원'
    }
  }

  const handleSave = () => {
    // TODO: API 호출하여 저장
    toast.success('정보가 저장되었습니다.')
  }

  const handleCancel = () => {
    setPhone(user.phone)
    setProfileImage(null)
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 파일 크기 체크 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('파일 크기는 5MB 이하여야 합니다.')
        return
      }

      // 이미지 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        toast.error('이미지 파일만 업로드 가능합니다.')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result as string)
        toast.success('프로필 이미지가 업데이트되었습니다.')
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4">
        <h2
          style={{
            color: 'var(--foreground)',
            fontSize: '22px',
            fontWeight: 500,
            lineHeight: 1.25,
          }}
        >
          내 계정
        </h2>
        <p
          style={{
            color: 'var(--muted-foreground)',
            fontSize: '16px',
            lineHeight: 1.5,
          }}
          className="mt-1"
        >
          내 계정 정보를 확인하고 관리하세요
        </p>
      </div>

      {/* 프로필 요약 섹션 */}
      <Card
        className="rounded-2xl"
        style={{
          borderRadius: '16px',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* 프로필 이미지 */}
            <div
              className="relative cursor-pointer"
              onMouseEnter={() => setIsHoveringProfile(true)}
              onMouseLeave={() => setIsHoveringProfile(false)}
              onClick={handleImageClick}
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{
                  backgroundColor: profileImage ? 'transparent' : 'var(--primary)',
                  color: 'var(--primary-foreground)',
                }}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="프로필"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12" />
                )}
              </div>

              {/* Hover 오버레이 */}
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: isHoveringProfile ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
                  transitionDuration: '150ms',
                  transitionTimingFunction: 'ease-in-out',
                }}
              >
                {isHoveringProfile && (
                  <div className="flex flex-col items-center gap-1">
                    <Camera className="w-6 h-6" style={{ color: 'white' }} />
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    >
                      변경
                    </span>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* 프로필 정보 */}
            <div className="flex-1 space-y-3">
              <div>
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    lineHeight: 1.3,
                    color: 'var(--foreground)',
                  }}
                >
                  {user.name}
                </h3>
                <p
                  style={{
                    fontSize: '16px',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.5,
                    marginTop: '4px',
                  }}
                >
                  {user.email}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.4,
                    }}
                  >
                    역할
                  </p>
                  <p
                    style={{
                      fontSize: '16px',
                      color: 'var(--foreground)',
                      fontWeight: 500,
                      lineHeight: 1.5,
                      marginTop: '2px',
                    }}
                  >
                    {getRoleLabel(user.roleCode)}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.4,
                    }}
                  >
                    소속 부서
                  </p>
                  <p
                    style={{
                      fontSize: '16px',
                      color: 'var(--foreground)',
                      fontWeight: 500,
                      lineHeight: 1.5,
                      marginTop: '2px',
                    }}
                  >
                    {user.departmentName || '-'}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.4,
                    }}
                  >
                    입사일
                  </p>
                  <p
                    style={{
                      fontSize: '16px',
                      color: 'var(--foreground)',
                      fontWeight: 500,
                      lineHeight: 1.5,
                      marginTop: '2px',
                    }}
                  >
                    {user.employmentDate
                      ? new Date(user.employmentDate).toLocaleDateString('ko-KR')
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 기본 정보 카드 */}
      <Card
        className="rounded-2xl"
        style={{
          borderRadius: '16px',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardHeader>
          <CardTitle
            style={{
              color: 'var(--foreground)',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 이름 (수정 불가) */}
            <div>
              <Label
                htmlFor="name"
                style={{
                  fontSize: '12px',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                이름
              </Label>
              <Input
                id="name"
                value={user.name}
                disabled
                className="mt-1"
                style={{
                  fontSize: '16px',
                  lineHeight: 1.5,
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  cursor: 'not-allowed',
                  height: '42px',
                }}
              />
            </div>

            {/* 이메일 (수정 불가) */}
            <div>
              <Label
                htmlFor="email"
                style={{
                  fontSize: '12px',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                이메일
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="flex-1"
                  style={{
                    fontSize: '16px',
                    lineHeight: 1.5,
                    backgroundColor: 'var(--muted)',
                    color: 'var(--muted-foreground)',
                    cursor: 'not-allowed',
                    height: '42px',
                  }}
                />
                <Badge
                  className="flex items-center gap-1"
                  style={{
                    backgroundColor: 'var(--background)',
                    color: 'var(--muted-foreground)',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid var(--border)',
                    height: 'fit-content',
                    alignSelf: 'center',
                  }}
                >
                  <Mail className="w-3 h-3" />
                  Google
                </Badge>
              </div>
            </div>

            {/* 전화번호 (수정 가능) */}
            <div>
              <Label
                htmlFor="phone"
                style={{
                  fontSize: '12px',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                전화번호
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="mt-1"
                style={{
                  fontSize: '16px',
                  lineHeight: 1.5,
                  height: '42px',
                }}
              />
            </div>

            {/* 근무지 (수정 불가) */}
            <div>
              <Label
                htmlFor="location"
                style={{
                  fontSize: '12px',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                근무지
              </Label>
              <Input
                id="location"
                value={user.location || '-'}
                disabled
                className="mt-1"
                style={{
                  fontSize: '16px',
                  lineHeight: 1.5,
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  cursor: 'not-allowed',
                  height: '42px',
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 조직 정보 카드 */}
      <Card
        className="rounded-2xl"
        style={{
          borderRadius: '16px',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardHeader>
          <CardTitle
            style={{
              color: 'var(--foreground)',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            조직 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 회사 이름 */}
            <div>
              <Label
                htmlFor="companyName"
                style={{
                  fontSize: '12px',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                회사 이름
              </Label>
              <Input
                id="companyName"
                value={companyName}
                disabled
                className="mt-1"
                style={{
                  fontSize: '16px',
                  lineHeight: 1.5,
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  cursor: 'not-allowed',
                  height: '42px',
                }}
              />
            </div>

            {/* 소속 조직 */}
            <div>
              <Label
                htmlFor="department"
                style={{
                  fontSize: '12px',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                소속 조직(부서)
              </Label>
              <Input
                id="department"
                value={user.departmentName || '-'}
                disabled
                className="mt-1"
                style={{
                  fontSize: '16px',
                  lineHeight: 1.5,
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  cursor: 'not-allowed',
                  height: '42px',
                }}
              />
            </div>

            {/* 역할 */}
            <div>
              <Label
                htmlFor="role"
                style={{
                  fontSize: '12px',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                역할
              </Label>
              <Input
                id="role"
                value={getRoleLabel(user.roleCode)}
                disabled
                className="mt-1"
                style={{
                  fontSize: '16px',
                  lineHeight: 1.5,
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  cursor: 'not-allowed',
                  height: '42px',
                }}
              />
            </div>

            {/* 상태 */}
            <div>
              <Label
                htmlFor="status"
                style={{
                  fontSize: '12px',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                상태
              </Label>
              <Input
                id="status"
                value={user.status === 'active' ? '재직중' : user.status}
                disabled
                className="mt-1"
                style={{
                  fontSize: '16px',
                  lineHeight: 1.5,
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  cursor: 'not-allowed',
                  height: '42px',
                }}
              />
            </div>

            {/* 입사일 */}
            <div className="md:col-span-2">
              <Label
                htmlFor="employmentDate"
                style={{
                  fontSize: '12px',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                입사일
              </Label>
              <Input
                id="employmentDate"
                value={user.employmentDate ? new Date(user.employmentDate).toLocaleDateString('ko-KR') : '-'}
                disabled
                className="mt-1"
                style={{
                  fontSize: '16px',
                  lineHeight: 1.5,
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  cursor: 'not-allowed',
                  height: '42px',
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 하단 고정 저장 버튼 (변경사항이 있을 때만 표시) */}
      {hasChanges && (
        <div
          className="fixed bottom-0 left-0 right-0 lg:left-[270px] p-4 z-20 border-t"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="max-w-4xl mx-auto flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              style={{
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: 1.5,
                height: '42px',
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: 1.5,
                height: '42px',
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              저장
            </Button>
          </div>
        </div>
      )}

      {/* 하단 여백 (고정 버튼이 있을 때 컨텐츠가 가려지지 않도록) */}
      {hasChanges && <div className="h-20" />}
    </div>
  )
}
