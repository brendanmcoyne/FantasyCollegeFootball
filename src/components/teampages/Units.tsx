import { useEffect, useState } from 'react'
import { getTeams } from '../../api/cfbApi'
import { createDraftUnits } from '../../utils/Units'

import type { CollegeTeam } from '../../types/football'
import type { DraftUnit, UnitType } from '../../types/fantasy'

import styled from 'styled-components'
import { TeamLogo, getTeamLogo } from '../../styles/logos'

const UnitsPage = styled.div`
    display: grid;
    gap: 24px;
`

const UnitStats = styled.div`
    margin-top: 8px;
    display: grid;
    gap: 3px;
    color: #4b5563;
    font-size: 0.85rem;
`

const HeaderCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`

const FiltersCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 18px;
    display: grid;
    gap: 18px;
`

const FilterGroup = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`

const FilterButton = styled.button<{ $active?: boolean }>`
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 8px 12px;
    font-weight: 600;
    cursor: pointer;

    background: ${({ $active }) =>
    $active ? '#1f2937' : '#ffffff'};

    color: ${({ $active }) =>
    $active ? '#ffffff' : '#374151'};

    &:hover {
        background: ${({ $active }) =>
    $active ? '#111827' : '#f3f4f6'};
    }
`

const UnitGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(
        auto-fill,
        minmax(220px, 1fr)
    );
    gap: 14px;
`

const UnitCard = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
`

const UnitInfo = styled.div`
    min-width: 0;
`

const UnitName = styled.div`
    font-weight: 700;
    color: #111827;
`

const UnitMeta = styled.div`
    margin-top: 4px;
    color: #6b7280;
    font-size: 0.9rem;
`

export default function Units() {
    const [teams, setTeams] = useState<CollegeTeam[]>([])
    const [units, setUnits] = useState<DraftUnit[]>([])
    const [selectedType, setSelectedType] = useState<UnitType | 'ALL'>('ALL')
    const [selectedConference, setSelectedConference] = useState<string>('ALL')

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadTeams() {
            try {
                const data = await getTeams()

                setTeams(data)
                setUnits(createDraftUnits(data))
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message)
                } else {
                    setError('Something went wrong')
                }
            } finally {
                setLoading(false)
            }
        }

        loadTeams()
    }, [])

    if (loading) {
        return <p>Loading units...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    const filteredUnits = units.filter((unit) => {
        const matchesType =
            selectedType === 'ALL' ||
            unit.unitType === selectedType

        const matchesConference =
            selectedConference === 'ALL' ||
            unit.conference === selectedConference

        return matchesType && matchesConference
    })

    return (
        <UnitsPage>
            <HeaderCard>
                <h1>College Football Units</h1>

                <p>
                    {teams.length} teams | {units.length} draftable units
                </p>
            </HeaderCard>

            <FiltersCard>
                <div>
                    <h3>Unit Type</h3>

                    <FilterGroup>
                        <FilterButton
                            $active={selectedType === 'ALL'}
                            onClick={() => setSelectedType('ALL')}
                        >
                            All
                        </FilterButton>

                        <FilterButton
                            $active={selectedType === 'PASSING'}
                            onClick={() => setSelectedType('PASSING')}
                        >
                            Passing
                        </FilterButton>

                        <FilterButton
                            $active={selectedType === 'RUSHING'}
                            onClick={() => setSelectedType('RUSHING')}
                        >
                            Rushing
                        </FilterButton>

                        <FilterButton
                            $active={selectedType === 'RECEIVING'}
                            onClick={() => setSelectedType('RECEIVING')}
                        >
                            Receiving
                        </FilterButton>

                        <FilterButton
                            $active={selectedType === 'DEFENSE'}
                            onClick={() => setSelectedType('DEFENSE')}
                        >
                            Defense
                        </FilterButton>

                        <FilterButton
                            $active={selectedType === 'SPECIAL_TEAMS'}
                            onClick={() => setSelectedType('SPECIAL_TEAMS')}
                        >
                            Special Teams
                        </FilterButton>
                    </FilterGroup>
                </div>

                <div>
                    <h3>Conference</h3>

                    <FilterGroup>
                        {[
                            'ALL',
                            'ACC',
                            'Big Ten',
                            'Big 12',
                            'SEC',
                        ].map((conference) => (
                            <FilterButton
                                key={conference}
                                $active={
                                    selectedConference === conference
                                }
                                onClick={() =>
                                    setSelectedConference(conference)
                                }
                            >
                                {conference === 'ALL'
                                    ? 'All Conferences'
                                    : conference}
                            </FilterButton>
                        ))}
                    </FilterGroup>
                </div>
            </FiltersCard>

            <UnitGrid>
                {filteredUnits.map((unit) => {
                    const team = teams.find(
                        (team) => team.id === unit.teamId
                    )

                    return (
                        <UnitCard key={unit.id}>
                            <TeamLogo
                                src={getTeamLogo(unit.teamName)}
                                alt={unit.teamName}
                            />

                            <UnitInfo>
                                <UnitName>
                                    {unit.teamName}{' '}
                                    {formatUnitType(unit.unitType)}
                                </UnitName>

                                <UnitMeta>
                                    {unit.conference}
                                </UnitMeta>

                                <UnitStats>
                                    {getUnitStats(unit.unitType, team)}
                                </UnitStats>
                            </UnitInfo>
                        </UnitCard>
                    )
                })}
            </UnitGrid>
        </UnitsPage>
    )
}

function formatUnitType(unitType: UnitType) {
    return unitType === 'SPECIAL_TEAMS'
        ? 'Special Teams'
        : unitType.charAt(0) +
        unitType.slice(1).toLowerCase()
}

function getUnitStats(unitType: UnitType, team?: CollegeTeam) {
    if (!team) {
        return null
    }

    const stats = team.stats

    switch (unitType) {
        case 'PASSING':
            return (
                <>
                    <span>
                        Passing Yards: {stats.passing_yards ?? 0}
                    </span>
                    <span>
                        Passing TDs: {stats.passing_touchdowns ?? 0}
                    </span>
                </>
            )

        case 'RUSHING':
            return (
                <>
                    <span>
                        Rushing Yards: {stats.rushing_yards ?? 0}
                    </span>
                    <span>
                        Rushing TDs: {stats.rushing_touchdowns ?? 0}
                    </span>
                </>
            )

        case 'RECEIVING':
            return (
                <>
                    <span>
                        Receiving Yards: {stats.passing_yards ?? 0}
                    </span>
                    <span>
                        Receiving TDs: {stats.passing_touchdowns ?? 0}
                    </span>
                </>
            )

        case 'DEFENSE':
            return (
                <>
                    <span>
                        Points Allowed: {stats.points_allowed ?? 0}
                    </span>
                    <span>
                        Yards Allowed: {stats.total_yards_allowed ?? 0}
                    </span>
                    <span>
                        Takeaways: {stats.takeaways ?? 0}
                    </span>
                </>
            )

        case 'SPECIAL_TEAMS':
            return (
                <>
                    <span>
                        FGs: {stats.field_goals_made ?? 0}/
                        {stats.field_goals_attempted ?? 0}
                    </span>
                    <span>
                        XPs: {stats.extra_points_made ?? 0}/
                        {stats.extra_points_attempted ?? 0}
                    </span>
                    <span>
                        ST TDs: {stats.special_teams_touchdowns ?? 0}
                    </span>
                </>
            )
    }
}