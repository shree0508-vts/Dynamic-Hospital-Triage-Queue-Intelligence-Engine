import { useState, useEffect, useCallback } from 'react'
import {
  Stethoscope, AlertTriangle, CheckCircle, RefreshCw,
  Users, Zap, Shield, ChevronDown, Activity, Bell
} from 'lucide-react'
import { api } from '../services/api.js'
import { usePolling } from '../hooks/usePolling.js'

const STATUS_OPTIONS = [
  { value: 'available',   label: 'Available',        icon: '✅', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'consulting',  label: 'In Consultation',  icon: '🩺', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'emergency',   label: 'Emergency',        icon: '🚨', cls: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'unavailable', label: 'Unavailable',      icon: '⛔', cls: 'text-slate-600 bg-slate-50 border-slate-200' },
]

const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]))

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.unavailable
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

export default function AdminDoctorControl() {
  const [doctors,     setDoctors]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [updating,    setUpdating]    = useState({})   // doctorId → bool
  const [messages,    setMessages]    = useState({})   // doctorId → message
  const [globalMsg,   setGlobalMsg]   = useState(null)
  const [demoRunning, setDemoRunning] = useState(false)

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await api.getDoctors()
      setDoctors(res.doctors || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchDoctors() }, [fetchDoctors])
  usePolling(fetchDoctors, 6000)

  const showMsg = (doctorId, msg, isGlobal = false) => {
    if (isGlobal) {
      setGlobalMsg(msg)
      setTimeout(() => setGlobalMsg(null), 6000)
    } else {
      setMessages(prev => ({ ...prev, [doctorId]: msg }))
      setTimeout(() => setMessages(prev => { const n = { ...prev }; delete n[doctorId]; return n }), 5000)
    }
  }

  const handleStatusChange = async (doctorId, newStatus) => {
    setUpdating(prev => ({ ...prev, [doctorId]: true }))
    try {
      const res = await api.updateDoctorStatus(doctorId, newStatus)
      const affected = res.affected_patients?.length || 0
      showMsg(
        doctorId,
        newStatus === 'emergency'
          ? `🚨 Emergency activated. ${affected} patient(s) notified.`
          : `✅ Status updated to ${newStatus}.`
      )
      fetchDoctors()
    } catch (e) {
      showMsg(doctorId, `Error: ${e.message}`)
    } finally {
      setUpdating(prev => ({ ...prev, [doctorId]: false }))
    }
  }

  const handleDemoTrigger = async () => {
    setDemoRunning(true)
    try {
      // Find Dr. Arun Kumar (D06)
      const arun = doctors.find(d => d.id === 'D06' || d.name.includes('Arun Kumar'))
      if (!arun) {
        showMsg('global', 'Dr. Arun Kumar (D06) not found in system.', true)
        return
      }
      const res = await api.updateDoctorStatus(arun.id, 'emergency')
      const affected = res.affected_patients?.length || 0
      showMsg('global',
        `🚨 DEMO: Dr. Arun Kumar is now in Emergency. ${affected} patient(s) affected. Open /reassign?token=A01 to see the patient flow.`,
        true
      )
      fetchDoctors()
    } catch (e) {
      showMsg('global', `Demo error: ${e.message}`, true)
    } finally {
      setDemoRunning(false)
    }
  }

  const affectedCount = (doctor) => {
    // Real count would come from the queue — shown on the doctor object if available
    return doctor.patients_seen_today || 0
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            Doctor Status Control
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Smart Reassignment &amp; Rescheduling — Admin Panel
          </p>
        </div>
        <button onClick={fetchDoctors} className="btn btn-secondary btn-sm">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Global message */}
      {globalMsg && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3 slide-in">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800 font-medium">{globalMsg}</div>
        </div>
      )}

      {/* ── DEMO Trigger Panel ── */}
      <div className="card border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-bold text-slate-900">Hackathon Demo Scenario</h2>
              <span className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-semibold">DEMO</span>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Set <strong>Dr. Arun Kumar</strong> to Emergency status. Patients with tokens <strong>A01</strong> &amp; <strong>A02</strong> will be notified and can choose to reassign or reschedule.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleDemoTrigger}
                disabled={demoRunning}
                className="btn btn-danger flex items-center gap-2"
              >
                {demoRunning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                🚨 Trigger Emergency — Dr. Arun Kumar
              </button>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" />
                Then open <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">/reassign?token=A01</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Doctor List ── */}
      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-primary-600" />
          All Doctors
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {doctors.map(doctor => {
              const isUpdating = updating[doctor.id]
              const msg = messages[doctor.id]

              return (
                <div key={doctor.id}
                  className={`rounded-xl border transition-all ${
                    doctor.status === 'emergency'
                      ? 'bg-red-50 border-red-200 shadow-sm shadow-red-100'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3 flex-wrap">
                      {/* Doctor avatar */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        doctor.status === 'emergency' ? 'bg-red-100' :
                        doctor.status === 'available' ? 'bg-emerald-100' :
                        doctor.status === 'consulting' ? 'bg-amber-100' : 'bg-slate-200'
                      }`}>
                        <Stethoscope className={`w-5 h-5 ${
                          doctor.status === 'emergency' ? 'text-red-600' :
                          doctor.status === 'available' ? 'text-emerald-600' :
                          doctor.status === 'consulting' ? 'text-amber-600' : 'text-slate-400'
                        }`} />
                      </div>

                      {/* Doctor info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-sm">{doctor.name}</span>
                          {doctor.id === 'D06' && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5 font-semibold">Demo Doctor</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{doctor.department} • {doctor.specialization || 'General'}</div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <StatusBadge status={doctor.status} />
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {doctor.patients_seen_today} seen today
                          </span>
                          {doctor.current_patient && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              Consulting: {doctor.current_patient}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status control */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="relative">
                          <select
                            value={doctor.status}
                            disabled={isUpdating}
                            onChange={e => handleStatusChange(doctor.id, e.target.value)}
                            className={`appearance-none pr-8 pl-3 py-2 rounded-lg border text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors ${
                              isUpdating ? 'opacity-50 cursor-wait' : ''
                            } ${
                              doctor.status === 'emergency'
                                ? 'bg-red-50 border-red-300 text-red-700'
                                : doctor.status === 'available'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : doctor.status === 'consulting'
                                ? 'bg-amber-50 border-amber-300 text-amber-700'
                                : 'bg-slate-50 border-slate-300 text-slate-600'
                            }`}
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.icon} {opt.label}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                            {isUpdating
                              ? <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                              : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Per-doctor message */}
                    {msg && (
                      <div className={`mt-3 text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
                        msg.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-teal-50 text-teal-700'
                      }`}>
                        {msg.includes('Error') ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> : <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                        {msg}
                      </div>
                    )}

                    {/* Emergency banner */}
                    {doctor.status === 'emergency' && (
                      <div className="mt-3 bg-red-100 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className="text-xs text-red-700 font-medium">
                          🚨 Affected patients have been notified. They can reassign or reschedule at <code className="bg-red-200 px-1 rounded">/reassign</code>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Feature info */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-primary-500" />
          Smart Reassignment Flow
        </h3>
        <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <span className="text-base leading-none">1️⃣</span>
            <span>Set a doctor to <strong>Emergency</strong> — all their waiting patients are notified instantly.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base leading-none">2️⃣</span>
            <span>Patient opens <code className="bg-slate-200 px-1 rounded">/reassign</code> — sees the emergency alert with two choices.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base leading-none">3️⃣</span>
            <span><strong>See Another Doctor</strong> — patient selects a peer, queue and ETAs update automatically.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base leading-none">4️⃣</span>
            <span><strong>Keep My Doctor</strong> — patient picks a future slot, appointment is rescheduled seamlessly.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
