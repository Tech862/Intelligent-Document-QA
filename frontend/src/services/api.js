import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('rv_access_token') || localStorage.getItem('rv_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use((response) => response, (error) => {
  const url = error.config?.url || ''
  const isPublicAuthRequest = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'].some((path) => url.includes(path))
  if (error.response?.status === 401 && !isPublicAuthRequest && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('rv:auth-expired'))
  }
  return Promise.reject(error)
})
