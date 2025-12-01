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

  // 초기값 설정 (피그마 디자인대로)
  const initialPhone = user.phone || '010-1234-5678'
  const initialBirthDate = '1990-05-15'
  const initialEmergencyContact = '010-1111-2222'
  const initialGender: '남성' | '여성' | '기타' = '남성'

  // 편집 가능한 필드들의 state
  const [phone, setPhone] = useState(initialPhone)
  const [birthDate, setBirthDate] = useState(initialBirthDate)
  const [emergencyContact, setEmergencyContact] = useState(initialEmergencyContact)
  const [gender, setGender] = useState<'남성' | '여성' | '기타'>(initialGender)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [isHoveringProfile, setIsHoveringProfile] = useState(false)

  // 변경사항 감지
  const hasChanges =
    phone !== initialPhone ||
    birthDate !== initialBirthDate ||
    emergencyContact !== initialEmergencyContact ||
    gender !== initialGender ||
    profileImage !== null

  // 조직 정보 (피그마 디자인대로)
  const companyName = 'MUST Access'
  const employmentType = '정규직'
  const officeLocation = user.location || '서울특별시 강남구'

  // 역할 표시
  const getPositionLabel = (code: string) => {
    switch (code) {
      case 'super_admin':
        return '최고관리자'
      case 'admin':
        return '관리자'
      default:
        return '사원'
    }
  }

  const handleSave = () => {
    // TODO: API 호출하여 저장
    toast.success('정보가 저장되었습니다.')
  }

  const handleCancel = () => {
    setPhone(initialPhone)
    setBirthDate(initialBirthDate)
    setEmergencyContact(initialEmergencyContact)
    setGender(initialGender)
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
            fontSize: 'var(--font-size-h1)',
            fontWeight: 'var(--font-weight-h1)',
            lineHeight: 1.25,
          }}
        >
          내 계정
        </h2>
        <p
          style={{
            color: 'var(--muted-foreground)',
            fontSize: 'var(--font-size-body)',
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
          borderRadius: 'var(--radius)',
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
                    <Camera className="w-6 h-6" style={{ color: 'var(--background)' }} />
                    <span
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--background)',
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
                    fontSize: 'var(--font-size-h2)',
                    fontWeight: 'var(--font-weight-h2)',
                    lineHeight: 1.3,
                    color: 'var(--foreground)',
                  }}
                >
                  {user.name}
                </h3>
                <p
                  style={{
                    fontSize: 'var(--font-size-body)',
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
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.4,
                    }}
                  >
                    직책
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--font-size-body)',
                      color: 'var(--foreground)',
                      fontWeight: 500,
                      lineHeight: 1.5,
                      marginTop: '2px',
                    }}
                  >
                    {getPositionLabel(user.roleCode)}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.4,
                    }}
                  >
                    소속 부서
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--font-size-body)',
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
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.4,
                    }}
                  >
                    입사일
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--font-size-body)',
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
          borderRadius: 'var(--radius)',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardHeader>
          <CardTitle
            style={{
              color: 'var(--foreground)',
              fontSize: 'var(--font-size-body)',
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
                  fontSize: 'var(--font-size-caption)',
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
                  fontSize: 'var(--font-size-body)',
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
                  fontSize: 'var(--font-size-caption)',
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
                    fontSize: 'var(--font-size-body)',
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
                    fontSize: 'var(--font-size-caption)',
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
                  fontSize: 'var(--font-size-caption)',
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
                className="mt-1"
                style={{
                  fontSize: 'var(--font-size-body)',
                  lineHeight: 1.5,
                  height: '42px',
                }}
              />
            </div>

            {/* 생년월일 (수정 가능) */}
            <div>
              <Label
                htmlFor="birthDate"
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                생년월일
              </Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1"
                style={{
                  fontSize: 'var(--font-size-body)',
                  lineHeight: 1.5,
                  height: '42px',
                }}
              />
            </div>

            {/* 비상 연락망 (옵션) */}
            <div>
              <Label
                htmlFor="emergencyContact"
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                비상 연락망 <span style={{ color: 'var(--muted-foreground)' }}>(선택)</span>
              </Label>
              <Input
                id="emergencyContact"
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="비상 연락처"
                className="mt-1"
                style={{
                  fontSize: 'var(--font-size-body)',
                  lineHeight: 1.5,
                  height: '42px',
                }}
              />
            </div>

            {/* 성별 (옵션) */}
            <div>
              <Label
                htmlFor="gender"
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                성별 <span style={{ color: 'var(--muted-foreground)' }}>(선택)</span>
              </Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as '남성' | '여성' | '기타')}
                className="mt-1 w-full rounded-md border px-3 py-2"
                style={{
                  fontSize: 'var(--font-size-body)',
                  lineHeight: 1.5,
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                  height: '42px',
                }}
              >
                <option value="남성">남성</option>
                <option value="여성">여성</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 조직 정보 카드 */}
      <Card
        className="rounded-2xl"
        style={{
          borderRadius: 'var(--radius)',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardHeader>
          <CardTitle
            style={{
              color: 'var(--foreground)',
              fontSize: 'var(--font-size-body)',
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
                  fontSize: 'var(--font-size-caption)',
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
                  fontSize: 'var(--font-size-body)',
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
                  fontSize: 'var(--font-size-caption)',
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
                  fontSize: 'var(--font-size-body)',
                  lineHeight: 1.5,
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  cursor: 'not-allowed',
                  height: '42px',
                }}
              />
            </div>

            {/* 직책 */}
            <div>
              <Label
                htmlFor="position"
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                직책
              </Label>
              <Input
                id="position"
                value={getPositionLabel(user.roleCode)}
                disabled
                className="mt-1"
                style={{
                  fontSize: 'var(--font-size-body)',
                  lineHeight: 1.5,
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  cursor: 'not-allowed',
                  height: '42px',
                }}
              />
            </div>

            {/* 고용 형태 */}
            <div>
              <Label
                htmlFor="employmentType"
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                고용 형태
              </Label>
              <Input
                id="employmentType"
                value={employmentType}
                disabled
                className="mt-1"
                style={{
                  fontSize: 'var(--font-size-body)',
                  lineHeight: 1.5,
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  cursor: 'not-allowed',
                  height: '42px',
                }}
              />
            </div>

            {/* 근무지 */}
            <div className="md:col-span-2">
              <Label
                htmlFor="officeLocation"
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                근무지(오피스 위치)
              </Label>
              <Input
                id="officeLocation"
                value={officeLocation}
                disabled
                className="mt-1"
                style={{
                  fontSize: 'var(--font-size-body)',
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
                fontSize: 'var(--font-size-body)',
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
                fontSize: 'var(--font-size-body)',
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
