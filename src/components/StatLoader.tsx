import { useEffect } from 'react'
import { getPositionRanks } from '../utils/unitRankings'

export default function StatLoader() {
    useEffect(() => {
        void getPositionRanks('PASSING').catch((error) => {
            console.error('Failed to preload position ranks:', error)
        })
    }, [])

    return null
}