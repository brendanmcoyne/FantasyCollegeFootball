import { useEffect, useState } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'
import { createRegularSeasonSchedule } from '../../utils/leagueschedule'
import { CURRENT_WEEK } from '../../bigseasonfile'
import styled from 'styled-components'
import { BackButton } from "../../styles/commonstyles";

interface LeagueData {
    id: string
    name: string
    join_code: string
    commissioner_id: string
    draft_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
    current_pick_number: number
}

interface LeagueMember {
    id: string
    user_id: string
    team_name: string
    joined_at: string
}

const LeaguePage = styled.div`
    display: grid;
    gap: 24px;
`;

const HeaderCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 22px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const SectionCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const MemberList = styled.div`
    display: grid;
    gap: 10px;
`;

const MemberLink = styled(Link)`
    display: block;
    padding: 12px 14px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    color: #111827;
    text-decoration: none;
    font-weight: 600;

    &:hover {
        background: #f3f4f6;
    }
`;

const ActionGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
`;

const ActionLink = styled(Link)`
    display: block;
    padding: 18px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    color: #111827;
    text-decoration: none;
    font-weight: 700;
    text-align: center;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);

    &:hover {
        background: #f9fafb;
        transform: translateY(-1px);
    }
`;

const Status = styled.span`
    display: inline-block;
    padding: 5px 10px;
    border-radius: 999px;
    background: #e5e7eb;
    color: #374151;
    font-weight: 700;
    font-size: 0.85rem;
`;

const PrimaryButton = styled.button`
    border: none;
    border-radius: 10px;
    padding: 11px 16px;
    background: #1f2937;
    color: white;
    font-weight: 700;
    cursor: pointer;

    &:hover {
        background: #111827;
    }
`;

export default function League() {
    const { leagueId } = useParams()
    const { user } = useAuth()

    const [league, setLeague] = useState<LeagueData | null>(null)
    const [members, setMembers] = useState<LeagueMember[]>([])
    const [loading, setLoading] = useState(true)
    const [hasSchedule, setHasSchedule] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        async function loadLeague() {
            if (!leagueId) {
                setError('League ID is missing.')
                setLoading(false)
                return
            }

            const { data: leagueData, error: leagueError } = await supabase
                .from('leagues')
                .select(
                    'id, name, join_code, commissioner_id, draft_status, current_pick_number'
                )
                .eq('id', leagueId)
                .single()

            if (leagueError) {
                setError(leagueError.message)
                setLoading(false)
                return
            }

            const { data: memberData, error: memberError } = await supabase
                .from('league_members')
                .select('id, user_id, team_name, joined_at')
                .eq('league_id', leagueId)
                .order('joined_at', { ascending: true })

            if (memberError) {
                setError(memberError.message)
                setLoading(false)
                return
            }

            const { count, error: matchupCountError } = await supabase
                .from('league_matchups')
                .select('id', {
                    count: 'exact',
                    head: true,
                })
                .eq('league_id', leagueId)

            if (matchupCountError) {
                setError(matchupCountError.message)
                setLoading(false)
                return
            }

            setHasSchedule((count ?? 0) > 0)
            setLeague(leagueData)
            setMembers(memberData ?? [])
            setLoading(false)
        }

        loadLeague()
    }, [leagueId])

    if (loading) {
        return <p>Loading league...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    if (!league) {
        return <p>League not found.</p>
    }

    const isCommissioner =
        user?.id === league.commissioner_id

    async function handleStartDraft() {
        if (!league || !isCommissioner) {
            return
        }

        setError('')

        if (members.length < 2) {
            setError(
                'The league must have at least 2 teams before starting the draft.'
            )
            return
        }

        if (members.length % 2 !== 0) {
            setError(
                'The league must have an even number of teams before starting the draft.'
            )
            return
        }

        const draftOrderRows = members.map((member, index) => ({
            league_id: league.id,
            league_member_id: member.id,
            draft_position: index + 1,
        }))

        const schedule = createRegularSeasonSchedule(
            members.map((member) => ({
                id: member.id,
                teamName: member.team_name,
            }))
        )

        const { error: draftOrderError } = await supabase
            .from('draft_order')
            .insert(draftOrderRows)

        if (draftOrderError) {
            setError(draftOrderError.message)
            return
        }

        const { error: matchupError } = await supabase
            .from('league_matchups')
            .insert(
                schedule.map((matchup) => ({
                    league_id: league.id,
                    week: matchup.week,
                    team1_id: matchup.team1Id,
                    team2_id: matchup.team2Id,
                }))
            )

        if (matchupError) {
            setError(matchupError.message)
            return
        }

        const { error: updateError } = await supabase
            .from('leagues')
            .update({
                draft_status: 'IN_PROGRESS',
                current_pick_number: 1,
                current_turn_number: 1,
            })
            .eq('id', league.id)

        if (updateError) {
            setError(updateError.message)
            return
        }

        setLeague({
            ...league,
            draft_status: 'IN_PROGRESS',
            current_pick_number: 1,
        })
    }

    async function handleGenerateSchedule() {
        if (!league || !isCommissioner) {
            return
        }

        setError('')

        if (members.length < 2 || members.length % 2 !== 0) {
            setError(
                'The league must have an even number of teams.'
            )
            return
        }

        const schedule = createRegularSeasonSchedule(
            members.map((member) => ({
                id: member.id,
                teamName: member.team_name,
            }))
        )

        const { error: matchupError } = await supabase
            .from('league_matchups')
            .insert(
                schedule.map((matchup) => ({
                    league_id: league.id,
                    week: matchup.week,
                    team1_id: matchup.team1Id,
                    team2_id: matchup.team2Id,
                }))
            )

        if (matchupError) {
            setError(matchupError.message)
            return
        }

        setHasSchedule(true)
    }

    return (
        <LeaguePage>
            <BackButton onClick={() => navigate(`/`)}>
                ← Back
            </BackButton>

            <HeaderCard>
                <h1>{league.name}</h1>

                {league.draft_status !== 'COMPLETED' && (
                    <p>
                        Join Code: <strong>{league.join_code}</strong>
                    </p>
                )}

                <p>
                    Draft Status:{' '}
                    <Status>
                        {league.draft_status.split('_').join(' ')}
                    </Status>
                </p>
            </HeaderCard>

            <SectionCard>
                <h2>League Members</h2>

                <MemberList>
                    {members.map((member) => (
                        <MemberLink key={member.id} to={`/league/${league.id}/team/${member.id}`}>
                            {member.team_name}
                        </MemberLink>
                    ))}
                </MemberList>
            </SectionCard>

            <ActionGrid>
                {league.draft_status === 'COMPLETED' && (
                    <>
                        <ActionLink to={`/league/${league.id}/team`}>
                            My Team
                        </ActionLink>

                        <ActionLink to={`/league/${league.id}/free-agents`}>
                            Free Agents
                        </ActionLink>

                        <ActionLink to={`/league/${league.id}/schedule`}>
                            Schedule
                        </ActionLink>

                        <ActionLink to={`/league/${league.id}/standings`}>
                            Standings
                        </ActionLink>
                    </>
                )}

                <ActionLink to={`/league/${league.id}/draft`}>
                    {league.draft_status === 'COMPLETED'
                        ? 'Draft Results' : 'Open Draft Room'}
                </ActionLink>

                <ActionLink to={`/league/${league.id}/week-scores/${CURRENT_WEEK}`}>
                    Week Scores
                </ActionLink>
            </ActionGrid>

            {isCommissioner &&
                league.draft_status === 'NOT_STARTED' && (
                    <PrimaryButton onClick={handleStartDraft}>
                        Start Draft
                    </PrimaryButton>
                )}

            {isCommissioner &&
                league.draft_status === 'COMPLETED' &&
                !hasSchedule && (
                    <PrimaryButton onClick={handleGenerateSchedule}>
                        Generate Schedule
                    </PrimaryButton>
                )}
        </LeaguePage>
    )
}