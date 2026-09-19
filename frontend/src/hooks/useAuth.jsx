/**
 * Auth Context — mock authentication for 3 demo roles
 */
import { createContext, useContext, useState } from 'react';

const DEMO_USERS = {
  'receptionist@hospital.com': {
    password: 'demo1234',
    role: 'receptionist',
    name: 'Alex Thompson',
    department: null,
  },
  'doctor@hospital.com': {
    password: 'demo1234',
    role: 'doctor',
    name: 'Dr. Sarah Mitchell',
    department: 'Cardiology',
    doctorId: 'D01',
  },
  'patient@hospital.com': {
    password: 'demo1234',
    role: 'patient',
    name: 'Maria Santos',
    token: 'C04',
  },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  const login = (email, password, role) => {
    // Allow role-based quick login
    const quickLogins = {
      receptionist: { email: 'receptionist@hospital.com', password: 'demo1234' },
      doctor:       { email: 'doctor@hospital.com',       password: 'demo1234' },
      patient:      { email: 'patient@hospital.com',      password: 'demo1234' },
    };

    const creds = quickLogins[role] || { email, password };
    const u = DEMO_USERS[creds.email];

    if (u && u.password === creds.password) {
      setUser({ ...u, email: creds.email });
      setError('');
      return true;
    }
    setError('Invalid credentials. Try the quick login buttons below.');
    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
