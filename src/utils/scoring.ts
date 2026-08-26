import type { TeamStats } from '../types/football'

const yardsvalue = 0.1
const tdvalue = 5
const turnovervalue = -3

export type ScoringUnitType =
    | 'PASSING'
    | 'RUSHING'
    | 'RECEIVING'
    | 'DEFENSE'
    | 'SPECIAL_TEAMS'


export function passingScore(stats: TeamStats): number {
    const yards = stats.passing_yards ?? 0
    const touchdowns = stats.passing_touchdowns ?? 0
    const interceptions = stats.passing_interceptions ?? 0

    return ((yards * yardsvalue ) + (touchdowns * tdvalue) + (interceptions * turnovervalue))
}

export function rushingScore(stats: TeamStats): number {
    const yards = stats.rushing_yards ?? 0
    const touchdowns = stats.rushing_touchdowns ?? 0
    const fumblesLost = stats.rushing_fumbles_lost ?? 0

    return ((yards * yardsvalue) + (touchdowns * tdvalue) + (fumblesLost * turnovervalue))
}

export function receivingScore(stats: TeamStats): number {
    const yards = stats.passing_yards ?? 0
    const touchdowns = stats.passing_touchdowns ?? 0
    const fumblesLost = stats.receiving_fumbles_lost ?? 0

    return ((yards * yardsvalue) + (touchdowns * tdvalue) + (fumblesLost * turnovervalue))
}

function pointsAllowedScore(pointsAllowed: number): number {
    if (pointsAllowed === 0) return 0
    if (pointsAllowed <= 6) return -2
    if (pointsAllowed <= 13) return -5
    if (pointsAllowed <= 20) return -8
    if (pointsAllowed <= 27) return -12
    if (pointsAllowed <= 34) return -16
    if (pointsAllowed <= 41) return -20

    return -25
}

function yardsAllowedScore(yardsAllowed: number): number {
    if (yardsAllowed < 200) return 0
    if (yardsAllowed < 300) return -2
    if (yardsAllowed < 350) return -4
    if (yardsAllowed < 400) return -6
    if (yardsAllowed < 450) return -8
    if (yardsAllowed < 500) return -10
    if (yardsAllowed < 550) return -12

    return -15
}

export function defenseScore(stats: TeamStats): number {
    const interceptions = stats.defensive_interceptions ?? 0
    const fumbleRecoveries = stats.defensive_fumble_recoveries ?? 0
    const touchdowns = stats.defensive_touchdowns ?? 0
    const safeties = stats.safeties ?? 0
    const yardsAllowed = stats.total_yards_allowed ?? 0
    const pointsAllowed = stats.points_allowed ?? 0

    return (30 + pointsAllowedScore(pointsAllowed) + yardsAllowedScore(yardsAllowed) + interceptions * 3 + fumbleRecoveries * 3 + touchdowns * 5 + safeties * 4)
}

function fieldGoalScore(distance: number): number {
    return Math.max(3, distance / 10)
}

export function specialTeamsScore(stats: TeamStats): number {
    const extraPointsMade = stats.extra_points_made ?? 0
    const extraPointsAttempted = stats.extra_points_attempted ?? 0

    const fieldGoalsMade = stats.field_goals_made ?? 0
    const fieldGoalsAttempted = stats.field_goals_attempted ?? 0
    const fieldGoalDistances = stats.field_goal_distances_made ?? []

    const specialTeamTouchdowns = stats.special_teams_touchdowns ?? 0
    const blockedKicks = stats.blocked_kicks ?? 0

    const extraPointsMissed = Math.max(0, extraPointsAttempted - extraPointsMade)
    const fieldGoalsMissed = Math.max(0, fieldGoalsAttempted - fieldGoalsMade)

    const fieldGoalPoints = fieldGoalDistances.reduce(
        (total, distance) => total + fieldGoalScore(distance), 0)

    return (extraPointsMade * 2 + extraPointsMissed * -2 + fieldGoalPoints + fieldGoalsMissed * -1 + specialTeamTouchdowns * 5 + blockedKicks * 3)
}

export function calculateUnitScore(unitType: ScoringUnitType, stats: TeamStats): number {
    switch (unitType) {
        case 'PASSING':
            return passingScore(stats)

        case 'RUSHING':
            return rushingScore(stats)

        case 'RECEIVING':
            return receivingScore(stats)

        case 'DEFENSE':
            return defenseScore(stats)

        case 'SPECIAL_TEAMS':
            return specialTeamsScore(stats)
    }
}