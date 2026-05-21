import { useCallback, useState } from 'react'
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

function normalizeDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString()
  return value
}

export function useMatches() {
    const [matches, setMatches] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const fetchMatchesByPlayerId = useCallback(async (playerId) => {
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
                if (indexError.code !== 'failed-precondition') {
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
                .map((doc) => {
                    const data = doc.data()
                    return {
                        matchUrl: data.matchUrl,
                        dateOfPlay: normalizeDate(data.dateOfPlay),
                        winTeam: data.winTeam
                    }
                })
                .filter((match) => match.matchUrl)
                .sort((a, b) => new Date(b.dateOfPlay) - new Date(a.dateOfPlay))

            setMatches(matchesData)
        } catch (err) {
            console.error('Error fetching matches:', err)
            setError(err.message)
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
