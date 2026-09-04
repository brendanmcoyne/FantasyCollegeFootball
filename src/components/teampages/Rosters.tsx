import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { getTeams } from '../../api/cfbApi'
import { getWeeklyStats } from '../../api/weeklyStats'

import { getTeamOpponent } from '../../utils/teamschedule'
import { calculateUnitScore } from '../../utils/scoring'
import { getScoreBreakdown } from '../../utils/ScoringBreakdown'

import { getStatRank, formatRank } from '../../utils/statRanking'

import { CURRENT_WEEK } from '../../bigseasonfile'

import styled from 'styled-components'

import {
    TeamLogo,
    getTeamLogo,
} from '../../styles/logos'

import {
    STARTERS,
    BENCH,
    type RosterUnitType,
} from '../../rosters'

import { BackButton } from '../../styles/commonstyles'

import type {
    CollegeTeam,
} from '../../types/football'

import type {
    WeeklyTeamData,
} from '../../api/weeklyStats'

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

    weeklyStats:
        WeeklyTeamData['stats'] | null
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

    @media (max-width: 700px) {
        display: grid;
        grid-template-columns: 56px minmax(0, 1fr) auto;
        gap: 10px;
    }
`;

const UnitInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const UnitName = styled.div`
    font-weight: 700;
    color: #111827;
`;

const UnitDetails = styled.div`
    margin-top: 3px;
    color: #6b7280;
    font-size: 0.9rem;

    @media (max-width: 700px) {
        line-height: 1.4;
    }
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
`;

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
`;

const UnitScore = styled.button`
    min-width: 55px;
    border: none;
    background: none;
    padding: 0;
    text-align: right;
    color: #111827;
    font: inherit;
    font-weight: 700;
    cursor: pointer;

    &:hover {
        text-decoration: underline;
    }

    @media (max-width: 700px) {
        min-width: 42px;
    }
`;

const ModalBackdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(17, 24, 39, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 1000;

    @media (max-width: 700px) {
        padding: 12px;
    }
`;

const ModalCard = styled.div`
    width: min(600px, 100%);
    max-height: 80vh;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);

    @media (max-width: 700px) {
        padding: 16px;
        max-height: 86vh;
        border-radius: 14px;
    }
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

const ByeText = styled.span`
    color: #dc2626;
    font-weight: 700;
`;

export default function Rosters() {
    const {leagueId, memberId,} = useParams()
    const [teamName, setTeamName] = useState('')
    const [roster, setRoster] = useState<RosterUnit[]>([])
    const [teams, setTeams] = useState<CollegeTeam[]>([])
    const [selectedStatsUnit, setSelectedStatsUnit] = useState<{ collegeTeamId: number, teamName: string, unitType: RosterUnitType } | null>(null)
    const [selectedScoreUnit, setSelectedScoreUnit] = useState<RosterUnit | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const navigate = useNavigate()

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

                const {data: rosterData, error: rosterError} = await supabase
                    .from('roster_units')
                    .select('id, college_team_id, unit_type, roster_slot, acquired_via')
                    .eq('league_id', leagueId)
                    .eq('league_member_id', memberId)

                if (rosterError) {
                    throw rosterError
                }

                const [collegeTeams, weeklyStats,] = await Promise.all([
                    getTeams(),
                    getWeeklyStats(CURRENT_WEEK),
                ])

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

                                rosterSlot:
                                    unit.roster_slot as
                                        | 'STARTER'
                                        | 'BENCH',

                                acquiredVia:
                                    unit.acquired_via as
                                        | 'DRAFT'
                                        | 'FREE_AGENCY',

                                gameStart,
                                locked: isGameLocked(gameStart, now),
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
    }, [leagueId, memberId])

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
        const opponentName = getTeamOpponent(unit.teamName, CURRENT_WEEK)

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
                                        <strong>Locked</strong>
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
                    {units.map(
                        (unit) => renderUnit(unit)
                    )}
                </UnitList>
            </section>
        )
    }

    return (
        <div>
            <BackButton onClick={() => navigate(-1)}>← Back</BackButton>

            <h1>{teamName}</h1>

            <p>Week {CURRENT_WEEK}</p>

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
                                            {formatUnitType(selectedStatsUnit.unitType)}{' '}
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
                                                {(collegeTeam.stats.passing_yards ?? 0).toLocaleString()}
                                            </strong>
                                            {' • '}
                                            <strong>
                                                {formatRank(
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.passing_yards ?? 0)
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
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.passing_touchdowns ?? 0)
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
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.rushing_yards ?? 0)
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
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.rushing_touchdowns ?? 0)
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
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.rushing_yards_per_game ?? 0)
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
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.passing_yards ?? 0)
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
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.passing_touchdowns ?? 0)
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
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.passing_yards_per_game ?? 0)
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
                                                    getStatRank(teams, collegeTeam.id, (team) => -(team.stats.points_allowed ?? 0))
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
                                                    getStatRank(teams, collegeTeam.id, (team) => -(team.stats.total_yards_allowed ?? 0))
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
                                                    getStatRank(teams, collegeTeam.id, (team) => team.stats.takeaways ?? 0)
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

                                <CloseButton onClick={() => setSelectedScoreUnit(null)}>
                                    Close
                                </CloseButton>
                            </ModalHeader>

                            <h3>Fantasy Score:{' '}{selectedScoreUnit.score.toFixed(1)}</h3>

                            {getScoreBreakdown(selectedScoreUnit.unitType, selectedScoreUnit.weeklyStats)}
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