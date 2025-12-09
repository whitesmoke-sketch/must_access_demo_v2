import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 김춘식 서명 SVG (Base64로 임베딩)
const CHUNSIK_SIGNATURE_SVG = `<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <rect x="5" y="5" width="110" height="110" rx="20" ry="20" stroke="#cc0000" stroke-width="5" fill="none" />
  <path d="M47.40 46.72L47.40 46.72Q47.87 46.64 48.22 46.62Q48.57 46.60 48.96 46.56L48.96 46.56L48.11 49.88Q46.78 49.77 44.94 49.73Q43.11 49.69 41.09 49.67Q39.08 49.65 37.05 49.69Q35.02 49.73 33.34 49.80L33.34 49.80Q33.26 50.04 33.18 50.37Q33.11 50.70 33.03 51.13L33.03 51.13L29.79 51.68Q29.75 51.29 29.69 50.74Q29.63 50.20 29.57 49.61Q29.51 49.02 29.45 48.44Q29.39 47.85 29.36 47.34L29.36 47.34L28.89 40.20Q28.85 39.57 28.75 39.16Q28.65 38.75 28.36 38.50Q28.07 38.24 27.52 38.03Q26.97 37.81 26.04 37.58L26.04 37.58L26.93 35.82Q29.51 36.17 32.25 36.29Q34.98 36.41 37.73 36.37Q40.49 36.33 43.18 36.17Q45.88 36.02 48.46 35.78L48.46 35.78Q48.34 36.76 48.18 38.13Q48.03 39.49 47.89 41.00Q47.75 42.50 47.62 44.00Q47.48 45.51 47.40 46.72ZM43.46 46.99L43.57 38.75Q42.40 38.71 41.04 38.69Q39.67 38.67 38.30 38.71Q36.93 38.75 35.64 38.81Q34.36 38.87 33.30 38.91L33.30 38.91L33.46 46.64L33.46 47.30Q35.76 47.27 38.40 47.17Q41.04 47.07 43.46 46.99L43.46 46.99ZM39.12 15.39L40.02 13.67Q40.92 13.79 42.13 13.98Q43.34 14.18 44.59 14.41Q45.84 14.65 46.99 14.84Q48.14 15.04 48.93 15.16L48.93 15.16Q48.81 15.51 48.73 16.09Q48.65 16.68 48.57 17.27Q48.50 17.85 48.46 18.30Q48.42 18.75 48.42 18.79L48.42 18.79L48.42 28.32Q48.42 29.02 48.34 29.98Q48.26 30.94 48.16 31.89Q48.07 32.85 47.95 33.69Q47.83 34.53 47.71 35L47.71 35L44.32 35.51Q44.24 35.12 44.20 34.47Q44.16 33.83 44.10 33.09Q44.04 32.34 44.02 31.62Q44.00 30.90 44.00 30.35L44.00 30.35L44.00 18.63Q44.00 17.50 42.85 16.78Q41.70 16.05 39.12 15.39L39.12 15.39ZM37.44 18.09L39.08 19.02Q38.11 21.99 36.17 24.82Q34.24 27.66 31.62 30.18Q29.00 32.70 25.88 34.82Q22.75 36.95 19.39 38.48L19.39 38.48L18.26 36.99Q20.64 35.70 22.99 33.89Q25.33 32.07 27.36 29.98Q29.39 27.89 30.96 25.63Q32.52 23.36 33.38 21.21L33.38 21.21Q31.62 21.21 30.04 21.29Q28.46 21.37 27.64 21.45L27.64 21.45Q27.25 21.48 26.56 21.56Q25.88 21.64 25.08 21.72Q24.28 21.80 23.44 21.91Q22.60 22.03 21.93 22.19L21.93 22.19L19.51 18.63Q19.90 18.71 20.78 18.77Q21.66 18.83 22.66 18.89Q23.65 18.95 24.63 18.98Q25.61 19.02 26.27 19.02L26.27 19.02Q27.83 19.02 29.51 18.95Q31.19 18.87 32.71 18.75Q34.24 18.63 35.49 18.46Q36.74 18.28 37.44 18.09L37.44 18.09Z" fill="#cc0000" />
  <path d="M88.65 26.05L88.65 26.05Q90.06 26.37 91.58 26.70Q93.11 27.03 94.67 27.32Q96.23 27.62 97.77 27.87Q99.32 28.13 100.72 28.28L100.72 28.28L98.18 31.41Q97.25 31.09 95.80 30.61Q94.36 30.12 92.68 29.55Q91.00 28.98 89.28 28.42Q87.56 27.85 86.07 27.38L86.07 27.38Q82.56 29.14 78.75 30.33Q74.94 31.52 71.04 32.30L71.04 32.30L69.90 30.70Q72.79 30.08 75.51 29.10Q78.22 28.13 80.63 26.99Q83.03 25.86 85.06 24.61Q87.09 23.36 88.57 22.15L88.57 22.15Q86.31 22.15 84.45 22.17Q82.60 22.19 80.61 22.38L80.61 22.38Q80.21 22.42 79.47 22.52Q78.73 22.62 77.89 22.75Q77.05 22.89 76.19 23.01Q75.33 23.13 74.75 23.24L74.75 23.24L72.29 19.57Q72.79 19.65 73.67 19.77Q74.55 19.88 75.55 19.98Q76.54 20.08 77.48 20.16Q78.42 20.23 79.08 20.23L79.08 20.23Q80.49 20.23 82.46 20.20Q84.43 20.16 86.58 20.02Q88.73 19.88 90.86 19.67Q92.99 19.45 94.67 19.14L94.67 19.14L96.15 20.78Q92.79 23.79 88.65 26.05ZM91.19 14.88L90.33 17.73Q89.67 17.73 88.75 17.73Q87.83 17.73 86.91 17.75Q86.00 17.77 85.20 17.79Q84.39 17.81 84.00 17.81L84.00 17.81Q83.73 17.81 83.09 17.85Q82.44 17.89 81.72 17.97Q81.00 18.05 80.29 18.13Q79.59 18.20 79.16 18.32L79.16 18.32L77.17 14.80Q77.68 14.88 78.59 15Q79.51 15.12 80.47 15.21Q81.43 15.31 82.25 15.39Q83.07 15.47 83.42 15.47L83.42 15.47Q83.85 15.47 84.79 15.43Q85.72 15.39 86.84 15.31Q87.95 15.23 89.10 15.12Q90.25 15 91.19 14.88L91.19 14.88ZM99.20 46.88L98.61 50.43Q96.23 50.31 93.42 50.25Q90.61 50.20 87.85 50.21Q85.10 50.23 82.60 50.29Q80.10 50.35 78.38 50.47L78.38 50.47Q76.78 50.59 76.13 49.86Q75.49 49.14 75.49 48.24L75.49 48.24L75.49 44.22Q75.49 43.40 75.41 42.91Q75.33 42.42 75 42.09Q74.67 41.76 73.96 41.52Q73.26 41.29 72.05 40.98L72.05 40.98L72.79 39.26Q73.38 39.34 74.38 39.45Q75.37 39.57 76.45 39.73Q77.52 39.88 78.54 40.02Q79.55 40.16 80.14 40.23L80.14 40.23Q80.10 40.47 80.06 40.86Q80.02 41.25 79.98 41.70Q79.94 42.15 79.92 42.60Q79.90 43.05 79.90 43.40L79.90 43.40L79.90 46.99Q79.90 47.66 80.02 47.77Q80.14 47.89 80.72 47.93L80.72 47.93Q81.70 47.93 83.13 47.91Q84.55 47.89 86.25 47.83Q87.95 47.77 89.77 47.70Q91.58 47.62 93.30 47.48Q95.02 47.34 96.56 47.21Q98.11 47.07 99.20 46.88L99.20 46.88ZM88.34 36.45L88.34 37.58Q88.34 38.24 88.30 39.12Q88.26 40 88.18 40.90Q88.11 41.80 88.01 42.68Q87.91 43.55 87.79 44.22L87.79 44.22L84.24 44.80Q84.16 44.06 84.10 43.13Q84.04 42.19 83.98 41.25Q83.93 40.31 83.89 39.49Q83.85 38.67 83.85 38.16L83.85 38.16L83.85 36.52Q82.32 36.56 80.84 36.60Q79.36 36.64 78.09 36.68Q76.82 36.72 75.82 36.76Q74.82 36.80 74.24 36.84L74.24 36.84Q73.54 36.88 72.70 36.95Q71.86 37.03 71.00 37.11Q70.14 37.19 69.30 37.29Q68.46 37.38 67.79 37.46L67.79 37.46L66.23 33.59Q67.99 33.79 70.21 33.95Q72.44 34.10 74.20 34.18L74.20 34.18Q75.14 34.22 76.66 34.24Q78.18 34.26 80 34.24Q81.82 34.22 83.79 34.18Q85.76 34.14 87.58 34.08Q89.39 34.02 90.92 33.96Q92.44 33.91 93.38 33.87L93.38 33.87Q94.67 33.83 96.07 33.71Q97.48 33.59 98.87 33.46Q100.25 33.32 101.54 33.18Q102.83 33.05 103.93 32.89L103.93 32.89L103.30 36.56Q102.52 36.52 101.45 36.46Q100.37 36.41 99.12 36.37Q97.87 36.33 96.54 36.29Q95.21 36.25 93.93 36.25L93.93 36.25Q92.95 36.25 91.52 36.25Q90.10 36.25 88.34 36.45L88.34 36.45Z" fill="#cc0000" />
  <path d="M32.17 75.55L32.17 75.55Q34.16 77.11 36.48 78.81Q38.81 80.51 41.39 82.11L41.39 82.11L38.14 85.08Q36.39 83.16 34.49 81.21Q32.60 79.26 30.72 77.50L30.72 77.50Q28.34 80.31 25.37 82.48Q22.40 84.65 19.08 86.64L19.08 86.64L17.83 85.20Q19.82 83.87 21.78 82.15Q23.73 80.43 25.39 78.48Q27.05 76.52 28.28 74.47Q29.51 72.42 30.10 70.47L30.10 70.47Q30.29 69.69 30.08 69.47Q29.86 69.26 29.90 69.30L29.90 69.30Q29.63 69.02 28.98 68.71Q28.34 68.40 27.56 68.09L27.56 68.09L28.61 66.56Q29.39 66.76 30.35 67.05Q31.31 67.34 32.29 67.64Q33.26 67.93 34.22 68.24Q35.18 68.55 35.96 68.79L35.96 68.79Q35.18 70.78 34.24 72.42Q33.30 74.06 32.17 75.55ZM39.51 65.39L40.41 63.67Q41.31 63.79 42.52 63.98Q43.73 64.18 44.98 64.41Q46.23 64.65 47.38 64.84Q48.54 65.04 49.28 65.16L49.28 65.16Q49.20 65.51 49.14 66.09Q49.08 66.68 49.00 67.27Q48.93 67.85 48.89 68.30Q48.85 68.75 48.85 68.79L48.85 68.79L48.85 79.45Q48.85 80.12 48.77 81.05Q48.69 81.99 48.57 82.95Q48.46 83.91 48.34 84.77Q48.22 85.63 48.11 86.09L48.11 86.09L44.79 86.60Q44.71 86.17 44.63 85.53Q44.55 84.88 44.49 84.16Q44.43 83.44 44.41 82.73Q44.39 82.03 44.39 81.48L44.39 81.48L44.39 68.63Q44.39 67.50 43.24 66.78Q42.09 66.05 39.51 65.39L39.51 65.39ZM30.76 87.97L30.76 87.97Q32.75 87.97 35.29 87.87Q37.83 87.77 40.35 87.64Q42.87 87.50 45.14 87.34Q47.40 87.19 48.89 87.03L48.89 87.03Q48.69 88.05 48.63 88.71Q48.57 89.38 48.57 90.04L48.57 90.04L48.57 95.47Q48.57 96.60 48.46 97.99Q48.34 99.38 47.79 101.05L47.79 101.05L44.47 101.68Q44.39 101.21 44.34 100.51Q44.28 99.80 44.24 99.04Q44.20 98.28 44.16 97.56Q44.12 96.84 44.12 96.37L44.12 96.37L44.12 89.84Q41.19 89.73 37.99 89.96Q34.79 90.20 31.74 90.39L31.74 90.39Q30.57 90.47 29.26 90.66Q27.95 90.86 26.58 91.05L26.58 91.05L25.02 87.50Q25.53 87.58 26.29 87.68Q27.05 87.77 27.87 87.83Q28.69 87.89 29.45 87.93Q30.21 87.97 30.76 87.97Z" fill="#cc0000" />
  <path d="M81.39 70.04L81.39 70.04Q83.03 70.27 84.36 70.94Q85.68 71.60 86.62 72.58Q87.56 73.55 88.07 74.77Q88.57 75.98 88.57 77.34L88.57 77.34Q88.57 78.95 87.87 80.31Q87.17 81.68 85.94 82.70Q84.71 83.71 83.03 84.30Q81.35 84.88 79.36 84.88L79.36 84.88Q77.32 84.88 75.61 84.30Q73.89 83.71 72.66 82.70Q71.43 81.68 70.74 80.31Q70.06 78.95 70.06 77.34L70.06 77.34Q70.06 75.94 70.61 74.69Q71.15 73.44 72.17 72.44Q73.18 71.45 74.61 70.80Q76.04 70.16 77.75 69.96L77.75 69.96Q77.68 69.45 77.32 69.16Q76.97 68.87 76.07 68.59L76.07 68.59L76.89 67.19Q77.32 67.27 78.01 67.42Q78.69 67.58 79.41 67.73Q80.14 67.89 80.82 68.05Q81.50 68.20 81.97 68.32L81.97 68.32Q81.89 68.59 81.72 69.02Q81.54 69.45 81.39 70.04ZM84.04 77.15L84.04 77.15Q84.04 76.05 83.67 75.14Q83.30 74.22 82.66 73.54Q82.01 72.85 81.17 72.46Q80.33 72.07 79.39 72.07L79.39 72.07Q78.38 72.07 77.52 72.46Q76.66 72.85 76.02 73.54Q75.37 74.22 75 75.14Q74.63 76.05 74.63 77.15L74.63 77.15Q74.63 78.32 75 79.26Q75.37 80.20 76.02 80.86Q76.66 81.52 77.52 81.89Q78.38 82.27 79.39 82.27L79.39 82.27Q80.33 82.27 81.19 81.89Q82.05 81.52 82.68 80.86Q83.30 80.20 83.67 79.26Q84.04 78.32 84.04 77.15ZM89.28 65.39L90.18 63.67Q91.07 63.79 92.29 63.98Q93.50 64.18 94.75 64.41Q96.00 64.65 97.15 64.84Q98.30 65.04 99.08 65.16L99.08 65.16Q99.00 65.51 98.93 66.09Q98.85 66.68 98.77 67.27Q98.69 67.85 98.63 68.30Q98.57 68.75 98.57 68.79L98.57 68.79L98.57 84.65Q98.57 85.55 98.52 86.58Q98.46 87.62 98.36 88.67Q98.26 89.73 98.13 90.66Q97.99 91.60 97.87 92.27L97.87 92.27L94.47 92.81Q94.39 92.34 94.36 91.48Q94.32 90.63 94.26 89.63Q94.20 88.63 94.18 87.64Q94.16 86.64 94.16 85.94L94.16 85.94L94.16 68.63Q94.16 67.50 93.01 66.78Q91.86 66.05 89.28 65.39L89.28 65.39ZM101.15 96.68L100.57 100.16Q98.22 100.12 95.76 100.12Q93.30 100.12 90.94 100.16Q88.57 100.20 86.41 100.27Q84.24 100.35 82.52 100.47L82.52 100.47Q80.88 100.59 80.21 99.86Q79.55 99.14 79.55 98.24L79.55 98.24L79.55 93.36Q79.55 92.54 79.47 92.05Q79.39 91.56 79.04 91.23Q78.69 90.90 77.99 90.66Q77.29 90.43 76.04 90.12L76.04 90.12L76.93 88.36Q77.52 88.44 78.52 88.55Q79.51 88.67 80.61 88.83Q81.70 88.98 82.71 89.12Q83.73 89.26 84.32 89.38L84.32 89.38Q84.28 89.61 84.24 90Q84.20 90.39 84.16 90.84Q84.12 91.29 84.08 91.72Q84.04 92.15 84.04 92.50L84.04 92.50L84.04 96.99Q84.04 97.66 84.16 97.77Q84.28 97.89 84.82 97.93L84.82 97.93Q86.27 97.97 88.38 97.85Q90.49 97.73 92.77 97.56Q95.06 97.38 97.27 97.15Q99.47 96.91 101.15 96.68L101.15 96.68Z" fill="#cc0000" />
</svg>`

// SVG를 Base64 Data URI로 변환
function svgToDataUri(svg: string): string {
  const base64 = btoa(unescape(encodeURIComponent(svg)))
  return `data:image/svg+xml;base64,${base64}`
}


serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { leaveRequestId, accessToken } = await req.json()

    if (!leaveRequestId || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 연차 신청 정보 조회 (doc_data JSONB에서 추출)
    const { data: documentData, error: fetchError } = await supabase
      .from('document_master')
      .select(`
        id,
        requester_id,
        created_at,
        status,
        doc_data,
        requester:requester_id (
          id,
          name,
          email,
          department:department_id (name)
        )
      `)
      .eq('id', leaveRequestId)
      .single()

    if (fetchError || !documentData) {
      console.error('Document fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // doc_data JSONB에서 휴가 데이터 추출
    const docData = documentData.doc_data || {}

    const leaveRequest = {
      id: documentData.id,
      created_at: documentData.created_at,
      status: documentData.status,
      employee: documentData.requester,
      leave_type: docData.leave_type || 'annual',
      start_date: docData.start_date,
      end_date: docData.end_date,
      number_of_days: docData.days_count || 1,
      reason: docData.reason,
    }

    // 결재선 조회 (approval_step 테이블 사용)
    const { data: approvalFlow } = await supabase
      .from('approval_step')
      .select(`
        step_order,
        status,
        approved_at,
        comment,
        approval_type,
        approver:approver_id (id, name, email)
      `)
      .eq('request_type', 'leave')
      .eq('request_id', leaveRequestId)
      .order('step_order')

    const approverEmails = approvalFlow?.map((flow: any) => flow.approver?.email).filter(Boolean) || []

    // PDF HTML 생성
    const pdfHtml = generatePdfHtml(leaveRequest, approvalFlow || [])

    // Google Drive에 업로드
    console.log('Uploading to Google Drive...')
    const fileName = `연차신청서_${leaveRequest.employee.name}_${new Date().toISOString().split('T')[0]}.pdf`

    const driveResponse = await uploadToGoogleDrive(
      pdfHtml,
      fileName,
      accessToken
    )

    if (!driveResponse.id) {
      throw new Error('Failed to upload to Google Drive')
    }

    // 결재권자에게 읽기 권한 부여
    if (approverEmails.length > 0) {
      console.log('Sharing with approvers:', approverEmails)
      await shareWithApprovers(driveResponse.id, approverEmails, accessToken)
    }

    // DB에 드라이브 정보 저장 (document_master에 저장)
    const { error: updateError } = await supabase
      .from('document_master')
      .update({
        drive_file_id: driveResponse.id,
        drive_file_url: driveResponse.webViewLink,
      })
      .eq('id', leaveRequestId)

    if (updateError) {
      console.error('Failed to update document_master:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        fileId: driveResponse.id,
        fileUrl: driveResponse.webViewLink,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// PDF HTML 템플릿 생성
function generatePdfHtml(leaveRequest: any, approvalFlow: any[]): string {
  const leaveTypeMap: Record<string, string> = {
    'annual': '연차',
    'half_day': '반차',
    'sick': '병가',
    'award': '포상휴가',
    'special': '특별휴가',
  }

  // 서명 이미지 Data URI
  const signatureDataUri = svgToDataUri(CHUNSIK_SIGNATURE_SVG)

  // 결재선 테이블 헤더 (결재자 이름)
  const approverHeaders = approvalFlow
    .map((flow, idx) => `
      <th class="approval-header">
        <div class="approval-title">결재자 ${idx + 1}</div>
        <div class="approver-name">${flow.approver?.name || '미지정'}</div>
      </th>
    `)
    .join('')

  // 결재선 서명 셀 (서명 이미지 + 상태) - 모든 결재자에게 도장 표시
  const approverSignatures = approvalFlow
    .map((flow) => {
      const isApproved = flow.status === 'approved'
      const isRejected = flow.status === 'rejected'
      const isPending = flow.status === 'pending' || flow.status === 'waiting'

      let statusText = ''
      let statusClass = ''

      if (isApproved) {
        statusText = '승인'
        statusClass = 'status-approved'
      } else if (isRejected) {
        statusText = '반려'
        statusClass = 'status-rejected'
      } else if (isPending) {
        statusText = '대기'
        statusClass = 'status-pending'
      } else {
        statusText = '-'
        statusClass = ''
      }

      // 모든 결재자에게 도장 표시 (반려 제외)
      const showSignature = !isRejected

      return `
        <td class="signature-cell">
          <div class="signature-box">
            ${showSignature ? `<img src="${signatureDataUri}" class="signature-image" alt="서명" />` : ''}
            <div class="status-text ${statusClass}">${statusText}</div>
            ${flow.approved_at ? `<div class="approved-date">${new Date(flow.approved_at).toLocaleDateString('ko-KR')}</div>` : ''}
          </div>
        </td>
      `
    })
    .join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { size: A4; margin: 20mm; }
        body {
          font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
          padding: 40px;
          line-height: 1.6;
        }
        h1 {
          text-align: center;
          border-bottom: 3px solid #333;
          padding-bottom: 15px;
          margin-bottom: 30px;
          font-size: 28px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 14px;
        }
        td, th {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
          font-weight: bold;
          width: 150px;
        }

        /* 결재선 테이블 스타일 */
        .approval-table {
          margin-top: 30px;
          margin-bottom: 30px;
        }
        .approval-table th, .approval-table td {
          text-align: center;
          vertical-align: middle;
        }
        .approval-header {
          width: auto;
          min-width: 100px;
          background-color: #e8e8e8;
        }
        .approval-title {
          font-size: 11px;
          color: #666;
          margin-bottom: 4px;
        }
        .approver-name {
          font-size: 14px;
          font-weight: bold;
        }
        .signature-cell {
          height: 100px;
          position: relative;
          padding: 8px;
        }
        .signature-box {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .signature-image {
          width: 70px;
          height: 70px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.9;
          z-index: 1;
        }
        .status-text {
          font-size: 12px;
          font-weight: bold;
          z-index: 2;
          position: relative;
        }
        .status-approved {
          color: #16a34a;
        }
        .status-rejected {
          color: #dc2626;
        }
        .status-pending {
          color: #9ca3af;
        }
        .approved-date {
          font-size: 10px;
          color: #666;
          margin-top: 4px;
          z-index: 2;
          position: relative;
        }

        .signature {
          margin-top: 50px;
          text-align: right;
          font-size: 16px;
        }
        .header-info {
          text-align: right;
          margin-bottom: 10px;
          color: #666;
          font-size: 12px;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          margin-top: 30px;
          margin-bottom: 10px;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="header-info">
        <p>신청일: ${new Date(leaveRequest.created_at || leaveRequest.requested_at || Date.now()).toLocaleDateString('ko-KR')}</p>
        <p>신청번호: ${leaveRequest.id}</p>
      </div>

      <h1>연차 신청서</h1>

      <!-- 결재선 테이블 (상단) -->
      ${approvalFlow.length > 0 ? `
      <div class="section-title">결재선</div>
      <table class="approval-table">
        <tr>
          ${approverHeaders}
        </tr>
        <tr>
          ${approverSignatures}
        </tr>
      </table>
      ` : ''}

      <!-- 신청 내용 테이블 -->
      <div class="section-title">신청 내용</div>
      <table>
        <tr>
          <th>신청자</th>
          <td>${leaveRequest.employee.name}</td>
        </tr>
        <tr>
          <th>이메일</th>
          <td>${leaveRequest.employee.email}</td>
        </tr>
        <tr>
          <th>소속 부서</th>
          <td>${leaveRequest.employee.department?.name || '-'}</td>
        </tr>
        <tr>
          <th>연차 종류</th>
          <td>${leaveTypeMap[leaveRequest.leave_type] || leaveRequest.leave_type}</td>
        </tr>
        <tr>
          <th>시작일</th>
          <td>${new Date(leaveRequest.start_date).toLocaleDateString('ko-KR')}</td>
        </tr>
        <tr>
          <th>종료일</th>
          <td>${new Date(leaveRequest.end_date).toLocaleDateString('ko-KR')}</td>
        </tr>
        <tr>
          <th>일수</th>
          <td>${leaveRequest.number_of_days || 1}일</td>
        </tr>
        <tr>
          <th>사유</th>
          <td style="white-space: pre-wrap;">${leaveRequest.reason || '-'}</td>
        </tr>
      </table>

      <div class="signature">
        <p style="margin-bottom: 40px;">신청자: ${leaveRequest.employee.name} (인)</p>
        <p style="font-size: 12px; color: #666;">본 문서는 시스템에서 자동 생성되었습니다.</p>
      </div>
    </body>
    </html>
  `
}

// Google Drive에 HTML을 PDF로 변환하여 업로드
async function uploadToGoogleDrive(
  html: string,
  fileName: string,
  accessToken: string
): Promise<{ id: string; webViewLink: string }> {
  // HTML을 Google Docs로 업로드하고 PDF로 변환
  // 먼저 임시 HTML 파일로 업로드
  const boundary = '-------314159265358979323846'
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metadata = {
    name: fileName,
    mimeType: 'application/pdf',
  }

  // HTML을 단순 텍스트로 변환 (실제로는 PDF 라이브러리 사용 권장)
  const htmlBytes = new TextEncoder().encode(html)
  const base64Html = btoa(String.fromCharCode(...htmlBytes))

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/html\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Html +
    closeDelimiter

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Drive upload failed: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

// 결재권자에게 읽기 권한 부여
async function shareWithApprovers(
  fileId: string,
  approverEmails: string[],
  accessToken: string
): Promise<void> {
  const sharePromises = approverEmails.map(async (email) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'user',
            role: 'reader', // 읽기 전용
            emailAddress: email,
          }),
        }
      )

      if (!response.ok) {
        console.error(`Failed to share with ${email}:`, await response.text())
      }
    } catch (error) {
      console.error(`Error sharing with ${email}:`, error)
    }
  })

  await Promise.all(sharePromises)
}
