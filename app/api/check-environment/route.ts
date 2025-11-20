import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Get environment info
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isLocal = supabaseUrl?.includes('127.0.0.1') || supabaseUrl?.includes('localhost')

  // Try to get employee info
  let employeeData = null
  let employeeError = null

  if (user) {
    const { data, error } = await supabase
      .from('employee')
      .select('id, name, email')
      .eq('id', user.id)
      .maybeSingle()

    employeeData = data
    employeeError = error
  }

  return NextResponse.json({
    environment: isLocal ? 'LOCAL' : 'PRODUCTION',
    supabaseUrl,
    userId: user?.id,
    userEmail: user?.email,
    employeeData,
    employeeError: employeeError?.message,
    timestamp: new Date().toISOString()
  })
}
