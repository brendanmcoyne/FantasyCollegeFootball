import { useEffect, useState } from 'react'

import { getWeeklyStats } from '../../api/weeklyStats'
import { calculateUnitScore } from '../../utils/scoring'

import type { WeeklyTeamData } from '../../api/weeklyStats'

export default function TeamScores() {
    const [teams, setTeams] = useState<WeeklyTeamData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadScores() {
            try {
                const data = await getWeeklyStats(1)
                setTeams(data)
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message)
                } else {
                    setError('Failed to load Week 1 scores.')
                }
            } finally {
                setLoading(false)
            }
        }

        loadScores()
    }, [])

    if (loading) {
        return <p>Loading Week 1...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    return (
        <div>
            <h1>Week 1 Fantasy Scores</h1>

            {teams.map((team) => (
                <div key={team.team}>
                    <h2>{team.team}</h2>

                    <p>
                        Passing:{' '}
                        {calculateUnitScore(
                            'PASSING',
                            team.stats
                        ).toFixed(1)}
                    </p>

                    <p>
                        Rushing:{' '}
                        {calculateUnitScore(
                            'RUSHING',
                            team.stats
                        ).toFixed(1)}
                    </p>

                    <p>
                        Receiving:{' '}
                        {calculateUnitScore(
                            'RECEIVING',
                            team.stats
                        ).toFixed(1)}
                    </p>

                    <p>
                        Defense:{' '}
                        {calculateUnitScore(
                            'DEFENSE',
                            team.stats
                        ).toFixed(1)}
                    </p>

                    <p>
                        Special Teams:{' '}
                        {calculateUnitScore(
                            'SPECIAL_TEAMS',
                            team.stats
                        ).toFixed(1)}
                    </p>

                    <hr />
                </div>
            ))}
        </div>
    )
}