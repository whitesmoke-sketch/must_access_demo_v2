export default function TestEnvPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variables Test</h1>
      <div style={{ background: '#f0f0f0', padding: '10px', marginTop: '20px' }}>
        <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong></p>
        <p>{process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
      </div>
      <div style={{ background: '#f0f0f0', padding: '10px', marginTop: '10px' }}>
        <p><strong>Expected (Local):</strong> http://127.0.0.1:54321</p>
        <p><strong>Production:</strong> https://dpruiclfgmyrzrvbekps.supabase.co</p>
      </div>
      <div style={{ marginTop: '20px' }}>
        {process.env.NEXT_PUBLIC_SUPABASE_URL === 'http://127.0.0.1:54321' ? (
          <p style={{ color: 'green', fontWeight: 'bold' }}>✅ 로컬 Supabase 사용 중</p>
        ) : (
          <p style={{ color: 'red', fontWeight: 'bold' }}>❌ 원격 Supabase 사용 중 - 서버 재시작 필요</p>
        )}
      </div>
    </div>
  )
}
