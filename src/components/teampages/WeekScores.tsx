import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { getTeams } from '../../api/cfbApi'
import { getWeeklyStats } from '../../api/weeklyStats'
import { calculateUnitScore } from '../../utils/scoring'

import type { CollegeTeam } from '../../types/football'
import type { ScoringUnitType } from '../../utils/scoring'
import type { WeeklyTeamData } from '../../api/weeklyStats'

import {createRegularSeasonSchedule, type ScheduleTeam} from '../../utils/leagueschedule'

interface LeagueMember {
    id: string
    team_name: string
    joined_at: string
}

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

const UNIT_ORDER: ScoringUnitType[] = [
    'PASSING',
    'RUSHING',
    'RECEIVING',
    'DEFENSE',
    'SPECIAL_TEAMS',
]

function formatUnitType(unitType: ScoringUnitType): string {
    if (unitType === 'SPECIAL_TEAMS') {
        return 'Special Teams'
    }

    return (unitType.charAt(0) + unitType.slice(1).toLowerCase())
}

export default function WeekScores() {
    const { leagueId } = useParams()

    const [scores, setScores] = useState<FantasyTeamScore[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadScores() {
            if (!leagueId) {
                setError('Missing league.')
                setLoading(false)
                return
            }

            try {
                const week = 1

                const [weeklyStats, collegeTeams] =
                    await Promise.all([
                        getWeeklyStats(week),
                        getTeams(),
                    ])

                const {
                    data: members,
                    error: membersError,
                } = await supabase
                    .from('league_members')
                    .select('id, team_name, joined_at')
                    .eq('league_id', leagueId)
                    .order('joined_at', {
                        ascending: true,
                    })

                if (membersError) {
                    throw membersError
                }

                const {
                    data: rosterRows,
                    error: rosterError,
                } = await supabase
                    .from('roster_units')
                    .select(
                        'id, league_member_id, college_team_id, unit_type, roster_slot'
                    )
                    .eq('league_id', leagueId)

                if (rosterError) {
                    throw rosterError
                }

                const teamMap =
                    new Map<number, CollegeTeam>()

                collegeTeams.forEach((team) => {
                    teamMap.set(team.id, team)
                })

                const weeklyMap =
                    new Map<string, WeeklyTeamData>()

                weeklyStats.forEach((team) => {
                    weeklyMap.set(
                        team.team
                            .trim()
                            .toLowerCase(),
                        team
                    )
                })

                function scoreUnit(
                    row: RosterRow
                ): ScoredUnit {
                    const collegeTeam =
                        teamMap.get(
                            row.college_team_id
                        )

                    if (!collegeTeam) {
                        return {
                            rosterId: row.id,
                            teamName: 'Unknown Team',
                            unitType: row.unit_type,
                            score: 0,
                        }
                    }

                    const weeklyTeam =
                        weeklyMap.get(
                            collegeTeam.name
                                .trim()
                                .toLowerCase()
                        )

                    const score = weeklyTeam
                        ? calculateUnitScore(
                            row.unit_type,
                            weeklyTeam.stats
                        )
                        : 0

                    return {
                        rosterId: row.id,
                        teamName: collegeTeam.name,
                        unitType: row.unit_type,
                        score,
                    }
                }

                const fantasyScores: FantasyTeamScore[] =
                    (members ?? []).map(
                        (member: LeagueMember) => {
                            const memberRoster =
                                (rosterRows ?? []).filter(
                                    (
                                        row: RosterRow
                                    ) =>
                                        row.league_member_id ===
                                        member.id
                                )

                            const starters =
                                memberRoster
                                    .filter(
                                        (
                                            row: RosterRow
                                        ) =>
                                            row.roster_slot ===
                                            'STARTER'
                                    )
                                    .map(scoreUnit)

                            const bench =
                                memberRoster
                                    .filter(
                                        (
                                            row: RosterRow
                                        ) =>
                                            row.roster_slot ===
                                            'BENCH'
                                    )
                                    .map(scoreUnit)

                            const starterTotal =
                                starters.reduce(
                                    (
                                        total,
                                        unit
                                    ) =>
                                        total +
                                        unit.score,
                                    0
                                )

                            const benchTotal =
                                bench.reduce(
                                    (
                                        total,
                                        unit
                                    ) =>
                                        total +
                                        unit.score,
                                    0
                                )

                            return {
                                memberId: member.id,
                                teamName:
                                member.team_name,
                                starters,
                                bench,
                                starterTotal,
                                benchTotal,
                            }
                        }
                    )

                setScores(fantasyScores)
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message)
                } else {
                    setError(
                        'Failed to load weekly scores.'
                    )
                }
            } finally {
                setLoading(false)
            }
        }

        loadScores()
    }, [leagueId])

    if (loading) {
        return <p>Loading Week 1 scores...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    const scheduleTeams: ScheduleTeam[] = scores.map((team) => ({
        id: team.memberId,
        teamName: team.teamName,
    }))

    const schedule =
        scores.length === 6
            ? createRegularSeasonSchedule(scheduleTeams)
            : []

    const currentWeek = 1

    const weekMatchups = schedule.filter(
        (matchup) => matchup.week === currentWeek
    )

    return (
        <div>
            <h1>Week 1 League Scores</h1>

            <h2>Matchups</h2>

            {scores.length !== 6 ? (
                <p>
                </p>
            ) : (
                weekMatchups.map((matchup) => {
                    const team1 = scores.find(
                        (team) => team.memberId === matchup.team1Id
                    )

                    const team2 = scores.find(
                        (team) => team.memberId === matchup.team2Id
                    )

                    if (!team1 || !team2) {
                        return null
                    }

                    return (
                        <div
                            key={`${matchup.team1Id}-${matchup.team2Id}`}
                        >
                            <h3>
                                {team1.teamName}
                                {' — '}
                                {team1.starterTotal.toFixed(1)}
                                {' vs '}
                                {team2.starterTotal.toFixed(1)}
                                {' — '}
                                {team2.teamName}
                            </h3>
                        </div>
                    )
                })
            )}

            {scores.map((team) => {
                const orderedStarters =
                    [...team.starters].sort(
                        (a, b) =>
                            UNIT_ORDER.indexOf(
                                a.unitType
                            ) -
                            UNIT_ORDER.indexOf(
                                b.unitType
                            )
                    )

                const orderedBench =
                    [...team.bench].sort(
                        (a, b) =>
                            UNIT_ORDER.indexOf(
                                a.unitType
                            ) -
                            UNIT_ORDER.indexOf(
                                b.unitType
                            )
                    )

                return (
                    <section key={team.memberId}>
                        <h2>
                            {team.teamName} —{' '}
                            {team.starterTotal.toFixed(
                                1
                            )}
                        </h2>

                        <h3>Starters</h3>

                        {orderedStarters.map(
                            (unit) => (
                                <div
                                    key={
                                        unit.rosterId
                                    }
                                >
                                    {unit.teamName}{' '}
                                    {formatUnitType(
                                        unit.unitType
                                    )}
                                    {' — '}
                                    {unit.score.toFixed(
                                        1
                                    )}
                                </div>
                            )
                        )}

                        <h3>
                            Bench —{' '}
                            {team.benchTotal.toFixed(
                                1
                            )}
                        </h3>

                        {orderedBench.length ===
                        0 ? (
                            <p>No bench units.</p>
                        ) : (
                            orderedBench.map(
                                (unit) => (
                                    <div
                                        key={
                                            unit.rosterId
                                        }
                                    >
                                        {
                                            unit.teamName
                                        }{' '}
                                        {formatUnitType(
                                            unit.unitType
                                        )}
                                        {' — '}
                                        {unit.score.toFixed(
                                            1
                                        )}
                                    </div>
                                )
                            )
                        )}

                        <hr />
                    </section>
                )
            })}


        </div>
    )
}