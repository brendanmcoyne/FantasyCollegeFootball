import { supabase } from '../components/lib/supabase'
import { CURRENT_WEEK } from '../bigseasonfile'

export interface Standing {
    memberId: string
    teamName: string
    wins: number
    losses: number
    pointsFor: number
    pointsAgainst: number
}

export async function getLeagueStandings(leagueId: string): Promise<Standing[]> {
    const { data: members, error: membersError } =
        await supabase
            .from('league_members')
            .select('id, team_name')
            .eq('league_id', leagueId)

    if (membersError) {
        throw membersError
    }

    const { data: matchups, error: matchupsError } =
        await supabase
            .from('league_matchups')
            .select('team1_id, team2_id, team1_score, team2_score')
            .eq('league_id', leagueId)
            .lt('week', CURRENT_WEEK)

    if (matchupsError) {
        throw matchupsError
    }

    const standingsMap = new Map<string, Standing>()

    for (const member of members ?? []) {
        standingsMap.set(member.id, {
            memberId: member.id,
            teamName: member.team_name,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
        })
    }

    for (const matchup of matchups ?? []) {
        if (matchup.team1_score === null || matchup.team2_score === null) {
            continue
        }

        const team1 = standingsMap.get(matchup.team1_id)
        const team2 = standingsMap.get(matchup.team2_id)

        if (!team1 || !team2) {
            continue
        }

        team1.pointsFor += matchup.team1_score
        team1.pointsAgainst += matchup.team2_score

        team2.pointsFor += matchup.team2_score
        team2.pointsAgainst += matchup.team1_score

        if (matchup.team1_score >= matchup.team2_score) {
            team1.wins++
            team2.losses++
        } else {
            team2.wins++
            team1.losses++
        }
    }

    return Array.from(standingsMap.values()).sort(
        (a, b) => b.wins - a.wins || a.losses - b.losses || b.pointsFor - a.pointsFor)
}