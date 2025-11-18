import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MUST Access - HR & GA Management System',
  description: 'Integrated HR and General Affairs management platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.Node
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  )
}
