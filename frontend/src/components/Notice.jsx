import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react'

export default function Notice({ tone = 'error', children }) {
    const Icon = tone === 'success' ? CheckCircle2 : tone === 'loading' ? LoaderCircle : AlertCircle
    return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon size={16} />{children}</div>
}
