// src/components/Trial/TrialPage.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTrialConfig, updateTrialConfig, clearToast } from '../../store/slices/trialSlice';
import './TrialPage.css';

const buildForm = (cfg) => ({
  trial_period_days:      cfg.trial_duration_days    ?? cfg.trial_period_days  ?? cfg.trial_days           ?? cfg.trialPeriodDays ?? 14,
  grace_period_days:      cfg.grace_period_days      ?? cfg.grace_days         ?? cfg.gracePeriodDays      ?? 7,
  max_trial_extensions:   cfg.max_devices_per_trial  ?? cfg.max_trial_extensions ?? cfg.maxExtensions      ?? cfg.max_extensions  ?? 1,
  extension_days:         cfg.extension_days         ?? cfg.extensionDays      ?? 7,
  auto_convert:           cfg.auto_convert           ?? cfg.autoConvert        ?? false,
  notify_before_days:     cfg.notify_before_days     ?? cfg.notifyBeforeDays   ?? 3,
});

// ── Icons ─────────────────────────────────────────────────
const SaveIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const RefreshIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
const PlusIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const MinusIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const LockIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

// ── Toast ─────────────────────────────────────────────────
function Toast() {
  const dispatch = useDispatch();
  const { toast } = useSelector(s => s.trial);
  useEffect(() => {
    if (toast) { const t = setTimeout(() => dispatch(clearToast()), 3500); return () => clearTimeout(t); }
  }, [toast, dispatch]);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type === 'success' ? 'success' : 'error'}`}>
      {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────
function InfoField({ label, value }) {
  return (
    <div className="tp-info-field">
      <span className="tp-info-label">{label}</span>
      <span className="tp-info-value">{value ?? '—'}</span>
    </div>
  );
}

// ── Day stepper ───────────────────────────────────────────
function DayStepper({ label, value, onChange, min = 0, max = 365, disabled, description }) {
  return (
    <div className="tp-stepper-wrap">
      <div className="tp-stepper-label">{label}</div>
      {description && <div className="tp-stepper-desc">{description}</div>}
      <div className="tp-stepper">
        <button className="tp-step-btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={disabled || value <= min}>
          <MinusIcon />
        </button>
        <div className="tp-step-display">
          <input
            className="tp-step-input"
            type="number"
            min={min} max={max}
            value={value}
            disabled={disabled}
            onChange={e => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= min && v <= max) onChange(v);
            }}
          />
          <span className="tp-step-unit">days</span>
        </div>
        <button className="tp-step-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled || value >= max}>
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function TrialPage() {
  const dispatch = useDispatch();
  const { config, loading, saving, error } = useSelector(s => s.trial);
  const { user: me } = useSelector(s => s.auth);
  const isSuperAdmin = me?.role === 'superadmin';

  const [formDraft, setFormDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const form = formDraft || (config ? buildForm(config) : null);

  useEffect(() => { dispatch(fetchTrialConfig()); }, [dispatch]);

  const handleChange = (key, val) => {
    setFormDraft(f => ({ ...(f || form || {}), [key]: val }));
    setDirty(true);
  };

  const handleSave = () => {
    if (!form) return;
    const currentConfig = config ? buildForm(config) : null;
    dispatch(updateTrialConfig({
      data: form,
      previousConfig: currentConfig,
    }));
    setDirty(false);
  };

  const handleReset = () => {
    setFormDraft(null);
    setDirty(false);
  };

  return (
    <div className="trial-page">
      <Toast />

      {/* Header */}
      <div className="tp-page-header">
        <div>
          <h1 className="tp-page-title">Trial & Grace Policies</h1>
          <p className="tp-page-sub">Configure trial period duration and grace period settings for new licenses.</p>
        </div>
        {isSuperAdmin && (
          <div className="tp-header-actions">
            {dirty && (
              <button className="tp-btn tp-btn-ghost" onClick={handleReset}>Reset</button>
            )}
            <button className="tp-btn tp-btn-save" onClick={handleSave}
              disabled={saving || !dirty}>
              {saving ? <span className="tp-spinner" /> : <><SaveIcon /> Save Changes</>}
            </button>
          </div>
        )}
      </div>

      {/* Read-only notice for non-superadmin */}
      {!isSuperAdmin && (
        <div className="tp-readonly-notice">
          <LockIcon />
          You have read-only access. Only Super Admins can modify trial & grace policies.
        </div>
      )}

      {loading ? (
        <div className="tp-loading"><div className="tp-loader" /> Loading policy configuration…</div>
      ) : error ? (
        <div className="tp-error">
          <span>⚠️ {error}</span>
          <button className="tp-btn tp-btn-ghost" onClick={() => dispatch(fetchTrialConfig())}>
            <RefreshIcon /> Retry
          </button>
        </div>
      ) : !form ? null : (
        <>
          {/* Current config display */}
          <div className="tp-section">
            <div className="tp-section-title">📋 Current Configuration</div>
            <div className="tp-info-grid">
              <InfoField label="Trial Period"       value={`${form.trial_period_days} days`} />
              <InfoField label="Grace Period"       value={`${form.grace_period_days} days`} />
              <InfoField label="Max Extensions"     value={form.max_trial_extensions} />
              <InfoField label="Extension Length"   value={`${form.extension_days} days`} />
              <InfoField label="Notify Before"      value={`${form.notify_before_days} days before expiry`} />
              <InfoField label="Auto Convert"       value={form.auto_convert ? '✓ Enabled' : '✗ Disabled'} />
            </div>
          </div>

          {/* Trial settings */}
          <div className="tp-section">
            <div className="tp-section-title">⏱️ Trial Period Settings</div>
            <div className="tp-stepper-grid">
              <DayStepper
                label="Trial Period Duration"
                description="Number of days a new user gets for free trial access."
                value={form.trial_period_days}
                onChange={v => handleChange('trial_period_days', v)}
                min={1} max={90}
                disabled={!isSuperAdmin}
              />
              <DayStepper
                label="Extension Length"
                description="Days added when a trial is extended."
                value={form.extension_days}
                onChange={v => handleChange('extension_days', v)}
                min={1} max={60}
                disabled={!isSuperAdmin}
              />
              <DayStepper
                label="Max Trial Extensions"
                description="Maximum number of times a trial can be extended."
                value={form.max_trial_extensions}
                onChange={v => handleChange('max_trial_extensions', v)}
                min={0} max={10}
                disabled={!isSuperAdmin}
              />
              <DayStepper
                label="Notify Before Expiry"
                description="Days before expiry to send reminder notification."
                value={form.notify_before_days}
                onChange={v => handleChange('notify_before_days', v)}
                min={1} max={30}
                disabled={!isSuperAdmin}
              />
            </div>
          </div>

          {/* Grace period */}
          <div className="tp-section">
            <div className="tp-section-title">🛡️ Grace Period Settings</div>
            <div className="tp-stepper-grid">
              <DayStepper
                label="Grace Period Duration"
                description="Days after trial expiry before access is fully revoked."
                value={form.grace_period_days}
                onChange={v => handleChange('grace_period_days', v)}
                min={0} max={30}
                disabled={!isSuperAdmin}
              />
            </div>
            {/* Auto convert toggle */}
            {isSuperAdmin && (
              <div className="tp-toggle-row">
                <div>
                  <div className="tp-toggle-label">Auto-Convert After Trial</div>
                  <div className="tp-toggle-desc">Automatically convert trial accounts to paid plans when trial ends.</div>
                </div>
                <button
                  className={`tp-toggle ${form.auto_convert ? 'on' : 'off'}`}
                  onClick={() => handleChange('auto_convert', !form.auto_convert)}
                >
                  <span className="tp-toggle-knob" />
                </button>
              </div>
            )}
          </div>

        </>
      )}
    </div>
  );
}
