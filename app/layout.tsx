import type { Metadata } from 'next'
import './globals.css'
import { ResponsiveToaster } from '@/components/common/ResponsiveToaster'

export const metadata: Metadata = {
  title: 'MUST Access - HR & GA Management System',
  description: 'Integrated HR and General Affairs management platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
        <ResponsiveToaster />
      </body>
    </html>
  )
}
