import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getTeams } from '../../api/cfbApi'
import { getWeeklyStats } from '../../api/weeklyStats'
import { createDraftUnits } from '../../utils/Units'
import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'

import type { DraftUnit, UnitType } from '../../types/fantasy'
import type { CollegeTeam } from '../../types/football'
import type { RosterUnitType } from '../../rosters'

interface OwnedUnit {
    id: string
    college_team_id: number
    unit_type: RosterUnitType
    league_member_id: string
    roster_slot: 'STARTER' | 'BENCH'
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
}

export default function FreeAgents() {
    const { leagueId } = useParams()
    const { user } = useAuth()

    const [units, setUnits] = useState<FreeAgentUnit[]>([])
    const [ownedUnits, setOwnedUnits] = useState<OwnedUnit[]>([])
    const [myRoster, setMyRoster] = useState<MyRosterUnit[]>([])
    const [member, setMember] = useState<LeagueMember | null>(null)

    const [selectedType, setSelectedType] =
        useState<UnitType | 'ALL'>('ALL')

    const [selectedConference, setSelectedConference] =
        useState('ALL')

    const [selectedFreeAgent, setSelectedFreeAgent] =
        useState<FreeAgentUnit | null>(null)

    const [currentWeek, setCurrentWeek] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadFreeAgents() {
            if (!leagueId || !user) {
                setError('Missing league or user.')
                setLoading(false)
                return
            }

            try {
                const teams = await getTeams()

                const teamMap = new Map<number, CollegeTeam>()

                teams.forEach((team) => {
                    teamMap.set(team.id, team)
                })

                const week = await determineCurrentWeek()
                setCurrentWeek(week)

                const weeklyStats = await getWeeklyStats(week)

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
                        const weeklyTeam = weeklyMap.get(
                            normalizeTeamName(unit.teamName)
                        )

                        const gameStart =
                            weeklyTeam?.gameStart ?? null

                        return {
                            ...unit,
                            gameStart,
                            locked: isGameLocked(
                                gameStart,
                                now
                            ),
                        }
                    })

                setUnits(unitsWithLocks)

                const {
                    data: membership,
                    error: membershipError,
                } = await supabase
                    .from('league_members')
                    .select('id')
                    .eq('league_id', leagueId)
                    .eq('user_id', user.id)
                    .single()

                if (membershipError) {
                    throw membershipError
                }

                setMember(membership)

                const {
                    data: owned,
                    error: ownedError,
                } = await supabase
                    .from('roster_units')
                    .select(
                        'id, college_team_id, unit_type, league_member_id, roster_slot'
                    )
                    .eq('league_id', leagueId)

                if (ownedError) {
                    throw ownedError
                }

                setOwnedUnits(owned ?? [])

                const myUnits: MyRosterUnit[] =
                    (owned ?? [])
                        .filter(
                            (unit) =>
                                unit.league_member_id ===
                                membership.id
                        )
                        .map((unit) => {
                            const teamName =
                                teamMap.get(
                                    unit.college_team_id
                                )?.name ?? 'Unknown Team'

                            const weeklyTeam =
                                weeklyMap.get(
                                    normalizeTeamName(teamName)
                                )

                            const gameStart =
                                weeklyTeam?.gameStart ?? null

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
                                locked: isGameLocked(
                                    gameStart,
                                    now
                                ),
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
                    locked: isGameLocked(
                        unit.gameStart,
                        now
                    ),
                }))
            )

            setMyRoster((current) =>
                current.map((unit) => ({
                    ...unit,
                    locked: isGameLocked(
                        unit.gameStart,
                        now
                    ),
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

    const freeAgents = units.filter((unit) =>
        !ownedUnits.some(
            (owned) =>
                owned.college_team_id === unit.teamId &&
                owned.unit_type === unit.unitType
        )
    )

    const filteredFreeAgents =
        freeAgents.filter((unit) => {
            const matchesType =
                selectedType === 'ALL' ||
                unit.unitType === selectedType

            const matchesConference =
                selectedConference === 'ALL' ||
                unit.conference ===
                selectedConference

            return (
                matchesType &&
                matchesConference
            )
        })

    async function makeMove(
        dropUnit: MyRosterUnit
    ) {
        if (
            !leagueId ||
            !member ||
            !selectedFreeAgent
        ) {
            return
        }

        const freeAgent =
            units.find(
                (unit) =>
                    unit.id ===
                    selectedFreeAgent.id
            )

        const rosterUnit =
            myRoster.find(
                (unit) =>
                    unit.id === dropUnit.id
            )

        if (!freeAgent || !rosterUnit) {
            return
        }

        const now = new Date()

        if (
            isGameLocked(
                freeAgent.gameStart,
                now
            )
        ) {
            setError(
                'You cannot add that unit because its game has already started.'
            )
            return
        }

        if (
            isGameLocked(
                rosterUnit.gameStart,
                now
            )
        ) {
            setError(
                'You cannot drop that unit because its game has already started.'
            )
            return
        }

        setError('')

        const { error: moveError } =
            await supabase.rpc(
                'make_free_agent_move',
                {
                    target_league_id:
                    leagueId,

                    target_league_member_id:
                    member.id,

                    drop_roster_unit_id:
                    rosterUnit.id,

                    add_college_team_id:
                    freeAgent.teamId,

                    add_unit_type:
                    freeAgent.unitType,
                }
            )

        if (moveError) {
            setError(moveError.message)
            return
        }

        window.location.reload()
    }

    return (
        <div>
            <h1>Free Agents</h1>

            <p>Week {currentWeek}</p>

            {error && <p>{error}</p>}

            <div>
                <h3>Unit Type</h3>

                {[
                    'ALL',
                    'PASSING',
                    'RUSHING',
                    'RECEIVING',
                    'DEFENSE',
                    'SPECIAL_TEAMS',
                ].map((type) => (
                    <button
                        key={type}
                        onClick={() =>
                            setSelectedType(
                                type as UnitType | 'ALL'
                            )
                        }
                    >
                        {formatUnitType(type)}
                    </button>
                ))}
            </div>

            <div>
                <h3>Conference</h3>

                {[
                    'ALL',
                    'ACC',
                    'Big Ten',
                    'Big 12',
                    'SEC',
                ].map((conference) => (
                    <button
                        key={conference}
                        onClick={() =>
                            setSelectedConference(
                                conference
                            )
                        }
                    >
                        {conference === 'ALL'
                            ? 'All Conferences'
                            : conference}
                    </button>
                ))}
            </div>

            <hr />

            {filteredFreeAgents.map((unit) => (
                <div key={unit.id}>
                    <strong>
                        {unit.teamName}{' '}
                        {formatUnitType(
                            unit.unitType
                        )}
                    </strong>

                    {' — '}
                    {unit.conference}

                    {unit.gameStart && (
                        <>
                            {' — '}
                            {formatGameStart(
                                unit.gameStart
                            )}
                        </>
                    )}

                    {' '}

                    <button
                        disabled={unit.locked}
                        onClick={() => {
                            setError('')
                            setSelectedFreeAgent(
                                unit
                            )
                        }}
                    >
                        {unit.locked
                            ? 'Locked'
                            : 'Add'}
                    </button>
                </div>
            ))}

            {selectedFreeAgent && (
                <div>
                    <h2>
                        Add{' '}
                        {selectedFreeAgent.teamName}{' '}
                        {formatUnitType(
                            selectedFreeAgent.unitType
                        )}
                    </h2>

                    <p>
                        Choose a unit to drop:
                    </p>

                    {myRoster.map((unit) => (
                        <div key={unit.id}>
                            {unit.teamName}{' '}
                            {formatUnitType(
                                unit.unitType
                            )}

                            {unit.gameStart && (
                                <>
                                    {' — '}
                                    {formatGameStart(
                                        unit.gameStart
                                    )}
                                </>
                            )}

                            {' '}

                            <button
                                disabled={unit.locked}
                                onClick={() =>
                                    makeMove(unit)
                                }
                            >
                                {unit.locked
                                    ? 'Locked'
                                    : 'Drop'}
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={() =>
                            setSelectedFreeAgent(
                                null
                            )
                        }
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
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

async function determineCurrentWeek(): Promise<number> {
    const now = new Date()

    for (let week = 10; week >= 1; week--) {
        const weeklyStats = await getWeeklyStats(week)

        const starts = weeklyStats
            .map((team) => team.gameStart)
            .filter((date): date is Date => date !== null)

        if (starts.some((date) => now.getTime() >= date.getTime())) {
            return week
        }
    }

    return 1
}