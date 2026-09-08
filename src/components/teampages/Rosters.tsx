import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getTeams } from '../../api/cfbApi'
import { getWeeklyStats } from '../../api/weeklyStats'
import { getTeamGame } from '../../utils/teamschedule'
import { calculateUnitScore } from '../../utils/scoring'
import { getScoreBreakdown } from '../../utils/ScoringBreakdown'
import { getStatRank, formatRank } from '../../utils/statRanking'
import { CURRENT_WEEK } from '../../bigseasonfile'
import { TeamLogo, getTeamLogo } from '../../styles/logos'
import { STARTERS, type RosterUnitType } from '../../rosters'
import { BackButton } from '../../styles/commonstyles'
import type { CollegeTeam } from '../../types/football'
import type { WeeklyTeamData } from '../../api/weeklyStats'
import { getLeagueStandings } from '../../utils/standings'
import { UnitList, UnitRow, UnitInfo, UnitName, UnitDetails, TeamNameButton, OpponentButton, UnitScore,
    ModalBackdrop, ModalCard, ModalHeader, ModalTitle, CloseButton, ByeText, WeekNavigator, WeekArrow,
    WeekLabel, TeamHeader, TeamRecord } from '../../utils/rosterstyles'

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

export default function Rosters() {
    const {leagueId, memberId,} = useParams()
    const [teamName, setTeamName] = useState('')
    const [roster, setRoster] = useState<RosterUnit[]>([])
    const [teams, setTeams] = useState<CollegeTeam[]>([])
    const [record, setRecord] = useState({wins: 0, losses: 0, place: 0})
    const [selectedStatsUnit, setSelectedStatsUnit] = useState<{ collegeTeamId: number, teamName: string, unitType: RosterUnitType, isOpponent?: boolean } | null>(null)
    const [selectedScoreUnit, setSelectedScoreUnit] = useState<RosterUnit | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchParams, setSearchParams] = useSearchParams()
    const [error, setError] = useState('')

    const navigate = useNavigate()

    const viewedWeek = Number(searchParams.get('week')) || CURRENT_WEEK

    const viewingPastWeek = viewedWeek < CURRENT_WEEK

    useEffect(() => {
        async function loadRoster() {
            if (!leagueId || !memberId) {
                setError('Missing league or team.')
                setLoading(false)

                return
            }

            try {
                const {data: member, error: memberError} = await supabase
                    .from('league_members')
                    .select('id, team_name')
                    .eq('id', memberId)
                    .eq('league_id', leagueId)
                    .single()

                if (memberError) {
                    throw memberError
                }

                const leagueMember = member as LeagueMember

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
                        .eq('league_member_id', memberId)
                        .eq('week', viewedWeek)

                    rosterData = result.data
                    rosterError = result.error
                } else {
                    const result = await supabase
                        .from('roster_units')
                        .select('id, college_team_id, unit_type, roster_slot, acquired_via')
                        .eq('league_id', leagueId)
                        .eq('league_member_id', memberId)

                    rosterData = result.data
                    rosterError = result.error
                }

                if (rosterError) {
                    throw rosterError
                }

                const [collegeTeams, weeklyStats,] = await Promise.all([getTeams(), getWeeklyStats(viewedWeek)])

                setTeams(collegeTeams)

                const teamMap = new Map<number, CollegeTeam>()

                collegeTeams.forEach(
                    (team) => {
                        teamMap.set(team.id, team)
                    }
                )

                const weeklyMap = new Map<string, WeeklyTeamData>()

                weeklyStats.forEach(
                    (team) => {
                        weeklyMap.set(normalizeTeamName(team.team), team)
                    }
                )

                const now = new Date()

                const rosterUnits:
                    RosterUnit[] =
                    (rosterData ?? []).map(
                        (unit) => {
                            const collegeTeam = teamMap.get(unit.college_team_id)
                            const collegeTeamName = collegeTeam?.name ?? 'Unknown Team'
                            const weeklyTeam = weeklyMap.get(normalizeTeamName(collegeTeamName))
                            const gameStart = weeklyTeam?.gameStart ?? null

                            const gameStarted = gameStart !== null && now.getTime() >= gameStart.getTime()

                            const score =
                                weeklyTeam &&
                                gameStarted ? calculateUnitScore(unit.unit_type as RosterUnitType, weeklyTeam.stats) : 0

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
                                weeklyStats: weeklyTeam?.stats ?? null
                            }
                        }
                    )

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

        loadRoster()
    }, [leagueId, memberId, viewedWeek])

    useEffect(() => {
        const interval =
            window.setInterval(() => {
                const now = new Date()

                setRoster(
                    (currentRoster) =>
                        currentRoster.map(
                            (unit) => ({
                                ...unit,
                                locked: isGameLocked(unit.gameStart, now)
                            })
                        )
                )
            }, 30000)

        return () => {
            window.clearInterval(interval)
        }
    }, [])

    if (loading) {
        return (
            <p>Loading roster...</p>
        )
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

    function renderUnit(unit: RosterUnit) {
        const game = getTeamGame(unit.teamName, viewedWeek)

        const opponentName = game?.[0]
        const gameResult = game?.[1]
        const gameScore = game?.[2]

        const hasFinalResult =
            unit.locked && gameResult !== undefined && gameScore !== undefined

        const opponentTeam =
            teams.find((team) => normalizeTeamName(team.name) === normalizeTeamName(opponentName ?? ''))

        return (
            <UnitRow key={unit.id}>
                <TeamLogo src={getTeamLogo(unit.teamName)} alt={unit.teamName}/>

                <UnitInfo>
                    <UnitName>
                        <TeamNameButton
                            onClick={() =>
                                setSelectedStatsUnit(
                                    {
                                        collegeTeamId: unit.collegeTeamId,
                                        teamName: unit.teamName,
                                        unitType: unit.unitType,
                                    }
                                )
                            }
                        >
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
                                                collegeTeamId: opponentTeam.id,
                                                teamName: opponentTeam.name,
                                                unitType: unit.unitType,
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

                <UnitScore
                    onClick={() => {
                        if (unit.locked) {
                            setSelectedScoreUnit(unit)
                        }
                    }}
                >
                    {unit.score.toFixed(1)}
                </UnitScore>
            </UnitRow>
        )
    }

    function RosterSection({title, units, max,}: RosterSectionProps) {
        return (
            <section>
                <h3>{title} ({units.length}/{max})</h3>

                <UnitList>
                    {units.map((unit) => renderUnit(unit))}
                </UnitList>
            </section>
        )
    }

    function changeWeek(week: number) {
        if (week < 1 || week > CURRENT_WEEK) {
            return
        }

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

    function normalizeTeamName(teamName: string): string {
        return teamName.trim().toLowerCase()
    }

    function isGameLocked(gameStart: Date | null, now = new Date()): boolean {
        if (!gameStart) {
            return false
        }

        return (
            now.getTime() >= gameStart.getTime()
        )
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

    function formatUnitType(unitType: RosterUnitType) {
        if (unitType === 'SPECIAL_TEAMS') {
            return 'Special Teams'
        }

        return (
            unitType.charAt(0) + unitType.slice(1).toLowerCase()
        )
    }

    function getOpponentStatLabel(unitType: RosterUnitType) {
        switch (unitType) {
            case 'PASSING':
                return 'Passing Defense'

            case 'RUSHING':
                return 'Rushing Defense'

            case 'RECEIVING':
                return 'Passing Defense'

            case 'DEFENSE':
                return 'Offense'

            case 'SPECIAL_TEAMS':
                return 'Special Teams'
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

            <UnitList>{bench.map((unit) => renderUnit(unit))}</UnitList>

            {selectedStatsUnit &&
                (() => {
                    const collegeTeam = teams.find((team) => team.id === selectedStatsUnit.collegeTeamId)

                    return (
                        <ModalBackdrop onClick={() => setSelectedStatsUnit(null)}>
                            <ModalCard onClick={(event) => event.stopPropagation()}>
                                <ModalHeader>
                                    <TeamLogo src={getTeamLogo(selectedStatsUnit.teamName)} alt={selectedStatsUnit.teamName}/>

                                    <ModalTitle>
                                        <h2>{selectedStatsUnit.teamName}</h2>

                                        <p>
                                            2025{' '}
                                            {selectedStatsUnit.isOpponent
                                                ? getOpponentStatLabel(selectedStatsUnit.unitType)
                                                : formatUnitType(selectedStatsUnit.unitType)}
                                            {' '}
                                            Stats
                                        </p>
                                    </ModalTitle>

                                    <CloseButton onClick={() => setSelectedStatsUnit(null)}>
                                        Close
                                    </CloseButton>
                                </ModalHeader>

                                {selectedStatsUnit.unitType === 'PASSING' && collegeTeam && (
                                    selectedStatsUnit.isOpponent ? (
                                        <>
                                            <div>
                                                Passing Yards Allowed:{' '}
                                                <strong>
                                                    {(collegeTeam.stats.passing_yards_allowed ?? 0).toLocaleString()}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => -(team.stats.passing_yards_allowed ?? 0)
                                                        )
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                Passing Yards Allowed Per Game:{' '}
                                                <strong>
                                                    {collegeTeam.stats.passing_yards_allowed_per_game ?? 0}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => -(team.stats.passing_yards_allowed_per_game ?? 0)
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
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => team.stats.takeaways ?? 0
                                                        )
                                                    )}
                                                </strong>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                Passing Yards:{' '}
                                                <strong>
                                                    {(collegeTeam.stats.passing_yards ?? 0).toLocaleString()}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => team.stats.passing_yards ?? 0
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
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => team.stats.passing_touchdowns ?? 0
                                                        )
                                                    )}
                                                </strong>
                                            </div>
                                        </>
                                    )
                                )}

                                {selectedStatsUnit.unitType === 'RUSHING' && collegeTeam && (
                                    selectedStatsUnit.isOpponent ? (
                                        <>
                                            <div>
                                                Rushing Yards Allowed:{' '}
                                                <strong>
                                                    {(collegeTeam.stats.rushing_yards_allowed ?? 0).toLocaleString()}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => -(team.stats.rushing_yards_allowed ?? 0)
                                                        )
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                Rushing Yards Allowed Per Game:{' '}
                                                <strong>
                                                    {collegeTeam.stats.rushing_yards_allowed_per_game ?? 0}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => -(team.stats.rushing_yards_allowed_per_game ?? 0)
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
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => team.stats.takeaways ?? 0
                                                        )
                                                    )}
                                                </strong>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                Rushing Yards:{' '}
                                                <strong>
                                                    {(collegeTeam.stats.rushing_yards ?? 0).toLocaleString()}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
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
                                                        getStatRank(teams, collegeTeam.id,
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
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => team.stats.rushing_yards_per_game ?? 0
                                                        )
                                                    )}
                                                </strong>
                                            </div>
                                        </>
                                    )
                                )}

                                {selectedStatsUnit.unitType === 'RECEIVING' && collegeTeam && (
                                    selectedStatsUnit.isOpponent ? (
                                        <>
                                            <div>
                                                Passing Yards Allowed:{' '}
                                                <strong>
                                                    {(collegeTeam.stats.passing_yards_allowed ?? 0).toLocaleString()}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => -(team.stats.passing_yards_allowed ?? 0)
                                                        )
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                Passing Yards Allowed Per Game:{' '}
                                                <strong>
                                                    {collegeTeam.stats.passing_yards_allowed_per_game ?? 0}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => -(team.stats.passing_yards_allowed_per_game ?? 0)
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
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => team.stats.takeaways ?? 0
                                                        )
                                                    )}
                                                </strong>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                Receiving Yards:{' '}
                                                <strong>
                                                    {(collegeTeam.stats.passing_yards ?? 0).toLocaleString()}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
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
                                                        getStatRank(teams, collegeTeam.id,
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
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => team.stats.passing_yards_per_game ?? 0
                                                        )
                                                    )}
                                                </strong>
                                            </div>
                                        </>
                                    )
                                )}

                                {selectedStatsUnit.unitType === 'DEFENSE' && collegeTeam && (
                                    selectedStatsUnit.isOpponent ? (
                                        <>
                                            <div>
                                                Points Scored:{' '}
                                                <strong>
                                                    {(collegeTeam.stats.points_scored ?? 0).toLocaleString()}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => team.stats.points_scored ?? 0
                                                        )
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                Points Per Game:{' '}
                                                <strong>
                                                    {collegeTeam.stats.points_per_game ?? 0}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => team.stats.points_per_game ?? 0
                                                        )
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                Passing Yards Per Game:{' '}
                                                <strong>
                                                    {collegeTeam.stats.passing_yards_per_game ?? 0}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => team.stats.passing_yards_per_game ?? 0
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
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => team.stats.rushing_yards_per_game ?? 0
                                                        )
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                Total Yards Per Game:{' '}
                                                <strong>
                                                    {collegeTeam.stats.total_yards_per_game ?? 0}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => team.stats.total_yards_per_game ?? 0
                                                        )
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                Turnovers:{' '}
                                                <strong>
                                                    {collegeTeam.stats.turnovers ?? 0}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => -(team.stats.turnovers ?? 0)
                                                        )
                                                    )}
                                                </strong>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                Points Allowed:{' '}
                                                <strong>
                                                    {collegeTeam.stats.points_allowed ?? 0}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => -(team.stats.points_allowed ?? 0)
                                                        )
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                Yards Allowed:{' '}
                                                <strong>
                                                    {(collegeTeam.stats.total_yards_allowed ?? 0).toLocaleString()}
                                                </strong>
                                                {' • '}
                                                <strong>
                                                    {formatRank(
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => -(team.stats.total_yards_allowed ?? 0)
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
                                                        getStatRank(teams, collegeTeam.id,
                                                            (team) => team.stats.takeaways ?? 0
                                                        )
                                                    )}
                                                </strong>
                                            </div>
                                        </>
                                    )
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
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.field_goals_made ?? 0)
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
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.field_goals_attempted ?? 0)
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
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.field_goal_percentage ?? 0)
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
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.extra_points_made ?? 0)
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
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.extra_point_percentage ?? 0)
                                                )}
                                            </strong>
                                        </div>
                                    </>
                                )}
                            </ModalCard>
                        </ModalBackdrop>
                    )
                })()}

            {selectedScoreUnit &&
                selectedScoreUnit.weeklyStats && (
                    <ModalBackdrop onClick={() => setSelectedScoreUnit(null)}>
                        <ModalCard onClick={(event) => event.stopPropagation()}>
                            <ModalHeader>
                                <TeamLogo src={getTeamLogo(selectedScoreUnit.teamName)} alt={selectedScoreUnit.teamName}/>

                                <ModalTitle>
                                    <h2>{selectedScoreUnit.teamName}</h2>

                                    <p>
                                        {formatUnitType(selectedScoreUnit.unitType)}{' '}
                                        Score Breakdown
                                    </p>
                                </ModalTitle>

                                <CloseButton onClick={() => setSelectedScoreUnit(null)}>Close</CloseButton>
                            </ModalHeader>

                            <h3>Fantasy Score:{' '}{selectedScoreUnit.score.toFixed(1)}</h3>

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

    const lastTwoDigits = place % 100

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
        return `${place}th`
    }

    switch (place % 10) {
        case 1:
            return `${place}st`
        case 2:
            return `${place}nd`
        case 3:
            return `${place}rd`
        default:
            return `${place}th`
    }
}

