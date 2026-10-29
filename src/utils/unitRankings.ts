import { get2026SeasonStats, type Season2026Stats } from './2026stats'

import type { ScoringUnitType } from './scoring.ts'

type PositionRanks = Record<ScoringUnitType, Map<string, number>>

const UNIT_TYPES: ScoringUnitType[] = [
    'PASSING',
    'RUSHING',
    'RECEIVING',
    'DEFENSE',
    'SPECIAL_TEAMS'
]

let cachedRanks: PositionRanks | null = null
let pendingRanks: Promise<PositionRanks> | null = null

function normalizeTeamName(name: string): string {
    return name.trim().toLowerCase()
}

function getSeasonFantasyPoints(team: Season2026Stats, unitType: ScoringUnitType): number {
    switch (unitType) {
        case 'PASSING': return team.passingFantasyPoints
        case 'RUSHING': return team.rushingFantasyPoints
        case 'RECEIVING': return team.receivingFantasyPoints
        case 'DEFENSE': return team.defenseFantasyPoints
        case 'SPECIAL_TEAMS':return team.specialTeamsFantasyPoints
    }
}

async function calculateAllRanks(): Promise<PositionRanks> {
    const teams = await get2026SeasonStats()

    const ranks = {} as PositionRanks

    UNIT_TYPES.forEach((unitType) => {
        const sorted = teams
            .map((team) => ({
                team: normalizeTeamName(team.team),
                points: getSeasonFantasyPoints(team, unitType)
            }))
            .sort((a, b) => b.points - a.points)

        const positionRanks = new Map<string, number>()

        sorted.forEach((team, index) => {
            const previous = sorted[index - 1]

            const rank =
                previous && previous.points === team.points
                    ? positionRanks.get(previous.team)! : index + 1

            positionRanks.set(team.team, rank)
        })

        ranks[unitType] = positionRanks
    })

    return ranks
}

export function getPositionRanks(unitType: ScoringUnitType): Promise<Map<string, number>> {
    if (cachedRanks) {
        return Promise.resolve(cachedRanks[unitType])
    }

    if (!pendingRanks) {
        pendingRanks = calculateAllRanks()
            .then((ranks) => {
                cachedRanks = ranks
                return ranks
            })
            .finally(() => {
                pendingRanks = null
            })
    }

    return pendingRanks.then((ranks) => ranks[unitType])
}

export function getTeamPositionRank(ranks: Map<string, number>, teamName: string): number | null {
    return ranks.get(normalizeTeamName(teamName)) ?? null
}