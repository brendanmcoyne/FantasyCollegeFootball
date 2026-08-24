import type { CollegeTeam } from '../types/football'

const API_BASE_URL = 'http://localhost:8000'

export async function getTeams(): Promise<CollegeTeam[]> {
    const response = await fetch(`${API_BASE_URL}/teams`)

    if (!response.ok) {
        throw new Error('Failed to fetch college football teams')
    }

    return response.json()
}