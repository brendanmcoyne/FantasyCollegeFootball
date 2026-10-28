
import { getEspnTeamId, getEspnTeamSchedule, getLiveGameStats } from '../api/weeklyStats'
import { calculateUnitScore } from './scoring'

import type { CollegeTeam } from '../types/football'
import type { ScoringUnitType } from './scoring'
import type { EspnGame } from '../api/weeklyStats'
import type { LiveTeamStats } from '../api/weeklyStats'

const UNIT_TYPES: ScoringUnitType[] = [
    'PASSING',
    'RUSHING',
    'RECEIVING',
    'DEFENSE',
    'SPECIAL_TEAMS'
]

const MAX_FANTASY_WEEK = 10

type UnitTotals = Record<ScoringUnitType, number>

const rankingCache = new Map<string, Map<number, number>>()

function getFantasyGames(games: EspnGame[], teamName: string): EspnGame[] {
    const sortedGames = [...games].sort(
        (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    const weekZero = ['USC', 'Florida State', 'Stanford'].some((name) => name.toLowerCase() === teamName.toLowerCase())
    const noWeekZero = weekZero ? sortedGames.slice(1) : sortedGames

    return noWeekZero.slice(0, MAX_FANTASY_WEEK)
}

async function getTeamUnitTotals(team: CollegeTeam): Promise<UnitTotals> {
    const totals = Object.fromEntries(UNIT_TYPES.map((type) => [type, 0])) as UnitTotals

    const espnTeamId = await getEspnTeamId(team.name)
    const schedule = await getEspnTeamSchedule(espnTeamId)
    const fantasyGames = getFantasyGames(schedule, team.name)

    const results: PromiseSettledResult<LiveTeamStats[]>[] = []

    for (const game of fantasyGames) {
        const result = await Promise.allSettled([
            getLiveGameStats(game.eventId)
        ])

        results.push(result[0])
    }

    results.forEach((result) => {
        if (result.status !== 'fulfilled') return

        const teamStats = result.value.find(
            (item) => item.espnTeamId === espnTeamId
        )

        if (!teamStats) return

        UNIT_TYPES.forEach((unitType) => {
            totals[unitType] += calculateUnitScore(
                unitType,
                teamStats.stats
            )
        })
    })

    return totals
}

const rankingPromises = new Map<string, Promise<Map<number, number>>>()

export function getPositionRanks(teams: CollegeTeam[], unitType: ScoringUnitType): Promise<Map<number, number>> {
    const cacheKey = `${unitType}-${MAX_FANTASY_WEEK}`

    const cached = rankingCache.get(cacheKey)

    if (cached) {
        return Promise.resolve(cached)
    }

    const existingPromise = rankingPromises.get(cacheKey)

    if (existingPromise) {
        return existingPromise
    }

    const rankingPromise = calculateRankings(teams, unitType)

    rankingPromises.set(cacheKey, rankingPromise)

    void rankingPromise.finally(() => {
        rankingPromises.delete(cacheKey)
    }).catch(() => {})

    return rankingPromise
}

async function calculateRankings(teams: CollegeTeam[], unitType: ScoringUnitType): Promise<Map<number, number>> {
    const scoredTeams: { teamId: number, score: number }[] = []

    const BATCH_SIZE = 3

    for (let i = 0; i < teams.length; i += BATCH_SIZE) {
        const batch = teams.slice(i, i + BATCH_SIZE)

        const results = await Promise.allSettled(
            batch.map(async (team) => ({
                teamId: team.id,
                totals: await getTeamUnitTotals(team)
            }))
        )

        for (const result of results) {
            if (result.status === 'fulfilled') {
                scoredTeams.push({
                    teamId: result.value.teamId,
                    score: result.value.totals[unitType]
                })
            } else {
                console.error('Failed to calculate unit ranking:', result.reason)
            }
        }
    }

    scoredTeams.sort((a, b) => b.score - a.score)

    const ranks = new Map<number, number>()

    scoredTeams.forEach((team, index) => {
        ranks.set(team.teamId, index + 1)
    })

    rankingCache.set(`${unitType}-${MAX_FANTASY_WEEK}`, ranks)

    return ranks
}