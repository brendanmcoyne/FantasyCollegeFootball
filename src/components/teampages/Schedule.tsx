import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

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
    winner_id: string | null
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

            try {
                const {
                    data: memberData,
                    error: memberError,
                } = await supabase
                    .from('league_members')
                    .select('id, team_name')
                    .eq('league_id', leagueId)

                if (memberError) {
                    throw memberError
                }

                const {
                    data: matchupData,
                    error: matchupError,
                } = await supabase
                    .from('league_matchups')
                    .select(
                        'id, week, team1_id, team2_id, team1_score, team2_score, winner_id'
                    )
                    .eq('league_id', leagueId)
                    .order('week', {
                        ascending: true,
                    })

                if (matchupError) {
                    throw matchupError
                }

                setMembers(memberData ?? [])
                setMatchups(matchupData ?? [])
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message)
                } else {
                    setError('Failed to load schedule.')
                }
            } finally {
                setLoading(false)
            }
        }

        loadSchedule()
    }, [leagueId])

    function getTeamName(memberId: string): string {
        return (
            members.find(
                (member) => member.id === memberId
            )?.team_name ?? 'Unknown Team'
        )
    }

    if (loading) {
        return <p>Loading schedule...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    return (
        <div>
            <h1>League Schedule</h1>

            {Array.from(
                { length: 10 },
                (_, index) => {
                    const week = index + 1

                    const weekMatchups =
                        matchups.filter(
                            (matchup) =>
                                matchup.week === week
                        )

                    return (
                        <section key={week}>
                            <Link
                                to={`/league/${leagueId}/week-scores/${week}`}
                            >
                                <h2>Week {week}</h2>
                            </Link>

                            {weekMatchups.length ===
                            0 ? (
                                <p>
                                    No matchups
                                    scheduled.
                                </p>
                            ) : (
                                weekMatchups.map(
                                    (matchup) => {
                                        const team1Name =
                                            getTeamName(
                                                matchup.team1_id
                                            )

                                        const team2Name =
                                            getTeamName(
                                                matchup.team2_id
                                            )

                                        const hasScore =
                                            matchup.team1_score !==
                                            null &&
                                            matchup.team2_score !==
                                            null

                                        return (
                                            <div
                                                key={
                                                    matchup.id
                                                }
                                            >
                                                {hasScore ? (
                                                    <p>
                                                        <strong>
                                                            {
                                                                team1Name
                                                            }
                                                        </strong>

                                                        {' — '}

                                                        {matchup.team1_score?.toFixed(
                                                            1
                                                        )}

                                                        {' vs '}

                                                        {matchup.team2_score?.toFixed(
                                                            1
                                                        )}

                                                        {' — '}

                                                        <strong>
                                                            {
                                                                team2Name
                                                            }
                                                        </strong>
                                                    </p>
                                                ) : (
                                                    <p>
                                                        <strong>
                                                            {
                                                                team1Name
                                                            }
                                                        </strong>

                                                        {' vs '}

                                                        <strong>
                                                            {
                                                                team2Name
                                                            }
                                                        </strong>
                                                    </p>
                                                )}
                                            </div>
                                        )
                                    }
                                )
                            )}
                        </section>
                    )
                }
            )}
        </div>
    )
}