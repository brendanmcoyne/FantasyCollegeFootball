import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

interface LeagueData {
    id: string
    name: string
    join_code: string
    commissioner_id: string
}

interface LeagueMember {
    id: string
    user_id: string
    team_name: string
    joined_at: string
}

export default function League() {
    const { leagueId } = useParams()

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
                .select('id, name, join_code, commissioner_id')
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
                            {member.team_name}
                        </li>
                    ))}
                </ul>
            )}

            <Link to={`/league/${league.id}/draft`}>
                Open Draft Room
            </Link>
        </div>
    )
}