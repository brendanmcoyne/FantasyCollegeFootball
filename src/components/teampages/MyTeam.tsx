import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'
import { getTeams } from '../../api/cfbApi'

import type { CollegeTeam } from '../../types/football'

interface LeagueMember {
    id: string
    team_name: string
}

interface DraftPick {
    id: string
    college_team_id: number
    unit_type: string
    pick_number: number
}

interface RosterUnit {
    id: string
    teamName: string
    unitType: string
    pickNumber: number
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

                const {
                    data: picks,
                    error: picksError,
                } = await supabase
                    .from('draft_picks')
                    .select(
                        'id, college_team_id, unit_type, pick_number'
                    )
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

    const passing = roster.filter(
        (unit) => unit.unitType === 'PASSING'
    )

    const rushing = roster.filter(
        (unit) => unit.unitType === 'RUSHING'
    )

    const receiving = roster.filter(
        (unit) => unit.unitType === 'RECEIVING'
    )

    const defense = roster.filter(
        (unit) => unit.unitType === 'DEFENSE'
    )

    const specialTeams = roster.filter(
        (unit) => unit.unitType === 'SPECIAL_TEAMS'
    )

    return (
        <div>
            <h1>{teamName}</h1>

            <h2>Passing</h2>
            {passing.map((unit) => (
                <p key={unit.id}>
                    {unit.teamName} PASSING
                </p>
            ))}

            <h2>Rushing</h2>
            {rushing.map((unit) => (
                <p key={unit.id}>
                    {unit.teamName} RUSHING
                </p>
            ))}

            <h2>Receiving</h2>
            {receiving.map((unit) => (
                <p key={unit.id}>
                    {unit.teamName} RECEIVING
                </p>
            ))}

            <h2>Defense</h2>
            {defense.map((unit) => (
                <p key={unit.id}>
                    {unit.teamName} DEFENSE
                </p>
            ))}

            <h2>Special Teams</h2>
            {specialTeams.map((unit) => (
                <p key={unit.id}>
                    {unit.teamName} SPECIAL TEAMS
                </p>
            ))}
        </div>
    )
}