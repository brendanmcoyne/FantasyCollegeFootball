import { useEffect } from 'react'

import { getTeams } from '../api/cfbApi'
import { getPositionRanks } from '../utils/unitRankings'

export default function StatLoader() {
    useEffect(() => {
        let cancelled = false

        async function preloadRankings() {
            try {
                const teams = await getTeams()

                if (cancelled) {
                    return
                }

                await getPositionRanks(teams, 'PASSING')
            } catch (error) {
                console.error('Failed to preload rankings:', error)
            }
        }

        void preloadRankings()

        return () => {
            cancelled = true
        }
    }, [])

    return null
}