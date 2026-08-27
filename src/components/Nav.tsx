import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/Auth'
import styled from 'styled-components'

const BigNav = styled.nav`
    background: #1f2937;
    color: white;
    padding: 14px 24px;
`

const NavInner = styled.div`
    width: min(1200px, 100%);
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 24px;
`

const NavLinks = styled.div`
    display: flex;
    gap: 18px;

    a {
        color: white;
        text-decoration: none;
        font-weight: 600;
    }

    a:hover {
        text-decoration: underline;
    }
`

const NavSpacer = styled.div`
    flex: 1;
`

const UserArea = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`

const SignOutButton = styled.button`
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    background: #ffffff;
    color: #1f2937;
    font-weight: 600;
`

export default function Nav() {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()

    async function handleSignOut() {
        await signOut()
        navigate('/login')
    }

    return (
        <BigNav>
            <NavInner>
                <strong>Fantasy College Football</strong>

                <NavLinks>
                    <Link to="/">League</Link>
                    <Link to="/units">Units</Link>
                    <Link to="/scoring">Scoring</Link>
                </NavLinks>

                <NavSpacer />

                <UserArea>
                    {user && (
                        <>
                            <span>{user.user_metadata?.full_name ?? user.email}</span>

                            <SignOutButton onClick={handleSignOut}>
                                Sign Out
                            </SignOutButton>
                        </>
                    )}
                </UserArea>
            </NavInner>
        </BigNav>
    )
}