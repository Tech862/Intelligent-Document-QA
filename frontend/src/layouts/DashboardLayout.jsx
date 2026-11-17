import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Bell, BookOpenCheck, ChevronDown, Clock3, FileStack, FolderOpen, LayoutDashboard, LogOut, Menu, MessageSquareText, PanelLeftClose, PanelLeftOpen, Search, Settings2, X } from 'lucide-react'
import Brand from '../components/Brand'
import { useAuth } from '../contexts/AuthContext'
import '../dashboard.css'
import '../dashboard-light.css'

const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/dashboard/library', label: 'My Documents', icon: FileStack },
    { to: '/dashboard/ask', label: 'Research Assistant', icon: MessageSquareText },
    { to: '/dashboard/collections', label: 'Collections', icon: FolderOpen },
    { to: '/dashboard/history', label: 'Query History', icon: Clock3 },
    { to: '/dashboard/analytics', label: 'Analytics', icon: Activity },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings2 },
]
const pageTitles = {
    '/dashboard': 'Overview',
    '/dashboard/library': 'My Documents',
    '/dashboard/ask': 'Research Assistant',
    '/dashboard/collections': 'Collections',
    '/dashboard/history': 'Query History',
    '/dashboard/analytics': 'Analytics',
    '/dashboard/settings': 'Settings',
}

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [notificationsOpen, setNotificationsOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [search, setSearch] = useState('')
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const title = pageTitles[location.pathname] || 'ResearchVault'
    const initials = user?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'RV'

    async function signOut() {
        await logout()
        navigate('/login', { replace: true })
    }

    function submitSearch(event) {
        event.preventDefault()
        const query = search.trim()
        if (!query) return
        navigate('/dashboard/library', { state: { search: query } })
        setSearch('')
    }

    return <div className={`workspace-shell workspace-light${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <button className={`sidebar-backdrop${sidebarOpen ? ' is-visible' : ''}`} aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
        <aside className={`workspace-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
            <div className="sidebar-brand"><Link to="/dashboard" aria-label="ResearchVault AI overview" onClick={() => setSidebarOpen(false)}><Brand compact={sidebarCollapsed} /></Link><button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button><button className="icon-button sidebar-collapse" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></div>
            <div className="workspace-switcher"><span className="workspace-icon"><BookOpenCheck size={16} /></span><span><strong>My research space</strong><small>Personal workspace</small></span><ChevronDown size={14} /></div>
            <div className="sidebar-section-label">WORKSPACE</div>
            <nav className="workspace-nav" aria-label="Dashboard navigation">{navItems.map(({ to, label, icon: Icon, end }) => <NavLink key={to} end={end} to={to} title={sidebarCollapsed ? label : undefined} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `workspace-nav-link${isActive ? ' active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></NavLink>)}</nav>
            <div className="sidebar-upload"><span className="sidebar-upload-symbol"><BookOpenCheck size={15} /></span><div><strong>Your research space</strong><p>Add documents, then ask questions grounded in their passages.</p><Link to="/dashboard/library" onClick={() => setSidebarOpen(false)}>Open documents <span>↗</span></Link></div></div>
            <div className="sidebar-bottom"><Link to="/dashboard/settings" className="sidebar-profile-link"><span className="avatar">{initials}</span><span className="profile-meta"><strong>{user?.name}</strong><small>{user?.email}</small></span></Link><button className="sidebar-logout" onClick={signOut}><LogOut size={16} /><span>Logout</span></button></div>
        </aside>
        <div className="workspace-main">
            <header className="workspace-topbar"><button className="icon-button mobile-sidebar-trigger" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={19} /></button><div className="topbar-breadcrumb"><span>RESEARCHVAULT</span><span>/</span><strong>{title}</strong></div>
                <div className="topbar-actions"><form className="topbar-search" onSubmit={submitSearch}><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents" aria-label="Search documents" /></form><div className="topbar-popover-wrap"><button className={`topbar-icon-button${notificationsOpen ? ' is-open' : ''}`} onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false) }} aria-label="Notifications" aria-expanded={notificationsOpen}><Bell size={17} /></button>{notificationsOpen && <div className="topbar-popover notification-popover"><strong>Notifications</strong><p>You’re all caught up. New document activity will appear here.</p></div>}</div><div className="topbar-popover-wrap"><button className="topbar-user-button" onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false) }} aria-label="User profile" aria-expanded={profileOpen}><span className="avatar">{initials}</span><span>{user?.name}</span><ChevronDown size={14} /></button>{profileOpen && <div className="topbar-popover profile-popover"><span className="profile-email">Signed in as {user?.email}</span><Link to="/dashboard/settings" onClick={() => setProfileOpen(false)}>Account settings</Link><button onClick={signOut}><LogOut size={14} /> Logout</button></div>}</div></div>
            </header>
            <main className="workspace-content"><Outlet /></main>
        </div>
    </div>
}
