// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiLogin, api2FASetup, api2FAConfirm, apiVerifyTOTP, apiLogout } from '../../services/api';

// Step 1 — email + password
export const loginStep1 = createAsyncThunk('auth/loginStep1',
  async ({ email, password }, { rejectWithValue }) => {
    try { return await apiLogin(email, password); }
    catch (err) { return rejectWithValue(err.message); }
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
    catch (err) { return rejectWithValue(err.message); }
  }
);

// Step 3 — POST verify-totp (returning user)
export const verifyTOTP = createAsyncThunk('auth/verifyTOTP',
  async ({ totpCode }, { getState, rejectWithValue }) => {
    try { return await apiVerifyTOTP(getState().auth.tempToken, totpCode); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

// Logout — hits API then clears local state
export const logoutUser = createAsyncThunk('auth/logoutUser',
  async (_, { getState }) => {
    const { accessToken } = getState().auth;
    await apiLogout(accessToken);
    return { success: true };
  }
);

const done = (s, a) => {
  s.loading      = false;
  s.accessToken  = a.payload.accessToken;
  s.refreshToken = a.payload.refreshToken;
  s.user         = a.payload.user;
  s.tempToken    = null;
  s.step         = 4; // authenticated
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    step: 1,               // 1=login 2=QR-setup 3=OTP-verify 4=done
    tempToken:       null,
    accessToken:     null,
    refreshToken:    null,
    user:            null,
    twoFactorEnabled: false,
    requiresTotp:     false,
    requires2faSetup: false,
    provisioningUri: null,
    qrCode:          null,
    secret:          null,
    loading:         false,
    error:           null,
  },
  reducers: {
    logout(s) {
      Object.assign(s, { step:1, tempToken:null, accessToken:null, refreshToken:null,
        user:null, twoFactorEnabled:false, provisioningUri:null, qrCode:null,
        secret:null, loading:false, error:null });
    },
    clearError(s) { s.error = null; },
  },
  extraReducers: b => {
    // ── Login ──
    b.addCase(loginStep1.pending,   s => { s.loading = true;  s.error = null; })
     .addCase(loginStep1.rejected,  (s,a) => { s.loading = false; s.error = a.payload; })
     .addCase(loginStep1.fulfilled, (s,a) => {
       s.loading          = false;
       s.tempToken        = a.payload.tempToken;
       s.requiresTotp     = a.payload.requiresTotp;
       s.requires2faSetup = a.payload.requires2faSetup;

       // First-time user  → requires_2fa_setup=true  → step 2 (scan QR, then confirm)
       // Returning user   → requires_totp=true        → step 3 (enter OTP directly)
       if (a.payload.requires2faSetup) {
         s.step = 2;
       } else if (a.payload.requiresTotp) {
         s.step = 3;
       } else {
         // Fallback — shouldn't happen but default to OTP entry
         s.step = 3;
       }
     });

    // ── 2FA Setup (QR fetch) ──
    b.addCase(fetch2FASetup.pending,   s => { s.loading = true;  s.error = null; })
     .addCase(fetch2FASetup.rejected,  (s,a) => { s.loading = false; s.error = a.payload; })
     .addCase(fetch2FASetup.fulfilled, (s,a) => {
       s.loading        = false;
       s.provisioningUri = a.payload.provisioningUri;
       s.qrCode         = a.payload.qrCode;
       s.secret         = a.payload.secret;
     });

    // ── Confirm setup ──
    b.addCase(confirm2FASetup.pending,   s => { s.loading = true;  s.error = null; })
     .addCase(confirm2FASetup.rejected,  (s,a) => { s.loading = false; s.error = a.payload; })
     .addCase(confirm2FASetup.fulfilled, done);

    // ── Logout ──
    b.addCase(logoutUser.pending,   s => { s.loading = true; })
     .addCase(logoutUser.fulfilled, s => {
       Object.assign(s, {
         step:1, tempToken:null, accessToken:null, refreshToken:null,
         user:null, twoFactorEnabled:false, requiresTotp:false,
         requires2faSetup:false, provisioningUri:null, qrCode:null,
         secret:null, loading:false, error:null,
       });
     })
     .addCase(logoutUser.rejected, s => {
       // Still clear state even if API fails
       Object.assign(s, {
         step:1, tempToken:null, accessToken:null, refreshToken:null,
         user:null, twoFactorEnabled:false, requiresTotp:false,
         requires2faSetup:false, provisioningUri:null, qrCode:null,
         secret:null, loading:false, error:null,
       });
     });

    // ── Verify TOTP ──
    b.addCase(verifyTOTP.pending,   s => { s.loading = true;  s.error = null; })
     .addCase(verifyTOTP.rejected,  (s,a) => { s.loading = false; s.error = a.payload; })
     .addCase(verifyTOTP.fulfilled, done);
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;