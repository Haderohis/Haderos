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

  const acceptShare = useCallback(async (notification) => {
    const shareId = notification.data?.share_id
    const ownerId = notification.data?.owner_id
    if (!shareId) return

    // Récupère l'utilisateur courant directement pour éviter les stale closures
    const { data: { user } } = await supabase.auth.getUser()
    const currentUserId = user?.id
    if (!currentUserId) return

    await Promise.all([
      supabase.from('collection_shares').update({ status: 'accepted' }).eq('id', shareId),
      ownerId ? supabase.from('collection_shares').upsert(
        { owner_id: currentUserId, shared_with_id: ownerId, status: 'accepted' },
        { onConflict: 'owner_id,shared_with_id' }
      ) : Promise.resolve(),
    ])

    await supabase.from('notifications').update({ read: true }).eq('id', notification.id)

    if (ownerId) {
      await supabase.from('notifications').insert({
        user_id: ownerId,
        type: 'collection_share_accepted',
        message: `${notification.data?.recipient_name ?? 'Un utilisateur'} a accepté de partager sa collection avec toi.`,
        read: false,
      })
    }

    // Met à jour l'état local pour masquer les boutons immédiatement
    setNotifications(prev => prev.map(n =>
      n.id === notification.id ? { ...n, read: true, data: { ...n.data, status: 'accepted' } } : n
    ))
  }, [])

  const declineShare = useCallback(async (notification) => {
    const shareId = notification.data?.share_id
    if (!shareId) return

    await supabase
      .from('collection_shares')
      .update({ status: 'declined' })
      .eq('id', shareId)

    await supabase.from('notifications').update({ read: true }).eq('id', notification.id)

    setNotifications(prev => prev.map(n =>
      n.id === notification.id ? { ...n, read: true, data: { ...n.data, status: 'declined' } } : n
    ))
  }, [])

  const deleteNotification = useCallback(async (id) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const deleteAll = useCallback(async () => {
    if (!userId) return
    await supabase.from('notifications').delete().eq('user_id', userId)
    setNotifications([])
  }, [userId])

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, markAllRead, acceptShare, declineShare, deleteNotification, deleteAll }
}
