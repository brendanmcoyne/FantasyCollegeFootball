import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { BackButton } from '../../styles/commonstyles'
import { getPlayoffSeeds, type PlayoffTeam } from '../../utils/playoffs'
import { supabase } from '../lib/supabase'

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


interface PlayoffMatchup {
    id: string
    week: number
    team1_id: string
    team2_id: string
    team1_score: number | null
    team2_score: number | null
    winner_id: string | null
}

function TeamRow({
                     team,
                     placeholder = 'TBD',
                     score,
                     winner = false
                 }: {
    team?: PlayoffTeam
    placeholder?: string
    score?: number | null
    winner?: boolean
}) {
    return (
        <MatchupTeam
            style={{
                background: winner ? '#f0fdf4' : 'white'
            }}
        >
            <span>
                {team && <Seed>#{team.seed}</Seed>}

                <span style={{
                    fontWeight: winner ? 800 : 600
                }}>
                    {team?.teamName ?? placeholder}
                </span>

                {team && (
                    <TeamRecord>
                        ({team.wins}-{team.losses})
                    </TeamRecord>
                )}
            </span>

            {score != null && (
                <strong>{score.toFixed(1)}</strong>
            )}
        </MatchupTeam>
    )
}

export default function Playoffs() {
    const { leagueId } = useParams()
    const navigate = useNavigate()

    const [seeds, setSeeds] = useState<PlayoffTeam[]>([])
    const [matchups, setMatchups] = useState<PlayoffMatchup[]>([])
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

                const { data, error: matchupError } = await supabase
                    .from('league_matchups')
                    .select(
                        'id, week, team1_id, team2_id, team1_score, team2_score, winner_id'
                    )
                    .eq('league_id', leagueId)
                    .gte('week', 11)
                    .lte('week', 13)
                    .order('week', { ascending: true })

                if (matchupError) throw matchupError

                setSeeds(teams)
                setMatchups((data ?? []) as PlayoffMatchup[])
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

    const getTeam = (memberId: string | null | undefined) =>
        seeds.find((team) => team.memberId === memberId)

    const getRound = (week: number) =>
        matchups.filter((matchup) => matchup.week === week)

    const findMatchup = (
        week: number,
        teamA?: PlayoffTeam,
        teamB?: PlayoffTeam
    ) => {
        if (!teamA || !teamB) return undefined

        return getRound(week).find(
            (game) =>
                (
                    game.team1_id === teamA.memberId &&
                    game.team2_id === teamB.memberId
                ) ||
                (
                    game.team1_id === teamB.memberId &&
                    game.team2_id === teamA.memberId
                )
        )
    }

    const getWinner = (matchup?: PlayoffMatchup) =>
        matchup?.winner_id
            ? getTeam(matchup.winner_id)
            : undefined

    const getScore = (
        matchup: PlayoffMatchup | undefined,
        team?: PlayoffTeam
    ) => {
        if (!matchup || !team) return null

        if (matchup.team1_id === team.memberId) {
            return matchup.team1_score
        }

        if (matchup.team2_id === team.memberId) {
            return matchup.team2_score
        }

        return null
    }

    const game36 = findMatchup(11, seed(3), seed(6))
    const game45 = findMatchup(11, seed(4), seed(5))

    const winner36 = getWinner(game36)
    const winner45 = getWinner(game45)

    const semifinal1 = getRound(12).find(
        (game) => game.team1_id === seed(1)?.memberId
    )

    const semifinal2 = getRound(12).find(
        (game) => game.team1_id === seed(2)?.memberId
    )

    const finalist1 = getWinner(semifinal1)
    const finalist2 = getWinner(semifinal2)

    const championship = getRound(13)[0]
    const champion = getWinner(championship)

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
                        <TeamRow
                            team={seed(3)}
                            score={getScore(game36, seed(3))}
                            winner={game36?.winner_id === seed(3)?.memberId}
                        />
                        <TeamRow
                            team={seed(6)}
                            score={getScore(game36, seed(6))}
                            winner={game36?.winner_id === seed(6)?.memberId}
                        />
                    </Matchup>

                    <Matchup>
                        <TeamRow
                            team={seed(4)}
                            score={getScore(game45, seed(4))}
                            winner={game45?.winner_id === seed(4)?.memberId}
                        />
                        <TeamRow
                            team={seed(5)}
                            score={getScore(game45, seed(5))}
                            winner={game45?.winner_id === seed(5)?.memberId}
                        />
                    </Matchup>

                    <ByeCard>
                        #1 {seed(1)?.teamName ?? 'TBD'} — First-round bye
                    </ByeCard>

                    <ByeCard>
                        #2 {seed(2)?.teamName ?? 'TBD'} — First-round bye
                    </ByeCard>
                </Round>

                <Round>
                    <RoundTitle>
                        <h2>Semifinals</h2>
                        <p>Week 12</p>
                    </RoundTitle>

                    <Matchup>
                        <TeamRow
                            team={seed(1)}
                            score={getScore(semifinal1, seed(1))}
                            winner={
                                semifinal1?.winner_id === seed(1)?.memberId
                            }
                        />
                        <TeamRow
                            team={winner45}
                            placeholder="Winner of #4 vs #5"
                            score={getScore(semifinal1, winner45)}
                            winner={
                                !!winner45 &&
                                semifinal1?.winner_id === winner45.memberId
                            }
                        />
                    </Matchup>

                    <Matchup>
                        <TeamRow
                            team={seed(2)}
                            score={getScore(semifinal2, seed(2))}
                            winner={
                                semifinal2?.winner_id === seed(2)?.memberId
                            }
                        />
                        <TeamRow
                            team={winner36}
                            placeholder="Winner of #3 vs #6"
                            score={getScore(semifinal2, winner36)}
                            winner={
                                !!winner36 &&
                                semifinal2?.winner_id === winner36.memberId
                            }
                        />
                    </Matchup>
                </Round>

                <Round>
                    <RoundTitle>
                        <h2>Championship</h2>
                        <p>Week 13</p>
                    </RoundTitle>

                    <Matchup>
                        <TeamRow
                            team={finalist1}
                            placeholder="Semifinal 1 winner"
                            score={getScore(championship, finalist1)}
                            winner={
                                !!finalist1 &&
                                championship?.winner_id === finalist1.memberId
                            }
                        />
                        <TeamRow
                            team={finalist2}
                            placeholder="Semifinal 2 winner"
                            score={getScore(championship, finalist2)}
                            winner={
                                !!finalist2 &&
                                championship?.winner_id === finalist2.memberId
                            }
                        />
                    </Matchup>

                    {champion && (
                        <ByeCard>
                            League Champion: {champion.teamName}
                        </ByeCard>
                    )}
                </Round>
            </Bracket>
        </Page>
    )
}
