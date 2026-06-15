import { useState, useEffect, useRef } from 'react'

const JIKAN_BASE = 'https://api.jikan.moe/v4'
const DEBOUNCE_MS = 500

export function useMangaSearch(query) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    abortRef.current?.abort()

    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const url = `${JIKAN_BASE}/manga?q=${encodeURIComponent(query.trim())}&limit=5`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`Jikan ${res.status}`)
        const json = await res.json()
        setResults(
          (json.data ?? []).map(m => ({
            mal_id: m.mal_id,
            title: m.title,
            volumes: m.volumes ?? null,
            ongoing: m.publishing ?? false,
            cover_url: m.images?.jpg?.image_url ?? null,
          }))
        )
        setError(null)
      } catch (e) {
        if (e.name !== 'AbortError') setError('Erreur de recherche')
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timerRef.current)
      abortRef.current?.abort()
    }
  }, [query])

  return { results, loading, error }
}
