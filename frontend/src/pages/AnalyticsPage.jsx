import { useEffect, useState } from 'react'
import { Activity, BookOpenCheck, FileStack, MessageSquareText } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Notice from '../components/Notice'
import { researchApi } from '../services/research'

export default function AnalyticsPage() {
    const [stats, setStats] = useState(null)
    const [documents, setDocuments] = useState([])
    const [error, setError] = useState('')
    useEffect(() => {
        Promise.all([researchApi.stats(), researchApi.documents()])
            .then(([nextStats, nextDocuments]) => { setStats(nextStats); setDocuments(nextDocuments) })
            .catch(() => setError('Could not load workspace analytics. Check that the API is running.'))
    }, [])

    const typeCounts = documents.reduce((counts, document) => {
        const type = (document.file_type || 'other').toUpperCase()
        counts[type] = (counts[type] || 0) + 1
        return counts
    }, {})
    const types = Object.entries(typeCounts).map(([type, count]) => ({ type, count }))
    return <div className="analytics-page page-enter">
        <div className="page-heading"><div><span className="section-kicker">YOUR WORKSPACE, IN CONTEXT</span><h1>Research <span>analytics.</span></h1><p>Activity summaries reflect documents and questions in your account.</p></div></div>
        {error && <Notice>{error}</Notice>}
        <section className="stat-grid analytics-stat-grid" aria-label="Workspace metrics"><div className="stat-tile"><span className="stat-icon stat-icon-cyan"><FileStack size={18} /></span><span className="stat-label">DOCUMENTS</span><strong>{stats?.document_count ?? '—'}</strong><small>Added to your library</small></div><div className="stat-tile"><span className="stat-icon stat-icon-blue"><BookOpenCheck size={18} /></span><span className="stat-label">INDEXED CHUNKS</span><strong>{stats?.chunk_count ?? '—'}</strong><small>Available for retrieval</small></div><div className="stat-tile"><span className="stat-icon stat-icon-violet"><MessageSquareText size={18} /></span><span className="stat-label">QUESTIONS ASKED</span><strong>{stats?.query_count ?? '—'}</strong><small>Saved in your history</small></div><div className="stat-tile"><span className="stat-icon stat-icon-cyan"><Activity size={18} /></span><span className="stat-label">COLLECTIONS</span><strong>{stats?.collection_count ?? '—'}</strong><small>Organizing your sources</small></div></section>
        <div className="analytics-grid"><section className="panel analytics-panel"><div className="panel-heading"><div><span className="section-kicker">LAST SEVEN DAYS</span><h2>Questions asked</h2></div></div>{stats?.activity?.some((day) => day.count > 0) ? <div className="analytics-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.activity} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="analyticsQuestions" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#42a99e" stopOpacity={0.23} /><stop offset="95%" stopColor="#42a99e" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#d8e4df" strokeDasharray="3 5" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#60797b', fontSize: 10 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#60797b', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#fbfdfb', border: '1px solid #d2e0da', borderRadius: 8, color: '#29484e', fontSize: 11 }} /><Area type="monotone" dataKey="count" stroke="#348d83" strokeWidth={2} fill="url(#analyticsQuestions)" /></AreaChart></ResponsiveContainer></div> : <div className="analytics-empty"><Activity size={18} /><span>Question activity will appear here as you use your library.</span></div>}</section>
            <section className="panel analytics-panel"><div className="panel-heading"><div><span className="section-kicker">YOUR SOURCE FILES</span><h2>Documents by type</h2></div></div>{types.length ? <div className="analytics-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={types} margin={{ top: 15, right: 10, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="#d8e4df" strokeDasharray="3 5" /><XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fill: '#60797b', fontSize: 10 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#60797b', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#fbfdfb', border: '1px solid #d2e0da', borderRadius: 8, color: '#29484e', fontSize: 11 }} /><Bar dataKey="count" fill="#5a9acb" radius={[3, 3, 0, 0]} maxBarSize={42} /></BarChart></ResponsiveContainer></div> : <div className="analytics-empty"><FileStack size={18} /><span>Upload documents to see the formats in your library.</span></div>}</section></div>
    </div>
}
