import { Link } from 'react-router-dom'

export default function Home() {
    return (
        <div>
            <h1>Fantasy College Football</h1>

            <Link to="/create-league">
                Create League
            </Link>
        </div>
    )
}