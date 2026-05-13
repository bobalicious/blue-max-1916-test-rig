import { jest } from '@jest/globals';
import { isInFiringArc, isDirectlyInFront, applyDamageCard } from '../js/combat.js';

describe('isInFiringArc — facing N', () => {
  const shooter = { q: 0, r: 0, facing: 0 };

  test('directly in front, range 1', () => expect(isInFiringArc(shooter, { q: 0, r: -1 })).toBe(true));
  test('directly in front, range 5', () => expect(isInFiringArc(shooter, { q: 0, r: -5 })).toBe(true));
  test('one left at range 1', () => expect(isInFiringArc(shooter, { q: -1, r: -1 })).toBe(true));
  test('one right at range 1', () => expect(isInFiringArc(shooter, { q: 1, r: -2 })).toBe(true));
  test('one left at range 4', () => expect(isInFiringArc(shooter, { q: -1, r: -4 })).toBe(true));
  test('one left at range 5 is OUT', () => expect(isInFiringArc(shooter, { q: -1, r: -5 })).toBe(false));
  test('range 6 is out', () => expect(isInFiringArc(shooter, { q: 0, r: -6 })).toBe(false));
  test('behind is out', () => expect(isInFiringArc(shooter, { q: 0, r: 1 })).toBe(false));
  test('too far to the side', () => expect(isInFiringArc(shooter, { q: 2, r: -1 })).toBe(false));
  test('perpendicular is out', () => expect(isInFiringArc(shooter, { q: -2, r: 0 })).toBe(false));
});

describe('isInFiringArc — facing SE', () => {
  const shooter = { q: 0, r: 0, facing: 2 };

  test('target at SE range 1', () => expect(isInFiringArc(shooter, { q: 1, r: 0 })).toBe(true));
  test('target at SE range 3', () => expect(isInFiringArc(shooter, { q: 3, r: 0 })).toBe(true));
  test('target behind (NW)', () => expect(isInFiringArc(shooter, { q: -1, r: 0 })).toBe(false));
});

describe('isDirectlyInFront', () => {
  const shooter = { q: 0, r: 0, facing: 0 };

  test('range 1 on centre line', () => expect(isDirectlyInFront(shooter, { q: 0, r: -1 })).toBe(true));
  test('range 5 on centre line', () => expect(isDirectlyInFront(shooter, { q: 0, r: -5 })).toBe(true));
  test('off-centre left', () => expect(isDirectlyInFront(shooter, { q: -1, r: -1 })).toBe(false));
  test('off-centre right', () => expect(isDirectlyInFront(shooter, { q: 1, r: -2 })).toBe(false));
});

describe('applyDamageCard', () => {
  test('miss does not increment damage', () => {
    const ac = { damageCount: 0, wounds: 0, damageTaken: [] };
    const result = applyDamageCard(ac, { effect: 'none' });
    expect(result.result).toBe('miss');
    expect(ac.damageCount).toBe(0);
    expect(ac.damageTaken).toHaveLength(0);
  });

  test('multiple misses = 0 damage', () => {
    const ac = { damageCount: 0, wounds: 0, damageTaken: [] };
    applyDamageCard(ac, { effect: 'none' });
    applyDamageCard(ac, { effect: 'none' });
    applyDamageCard(ac, { effect: 'none' });
    expect(ac.damageCount).toBe(0);
  });

  test('wound increments damage and wounds', () => {
    const ac = { damageCount: 0, wounds: 0, damageTaken: [] };
    const result = applyDamageCard(ac, { effect: 'wound', name: 'Pilot Wounded' });
    expect(ac.damageCount).toBe(1);
    expect(ac.wounds).toBe(1);
    expect(ac.damageTaken).toHaveLength(1);
    expect(result.result).toContain('wound');
  });

  test('3 wounds = destroyed', () => {
    const ac = { damageCount: 0, wounds: 2, damageTaken: [] };
    applyDamageCard(ac, { effect: 'wound', name: 'Pilot Wounded' });
    expect(ac.wounds).toBe(3);
    expect(ac.destroyed).toBe(true);
  });

  test('discard removes correct card', () => {
    const ac = {
      damageCount: 0, wounds: 0, damageTaken: [],
      yawAll: [{ direction: 'left', id: 1 }, { direction: 'straight', id: 2 }],
    };
    const result = applyDamageCard(ac, {
      effect: 'discard', name: 'Rudder Damaged',
      target: { deck: 'yaw', direction: 'straight' },
    });
    expect(ac.damageCount).toBe(1);
    expect(result.discarded).toHaveLength(1);
    expect(result.discarded[0].direction).toBe('straight');
    expect(ac.yawAll).toHaveLength(1);
  });

  test('discard with fallback', () => {
    const ac = {
      damageCount: 0, wounds: 0, damageTaken: [],
      pitchAll: [{ direction: 'level', id: 1 }],
    };
    const result = applyDamageCard(ac, {
      effect: 'discard', name: 'Engine Damaged',
      target: { deck: 'pitch', direction: 'climb', fallback: 'level' },
    });
    expect(result.discarded).toHaveLength(1);
    expect(result.discarded[0].direction).toBe('level');
  });

  test('discard when nothing to remove', () => {
    const ac = {
      damageCount: 0, wounds: 0, damageTaken: [],
      yawAll: [],
    };
    const result = applyDamageCard(ac, {
      effect: 'discard', name: 'Aileron Damaged',
      target: { deck: 'yaw', direction: 'left' },
    });
    expect(ac.damageCount).toBe(1);
    expect(result.discarded).toHaveLength(0);
  });
});
