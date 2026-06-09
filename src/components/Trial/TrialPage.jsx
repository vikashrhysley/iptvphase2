// src/components/Trial/TrialPage.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTrialConfig, updateTrialConfig,
  fetchSystemConfig, updateSystemConfigKey,
  clearToast,
} from '../../store/slices/trialSlice';
import './TrialPage.css';

const buildForm = (cfg) => {
  const ts = cfg.trial_settings || cfg;
  const gs = cfg.grace_settings || cfg;
  const dl = cfg.device_limits  || cfg;
  return {
    trial_duration_days:   ts.trial_duration_days  ?? ts.trial_period_days    ?? 14,
    grace_period_days:     gs.grace_period_days    ?? cfg.grace_period_days   ?? 7,
    max_trial_extensions:  ts.max_trial_extensions ?? cfg.max_trial_extensions ?? 1,
    trial_extension_days:  ts.trial_extension_days ?? cfg.extension_days       ?? 7,
    trial_reminder_days:   ts.trial_reminder_days  ?? cfg.notify_before_days   ?? 3,
    trial_auto_convert:    ts.trial_auto_convert   ?? cfg.auto_convert         ?? false,
    max_devices_per_trial: dl.max_devices_per_trial ?? cfg.max_devices_per_trial ?? 1,
    device_limit_policy:   dl.device_limit_policy  ?? cfg.device_limit_policy  ?? 'hard_block',
  };
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
};

// ── Icons ─────────────────────────────────────────────────
const SaveIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const RefreshIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
const PlusIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const MinusIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const LockIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const EditIcon    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const ShieldIcon  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

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

// ── Info field ────────────────────────────────────────────
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

// ── System Config row with inline edit ───────────────────
function SysConfigRow({ item, isSaving, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value,   setValue]   = useState(item.is_sensitive ? '' : (item.value || ''));
  const [note,    setNote]    = useState('');

  const cancel = () => {
    setEditing(false);
    setValue(item.is_sensitive ? '' : (item.value || ''));
    setNote('');
  };

  const submit = (e) => {
    e.preventDefault();
    onSave(item.key, value, note);
    setEditing(false);
    setNote('');
  };

  return (
    <>
      <tr className={`tp-sysrow${editing ? ' editing' : ''}`}>
        <td className="tp-sc-key">{item.key}</td>
        <td>
          {item.is_sensitive
            ? <span className="tp-sc-masked"><ShieldIcon /> ***</span>
            : <span className="tp-sc-val">{item.value || '—'}</span>}
        </td>
        <td className="tp-sc-desc">{item.description || '—'}</td>
        <td className="tp-sc-meta">{item.updated_by_email || '—'}</td>
        <td className="tp-sc-meta tp-sc-nowrap">{fmtDate(item.updated_at)}</td>
        <td>
          {!editing && (
            <button className="tp-sc-edit-btn" onClick={() => setEditing(true)} disabled={isSaving} title="Edit">
              <EditIcon /> Edit
            </button>
          )}
        </td>
      </tr>
      {editing && (
        <tr className="tp-sysrow-edit">
          <td colSpan={6}>
            <form className="tp-sc-edit-form" onSubmit={submit}>
              <div className="tp-sc-edit-fields">
                <div className="tp-sc-edit-group">
                  <label className="tp-sc-edit-label">
                    New Value
                    {item.is_sensitive && <span className="tp-sc-sensitive-note"> (sensitive — enter new value)</span>}
                  </label>
                  <input
                    className="tp-sc-edit-input"
                    type="text"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder={item.is_sensitive ? 'Enter new value…' : `Current: ${item.value}`}
                    autoFocus
                    disabled={isSaving}
                  />
                </div>
                <div className="tp-sc-edit-group">
                  <label className="tp-sc-edit-label">
                    Change Note <span className="tp-sc-opt">(optional)</span>
                  </label>
                  <input
                    className="tp-sc-edit-input"
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Reason for this change…"
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="tp-sc-edit-actions">
                <button type="button" className="tp-sc-cancel-btn" onClick={cancel} disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" className="tp-sc-save-btn" disabled={isSaving || !String(value).trim()}>
                  {isSaving ? <span className="tp-spinner" /> : <SaveIcon />}
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

// ── System Config Panel ───────────────────────────────────
function SystemConfigPanel() {
  const dispatch = useDispatch();
  const { systemConfig, systemConfigLoading, systemConfigError, systemConfigSaving } = useSelector(s => s.trial);
  const { user: me } = useSelector(s => s.auth);
  const isSuperAdmin = me?.role === 'superadmin';

  useEffect(() => {
    if (isSuperAdmin) dispatch(fetchSystemConfig());
  }, [dispatch, isSuperAdmin]);

  if (!isSuperAdmin) return null;

  return (
    <div className="tp-section tp-section-wide">
      <div className="tp-section-title" style={{ justifyContent: 'space-between' }}>
        <span>🖥️ Runtime System Configuration</span>
        <button className="tp-sc-refresh-btn" onClick={() => dispatch(fetchSystemConfig())} disabled={systemConfigLoading} title="Refresh">
          <RefreshIcon />
        </button>
      </div>

      {systemConfigLoading ? (
        <div className="tp-sc-state">Loading configuration…</div>
      ) : systemConfigError ? (
        <div className="tp-sc-state error">⚠️ {systemConfigError}</div>
      ) : systemConfig.length === 0 ? (
        <div className="tp-sc-state">No system configuration entries found.</div>
      ) : (
        <div className="tp-sc-table-wrap">
          <table className="tp-sc-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th>Description</th>
                <th>Updated By</th>
                <th>Updated At</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {systemConfig.map(item => (
                <SysConfigRow
                  key={item.key || item.id}
                  item={item}
                  isSaving={systemConfigSaving === item.key}
                  onSave={(key, value, changeNote) => dispatch(updateSystemConfigKey({ key, value, changeNote }))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function TrialPage() {
  const dispatch = useDispatch();
  const { config, loading, saving, error } = useSelector(s => s.trial);
  const { user: me } = useSelector(s => s.auth);
  const isSuperAdmin = me?.role === 'superadmin';

  const [formDraft,   setFormDraft]   = useState(null);
  const [dirty,       setDirty]       = useState(false);
  const [changeNote,  setChangeNote]  = useState('');
  const form = formDraft || (config ? buildForm(config) : null);

  useEffect(() => { dispatch(fetchTrialConfig()); }, [dispatch]);

  const handleChange = (key, val) => {
    setFormDraft(f => ({ ...(f || form || {}), [key]: val }));
    setDirty(true);
  };

  const handleSave = () => {
    if (!form) return;
    const previousConfig = config ? buildForm(config) : null;
    dispatch(updateTrialConfig({ data: form, previousConfig, changeNote: changeNote.trim() || undefined }));
    setDirty(false);
    setChangeNote('');
  };

  const handleReset = () => { setFormDraft(null); setDirty(false); setChangeNote(''); };

  const meta = config ? {
    email:     config.last_updated_by_email || null,
    updatedAt: config.last_updated_at ? fmtDate(config.last_updated_at) : null,
  } : null;

  return (
    <div className="trial-page">
      <Toast />

      {/* ── Header ── */}
      <div className="tp-page-header">
        <div>
          <h1 className="tp-page-title">System Configuration</h1>
        </div>
        {isSuperAdmin && (
          <div className="tp-header-actions">
            {dirty && (
              <>
                <input
                  className="tp-change-note-input"
                  type="text"
                  placeholder="Change note (optional)…"
                  value={changeNote}
                  onChange={e => setChangeNote(e.target.value)}
                  maxLength={500}
                  disabled={saving}
                />
                <button className="tp-btn tp-btn-ghost" onClick={handleReset} disabled={saving}>Reset</button>
              </>
            )}
            <button className="tp-btn tp-btn-save" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? <span className="tp-spinner" /> : <><SaveIcon /> Save Changes</>}
            </button>
          </div>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="tp-readonly-notice">
          <LockIcon /> You have read-only access. Only Super Admins can modify trial & grace policies.
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
          {/* ── Current Configuration ── */}
          <div className="tp-section">
            <div className="tp-section-title">📋 Current Configuration</div>
            <div className="tp-info-grid">
              <InfoField label="Trial Duration"         value={`${form.trial_duration_days} days`} />
              <InfoField label="Grace Period"           value={`${form.grace_period_days} days`} />
              <InfoField label="Max Extensions"         value={form.max_trial_extensions} />
              <InfoField label="Extension Length"       value={`${form.trial_extension_days} days`} />
              <InfoField label="Reminder Before Expiry" value={`${form.trial_reminder_days} days`} />
              <InfoField label="Auto Convert"           value={form.trial_auto_convert ? '✓ Enabled' : '✗ Disabled'} />
              <InfoField label="Max Devices / Trial"    value={form.max_devices_per_trial} />
              <InfoField label="Device Limit Policy"    value={form.device_limit_policy === 'hard_block' ? '🔒 Hard Block' : '⚠️ Soft Warn'} />
            </div>
            {meta && (meta.email || meta.updatedAt) && (
              <div className="tp-meta-row">
                {meta.email    && <span className="tp-meta-item">Last updated by <strong>{meta.email}</strong></span>}
                {meta.email && meta.updatedAt && <span className="tp-meta-sep">·</span>}
                {meta.updatedAt && <span className="tp-meta-item">{meta.updatedAt}</span>}
              </div>
            )}
          </div>

          {/* ── Trial Period Settings ── */}
          <div className="tp-section">
            <div className="tp-section-title">⏱️ Trial Period Settings</div>
            <div className="tp-stepper-grid">
              <DayStepper
                label="Trial Duration"
                description="Number of days a new user gets for free trial access."
                value={form.trial_duration_days}
                onChange={v => handleChange('trial_duration_days', v)}
                min={1} max={90} disabled={!isSuperAdmin}
              />
              <DayStepper
                label="Extension Length"
                description="Days added each time a trial is extended."
                value={form.trial_extension_days}
                onChange={v => handleChange('trial_extension_days', v)}
                min={1} max={60} disabled={!isSuperAdmin}
              />
              <DayStepper
                label="Max Extensions"
                description="Maximum number of times a trial can be extended."
                value={form.max_trial_extensions}
                onChange={v => handleChange('max_trial_extensions', v)}
                min={0} max={10} disabled={!isSuperAdmin}
              />
              <DayStepper
                label="Reminder Before Expiry"
                description="Days before expiry to send a reminder notification."
                value={form.trial_reminder_days}
                onChange={v => handleChange('trial_reminder_days', v)}
                min={1} max={30} disabled={!isSuperAdmin}
              />
            </div>
          </div>

          {/* ── Grace Period Settings ── */}
          <div className="tp-section">
            <div className="tp-section-title">🛡️ Grace Period Settings</div>
            <div className="tp-stepper-grid">
              <DayStepper
                label="Grace Period Duration"
                description="Days after trial expiry before access is fully revoked."
                value={form.grace_period_days}
                onChange={v => handleChange('grace_period_days', v)}
                min={0} max={30} disabled={!isSuperAdmin}
              />
            </div>
            {isSuperAdmin && (
              <div className="tp-toggle-row">
                <div>
                  <div className="tp-toggle-label">Auto-Convert After Trial</div>
                  <div className="tp-toggle-desc">Automatically convert trial accounts to paid plans when the trial ends.</div>
                </div>
                <button
                  className={`tp-toggle ${form.trial_auto_convert ? 'on' : 'off'}`}
                  onClick={() => handleChange('trial_auto_convert', !form.trial_auto_convert)}
                >
                  <span className="tp-toggle-knob" />
                </button>
              </div>
            )}
          </div>

          {/* ── Device Limits ── */}
          <div className="tp-section">
            <div className="tp-section-title">📱 Device Limits</div>
            <div className="tp-stepper-grid">
              <DayStepper
                label="Max Devices per Trial"
                description="Maximum number of devices a trial user can register."
                value={form.max_devices_per_trial}
                onChange={v => handleChange('max_devices_per_trial', v)}
                min={1} max={20} disabled={!isSuperAdmin}
              />
            </div>
            <div className="tp-toggle-row" style={{ marginTop: 16 }}>
              <div>
                <div className="tp-toggle-label">Device Limit Policy</div>
                <div className="tp-toggle-desc">
                  <strong>Hard Block</strong> — deny access when device limit is reached.&nbsp;
                  <strong>Soft Warn</strong> — allow with a warning.
                </div>
              </div>
              <div>
                <span className="tp-policy-readonly">
                  {form.device_limit_policy === 'hard_block' ? '🔒 Hard Block' : '⚠️ Soft Warn'}
                </span>
                {isSuperAdmin && (
                  <div className="tp-policy-hint">Edit via System Configuration table below</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── System Config Panel (superadmin only) ── */}
      <SystemConfigPanel />
    </div>
  );
}
