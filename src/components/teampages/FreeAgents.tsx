import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getTeams } from '../../api/cfbApi'
import { getWeeklyStats } from '../../api/weeklyStats'
import { createDraftUnits } from '../../utils/Units'
import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'

import type { DraftUnit, UnitType } from '../../types/fantasy'
import type { CollegeTeam } from '../../types/football'
import type { RosterUnitType } from '../../rosters'

import { CURRENT_WEEK } from '../../bigseasonfile'
import {BackButton} from "../../styles/commonstyles";
import { TeamLogo, getTeamLogo } from '../../styles/logos'
import styled from 'styled-components'

import { getUnitStats } from '../../utils/unitStats'

interface OwnedUnit {
    id: string
    college_team_id: number
    unit_type: RosterUnitType
    league_member_id: string
    roster_slot: 'STARTER' | 'BENCH'
}

interface FreeAgentTransaction {
    id: string
    league_member_id: string
    added_college_team_id: number
    added_unit_type: string
    dropped_college_team_id: number
    dropped_unit_type: string
    created_at: string
}

interface MyRosterUnit {
    id: string
    collegeTeamId: number
    teamName: string
    unitType: RosterUnitType
    rosterSlot: 'STARTER' | 'BENCH'
    gameStart: Date | null
    locked: boolean
}

interface FreeAgentUnit extends DraftUnit {
    gameStart: Date | null
    locked: boolean
}

interface LeagueMember {
    id: string
    team_name: string
}

const FreeAgentsPage = styled.div`
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

const FiltersCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 18px;
    display: grid;
    gap: 18px;

    @media (max-width: 700px) {
        padding: 16px;
        gap: 20px;
    }

    h3 {
        margin-top: 0;
        margin-bottom: 12px;
    }
`;

const FilterGroup = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    @media (max-width: 700px) {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    }
`;

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

    @media (max-width: 700px) {
        width: 100%;
        min-height: 44px;
        padding: 10px 8px;
        text-align: center;
    }
`;

const FreeAgentGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(
        auto-fill,
        minmax(260px, 1fr)
    );
    gap: 14px;
`;

const FreeAgentCard = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;

    min-height: 100px;
    box-sizing: border-box;

    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);

    @media (max-width: 700px) {
        height: 120px;
        min-height: 120px;
        padding: 12px;
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

const UnitMeta = styled.div`
    margin-top: 4px;
    color: #6b7280;
    font-size: 0.9rem;
`;

const ActionButton = styled.button`
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    background: #1f2937;
    color: white;
    font-weight: 700;
    cursor: pointer;

    &:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }
`;

const HistoryCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
`;

const HistoryRow = styled.div`
    padding: 10px 0;
    border-bottom: 1px solid #e5e7eb;

    &:last-child {
        border-bottom: none;
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
`;

const ModalCard = styled.div`
    width: min(600px, 100%);
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

const UnitNameButton = styled.button`
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

const StatsList = styled.div`
    display: grid;
    gap: 8px;
    color: #4b5563;
`;

export default function FreeAgents() {
    const { leagueId } = useParams()
    const { user } = useAuth()

    const [units, setUnits] = useState<FreeAgentUnit[]>([])
    const [ownedUnits, setOwnedUnits] = useState<OwnedUnit[]>([])
    const [myRoster, setMyRoster] = useState<MyRosterUnit[]>([])
    const [member, setMember] = useState<LeagueMember | null>(null)
    const [transactions, setTransactions] = useState<FreeAgentTransaction[]>([])
    const [teams, setTeams] = useState<CollegeTeam[]>([])
    const [members, setMembers] = useState<LeagueMember[]>([])

    const [selectedType, setSelectedType] = useState<UnitType | 'ALL'>('ALL')
    const [selectedConference, setSelectedConference] = useState('ALL')
    const [selectedFreeAgent, setSelectedFreeAgent] =
        useState<FreeAgentUnit | null>(null)

    const [selectedStatsUnit, setSelectedStatsUnit] =
        useState<{
            collegeTeamId: number
            teamName: string
            unitType: RosterUnitType
        } | null>(null)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        async function loadFreeAgents() {
            if (!leagueId || !user) {
                setError('Missing league or user.')
                setLoading(false)
                return
            }

            try {
                const teams = await getTeams()
                setTeams(teams)

                const teamMap = new Map<number, CollegeTeam>()

                teams.forEach((team) => {teamMap.set(team.id, team)})

                const weeklyStats = await getWeeklyStats(CURRENT_WEEK)

                const weeklyMap = new Map(
                    weeklyStats.map((team) => [
                        normalizeTeamName(team.team),
                        team,
                    ])
                )

                const now = new Date()

                const draftUnits = createDraftUnits(teams)

                const unitsWithLocks: FreeAgentUnit[] =
                    draftUnits.map((unit) => {
                        const weeklyTeam = weeklyMap.get(normalizeTeamName(unit.teamName))

                        const gameStart = weeklyTeam?.gameStart ?? null

                        return {
                            ...unit, gameStart, locked: isGameLocked(gameStart, now),
                        }
                    })

                setUnits(unitsWithLocks)

                const { data: memberData, error: memberDataError } =
                    await supabase
                        .from('league_members')
                        .select('id, team_name')
                        .eq('league_id', leagueId)

                if (memberDataError) {
                    throw memberDataError
                }

                setMembers(memberData ?? [])

                const {data: membership, error: membershipError} = await supabase
                    .from('league_members')
                    .select('id, team_name')
                    .eq('league_id', leagueId)
                    .eq('user_id', user.id)
                    .single()

                if (membershipError) {
                    throw membershipError
                }

                setMember(membership)

                const {data: owned, error: ownedError} = await supabase
                    .from('roster_units')
                    .select('id, college_team_id, unit_type, league_member_id, roster_slot')
                    .eq('league_id', leagueId)

                if (ownedError) {
                    throw ownedError
                }

                setOwnedUnits(owned ?? [])

                const {data: transactionData, error: transactionError} = await supabase
                    .from('free_agent_transactions')
                    .select('id, league_member_id, added_college_team_id, added_unit_type, dropped_college_team_id, dropped_unit_type, created_at')
                    .eq('league_id', leagueId)
                    .order('created_at', { ascending: false })

                if (transactionError) {
                    throw transactionError
                }

                setTransactions(transactionData ?? [])

                const myUnits: MyRosterUnit[] =
                    (owned ?? [])
                        .filter(
                            (unit) =>
                                unit.league_member_id === membership.id
                        )
                        .map((unit) => {
                            const teamName =
                                teamMap.get(unit.college_team_id)?.name
                                ?? 'Unknown Team'

                            const weeklyTeam =
                                weeklyMap.get(normalizeTeamName(teamName))

                            const gameStart = weeklyTeam?.gameStart ?? null

                            return {
                                id: unit.id,
                                collegeTeamId:
                                unit.college_team_id,
                                teamName,
                                unitType:
                                    unit.unit_type as RosterUnitType,
                                rosterSlot:
                                    unit.roster_slot as
                                        | 'STARTER'
                                        | 'BENCH',
                                gameStart,
                                locked: isGameLocked(gameStart, now),
                            }
                        })

                setMyRoster(myUnits)
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message)
                } else {
                    setError(
                        'Failed to load free agents.'
                    )
                }
            } finally {
                setLoading(false)
            }
        }


        loadFreeAgents()
    }, [leagueId, user])

    useEffect(() => {
        const interval = window.setInterval(() => {
            const now = new Date()

            setUnits((current) =>
                current.map((unit) => ({
                    ...unit,
                    locked: isGameLocked(unit.gameStart, now),
                }))
            )

            setMyRoster((current) =>
                current.map((unit) => ({
                    ...unit,
                    locked: isGameLocked(unit.gameStart, now),
                }))
            )
        }, 30000)

        return () => {
            window.clearInterval(interval)
        }
    }, [])

    if (loading) {
        return <p>Loading free agents...</p>
    }

    const teamMap = new Map(
        teams.map((team) => [team.id, team])
    )

    const freeAgents = units.filter((unit) =>
        !ownedUnits.some(
            (owned) =>
                owned.college_team_id === unit.teamId &&
                owned.unit_type === unit.unitType
        )
    )

    const filteredFreeAgents =
        freeAgents.filter((unit) => {
            const matchesType = selectedType === 'ALL' || unit.unitType === selectedType
            const matchesConference = selectedConference === 'ALL' || unit.conference === selectedConference

            return (matchesType && matchesConference)
        })

    async function makeMove(dropUnit: MyRosterUnit) {
        if (!leagueId || !member || !selectedFreeAgent) {
            return
        }

        const freeAgent =
            units.find((unit) => unit.id === selectedFreeAgent.id)

        const rosterUnit =
            myRoster.find((unit) => unit.id === dropUnit.id)

        if (!freeAgent || !rosterUnit) {
            return
        }

        const now = new Date()

        if (isGameLocked(freeAgent.gameStart, now)) {
            setError('You cannot add that unit because its game has already started.')
            return
        }

        if (isGameLocked(rosterUnit.gameStart, now)) {
            setError('You cannot drop that unit because its game has already started.')
            return
        }

        setError('')

        const { error: moveError } = await supabase.rpc('make_free_agent_move',
                {
                    target_league_id: leagueId,
                    target_league_member_id: member.id,
                    drop_roster_unit_id: rosterUnit.id,
                    add_college_team_id: freeAgent.teamId,
                    add_unit_type: freeAgent.unitType,
                }
            )

        if (moveError) {
            setError(moveError.message)
            return
        }

        window.location.reload()
    }


    return (
        <FreeAgentsPage>
            <HeaderCard>
                <BackButton onClick={() => navigate(-1)}>
                    ← Back
                </BackButton>

                <h1>Free Agents</h1>

                <p>Week {CURRENT_WEEK}</p>
            </HeaderCard>

            <FiltersCard>
                <div>
                    <h3>Unit Type</h3>

                    <FilterGroup>
                        {['ALL', 'PASSING', 'RUSHING', 'RECEIVING', 'DEFENSE', 'SPECIAL_TEAMS'].map((type) => (
                            <FilterButton
                                key={type}
                                $active={selectedType === type}
                                onClick={() =>
                                    setSelectedType(type as UnitType | 'ALL')
                                }
                            >
                                {formatUnitType(type)}
                            </FilterButton>
                        ))}
                    </FilterGroup>
                </div>

                <div>
                    <h3>Conference</h3>

                    <FilterGroup>
                        {['ALL', 'ACC', 'Big Ten', 'Big 12', 'SEC'].map((conference) => (
                            <FilterButton
                                key={conference}
                                $active={selectedConference === conference}
                                onClick={() => setSelectedConference(conference)}
                            >
                                {conference === 'ALL' ? 'All Conferences' : conference}
                            </FilterButton>
                        ))}
                    </FilterGroup>
                </div>
            </FiltersCard>

            <hr />

            <FreeAgentGrid>
                {filteredFreeAgents.map((unit) => (
                    <FreeAgentCard key={unit.id}>
                        <TeamLogo src={getTeamLogo(unit.teamName)} alt={unit.teamName}/>

                        <UnitInfo>
                            <UnitName>
                                <UnitNameButton
                                    onClick={() =>
                                        setSelectedStatsUnit({
                                            collegeTeamId: unit.teamId,
                                            teamName: unit.teamName,
                                            unitType: unit.unitType as RosterUnitType,
                                        })
                                    }
                                >
                                    {unit.teamName}
                                </UnitNameButton>

                                {' '}
                                {formatUnitType(unit.unitType)}
                            </UnitName>

                            <UnitMeta>
                                {unit.conference}

                                {unit.gameStart && (
                                    <>
                                        {' • '}
                                        {formatGameStart(unit.gameStart)}
                                    </>
                                )}
                            </UnitMeta>
                        </UnitInfo>

                        <ActionButton
                            disabled={unit.locked}
                            onClick={() => {
                                setError('')
                                setSelectedFreeAgent(unit)
                            }}
                        >
                            {unit.locked ? 'Locked' : 'Add'}
                        </ActionButton>
                    </FreeAgentCard>
                ))}
            </FreeAgentGrid>

            {selectedFreeAgent && (
                <ModalBackdrop
                    onClick={() => setSelectedFreeAgent(null)}
                >
                    <ModalCard
                        onClick={(event) => event.stopPropagation()}
                    >
                        <ModalHeader>
                            <TeamLogo
                                src={getTeamLogo(selectedFreeAgent.teamName)}
                                alt={selectedFreeAgent.teamName}
                            />

                            <ModalTitle>
                                <h2>
                                    Add {selectedFreeAgent.teamName}
                                </h2>

                                <p>
                                    {formatUnitType(
                                        selectedFreeAgent.unitType
                                    )}
                                </p>
                            </ModalTitle>

                            <CloseButton
                                onClick={() =>
                                    setSelectedFreeAgent(null)
                                }
                            >
                                Close
                            </CloseButton>
                        </ModalHeader>

                        <p>
                            Choose a unit to drop:
                        </p>

                        {error && (
                            <p
                                style={{
                                    marginTop: '16px',
                                    color: '#991b1b',
                                    background: '#fee2e2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    fontWeight: 600,
                                }}
                            >
                                {error}
                            </p>
                        )}

                        {myRoster.map((unit) => (
                            <FreeAgentCard key={unit.id}>
                                <TeamLogo src={getTeamLogo(unit.teamName)} alt={unit.teamName}/>

                                <UnitInfo>
                                    <UnitName>
                                        <UnitNameButton
                                            onClick={() =>
                                                setSelectedStatsUnit({
                                                    collegeTeamId: unit.collegeTeamId,
                                                    teamName: unit.teamName,
                                                    unitType: unit.unitType,
                                                })
                                            }
                                        >
                                            {unit.teamName}
                                        </UnitNameButton>

                                        {' '}
                                        {formatUnitType(
                                            unit.unitType
                                        )}
                                    </UnitName>

                                    <UnitMeta>
                                        {unit.gameStart && formatGameStart(unit.gameStart)}
                                    </UnitMeta>
                                </UnitInfo>

                                <ActionButton disabled={unit.locked} onClick={() => makeMove(unit)}>
                                    {unit.locked ? 'Locked' : 'Drop'}
                                </ActionButton>
                            </FreeAgentCard>
                        ))}
                    </ModalCard>
                </ModalBackdrop>
            )}

            <HistoryCard>
            <h2>Free Agency History</h2>

            {transactions.length === 0 ? (
                <p>No free agency moves yet.</p>
            ) : (
                transactions.map((transaction) => {
                    const fantasyTeam = members.find((member) => member.id === transaction.league_member_id)

                    const addedTeam = teamMap.get(transaction.added_college_team_id)
                    const droppedTeam = teamMap.get(transaction.dropped_college_team_id)

                    return (
                        <HistoryRow key={transaction.id}>
                            <strong>
                                {fantasyTeam?.team_name ?? 'Unknown Team'}
                            </strong>

                            {' — Added '}

                            {addedTeam?.name ?? 'Unknown Team'}{' '}
                            {formatUnitType(transaction.added_unit_type)}

                            {' — Dropped '}

                            {droppedTeam?.name ?? 'Unknown Team'}{' '}
                            {formatUnitType(transaction.dropped_unit_type)}
                        </HistoryRow>
                    )
                })
            )}
            </HistoryCard>
            {selectedStatsUnit && (() => {
                const collegeTeam = teams.find(
                    (team) =>
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
                                        {' '}Stats
                                    </p>
                                </ModalTitle>

                                <CloseButton onClick={() => setSelectedStatsUnit(null)}>
                                    Close
                                </CloseButton>
                            </ModalHeader>

                            <StatsList>
                                {getUnitStats(selectedStatsUnit.unitType, collegeTeam)}
                            </StatsList>
                        </ModalCard>
                    </ModalBackdrop>
                )
            })()}
        </FreeAgentsPage>
    )
}

function normalizeTeamName(name: string): string {
    return name.trim().toLowerCase()
}

function isGameLocked(gameStart: Date | null, now = new Date()): boolean {
    return (gameStart !== null && now.getTime() >= gameStart.getTime())
}

function formatGameStart(date: Date): string {
    return date.toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }
    )
}

function formatUnitType(type: string): string {
    if (type === 'ALL') {
        return 'All'
    }

    if (type === 'SPECIAL_TEAMS') {
        return 'Special Teams'
    }

    return (type.charAt(0) + type.slice(1).toLowerCase())
}