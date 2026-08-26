import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'

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
                .select('id, name, join_code, commissioner_id, draft_status, current_pick_number')
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

        const draftOrderRows = members.map((member, index) =>
            ({league_id: league.id, league_member_id: member.id, draft_position: index + 1}))

        const { error: draftOrderError } = await supabase
            .from('draft_order')
            .insert(draftOrderRows)

        if (draftOrderError) {
            setError(draftOrderError.message)
            return
        }

        const { error: leagueUpdateError } = await supabase
            .from('leagues')
            .update({draft_status: 'IN_PROGRESS', current_pick_number: 1})
            .eq('id', league.id)

        if (leagueUpdateError) {
            setError(leagueUpdateError.message)
            return
        }

        setLeague({...league, draft_status: 'IN_PROGRESS', current_pick_number: 1})
    }

    return (
        <div>
            <h1>{league.name}</h1>

            <p>
                Join Code: <strong>{league.join_code}</strong>
            </p>

            <h2>League Members</h2>

            {members.length === 0 ? (
                <p>No members yet.</p>
            ) : (
                <ul>
                    {members.map((member) => (
                        <li key={member.id}>
                            <Link to={`/league/${league.id}/team/${member.id}`}>
                                {member.team_name}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

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
                </>
            )}

            <div>
                <Link to={`/league/${league.id}/draft`}>
                    {league.draft_status === 'COMPLETED' ? 'Draft Results' : 'Open Draft Room'}
                </Link>
            </div>

            <p>
                Draft Status: <strong>{league.draft_status}</strong>
            </p>

            {isCommissioner &&
                league.draft_status === 'NOT_STARTED' && (
                    <button onClick={handleStartDraft}>
                        Start Draft
                    </button>
                )}

            <div>
                <Link to={`/league/${league.id}/week-scores`}>
                    Week 1 Scores
                </Link>
            </div>
        </div>
    )
}