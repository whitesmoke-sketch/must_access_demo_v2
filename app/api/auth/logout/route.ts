import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()

  // Sign out
  await supabase.auth.signOut()

  return NextResponse.json({
    success: true,
    message: 'Logged out successfully. Please login again with local test account.'
  })
}
