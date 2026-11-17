import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowUp, BookOpen, Check, ChevronDown, FileText, Plus, RotateCcw, Sparkles } from 'lucide-react'
import { researchApi } from '../services/research'
import Notice from '../components/Notice'

const prompts = ['What are the main themes across my sources?', 'Where do the authors disagree?', 'Summarize a key finding with its context']

export default function AskPage() {
    const location = useLocation()
    const [documents, setDocuments] = useState([])
    const [selected, setSelected] = useState([])
    const [messages, setMessages] = useState([])
    const [question, setQuestion] = useState(location.state?.question || '')
    const [error, setError] = useState('')
    const [sending, setSending] = useState(false)
    const [filterOpen, setFilterOpen] = useState(false)
    const scrollRef = useRef(null)
    useEffect(() => { researchApi.documents().then(setDocuments).catch(() => setError('The API could not load your source library.')) }, [])
    useEffect(() => {
        const previousQuery = location.state?.previousQuery
        if (previousQuery) {
            setMessages([
                { role: 'user', content: previousQuery.question },
                { role: 'assistant', content: previousQuery.answer, sources: previousQuery.sources || [], model: previousQuery.model },
            ])
            setQuestion('')
        } else if (location.state?.question) {
            setQuestion(location.state.question)
        }
    }, [location.state])
    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages])

    async function submitQuestion(value = question) {
        const prompt = value.trim()
        if (!prompt || sending) return
        if (!documents.length) { setError('Add at least one document to your library before asking a question.'); return }
        setMessages((current) => [...current, { role: 'user', content: prompt }])
        setQuestion('')
        setError('')
        setSending(true)
        try {
            const result = await researchApi.ask(prompt, selected)
            setMessages((current) => [...current, { role: 'assistant', content: result.answer, sources: result.sources || [], model: result.model }])
        } catch (err) {
            setError(err.response?.data?.error || 'Your question could not be answered. Check that the API and retrieval service are running.')
        } finally { setSending(false) }
    }

    const readyDocs = documents.filter((doc) => doc.status === 'ready')
    return <div className="ask-page page-enter"><div className="ask-heading"><div><span className="section-kicker">GROUNDED IN YOUR SOURCES</span><h1>Ask your <span>research.</span></h1><p>Explore ideas across your library and follow every answer to its source.</p></div><div className="source-filter-wrap"><button className={`source-filter${filterOpen ? ' filter-open' : ''}`} onClick={() => setFilterOpen(!filterOpen)}><BookOpen size={16} />{selected.length ? `${selected.length} sources selected` : 'All ready sources'}<ChevronDown size={15} /></button>{filterOpen && <div className="source-filter-menu"><strong>Search within</strong><button onClick={() => { setSelected([]); setFilterOpen(false) }}><span className={`source-check${selected.length === 0 ? ' checked' : ''}`}>{selected.length === 0 && <Check size={12} />}</span>All ready sources</button>{readyDocs.map((doc) => <button key={doc.id} onClick={() => setSelected((current) => current.includes(doc.id) ? current.filter((id) => id !== doc.id) : [...current, doc.id])}><span className={`source-check${selected.includes(doc.id) ? ' checked' : ''}`}>{selected.includes(doc.id) && <Check size={12} />}</span>{doc.filename}</button>)}<button className="filter-done" onClick={() => setFilterOpen(false)}>Done</button></div>}</div></div>
        {error && <Notice>{error}</Notice>}
        <section className="chat-panel"><div className="chat-topline"><span><span className="footer-dot" /> {readyDocs.length} {readyDocs.length === 1 ? 'source' : 'sources'} ready to explore</span><button onClick={() => setMessages([])} disabled={!messages.length}><RotateCcw size={14} /> New conversation</button></div>
            <div className="chat-transcript">{!messages.length ? <div className="chat-welcome"><span className="chat-welcome-icon"><Sparkles size={20} /></span><span className="section-kicker">START WITH A QUESTION</span><h2>Let curiosity lead.</h2><p>Your answer will be grounded in the passages that best match your question.</p>{!readyDocs.length ? <div className="no-sources-callout"><FileText size={16} /> Your library is empty. Add a document before asking.</div> : <div className="prompt-list">{prompts.map((prompt) => <button key={prompt} onClick={() => submitQuestion(prompt)}>{prompt}<ArrowUp size={14} /></button>)}</div>}</div> : <div className="message-list">{messages.map((message, index) => <article className={`chat-message message-${message.role}`} key={`${index}-${message.role}`}><span className={`message-avatar${message.role === 'assistant' ? ' assistant-avatar' : ''}`}>{message.role === 'assistant' ? <Sparkles size={15} /> : 'Y'}</span><div className="message-content"><span className="message-label">{message.role === 'assistant' ? 'RESEARCHVAULT' : 'YOU'}{message.model && <i>· {message.model}</i>}</span><p>{message.content}</p></div></article>)}{sending && <div className="answer-loading"><span className="spinner" />Finding relevant passages in your sources…</div>}<div ref={scrollRef} /></div>}</div>
            <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); submitQuestion() }}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitQuestion() } }} placeholder="Ask a question about your research…" aria-label="Your question" rows="1" /><div className="composer-bottom"><span><Plus size={14} /> {selected.length ? `${selected.length} sources selected` : 'Across your library'} <i>·</i> Enter to ask</span><button className="send-question" disabled={!question.trim() || sending} aria-label="Send question"><ArrowUp size={17} /></button></div></form><div className="chat-disclaimer"><Sparkles size={13} /> Answers are generated from your library. Review the cited passages to verify context.</div>
        </section></div>
}
