import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCheck, AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react'
import { api } from '../services/api.js'
import { usePolling } from '../hooks/usePolling.js'

const TYPE_STYLES = {
  emergency: { icon: AlertTriangle, bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   dot: 'bg-red-500' },
  warning:   { icon: AlertTriangle, bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  success:   { icon: CheckCircle,   bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  dot: 'bg-green-500' },
  info:      { icon: Info,          bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   dot: 'bg-blue-400' },
}

export default function Notifications() {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifs = useCallback(async () => {
    try {
      const d = await api.getNotifications()
      setNotifs(d.notifications || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])
  usePolling(fetchNotifs, 8000)

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id)
      setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x))
    } catch { /* ignore */ }
  }

  const markAll = () => {
    notifs.forEach(n => !n.read && markRead(n.id))
  }

  const unread = notifs.filter(n => !n.read).length

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary-600" />
          <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
          {unread > 0 && (
            <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unread}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAll} className="btn btn-secondary btn-sm">
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <button onClick={fetchNotifs} className="btn btn-secondary btn-sm">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="card text-center py-12 text-slate-400">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => {
            const style = TYPE_STYLES[n.type] || TYPE_STYLES.info
            const Icon = style.icon
            return (
              <div
                key={n.id}
                className={`p-4 rounded-xl border cursor-pointer transition-opacity
                  ${n.read ? 'opacity-60' : ''}
                  ${style.bg} ${style.border}`}
                onClick={() => !n.read && markRead(n.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-slate-300' : style.dot}`} />
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.text}`} />
                  <div className="flex-1">
                    <p className={`text-sm ${style.text} leading-relaxed`}>{n.message}</p>
                    {n.token && (
                      <span className="text-xs text-slate-500 mt-1 inline-block">Token: {n.token}</span>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-slate-400">{n.timestamp}</div>
                    {!n.read && (
                      <div className="text-[10px] text-primary-500 mt-1 font-medium">Tap to read</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
