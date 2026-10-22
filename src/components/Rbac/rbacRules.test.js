import { describe, it, expect } from 'vitest';
import {
  normalizeGrid, setView, setAct, hasView, hasAct, accessCounts, accessLabel,
  validateRoleName, visibleRoles, templateRoles, groupModules, gridsEqual,
} from './rbacRules';

describe('grid tick rules (guide C5)', () => {
  it('ticking Act also ticks View', () => {
    const g = setAct({}, 'devices', true);
    expect(g.devices).toEqual(['read', 'write']);
  });

  it('unticking View also unticks Act', () => {
    const g = setView({ devices: ['read', 'write'] }, 'devices', false);
    expect(g.devices).toBeUndefined();
  });

  it('unticking Act keeps View', () => {
    const g = setAct({ devices: ['read', 'write'] }, 'devices', false);
    expect(g.devices).toEqual(['read']);
  });

  it('act-only modules have no View and save as ["write"]', () => {
    let g = setAct({}, 'refunds', true);
    expect(g.refunds).toEqual(['write']);
    expect(hasView(g, 'refunds')).toBe(false);
    g = setView(g, 'refunds', true); // no-op for act-only rows
    expect(g.refunds).toEqual(['write']);
    g = setAct(g, 'refunds', false);
    expect(g.refunds).toBeUndefined();
  });

  it('QA 13: tick Refunds Act, untick Devices View on a role with Devices Act', () => {
    let g = { devices: ['read', 'write'] };
    g = setAct(g, 'refunds', true);
    g = setView(g, 'devices', false);
    expect(g).toEqual({ refunds: ['write'] });
    expect(hasAct(g, 'devices')).toBe(false);
  });
});

describe('normalizeGrid', () => {
  it('drops the old delete/execute actions and empty rows', () => {
    expect(normalizeGrid({
      devices: ['read', 'delete'],
      audit_logs: ['execute'],
      licenses: [],
    })).toEqual({ devices: ['read'] });
  });

  it('adds View to any non-act-only module that has Act', () => {
    expect(normalizeGrid({ devices: ['write'] })).toEqual({ devices: ['read', 'write'] });
  });

  it('strips View from act-only modules', () => {
    expect(normalizeGrid({ purge: ['read', 'write'], refunds: ['read'] })).toEqual({ purge: ['write'] });
  });

  it('gridsEqual ignores order and stray actions', () => {
    expect(gridsEqual({ devices: ['write', 'read'] }, { devices: ['read', 'write', 'delete'] })).toBe(true);
    expect(gridsEqual({ devices: ['read'] }, { devices: ['read', 'write'] })).toBe(false);
  });
});

describe('roles list (guide C2)', () => {
  const roles = [
    { name: 'superadmin', permissions: {} },
    { name: 'admin', permissions: { devices: ['read', 'write'], licenses: ['read'] } },
    { name: 'user', permissions: {} },
    { name: 'support_team', permissions: { support_tickets: ['read', 'write'], devices: ['read'] } },
  ];

  it('hides the app-user role', () => {
    expect(visibleRoles(roles).map((r) => r.name)).toEqual(['superadmin', 'admin', 'support_team']);
  });

  it('Start from excludes user and superadmin', () => {
    expect(templateRoles(roles).map((r) => r.name)).toEqual(['admin', 'support_team']);
  });

  it('counts view and act modules', () => {
    expect(accessCounts(roles[3].permissions)).toEqual({ view: 2, act: 1 });
    expect(accessLabel(roles[1])).toBe('2 view · 1 act');
  });

  it('superadmin always reads Full access', () => {
    expect(accessLabel(roles[0])).toBe('Full access (always)');
  });
});

describe('validateRoleName (guide C3, QA 11)', () => {
  it('rejects uppercase, spaces and symbols', () => {
    expect(validateRoleName('QA_Role')).not.toBe('');
    expect(validateRoleName('qa role')).not.toBe('');
    expect(validateRoleName('qa-role')).not.toBe('');
  });

  it('rejects system role names', () => {
    expect(validateRoleName('admin')).not.toBe('');
    expect(validateRoleName('viewer')).not.toBe('');
    expect(validateRoleName('superadmin')).not.toBe('');
  });

  it('accepts a valid name', () => {
    expect(validateRoleName('qa_role')).toBe('');
    expect(validateRoleName('support_team2')).toBe('');
  });
});

describe('groupModules', () => {
  it('groups known modules, drops inactive ones, and keeps unknown ones under Other', () => {
    const groups = groupModules([
      { name: 'devices' }, { name: 'refunds' }, { name: 'rbac' },
      { name: 'testing_module' }, { name: 'health', is_active: false },
    ]);
    expect(groups.map((g) => [g.label, g.rows.map((r) => r.name)])).toEqual([
      ['Everyday', ['devices']],
      ['Administration', ['rbac']],
      ['Sensitive actions', ['refunds']],
      ['Other', ['testing_module']],
    ]);
  });
});
