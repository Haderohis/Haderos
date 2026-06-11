import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setNotifications(data)
  }, [userId])

  useEffect(() => {
    fetch()
    if (!userId) return
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, fetch)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId, fetch])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    const unread = notifications.filter(n => !n.read)
    if (!unread.length) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [userId, notifications])

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, markAllRead }
}
