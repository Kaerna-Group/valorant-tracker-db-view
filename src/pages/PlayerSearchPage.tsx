import { useState, useEffect, useCallback, useMemo } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { usePlayers } from '../hooks/usePlayers'
import { useMatches } from '../hooks/useMatches'
import PlayerCard from '../components/PlayerCard'
import MatchModal from '../components/MatchModal'

type SearchEvent = KeyboardEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>

function PlayerSearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { players, loading, loadingMore, hasMore, searchPlayers, loadMore } = usePlayers()
  const { matches, fetchMatchesByPlayerId, clearMatches } = useMatches()

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchPlayers(searchQuery, null, 50, false)
    }, searchQuery ? 300 : 0)

    return () => clearTimeout(timer)
  }, [searchQuery, searchPlayers])

  const handleSearch = (event: SearchEvent) => {
    if (event.type === 'click' || ('key' in event && event.key === 'Enter')) {
      void searchPlayers(searchQuery, null, 50, false)
    }
  }

  const handlePlayerClick = useCallback(async (playerId: string) => {
    await fetchMatchesByPlayerId(playerId)
    setIsModalOpen(true)
  }, [fetchMatchesByPlayerId])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    clearMatches()
  }, [clearMatches])

  const playersList = useMemo(() => {
    return players.map((player) => (
      <PlayerCard
        key={player.id}
        player={player}
        onCardClick={handlePlayerClick}
      />
    ))
  }, [players, handlePlayerClick])

  return (
    <div className="min-h-screen p-4 sm:p-5 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-5 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent px-4">
            Player Match Search
          </h1>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 sm:p-6 mb-8 sm:mb-10 shadow-2xl border border-white/20">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-4">
            <input
              type="text"
              id="searchInput"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Enter player nickname..."
              className="flex-1 px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base sm:text-base"
              autoFocus
            />
            <button
              id="searchButton"
              onClick={handleSearch}
              disabled={loading}
              className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        <div id="results" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {players.length === 0 && !loading ? (
            <div className="col-span-full text-center py-12 sm:py-16">
              <p className="text-slate-400 text-lg sm:text-xl">Player not found.</p>
            </div>
          ) : (
            playersList
          )}
        </div>

        {hasMore && players.length > 0 && (
          <div className="mt-8 sm:mt-10 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
        <MatchModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          matches={matches}
        />
      </div>
    </div>
  )
}

export default PlayerSearchPage

