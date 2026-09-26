import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'
import { getTeams } from '../../api/cfbApi'
import { getWeeklyStats, getEspnScoreboard, getLiveTeamStats, type EspnGame } from '../../api/weeklyStats'

import { getTeamOpponent } from '../../utils/teamschedule'
import { CURRENT_WEEK } from '../../bigseasonfile'

import { STARTERS, type RosterUnitType } from '../../rosters'

import type { CollegeTeam, TeamStats } from '../../types/football'

import TeamDetailsModal from '../../components/teampages/TeamDetails'
import { BackButton } from '../../styles/commonstyles'
import { getTeamLogo, TeamLogo } from '../../styles/logos'

import { calculateUnitScore } from '../../utils/scoring'
import { getScoreBreakdown } from "../../utils/ScoringBreakdown"
import { getLeagueStandings } from '../../utils/standings'

import { normalizeTeamName, isGameLocked, formatGameStart, formatUnitType } from "../../utils/rosterUtils"
import { getEspnGameResult } from "../../utils/espnUtils";

import { UnitList, UnitRow, UnitInfo, UnitName, UnitDetails, TeamNameButton, OpponentButton, UnitScore,
    ModalBackdrop, ModalCard, ModalHeader, ModalTitle, CloseButton, ByeText, WeekNavigator, WeekArrow,
    WeekLabel, TeamHeader, TeamRecord, RosterActionButton } from '../../utils/rosterstyles'

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
    weeklyStats: TeamStats | null
}

interface RosterSectionProps {
    title: string
    units: RosterUnit[]
    max: number
}

export default function MyTeam() {
    const { leagueId } = useParams()
    const { user } = useAuth()

    const [teamName, setTeamName] = useState('')
    const [roster, setRoster] = useState<RosterUnit[]>([])
    const rosterRef = useRef<RosterUnit[]>([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [selectedBenchUnit, setSelectedBenchUnit] = useState<RosterUnit | null>(null)
    const navigate = useNavigate()

    const [teams, setTeams] = useState<CollegeTeam[]>([])
    const [selectedStatsUnit, setSelectedStatsUnit] = useState<(RosterUnit & { isOpponent?: boolean }) | null>(null)

    const [espnGames, setEspnGames] = useState<EspnGame[]>([])

    const [selectedScoreUnit, setSelectedScoreUnit] = useState<RosterUnit | null>(null)
    const [searchParams, setSearchParams] = useSearchParams()

    const viewedWeek = Number(searchParams.get('week')) || CURRENT_WEEK
    const viewingPastWeek = viewedWeek < CURRENT_WEEK

    const [record, setRecord] = useState({wins: 0, losses: 0, place: 0})
    const [leagueMemberId, setLeagueMemberId] = useState<string | null>(null)

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

                setLeagueMemberId(leagueMember.id)
                setTeamName(leagueMember.team_name)

                const standings = await getLeagueStandings(leagueId)

                const standingIndex = standings.findIndex((team) => team.memberId === leagueMember.id)

                if (standingIndex !== -1) {
                    const standing = standings[standingIndex]

                    setRecord({
                        wins: standing.wins,
                        losses: standing.losses,
                        place: standingIndex + 1,
                    })
                }

                let rosterData
                let rosterError

                if (viewingPastWeek) {
                    const result = await supabase
                        .from('weekly_rosters')
                        .select('id, college_team_id, unit_type, roster_slot')
                        .eq('league_id', leagueId)
                        .eq('league_member_id', leagueMember.id)
                        .eq('week', viewedWeek)

                    rosterData = result.data
                    rosterError = result.error
                } else {
                    const result = await supabase
                        .from('roster_units')
                        .select('id, college_team_id, unit_type, roster_slot, acquired_via')
                        .eq('league_id', leagueId)
                        .eq('league_member_id', leagueMember.id)

                    rosterData = result.data
                    rosterError = result.error
                }

                if (rosterError) {
                    throw rosterError
                }

                const teams = await getTeams()
                setTeams(teams)

                const teamMap = new Map<number, CollegeTeam>()

                teams.forEach((team) => {teamMap.set(team.id, team)})

                const weeklyStats = await getWeeklyStats(viewedWeek)
                const weeklyMap = new Map(
                    weeklyStats.map((team) => [
                        normalizeTeamName(team.team),
                        team
                    ])
                )

                const now = new Date()

                const liveStatsEntries = await Promise.all(
                    (rosterData ?? []).map(async (unit) => {
                        const collegeTeam = teamMap.get(unit.college_team_id)

                        if (!collegeTeam) {
                            return [unit.college_team_id, null] as const
                        }

                        const weeklyTeam = weeklyMap.get(
                            normalizeTeamName(collegeTeam.name)
                        )

                        const gameStart = weeklyTeam?.gameStart ?? null

                        if (
                            gameStart === null ||
                            now.getTime() < gameStart.getTime()
                        ) {
                            return [unit.college_team_id, null] as const
                        }

                        try {
                            const liveStats = await getLiveTeamStats(
                                collegeTeam.name,
                                viewedWeek
                            )

                            return [unit.college_team_id, liveStats] as const
                        } catch (error) {
                            console.error(
                                `Failed to load ESPN stats for ${collegeTeam.name}:`,
                                error
                            )

                            return [unit.college_team_id, null] as const
                        }
                    })
                )

                const liveStatsMap = new Map(liveStatsEntries)

                const rosterUnits: RosterUnit[] =
                    (rosterData ?? []).map(
                        (unit) => {
                            const collegeTeam = teamMap.get(unit.college_team_id)
                            const collegeTeamName = collegeTeam?.name ?? 'Unknown Team'
                            const weeklyTeam = weeklyMap.get(
                                normalizeTeamName(collegeTeamName)
                            )

                            const liveTeam = liveStatsMap.get(unit.college_team_id)
                            const gameStart = weeklyTeam?.gameStart ?? null

                            const gameStarted =
                                gameStart !== null &&
                                now.getTime() >= gameStart.getTime()

                            const stats = liveTeam?.stats ?? null

                            const score =
                                stats && gameStarted
                                    ? calculateUnitScore(
                                        unit.unit_type as RosterUnitType,
                                        stats
                                    )
                                    : 0

                            return {
                                id: unit.id,
                                collegeTeamId: unit.college_team_id,
                                teamName: collegeTeamName,
                                unitType: unit.unit_type as RosterUnitType,
                                rosterSlot: unit.roster_slot as | 'STARTER' | 'BENCH',
                                acquiredVia:
                                    'acquired_via' in unit && unit.acquired_via
                                        ? unit.acquired_via as 'DRAFT' | 'FREE_AGENCY'
                                        : 'DRAFT',

                                gameStart,

                                locked: viewingPastWeek || isGameLocked(gameStart, now),
                                score,
                                weeklyStats: stats,
                            }
                        }
                    )

                const scoreboardDates = Array.from(
                    new Set(
                        rosterUnits
                            .map((unit) => unit.gameStart)
                            .filter((date): date is Date => date !== null)
                            .map((date) => {
                                const year = date.getFullYear()
                                const month = String(date.getMonth() + 1).padStart(2, '0')
                                const day = String(date.getDate()).padStart(2, '0')

                                return `${year}${month}${day}`
                            })
                    )
                )


                const scoreboards = await Promise.all(
                    scoreboardDates.map((date) => getEspnScoreboard(date))
                )

                const scoreboard = scoreboards.flat()

                setEspnGames(scoreboard)

                if (!viewingPastWeek) {
                    for (const unit of rosterUnits) {
                        await ensureWeeklyRosterUnit(leagueMember.id, unit)
                    }
                }

                setRoster(rosterUnits)
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message)
                } else {
                    setError('Failed to load roster.')
                }
            } finally {
                setLoading(false)
            }
        }

        void loadRoster()
    }, [leagueId, user, viewedWeek])

    useEffect(() => {
        rosterRef.current = roster
    }, [roster])

    useEffect(() => {
        if (viewingPastWeek) {
            return
        }

        const interval = window.setInterval(() => {
            const now = new Date()

            void Promise.all(
                rosterRef.current.map(async (unit) => {
                    const locked = isGameLocked(unit.gameStart, now)

                    if (unit.gameStart === null || now.getTime() < unit.gameStart.getTime()) {
                        return {
                            ...unit, locked
                        }
                    }

                    try {
                        const liveStats = await getLiveTeamStats(unit.teamName, viewedWeek)

                        const stats = liveStats?.stats ?? unit.weeklyStats

                        return {
                            ...unit, locked,
                            weeklyStats: stats,
                            score: stats ? calculateUnitScore(unit.unitType, stats) : unit.score
                        }
                    } catch (error) {
                        console.error(`Failed to refresh ESPN stats for ${unit.teamName}:`, error)

                        return {
                            ...unit, locked
                        }
                    }
                })
            ).then((updatedRoster) => {
                setRoster(updatedRoster)
            })
        }, 30000)

        return () => {
            window.clearInterval(interval)
        }
    }, [viewedWeek, viewingPastWeek])

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
        if (!leagueId || !leagueMemberId) {
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

        const { error: swapError } = await supabase.rpc('swap_roster_units',
            {
                target_league_id: leagueId,
                target_league_member_id: leagueMemberId,
                bench_unit_id: currentBenchUnit.id,
                starter_unit_id: currentStarterUnit.id,
                target_week: CURRENT_WEEK,
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
                            const opponentName = getTeamOpponent(unit.teamName, viewedWeek)
                            const espnResult = getEspnGameResult(unit.teamName, espnGames)

                            const gameResult = espnResult?.result
                            const gameScore = espnResult?.score

                            const hasFinalResult =
                                unit.locked && gameResult !== undefined && gameScore !== undefined

                            const opponentTeam = teams.find((team) =>
                                normalizeTeamName(team.name) === normalizeTeamName(opponentName ?? ''))

                            return (
                                <UnitRow key={unit.id}>
                                    <TeamLogo src={getTeamLogo(unit.teamName)} alt={unit.teamName}/>

                                    <UnitInfo>
                                        <UnitName>
                                            <TeamNameButton onClick={() => setSelectedStatsUnit(unit)}>
                                                {unit.teamName}
                                            </TeamNameButton>

                                            {' '}
                                            {formatUnitType(unit.unitType)}
                                        </UnitName>

                                        <UnitDetails>
                                            {opponentName === 'BYE' ? (
                                                <ByeText>BYE</ByeText>
                                            ) : (
                                                <>
                                                    vs{' '}

                                                    {opponentTeam ? (
                                                        <OpponentButton
                                                            onClick={() =>
                                                                setSelectedStatsUnit({
                                                                    ...unit,
                                                                    collegeTeamId: opponentTeam.id,
                                                                    teamName: opponentTeam.name,
                                                                    isOpponent: true,
                                                                })
                                                            }
                                                        >
                                                            {opponentTeam.name}
                                                        </OpponentButton>
                                                    ) : (
                                                        opponentName ?? 'Unknown'
                                                    )}

                                                    {!unit.locked && unit.gameStart && (
                                                        <>
                                                            {' • '}
                                                            {formatGameStart(unit.gameStart)}
                                                        </>
                                                    )}

                                                    {unit.locked && (
                                                        <>
                                                            {' • '}

                                                            {hasFinalResult ? (
                                                                <strong>
                                                                    ({gameResult}) {gameScore}
                                                                </strong>
                                                            ) : (
                                                                <strong>Locked</strong>
                                                            )}
                                                        </>
                                                    )}
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

    function canMoveDirectlyToStarter(unit: RosterUnit) {
        const starterCount = starters.filter((starter) => starter.unitType === unit.unitType).length

        return (starterCount < STARTERS[unit.unitType])
    }

    async function moveToStarter(unit: RosterUnit) {
        if (!leagueId || !leagueMemberId) {
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

        const { error: moveError } = await supabase.rpc('move_roster_unit_to_starter',
            {
                target_league_id: leagueId,
                target_league_member_id: leagueMemberId,
                target_roster_unit_id: currentUnit.id,
                target_week: CURRENT_WEEK,
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

    async function ensureWeeklyRosterUnit(
        leagueMemberId: string,
        unit: {
            collegeTeamId: number
            unitType: RosterUnitType
            rosterSlot: 'STARTER' | 'BENCH'
            gameStart: Date | null
        }
    ) {
        if (!leagueId) {
            return
        }

        const { data: existing, error: lookupError } = await supabase
            .from('weekly_rosters')
            .select('id')
            .eq('league_id', leagueId)
            .eq('league_member_id', leagueMemberId)
            .eq('week', CURRENT_WEEK)
            .eq('college_team_id', unit.collegeTeamId)
            .eq('unit_type', unit.unitType)
            .maybeSingle()

        if (lookupError) {
            console.error(lookupError)
            return
        }

        if (existing) {
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
                locked_at:
                    unit.gameStart?.toISOString() ??
                    new Date().toISOString(),
            })

        if (error && error.code !== '23505') {
            console.error(error)
        }
    }

    function changeWeek(week: number) {
        if (week < 1 || week > CURRENT_WEEK) {
            return
        }

        setSelectedBenchUnit(null)
        setSelectedScoreUnit(null)
        setSelectedStatsUnit(null)

        if (week === CURRENT_WEEK) {
            setSearchParams({})
        } else {
            setSearchParams({
                week: String(week),
            })
        }
    }

    return (
        <div>
            <BackButton onClick={() => navigate(`/league/${leagueId}`)}>
                ← Back
            </BackButton>

            <TeamHeader>
                <h1>{teamName}</h1>

                <TeamRecord>
                    {record.wins}-{record.losses}
                    {' • '}
                    {formatPlace(record.place)} Place
                </TeamRecord>
            </TeamHeader>

            <WeekNavigator>
                <WeekArrow onClick={() => changeWeek(viewedWeek - 1)} disabled={viewedWeek <= 1} aria-label="Previous week">
                    ←
                </WeekArrow>

                <WeekLabel>Week {viewedWeek}</WeekLabel>

                <WeekArrow onClick={() => changeWeek(viewedWeek + 1)} disabled={viewedWeek >= CURRENT_WEEK} aria-label="Next week">
                    →
                </WeekArrow>
            </WeekNavigator>

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
                        const opponentName = getTeamOpponent(unit.teamName, viewedWeek)

                        const espnResult = getEspnGameResult(unit.teamName, espnGames)

                        const gameResult = espnResult?.result
                        const gameScore = espnResult?.score

                        const hasFinalResult =
                            unit.locked && gameResult !== undefined && gameScore !== undefined

                        const opponentTeam = teams.find((team) =>
                            normalizeTeamName(team.name) === normalizeTeamName(opponentName ?? ''))

                        return (
                            <UnitRow key={unit.id}>
                                <TeamLogo src={getTeamLogo(unit.teamName)} alt={unit.teamName}/>

                                <UnitInfo>
                                    <UnitName>
                                        <TeamNameButton onClick={() => setSelectedStatsUnit(unit)}>
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
                                                    setSelectedStatsUnit({...unit,
                                                        collegeTeamId: opponentTeam.id,
                                                        teamName: opponentTeam.name,
                                                        isOpponent: true,
                                                    })
                                                }
                                            >
                                                {opponentTeam.name}
                                            </OpponentButton>
                                        ) : (
                                            opponentName ?? 'Unknown'
                                        )}

                                        {!unit.locked && unit.gameStart && (
                                            <>
                                                {' • '}
                                                {formatGameStart(unit.gameStart)}
                                            </>
                                        )}

                                        {unit.locked && (
                                            <>
                                                {' • '}

                                                {hasFinalResult ? (
                                                    <strong>
                                                        ({gameResult}) {gameScore}
                                                    </strong>
                                                ) : (
                                                    <strong>Locked</strong>
                                                )}
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

                                {!viewingPastWeek && !unit.locked && (
                                    canMoveDirectlyToStarter(unit) ? (
                                        <RosterActionButton onClick={() => moveToStarter(unit)}>
                                            Move to Starter
                                        </RosterActionButton>
                                    ) : (
                                        <RosterActionButton
                                            onClick={() => {setError('')
                                                setSelectedBenchUnit(unit)
                                            }}
                                        >
                                            Swap with Starter
                                        </RosterActionButton>
                                    )
                                )}
                            </UnitRow>
                        )
                    })}
                </UnitList>
            )}

            {selectedBenchUnit && (
                <ModalBackdrop onClick={() => setSelectedBenchUnit(null)}>
                    <ModalCard onClick={(event) => event.stopPropagation()}>
                        <ModalHeader>
                            <TeamLogo src={getTeamLogo(selectedBenchUnit.teamName)} alt={selectedBenchUnit.teamName}/>

                            <ModalTitle>
                                <h2>
                                    Swap {selectedBenchUnit.teamName}{' '}
                                    {formatUnitType(selectedBenchUnit.unitType)}
                                </h2>

                                <p>Choose a starter to replace</p>
                            </ModalTitle>

                            <CloseButton onClick={() => setSelectedBenchUnit(null)}>
                                Close
                            </CloseButton>
                        </ModalHeader>

                        {selectedBenchUnit.locked ? (
                            <p>This unit is locked, the game has already started.</p>
                        ) : (
                            <UnitList>
                                {starters
                                    .filter((starter) => starter.unitType === selectedBenchUnit.unitType)
                                    .map((starter) => (
                                        <UnitRow key={starter.id}>
                                            <TeamLogo src={getTeamLogo(starter.teamName)} alt={starter.teamName}/>

                                            <UnitInfo>
                                                <UnitName>
                                                    {starter.teamName}{' '}
                                                    {formatUnitType(starter.unitType)}
                                                </UnitName>

                                                <UnitDetails>
                                                    {starter.gameStart && formatGameStart(starter.gameStart)}
                                                </UnitDetails>
                                            </UnitInfo>

                                            {!starter.locked && (
                                                <RosterActionButton onClick={() => swapUnits(selectedBenchUnit, starter)}>
                                                    Swap
                                                </RosterActionButton>
                                            )}
                                        </UnitRow>
                                    ))}
                            </UnitList>
                        )}
                    </ModalCard>
                </ModalBackdrop>
            )}
            {selectedStatsUnit && (
                <TeamDetailsModal
                    teamName={selectedStatsUnit.teamName}
                    teamId={selectedStatsUnit.collegeTeamId}
                    unitType={selectedStatsUnit.unitType}
                    isOpponent={selectedStatsUnit.isOpponent ?? false}
                    teams={teams}
                    onClose={() => setSelectedStatsUnit(null)}
                />
            )}
            {selectedScoreUnit && selectedScoreUnit.weeklyStats && (
                <ModalBackdrop onClick={() => setSelectedScoreUnit(null)}>
                    <ModalCard onClick={(event) => event.stopPropagation()}>
                        <ModalHeader>
                            <TeamLogo src={getTeamLogo(selectedScoreUnit.teamName)} alt={selectedScoreUnit.teamName}/>

                            <ModalTitle>
                                <h2>{selectedScoreUnit.teamName}</h2>
                                <p>{formatUnitType(selectedScoreUnit.unitType)} Score Breakdown</p>
                            </ModalTitle>

                            <CloseButton onClick={() => setSelectedScoreUnit(null)}>
                                Close
                            </CloseButton>
                        </ModalHeader>

                        <h3>Fantasy Score: {selectedScoreUnit.score.toFixed(1)}</h3>

                        {getScoreBreakdown(selectedScoreUnit.unitType, selectedScoreUnit.weeklyStats)}
                    </ModalCard>
                </ModalBackdrop>
            )}
        </div>
    )
}

function formatPlace(place: number): string {
    if (place === 0) {
        return '-'
    }

    const digitplace = place % 100

    if (digitplace >= 11 && digitplace <= 13) {
        return `${place}th`
    }

    switch (place % 10) {
        case 1: return `${place}st`
        case 2: return `${place}nd`
        case 3: return `${place}rd`
        default: return `${place}th`
    }
}