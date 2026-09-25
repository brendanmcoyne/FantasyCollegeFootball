import Papa from 'papaparse'

import type { TeamStats } from '../types/football'
import { WEEKLY_DATA_URLS } from '../data/weekdata'

export interface WeeklyTeamData {
    team: string
    conference: string
    gameStart: Date | null
    stats: TeamStats
}

interface SpreadsheetRow {
    Team: string
    Conference: string
    'Game Start': string

    'Passing Yards': string
    'Passing TDs': string
    'Passing INTs': string

    'Rushing Yards': string
    'Rushing TDs': string
    'Rushing Fumbles': string

    'Receiving Fumbles': string

    'Defensive INTs': string
    'Defensive Fumbles': string
    'Defensive TDs': string
    Sacks: string
    Safeties: string

    'Yards Allowed': string
    'Points Allowed': string

    'XPs Made': string
    'XPs Attempted': string

    'FGs Made': string
    'FGs Attempted': string
    'FG Distances Made': string

    'Special Teams TDs': string
    'Blocked Kicks': string
}

function toNumber(value: string | undefined): number {
    if (!value?.trim()) {
        return 0
    }

    const parsed = Number(value)

    return Number.isNaN(parsed) ? 0 : parsed
}

function parseFieldGoalDistances(
    value: string | undefined
): number[] {
    if (!value?.trim()) {
        return []
    }

    return value
        .split(',')
        .map((distance) => Number(distance.trim()))
        .filter((distance) => !Number.isNaN(distance))
}

function parseGameStart(value: string | undefined): Date | null {
    if (!value?.trim()) {
        return null
    }

    const parsed = new Date(value.trim())

    if (Number.isNaN(parsed.getTime())) {
        return null
    }

    return parsed
}

export async function getWeeklyStats(week: number): Promise<WeeklyTeamData[]> {
    const url = WEEKLY_DATA_URLS[week]

    if (!url) {
        throw new Error(`No CSV configured for Week ${week}.`)
    }

    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`Failed to load Week ${week}.`)
    }

    const csv = await response.text()

    const result = Papa.parse<SpreadsheetRow>(csv, {
        header: true,
        skipEmptyLines: true,
    })

    if (result.errors.length > 0) {
        console.error(result.errors)
        throw new Error('Failed to parse weekly statistics.')
    }

    return result.data
        .filter((row) => row.Team?.trim())
        .map((row) => ({
            team: row.Team.trim(),
            conference: row.Conference?.trim() ?? '',
            gameStart: parseGameStart(row['Game Start']),
            
            stats: {
                games_played: null,
                points_scored: null,
                points_per_game: null,

                rushing_yards: toNumber(row['Rushing Yards']),
                rushing_yards_per_game: null,
                rushing_touchdowns: toNumber(row['Rushing TDs']),
                rushing_fumbles_lost: toNumber(row['Rushing Fumbles']),

                passing_yards: toNumber(row['Passing Yards']),
                passing_yards_per_game: null,
                passing_touchdowns: toNumber(row['Passing TDs']),
                passing_interceptions: toNumber(row['Passing INTs']),

                receiving_fumbles_lost: toNumber(row['Receiving Fumbles']),

                total_yards: null,
                total_yards_per_game: null,

                points_allowed: toNumber(row['Points Allowed']),
                points_allowed_per_game: null,

                rushing_yards_allowed: null,
                rushing_yards_allowed_per_game: null,

                passing_yards_allowed: null,
                passing_yards_allowed_per_game: null,

                total_yards_allowed: toNumber(row['Yards Allowed']),
                total_yards_allowed_per_game: null,

                defensive_interceptions: toNumber(row['Defensive INTs']),
                defensive_fumble_recoveries: toNumber(row['Defensive Fumbles']),
                defensive_touchdowns: toNumber(row['Defensive TDs']),
                sacks: toNumber(row.Sacks),
                safeties: toNumber(row.Safeties),

                turnovers: null,
                takeaways: null,

                field_goals_attempted: toNumber(row['FGs Attempted']),
                field_goals_made: toNumber(row['FGs Made']),
                field_goal_percentage: null,
                field_goal_distances_made: parseFieldGoalDistances(row['FG Distances Made']),

                extra_points_attempted: toNumber(row['XPs Attempted']),
                extra_points_made: toNumber(row['XPs Made']),
                extra_point_percentage: null,

                special_teams_touchdowns: toNumber(row['Special Teams TDs']),
                blocked_kicks: toNumber(row['Blocked Kicks']),
            },
        }))
}

const ESPN_API_BASE_URL = import.meta.env.VITE_STATS_API_URL ?? 'http://127.0.0.1:8000'

interface EspnFantasyGameStats {
    espn_team_id: string
    team_name: string
    event_id: string

    passing_yards: number | null
    passing_touchdowns: number | null
    interceptions_thrown: number | null

    rushing_yards: number | null
    rushing_touchdowns: number | null
    rushing_fumbles_lost: number | null

    receiving_yards: number | null
    receiving_touchdowns: number | null
    receiving_fumbles_lost: number | null

    points_allowed: number | null
    yards_allowed: number | null
    defensive_interceptions: number | null
    defensive_fumble_recoveries: number | null
    defensive_touchdowns: number | null
    sacks: number | null
    safeties: number | null

    field_goals_made: number | null
    field_goals_attempted: number | null
    made_field_goal_distances: number[] | null
    extra_points_made: number | null
    extra_points_attempted: number | null
    special_teams_touchdowns: number | null
    blocked_kicks: number | null
}

export interface LiveTeamStats {
    espnTeamId: string
    teamName: string
    eventId: string
    stats: TeamStats
}

export async function getLiveGameStats(eventId: string): Promise<LiveTeamStats[]> {
    const response = await fetch(
        `${ESPN_API_BASE_URL}/espn/fantasy-game/${encodeURIComponent(eventId)}`,
        { cache: 'no-store' }
    )

    if (!response.ok) {
        throw new Error(`Failed to load ESPN game ${eventId}.`)
    }

    const teams: EspnFantasyGameStats[] = await response.json()

    return teams.map((team) => ({
        espnTeamId: team.espn_team_id,
        teamName: team.team_name,
        eventId: team.event_id,
        stats: {
            games_played: null,
            points_scored: null,
            points_per_game: null,

            rushing_yards: team.rushing_yards,
            rushing_yards_per_game: null,
            rushing_touchdowns: team.rushing_touchdowns,
            rushing_fumbles_lost: team.rushing_fumbles_lost,

            passing_yards: team.passing_yards,
            passing_yards_per_game: null,
            passing_touchdowns: team.passing_touchdowns,
            passing_interceptions: team.interceptions_thrown,

            receiving_yards: team.receiving_yards,
            receiving_touchdowns: team.receiving_touchdowns,
            receiving_fumbles_lost: team.receiving_fumbles_lost,

            total_yards: null,
            total_yards_per_game: null,

            points_allowed: team.points_allowed,
            points_allowed_per_game: null,

            rushing_yards_allowed: null,
            rushing_yards_allowed_per_game: null,

            passing_yards_allowed: null,
            passing_yards_allowed_per_game: null,

            total_yards_allowed: team.yards_allowed,
            total_yards_allowed_per_game: null,

            defensive_interceptions: team.defensive_interceptions,
            defensive_fumble_recoveries: team.defensive_fumble_recoveries,
            defensive_touchdowns: team.defensive_touchdowns,
            sacks: team.sacks,
            safeties: team.safeties,

            turnovers: null,
            takeaways: null,

            field_goals_attempted: team.field_goals_attempted,
            field_goals_made: team.field_goals_made,
            field_goal_percentage: null,
            field_goal_distances_made: team.made_field_goal_distances,

            extra_points_attempted: team.extra_points_attempted,
            extra_points_made: team.extra_points_made,
            extra_point_percentage: null,

            special_teams_touchdowns: team.special_teams_touchdowns,
            blocked_kicks: team.blocked_kicks,
        },
    }))
}

export interface EspnGameTeam {
    espnTeamId: string
    name: string
    homeAway: 'home' | 'away'
    score: string | number | null
    winner?: boolean | null
}

export interface EspnGame {
    eventId: string
    name: string
    startTime: string
    status: string | null
    week?: number
    teams: EspnGameTeam[]
}

interface EspnScoreboardResponse {
    date: string
    games: {
        event_id: string
        name: string
        start_time: string
        status: string
        teams: {
            espn_team_id: string
            name: string
            home_away: 'home' | 'away'
            score: string
        }[]
    }[]
}


interface EspnTeamScheduleResponse {
    espn_team_id: string
    season: number
    games: {
        event_id: string
        name: string
        start_time: string
        status: string | null
        week: number
        teams: {
            espn_team_id: string
            name: string
            home_away: 'home' | 'away'
            score: number | null
            winner: boolean | null
        }[]
    }[]
}

interface EspnTeamIdResponse {
    espn_team_id: string
    name: string
}

export async function getEspnTeamId(teamName: string): Promise<string> {
    const response = await fetch(
        `${ESPN_API_BASE_URL}/espn/team-id?team_name=${encodeURIComponent(teamName)}`,
        { cache: 'no-store' }
    )

    if (!response.ok) {
        throw new Error(
            `Failed to find ESPN team ID for ${teamName}.`
        )
    }

    const data: EspnTeamIdResponse = await response.json()
    return data.espn_team_id
}

export async function getEspnScoreboard(date: string): Promise<EspnGame[]> {
    const response = await fetch(
        `${ESPN_API_BASE_URL}/espn/scoreboard?date=${encodeURIComponent(date)}`,
        { cache: 'no-store' }
    )

    if (!response.ok) {
        throw new Error(`Failed to load ESPN scoreboard for ${date}.`)
    }

    const data: EspnScoreboardResponse = await response.json()

    return data.games.map((game) => ({
        eventId: game.event_id,
        name: game.name,
        startTime: game.start_time,
        status: game.status,

        teams: game.teams.map((team) => ({
            espnTeamId: team.espn_team_id,
            name: team.name,
            homeAway: team.home_away,
            score: team.score,
        })),
    }))
}

export async function getEspnTeamSchedule(espnTeamId: string, season = 2026): Promise<EspnGame[]> {
    const response = await fetch(
        `${ESPN_API_BASE_URL}/espn/team-schedule/${encodeURIComponent(espnTeamId)}?season=${season}`,
        {cache: 'no-store'}
    )

    if (!response.ok) {
        throw new Error(
            `Failed to load ESPN schedule for team ${espnTeamId}.`
        )
    }

    const data: EspnTeamScheduleResponse = await response.json()

    return data.games.map((game) => ({
        eventId: game.event_id,
        name: game.name,
        startTime: game.start_time,
        status: game.status,
        week: game.week,
        teams: game.teams.map((team) => ({
            espnTeamId: team.espn_team_id,
            name: team.name,
            homeAway: team.home_away,
            score: team.score,
            winner: team.winner,
        })),
    }))
}

export async function getEspnEventIdForWeek(espnTeamId: string, week: number, season = 2026): Promise<string | null> {
    const schedule = await getEspnTeamSchedule(espnTeamId, season)
    const game = schedule.find((game) => game.week === week)

    return game?.eventId ?? null
}

export async function getLiveTeamStats(teamName: string, week: number, season = 2026): Promise<LiveTeamStats | null> {
    const espnTeamId = await getEspnTeamId(teamName)

    if (!espnTeamId) {
        return null
    }

    const eventId = await getEspnEventIdForWeek(espnTeamId, week, season)

    if (!eventId) {
        return null
    }

    const gameStats = await getLiveGameStats(eventId)

    return (
        gameStats.find((team) => team.espnTeamId === espnTeamId) ?? null
    )
}