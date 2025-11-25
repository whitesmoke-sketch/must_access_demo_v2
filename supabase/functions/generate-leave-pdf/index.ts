import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // 연차 신청 정보 조회
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_request')
      .select(`
        *,
        employee:employee_id (
          id,
          name,
          email,
          department:department_id (name)
        )
      `)
      .eq('id', leaveRequestId)
      .single()

    if (fetchError || !leaveRequest) {
      console.error('Leave request fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Leave request not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 결재선 조회
    const { data: approvalFlow } = await supabase
      .from('approval_flow')
      .select(`
        step,
        approver:approver_id (name, email)
      `)
      .eq('request_id', leaveRequestId)
      .order('step')

    const approverEmails = approvalFlow?.map((flow: any) => flow.approver.email).filter(Boolean) || []

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

    // DB에 드라이브 정보 저장
    const { error: updateError } = await supabase
      .from('leave_request')
      .update({
        drive_file_id: driveResponse.id,
        drive_file_url: driveResponse.webViewLink,
        drive_shared_with: approverEmails,
      })
      .eq('id', leaveRequestId)

    if (updateError) {
      console.error('Failed to update leave request:', updateError)
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

  const approversHtml = approvalFlow
    .map((flow, idx) => `
      <tr>
        <th>결재자 ${idx + 1}</th>
        <td>${flow.approver.name} (${flow.approver.email})</td>
      </tr>
    `)
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
      </style>
    </head>
    <body>
      <div class="header-info">
        <p>신청일: ${new Date(leaveRequest.created_at || leaveRequest.requested_at || Date.now()).toLocaleDateString('ko-KR')}</p>
        <p>신청번호: ${leaveRequest.id}</p>
      </div>

      <h1>연차 신청서</h1>

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
        ${approversHtml}
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
