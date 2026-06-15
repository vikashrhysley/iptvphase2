/* ── Shared formatting & class-mapping helpers ──────────── */
export const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; }
};
export const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; }
};
export const shortId = (id) => (id ? `${String(id).slice(0, 8)}…` : '—');

export const STATUS_CLASS = {
  active:     'sb-active',
  trialing:   'sb-trialing',
  trial:      'sb-trialing',
  past_due:   'sb-past-due',
  paused:     'sb-paused',
  cancelled:  'sb-cancelled',
  canceled:   'sb-cancelled',
  expired:    'sb-expired',
  incomplete: 'sb-past-due',
  unpaid:     'sb-past-due',
};
export const statusClass = (s) => STATUS_CLASS[(s || '').toLowerCase()] || 'sb-unknown';

export const planClass = (p) => {
  const v = (p || '').toLowerCase();
  if (v.includes('trial'))   return 'sb-plan-trial';
  if (v.includes('life'))    return 'sb-plan-lifetime';
  if (v.includes('premium') || v.includes('pro')) return 'sb-plan-premium';
  return 'sb-plan-default';
};

export const STATUS_OPTIONS = [
  { value: '',          label: 'All Status' },
  { value: 'active',    label: 'Active' },
  { value: 'trialing',  label: 'Trialing' },
  { value: 'past_due',  label: 'Past Due' },
  { value: 'paused',    label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired',   label: 'Expired' },
];

export const PT_STATUS_CLASS = {
  succeeded:  'sdp-pt-success',
  success:    'sdp-pt-success',
  completed:  'sdp-pt-success',
  paid:       'sdp-pt-success',
  failed:     'sdp-pt-failed',
  declined:   'sdp-pt-failed',
  cancelled:  'sdp-pt-failed',
  canceled:   'sdp-pt-failed',
  pending:    'sdp-pt-pending',
  processing: 'sdp-pt-pending',
  refunded:   'sdp-pt-refunded',
};
export const ptStatusClass = (s) => PT_STATUS_CLASS[(s || '').toLowerCase()] || 'sdp-pt-unknown';
