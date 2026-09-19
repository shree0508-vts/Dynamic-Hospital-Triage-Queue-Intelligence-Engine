import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Registration from './pages/Registration.jsx'
import DoctorDashboard from './pages/DoctorDashboard.jsx'
import PatientTracker from './pages/PatientTracker.jsx'
import Simulator from './pages/Simulator.jsx'
import Notifications from './pages/Notifications.jsx'
import DoctorReassignment from './pages/DoctorReassignment.jsx'
import AdminDoctorControl from './pages/AdminDoctorControl.jsx'
import AppLayout from './layouts/AppLayout.jsx'

function PrivateRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/track" element={<PatientTracker />} />
      <Route path="/reassign" element={<DoctorReassignment />} />

      <Route path="/" element={
        <PrivateRoute>
          <AppLayout />
        </PrivateRoute>
      }>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="register" element={
          <PrivateRoute roles={['receptionist']}>
            <Registration />
          </PrivateRoute>
        } />
        <Route path="doctor" element={
          <PrivateRoute roles={['doctor']}>
            <DoctorDashboard />
          </PrivateRoute>
        } />
        <Route path="simulator" element={
          <PrivateRoute roles={['receptionist']}>
            <Simulator />
          </PrivateRoute>
        } />
        <Route path="admin/doctors" element={
          <PrivateRoute roles={['receptionist']}>
            <AdminDoctorControl />
          </PrivateRoute>
        } />
        <Route path="notifications" element={<Notifications />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
