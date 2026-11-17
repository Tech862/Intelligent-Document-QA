import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Menu, X } from 'lucide-react'
import Brand from '../Brand'

const links = [
    ['Home', '#home'],
    ['Features', '#features'],
    ['Workflow', '#workflow'],
    ['Models', '#models'],
    ['About', '#about'],
]

export default function LandingNav() {
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const updateScrollState = () => setScrolled(window.scrollY > 18)
        updateScrollState()
        window.addEventListener('scroll', updateScrollState, { passive: true })
        return () => window.removeEventListener('scroll', updateScrollState)
    }, [])

    function closeMenu() {
        setMenuOpen(false)
    }

    return <header className={`site-header${scrolled ? ' site-header-scrolled' : ''}`}>
        <div className="site-header-inner">
            <Link to="/" aria-label="ResearchVault AI home" onClick={closeMenu}><Brand /></Link>
            <nav className={`site-nav${menuOpen ? ' site-nav-open' : ''}`} aria-label="Main navigation">
                {links.map(([label, target]) => <a key={target} href={target} onClick={closeMenu}>{label}</a>)}
                <Link className="mobile-signin" to="/login" onClick={closeMenu}>Login <ArrowRight size={15} /></Link>
                <Link className="mobile-get-started" to="/register" onClick={closeMenu}>Get started <ArrowRight size={15} /></Link>
            </nav>
            <div className="header-actions">
                <Link className="text-link" to="/login">Login</Link>
                <Link className="button button-small button-light" to="/register">Get started <ArrowRight size={15} /></Link>
            </div>
            <button className="icon-button menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
    </header>
}
