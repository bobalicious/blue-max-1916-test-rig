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
// `size` is the pixel width/height of the rendered SVG element.
// `rotation` is in degrees (0 = north/up).
// `cls` is an optional CSS class for the SVG element.
export function aircraftSvgHtml(size = 14, rotation = 0, cls = '') {
  const s = 10;
  const d = aircraftPath(s);
  const vb = `-${s * 1.1} ${-s * 0.85} ${s * 2.2} ${s * 1.7}`;
  return `<svg class="aircraft-icon ${cls}" width="${size}" height="${size}" viewBox="${vb}" style="transform:rotate(${rotation}deg)"><path d="${d}"/></svg>`;
}
