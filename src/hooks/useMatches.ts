import { useCallback, useState } from 'react'
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type Timestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { FirebaseMatchPlayerDocument, MatchSummary } from '../types'

interface UseMatchesResult {
  matches: MatchSummary[]
  loading: boolean
  error: string | null
  fetchMatchesByPlayerId: (playerId: string) => Promise<void>
  clearMatches: () => void
}

type DateLike = Timestamp | Date | string | { seconds: number } | null | undefined

function normalizeDate(value: DateLike): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if ('toDate' in value && typeof value.toDate === 'function') return value.toDate().toISOString()
  if ('seconds' in value && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString()
  }

  return null
}

export function useMatches(): UseMatchesResult {
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMatchesByPlayerId = useCallback(async (playerId: string) => {
    setLoading(true)
    setError(null)

    try {
      const matchPlayersRef = collection(db, 'matchPlayers')
      const matchPlayersQuery = query(
        matchPlayersRef,
        where('playerId', '==', playerId),
        orderBy('dateOfPlay', 'desc'),
        limit(100)
      )

      let snapshot
      try {
        snapshot = await getDocs(matchPlayersQuery)
      } catch (indexError) {
        if (!(indexError instanceof Error) || !('code' in indexError) || indexError.code !== 'failed-precondition') {
          throw indexError
        }

        const fallbackQuery = query(
          matchPlayersRef,
          where('playerId', '==', playerId),
          limit(100)
        )
        snapshot = await getDocs(fallbackQuery)
      }

      const matchesData = snapshot.docs
        .map((docSnapshot) => {
          const data = docSnapshot.data() as FirebaseMatchPlayerDocument
          return {
            matchUrl: data.matchUrl || '',
            dateOfPlay: normalizeDate(data.dateOfPlay),
            winTeam: data.winTeam ?? null
          }
        })
        .filter((match) => match.matchUrl)
        .sort((a, b) => new Date(b.dateOfPlay || 0).getTime() - new Date(a.dateOfPlay || 0).getTime())

      setMatches(matchesData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown match loading error'
      console.error('Error fetching matches:', err)
      setError(message)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [])

  const clearMatches = useCallback(() => {
    setMatches([])
    setError(null)
  }, [])

  return { matches, loading, error, fetchMatchesByPlayerId, clearMatches }
}
