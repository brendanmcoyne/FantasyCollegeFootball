import {getWeeklyStats, getLiveGameStats, getEspnTeamId, getEspnTeamSchedule, type WeeklyTeamData} from '../api/weeklyStats'

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


async function runInBatches<T>(items: T[], batchSize: number, task: (item: T) => Promise<void>): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)

        await Promise.all(batch.map(task))
    }
}

async function calculate2026SeasonStats(): Promise<Season2026Stats[]> {
    const seasonMap = new Map<string, Season2026Stats>()
    const now = Date.now()

    const failedTeams: string[] = []
    const failedGames: string[] = []

    const weeklyResults = await Promise.all(
        Array.from({ length: CURRENT_WEEK + 1 },
            (_, week) => getWeeklyStats(week)
        )
    )

    for (const weeklyTeams of weeklyResults) {
        for (const weeklyTeam of weeklyTeams) {
            const key = normalizeTeamName(weeklyTeam.team)

            if (!seasonMap.has(key)) {
                seasonMap.set(key,
                    createEmptySeasonStats(weeklyTeam.team, weeklyTeam.conference)
                )
            }
        }
    }

    const teams = Array.from(seasonMap.values())
    const gameAssignments: Array<{ team: Season2026Stats, espnTeamId: string, eventId: string }> = []

    await runInBatches(teams, 8, async (team) => {
        try {
            const espnTeamId = await getEspnTeamId(team.team)
            const schedule = await getEspnTeamSchedule(espnTeamId, 2026)

            const seenEvents = new Set<string>()

            for (const game of schedule) {
                const startTime = new Date(game.startTime).getTime()

                if (!Number.isFinite(startTime) || startTime > now) {
                    continue
                }

                if (seenEvents.has(game.eventId)) {
                    continue
                }

                seenEvents.add(game.eventId)
                gameAssignments.push({team, espnTeamId, eventId: game.eventId})
            }
        } catch (error) {
            failedTeams.push(team.team)
            console.error(`Could not load ESPN schedule for ${team.team}:`, error)
        }
    })

    const uniqueEventIds = Array.from(
        new Set(gameAssignments.map((game) => game.eventId))
    )

    type GameStats = Awaited<ReturnType<typeof getLiveGameStats>>
    const eventResults = new Map<string, GameStats>()

    await runInBatches(uniqueEventIds, 10, async (eventId) => {
        try {
            const result = await getLiveGameStats(eventId)

            eventResults.set(eventId, result)
        } catch (error) {
            failedGames.push(eventId)

            console.error(`Could not load ESPN event ${eventId}:`, error)
        }
    })

    for (const assignment of gameAssignments) {
        const gameStats = eventResults.get(assignment.eventId)

        if (!gameStats) {
            continue
        }

        const liveTeam = gameStats.find(
            (result) => result.espnTeamId === assignment.espnTeamId
        )

        if (!liveTeam) {
            failedGames.push(
                `${assignment.team.team}: ${assignment.eventId}`
            )
            continue
        }

        const stats = liveTeam.stats

        if (stats.passing_yards == null && stats.rushing_yards == null) {
            continue
        }

        const weeklyTeam: WeeklyTeamData = {
            team: assignment.team.team,
            conference: assignment.team.conference,
            gameStart: new Date(0),
            stats
        }

        addWeeklyStats(assignment.team, weeklyTeam)
    }

    const seasonStats = Array.from(seasonMap.values())

    for (const season of seasonStats) {
        calculateDerivedStats(season)
    }

    console.log('2026 ESPN Season Stats:', seasonStats)
    console.log('Unique ESPN events fetched:', uniqueEventIds.length)

    if (failedTeams.length > 0 || failedGames.length > 0) {
        console.warn('Incomplete 2026 ESPN statistics:', {failedTeams, failedGames})
    }

    return seasonStats
}


let seasonStatsPromise: Promise<Season2026Stats[]> | null = null
let seasonStatsCachedAt = 0

const CACHE_DURATION = 5 * 60 * 1000

export function get2026SeasonStats(): Promise<Season2026Stats[]> {
    const now = Date.now()

    if (seasonStatsPromise && (now - seasonStatsCachedAt < CACHE_DURATION)) {
        return seasonStatsPromise
    }

    seasonStatsCachedAt = now

    seasonStatsPromise = calculate2026SeasonStats().catch((error) => {
        seasonStatsPromise = null
        seasonStatsCachedAt = 0
        throw error
    })

    return seasonStatsPromise
}

