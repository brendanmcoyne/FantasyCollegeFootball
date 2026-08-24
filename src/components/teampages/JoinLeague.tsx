import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'

export default function JoinLeague() {
    const { user } = useAuth()
    const navigate = useNavigate()

    const [joinCode, setJoinCode] = useState('')
    const [teamName, setTeamName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleJoinLeague() {
        if (!user) {
            setError('You must be logged in.')
            return
        }

        if (!joinCode.trim() || !teamName.trim()) {
            setError('Enter a join code and team name.')
            return
        }

        setLoading(true)
        setError('')

        const { data: league, error: leagueError } = await supabase
            .from('leagues')
            .select('id, name')
            .eq('join_code', joinCode.trim().toUpperCase())
            .single()

        if (leagueError || !league) {
            setError('League not found.')
            setLoading(false)
            return
        }

        const { error: memberError } = await supabase
            .from('league_members')
            .insert({
                league_id: league.id,
                user_id: user.id,
                team_name: teamName.trim(),
            })

        if (memberError) {
            if (memberError.code === '23505') {
                setError('You are already in this league.')
            } else {
                setError(memberError.message)
            }

            setLoading(false)
            return
        }

        navigate(`/league/${league.id}`)
    }

    return (
        <div>
            <h1>Join League</h1>

            <div>
                <label>Join Code</label>

                <input
                    type="text"
                    value={joinCode}
                    onChange={(event) =>
                        setJoinCode(event.target.value.toUpperCase())
                    }
                    placeholder="ABC123"
                />
            </div>

            <div>
                <label>Your Team Name</label>

                <input
                    type="text"
                    value={teamName}
                    onChange={(event) =>
                        setTeamName(event.target.value)
                    }
                    placeholder="Coyne Crushers"
                />
            </div>

            {error && <p>{error}</p>}

            <button
                onClick={handleJoinLeague}
                disabled={loading}
            >
                {loading ? 'Joining...' : 'Join League'}
            </button>
        </div>
    )
}