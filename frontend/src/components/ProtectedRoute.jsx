import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    const location = useLocation()
    if (loading) return <div className="route-loading"><span className="spinner" />Preparing your research space</div>
    return user ? children : <Navigate to="/login" state={{ from: location }} replace />
}
