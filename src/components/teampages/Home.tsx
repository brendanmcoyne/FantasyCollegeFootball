import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'

interface League {
    id: string
    name: string
    join_code: string
}

export default function Home() {
    const { user } = useAuth()

    const [leagues, setLeagues] = useState<League[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadLeagues() {
            if (!user) {
                setLoading(false)
                return
            }

            const { data: memberships, error: membershipError } = await supabase
                .from('league_members')
                .select('league_id')
                .eq('user_id', user.id)

            if (membershipError) {
                setError(membershipError.message)
                setLoading(false)
                return
            }

            if (!memberships || memberships.length === 0) {
                setLeagues([])
                setLoading(false)
                return
            }

            const leagueIds = memberships.map(
                (membership) => membership.league_id
            )

            const { data: leagueData, error: leagueError } = await supabase
                .from('leagues')
                .select('id, name, join_code')
                .in('id', leagueIds)

            if (leagueError) {
                setError(leagueError.message)
                setLoading(false)
                return
            }

            setLeagues(leagueData ?? [])
            setLoading(false)
        }

        loadLeagues()
    }, [user])

    return (
        <div>
            <h1>Fantasy College Football</h1>

            <div>
                <Link to="/create-league">
                    Create League
                </Link>
            </div>

            <div>
                <Link to="/join-league">
                    Join League
                </Link>
            </div>

            <h2>My Leagues</h2>

            {loading && <p>Loading leagues...</p>}

            {error && <p>{error}</p>}

            {!loading && !error && leagues.length === 0 && (
                <p>You aren't in any leagues yet.</p>
            )}

            {leagues.map((league) => (
                <div key={league.id}>
                    <Link to={`/league/${league.id}`}>
                        {league.name}
                    </Link>
                </div>
            ))}
        </div>
    )
}