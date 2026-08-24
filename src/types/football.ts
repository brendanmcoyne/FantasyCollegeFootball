export interface TeamStats {
    games_played: number | null
    points_scored: number | null
    points_per_game: number | null

    rushing_yards: number | null
    rushing_yards_per_game: number | null

    passing_yards: number | null
    passing_yards_per_game: number | null

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

    turnovers: number | null
    takeaways: number | null

    field_goals_attempted: number | null
    field_goals_made: number | null
    field_goal_percentage: number | null

    extra_points_attempted: number | null
    extra_points_made: number | null
    extra_point_percentage: number | null
}

export interface CollegeTeam {
    id: number
    name: string
    conference: string
    wins: number
    losses: number
    stats: TeamStats
}