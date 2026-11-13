import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'

const WELL_BEING_OPTIONS = ['great', 'good', 'okay', 'struggling', 'burned out']
const WELL_BEING_COLORS: Record<string, string> = {
  great: 'bg-green-100 text-green-800', good: 'bg-blue-100 text-blue-800',
  okay: 'bg-yellow-100 text-yellow-800', struggling: 'bg-orange-100 text-orange-800', 'burned out': 'bg-red-100 text-red-800'
}

export default function Profile() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [allUsers, setAllUsers] = useState<any[]>([])

  const targetId = id === 'me' ? user?.id : id
  const canEdit = user?.id === targetId || isAdmin

  useEffect(() => {
    if (!targetId) return
    api.get(`/users/${targetId}`).then(r => { setProfile(r.data); setForm(r.data) }).catch(() => navigate('/people'))
    if (isAdmin) api.get('/users').then(r => setAllUsers(r.data)).catch(() => {})
  }, [targetId])

  const save = async () => {
    setSaving(true); setError('')
    try {
      const { data } = await api.put(`/users/${targetId}`, {
        full_name: form.full_name, job_title: form.job_title, department: form.department,
        bio: form.bio, passion: form.passion, well_being_status: form.well_being_status,
        avatar_url: form.avatar_url,
        reports_to: form.reports_to || null,
        skills: parseList(form._skills_raw ?? form.skills),
        certifications: parseListObj(form._cert_raw ?? form.certifications),
        projects: parseListObj(form._proj_raw ?? form.projects),
        unavailability: parseListObj(form._unavail_raw ?? form.unavailability),
        ...(isAdmin && form.role !== profile.role ? { role: form.role } : {})
      })
      setProfile(data); setEditing(false)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  if (!profile) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-24" />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="ring-4 ring-white rounded-full"><Avatar name={profile.full_name || profile.email} src={profile.avatar_url} size={80} /></div>
            <div className="flex-1 pt-10">
              <h1 className="text-xl font-semibold text-gray-900">{profile.full_name || profile.email}</h1>
              <p className="text-gray-500 text-sm">{profile.job_title}{profile.department ? ` · ${profile.department}` : ''}</p>
            </div>
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="mt-10 px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Edit</button>
            )}
            {profile.well_being_status && (
              <span className={`mt-10 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${WELL_BEING_COLORS[profile.well_being_status] || 'bg-gray-100 text-gray-700'}`}>
                {profile.well_being_status}
              </span>
            )}
          </div>

          {!editing ? (
            <ViewMode profile={profile} isAdmin={isAdmin} />
          ) : (
            <EditMode form={form} setForm={setForm} isAdmin={isAdmin} profile={profile} onSave={save} onCancel={() => { setEditing(false); setError('') }} saving={saving} error={error} allUsers={allUsers} targetId={targetId} />
          )}
        </div>
      </div>
    </div>
  )
}

function ViewMode({ profile, isAdmin }: any) {
  const chips = (arr: any[]) => arr?.length > 0 ? (
    <div className="flex flex-wrap gap-2 mt-1">
      {arr.map((item: any, i: number) => (
        <span key={i} className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-xs">{typeof item === 'string' ? item : item.name || JSON.stringify(item)}</span>
      ))}
    </div>
  ) : <p className="text-gray-400 text-sm mt-1">None listed</p>

  return (
    <div className="space-y-5">
      {profile.bio && <div><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">About</h3><p className="text-gray-700 text-sm leading-relaxed">{profile.bio}</p></div>}
      {profile.passion && <div><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Passion</h3><p className="text-gray-700 text-sm">{profile.passion}</p></div>}
      <div><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Skills</h3>{chips(profile.skills)}</div>
      <div><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Certifications</h3>{chips(profile.certifications)}</div>
      <div><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Projects</h3>{chips(profile.projects)}</div>
      {profile.unavailability?.length > 0 && <div><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Unavailability</h3>{chips(profile.unavailability)}</div>}
      {isAdmin && <div className="pt-2 border-t border-gray-100"><p className="text-xs text-gray-400">Role: <span className="font-medium capitalize">{profile.role}</span> · Email: {profile.email}</p></div>}
    </div>
  )
}

function EditMode({ form, setForm, isAdmin, profile, onSave, onCancel, saving, error, allUsers, targetId }: any) {
  const f = (key: string, value: string) => setForm((p: any) => ({ ...p, [key]: value }))
  const initRaw = (key: string, data: any[]) => {
    if (!data) return ''
    return data.map((item: any) => typeof item === 'string' ? item : item.name || '').join('\n')
  }
  if (form._skills_raw === undefined) {
    setForm((p: any) => ({
      ...p,
      _skills_raw: initRaw('skills', p.skills),
      _cert_raw: initRaw('certifications', p.certifications),
      _proj_raw: initRaw('projects', p.projects),
      _unavail_raw: initRaw('unavailability', p.unavailability),
    }))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full name" value={form.full_name || ''} onChange={v => f('full_name', v)} />
        <Field label="Job title" value={form.job_title || ''} onChange={v => f('job_title', v)} />
        <Field label="Department" value={form.department || ''} onChange={v => f('department', v)} />
        <Field label="Avatar URL" value={form.avatar_url || ''} onChange={v => f('avatar_url', v)} placeholder="https://..." />
      </div>
      <Field label="Bio" value={form.bio || ''} onChange={v => f('bio', v)} textarea />
      <Field label="Passion" value={form.passion || ''} onChange={v => f('passion', v)} />
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Well-being</label>
        <select value={form.well_being_status || 'good'} onChange={e => f('well_being_status', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full">
          {['great','good','okay','struggling','burned out'].map(v => <option key={v} value={v} className="capitalize">{v}</option>)}
        </select>
      </div>
      <Field label="Skills (one per line)" value={form._skills_raw ?? ''} onChange={v => f('_skills_raw', v)} textarea placeholder="React&#10;TypeScript&#10;Project Management" />
      <Field label="Certifications (one per line)" value={form._cert_raw ?? ''} onChange={v => f('_cert_raw', v)} textarea placeholder="PMP&#10;AWS Solutions Architect" />
      <Field label="Projects (one per line)" value={form._proj_raw ?? ''} onChange={v => f('_proj_raw', v)} textarea placeholder="Digital Transformation&#10;CRM Implementation" />
      <Field label="Unavailability (one per line)" value={form._unavail_raw ?? ''} onChange={v => f('_unavail_raw', v)} textarea placeholder="Dec 24–31&#10;Jan 15" />
      {isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Role</label>
            <select value={form.role || 'member'} onChange={e => f('role', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="member">Member</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reports to</label>
            <select value={form.reports_to || ''} onChange={e => f('reports_to', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">— No manager —</option>
              {allUsers.filter((u: any) => u.id !== targetId).map((u: any) => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button onClick={onSave} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, textarea, placeholder }: any) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      )}
    </div>
  )
}

function parseList(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map(i => typeof i === 'string' ? i : i.name || '').filter(Boolean)
  if (typeof raw === 'string') return raw.split('\n').map(s => s.trim()).filter(Boolean)
  return []
}

function parseListObj(raw: any): any[] {
  return parseList(raw)
}
