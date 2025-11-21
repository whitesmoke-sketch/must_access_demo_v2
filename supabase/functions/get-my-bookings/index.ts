import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  employeeId: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { employeeId }: RequestBody = await req.json()

    // Validate input
    if (!employeeId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'employeeId is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Authorization header'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid authentication token'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify user is requesting their own bookings
    if (user.id !== employeeId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You can only view your own bookings'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // 1. Get bookings created by the user
    const { data: myBookings, error: myBookingsError } = await supabase
      .from('meeting_room_booking')
      .select(`
        id,
        booked_by,
        booking_date,
        start_time,
        end_time,
        title,
        room:room_id(name),
        attendees:meeting_room_booking_attendee(
          employee:employee_id(id, name)
        )
      `)
      .eq('booked_by', employeeId)
      .eq('status', 'confirmed')
      .gte('booking_date', today)

    if (myBookingsError) {
      console.error('Error fetching my bookings:', myBookingsError)
    }

    // 2. Get booking IDs where user is an attendee
    const { data: attendeeBookings, error: attendeeError } = await supabase
      .from('meeting_room_booking_attendee')
      .select('booking_id')
      .eq('employee_id', employeeId)

    if (attendeeError) {
      console.error('Error fetching attendee bookings:', attendeeError)
    }

    const attendeeBookingIds = attendeeBookings?.map(a => a.booking_id) || []

    // 3. Get details of bookings where user is an attendee
    let attendeeBookingDetails: any[] = []
    if (attendeeBookingIds.length > 0) {
      const { data, error } = await supabase
        .from('meeting_room_booking')
        .select(`
          id,
          booked_by,
          booking_date,
          start_time,
          end_time,
          title,
          room:room_id(name),
          attendees:meeting_room_booking_attendee(
            employee:employee_id(id, name)
          )
        `)
        .in('id', attendeeBookingIds)
        .eq('status', 'confirmed')
        .gte('booking_date', today)

      if (error) {
        console.error('Error fetching attendee booking details:', error)
      } else {
        attendeeBookingDetails = data || []
      }
    }

    // 4. Combine and deduplicate bookings
    const allBookingsMap = new Map()

    ;[...(myBookings || []), ...attendeeBookingDetails].forEach(booking => {
      if (!allBookingsMap.has(booking.id)) {
        allBookingsMap.set(booking.id, booking)
      }
    })

    // 5. Sort by date/time and limit to 3
    const bookings = Array.from(allBookingsMap.values())
      .sort((a, b) => {
        const dateCompare = a.booking_date.localeCompare(b.booking_date)
        if (dateCompare !== 0) return dateCompare
        return a.start_time.localeCompare(b.start_time)
      })
      .slice(0, 3)

    return new Response(
      JSON.stringify({
        success: true,
        data: bookings
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
