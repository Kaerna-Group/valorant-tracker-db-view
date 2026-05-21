export const Team = {
  TeamA: 0,
  TeamB: 1,
  Draw: 2,
  Unknown: 3
} as const

type TeamValue = string | number | null | undefined

export function getTeamName(teamValue: TeamValue): string {
  const numValue = typeof teamValue === 'string' ? parseInt(teamValue, 10) : teamValue

  switch (numValue) {
    case Team.TeamA:
      return 'Team A'
    case Team.TeamB:
      return 'Team B'
    case Team.Draw:
      return 'Draw'
    case Team.Unknown:
      return 'Unknown'
    default:
      return teamValue?.toString() || 'Unknown'
  }
}

export function getTeamColor(teamValue: TeamValue): string {
  const numValue = typeof teamValue === 'string' ? parseInt(teamValue, 10) : teamValue

  switch (numValue) {
    case Team.TeamA:
      return 'text-blue-400'
    case Team.TeamB:
      return 'text-green-400'
    case Team.Draw:
      return 'text-yellow-400'
    case Team.Unknown:
      return 'text-slate-400'
    default:
      return 'text-slate-400'
  }
}

