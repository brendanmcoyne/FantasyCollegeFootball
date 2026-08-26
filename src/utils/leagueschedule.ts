export interface ScheduleTeam {
    id: string
    teamName: string
}

export interface ScheduledMatchup {
    week: number
    team1Id: string
    team2Id: string
}

export function createRegularSeasonSchedule(
    teams: ScheduleTeam[]
): ScheduledMatchup[] {
    if (teams.length !== 6) {
        throw new Error(
            'The regular-season schedule currently requires exactly 6 teams.'
        )
    }

    const ids = teams.map((team) => team.id)

    const firstHalf: ScheduledMatchup[] = []

    let rotation = [...ids]

    for (let week = 1; week <= 5; week++) {
        for (let i = 0; i < 3; i++) {
            firstHalf.push({
                week,
                team1Id: rotation[i],
                team2Id: rotation[5 - i],
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

    const secondHalf = firstHalf.map(
        (matchup) => ({
            week: matchup.week + 5,
            team1Id: matchup.team2Id,
            team2Id: matchup.team1Id,
        })
    )

    return [...firstHalf, ...secondHalf]
}