export type UnitType =
    | 'PASSING'
    | 'RUSHING'
    | 'RECEIVING'
    | 'DEFENSE'
    | 'SPECIAL_TEAMS'

export interface DraftUnit {
    id: string
    teamId: number
    teamName: string
    conference: string
    unitType: UnitType
}