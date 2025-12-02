export default function SeatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ color: 'var(--foreground)', fontSize: 'var(--font-size-h1)', fontWeight: 'var(--font-weight-h1)', lineHeight: 1.25 }}>
          자유석 관리
        </h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--font-size-body)', lineHeight: 1.5 }} className="mt-1">
          사무실 좌석 배치도를 확인하고 자유석을 예약합니다
        </p>
      </div>

      <div className="flex items-center justify-center h-96 bg-muted rounded-lg border-2 border-dashed" style={{ borderColor: 'var(--border)' }}>
        <div className="text-center">
          <p style={{ fontSize: 'var(--font-size-h2)', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: '8px' }}>
            추후 구현 예정
          </p>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)' }}>
            자유석 평면도 기능이 곧 제공될 예정입니다
          </p>
        </div>
      </div>
    </div>
  )
}
