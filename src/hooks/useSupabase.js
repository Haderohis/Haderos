import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSupabase() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const query = useCallback(async (fn) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn(supabase)
      return result
    } catch (err) {
      setError(err)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }, [])

  return { supabase, loading, error, query }
}
