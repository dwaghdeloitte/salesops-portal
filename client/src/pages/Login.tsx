import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'

type Mode = 'login' | 'register-email' | 'register-otp'

interface PasswordStrength {
  score: number
  label: string
  color: string
  checks: { label: string; pass: boolean }[]
}

function checkPassword(pwd: string): PasswordStrength {
  const checks = [
    { label: 'At least 8 characters', pass: pwd.length >= 8 },
    { label: 'Uppercase letter (A–Z)', pass: /[A-Z]/.test(pwd) },
    { label: 'Lowercase letter (a–z)', pass: /[a-z]/.test(pwd) },
    { label: 'Number (0–9)', pass: /[0-9]/.test(pwd) },
    { label: 'Special character (!@#$…)', pass: /[^A-Za-z0-9]/.test(pwd) },
  ]
  const score = checks.filter(c => c.pass).length
  const levels: { label: string; color: string }[] = [
    { label: '', color: 'bg-gray-200' },
    { label: 'Very weak', color: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-400' },
    { label: 'Fair', color: 'bg-yellow-400' },
    { label: 'Strong', color: 'bg-blue-500' },
    { label: 'Very strong', color: 'bg-green-500' },
  ]
  return { score, ...levels[score], checks }
}

const KEYWORDS = ['Pipeline', 'Revenue', 'Quota', 'Forecast', 'Growth', 'Deals', 'Targets', 'Wins']

export default function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [otp, setOtp] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const strength = checkPassword(password)

  const resetForm = () => { setError(''); setInfo(''); setPassword(''); setConfirmPassword('') }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email: email.trim().toLowerCase(), password })
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err: any) { setError(err.response?.data?.error || 'Login failed') }
    finally { setLoading(false) }
  }

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/request-otp', { email: email.trim().toLowerCase() })
      setMode('register-otp')
      setInfo('A 4-digit code has been sent to your email.')
      if (data.previewUrl) setInfo(`Code sent! In dev mode, view it here: ${data.previewUrl}`)
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to send code') }
    finally { setLoading(false) }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    if (strength.score < 5) { setError('Please use a stronger password that meets all criteria'); setLoading(false); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return }
    try {
      const { data } = await api.post('/auth/register', { email: email.trim().toLowerCase(), otp: otp.trim(), fullName: fullName.trim(), password })
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err: any) { setError(err.response?.data?.error || 'Registration failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f2057 0%, #1a3a8f 45%, #0d5c8a 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
        <div className="absolute bottom-10 -right-16 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #38bdf8, transparent)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              S
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">SalesOps</div>
              <div className="text-blue-300 text-xs leading-tight">by Deloitte</div>
            </div>
          </div>

          <h1 className="text-white text-3xl font-bold leading-snug mb-4" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
            Your team's<br />
            <span style={{ color: '#93c5fd' }}>sales engine</span>,<br />
            all in one place.
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed mb-8">
            Track performance, celebrate wins, align on targets — the Deloitte SalesOps platform keeps every team member connected and informed.
          </p>

          {/* Keyword pills */}
          <div className="flex flex-wrap gap-2">
            {KEYWORDS.map(kw => (
              <span
                key={kw}
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#bfdbfe', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-2">
          <p className="text-blue-300 text-xs leading-relaxed">
            Deloitte SalesOps keeps every team member connected, informed, and aligned on what matters most.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 min-h-screen">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base shadow" style={{ background: 'linear-gradient(135deg, #1a3a8f, #0d5c8a)' }}>S</div>
          <div>
            <div className="font-bold text-gray-900 text-base leading-tight">SalesOps</div>
            <div className="text-gray-400 text-xs leading-tight">by Deloitte</div>
          </div>
        </div>

        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

            {/* Tab bar */}
            {mode !== 'register-otp' && (
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => { setMode('login'); resetForm() }}
                  className={`flex-1 py-3.5 text-sm font-semibold transition-all ${mode === 'login' ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Sign in
                </button>
                <button
                  onClick={() => { setMode('register-email'); resetForm() }}
                  className={`flex-1 py-3.5 text-sm font-semibold transition-all ${mode.startsWith('register') ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Register
                </button>
              </div>
            )}

            <div className="p-7">
              {/* ── LOGIN ── */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <p className="text-gray-900 font-bold text-lg mb-0.5">Welcome back</p>
                    <p className="text-gray-400 text-xs">Sign in with your Deloitte SalesOps account</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email or login ID</label>
                    <input
                      type="text" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="name@deloitte.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 placeholder-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 placeholder-gray-300 pr-14"
                      />
                      <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-4 top-3 text-xs font-semibold text-blue-500 hover:text-blue-700">{showPwd ? 'Hide' : 'Show'}</button>
                    </div>
                  </div>
                  {error && (
                    <div className="flex gap-2 items-start text-red-600 text-xs bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                      <span className="shrink-0 mt-0.5">⚠</span> {error}
                    </div>
                  )}
                  <button
                    type="submit" disabled={loading}
                    className="w-full text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-all shadow-sm mt-1"
                    style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}
                  >
                    {loading ? 'Signing in…' : 'Sign in →'}
                  </button>
                  <div className="text-center">
                    <Link to="/forgot-password" className="text-xs text-blue-500 hover:text-blue-700 font-medium">Forgot your password?</Link>
                  </div>
                </form>
              )}

              {/* ── REGISTER step 1: email ── */}
              {mode === 'register-email' && (
                <form onSubmit={handleRequestOTP} className="space-y-5">
                  <div>
                    <p className="text-gray-900 font-bold text-lg mb-0.5">Join SalesOps</p>
                    <p className="text-gray-400 text-xs">Use your Deloitte email to get started</p>
                  </div>
                  <div className="flex items-start gap-2 bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                    <span className="text-blue-500 shrink-0 mt-0.5 text-sm">🔒</span>
                    <p className="text-xs text-blue-700 font-medium">Only <strong>@deloitte.com</strong> email addresses are accepted. A 4-digit verification code will be sent to your inbox.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Deloitte email</label>
                    <input
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="name@deloitte.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 placeholder-gray-300"
                    />
                  </div>
                  {error && (
                    <div className="flex gap-2 items-start text-red-600 text-xs bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                      <span className="shrink-0 mt-0.5">⚠</span> {error}
                    </div>
                  )}
                  <button
                    type="submit" disabled={loading}
                    className="w-full text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-all shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}
                  >
                    {loading ? 'Sending code…' : 'Send verification code →'}
                  </button>
                </form>
              )}

              {/* ── REGISTER step 2: OTP + details ── */}
              {mode === 'register-otp' && (
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <button type="button" onClick={() => { setMode('register-email'); setOtp(''); setError('') }} className="text-gray-300 hover:text-gray-600 transition-colors text-lg leading-none">←</button>
                    <div>
                      <p className="text-gray-900 font-bold text-lg">Complete registration</p>
                      <p className="text-gray-400 text-xs">{email}</p>
                    </div>
                  </div>

                  {/* OTP */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Verification code</label>
                    <input
                      type="text" required maxLength={4} value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="· · · ·"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl font-mono text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    />
                    <button type="button" onClick={() => { setMode('register-email'); setOtp('') }} className="text-xs text-blue-500 hover:text-blue-700 font-medium mt-1.5">Resend code</button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Full name</label>
                    <input
                      type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 placeholder-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Create password</label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Choose a strong password"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 placeholder-gray-300 pr-14"
                      />
                      <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-4 top-3 text-xs font-semibold text-blue-500 hover:text-blue-700">{showPwd ? 'Hide' : 'Show'}</button>
                    </div>
                    {password.length > 0 && (
                      <div className="mt-2.5">
                        <div className="flex gap-1 mb-1.5">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-gray-100'}`} />
                          ))}
                        </div>
                        {strength.label && (
                          <p className={`text-xs font-semibold mb-1.5 ${strength.score <= 2 ? 'text-red-500' : strength.score <= 3 ? 'text-amber-500' : strength.score === 4 ? 'text-blue-500' : 'text-green-500'}`}>
                            {strength.label}
                          </p>
                        )}
                        <div className="grid grid-cols-1 gap-0.5">
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
                    <input
                      type={showPwd ? 'text' : 'password'} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 placeholder-gray-300 ${confirmPassword.length > 0 && confirmPassword !== password ? 'border-red-300' : 'border-gray-200'}`}
                    />
                    {confirmPassword.length > 0 && confirmPassword !== password && <p className="text-xs text-red-500 mt-1">Passwords don't match</p>}
                  </div>

                  {info && (
                    <div className="flex gap-2 items-start text-blue-700 text-xs bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                      <span className="shrink-0 mt-0.5">📧</span> {info}
                    </div>
                  )}
                  {error && (
                    <div className="flex gap-2 items-start text-red-600 text-xs bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                      <span className="shrink-0 mt-0.5">⚠</span> {error}
                    </div>
                  )}

                  <button
                    type="submit" disabled={loading || strength.score < 5 || password !== confirmPassword}
                    className="w-full text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}
                  >
                    {loading ? 'Creating account…' : 'Create account →'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            Deloitte SalesOps · Internal use only · v1.0
          </p>
        </div>
      </div>
    </div>
  )
}
