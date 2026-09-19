import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Play, StopCircle, Plus, CheckCheck, Clock, Users,
  User, ChevronRight, RefreshCw, AlertCircle, Brain
} from 'lucide-react'
import { api } from '../services/api.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { usePolling } from '../hooks/usePolling.js'
import { PRIORITY_COLORS } from '../utils/helpers.js'

const PRIORITY_LABELS = { 1:'Immediate', 2:'Very Urgent', 3:'Urgent', 4:'Less Urgent', 5:'Non-Urgent' }

function Timer({ startTime }) {
  const [elapsed, setElapsed] = useState(0)
  const ref = useRef()

  useEffect(() => {
    if (!startTime) return
    ref.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(ref.current)
  }, [startTime])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return (
    <span className="font-mono text-orange-600 font-semibold">
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  )
}

export default function DoctorDashboard() {
  const { user } = useAuth()
  const doctorId = user?.doctorId || 'D01'
  const [queueData, setQueueData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')
  const [extendMinutes, setExtendMinutes] = useState(10)
  const [actualDuration, setActualDuration] = useState(15)

  const fetchQueue = useCallback(async () => {
    try {
      const d = await api.getDoctorQueue(doctorId)
      setQueueData(d)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [doctorId])

  useEffect(() => { fetchQueue() }, [fetchQueue])
  usePolling(fetchQueue, 5000)

  const showMsg = (m) => {
    setActionMsg(m)
    setTimeout(() => setActionMsg(''), 4000)
  }

  const currentToken = queueData?.queue?.find(t => t.status === 'consulting')
  const nextTokens = queueData?.queue?.filter(t => t.status === 'queued').slice(0, 4) || []
  const doctor = queueData?.doctor

  const handleStart = async () => {
    const next = queueData?.queue?.find(t => t.status === 'queued')
    if (!next) return showMsg('No patients in queue.')
    try {
      await api.startConsultation(next.token, doctorId)
      showMsg(`Consultation started for token ${next.token}`)
      fetchQueue()
    } catch (e) { showMsg(e.message) }
  }

  const handleExtend = async () => {
    if (!currentToken) return showMsg('No active consultation.')
    try {
      await api.extendConsultation(currentToken.token, extendMinutes)
      showMsg(`Extended by ${extendMinutes} min. Downstream ETAs recalculated.`)
      fetchQueue()
    } catch (e) { showMsg(e.message) }
  }

  const handleComplete = async () => {
    if (!currentToken) return showMsg('No active consultation.')
    try {
      await api.completeConsultation(currentToken.token, actualDuration)
      showMsg(`Consultation completed. Next patient will be notified.`)
      fetchQueue()
    } catch (e) { showMsg(e.message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Doctor Dashboard</h1>
          <p className="text-sm text-slate-500">{doctor?.name} — {doctor?.department}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-green">
            <span className="dot-green"></span>
            {doctor?.patients_seen_today || 0} seen today
          </span>
          <button onClick={fetchQueue} className="btn btn-secondary btn-sm">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 flex items-center gap-2 slide-in">
          <CheckCheck className="w-4 h-4" />
          {actionMsg}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {/* Current Consultation */}
        <div className="md:col-span-2 card">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary-600" />
            Current Patient
          </h2>

          {currentToken ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary-600 rounded-2xl flex flex-col items-center justify-center text-white">
                  <span className="text-xs opacity-80">TOKEN</span>
                  <span className="text-xl font-bold font-mono">{currentToken.token}</span>
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-slate-900">{currentToken.patient_name}</div>
                  <div className="text-sm text-slate-500">
                    Est. duration: {currentToken.estimated_duration} min
                  </div>
                  <div className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Elapsed: <Timer startTime={currentToken.consultation_start} />
                  </div>
                </div>
                <span className={`badge priority-${currentToken.priority}`}>
                  Level {currentToken.priority}
                </span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label text-xs">Extend by (min)</label>
                  <div className="flex gap-2">
                    <input
                      type="number" min="5" max="60" step="5"
                      className="form-input w-24"
                      value={extendMinutes}
                      onChange={e => setExtendMinutes(parseInt(e.target.value))}
                    />
                    <button onClick={handleExtend} className="btn btn-warning flex-1">
                      <Plus className="w-4 h-4" />
                      Extend
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label text-xs">Actual duration (min)</label>
                  <div className="flex gap-2">
                    <input
                      type="number" min="1" max="120"
                      className="form-input w-24"
                      value={actualDuration}
                      onChange={e => setActualDuration(parseInt(e.target.value))}
                    />
                    <button onClick={handleComplete} className="btn btn-success flex-1">
                      <CheckCheck className="w-4 h-4" />
                      Complete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active consultation.</p>
              <button onClick={handleStart} className="btn btn-primary mt-4">
                <Play className="w-4 h-4" />
                Start Next Patient
              </button>
            </div>
          )}

          {currentToken && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button onClick={handleStart} className="btn btn-primary btn-sm">
                <Play className="w-4 h-4" />
                Call Next Patient
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-600">{queueData?.dept_waiting || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Patients Waiting</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-teal-600">{doctor?.patients_seen_today || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Seen Today</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-orange-500">
              {currentToken ? <Timer startTime={currentToken.consultation_start} /> : '--'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Current Duration</div>
          </div>
        </div>
      </div>

      {/* Queue */}
      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary-600" />
          Upcoming Patients
        </h2>
        {nextTokens.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No patients in queue.</p>
        ) : (
          <div className="space-y-2">
            {nextTokens.map((t, i) => (
              <div key={t.token} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-400 font-mono leading-tight">{t.token}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-slate-800">{t.patient_name}</div>
                  <div className="text-xs text-slate-500">
                    Est. {t.estimated_duration} min • {t.estimated_start_fmt || t.estimated_start || '--'}
                  </div>
                </div>
                <span className={`badge priority-${t.priority}`}>
                  L{t.priority}
                </span>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  {t.estimated_duration}m
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
