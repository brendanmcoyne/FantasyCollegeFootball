import { useEffect, useState } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { getTeams } from '../../api/cfbApi'
import { getWeeklyStats } from '../../api/weeklyStats'
import { calculateUnitScore } from '../../utils/scoring'
import { CURRENT_WEEK } from '../../bigseasonfile'
import styled from 'styled-components'

import type { CollegeTeam } from '../../types/football'
import type { ScoringUnitType } from '../../utils/scoring'
import type { WeeklyTeamData } from '../../api/weeklyStats'
import {BackButton} from "../../styles/commonstyles";

interface RosterRow {
    id: string
    league_member_id: string
    college_team_id: number
    unit_type: ScoringUnitType
    roster_slot: 'STARTER' | 'BENCH'
}

interface ScoredUnit {
    rosterId: string
    teamName: string
    unitType: ScoringUnitType
    score: number
}

interface FantasyTeamScore {
    memberId: string
    teamName: string
    starterTotal: number
    benchTotal: number
    starters: ScoredUnit[]
    bench: ScoredUnit[]
}

interface LeagueMatchup {
    id: string
    team1_id: string
    team2_id: string
}

const UNIT_ORDER: ScoringUnitType[] = [
    'PASSING',
    'RUSHING',
    'RECEIVING',
    'DEFENSE',
    'SPECIAL_TEAMS',
]

const ScoresPage = styled.div`
    display: grid;
    gap: 24px;
`

const HeaderCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`

const WeekLinks = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`

const WeekLink = styled(Link)<{ $active?: boolean }>`
    padding: 8px 12px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    background: ${({ $active }) =>
    $active ? '#1f2937' : '#ffffff'};
    color: ${({ $active }) =>
    $active ? '#ffffff' : '#374151'};
    border: 1px solid #d1d5db;

    &:hover {
        background: ${({ $active }) =>
    $active ? '#111827' : '#f3f4f6'};
    }
`

const Status = styled.span`
    display: inline-block;
    padding: 5px 10px;
    border-radius: 999px;
    background: #e5e7eb;
    font-weight: 700;
    color: #374151;
`

const SectionCard = styled.section`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`

const MatchupRow = styled.div`
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 16px;
    align-items: center;
    padding: 12px 0;
    border-top: 1px solid #e5e7eb;
`

const TeamLeft = styled.div`
    text-align: right;
    font-weight: 700;
`

const TeamRight = styled.div`
    text-align: left;
    font-weight: 700;
`

const MatchupScore = styled.div`
    font-weight: 700;
    color: #374151;
    min-width: 110px;
    text-align: center;
`

const TeamScoreCard = styled.div`
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 14px;
`

const UnitRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 7px 0;
    border-bottom: 1px solid #e5e7eb;

    &:last-child {
        border-bottom: none;
    }
`

const MatchupCard = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
    margin-top: 14px;
`

const MatchupTeam = styled.div`
    padding: 18px;
`

const MatchupTeamHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e5e7eb;
`

const MatchupTeamName = styled.h3`
    margin: 0;
`

const BigScore = styled.div`
    font-size: 1.6rem;
    font-weight: 700;
`

const ScoreUnit = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
`

export default function WeekScores() {
    const { leagueId, week: weekParam } = useParams()
    const week = Number(weekParam)

    const [scores, setScores] = useState<FantasyTeamScore[]>([])
    const [matchups, setMatchups] = useState<LeagueMatchup[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const weekStarted = week <= CURRENT_WEEK
    const weekComplete = week < CURRENT_WEEK

    useEffect(() => {
        async function loadScores() {
            if (!leagueId || week < 1 || week > 10) {
                setError('Invalid league or week.')
                setLoading(false)
                return
            }

            setLoading(true)
            setError('')

            try {
                const [weeklyStats, collegeTeams] = await Promise.all([
                    getWeeklyStats(week),
                    getTeams(),
                ])

                const { data: members, error: membersError } = await supabase
                    .from('league_members')
                    .select('id, team_name')
                    .eq('league_id', leagueId)

                if (membersError) throw membersError

                const { data: rosterRows, error: rosterError } = await supabase
                    .from('roster_units')
                    .select(
                        'id, league_member_id, college_team_id, unit_type, roster_slot'
                    )
                    .eq('league_id', leagueId)

                if (rosterError) throw rosterError

                const teamMap = new Map<number, CollegeTeam>(
                    collegeTeams.map((team) => [team.id, team])
                )

                const weeklyMap = new Map<string, WeeklyTeamData>(
                    weeklyStats.map((team) => [
                        team.team.trim().toLowerCase(),
                        team,
                    ])
                )

                const now = new Date()

                function scoreUnit(row: RosterRow): ScoredUnit {
                    const collegeTeam =
                        teamMap.get(row.college_team_id)

                    if (!collegeTeam) {
                        return {
                            rosterId: row.id,
                            teamName: 'Unknown Team',
                            unitType: row.unit_type,
                            score: 0,
                        }
                    }

                    const weeklyTeam = weeklyMap.get(
                        collegeTeam.name.trim().toLowerCase()
                    )

                    const gameStarted =
                        weeklyTeam?.gameStart &&
                        now >= weeklyTeam.gameStart

                    return {
                        rosterId: row.id,
                        teamName: collegeTeam.name,
                        unitType: row.unit_type,
                        score:
                            weeklyTeam &&
                            gameStarted &&
                            weekStarted
                                ? calculateUnitScore(
                                    row.unit_type,
                                    weeklyTeam.stats
                                )
                                : 0,
                    }
                }

                const fantasyScores: FantasyTeamScore[] =
                    (members ?? []).map((member) => {
                        const roster = (rosterRows ?? []).filter(
                            (row: RosterRow) =>
                                row.league_member_id === member.id
                        )

                        const starters = roster
                            .filter(
                                (row: RosterRow) =>
                                    row.roster_slot === 'STARTER'
                            )
                            .map(scoreUnit)

                        const bench = roster
                            .filter(
                                (row: RosterRow) =>
                                    row.roster_slot === 'BENCH'
                            )
                            .map(scoreUnit)

                        return {
                            memberId: member.id,
                            teamName: member.team_name,
                            starters,
                            bench,
                            starterTotal: starters.reduce(
                                (total, unit) => total + unit.score,
                                0
                            ),
                            benchTotal: bench.reduce(
                                (total, unit) => total + unit.score,
                                0
                            ),
                        }
                    })

                const { data: weekMatchups, error: matchupError } =
                    await supabase
                        .from('league_matchups')
                        .select('id, team1_id, team2_id')
                        .eq('league_id', leagueId)
                        .eq('week', week)

                if (matchupError) throw matchupError

                const currentMatchups =
                    (weekMatchups ?? []) as LeagueMatchup[]

                setMatchups(currentMatchups)

                for (const matchup of currentMatchups) {
                    const team1 = fantasyScores.find(
                        (team) => team.memberId === matchup.team1_id
                    )

                    const team2 = fantasyScores.find(
                        (team) => team.memberId === matchup.team2_id
                    )

                    if (!team1 || !team2) continue

                    const { error: updateError } = await supabase
                        .from('league_matchups')
                        .update(
                            weekComplete
                                ? {
                                    team1_score: team1.starterTotal,
                                    team2_score: team2.starterTotal,
                                    winner_id:
                                        team1.starterTotal >=
                                        team2.starterTotal
                                            ? matchup.team1_id
                                            : matchup.team2_id,
                                }
                                : {
                                    team1_score: null,
                                    team2_score: null,
                                    winner_id: null,
                                }
                        )
                        .eq('id', matchup.id)

                    if (updateError) throw updateError
                }

                setScores(fantasyScores)
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load weekly scores.'
                )
            } finally {
                setLoading(false)
            }
        }

        loadScores()
    }, [leagueId, week, weekStarted, weekComplete])

    if (loading) {
        return <p>Loading Week {week} scores...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    return (
        <ScoresPage>
            <HeaderCard>
            <BackButton onClick={() => navigate(`/league/${leagueId}`)}>
                ← Back
            </BackButton>

            <h1>Week {week} League Scores</h1>

                <WeekLinks>
                    {Array.from({ length: 10 }, (_, index) => {
                        const weekNumber = index + 1

                        return (
                            <WeekLink
                                key={weekNumber}
                                to={`/league/${leagueId}/week-scores/${weekNumber}`}
                                $active={weekNumber === week}
                            >
                                Week {weekNumber}
                            </WeekLink>
                        )
                    })}
                </WeekLinks>

            <p>
                <Status>{weekComplete ? 'Final' : weekStarted ? 'In Progress' : 'Not Started'}</Status>
            </p>
            </HeaderCard>
            <hr />

            <SectionCard>
            <h2>Matchups</h2>

            {matchups.map((matchup) => {
                const team1 = scores.find(
                    (team) => team.memberId === matchup.team1_id
                )

                const team2 = scores.find(
                    (team) => team.memberId === matchup.team2_id
                )

                if (!team1 || !team2) return null

                if (!weekStarted) {
                    return (
                        <h3 key={matchup.id}>{team1.teamName} vs {team2.teamName}</h3>
                    )
                }

                return (
                    <MatchupCard key={matchup.id}>
                        <MatchupTeam>
                            <MatchupTeamHeader>
                                <MatchupTeamName>
                                    {team1.teamName}
                                </MatchupTeamName>

                                <BigScore>
                                    {weekStarted
                                        ? team1.starterTotal.toFixed(1)
                                        : '-'}
                                </BigScore>
                            </MatchupTeamHeader>

                            {[...team1.starters]
                                .sort(
                                    (a, b) =>
                                        UNIT_ORDER.indexOf(a.unitType) -
                                        UNIT_ORDER.indexOf(b.unitType)
                                )
                                .map((unit) => (
                                <ScoreUnit key={unit.rosterId}>
                                <span>
                                    {unit.teamName}{' '}
                                    {formatUnitType(unit.unitType)}
                                </span>

                                    <strong>
                                        {unit.score.toFixed(1)}
                                    </strong>
                                </ScoreUnit>
                            ))}

                            <h4>Bench</h4>

                            {team1.bench.map((unit) => (
                                <div key={unit.rosterId}>
                                    {unit.teamName}{' '}
                                    {formatUnitType(unit.unitType)}
                                </div>
                            ))}
                        </MatchupTeam>

                        <MatchupTeam>
                            <MatchupTeamHeader>
                                <MatchupTeamName>
                                    {team2.teamName}
                                </MatchupTeamName>

                                <BigScore>
                                    {weekStarted
                                        ? team2.starterTotal.toFixed(1)
                                        : '-'}
                                </BigScore>
                            </MatchupTeamHeader>

                            {[...team2.starters]
                                .sort(
                                    (a, b) =>
                                        UNIT_ORDER.indexOf(a.unitType) -
                                        UNIT_ORDER.indexOf(b.unitType)
                                )
                                .map((unit) => (
                                <ScoreUnit key={unit.rosterId}>
                                <span>
                                    {unit.teamName}{' '}
                                    {formatUnitType(unit.unitType)}
                                </span>

                                    <strong>
                                        {unit.score.toFixed(1)}
                                    </strong>
                                </ScoreUnit>
                            ))}
                            <h4>Bench</h4>

                            {team2.bench.map((unit) => (
                                <div key={unit.rosterId}>
                                    {unit.teamName}{' '}
                                    {formatUnitType(unit.unitType)}
                                </div>
                            ))}
                        </MatchupTeam>
                    </MatchupCard>
                )
            })}
            </SectionCard>
            <hr />

        </ScoresPage>
    )
}

function formatUnitType(unitType: ScoringUnitType): string {
    return unitType === 'SPECIAL_TEAMS' ? 'Special Teams' : unitType.charAt(0) + unitType.slice(1).toLowerCase()
}