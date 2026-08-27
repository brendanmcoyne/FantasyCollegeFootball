import type { WeeklyTeamData } from '../api/weeklyStats'

export function isGameLocked(
    gameStart: Date | null,
    now = new Date()
): boolean {
    if (!gameStart) {
        return false
    }

    return now.getTime() >= gameStart.getTime()
}

export function getTeamGame(
    weeklyStats: WeeklyTeamData[],
    teamName: string
): WeeklyTeamData | undefined {
    return weeklyStats.find(
        (team) =>
            team.team.trim().toLowerCase() ===
            teamName.trim().toLowerCase()
    )
}

export function isTeamLocked(
    weeklyStats: WeeklyTeamData[],
    teamName: string,
    now = new Date()
): boolean {
    const team = getTeamGame(weeklyStats, teamName)

    if (!team) {
        return false
    }

    return isGameLocked(team.gameStart, now)
}