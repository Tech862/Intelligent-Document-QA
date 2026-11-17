import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpenCheck, GraduationCap, HardDrive, LibraryBig, NotebookPen } from 'lucide-react'
import { motion } from 'framer-motion'
import EngineSection from '../components/landing/EngineSection'
import FeaturesSection from '../components/landing/FeaturesSection'
import LandingFooter from '../components/landing/LandingFooter'
import LandingNav from '../components/landing/LandingNav'
import ResearchVisual from '../components/landing/ResearchVisual'
import UseCasesSection from '../components/landing/UseCasesSection'
import WorkflowSection from '../components/landing/WorkflowSection'

const disciplines = [
    { icon: GraduationCap, name: 'Academic research' },
    { icon: HardDrive, name: 'Technical documentation' },
    { icon: NotebookPen, name: 'Project reports' },
    { icon: BookOpenCheck, name: 'Study material' },
    { icon: LibraryBig, name: 'Knowledge bases' },
]

export default function LandingPage() {
    return <main className="landing-page" data-theme="light">
        <LandingNav />
        <section className="hero-section" id="home">
            <div className="hero-grain" />
            <div className="hero-inner">
                <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }} className="hero-copy">
                    <span className="eyebrow"><span className="eyebrow-dot" /> A clearer way to think with your research</span>
                    <h1>Turn <span className="hero-gradient">Research Into<br />Answers.</span></h1>
                    <p className="hero-lede">Upload research papers, technical documents, and study material. Search your knowledge base and get grounded answers with source citations.</p>
                    <div className="hero-actions"><Link to="/register" className="button button-primary">Explore ResearchVault <ArrowRight size={17} /></Link><a href="#workflow" className="button button-quiet"><span className="play-icon"><ArrowDown size={15} /></span> See How It Works</a></div>
                    <div className="hero-note"><BookOpenCheck size={16} /> Your sources stay in view. <span>Every answer can be traced.</span></div>
                </motion.div>
                <ResearchVisual />
            </div>
            <div className="hero-bottom"><span>BUILT FOR MODERN RESEARCH WORKFLOWS</span><div className="discipline-list"><span>Research</span><i>·</i><span>Engineering</span><i>·</i><span>Learning</span><i>·</i><span>Knowledge work</span></div></div>
        </section>

        <section className="intro-strip discipline-strip"><div className="discipline-strip-inner"><span className="section-kicker">A WORKSPACE FOR WHAT YOU’RE WORKING ON</span><div className="discipline-usecases">{disciplines.map(({ icon: Icon, name }) => <span key={name}><Icon size={17} />{name}</span>)}</div></div></section>

        <WorkflowSection />
        <EngineSection />
        <FeaturesSection />
        <UseCasesSection />

        <section className="models-section section-pad" id="models"><div className="models-copy"><span className="section-kicker">FLEXIBLE BY DESIGN</span><h2>Your models.<br /><span>Your methods.</span></h2><p>Choose how answers are generated. Connect an OpenAI-compatible provider with your own key, or use the grounded extractive fallback while you explore the workflow.</p><div className="model-list"><div><span className="model-dot model-blue" /><strong>OpenAI-compatible</strong><span>Bring your own key</span></div><div><span className="model-dot model-mint" /><strong>Extractive fallback</strong><span>Grounded in retrieved passages</span></div><div><span className="model-dot model-violet" /><strong>Local embeddings</strong><span>Configure your preferred model</span></div></div></div><div className="models-orbit"><div className="model-ring ring-outer" /><div className="model-ring ring-inner" /><span className="orbit-chip chip-one"><ArrowUpRight size={15} /> GENERATION</span><span className="orbit-chip chip-two"><ArrowDown size={15} /> RETRIEVAL</span><span className="orbit-core"><BookOpenCheck size={28} /></span><span className="orbit-chip chip-three"><BookOpenCheck size={15} /> YOUR SOURCES</span></div></section>

        <section className="closing-section"><span className="closing-kicker">MAKE SPACE FOR THE NEXT QUESTION</span><h2>Your Research.<br /><span>One Intelligent Workspace.</span></h2><p>Stop searching through documents manually. Build a searchable knowledge base and explore your research conversationally.</p><div className="closing-actions"><Link to="/register" className="button button-primary">Start Exploring <ArrowRight size={17} /></Link><a href="#workflow" className="button button-quiet">View Workflow <ArrowDown size={15} /></a></div><div className="closing-lines" /></section>

        <LandingFooter />
    </main>
}
