const API_BASE_URL = 'http://localhost:8000'

export async function getTeams() {
    const response = await fetch(`${API_BASE_URL}/teams`)

    if (!response.ok) {
        throw new Error('Failed to fetch teams')
    }

    return response.json()
}