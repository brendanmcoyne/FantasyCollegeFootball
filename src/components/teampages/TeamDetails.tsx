import { useEffect, useState } from 'react'
import styled from 'styled-components'

import type { CollegeTeam } from '../../types/football'
import type { RosterUnitType } from '../../rosters'

import { getEspnTeamId, getEspnTeamSchedule, type EspnGame} from '../../api/weeklyStats'

import { get2026SeasonStats, type Season2026Stats } from '../../utils/2026stats'
import { getStatRank, getStatRankByName, formatRank } from '../../utils/statRanking'
import { getTeamOpponent } from '../../utils/teamschedule'

import { ModalBackdrop, ModalCard, ModalHeader, ModalTitle, CloseButton } from '../../utils/rosterstyles'
import { getTeamLogo, TeamLogo } from '../../styles/logos'

type Tab = '2025' | '2026' | 'SCHEDULE'

interface TeamDetailsModalProps {
    teamName: string
    teamId: number
    unitType: RosterUnitType
    isOpponent?: boolean
    teams: CollegeTeam[]
    onClose: () => void
}


const DetailsCard = styled(ModalCard)`
    width: min(600px, calc(100vw - 32px));
`;

const TabBar = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin: 18px 0;
`;

const TabButton = styled.button<{ $active: boolean }>`
    padding: 10px 8px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: ${({ $active }) =>
    $active ? '#111827' : '#ffffff'};
    color: ${({ $active }) =>
    $active ? '#ffffff' : '#111827'};
    font-weight: 700;
    cursor: pointer;
`;

const StatsContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StatLine = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 8px 0;
    border-bottom: 1px solid #e5e7eb;

    strong {
        text-align: right;
        white-space: nowrap;
    }
`;

const ScheduleList = styled.div`
    display: flex;
    flex-direction: column;
`;

const ScheduleRow = styled.div`
    display: grid;
    grid-template-columns: 75px 1fr auto;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #e5e7eb;
`;

export default function TeamDetails({teamName, teamId, unitType, isOpponent = false, teams, onClose,}: TeamDetailsModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('2025')
    const [season2026Stats, setSeason2026Stats] = useState<Season2026Stats[]>([])
    const [loading2026, setLoading2026] = useState(false)
    const collegeTeam = teams.find((team) => team.id === teamId)

    const team2026 = season2026Stats.find(
        (team) => normalizeTeamName(team.team) === normalizeTeamName(teamName))

    useEffect(() => {
        if (activeTab !== '2026') {
            return
        }

        if (season2026Stats.length > 0) {
            return
        }

        async function load2026Stats() {
            setLoading2026(true)

            try {
                const stats =
                    await get2026SeasonStats()

                setSeason2026Stats(stats)
            } catch (error) {
                console.error(
                    'Failed to load 2026 stats:',
                    error
                )
            } finally {
                setLoading2026(false)
            }
        }

        void load2026Stats()
    }, [activeTab, season2026Stats.length])

    return (
        <ModalBackdrop onClick={onClose}>
            <DetailsCard onClick={(event) => event.stopPropagation()}>
                <ModalHeader>
                    <TeamLogo src={getTeamLogo(teamName)} alt={teamName}/>

                    <ModalTitle>
                        <h2>{teamName}</h2>
                        <p>{isOpponent ? getOpponentStatLabel(unitType) : formatUnitType(unitType)}</p>
                    </ModalTitle>

                    <CloseButton onClick={onClose}>Close</CloseButton>
                </ModalHeader>

                <TabBar>
                    <TabButton $active={activeTab === '2025'} onClick={() => setActiveTab('2025')}>
                        2025 Stats
                    </TabButton>

                    <TabButton $active={activeTab === '2026'} onClick={() => setActiveTab('2026')}>
                        2026 Stats
                    </TabButton>

                    <TabButton $active={activeTab === 'SCHEDULE'} onClick={() => setActiveTab('SCHEDULE')}>
                        Schedule
                    </TabButton>
                </TabBar>

                {activeTab === '2025' && (
                    <StatsContent>
                        {collegeTeam ? (
                            <Stats2025 collegeTeam={collegeTeam} teams={teams} unitType={unitType} isOpponent={isOpponent}/>
                        ) : (
                            <p>2025 stats unavailable.</p>
                        )}
                    </StatsContent>
                )}

                {activeTab === '2026' && (
                    <StatsContent>
                        {loading2026 ? (
                            <p>Loading 2026 stats...</p>
                        ) : team2026 ? (
                            <Stats2026 team={team2026} teams={season2026Stats} unitType={unitType} isOpponent={isOpponent}/>
                        ) : (
                            <p>2026 stats unavailable.</p>
                        )}
                    </StatsContent>
                )}

                {activeTab === 'SCHEDULE' && (
                    <ScheduleContent teamName={teamName}/>
                )}
            </DetailsCard>
        </ModalBackdrop>
    )
}

function Stats2025({ collegeTeam, teams, unitType, isOpponent }: { collegeTeam: CollegeTeam, teams: CollegeTeam[], unitType: RosterUnitType, isOpponent: boolean }) {
    const stats = collegeTeam.stats

    if (unitType === 'PASSING') {
        if (isOpponent) {
            return (
                <>
                    <StatRow
                        label="Passing Yards Allowed"
                        value={stats.passing_yards_allowed ?? 0}
                        rank={getStatRank(teams, collegeTeam.id, (team) => -(team.stats.passing_yards_allowed ?? 0))}
                    />

                    <StatRow
                        label="Passing Yards Allowed Per Game"
                        value={stats.passing_yards_allowed_per_game ?? 0}
                        rank={getStatRank(teams, collegeTeam.id, (team) => -(team.stats.passing_yards_allowed_per_game ?? 0))}
                    />

                    <StatRow
                        label="Takeaways"
                        value={stats.takeaways ?? 0}
                        rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.takeaways ?? 0)}
                    />
                </>
            )
        }

        return (
            <>
                <StatRow
                    label="Passing Yards"
                    value={stats.passing_yards ?? 0}
                    rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.passing_yards ?? 0)}
                />

                <StatRow
                    label="Passing Touchdowns"
                    value={stats.passing_touchdowns ?? 0}
                    rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.passing_touchdowns ?? 0)}
                />
            </>
        )
    }

    if (unitType === 'RUSHING') {
        if (isOpponent) {
            return (
                <>
                    <StatRow
                        label="Rushing Yards Allowed"
                        value={stats.rushing_yards_allowed ?? 0}
                        rank={getStatRank(teams, collegeTeam.id, (team) => -(team.stats.rushing_yards_allowed ?? 0))}
                    />

                    <StatRow
                        label="Rushing Yards Allowed Per Game"
                        value={stats.rushing_yards_allowed_per_game ?? 0}
                        rank={getStatRank(teams, collegeTeam.id,
                            (team) => -(team.stats.rushing_yards_allowed_per_game ?? 0))}
                    />

                    <StatRow
                        label="Takeaways"
                        value={stats.takeaways ?? 0}
                        rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.takeaways ?? 0)}
                    />
                </>
            )
        }

        return (
            <>
                <StatRow
                    label="Rushing Yards"
                    value={stats.rushing_yards ?? 0}
                    rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.rushing_yards ?? 0)}
                />

                <StatRow
                    label="Rushing Touchdowns"
                    value={stats.rushing_touchdowns ?? 0}
                    rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.rushing_touchdowns ?? 0)}
                />

                <StatRow
                    label="Rushing Yards Per Game"
                    value={stats.rushing_yards_per_game ?? 0}
                    rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.rushing_yards_per_game ?? 0)}
                />
            </>
        )
    }

    if (unitType === 'RECEIVING') {
        if (isOpponent) {
            return (
                <>
                    <StatRow
                        label="Passing Yards Allowed"
                        value={stats.passing_yards_allowed ?? 0}
                        rank={getStatRank(teams, collegeTeam.id, (team) => -(team.stats.passing_yards_allowed ?? 0))}
                    />

                    <StatRow
                        label="Passing Yards Allowed Per Game"
                        value={stats.passing_yards_allowed_per_game ?? 0}
                        rank={getStatRank(teams, collegeTeam.id, (team) => -(team.stats.passing_yards_allowed_per_game ?? 0))}
                    />
                </>
            )
        }

        return (
            <>
                <StatRow
                    label="Receiving Yards"
                    value={stats.passing_yards ?? 0}
                    rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.passing_yards ?? 0)}
                />

                <StatRow
                    label="Receiving Touchdowns"
                    value={stats.passing_touchdowns ?? 0}
                    rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.passing_touchdowns ?? 0)}
                />

                <StatRow
                    label="Receiving Yards Per Game"
                    value={stats.passing_yards_per_game ?? 0}
                    rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.passing_yards_per_game ?? 0)}
                />
            </>
        )
    }

    if (unitType === 'DEFENSE') {
        if (isOpponent) {
            return (
                <>
                    <StatRow
                        label="Points Per Game"
                        value={stats.points_per_game ?? 0}
                        rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.points_per_game ?? 0)}
                    />

                    <StatRow
                        label="Passing Yards Per Game"
                        value={stats.passing_yards_per_game ?? 0}
                        rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.passing_yards_per_game ?? 0)}
                    />

                    <StatRow
                        label="Rushing Yards Per Game"
                        value={stats.rushing_yards_per_game ?? 0}
                        rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.rushing_yards_per_game ?? 0)}
                    />

                    <StatRow
                        label="Total Yards Per Game"
                        value={stats.total_yards_per_game ?? 0}
                        rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.total_yards_per_game ?? 0)}
                    />

                    <StatRow
                        label="Turnovers"
                        value={stats.turnovers ?? 0}
                        rank={getStatRank(teams, collegeTeam.id, (team) => -(team.stats.turnovers ?? 0))}
                    />
                </>
            )
        }

        return (
            <>
                <StatRow
                    label="Points Allowed"
                    value={stats.points_allowed ?? 0}
                    rank={getStatRank(teams, collegeTeam.id, (team) => -(team.stats.points_allowed ?? 0))}
                />

                <StatRow
                    label="Yards Allowed"
                    value={stats.total_yards_allowed ?? 0}
                    rank={getStatRank(teams, collegeTeam.id, (team) => -(team.stats.total_yards_allowed ?? 0))}
                />

                <StatRow
                    label="Takeaways"
                    value={stats.takeaways ?? 0}
                    rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.takeaways ?? 0)}
                />
            </>
        )
    }

    return (
        <>
            <StatRow
                label="Field Goals Made"
                value={stats.field_goals_made ?? 0}
                rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.field_goals_made ?? 0)}
            />

            <StatRow
                label="Field Goals Attempted"
                value={stats.field_goals_attempted ?? 0}
                rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.field_goals_attempted ?? 0)}
            />

            <StatRow
                label="Field Goal Percentage"
                value={stats.field_goal_percentage ?? 0}
                rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.field_goal_percentage ?? 0)}
                suffix="%"
            />

            <StatRow
                label="Extra Points Made"
                value={stats.extra_points_made ?? 0}
                rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.extra_points_made ?? 0)}
            />

            <StatRow
                label="Extra Point Percentage"
                value={stats.extra_point_percentage ?? 0}
                rank={getStatRank(teams, collegeTeam.id, (team) => team.stats.extra_point_percentage ?? 0)}
                suffix="%"
            />
        </>
    )
}

function Stats2026({team, teams, unitType, isOpponent}: { team: Season2026Stats, teams: Season2026Stats[], unitType: RosterUnitType, isOpponent: boolean }) {
    function rank(getValue: (team: Season2026Stats) => number) {
        return getStatRankByName(teams, team.team, (item) => item.team, getValue)
    }

    if (unitType === 'PASSING') {
        if (isOpponent) {
            return (
                <>
                    <StatRow
                        label="Yards Allowed"
                        value={team.totalYardsAllowed}
                        rank={rank((item) => -item.totalYardsAllowed)}
                    />

                    <StatRow
                        label="Yards Allowed Per Game"
                        value={team.totalYardsAllowedPerGame}
                        rank={rank((item) => -item.totalYardsAllowedPerGame)}
                    />

                    <StatRow
                        label="Takeaways"
                        value={team.takeaways}
                        rank={rank((item) => item.takeaways)}
                    />
                </>
            )
        }

        return (
            <>
                <StatRow
                    label="Passing Yards"
                    value={team.passingYards}
                    rank={rank((item) => item.passingYards)}
                />

                <StatRow
                    label="Passing Touchdowns"
                    value={team.passingTouchdowns}
                    rank={rank((item) => item.passingTouchdowns)}
                />

                <StatRow
                    label="Passing Yards Per Game"
                    value={team.passingYardsPerGame}
                    rank={rank((item) => item.passingYardsPerGame)}
                />
            </>
        )
    }

    if (unitType === 'RUSHING') {
        if (isOpponent) {
            return (
                <>
                    <StatRow
                        label="Yards Allowed"
                        value={team.totalYardsAllowed}
                        rank={rank((item) => -item.totalYardsAllowed)}
                    />

                    <StatRow
                        label="Yards Allowed Per Game"
                        value={team.totalYardsAllowedPerGame}
                        rank={rank((item) => -item.totalYardsAllowedPerGame)}
                    />

                    <StatRow
                        label="Takeaways"
                        value={team.takeaways}
                        rank={rank((item) => item.takeaways)}
                    />
                </>
            )
        }

        return (
            <>
                <StatRow
                    label="Rushing Yards"
                    value={team.rushingYards}
                    rank={rank((item) => item.rushingYards)}
                />

                <StatRow
                    label="Rushing Touchdowns"
                    value={team.rushingTouchdowns}
                    rank={rank((item) => item.rushingTouchdowns)}
                />

                <StatRow
                    label="Rushing Yards Per Game"
                    value={team.rushingYardsPerGame}
                    rank={rank((item) => item.rushingYardsPerGame)}
                />
            </>
        )
    }

    if (unitType === 'RECEIVING') {
        if (isOpponent) {
            return (
                <>
                    <StatRow
                        label="Yards Allowed"
                        value={team.totalYardsAllowed}
                        rank={rank((item) => -item.totalYardsAllowed)}
                    />

                    <StatRow
                        label="Yards Allowed Per Game"
                        value={team.totalYardsAllowedPerGame}
                        rank={rank((item) => -item.totalYardsAllowedPerGame)}
                    />
                </>
            )
        }

        return (
            <>
                <StatRow
                    label="Receiving Yards"
                    value={team.passingYards}
                    rank={rank((item) => item.passingYards)}
                />

                <StatRow
                    label="Receiving Touchdowns"
                    value={team.passingTouchdowns}
                    rank={rank((item) => item.passingTouchdowns)}
                />

                <StatRow
                    label="Receiving Yards Per Game"
                    value={team.passingYardsPerGame}
                    rank={rank((item) => item.passingYardsPerGame)}
                />
            </>
        )
    }

    if (unitType === 'DEFENSE') {
        if (isOpponent) {
            return (
                <>
                    <StatRow
                        label="Passing Yards Per Game"
                        value={team.passingYardsPerGame}
                        rank={rank((item) => item.passingYardsPerGame)}
                    />

                    <StatRow
                        label="Rushing Yards Per Game"
                        value={team.rushingYardsPerGame}
                        rank={rank((item) => item.rushingYardsPerGame)}
                    />
                </>
            )
        }

        return (
            <>
                <StatRow
                    label="Points Allowed"
                    value={team.pointsAllowed}
                    rank={rank((item) => -item.pointsAllowed)}
                />

                <StatRow
                    label="Points Allowed Per Game"
                    value={team.pointsAllowedPerGame}
                    rank={rank((item) => -item.pointsAllowedPerGame)}
                />

                <StatRow
                    label="Yards Allowed"
                    value={team.totalYardsAllowed}
                    rank={rank((item) => -item.totalYardsAllowed)}
                />

                <StatRow
                    label="Yards Allowed Per Game"
                    value={team.totalYardsAllowedPerGame}
                    rank={rank((item) => -item.totalYardsAllowedPerGame)}
                />

                <StatRow
                    label="Takeaways"
                    value={team.takeaways}
                    rank={rank((item) => item.takeaways)}
                />

                <StatRow
                    label="Sacks"
                    value={team.sacks}
                    rank={rank((item) => item.sacks)}
                />
            </>
        )
    }

    return (
        <>
            <StatRow
                label="Field Goals Made"
                value={team.fieldGoalsMade}
                rank={rank((item) => item.fieldGoalsMade)}
            />

            <StatRow
                label="Field Goals Attempted"
                value={team.fieldGoalsAttempted}
                rank={rank((item) => item.fieldGoalsAttempted)}
            />

            <StatRow
                label="Field Goal Percentage"
                value={team.fieldGoalPercentage}
                rank={rank((item) => item.fieldGoalPercentage)}
                suffix="%"
            />

            <StatRow
                label="Extra Points Made"
                value={team.extraPointsMade}
                rank={rank((item) => item.extraPointsMade)}
            />

            <StatRow
                label="Extra Point Percentage"
                value={team.extraPointPercentage}
                rank={rank((item) => item.extraPointPercentage)}
                suffix="%"
            />

            <StatRow
                label="Special Teams Touchdowns"
                value={team.specialTeamsTouchdowns}
                rank={rank((item) => item.specialTeamsTouchdowns)}
            />

            <StatRow
                label="Blocked Kicks"
                value={team.blockedKicks}
                rank={rank((item) => item.blockedKicks)}
            />
        </>
    )
}

function ScheduleContent({teamName}: { teamName: string }) {
    const [games, setGames] = useState<EspnGame[]>([])
    const [loading, setLoading] = useState(true)
    const [espnTeamId, setEspnTeamId] = useState<string | null>(null)

    useEffect(() => {
        async function loadSchedule() {
            try {
                const resolvedEspnTeamId = await getEspnTeamId(teamName)
                const schedule = await getEspnTeamSchedule(resolvedEspnTeamId)

                setEspnTeamId(resolvedEspnTeamId)
                setGames(schedule)
            } catch (error) {
                console.error('Failed to load ESPN schedule:', error)
            } finally {
                setLoading(false)
            }
        }

        void loadSchedule()
    }, [teamName])

    if (loading) {
        return <p>Loading schedule...</p>
    }

    const scheduledWeeks = Array.from(
        {length: 13},
        (_, week) => week
    ).filter((week) => {
        const opponent = getTeamOpponent(teamName, week)

        return opponent && opponent !== 'BYE'
    })

    return (
        <ScheduleList>
            {Array.from({length: 13}, (_, week) => week).map((week) => {
                const opponent = getTeamOpponent(teamName, week)

                if (opponent === 'BYE') {
                    return (
                        <ScheduleRow key={week}>
                            <strong>Week {week}</strong>
                            <span>BYE</span>
                        </ScheduleRow>
                    )
                }

                const gameIndex = scheduledWeeks.indexOf(week)
                const game = games[gameIndex]

                const team = game?.teams.find(
                    (gameTeam) => gameTeam.espnTeamId === espnTeamId
                )

                const opponentTeam = game?.teams.find(
                    (gameTeam) => gameTeam.espnTeamId !== team?.espnTeamId
                )

                const hasScore =
                    team?.score !== null &&
                    team?.score !== undefined &&
                    opponentTeam?.score !== null &&
                    opponentTeam?.score !== undefined

                return (
                    <ScheduleRow key={week}>
                        <strong>Week {week}</strong>
                        <span>{opponent}</span>

                        {hasScore && (
                            <strong>
                                {team!.winner ? 'W' : 'L'}{' '}
                                {team!.score}-{opponentTeam!.score}
                            </strong>
                        )}
                    </ScheduleRow>
                )
            })}
        </ScheduleList>
    )
}

function StatRow({label, value, rank, suffix = ''}: { label: string, value: number, rank: number | null, suffix?: string }) {
    const displayedValue = Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, {maximumFractionDigits: 1})

    return (
        <StatLine>
            <span>{label}:</span>

            <strong>
                {displayedValue}
                {suffix}
                {' • '}
                {formatRank(rank)}
            </strong>
        </StatLine>
    )
}

function formatUnitType(unitType: RosterUnitType) {
    if (unitType === 'SPECIAL_TEAMS') {
        return 'Special Teams'
    }

    return (unitType.charAt(0) + unitType.slice(1).toLowerCase())
}

function getOpponentStatLabel(unitType: RosterUnitType) {
    switch (unitType) {
        case 'PASSING': return 'Passing Defense'
        case 'RUSHING': return 'Rushing Defense'
        case 'RECEIVING': return 'Passing Defense'
        case 'DEFENSE': return 'Offense'
        case 'SPECIAL_TEAMS': return 'Special Teams'
    }
}

function normalizeTeamName(teamName: string): string {
    return teamName.trim().toLowerCase()
}