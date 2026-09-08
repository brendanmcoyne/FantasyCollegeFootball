import { getWeeklyStats, type WeeklyTeamData } from '../api/weeklyStats'

import { CURRENT_WEEK } from '../bigseasonfile'

export interface Season2026Stats {
    team: string
    conference: string
    gamesPlayed: number

    passingYards: number
    passingTouchdowns: number
    passingInterceptions: number
    passingYardsPerGame: number

    rushingYards: number
    rushingTouchdowns: number
    rushingYardsPerGame: number

    rushingFumblesLost: number
    receivingFumblesLost: number

    defensiveInterceptions: number
    defensiveFumbleRecoveries: number
    defensiveTouchdowns: number
    sacks: number
    safeties: number
    pointsAllowed: number
    totalYardsAllowed: number
    pointsAllowedPerGame: number
    totalYardsAllowedPerGame: number
    takeaways: number

    extraPointsMade: number
    extraPointsAttempted: number
    extraPointPercentage: number

    fieldGoalsMade: number
    fieldGoalsAttempted: number
    fieldGoalPercentage: number

    specialTeamsTouchdowns: number
    blockedKicks: number
}

function normalizeTeamName(teamName: string): string {
    return teamName.trim().toLowerCase()
}

function createEmptySeasonStats(team: string, conference: string): Season2026Stats {
    return {
        team,
        conference,
        gamesPlayed: 0,

        passingYards: 0,
        passingTouchdowns: 0,
        passingInterceptions: 0,
        passingYardsPerGame: 0,

        rushingYards: 0,
        rushingTouchdowns: 0,
        rushingYardsPerGame: 0,

        rushingFumblesLost: 0,
        receivingFumblesLost: 0,

        defensiveInterceptions: 0,
        defensiveFumbleRecoveries: 0,
        defensiveTouchdowns: 0,
        sacks: 0,
        safeties: 0,
        pointsAllowed: 0,
        totalYardsAllowed: 0,
        pointsAllowedPerGame: 0,
        totalYardsAllowedPerGame: 0,
        takeaways: 0,

        extraPointsMade: 0,
        extraPointsAttempted: 0,
        extraPointPercentage: 0,

        fieldGoalsMade: 0,
        fieldGoalsAttempted: 0,
        fieldGoalPercentage: 0,

        specialTeamsTouchdowns: 0,
        blockedKicks: 0,
    }
}

function addWeeklyStats(season: Season2026Stats, weeklyTeam: WeeklyTeamData) {
    if (weeklyTeam.gameStart === null || new Date().getTime() < weeklyTeam.gameStart.getTime()) {
        return
    }

    const stats = weeklyTeam.stats

    season.gamesPlayed += 1

    season.passingYards += stats.passing_yards ?? 0
    season.passingTouchdowns += stats.passing_touchdowns ?? 0
    season.passingInterceptions += stats.passing_interceptions ?? 0

    season.rushingYards += stats.rushing_yards ?? 0
    season.rushingTouchdowns += stats.rushing_touchdowns ?? 0
    season.rushingFumblesLost += stats.rushing_fumbles_lost ?? 0

    season.receivingFumblesLost += stats.receiving_fumbles_lost ?? 0

    season.defensiveInterceptions += stats.defensive_interceptions ?? 0
    season.defensiveFumbleRecoveries += stats.defensive_fumble_recoveries ?? 0
    season.defensiveTouchdowns += stats.defensive_touchdowns ?? 0
    season.sacks += stats.sacks ?? 0
    season.safeties += stats.safeties ?? 0

    season.pointsAllowed += stats.points_allowed ?? 0
    season.totalYardsAllowed += stats.total_yards_allowed ?? 0

    season.extraPointsMade += stats.extra_points_made ?? 0
    season.extraPointsAttempted += stats.extra_points_attempted ?? 0

    season.fieldGoalsMade += stats.field_goals_made ?? 0
    season.fieldGoalsAttempted += stats.field_goals_attempted ?? 0

    season.specialTeamsTouchdowns += stats.special_teams_touchdowns ?? 0
    season.blockedKicks += stats.blocked_kicks ?? 0

    season.takeaways = season.defensiveInterceptions + season.defensiveFumbleRecoveries
}

function calculateDerivedStats(season: Season2026Stats) {
    if (season.gamesPlayed > 0) {
        season.passingYardsPerGame = season.passingYards / season.gamesPlayed
        season.rushingYardsPerGame = season.rushingYards / season.gamesPlayed
        season.pointsAllowedPerGame = season.pointsAllowed / season.gamesPlayed
        season.totalYardsAllowedPerGame = season.totalYardsAllowed / season.gamesPlayed
    }

    if (season.extraPointsAttempted > 0) {
        season.extraPointPercentage = (season.extraPointsMade / season.extraPointsAttempted) * 100
    }

    if (season.fieldGoalsAttempted > 0) {
        season.fieldGoalPercentage = (season.fieldGoalsMade / season.fieldGoalsAttempted) * 100
    }
}

export async function get2026SeasonStats(): Promise<Season2026Stats[]> {
    const seasonMap = new Map<string, Season2026Stats>()

    for (let week = 0; week <= CURRENT_WEEK; week++) {
        const weeklyStats = await getWeeklyStats(week)

        for (const weeklyTeam of weeklyStats) {
            const key = normalizeTeamName(weeklyTeam.team)

            let season = seasonMap.get(key)

            if (!season) {
                season = createEmptySeasonStats(weeklyTeam.team, weeklyTeam.conference)
                seasonMap.set(key, season)
            }

            addWeeklyStats(season, weeklyTeam)
        }
    }

    const seasonStats = Array.from(seasonMap.values())

    for (const season of seasonStats) {
        calculateDerivedStats(season)
    }

    return seasonStats
}

export async function get2026TeamStats(teamName: string): Promise<Season2026Stats | undefined> {
    const seasonStats = await get2026SeasonStats()
    const normalizedTeamName = normalizeTeamName(teamName)

    return seasonStats.find(
        (team) => normalizeTeamName(team.team) === normalizedTeamName)
}