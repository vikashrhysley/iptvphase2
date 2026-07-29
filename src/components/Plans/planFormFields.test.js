import { describe, it, expect } from 'vitest';
import {
  AMOUNT_MAX,
  isAmountInputAllowed,
  isIntegerInputAllowed,
  validateAmount,
  validateInteger,
} from './planFormFields';

describe('planFormFields — amount input (≤6 digits, ≤2 decimals, ≤999999.99)', () => {
  it('accepts valid partial + full amounts', () => {
    for (const v of ['', '9', '9.', '9.9', '9.99', '0.01', '999999', '999999.99', '12345.67', '.5']) {
      expect(isAmountInputAllowed(v)).toBe(true);
    }
  });

  it('rejects >2 decimals, >6 digits, over-max, and non-numeric', () => {
    for (const v of ['9.999', '1000000', '9999999', '999999.999', '1000000.01', '-1', '-5', '9e5', 'abc']) {
      expect(isAmountInputAllowed(v)).toBe(false);
    }
  });
});

describe('planFormFields — validateAmount (submit guard)', () => {
  it('passes empty and well-formed amounts', () => {
    expect(validateAmount('')).toBe('');
    expect(validateAmount('9.99')).toBe('');
    expect(validateAmount('999999.99')).toBe('');
    expect(validateAmount('0')).toBe('');
  });

  it('flags too many decimals / digits and over-max', () => {
    expect(validateAmount('9.999')).toMatch(/2 decimal/);
    expect(validateAmount('1000000')).toMatch(/6 digits|at most 2 decimal/);
    expect(validateAmount('abc')).not.toBe('');
    expect(validateAmount(String(AMOUNT_MAX + 1))).not.toBe('');
  });
});

describe('planFormFields — integer inputs (digits only, no negatives, ≤max)', () => {
  it('accepts whole numbers within max', () => {
    for (const v of ['', '0', '7', '365']) expect(isIntegerInputAllowed(v, 365)).toBe(true);
    expect(isIntegerInputAllowed('100', 100)).toBe(true);
    expect(isIntegerInputAllowed('10', 10)).toBe(true);
  });

  it('rejects negatives, decimals, exponents, and over-max', () => {
    for (const v of ['-1', '-', '7.5', '1e3', 'abc', '366']) {
      expect(isIntegerInputAllowed(v, 365)).toBe(false);
    }
    expect(isIntegerInputAllowed('101', 100)).toBe(false);
    expect(isIntegerInputAllowed('11', 10)).toBe(false);
  });

  it('validateInteger surfaces clear messages', () => {
    expect(validateInteger('', 'Trial days', 365)).toBe('');
    expect(validateInteger('7', 'Trial days', 365)).toBe('');
    expect(validateInteger('-5', 'Trial days', 365)).toMatch(/whole number/);
    expect(validateInteger('400', 'Trial days', 365)).toMatch(/cannot exceed 365/);
  });
});
