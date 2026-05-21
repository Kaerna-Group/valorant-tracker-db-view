import { useCallback, useRef, useState } from 'react'
import {
  collection,
  doc,
  type DocumentData,
  type DocumentSnapshot,
  getDoc,
  getDocs,
  limit as limitQuery,
  orderBy,
  query,
  startAfter,
  startAt,
  endAt,
  type QueryConstraint,
  type QueryDocumentSnapshot
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { FirebasePlayerDocument, Player } from '../types'

const DEFAULT_PAGE_SIZE = 50
const FAST_SEARCH_LIMIT = 50
const FALLBACK_MIN_QUERY_LENGTH = 3
const FALLBACK_PAGE_SIZE = 500
const FALLBACK_SCAN_LIMIT = 5000
const PREFIX_END = '\uf8ff'

type PlayerCursor = QueryDocumentSnapshot<DocumentData> | null

interface UsePlayersResult {
  players: Player[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  searchPlayers: (
    searchQuery?: string,
    afterCursor?: PlayerCursor,
    limit?: number,
    append?: boolean
  ) => Promise<void>
  loadMore: () => void
}

function normalizeSearchValue(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^#/, '')
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function getPlayerIdSource(searchQuery: string): string | null {
  const trimmedQuery = searchQuery.trim()
  if (!trimmedQuery.includes('#')) return null

  const [nickname, discriminator] = trimmedQuery.split('#')
  if (!nickname?.trim() || !discriminator?.trim()) return null

  return `${nickname.trim()}#${discriminator.trim()}`.toLowerCase()
}

function mapPlayerDoc(docSnapshot: DocumentSnapshot<DocumentData>): Player {
  const data = docSnapshot.data() as FirebasePlayerDocument | undefined

  return {
    id: data?.playerId || docSnapshot.id,
    nickname: data?.nickname || '',
    discriminator: data?.discriminator || '',
    profileUrl: data?.profileUrl || '',
    matchesCount: data?.matchesCount || 0
  }
}

function matchesSearch(player: Player, searchQuery: string): boolean {
  const search = normalizeSearchValue(searchQuery)
  if (!search) return true

  return [
    player.nickname,
    player.discriminator,
    `${player.nickname}#${player.discriminator}`,
    `${player.nickname} ${player.discriminator}`,
    player.profileUrl
  ]
    .filter(Boolean)
    .some((value) => normalizeSearchValue(value).includes(search))
}

function getSearchRank(player: Player, searchQuery: string): number {
  const search = normalizeSearchValue(searchQuery)
  if (!search) return 0

  const nickname = normalizeSearchValue(player.nickname)
  const discriminator = normalizeSearchValue(player.discriminator)
  const fullName = normalizeSearchValue(`${player.nickname}#${player.discriminator}`)
  const spacedName = normalizeSearchValue(`${player.nickname} ${player.discriminator}`)

  if (fullName === search || spacedName === search) return 0
  if (nickname === search) return 1
  if (fullName.startsWith(search) || spacedName.startsWith(search)) return 2
  if (nickname.startsWith(search)) return 3
  if (discriminator === search) return 4
  if (fullName.includes(search) || spacedName.includes(search) || nickname.includes(search)) return 5
  return 6
}

function sortPlayers(players: Player[], searchQuery: string): Player[] {
  return [...players].sort((a, b) => {
    const rankDifference = getSearchRank(a, searchQuery) - getSearchRank(b, searchQuery)
    if (rankDifference !== 0) return rankDifference

    const matchesDifference = b.matchesCount - a.matchesCount
    if (matchesDifference !== 0) return matchesDifference

    return `${a.nickname}#${a.discriminator}`.localeCompare(
      `${b.nickname}#${b.discriminator}`,
      undefined,
      { sensitivity: 'base' }
    )
  })
}

function dedupePlayers(players: Player[]): Player[] {
  const uniquePlayers = new Map<string, Player>()

  for (const player of players) {
    if (!uniquePlayers.has(player.id)) {
      uniquePlayers.set(player.id, player)
    }
  }

  return Array.from(uniquePlayers.values())
}

async function fetchPlayersByPrefix(field: 'nickname' | 'discriminator', value: string): Promise<Player[]> {
  const normalizedValue = value.trim()
  if (!normalizedValue) return []

  const snapshot = await getDocs(
    query(
      collection(db, 'players'),
      orderBy(field),
      startAt(normalizedValue),
      endAt(`${normalizedValue}${PREFIX_END}`),
      limitQuery(FAST_SEARCH_LIMIT)
    )
  )

  return snapshot.docs.map(mapPlayerDoc)
}

async function fetchExactPlayer(searchQuery: string): Promise<Player[]> {
  const playerIdSource = getPlayerIdSource(searchQuery)
  if (!playerIdSource) return []

  const playerId = await sha256Hex(playerIdSource)
  const snapshot = await getDoc(doc(db, 'players', playerId))

  return snapshot.exists() ? [mapPlayerDoc(snapshot)] : []
}

async function fetchFallbackPlayers(searchQuery: string, resultLimit: number): Promise<Player[]> {
  if (normalizeSearchValue(searchQuery).length < FALLBACK_MIN_QUERY_LENGTH) {
    return []
  }

  const players: Player[] = []
  let scannedCount = 0
  let lastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null = null

  while (players.length < resultLimit && scannedCount < FALLBACK_SCAN_LIMIT) {
    const constraints: QueryConstraint[] = [
      orderBy('matchesCount', 'desc'),
      limitQuery(FALLBACK_PAGE_SIZE)
    ]

    if (lastVisibleDoc) {
      constraints.splice(1, 0, startAfter(lastVisibleDoc))
    }

    const snapshot = await getDocs(query(collection(db, 'players'), ...constraints))
    scannedCount += snapshot.docs.length
    lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1] ?? null

    players.push(
      ...snapshot.docs
        .map(mapPlayerDoc)
        .filter((player) => matchesSearch(player, searchQuery))
    )

    if (snapshot.docs.length < FALLBACK_PAGE_SIZE) {
      break
    }
  }

  return players.slice(0, resultLimit)
}

async function fetchDefaultPlayers(afterCursor: PlayerCursor, resultLimit: number) {
  const constraints: QueryConstraint[] = [
    orderBy('matchesCount', 'desc'),
    limitQuery(resultLimit)
  ]

  if (afterCursor) {
    constraints.splice(1, 0, startAfter(afterCursor))
  }

  const snapshot = await getDocs(query(collection(db, 'players'), ...constraints))

  return {
    players: sortPlayers(snapshot.docs.map(mapPlayerDoc), ''),
    nextCursor: snapshot.docs.length === resultLimit
      ? snapshot.docs[snapshot.docs.length - 1] ?? null
      : null
  }
}

async function fetchSearchPlayers(searchQuery: string, resultLimit: number): Promise<Player[]> {
  const trimmedQuery = searchQuery.trim()
  const [nicknamePart, discriminatorPart] = trimmedQuery.includes('#')
    ? trimmedQuery.split('#')
    : [trimmedQuery, trimmedQuery]

  const fastResults = await Promise.all([
    fetchExactPlayer(trimmedQuery),
    fetchPlayersByPrefix('nickname', nicknamePart || trimmedQuery),
    fetchPlayersByPrefix('discriminator', discriminatorPart || trimmedQuery)
  ])

  const mergedFastResults = sortPlayers(
    dedupePlayers(fastResults.flat()).filter((player) => matchesSearch(player, searchQuery)),
    searchQuery
  )

  if (mergedFastResults.length > 0) {
    return mergedFastResults.slice(0, resultLimit)
  }

  const fallbackPlayers = await fetchFallbackPlayers(searchQuery, resultLimit)
  return sortPlayers(dedupePlayers(fallbackPlayers), searchQuery).slice(0, resultLimit)
}

export function usePlayers(): UsePlayersResult {
  const [players, setPlayers] = useState<Player[]>([])
  const [nextCursor, setNextCursor] = useState<PlayerCursor>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSearch, setCurrentSearch] = useState('')
  const requestIdRef = useRef(0)

  const searchPlayers = useCallback<UsePlayersResult['searchPlayers']>(async (
    searchQuery = '',
    afterCursor = null,
    resultLimit = DEFAULT_PAGE_SIZE,
    append = false
  ) => {
    const requestId = ++requestIdRef.current
    const isSearch = Boolean(searchQuery.trim())

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
      if (isSearch) {
        const searchResults = await fetchSearchPlayers(searchQuery, resultLimit)

        if (requestId !== requestIdRef.current) return

        setPlayers(searchResults)
        setNextCursor(null)
        return
      }

      const defaultResults = await fetchDefaultPlayers(afterCursor, resultLimit)

      if (requestId !== requestIdRef.current) return

      if (append) {
        setPlayers((previousPlayers) => dedupePlayers([...previousPlayers, ...defaultResults.players]))
      } else {
        setPlayers(defaultResults.players)
      }

      setNextCursor(defaultResults.nextCursor)
    } catch (err) {
      if (requestId !== requestIdRef.current) return

      const message = err instanceof Error ? err.message : 'Unknown player search error'
      console.error('Error searching players:', err)
      setError(message)
      if (!append) {
        setPlayers([])
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [])

  const loadMore = useCallback(() => {
    if (nextCursor !== null && !loading && !loadingMore) {
      void searchPlayers(currentSearch, nextCursor, DEFAULT_PAGE_SIZE, true)
    }
  }, [nextCursor, currentSearch, loading, loadingMore, searchPlayers])

  return {
    players,
    loading,
    loadingMore,
    error,
    hasMore: nextCursor !== null,
    searchPlayers,
    loadMore
  }
}
