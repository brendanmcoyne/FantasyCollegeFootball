import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import styled from 'styled-components'
import { BackButton } from "../../styles/commonstyles";

import { getLeagueStandings, type Standing } from '../../utils/standings'

const StandingsPage = styled.div`
    display: grid;
    gap: 24px;
`;

const StandingsCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    overflow-x: auto;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const StyledTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    min-width: 620px;

    th,
    td {
        padding: 14px 16px;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
        white-space: nowrap;
    }

    th {
        background: #f3f4f6;
        color: #374151;
        font-weight: 700;
    }

    tbody tr:hover {
        background: #f9fafb;
    }

    tbody tr:last-child td {
        border-bottom: none;
    }

    @media (max-width: 700px) {
        min-width: 520px;

        th,
        td {
            padding: 10px 9px;
            font-size: 0.9rem;
        }
    }
`;

const Rank = styled.td`
    font-weight: 700;
    width: 70px;

    @media (max-width: 700px) {
        width: 40px;
    }
`;

const Team = styled.td`
    font-weight: 700;
    color: #111827;

    @media (max-width: 700px) {
        max-width: 150px;
        white-space: normal;
        overflow-wrap: anywhere;
    }
`;

const Record = styled.td`
    font-weight: 600;
`;

const Points = styled.td`
    color: #4b5563;
`;

export default function Standings() {
    const { leagueId } = useParams()

    const [standings, setStandings] = useState<Standing[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        async function loadStandings() {
            if (!leagueId) {
                setError('League ID is missing.')
                setLoading(false)
                return
            }

            try {
                const loadedStandings =
                    await getLeagueStandings(leagueId)

                setStandings(loadedStandings)
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load standings.'
                )
            } finally {
                setLoading(false)
            }
        }

        loadStandings()
    }, [leagueId])

    if (loading) {
        return <p>Loading standings...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    return (
        <StandingsPage>
            <BackButton onClick={() => navigate(-1)}>
                ← Back
            </BackButton>

            <h1>Standings</h1>

            <StandingsCard>
            <StyledTable>
                <thead>
                <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>W</th>
                    <th>L</th>
                    <th>PF</th>
                    <th>PA</th>
                </tr>
                </thead>

                <tbody>
                {standings.map((team, index) => (
                    <tr key={team.memberId}>
                        <Rank>{index + 1}</Rank>
                        <Team>{team.teamName}</Team>
                        <Record>{team.wins}</Record>
                        <Record>{team.losses}</Record>
                        <Points>{team.pointsFor.toFixed(1)}</Points>
                        <Points>{team.pointsAgainst.toFixed(1)}</Points>
                    </tr>
                ))}
                </tbody>
            </StyledTable>
            </StandingsCard>
        </StandingsPage>
    )
}