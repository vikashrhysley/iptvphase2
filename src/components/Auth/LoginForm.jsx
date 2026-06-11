// src/components/Auth/LoginForm.js
import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginStep1, fetch2FASetup, confirm2FASetup, verifyTOTP, clearError,
} from '../../store/slices/authSlice';
import './LoginForm.css';

// ── Icons ────────────────────────────────────────────────
const MailIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const LockIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const EyeIcon   = ({ open }) => open
  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const ShieldIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const AlertIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

// ── Step indicator ────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div className="login-step-indicator">
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <div className={`step-dot${i+1===current?' active':i+1<current?' done':''}`} />
          {i < total-1 && <div className="step-line" style={{ background: i+1<current ? 'var(--accent-primary)' : undefined }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Shared OTP input row ──────────────────────────────────
function OTPRow({ otp, setOtp, onSubmit, dispatch }) {
  const refs = useRef([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);

  const onChange = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    dispatch(clearError());
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) refs.current[i+1]?.focus();
  };
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i-1]?.focus();
    if (e.key === 'Enter') onSubmit();
  };
  const onPaste = e => {
    e.preventDefault();
    const d = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    const next = [...otp]; d.split('').forEach((c,i) => { if(i<6) next[i]=c; }); setOtp(next);
    refs.current[Math.min(d.length,5)]?.focus();
  };

  return (
    <div className="otp-inputs">
      {otp.map((digit, i) => (
        <input key={i} ref={el => refs.current[i]=el}
          className={`otp-input${digit?' filled':''}`}
          type="text" inputMode="numeric" maxLength={1} value={digit}
          onChange={e => onChange(i, e.target.value)}
          onKeyDown={e => onKey(i, e)}
          onPaste={i===0 ? onPaste : undefined}
        />
      ))}
    </div>
  );
}

// ── Step 1: Email + Password ──────────────────────────────
function CredentialsStep() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector(s => s.auth);
  const [form, setForm]     = useState({ email:'', password:'' });
  const [show, setShow]     = useState(false);
  const [localError, setLocalError] = useState('');

  const submit = () => {
    if (!form.email.trim()) { setLocalError('Email is required.'); return; }
    if (!form.password)     { setLocalError('Password is required.'); return; }
    setLocalError('');
    dispatch(loginStep1({ email: form.email.trim(), password: form.password }));
  };
  const onChange = e => {
    setLocalError('');
    dispatch(clearError());
    setForm(f => ({...f, [e.target.name]: e.target.value}));
  };

  const displayError = localError || (typeof error === 'string' ? error : error ? 'An error occurred. Please try again.' : '');

  return (
    <>
      <StepDots current={1} total={3} />

      <div className="form-group">
        <label className="form-label">Email</label>
        <div className="form-input-wrapper">
          <span className="form-input-icon"><MailIcon /></span>
          <input className="form-input" type="email" name="email"
            placeholder="Enter your email" value={form.email}
            onChange={onChange} onKeyDown={e => e.key==='Enter' && submit()}
            autoFocus autoComplete="email" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Password</label>
        <div className="form-input-wrapper">
          <span className="form-input-icon"><LockIcon /></span>
          <input className="form-input has-right-icon" type={show?'text':'password'}
            name="password" placeholder="Enter your password" value={form.password}
            onChange={onChange} onKeyDown={e => e.key==='Enter' && submit()}
            autoComplete="current-password" />
          <button className="toggle-password" onClick={() => setShow(p=>!p)} type="button" tabIndex={-1}>
            <EyeIcon open={show} />
          </button>
        </div>
      </div>

      {displayError && <div className="form-error"><AlertIcon /> {displayError}</div>}

      <button className="btn-primary" onClick={submit} disabled={loading} style={{ marginTop: 30, marginBottom: 20 }}>
        {loading ? <span className="loading-spinner" /> : <><ShieldIcon /> Continue</>}
      </button>
      
    </>
  );
}

// ── Step 2: QR Setup (first-time 2FA) ────────────────────
function QRSetupStep() {
  const dispatch  = useDispatch();
  const { loading, error, provisioningUri, qrCode, secret } = useSelector(s => s.auth);
  const [otp, setOtp] = useState(['','','','','','']);
  const [imgError, setImgError] = useState(false);

  // Auto-call setup API on mount — only if QR not already loaded
  useEffect(() => {
    if (!provisioningUri && !qrCode) {
      dispatch(fetch2FASetup());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    dispatch(confirm2FASetup({ totpCode: code }));
  };

  // Build QR image src:
  // 1. Use base64 qr_code from API if present
  // 2. Generate from provisioning_uri via qrserver.com
  const qrSrc = qrCode
    ? (qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`)
    : provisioningUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(provisioningUri)}`
    : null;

  return (
    <>
      <StepDots current={2} total={3} />
      <h1 className="login-heading">Set up 2FA</h1>
      <p className="login-subheading">Scan with Google Authenticator, then enter the code</p>

      {/* QR code area */}
      <div className="qr-container">
        {loading && !qrSrc ? (
          <div className="qr-loading"><span className="loading-spinner" style={{ width:28, height:28 }} /></div>
        ) : qrSrc && !imgError ? (
          <img
            className="qr-image"
            src={qrSrc}
            alt="Scan this QR code"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="qr-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M17 17h4"/><path d="M17 21v-4"/><path d="M21 14v3"/>
            </svg>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>QR loading…</span>
          </div>
        )}
      </div>



      <p className="otp-note" style={{ marginTop: 18 }}>Enter the 6-digit code shown in the app</p>

      <OTPRow otp={otp} setOtp={setOtp} onSubmit={submit} dispatch={dispatch} />

      {error && <div className="form-error" style={{ justifyContent:'center' }}><AlertIcon /> {typeof error === 'string' ? error : 'Invalid code. Please try again.'}</div>}

      <button className="btn-primary" onClick={submit}
        disabled={loading || otp.join('').length !== 6} style={{ marginTop: 16 }}>
        {loading ? <span className="loading-spinner" /> : 'Confirm & Activate'}
      </button>
      <button className="back-btn" onClick={() => window.location.reload()} type="button">
        ← Back to login
      </button>
    </>
  );
}

// ── Step 3: OTP Verify (returning user) ──────────────────
function OTPVerifyStep() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector(s => s.auth);
  const [otp, setOtp] = useState(['','','','','','']);

  const submit = () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    dispatch(verifyTOTP({ totpCode: code }));
  };

  return (
    <>
      <StepDots current={3} total={3} />
      <h1 className="login-heading">Verify identity</h1>
      <p className="login-subheading">Enter the 6-digit code from Google Authenticator</p>

      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'12px 16px',
        background:'rgba(0,212,255,0.06)', border:'1px solid rgba(0,212,255,0.2)',
        borderRadius:'var(--radius-md)', marginBottom:20, fontSize:'0.82rem', color:'var(--text-secondary)'
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Open Google Authenticator and enter the current code
      </div>

      <OTPRow otp={otp} setOtp={setOtp} onSubmit={submit} dispatch={dispatch} />

      {error && <div className="form-error" style={{ justifyContent:'center' }}><AlertIcon /> {typeof error === 'string' ? error : 'Invalid code. Please try again.'}</div>}

      <button className="btn-primary" onClick={submit}
        disabled={loading || otp.join('').length !== 6} style={{ marginTop: 16 }}>
        {loading ? <span className="loading-spinner" /> : 'Verify & Sign in'}
      </button>
      <button className="back-btn" onClick={() => window.location.reload()} type="button">
        ← Back to login
      </button>
    </>
  );
}

// ── Root ─────────────────────────────────────────────────
export default function LoginForm() {
  const { step } = useSelector(s => s.auth);
  return (
    <div className="login-page">
      <div className="login-glow-bottom" />
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            {/* Corporate R monogram */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M6 4h10a6 6 0 0 1 0 12H6V4z" fill="white" opacity="0.95"/>
              <path d="M6 16h5l7 8H11L6 16z" fill="white" opacity="0.85"/>
              <rect x="6" y="4" width="2.5" height="20" fill="white"/>
            </svg>
          </div>
          <div className="login-logo-lockup">
            <div className="login-logo-name">Rhysley</div>
            <div className="login-logo-sub">GROUP</div>
          </div>
        </div>
        {step === 1 && <CredentialsStep />}
        {step === 2 && <QRSetupStep />}
        {step === 3 && <OTPVerifyStep />}
      </div>
    </div>
  );
}