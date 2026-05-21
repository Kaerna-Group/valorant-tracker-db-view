import { memo, useMemo } from 'react'
import type { MouseEvent } from 'react'
import type { Player } from '../types'

interface PlayerCardProps {
  player: Player
  onCardClick: (playerId: string) => void
}

function PlayerCard({ player, onCardClick }: PlayerCardProps) {
  const displayName = useMemo(() => {
    return `${player.nickname}${player.discriminator ? ` #${player.discriminator}` : ''}`
  }, [player.nickname, player.discriminator])

  const matchesText = useMemo(() => {
    const count = player.matchesCount || 0
    return `${count} ${count === 1 ? 'match' : 'matches'}`
  }, [player.matchesCount])

  return (
    <div
      onClick={() => onCardClick(player.id)}
      className="bg-white/10 backdrop-blur-lg rounded-xl p-5 sm:p-6 border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 sm:hover:-translate-y-2 hover:scale-[1.01] sm:hover:scale-[1.02] group active:scale-[0.98]"
    >
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-4 text-white group-hover:text-purple-300 transition-colors break-words leading-tight">
        {displayName}
      </h2>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <a
          href={player.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event: MouseEvent<HTMLAnchorElement>) => event.stopPropagation()}
          className="text-blue-400 hover:text-blue-300 font-semibold transition-colors text-base sm:text-base py-1"
        >
          Profile
        </a>
        <span className="text-slate-300 text-sm sm:text-base bg-purple-500/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full whitespace-nowrap">
          {matchesText}
        </span>
      </div>
    </div>
  )
}

export default memo(PlayerCard, (prevProps, nextProps) => {
  if (prevProps.player.id !== nextProps.player.id) {
    return false
  }
  
  const playerChanged = (
    prevProps.player.nickname !== nextProps.player.nickname ||
    prevProps.player.discriminator !== nextProps.player.discriminator ||
    prevProps.player.profileUrl !== nextProps.player.profileUrl ||
    prevProps.player.matchesCount !== nextProps.player.matchesCount
  )
  
  return !playerChanged
})

