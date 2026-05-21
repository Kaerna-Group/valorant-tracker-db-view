import type { Timestamp } from 'firebase/firestore'

export interface Player {
  id: string
  nickname: string
  discriminator: string
  profileUrl: string
  matchesCount: number
}

export interface MatchSummary {
  matchUrl: string
  dateOfPlay: string | null
  winTeam: string | number | null
}

export interface FirebasePlayerDocument {
  playerId?: string
  nickname?: string
  discriminator?: string
  profileUrl?: string
  lastSeenAt?: Timestamp
  matchesCount?: number
}

export interface FirebaseMatchPlayerDocument {
  matchId?: string
  playerId?: string
  nickname?: string
  discriminator?: string
  matchUrl?: string
  dateOfPlay?: Timestamp | Date | string | { seconds: number }
  winTeam?: string | number | null
}
