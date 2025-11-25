'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Notification {
  id: number  // BIGSERIAL in database
  recipient_id: string
  type: string
  title: string
  message: string
  channel: string
  status: string
  metadata?: Record<string, any>
  sent_at?: string
  read_at?: string
  created_at: string
  action_url?: string
  is_read?: boolean  // Computed column
}

interface CreateNotificationInput {
  recipient_id: string
  type: string
  title: string
  message: string
  metadata?: Record<string, any>
  action_url?: string
}

/**
 * Create a new notification
 */
export async function createNotification(input: CreateNotificationInput) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification')
    .insert({
      recipient_id: input.recipient_id,
      type: input.type,
      title: input.title,
      message: input.message,
      channel: 'in_app',
      status: 'sent',
      metadata: input.metadata || {},
      action_url: input.action_url,
      sent_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create notification:', error)
    return { success: false, error: error.message }
  }

  // Revalidate paths where notifications are displayed
  revalidatePath('/')

  return { success: true, data }
}

/**
 * Get all notifications for current user
 */
export async function getNotifications() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('notification')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Failed to fetch notifications:', error)
    return []
  }

  return data as Notification[]
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notification')
    .update({
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId)

  if (error) {
    console.error('Failed to mark notification as read:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')

  return { success: true }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('notification')
    .update({
      read_at: new Date().toISOString()
    })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  if (error) {
    console.error('Failed to mark all as read:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')

  return { success: true }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notification')
    .delete()
    .eq('id', notificationId)

  if (error) {
    console.error('Failed to delete notification:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')

  return { success: true }
}
