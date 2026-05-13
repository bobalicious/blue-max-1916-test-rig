import { aircraftSvgHtml, yawIconHtml, pitchIconHtml, circledYawIcon, circledPitchIcon } from './js/aircraft-shape.js';

const PLANE_UP = aircraftSvgHtml(12, 0, 'dia-plane');
function planeTurned(deg) { return aircraftSvgHtml(12, deg, 'dia-plane'); }

const YAW_ALL = ['left', 'straight', 'right'];
const PITCH_ALL = ['climb', 'level', 'dive'];
const CATEGORY_LABELS = { straight: 'Straight', turn: 'Turn', special: 'Special', utility: 'Utility' };
const CATEGORY_SYMBOLS = { straight: '⟶', turn: '↻', special: '★', utility: '⚙' };

function buildMinimalYaw(allowed) {
  const disallowed = YAW_ALL.filter(o => !allowed.includes(o));
  if (disallowed.length === 0) return '';
  if (disallowed.length <= allowed.length) {
    return disallowed.map(o => circledYawIcon(o, 'red')).join(' ');
  }
  return allowed.map(o => circledYawIcon(o, 'green')).join(' ');
}

function buildMinimalPitch(allowed) {
  const disallowed = PITCH_ALL.filter(o => !allowed.includes(o));
  if (disallowed.length === 0) return '';
  if (disallowed.length <= allowed.length) {
    return disallowed.map(o => circledPitchIcon(o, 'red')).join(' ');
  }
  return allowed.map(o => circledPitchIcon(o, 'green')).join(' ');
}

  if (disallowed.length <= allowed.length) {
    return disallowed.map(o => `<span class="rsym rsym-red">${symbols[o]}</span>`).join(' ');
  }
  return allowed.map(o => `<span class="rsym rsym-green">${symbols[o]}</span>`).join(' ');
}

function buildPrevNextHtml(card, which) {
  const mustBe = card[`${which}MustBe`];
  const cannotBe = card[`${which}CannotBe`];
  const parts = [];
  if (mustBe) parts.push(mustBe.map(c => `<span class="rsym rsym-green">${CATEGORY_SYMBOLS[c]}</span>`).join(' '));
  if (cannotBe) parts.push(cannotBe.map(c => `<span class="rsym rsym-red">${CATEGORY_SYMBOLS[c]}</span>`).join(' '));
  return parts.join(' ');
}

function buildDiagramFromSteps(steps) {
  if (!steps || steps.length === 0) return '';

  const fwdCount = steps.filter(s => s.startsWith('M') && s !== 'MY').length;
  const hasTY = steps.includes('TY');
  const hasMY = steps.includes('MY');
  const tlCount = steps.filter(s => s === 'TL').length;
  const explicitTurnCount = tlCount + steps.filter(s => s === 'TR').length;
  const puCount = steps.filter(s => s === 'PU').length;
  const pdCount = steps.filter(s => s === 'PD').length;

  function hex(cls, marker) {
    return `<div class="dia-hex ${cls}"><span class="dia-marker">${marker || ''}</span></div>`;
  }

  function altLabel() {
    if (puCount > 0) return `<div class="dia-alt-label">+${puCount} alt</div>`;
    if (pdCount > 0) return `<div class="dia-alt-label">-${pdCount} alt</div>`;
    return '';
  }

  if (hasMY) {
    return `<div class="diagram diagram-turn">
      <div class="dia-turn-results">${hex('dia-end', PLANE_UP)}${hex('dia-end', PLANE_UP)}</div>
      ${hex('dia-start', PLANE_UP)}
    </div>`;
  }

  if (explicitTurnCount >= 3 && fwdCount === 0) {
    return `<div class="diagram diagram-forward">
      ${hex('dia-end', planeTurned(180))}
      ${hex('dia-start', PLANE_UP)}
      ${altLabel()}
    </div>`;
  }

  if (fwdCount === 0 && hasTY) {
    const tyCount = steps.filter(s => s === 'TY').length;
    const deg = tyCount * 60;
    return `<div class="diagram diagram-turn">
      <div class="dia-turn-results">
        ${hex('dia-end', planeTurned(-deg))}
        ${hex('dia-end', planeTurned(deg))}
      </div>
      ${hex('dia-start', PLANE_UP)}
      ${altLabel()}
    </div>`;
  }

  if (fwdCount > 0 && hasTY) {
    const fwdHexes = [];
    for (let i = fwdCount - 1; i >= 0; i--) {
      fwdHexes.push(hex(i === 0 ? 'dia-start' : '', i === 0 ? PLANE_UP : ''));
    }
    return `<div class="diagram diagram-forward-turn">
      <div class="dia-turn-results">
        ${hex('dia-end', planeTurned(-60))}
        ${hex('dia-end', planeTurned(60))}
      </div>
      ${fwdHexes.join('')}
      ${altLabel()}
    </div>`;
  }

  if (fwdCount > 0) {
    const hexes = [];
    for (let i = fwdCount; i >= 0; i--) {
      const isEnd = i === fwdCount;
      const isStart = i === 0;
      hexes.push(hex(isStart ? 'dia-start' : isEnd ? 'dia-end' : '', isStart ? PLANE_UP : ''));
    }
    return `<div class="diagram diagram-forward">${hexes.join('')}${altLabel()}</div>`;
  }

  return `<div class="diagram diagram-forward">${hex('dia-start', PLANE_UP)}${altLabel()}</div>`;
}

function buildNotes(card) {
  const parts = [];
  if (card.restriction) parts.push(card.restriction);
  if (card.effect) parts.push(card.effect);
  if (card.noFire) parts.push('Cannot fire guns');
  return parts.join('. ');
}

const preprocessors = {
  maneuver(card) {
    const yawHtml = buildMinimalYaw(card.yaw);
    const pitchHtml = buildMinimalPitch(card.pitch);
    const currentHtml = [yawHtml, pitchHtml].filter(Boolean).join(' ');

    return {
      ...card,
      previousHtml: buildPrevNextHtml(card, 'previous'),
      currentHtml,
      nextHtml: buildPrevNextHtml(card, 'next'),
      diagramHtml: buildDiagramFromSteps(card.steps),
      subtitleHtml: card.subtitle || '',
      notesHtml: buildNotes(card),
    };
  },
  yaw(card) {
    return {
      ...card,
      directionLabel: card.direction.charAt(0).toUpperCase() + card.direction.slice(1),
      symbol: yawIconHtml(card.direction, 28),
    };
  },
  pitch(card) {
    return {
      ...card,
      directionLabel: card.direction.charAt(0).toUpperCase() + card.direction.slice(1),
      symbol: pitchIconHtml(card.direction, 35),
    };
  },
};

async function loadTemplate(type) {
  const response = await fetch(`templates/${type}.html`);
  if (!response.ok) {
    console.warn(`No template found for type: ${type}`);
    return null;
  }
  return response.text();
}

function renderTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] !== undefined ? data[key] : '';
  });
}

async function init() {
  const decksResponse = await fetch('decks.json');
  const decks = await decksResponse.json();
  const container = document.getElementById('card-container');
  const templateCache = {};

  for (const deck of decks) {
    const section = document.createElement('section');
    section.className = 'deck-section';

    const heading = document.createElement('h2');
    heading.className = 'deck-heading';
    heading.textContent = deck.name;
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'card-grid';
    section.appendChild(grid);

    const response = await fetch(deck.file);
    const cards = await response.json();

    for (const card of cards) {
      if (!templateCache[card.type]) {
        templateCache[card.type] = await loadTemplate(card.type);
      }
      const template = templateCache[card.type];
      if (!template) continue;

      const preprocess = preprocessors[card.type];
      const processed = preprocess ? preprocess(card) : card;
      const count = card.count || 1;

      for (let i = 0; i < count; i++) {
        grid.insertAdjacentHTML('beforeend', renderTemplate(template, processed));
      }
    }

    container.appendChild(section);
  }
}

init();
