// Shared aircraft silhouette — WW1 biplane top-down view, pointing north (up).
// All coordinates are relative to scale `s` (centre at 0,0).

export function aircraftPath(s) {
  return [
    `M ${-s * 0.06},${-s * 0.78}`,
    `L ${s * 0.06},${-s * 0.78}`,
    `L ${s * 0.09},${-s * 0.72}`,
    `L ${s * 0.09},${-s * 0.50}`,
    `L ${s * 1.0},${-s * 0.50}`,
    `L ${s * 1.02},${-s * 0.26}`,
    `L ${s * 1.0},${-s * 0.02}`,
    `L ${s * 0.09},${-s * 0.02}`,
    `L ${s * 0.07},${s * 0.35}`,
    `L ${s * 0.05},${s * 0.55}`,
    `L ${s * 0.31},${s * 0.53}`,
    `L ${s * 0.31},${s * 0.69}`,
    `L ${s * 0.05},${s * 0.66}`,
    `L ${s * 0.03},${s * 0.78}`,
    `L 0,${s * 0.82}`,
    `L ${-s * 0.03},${s * 0.78}`,
    `L ${-s * 0.05},${s * 0.66}`,
    `L ${-s * 0.31},${s * 0.69}`,
    `L ${-s * 0.31},${s * 0.53}`,
    `L ${-s * 0.05},${s * 0.55}`,
    `L ${-s * 0.07},${s * 0.35}`,
    `L ${-s * 0.09},${-s * 0.02}`,
    `L ${-s * 1.0},${-s * 0.02}`,
    `L ${-s * 1.02},${-s * 0.26}`,
    `L ${-s * 1.0},${-s * 0.50}`,
    `L ${-s * 0.09},${-s * 0.50}`,
    `L ${-s * 0.09},${-s * 0.72}`,
    `L ${-s * 0.06},${-s * 0.78}`,
    'Z',
  ].join(' ');
}

// Inline SVG markup for use in HTML (e.g. card diagrams).
export function aircraftSvgHtml(size = 14, rotation = 0, cls = '') {
  const s = 10;
  const d = aircraftPath(s);
  const vb = `-${s * 1.1} ${-s * 0.85} ${s * 2.2} ${s * 1.7}`;
  return `<svg class="aircraft-icon ${cls}" width="${size}" height="${size}" viewBox="${vb}" style="transform:rotate(${rotation}deg)"><path d="${d}"/></svg>`;
}

// Side-view biplane silhouette (pointing right — nose on right, tail on left).
// Fuselage is rectangular, bottom tapers up toward the tail (left).
// Two wings at ~2/3 forward, upper slightly ahead of lower, overlapping.
export function sideViewPath(s) {
  // Fuselage top: y = -s*0.125, bottom: y = s*0.125 at nose
  // Bottom tapers from x = s*0.3 all the way back to tailplane rear at x = -s*0.8

  return [
    // --- Fuselage + tail (single shape) ---
    // Nose top
    `M ${s * 0.8},${-s * 0.125}`,
    // Top fuselage to tail
    `L ${-s * 0.55},${-s * 0.125}`,
    // Tail fin
    `L ${-s * 0.55},${-s * 0.3}`,
    `L ${-s * 0.8},${-s * 0.3}`,
    `L ${-s * 0.8},${-s * 0.125}`,
    // Tailplane bottom
    `L ${-s * 0.8},${-s * 0.04}`,
    // Bottom taper — shallow, from tailplane rear all the way forward
    `L ${s * 0.3},${s * 0.125}`,
    // Bottom fuselage flat to nose
    `L ${s * 0.8},${s * 0.125}`,
    'Z',

    // --- Upper wing (separate, no struts) ---
    `M ${s * 0.6},${-s * 0.24}`,
    `L ${s * 0.6},${-s * 0.32}`,
    `L ${s * 0.05},${-s * 0.32}`,
    `L ${s * 0.05},${-s * 0.24}`,
    'Z',

    // --- Lower wing (25% shorter, separate) ---
    `M ${s * 0.4},${s * 0.2}`,
    `L ${s * 0.4},${s * 0.28}`,
    `L ${-s * 0.01},${s * 0.28}`,
    `L ${-s * 0.01},${s * 0.2}`,
    'Z',
  ].join(' ');
}

// Side-view inline SVG (pointing right, rotated for climb/dive).
export function sideViewSvgHtml(size = 14, rotation = 0, cls = '') {
  const s = 10;
  const d = sideViewPath(s);
  const vb = `${-s * 0.9} ${-s * 0.38} ${s * 1.8} ${s * 0.72}`;
  return `<svg class="aircraft-icon ${cls}" width="${size}" height="${size * 0.55}" viewBox="${vb}" style="transform:rotate(${rotation}deg)"><path d="${d}" fill-rule="nonzero"/></svg>`;
}

// Yaw icons: top-down aircraft at -60°, 0°, +60°
export function yawIconHtml(direction, size = 12) {
  const angles = { left: -60, straight: 0, right: 60 };
  return aircraftSvgHtml(size, angles[direction] || 0, 'yaw-icon');
}

// Pitch icons: side-view aircraft at -20°, 0°, +20°
export function pitchIconHtml(direction, size = 14) {
  const angles = { climb: -25, level: 0, dive: 25 };
  return sideViewSvgHtml(size, angles[direction] || 0, 'pitch-icon');
}

// Circled indicator icon (for allowed/disallowed yaw/pitch on cards)
export function circledYawIcon(direction, color, size = 16) {
  const inner = yawIconHtml(direction, size * 0.6);
  return `<span class="circled-icon circled-${color}" style="width:${size}px;height:${size}px">${inner}</span>`;
}

export function circledPitchIcon(direction, color, size = 16) {
  const inner = pitchIconHtml(direction, size * 0.6);
  return `<span class="circled-icon circled-${color}" style="width:${size}px;height:${size}px">${inner}</span>`;
}
