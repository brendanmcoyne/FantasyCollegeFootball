import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { getTeams } from '../../api/cfbApi'
import { getWeeklyStats } from '../../api/weeklyStats'
import { calculateUnitScore } from '../../utils/scoring'

import type { CollegeTeam } from '../../types/football'
import type { ScoringUnitType } from '../../utils/scoring'
import type { WeeklyTeamData } from '../../api/weeklyStats'

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
    const {leagueId, week: weekParam,} = useParams()

    const week = Number(weekParam)
    const [scores, setScores] = useState<FantasyTeamScore[]>([])
    const [matchups, setMatchups] = useState<LeagueMatchup[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadScores() {
            if (!leagueId) {
                setError('Missing league.')
                setLoading(false)
                return
            }

            if (!Number.isInteger(week) || week < 1 || week > 10) {
                setError('Invalid week.')
                setLoading(false)
                return
            }

            setLoading(true)
            setError('')

            try {
                const [weeklyStats, collegeTeams] = await Promise.all([getWeeklyStats(week), getTeams()])

                const {data: members, error: membersError} = await supabase
                    .from('league_members')
                    .select('id, team_name, joined_at')
                    .eq('league_id', leagueId)
                    .order('joined_at', {
                        ascending: true,
                    })

                if (membersError) {
                    throw membersError
                }

                const {data: rosterRows, error: rosterError} = await supabase
                    .from('roster_units')
                    .select('id, league_member_id, college_team_id, unit_type, roster_slot')
                    .eq('league_id', leagueId)

                if (rosterError) {
                    throw rosterError
                }

                const teamMap = new Map<number, CollegeTeam>()
                collegeTeams.forEach((team) => {teamMap.set(team.id, team)})

                const weeklyMap = new Map<string, WeeklyTeamData>()
                weeklyStats.forEach((team) => {weeklyMap.set(team.team.trim().toLowerCase(), team)})

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

                    const weeklyTeam = weeklyMap.get(collegeTeam.name.trim().toLowerCase())
                    const score = weeklyTeam ? calculateUnitScore(row.unit_type, weeklyTeam.stats) : 0

                    return {
                        rosterId:
                        row.id,
                        teamName:
                        collegeTeam.name,
                        unitType:
                        row.unit_type,
                        score,
                    }
                }

                const fantasyScores: FantasyTeamScore[] =
                    (members ?? []).map((member: LeagueMember) => {
                        const memberRoster =
                            (rosterRows ?? []).filter((row: RosterRow) => row.league_member_id === member.id)

                        const starters = memberRoster
                            .filter((row: RosterRow) => row.roster_slot === 'STARTER')
                            .map(scoreUnit)

                        const bench = memberRoster
                            .filter((row: RosterRow) => row.roster_slot === 'BENCH')
                            .map(scoreUnit)

                        const starterTotal = starters.reduce((total, unit) => total + unit.score, 0)
                        const benchTotal = bench.reduce((total, unit) => total + unit.score, 0)

                        return {
                            memberId: member.id,
                            teamName: member.team_name,

                            starters,
                            bench,

                            starterTotal,
                            benchTotal,
                        }
                    })

                const {data: weekMatchups, error: matchupError} = await supabase
                    .from('league_matchups')
                    .select('id, team1_id, team2_id')
                    .eq('league_id', leagueId)
                    .eq('week', week)

                if (matchupError) {
                    throw matchupError
                }

                const currentMatchups = (weekMatchups ?? []) as LeagueMatchup[]

                setMatchups(currentMatchups)

                for (const matchup of currentMatchups) {
                    const team1 =
                        fantasyScores.find((team) =>
                                team.memberId === matchup.team1_id
                        )

                    const team2 =
                        fantasyScores.find((team) =>
                                team.memberId === matchup.team2_id
                        )

                    if (!team1 || !team2) {
                        continue
                    }

                    const winnerId = (team1.starterTotal >= team2.starterTotal) ? matchup.team1_id : matchup.team2_id

                    const {error: updateError} = await supabase
                        .from('league_matchups')
                        .update({
                            team1_score: team1.starterTotal,
                            team2_score: team2.starterTotal,
                            winner_id: winnerId,
                        })
                        .eq('id', matchup.id)

                    if (updateError) {
                        throw updateError
                    }
                }

                setScores(fantasyScores)
            } catch (err) {
                if (
                    err instanceof Error
                ) {
                    setError(err.message)
                } else {
                    setError('Failed to load weekly scores.')
                }
            } finally {
                setLoading(false)
            }
        }

        loadScores()
    }, [leagueId, week])

    if (loading) {
        return (
            <p>Loading Week {week} scores...</p>
        )
    }

    if (error) {
        return <p>{error}</p>
    }

    return (
        <div>
            <h1>Week {week} League Scores</h1>

            <div>
                {Array.from(
                    { length: 10 },
                    (_, index) => {
                        const weekNumber = index + 1

                        return (
                            <Link
                                key={weekNumber}
                                to={`/league/${leagueId}/week-scores/${weekNumber}`}
                                style={{marginRight: '10px'}}
                            >
                                Week{' '}
                                {weekNumber}
                            </Link>
                        )
                    }
                )}
            </div>

            <hr />

            <h2>Matchups</h2>

            {matchups.length === 0 ? (
                <p></p>
            ) : (
                matchups.map(
                    (matchup) => {
                        const team1 =
                            scores.find((team) =>
                                    team.memberId === matchup.team1_id
                            )

                        const team2 =
                            scores.find((team) =>
                                    team.memberId === matchup.team2_id
                            )

                        if (!team1 || !team2) {
                            return null
                        }

                        const team1Won = team1.starterTotal >= team2.starterTotal
                        const team2Won = !team1Won

                        return (
                            <section key={matchup.id}>
                                <h3>
                                    {team1Won ? 'Winner: ' : ''}
                                    {team1.teamName}
                                    {' — '}
                                    {team1.starterTotal.toFixed(1)}
                                    {' vs '}
                                    {team2.starterTotal.toFixed(1)}
                                    {' — '}
                                    {team2Won ? 'Winner: ' : ''}
                                    {team2.teamName}
                                </h3>
                            </section>
                        )
                    }
                )
            )}

            <hr />

            <h2>Team Score Breakdowns</h2>

            {scores.map((team) => {
                const orderedStarters =
                    [...team.starters,].sort(
                        (a, b) =>
                            UNIT_ORDER.indexOf(a.unitType) - UNIT_ORDER.indexOf(b.unitType)
                    )

                const orderedBench =
                    [...team.bench].sort(
                        (a, b) =>
                            UNIT_ORDER.indexOf(a.unitType) - UNIT_ORDER.indexOf(b.unitType)
                    )

                return (
                    <section key={team.memberId}>
                        <h2>
                            {team.teamName}{' '}
                            —{' '}
                            {team.starterTotal.toFixed(1)}
                        </h2>

                        <h3>Starters</h3>

                        {orderedStarters.map(
                            (unit) => (
                                <div key={unit.rosterId}>
                                    {unit.teamName}{' '}
                                    {formatUnitType(unit.unitType)}
                                    {' — '}
                                    {unit.score.toFixed(1)}
                                </div>
                            )
                        )}

                        <p>
                            <strong>
                                Starter
                                Total:{' '}
                                {team.starterTotal.toFixed(1)}
                            </strong>
                        </p>

                        <h3>Bench</h3>

                        {orderedBench.length ===
                        0 ? (<p>No bench units.</p>) : (
                            orderedBench.map(
                                (unit) => (
                                    <div key={unit.rosterId}>
                                        {unit.teamName}{' '}
                                        {formatUnitType(unit.unitType)}
                                        {' — '}
                                        {unit.score.toFixed(1)}
                                    </div>
                                )
                            )
                        )}

                        <p>
                            <strong>
                                Bench Total:{' '}
                                {team.benchTotal.toFixed(1)}
                            </strong>
                        </p>

                        <hr />
                    </section>
                )
            })}
        </div>
    )
}

function formatUnitType(unitType: ScoringUnitType): string {
    if (unitType === 'SPECIAL_TEAMS') {
        return 'Special Teams'
    }

    return (unitType.charAt(0) + unitType.slice(1).toLowerCase())
}