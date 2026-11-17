import { api } from './api'

export const researchApi = {
    documents: () => api.get('/documents').then(({ data }) => data.documents),
    upload: (file, onUploadProgress) => {
        const form = new FormData()
        form.append('file', file)
        return api.post('/documents', form, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress }).then(({ data }) => data.document)
    },
    removeDocument: (id) => api.delete(`/documents/${id}`),
    ask: (question, documentIds) => api.post('/queries', { question, document_ids: documentIds }).then(({ data }) => data),
    history: () => api.get('/queries').then(({ data }) => data.queries),
    stats: () => api.get('/stats').then(({ data }) => data),
    collections: () => api.get('/collections').then(({ data }) => data.collections),
    createCollection: (details) => api.post('/collections', details).then(({ data }) => data.collection),
    removeCollection: (id) => api.delete(`/collections/${id}`),
    assignCollection: (documentId, collectionId) => api.patch(`/documents/${documentId}`, { collection_id: collectionId }).then(({ data }) => data.document),
}
