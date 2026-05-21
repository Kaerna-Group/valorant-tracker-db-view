import { useState, useCallback } from 'react'
import {
  collection,
  getCountFromServer,
  getDocs,
  limit as limitQuery,
  orderBy,
  query,
  startAfter,
  where
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const SEARCH_PAGE_SIZE = 500
const SEARCH_SCAN_LIMIT = 20000

async function getMatchesCount(playerId) {
  const snapshot = await getCountFromServer(
    query(collection(db, 'matchPlayers'), where('playerId', '==', playerId))
  )

  return snapshot.data().count
}

function matchesSearch(player, searchQuery) {
  const search = normalizeSearchValue(searchQuery)
  if (!search) return true

  return [
    player.nickname,
    player.discriminator,
    `${player.nickname || ''}#${player.discriminator || ''}`,
    `${player.nickname || ''} ${player.discriminator || ''}`,
    player.profileUrl
  ]
    .filter(Boolean)
    .some((value) => normalizeSearchValue(value).includes(search))
}

function getSearchRank(player, searchQuery) {
  const search = normalizeSearchValue(searchQuery)
  if (!search) return 0

  const nickname = normalizeSearchValue(player.nickname)
  const discriminator = normalizeSearchValue(player.discriminator)
  const fullName = normalizeSearchValue(`${player.nickname || ''}#${player.discriminator || ''}`)
  const spacedName = normalizeSearchValue(`${player.nickname || ''} ${player.discriminator || ''}`)

  if (fullName === search || spacedName === search) return 0
  if (nickname === search) return 1
  if (fullName.startsWith(search) || spacedName.startsWith(search)) return 2
  if (nickname.startsWith(search)) return 3
  if (discriminator === search) return 4
  return 5
}

function sortPlayers(players, searchQuery) {
  return [...players].sort((a, b) => {
    const rankDifference = getSearchRank(a, searchQuery) - getSearchRank(b, searchQuery)
    if (rankDifference !== 0) return rankDifference

    const matchesDifference = (b.matchesCount || 0) - (a.matchesCount || 0)
    if (matchesDifference !== 0) return matchesDifference

    return `${a.nickname}#${a.discriminator}`.localeCompare(
      `${b.nickname}#${b.discriminator}`,
      undefined,
      { sensitivity: 'base' }
    )
  })
}

function normalizeSearchValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^#/, '')
}

function mapPlayerDoc(doc) {
  const data = doc.data()
  return {
    id: data.playerId || doc.id,
    nickname: data.nickname || '',
    discriminator: data.discriminator || '',
    profileUrl: data.profileUrl || ''
  }
}

export function usePlayers() {
  const [players, setPlayers] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [currentSearch, setCurrentSearch] = useState('')

  const searchPlayers = useCallback(async (searchQuery = '', afterCursor = null, limit = 300, append = false) => {
    if (!append) {
      setLoading(true)
      setPlayers([])
      setNextCursor(null)
      setCurrentSearch(searchQuery)
    } else {
      setLoadingMore(true)
    }
    
    setError(null)
    
    try {
      const isSearch = Boolean(searchQuery.trim())
      const pageLimit = isSearch ? SEARCH_PAGE_SIZE : limit
      const playersRef = collection(db, 'players')
      const constraints = [orderBy('nickname'), limitQuery(pageLimit)]

      if (afterCursor) {
        constraints.splice(1, 0, startAfter(afterCursor))
      }

      let snapshot = await getDocs(query(playersRef, ...constraints))
      const items = []
      let scannedCount = 0
      let lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1] ?? null

      while (isSearch) {
        scannedCount += snapshot.docs.length

        const matchedPlayers = snapshot.docs
          .map(mapPlayerDoc)
          .filter((player) => matchesSearch(player, searchQuery))

        items.push(...matchedPlayers)

        if (
          items.length >= limit ||
          snapshot.docs.length < pageLimit ||
          scannedCount >= SEARCH_SCAN_LIMIT
        ) {
          break
        }

        snapshot = await getDocs(
          query(playersRef, orderBy('nickname'), startAfter(lastVisibleDoc), limitQuery(pageLimit))
        )
        lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1] ?? null
      }

      if (!isSearch) {
        items.push(...snapshot.docs.map(mapPlayerDoc))
      }

      const limitedItems = items.slice(0, limit)

      const processedPlayers = await Promise.all(
        limitedItems.map(async (player) => {
          try {
            return {
              ...player,
              matchesCount: await getMatchesCount(player.id)
            }
          } catch (countError) {
            console.warn(`Failed to count matches for player ${player.id}:`, countError)
            return {
              ...player,
              matchesCount: 0
            }
          }
        })
      )
      const sortedPlayers = sortPlayers(processedPlayers, searchQuery)

      const nextPageCursor = isSearch
        ? null
        : snapshot.docs[snapshot.docs.length - 1] ?? null

      if (append) {
        setPlayers(prev => sortPlayers([...prev, ...sortedPlayers], searchQuery))
      } else {
        setPlayers(sortedPlayers)
      }

      setNextCursor(!isSearch && snapshot.docs.length === pageLimit ? nextPageCursor : null)
    } catch (err) {
      console.error('Error searching players:', err)
      setError(err.message)
      if (!append) {
        setPlayers([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  const loadMore = useCallback(() => {
    if (nextCursor !== null && !loading && !loadingMore) {
      searchPlayers(currentSearch, nextCursor, 50, true)
    }
  }, [nextCursor, currentSearch, loading, loadingMore, searchPlayers])

  const hasMore = nextCursor !== null

  return {
    players,
    loading,
    loadingMore,
    error,
    hasMore,
    searchPlayers,
    loadMore
  }
}

