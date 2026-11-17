import { useCallback, useEffect, useState } from 'react'
import { BookOpen, FileStack, FolderPlus, Plus, Trash2 } from 'lucide-react'
import Notice from '../components/Notice'
import { researchApi } from '../services/research'

export default function CollectionsPage() {
    const [collections, setCollections] = useState([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')

    const refresh = useCallback(() => researchApi.collections().then(setCollections).catch(() => setError('Could not load collections. Check that the ResearchVault API is running.')).finally(() => setLoading(false)), [])
    useEffect(() => { refresh() }, [refresh])

    async function createCollection(event) {
        event.preventDefault()
        const form = event.currentTarget
        const values = Object.fromEntries(new FormData(form).entries())
        setCreating(true)
        setError('')
        try {
            const collection = await researchApi.createCollection(values)
            setCollections((current) => [collection, ...current])
            form.reset()
        } catch (err) {
            setError(err.response?.data?.error || 'Could not create this collection.')
        } finally {
            setCreating(false)
        }
    }

    async function removeCollection(collection) {
        if (!window.confirm(`Remove “${collection.name}”? Its documents will stay in your library.`)) return
        try {
            await researchApi.removeCollection(collection.id)
            setCollections((current) => current.filter((item) => item.id !== collection.id))
        } catch (err) {
            setError(err.response?.data?.error || 'Could not remove this collection.')
        }
    }

    return <div className="collections-page page-enter">
        <div className="page-heading"><div><span className="section-kicker">ORGANIZE YOUR SOURCES</span><h1>Collections.</h1><p>Group documents around a question, project, or area of study.</p></div></div>
        {error && <Notice>{error}</Notice>}
        <section className="collection-create-panel panel"><div className="collection-create-copy"><span className="collection-create-icon"><FolderPlus size={19} /></span><div><span className="section-kicker">A PLACE FOR RELATED SOURCES</span><h2>Create a collection</h2><p>Add documents to a collection from your library.</p></div></div><form className="collection-create-form" onSubmit={createCollection}><label><span className="visually-hidden">Collection name</span><input name="name" maxLength="120" placeholder="For example, Literature review" required /></label><label><span className="visually-hidden">Description (optional)</span><input name="description" maxLength="500" placeholder="Description (optional)" /></label><button className="button button-primary" disabled={creating}><Plus size={15} />{creating ? 'Creating…' : 'Create'}</button></form></section>
        {loading ? <div className="panel collection-empty"><span className="spinner" />Loading collections…</div> : collections.length ? <section className="collection-grid" aria-label="Your collections">{collections.map((collection) => <article className="collection-card panel" key={collection.id}><div className="collection-card-top"><span className="collection-card-icon"><BookOpen size={18} /></span><button className="row-action" aria-label={`Remove ${collection.name}`} onClick={() => removeCollection(collection)}><Trash2 size={16} /></button></div><h2>{collection.name}</h2><p>{collection.description || 'A collection for related research and sources.'}</p><div className="collection-card-foot"><span><FileStack size={14} />{collection.document_count} {collection.document_count === 1 ? 'document' : 'documents'}</span><span>{collection.created_at ? new Date(collection.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span></div></article>)}</section> : <div className="panel collection-empty"><span className="empty-symbol"><FolderPlus size={21} /></span><span className="section-kicker">YOUR COLLECTIONS</span><h2>Make room for a line of inquiry.</h2><p>Create a collection, then add related documents to it from your library.</p></div>}
    </div>
}
