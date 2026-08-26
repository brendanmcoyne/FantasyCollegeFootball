import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getTeams } from '../../api/cfbApi'
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
}

interface LeagueMember {
    id: string
}

export default function FreeAgents() {
    const { leagueId } = useParams()
    const { user } = useAuth()

    const [units, setUnits] = useState<DraftUnit[]>([])
    const [ownedUnits, setOwnedUnits] = useState<OwnedUnit[]>([])
    const [myRoster, setMyRoster] = useState<MyRosterUnit[]>([])
    const [member, setMember] = useState<LeagueMember | null>(null)

    const [selectedType, setSelectedType] =
        useState<UnitType | 'ALL'>('ALL')

    const [selectedConference, setSelectedConference] =
        useState('ALL')

    const [selectedFreeAgent, setSelectedFreeAgent] =
        useState<DraftUnit | null>(null)

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
                setUnits(createDraftUnits(teams))

                const teamMap = new Map<number, CollegeTeam>()

                teams.forEach((team) => {
                    teamMap.set(team.id, team)
                })

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

                const myUnits: MyRosterUnit[] = (owned ?? [])
                    .filter(
                        (unit) =>
                            unit.league_member_id === membership.id
                    )
                    .map((unit) => ({
                        id: unit.id,
                        collegeTeamId: unit.college_team_id,
                        teamName:
                            teamMap.get(unit.college_team_id)?.name ??
                            'Unknown Team',
                        unitType:
                            unit.unit_type as RosterUnitType,
                        rosterSlot:
                            unit.roster_slot as 'STARTER' | 'BENCH',
                    }))

                setMyRoster(myUnits)
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message)
                } else {
                    setError('Failed to load free agents.')
                }
            } finally {
                setLoading(false)
            }
        }

        loadFreeAgents()
    }, [leagueId, user])

    if (loading) {
        return <p>Loading free agents...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    const freeAgents = units.filter((unit) => {
        return !ownedUnits.some(
            (owned) =>
                owned.college_team_id === unit.teamId &&
                owned.unit_type === unit.unitType
        )
    })

    const filteredFreeAgents = freeAgents.filter((unit) => {
        const matchesType =
            selectedType === 'ALL' ||
            unit.unitType === selectedType

        const matchesConference =
            selectedConference === 'ALL' ||
            unit.conference === selectedConference

        return matchesType && matchesConference
    })

    async function makeMove(dropUnit: MyRosterUnit) {
        if (
            !leagueId ||
            !member ||
            !selectedFreeAgent
        ) {
            return
        }

        setError('')

        const { error: moveError } = await supabase.rpc(
            'make_free_agent_move',
            {
                target_league_id: leagueId,
                target_league_member_id: member.id,
                drop_roster_unit_id: dropUnit.id,
                add_college_team_id:
                selectedFreeAgent.teamId,
                add_unit_type:
                selectedFreeAgent.unitType,
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

            {error && <p>{error}</p>}

            <div>
                <h3>Unit Type</h3>

                <button onClick={() => setSelectedType('ALL')}>
                    All
                </button>

                <button
                    onClick={() =>
                        setSelectedType('PASSING')
                    }
                >
                    Passing
                </button>

                <button
                    onClick={() =>
                        setSelectedType('RUSHING')
                    }
                >
                    Rushing
                </button>

                <button
                    onClick={() =>
                        setSelectedType('RECEIVING')
                    }
                >
                    Receiving
                </button>

                <button
                    onClick={() =>
                        setSelectedType('DEFENSE')
                    }
                >
                    Defense
                </button>

                <button
                    onClick={() =>
                        setSelectedType('SPECIAL_TEAMS')
                    }
                >
                    Special Teams
                </button>
            </div>

            <div>
                <h3>Conference</h3>

                <button
                    onClick={() =>
                        setSelectedConference('ALL')
                    }
                >
                    All Conferences
                </button>

                <button
                    onClick={() =>
                        setSelectedConference('ACC')
                    }
                >
                    ACC
                </button>

                <button
                    onClick={() =>
                        setSelectedConference('Big Ten')
                    }
                >
                    Big Ten
                </button>

                <button
                    onClick={() =>
                        setSelectedConference('Big 12')
                    }
                >
                    Big 12
                </button>

                <button
                    onClick={() =>
                        setSelectedConference('SEC')
                    }
                >
                    SEC
                </button>
            </div>

            <hr />

            {filteredFreeAgents.map((unit) => (
                <div key={unit.id}>
                    <strong>
                        {unit.teamName} {unit.unitType}
                    </strong>

                    {' — '}

                    {unit.conference}

                    {' '}

                    <button
                        onClick={() =>
                            setSelectedFreeAgent(unit)
                        }
                    >
                        Add
                    </button>
                </div>
            ))}

            {selectedFreeAgent && (
                <div>
                    <h2>
                        Add {selectedFreeAgent.teamName}{' '}
                        {selectedFreeAgent.unitType}
                    </h2>

                    <p>Choose a unit to drop:</p>

                    {myRoster.map((unit) => (
                        <div key={unit.id}>
                            {unit.teamName}{' '}
                            {unit.unitType}

                            {' '}

                            <button
                                onClick={() =>
                                    makeMove(unit)
                                }
                            >
                                Drop
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={() =>
                            setSelectedFreeAgent(null)
                        }
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    )
}