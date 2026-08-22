import { useAuth } from '../Auth'

export default function Login() {
    const { signInWithGoogle } = useAuth()

    return (
        <div>
            <h1>Fantasy College Football</h1>

            <button onClick={signInWithGoogle}>
                Sign in with Google
            </button>
        </div>
    )
}