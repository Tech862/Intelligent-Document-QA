import { BookOpenCheck } from 'lucide-react'

export default function Brand({ compact = false }) {
    return <span className={`brand-lockup${compact ? ' brand-lockup-compact' : ''}`}>
        <span className="brand-mark"><BookOpenCheck size={19} strokeWidth={1.8} /></span>
        {!compact && <span className="brand-name">researchvault<span> AI</span></span>}
    </span>
}
