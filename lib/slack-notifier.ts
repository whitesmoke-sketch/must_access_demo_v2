/**
 * Slack Notification Utility (Server Action용)
 * 슬랙 API를 통한 DM 발송 유틸리티
 */

interface SlackMessageResponse {
  ok: boolean
  error?: string
}

/**
 * 슬랙 DM 메시지 발송
 * @param slackUserId - 슬랙 사용자 ID
 * @param text - 메시지 내용
 * @returns 발송 성공 여부
 */
export async function sendSlackMessage(
  slackUserId: string,
  text: string
): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN

  if (!token) {
    console.warn('[Slack] SLACK_BOT_TOKEN이 설정되지 않았습니다.')
    return false
  }

  if (!slackUserId) {
    console.warn('[Slack] slackUserId가 없습니다.')
    return false
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: slackUserId,
        text: text,
        mrkdwn: true,
      }),
    })

    const result: SlackMessageResponse = await response.json()

    if (!result.ok) {
      console.error('[Slack] 메시지 발송 실패:', result.error)
      return false
    }

    console.log('[Slack] 메시지 발송 성공:', slackUserId)
    return true
  } catch (error) {
    console.error('[Slack] 메시지 발송 중 오류:', error)
    return false
  }
}

/**
 * 문서 타입 라벨
 */
export const DOC_TYPE_LABELS: Record<string, string> = {
  leave: '휴가신청서',
  overtime: '야근수당신청서',
  expense: '지출결의서',
  welfare: '경조사비신청서',
  general: '일반문서',
  budget: '예산신청서',
  expense_proposal: '지출품의서',
  resignation: '사직서',
  overtime_report: '연장근로보고서',
  work_type_change: '근로형태변경신청서',
}

/**
 * 결재 요청 알림 메시지 생성
 */
export function createApprovalRequestMessage(
  requesterName: string,
  documentTitle: string,
  documentId: number
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://must-access-demo-v2.vercel.app'
  const documentUrl = `${appUrl}/documents?id=${documentId}`
  return `📋 *새로운 결재 요청*\n\n` +
    `${requesterName}님이 결재를 요청했습니다.\n` +
    `문서: ${documentTitle}\n\n` +
    `<${documentUrl}|결재 문서 확인하기>`
}

/**
 * 결재 차례 알림 메시지 생성
 */
export function createApprovalTurnMessage(
  requesterName: string,
  documentTitle: string,
  documentId: number
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://must-access-demo-v2.vercel.app'
  const documentUrl = `${appUrl}/documents?id=${documentId}`
  return `🔔 *결재 차례 알림*\n\n` +
    `${requesterName}님의 문서가 귀하의 결재를 기다리고 있습니다.\n` +
    `문서: ${documentTitle}\n\n` +
    `<${documentUrl}|결재 문서 확인하기>`
}

/**
 * 최종 승인 완료 알림 메시지 생성
 */
export function createApprovalCompleteMessage(
  documentTitle: string,
  documentId: number
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://must-access-demo-v2.vercel.app'
  const documentUrl = `${appUrl}/documents/my-documents?id=${documentId}`
  return `✅ *최종 승인 완료*\n\n` +
    `요청하신 문서가 최종 승인되었습니다.\n` +
    `문서: ${documentTitle}\n\n` +
    `<${documentUrl}|문서 확인하기>`
}

/**
 * 결재 반려 알림 메시지 생성
 */
export function createApprovalRejectedMessage(
  documentTitle: string,
  documentId: number,
  rejectReason: string
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://must-access-demo-v2.vercel.app'
  const documentUrl = `${appUrl}/documents/my-documents?id=${documentId}`
  return `❌ *결재 반려*\n\n` +
    `요청하신 문서가 반려되었습니다.\n` +
    `문서: ${documentTitle}\n` +
    `사유: ${rejectReason}\n\n` +
    `<${documentUrl}|문서 확인하기>`
}

// ================================================================
// 회의실 예약 관련 슬랙 알림
// ================================================================

export interface MeetingInvitationData {
  bookingId: string
  organizerName: string
  title: string
  roomName: string
  floor: number
  location: string | null
  bookingDate: string
  startTime: string
  endTime: string
}

/**
 * 슬랙 메시지 발송 (Block Kit 포함)
 */
export async function sendSlackMessageWithBlocks(
  slackUserId: string,
  text: string,
  blocks: unknown[]
): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN

  if (!token) {
    console.warn('[Slack] SLACK_BOT_TOKEN이 설정되지 않았습니다.')
    return false
  }

  if (!slackUserId) {
    console.warn('[Slack] slackUserId가 없습니다.')
    return false
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: slackUserId,
        text: text,
        blocks: blocks,
      }),
    })

    const result: SlackMessageResponse = await response.json()

    if (!result.ok) {
      console.error('[Slack] 메시지 발송 실패:', result.error)
      return false
    }

    console.log('[Slack] 메시지 발송 성공 (with blocks):', slackUserId)
    return true
  } catch (error) {
    console.error('[Slack] 메시지 발송 중 오류:', error)
    return false
  }
}

/**
 * 날짜/시간 포맷팅 (12월 11일(수) 14:00 - 15:00)
 */
function formatMeetingDateTime(bookingDate: string, startTime: string, endTime: string): string {
  const date = new Date(bookingDate)
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dayName = dayNames[date.getDay()]

  // 시간에서 초 제거 (HH:MM:SS -> HH:MM)
  const start = startTime.substring(0, 5)
  const end = endTime.substring(0, 5)

  return `${month}월 ${day}일(${dayName}) ${start} - ${end}`
}

/**
 * 회의 초대 슬랙 메시지 블록 생성 (버튼 포함)
 */
export function createMeetingInvitationBlocks(data: MeetingInvitationData): unknown[] {
  const locationText = data.location
    ? `${data.roomName} (${data.floor}층, ${data.location})`
    : `${data.roomName} (${data.floor}층)`

  const dateTimeText = formatMeetingDateTime(data.bookingDate, data.startTime, data.endTime)

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '회의 초대',
        emoji: true
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${data.organizerName}*님이 회의에 초대했습니다.`
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*회의:*\n${data.title}`
        },
        {
          type: 'mrkdwn',
          text: `*장소:*\n${locationText}`
        },
        {
          type: 'mrkdwn',
          text: `*일시:*\n${dateTimeText}`
        }
      ]
    },
    {
      type: 'divider'
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '참석',
            emoji: true
          },
          style: 'primary',
          action_id: 'meeting_accept',
          value: data.bookingId
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '거절',
            emoji: true
          },
          style: 'danger',
          action_id: 'meeting_decline',
          value: data.bookingId
        }
      ]
    }
  ]
}

/**
 * 회의 초대 슬랙 알림 발송
 */
export async function sendMeetingInvitation(
  slackUserId: string,
  data: MeetingInvitationData
): Promise<boolean> {
  const fallbackText = `${data.organizerName}님이 회의에 초대했습니다: ${data.title}`
  const blocks = createMeetingInvitationBlocks(data)

  return sendSlackMessageWithBlocks(slackUserId, fallbackText, blocks)
}
