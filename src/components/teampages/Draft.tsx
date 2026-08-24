import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getTeams } from '../../api/cfbApi'
import { createDraftUnits } from '../../utils/Units'
import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'

import type { DraftUnit } from '../../types/fantasy'

interface LeagueMember {
    id: string
    user_id: string
    team_name: string
}

interface DraftPick {
    id: string
    college_team_id: number
    unit_type: string
}

export default function Draft() {
    const { leagueId } = useParams()
    const { user } = useAuth()

    const [units, setUnits] = useState<DraftUnit[]>([])
    const [member, setMember] = useState<LeagueMember | null>(null)
    const [draftPicks, setDraftPicks] = useState<DraftPick[]>([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadDraft() {
            if (!leagueId || !user) {
                setError('Missing league or user.')
                setLoading(false)
                return
            }

            try {
                const teams = await getTeams()
                setUnits(createDraftUnits(teams))

                const {
                    data: membership,
                    error: membershipError,
                } = await supabase
                    .from('league_members')
                    .select('id, user_id, team_name')
                    .eq('league_id', leagueId)
                    .eq('user_id', user.id)
                    .single()

                if (membershipError) {
                    throw membershipError
                }

                setMember(membership)

                const {
                    data: picks,
                    error: picksError,
                } = await supabase
                    .from('draft_picks')
                    .select('id, college_team_id, unit_type')
                    .eq('league_id', leagueId)

                if (picksError) {
                    throw picksError
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

    async function draftUnit(unit: DraftUnit) {
        if (!leagueId || !member) {
            return
        }

        setError('')

        const { data, error } = await supabase
            .from('draft_picks')
            .insert({
                league_id: leagueId,
                league_member_id: member.id,
                college_team_id: unit.teamId,
                unit_type: unit.unitType,
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                setError('That unit has already been drafted.')
            } else {
                setError(error.message)
            }

            return
        }

        setDraftPicks((current) => [
            ...current,
            data,
        ])
    }

    function isDrafted(unit: DraftUnit) {
        return draftPicks.some(
            (pick) =>
                pick.college_team_id === unit.teamId &&
                pick.unit_type === unit.unitType
        )
    }

    if (loading) {
        return <p>Loading draft...</p>
    }

    if (error && !member) {
        return <p>{error}</p>
    }

    return (
        <div>
            <h1>Draft Room</h1>

            {error && <p>{error}</p>}

            <div>
                {units.map((unit) => {
                    const drafted = isDrafted(unit)

                    return (
                        <div key={unit.id}>
                            <strong>
                                {unit.teamName} {unit.unitType}
                            </strong>

                            {' '}

                            <button
                                disabled={drafted}
                                onClick={() => draftUnit(unit)}
                            >
                                {drafted ? 'Drafted' : 'Draft'}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}