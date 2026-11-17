import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, FileText, FileUp, Plus, Search, Trash2, UploadCloud } from 'lucide-react'
import Notice from '../components/Notice'
import { researchApi } from '../services/research'
import '../ingestion.css'

const accepted = '.pdf,.docx,.txt'
const pipeline = [
    { id: 'uploading', label: 'Uploading' },
    { id: 'extracting_text', label: 'Extracting text' },
    { id: 'chunking', label: 'Chunking' },
    { id: 'generating_embeddings', label: 'Generating embeddings' },
    { id: 'indexing', label: 'Indexing' },
    { id: 'ready', label: 'Ready' },
]
const statusText = { ready: 'Indexed', processing: 'Processing', error: 'Failed', failed: 'Failed' }
const readableSize = (bytes) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
const fileType = (name) => name.split('.').pop()?.toUpperCase() || 'FILE'
const stagePosition = (stage) => pipeline.findIndex((item) => item.id === stage)

export default function LibraryPage() {
    const inputRef = useRef(null)
    const location = useLocation()
    const [documents, setDocuments] = useState([])
    const [collections, setCollections] = useState([])
    const [uploads, setUploads] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const [error, setError] = useState('')
    const [search, setSearch] = useState(location.state?.search || '')
    const [statusFilter, setStatusFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')

    const refresh = useCallback(() => Promise.all([researchApi.documents(), researchApi.collections()])
        .then(([nextDocuments, nextCollections]) => { setDocuments(nextDocuments); setCollections(nextCollections) })
        .catch(() => setError('Could not load your documents. Check that the ResearchVault API is running.'))
        .finally(() => setLoading(false)), [])
    useEffect(() => { refresh() }, [refresh])
    useEffect(() => { if (location.state?.search) setSearch(location.state.search) }, [location.state?.search])

    function updateUpload(uploadId, changes) {
        setUploads((current) => current.map((upload) => upload.id === uploadId ? { ...upload, ...changes } : upload))
    }

    async function uploadFiles(fileList) {
        const files = Array.from(fileList || [])
        if (!files.length) return
        setError('')
        setUploading(true)
        for (const file of files) {
            const uploadId = `${Date.now()}-${Math.random()}`
            if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
                setError(`${file.name}: choose a PDF, DOCX, or TXT file.`)
                continue
            }
            if (file.size > 25 * 1024 * 1024) {
                setError(`${file.name}: files must be 25 MB or smaller.`)
                continue
            }

            const uploadStartedAt = Date.now()
            setUploads((current) => [{ id: uploadId, name: file.name, size: file.size, type: fileType(file.name), progress: 0, stage: 'uploading', status: 'processing', error: '' }, ...current])
            let polling = false
            const poller = window.setInterval(async () => {
                if (polling) return
                polling = true
                try {
                    const currentDocuments = await researchApi.documents()
                    setDocuments(currentDocuments)
                    const processingDocument = currentDocuments
                        .filter((document) => document.file_size === file.size && document.status === 'processing' && new Date(document.created_at).getTime() >= uploadStartedAt - 1000)
                        .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0]
                    if (processingDocument) {
                        updateUpload(uploadId, { stage: processingDocument.processing_stage || 'extracting_text', documentId: processingDocument.id, progress: 100 })
                    }
                } catch {
                    return
                } finally {
                    polling = false
                }
            }, 650)

            try {
                const document = await researchApi.upload(file, (event) => {
                    if (!event.total) return
                    const progress = Math.min(100, Math.round(event.loaded / event.total * 100))
                    updateUpload(uploadId, { progress, stage: progress < 100 ? 'uploading' : 'extracting_text' })
                })
                updateUpload(uploadId, { documentId: document.id, stage: 'ready', status: 'ready', progress: 100 })
                await refresh()
            } catch (err) {
                const message = err.response?.data?.error || `Could not process ${file.name}. Check the API and document-processing dependencies.`
                setError(message)
                updateUpload(uploadId, { stage: 'failed', status: 'failed', error: message })
                await refresh()
            } finally {
                window.clearInterval(poller)
            }
        }
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
    }

    async function removeDocument(document) {
        if (!window.confirm(`Remove “${document.filename}” and its indexed passages?`)) return
        try { await researchApi.removeDocument(document.id); setDocuments((current) => current.filter((item) => item.id !== document.id)) }
        catch (err) { setError(err.response?.data?.error || 'Could not remove this document.') }
    }

    async function changeCollection(document, value) {
        const collectionId = value ? Number(value) : null
        try {
            const updated = await researchApi.assignCollection(document.id, collectionId)
            setDocuments((current) => current.map((item) => item.id === updated.id ? updated : item))
            setError('')
        } catch (err) {
            setError(err.response?.data?.error || 'Could not update this document’s collection.')
        }
    }

    function handleDrop(event) {
        event.preventDefault()
        setDragActive(false)
        uploadFiles(event.dataTransfer.files)
    }

    const filtered = documents.filter((document) => {
        const matchesSearch = document.filename.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || document.status === statusFilter
        const matchesType = typeFilter === 'all' || document.file_type?.toLowerCase() === typeFilter
        return matchesSearch && matchesStatus && matchesType
    })

    return <div className="page-enter library-page">
        <div className="page-heading"><div><span className="section-kicker">YOUR SOURCE MATERIAL</span><h1>My <span>documents.</span></h1><p>Manage the source files indexed for your questions.</p></div><button className="button button-primary" onClick={() => inputRef.current?.click()} disabled={uploading}><Plus size={16} />{uploading ? 'Processing…' : 'Add documents'}</button></div>
        {error && <Notice>{error}</Notice>}
        <input ref={inputRef} className="visually-hidden" type="file" accept={accepted} multiple onChange={(event) => uploadFiles(event.target.files)} />
        <div className={`upload-dropzone${dragActive ? ' is-dragging' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDragActive(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false) }} onDrop={handleDrop}>
            <span className="upload-drop-icon"><UploadCloud size={18} /></span><span className="upload-drop-copy"><strong>Drop documents here or <button type="button" onClick={() => inputRef.current?.click()}>browse files</button></strong><small>PDF, DOCX, or TXT · Up to 25 MB per file</small></span><button className="button button-quiet" onClick={() => inputRef.current?.click()} disabled={uploading}><FileUp size={15} />Choose files</button>
        </div>
        {!!uploads.length && <section className="upload-job-list" aria-label="Upload progress">{uploads.map((upload) => {
            const currentStep = stagePosition(upload.stage)
            return <article className={`upload-job${upload.status === 'failed' ? ' upload-job-failed' : ''}`} key={upload.id}>
                <div className="upload-job-head"><span className="recent-file-icon"><FileText size={16} /></span><span className="upload-job-file"><strong>{upload.name}</strong><small>{upload.type} · {readableSize(upload.size)}</small></span><span className="upload-job-state">{upload.status === 'ready' ? <><Check size={13} />Ready</> : upload.status === 'failed' ? 'Failed' : <><span className="spinner" />{pipeline[Math.max(0, currentStep)]?.label || 'Processing'}</>}</span></div>
                <div className="upload-transfer-row"><span>Upload progress</span><progress value={upload.progress} max="100" /><span>{upload.progress}%</span></div>
                <div className="upload-pipeline-steps">{pipeline.map((step, index) => <span className={`upload-pipeline-step${index < currentStep || upload.status === 'ready' ? ' is-complete' : ''}${index === currentStep && upload.status !== 'ready' ? ' is-current' : ''}`} key={step.id}><i>{index < currentStep || upload.status === 'ready' ? <Check size={8} /> : index + 1}</i>{step.label}</span>)}</div>
                {upload.error && <p className="upload-job-error">{upload.error}</p>}
            </article>
        })}</section>}
        {!documents.length && !loading ? <div className="upload-empty panel"><div className="upload-empty-art"><div className="upload-ring upload-ring-one" /><div className="upload-ring upload-ring-two" /><span><UploadCloud size={27} /></span><i className="upload-file-dot dot-pdf">PDF</i><i className="upload-file-dot dot-doc">DOC</i><i className="upload-file-dot dot-txt">TXT</i></div><span className="section-kicker">YOUR FIRST SOURCE</span><h2>Give your questions<br />somewhere to begin.</h2><p>Add a paper, report, or set of notes. Supported formats: PDF, DOCX, and TXT.</p><button className="button button-primary" onClick={() => inputRef.current?.click()} disabled={uploading}><FileUp size={16} />Choose documents</button><span className="upload-limit">Up to 25 MB per document</span></div> : <section className="panel library-panel">
            <div className="library-tools"><div><span className="section-kicker">SOURCE COLLECTION</span><h2>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</h2></div><div className="library-filter-tools"><label className="library-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a document" aria-label="Find a document" /></label><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by file type"><option value="all">All types</option><option value="pdf">PDF</option><option value="docx">DOCX</option><option value="txt">TXT</option></select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option><option value="ready">Indexed</option><option value="processing">Processing</option><option value="error">Failed</option></select></div></div>
            <div className="document-table-wrap"><table className="document-table"><thead><tr><th>DOCUMENT</th><th>TYPE</th><th>UPLOADED</th><th>CHUNKS</th><th>STATUS</th><th>COLLECTION</th><th><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{loading ? <tr><td colSpan="7" className="table-message">Loading your documents…</td></tr> : filtered.map((document) => <tr key={document.id}><td><div className="document-cell"><span className="document-file-icon"><FileText size={18} /></span><div><strong>{document.filename}</strong><small>{readableSize(document.file_size || 0)}</small></div></div></td><td>{document.file_type?.toUpperCase()}</td><td>{document.created_at ? new Date(document.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td><td>{document.chunk_count ?? '—'}</td><td><span className={`document-status document-status-${document.status}`}><i />{statusText[document.status] || document.status}</span></td><td><select className="collection-select" aria-label={`Collection for ${document.filename}`} value={document.collection_id || ''} onChange={(event) => changeCollection(document, event.target.value)}><option value="">Unsorted</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></td><td><button className="row-action" aria-label={`Remove ${document.filename}`} onClick={() => removeDocument(document)}><Trash2 size={16} /></button></td></tr>)}{!loading && !filtered.length && <tr><td colSpan="7" className="table-message">No documents match the current filters.</td></tr>}</tbody></table></div>
            <div className="library-table-footer"><span><span className="footer-dot" />Private to your account</span><span>{filtered.length} shown</span></div>
        </section>}
        {documents.length > 0 && <div className="upload-hint"><span>New documents are chunked and indexed for retrieval after upload completes.</span></div>}
    </div>
}
