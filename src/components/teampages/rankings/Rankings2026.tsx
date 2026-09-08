import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {get2026SeasonStats, type Season2026Stats } from '../../../utils/2026stats'

import { TeamLogo, getTeamLogo } from '../../../styles/logos'

type RankingStat =
    | 'PASSING_YARDS'
    | 'PASSING_TDS'
    | 'PASSING_YPG'
    | 'RUSHING_YARDS'
    | 'RUSHING_TDS'
    | 'RUSHING_YPG'
    | 'TURNOVERS'
    | 'TAKEAWAYS'
    | 'DEFENSIVE_TDS'
    | 'SACKS'
    | 'POINTS_ALLOWED'
    | 'YARDS_ALLOWED'
    | 'FIELD_GOALS'
    | 'SPECIAL_TEAMS_TDS'

const RANKINGS: Record<
    RankingStat,
    {
        label: string
        getValue: (team: Season2026Stats) => number
        lowerIsBetter?: boolean
    }
> = {
    PASSING_YARDS: {
        label: 'Passing Yards',
        getValue: (team) => team.passingYards,
    },

    PASSING_TDS: {
        label: 'Passing Touchdowns',
        getValue: (team) => team.passingTouchdowns,
    },

    PASSING_YPG: {
        label: 'Passing Yards Per Game',
        getValue: (team) => team.passingYardsPerGame,
    },

    RUSHING_YARDS: {
        label: 'Rushing Yards',
        getValue: (team) => team.rushingYards,
    },

    RUSHING_TDS: {
        label: 'Rushing Touchdowns',
        getValue: (team) => team.rushingTouchdowns,
    },

    RUSHING_YPG: {
        label: 'Rushing Yards Per Game',
        getValue: (team) => team.rushingYardsPerGame,
    },

    TURNOVERS: {
        label: 'Turnovers',
        getValue: (team) =>
            team.passingInterceptions +
            team.rushingFumblesLost +
            team.receivingFumblesLost,
        lowerIsBetter: true,
    },

    TAKEAWAYS: {
        label: 'Takeaways',
        getValue: (team) => team.takeaways,
    },

    DEFENSIVE_TDS: {
        label: 'Defensive Touchdowns',
        getValue: (team) => team.defensiveTouchdowns,
    },

    SACKS: {
        label: 'Sacks',
        getValue: (team) => team.sacks,
    },

    POINTS_ALLOWED: {
        label: 'Points Allowed',
        getValue: (team) => team.pointsAllowed,
        lowerIsBetter: true,
    },

    YARDS_ALLOWED: {
        label: 'Yards Allowed',
        getValue: (team) => team.totalYardsAllowed,
        lowerIsBetter: true,
    },

    FIELD_GOALS: {
        label: 'Field Goals Made',
        getValue: (team) => team.fieldGoalsMade,
    },

    SPECIAL_TEAMS_TDS: {
        label: 'Special Teams Touchdowns',
        getValue: (team) => team.specialTeamsTouchdowns,
    },
}

const RankingsPage = styled.div`
    display: grid;
    gap: 24px;
`;

const HeaderCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const BackLink = styled(Link)`
    display: inline-block;
    margin-bottom: 14px;
    color: #374151;
    font-weight: 700;
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }
`;

const RankingsCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
`;

const RankingSelect = styled.select`
    padding: 9px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 18px;
`;

const RankingList = styled.div`
    display: grid;
`;

const RankingRow = styled.div`
    display: grid;
    grid-template-columns: 40px 48px 1fr auto;
    align-items: center;
    gap: 12px;

    padding: 12px 0;
    border-bottom: 1px solid #e5e7eb;

    &:last-child {
        border-bottom: none;
    }
`;

const RankingNumber = styled.div`
    font-size: 1.1rem;
    font-weight: 700;
    color: #6b7280;
`;

const RankingTeam = styled.div`
    font-weight: 700;
    color: #111827;
`;

const RankingValue = styled.div`
    font-size: 1.1rem;
    font-weight: 700;
    color: #111827;
`;

function formatRank(rank: number) {
    const lastTwo = rank % 100

    if (lastTwo >= 11 && lastTwo <= 13) {
        return `${rank}th`
    }

    switch (rank % 10) {
        case 1: return `${rank}st`
        case 2: return `${rank}nd`
        case 3: return `${rank}rd`
        default: return `${rank}th`
    }
}

function formatValue(value: number) {
    return Number.isInteger(value)
        ? value.toLocaleString()
        : value.toLocaleString(undefined, {
            maximumFractionDigits: 1,
        })
}

export default function Rankings2026() {
    const [teams, setTeams] = useState<Season2026Stats[]>([])

    const [selectedRanking, setSelectedRanking] =
        useState<RankingStat>('PASSING_YARDS')

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadTeams() {
            try {
                const data = await get2026SeasonStats()

                setTeams(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load rankings.')
            } finally {
                setLoading(false)
            }
        }

        loadTeams()
    }, [])

    if (loading) {
        return <p>Loading rankings...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    const rankingDefinition = RANKINGS[selectedRanking]

    const ranking = [...teams].sort((a, b) => {
        const aValue = rankingDefinition.getValue(a)
        const bValue = rankingDefinition.getValue(b)

        return rankingDefinition.lowerIsBetter ? aValue - bValue : bValue - aValue
    })

    return (
        <RankingsPage>
            <HeaderCard>
                <BackLink to="/units">← Back to Units</BackLink>
                <h1>2026 College Football Rankings</h1>
                <p>Compare teams by their 2026 statistics.</p>
            </HeaderCard>

            <RankingsCard>
                <RankingSelect
                    value={selectedRanking}
                    onChange={(event) =>
                        setSelectedRanking(event.target.value as RankingStat)
                    }
                >
                    {Object.entries(RANKINGS).map(
                        ([key, ranking]) => (
                            <option key={key} value={key}>{ranking.label}</option>
                        )
                    )}
                </RankingSelect>

                <RankingList>
                    {ranking.map((team, index) => {
                        const value = rankingDefinition.getValue(team)
                        const previousValue = index > 0 ? rankingDefinition.getValue(ranking[index - 1]) : null

                        const rank = index > 0 &&
                            value === previousValue
                                ? (() => {
                                    let tiedIndex = index - 1

                                    while (tiedIndex > 0 &&
                                        rankingDefinition.getValue(ranking[tiedIndex]) === rankingDefinition.getValue(ranking[tiedIndex - 1])
                                    ) {
                                        tiedIndex--
                                    }

                                    return tiedIndex + 1
                                })()
                                : index + 1

                        return (
                            <RankingRow key={team.team}>
                                <RankingNumber>{formatRank(rank)}</RankingNumber>
                                <TeamLogo src={getTeamLogo(team.team)} alt={team.team}/>
                                <RankingTeam>{team.team}</RankingTeam>
                                <RankingValue>{formatValue(value)}</RankingValue>
                            </RankingRow>
                        )
                    })}
                </RankingList>
            </RankingsCard>
        </RankingsPage>
    )
}