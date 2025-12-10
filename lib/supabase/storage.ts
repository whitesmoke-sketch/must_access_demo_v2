/**
 * Supabase Storage Utility
 * 파일 다운로드 및 업로드 헬퍼 함수
 */

import { createAdminClient } from './server'

/**
 * Supabase Storage에서 파일 다운로드
 * @param bucket - 스토리지 버킷 이름
 * @param path - 파일 경로
 * @returns 파일 Buffer
 */
export async function downloadFileFromSupabase(
  bucket: string,
  path: string
): Promise<Buffer> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.storage.from(bucket).download(path)

  if (error) {
    throw new Error(`Supabase 파일 다운로드 실패: ${error.message}`)
  }

  // Blob -> ArrayBuffer -> Buffer 변환
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * 파일의 MIME 타입 추정
 * @param fileName - 파일명
 * @returns MIME 타입 문자열
 */
export function guessMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  const mimeTypes: Record<string, string> = {
    // 이미지
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',

    // 문서
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // 텍스트
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',

    // 압축
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
  }

  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * 첨부파일 정보 인터페이스
 */
export interface AttachmentInfo {
  name: string
  path: string
  mimeType?: string
  size?: number
}

/**
 * 여러 첨부파일 다운로드
 * @param bucket - 스토리지 버킷 이름
 * @param attachments - 첨부파일 정보 배열
 * @returns 파일 데이터 배열
 */
export async function downloadAttachments(
  bucket: string,
  attachments: AttachmentInfo[]
): Promise<Array<{ name: string; buffer: Buffer; mimeType: string }>> {
  const results: Array<{ name: string; buffer: Buffer; mimeType: string }> = []

  for (const attachment of attachments) {
    try {
      const buffer = await downloadFileFromSupabase(bucket, attachment.path)
      const mimeType = attachment.mimeType || guessMimeType(attachment.name)

      results.push({
        name: attachment.name,
        buffer,
        mimeType,
      })
    } catch (error) {
      console.error(`첨부파일 다운로드 실패 (${attachment.name}):`, error)
      // 개별 파일 실패 시 계속 진행
    }
  }

  return results
}

/**
 * 파일 URL에서 경로 추출
 * Supabase Storage URL에서 버킷 이후의 경로를 추출
 * @param url - 전체 URL
 * @param bucket - 버킷 이름
 * @returns 파일 경로
 */
export function extractPathFromUrl(url: string, bucket: string): string | null {
  try {
    // URL 형식: https://xxx.supabase.co/storage/v1/object/public/bucket/path/to/file
    const regex = new RegExp(`/storage/v1/object/(?:public|authenticated)/${bucket}/(.+)`)
    const match = url.match(regex)

    if (match && match[1]) {
      return decodeURIComponent(match[1])
    }

    // 간단한 경로 형식 (버킷/경로)인 경우
    if (url.startsWith(`${bucket}/`)) {
      return url.substring(bucket.length + 1)
    }

    // 그냥 경로만 있는 경우
    if (!url.includes('://')) {
      return url
    }

    return null
  } catch {
    return null
  }
}
