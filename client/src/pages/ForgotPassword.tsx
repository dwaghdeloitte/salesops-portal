import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

type Step = 'email' | 'reset'

function checkPassword(pwd: string) {
  const checks = [
    { label: 'At least 8 characters', pass: pwd.length >= 8 },
    { label: 'Uppercase letter (A–Z)', pass: /[A-Z]/.test(pwd) },
    { label: 'Lowercase letter (a–z)', pass: /[a-z]/.test(pwd) },
    { label: 'Number (0–9)', pass: /[0-9]/.test(pwd) },
    { label: 'Special character (!@#$…)', pass: /[^A-Za-z0-9]/.test(pwd) },
  ]
  const score = checks.filter(c => c.pass).length
  const colors = ['bg-gray-200', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500']
  const labels = ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']
  return { score, color: colors[score], label: labels[score], checks }
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const strength = checkPassword(password)

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
      setStep('reset')
      setInfo(data.previewUrl
        ? `Code sent! In dev mode view it at: ${data.previewUrl}`
        : 'If that email exists in our system, a reset token has been sent.')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email')
    } finally { setLoading(false) }
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (strength.score < 5) { setError('Password must meet all strength requirements'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token: token.trim(), password })
      navigate('/login', { state: { message: 'Password reset successfully. Please sign in.' } })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired token')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl items-center justify-center font-bold text-white text-xl shadow mb-4" style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}>S</div>
          <h1 className="text-xl font-bold text-gray-900">Reset your password</h1>
          <p className="text-sm text-gray-500 mt-1">SalesOps by Deloitte</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-7">
          {step === 'email' ? (
            <form onSubmit={requestReset} className="space-y-5">
              <div>
                <p className="text-gray-700 text-sm mb-4">Enter your Deloitte email address and we'll send you a reset token.</p>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email</label>
                <input type="text" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@deloitte.com or login ID"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
              </div>
              {error && <p className="text-red-600 text-xs bg-red-50 rounded-xl px-4 py-3 border border-red-100">⚠ {error}</p>}
              <button type="submit" disabled={loading}
                className="w-full text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-all shadow-sm"
                style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}>
                {loading ? 'Sending…' : 'Send reset token →'}
              </button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="space-y-5">
              {info && <p className="text-blue-700 text-xs bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">📧 {info}</p>}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Reset token</label>
                <input type="text" required value={token} onChange={e => setToken(e.target.value)} placeholder="Paste token from email"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">New password</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Choose a strong password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 pr-14" />
                  <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-4 top-3 text-xs font-semibold text-blue-500">{showPwd ? 'Hide' : 'Show'}</button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2.5">
                    <div className="flex gap-1 mb-1.5">
                      {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-gray-100'}`} />)}
                    </div>
                    {strength.label && <p className={`text-xs font-semibold mb-1.5 ${strength.score <= 2 ? 'text-red-500' : strength.score <= 3 ? 'text-amber-500' : strength.score === 4 ? 'text-blue-500' : 'text-green-500'}`}>{strength.label}</p>}
                    <div className="space-y-0.5">
                      {strength.checks.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className={`text-xs ${c.pass ? 'text-green-500' : 'text-gray-300'}`}>{c.pass ? '✓' : '○'}</span>
                          <span className={`text-xs ${c.pass ? 'text-green-700' : 'text-gray-400'}`}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Confirm password</label>
                <input type={showPwd ? 'text' : 'password'} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 ${confirm && confirm !== password ? 'border-red-300' : 'border-gray-200'}`} />
                {confirm && confirm !== password && <p className="text-xs text-red-500 mt-1">Passwords don't match</p>}
              </div>
              {error && <p className="text-red-600 text-xs bg-red-50 rounded-xl px-4 py-3 border border-red-100">⚠ {error}</p>}
              <button type="submit" disabled={loading || strength.score < 5 || password !== confirm}
                className="w-full text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}>
                {loading ? 'Resetting…' : 'Reset password →'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-5">
          <Link to="/login" className="text-sm text-blue-500 hover:text-blue-700 font-medium">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
