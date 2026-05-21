import { formatDate } from '../utils/dateFormatter'
import { getTeamName, getTeamColor } from '../utils/teamEnum'
import type { MatchSummary } from '../types'

interface MatchModalProps {
  isOpen: boolean
  onClose: () => void
  matches: MatchSummary[]
}

function MatchModal({ isOpen, onClose, matches }: MatchModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-5 z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] flex flex-col shadow-2xl border border-white/20 animate-slideDown overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-800/95 backdrop-blur-sm border-b border-white/10 px-5 sm:px-6 py-4 sm:py-5 flex justify-between items-center z-10 flex-shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Match List</h2>
          <button
            onClick={onClose}
            className="text-3xl sm:text-3xl text-slate-400 hover:text-white transition-colors leading-none w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6 py-5 sm:py-6 min-h-0">
          {matches.length === 0 ? (
            <p className="text-slate-400 text-center py-12 text-base sm:text-lg">No matches found.</p>
          ) : (
            <div className="space-y-4 sm:space-y-4">
              {matches.map((match) => (
                <div
                  key={match.matchUrl}
                  className="bg-white/5 border-l-4 border-purple-500 rounded-xl p-4 sm:p-5 hover:bg-white/10 transition-all duration-300"
                >
                  <p className="text-slate-300 mb-3 text-base sm:text-base">
                    <span className="font-semibold text-white">Date:</span>{' '}
                    <span className="text-purple-300">{formatDate(match.dateOfPlay)}</span>
                  </p>
                  <p className="text-slate-300 mb-4 text-base sm:text-base">
                    <span className="font-semibold text-white">Winner:</span>{' '}
                    <span className={getTeamColor(match.winTeam)}>{getTeamName(match.winTeam)}</span>
                  </p>
                  <a
                    href={match.matchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-semibold transition-colors text-base mt-2"
                  >
                    Go to match
                    <span className="text-lg">→</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MatchModal

