import { createClient } from '@/lib/supabase/server'
import { getSeats, getCurrentUserSeat } from '@/app/actions/seat'
import { SeatsPageClient } from '@/components/seats/SeatsPageClient'
import { redirect } from 'next/navigation'

export default async function SeatsPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch data in parallel
  const [seats, currentUserSeat] = await Promise.all([
    getSeats(),
    getCurrentUserSeat(),
  ])

  return (
    <SeatsPageClient
      initialSeats={seats}
      currentUserSeat={currentUserSeat}
      currentUserId={user.id}
    />
  )
}
