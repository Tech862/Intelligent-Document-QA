import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import ProtectedRoute from './components/ProtectedRoute'

const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'))
const OverviewPage = lazy(() => import('./pages/OverviewPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const AskPage = lazy(() => import('./pages/AskPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

const dashboardRedirects = { library: 'library', ask: 'ask', history: 'history', collections: 'collections', analytics: 'analytics', settings: 'settings' }

function AuthRoute({ mode }) {
  const { user } = useAuth()
  return user ? <Navigate to="/dashboard" replace /> : <AuthPage mode={mode} />
}

function LegacyDashboardRoute() {
  const { section } = useParams()
  const destination = section && dashboardRedirects[section] ? `/dashboard/${dashboardRedirects[section]}` : '/dashboard'
  return <Navigate to={destination} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthRoute mode="login" />} />
      <Route path="/register" element={<AuthRoute mode="register" />} />
      <Route path="/forgot-password" element={<AuthRoute mode="forgot" />} />
      <Route path="/reset-password" element={<AuthRoute mode="reset" />} />
      <Route path="/documents" element={<ProtectedRoute><Navigate to="/dashboard/library" replace /></ProtectedRoute>} />
      <Route path="/app" element={<LegacyDashboardRoute />} />
      <Route path="/app/:section" element={<LegacyDashboardRoute />} />
      <Route path="/dashboard" element={<ProtectedRoute><Suspense fallback={<div className="route-loading"><span className="spinner" />Preparing your research space</div>}><DashboardLayout /></Suspense></ProtectedRoute>}>
        <Route index element={<OverviewPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="ask" element={<AskPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}
