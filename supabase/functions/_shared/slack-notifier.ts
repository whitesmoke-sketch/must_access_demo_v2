/**
 * Slack Notification Utility
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
  const token = Deno.env.get('SLACK_BOT_TOKEN')

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
        // 마크다운 지원
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
 * 결재 요청 알림 메시지 생성
 */
export function createApprovalRequestMessage(
  requesterName: string,
  documentTitle: string,
  documentId: number,
  appUrl: string
): string {
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
  documentId: number,
  appUrl: string
): string {
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
  documentId: number,
  appUrl: string
): string {
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
  rejectReason: string,
  appUrl: string
): string {
  const documentUrl = `${appUrl}/documents/my-documents?id=${documentId}`
  return `❌ *결재 반려*\n\n` +
    `요청하신 문서가 반려되었습니다.\n` +
    `문서: ${documentTitle}\n` +
    `사유: ${rejectReason}\n\n` +
    `<${documentUrl}|문서 확인하기>`
}
