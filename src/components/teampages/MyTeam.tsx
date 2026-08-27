import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'
import { getTeams } from '../../api/cfbApi'
import { getWeeklyStats } from '../../api/weeklyStats'

import { getTeamOpponent } from '../../utils/teamschedule'
import { CURRENT_WEEK } from '../../bigseasonfile'

import {STARTERS, BENCH, type RosterUnitType,} from '../../rosters'

import type { CollegeTeam } from '../../types/football'
import type { WeeklyTeamData } from '../../api/weeklyStats'

import styled from 'styled-components'

import { Card } from '../../styles/commonstyles'
import { getTeamLogo, TeamLogo } from '../../styles/logos'

interface LeagueMember {
    id: string
    team_name: string
}

interface RosterUnit {
    id: string
    collegeTeamId: number
    teamName: string
    unitType: RosterUnitType
    rosterSlot: 'STARTER' | 'BENCH'
    acquiredVia: 'DRAFT' | 'FREE_AGENCY'
    gameStart: Date | null
    locked: boolean
}

interface RosterSectionProps {
    title: string
    units: RosterUnit[]
    max: number
}

const SectionCard = styled(Card)`
    margin-bottom: 20px;
`

const UnitList = styled.div`
    display: grid;
    gap: 10px;
`

const UnitRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
`

const UnitInfo = styled.div`
    flex: 1;
`

const UnitName = styled.div`
    font-weight: 700;
    color: #111827;
`

const UnitDetails = styled.div`
    margin-top: 3px;
    color: #6b7280;
    font-size: 0.9rem;
`

export default function MyTeam() {
    const { leagueId } = useParams()
    const { user } = useAuth()

    const [teamName, setTeamName] = useState('')
    const [roster, setRoster] = useState<RosterUnit[]>([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [selectedBenchUnit, setSelectedBenchUnit] = useState<RosterUnit | null>(null)

    useEffect(() => {
        async function loadRoster() {
            if (!leagueId || !user) {
                setError('Missing league or user.')
                setLoading(false)
                return
            }

            try {
                const {data: member, error: memberError} = await supabase
                    .from('league_members')
                    .select('id, team_name')
                    .eq('league_id', leagueId)
                    .eq('user_id', user.id)
                    .single()

                if (memberError) {
                    throw memberError
                }

                const leagueMember = member as LeagueMember

                setTeamName(leagueMember.team_name)

                const {data: rosterData, error: rosterError} = await supabase
                    .from('roster_units')
                    .select('id, college_team_id, unit_type, roster_slot, acquired_via')
                    .eq('league_id', leagueId)
                    .eq('league_member_id', leagueMember.id)

                if (rosterError) {
                    throw rosterError
                }

                const teams = await getTeams()
                const teamMap = new Map<number, CollegeTeam>()

                teams.forEach((team) => {teamMap.set(team.id, team)})

                const weeklyStats = await getWeeklyStats(CURRENT_WEEK)
                const weeklyMap = new Map<string, WeeklyTeamData>()

                weeklyStats.forEach(
                    (team) => {
                        weeklyMap.set(normalizeTeamName(team.team), team)
                    }
                )

                const now = new Date()

                const rosterUnits: RosterUnit[] =
                    (rosterData ?? []).map(
                        (unit) => {
                            const collegeTeam = teamMap.get(unit.college_team_id)
                            const collegeTeamName = collegeTeam?.name ?? 'Unknown Team'
                            const weeklyTeam = weeklyMap.get(normalizeTeamName(collegeTeamName))
                            const gameStart = weeklyTeam?.gameStart ?? null

                            return {
                                id: unit.id,
                                collegeTeamId: unit.college_team_id,
                                teamName: collegeTeamName,
                                unitType: unit.unit_type as RosterUnitType,
                                rosterSlot: unit.roster_slot as | 'STARTER' | 'BENCH',
                                acquiredVia: unit.acquired_via as | 'DRAFT' | 'FREE_AGENCY',

                                gameStart,

                                locked: isGameLocked(gameStart, now),
                            }
                        }
                    )

                setRoster(rosterUnits)
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message)
                } else {
                    setError(
                        'Failed to load roster.'
                    )
                }
            } finally {
                setLoading(false)
            }
        }

        loadRoster()
    }, [leagueId, user])

    useEffect(() => {
        const interval = window.setInterval(() => {const now = new Date()
            setRoster(
                (currentRoster) => currentRoster.map(
                    (unit) => ({...unit, locked: isGameLocked(unit.gameStart, now),})
                )
            )

            setSelectedBenchUnit((currentUnit) => {
                if (!currentUnit) {
                    return null
                }

                return {...currentUnit, locked: isGameLocked(currentUnit.gameStart, now),}
            }
        )
    }, 30000)

        return () => {window.clearInterval(interval)}
    }, [])

    if (loading) {
        return <p>Loading roster...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    const starters = roster.filter((unit) => unit.rosterSlot === 'STARTER')
    const bench = roster.filter((unit) => unit.rosterSlot === 'BENCH')
    const passing = starters.filter((unit) => unit.unitType === 'PASSING')
    const rushing = starters.filter((unit) => unit.unitType === 'RUSHING')
    const receiving = starters.filter((unit) => unit.unitType === 'RECEIVING')
    const defense = starters.filter((unit) => unit.unitType === 'DEFENSE')
    const specialTeams = starters.filter((unit) => unit.unitType === 'SPECIAL_TEAMS')

    async function swapUnits(benchUnit: RosterUnit, starterUnit: RosterUnit) {
        if (!leagueId || !user) {
            return
        }

        const currentBenchUnit = roster.find((unit) => unit.id === benchUnit.id)
        const currentStarterUnit = roster.find((unit) => unit.id === starterUnit.id)

        if (!currentBenchUnit || !currentStarterUnit) {
            setError('Could not find one of the roster units.')
            return
        }

        if (currentBenchUnit.locked || currentStarterUnit.locked) {
            setError('You cannot swap a unit after its game has started.')
            return
        }

        if (currentBenchUnit.unitType !== currentStarterUnit.unitType) {
            setError('You can only swap units of the same type.')
            return
        }

        setError('')

        const {data: member, error: memberError} = await supabase
            .from('league_members')
            .select('id')
            .eq('league_id', leagueId)
            .eq('user_id', user.id)
            .single()

        if (memberError) {
            setError(memberError.message)
            return
        }

        const {error: swapError,} = await supabase.rpc('swap_roster_units', {
                target_league_id: leagueId,
                target_league_member_id: member.id,
                bench_unit_id: currentBenchUnit.id,
                starter_unit_id: currentStarterUnit.id,
            }
        )

        if (swapError) {
            setError(swapError.message)
            return
        }

        setRoster(
            (currentRoster) =>
                currentRoster.map(
                    (unit) => {
                        if (unit.id === currentBenchUnit.id) {
                            return {...unit, rosterSlot: 'STARTER'}
                        }

                        if (unit.id === currentStarterUnit.id) {
                            return {...unit, rosterSlot: 'BENCH'}
                        }

                        return unit
                    }
                )
        )

        setSelectedBenchUnit(null)
    }

    function RosterSection({title, units, max}: RosterSectionProps) {
        return (
            <section>
                <h3>{title} ({units.length}/{max})</h3>

                {units.length === 0 ? (<p>Empty</p>) : (
                    <UnitList>
                        {units.map(
                            (unit) => (
                                <UnitRow key={unit.id}>
                                    <TeamLogo
                                        src={getTeamLogo(unit.teamName)}
                                        alt={unit.teamName}
                                    />

                                    <UnitInfo>
                                        <UnitName>
                                            {unit.teamName} {formatUnitType(unit.unitType)}
                                        </UnitName>

                                        <UnitDetails>
                                            vs {getTeamOpponent(unit.teamName, CURRENT_WEEK) ?? 'Unknown'}

                                            {unit.gameStart && (
                                                <>
                                                    {' • '}
                                                    {formatGameStart(unit.gameStart)}
                                                </>
                                            )}

                                            {unit.locked && (
                                                <>
                                                    {' • '}
                                                    <strong>Locked</strong>
                                                </>
                                            )}
                                        </UnitDetails>
                                    </UnitInfo>
                                </UnitRow>
                            )
                        )}
                    </UnitList>
                )}
            </section>
        )
    }

    function formatUnitType(unitType: RosterUnitType) {
        if (
            unitType === 'SPECIAL_TEAMS'
        ) {
            return 'Special Teams'
        }

        return (
            unitType.charAt(0) + unitType.slice(1).toLowerCase()
        )
    }

    function canMoveDirectlyToStarter(
        unit: RosterUnit
    ) {
        const starterCount =
            starters.filter(
                (starter) =>
                    starter.unitType === unit.unitType).length

        return (starterCount < STARTERS[unit.unitType])
    }

    async function moveToStarter(unit: RosterUnit) {
        if (!leagueId || !user) {
            return
        }

        const currentUnit = roster.find((rosterUnit) => rosterUnit.id === unit.id)

        if (!currentUnit) {
            setError('Could not find that roster unit.')
            return
        }

        if (currentUnit.locked) {
            setError('You cannot move a unit after its game has started.')
            return
        }

        setError('')

        const {data: member, error: memberError} = await supabase
            .from('league_members')
            .select('id')
            .eq('league_id', leagueId)
            .eq('user_id', user.id)
            .single()

        if (memberError) {
            setError(memberError.message)
            return
        }

        const {error: moveError,} = await supabase.rpc('move_roster_unit_to_starter',
            {
                target_league_id: leagueId,
                target_league_member_id: member.id,
                target_roster_unit_id: currentUnit.id,
            }
        )

        if (moveError) {
            setError(moveError.message)
            return
        }

        setRoster(
            (currentRoster) =>
                currentRoster.map((rosterUnit) =>
                    rosterUnit.id === currentUnit.id ? {...rosterUnit, rosterSlot: 'STARTER'} : rosterUnit
                )
        )
    }

    return (
        <div>
            <h1>{teamName}</h1>

            <p>Week {CURRENT_WEEK}</p>

            <h2>Starters</h2>

            <RosterSection title="Passing" units={passing} max={STARTERS.PASSING}/>
            <RosterSection title="Rushing" units={rushing} max={STARTERS.RUSHING}/>
            <RosterSection title="Receiving" units={receiving} max={STARTERS.RECEIVING}/>
            <RosterSection title="Defense" units={defense} max={STARTERS.DEFENSE}/>
            <RosterSection title="Special Teams" units={specialTeams} max={STARTERS.SPECIAL_TEAMS}/>

            <h2>Bench</h2>

            {bench.length === 0 ? (
                <p>No bench units.</p>
            ) : (
                <UnitList>
                    {bench.map(
                        (unit) => (
                            <UnitRow key={unit.id}>
                                <TeamLogo
                                    src={getTeamLogo(unit.teamName)}
                                    alt={unit.teamName}
                                />

                                <UnitInfo>
                                    <UnitName>
                                        {unit.teamName} {formatUnitType(unit.unitType)}
                                    </UnitName>

                                    <UnitDetails>
                                        vs {getTeamOpponent(unit.teamName, CURRENT_WEEK) ?? 'Unknown'}

                                        {unit.gameStart && (
                                            <>
                                                {' • '}
                                                {formatGameStart(unit.gameStart)}
                                            </>
                                        )}
                                    </UnitDetails>
                                </UnitInfo>

                                {unit.locked ? (
                                    <button disabled>
                                        Locked
                                    </button>
                                ) : canMoveDirectlyToStarter(unit) ? (
                                    <button
                                        onClick={() =>
                                            moveToStarter(unit)
                                        }
                                    >
                                        Move to Starter
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setError('')
                                            setSelectedBenchUnit(unit)
                                        }}
                                    >
                                        Swap with Starter
                                    </button>
                                )}
                            </UnitRow>
                        )
                    )}
                </UnitList>
            )}

            <p>Bench: {bench.length} /{' '}{BENCH}</p>

            {selectedBenchUnit && (
                <div>
                    <h3>
                        Replace a{' '}
                        {formatUnitType(selectedBenchUnit.unitType)}{' '}
                        Starter
                    </h3>

                    {selectedBenchUnit.locked ? (
                        <p>This unit is locked, the game has already started.</p>
                    ) : (
                        starters.filter((starter) => starter.unitType === selectedBenchUnit.unitType)
                            .map((starter) => (
                                <UnitRow key={starter.id}>
                                    <TeamLogo
                                        src={getTeamLogo(starter.teamName)}
                                        alt={starter.teamName}
                                    />

                                    <UnitInfo>
                                        <UnitName>
                                            {starter.teamName}{' '}
                                            {formatUnitType(starter.unitType)}
                                        </UnitName>

                                        <UnitDetails>
                                            {starter.gameStart && (
                                                <>
                                                    {formatGameStart(starter.gameStart)}
                                                </>
                                            )}
                                        </UnitDetails>
                                    </UnitInfo>

                                    {starter.locked ? (
                                        <button disabled>
                                            Locked
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() =>
                                                swapUnits(selectedBenchUnit, starter)
                                            }
                                        >
                                            Swap
                                        </button>
                                    )}
                                </UnitRow>
                                )
                            )
                    )}

                    <button onClick={() => setSelectedBenchUnit(null)}>
                        Cancel
                    </button>
                </div>
            )}
        </div>
    )
}

function normalizeTeamName(teamName: string): string {
    return teamName.trim().toLowerCase()
}

function isGameLocked(gameStart: Date | null, now = new Date()): boolean {
    if (!gameStart) {
        return false
    }

    return (now.getTime() >= gameStart.getTime())
}

function formatGameStart(gameStart: Date): string {
    return gameStart.toLocaleString(undefined,
        {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }
    )
}