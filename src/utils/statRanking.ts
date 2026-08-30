import type { CollegeTeam } from '../types/football'

export function getStatRank(teams: CollegeTeam[], teamId: number, getValue: (team: CollegeTeam) => number) {
    const sorted = [...teams].sort(
        (a, b) => getValue(b) - getValue(a)
    )

    const teamIndex = sorted.findIndex(
        (team) => team.id === teamId
    )

    if (teamIndex === -1) {
        return null
    }

    const value = getValue(sorted[teamIndex])

    const firstWithValue = sorted.findIndex(
        (team) => getValue(team) === value
    )

    return firstWithValue + 1
}

export function formatRank(rank: number | null) {
    if (rank === null) return ''

    const lastTwo = rank % 100

    if (lastTwo >= 11 && lastTwo <= 13) {
        return `${rank}th`
    }

    if (rank % 10 === 1) return `${rank}st`
    if (rank % 10 === 2) return `${rank}nd`
    if (rank % 10 === 3) return `${rank}rd`

    return `${rank}th`
}