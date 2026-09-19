import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { Activity, User, Lock, ChevronRight, Shield } from 'lucide-react'

const ROLE_CARDS = [
  {
    role: 'receptionist',
    label: 'Receptionist',
    icon: '🏥',
    email: 'receptionist@hospital.com',
    desc: 'Hospital Command Dashboard, Patient Registration, What-If Simulator',
  },
  {
    role: 'doctor',
    label: 'Doctor',
    icon: '🩺',
    email: 'doctor@hospital.com',
    desc: 'Consultation queue, Start/Extend/Complete, Patient timer',
  },
  {
    role: 'patient',
    label: 'Patient',
    icon: '👤',
    email: 'patient@hospital.com',
    desc: 'Live queue position, ETA updates, Arrival window',
  },
]

export default function Login() {
  const { login, error } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectByEmail = (emailStr) => {
    if (emailStr?.includes('receptionist')) navigate('/dashboard')
    else if (emailStr?.includes('doctor'))  navigate('/doctor')
    else navigate('/track')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const ok = login(email, password)
    setLoading(false)
    if (ok) redirectByEmail(email)
  }

  const quickLogin = (role) => {
    setLoading(true)
    const ok = login('', '', role)
    setLoading(false)
    if (ok) {
      if (role === 'doctor')  navigate('/doctor')
      else if (role === 'patient') navigate('/track')
      else navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel */}
      <div className="hidden md:flex flex-col justify-between w-80 bg-primary-700 text-white p-8">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <span className="font-bold">TriageIQ</span>
          </div>
          <h2 className="text-2xl font-bold mb-3 leading-snug">
            Hospital Queue Intelligence
          </h2>
          <p className="text-primary-200 text-sm leading-relaxed">
            Real-time patient flow management. Dynamic ETAs. Emergency preemption.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-primary-200">
            <Shield className="w-4 h-4" />
            Prototype — synthetic data only
          </div>
          <div className="text-xs text-primary-300">
            Not a clinical decision-making system.
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Sign in</h1>
          <p className="text-slate-500 text-sm mb-6">Choose a demo role to explore the system.</p>

          {/* Quick login cards */}
          <div className="space-y-3 mb-6">
            {ROLE_CARDS.map(({ role, label, icon, email: e, desc }) => (
              <button
                key={role}
                onClick={() => quickLogin(role)}
                disabled={loading}
                className="w-full card-hover text-left p-4 flex items-start gap-3 group"
              >
                <span className="text-2xl">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">{label}</span>
                    <span className="text-xs text-slate-400 font-mono">{e}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors mt-0.5" />
              </button>
            ))}
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-50 px-2 text-slate-400">or sign in manually</span>
            </div>
          </div>

          {/* Manual form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="form-label">Email</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  className="form-input pl-9"
                  type="email"
                  placeholder="doctor@hospital.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  className="form-input pl-9"
                  type="password"
                  placeholder="demo1234"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Password for all accounts: <code>demo1234</code></p>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <button
            onClick={() => navigate('/')}
            className="mt-4 text-xs text-slate-400 hover:text-slate-600 w-full text-center"
          >
            ← Back to landing page
          </button>
        </div>
      </div>
    </div>
  )
}
