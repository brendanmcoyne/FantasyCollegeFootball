import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'
import styled from 'styled-components'
import {BackButton} from "../../styles/commonstyles";

const JoinPage = styled.div`
    display: flex;
    justify-content: center;
`

const FormCard = styled.div`
    width: min(520px, 100%);
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`

const FormGroup = styled.div`
    display: grid;
    gap: 8px;
    margin-bottom: 18px;
`

const Label = styled.label`
    font-weight: 700;
    color: #374151;
`

const Input = styled.input`
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #d1d5db;
    border-radius: 9px;
    padding: 11px 12px;
    font-size: 1rem;
    outline: none;

    &:focus {
        border-color: #6b7280;
    }
`

const JoinButton = styled.button`
    width: 100%;
    border: none;
    border-radius: 9px;
    padding: 11px 14px;
    background: #1f2937;
    color: white;
    font-weight: 700;
    cursor: pointer;

    &:hover:not(:disabled) {
        background: #111827;
    }

    &:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }
`

const ErrorMessage = styled.p`
    color: #991b1b;
    background: #fee2e2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 10px 12px;
`

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
        <JoinPage>

            <FormCard>
                <BackButton onClick={() => navigate(-1)}>
                    ← Back
                </BackButton>
                <h1>Join League</h1>

                <FormGroup>
                    <Label>
                        Join Code
                    </Label>

                    <Input
                        type="text"
                        value={joinCode}
                        onChange={(event) =>
                            setJoinCode(
                                event.target.value.toUpperCase()
                            )
                        }
                        placeholder="Enter Message"
                    />
                </FormGroup>

                <FormGroup>
                    <Label>
                        Your Team Name
                    </Label>

                    <Input
                        type="text"
                        value={teamName}
                        onChange={(event) =>
                            setTeamName(event.target.value)
                        }
                        placeholder="Enter Message"
                    />
                </FormGroup>

                {error && (
                    <ErrorMessage>
                        {error}
                    </ErrorMessage>
                )}

                <JoinButton
                    onClick={handleJoinLeague}
                    disabled={loading}
                >
                    {loading ? 'Joining...' : 'Join League'}
                </JoinButton>
            </FormCard>
        </JoinPage>
    )
}