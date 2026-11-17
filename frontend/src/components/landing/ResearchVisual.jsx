import { ArrowUpRight, BookOpenCheck, Check, FileText, Network, Search, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

const nodes = [
    { className: 'knowledge-node node-paper-one', icon: FileText, label: 'Paper' },
    { className: 'knowledge-node node-paper-two', icon: BookOpenCheck, label: 'Notes' },
    { className: 'knowledge-node node-paper-three', icon: Network, label: 'Concept' },
]

export default function ResearchVisual() {
    return <motion.div initial={{ opacity: 0, scale: .96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: .75, delay: .12 }} className="hero-art" aria-label="Illustration of an AI research workspace with a cited answer">
        <div className="research-canvas-grid" />
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        <div className="hero-art-label"><span className="live-pip" /> YOUR RESEARCH, IN CONTEXT</div>
        <div className="knowledge-map" aria-hidden="true">
            <svg viewBox="0 0 360 275" className="knowledge-connections"><path d="M57 51 C112 48 130 93 177 112 S241 189 300 183" /><path d="M67 217 C124 203 126 139 177 112 S230 57 292 68" /><path d="M57 51 C90 121 87 171 67 217" /><path d="M292 68 C311 104 321 146 300 183" /></svg>
            {nodes.map(({ className, icon: Icon, label }) => <span key={label} className={className}><Icon size={14} /><small>{label}</small></span>)}
            <span className="knowledge-core"><Sparkles size={17} /></span>
        </div>
        <div className="answer-panel">
            <div className="answer-panel-head"><span className="answer-panel-mark"><Sparkles size={13} /></span><span>RESEARCH ANSWER <i>·</i> SOURCE-AWARE</span><span className="answer-panel-more">···</span></div>
            <div className="answer-question">What connects the findings in these papers?</div>
            <div className="answer-divider" />
            <div className="answer-response"><span className="answer-spark"><Sparkles size={13} /></span><p>Across your sources, a recurring theme is <mark>making uncertainty visible</mark> before decisions are made.</p></div>
            <div className="answer-citation"><span className="citation-index">01</span><div><strong>A passage from your library</strong><span>Research paper <i>·</i> page 18</span></div><ArrowUpRight size={14} /></div>
            <div className="answer-panel-foot"><span><span className="footer-dot" /> Citation linked</span><span>Open passage <Check size={12} /></span></div>
        </div>
        <div className="floating-node node-search"><Search size={15} /><span>Semantic search</span></div>
        <div className="floating-node node-cited"><BookOpenCheck size={15} /><span>Source connected</span><Check size={12} /></div>
    </motion.div>
}
