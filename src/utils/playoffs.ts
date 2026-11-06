import { getLeagueStandings } from './standings'
import { supabase } from '../components/lib/supabase'

export interface PlayoffTeam {
    memberId: string
    teamName: string
    seed: number
    wins: number
    losses: number
}

export async function getPlayoffSeeds(leagueId: string): Promise<PlayoffTeam[]> {
    const standings = await getLeagueStandings(leagueId)

    return standings.slice(0, 6).map((team, index) => ({
        memberId: team.memberId,
        teamName: team.teamName,
        seed: index + 1,
        wins: team.wins,
        losses: team.losses,
    }))
}


export async function PlayoffRound1(leagueId: string): Promise<void> {
    const seeds = await getPlayoffSeeds(leagueId)

    if (seeds.length < 6) {
        throw new Error(
            'At least 6 teams are required for the playoffs.'
        )
    }

    const { data: existing, error: existingError } =
        await supabase
            .from('league_matchups')
            .select('id')
            .eq('league_id', leagueId)
            .eq('week', 11)

    if (existingError) throw existingError

    if (existing && existing.length > 0) {
        if (existing.length !== 2) {
            throw new Error('Week 11 already has an unexpected number of matchups.')
        }
        return
    }

    const matchups = [
        {
            league_id: leagueId,
            week: 11,
            team1_id: seeds[2].memberId,
            team2_id: seeds[5].memberId,
        },
        {
            league_id: leagueId,
            week: 11,
            team1_id: seeds[3].memberId,
            team2_id: seeds[4].memberId,
        },
    ]

    const { error } = await supabase
        .from('league_matchups')
        .insert(matchups)

    if (error) throw error
}


interface CompletedMatchup {
    id: string
    team1_id: string
    team2_id: string
    team1_score: number | null
    team2_score: number | null
    winner_id: string | null
}

async function getRoundMatchups(leagueId: string, week: number): Promise<CompletedMatchup[]> {
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
        throw new Error(
            'Previous playoff round has not finished yet.'
        )
    }

    if (matchup.winner_id !== matchup.team1_id && matchup.winner_id !== matchup.team2_id) {
        throw new Error('Invalid playoff winner.')
    }

    return matchup.winner_id
}

async function createRound(leagueId: string, week: number, games: { team1_id: string; team2_id: string }[]): Promise<void> {
    const existing = await getRoundMatchups(leagueId, week)

    if (existing.length > 0) {
        if (existing.length !== games.length) {
            throw new Error(
                `Week ${week} has an unexpected number of matchups.`
            )
        }

        return
    }

    const { error } = await supabase
        .from('league_matchups')
        .insert(
            games.map((game) => ({
                league_id: leagueId,
                week,
                team1_id: game.team1_id,
                team2_id: game.team2_id
            }))
        )

    if (error) throw error
}

export async function PlayoffRound2(leagueId: string): Promise<void> {
    const existing = await getRoundMatchups(leagueId, 12)

    if (existing.length === 2) return

    if (existing.length !== 0) {
        throw new Error('Week 12 has incomplete matchups.')
    }

    const seeds = await getPlayoffSeeds(leagueId)
    const round1 = await getRoundMatchups(leagueId, 11)

    if (seeds.length !== 6 || round1.length !== 2) {
        throw new Error('Week 11 playoffs are not ready.')
    }

    const findWinner = (seedA: number, seedB: number) => {
        const teamA = seeds[seedA - 1].memberId
        const teamB = seeds[seedB - 1].memberId

        const matchup = round1.find(
            (game) =>
                (game.team1_id === teamA && game.team2_id === teamB) ||
                (game.team1_id === teamB && game.team2_id === teamA)
        )

        if (!matchup) {
            throw new Error(`Missing playoff matchup: #${seedA} vs #${seedB}`)
        }

        return getWinner(matchup)
    }

    const winner36 = findWinner(3, 6)
    const winner45 = findWinner(4, 5)

    await createRound(leagueId, 12, [
        {
            team1_id: seeds[0].memberId,
            team2_id: winner45
        },
        {
            team1_id: seeds[1].memberId,
            team2_id: winner36
        }
    ])
}

export async function PlayoffRound3(leagueId: string): Promise<void> {
    const existing = await getRoundMatchups(leagueId, 13)

    if (existing.length === 1) return

    if (existing.length !== 0) {
        throw new Error('Week 13 has unexpected matchups.')
    }

    const round2 = await getRoundMatchups(leagueId, 12)

    if (round2.length !== 2) {
        throw new Error('Week 12 playoffs are not ready.')
    }

    const seeds = await getPlayoffSeeds(leagueId)

    const semifinal1 = round2.find(
        (game) => game.team1_id === seeds[0].memberId
    )

    const semifinal2 = round2.find(
        (game) => game.team1_id === seeds[1].memberId
    )

    if (!semifinal1 || !semifinal2) {
        throw new Error('Semifinal matchups are invalid.')
    }

    await createRound(leagueId, 13, [
        {
            team1_id: getWinner(semifinal1),
            team2_id: getWinner(semifinal2)
        }
    ])
}
