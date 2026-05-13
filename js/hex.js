// Flat-top hex grid math and step-based movement execution.
// Axial coordinates (q, r). Aircraft faces through hex edges.
// Direction 0 = North (straight up through top flat edge).

export const HEX_DIRECTIONS = [
  { dq:  0, dr: -1 },  // 0: N
  { dq: +1, dr: -1 },  // 1: NE
  { dq: +1, dr:  0 },  // 2: SE
  { dq:  0, dr: +1 },  // 3: S
  { dq: -1, dr: +1 },  // 4: SW
  { dq: -1, dr:  0 },  // 5: NW
];

export const DIRECTION_NAMES = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

export function hexNeighbor(q, r, direction) {
  const d = HEX_DIRECTIONS[(direction % 6 + 6) % 6];
  return { q: q + d.dq, r: r + d.dr };
}

export function hexToPixel(q, r, size) {
  const x = size * (3 / 2) * q;
  const y = size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

export function pixelToHex(x, y, size) {
  const q = (2 / 3) * x / size;
  const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / size;
  return hexRound(q, r);
}

function hexRound(qf, rf) {
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  let s = Math.round(sf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) {
    q = -r - s;
  } else if (dr > ds) {
    r = -q - s;
  }
  return { q, r };
}

export function hexCorners(cx, cy, size) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: cx + size * Math.cos(angleRad),
      y: cy + size * Math.sin(angleRad),
    });
  }
  return corners;
}

export function facingAngle(facing) {
  return facing * 60;
}

// Compute a viewBox that shows the entire grid, centred on (centerQ, centerR).
// svgWidth/svgHeight are the pixel dimensions of the SVG element.
// Returns { x, y, w, h } for the viewBox attribute.
// viewRadius: how many hexes of vertical range to show (defaults to half the grid rows, capped at 10).
// The viewBox is sized to show `viewRadius` hexes vertically, and uses the SVG aspect ratio
// to determine the horizontal extent. No content-based aspect adjustment — preserveAspectRatio
// on the SVG element handles any mismatch.
export function computeViewBox(cols, rows, hexSize, centerQ, centerR, svgWidth, svgHeight, zoom = 1, viewRadius) {
  const halfC = Math.floor(cols / 2);
  const halfR = Math.floor(rows / 2);
  const radius = viewRadius || Math.min(halfR, 7);

  // Compute the actual pixel extent of hexes within the view radius
  // Check all edge hexes to find the true min/max y (q offset affects y)
  const radiusW = Math.min(halfC, radius);
  let minY = Infinity, maxY = -Infinity;
  for (const q of [-radiusW, 0, radiusW]) {
    for (const r of [-radius, radius]) {
      const p = hexToPixel(q, r, hexSize);
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }

  const margin = hexSize * 1.5;
  const h = (maxY - minY) + margin * 2;

  const svgAspect = svgWidth / svgHeight;
  const w = h * svgAspect;

  const center = hexToPixel(centerQ, centerR, hexSize);

  const zw = w / zoom;
  const zh = h / zoom;

  return {
    x: center.x - zw / 2,
    y: center.y - zh / 2,
    w: zw,
    h: zh,
  };
}

export function hexDistance(a, b) {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function bearingFromTo(from, to) {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  const px = dq * 1.5;
  const py = dq * Math.sqrt(3) / 2 + dr * Math.sqrt(3);
  const angle = ((Math.atan2(px, -py) * 180 / Math.PI) + 360) % 360;
  return Math.round(angle / 60) % 6;
}

export function rotateFacing(facing, amount) {
  return ((facing + amount) % 6 + 6) % 6;
}

// --- Step execution ---

function parseMoveStep(step) {
  const parts = step.substring(1).split(',').map(Number);
  return { fwd: parts[0] || 0, left: parts[1] || 0, right: parts[2] || 0 };
}

function moveInDirection(q, r, direction, count) {
  const d = HEX_DIRECTIONS[(direction % 6 + 6) % 6];
  const sign = count >= 0 ? 1 : -1;
  const absCount = Math.abs(count);
  for (let i = 0; i < absCount; i++) {
    q += d.dq * sign;
    r += d.dr * sign;
  }
  return { q, r };
}

export function executeStep(state, step, yawDirection, ceiling = 99) {
  let { q, r, facing, altitude } = state;

  if (step === 'MY') {
    let dir = facing;
    if (yawDirection === 'left') dir = (facing + 5) % 6;
    else if (yawDirection === 'right') dir = (facing + 1) % 6;
    ({ q, r } = moveInDirection(q, r, dir, 1));
  } else if (step.startsWith('M')) {
    const { fwd, left, right } = parseMoveStep(step);
    const fwdDir = facing;
    const leftDir = (facing + 5) % 6;
    const rightDir = (facing + 1) % 6;
    ({ q, r } = moveInDirection(q, r, fwdDir, fwd));
    ({ q, r } = moveInDirection(q, r, leftDir, left));
    ({ q, r } = moveInDirection(q, r, rightDir, right));
  } else if (step === 'TY') {
    if (yawDirection === 'left') facing = rotateFacing(facing, -1);
    else if (yawDirection === 'right') facing = rotateFacing(facing, 1);
  } else if (step === 'TL') {
    facing = rotateFacing(facing, -1);
  } else if (step === 'TR') {
    facing = rotateFacing(facing, 1);
  } else if (step === 'PU') {
    altitude = Math.min(altitude + 1, ceiling);
  } else if (step === 'PD') {
    altitude = Math.max(altitude - 1, 0);
  }

  return { q, r, facing, altitude };
}

export function executeMove(aircraft, maneuver, yaw, pitch, ceiling = 99) {
  let state = { ...aircraft };

  for (const step of maneuver.steps) {
    state = executeStep(state, step, yaw.direction, ceiling);
  }

  if (pitch.direction === 'climb') {
    state.altitude = Math.min(state.altitude + 1, ceiling);
  } else if (pitch.direction === 'dive') {
    state.altitude = state.altitude - 1;
  }

  return state;
}

export function executeMoveWithPath(aircraft, maneuver, yaw, pitch, ceiling = 99) {
  let state = { ...aircraft };
  const path = [{ q: state.q, r: state.r }];

  for (const step of maneuver.steps) {
    state = executeStep(state, step, yaw.direction, ceiling);
    if (state.q !== path[path.length - 1].q || state.r !== path[path.length - 1].r) {
      path.push({ q: state.q, r: state.r });
    }
  }

  if (pitch.direction === 'climb') {
    state.altitude = Math.min(state.altitude + 1, ceiling);
  } else if (pitch.direction === 'dive') {
    state.altitude = state.altitude - 1;
  }

  return { state, path };
}
