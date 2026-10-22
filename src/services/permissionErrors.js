// Global 403 handling — Roles & Permissions build guide Part B.
//
// The backend decides access per module (View = GET, Act = POST/PUT/PATCH/DELETE) and answers a
// refused call with 403. The portal never hides or disables anything by role; instead:
//   • a refused ACTION (non-GET) raises one "You don't have permission" pop-up, app-wide;
//   • a refused READ (GET) never pops up — the panel renders an inline locked empty state.
//
// Redux thunks only carry the error *message* string into state, so every 403 message is also
// recorded here. Pages ask isPermissionDenied(error) to choose <AccessDenied> over their normal
// error block, and action handlers use it to skip their own toast (the pop-up already showed).

export const PERMISSION_DENIED_EVENT = 'app:permission-denied';

const deniedMessages = new Set();

const READ_METHODS = new Set(['GET', 'HEAD']);

// Called by request() for every 403 response. Returns true when the pop-up was raised.
export const handleForbidden = ({ method, message, code }) => {
  if (message) deniedMessages.add(message);
  const isRead = READ_METHODS.has(String(method || 'GET').toUpperCase());
  if (isRead) return false;
  // INSUFFICIENT_PERMISSIONS, SUPERADMIN_REQUIRED and plain-text HTTP_403 all use the pop-up.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PERMISSION_DENIED_EVENT, { detail: { message, code } }));
  }
  return true;
};

// Accepts an Error (from a direct api call) or the message string a thunk stored in state.
export const isPermissionDenied = (errOrMessage) => {
  if (!errOrMessage) return false;
  if (typeof errOrMessage === 'object') {
    return errOrMessage.status === 403 || deniedMessages.has(errOrMessage.message);
  }
  return deniedMessages.has(String(errOrMessage));
};

// Test-only reset.
export const __resetPermissionErrors = () => deniedMessages.clear();
