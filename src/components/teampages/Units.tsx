import { useEffect, useState } from 'react'
import { getTeams } from '../../api/cfbApi'
import { createDraftUnits } from '../../utils/Units'

import type { CollegeTeam } from '../../types/football'
import type { DraftUnit, UnitType } from '../../types/fantasy'

export default function Units() {
    const [teams, setTeams] = useState<CollegeTeam[]>([])
    const [units, setUnits] = useState<DraftUnit[]>([])
    const [selectedType, setSelectedType] = useState<UnitType | 'ALL'>('ALL')
    const [selectedConference, setSelectedConference] = useState<string>('ALL')

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadTeams() {
            try {
                const data = await getTeams()

                setTeams(data)
                setUnits(createDraftUnits(data))
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message)
                } else {
                    setError('Something went wrong')
                }
            } finally {
                setLoading(false)
            }
        }

        loadTeams()
    }, [])

    if (loading) {
        return <p>Loading units...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    const filteredUnits = units.filter((unit) => {
        const matchesType =
            selectedType === 'ALL' ||
            unit.unitType === selectedType

        const matchesConference =
            selectedConference === 'ALL' ||
            unit.conference === selectedConference

        return matchesType && matchesConference
    })

    return (
        <div>
            <h1>College Football Units</h1>

            <p>
                {teams.length} teams | {units.length} draftable units
            </p>

            <div>
                <button onClick={() => setSelectedType('ALL')}>
                    All
                </button>

                <button onClick={() => setSelectedType('PASSING')}>
                    QB
                </button>

                <button onClick={() => setSelectedType('RUSHING')}>
                    Rushing
                </button>

                <button onClick={() => setSelectedType('RECEIVING')}>
                    Receiving
                </button>

                <button onClick={() => setSelectedType('DEFENSE')}>
                    Defense
                </button>

                <button onClick={() => setSelectedType('SPECIAL_TEAMS')}>
                    Special Teams
                </button>
            </div>

            <div>
                <button onClick={() => setSelectedConference('ALL')}>
                    All Conferences
                </button>

                <button onClick={() => setSelectedConference('ACC')}>
                    ACC
                </button>

                <button onClick={() => setSelectedConference('Big Ten')}>
                    Big Ten
                </button>

                <button onClick={() => setSelectedConference('Big 12')}>
                    Big 12
                </button>

                <button onClick={() => setSelectedConference('SEC')}>
                    SEC
                </button>
            </div>

            <hr />

            {filteredUnits.map((unit) => (
                <div key={unit.id}>
                    <strong>
                        {unit.teamName} {unit.unitType}
                    </strong>

                    <span>
                        {' '}
                        — {unit.conference}
                    </span>
                </div>
            ))}
        </div>
    )
}