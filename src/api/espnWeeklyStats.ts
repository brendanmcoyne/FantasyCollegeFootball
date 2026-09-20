import { useEffect, useState } from 'react'
import { getWeeklyStats, type WeeklyTeamData } from './weeklyStats'

const REFRESH_MS = 30_000

export function espnWeeklyStats(week: number, refresh: boolean) {
    const [stats, setStats] = useState<WeeklyTeamData[]>([])
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        let fetching = false

        async function refreshStats() {
            if (fetching) return
            fetching = true

            try {
                const next = await getWeeklyStats(week)

                if (!cancelled) {
                    setStats(next)
                    setError(null)
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Could not load weekly stats.'
                    )
                }
            } finally {
                fetching = false
                if (!cancelled) setLoading(false)
            }
        }

        setLoading(true)
        setStats([])
        void refreshStats()

        const interval = refresh
            ? window.setInterval(() => void refreshStats(), REFRESH_MS)
            : null

        return () => {
            cancelled = true
            if (interval !== null) window.clearInterval(interval)
        }
    }, [week, refresh])

    return { stats, error, loading }
}