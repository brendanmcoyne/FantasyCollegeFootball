import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { BackButton } from '../../styles/commonstyles'
import { getSeeds, getPlayoffSize, finals, advancePlayoffs, type PlayoffTeam, type PlayoffSize } from '../../utils/playoffs'
import { supabase } from '../lib/supabase'
import { CURRENT_WEEK } from '../../bigseasonfile'

const Page = styled.div`
    display: grid;
    gap: 24px;
`;

const Bracket = styled.div<{ $rounds: number }>`
    display: grid;
    grid-template-columns: repeat(${({ $rounds }) => $rounds}, minmax(250px, 1fr));
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

function TeamRow({team, placeholder = 'TBD', score, winner = false}: {
    team?: PlayoffTeam
    placeholder?: string
    score?: number | null
    winner?: boolean
}) {
    return (
        <MatchupTeam style={{background: winner ? '#f0fdf4' : 'white'}}>
            <span>
                {team && <Seed>#{team.seed}</Seed>}

                <span style={{fontWeight: winner ? 800 : 600}}>
                    {team?.teamName ?? placeholder}
                </span>

                {team && (<TeamRecord>({team.wins}-{team.losses})</TeamRecord>)}
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
        if (!leagueId) {
            setError('League ID is missing.')
            setLoading(false)
            return
        }

        let cancelled = false

        async function loadPlayoffs() {
            try {
                await advancePlayoffs(leagueId!, CURRENT_WEEK)
                const teams = await getSeeds(leagueId!)

                const { data, error: matchupError } = await supabase
                    .from('league_matchups')
                    .select('id, week, team1_id, team2_id, team1_score, team2_score, winner_id')
                    .eq('league_id', leagueId!)
                    .gte('week', 11)
                    .lte('week', 13)
                    .order('week', { ascending: true })

                if (matchupError) throw matchupError

                if (!cancelled) {
                    setSeeds(teams)
                    setMatchups((data ?? []) as PlayoffMatchup[])
                    setError('')
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load playoffs.')
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        void loadPlayoffs()
        const interval = window.setInterval(() => {void loadPlayoffs()}, 15000)

        return () => {
            cancelled = true
            window.clearInterval(interval)
        }
    }, [leagueId])

    if (loading) return <p>Loading playoffs...</p>
    if (error) return <p>{error}</p>

    const seed = (number: number) =>
        seeds.find((team) => team.seed === number)

    const getTeam = (memberId: string | null | undefined) =>
        seeds.find((team) => team.memberId === memberId)

    const getRound = (week: number) =>
        matchups.filter((matchup) => matchup.week === week)

    const findMatchup = (week: number, teamA?: PlayoffTeam, teamB?: PlayoffTeam) => {
        if (!teamA || !teamB) return undefined

        return getRound(week).find(
            (game) =>
                (game.team1_id === teamA.memberId && game.team2_id === teamB.memberId) ||
                (game.team1_id === teamB.memberId && game.team2_id === teamA.memberId)
        )
    }

    const getScore = (matchup: PlayoffMatchup | undefined, team?: PlayoffTeam) => {
        if (!matchup || !team) return null

        if (matchup.team1_id === team.memberId) {
            return matchup.team1_score
        }

        if (matchup.team2_id === team.memberId) {
            return matchup.team2_score
        }

        return null
    }

    const playoffSize: PlayoffSize = getPlayoffSize(seeds.length)
    const championshipWeek = finals(playoffSize)
    const roundCount = championshipWeek - 10

    const getMatchupWinner = (matchup?: PlayoffMatchup): PlayoffTeam | undefined => {
        if (!matchup?.winner_id) return undefined

        return getTeam(matchup.winner_id)
    }

    interface BracketGame {
        team1?: PlayoffTeam
        team2?: PlayoffTeam
        placeholder1?: string
        placeholder2?: string
        matchup?: PlayoffMatchup
    }

    interface BracketRound {
        week: number
        title: string
        games: BracketGame[]
    }

    const bracketRounds: BracketRound[] = []

    if (playoffSize === 2) {
        bracketRounds.push({
            week: 11,
            title: 'Championship',
            games: [{
                team1: seed(1), team2: seed(2),
                matchup: findMatchup(11, seed(1), seed(2))
            }]
        })
    }

    if (playoffSize === 4) {
        const game14 = findMatchup(11, seed(1), seed(4))
        const game23 = findMatchup(11, seed(2), seed(3))

        const winner14 = getMatchupWinner(game14)
        const winner23 = getMatchupWinner(game23)

        bracketRounds.push(
            {
                week: 11,
                title: 'Semifinals',
                games: [
                    { team1: seed(1), team2: seed(4), matchup: game14 },
                    { team1: seed(2), team2: seed(3), matchup: game23 }
                ]
            },
            {
                week: 12,
                title: 'Championship',
                games: [{
                    team1: winner14, placeholder1: 'Winner of #1 vs #4',
                    team2: winner23, placeholder2: 'Winner of #2 vs #3',
                    matchup: winner14 && winner23 ? findMatchup(12, winner14, winner23) : undefined
                }]
            }
        )
    }

    if (playoffSize === 6) {
        const game36 = findMatchup(11, seed(3), seed(6))
        const game45 = findMatchup(11, seed(4), seed(5))

        const winner36 = getMatchupWinner(game36)
        const winner45 = getMatchupWinner(game45)

        const semifinal1 = winner45 ? findMatchup(12, seed(1), winner45) : undefined
        const semifinal2 = winner36 ? findMatchup(12, seed(2), winner36) : undefined

        const finalist1 = getMatchupWinner(semifinal1)
        const finalist2 = getMatchupWinner(semifinal2)

        bracketRounds.push(
            {
                week: 11,
                title: 'Quarterfinals',
                games: [
                    { team1: seed(3), team2: seed(6), matchup: game36 },
                    { team1: seed(4), team2: seed(5), matchup: game45 }
                ]
            },
            {
                week: 12,
                title: 'Semifinals',
                games: [
                    { team1: seed(1), team2: winner45, placeholder2: 'Winner of #4 vs #5', matchup: semifinal1 },
                    { team1: seed(2), team2: winner36, placeholder2: 'Winner of #3 vs #6', matchup: semifinal2 }
                ]
            },
            {
                week: 13,
                title: 'Championship',
                games: [{
                    team1: finalist1, placeholder1: 'Semifinal 1 winner',
                    team2: finalist2, placeholder2: 'Semifinal 2 winner',
                    matchup: finalist1 && finalist2 ? findMatchup(13, finalist1, finalist2) : undefined
                }]
            }
        )
    }

    if (playoffSize === 8) {
        const game18 = findMatchup(11, seed(1), seed(8))
        const game45 = findMatchup(11, seed(4), seed(5))
        const game27 = findMatchup(11, seed(2), seed(7))
        const game36 = findMatchup(11, seed(3), seed(6))

        const winner18 = getMatchupWinner(game18)
        const winner45 = getMatchupWinner(game45)
        const winner27 = getMatchupWinner(game27)
        const winner36 = getMatchupWinner(game36)

        const semifinal1 = winner18 && winner45 ? findMatchup(12, winner18, winner45) : undefined
        const semifinal2 = winner27 && winner36 ? findMatchup(12, winner27, winner36) : undefined

        const finalist1 = getMatchupWinner(semifinal1)
        const finalist2 = getMatchupWinner(semifinal2)

        bracketRounds.push(
            {
                week: 11,
                title: 'Quarterfinals',
                games: [
                    { team1: seed(1), team2: seed(8), matchup: game18 }, { team1: seed(4), team2: seed(5), matchup: game45 },
                    { team1: seed(2), team2: seed(7), matchup: game27 }, { team1: seed(3), team2: seed(6), matchup: game36 }]
            },
            {
                week: 12,
                title: 'Semifinals',
                games: [
                    {
                        team1: winner18, placeholder1: 'Winner of #1 vs #8',
                        team2: winner45, placeholder2: 'Winner of #4 vs #5',
                        matchup: semifinal1
                    },
                    {
                        team1: winner27, placeholder1: 'Winner of #2 vs #7',
                        team2: winner36, placeholder2: 'Winner of #3 vs #6',
                        matchup: semifinal2
                    }
                ]
            },
            {
                week: 13,
                title: 'Championship',
                games: [{
                    team1: finalist1, placeholder1: 'Semifinal 1 winner',
                    team2: finalist2, placeholder2: 'Semifinal 2 winner',
                    matchup: finalist1 && finalist2 ? findMatchup(13, finalist1, finalist2) : undefined
                }]
            }
        )
    }

    const championship = getRound(championshipWeek)[0]
    const champion = getMatchupWinner(championship)

    const seasonComplete = CURRENT_WEEK > championshipWeek
    const declaredChampion = seasonComplete ? champion : undefined

    return (
        <Page>
            <BackButton onClick={() => navigate(`/league/${leagueId}`)}>
                ← Back
            </BackButton>

            <h1>League Playoffs</h1>

            {seasonComplete && (
                <ByeCard>
                    <h2>Off-season</h2>
                    <p>The 2026 Fantasy College Football season has concluded.</p>

                    {declaredChampion ? (<h3>Champion: {declaredChampion.teamName}</h3>) : (
                        <p>Championship results are awaiting finalization.</p>
                    )}
                </ByeCard>
            )}


            <Bracket $rounds={roundCount}>
                {bracketRounds.map((round) => (
                    <Round key={round.week}>
                        <RoundTitle>
                            <h2>{round.title}</h2>
                            <p>Week {round.week}</p>
                        </RoundTitle>

                        {round.games.map((game, index) => (
                            <Matchup key={`${round.week}-${index}`}>
                                <TeamRow
                                    team={game.team1}
                                    placeholder={game.placeholder1}
                                    score={getScore(game.matchup, game.team1)}
                                    winner={!!game.team1 && game.matchup?.winner_id === game.team1.memberId}
                                />

                                <TeamRow
                                    team={game.team2}
                                    placeholder={game.placeholder2}
                                    score={getScore(game.matchup, game.team2)}
                                    winner={!!game.team2 && game.matchup?.winner_id === game.team2.memberId}
                                />
                            </Matchup>
                        ))}

                        {round.week === championshipWeek && declaredChampion && (
                            <ByeCard>
                                <strong>League Champion: {declaredChampion.teamName}</strong>
                                <p>2026 Fantasy College Football Champion</p>
                            </ByeCard>
                        )}
                    </Round>
                ))}
            </Bracket>
        </Page>
    )
}
