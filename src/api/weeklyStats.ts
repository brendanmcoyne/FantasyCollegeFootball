import Papa from 'papaparse'

import type { TeamStats } from '../types/football'
import { WEEKLY_DATA_URLS } from '../data/weekdata'

export interface WeeklyTeamData {
    team: string
    conference: string
    stats: TeamStats
}

interface SpreadsheetRow {
    Team: string
    Conference: string

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

export async function getWeeklyStats(
    week: number
): Promise<WeeklyTeamData[]> {
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

            stats: {
                games_played: null,
                points_scored: null,
                points_per_game: null,

                rushing_yards:
                    toNumber(row['Rushing Yards']),
                rushing_yards_per_game: null,
                rushing_touchdowns:
                    toNumber(row['Rushing TDs']),
                rushing_fumbles_lost:
                    toNumber(row['Rushing Fumbles']),

                passing_yards:
                    toNumber(row['Passing Yards']),
                passing_yards_per_game: null,
                passing_touchdowns:
                    toNumber(row['Passing TDs']),
                passing_interceptions:
                    toNumber(row['Passing INTs']),

                receiving_fumbles_lost:
                    toNumber(row['Receiving Fumbles']),

                total_yards: null,
                total_yards_per_game: null,

                points_allowed:
                    toNumber(row['Points Allowed']),
                points_allowed_per_game: null,

                rushing_yards_allowed: null,
                rushing_yards_allowed_per_game: null,

                passing_yards_allowed: null,
                passing_yards_allowed_per_game: null,

                total_yards_allowed:
                    toNumber(row['Yards Allowed']),
                total_yards_allowed_per_game: null,

                defensive_interceptions:
                    toNumber(row['Defensive INTs']),
                defensive_fumble_recoveries:
                    toNumber(row['Defensive Fumbles']),
                defensive_touchdowns:
                    toNumber(row['Defensive TDs']),
                sacks:
                    toNumber(row.Sacks),
                safeties:
                    toNumber(row.Safeties),

                turnovers: null,
                takeaways: null,

                field_goals_attempted:
                    toNumber(row['FGs Attempted']),
                field_goals_made:
                    toNumber(row['FGs Made']),
                field_goal_percentage: null,

                field_goal_distances_made:
                    parseFieldGoalDistances(
                        row['FG Distances Made']
                    ),

                extra_points_attempted:
                    toNumber(row['XPs Attempted']),
                extra_points_made:
                    toNumber(row['XPs Made']),
                extra_point_percentage: null,

                special_teams_touchdowns:
                    toNumber(row['Special Teams TDs']),
                blocked_kicks:
                    toNumber(row['Blocked Kicks']),
            },
        }))
}