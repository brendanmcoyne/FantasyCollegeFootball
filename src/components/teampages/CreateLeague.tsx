import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'

function generateJoinCode() {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''

    for (let i = 0; i < 6; i++) {
        code += characters.charAt(
            Math.floor(Math.random() * characters.length)
        )
    }

    return code
}

export default function CreateLeague() {
    const { user } = useAuth()
    const navigate = useNavigate()

    const [leagueName, setLeagueName] = useState('')
    const [teamName, setTeamName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleCreateLeague() {
        if (!user) {
            setError('You must be logged in.')
            return
        }

        if (!leagueName.trim() || !teamName.trim()) {
            setError('Enter a league name and team name.')
            return
        }

        setLoading(true)
        setError('')

        const joinCode = generateJoinCode()

        const {
            data: league,
            error: leagueError,
        } = await supabase
            .from('leagues')
            .insert({
                name: leagueName.trim(),
                join_code: joinCode,
                commissioner_id: user.id,
            })
            .select()
            .single()

        if (leagueError) {
            setError(leagueError.message)
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
            setError(memberError.message)
            setLoading(false)
            return
        }

        navigate(`/league/${league.id}`)
    }

    return (
        <div>
            <h1>Create League</h1>

            <div>
                <label>
                    League Name
                </label>

                <input
                    type="text"
                    value={leagueName}
                    onChange={(event) =>
                        setLeagueName(event.target.value)
                    }
                    placeholder="Saturday Sickos"
                />
            </div>

            <div>
                <label>
                    Your Team Name
                </label>

                <input
                    type="text"
                    value={teamName}
                    onChange={(event) =>
                        setTeamName(event.target.value)
                    }
                    placeholder="Coyne Dawgs"
                />
            </div>

            {error && (
                <p>{error}</p>
            )}

            <button
                onClick={handleCreateLeague}
                disabled={loading}
            >
                {loading ? 'Creating...' : 'Create League'}
            </button>
        </div>
    )
}