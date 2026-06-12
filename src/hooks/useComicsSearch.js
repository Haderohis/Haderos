import { useState, useEffect, useRef } from 'react'

const hashId = (str) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function useComicsSearch(query) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`,
          { signal: abortRef.current.signal }
        )
        const json = await res.json()
        setResults((json.items ?? []).map(item => ({
          mal_id: hashId(item.id),
          title: item.volumeInfo?.title ?? 'Sans titre',
          volumes: null,
          ongoing: false,
          cover_url: item.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:') ?? null,
        })))
      } catch (e) {
        if (e.name !== 'AbortError') setError('Erreur de recherche')
      }
      setLoading(false)
    }, 500)
    return () => { clearTimeout(timer); abortRef.current?.abort() }
  }, [query])

  return { results, loading, error }
}
