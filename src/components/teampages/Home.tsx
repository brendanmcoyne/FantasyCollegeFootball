import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../Auth'
import styled from 'styled-components'

interface League {
    id: string
    name: string
    join_code: string
}

const HomePage = styled.div`
    display: grid;
    gap: 24px;
`

const HeroCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`

const ActionGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
`

const ActionLink = styled(Link)`
    display: block;
    padding: 18px;
    background: #1f2937;
    color: #ffffff;
    text-decoration: none;
    border-radius: 12px;
    font-weight: 700;
    text-align: center;

    &:hover {
        background: #111827;
    }
`

const SectionCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`

const LeagueList = styled.div`
    display: grid;
    gap: 10px;
`

const LeagueLink = styled(Link)`
    display: block;
    padding: 14px 16px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    color: #111827;
    text-decoration: none;
    font-weight: 700;

    &:hover {
        background: #f3f4f6;
    }
`

const EmptyText = styled.p`
    color: #6b7280;
`

export default function Home() {
    const { user } = useAuth()

    const [leagues, setLeagues] = useState<League[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadLeagues() {
            if (!user) {
                setLoading(false)
                return
            }

            const { data: memberships, error: membershipError } = await supabase
                .from('league_members')
                .select('league_id')
                .eq('user_id', user.id)

            if (membershipError) {
                setError(membershipError.message)
                setLoading(false)
                return
            }

            if (!memberships || memberships.length === 0) {
                setLeagues([])
                setLoading(false)
                return
            }

            const leagueIds = memberships.map(
                (membership) => membership.league_id
            )

            const { data: leagueData, error: leagueError } = await supabase
                .from('leagues')
                .select('id, name, join_code')
                .in('id', leagueIds)

            if (leagueError) {
                setError(leagueError.message)
                setLoading(false)
                return
            }

            setLeagues(leagueData ?? [])
            setLoading(false)
        }

        loadLeagues()
    }, [user])

    return (
        <HomePage>
            <HeroCard>
                <h1>Welcome to Fantasy College Football!</h1>

                <p>
                    Create a league, join your friends, and manage your college football units.
                </p>

                <ActionGrid>
                    <ActionLink to="/create-league">
                        Create League
                    </ActionLink>

                    <ActionLink to="/join-league">
                        Join League
                    </ActionLink>
                </ActionGrid>
            </HeroCard>

            <SectionCard>
                <h2>My Leagues</h2>

                {loading && <p>Loading leagues...</p>}

                {error && <p>{error}</p>}

                {!loading && !error && leagues.length === 0 && (
                    <EmptyText>
                        You aren't in any leagues yet.
                    </EmptyText>
                )}

                <LeagueList>
                    {leagues.map((league) => (
                        <LeagueLink
                            key={league.id}
                            to={`/league/${league.id}`}
                        >
                            {league.name}
                        </LeagueLink>
                    ))}
                </LeagueList>
            </SectionCard>
        </HomePage>
    )
}