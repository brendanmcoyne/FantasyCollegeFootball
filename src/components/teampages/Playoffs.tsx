import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { BackButton } from '../../styles/commonstyles'
import { getPlayoffSeeds, type PlayoffTeam } from '../../utils/playoffs'

const Page = styled.div`
    display: grid;
    gap: 24px;
`;

const Bracket = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(250px, 1fr));
    gap: 24px;
    overflow-x: auto;
    padding: 8px 0 24px;
`;

const Round = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const RoundTitle = styled.div`
    h2 {
        margin: 0 0 4px;
        font-size: 20px;
    }

    p {
        margin: 0;
        color: #6b7280;
        font-size: 14px;
    }
`;

const Matchup = styled.div`
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    overflow: hidden;
`;

const MatchupTeam = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 16px;
    font-weight: 600;

    &:not(:last-child) {
        border-bottom: 1px solid #e5e7eb;
    }
`;

const Seed = styled.span`
    color: #6b7280;
    font-size: 13px;
    margin-right: 8px;
`;

const ByeCard = styled.div`
    padding: 14px;
    background: #f3f4f6;
    border-radius: 10px;
    color: #374151;
    font-size: 14px;
`;

const TeamRecord = styled.span`
    margin-left: 8px;
    color: #6b7280;
    font-size: 13px;
    font-weight: 400;
    white-space: nowrap;
`;

function TeamRow({team, placeholder = 'TBD'}: { team?: PlayoffTeam, placeholder?: string }) {
    return (
        <MatchupTeam>
            <span>
                {team && <Seed>#{team.seed}</Seed>}
                {team?.teamName ?? placeholder}

                {team && (
                    <TeamRecord>
                        ({team.wins}-{team.losses})
                    </TeamRecord>
                )}
            </span>
        </MatchupTeam>
    )
}


export default function Playoffs() {
    const { leagueId } = useParams()
    const navigate = useNavigate()

    const [seeds, setSeeds] = useState<PlayoffTeam[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadPlayoffs() {
            if (!leagueId) {
                setError('League ID is missing.')
                setLoading(false)
                return
            }

            try {
                const teams = await getPlayoffSeeds(leagueId)
                setSeeds(teams)
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load playoffs.'
                )
            } finally {
                setLoading(false)
            }
        }

        void loadPlayoffs()
    }, [leagueId])

    if (loading) return <p>Loading playoffs...</p>
    if (error) return <p>{error}</p>

    const seed = (number: number) =>
        seeds.find((team) => team.seed === number)

    return (
        <Page>
            <BackButton onClick={() => navigate(-1)}>
                ← Back
            </BackButton>

            <h1>League Playoffs</h1>

            <Bracket>
                <Round>
                    <RoundTitle>
                        <h2>First Round</h2>
                        <p>Week 11</p>
                    </RoundTitle>

                    <Matchup>
                        <TeamRow team={seed(3)} />
                        <TeamRow team={seed(6)} />
                    </Matchup>

                    <Matchup>
                        <TeamRow team={seed(4)} />
                        <TeamRow team={seed(5)} />
                    </Matchup>

                    <ByeCard>
                        #{seed(1)?.seed ?? 1} {seed(1)?.teamName ?? 'TBD'}
                        {' — First-round bye'}
                    </ByeCard>

                    <ByeCard>
                        #{seed(2)?.seed ?? 2} {seed(2)?.teamName ?? 'TBD'}
                        {' — First-round bye'}
                    </ByeCard>
                </Round>

                <Round>
                    <RoundTitle>
                        <h2>Semifinals</h2>
                        <p>Week 12</p>
                    </RoundTitle>

                    <Matchup>
                        <TeamRow team={seed(1)} />
                        <TeamRow placeholder="First-round winner" />
                    </Matchup>

                    <Matchup>
                        <TeamRow team={seed(2)} />
                        <TeamRow placeholder="First-round winner" />
                    </Matchup>
                </Round>

                <Round>
                    <RoundTitle>
                        <h2>Championship</h2>
                        <p>Week 13</p>
                    </RoundTitle>

                    <Matchup>
                        <TeamRow placeholder="Semifinal winner" />
                        <TeamRow placeholder="Semifinal winner" />
                    </Matchup>
                </Round>
            </Bracket>
        </Page>
    )
}
