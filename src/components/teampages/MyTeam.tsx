import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

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

import { BackButton } from '../../styles/commonstyles'
import { getTeamLogo, TeamLogo } from '../../styles/logos'

import { getStatRank, formatRank } from '../../utils/statRanking'
import { calculateUnitScore } from '../../utils/scoring'
import { getScoreBreakdown } from "../../utils/ScoringBreakdown"

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
    score: number
    weeklyStats: WeeklyTeamData['stats'] | null
}

interface RosterSectionProps {
    title: string
    units: RosterUnit[]
    max: number
}

const UnitList = styled.div`
    display: grid;
    gap: 10px;
`;

const UnitRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
`;

const UnitInfo = styled.div`
    flex: 1;
`;

const UnitName = styled.div`
    font-weight: 700;
    color: #111827;
`;

const UnitDetails = styled.div`
    margin-top: 3px;
    color: #6b7280;
    font-size: 0.9rem;
`;

const TeamNameButton = styled.button`
    border: none;
    background: none;
    padding: 0;
    color: #111827;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    text-align: left;

    &:hover {
        text-decoration: underline;
    }
`

const OpponentButton = styled.button`
    border: none;
    background: none;
    padding: 0;
    color: #2563eb;
    font: inherit;
    cursor: pointer;

    &:hover {
        text-decoration: underline;
    }
`

const ModalBackdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(17, 24, 39, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 1000;
`

const ModalCard = styled.div`
    width: min(520px, 100%);
    max-height: 80vh;
    overflow-y: auto;

    background: #ffffff;
    border-radius: 16px;
    padding: 24px;

    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
`;

const ModalTitle = styled.div`
    flex: 1;

    h2 {
        margin: 0;
    }

    p {
        margin: 4px 0 0;
        color: #6b7280;
    }
`;

const CloseButton = styled.button`
    border: none;
    border-radius: 8px;
    padding: 8px 12px;

    background: #f3f4f6;
    color: #374151;

    font-weight: 700;
    cursor: pointer;

    &:hover {
        background: #e5e7eb;
    }
`;

const UnitScore = styled.button`
    min-width: 55px;
    text-align: right;
    font: inherit;
    font-weight: 700;
    color: #111827;

    border: none;
    background: none;
    padding: 0;

    cursor: pointer;

    &:hover {
        text-decoration: underline;
    }
`;

export default function MyTeam() {
    const { leagueId } = useParams()
    const { user } = useAuth()

    const [teamName, setTeamName] = useState('')
    const [roster, setRoster] = useState<RosterUnit[]>([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [selectedBenchUnit, setSelectedBenchUnit] = useState<RosterUnit | null>(null)
    const navigate = useNavigate()

    const [teams, setTeams] = useState<CollegeTeam[]>([])
    const [selectedStatsUnit, setSelectedStatsUnit] = useState<RosterUnit | null>(null)
    const [selectedScoreUnit, setSelectedScoreUnit] = useState<RosterUnit | null>(null)

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
                setTeams(teams)

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

                            const gameStarted =
                                gameStart !== null && now.getTime() >= gameStart.getTime()

                            const score =
                                weeklyTeam && gameStarted
                                    ? calculateUnitScore(unit.unit_type as RosterUnitType, weeklyTeam.stats) : 0

                            return {
                                id: unit.id,
                                collegeTeamId: unit.college_team_id,
                                teamName: collegeTeamName,
                                unitType: unit.unit_type as RosterUnitType,
                                rosterSlot: unit.roster_slot as | 'STARTER' | 'BENCH',
                                acquiredVia: unit.acquired_via as | 'DRAFT' | 'FREE_AGENCY',

                                gameStart,

                                locked: isGameLocked(gameStart, now),
                                score,
                                weeklyStats: weeklyTeam?.stats ?? null,
                            }
                        }
                    )

                for (const unit of rosterUnits) {
                    if (unit.locked) {
                        await snapshotLockedUnit(
                            leagueMember.id,
                            unit
                        )
                    }
                }

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

                {units.length === 0 ? (
                    <p>Empty</p>
                ) : (
                    <UnitList>
                        {units.map((unit) => {
                            const opponentName = getTeamOpponent(
                                unit.teamName,
                                CURRENT_WEEK
                            )

                            const opponentTeam = teams.find(
                                (team) =>
                                    normalizeTeamName(team.name) ===
                                    normalizeTeamName(opponentName ?? '')
                            )

                            return (
                                <UnitRow key={unit.id}>
                                    <TeamLogo
                                        src={getTeamLogo(unit.teamName)}
                                        alt={unit.teamName}
                                    />

                                    <UnitInfo>
                                        <UnitName>
                                            <TeamNameButton
                                                onClick={() =>
                                                    setSelectedStatsUnit(unit)
                                                }
                                            >
                                                {unit.teamName}
                                            </TeamNameButton>

                                            {' '}
                                            {formatUnitType(unit.unitType)}
                                        </UnitName>

                                        <UnitDetails>
                                            vs{' '}

                                            {opponentTeam ? (
                                                <OpponentButton
                                                    onClick={() =>
                                                        setSelectedStatsUnit({
                                                            ...unit,
                                                            collegeTeamId:
                                                            opponentTeam.id,
                                                            teamName:
                                                            opponentTeam.name,
                                                        })
                                                    }
                                                >
                                                    {opponentTeam.name}
                                                </OpponentButton>
                                            ) : (
                                                opponentName ?? 'Unknown'
                                            )}

                                            {unit.gameStart && (
                                                <>
                                                    {' • '}
                                                    {formatGameStart(
                                                        unit.gameStart
                                                    )}
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
                                    <UnitScore onClick={() => {
                                        if (unit.locked) {
                                            setSelectedScoreUnit(unit)
                                        }}}
                                    >
                                        {unit.score.toFixed(1)}
                                    </UnitScore>
                                </UnitRow>
                            )
                        })}
                    </UnitList>
                )}
            </section>
        )
    }

    function formatUnitType(unitType: RosterUnitType) {
        if (unitType === 'SPECIAL_TEAMS') {
            return 'Special Teams'
        }

        return (
            unitType.charAt(0) + unitType.slice(1).toLowerCase()
        )
    }

    function canMoveDirectlyToStarter(unit: RosterUnit) {
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

    async function snapshotLockedUnit(
        leagueMemberId: string,
        unit: {
            collegeTeamId: number
            unitType: RosterUnitType
            rosterSlot: 'STARTER' | 'BENCH'
            gameStart: Date | null
        }
    ) {
        if (!leagueId || !unit.gameStart) {
            return
        }

        const { error } = await supabase
            .from('weekly_rosters')
            .insert({
                league_id: leagueId,
                league_member_id: leagueMemberId,
                week: CURRENT_WEEK,
                college_team_id: unit.collegeTeamId,
                unit_type: unit.unitType,
                roster_slot: unit.rosterSlot,
                locked_at: unit.gameStart.toISOString(),
            })

        if (error && error.code !== '23505') {
            console.error(error)
        }
    }

    return (
        <div>
            <BackButton onClick={() => navigate(-1)}>
                ← Back
            </BackButton>

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
                    {bench.map((unit) => {
                        const opponentName = getTeamOpponent(
                            unit.teamName,
                            CURRENT_WEEK
                        )

                        const opponentTeam = teams.find(
                            (team) =>
                                normalizeTeamName(team.name) ===
                                normalizeTeamName(opponentName ?? '')
                        )

                        return (
                            <UnitRow key={unit.id}>
                                <TeamLogo
                                    src={getTeamLogo(unit.teamName)}
                                    alt={unit.teamName}
                                />

                                <UnitInfo>
                                    <UnitName>
                                        <TeamNameButton
                                            onClick={() =>
                                                setSelectedStatsUnit(unit)
                                            }
                                        >
                                            {unit.teamName}
                                        </TeamNameButton>

                                        {' '}
                                        {formatUnitType(unit.unitType)}
                                    </UnitName>

                                    <UnitDetails>
                                        vs{' '}

                                        {opponentTeam ? (
                                            <OpponentButton
                                                onClick={() =>
                                                    setSelectedStatsUnit({
                                                        ...unit,
                                                        collegeTeamId:
                                                        opponentTeam.id,
                                                        teamName:
                                                        opponentTeam.name,
                                                    })
                                                }
                                            >
                                                {opponentTeam.name}
                                            </OpponentButton>
                                        ) : (
                                            opponentName ?? 'Unknown'
                                        )}

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

                                <UnitScore onClick={() => {
                                    if (unit.locked) {
                                        setSelectedScoreUnit(unit)
                                    }}}
                                >
                                    {unit.score.toFixed(1)}
                                </UnitScore>

                                {unit.locked ? (
                                    <button disabled>
                                        Locked
                                    </button>
                                ) : canMoveDirectlyToStarter(unit) ? (
                                    <button onClick={() => moveToStarter(unit)}>
                                        Move to Starter
                                    </button>
                                ) : (
                                    <button onClick={() => {setError(''), setSelectedBenchUnit(unit)}}>
                                        Swap with Starter
                                    </button>
                                )}
                            </UnitRow>
                        )
                    })}
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
                                    <TeamLogo src={getTeamLogo(starter.teamName)} alt={starter.teamName}/>

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
                                        <button onClick={() => swapUnits(selectedBenchUnit, starter)}>
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
            {selectedStatsUnit && (() => {
                const collegeTeam = teams.find((team) =>
                        team.id === selectedStatsUnit.collegeTeamId
                )

                return (
                    <ModalBackdrop onClick={() => setSelectedStatsUnit(null)}>
                        <ModalCard onClick={(event) => event.stopPropagation()}>
                            <ModalHeader>
                                <TeamLogo
                                    src={getTeamLogo(selectedStatsUnit.teamName)}
                                    alt={selectedStatsUnit.teamName}
                                />

                                <ModalTitle>
                                    <h2>
                                        {selectedStatsUnit.teamName}
                                    </h2>

                                    <p>
                                        2025{' '}
                                        {formatUnitType(selectedStatsUnit.unitType)}
                                        {' '}
                                        Stats
                                    </p>
                                </ModalTitle>

                                <CloseButton onClick={() => setSelectedStatsUnit(null)}>
                                    Close
                                </CloseButton>
                            </ModalHeader>

                            {selectedStatsUnit.unitType === 'PASSING' && collegeTeam && (
                                <>
                                    <div>
                                        Passing Yards:{' '}
                                        <strong>
                                            {(collegeTeam.stats.passing_yards ?? 0)
                                                .toLocaleString()}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) =>
                                                        team.stats.passing_yards ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        Passing Touchdowns:{' '}
                                        <strong>
                                            {collegeTeam.stats.passing_touchdowns ?? 0}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) =>
                                                        team.stats.passing_touchdowns ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>
                                </>
                            )}

                            {selectedStatsUnit.unitType === 'RUSHING' && collegeTeam && (
                                <>
                                    <div>
                                        Rushing Yards:{' '}
                                        <strong>
                                            {(collegeTeam.stats.rushing_yards ?? 0).toLocaleString()}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) => team.stats.rushing_yards ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        Rushing Touchdowns:{' '}
                                        <strong>
                                            {collegeTeam.stats.rushing_touchdowns ?? 0}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) => team.stats.rushing_touchdowns ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        Rushing Yards Per Game:{' '}
                                        <strong>
                                            {collegeTeam.stats.rushing_yards_per_game ?? 0}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) => team.stats.rushing_yards_per_game ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>
                                </>
                            )}

                            {selectedStatsUnit.unitType === 'RECEIVING' && collegeTeam && (
                                <>
                                    <div>
                                        Receiving Yards:{' '}
                                        <strong>
                                            {(collegeTeam.stats.passing_yards ?? 0).toLocaleString()}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) => team.stats.passing_yards ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        Receiving Touchdowns:{' '}
                                        <strong>
                                            {collegeTeam.stats.passing_touchdowns ?? 0}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) => team.stats.passing_touchdowns ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        Receiving Yards Per Game:{' '}
                                        <strong>
                                            {collegeTeam.stats.passing_yards_per_game ?? 0}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) => team.stats.passing_yards_per_game ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>
                                </>
                            )}

                            {selectedStatsUnit.unitType === 'DEFENSE' && collegeTeam && (
                                <>
                                    <div>
                                        Points Allowed:{' '}
                                        <strong>
                                            {collegeTeam.stats.points_allowed ?? 0}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) =>
                                                        -(team.stats.points_allowed ?? 0)
                                                )
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        Yards Allowed:{' '}
                                        <strong>
                                            {(collegeTeam.stats.total_yards_allowed ?? 0)
                                                .toLocaleString()}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) =>
                                                        -(team.stats.total_yards_allowed ?? 0)
                                                )
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        Takeaways:{' '}
                                        <strong>
                                            {collegeTeam.stats.takeaways ?? 0}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) =>
                                                        team.stats.takeaways ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>
                                </>
                            )}

                            {selectedStatsUnit.unitType === 'SPECIAL_TEAMS' && collegeTeam && (
                                <>
                                    <div>
                                        Field Goals Made:{' '}
                                        <strong>
                                            {collegeTeam.stats.field_goals_made ?? 0}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) => team.stats.field_goals_made ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        Field Goals Attempted:{' '}
                                        <strong>
                                            {collegeTeam.stats.field_goals_attempted ?? 0}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) => team.stats.field_goals_attempted ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        Field Goal Percentage:{' '}
                                        <strong>
                                            {collegeTeam.stats.field_goal_percentage ?? 0}%
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) => team.stats.field_goal_percentage ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        Extra Points Made:{' '}
                                        <strong>
                                            {collegeTeam.stats.extra_points_made ?? 0}
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) => team.stats.extra_points_made ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        Extra Point Percentage:{' '}
                                        <strong>
                                            {collegeTeam.stats.extra_point_percentage ?? 0}%
                                        </strong>
                                        {' • '}
                                        <strong>
                                            {formatRank(
                                                getStatRank(
                                                    teams,
                                                    collegeTeam.id,
                                                    (team) => team.stats.extra_point_percentage ?? 0
                                                )
                                            )}
                                        </strong>
                                    </div>
                                </>
                            )}

                        </ModalCard>
                    </ModalBackdrop>
                )
            })()}
            {selectedScoreUnit && selectedScoreUnit.weeklyStats && (
                <ModalBackdrop
                    onClick={() => setSelectedScoreUnit(null)}
                >
                    <ModalCard
                        onClick={(event) => event.stopPropagation()}
                    >
                        <ModalHeader>
                            <TeamLogo
                                src={getTeamLogo(selectedScoreUnit.teamName)}
                                alt={selectedScoreUnit.teamName}
                            />

                            <ModalTitle>
                                <h2>
                                    {selectedScoreUnit.teamName}
                                </h2>

                                <p>
                                    {formatUnitType(selectedScoreUnit.unitType)} Score Breakdown
                                </p>
                            </ModalTitle>

                            <CloseButton
                                onClick={() => setSelectedScoreUnit(null)}
                            >
                                Close
                            </CloseButton>
                        </ModalHeader>

                        <h3>
                            Fantasy Score: {selectedScoreUnit.score.toFixed(1)}
                        </h3>

                        {getScoreBreakdown(
                            selectedScoreUnit.unitType,
                            selectedScoreUnit.weeklyStats
                        )}
                    </ModalCard>
                </ModalBackdrop>
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