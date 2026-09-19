import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, AlertTriangle, CheckCircle, ChevronRight, Brain } from 'lucide-react'
import { api } from '../services/api.js'
import { DEPARTMENTS, DOCTORS, VISIT_TYPES, getDoctorsByDept, PRIORITY_COLORS } from '../utils/helpers.js'

const PRIORITY_LABELS = {
  1: 'Immediate',
  2: 'Very Urgent',
  3: 'Urgent',
  4: 'Less Urgent',
  5: 'Non-Urgent',
}

function Field({ label, children, error }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

function TokenCard({ result }) {
  const { patient, token } = result
  const pc = PRIORITY_COLORS[patient.priority_level] || PRIORITY_COLORS[5]
  return (
    <div className="card border-2 border-primary-200 fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900">Patient Registered</h3>
          <p className="text-sm text-slate-500">{patient.name}</p>
        </div>
        <CheckCircle className="w-6 h-6 text-green-500" />
      </div>

      {/* Token */}
      <div className="flex gap-4 mb-4">
        <div className="flex-shrink-0 w-24 h-24 bg-primary-600 rounded-2xl flex flex-col items-center justify-center text-white">
          <span className="text-xs font-medium opacity-80">TOKEN</span>
          <span className="text-3xl font-bold font-mono">{token?.token || patient.token}</span>
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <div className="text-xs text-slate-500">Department</div>
            <div className="text-sm font-semibold text-slate-800">{patient.department}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Queue Position</div>
            <div className="text-sm font-semibold text-slate-800">#{patient.queue_position || token?.position || '--'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Priority</div>
            <span className={`badge ${pc.badge}`}>
              Level {patient.priority_level} — {PRIORITY_LABELS[patient.priority_level]}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="text-xs text-slate-500 mb-1">Arrival Window</div>
          <div className="text-sm font-semibold text-slate-800">
            {patient.arrival_window_start || token?.arrival_window_start || '--'} –<br />
            {patient.arrival_window_end || token?.arrival_window_end || '--'}
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="text-xs text-slate-500 mb-1">Est. Consultation</div>
          <div className="text-sm font-semibold text-slate-800">{patient.estimated_duration} min</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            <Brain className="w-3 h-3" /> ML prediction
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="text-xs text-slate-500 mb-1">Est. Call-In Time</div>
          <div className="text-sm font-semibold text-slate-800">
            {patient.estimated_call_in || token?.estimated_start_fmt || '--'}
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="text-xs text-slate-500 mb-1">Priority Reason</div>
          <div className="text-xs text-slate-600 leading-relaxed">{patient.priority_reason}</div>
        </div>
      </div>
    </div>
  )
}

export default function Registration() {
  const [form, setForm] = useState({
    name: '',
    age: '',
    department: 'Cardiology',
    doctor_id: 'D01',
    visit_type: 'New Consultation',
    is_emergency: false,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [apiError, setApiError] = useState('')
  const [prediction, setPrediction] = useState(null)

  const availableDoctors = getDoctorsByDept(form.department)

  const set = (key, val) => {
    setForm(f => {
      const next = { ...f, [key]: val }
      // Auto-select first doctor of new dept
      if (key === 'department') {
        const docs = getDoctorsByDept(val)
        next.doctor_id = docs[0]?.id || ''
      }
      return next
    })
    setPrediction(null)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.age || isNaN(form.age) || form.age < 0 || form.age > 120) e.age = 'Valid age required (0–120)'
    return e
  }

  const fetchPrediction = async () => {
    if (!form.department || !form.doctor_id || !form.visit_type || !form.age) return
    try {
      const p = await api.predict({
        department: form.department,
        age: parseInt(form.age),
        visit_type: form.visit_type,
        doctor_id: form.doctor_id,
      })
      setPrediction(p)
    } catch { /* ignore */ }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setApiError('')
    try {
      const payload = {
        ...form,
        age: parseInt(form.age),
        is_emergency: Boolean(form.is_emergency),
      }
      const res = await api.registerPatient(payload)
      setResult(res)
      setErrors({})
    } catch (e) {
      setApiError(e.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setResult(null)
    setForm({ name: '', age: '', department: 'Cardiology', doctor_id: 'D01', visit_type: 'New Consultation', is_emergency: false })
    setPrediction(null)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="w-5 h-5 text-primary-600" />
        <h1 className="text-xl font-bold text-slate-900">Patient Registration & Check-In</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form */}
        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-4">Patient Details</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {apiError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {apiError}
              </div>
            )}

            <Field label="Patient Name" error={errors.name}>
              <input
                className="form-input"
                placeholder="Full name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </Field>

            <Field label="Age" error={errors.age}>
              <input
                className="form-input"
                type="number"
                min="0" max="120"
                placeholder="Age in years"
                value={form.age}
                onChange={e => set('age', e.target.value)}
                onBlur={fetchPrediction}
              />
            </Field>

            <Field label="Department">
              <select
                className="form-select"
                value={form.department}
                onChange={e => set('department', e.target.value)}
              >
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>

            <Field label="Doctor">
              <select
                className="form-select"
                value={form.doctor_id}
                onChange={e => set('doctor_id', e.target.value)}
              >
                {availableDoctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Visit Type">
              <select
                className="form-select"
                value={form.visit_type}
                onChange={e => set('visit_type', e.target.value)}
                onBlur={fetchPrediction}
              >
                {VISIT_TYPES.map(v => <option key={v}>{v}</option>)}
              </select>
            </Field>

            {/* Emergency toggle */}
            <div className={`p-3 rounded-xl border-2 cursor-pointer transition-colors ${
              form.is_emergency
                ? 'bg-red-50 border-red-400'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`} onClick={() => set('is_emergency', !form.is_emergency)}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-5 rounded-full transition-colors ${form.is_emergency ? 'bg-red-500' : 'bg-slate-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_emergency ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <div>
                  <div className={`text-sm font-semibold ${form.is_emergency ? 'text-red-700' : 'text-slate-600'}`}>
                    {form.is_emergency ? '🚨 Emergency Walk-in' : 'Regular Patient'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {form.is_emergency ? 'Will be inserted with high priority' : 'Standard queue placement'}
                  </div>
                </div>
              </div>
            </div>

            {/* ML Prediction preview */}
            {prediction && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <div className="flex items-center gap-2 text-teal-700 text-sm">
                  <Brain className="w-4 h-4" />
                  <span className="font-semibold">ML Prediction:</span>
                  <span>{prediction.estimated_duration_minutes} min estimated consultation</span>
                </div>
                <p className="text-xs text-teal-600 mt-1">This is only an estimate based on historical data.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center"
            >
              {loading ? 'Registering…' : 'Register Patient & Generate Token'}
              {!loading && <ChevronRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* Result / Instructions */}
        <div>
          {result ? (
            <div className="space-y-3">
              <TokenCard result={result} />
              <button onClick={resetForm} className="btn btn-secondary w-full justify-center">
                Register Another Patient
              </button>
            </div>
          ) : (
            <div className="card h-full flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">How Registration Works</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { n: '1', t: 'Fill patient details', d: 'Enter name, age, department, and visit type.' },
                    { n: '2', t: 'ML Duration Prediction', d: 'Our model predicts consultation duration based on dept, age & visit type.' },
                    { n: '3', t: 'Priority Assignment', d: 'Rule-based triage engine assigns 1–5 priority level automatically.' },
                    { n: '4', t: 'Token Generation', d: 'Patient receives token, arrival window, and estimated call-in time.' },
                    { n: '5', t: 'Live Queue Update', d: 'Dashboard and queue screen update instantly.' },
                  ].map(s => (
                    <div key={s.n} className="flex gap-3">
                      <div className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {s.n}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{s.t}</div>
                        <div className="text-slate-500 text-xs">{s.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Prototype Notice
                </div>
                <p className="text-xs text-amber-600">
                  Priority assignment uses transparent rule-based logic for demonstration.
                  This is not a clinical triage system.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
