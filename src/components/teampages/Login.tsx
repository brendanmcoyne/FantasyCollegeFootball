import { useAuth } from '../Auth'
import styled from 'styled-components'

const LoginPage = styled.div`
    min-height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
`

const LoginCard = styled.div`
    width: min(480px, 100%);
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 16px;
    padding: 40px 32px;
    text-align: center;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
`

const Title = styled.h1`
    margin: 0;
    color: #111827;
    font-size: 2.2rem;
`

const Subtitle = styled.p`
    margin: 12px 0 28px;
    color: #6b7280;
    line-height: 1.5;
`

const GoogleButton = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;

    padding: 12px 18px;

    background: #ffffff;
    color: #1f2937;

    border: 1px solid #d1d5db;
    border-radius: 9px;

    font-size: 1rem;
    font-weight: 700;

    cursor: pointer;

    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        box-shadow 0.15s ease;

    &:hover {
        background: #f9fafb;
        border-color: #9ca3af;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    &:active {
        background: #f3f4f6;
    }
`

const GoogleIcon = styled.div`
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;

    font-size: 1.1rem;
    font-weight: 800;

    color: #4285f4;
`

const FooterText = styled.p`
    margin: 22px 0 0;
    color: #9ca3af;
    font-size: 0.85rem;
`

export default function Login() {
    const { signInWithGoogle } = useAuth()

    return (
        <LoginPage>
            <LoginCard>
                <Title>
                    Fantasy College Football
                </Title>

                <Subtitle>
                    Draft college football units, build your roster,
                    and compete against your friends every week.
                </Subtitle>

                <GoogleButton onClick={signInWithGoogle}>
                    <GoogleIcon>G</GoogleIcon>

                    Sign in with Google
                </GoogleButton>

                <FooterText>
                    Sign in to create or join a league.
                </FooterText>
            </LoginCard>
        </LoginPage>
    )
}