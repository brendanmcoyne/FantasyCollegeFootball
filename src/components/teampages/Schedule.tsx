import { useEffect, useState } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { BackButton } from '../../styles/commonstyles'

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

const SchedulePage = styled.div`
    display: grid;
    gap: 24px;
`;

const WeekCard = styled.section`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 18px 22px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const WeekHeader = styled(Link)`
    text-decoration: none;
    color: #111827;

    h2 {
        margin-top: 0;
        margin-bottom: 14px;
    }

    &:hover {
        text-decoration: underline;
    }
`;

const MatchupRow = styled.div`
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 16px;
    padding: 12px 0;
    border-top: 1px solid #e5e7eb;

    &:first-of-type {
        border-top: none;
    }
`;

const TeamName = styled.div`
    font-weight: 700;
    color: #111827;
`;

const Team1 = styled(TeamName)`
    text-align: right;
`;

const Team2 = styled(TeamName)`
    text-align: left;
`;

const Score = styled.div`
    font-weight: 700;
    color: #374151;
    min-width: 110px;
    text-align: center;
`;

export default function Schedule() {
    const { leagueId } = useParams()

    const [members, setMembers] = useState<LeagueMember[]>([])
    const [matchups, setMatchups] = useState<Matchup[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        async function loadSchedule() {
            if (!leagueId) {
                setError('League ID is missing.')
                setLoading(false)
                return
            }

            try {
                const {data: memberData, error: memberError,} = await supabase
                    .from('league_members')
                    .select('id, team_name')
                    .eq('league_id', leagueId)

                if (memberError) {
                    throw memberError
                }

                const {data: matchupData, error: matchupError,} = await supabase
                    .from('league_matchups')
                    .select('id, week, team1_id, team2_id, team1_score, team2_score, winner_id')
                    .eq('league_id', leagueId)
                    .order('week', {ascending: true,})

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
        return (members.find((member) => member.id === memberId)?.team_name ?? 'Unknown Team')
    }

    if (loading) {
        return <p>Loading schedule...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    return (
        <SchedulePage>
            <BackButton onClick={() => navigate(-1)}>
                ← Back
            </BackButton>
            
            <h1>League Schedule</h1>

            {Array.from(
                { length: 10 },
                (_, index) => {
                    const week = index + 1
                    const weekMatchups = matchups.filter((matchup) => matchup.week === week)

                    return (
                        <WeekCard key={week}>
                            <WeekHeader to={`/league/${leagueId}/week-scores/${week}`}>
                                <h2>Week {week}</h2>
                            </WeekHeader>

                            {weekMatchups.length === 0 ? (
                                <p>No matchups scheduled.</p>
                            ) : (
                                weekMatchups.map(
                                    (matchup) => {
                                        const team1Name = getTeamName(matchup.team1_id)
                                        const team2Name = getTeamName(matchup.team2_id)

                                        const hasScore = matchup.team1_score !== null &&
                                            matchup.team2_score !== null

                                        return (
                                            <MatchupRow key={matchup.id}>
                                                <Team1>
                                                    {team1Name}
                                                </Team1>

                                                <Score>
                                                    {hasScore
                                                        ? `${matchup.team1_score?.toFixed(1)} - ${matchup.team2_score?.toFixed(1)}`
                                                        : 'vs'}
                                                </Score>

                                                <Team2>
                                                    {team2Name}
                                                </Team2>
                                            </MatchupRow>
                                        )
                                    }
                                )
                            )}
                        </WeekCard>
                    )
                }
            )}
        </SchedulePage>
    )
}