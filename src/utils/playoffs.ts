import { getLeagueStandings } from './standings'
import { supabase } from '../components/lib/supabase'

export interface PlayoffTeam {
    memberId: string
    teamName: string
    seed: number
    wins: number
    losses: number
}

export type PlayoffSize = 2 | 4 | 6 | 8

export function getPlayoffSize(teamCount: number): PlayoffSize {
    if (teamCount >= 8) return 8
    if (teamCount === 6) return 6
    if (teamCount === 4) return 4
    if (teamCount === 2) return 2

    throw new Error(`Unsupported league size: ${teamCount}`)
}

export function finals(playoffSize: PlayoffSize): number {
    if (playoffSize === 2) return 11
    if (playoffSize === 4) return 12
    return 13
}

export async function getSeeds(leagueId: string): Promise<PlayoffTeam[]> {
    const standings = await getLeagueStandings(leagueId)
    const playoffSize = getPlayoffSize(standings.length)

    return standings.slice(0, playoffSize).map((team, index) => ({
        memberId: team.memberId,
        teamName: team.teamName,
        seed: index + 1,
        wins: team.wins,
        losses: team.losses,
    }))
}

interface CompletedMatchup {
    id: string
    team1_id: string
    team2_id: string
    team1_score: number | null
    team2_score: number | null
    winner_id: string | null
}

interface MatchupPair {
    team1_id: string
    team2_id: string
}

async function roundMatchups(leagueId: string, week: number): Promise<CompletedMatchup[]> {
    const { data, error } = await supabase
        .from('league_matchups')
        .select('id, team1_id, team2_id, team1_score, team2_score, winner_id')
        .eq('league_id', leagueId)
        .eq('week', week)
        .order('id', { ascending: true })

    if (error) throw error

    return (data ?? []) as CompletedMatchup[]
}

function getWinner(matchup: CompletedMatchup): string {
    if (!matchup.winner_id) {
        throw new Error('Previous playoff round has not finished yet.')
    }

    if (matchup.winner_id !== matchup.team1_id && matchup.winner_id !== matchup.team2_id) {
        throw new Error('Invalid playoff winner.')
    }

    return matchup.winner_id
}

function findMatchup(matchups: CompletedMatchup[], teamA: string, teamB: string): CompletedMatchup {
    const matchup = matchups.find(
        (game) =>
            (game.team1_id === teamA && game.team2_id === teamB) ||
            (game.team1_id === teamB && game.team2_id === teamA)
    )

    if (!matchup) {
        throw new Error('Required playoff matchup was not found.')
    }

    return matchup
}

async function createRound(leagueId: string, week: number, games: MatchupPair[]): Promise<void> {
    const existing = await roundMatchups(leagueId, week)

    if (existing.length > 0) {
        if (existing.length !== games.length) {
            throw new Error(`Week ${week} has an unexpected number of matchups.`)
        }

        const matchesExpected = games.every((game) =>
            existing.some((saved) => saved.team1_id === game.team1_id && saved.team2_id === game.team2_id)
        )

        if (!matchesExpected) {
            throw new Error(`Week ${week} contains different playoff matchups.`)
        }

        return
    }

    const { error } = await supabase.from('league_matchups')
        .insert(games.map((game) => ({
            league_id: leagueId,
            week,
            team1_id: game.team1_id,
            team2_id: game.team2_id,
            }))
        )

    if (error) throw error
}

export async function Round1(leagueId: string): Promise<void> {
    const seeds = await getSeeds(leagueId)
    const size = getPlayoffSize(seeds.length)

    const seed = (number: number) => seeds[number - 1].memberId
    let games: MatchupPair[]

    switch (size) {
        case 2:
            games = [{ team1_id: seed(1), team2_id: seed(2) }]
            break

        case 4:
            games = [{ team1_id: seed(1), team2_id: seed(4) }, { team1_id: seed(2), team2_id: seed(3) }]
            break

        case 6:
            games = [{ team1_id: seed(3), team2_id: seed(6) }, { team1_id: seed(4), team2_id: seed(5) }]
            break

        case 8:
            games = [{ team1_id: seed(1), team2_id: seed(8) }, { team1_id: seed(4), team2_id: seed(5) },
                { team1_id: seed(2), team2_id: seed(7) }, { team1_id: seed(3), team2_id: seed(6) }]
            break
    }

    await createRound(leagueId, 11, games)
}

export async function Round2(leagueId: string): Promise<void> {
    const seeds = await getSeeds(leagueId)
    const size = getPlayoffSize(seeds.length)

    if (size === 2) return

    const round1 = await roundMatchups(leagueId, 11)
    const seed = (number: number) => seeds[number - 1].memberId
    const winner = (a: number, b: number) => getWinner(findMatchup(round1, seed(a), seed(b)))

    let games: MatchupPair[]

    if (size === 4) {
        if (round1.length !== 2) {
            throw new Error('Week 11 semifinals are not ready.')
        }

        games = [{ team1_id: winner(1, 4), team2_id: winner(2, 3) }]
    } else if (size === 6) {
        if (round1.length !== 2) {
            throw new Error('Week 11 quarterfinals are not ready.')
        }

        games = [{ team1_id: seed(1), team2_id: winner(4, 5) }, { team1_id: seed(2), team2_id: winner(3, 6) }]

    } else {
        if (round1.length !== 4) {
            throw new Error('Week 11 quarterfinals are not ready.')
        }

        games = [{ team1_id: winner(1, 8), team2_id: winner(4, 5) }, { team1_id: winner(2, 7), team2_id: winner(3, 6) }]
    }

    await createRound(leagueId, 12, games)
}

export async function Round3(leagueId: string): Promise<void> {
    const seeds = await getSeeds(leagueId)
    const size = getPlayoffSize(seeds.length)

    if (size === 2 || size === 4) return

    const round2 = await roundMatchups(leagueId, 12)

    if (round2.length !== 2) {
        throw new Error('Week 12 semifinals are not ready.')
    }

    let semifinal1: CompletedMatchup
    let semifinal2: CompletedMatchup

    if (size === 6) {
        semifinal1 = round2.find((game) => game.team1_id === seeds[0].memberId)!
        semifinal2 = round2.find((game) => game.team1_id === seeds[1].memberId)!

        if (!semifinal1 || !semifinal2) {
            throw new Error('Semifinal matchups are invalid.')
        }
    } else {
        const firstRound = await roundMatchups(leagueId, 11)
        const seed = (number: number) => seeds[number - 1].memberId
        const winner = (a: number, b: number) => getWinner(findMatchup(firstRound, seed(a), seed(b)))

        semifinal1 = findMatchup(round2, winner(1, 8), winner(4, 5))
        semifinal2 = findMatchup(round2, winner(2, 7), winner(3, 6))
    }

    await createRound(leagueId, 13, [{ team1_id: getWinner(semifinal1), team2_id: getWinner(semifinal2) }])
}

export async function advancePlayoffs(leagueId: string, currentWeek: number): Promise<void> {
    if (currentWeek < 11) return

    await Round1(leagueId)

    if (currentWeek >= 12) {
        await setRound(leagueId, 11)
        await Round2(leagueId)
    }

    if (currentWeek >= 13) {
        await setRound(leagueId, 12)
        await Round3(leagueId)
    }

    const size = getPlayoffSize((await getSeeds(leagueId)).length)
    const championshipWeek = finals(size)

    if (currentWeek > championshipWeek) {
        await setRound(leagueId, championshipWeek)
    }
}


async function setRound(leagueId: string, week: number): Promise<void> {
    const seeds = await getSeeds(leagueId)
    const matchups = await roundMatchups(leagueId, week)

    for (const matchup of matchups) {
        if (matchup.team1_score === null || matchup.team2_score === null) {
            throw new Error(`Week ${week} is unfinished.`)
        }

        const seed1 = seeds.find((team) => team.memberId === matchup.team1_id)
        const seed2 = seeds.find((team) => team.memberId === matchup.team2_id)

        if (!seed1 || !seed2) {
            throw new Error(`Missing seeds for matchup ${matchup.id}`)
        }

        const winnerId =
            matchup.team1_score > matchup.team2_score
                ? matchup.team1_id : matchup.team2_score > matchup.team1_score
                    ? matchup.team2_id : seed1.seed < seed2.seed
                        ? matchup.team1_id : matchup.team2_id

        if (matchup.winner_id === winnerId) {
            continue
        }

        const { error } = await supabase
            .from('league_matchups')
            .update({ winner_id: winnerId })
            .eq('id', matchup.id)
            .eq('league_id', leagueId)

        if (error) throw error
    }
}


