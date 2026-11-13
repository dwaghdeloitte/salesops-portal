import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

interface Check { label: string; pass: boolean }

function checkPassword(pwd: string): { score: number; label: string; color: string; checks: Check[] } {
  const checks: Check[] = [
    { label: 'At least 8 characters', pass: pwd.length >= 8 },
    { label: 'Uppercase letter (A–Z)', pass: /[A-Z]/.test(pwd) },
    { label: 'Lowercase letter (a–z)', pass: /[a-z]/.test(pwd) },
    { label: 'Number (0–9)', pass: /[0-9]/.test(pwd) },
    { label: 'Special character (!@#$…)', pass: /[^A-Za-z0-9]/.test(pwd) },
  ]
  const score = checks.filter(c => c.pass).length
  const levels = ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']
  const colors = ['bg-gray-200', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500']
  return { score, label: levels[score], color: colors[score], checks }
}

export default function ChangePassword() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ current: '', newPwd: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const strength = checkPassword(form.newPwd)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (strength.score < 5) { setError('New password must meet all strength requirements'); return }
    if (form.newPwd !== form.confirm) { setError('New passwords do not match'); return }
    setLoading(true)
    try {
      await api.post('/auth/change-password', { currentPassword: form.current, newPassword: form.newPwd })
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password')
    } finally { setLoading(false) }
  }

  if (success) return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Password changed</h2>
      <p className="text-gray-500">Use your new password next time you log in. Redirecting…</p>
    </div>
  )

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-900 mb-3">← Back</button>
        <h1 className="text-2xl font-semibold text-gray-900">Change password</h1>
        <p className="text-gray-500 text-sm mt-1">Your new password will be required at next login.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Current password</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} required value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
                placeholder="Enter current password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10" />
              <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs">{showPwd ? 'Hide' : 'Show'}</button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">New password</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} required value={form.newPwd} onChange={e => setForm(f => ({ ...f, newPwd: e.target.value }))}
                placeholder="Choose a strong password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10" />
            </div>
            {form.newPwd.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1.5">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-gray-200'}`} />
                  ))}
                </div>
                {strength.label && <p className={`text-xs font-medium mb-1.5 ${strength.score <= 2 ? 'text-red-600' : strength.score <= 3 ? 'text-yellow-600' : strength.score === 4 ? 'text-blue-600' : 'text-green-600'}`}>{strength.label}</p>}
                <div className="space-y-0.5">
                  {strength.checks.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className={`text-xs ${c.pass ? 'text-green-500' : 'text-gray-400'}`}>{c.pass ? '✓' : '○'}</span>
                      <span className={`text-xs ${c.pass ? 'text-green-700' : 'text-gray-500'}`}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Confirm new password</label>
            <input type={showPwd ? 'text' : 'password'} required value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Repeat new password"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.confirm && form.confirm !== form.newPwd ? 'border-red-400' : 'border-gray-300'}`} />
            {form.confirm && form.confirm !== form.newPwd && <p className="text-xs text-red-500 mt-1">Passwords don't match</p>}
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading || strength.score < 5 || form.newPwd !== form.confirm}
            className="w-full bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors">
            {loading ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>
    </div>
  )
}
