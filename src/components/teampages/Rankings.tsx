import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { getTeams } from '../../api/cfbApi'
import type { CollegeTeam } from '../../types/football'
import { TeamLogo, getTeamLogo } from '../../styles/logos'

type RankingStat =
    | 'PASSING_YARDS'
    | 'PASSING_TDS'
    | 'RUSHING_YARDS'
    | 'RUSHING_TDS'
    | 'TURNOVERS'
    | 'TAKEAWAYS'
    | 'DEFENSIVE_TDS'
    | 'FIELD_GOALS'
    | 'SPECIAL_TEAMS_TDS'

const RANKINGS: Record<
    RankingStat,
    {
        label: string
        getValue: (team: CollegeTeam) => number
    }
> = {
    PASSING_YARDS: {
        label: 'Passing Yards',
        getValue: (team) => team.stats.passing_yards ?? 0,
    },

    PASSING_TDS: {
        label: 'Passing Touchdowns',
        getValue: (team) => team.stats.passing_touchdowns ?? 0,
    },

    RUSHING_YARDS: {
        label: 'Rushing Yards',
        getValue: (team) => team.stats.rushing_yards ?? 0,
    },

    RUSHING_TDS: {
        label: 'Rushing Touchdowns',
        getValue: (team) => team.stats.rushing_touchdowns ?? 0,
    },

    TURNOVERS: {
        label: 'Turnovers',
        getValue: (team) => team.stats.turnovers ?? 0,
    },

    TAKEAWAYS: {
        label: 'Takeaways',
        getValue: (team) => team.stats.takeaways ?? 0,
    },

    DEFENSIVE_TDS: {
        label: 'Defensive Touchdowns',
        getValue: (team) => team.stats.defensive_touchdowns ?? 0,
    },

    FIELD_GOALS: {
        label: 'Field Goals Made',
        getValue: (team) => team.stats.field_goals_made ?? 0,
    },

    SPECIAL_TEAMS_TDS: {
        label: 'Special Teams Touchdowns',
        getValue: (team) =>
            team.stats.special_teams_touchdowns ?? 0,
    },
}

const RankingsPage = styled.div`
    display: grid;
    gap: 24px;
`

const HeaderCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`

const BackLink = styled(Link)`
    display: inline-block;
    margin-bottom: 14px;
    color: #374151;
    font-weight: 700;
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }
`

const RankingsCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
`

const RankingSelect = styled.select`
    padding: 9px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 18px;
`

const RankingList = styled.div`
    display: grid;
`

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
`

const RankingNumber = styled.div`
    font-size: 1.1rem;
    font-weight: 700;
    color: #6b7280;
`

const RankingTeam = styled.div`
    font-weight: 700;
    color: #111827;
`

const RankingValue = styled.div`
    font-size: 1.1rem;
    font-weight: 700;
    color: #111827;
`

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

export default function Rankings() {
    const [teams, setTeams] = useState<CollegeTeam[]>([])
    const [selectedRanking, setSelectedRanking] = useState<RankingStat>('PASSING_YARDS')

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadTeams() {
            try {
                const data = await getTeams()
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

    const ranking = [...teams].sort(
        (a, b) =>
            RANKINGS[selectedRanking].getValue(b) -
            RANKINGS[selectedRanking].getValue(a)
    )

    return (
        <RankingsPage>
            <HeaderCard>
                <BackLink to="/units">← Back to Units</BackLink>

                <h1>2025 College Football Rankings</h1>

                <p>Compare teams by their 2025 statistics.</p>
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
                            <option key={key} value={key}>
                                {ranking.label}
                            </option>
                        )
                    )}
                </RankingSelect>

                <RankingList>
                    {ranking.map((team, index) => {
                        const value = RANKINGS[selectedRanking].getValue(team)

                        const previousValue = index > 0 ? RANKINGS[selectedRanking].getValue(ranking[index - 1]) : null

                        const rank =
                            index > 0 && value === previousValue
                                ? (() => {
                                    let tiedIndex = index - 1

                                    while (
                                        tiedIndex > 0 &&
                                        RANKINGS[selectedRanking].getValue(ranking[tiedIndex]) ===
                                        RANKINGS[selectedRanking].getValue(ranking[tiedIndex - 1])
                                        ) {
                                        tiedIndex--
                                    }

                                    return (tiedIndex + 1)
                                })()
                                : index + 1

                        return (
                            <RankingRow key={team.id}>
                                <RankingNumber>{formatRank(rank)}</RankingNumber>

                                <TeamLogo src={getTeamLogo(team.name)} alt={team.name}/>

                                <RankingTeam>{team.name}</RankingTeam>

                                <RankingValue>{value}</RankingValue>
                            </RankingRow>
                        )
                    })}
                </RankingList>
            </RankingsCard>
        </RankingsPage>
    )
}