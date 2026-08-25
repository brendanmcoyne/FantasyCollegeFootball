export const STARTERS = {
    PASSING: 3,
    RUSHING: 3,
    RECEIVING: 3,
    DEFENSE: 2,
    SPECIAL_TEAMS: 2,
} as const

export const BENCH = 3
export const ROSTER_SIZE = 16

export type RosterUnitType = keyof typeof STARTERS