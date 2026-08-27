import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { CURRENT_WEEK } from '../../bigseasonfile'

interface Standing {
    memberId: string
    teamName: string
    wins: number
    losses: number
    pointsFor: number
    pointsAgainst: number
}

export default function Standings() {
    const { leagueId } = useParams()

    const [standings, setStandings] = useState<Standing[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadStandings() {
            if (!leagueId) {
                setError('League ID is missing.')
                setLoading(false)
                return
            }

            try {
                const { data: members, error: membersError } =
                    await supabase
                        .from('league_members')
                        .select('id, team_name')
                        .eq('league_id', leagueId)

                if (membersError) throw membersError

                const { data: matchups, error: matchupsError } =
                    await supabase
                        .from('league_matchups')
                        .select(
                            'team1_id, team2_id, team1_score, team2_score'
                        )
                        .eq('league_id', leagueId)
                        .lt('week', CURRENT_WEEK)

                if (matchupsError) throw matchupsError

                const standingsMap = new Map<string, Standing>()

                ;(members ?? []).forEach((member) => {
                    standingsMap.set(member.id, {
                        memberId: member.id,
                        teamName: member.team_name,
                        wins: 0,
                        losses: 0,
                        pointsFor: 0,
                        pointsAgainst: 0,
                    })
                })

                ;(matchups ?? []).forEach((matchup) => {
                    if (
                        matchup.team1_score === null ||
                        matchup.team2_score === null
                    ) {
                        return
                    }

                    const team1 = standingsMap.get(matchup.team1_id)
                    const team2 = standingsMap.get(matchup.team2_id)

                    if (!team1 || !team2) return

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
                })

                setStandings(
                    Array.from(standingsMap.values()).sort(
                        (a, b) =>
                            b.wins - a.wins ||
                            a.losses - b.losses ||
                            b.pointsFor - a.pointsFor
                    )
                )
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load standings.'
                )
            } finally {
                setLoading(false)
            }
        }

        loadStandings()
    }, [leagueId])

    if (loading) {
        return <p>Loading standings...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    return (
        <div>
            <h1>Standings</h1>

            <table>
                <thead>
                <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>W</th>
                    <th>L</th>
                    <th>PF</th>
                    <th>PA</th>
                </tr>
                </thead>

                <tbody>
                {standings.map((team, index) => (
                    <tr key={team.memberId}>
                        <td>{index + 1}</td>
                        <td>{team.teamName}</td>
                        <td>{team.wins}</td>
                        <td>{team.losses}</td>
                        <td>{team.pointsFor.toFixed(1)}</td>
                        <td>{team.pointsAgainst.toFixed(1)}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}