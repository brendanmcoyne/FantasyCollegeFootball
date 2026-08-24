import type { CollegeTeam } from '../types/football'
import type { DraftUnit, UnitType } from '../types/fantasy'

const unitTypes: UnitType[] = [
    'PASSING',
    'RUSHING',
    'RECEIVING',
    'DEFENSE',
    'SPECIAL_TEAMS',
]

export function createDraftUnits(
    teams: CollegeTeam[]
): DraftUnit[] {
    return teams.flatMap((team) =>
        unitTypes.map((unitType) => ({
            id: `${team.id}-${unitType}`,
            teamId: team.id,
            teamName: team.name,
            conference: team.conference,
            unitType,
        }))
    )
}