/**
 * Google Drive API Utility
 * 결재 완료 문서를 구글 드라이브에 아카이빙하기 위한 헬퍼 함수
 */

import { google, drive_v3 } from 'googleapis'
import { Readable } from 'stream'

/**
 * OAuth2 클라이언트 생성
 */
function createOAuth2Client(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })
  return oauth2Client
}

/**
 * 구글 드라이브에 폴더 생성
 */
export async function createDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<string | null> {
  try {
    const auth = createOAuth2Client(accessToken)
    const drive = google.drive({ version: 'v3', auth })

    const fileMetadata: drive_v3.Schema$File = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }

    // 부모 폴더가 지정된 경우
    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId]
    }

    const res = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, webViewLink',
    })

    console.log(`[Drive] 폴더 생성 완료: ${folderName} (${res.data.id})`)
    return res.data.id || null
  } catch (error) {
    console.error('[Drive] 폴더 생성 실패:', error)
    throw error
  }
}

/**
 * 구글 드라이브에 파일 업로드 (Buffer 지원)
 */
export async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  content: Buffer | Uint8Array
): Promise<{ id: string | null; webViewLink: string | null }> {
  try {
    const auth = createOAuth2Client(accessToken)
    const drive = google.drive({ version: 'v3', auth })

    // Buffer를 Readable Stream으로 변환
    const stream = new Readable()
    stream.push(Buffer.from(content))
    stream.push(null)

    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, webViewLink',
    })

    console.log(`[Drive] 파일 업로드 완료: ${fileName} (${res.data.id})`)
    return {
      id: res.data.id || null,
      webViewLink: res.data.webViewLink || null,
    }
  } catch (error) {
    console.error(`[Drive] 파일 업로드 실패 (${fileName}):`, error)
    throw error
  }
}

/**
 * 폴더 URL 조회
 */
export async function getDriveFolderUrl(
  accessToken: string,
  folderId: string
): Promise<string | null> {
  try {
    const auth = createOAuth2Client(accessToken)
    const drive = google.drive({ version: 'v3', auth })

    const res = await drive.files.get({
      fileId: folderId,
      fields: 'webViewLink',
    })

    return res.data.webViewLink || null
  } catch (error) {
    console.error('[Drive] 폴더 URL 조회 실패:', error)
    return null
  }
}

/**
 * 특정 폴더 내에서 이름으로 폴더 검색
 */
export async function findFolderByName(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<string | null> {
  try {
    const auth = createOAuth2Client(accessToken)
    const drive = google.drive({ version: 'v3', auth })

    let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`
    }

    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      pageSize: 1,
    })

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id || null
    }

    return null
  } catch (error) {
    console.error('[Drive] 폴더 검색 실패:', error)
    return null
  }
}

/**
 * 폴더가 없으면 생성, 있으면 기존 폴더 ID 반환
 */
export async function getOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<string | null> {
  // 먼저 기존 폴더 검색
  const existingFolderId = await findFolderByName(accessToken, folderName, parentFolderId)
  if (existingFolderId) {
    console.log(`[Drive] 기존 폴더 사용: ${folderName} (${existingFolderId})`)
    return existingFolderId
  }

  // 없으면 새로 생성
  return createDriveFolder(accessToken, folderName, parentFolderId)
}

/**
 * 문서 타입별 한글 라벨
 */
export const DocumentTypeKoreanLabels: Record<string, string> = {
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
 * 아카이빙 폴더명 생성
 * 형식: [작성자]_[문서타입]_[날짜]
 */
export function generateArchiveFolderName(
  authorName: string,
  docType: string,
  createdAt: string
): string {
  const dateStr = createdAt.split('T')[0] // YYYY-MM-DD
  const docTypeLabel = DocumentTypeKoreanLabels[docType] || docType
  return `${authorName}_${docTypeLabel}_${dateStr}`
}

/**
 * 아카이빙 파일명 생성
 * 형식: [작성자]_[문서타입]_[날짜].pdf
 */
export function generateArchiveFileName(
  authorName: string,
  docType: string,
  createdAt: string
): string {
  return `${generateArchiveFolderName(authorName, docType, createdAt)}.pdf`
}
