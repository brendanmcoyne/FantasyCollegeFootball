import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface LeagueMember {
    id: string
    team_name: string
}

interface Matchup {
    id: string
    week: number
    team1_id: string
    team2_id: string
    team1_score: number | null
    team2_score: number | null
}

export default function Schedule() {
    const { leagueId } = useParams()

    const [members, setMembers] = useState<LeagueMember[]>([])
    const [matchups, setMatchups] = useState<Matchup[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadSchedule() {
            if (!leagueId) {
                setError('League ID is missing.')
                setLoading(false)
                return
            }

            const { data: memberData, error: memberError } =
                await supabase
                    .from('league_members')
                    .select('id, team_name')
                    .eq('league_id', leagueId)

            if (memberError) {
                setError(memberError.message)
                setLoading(false)
                return
            }

            const { data: matchupData, error: matchupError } =
                await supabase
                    .from('league_matchups')
                    .select(
                        'id, week, team1_id, team2_id, team1_score, team2_score'
                    )
                    .eq('league_id', leagueId)
                    .order('week', { ascending: true })

            if (matchupError) {
                setError(matchupError.message)
                setLoading(false)
                return
            }

            setMembers(memberData ?? [])
            setMatchups(matchupData ?? [])
            setLoading(false)
        }

        loadSchedule()
    }, [leagueId])

    if (loading) {
        return <p>Loading schedule...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    function getTeamName(memberId: string) {
        return (
            members.find((member) => member.id === memberId)
                ?.team_name ?? 'Unknown Team'
        )
    }

    return (
        <div>
            <h1>League Schedule</h1>

            {Array.from({ length: 10 }, (_, index) => {
                const week = index + 1

                const weekMatchups = matchups.filter(
                    (matchup) => matchup.week === week
                )

                return (
                    <section key={week}>
                        <h2>Week {week}</h2>

                        {weekMatchups.length === 0 ? (
                            <p>No matchups scheduled.</p>
                        ) : (
                            weekMatchups.map((matchup) => (
                                <div key={matchup.id}>
                                    <strong>
                                        {getTeamName(matchup.team1_id)}
                                    </strong>

                                    {matchup.team1_score !== null
                                        ? ` — ${matchup.team1_score.toFixed(1)}`
                                        : ''}

                                    {' vs '}

                                    <strong>
                                        {getTeamName(matchup.team2_id)}
                                    </strong>

                                    {matchup.team2_score !== null
                                        ? ` — ${matchup.team2_score.toFixed(1)}`
                                        : ''}
                                </div>
                            ))
                        )}
                    </section>
                )
            })}
        </div>
    )
}