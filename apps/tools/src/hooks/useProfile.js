import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useProfile(user) {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('first_name, last_name, display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data)
      })
  }, [user])

  return profile
}
