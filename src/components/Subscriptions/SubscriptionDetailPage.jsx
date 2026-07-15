import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSubscriptionDetail, fetchSubscriptionHistory, clearSubscriptionDetail, updateSubscription, clearUpdateState, cancelSubscription, clearCancelState, extendTrial, clearExtendState } from '../../store/slices/subscriptionsSlice';
import { fmtDateTime, shortId, statusClass, planClass, ptStatusClass } from './subscriptionsHelpers';
import './SubscriptionsPage.css';
import './SubscriptionDetailPage.css';

/* ── Icons ─────────────────────────────────────────────── */
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const EditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const XIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const BanIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const ClockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16.5 14.5"/></svg>;

/* ── Detail Field ───────────────────────────────────────── */
function InfoField({ label, value, mono, full }) {
  return (
    <div className={`sdp-field${full ? ' sdp-field-full' : ''}`}>
      <span className="sdp-field-lbl">{label}</span>
      <span className={`sdp-field-val${mono ? ' sb-mono' : ''}`}>{value === null || value === undefined || value === '' ? '—' : value}</span>
    </div>
  );
}

/* ── Update Subscription Modal ───────────────────────────── */
const toDatetimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function UpdateSubscriptionModal({ sub, onClose }) {
  const dispatch = useDispatch();
  const { updateLoading, updateError, updateSuccess } = useSelector((s) => s.subscriptions);

  const [form, setForm] = useState({
    auto_renew:      !!sub.auto_renew,
    billing_cycle:   sub.billing_cycle || '',
    cancel_reason:   sub.cancel_reason || '',
    next_billing_at: toDatetimeLocal(sub.next_billing_at),
    reason:          '',
  });
  const [localError, setLocalError] = useState('');

  const set = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }));
    setLocalError('');
    if (updateError) dispatch(clearUpdateState());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.reason.trim()) { setLocalError('Reason is required for the audit log.'); return; }

    const payload = {};
    if (form.auto_renew !== !!sub.auto_renew) payload.auto_renew = form.auto_renew;
    if (form.billing_cycle.trim() !== (sub.billing_cycle || '')) payload.billing_cycle = form.billing_cycle.trim();
    if (form.cancel_reason.trim() !== (sub.cancel_reason || '')) payload.cancel_reason = form.cancel_reason.trim();
    if (form.next_billing_at !== toDatetimeLocal(sub.next_billing_at)) {
      payload.next_billing_at = form.next_billing_at ? new Date(form.next_billing_at).toISOString() : null;
    }

    if (Object.keys(payload).length === 0) { setLocalError('Change at least one field before saving.'); return; }

    payload.reason = form.reason.trim();
    dispatch(clearUpdateState());
    dispatch(updateSubscription({ id: sub.id, data: payload }));
  };

  return (
    <div className="sdp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sdp-modal" onSubmit={handleSubmit}>
        <div className="sdp-modal-header">
          <div className="sdp-modal-title"><EditIcon /> Update Subscription</div>
          <button type="button" className="sdp-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <p className="sdp-modal-sub">Changes are applied immediately and written to the audit log.</p>

        <div className="sdp-modal-grid">
          <label className="sdp-modal-field">
            <span>Auto-Renew</span>
            <select value={form.auto_renew ? 'yes' : 'no'} onChange={(e) => set('auto_renew', e.target.value === 'yes')} disabled={updateLoading}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>

          <label className="sdp-modal-field">
            <span>Billing Cycle</span>
            <input value={form.billing_cycle} onChange={(e) => set('billing_cycle', e.target.value)}
              placeholder="monthly / yearly" disabled={updateLoading} />
          </label>

          <label className="sdp-modal-field">
            <span>Next Billing At</span>
            <input type="datetime-local" value={form.next_billing_at}
              onChange={(e) => set('next_billing_at', e.target.value)} disabled={updateLoading} />
          </label>

          <label className="sdp-modal-field sdp-field-full">
            <span>Cancel Reason</span>
            <textarea value={form.cancel_reason} onChange={(e) => set('cancel_reason', e.target.value)}
              placeholder="Reason shown if this subscription is cancelled…" rows={2} disabled={updateLoading} />
          </label>

          <label className="sdp-modal-field sdp-field-full">
            <span>Reason <span className="sdp-required">*</span></span>
            <textarea value={form.reason} onChange={(e) => set('reason', e.target.value)}
              placeholder="Describe why this change is being made…" rows={3} disabled={updateLoading} />
          </label>
        </div>

        {(localError || updateError) && (
          <div className="sdp-modal-error">{localError || updateError}</div>
        )}
        {updateSuccess && (
          <div className="sdp-modal-success"><CheckIcon /> Subscription updated successfully.</div>
        )}

        <div className="sdp-modal-actions">
          <button type="button" className="sdp-btn-cancel" onClick={onClose} disabled={updateLoading}>Cancel</button>
          <button type="submit" className="sdp-btn-save" disabled={updateLoading || updateSuccess}>
            {updateLoading ? <span className="sdp-mini-spin" /> : <EditIcon />}
            {updateLoading ? 'Saving…' : updateSuccess ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}


function CancelSubscriptionModal({ sub, onClose }) {
  const dispatch = useDispatch();
  const { cancelLoading, cancelError, cancelSuccess } = useSelector((s) => s.subscriptions);
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState('');

  const handleConfirm = (e) => {
    e.preventDefault();
    if (!reason.trim()) { setLocalError('Reason is required for the audit log.'); return; }
    dispatch(clearCancelState());
    dispatch(cancelSubscription({ id: sub.id, reason: reason.trim() }));
  };

  return (
    <div className="sdp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sdp-modal" onSubmit={handleConfirm}>
        <div className="sdp-modal-header">
          <div className="sdp-modal-title sdp-modal-title-danger"><BanIcon /> Cancel Subscription</div>
          <button type="button" className="sdp-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <p className="sdp-modal-sub">
          This will immediately cancel the subscription for <strong>{sub.user_email || 'this user'}</strong> and turn off auto-renewal.
          This action cannot be undone and is written to the audit log.
        </p>

        <div className="sdp-modal-grid">
          <label className="sdp-modal-field sdp-field-full">
            <span>Cancellation Reason <span className="sdp-required">*</span></span>
            <textarea value={reason} onChange={(e) => {
              setReason(e.target.value);
              setLocalError('');
              if (cancelError) dispatch(clearCancelState());
            }} placeholder="Describe why this subscription is being cancelled…" rows={3} disabled={cancelLoading} />
          </label>
        </div>

        {(localError || cancelError) && (
          <div className="sdp-modal-error">{localError || cancelError}</div>
        )}
        {cancelSuccess && (
          <div className="sdp-modal-success"><CheckIcon /> Subscription cancelled successfully.</div>
        )}

        <div className="sdp-modal-actions">
          <button type="button" className="sdp-btn-cancel" onClick={onClose} disabled={cancelLoading}>
            {cancelSuccess ? 'Close' : 'Back'}
          </button>
          <button type="submit" className="sdp-btn-danger" disabled={cancelLoading || cancelSuccess}>
            {cancelLoading ? <span className="sdp-mini-spin" /> : <BanIcon />}
            {cancelLoading ? 'Cancelling…' : cancelSuccess ? 'Cancelled' : 'Confirm Cancellation'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Extend Trial Modal ───────────────────────────────────── */
function ExtendTrialModal({ sub, onClose }) {
  const dispatch = useDispatch();
  const { extendLoading, extendError, extendSuccess, extendedDaysRemaining } = useSelector((s) => s.subscriptions);
  const [extendDays, setExtendDays] = useState(7);
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState('');

  const set = (setter) => (val) => {
    setter(val);
    setLocalError('');
    if (extendError) dispatch(clearExtendState());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!extendDays || Number(extendDays) <= 0) { setLocalError('Enter a number of days greater than 0.'); return; }
    if (!reason.trim()) { setLocalError('Reason is required for the audit log.'); return; }
    dispatch(clearExtendState());
    dispatch(extendTrial({ id: sub.id, extendDays: Number(extendDays), reason: reason.trim() }));
  };

  return (
    <div className="sdp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sdp-modal" onSubmit={handleSubmit}>
        <div className="sdp-modal-header">
          <div className="sdp-modal-title"><ClockIcon /> Extend Trial</div>
          <button type="button" className="sdp-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <p className="sdp-modal-sub">Add extra days to this subscriber's trial period. Changes are applied immediately and written to the audit log.</p>

        <div className="sdp-modal-grid">
          <label className="sdp-modal-field">
            <span>Extend By (days)</span>
            <input type="number" min={1} value={extendDays}
              onChange={(e) => set(setExtendDays)(e.target.value)} disabled={extendLoading} />
          </label>

          <label className="sdp-modal-field sdp-field-full">
            <span>Reason <span className="sdp-required">*</span></span>
            <textarea value={reason} onChange={(e) => set(setReason)(e.target.value)}
              placeholder="Describe why this trial is being extended…" rows={3} disabled={extendLoading} />
          </label>
        </div>

        {(localError || extendError) && (
          <div className="sdp-modal-error">{localError || extendError}</div>
        )}
        {extendSuccess && (
          <div className="sdp-modal-success">
            <CheckIcon /> Trial extended successfully{extendedDaysRemaining != null ? ` — ${extendedDaysRemaining} day${extendedDaysRemaining === 1 ? '' : 's'} remaining` : ''}.
          </div>
        )}

        <div className="sdp-modal-actions">
          <button type="button" className="sdp-btn-cancel" onClick={onClose} disabled={extendLoading}>
            {extendSuccess ? 'Close' : 'Cancel'}
          </button>
          <button type="submit" className="sdp-btn-save" disabled={extendLoading || extendSuccess}>
            {extendLoading ? <span className="sdp-mini-spin" /> : <ClockIcon />}
            {extendLoading ? 'Extending…' : extendSuccess ? 'Extended' : 'Extend Trial'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */
export default function SubscriptionDetailPage({ subscriptionId, onBack }) {
  const dispatch = useDispatch();
  const { selectedSubscription: sub, detailLoading, detailError, history, historyLoading, historyError } = useSelector((s) => s.subscriptions);
  const [activeTab, setActiveTab] = useState('detail');
  const [showEdit, setShowEdit] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const transactions = sub?.payment_transactions || [];

  useEffect(() => {
    dispatch(fetchSubscriptionDetail(subscriptionId));
    dispatch(fetchSubscriptionHistory(subscriptionId));
    return () => dispatch(clearSubscriptionDetail());
  }, [dispatch, subscriptionId]);

  const handleCloseEdit = () => {
    dispatch(clearUpdateState());
    setShowEdit(false);
  };

  const handleCloseCancel = () => {
    dispatch(clearCancelState());
    setShowCancel(false);
  };

  const handleCloseExtend = () => {
    dispatch(clearExtendState());
    setShowExtend(false);
  };

  const isCancellable = sub && !['cancelled', 'canceled', 'expired'].includes((sub.status || '').toLowerCase());
  const isTrial = sub && ((sub.status || '').toLowerCase().includes('trial') || (sub.plan_type || '').toLowerCase().includes('trial'));

  return (
    <div className="sdp-page">
      <div className="sdp-topbar">
        <button className="sdp-back-btn" onClick={onBack}><BackIcon /> Back to Subscriptions</button>
        {sub && (
          <div className="sdp-topbar-actions">
            <button className="sdp-edit-btn" onClick={() => setShowEdit(true)}><EditIcon /> Update Subscription</button>
            {isTrial && (
              <button className="sdp-extend-btn" onClick={() => setShowExtend(true)}><ClockIcon /> Extend Trial</button>
            )}
            {isCancellable && (
              <button className="sdp-cancel-sub-btn" onClick={() => setShowCancel(true)}><BanIcon /> Cancel Subscription</button>
            )}
          </div>
        )}
      </div>

      <div className="sdp-tabs">
        <button className={`sdp-tab${activeTab === 'detail' ? ' active' : ''}`} onClick={() => setActiveTab('detail')}>Subscription Detail</button>
        <button className={`sdp-tab${activeTab === 'history' ? ' active' : ''}`} onClick={() => setActiveTab('history')}>Status History</button>
      </div>

      {detailLoading && (
        <div className="sdp-loading">
          <span className="sdp-spinner" />
          <span>Loading subscription…</span>
        </div>
      )}

      {detailError && !detailLoading && (
        <div className="sdp-error">{detailError}</div>
      )}

      {sub && !detailLoading && !detailError && (
        <>
          <div className="sdp-summary">
            <span className={`sb-status-pill ${statusClass(sub.status)}`}>{sub.status || '—'}</span>
            <span className={`sb-plan-pill ${planClass(sub.plan_type)}`}>{sub.plan_name || sub.plan_type || '—'}</span>
            <span className="sdp-summary-amount">{sub.amount_display ?? '—'} {sub.currency || ''}</span>
          </div>

          {activeTab === 'detail' && (
            <div className="sdp-cards">
              <div className="sdp-section sdp-section-full">
                <div className="sdp-sect-title">Subscriber</div>
                <div className="sdp-grid">
                  <InfoField label="User Email" value={sub.user_email} full />
                  <InfoField label="User ID" value={sub.user_id} mono />
                  <InfoField label="Device ID" value={sub.device_id} mono />
                  <InfoField label="Subscription ID" value={sub.id} mono />
                </div>
              </div>

              <div className="sdp-section">
                <div className="sdp-sect-title">Plan & Billing</div>
                <div className="sdp-grid">
                  <InfoField label="Plan Name" value={sub.plan_name} />
                  <InfoField label="Plan Type" value={sub.plan_type} />
                  <InfoField label="Billing Cycle" value={sub.billing_cycle} />
                  <InfoField label="Amount" value={sub.amount_display != null ? `${sub.amount_display} ${sub.currency || ''}`.trim() : null} />
                  <InfoField label="Auto-Renew" value={sub.auto_renew ? 'Yes' : 'No'} />
                  <InfoField label="Status" value={sub.status} />
                </div>
              </div>

              <div className="sdp-section">
                <div className="sdp-sect-title">Period & Lifecycle</div>
                <div className="sdp-grid">
                  <InfoField label="Current Period Start" value={fmtDateTime(sub.current_period_start)} />
                  <InfoField label="Current Period End" value={fmtDateTime(sub.current_period_end)} />
                  <InfoField label="Next Billing" value={fmtDateTime(sub.next_billing_at)} />
                  <InfoField label="Trial Ends" value={fmtDateTime(sub.trial_end_at)} />
                  <InfoField label="Last Payment" value={fmtDateTime(sub.last_payment_at)} />
                  <InfoField label="Cancelled At" value={fmtDateTime(sub.cancelled_at)} />
                  <InfoField label="Created At" value={fmtDateTime(sub.created_at)} />
                </div>
              </div>

              <div className="sdp-section sdp-section-full">
                <div className="sdp-sect-title">Payment Transactions</div>
                {transactions.length ? (
                  <div className="sdp-pt-table-wrap">
                    <table className="sdp-pt-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Gateway</th>
                          <th>Attempt</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((pt) => (
                          <tr key={pt.id}>
                            <td className="sb-mono">{shortId(pt.id)}</td>
                            <td>{pt.amount_display ?? '—'}</td>
                            <td><span className={`sdp-pt-pill ${ptStatusClass(pt.status)}`}>{pt.status || '—'}</span></td>
                            <td>{pt.payment_gateway || '—'}</td>
                            <td className="sb-center">{pt.attempt_number ?? '—'}</td>
                            <td className="sb-nowrap sb-muted">{fmtDateTime(pt.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="sdp-empty">No payment transactions recorded.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="sdp-section sdp-section-full">
              <div className="sdp-sect-title">Status History</div>
              {historyLoading ? (
                <div className="sdp-empty">Loading history…</div>
              ) : historyError ? (
                <div className="sdp-error">{historyError}</div>
              ) : history.length ? (
                <div className="sdp-history-list">
                  {history.map((h, i) => (
                    <div className="sdp-history-row" key={i}>
                      <div className="sdp-history-dot" />
                      <div className="sdp-history-body">
                        <div className="sdp-history-transition">
                          <span className={`sb-status-pill ${statusClass(h.previous_status)}`}>{h.previous_status || '—'}</span>
                          <span className="sdp-history-arrow">→</span>
                          <span className={`sb-status-pill ${statusClass(h.new_status)}`}>{h.new_status || '—'}</span>
                        </div>
                        {h.change_reason && <div className="sdp-history-reason">{h.change_reason}</div>}
                        <div className="sdp-history-ts">{fmtDateTime(h.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sdp-empty">No status changes recorded.</div>
              )}
            </div>
          )}
        </>
      )}

      {showEdit && sub && (
        <UpdateSubscriptionModal sub={sub} onClose={handleCloseEdit} />
      )}

      {showCancel && sub && (
        <CancelSubscriptionModal sub={sub} onClose={handleCloseCancel} />
      )}

      {showExtend && sub && (
        <ExtendTrialModal sub={sub} onClose={handleCloseExtend} />
      )}

    </div>
  );
}
