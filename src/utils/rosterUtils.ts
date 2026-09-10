import type { RosterUnitType } from '../rosters'

export function normalizeTeamName(teamName: string): string {
    return teamName.trim().toLowerCase()
}

export function isGameLocked(gameStart: Date | null, now = new Date()): boolean {
    return gameStart !== null &&
        now.getTime() >= gameStart.getTime()
}

export function formatGameStart(gameStart: Date): string {
    return gameStart.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

export function formatUnitType(unitType: RosterUnitType): string {
    return unitType === 'SPECIAL_TEAMS'
        ? 'Special Teams' : unitType.charAt(0) + unitType.slice(1).toLowerCase()
}
