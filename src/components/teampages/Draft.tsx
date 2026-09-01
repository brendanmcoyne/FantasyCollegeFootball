import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getTeams } from '../../api/cfbApi'
import { createDraftUnits } from '../../utils/Units'
import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'
import { STARTERS, BENCH, ROSTER_SIZE } from '../../rosters'
import type { CollegeTeam } from '../../types/football'
import { getUnitStats } from '../../utils/unitStats'

import type { DraftUnit, UnitType } from '../../types/fantasy'
import {BackButton} from "../../styles/commonstyles";

import styled from 'styled-components'
import { TeamLogo, getTeamLogo } from '../../styles/logos'

interface LeagueMember {
    id: string
    team_name: string
}

interface DraftPick {
    id: string
    league_member_id: string
    college_team_id: number
    unit_type: string
    pick_number: number
}

interface LeagueData {
    id: string
    draft_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
    current_pick_number: number
    current_turn_number: number
}

interface DraftOrder {
    league_member_id: string
    draft_position: number
}

const ResultsPage = styled.div`
    display: grid;
    gap: 20px;
`

const ResultsHeader = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`

const ResultsList = styled.div`
    display: grid;
    gap: 10px;
`

const PickRow = styled.div`
    display: grid;
    grid-template-columns: 70px 48px 1fr auto;
    align-items: center;
    gap: 14px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    padding: 12px 14px;
`

const PickNumber = styled.div`
    font-weight: 700;
    color: #6b7280;
`

const PickInfo = styled.div`
    min-width: 0;
`

const PickTeam = styled.div`
    font-weight: 700;
    color: #111827;
`

const PickType = styled.div`
    margin-top: 3px;
    color: #6b7280;
    font-size: 0.9rem;
`

const Drafter = styled.div`
    font-weight: 700;
    color: #374151;
    text-align: right;
`

const DraftPage = styled.div`
    display: grid;
    gap: 20px;
`

const DraftHeader = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`

const DraftInfo = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 14px;
`

const InfoBadge = styled.div`
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 8px 12px;
    font-weight: 600;
    color: #374151;
`

const TurnStatus = styled.div<{ $myTurn: boolean }>`
    margin-top: 14px;
    padding: 10px 14px;
    border-radius: 8px;
    font-weight: 700;
    background: ${({ $myTurn }) =>
    $myTurn ? '#dcfce7' : '#f3f4f6'};
    color: ${({ $myTurn }) =>
    $myTurn ? '#166534' : '#6b7280'};
`

const RosterCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 18px;
`

const RosterCounts = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
`

const RosterCount = styled.div`
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 8px 12px;
    color: #374151;
    font-weight: 600;
`

const DraftGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(
        auto-fill,
        minmax(250px, 1fr)
    );
    gap: 14px;
`

const DraftUnitCard = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    padding: 14px;
`

const DraftUnitInfo = styled.div`
    flex: 1;
    min-width: 0;
`

const DraftUnitName = styled.div`
    font-weight: 700;
    color: #111827;
`

const DraftUnitType = styled.div`
    margin-top: 3px;
    color: #6b7280;
    font-size: 0.9rem;
`

const DraftButton = styled.button`
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    background: #1f2937;
    color: #ffffff;
    font-weight: 700;
    cursor: pointer;

    &:hover:not(:disabled) {
        background: #111827;
    }

    &:disabled {
        background: #d1d5db;
        color: #6b7280;
        cursor: not-allowed;
    }
`

const ErrorMessage = styled.div`
    padding: 10px 14px;
    background: #fee2e2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #991b1b;
    font-weight: 600;
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

const UnitStats = styled.div`
    margin-top: 8px;
    display: grid;
    gap: 3px;
    color: #4b5563;
    font-size: 0.85rem;
`;

const DraftPickRow = styled.div`
    display: grid;
    grid-template-columns: 55px 70px 1fr 220px;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 12px;

    @media (max-width: 700px) {
        grid-template-columns: 40px 56px minmax(0, 1fr);
        gap: 10px;
    }
`;

const DraftOwner = styled.div`
    font-weight: 700;
    text-align: right;

    @media (max-width: 700px) {
        grid-column: 3;
        text-align: left;
        font-size: 0.85rem;
        color: #6b7280;
        margin-top: 4px;
    }
`;

export default function Draft() {
    const { leagueId } = useParams()
    const { user } = useAuth()

    const [units, setUnits] = useState<DraftUnit[]>([])
    const [member, setMember] = useState<LeagueMember | null>(null)
    const [draftPicks, setDraftPicks] = useState<DraftPick[]>([])
    const [league, setLeague] = useState<LeagueData | null>(null)
    const [order, setOrder] = useState<DraftOrder[]>([])
    const [members, setMembers] = useState<LeagueMember[]>([])

    const [teams, setTeams] = useState<CollegeTeam[]>([])
    const [selectedType, setSelectedType] = useState<UnitType | 'ALL'>('ALL')
    const [selectedConference, setSelectedConference] = useState('ALL')

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        async function loadDraft() {
            if (!leagueId || !user) {
                setError('Missing league or user.')
                setLoading(false)
                return
            }

            try {
                const teams = await getTeams()

                setTeams(teams)
                setUnits(createDraftUnits(teams))

                const { data: membership, error: membershipError } = await supabase
                    .from('league_members')
                    .select('id, team_name')
                    .eq('league_id', leagueId)
                    .eq('user_id', user.id)
                    .single()

                if (membershipError) {
                    throw membershipError
                }

                setMember(membership)

                const { data: memberData, error: memberDataError } = await supabase
                    .from('league_members')
                    .select('id, team_name')
                    .eq('league_id', leagueId)

                if (memberDataError) {
                    throw memberDataError
                }

                setMembers(memberData ?? [])

                const { data: leagueData, error: leagueError } = await supabase
                    .from('leagues')
                    .select('id, draft_status, current_pick_number, current_turn_number')
                    .eq('id', leagueId)
                    .single()

                if (leagueError) {
                    throw leagueError
                }

                setLeague(leagueData)

                const {data: orderData, error: orderError,} = await supabase
                    .from('draft_order')
                    .select('league_member_id, draft_position')
                    .eq('league_id', leagueId)
                    .order('draft_position', {ascending: true})

                if (orderError) {
                    throw orderError
                }

                setOrder(orderData ?? [])

                const { data: picks, error: picksError } = await supabase
                    .from('draft_picks')
                    .select('id, league_member_id, college_team_id, unit_type, pick_number')
                    .eq('league_id', leagueId)
                    .order('pick_number', { ascending: true })

                if (picksError) {
                    setError(picksError.message)
                    return
                }

                setDraftPicks(picks ?? [])
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message)
                } else {
                    setError('Failed to load draft.')
                }
            } finally {
                setLoading(false)
            }
        }

        loadDraft()
    }, [leagueId, user])

    useEffect(() => {
        if (!leagueId) {
            return
        }

        const channel = supabase
            .channel(`draft-${leagueId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'draft_picks',
                    filter: `league_id=eq.${leagueId}`,
                },
                async () => {
                    const { data: picks, error: picksError } =
                        await supabase
                            .from('draft_picks')
                            .select('id, league_member_id, college_team_id, unit_type, pick_number')
                            .eq('league_id', leagueId)
                            .order('pick_number', { ascending: true })

                    if (!picksError) {
                        setDraftPicks(picks ?? [])
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'leagues',
                    filter: `id=eq.${leagueId}`,
                },
                async () => {
                    const { data: updatedLeague, error: leagueError } =
                        await supabase
                            .from('leagues')
                            .select('id, draft_status, current_pick_number, current_turn_number')
                            .eq('id', leagueId)
                            .single()

                    if (!leagueError) {
                        setLeague(updatedLeague)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [leagueId])

    if (loading) {
        return <p>Loading draft...</p>
    }

    if (error && !member) {
        return <p>{error}</p>
    }

    if (!league || !member) {
        return <p>Draft unavailable.</p>
    }

    if (league.draft_status === 'NOT_STARTED') {
        return <p>The draft has not started yet.</p>
    }

    if (order.length === 0) {
        return <p>Draft order has not been created.</p>
    }

    const memberCount = order.length
    const nextTurn = getNextEligibleDrafter(league.current_turn_number)

    if (!nextTurn) {
        return (
            <ResultsPage>
                <ResultsHeader>
                    <BackButton onClick={() => navigate(`/league/${leagueId}`)}>
                        ← Back to League
                    </BackButton>

                    <h1>Draft Results</h1>
                    <p>Draft complete!</p>
                </ResultsHeader>

                <ResultsList>
                    {draftPicks.map((pick) => {
                        const unit = units.find(
                            (unit) =>
                                unit.teamId === pick.college_team_id &&
                                unit.unitType === pick.unit_type
                        )

                        const drafter = members.find(
                            (member) =>
                                member.id === pick.league_member_id
                        )

                        return (
                            <PickRow key={pick.id}>
                                <PickNumber>
                                    #{pick.pick_number}
                                </PickNumber>

                                {unit && (
                                    <TeamLogo src={getTeamLogo(unit.teamName)} alt={unit.teamName}/>
                                )}

                                <PickInfo>
                                    <PickTeam>
                                        {unit?.teamName ?? 'Unknown Team'}
                                    </PickTeam>

                                    <PickType>
                                        {formatUnitType(pick.unit_type)}
                                    </PickType>
                                </PickInfo>

                                <Drafter>
                                    {drafter?.team_name ?? 'Unknown Team'}
                                </Drafter>
                            </PickRow>
                        )
                    })}
                </ResultsList>
            </ResultsPage>
        )
    }

    const currentDrafter = nextTurn.drafter
    const actualTurnNumber = nextTurn.turn

    const round = Math.floor(
        (actualTurnNumber - 1) / memberCount
    )

    const myTurn =
        currentDrafter.league_member_id === member.id

    const countRoster = rosterCounts()

    const benchUsed =
        Object.entries(countRoster).reduce(
            (total, [type, count]) => {
                const starterLimit = STARTERS[type as keyof typeof STARTERS]
                return total + Math.max(0, count - starterLimit)
            },
            0
        )

    function getMemberPickCount(memberId: string) {
        return draftPicks.filter(
            (pick) => pick.league_member_id === memberId
        ).length
    }

    function isMemberRosterFull(memberId: string) {
        return getMemberPickCount(memberId) >= ROSTER_SIZE
    }

    function getDrafterForTurn(turnNumber: number) {
        const memberCount = order.length
        const round = Math.floor((turnNumber - 1) / memberCount)
        const positionInRound = (turnNumber - 1) % memberCount

        const draftIndex =
            round % 2 === 0
                ? positionInRound
                : memberCount - 1 - positionInRound

        return order[draftIndex]
    }

    function getNextEligibleDrafter(startingTurn: number) {
        let turn = startingTurn

        const allRostersFull = order.every((entry) => isMemberRosterFull(entry.league_member_id))

        if (allRostersFull) {
            return null
        }

        while (true) {
            const drafter = getDrafterForTurn(turn)

            if (drafter && !isMemberRosterFull(drafter.league_member_id)) {
                return {drafter, turn}
            }

            turn = turn + 1
        }
    }

    async function draftUnit(unit: DraftUnit) {
        if (!leagueId || !member || !league) {
            return
        }

        if (!myTurn) {
            setError('It is not your turn.')
            return
        }

        setError('')

        const { error: draftError } = await supabase.rpc('make_draft_pick',
            {
                target_league_id: leagueId,
                target_league_member_id: member.id,
                target_college_team_id: unit.teamId,
                target_unit_type: unit.unitType,
            }
        )

        if (draftError) {
            if (draftError.code === '23505') {
                setError('That unit has already been drafted.')
            } else {
                setError(draftError.message)
            }

            return
        }

        const { data: picks, error: picksError } = await supabase
            .from('draft_picks')
            .select('id, league_member_id, college_team_id, unit_type, pick_number')
            .eq('league_id', leagueId)
            .order('pick_number', { ascending: true })

        if (picksError) {
            setError(picksError.message)
            return
        }

        setDraftPicks(picks ?? [])

        const {data: updatedLeague, error: leagueError,} = await supabase
            .from('leagues')
            .select('id, draft_status, current_pick_number, current_turn_number')
            .eq('id', leagueId)
            .single()

        if (leagueError) {
            setError(leagueError.message)
            return
        }

        setLeague(updatedLeague)
    }

    function rosterCounts() {
        const myPicks = draftPicks.filter((pick) => pick.league_member_id === member?.id)

        const counts = {
            PASSING: 0,
            RUSHING: 0,
            RECEIVING: 0,
            DEFENSE: 0,
            SPECIAL_TEAMS: 0,
        }

        for (const pick of myPicks) {
            if (pick.unit_type in counts) {
                counts[pick.unit_type as keyof typeof counts]++
            }
        }

        return counts
    }

    function canDraftUnitType(unitType: DraftUnit['unitType']) {
        const counts = rosterCounts()

        const starterLimit = STARTERS[unitType]
        const currentCount = counts[unitType]

        if (currentCount < starterLimit) {
            return true
        }

        const benchUsed =
            Object.entries(counts).reduce(
                (total, [type, count]) => {
                    const starterLimit = STARTERS[type as keyof typeof STARTERS]
                    return total + Math.max(0, count - starterLimit)
                },
                0
            )

        return benchUsed < BENCH
    }

    function isDrafted(unit: DraftUnit) {
        return draftPicks.some(
            (pick) =>
                pick.college_team_id === unit.teamId &&
                pick.unit_type === unit.unitType
        )
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
        <DraftPage>
            <DraftHeader>
                <BackButton
                    onClick={() =>
                        navigate(`/league/${leagueId}`)
                    }
                >
                    ← Back to League
                </BackButton>

                <h1>Draft Room</h1>

                <DraftInfo>
                    <InfoBadge>
                        Round {round + 1}
                    </InfoBadge>

                    <InfoBadge>
                        Pick #{league.current_pick_number}
                    </InfoBadge>

                    <InfoBadge>
                        Status: {league.draft_status.split('_').join(' ')}
                    </InfoBadge>
                </DraftInfo>

                <TurnStatus $myTurn={myTurn}>
                    {myTurn
                        ? 'Your turn!'
                        : 'Waiting for another team...'}
                </TurnStatus>

                {error && (
                    <ErrorMessage>
                        {error}
                    </ErrorMessage>
                )}
            </DraftHeader>

            <RosterCard>
                <h2>Your Roster</h2>

                <RosterCounts>
                    <RosterCount>
                        Passing: {countRoster.PASSING} / 3
                    </RosterCount>

                    <RosterCount>
                        Rushing: {countRoster.RUSHING} / 3
                    </RosterCount>

                    <RosterCount>
                        Receiving: {countRoster.RECEIVING} / 3
                    </RosterCount>

                    <RosterCount>
                        Defense: {countRoster.DEFENSE} / 2
                    </RosterCount>

                    <RosterCount>
                        Special Teams: {countRoster.SPECIAL_TEAMS} / 2
                    </RosterCount>

                    <RosterCount>
                        Bench: {benchUsed} / 3
                    </RosterCount>
                </RosterCounts>
            </RosterCard>

            <FiltersCard>
                <div>
                    <h3>Unit Type</h3>

                    <FilterGroup>
                        {[
                            'ALL',
                            'PASSING',
                            'RUSHING',
                            'RECEIVING',
                            'DEFENSE',
                            'SPECIAL_TEAMS',
                        ].map((type) => (
                            <FilterButton
                                key={type}
                                $active={selectedType === type}
                                onClick={() =>
                                    setSelectedType(
                                        type as UnitType | 'ALL'
                                    )
                                }
                            >
                                {type === 'ALL'
                                    ? 'All'
                                    : formatUnitType(type)}
                            </FilterButton>
                        ))}
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
                                {conference === 'ALL' ? 'All Conferences' : conference}
                            </FilterButton>
                        ))}
                    </FilterGroup>
                </div>
            </FiltersCard>

            <DraftGrid>
                {filteredUnits.map((unit) => {
                    const drafted = isDrafted(unit)
                    const eligible = canDraftUnitType(unit.unitType)

                    const team = teams.find(
                        (team) => team.id === unit.teamId
                    )

                    return (
                        <DraftUnitCard key={unit.id}>
                            <TeamLogo src={getTeamLogo(unit.teamName)} alt={unit.teamName}/>

                            <DraftUnitInfo>
                                <DraftUnitName>
                                    {unit.teamName}
                                </DraftUnitName>

                                <DraftUnitType>
                                    {formatUnitType(unit.unitType)}
                                    {' • '}
                                    {unit.conference}
                                </DraftUnitType>

                                <UnitStats>
                                    {getUnitStats(unit.unitType, team)}
                                </UnitStats>
                            </DraftUnitInfo>

                            <DraftButton
                                disabled={drafted || !myTurn || !eligible}
                                onClick={() => draftUnit(unit)}
                            >
                                {drafted
                                    ? 'Drafted' : !eligible
                                    ? 'Roster Full' : myTurn
                                    ? 'Draft' : 'Waiting'}
                            </DraftButton>
                        </DraftUnitCard>
                    )
                })}
            </DraftGrid>
        </DraftPage>
    )
}

function formatUnitType(unitType: string): string {
    return unitType === 'SPECIAL_TEAMS' ? 'Special Teams'
        : unitType.charAt(0) + unitType.slice(1).toLowerCase()
}