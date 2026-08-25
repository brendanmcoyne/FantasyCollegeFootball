import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'
import { getTeams } from '../../api/cfbApi'

import { STARTERS, BENCH, type RosterUnitType } from '../../rosters'

import type { CollegeTeam } from '../../types/football'

interface LeagueMember {
    id: string
    team_name: string
}

interface DraftPick {
    id: string
    college_team_id: number
    unit_type: RosterUnitType
    pick_number: number
    roster_slot: 'STARTER' | 'BENCH' | null
}

interface RosterUnit {
    id: string
    teamName: string
    unitType: RosterUnitType
    pickNumber: number
    rosterSlot: 'STARTER' | 'BENCH' | null
}

interface OrganizedRoster {
    starters: Record<RosterUnitType, RosterUnit[]>
    bench: RosterUnit[]
}

export default function MyTeam() {
    const { leagueId } = useParams()
    const { user } = useAuth()

    const [teamName, setTeamName] = useState('')
    const [roster, setRoster] = useState<RosterUnit[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadRoster() {
            if (!leagueId || !user) {
                setError('Missing league or user.')
                setLoading(false)
                return
            }

            try {
                const {
                    data: member,
                    error: memberError,
                } = await supabase
                    .from('league_members')
                    .select('id, team_name')
                    .eq('league_id', leagueId)
                    .eq('user_id', user.id)
                    .single()

                if (memberError) {
                    throw memberError
                }

                const leagueMember = member as LeagueMember

                setTeamName(leagueMember.team_name)

                const { data: picks, error: picksError } = await supabase
                    .from('draft_picks')
                    .select('id, college_team_id, unit_type, pick_number, roster_slot')
                    .eq('league_id', leagueId)
                    .eq('league_member_id', leagueMember.id)
                    .order('pick_number', {
                        ascending: true,
                    })

                if (picksError) {
                    throw picksError
                }

                const teams = await getTeams()

                const teamMap = new Map<number, CollegeTeam>()

                teams.forEach((team) => {
                    teamMap.set(team.id, team)
                })

                const rosterUnits: RosterUnit[] = (
                    (picks ?? []) as DraftPick[]
                ).map((pick) => ({
                    id: pick.id,
                    teamName:
                        teamMap.get(pick.college_team_id)?.name ??
                        'Unknown Team',
                    unitType: pick.unit_type,
                    pickNumber: pick.pick_number,
                    rosterSlot: pick.roster_slot,
                }))

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
    }, [leagueId, user])

    if (loading) {
        return <p>Loading roster...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    const organizedRoster = organizeRoster(roster)

    return (
        <div>
            <h1>{teamName}</h1>

            <h2>Starters</h2>

            <RosterSection
                title="Passing"
                units={organizedRoster.starters.PASSING}
                max={STARTERS.PASSING}
            />

            <RosterSection
                title="Rushing"
                units={organizedRoster.starters.RUSHING}
                max={STARTERS.RUSHING}
            />

            <RosterSection
                title="Receiving"
                units={organizedRoster.starters.RECEIVING}
                max={STARTERS.RECEIVING}
            />

            <RosterSection
                title="Defense"
                units={organizedRoster.starters.DEFENSE}
                max={STARTERS.DEFENSE}
            />

            <RosterSection
                title="Special Teams"
                units={organizedRoster.starters.SPECIAL_TEAMS}
                max={STARTERS.SPECIAL_TEAMS}
            />

            <h2>Bench</h2>

            {organizedRoster.bench.length === 0 ? (
                <p>No bench units.</p>
            ) : (
                <ul>
                    {organizedRoster.bench.map((unit) => (
                        <li key={unit.id}>
                            {unit.teamName}{' '}
                            {formatUnitType(unit.unitType)}
                        </li>
                    ))}
                </ul>
            )}

            <p>
                Bench: {organizedRoster.bench.length} / {BENCH}
            </p>
        </div>
    )
}

function organizeRoster(roster: RosterUnit[]): OrganizedRoster {
    const starters: Record<RosterUnitType, RosterUnit[]> = {
        PASSING: [],
        RUSHING: [],
        RECEIVING: [],
        DEFENSE: [],
        SPECIAL_TEAMS: [],
    }

    const bench: RosterUnit[] = []

    const sortedRoster = [...roster].sort(
        (a, b) => a.pickNumber - b.pickNumber
    )

    for (const unit of sortedRoster) {
        const starterLimit = STARTERS[unit.unitType]

        if (starters[unit.unitType].length < starterLimit) {
            starters[unit.unitType].push(unit)
        } else {
            bench.push(unit)
        }
    }

    return {
        starters,
        bench,
    }
}

interface RosterSectionProps {
    title: string
    units: RosterUnit[]
    max: number
}

function RosterSection({
                           title,
                           units,
                           max,
                       }: RosterSectionProps) {
    return (
        <section>
            <h3>
                {title} ({units.length}/{max})
            </h3>

            {units.length === 0 ? (
                <p>Empty</p>
            ) : (
                <ul>
                    {units.map((unit) => (
                        <li key={unit.id}>
                            {unit.teamName}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

function formatUnitType(unitType: RosterUnitType) {
    if (unitType === 'SPECIAL_TEAMS') {
        return 'Special Teams'
    }

    return (
        unitType.charAt(0) +
        unitType.slice(1).toLowerCase()
    )
}