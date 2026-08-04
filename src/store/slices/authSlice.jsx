// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiLogin, api2FASetup, api2FAConfirm, apiVerifyTOTP, apiLogout,
  apiTokenStatus, apiRefreshToken, apiGetProfile,
} from '../../services/api';

// ── localStorage helpers ───────────────────────────────────
const LS_ACCESS  = 'auth_access_token';
const LS_REFRESH = 'auth_refresh_token';
const LS_LAST_CHECK = 'auth_last_check';   // timestamp of the last startup check (burst detector)

// The refresh token ROTATES (using it blacklists the old one). If the user mashes the
// browser reload button, one load could spend the token and the next load — reading the
// now-dead token from localStorage — would fail and log them out. We defer the refresh
// call by this long: a reload during the window tears down the page and cancels the fetch
// BEFORE the token is spent, so only a settled load (that survives the delay) refreshes.
const REFRESH_DELAY_MS = 600;
// Two startup checks closer than this ⇒ the user is reload-spamming; be lenient (don't
// log out on a transient failure, since the token may just be in flux).
const BURST_WINDOW_MS = 2500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const saveTokens = (access, refresh) => {
  if (access)  localStorage.setItem(LS_ACCESS,  access);
  if (refresh) localStorage.setItem(LS_REFRESH, refresh);
};
const clearTokens = () => {
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
};

// Read tokens synchronously at module load — used to set optimistic initial state
// so the app renders immediately without waiting for the token-status API call.
const _initAccess  = localStorage.getItem(LS_ACCESS)  || null;
const _initRefresh = localStorage.getItem(LS_REFRESH) || null;
const _hasTokens   = Boolean(_initAccess && _initRefresh);

// ── Thunks ─────────────────────────────────────────────────

// Startup check — reads localStorage tokens, calls POST /auth/token-status,
// then acts on the next_step directive to restore or discard the session.
export const checkTokenStatus = createAsyncThunk('auth/checkTokenStatus',
  async (_, { getState, rejectWithValue }) => {
    const accessToken  = localStorage.getItem(LS_ACCESS)  || '';
    const refreshToken = localStorage.getItem(LS_REFRESH) || '';
    const currentUser  = getState().auth.user;

    // Reload-spam detector: two startup checks within the burst window ⇒ the user is
    // hammering reload. Record this check's time before anything can abort us.
    const prevCheck = Number(localStorage.getItem(LS_LAST_CHECK) || 0);
    const isBurst   = Date.now() - prevCheck < BURST_WINDOW_MS;
    localStorage.setItem(LS_LAST_CHECK, String(Date.now()));

    // No tokens — skip API round-trip, go straight to login immediately
    if (!accessToken && !refreshToken) {
      return { nextStep: 'login' };
    }

    // Optimistically keep the current session without spending the rotating token — used
    // during reload bursts and transient failures so a reload never logs the admin out.
    const keepSession = { nextStep: 'continue', accessToken, refreshToken, user: currentUser };

    try {
      const status   = await apiTokenStatus(accessToken, refreshToken);
      const nextStep = status.next_step;

      if (nextStep === 'continue') {
        // Full session active — restore user profile
        try {
          const user = await apiGetProfile(accessToken);
          return { nextStep: 'continue', accessToken, refreshToken, user };
        } catch {
          return { nextStep: 'continue', accessToken, refreshToken, user: currentUser };
        }
      }

      if (nextStep === 'refresh') {
        // Access token stale — exchange for a new pair. DEFER the (token-spending) refresh:
        // if the user reloads within this window the page is torn down and this fetch never
        // fires, so the rotating refresh token is never spent by a load that's about to die.
        await sleep(REFRESH_DELAY_MS);
        try {
          const refreshed       = await apiRefreshToken(refreshToken);
          const newAccessToken  = refreshed.access_token  || refreshed.accessToken;
          const newRefreshToken = refreshed.refresh_token || refreshed.refreshToken || refreshToken;
          saveTokens(newAccessToken, newRefreshToken);
          let user = currentUser;
          try { user = await apiGetProfile(newAccessToken); } catch { /* keep prior user */ }
          return { nextStep: 'continue', accessToken: newAccessToken, refreshToken: newRefreshToken, user };
        } catch {
          // Another flow (another tab / a mid-flight reload) may have already rotated the
          // token. If the stored refresh token changed since we started, restore that session.
          const storedAccess  = localStorage.getItem(LS_ACCESS)  || '';
          const storedRefresh = localStorage.getItem(LS_REFRESH) || '';
          if (storedAccess && storedRefresh && storedRefresh !== refreshToken) {
            try {
              const user = await apiGetProfile(storedAccess);
              return { nextStep: 'continue', accessToken: storedAccess, refreshToken: storedRefresh, user };
            } catch { /* stored token also dead — fall through */ }
          }
          // During a reload burst, keep the session rather than logging out on a token that
          // may have been spent by an aborted reload — the next settled load sorts it out.
          if (isBurst) return keepSession;
          clearTokens();
          return { nextStep: 'login' };
        }
      }

      if (nextStep === 'verify_totp') {
        // Partial token — TOTP step still needed
        return { nextStep: 'verify_totp', tempToken: accessToken };
      }

      if (nextStep === 'setup_2fa') {
        // Partial token — first-time 2FA setup
        return { nextStep: 'setup_2fa', tempToken: accessToken };
      }

      if (nextStep === 'logout') {
        // Backend says the refresh token is dead. During a reload burst this can be fallout
        // from an aborted refresh — stay optimistic and let a settled load make the call.
        if (isBurst) return keepSession;
        try { await apiLogout(accessToken); } catch { /* best-effort */ }
        clearTokens();
        return { nextStep: 'login' };
      }

      // 'login' or any unknown directive
      if (isBurst) return keepSession;
      clearTokens();
      return { nextStep: 'login' };
    } catch {
      // Network/parse error — a transient blip (or an aborting reload) must NOT nuke a valid
      // session. Keep the tokens and stay optimistically logged in (already at step 4).
      if (accessToken && refreshToken) return keepSession;
      clearTokens();
      return { nextStep: 'login' };
    }
  },
  // Never let the startup check run twice at once (StrictMode double-invoke, duplicate
  // dispatch). A second concurrent run would kick off a parallel token-status + refresh
  // and race the first — the classic "repeated refresh logs me out" bug.
  { condition: (_, { getState }) => !getState().auth.tokenCheckLoading }
);

// Step 1 — email + password
export const loginStep1 = createAsyncThunk('auth/loginStep1',
  async ({ email, password }, { rejectWithValue }) => {
    try { return await apiLogin(email, password); }
    catch (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('incorrect') || msg.includes('invalid') || msg.includes('401') || msg.includes('wrong') || msg.includes('unauthorized'))
        return rejectWithValue('Incorrect email or password. Please try again.');
      if (msg.includes('not found') || msg.includes('404') || msg.includes('no account'))
        return rejectWithValue('No account found with this email address.');
      if (msg.includes('429') || msg.includes('too many'))
        return rejectWithValue('Too many failed attempts. Please wait a few minutes and try again.');
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch'))
        return rejectWithValue('Unable to reach the server. Please check your internet connection.');
      if (msg.includes('500') || msg.includes('server error'))
        return rejectWithValue('Server error. Please try again in a moment.');
      return rejectWithValue(typeof err.message === 'string' ? err.message : 'Login failed. Please try again.');
    }
  }
);

// Step 2a — POST 2fa/setup (first-time, gets QR)
export const fetch2FASetup = createAsyncThunk('auth/fetch2FASetup',
  async (_, { getState, rejectWithValue }) => {
    try { return await api2FASetup(getState().auth.tempToken); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

// Step 2b — POST 2fa/confirm with totp_code
export const confirm2FASetup = createAsyncThunk('auth/confirm2FASetup',
  async ({ totpCode }, { getState, rejectWithValue }) => {
    try { return await api2FAConfirm(getState().auth.tempToken, totpCode); }
    catch (err) {
      const msg = err.message?.toLowerCase();
      if (msg?.includes('401') || msg?.includes('invalid') || msg?.includes('incorrect'))
        return rejectWithValue('Invalid verification code. Please check your authenticator app and try again.');
      if (msg?.includes('expired') || msg?.includes('session'))
        return rejectWithValue('Session expired. Please log in again.');
      return rejectWithValue(err.message);
    }
  }
);

// Step 3 — POST verify-totp (returning user)
export const verifyTOTP = createAsyncThunk('auth/verifyTOTP',
  async ({ totpCode }, { getState, rejectWithValue }) => {
    try { return await apiVerifyTOTP(getState().auth.tempToken, totpCode); }
    catch (err) {
      const msg = err.message?.toLowerCase();
      if (msg?.includes('401') || msg?.includes('invalid') || msg?.includes('incorrect'))
        return rejectWithValue('Invalid code. Please open your authenticator app and enter the current 6-digit code.');
      if (msg?.includes('expired') || msg?.includes('session'))
        return rejectWithValue('Session expired. Please log in again.');
      return rejectWithValue(err.message);
    }
  }
);

// Logout — hits API then clears local state + localStorage
export const logoutUser = createAsyncThunk('auth/logoutUser',
  async (_, { getState }) => {
    const { accessToken } = getState().auth;
    try { await apiLogout(accessToken); } catch { /* best-effort */ }
    clearTokens();
    return { success: true };
  }
);

// ── Shared reducer for completed login ────────────────────
const CLEAR_STATE = {
  step: 1, tempToken: null, accessToken: null, refreshToken: null,
  user: null, twoFactorEnabled: false, requiresTotp: false,
  requires2faSetup: false, provisioningUri: null, qrCode: null,
  secret: null, loading: false, error: null,
};

const done = (s, a) => {
  s.loading      = false;
  s.accessToken  = a.payload.accessToken;
  s.refreshToken = a.payload.refreshToken;
  s.user         = a.payload.user;
  s.tempToken    = null;
  s.step         = 4;
  saveTokens(a.payload.accessToken, a.payload.refreshToken);
};

// ── Slice ──────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    // Optimistic auth: if tokens are in localStorage, assume authenticated immediately.
    // checkTokenStatus validates in background and corrects if expired/invalid.
    step:          _hasTokens ? 4 : 1,
    tokenChecked:  true,   // always true — no boot screen blocking render
    accessToken:   _initAccess,
    refreshToken:  _initRefresh,
    tempToken:         null,
    user:              null,
    twoFactorEnabled:  false,
    requiresTotp:      false,
    requires2faSetup:  false,
    provisioningUri:   null,
    qrCode:            null,
    secret:            null,
    loading:           false,
    error:             null,
    tokenCheckLoading: false,
  },
  reducers: {
    logout(s) {
      clearTokens();
      Object.assign(s, CLEAR_STATE, { tokenChecked: true, tokenCheckLoading: false });
    },
    clearError(s) { s.error = null; },
  },
  extraReducers: b => {
    // ── Token status check (startup) ──
    b.addCase(checkTokenStatus.pending, s => {
       s.tokenCheckLoading = true;
     })
     .addCase(checkTokenStatus.fulfilled, (s, a) => {
       s.tokenCheckLoading = false;
       s.tokenChecked      = true;
       const { nextStep, accessToken, refreshToken, user, tempToken } = a.payload;
       if (nextStep === 'continue') {
         s.accessToken  = accessToken;
         s.refreshToken = refreshToken;
         s.user         = user;
         s.step         = 4;
       } else if (nextStep === 'verify_totp') {
         s.tempToken = tempToken;
         s.step      = 3;
       } else if (nextStep === 'setup_2fa') {
         s.tempToken = tempToken;
         s.step      = 2;
       } else {
         s.step = 1;
       }
     })
     .addCase(checkTokenStatus.rejected, s => {
       s.tokenCheckLoading = false;
       s.tokenChecked      = true;
       s.step              = 1;
     });

    // ── Login ──
    b.addCase(loginStep1.pending,   s => { s.loading = true;  s.error = null; })
     .addCase(loginStep1.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(loginStep1.fulfilled, (s, a) => {
       s.loading          = false;
       s.tempToken        = a.payload.tempToken;
       s.requiresTotp     = a.payload.requiresTotp;
       s.requires2faSetup = a.payload.requires2faSetup;
       s.step = a.payload.requires2faSetup ? 2 : 3;
     });

    // ── 2FA Setup (QR fetch) ──
    b.addCase(fetch2FASetup.pending,   s => { s.loading = true;  s.error = null; })
     .addCase(fetch2FASetup.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(fetch2FASetup.fulfilled, (s, a) => {
       s.loading         = false;
       s.provisioningUri = a.payload.provisioningUri;
       s.qrCode          = a.payload.qrCode;
       s.secret          = a.payload.secret;
     });

    // ── Confirm 2FA setup ──
    b.addCase(confirm2FASetup.pending,   s => { s.loading = true;  s.error = null; })
     .addCase(confirm2FASetup.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(confirm2FASetup.fulfilled, done);

    // ── Verify TOTP ──
    b.addCase(verifyTOTP.pending,   s => { s.loading = true;  s.error = null; })
     .addCase(verifyTOTP.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(verifyTOTP.fulfilled, done);

    // ── Logout ──
    b.addCase(logoutUser.pending,   s => { s.loading = true; })
     .addCase(logoutUser.fulfilled, s => { Object.assign(s, CLEAR_STATE, { tokenChecked: true }); })
     .addCase(logoutUser.rejected,  s => { Object.assign(s, CLEAR_STATE, { tokenChecked: true }); });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
