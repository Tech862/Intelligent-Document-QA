import { BookOpen, BookOpenText, Code2, FileText, GraduationCap, LibraryBig, Search, ShieldCheck } from 'lucide-react'

const useCases = [
    { icon: GraduationCap, title: 'Academic Research', description: 'Find relevant information across multiple research papers.' },
    { icon: Code2, title: 'Technical Documentation', description: 'Search technical documents without manually scanning hundreds of pages.' },
    { icon: FileText, title: 'Project Research', description: 'Ask questions across project reports and documentation.' },
    { icon: BookOpenText, title: 'Learning', description: 'Turn study material into an interactive knowledge assistant.' },
    { icon: LibraryBig, title: 'Literature Review', description: 'Compare and explore information across multiple research documents.' },
]

const capabilities = [
    { icon: Search, label: 'Multi-document search' },
    { icon: BookOpen, label: 'Source-aware answers' },
    { icon: FileText, label: 'PDF / DOCX / TXT support' },
    { icon: ShieldCheck, label: 'Semantic retrieval' },
]

export default function UseCasesSection() {
    return <section className="use-cases-section section-pad" id="about">
        <div className="section-heading use-cases-heading"><div><span className="section-kicker">FOR WORK THAT STARTS WITH A QUESTION</span><h2>Made for the way<br /><span>you explore.</span></h2></div><p>From a focused literature review to an internal technical library, bring the material you already rely on.</p></div>
        <div className="use-case-grid">{useCases.map(({ icon: Icon, title, description }, index) => <article className={`use-case-card use-case-${index + 1}`} key={title}><span className="use-case-icon"><Icon size={19} /></span><span className="use-case-overline">{String(index + 1).padStart(2, '0')} <i>/</i> USE CASE</span><h3>{title}</h3><p>{description}</p></article>)}</div>
        <div className="capability-strip"><div className="capability-strip-label"><span className="section-kicker">CAPABILITIES, NOT CLAIMS</span><strong>The essentials, clearly.</strong></div>{capabilities.map(({ icon: Icon, label }) => <div className="capability-metric" key={label}><Icon size={16} /><span>{label}</span></div>)}</div>
    </section>
}
