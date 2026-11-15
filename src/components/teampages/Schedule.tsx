import { useEffect, useState } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { BackButton } from '../../styles/commonstyles'
import { CURRENT_WEEK } from '../../bigseasonfile'
import { supabase } from '../lib/supabase'
import { finals, getPlayoffSize, advancePlayoffs, type PlayoffSize } from '../../utils/playoffs'

import { getTeams } from '../../api/cfbApi'
import { getWeeklyStats, getLiveTeamStats } from '../../api/weeklyStats'
import { calculateUnitScore, type ScoringUnitType } from '../../utils/scoring'

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

    @media (max-width: 700px) {
        padding: 16px 14px;
    }
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

    @media (max-width: 700px) {
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        gap: 8px;
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

    @media (max-width: 700px) {
        min-width: 75px;
        font-size: 0.9rem;
    }
`;


const SeasonToggle = styled.div`
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
`;

const SeasonButton = styled.button<{ $active: boolean }>`
    padding: 12px 20px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;

    background: ${({ $active }) =>
    $active ? '#1f2937' : '#ffffff'};

    color: ${({ $active }) =>
    $active ? '#ffffff' : '#374151'};

    &:hover:not(:disabled) {
        background: ${({ $active }) =>
    $active ? '#111827' : '#f3f4f6'};
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    @media (max-width: 700px) {
        flex: 1;
        padding: 10px 12px;
    }
`;

function playoffRoundName(week: number, size: PlayoffSize): string {
    const championshipWeek = finals(size)

    if (week === championshipWeek) {
        return 'Championship'
    }

    if (week === championshipWeek - 1) {
        return 'Semifinals'
    }

    return 'Quarterfinals'
}

export default function Schedule() {
    const { leagueId } = useParams()

    const [members, setMembers] = useState<LeagueMember[]>([])
    const [matchups, setMatchups] = useState<Matchup[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedSeason, setSelectedSeason] = useState<'regular' | 'postseason'>('regular')
    const navigate = useNavigate()
    const [playoffSize, setPlayoffSize] = useState<PlayoffSize | null>(null)
    const [liveScores, setLiveScores] = useState<Record<string, number>>({})

    useEffect(() => {
        if (!leagueId || CURRENT_WEEK < 11 || CURRENT_WEEK > 13) {
            return
        }

        let cancelled = false
        let refreshing = false

        async function refreshLiveScores() {
            if (refreshing || !leagueId) return

            refreshing = true

            try {
                const [collegeTeams, weeklyStats, rosterResult] = await Promise.all([
                    getTeams(),
                    getWeeklyStats(CURRENT_WEEK),
                    supabase
                        .from('weekly_rosters')
                        .select('league_member_id, college_team_id, unit_type, roster_slot')
                        .eq('league_id', leagueId)
                        .eq('week', CURRENT_WEEK)
                        .eq('roster_slot', 'STARTER')
                ])

                if (rosterResult.error) {
                    throw rosterResult.error
                }

                const teamMap = new Map(collegeTeams.map(team => [team.id, team]))
                const weeklyMap = new Map(
                    weeklyStats.map(team => [team.team.trim().toLowerCase(), team])
                )

                const totals: Record<string, number> = {}
                const now = new Date()

                await Promise.all(
                    (rosterResult.data ?? []).map(async row => {
                        const collegeTeam = teamMap.get(row.college_team_id)
                        if (!collegeTeam) return

                        const weeklyTeam = weeklyMap.get(collegeTeam.name.trim().toLowerCase())
                        const gameStart = weeklyTeam?.gameStart

                        if (!gameStart || now < gameStart) {
                            return
                        }

                        const liveTeam = await getLiveTeamStats(collegeTeam.name, CURRENT_WEEK)

                        if (!liveTeam?.stats) return

                        const score = calculateUnitScore(
                            row.unit_type as ScoringUnitType,
                            liveTeam.stats
                        )

                        totals[row.league_member_id] =
                            (totals[row.league_member_id] ?? 0) + score
                    })
                )

                if (!cancelled) {
                    setLiveScores(totals)
                }
            } catch (error) {
                console.error('Failed to refresh live schedule scores:', error)
            } finally {
                refreshing = false
            }
        }

        void refreshLiveScores()

        const interval = window.setInterval(() => {
            void refreshLiveScores()
        }, 15000)

        return () => {
            cancelled = true
            window.clearInterval(interval)
        }
    }, [leagueId])

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

                const leagueMembers = memberData ?? []

                setMembers(leagueMembers)
                setMatchups(matchupData ?? [])
                setPlayoffSize(getPlayoffSize(leagueMembers.length))
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

        void loadSchedule()
    }, [leagueId])

    useEffect(() => {
        if (!leagueId) {
            return
        }

        const interval = window.setInterval(() => {
            async function refreshScores() {
                const { data, error } = await supabase
                    .from('league_matchups')
                    .select('id, week, team1_id, team2_id, team1_score, team2_score, winner_id')
                    .eq('league_id', leagueId)
                    .order('week', { ascending: true })

                if (error) {
                    console.error('Failed to refresh matchup scores:', error)
                    return
                }

                setMatchups(data ?? [])
            }

            void refreshScores()
        }, 60000)

        return () => {
            window.clearInterval(interval)
        }
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

            <SeasonToggle>
                <SeasonButton $active={selectedSeason === 'regular'} onClick={() => setSelectedSeason('regular')}>
                    Regular Season
                </SeasonButton>

                <SeasonButton $active={selectedSeason === 'postseason'} disabled={CURRENT_WEEK < 11}
                    onClick={() => setSelectedSeason('postseason')}
                >
                    Postseason
                </SeasonButton>
            </SeasonToggle>

            {Array.from({length: selectedSeason === 'regular' ? 10 :
                playoffSize === null ? 0 : Math.max(0, Math.min(CURRENT_WEEK, finals(playoffSize)) - 10)},
                (_, index) => {
                    const week = selectedSeason === 'regular' ? index + 1 : index + 11
                    const weekMatchups = matchups.filter((matchup) => matchup.week === week)

                    return (
                        <WeekCard key={week}>
                            <WeekHeader to={`/league/${leagueId}/week-scores/${week}`}>
                                <h2>
                                    Week {week}
                                    {selectedSeason === 'postseason' && playoffSize !== null && ` — ${playoffRoundName(week, playoffSize)}`}
                                </h2>
                            </WeekHeader>

                            {weekMatchups.length === 0 ? (
                                <p>No matchups scheduled.</p>
                            ) : (
                                weekMatchups.map(
                                    (matchup) => {
                                        const team1Name = getTeamName(matchup.team1_id)
                                        const team2Name = getTeamName(matchup.team2_id)

                                        const isLiveWeek = week === CURRENT_WEEK && week >= 11 && week <= 13

                                        const team1Score =
                                            isLiveWeek ? liveScores[matchup.team1_id] ?? matchup.team1_score : matchup.team1_score

                                        const team2Score =
                                            isLiveWeek ? liveScores[matchup.team2_id] ?? matchup.team2_score : matchup.team2_score

                                        const hasScore = team1Score !== null && team2Score !== null

                                        return (
                                            <MatchupRow key={matchup.id}>
                                                <Team1>{team1Name}</Team1>

                                                <Score>
                                                    {hasScore ? `${team1Score?.toFixed(1)} - ${team2Score?.toFixed(1)}` : 'vs'}
                                                </Score>

                                                <Team2>{team2Name}</Team2>
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