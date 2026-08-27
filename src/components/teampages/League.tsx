import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'
import { createRegularSeasonSchedule } from '../../utils/leagueschedule'
import { CURRENT_WEEK } from '../../bigseasonfile'

interface LeagueData {
    id: string
    name: string
    join_code: string
    commissioner_id: string
    draft_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
    current_pick_number: number
}

interface LeagueMember {
    id: string
    user_id: string
    team_name: string
    joined_at: string
}

export default function League() {
    const { leagueId } = useParams()
    const { user } = useAuth()

    const [league, setLeague] = useState<LeagueData | null>(null)
    const [members, setMembers] = useState<LeagueMember[]>([])
    const [loading, setLoading] = useState(true)
    const [hasSchedule, setHasSchedule] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadLeague() {
            if (!leagueId) {
                setError('League ID is missing.')
                setLoading(false)
                return
            }

            const { data: leagueData, error: leagueError } = await supabase
                .from('leagues')
                .select(
                    'id, name, join_code, commissioner_id, draft_status, current_pick_number'
                )
                .eq('id', leagueId)
                .single()

            if (leagueError) {
                setError(leagueError.message)
                setLoading(false)
                return
            }

            const { data: memberData, error: memberError } = await supabase
                .from('league_members')
                .select('id, user_id, team_name, joined_at')
                .eq('league_id', leagueId)
                .order('joined_at', { ascending: true })

            if (memberError) {
                setError(memberError.message)
                setLoading(false)
                return
            }

            const { count, error: matchupCountError } = await supabase
                .from('league_matchups')
                .select('id', {
                    count: 'exact',
                    head: true,
                })
                .eq('league_id', leagueId)

            if (matchupCountError) {
                setError(matchupCountError.message)
                setLoading(false)
                return
            }

            setHasSchedule((count ?? 0) > 0)
            setLeague(leagueData)
            setMembers(memberData ?? [])
            setLoading(false)
        }

        loadLeague()
    }, [leagueId])

    if (loading) {
        return <p>Loading league...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    if (!league) {
        return <p>League not found.</p>
    }

    const isCommissioner =
        user?.id === league.commissioner_id

    async function handleStartDraft() {
        if (!league || !isCommissioner) {
            return
        }

        setError('')

        if (members.length < 2) {
            setError(
                'The league must have at least 2 teams before starting the draft.'
            )
            return
        }

        if (members.length % 2 !== 0) {
            setError(
                'The league must have an even number of teams before starting the draft.'
            )
            return
        }

        const draftOrderRows = members.map((member, index) => ({
            league_id: league.id,
            league_member_id: member.id,
            draft_position: index + 1,
        }))

        const schedule = createRegularSeasonSchedule(
            members.map((member) => ({
                id: member.id,
                teamName: member.team_name,
            }))
        )

        const { error: draftOrderError } = await supabase
            .from('draft_order')
            .insert(draftOrderRows)

        if (draftOrderError) {
            setError(draftOrderError.message)
            return
        }

        const { error: matchupError } = await supabase
            .from('league_matchups')
            .insert(
                schedule.map((matchup) => ({
                    league_id: league.id,
                    week: matchup.week,
                    team1_id: matchup.team1Id,
                    team2_id: matchup.team2Id,
                }))
            )

        if (matchupError) {
            setError(matchupError.message)
            return
        }

        const { error: updateError } = await supabase
            .from('leagues')
            .update({
                draft_status: 'IN_PROGRESS',
                current_pick_number: 1,
                current_turn_number: 1,
            })
            .eq('id', league.id)

        if (updateError) {
            setError(updateError.message)
            return
        }

        setLeague({
            ...league,
            draft_status: 'IN_PROGRESS',
            current_pick_number: 1,
        })
    }

    async function handleGenerateSchedule() {
        if (!league || !isCommissioner) {
            return
        }

        setError('')

        if (members.length < 2 || members.length % 2 !== 0) {
            setError(
                'The league must have an even number of teams.'
            )
            return
        }

        const schedule = createRegularSeasonSchedule(
            members.map((member) => ({
                id: member.id,
                teamName: member.team_name,
            }))
        )

        const { error: matchupError } = await supabase
            .from('league_matchups')
            .insert(
                schedule.map((matchup) => ({
                    league_id: league.id,
                    week: matchup.week,
                    team1_id: matchup.team1Id,
                    team2_id: matchup.team2Id,
                }))
            )

        if (matchupError) {
            setError(matchupError.message)
            return
        }

        setHasSchedule(true)
    }

    return (
        <div>
            <h1>{league.name}</h1>

            <p>
                Join Code: <strong>{league.join_code}</strong>
            </p>

            <h2>League Members</h2>

            <ul>
                {members.map((member) => (
                    <li key={member.id}>
                        <Link to={`/league/${league.id}/team/${member.id}`}>
                            {member.team_name}
                        </Link>
                    </li>
                ))}
            </ul>

            {league.draft_status === 'COMPLETED' && (
                <>
                    <div>
                        <Link to={`/league/${league.id}/team`}>
                            My Team
                        </Link>
                    </div>

                    <div>
                        <Link to={`/league/${league.id}/free-agents`}>
                            Free Agents
                        </Link>
                    </div>

                    <div>
                        <Link to={`/league/${league.id}/schedule`}>
                            Schedule
                        </Link>
                    </div>

                    <div>
                        <Link to={`/league/${league.id}/standings`}>
                            Standings
                        </Link>
                    </div>
                </>
            )}

            <div>
                <Link to={`/league/${league.id}/draft`}>
                    {league.draft_status === 'COMPLETED'
                        ? 'Draft Results'
                        : 'Open Draft Room'}
                </Link>
            </div>

            <p>
                Draft Status:{' '}
                <strong>{league.draft_status}</strong>
            </p>

            {isCommissioner &&
                league.draft_status === 'NOT_STARTED' && (
                    <button onClick={handleStartDraft}>
                        Start Draft
                    </button>
                )}

            {isCommissioner &&
                league.draft_status === 'COMPLETED' &&
                !hasSchedule && (
                    <button onClick={handleGenerateSchedule}>
                        Generate Schedule
                    </button>
                )}

            <div>
                <Link
                    to={`/league/${league.id}/week-scores/${CURRENT_WEEK}`}
                >
                    Week Scores
                </Link>
            </div>
        </div>
    )
}