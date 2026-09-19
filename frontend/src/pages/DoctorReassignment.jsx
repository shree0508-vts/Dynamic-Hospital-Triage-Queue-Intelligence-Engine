import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Activity, Search, AlertTriangle, Stethoscope, Calendar,
  Clock, CheckCircle, ArrowRight, RefreshCw, ChevronRight,
  XCircle, CalendarCheck, Users, Zap
} from 'lucide-react'
import { api } from '../services/api.js'

const STATUS_CONFIG = {
  available:   { label: 'Available',       cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  consulting:  { label: 'In Consultation', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  emergency:   { label: 'Emergency',       cls: 'bg-red-100 text-red-700 border-red-200' },
  unavailable: { label: 'Unavailable',     cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const STEP = {
  SEARCH: 'search', ALERT: 'alert', CHOOSE_DOCTOR: 'choose_doctor',
  CHOOSE_SLOT: 'choose_slot', CONFIRMED: 'confirmed', ALREADY_DONE: 'already_done',
}

export default function DoctorReassignment() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()

  const [tokenInput,    setTokenInput]    = useState(params.get('token') || '')
  const [step,          setStep]          = useState(STEP.SEARCH)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [tokenData,     setTokenData]     = useState(null)
  const [statusData,    setStatusData]    = useState(null)
  const [peers,         setPeers]         = useState([])
  const [slots,         setSlots]         = useState([])
  const [selectedPeer,  setSelectedPeer]  = useState(null)
  const [selectedDate,  setSelectedDate]  = useState(null)
  const [selectedTime,  setSelectedTime]  = useState(null)
  const [confirmation,  setConfirmation]  = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const tok = params.get('token')
    if (tok) doSearch(tok)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doSearch = useCallback(async (tok) => {
    const t = tok.trim().toUpperCase()
    if (!t) return
    setLoading(true); setError('')
    try {
      const [tokenRes, statusRes] = await Promise.all([
        api.getToken(t), api.getReassignmentStatus(t),
      ])
      setTokenData(tokenRes); setStatusData(statusRes)
      const action = statusRes.action
      if (action === 'reassigned' || action === 'rescheduled') {
        setConfirmation(statusRes.reassignment); setStep(STEP.ALREADY_DONE)
      } else if (statusRes.doctor_status === 'emergency' || action === 'pending') {
        setStep(STEP.ALERT)
      } else {
        setError('Your appointment is on schedule — no action required right now.')
      }
    } catch (e) { setError(e.message || 'Token not found.') }
    finally { setLoading(false) }
  }, [])

  const handleSearch = (e) => { e.preventDefault(); doSearch(tokenInput) }

  const handleSeeAnotherDoctor = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.getDoctorPeers(statusData.doctor_id)
      setPeers(res.peers || []); setStep(STEP.CHOOSE_DOCTOR)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleKeepDoctor = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.getReassignmentSlots(statusData.doctor_id)
      setSlots(res.slots || []); setSelectedDate(null); setSelectedTime(null)
      setStep(STEP.CHOOSE_SLOT)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleReassign = async () => {
    if (!selectedPeer) return
    setActionLoading(true); setError('')
    try {
      const res = await api.reassignPatient({ token: tokenData.token.token, new_doctor_id: selectedPeer.id })
      setConfirmation({
        action: 'reassigned', new_doctor_name: res.new_doctor?.name,
        new_eta: res.new_eta, new_position: res.new_position,
      })
      setStep(STEP.CONFIRMED)
    } catch (e) { setError(e.message) }
    finally { setActionLoading(false) }
  }

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) return
    setActionLoading(true); setError('')
    try {
      const res = await api.reschedulePatient({
        token: tokenData.token.token, doctor_id: statusData.doctor_id,
        slot_date: selectedDate, slot_time: selectedTime,
      })
      setConfirmation({
        action: 'rescheduled', doctor_name: res.scheduled_appointment?.doctor_name,
        slot_date: res.scheduled_appointment?.slot_date, slot_time: res.scheduled_appointment?.slot_time,
      })
      setStep(STEP.CONFIRMED)
    } catch (e) { setError(e.message) }
    finally { setActionLoading(false) }
  }

  const t = tokenData?.token

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/track')} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <ArrowRight className="w-4 h-4 text-white rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">TriageIQ</div>
              <div className="text-blue-300 text-[10px]">Smart Reassignment</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Feature Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-300 text-xs font-semibold">Smart Doctor Reassignment &amp; Rescheduling</span>
          </div>
        </div>

        {/* ── SEARCH ── */}
        {step === STEP.SEARCH && (
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-1">Manage Your Appointment</h1>
              <p className="text-slate-400 text-sm">When emergencies change the schedule, patients stay in control.</p>
            </div>
            <form onSubmit={handleSearch} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 space-y-4">
              <label className="block text-sm font-medium text-slate-300">Enter Your Token Number</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-white/10 border border-white/20 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-center font-mono text-xl uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. A01"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value.toUpperCase())}
                  maxLength={5}
                />
                <button type="submit" disabled={loading} className="px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors flex items-center gap-2">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">
                  <XCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}
              <p className="text-xs text-slate-500 text-center">Demo tokens: A01, A02</p>
            </form>
          </div>
        )}

        {/* ── ALERT ── */}
        {step === STEP.ALERT && t && (
          <div className="space-y-4">
            <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0">
                <span className="text-[9px] opacity-70">TOKEN</span>
                <span className="text-sm font-bold font-mono">{t.token}</span>
              </div>
              <div>
                <div className="text-white font-semibold text-sm">{t.patient_name}</div>
                <div className="text-slate-400 text-xs">{t.department}</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-900/60 to-orange-900/40 border-2 border-red-500/60 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="text-red-300 font-bold text-base mb-1">&#x1F6A8; Doctor Unavailable</div>
                  <div className="text-white font-semibold text-sm">{statusData?.doctor_name} is currently attending an emergency case.</div>
                  <div className="text-slate-300 text-xs mt-1.5 leading-relaxed">Your appointment cannot proceed as scheduled. Please choose how you'd like to continue.</div>
                </div>
              </div>
              <div className="border-t border-red-500/30 pt-4 space-y-3">
                <p className="text-slate-300 text-xs font-medium text-center">How would you like to proceed?</p>
                <button onClick={handleSeeAnotherDoctor} disabled={loading}
                  className="w-full flex items-center gap-4 p-4 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all group">
                  <div className="w-10 h-10 bg-blue-500/40 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-white font-bold text-sm">See Another Doctor</div>
                    <div className="text-blue-200 text-xs">Switch to an available doctor right now</div>
                  </div>
                  {loading ? <RefreshCw className="w-4 h-4 text-white animate-spin" /> : <ChevronRight className="w-4 h-4 text-blue-200" />}
                </button>
                <button onClick={handleKeepDoctor} disabled={loading}
                  className="w-full flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all group">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CalendarCheck className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-white font-bold text-sm">Keep My Doctor</div>
                    <div className="text-slate-400 text-xs">Reschedule with {statusData?.doctor_name}</div>
                  </div>
                  {loading ? <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}
          </div>
        )}

        {/* ── CHOOSE DOCTOR ── */}
        {step === STEP.CHOOSE_DOCTOR && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(STEP.ALERT)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <ArrowRight className="w-4 h-4 text-white rotate-180" />
              </button>
              <div>
                <h2 className="text-white font-bold">Available Doctors</h2>
                <p className="text-slate-400 text-xs">{t?.department} Department</p>
              </div>
            </div>
            {peers.length === 0 ? (
              <div className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
                <Users className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-300 font-medium">No available doctors right now</p>
                <p className="text-slate-500 text-xs mt-1">Try rescheduling instead</p>
                <button onClick={() => setStep(STEP.ALERT)} className="mt-4 px-4 py-2 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20">Go Back</button>
              </div>
            ) : (
              <div className="space-y-3">
                {peers.map(peer => {
                  const isSelected = selectedPeer?.id === peer.id
                  return (
                    <button key={peer.id} onClick={() => setSelectedPeer(peer)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${isSelected ? 'bg-blue-600/30 border-blue-400/60 ring-2 ring-blue-500/50' : 'bg-white/10 border-white/20 hover:bg-white/15'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-500' : 'bg-white/15'}`}>
                          <Stethoscope className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-semibold text-sm">{peer.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_CONFIG[peer.status]?.cls || ''}`}>
                              {STATUS_CONFIG[peer.status]?.label}
                            </span>
                          </div>
                          <div className="text-slate-400 text-xs mt-0.5">{peer.specialization}</div>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <div className="flex items-center gap-1 text-xs text-slate-300">
                              <Clock className="w-3 h-3 text-emerald-400" />
                              Available: <span className="font-medium text-emerald-300 ml-1">{peer.available_at}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-300">
                              <Users className="w-3 h-3 text-blue-400" />
                              Wait: <span className="font-medium text-blue-300 ml-1">~{peer.estimated_wait_minutes} min</span>
                            </div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            {selectedPeer && (
              <div className="space-y-3">
                <div className="bg-blue-600/20 border border-blue-400/30 rounded-xl px-4 py-3 text-sm text-blue-200">
                  Selected: <span className="font-bold text-white">{selectedPeer.name}</span> — Available at {selectedPeer.available_at} (~{selectedPeer.estimated_wait_minutes} min wait)
                </div>
                {error && <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2"><XCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
                <button onClick={handleReassign} disabled={actionLoading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                  {actionLoading ? <><RefreshCw className="w-4 h-4 animate-spin" />Reassigning…</> : <><CheckCircle className="w-4 h-4" />Confirm — Switch to {selectedPeer.name}</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CHOOSE SLOT ── */}
        {step === STEP.CHOOSE_SLOT && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(STEP.ALERT)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <ArrowRight className="w-4 h-4 text-white rotate-180" />
              </button>
              <div>
                <h2 className="text-white font-bold">Reschedule Appointment</h2>
                <p className="text-slate-400 text-xs">with {statusData?.doctor_name}</p>
              </div>
            </div>
            <div className="bg-amber-500/15 border border-amber-400/30 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-amber-200 text-sm">
                <span className="font-semibold">{statusData?.doctor_name}</span> is currently unavailable due to an emergency. Select a new date and time below.
              </p>
            </div>
            {slots.map(day => (
              <div key={day.date} className="bg-white/10 border border-white/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-white font-semibold text-sm">{day.label}</div>
                    <div className="text-slate-400 text-xs">{day.display}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {day.slots.slice(0, 9).map(time => {
                    const isSelected = selectedDate === day.date && selectedTime === time
                    return (
                      <button key={time} onClick={() => { setSelectedDate(day.date); setSelectedTime(time) }}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${isSelected ? 'bg-blue-600 border-blue-400 text-white ring-2 ring-blue-400/50' : 'bg-white/10 border-white/20 text-slate-300 hover:bg-white/20 hover:text-white'}`}>
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {selectedDate && selectedTime && (
              <div className="space-y-3">
                <div className="bg-emerald-600/20 border border-emerald-400/30 rounded-xl px-4 py-3 text-sm text-emerald-200">
                  Selected: <span className="font-bold text-white">{selectedTime}</span> on <span className="font-bold text-white">{slots.find(d => d.date === selectedDate)?.label || selectedDate}</span>
                </div>
                {error && <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2"><XCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
                <button onClick={handleReschedule} disabled={actionLoading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                  {actionLoading ? <><RefreshCw className="w-4 h-4 animate-spin" />Rescheduling…</> : <><CalendarCheck className="w-4 h-4" />Confirm Reschedule</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CONFIRMED / ALREADY DONE ── */}
        {(step === STEP.CONFIRMED || step === STEP.ALREADY_DONE) && confirmation && (
          <div className="space-y-4">
            <div className={`rounded-2xl p-6 border-2 ${confirmation.action === 'reassigned' ? 'bg-gradient-to-br from-blue-900/60 to-blue-800/40 border-blue-400/60' : 'bg-gradient-to-br from-emerald-900/60 to-emerald-800/40 border-emerald-400/60'}`}>
              <div className="text-center space-y-3">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${confirmation.action === 'reassigned' ? 'bg-blue-500/30' : 'bg-emerald-500/30'}`}>
                  {confirmation.action === 'reassigned' ? <Users className="w-8 h-8 text-blue-300" /> : <CalendarCheck className="w-8 h-8 text-emerald-300" />}
                </div>
                <div>
                  <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${confirmation.action === 'reassigned' ? 'text-blue-400' : 'text-emerald-400'}`}>
                    {step === STEP.ALREADY_DONE ? 'Already Processed' : '✓ Confirmed'}
                  </div>
                  <h2 className="text-white font-bold text-lg leading-snug">
                    {confirmation.action === 'reassigned'
                      ? `Your appointment has been reassigned to ${confirmation.new_doctor_name}.`
                      : `Your appointment with ${confirmation.doctor_name || statusData?.doctor_name} has been rescheduled successfully.`}
                  </h2>
                </div>
                {confirmation.action === 'reassigned' && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <div className="text-slate-400 text-xs mb-1">New Doctor</div>
                      <div className="text-white font-bold text-sm">{confirmation.new_doctor_name}</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <div className="text-slate-400 text-xs mb-1">New ETA</div>
                      <div className="text-white font-bold text-sm">{confirmation.new_eta || '--'}</div>
                    </div>
                  </div>
                )}
                {confirmation.action === 'rescheduled' && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <div className="text-slate-400 text-xs mb-1">Doctor</div>
                      <div className="text-white font-bold text-sm">{confirmation.doctor_name || statusData?.doctor_name}</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <div className="text-slate-400 text-xs mb-1">New Slot</div>
                      <div className="text-white font-bold text-sm">{confirmation.slot_time || '--'}</div>
                      <div className="text-slate-400 text-[10px]">
                        {confirmation.slot_date ? new Date(confirmation.slot_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Queue has been updated and ETAs recalculated for all affected patients.</span>
            </div>
            <button onClick={() => navigate('/track')} className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-colors text-sm">
              Back to Patient Tracker
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
