import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/Auth'

export default function Nav() {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()

    async function handleSignOut() {
        await signOut()
        navigate('/login')
    }

    return (
        <nav>
            <NavLink to="/">
                Fantasy College Football
            </NavLink>

            <NavLink to="/">
                League
            </NavLink>

            <NavLink to="/units">
                Units
            </NavLink>

            <NavLink to="/scoring">
                Scoring
            </NavLink>


            {user && (
                <>
                    <span>
                        {user.user_metadata?.full_name ?? user.email}
                    </span>

                    <button onClick={handleSignOut}>
                        Sign Out
                    </button>
                </>
            )}
        </nav>
    )
}