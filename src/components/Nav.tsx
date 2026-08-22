import { NavLink } from 'react-router-dom'

export default function Nav() {
    return (
        <nav>
            <div>
                <NavLink to="/">
                    Fantasy College Football
                </NavLink>
            </div>

            <div>
                <NavLink to="/">League</NavLink>
                <NavLink to="/team">My Team</NavLink>
                <NavLink to="/draft">Draft</NavLink>
                <NavLink to="/players">Units</NavLink>
                <NavLink to="/standings">Standings</NavLink>
            </div>
        </nav>
    )
}