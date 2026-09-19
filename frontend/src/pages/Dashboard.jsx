import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts'
import {
  Users, Clock, Activity, AlertTriangle, UserCheck, Stethoscope,
  RefreshCw, ChevronRight, Bell, TrendingUp, AlertCircle
} from 'lucide-react'
import { api } from '../services/api.js'
import { usePolling } from '../hooks/usePolling.js'
import { CONGESTION_STYLES, getDeptIcon, getDeptColor } from '../utils/helpers.js'

const DEPT_ICONS = { Cardiology: '🫀', 'General Medicine': '🏥', Orthopaedics: '🦴', Paediatrics: '👶', Emergency: '🚨' }

function KPICard({ icon: Icon, label, value, sub, color = 'text-primary-600', bgColor = 'bg-primary-50' }) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bgColor}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <div className="mt-2">
        <div className="kpi-value">{value ?? '--'}</div>
        <div className="kpi-label">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function DeptCard({ dept }) {
  const cong = CONGESTION_STYLES[dept.congestion_level] || CONGESTION_STYLES.normal
  return (
    <div className="card-hover p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{DEPT_ICONS[dept.department] || '🏥'}</span>
          <div>
            <div className="font-semibold text-sm text-slate-900">{dept.department}</div>
            <div className="text-xs text-slate-500">
              {dept.doctor_status === 'consulting' ? 'In session' : dept.doctor_status === 'available' ? 'Doctor available' : 'Unavailable'}
            </div>
          </div>
        </div>
        <span className={`badge ${cong.badge}`}>
          <span className={cong.dot}></span>
          {cong.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-base font-bold text-slate-900">{dept.current_token || '—'}</div>
          <div className="text-[10px] text-slate-500">Current</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-base font-bold text-slate-900">{dept.waiting_count}</div>
          <div className="text-[10px] text-slate-500">Waiting</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-base font-bold text-slate-900">{dept.estimated_wait_minutes}m</div>
          <div className="text-[10px] text-slate-500">Est. Wait</div>
        </div>
      </div>
    </div>
  )
}

function ActivityFeed({ items }) {
  const typeColors = {
    success:   'bg-green-500',
    warning:   'bg-yellow-400',
    emergency: 'bg-red-500',
    info:      'bg-blue-400',
  }
  return (
    <div className="space-y-2 custom-scroll overflow-y-auto max-h-72">
      {items.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No activity yet.</p>}
      {items.map((a) => (
        <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${typeColors[a.type] || 'bg-slate-300'}`} />
          <div className="flex-1">
            <p className="text-xs text-slate-700 leading-relaxed">{a.message}</p>
          </div>
          <span className="text-[10px] text-slate-400 flex-shrink-0">{a.timestamp}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const d = await api.getDashboard()
      setData(d)
      setLastUpdated(new Date().toLocaleTimeString())
      setError(null)
    } catch (e) {
      setError('Could not connect to backend. Showing cached data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  usePolling(fetchData, 6000)

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="text-sm">Loading dashboard…</span>
      </div>
    </div>
  )

  const kpis = data ? [
    { icon: Users,         label: 'Total Patients Today',  value: data.total_patients_today,  bgColor: 'bg-blue-50',   color: 'text-blue-600' },
    { icon: Clock,         label: 'Currently Waiting',     value: data.currently_waiting,     bgColor: 'bg-yellow-50', color: 'text-yellow-600' },
    { icon: Activity,      label: 'Active Consultations',  value: data.active_consultations,  bgColor: 'bg-green-50',  color: 'text-green-600' },
    { icon: AlertTriangle, label: 'Emergency Cases',       value: data.emergency_cases,       bgColor: 'bg-red-50',    color: 'text-red-600' },
    { icon: TrendingUp,    label: 'Avg Waiting Time',      value: `${data.average_waiting_time}m`, bgColor: 'bg-purple-50', color: 'text-purple-600' },
    { icon: UserCheck,     label: 'Available Doctors',     value: data.available_doctors,     bgColor: 'bg-teal-50',   color: 'text-teal-600' },
  ] : []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hospital Command Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time patient flow overview</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-soft"></span>
              Updated {lastUpdated}
            </span>
          )}
          <button onClick={fetchData} className="btn btn-secondary btn-sm">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map(k => <KPICard key={k.label} {...k} />)}
        </div>
      )}

      {/* Department Cards */}
      {data?.departments && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Department Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {data.departments.map(d => <DeptCard key={d.department} dept={d} />)}
          </div>
        </div>
      )}

      {/* Charts row */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Arrivals over time */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Patient Arrivals (Today)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.arrivals_over_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} name="Patients" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Avg waiting time */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Avg Waiting Time (min)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.waiting_time_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avg_wait" stroke="#f97316" strokeWidth={2} dot={false} name="Avg Wait (min)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Department congestion */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Department Congestion</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.department_congestion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="department" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip />
                <Bar dataKey="waiting" fill="#3b82f6" radius={[0,4,4,0]} name="Waiting" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Doctor workload */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Doctor Workload (Patients Seen)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.doctor_workload}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="doctor" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="patients_seen" fill="#14b8a6" radius={[4,4,0,0]} name="Patients seen" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Activity feed */}
      {data && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Real-Time Activity
            </h3>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-soft" />
              Live
            </span>
          </div>
          <ActivityFeed items={data.recent_activity || []} />
        </div>
      )}
    </div>
  )
}
