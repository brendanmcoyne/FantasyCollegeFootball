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
            throw new Error(
                'Week 11 already has an unexpected number of matchups.'
            )
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

