import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { getTeams } from '../../api/cfbApi'
import { getWeeklyStats } from '../../api/weeklyStats'
import { calculateUnitScore } from '../../utils/scoring'
import { CURRENT_WEEK } from '../../bigseasonfile'

import type { CollegeTeam } from '../../types/football'
import type { ScoringUnitType } from '../../utils/scoring'
import type { WeeklyTeamData } from '../../api/weeklyStats'

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

export default function WeekScores() {
    const { leagueId, week: weekParam } = useParams()
    const week = Number(weekParam)

    const [scores, setScores] = useState<FantasyTeamScore[]>([])
    const [matchups, setMatchups] = useState<LeagueMatchup[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

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
        <div>
            <h1>Week {week} League Scores</h1>

            <div>
                {Array.from({ length: 10 }, (_, index) => (
                    <Link
                        key={index + 1}
                        to={`/league/${leagueId}/week-scores/${index + 1}`}
                        style={{ marginRight: '10px' }}
                    >
                        Week {index + 1}
                    </Link>
                ))}
            </div>

            <p>
                <strong>
                    {weekComplete
                        ? 'Final'
                        : weekStarted
                            ? 'In Progress'
                            : 'Not Started'}
                </strong>
            </p>

            <hr />

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
                        <h3 key={matchup.id}>
                            {team1.teamName} vs {team2.teamName}
                        </h3>
                    )
                }

                const team1Won =
                    team1.starterTotal >= team2.starterTotal

                return (
                    <h3 key={matchup.id}>
                        {weekComplete && team1Won ? 'Winner: ' : ''}
                        {team1.teamName} — {team1.starterTotal.toFixed(1)}
                        {' vs '}
                        {team2.starterTotal.toFixed(1)} —{' '}
                        {weekComplete && !team1Won ? 'Winner: ' : ''}
                        {team2.teamName}
                    </h3>
                )
            })}

            <hr />

            <h2>Team Score Breakdowns</h2>

            {scores.map((team) => {
                const starters = [...team.starters].sort(
                    (a, b) =>
                        UNIT_ORDER.indexOf(a.unitType) -
                        UNIT_ORDER.indexOf(b.unitType)
                )

                const bench = [...team.bench].sort(
                    (a, b) =>
                        UNIT_ORDER.indexOf(a.unitType) -
                        UNIT_ORDER.indexOf(b.unitType)
                )

                return (
                    <section key={team.memberId}>
                        <h2>
                            {team.teamName} — {team.starterTotal.toFixed(1)}
                        </h2>

                        <h3>Starters</h3>

                        {starters.map((unit) => (
                            <div key={unit.rosterId}>
                                {unit.teamName}{' '}
                                {formatUnitType(unit.unitType)}
                                {' — '}
                                {unit.score.toFixed(1)}
                            </div>
                        ))}

                        <h3>Bench</h3>

                        {bench.map((unit) => (
                            <div key={unit.rosterId}>
                                {unit.teamName}{' '}
                                {formatUnitType(unit.unitType)}
                                {' — '}
                                {unit.score.toFixed(1)}
                            </div>
                        ))}

                        <hr />
                    </section>
                )
            })}
        </div>
    )
}

function formatUnitType(unitType: ScoringUnitType): string {
    return unitType === 'SPECIAL_TEAMS'
        ? 'Special Teams'
        : unitType.charAt(0) + unitType.slice(1).toLowerCase()
}