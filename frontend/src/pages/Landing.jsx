import { useNavigate } from 'react-router-dom'
import { Activity, Brain, Zap, Clock, Users, ArrowRight, Shield, ChevronRight } from 'lucide-react'

const FEATURES = [
  {
    icon: Zap,
    color: 'bg-blue-50 text-blue-600',
    title: 'Dynamic Queue Management',
    desc: 'Rolling arrival windows replace fixed slots. Queue positions update instantly as consultations progress.',
  },
  {
    icon: Activity,
    color: 'bg-red-50 text-red-600',
    title: 'Emergency-Aware Scheduling',
    desc: 'Emergency preemption engine instantly reprioritises walk-ins and recalculates all downstream ETAs.',
  },
  {
    icon: Brain,
    color: 'bg-teal-50 text-teal-600',
    title: 'Predictive Waiting-Time Intelligence',
    desc: 'ML-driven consultation duration predictions power accurate, continuously-updated patient ETAs.',
  },
]

const DEPTS = ['Cardiology', 'General Medicine', 'Orthopaedics', 'Paediatrics', 'Emergency']
const STATS = [
  { value: '40%', label: 'Reduction in wait time' },
  { value: '5',   label: 'Departments managed' },
  { value: '< 1s', label: 'ETA recalculation' },
  { value: '5-level', label: 'Triage priority system' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900">TriageIQ</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/track')}
              className="btn btn-secondary btn-sm"
            >
              Track My Token
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary btn-sm"
            >
              Staff Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 border border-primary-200 rounded-full text-xs font-semibold text-primary-700 mb-6">
          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full pulse-soft"></span>
          Live Hospital Intelligence Platform
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
          Dynamic Hospital Triage &<br />
          <span className="text-primary-600">Queue Intelligence Engine</span>
        </h1>

        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
          Real-time patient flow intelligence for unpredictable hospital environments.
          We don't just schedule patients — we continuously predict, prioritise and
          rebalance patient flow in real time.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary px-6 py-2.5 text-sm"
          >
            Launch Hospital Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/track')}
            className="btn btn-secondary px-6 py-2.5 text-sm"
          >
            Patient Queue Tracker
          </button>
        </div>

        {/* Stats bar */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="card text-center py-4">
              <div className="text-2xl font-bold text-primary-600">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
            Core Capabilities
          </h2>
          <p className="text-slate-500 text-center text-sm mb-10">
            Built for the unpredictable reality of hospital operations.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="card-hover p-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Departments Managed</h2>
        <div className="flex flex-wrap gap-3">
          {DEPTS.map(d => (
            <span key={d} className="badge badge-blue px-4 py-2 text-sm">{d}</span>
          ))}
        </div>

        {/* Demo flow */}
        <div className="mt-12 card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">How Emergency Preemption Works</h3>
          <div className="grid md:grid-cols-2 gap-8 text-sm">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Before Emergency</div>
              <div className="space-y-2">
                {['A21 — 10:40 AM', 'A22 — 10:52 AM', 'A23 — 11:04 AM', 'A24 — 11:16 AM'].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <span className="w-6 h-6 bg-white border border-slate-200 rounded text-center text-xs leading-6 font-mono font-semibold">{i+1}</span>
                    <span className="text-slate-700">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full pulse-soft"></span>
                After E07 (Level 1) Arrives
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <span className="w-6 h-6 bg-red-600 rounded text-center text-xs leading-6 font-mono font-semibold text-white">1</span>
                  <span className="text-red-700 font-semibold">E07 — IMMEDIATE</span>
                  <span className="badge badge-red ml-auto">Emergency</span>
                </div>
                {['A21 — 11:05 AM', 'A22 — 11:20 AM', 'A23 — 11:35 AM'].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg opacity-75">
                    <span className="w-6 h-6 bg-white border border-slate-200 rounded text-center text-xs leading-6 font-mono">{i+2}</span>
                    <span className="text-slate-600">{t}</span>
                    <span className="ml-auto text-[10px] text-yellow-600 font-medium">ETA updated</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600 py-12 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to see it in action?</h2>
        <p className="text-primary-200 text-sm mb-6">
          Explore with preloaded demo data. No setup required.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="btn bg-white text-primary-700 hover:bg-primary-50 border-white px-8 py-2.5"
        >
          Launch Hospital Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 text-center">
        <p className="text-xs text-slate-400">
          TriageIQ — Dynamic Hospital Triage & Queue Intelligence Engine |
          Prototype for hospital workflow simulation and decision support.
          Not a medical diagnosis or autonomous clinical decision-making system.
        </p>
      </footer>
    </div>
  )
}
