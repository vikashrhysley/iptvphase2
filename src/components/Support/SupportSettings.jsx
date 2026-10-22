// Get Help — console settings (System Configuration module: View to read, Act to save).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { apiFetchSupportSettings, apiUpdateSupportSettings } from '../../services/api';
import { isPermissionDenied } from '../../services/permissionErrors';
import { AccessDenied } from '../common/PermissionDenied';
import {
  PRIORITY_META, PRIORITY_ORDER, actionErrorMessage, humanize, priorityLabel,
} from './supportUtils';
import { ErrorBanner, Field, PriorityBars, SkeletonLines, Spinner, Switch } from './SupportUi';
import { ClockIcon, InfoIcon, PlusIcon, RefreshIcon, SaveIcon, SettingsIcon, TrashIcon, ZapIcon } from './SupportIcons';

const DEFAULT_SLA = {
  urgent: { first_response_hours: 1, resolution_hours: 8 },
  high:   { first_response_hours: 4, resolution_hours: 24 },
  medium: { first_response_hours: 8, resolution_hours: 48 },
  low:    { first_response_hours: 24, resolution_hours: 72 },
};

const normalize = (s = {}) => ({
  sla: Object.fromEntries(PRIORITY_ORDER.map((p) => [p, {
    first_response_hours: Number(s.sla?.[p]?.first_response_hours ?? DEFAULT_SLA[p].first_response_hours),
    resolution_hours: Number(s.sla?.[p]?.resolution_hours ?? DEFAULT_SLA[p].resolution_hours),
  }])),
  default_priorities: { ...(s.default_priorities || {}) },
  fallback_priority: s.fallback_priority || 'medium',
  at_risk_ratio: Number(s.at_risk_ratio ?? 0.75),
  auto_resolve_days: Number(s.auto_resolve_days ?? 5),
  auto_close_days: Number(s.auto_close_days ?? 7),
  reopen_window_days: Number(s.reopen_window_days ?? 7),
  auto_assign: !!s.auto_assign,
});

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Only what changed goes in the PATCH (the backend merges partial updates).
const buildPatch = (original, form) => {
  const patch = {};
  const sla = {};
  PRIORITY_ORDER.forEach((p) => { if (!same(original.sla[p], form.sla[p])) sla[p] = form.sla[p]; });
  if (Object.keys(sla).length) patch.sla = sla;
  const dp = {};
  Object.entries(form.default_priorities).forEach(([k, v]) => { if (original.default_priorities[k] !== v) dp[k] = v; });
  if (Object.keys(dp).length) patch.default_priorities = dp;
  ['fallback_priority', 'at_risk_ratio', 'auto_resolve_days', 'auto_close_days', 'reopen_window_days', 'auto_assign'].forEach((k) => {
    if (original[k] !== form[k]) patch[k] = form[k];
  });
  return patch;
};

const validate = (form) => {
  const errors = {};
  PRIORITY_ORDER.forEach((p) => {
    const { first_response_hours: f, resolution_hours: r } = form.sla[p];
    if (!(f > 0) || !(r > 0)) errors[`sla.${p}`] = 'Hours must be above 0.';
    else if (f > r) errors[`sla.${p}`] = 'First response must not be later than resolution.';
  });
  if (!(form.at_risk_ratio > 0 && form.at_risk_ratio < 1)) errors.at_risk_ratio = 'Must be between 1% and 99%.';
  ['auto_resolve_days', 'auto_close_days', 'reopen_window_days'].forEach((k) => {
    const v = form[k];
    if (!Number.isInteger(v) || v < 1 || v > 90) errors[k] = 'Whole days from 1 to 90.';
  });
  return errors;
};

function PrioritySelect({ value, onChange, ariaLabel }) {
  return (
    <div className={`gh-pri-select gh-tone-text tone-${PRIORITY_META[value]?.tone || 'muted'}`}>
      <PriorityBars priority={value} />
      <select className="gh-input" value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel}>
        {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{priorityLabel(p)}</option>)}
      </select>
    </div>
  );
}

function DaysInput({ value, onChange, error, label, hint }) {
  return (
    <Field label={label} hint={hint} error={error}>
      <div className="gh-suffix-input">
        <input type="number" className="gh-input" min={1} max={90} step={1} value={Number.isNaN(value) ? '' : value}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))} />
        <span>days</span>
      </div>
    </Field>
  );
}

export default function SupportSettings() {
  const accessToken = useSelector((s) => s.auth.accessToken);
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [newRule, setNewRule] = useState({ key: '', priority: 'high' });

  const load = useCallback(() => apiFetchSupportSettings(accessToken)
    .then((settings) => {
      const n = normalize(settings);
      setOriginal(n);
      setForm(n);
      setError(null);
    })
    .catch((err) => setError(err))
    .finally(() => setLoading(false)), [accessToken]);

  useEffect(() => { load(); }, [load]);

  const reload = () => {
    setLoading(true);
    load();
  };

  const patch = useMemo(() => (original && form ? buildPatch(original, form) : {}), [original, form]);
  const errors = useMemo(() => (form ? validate(form) : {}), [form]);
  const dirty = Object.keys(patch).length > 0;
  const hasErrors = Object.keys(errors).length > 0;

  if (error && isPermissionDenied(error)) {
    return <AccessDenied message={`${error.message} Support settings live in the System Configuration module.`} />;
  }
  if (loading && !form) return <div className="gh-card"><SkeletonLines rows={7} height={46} /></div>;
  if (!form) return <ErrorBanner message={error?.message || 'Could not load settings.'} onRetry={reload} />;

  const setSla = (p, k, v) => setForm((f) => ({ ...f, sla: { ...f.sla, [p]: { ...f.sla[p], [k]: v === '' ? NaN : Number(v) } } }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addRule = () => {
    const key = newRule.key.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key) return;
    setForm((f) => ({ ...f, default_priorities: { ...f.default_priorities, [key]: newRule.priority } }));
    setNewRule({ key: '', priority: 'high' });
  };

  const save = async () => {
    if (!dirty || hasErrors) return;
    setSaving(true);
    try {
      const body = { ...patch };
      if (changeNote.trim()) body.change_note = changeNote.trim();
      const merged = normalize(await apiUpdateSupportSettings(accessToken, body));
      setOriginal(merged);
      setForm(merged);
      setChangeNote('');
      toast.success('Support settings saved');
    } catch (err) {
      const msg = actionErrorMessage(err, 'Could not save settings');
      if (msg) toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const ruleEntries = Object.entries(form.default_priorities);
  const atRiskPct = Math.round((form.at_risk_ratio || 0) * 100);

  return (
    <div className="gh-settings">
      {error && <ErrorBanner message={error.message} onRetry={reload} />}

      <div className="gh-settings-grid">
        {/* SLA targets */}
        <section className="gh-card gh-set-card">
          <header className="gh-set-head">
            <span className="gh-set-icon tone-blue"><ClockIcon size={16} /></span>
            <div>
              <h3>SLA targets</h3>
              <p>How fast the team should first reply and fully resolve, per priority. Changing a ticket’s priority re-times its deadlines.</p>
            </div>
          </header>
          <table className="gh-sla-table">
            <thead>
              <tr><th>Priority</th><th>First response</th><th>Resolution</th></tr>
            </thead>
            <tbody>
              {PRIORITY_ORDER.map((p) => (
                <tr key={p} className={errors[`sla.${p}`] ? 'has-error' : ''}>
                  <td>
                    <span className={`gh-tone-text tone-${PRIORITY_META[p].tone} gh-pri-name`}><PriorityBars priority={p} /> {priorityLabel(p)}</span>
                  </td>
                  <td>
                    <div className="gh-suffix-input">
                      <input type="number" className="gh-input" min={0.25} step={0.25}
                        value={Number.isNaN(form.sla[p].first_response_hours) ? '' : form.sla[p].first_response_hours}
                        onChange={(e) => setSla(p, 'first_response_hours', e.target.value)}
                        aria-label={`${priorityLabel(p)} first response hours`} />
                      <span>h</span>
                    </div>
                  </td>
                  <td>
                    <div className="gh-suffix-input">
                      <input type="number" className="gh-input" min={0.25} step={0.25}
                        value={Number.isNaN(form.sla[p].resolution_hours) ? '' : form.sla[p].resolution_hours}
                        onChange={(e) => setSla(p, 'resolution_hours', e.target.value)}
                        aria-label={`${priorityLabel(p)} resolution hours`} />
                      <span>h</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {PRIORITY_ORDER.filter((p) => errors[`sla.${p}`]).map((p) => (
            <div key={p} className="gh-field-error">{priorityLabel(p)}: {errors[`sla.${p}`]}</div>
          ))}
          <Field
            label={`At-risk warning at ${atRiskPct}% of the window`}
            hint="Tickets turn amber (and alert the assignee) once this share of the SLA time is used."
            error={errors.at_risk_ratio}
          >
            <div className="gh-range-row">
              <input type="range" min={5} max={95} step={5} value={atRiskPct}
                onChange={(e) => set('at_risk_ratio', Number(e.target.value) / 100)} aria-label="At-risk ratio" />
              <span className="gh-range-value">{atRiskPct}%</span>
            </div>
          </Field>
        </section>

        {/* Automation */}
        <section className="gh-card gh-set-card">
          <header className="gh-set-head">
            <span className="gh-set-icon tone-violet"><ZapIcon size={16} /></span>
            <div>
              <h3>Automation</h3>
              <p>Housekeeping the background sweep runs every 5 minutes.</p>
            </div>
          </header>
          <div className="gh-field-row">
            <DaysInput
              label="Auto-resolve after" value={form.auto_resolve_days} error={errors.auto_resolve_days}
              onChange={(v) => set('auto_resolve_days', v)}
              hint="Awaiting-user tickets with no reply are resolved as No response. The user is warned 24 h before."
            />
            <DaysInput
              label="Auto-close after" value={form.auto_close_days} error={errors.auto_close_days}
              onChange={(v) => set('auto_close_days', v)}
              hint="Resolved tickets close automatically after this many days."
            />
          </div>
          <DaysInput
            label="Reopen window" value={form.reopen_window_days} error={errors.reopen_window_days}
            onChange={(v) => set('reopen_window_days', v)}
            hint="A user reply within this window reopens a resolved ticket; later replies open a linked follow-up ticket."
          />
          <div className="gh-set-switch">
            <Switch
              checked={form.auto_assign}
              onChange={(v) => set('auto_assign', v)}
              label="Auto-assign new tickets"
              hint="Each new ticket goes to the eligible admin with the fewest open tickets."
            />
          </div>
        </section>

        {/* Default priorities */}
        <section className="gh-card gh-set-card span-2">
          <header className="gh-set-head">
            <span className="gh-set-icon tone-orange"><SettingsIcon size={16} /></span>
            <div>
              <h3>Default priorities</h3>
              <p>The priority a new ticket starts with, based on its reason or category. Anything not listed uses the fallback.</p>
            </div>
          </header>
          <div className="gh-rules">
            {ruleEntries.length === 0 && <div className="gh-ctx-empty">No rules yet — every ticket starts at the fallback priority.</div>}
            {ruleEntries.map(([key, value]) => (
              <div key={key} className={`gh-rule${original.default_priorities[key] !== value ? ' changed' : ''}`}>
                <span className="gh-rule-key">{humanize(key)}<code>{key}</code></span>
                <PrioritySelect value={value} onChange={(v) => setForm((f) => ({ ...f, default_priorities: { ...f.default_priorities, [key]: v } }))} ariaLabel={`Priority for ${key}`} />
                {!(key in original.default_priorities) && (
                  <button
                    type="button" className="gh-icon-btn danger" title="Remove unsaved rule" aria-label={`Remove ${key}`}
                    onClick={() => setForm((f) => {
                      const next = { ...f.default_priorities };
                      delete next[key];
                      return { ...f, default_priorities: next };
                    })}
                  >
                    <TrashIcon size={14} />
                  </button>
                )}
              </div>
            ))}
            <div className="gh-rule add">
              <input
                className="gh-input"
                value={newRule.key}
                placeholder="Reason or category, e.g. billing"
                onChange={(e) => setNewRule((r) => ({ ...r, key: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') addRule(); }}
                aria-label="New rule reason or category"
              />
              <PrioritySelect value={newRule.priority} onChange={(v) => setNewRule((r) => ({ ...r, priority: v }))} ariaLabel="New rule priority" />
              <button type="button" className="gh-btn subtle" onClick={addRule} disabled={!newRule.key.trim()}>
                <PlusIcon size={13} /> Add rule
              </button>
            </div>
            <div className="gh-rule fallback">
              <span className="gh-rule-key">Fallback<small>Everything else</small></span>
              <PrioritySelect value={form.fallback_priority} onChange={(v) => set('fallback_priority', v)} ariaLabel="Fallback priority" />
            </div>
          </div>
          <p className="gh-dialog-note"><InfoIcon size={13} /> Existing rules can be re-prioritised here; removing a saved rule isn’t supported by the settings API.</p>
        </section>
      </div>

      {/* Save bar */}
      <div className={`gh-savebar${dirty ? ' dirty' : ''}`}>
        <span className="gh-savebar-state">
          {dirty
            ? <><span className="gh-dot tone-amber" /> {Object.keys(patch).length} section{Object.keys(patch).length === 1 ? '' : 's'} changed</>
            : <><span className="gh-dot tone-green" /> All changes saved</>}
        </span>
        <input
          className="gh-input"
          value={changeNote}
          maxLength={500}
          onChange={(e) => setChangeNote(e.target.value)}
          placeholder="Change note (optional) — saved to the config history"
          disabled={!dirty}
          aria-label="Change note"
        />
        <button type="button" className="gh-btn ghost" onClick={() => { setForm(original); setChangeNote(''); }} disabled={!dirty || saving}>
          <RefreshIcon size={13} /> Reset
        </button>
        <button type="button" className="gh-btn primary" onClick={save} disabled={!dirty || hasErrors || saving}>
          {saving ? <Spinner /> : <SaveIcon size={14} />} Save settings
        </button>
      </div>
    </div>
  );
}
