import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Clock3, MessageSquareText, Search } from 'lucide-react'
import Notice from '../components/Notice'
import { researchApi } from '../services/research'

export default function HistoryPage() {
    const [queries, setQueries] = useState([])
    const [search, setSearch] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()
    useEffect(() => { researchApi.history().then(setQueries).catch(() => setError('Could not load question history. Check that the API is running.')).finally(() => setLoading(false)) }, [])
    const filtered = queries.filter((query) => query.question.toLowerCase().includes(search.toLowerCase()))
    return <div className="history-page page-enter"><div className="page-heading"><div><span className="section-kicker">A RECORD OF YOUR INQUIRIES</span><h1>Query <span>history.</span></h1><p>Return to a question, review its answer, or continue exploring.</p></div><label className="library-search history-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a question" aria-label="Find a question" /></label></div>
        {error && <Notice>{error}</Notice>}
        {loading ? <div className="panel history-empty"><span className="spinner" />Loading your questions…</div> : !queries.length ? <div className="panel history-empty"><span className="empty-symbol"><Clock3 size={21} /></span><span className="section-kicker">YOUR INQUIRIES, IN ONE PLACE</span><h2>Every good question<br />has a next one.</h2><p>Your asked questions will show up here, ready to revisit.</p><button className="text-action" onClick={() => navigate('/dashboard/ask')}>Ask your first question <ArrowUpRight size={15} /></button></div> : <section className="panel history-panel"><div className="history-panel-head"><span>{filtered.length} {filtered.length === 1 ? 'question' : 'questions'}</span><span>QUESTION <i>·</i> ANSWER PREVIEW <i>·</i> ASKED</span></div>{filtered.map((query) => <button className="history-row" key={query.id} onClick={() => navigate('/dashboard/ask', { state: { previousQuery: query } })}><span className="history-icon"><MessageSquareText size={17} /></span><span className="history-question"><strong>{query.question}</strong><small>{query.answer || 'Open to continue this question.'}</small></span><span className="history-meta">{query.created_at ? new Date(query.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}<ArrowUpRight size={15} /></span></button>)}</section>}
    </div>
}
