import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/Auth'
import styled from 'styled-components'

const BigNav = styled.nav`
    background: #2f293b;
    color: white;
    padding: 14px 24px;

    @media (max-width: 700px) {
        padding: 10px 12px;
    }
`;

const NavInner = styled.div`
    width: min(1200px, 100%);
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 24px;

    @media (max-width: 700px) {
        gap: 10px;
        width: 100%;
    }
`;

const NavLinks = styled.div`
    display: flex;
    gap: 18px;

    a {
        color: white;
        text-decoration: none;
        font-weight: 600;
        white-space: nowrap;
    }

    a:hover {
        text-decoration: underline;
    }

    @media (max-width: 700px) {
        gap: 12px;

        a {
            font-size: 0.9rem;
        }
    }
`;

const NavSpacer = styled.div`
    flex: 1;
`;

const UserArea = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;

    @media (max-width: 700px) {
        gap: 6px;
    }
`;

const SignOutButton = styled.button`
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    background: #ffffff;
    color: #1f2937;
    font-weight: 600;
    white-space: nowrap;

    @media (max-width: 700px) {
        padding: 7px 9px;
        font-size: 0.85rem;
    }
`

const SiteTitle = styled.strong`
    white-space: nowrap;

    @media (max-width: 700px) {
        display: none;
    }
`;

const UserName = styled.span`
    white-space: nowrap;

    @media (max-width: 700px) {
        display: none;
    }
`;

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
                <SiteTitle>Fantasy College Football</SiteTitle>

                <NavLinks>
                    <Link to="/">League</Link>
                    <Link to="/units">Units</Link>
                    <Link to="/scoring">Scoring</Link>
                </NavLinks>

                <NavSpacer />

                <UserArea>
                    {user && (
                        <>
                            <UserName>{user.user_metadata?.full_name ?? user.email}</UserName>
                            <SignOutButton onClick={handleSignOut}>Sign Out</SignOutButton>
                        </>
                    )}
                </UserArea>
            </NavInner>
        </BigNav>
    )
}