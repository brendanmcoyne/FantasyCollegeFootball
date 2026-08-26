export interface ScheduleTeam {
    id: string
    teamName: string
}

export interface ScheduledMatchup {
    week: number
    team1Id: string
    team2Id: string
}

const REGULAR_SEASON_WEEKS = 10

export function createRegularSeasonSchedule(
    teams: ScheduleTeam[]
): ScheduledMatchup[] {
    if (teams.length < 2) {
        throw new Error(
            'A league must have at least 2 teams.'
        )
    }

    if (teams.length % 2 !== 0) {
        throw new Error(
            'A league must have an even number of teams.'
        )
    }

    const ids = teams.map((team) => team.id)

    const matchups: ScheduledMatchup[] = []

    let rotation = [...ids]

    for (let week = 1; week <= REGULAR_SEASON_WEEKS; week++) {
        const roundNumber = week - 1

        const cycleNumber = Math.floor(
            roundNumber / (teams.length - 1)
        )

        for (let i = 0; i < teams.length / 2; i++) {
            const team1 = rotation[i]
            const team2 =
                rotation[rotation.length - 1 - i]

            matchups.push({
                week,
                team1Id:
                    cycleNumber % 2 === 0
                        ? team1
                        : team2,
                team2Id:
                    cycleNumber % 2 === 0
                        ? team2
                        : team1,
            })
        }

        const fixed = rotation[0]
        const rotating = rotation.slice(1)

        rotating.unshift(rotating.pop()!)

        rotation = [
            fixed,
            ...rotating,
        ]
    }

    return matchups
}