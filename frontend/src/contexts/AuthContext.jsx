import { createContext, useContext, useEffect, useState } from 'react'
import authService, { clearAccessToken, getAccessToken, storeAccessToken } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const handleExpiredToken = () => {
            clearAccessToken()
            setUser(null)
            setLoading(false)
        }
        window.addEventListener('rv:auth-expired', handleExpiredToken)
        const token = getAccessToken()
        if (!token) {
            setLoading(false)
            return () => window.removeEventListener('rv:auth-expired', handleExpiredToken)
        }
        authService.currentUser()
            .then(setUser)
            .catch(() => clearAccessToken())
            .finally(() => setLoading(false))
        return () => window.removeEventListener('rv:auth-expired', handleExpiredToken)
    }, [])

    async function login(credentials) {
        const data = await authService.login(credentials)
        storeAccessToken(data.access_token, credentials.remember_me === true)
        setUser(data.user)
        return data.user
    }

    async function register(details) {
        const data = await authService.register(details)
        storeAccessToken(data.access_token)
        setUser(data.user)
        return data.user
    }

    async function logout() {
        try {
            await authService.logout()
        } catch {
            clearAccessToken()
            setUser(null)
            return
        }
        clearAccessToken()
        setUser(null)
    }

    return <AuthContext.Provider value={{ user, loading, login, register, logout, forgotPassword: authService.forgotPassword, resetPassword: authService.resetPassword }}>{children}</AuthContext.Provider>
}

export function useAuth() {
    return useContext(AuthContext)
}
