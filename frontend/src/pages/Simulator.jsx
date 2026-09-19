import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { FlaskConical, Play, AlertTriangle, TrendingUp, Users, Clock, Stethoscope } from 'lucide-react'
import { api } from '../services/api.js'

const DEFAULT_PARAMS = {
  additional_patients: 0,
  additional_emergencies: 0,
  doctor_availability_percent: 100,
  avg_consultation_duration: 15,
  department_capacity_multiplier: 1.0,
}

function SliderField({ label, name, min, max, step, value, onChange, unit }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="form-label mb-0">{label}</label>
        <span className="text-sm font-semibold text-primary-600">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
        value={value}
        onChange={e => onChange(name, parseFloat(e.target.value))}
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

function ResultCard({ label, current, simulated, unit = '', icon: Icon, worse }) {
  const diff = simulated - current
  const isWorse = worse ? diff > 0 : diff < 0
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <div className="flex items-end gap-3">
        <div>
          <div className="text-xs text-slate-400">Current</div>
          <div className="text-xl font-bold text-slate-700">{current}{unit}</div>
        </div>
        <div className="flex items-center text-lg">→</div>
        <div>
          <div className="text-xs text-slate-400">Simulated</div>
          <div className={`text-2xl font-bold ${isWorse ? 'text-red-600' : 'text-green-600'}`}>
            {simulated}{unit}
          </div>
        </div>
        {diff !== 0 && (
          <div className={`ml-auto text-xs font-semibold ${isWorse ? 'text-red-500' : 'text-green-500'}`}>
            {diff > 0 ? '+' : ''}{diff}{unit}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Simulator() {
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (name, value) => setParams(p => ({ ...p, [name]: value }))

  const runSim = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await api.runSimulation(params)
      setResult(r)
    } catch (e) {
      setError(e.message || 'Simulation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-5 h-5 text-primary-600" />
        <h1 className="text-xl font-bold text-slate-900">What-If Hospital Simulator</h1>
      </div>
      <p className="text-sm text-slate-500 -mt-4">
        Model hypothetical scenarios to understand how patient flow would change.
        This is a simulation, not a clinical prediction.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="md:col-span-1 card space-y-5">
          <h2 className="font-semibold text-slate-800">Simulation Parameters</h2>

          <SliderField
            label="Additional Patients" name="additional_patients"
            min={0} max={50} step={1} value={params.additional_patients} onChange={set} unit=""
          />
          <SliderField
            label="Emergency Walk-ins" name="additional_emergencies"
            min={0} max={30} step={1} value={params.additional_emergencies} onChange={set} unit=""
          />
          <SliderField
            label="Doctor Availability" name="doctor_availability_percent"
            min={20} max={100} step={10} value={params.doctor_availability_percent} onChange={set} unit="%"
          />
          <SliderField
            label="Avg Consultation Duration" name="avg_consultation_duration"
            min={5} max={60} step={5} value={params.avg_consultation_duration} onChange={set} unit=" min"
          />
          <SliderField
            label="Department Capacity" name="department_capacity_multiplier"
            min={0.5} max={2.0} step={0.1} value={params.department_capacity_multiplier} onChange={set} unit="x"
          />

          <button
            onClick={runSim}
            disabled={loading}
            className="btn btn-primary w-full justify-center"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span> Running…</>
              : <><Play className="w-4 h-4" /> Run Simulation</>
            }
          </button>

          {/* Preset Scenarios */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-500 mb-2">Quick Scenarios</div>
            <div className="space-y-1">
              {[
                { label: '20 Emergency Walk-ins', vals: { additional_emergencies: 20, additional_patients: 5 } },
                { label: 'Doctor shortage (50%)', vals: { doctor_availability_percent: 50 } },
                { label: 'Mass casualty event', vals: { additional_emergencies: 30, additional_patients: 20, doctor_availability_percent: 70 } },
                { label: 'Long consultations', vals: { avg_consultation_duration: 30 } },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => setParams(p => ({ ...DEFAULT_PARAMS, ...s.vals }))}
                  className="btn btn-secondary btn-sm w-full justify-start text-left"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="md:col-span-2 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {!result && !loading && (
            <div className="card text-center py-16 text-slate-400">
              <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Configure parameters and click <strong>Run Simulation</strong> to see projections.</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 fade-in">
              {/* Alert cards */}
              <div className="emergency-alert">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-semibold text-red-800 text-sm">Simulation Results</div>
                    <div className="text-sm text-red-700 mt-1">{result.summary}</div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="font-medium text-red-700">Most Affected: {result.most_affected_department}</span>
                      <span className="font-medium text-red-700">Projected Bottleneck: {result.projected_bottleneck}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <ResultCard
                  label="Total Waiting" icon={Users}
                  current={result.current_state.total_waiting}
                  simulated={result.simulated_state.total_waiting}
                  worse={true}
                />
                <ResultCard
                  label="Avg Wait Time" icon={Clock} unit=" min"
                  current={result.current_state.average_wait_minutes}
                  simulated={result.simulated_state.average_wait_minutes}
                  worse={true}
                />
                <ResultCard
                  label="Emergency Cases" icon={AlertTriangle}
                  current={result.current_state.emergency_cases}
                  simulated={result.simulated_state.emergency_cases}
                  worse={true}
                />
                <ResultCard
                  label="Available Doctors" icon={Stethoscope}
                  current={result.current_state.available_doctors}
                  simulated={result.simulated_state.available_doctors}
                  worse={false}
                />
              </div>

              {/* Comparison Chart */}
              <div className="card">
                <h3 className="font-semibold text-slate-800 mb-4">Department Comparison: Current vs Simulated</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={result.comparison_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="current_waiting" fill="#3b82f6" name="Current Waiting" radius={[2,2,0,0]} />
                    <Bar dataKey="simulated_waiting" fill="#ef4444" name="Simulated Waiting" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Wait time comparison */}
              <div className="card">
                <h3 className="font-semibold text-slate-800 mb-4">Projected Wait Times (min)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={result.comparison_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="current_wait_min" fill="#14b8a6" name="Current Wait (min)" radius={[2,2,0,0]} />
                    <Bar dataKey="simulated_wait_min" fill="#f97316" name="Simulated Wait (min)" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
