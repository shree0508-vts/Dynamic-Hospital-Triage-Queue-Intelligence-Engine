/**
 * API Service Layer — All backend communication
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${BASE_URL}${path}`, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Request failed');
    }
    return res.json();
  } catch (e) {
    // Return graceful fallback so the app never crashes
    console.error(`[API] ${method} ${path} failed:`, e.message);
    throw e;
  }
}

export const api = {
  // Dashboard
  getDashboard: () => request('GET', '/dashboard'),
  getDepartments: () => request('GET', '/departments'),

  // Patients
  getPatients: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/patients${qs ? '?' + qs : ''}`);
  },
  getPatient: (id) => request('GET', `/patients/${id}`),
  registerPatient: (data) => request('POST', '/patients', data),

  // Tokens
  getToken: (token) => request('GET', `/tokens/${token}`),

  // Queue
  getQueue: (department = null) => {
    const qs = department ? `?department=${encodeURIComponent(department)}` : '';
    return request('GET', `/queue${qs}`);
  },
  recalculateQueue: () => request('POST', '/queue/recalculate'),

  // Emergency
  addEmergency: (data) => request('POST', '/emergency', data),

  // Consultation
  startConsultation: (token, doctor_id) =>
    request('POST', '/consultation/start', { token, doctor_id }),
  extendConsultation: (token, extra_minutes) =>
    request('POST', '/consultation/extend', { token, extra_minutes }),
  completeConsultation: (token, actual_duration) =>
    request('POST', '/consultation/complete', { token, actual_duration }),

  // ML Prediction
  predict: (data) => request('POST', '/prediction', data),

  // Simulation
  runSimulation: (data) => request('POST', '/simulation', data),

  // Doctors
  getDoctors: (department = null) => {
    const qs = department ? `?department=${encodeURIComponent(department)}` : '';
    return request('GET', `/doctors${qs}`);
  },
  getDoctorQueue: (doctorId) => request('GET', `/doctors/${doctorId}/queue`),

  // Notifications
  getNotifications: () => request('GET', '/notifications'),
  markNotificationRead: (id) => request('POST', `/notifications/${id}/read`),
};
