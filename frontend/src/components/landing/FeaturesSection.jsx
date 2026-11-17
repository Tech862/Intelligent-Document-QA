import { Activity, BookCopy, BookOpenCheck, FileStack, Files, History, LockKeyhole, Search, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
    { icon: Search, title: 'Semantic search', description: 'Find related ideas by meaning, not just matching keywords.' },
    { icon: FileStack, title: 'Document intelligence', description: 'Extract and prepare passages from the documents you upload.' },
    { icon: BookOpenCheck, title: 'Citation-based answers', description: 'Trace generated responses to relevant document passages.' },
    { icon: Files, title: 'Multi-document queries', description: 'Explore connections across multiple sources in one question.' },
    { icon: History, title: 'Research history', description: 'Return to earlier questions and continue your inquiry.' },
    { icon: LockKeyhole, title: 'Secure authentication', description: 'Keep each account’s research library private to its owner.' },
    { icon: BookCopy, title: 'Document management', description: 'Review, search, add, and remove library documents.' },
    { icon: Activity, title: 'Query history', description: 'Keep a searchable record of your questions and answers.' },
]

export default function FeaturesSection() {
    return <section className="features-section section-pad" id="features">
        <div className="section-heading"><div><span className="section-kicker">A BETTER RESEARCH RHYTHM</span><h2>Find the thread.<br /><span>Follow the evidence.</span></h2></div><p>Bring your own sources. Ask in your own words. Keep the evidence in view, from first question to final note.</p></div>
        <div className="feature-grid capability-grid">{features.map(({ icon: Icon, title, description }, index) => <motion.article className="capability-card" key={title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .18 }} transition={{ duration: .38, delay: index % 4 * .055 }}><span className="capability-icon"><Icon size={18} /></span><span className="capability-index">0{index + 1}</span><h3>{title}</h3><p>{description}</p><span className="capability-glint"><Sparkles size={14} /></span></motion.article>)}</div>
    </section>
}
