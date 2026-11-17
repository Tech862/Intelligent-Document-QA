import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, BookOpenCheck, Clock3, FileStack, FileText, FolderPlus, MessageSquareText, Search, Trash2, UploadCloud } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { researchApi } from '../services/research'
import Notice from '../components/Notice'

const formatDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const statusText = { ready: 'Indexed', processing: 'Processing', error: 'Failed', failed: 'Failed' }

export default function OverviewPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [stats, setStats] = useState(null)
    const [documents, setDocuments] = useState([])
    const [questions, setQuestions] = useState([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [error, setError] = useState('')

    useEffect(() => {
        Promise.all([researchApi.stats(), researchApi.documents(), researchApi.history()])
            .then(([nextStats, nextDocuments, nextQuestions]) => {
                setStats(nextStats)
                setDocuments(nextDocuments)
                setQuestions(nextQuestions)
            })
            .catch(() => setError('Your workspace data is unavailable. Check that the ResearchVault API and database are running.'))
    }, [])

    const visibleDocuments = useMemo(() => documents.filter((document) => {
        const matchesSearch = document.filename.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || document.status === statusFilter
        return matchesSearch && matchesStatus
    }).slice(0, 6), [documents, search, statusFilter])

    async function removeDocument(document) {
        if (!window.confirm(`Remove “${document.filename}” and its indexed passages?`)) return
        try {
            await researchApi.removeDocument(document.id)
            setDocuments((current) => current.filter((item) => item.id !== document.id))
            const nextStats = await researchApi.stats()
            setStats(nextStats)
        } catch (err) {
            setError(err.response?.data?.error || 'Could not remove this document.')
        }
    }

    const firstName = user?.name?.split(' ')[0] || 'Researcher'
    const summary = [
        { label: 'Documents', value: stats?.document_count, detail: 'In your library', icon: FileStack, tone: 'cyan' },
        { label: 'Indexed Chunks', value: stats?.chunk_count, detail: 'Ready for retrieval', icon: BookOpenCheck, tone: 'blue' },
        { label: 'Questions Asked', value: stats?.query_count, detail: 'Saved in your history', icon: MessageSquareText, tone: 'violet' },
        { label: 'Collections', value: stats?.collection_count, detail: 'Organizing your sources', icon: FolderPlus, tone: 'mint' },
    ]
    const quickActions = [
        { title: 'Upload Document', description: 'Add a paper or report to your library.', icon: UploadCloud, to: '/dashboard/library' },
        { title: 'Ask ResearchVault', description: 'Explore answers grounded in your sources.', icon: MessageSquareText, to: '/dashboard/ask' },
        { title: 'Create Collection', description: 'Group documents around a line of inquiry.', icon: FolderPlus, to: '/dashboard/collections' },
        { title: 'View History', description: 'Return to earlier questions and answers.', icon: Clock3, to: '/dashboard/history' },
    ]

    return <div className="overview-page page-enter">
        <div className="page-heading overview-heading"><div><span className="section-kicker">YOUR RESEARCH WORKSPACE</span><h1>Good to see you, <span>{firstName}.</span></h1><p>Explore your knowledge base and continue your research.</p></div><Link to="/dashboard/library" className="button button-primary"><UploadCloud size={16} /> Upload Document</Link></div>
        {error && <Notice>{error}</Notice>}
        <section className="stat-grid overview-stat-grid" aria-label="Workspace summary">{summary.map(({ label, value, detail, icon: Icon, tone }) => <div className="stat-tile" key={label}><span className={`stat-icon stat-icon-${tone}`}><Icon size={18} /></span><span className="stat-label">{label}</span><strong>{value ?? '—'}</strong><small>{detail}</small></div>)}</section>

        <section className="research-flow-section" aria-labelledby="research-flow-title">
            <div className="research-flow-heading"><div><span className="section-kicker">YOUR RESEARCH, READY TO EXPLORE</span><h2 id="research-flow-title">From documents to cited answers</h2></div><span className="research-flow-caption">A practical workflow for your knowledge base</span></div>
            <div className="research-flow-grid">
                <Link className="research-flow-card flow-upload" to="/dashboard/library"><span className="research-flow-icon"><UploadCloud size={21} /></span><span className="research-flow-step">01 <i>/ UPLOAD</i></span><strong>Add your research</strong><small>Upload a PDF, DOCX, or text file. Your document is chunked and indexed for search.</small><span className="research-flow-action">Open document library <ArrowRight size={15} /></span></Link>
                <Link className="research-flow-card flow-ask" to="/dashboard/ask"><span className="research-flow-icon"><MessageSquareText size={21} /></span><span className="research-flow-step">02 <i>/ ASK</i></span><strong>Explore your sources</strong><small>Ask a natural-language question across your ready documents and collections.</small><span className="research-flow-action">Open research assistant <ArrowRight size={15} /></span></Link>
                <Link className="research-flow-card flow-cite" to="/dashboard/history"><span className="research-flow-icon"><BookOpenCheck size={21} /></span><span className="research-flow-step">03 <i>/ VERIFY</i></span><strong>Follow the citations</strong><small>Review saved answers and open the passages that support each response.</small><span className="research-flow-action">Review cited answers <ArrowRight size={15} /></span></Link>
            </div>
        </section>

        <div className="dashboard-content-grid">
            <section className="panel overview-table-panel"><div className="overview-panel-heading"><div><span className="section-kicker">YOUR SOURCE MATERIAL</span><h2>Recent documents</h2></div><Link to="/dashboard/library" className="panel-link">All documents <ArrowUpRight size={14} /></Link></div>
                {documents.length ? <><div className="overview-document-tools"><label className="library-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents" aria-label="Search documents" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter documents by status"><option value="all">All statuses</option><option value="ready">Indexed</option><option value="processing">Processing</option><option value="error">Failed</option></select></div><div className="document-table-wrap"><table className="document-table overview-document-table"><thead><tr><th>DOCUMENT</th><th>TYPE</th><th>UPLOADED</th><th>CHUNKS</th><th>STATUS</th><th><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{visibleDocuments.map((document) => <tr key={document.id}><td><div className="document-cell"><span className="document-file-icon"><FileText size={17} /></span><div><strong>{document.filename}</strong><small>{Math.max(1, Math.round((document.file_size || 0) / 1024))} KB</small></div></div></td><td>{document.file_type?.toUpperCase() || '—'}</td><td>{formatDate(document.created_at)}</td><td>{document.chunk_count ?? '—'}</td><td><span className={`document-status document-status-${document.status}`}><i />{statusText[document.status] || document.status}</span></td><td><button className="row-action" aria-label={`Remove ${document.filename}`} onClick={() => removeDocument(document)}><Trash2 size={15} /></button></td></tr>)}{!visibleDocuments.length && <tr><td colSpan="6" className="table-message">No documents match these filters.</td></tr>}</tbody></table></div><div className="overview-table-footer"><span>Showing {visibleDocuments.length} of {documents.length} documents</span><Link to="/dashboard/library">Open library <ArrowRight size={13} /></Link></div></> : <div className="dashboard-empty-state"><span className="empty-symbol"><FileStack size={21} /></span><strong>Your research library is empty.</strong><p>Upload your first document to start building your knowledge base.</p><Link to="/dashboard/library" className="button button-primary"><UploadCloud size={15} /> Upload Document</Link></div>}
            </section>

            <section className="panel overview-questions-panel"><div className="overview-panel-heading"><div><span className="section-kicker">YOUR INQUIRIES</span><h2>Recent questions</h2></div><Link to="/dashboard/history" className="icon-link" aria-label="View query history"><ArrowUpRight size={16} /></Link></div>{questions.length ? <div className="recent-question-list">{questions.slice(0, 5).map((query) => <button className="recent-question-row" key={query.id} onClick={() => navigate('/dashboard/ask', { state: { previousQuery: query } })}><span className="history-icon"><MessageSquareText size={16} /></span><span className="recent-question-copy"><strong>{query.question}</strong><small>{formatDate(query.created_at)} <i>·</i> {query.sources?.length || 0} {query.sources?.length === 1 ? 'source' : 'sources'}</small></span><span className="answered-status"><i /> Answered</span></button>)}</div> : <div className="recent-question-empty"><span className="empty-symbol"><MessageSquareText size={20} /></span><strong>No questions yet.</strong><p>Your saved answers will appear here.</p><Link to="/dashboard/ask">Ask a question <ArrowRight size={13} /></Link></div>}</section>
        </div>

        <section className="quick-actions-section"><div className="quick-actions-heading"><div><span className="section-kicker">KEEP YOUR RESEARCH MOVING</span><h2>Quick actions</h2></div></div><div className="quick-action-grid">{quickActions.map(({ title, description, icon: Icon, to }) => <Link className="quick-action-card" to={to} key={title}><span className="quick-action-icon"><Icon size={17} /></span><span className="quick-action-copy"><strong>{title}</strong><small>{description}</small></span><ArrowRight className="quick-action-arrow" size={15} /></Link>)}</div></section>
    </div>
}
