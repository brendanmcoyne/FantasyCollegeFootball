import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getTeams } from '../../api/cfbApi'
import { createDraftUnits } from '../../utils/Units'
import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'
import { STARTERS, BENCH, ROSTER_SIZE } from '../../rosters'

import type { DraftUnit } from '../../types/fantasy'
import {BackButton} from "../../styles/commonstyles";

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

export default function Draft() {
    const { leagueId } = useParams()
    const { user } = useAuth()

    const [units, setUnits] = useState<DraftUnit[]>([])
    const [member, setMember] = useState<LeagueMember | null>(null)
    const [draftPicks, setDraftPicks] = useState<DraftPick[]>([])
    const [league, setLeague] = useState<LeagueData | null>(null)
    const [order, setOrder] = useState<DraftOrder[]>([])
    const [members, setMembers] = useState<LeagueMember[]>([])

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
            <div>
                <p>Draft complete!</p>
                <h1>Draft Results</h1>

                {draftPicks.map((pick) => {
                    const unit = units.find(
                        (unit) =>
                            unit.teamId === pick.college_team_id &&
                            unit.unitType === pick.unit_type
                    )
                    const drafter = members.find(
                        (member) => member.id === pick.league_member_id
                    )

                    return (
                        <div key={pick.id}>
                            Pick #{pick.pick_number} —{' '}
                            {unit?.teamName ?? 'Unknown Team'}{' '}
                            {formatUnitType(pick.unit_type)}
                            {' — '}
                            {drafter?.team_name ?? 'Unknown Team'}
                        </div>
                    )
                })}
            </div>
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

    return (
        <div>
            <BackButton onClick={() => navigate(-1)}>
                ← Back
            </BackButton>

            <h1>Draft Room</h1>

            {error && <p>{error}</p>}

            <p>Draft Status:{' '}<strong>{league.draft_status}</strong></p>
            <p>Round {round + 1}</p>
            <p>Pick #{league.current_pick_number}</p>

            <div>
                <h2>Your Roster</h2>
                <p>Passing: {countRoster.PASSING} / 3</p>
                <p>Rushing: {countRoster.RUSHING} / 3</p>
                <p>Receiving: {countRoster.RECEIVING} / 3</p>
                <p>Defense: {countRoster.DEFENSE} / 2</p>
                <p>Special Teams: {countRoster.SPECIAL_TEAMS} / 2</p>
                <p>Bench: {benchUsed} / 3</p>
            </div>

            <div>
                {units.map((unit) => {
                    const drafted = isDrafted(unit)
                    const eligible = canDraftUnitType(unit.unitType)

                    return (
                        <div key={unit.id}>
                            <strong>{unit.teamName} {unit.unitType}</strong>{' '}

                            <button disabled={drafted || !myTurn || !eligible} onClick={() => draftUnit(unit)}>
                                {drafted ? 'Drafted' : !eligible ? 'Roster Full' : myTurn ? 'Draft' : 'Waiting'}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function formatUnitType(unitType: string): string {
    return unitType === 'SPECIAL_TEAMS'
        ? 'Special Teams'
        : unitType.charAt(0) +
        unitType.slice(1).toLowerCase()
}