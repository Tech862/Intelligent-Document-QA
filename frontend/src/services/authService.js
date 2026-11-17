import { api } from './api'

const TOKEN_KEY = 'rv_access_token'

export function getAccessToken() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)
}

export function storeAccessToken(token, rememberMe = false) {
    clearAccessToken()
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken() {
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_KEY)
}

const authService = {
    login: (credentials) => api.post('/auth/login', credentials).then(({ data }) => data),
    register: (details) => api.post('/auth/register', details).then(({ data }) => data),
    currentUser: () => api.get('/auth/me').then(({ data }) => data.user),
    logout: () => api.post('/auth/logout'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then(({ data }) => data),
    resetPassword: (details) => api.post('/auth/reset-password', details).then(({ data }) => data),
}

export default authService
