import type {EspnGame} from "../api/weeklyStats";

function normalizeEspnTeamName(name: string): string {
    const aliases: Record<string, string> = {
        mississippi: 'olemiss',
    }

    const normalized = name
        .toLowerCase()
        .replace(/\b(fighting irish|spartans|hoosiers|buckeyes|ducks|huskies|hawkeyes|cavaliers|mustangs|red raiders|bearcats|wildcats|rebels|tigers|sooners|bulldogs|gamecocks|aggies|razorbacks|gators|volunteers|commodores|longhorns|nittany lions|wolverines|scarlet knights|terrapins|boilermakers|bruins|badgers|golden gophers|cornhuskers|fighting illini|yellow jackets|blue devils|seminoles|wolfpack|cardinals|demon deacons|tar heels|cougars|utes|horned frogs|cyclones|knights|mountaineers|buffaloes|cowboys|crimson tide|war eagles|hurricanes|panthers|bears|trojans|cardinal)\b/g, '')
        .replace(/[^a-z0-9]/g, '')

    return aliases[normalized] ?? normalized
}

function getEspnGameForTeam(teamName: string, games: EspnGame[]): EspnGame | undefined {
    const normalizedTeamName = normalizeEspnTeamName(teamName)

    return games.find((game) =>
        game.teams.some(
            (team) =>
                normalizeEspnTeamName(team.name) === normalizedTeamName
        )
    )
}

export function getEspnGameResult(teamName: string, games: EspnGame[]): { result: 'W' | 'L'; score: string } | null {
    const game = getEspnGameForTeam(teamName, games)

    if (!game || game.status !== 'STATUS_FINAL') {
        return null
    }

    const normalizedTeamName = normalizeEspnTeamName(teamName)

    const team = game.teams.find(
        (gameTeam) =>
            normalizeEspnTeamName(gameTeam.name) === normalizedTeamName
    )

    const opponent = game.teams.find(
        (gameTeam) =>
            normalizeEspnTeamName(gameTeam.name) !== normalizedTeamName
    )

    if (!team || !opponent) {
        return null
    }

    const teamScore = Number(team.score)
    const opponentScore = Number(opponent.score)

    if (Number.isNaN(teamScore) || Number.isNaN(opponentScore) || teamScore === opponentScore) {
        return null
    }

    return {
        result: teamScore > opponentScore ? 'W' : 'L',
        score: `${teamScore}-${opponentScore}`,
    }
}