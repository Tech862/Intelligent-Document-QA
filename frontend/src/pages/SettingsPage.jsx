import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, AtSign, KeyRound, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function SettingsPage() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    async function signOut() {
        await logout()
        navigate('/')
    }

    return <div className="settings-page page-enter">
        <div className="page-heading"><div><span className="section-kicker">YOUR ACCOUNT</span><h1>Settings.</h1><p>Review your account details and sign-in options.</p></div></div>
        <section className="panel settings-panel"><div className="settings-panel-heading"><span className="settings-heading-icon"><UserRound size={18} /></span><div><h2>Profile</h2><p>Your account details for this research workspace.</p></div></div><div className="settings-row"><span><UserRound size={15} />Full name</span><strong>{user?.name || '—'}</strong></div><div className="settings-row"><span><AtSign size={15} />Email address</span><strong>{user?.email || '—'}</strong></div></section>
        <section className="panel settings-panel"><div className="settings-panel-heading"><span className="settings-heading-icon"><ShieldCheck size={18} /></span><div><h2>Sign-in &amp; security</h2><p>Your account is protected with a signed access token.</p></div></div><div className="settings-action-row"><span><KeyRound size={16} /><span><strong>Password</strong><small>Request a one-time password reset link.</small></span></span><Link to="/forgot-password" state={{ email: user?.email }}>Reset password <ArrowRight size={14} /></Link></div><div className="settings-action-row"><span><LogOut size={16} /><span><strong>Current session</strong><small>Sign out of this browser session.</small></span></span><button className="text-action" onClick={signOut}>Sign out <ArrowRight size={14} /></button></div></section>
    </div>
}
