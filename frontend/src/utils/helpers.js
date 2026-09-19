/**
 * Shared utility helpers
 */

export const PRIORITY_COLORS = {
  1: { badge: 'priority-1', text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300' },
  2: { badge: 'priority-2', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
  3: { badge: 'priority-3', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300' },
  4: { badge: 'priority-4', text: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300' },
  5: { badge: 'priority-5', text: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-200' },
};

export const CONGESTION_STYLES = {
  normal:     { badge: 'badge-green',  label: 'Normal',     dot: 'dot-green' },
  moderate:   { badge: 'badge-yellow', label: 'Moderate',   dot: 'dot-yellow' },
  bottleneck: { badge: 'badge-red',    label: 'Bottleneck', dot: 'dot-red' },
};

export const STATUS_STYLES = {
  waiting:    { badge: 'badge-blue',   label: 'Waiting',    dot: 'dot-blue' },
  consulting: { badge: 'badge-orange', label: 'Consulting', dot: 'dot-yellow' },
  completed:  { badge: 'badge-green',  label: 'Completed',  dot: 'dot-green' },
  queued:     { badge: 'badge-blue',   label: 'Queued',     dot: 'dot-blue' },
  called:     { badge: 'badge-yellow', label: 'Called',     dot: 'dot-yellow' },
};

export const DEPARTMENTS = [
  'Cardiology',
  'General Medicine',
  'Orthopaedics',
  'Paediatrics',
  'Emergency',
];

export const DOCTORS = [
  { id: 'D01', name: 'Dr. Sarah Mitchell',  department: 'Cardiology' },
  { id: 'D02', name: 'Dr. Raj Patel',       department: 'General Medicine' },
  { id: 'D03', name: 'Dr. Amelia Chen',     department: 'Orthopaedics' },
  { id: 'D04', name: 'Dr. Priya Sharma',    department: 'Paediatrics' },
  { id: 'D05', name: 'Dr. James Wilson',    department: 'Emergency' },
];

export const VISIT_TYPES = [
  'New Consultation',
  'Follow-up',
  'Report Review',
  'Emergency',
];

export function getDoctorsByDept(department) {
  return DOCTORS.filter(d => d.department === department);
}

export function getDeptIcon(dept) {
  const icons = {
    'Cardiology': '🫀',
    'General Medicine': '🏥',
    'Orthopaedics': '🦴',
    'Paediatrics': '👶',
    'Emergency': '🚨',
  };
  return icons[dept] || '🏥';
}

export function getDeptColor(dept) {
  const colors = {
    'Cardiology':       'bg-rose-50 border-rose-200 text-rose-700',
    'General Medicine': 'bg-blue-50 border-blue-200 text-blue-700',
    'Orthopaedics':     'bg-amber-50 border-amber-200 text-amber-700',
    'Paediatrics':      'bg-purple-50 border-purple-200 text-purple-700',
    'Emergency':        'bg-red-50 border-red-200 text-red-700',
  };
  return colors[dept] || 'bg-slate-50 border-slate-200 text-slate-700';
}

export function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function formatDuration(mins) {
  if (!mins) return '--';
  return `${mins} min`;
}
