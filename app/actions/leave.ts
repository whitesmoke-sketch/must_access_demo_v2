'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getValidGoogleAccessToken } from '@/lib/google-auth'

export interface CreateLeaveRequestParams {
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
}

export async function createLeaveRequest(params: CreateLeaveRequestParams) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const { data: { session } } = await supabase.auth.getSession()
    if (!user || !session) {
      return { success: false, error: '인증이 필요합니다' }
    }

    // 본인의 신청만 가능
    if (params.employee_id !== user.id) {
      return { success: false, error: '본인의 신청만 가능합니다' }
    }

    // 연차 신청 생성
    const { data, error } = await supabase
      .from('leave_request')
      .insert({
        employee_id: params.employee_id,
        leave_type: params.leave_type,
        start_date: params.start_date,
        end_date: params.end_date,
        reason: params.reason,
        status: 'pending',
        current_step: 1,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Create leave request error:', error)
      return { success: false, error: error.message }
    }

    // Edge Function 호출하여 PDF 생성 및 Google Drive에 업로드
    let pdfUrl = null
    console.log('[Leave Action] 연차 신청 생성 성공, PDF 생성 시작')
    console.log('[Leave Action] Leave Request ID:', data.id)
    console.log('[Leave Action] Provider Token 존재?', !!session.provider_token)
    console.log('[Leave Action] Provider Token 길이:', session.provider_token?.length || 0)

    try {
      const { data: pdfResult, error: pdfError } = await supabase.functions.invoke(
        'generate-leave-pdf',
        {
          body: {
            leaveRequestId: data.id,
            accessToken: session.provider_token, // Google OAuth Access Token
          },
        }
      )

      console.log('[Leave Action] Edge Function 응답:', { pdfResult, pdfError })

      if (pdfError) {
        console.error('[Leave Action] PDF generation failed:', pdfError)
      } else if (pdfResult) {
        pdfUrl = pdfResult.fileUrl
        console.log('[Leave Action] PDF generated successfully:', pdfUrl)
      }
    } catch (pdfError) {
      console.error('[Leave Action] PDF generation error:', pdfError)
      // PDF 생성 실패해도 신청은 유지
    }

    revalidatePath('/leave/my-leave')
    revalidatePath('/dashboard')

    return { success: true, data, pdfUrl }
  } catch (error: unknown) {
    console.error('Create leave request error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 연차 신청서 PDF 생성 및 Google Drive 업로드
 */
export async function generateLeavePDF(leaveRequestId: number) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: '인증이 필요합니다' }
    }

    // 디버깅: 세션 토큰 상태 로깅
    console.log('[Leave Action] Session 상태:', {
      hasProviderToken: !!session.provider_token,
      providerTokenLength: session.provider_token?.length || 0,
      hasRefreshToken: !!session.provider_refresh_token,
      refreshTokenLength: session.provider_refresh_token?.length || 0,
      provider: session.user?.app_metadata?.provider,
    })

    // Google 토큰 확인 및 갱신
    const tokenResult = await getValidGoogleAccessToken(
      session.provider_token,
      session.provider_refresh_token
    )

    if (!tokenResult.accessToken) {
      console.error('[Leave Action] Google 토큰 없음:', tokenResult.error)
      if (tokenResult.needsReauth) {
        return { success: false, error: 'Google 재로그인이 필요합니다', needsReauth: true }
      }
      return { success: false, error: tokenResult.error || 'Google 인증 실패' }
    }

    console.log('[Leave Action] PDF 생성 시작, Leave Request ID:', leaveRequestId)

    // Edge Function 호출
    const { data: pdfResult, error: pdfError } = await supabase.functions.invoke(
      'generate-leave-pdf',
      {
        body: {
          leaveRequestId,
          accessToken: tokenResult.accessToken,
        },
      }
    )

    if (pdfError) {
      console.error('[Leave Action] PDF 생성 실패:', pdfError)
      return { success: false, error: pdfError.message || 'PDF 생성 실패' }
    }

    if (!pdfResult?.success) {
      console.error('[Leave Action] PDF 생성 실패:', pdfResult?.error)
      return { success: false, error: pdfResult?.error || 'PDF 생성 실패' }
    }

    console.log('[Leave Action] PDF 생성 성공:', pdfResult.fileUrl)

    revalidatePath('/leave/my-leave')

    return {
      success: true,
      driveUrl: pdfResult.fileUrl,
      fileId: pdfResult.fileId,
    }
  } catch (error: unknown) {
    console.error('[Leave Action] PDF 생성 에러:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
