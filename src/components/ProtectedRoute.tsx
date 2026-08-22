import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './Auth'

interface ProtectedRouteProps {
    children: ReactNode
}

export default function ProtectedRoute({
                                           children,
                                       }: ProtectedRouteProps) {
    const { user, loading } = useAuth()

    if (loading) {
        return <div>Loading...</div>
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return children
}