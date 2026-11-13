import { useEffect, useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import { format } from 'date-fns'

const EMOJIS = ['👏', '🔥', '❤️', '🙌', '⭐', '💪']

type Post = { id: string; to_name?: string; to_avatar?: string; from_name?: string; from_avatar?: string; from_user_id: string; message: string; tags: string[]; created_at: string; reactions?: { emoji: string; count: number; reacted: boolean }[] }

export default function Appreciation() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [people, setPeople] = useState<any[]>([])
  const [form, setForm] = useState({ to_user_id: '', message: '', tags: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const load = async (p: number) => {
    setLoading(true)
    try {
      const r = await api.get('/appreciations', { params: { page: p, limit: 10 } })
      const data = r.data
      if (data.data) {
        setPosts(data.data)
        setTotalPages(data.pages || 1)
      } else {
        setPosts(Array.isArray(data) ? data : [])
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load(1)
    api.get('/users').then(r => setPeople(r.data)).catch(() => {})
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.to_user_id || !form.message) { setError('Please select a person and add a message'); return }
    setSubmitting(true); setError('')
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      const { data } = await api.post('/appreciations', { to_user_id: form.to_user_id, message: form.message, tags })
      const toProfile = people.find(p => p.id === form.to_user_id)
      const fromProfile = people.find(p => p.id === user?.id)
      setPosts(prev => [{
        ...data,
        from_name: user?.fullName, from_avatar: fromProfile?.avatar_url,
        to_name: toProfile?.full_name, to_avatar: toProfile?.avatar_url, from_user_id: user?.id || '',
        reactions: []
      }, ...prev])
      setForm({ to_user_id: '', message: '', tags: '' })
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to post')
    } finally { setSubmitting(false) }
  }

  const deletePost = async (id: string) => {
    try { await api.delete(`/appreciations/${id}`); setPosts(prev => prev.filter(p => p.id !== id)) } catch {}
  }

  const react = async (postId: string, emoji: string) => {
    try {
      const r = await api.post(`/appreciations/${postId}/react`, { emoji })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: r.data.reactions } : p))
    } catch {}
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Appreciation Wall</h1>

      {/* Post form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Appreciate a colleague</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">To</label>
            <select value={form.to_user_id} onChange={e => setForm(f => ({ ...f, to_user_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select a colleague…</option>
              {people.filter(p => p.id !== user?.id).map(p => (
                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Message</label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={3}
              placeholder="Share what they did that made a difference…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tags (comma-separated)</label>
            <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="Leadership, Teamwork, Innovation"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {submitting ? 'Posting…' : '🎉 Post appreciation'}
          </button>
        </form>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar name={post.to_name || ''} src={post.to_avatar} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{post.to_name}</p>
                  <p className="text-gray-700 text-sm mt-1 leading-relaxed">{post.message}</p>
                  {post.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.tags.map((t: string, i: number) => (
                        <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">#{t}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">from <span className="font-medium text-gray-600">{post.from_name}</span> · {format(new Date(post.created_at), 'MMM d, yyyy')}</p>

                  {/* Reactions */}
                  <div className="flex items-center gap-1 mt-3 flex-wrap">
                    {(post.reactions || []).filter(r => r.count > 0).map(r => (
                      <button key={r.emoji} onClick={() => react(post.id, r.emoji)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${r.reacted ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                        {r.emoji} {r.count}
                      </button>
                    ))}
                    <div className="relative group">
                      <button className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100">+</button>
                      <div className="absolute left-0 top-7 bg-white border border-gray-200 rounded-xl shadow-lg p-2 hidden group-hover:flex gap-1 z-10">
                        {EMOJIS.map(e => (
                          <button key={e} onClick={() => react(post.id, e)} className="text-lg hover:scale-125 transition-transform p-0.5">{e}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {(post.from_user_id === user?.id || user?.role === 'admin') && (
                  <button onClick={() => deletePost(post.id)} className="text-gray-300 hover:text-red-500 text-xs mt-0.5">×</button>
                )}
              </div>
            </div>
          ))}
          {posts.length === 0 && <p className="text-gray-400 text-center py-8">No appreciations yet. Be the first!</p>}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button disabled={page <= 1} onClick={() => { setPage(p => p-1); load(page-1) }} className="px-3 py-1 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-30">← Prev</button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => { setPage(p => p+1); load(page+1) }} className="px-3 py-1 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-30">Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
