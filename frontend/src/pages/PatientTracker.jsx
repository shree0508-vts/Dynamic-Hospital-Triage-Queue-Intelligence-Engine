import { useState, useEffect, useCallback } from 'react'
import { Search, Activity, Clock, Users, ChevronUp, RefreshCw, AlertTriangle, CheckCircle, ArrowUp } from 'lucide-react'
import { api } from '../services/api.js'
import { usePolling } from '../hooks/usePolling.js'
import { PRIORITY_COLORS } from '../utils/helpers.js'

const STATUS_DISPLAY = {
  queued:     { label: 'Waiting',    color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200' },
  called:     { label: 'Called',     color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  consulting: { label: 'Consulting', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  completed:  { label: 'Completed',  color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
}

export default function PatientTracker() {
  const [tokenInput, setTokenInput] = useState('')
  const [tokenData, setTokenData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [prevEta, setPrevEta] = useState(null)
  const [etaChanged, setEtaChanged] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchToken = useCallback(async (t) => {
    const tok = t || tokenInput.trim().toUpperCase()
    if (!tok) return
    try {
      const d = await api.getToken(tok)
      setTokenData(prev => {
        if (prev?.token?.estimated_start_fmt && d.token?.estimated_start_fmt !== prev.token.estimated_start_fmt) {
          setPrevEta(prev.token.estimated_start_fmt)
          setEtaChanged(true)
          setTimeout(() => setEtaChanged(false), 10000)
        }
        return d
      })
      setLastUpdated(new Date().toLocaleTimeString())
      setError('')
    } catch (e) {
      setError(e.message || 'Token not found. Please check and try again.')
    }
  }, [tokenInput])

  const handleSearch = async (e) => {
    e.preventDefault()
    setLoading(true)
    await fetchToken()
    setLoading(false)
  }

  // Live polling once a token is loaded
  usePolling(
    () => tokenData && fetchToken(tokenData.token?.token),
    7000,
    !!tokenData
  )

  const t = tokenData?.token
  const patient = tokenData?.patient
  const statusInfo = STATUS_DISPLAY[t?.status] || STATUS_DISPLAY.queued
  const pc = PRIORITY_COLORS[t?.priority] || PRIORITY_COLORS[5]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-primary-700 text-white py-6 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Activity className="w-5 h-5" />
          <span className="font-bold">TriageIQ</span>
        </div>
        <h1 className="text-xl font-bold">Patient Queue Tracker</h1>
        <p className="text-primary-200 text-sm">Track your live queue position</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="card">
          <label className="form-label">Enter Your Token Number</label>
          <div className="flex gap-2">
            <input
              className="form-input flex-1 text-center font-mono text-lg uppercase tracking-widest"
              placeholder="e.g. C04"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value.toUpperCase())}
              maxLength={5}
            />
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="form-error mt-2">{error}</p>}
          <p className="text-xs text-slate-400 mt-2">
            Try: C04, G01, P01, E02, O03
          </p>
        </form>

        {/* ETA Changed Banner */}
        {etaChanged && (
          <div className="p-3 bg-yellow-50 border-2 border-yellow-300 rounded-xl flex items-start gap-2 slide-in">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-yellow-800">Your estimated time has been updated.</div>
              <div className="text-xs text-yellow-600 mt-0.5">
                Previous: {prevEta} → New: {t?.estimated_start_fmt}
              </div>
            </div>
          </div>
        )}

        {/* Token Card */}
        {t && (
          <div className="space-y-3 fade-in">
            {/* Main Token Display */}
            <div className="card text-center py-6">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Your Token</div>
              <div className={`inline-flex flex-col items-center justify-center w-28 h-28 rounded-3xl ${t.is_emergency ? 'bg-red-600' : 'bg-primary-600'} text-white mx-auto mb-4`}>
                <span className="text-xs opacity-80 font-medium">TOKEN</span>
                <span className="text-4xl font-bold font-mono">{t.token}</span>
              </div>

              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
                <span className="w-2 h-2 rounded-full bg-current pulse-soft"></span>
                {statusInfo.label}
              </div>
            </div>

            {/* Queue Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card text-center py-4">
                <div className="text-3xl font-bold text-slate-900">{tokenData?.patients_ahead ?? '--'}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                  <Users className="w-3 h-3" />
                  Ahead of you
                </div>
              </div>
              <div className="card text-center py-4">
                <div className="text-3xl font-bold text-slate-900">{tokenData?.queue_position ?? '--'}</div>
                <div className="text-xs text-slate-500 mt-1">Queue Position</div>
              </div>
            </div>

            {/* Currently Consulting */}
            {tokenData?.current_consulting && (
              <div className="card">
                <div className="text-xs text-slate-500 mb-1">Currently Consulting</div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <span className="font-bold text-orange-700 font-mono text-sm">{tokenData.current_consulting}</span>
                  </div>
                  <div className="text-sm text-slate-700">In consultation now</div>
                  <span className="ml-auto pulse-soft text-xs text-orange-500 font-medium">Live</span>
                </div>
              </div>
            )}

            {/* ETA Window */}
            <div className="card">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Estimated Call-In Window</div>
              <div className={`text-2xl font-bold ${etaChanged ? 'text-yellow-600' : 'text-primary-600'} text-center py-3`}>
                {t.estimated_start_fmt || '--'} – {t.estimated_end_fmt || '--'}
              </div>
              {t.arrival_window_start && (
                <div className="text-center text-xs text-slate-500">
                  Arrival window: {t.arrival_window_start} – {t.arrival_window_end}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Department</span>
                <span className="text-sm font-medium text-slate-800">{t.department}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Doctor</span>
                <span className="text-sm font-medium text-slate-800">{t.doctor_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Est. Consultation</span>
                <span className="text-sm font-medium text-slate-800">{t.estimated_duration} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Priority</span>
                <span className={`badge priority-${t.priority}`}>Level {t.priority}</span>
              </div>
              {lastUpdated && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-soft"></span>
                    Last updated
                  </span>
                  <span className="text-xs text-slate-400">{lastUpdated}</span>
                </div>
              )}
            </div>

            {/* QR Placeholder */}
            <div className="card text-center py-4 border-dashed">
              <div className="w-20 h-20 bg-slate-100 rounded-xl mx-auto mb-2 flex items-center justify-center">
                <div className="grid grid-cols-3 gap-0.5 w-12">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className={`w-3 h-3 rounded-sm ${Math.random() > 0.5 ? 'bg-slate-800' : 'bg-white border border-slate-200'}`} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400">QR Code for token {t.token}</p>
              <p className="text-[10px] text-slate-300">Show this at reception</p>
            </div>
          </div>
        )}

        {!t && !error && (
          <div className="card text-center py-12 text-slate-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Enter your token number above to track your queue position.</p>
          </div>
        )}
      </div>
    </div>
  )
}
