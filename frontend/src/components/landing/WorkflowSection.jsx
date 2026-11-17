import { ArrowRight, BookOpenCheck, FileSearch, FileUp, MessageSquareText, Quote } from 'lucide-react'
import { motion } from 'framer-motion'

const steps = [
    { number: '01', icon: FileUp, title: 'Upload', description: 'Add your PDFs, DOCX files, or text documents.' },
    { number: '02', icon: FileSearch, title: 'Process', description: 'ResearchVault extracts, cleans, chunks, and indexes your content.' },
    { number: '03', icon: MessageSquareText, title: 'Ask', description: 'Ask natural-language questions about your documents.' },
    { number: '04', icon: Quote, title: 'Cite', description: 'Receive grounded answers with document references.' },
]

export default function WorkflowSection() {
    return <section className="workflow-section section-pad" id="workflow">
        <div className="workflow-heading-row"><div><span className="section-kicker">FROM DOCUMENT TO DISCOVERY</span><h2>One clear path to<br /><span>something useful.</span></h2></div><p>ResearchVault takes the busywork out of finding the passages that matter, then keeps those sources close at hand.</p></div>
        <div className="workflow-steps workflow-steps-four"><div className="workflow-line" />{steps.map(({ number, icon: Icon, title, description }, index) => <motion.article key={number} className="workflow-step" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .3 }} transition={{ duration: .45, delay: index * .08 }}><span className="step-number">{number}</span><span className="step-icon"><Icon size={19} /></span><h3>{title}</h3><p>{description}</p></motion.article>)}</div>
        <div className="workflow-footnote"><BookOpenCheck size={15} /><span>Your sources stay connected to every answer, from the first upload to the follow-up question.</span><ArrowRight size={15} /></div>
    </section>
}
