import { jest } from '@jest/globals';
import {
  hexNeighbor, hexDistance, rotateFacing,
  executeStep, executeMove, executeMoveWithPath,
} from '../js/hex.js';

describe('hexNeighbor', () => {
  test('N from origin', () => expect(hexNeighbor(0, 0, 0)).toEqual({ q: 0, r: -1 }));
  test('NE from origin', () => expect(hexNeighbor(0, 0, 1)).toEqual({ q: 1, r: -1 }));
  test('SE from origin', () => expect(hexNeighbor(0, 0, 2)).toEqual({ q: 1, r: 0 }));
  test('S from origin', () => expect(hexNeighbor(0, 0, 3)).toEqual({ q: 0, r: 1 }));
  test('SW from origin', () => expect(hexNeighbor(0, 0, 4)).toEqual({ q: -1, r: 1 }));
  test('NW from origin', () => expect(hexNeighbor(0, 0, 5)).toEqual({ q: -1, r: 0 }));
  test('N from (3,-2)', () => expect(hexNeighbor(3, -2, 0)).toEqual({ q: 3, r: -3 }));
});

describe('hexDistance', () => {
  test('same hex', () => expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0));
  test('adjacent N', () => expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: -1 })).toBe(1));
  test('adjacent NE', () => expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1));
  test('3 hexes N', () => expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: -3 })).toBe(3));
  test('diagonal', () => expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2));
  test('offset hexes', () => expect(hexDistance({ q: -2, r: 3 }, { q: 1, r: 0 })).toBe(3));
});

describe('rotateFacing', () => {
  test('0 + 1 = 1', () => expect(rotateFacing(0, 1)).toBe(1));
  test('5 + 1 wraps to 0', () => expect(rotateFacing(5, 1)).toBe(0));
  test('0 - 1 wraps to 5', () => expect(rotateFacing(0, -1)).toBe(5));
  test('2 + 3 = 5', () => expect(rotateFacing(2, 3)).toBe(5));
  test('4 - 2 = 2', () => expect(rotateFacing(4, -2)).toBe(2));
});

describe('executeStep — M commands', () => {
  const origin = { q: 0, r: 0, facing: 0, altitude: 3 };

  test('M1,0,0 facing N moves north', () => {
    const r = executeStep(origin, 'M1,0,0', 'straight');
    expect({ q: r.q, r: r.r }).toEqual({ q: 0, r: -1 });
  });

  test('M1,0,0 facing S moves south', () => {
    const r = executeStep({ ...origin, facing: 3 }, 'M1,0,0', 'straight');
    expect({ q: r.q, r: r.r }).toEqual({ q: 0, r: 1 });
  });

  test('M2,0,0 facing N moves 2 north', () => {
    const r = executeStep(origin, 'M2,0,0', 'straight');
    expect({ q: r.q, r: r.r }).toEqual({ q: 0, r: -2 });
  });

  test('M0,1,0 facing N moves forward-left (NW)', () => {
    const r = executeStep(origin, 'M0,1,0', 'straight');
    expect({ q: r.q, r: r.r }).toEqual({ q: -1, r: 0 });
  });

  test('M0,0,1 facing N moves forward-right (NE)', () => {
    const r = executeStep(origin, 'M0,0,1', 'straight');
    expect({ q: r.q, r: r.r }).toEqual({ q: 1, r: -1 });
  });

  test('M-1,0,0 facing N moves backward (south)', () => {
    const r = executeStep(origin, 'M-1,0,0', 'straight');
    expect({ q: r.q, r: r.r }).toEqual({ q: 0, r: 1 });
  });
});

describe('executeStep — MY (Slip)', () => {
  const origin = { q: 0, r: 0, facing: 0, altitude: 3 };

  test('MY left facing N moves NW', () => {
    const r = executeStep(origin, 'MY', 'left');
    expect({ q: r.q, r: r.r }).toEqual({ q: -1, r: 0 });
  });

  test('MY right facing N moves NE', () => {
    const r = executeStep(origin, 'MY', 'right');
    expect({ q: r.q, r: r.r }).toEqual({ q: 1, r: -1 });
  });

  test('MY straight facing N moves N', () => {
    const r = executeStep(origin, 'MY', 'straight');
    expect({ q: r.q, r: r.r }).toEqual({ q: 0, r: -1 });
  });

  test('MY left facing SE moves NE', () => {
    const r = executeStep({ ...origin, facing: 2 }, 'MY', 'left');
    expect({ q: r.q, r: r.r }).toEqual({ q: 1, r: -1 });
  });

  test('MY right facing SE moves S', () => {
    const r = executeStep({ ...origin, facing: 2 }, 'MY', 'right');
    expect({ q: r.q, r: r.r }).toEqual({ q: 0, r: 1 });
  });
});

describe('executeStep — turns', () => {
  const origin = { q: 0, r: 0, facing: 0, altitude: 3 };

  test('TY left from N = NW', () => expect(executeStep(origin, 'TY', 'left').facing).toBe(5));
  test('TY right from N = NE', () => expect(executeStep(origin, 'TY', 'right').facing).toBe(1));
  test('TY straight = no change', () => expect(executeStep(origin, 'TY', 'straight').facing).toBe(0));
  test('TL from N = NW', () => expect(executeStep(origin, 'TL', 'straight').facing).toBe(5));
  test('TR from N = NE', () => expect(executeStep(origin, 'TR', 'straight').facing).toBe(1));
});

describe('executeStep — pitch', () => {
  const origin = { q: 0, r: 0, facing: 0, altitude: 3 };

  test('PU from 3 = 4', () => expect(executeStep(origin, 'PU', 'straight', 5).altitude).toBe(4));
  test('PU at ceiling stays', () => expect(executeStep({ ...origin, altitude: 5 }, 'PU', 'straight', 5).altitude).toBe(5));
  test('PD from 3 = 2', () => expect(executeStep(origin, 'PD', 'straight').altitude).toBe(2));
  test('PD at 0 stays', () => expect(executeStep({ ...origin, altitude: 0 }, 'PD', 'straight').altitude).toBe(0));
});

describe('executeMove — full card execution', () => {
  const origin = { q: 0, r: 0, facing: 0, altitude: 3 };
  const yawLeft = { direction: 'left' };
  const yawStraight = { direction: 'straight' };
  const pitchLevel = { direction: 'level' };
  const pitchClimb = { direction: 'climb' };
  const pitchDive = { direction: 'dive' };

  test('Slow straight level', () => {
    const r = executeMove(origin, { steps: ['M1,0,0', 'TY'] }, yawStraight, pitchLevel, 5);
    expect({ q: r.q, r: r.r, facing: r.facing }).toEqual({ q: 0, r: -1, facing: 0 });
  });

  test('Slow left turns NW', () => {
    const r = executeMove(origin, { steps: ['M1,0,0', 'TY'] }, yawLeft, pitchLevel, 5);
    expect({ q: r.q, r: r.r, facing: r.facing }).toEqual({ q: 0, r: -1, facing: 5 });
  });

  test('Slow climb increases altitude', () => {
    const r = executeMove(origin, { steps: ['M1,0,0', 'TY'] }, yawStraight, pitchClimb, 5);
    expect(r.altitude).toBe(4);
  });

  test('Slow dive decreases altitude', () => {
    const r = executeMove(origin, { steps: ['M1,0,0', 'TY'] }, yawStraight, pitchDive, 5);
    expect(r.altitude).toBe(2);
  });

  test('Dash moves 3 forward', () => {
    const r = executeMove(origin, { steps: ['M1,0,0', 'M1,0,0', 'M1,0,0'] }, yawStraight, pitchLevel, 5);
    expect({ q: r.q, r: r.r }).toEqual({ q: 0, r: -3 });
  });

  test('Slip left moves NW, no rotation', () => {
    const r = executeMove(origin, { steps: ['MY'] }, yawLeft, pitchLevel, 5);
    expect({ q: r.q, r: r.r, facing: r.facing }).toEqual({ q: -1, r: 0, facing: 0 });
  });

  test('Immelman: stay in place, 180 turn, +1 alt', () => {
    const r = executeMove(origin, { steps: ['PU', 'TL', 'TL', 'TL'] }, yawStraight, pitchLevel, 5);
    expect({ q: r.q, r: r.r, facing: r.facing, altitude: r.altitude })
      .toEqual({ q: 0, r: 0, facing: 3, altitude: 4 });
  });
});

describe('executeMoveWithPath', () => {
  const origin = { q: 0, r: 0, facing: 0, altitude: 3 };

  test('Straight path has 3 points', () => {
    const { path } = executeMoveWithPath(origin, { steps: ['M1,0,0', 'M1,0,0', 'TY'] }, { direction: 'straight' }, { direction: 'level' }, 5);
    expect(path).toHaveLength(3);
    expect(path[0]).toEqual({ q: 0, r: 0 });
    expect(path[2]).toEqual({ q: 0, r: -2 });
  });
});
