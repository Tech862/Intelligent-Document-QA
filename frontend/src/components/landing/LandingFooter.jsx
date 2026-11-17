import { ArrowUpRight, Github, Linkedin, Mail, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import Brand from '../Brand'

const sections = [
    { title: 'Product', links: [['Features', '#features'], ['Workflow', '#workflow'], ['Models', '#models'], ['Dashboard', '/dashboard']] },
    { title: 'Company', links: [['About', '#about'], ['Contact', '#contact'], ['Privacy', '#privacy']] },
]

export default function LandingFooter() {
    return <footer className="site-footer" id="privacy">
        <div className="footer-main"><div className="footer-brand-column"><Link to="/" aria-label="ResearchVault AI home"><Brand /></Link><p>An AI-powered research knowledge platform.</p><span>Turn Research Into Answers.</span></div>
            {sections.map(({ title, links }) => <div className="footer-link-group" key={title}><span>{title}</span>{links.map(([label, target]) => target.startsWith('/') ? <Link key={label} to={target}>{label}</Link> : <a key={label} href={target}>{label}</a>)}</div>)}
            <div className="footer-social" id="contact"><span>Contact</span><strong className="footer-contact-name">Rahul Dandotiya</strong><a className="footer-contact-phone" href="tel:6265636646"><Phone size={14} />6265636646</a><a className="footer-contact-phone footer-contact-email" href="mailto:rahuldandotiya682@gmail.com"><Mail size={14} />rahuldandotiya682@gmail.com</a><div><a href="https://github.com/" aria-label="GitHub profile"><Github size={16} /></a><a href="https://www.linkedin.com/feed/" aria-label="LinkedIn profile"><Linkedin size={16} /></a></div><small>ResearchVault AI</small></div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} ResearchVault AI</span><span>Thoughtfully built for curious minds.</span><a href="#home">Back to top <ArrowUpRight size={13} /></a></div>
    </footer>
}
