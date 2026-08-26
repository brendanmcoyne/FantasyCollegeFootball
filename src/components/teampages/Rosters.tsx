import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { getTeams } from '../../api/cfbApi'

import { STARTERS, BENCH, type RosterUnitType } from '../../rosters'

import type { CollegeTeam } from '../../types/football'

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
}

export default function Rosters() {
    const { leagueId, memberId } = useParams()

    const [teamName, setTeamName] = useState('')
    const [roster, setRoster] = useState<RosterUnit[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadRoster() {
            if (!leagueId || !memberId) {
                setError('Missing league or team.')
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
                    .eq('id', memberId)
                    .eq('league_id', leagueId)
                    .single()

                if (memberError) {
                    throw memberError
                }

                const leagueMember = member as LeagueMember

                setTeamName(leagueMember.team_name)

                const {
                    data: rosterData,
                    error: rosterError,
                } = await supabase
                    .from('roster_units')
                    .select(
                        'id, college_team_id, unit_type, roster_slot, acquired_via'
                    )
                    .eq('league_id', leagueId)
                    .eq('league_member_id', memberId)

                if (rosterError) {
                    throw rosterError
                }

                const teams = await getTeams()

                const teamMap = new Map<number, CollegeTeam>()

                teams.forEach((team) => {
                    teamMap.set(team.id, team)
                })

                const rosterUnits: RosterUnit[] = (rosterData ?? []).map(
                    (unit) => ({
                        id: unit.id,
                        collegeTeamId: unit.college_team_id,
                        teamName:
                            teamMap.get(unit.college_team_id)?.name ??
                            'Unknown Team',
                        unitType: unit.unit_type as RosterUnitType,
                        rosterSlot: unit.roster_slot as 'STARTER' | 'BENCH',
                        acquiredVia: unit.acquired_via as
                            | 'DRAFT'
                            | 'FREE_AGENCY',
                    })
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

    if (loading) {
        return <p>Loading roster...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    const starters = roster.filter(
        (unit) => unit.rosterSlot === 'STARTER'
    )

    const bench = roster.filter(
        (unit) => unit.rosterSlot === 'BENCH'
    )

    const passing = starters.filter(
        (unit) => unit.unitType === 'PASSING'
    )

    const rushing = starters.filter(
        (unit) => unit.unitType === 'RUSHING'
    )

    const receiving = starters.filter(
        (unit) => unit.unitType === 'RECEIVING'
    )

    const defense = starters.filter(
        (unit) => unit.unitType === 'DEFENSE'
    )

    const specialTeams = starters.filter(
        (unit) => unit.unitType === 'SPECIAL_TEAMS'
    )

    return (
        <div>
            <h1>{teamName}</h1>

            <h2>Starters</h2>

            <RosterSection
                title="Passing"
                units={passing}
                max={STARTERS.PASSING}
            />

            <RosterSection
                title="Rushing"
                units={rushing}
                max={STARTERS.RUSHING}
            />

            <RosterSection
                title="Receiving"
                units={receiving}
                max={STARTERS.RECEIVING}
            />

            <RosterSection
                title="Defense"
                units={defense}
                max={STARTERS.DEFENSE}
            />

            <RosterSection
                title="Special Teams"
                units={specialTeams}
                max={STARTERS.SPECIAL_TEAMS}
            />

            <h2>Bench</h2>

            {bench.length === 0 ? (
                <p>No bench units.</p>
            ) : (
                <ul>
                    {bench.map((unit) => (
                        <li key={unit.id}>
                            {unit.teamName}{' '}
                            {formatUnitType(unit.unitType)}
                        </li>
                    ))}
                </ul>
            )}

            <p>
                Bench: {bench.length} / {BENCH}
            </p>
        </div>
    )
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