import { useEffect, useRef, useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

type Resource = { id: string; title: string; description: string; file_name: string; file_type: string; tags: string[]; uploader_name?: string; created_at: string; created_by: string }

const FILE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'text/html': '🌐',
  'application/vnd.ms-powerpoint': '📊',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📊',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
}

export default function Library() {
  const { user, isAdmin } = useAuth()
  const [resources, setResources] = useState<Resource[]>([])
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', tags: '' })
  const [fileData, setFileData] = useState<{ name: string; content: string; type: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = (query?: string) => {
    api.get('/resources', { params: query ? { q: query } : {} }).then(r => setResources(r.data)).catch(() => {})
  }

  useEffect(() => { load() }, [])
  useEffect(() => { const t = setTimeout(() => load(q), 300); return () => clearTimeout(t) }, [q])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = ev => setFileData({ name: f.name, content: btoa(ev.target?.result as string), type: f.type })
    reader.readAsBinaryString(f)
  }

  const upload = async () => {
    if (!form.title || !fileData) return
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    try {
      const r = await api.post('/resources', { ...form, tags, file_name: fileData.name, file_content: fileData.content, file_type: fileData.type })
      setResources(prev => [r.data, ...prev])
      setShowForm(false); setForm({ title: '', description: '', tags: '' }); setFileData(null)
    } catch (e: any) {
      alert(e.response?.data?.error || 'Upload failed')
    }
  }

  const download = async (res: Resource) => {
    try {
      const r = await api.get(`/resources/${res.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a'); a.href = url; a.download = res.file_name; a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  const remove = async (id: string) => {
    if (!window.confirm('Remove this resource?')) return
    await api.delete(`/resources/${id}`)
    setResources(r => r.filter(x => x.id !== id))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resource Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">Playbooks, pitch decks, battlecards and templates</p>
        </div>
        <div className="flex items-center gap-3">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search resources…" className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-60 bg-gray-50" />
          {isAdmin && <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">↑ Upload</button>}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map(res => (
          <div key={res.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="text-3xl">{FILE_ICONS[res.file_type] || '📁'}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{res.title}</p>
                <p className="text-xs text-gray-400 truncate">{res.file_name}</p>
              </div>
            </div>
            {res.description && <p className="text-xs text-gray-500 leading-relaxed">{res.description}</p>}
            {res.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {res.tags.map(t => <span key={t} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">{t}</span>)}
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
              <span className="text-xs text-gray-400">{res.uploader_name || 'Admin'}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => download(res)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">↓ Download</button>
                {isAdmin && <button onClick={() => remove(res.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>}
              </div>
            </div>
          </div>
        ))}
        {resources.length === 0 && (
          <div className="col-span-3 text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">📚</div>
            <p className="font-medium">No resources yet</p>
            {isAdmin && <p className="text-sm mt-1">Upload the first resource for the team</p>}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Upload Resource</h2>
            <div className="space-y-3">
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Title *" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
              <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Description" rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({...f, tags: e.target.value}))} />
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors" onClick={() => fileRef.current?.click()}>
                {fileData ? <p className="text-sm font-medium text-blue-600">{fileData.name}</p> : <p className="text-sm text-gray-400">Click to select file (max 500 KB)</p>}
                <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={upload} disabled={!form.title || !fileData} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40">Upload</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
