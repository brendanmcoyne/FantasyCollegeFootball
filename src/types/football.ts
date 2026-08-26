export interface TeamStats {
    games_played: number | null
    points_scored: number | null
    points_per_game: number | null

    rushing_yards: number | null
    rushing_yards_per_game: number | null
    rushing_touchdowns: number | null
    rushing_fumbles_lost: number | null

    passing_yards: number | null
    passing_yards_per_game: number | null
    passing_touchdowns: number | null
    passing_interceptions: number | null

    receiving_fumbles_lost: number | null

    total_yards: number | null
    total_yards_per_game: number | null

    points_allowed: number | null
    points_allowed_per_game: number | null

    rushing_yards_allowed: number | null
    rushing_yards_allowed_per_game: number | null

    passing_yards_allowed: number | null
    passing_yards_allowed_per_game: number | null

    total_yards_allowed: number | null
    total_yards_allowed_per_game: number | null

    defensive_interceptions: number | null
    defensive_fumble_recoveries: number | null
    defensive_touchdowns: number | null
    sacks: number | null
    safeties: number | null

    turnovers: number | null
    takeaways: number | null

    field_goals_attempted: number | null
    field_goals_made: number | null
    field_goal_percentage: number | null

    field_goal_distances_made: number[] | null

    extra_points_attempted: number | null
    extra_points_made: number | null
    extra_point_percentage: number | null

    special_teams_touchdowns: number | null
    blocked_kicks: number | null
}

export interface CollegeTeam {
    id: number
    name: string
    conference: string
    wins: number
    losses: number
    stats: TeamStats
}
