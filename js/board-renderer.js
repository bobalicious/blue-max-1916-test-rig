import { hexToPixel, pixelToHex, hexCorners, facingAngle, DIRECTION_NAMES, HEX_DIRECTIONS } from './hex.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createAircraftPath(scale) {
  const s = scale;
  return [
    // Nose — engine cowling, rounded
    `M ${-s * 0.06},${-s * 0.78}`,
    `L ${s * 0.06},${-s * 0.78}`,
    `L ${s * 0.09},${-s * 0.72}`,
    // Right fuselage to wing
    `L ${s * 0.09},${-s * 0.50}`,
    // Right wing — rectangular, deep chord
    `L ${s * 1.0},${-s * 0.50}`,
    // Right wingtip — slight round
    `L ${s * 1.02},${-s * 0.26}`,
    `L ${s * 1.0},${-s * 0.02}`,
    // Right wing trailing edge back to fuselage
    `L ${s * 0.09},${-s * 0.02}`,
    // Right fuselage tapers to tail
    `L ${s * 0.07},${s * 0.35}`,
    `L ${s * 0.05},${s * 0.55}`,
    // Right tailplane
    `L ${s * 0.31},${s * 0.53}`,
    `L ${s * 0.31},${s * 0.69}`,
    `L ${s * 0.05},${s * 0.66}`,
    // Tail
    `L ${s * 0.03},${s * 0.78}`,
    `L 0,${s * 0.82}`,
    // ── Mirror left ──
    `L ${-s * 0.03},${s * 0.78}`,
    `L ${-s * 0.05},${s * 0.66}`,
    // Left tailplane
    `L ${-s * 0.31},${s * 0.69}`,
    `L ${-s * 0.31},${s * 0.53}`,
    `L ${-s * 0.05},${s * 0.55}`,
    // Left fuselage taper
    `L ${-s * 0.07},${s * 0.35}`,
    `L ${-s * 0.09},${-s * 0.02}`,
    // Left wing — trailing edge
    `L ${-s * 1.0},${-s * 0.02}`,
    // Left wingtip
    `L ${-s * 1.02},${-s * 0.26}`,
    `L ${-s * 1.0},${-s * 0.50}`,
    // Left wing — leading edge back to fuselage
    `L ${-s * 0.09},${-s * 0.50}`,
    // Left fuselage to nose
    `L ${-s * 0.09},${-s * 0.72}`,
    `L ${-s * 0.06},${-s * 0.78}`,
    'Z',
  ].join(' ');
}

export class BoardRenderer {
  constructor(svgElement, gridRadius, hexSize) {
    this.svg = svgElement;
    this.gridRadius = gridRadius;
    this.hexSize = hexSize;
    this.aircraftScale = hexSize * 0.55;

    this.gridLayer = this._createLayer('grid-layer');
    this.highlightLayer = this._createLayer('highlight-layer');
    this.pathLayer = this._createLayer('path-layer');
    this.ghostLayer = this._createLayer('ghost-layer');
    this.aircraftLayer = this._createLayer('aircraft-layer');
    this.labelLayer = this._createLayer('label-layer');

    this.zoom = 1;
    this.viewCenterQ = 0;
    this.viewCenterR = 0;

    this._updateViewBox(0, 0);
    this.renderGrid();

    this.onSelectAircraft = null;

    this.svg.addEventListener('click', (e) => {
      const aircraftEl = e.target.closest('.aircraft-current');
      const hex = e.target.closest('.hex-cell');

      if (aircraftEl) {
        const transform = aircraftEl.getAttribute('transform');
        const match = transform.match(/translate\(([-\d.]+),([-\d.]+)\)/);
        if (match) {
          const hx = pixelToHex(parseFloat(match[1]), parseFloat(match[2]), this.hexSize);
          if (this.onSelectAircraft) this.onSelectAircraft(hx.q, hx.r);
        }
        return;
      }

      if (hex) {
        const q = parseInt(hex.getAttribute('data-q'));
        const r = parseInt(hex.getAttribute('data-r'));
        if (this.zoom > 1 && this.viewCenterQ === q && this.viewCenterR === r) {
          this.zoomOut();
        } else {
          this.zoom = 3;
          this.viewCenterQ = q;
          this.viewCenterR = r;
          this._updateViewBox(q, r, 3);
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.zoom > 1) this.zoomOut();
        this.clearFiringArc();
        if (this.onSelectAircraft) this.onSelectAircraft(null, null);
      }
    });
  }

  _createLayer(id) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('id', id);
    this.svg.appendChild(g);
    return g;
  }

  _updateViewBox(centerQ, centerR, zoom = 1) {
    const { x, y } = hexToPixel(centerQ, centerR, this.hexSize);
    const baseW = this.hexSize * (this.gridRadius * 2 + 4) * 1.8;
    const w = baseW / zoom;
    const h = w * 0.75;
    this.svg.setAttribute('viewBox', `${x - w / 2} ${y - h / 2} ${w} ${h}`);
  }

  renderGrid() {
    this.gridLayer.innerHTML = '';
    const r = this.gridRadius;
    for (let q = -r; q <= r; q++) {
      for (let rr = Math.max(-r, -q - r); rr <= Math.min(r, -q + r); rr++) {
        this._drawHex(q, rr);
      }
    }
  }

  _drawHex(q, r) {
    const { x, y } = hexToPixel(q, r, this.hexSize);
    const corners = hexCorners(x, y, this.hexSize);
    const points = corners.map(c => `${c.x},${c.y}`).join(' ');

    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('points', points);
    polygon.setAttribute('class', 'hex-cell');
    polygon.setAttribute('data-q', q);
    polygon.setAttribute('data-r', r);
    this.gridLayer.appendChild(polygon);
  }

  renderAircraft(aircraftList) {
    this.aircraftLayer.innerHTML = '';
    this.highlightLayer.innerHTML = '';

    const player = aircraftList.find(a => a.isPlayer);
    if (player && !player.crashed && !player.landed) {
      this._drawHighlightHex(player.q, player.r);
    }

    for (const ac of aircraftList) {
      if (ac.crashed || ac.landed) continue;
      const cls = `aircraft-current aircraft-side-${ac.side}`;
      this._drawAircraft(ac, cls);
    }
  }

  zoomOut() {
    this.zoom = 1;
    this._updateViewBox(this.baseCenterQ, this.baseCenterR, 1);
  }

  centerOn(q, r) {
    this.baseCenterQ = q;
    this.baseCenterR = r;
    this.zoom = 1;
    this._updateViewBox(q, r, 1);
  }

  _drawHighlightHex(q, r, cls = 'hex-player-highlight') {
    const { x, y } = hexToPixel(q, r, this.hexSize);
    const corners = hexCorners(x, y, this.hexSize);
    const points = corners.map(c => `${c.x},${c.y}`).join(' ');
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('points', points);
    polygon.setAttribute('class', cls);
    this.highlightLayer.appendChild(polygon);
  }

  highlightCombat(attacker, target) {
    this._drawHighlightHex(attacker.q, attacker.r, 'hex-attacker-highlight');
    this._drawHighlightHex(target.q, target.r, 'hex-target-highlight');
  }

  clearCombatHighlights() {
    this.highlightLayer.querySelectorAll('.hex-attacker-highlight, .hex-target-highlight')
      .forEach(el => el.remove());
  }

  renderFiringArc(ac) {
    this.clearFiringArc();
    if (!ac || ac.crashed || ac.destroyed) return;

    const fwd = HEX_DIRECTIONS[ac.facing];
    const left = HEX_DIRECTIONS[(ac.facing + 5) % 6];
    const right = HEX_DIRECTIONS[(ac.facing + 1) % 6];

    let q = ac.q, r = ac.r;
    for (let d = 1; d <= 5; d++) {
      q += fwd.dq;
      r += fwd.dr;
      this._drawHighlightHex(q, r, 'hex-arc-center');
      if (d <= 4) {
        this._drawHighlightHex(q + left.dq, r + left.dr, 'hex-arc-side');
        this._drawHighlightHex(q + right.dq, r + right.dr, 'hex-arc-side');
      }
    }
  }

  clearFiringArc() {
    this.highlightLayer.querySelectorAll('.hex-arc-center, .hex-arc-side')
      .forEach(el => el.remove());
  }

  renderGhosts(aircraftList) {
    this.ghostLayer.innerHTML = '';
    this.pathLayer.innerHTML = '';

    for (const ac of aircraftList) {
      if (!ac.moveHistory || ac.moveHistory.length === 0) continue;

      ac.moveHistory.forEach((state, i) => {
        const opacity = 0.15 + (i / Math.max(ac.moveHistory.length, 1)) * 0.2;
        this._drawAircraft(
          { ...state, side: ac.side },
          `aircraft-ghost aircraft-side-${ac.side}`,
          opacity,
        );
      });

      if (ac.pathSegments) {
        this._drawPathLines(ac.pathSegments, ac.side, ac);
      }
    }
  }

  _drawPathLines(pathSegments, side, ac) {
    const allPoints = [];

    for (const segment of pathSegments) {
      for (const hex of segment) {
        const { x, y } = hexToPixel(hex.q, hex.r, this.hexSize);
        allPoints.push({ x, y });
      }
    }

    const currentPos = hexToPixel(ac.q, ac.r, this.hexSize);
    const lastPt = allPoints[allPoints.length - 1];
    if (!lastPt || lastPt.x !== currentPos.x || lastPt.y !== currentPos.y) {
      allPoints.push(currentPos);
    }

    if (allPoints.length < 2) return;

    const d = allPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', `flight-path flight-path-side-${side}`);
    this.pathLayer.appendChild(path);
  }

  _drawAircraft(state, className, opacity) {
    const { x, y } = hexToPixel(state.q, state.r, this.hexSize);
    const angle = facingAngle(state.facing);

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', `translate(${x},${y}) rotate(${angle})`);
    g.setAttribute('class', className);
    if (opacity !== undefined) g.setAttribute('opacity', opacity);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', createAircraftPath(this.aircraftScale));
    g.appendChild(path);

    const badgeG = document.createElementNS(SVG_NS, 'g');
    badgeG.setAttribute('transform', `rotate(${-angle})`);

    const badgeR = this.aircraftScale * 0.45;
    const badgeY = this.aircraftScale * 1.15;
    const badge = document.createElementNS(SVG_NS, 'circle');
    badge.setAttribute('cx', 0);
    badge.setAttribute('cy', badgeY);
    badge.setAttribute('r', badgeR);
    badge.setAttribute('class', 'altitude-badge');
    badgeG.appendChild(badge);

    const altText = document.createElementNS(SVG_NS, 'text');
    altText.setAttribute('class', 'aircraft-altitude');
    altText.setAttribute('x', 0);
    altText.setAttribute('y', badgeY);
    altText.setAttribute('text-anchor', 'middle');
    altText.setAttribute('dominant-baseline', 'central');
    altText.textContent = state.altitude;
    badgeG.appendChild(altText);

    g.appendChild(badgeG);

    this.aircraftLayer.appendChild(g);
  }

  renderCardLabels(aircraftList, moveIndex) {
    this.labelLayer.innerHTML = '';
    if (moveIndex === undefined || moveIndex < 0) return;

    for (const ac of aircraftList) {
      if (ac.crashed || ac.landed) continue;
      const move = ac.playBoard[moveIndex];
      if (!move || !move.maneuver) continue;

      const { x, y } = hexToPixel(ac.q, ac.r, this.hexSize);
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('transform', `translate(${x + this.hexSize * 1.2},${y - this.hexSize * 0.6})`);
      g.setAttribute('class', `card-label card-label-side-${ac.side}`);

      const bg = document.createElementNS(SVG_NS, 'rect');
      bg.setAttribute('x', 0);
      bg.setAttribute('y', 0);
      bg.setAttribute('width', this.hexSize * 3);
      bg.setAttribute('height', this.hexSize * 1.2);
      bg.setAttribute('rx', 3);
      bg.setAttribute('class', 'card-label-bg');
      g.appendChild(bg);

      const lines = [
        move.maneuver.name,
        move.yaw ? `Yaw: ${move.yaw.direction}` : '',
        move.pitch ? `Pitch: ${move.pitch.direction}` : '',
      ].filter(Boolean);

      lines.forEach((text, i) => {
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', 4);
        t.setAttribute('y', 10 + i * 10);
        t.setAttribute('class', 'card-label-text');
        t.textContent = text;
        g.appendChild(t);
      });

      const nameTag = document.createElementNS(SVG_NS, 'text');
      nameTag.setAttribute('x', 4);
      nameTag.setAttribute('y', -4);
      nameTag.setAttribute('class', 'card-label-name');
      nameTag.textContent = ac.label;
      g.appendChild(nameTag);

      this.labelLayer.appendChild(g);
    }
  }

  renderCombatResults(results) {
    if (!results || results.length === 0) return;

    for (const { attacker, target, score, cards } of results) {
      if (!target || target.crashed) continue;

      const { x, y } = hexToPixel(target.q, target.r, this.hexSize);
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('transform', `translate(${x - this.hexSize * 3.5},${y - this.hexSize * 0.4})`);
      g.setAttribute('class', 'combat-label');

      const hits = cards.filter(c => c.result !== 'miss');
      const lines = [`${attacker.label} (${score})`];
      for (const { card } of cards) {
        lines.push(card.effect === 'none' ? 'Miss' : card.name);
      }

      const lineH = 9;
      const h = lines.length * lineH + 6;
      const w = this.hexSize * 2.8;

      const bg = document.createElementNS(SVG_NS, 'rect');
      bg.setAttribute('x', 0);
      bg.setAttribute('y', 0);
      bg.setAttribute('width', w);
      bg.setAttribute('height', h);
      bg.setAttribute('rx', 2);
      bg.setAttribute('class', hits.length > 0 ? 'combat-label-bg combat-hit' : 'combat-label-bg combat-miss');
      g.appendChild(bg);

      lines.forEach((text, i) => {
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', 3);
        t.setAttribute('y', 8 + i * lineH);
        t.setAttribute('class', i === 0 ? 'combat-label-header' : 'combat-label-text');
        t.textContent = text;
        g.appendChild(t);
      });

      this.labelLayer.appendChild(g);
    }
  }

  getAircraftInfo(state) {
    const dmg = state.damageCount ? ` | Dmg ${state.damageCount}/15` : '';
    const wnd = state.wounds ? ` | Wounds ${state.wounds}/3` : '';
    return `${state.label || ''} | ${DIRECTION_NAMES[state.facing]} | Alt ${state.altitude} | (${state.q}, ${state.r})${dmg}${wnd}`;
  }
}
