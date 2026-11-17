import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowRight, BookOpenCheck, BrainCircuit, Braces, FileSearch, FileText, Layers3, Search, Sparkles, Workflow } from 'lucide-react'

const stages = [
    { icon: FileText, name: 'Document ingestion', detail: 'PDF, DOCX, and text files enter a private, account-scoped library.' },
    { icon: FileSearch, name: 'Text extraction', detail: 'Readable content and page references are extracted from each source.' },
    { icon: Layers3, name: 'Chunking', detail: 'Content is divided into overlapping passages that preserve local context.' },
    { icon: Braces, name: 'Embedding generation', detail: 'Passages and questions are represented as comparable vectors.' },
    { icon: Search, name: 'Vector search', detail: 'The query is matched against indexed passages to rank relevant evidence.' },
    { icon: Workflow, name: 'Context retrieval', detail: 'The strongest matching passages are assembled with document metadata.' },
    { icon: BrainCircuit, name: 'LLM generation', detail: 'An answer is composed from retrieved context, with an extractive fallback.' },
    { icon: BookOpenCheck, name: 'Cited answer', detail: 'The response is returned with document names and page references to inspect.' },
]

export default function EngineSection() {
    const [active, setActive] = useState(0)
    const current = stages[active]
    return <section className="engine-section section-pad" id="engine">
        <div className="engine-intro"><span className="section-kicker">A LOOK UNDER THE HOOD</span><h2>Inside the ResearchVault<br /><span>Engine.</span></h2><p>A transparent path from your source files to a cited response. Select a stage to see what happens to your research.</p></div>
        <div className="engine-board">
            <div className="engine-board-top"><span><span className="engine-live-dot" /> RETRIEVAL PIPELINE</span><span>01 <i>/</i> 08</span></div>
            <div className="engine-flow" role="list" aria-label="Research processing stages">{stages.map(({ icon: Icon, name }, index) => <div className="engine-flow-item" key={name} role="listitem"><button className={`engine-stage${active === index ? ' is-active' : ''}${index < active ? ' is-complete' : ''}`} onClick={() => setActive(index)} aria-pressed={active === index}><span className="engine-stage-index">{String(index + 1).padStart(2, '0')}</span><Icon size={18} /><span>{name}</span></button>{index < stages.length - 1 && <span className="engine-connector" aria-hidden="true"><ArrowRight size={13} /></span>}</div>)}</div>
            <div className="engine-detail"><AnimatePresence mode="wait"><motion.div key={active} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .2 }}><span className="engine-detail-index">STEP {String(active + 1).padStart(2, '0')}</span><h3>{current.name}</h3><p>{current.detail}</p></motion.div></AnimatePresence><div className="engine-detail-icon"><Sparkles size={20} /></div></div>
            <div className="engine-board-foot"><span><span className="footer-dot" /> Each answer stays linked to its source passages</span><span>RESEARCHVAULT AI</span></div>
        </div>
    </section>
}
