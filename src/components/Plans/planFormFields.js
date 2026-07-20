/* ── Plan form numeric field rules ───────────────────────
   Shared by the create modal and the edit form so both enforce the same limits.

   Note: the `min`/`max` attributes on an <input type="number"> only constrain the
   spinner arrows and native form validation — they do NOT stop a user typing or
   pasting an out-of-range value. Everything here exists to close that gap. */

// Amount: up to 6 digits before the decimal point, plus 2 decimal places.
export const AMOUNT_MAX_DIGITS = 6;
export const AMOUNT_MAX = 999999.99;

// Allows a trailing '.' and a single decimal digit so "9." and "9.9" stay
// typeable on the way to "9.99".
const AMOUNT_PATTERN = new RegExp(`^\\d{0,${AMOUNT_MAX_DIGITS}}(\\.\\d{0,2})?$`);

export const isAmountInputAllowed = (raw) => {
  if (raw === '') return true;
  if (!AMOUNT_PATTERN.test(raw)) return false;
  return Number(raw) <= AMOUNT_MAX;
};

// Whole-number fields (trial days, device and stream limits): digits only, so a
// leading '-' can never be entered.
export const isIntegerInputAllowed = (raw, max) => {
  if (raw === '') return true;
  if (!/^\d+$/.test(raw)) return false;
  return max === undefined || Number(raw) <= max;
};

// `type="number"` still accepts 'e', 'E', '+' and '-' from the keyboard — none of
// which are valid here. Integer fields additionally reject '.'.
export const blockNonNumericKeys = (event) => {
  if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
};

export const blockIntegerKeys = (event) => {
  if (['e', 'E', '+', '-', '.'].includes(event.key)) event.preventDefault();
};

// Submit-time guards. Each returns an error string, or '' when the value is fine.
// Empty is treated as valid; callers decide whether a field is required.
export const validateAmount = (value) => {
  if (value === '') return '';
  if (!new RegExp(`^\\d{1,${AMOUNT_MAX_DIGITS}}(\\.\\d{1,2})?$`).test(value)) {
    return `Amount must be up to ${AMOUNT_MAX_DIGITS} digits with at most 2 decimal places.`;
  }
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) return 'Amount must be 0 or greater.';
  if (num > AMOUNT_MAX) return `Amount cannot exceed ${AMOUNT_MAX}.`;
  return '';
};

export const validateInteger = (value, label, max) => {
  if (value === '' || value === null || value === undefined) return '';
  if (!/^\d+$/.test(String(value))) return `${label} must be a whole number of 0 or greater.`;
  if (max !== undefined && Number(value) > max) return `${label} cannot exceed ${max}.`;
  return '';
};
