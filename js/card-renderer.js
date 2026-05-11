const YAW_ALL = ['left', 'straight', 'right'];
const PITCH_ALL = ['climb', 'level', 'dive'];
const YAW_SYMBOLS = { left: '←', straight: '↑', right: '→' };
const PITCH_SYMBOLS = { climb: '↗', level: '—', dive: '↘' };
const CATEGORY_LABELS = { straight: 'Straight', turn: 'Turn', special: 'Special', utility: 'Utility' };
const CATEGORY_SYMBOLS = { straight: '⟶', turn: '↻', special: '★', utility: '⚙' };

function buildMinimalIndicators(allowed, allOptions, symbols) {
  const disallowed = allOptions.filter(o => !allowed.includes(o));
  if (disallowed.length === 0) return '';
  if (disallowed.length <= allowed.length) {
    return disallowed.map(o => `<span class="rsym rsym-red">${symbols[o]}</span>`).join(' ');
  }
  return allowed.map(o => `<span class="rsym rsym-green">${symbols[o]}</span>`).join(' ');
}

function buildPrevNextHtml(card, which) {
  const mustBe = card[`${which}MustBe`];
  const cannotBe = card[`${which}CannotBe`];
  const mustBeName = card[`${which}MustBeName`];
  const cannotBeName = card[`${which}CannotBeName`];
  const parts = [];
  if (mustBe) parts.push(mustBe.map(c => `<span class="rsym rsym-green">${CATEGORY_SYMBOLS[c] || c}</span>`).join(' '));
  if (cannotBe) parts.push(cannotBe.map(c => `<span class="rsym rsym-red">${CATEGORY_SYMBOLS[c] || c}</span>`).join(' '));
  if (mustBeName) parts.push(mustBeName.map(n => `<span class="rsym rsym-green rsym-name">${n}</span>`).join(' '));
  if (cannotBeName) parts.push(cannotBeName.map(n => `<span class="rsym rsym-red rsym-name">${n}</span>`).join(' '));
  return parts.join(' ');
}

function buildDiagramFromSteps(steps) {
  if (!steps || steps.length === 0) return '';

  const fwdSteps = steps.filter(s => s.startsWith('M') && s !== 'MY');
  const fwdCount = fwdSteps.length;
  const hasTY = steps.includes('TY');
  const hasMY = steps.includes('MY');
  const tlCount = steps.filter(s => s === 'TL').length;
  const trCount = steps.filter(s => s === 'TR').length;
  const explicitTurnCount = tlCount + trCount;
  const puCount = steps.filter(s => s === 'PU').length;
  const pdCount = steps.filter(s => s === 'PD').length;

  if (hasMY) {
    return buildSlipDiagram();
  }

  if (explicitTurnCount >= 3 && fwdCount === 0) {
    return buildSpecialTurnDiagram(explicitTurnCount, puCount, pdCount);
  }

  if (fwdCount === 0 && hasTY && puCount === 0 && pdCount === 0) {
    const tyCount = steps.filter(s => s === 'TY').length;
    return buildTurnDiagram(tyCount);
  }

  if (fwdCount === 0 && hasTY && (puCount > 0 || pdCount > 0)) {
    return buildStallDiagram(puCount, pdCount);
  }

  if (fwdCount > 0 && !hasTY && puCount === 0 && pdCount === 0) {
    return buildForwardDiagram(fwdCount);
  }

  if (fwdCount > 0 && hasTY) {
    return buildForwardTurnDiagram(fwdCount);
  }

  if (fwdCount > 0 && (puCount > 0 || pdCount > 0)) {
    return buildForwardAltDiagram(fwdCount, puCount, pdCount);
  }

  return buildFallbackDiagram(steps);
}

function hex(cls, marker = '') {
  return `<div class="dia-hex ${cls}"><span class="dia-marker">${marker}</span></div>`;
}

function buildForwardDiagram(count) {
  const hexes = [];
  for (let i = count; i >= 0; i--) {
    const isEnd = i === count;
    const isStart = i === 0;
    let cls = '';
    if (isStart) cls = 'dia-start';
    else if (isEnd) cls = 'dia-end';
    hexes.push(hex(cls, isStart ? '▲' : ''));
  }
  return `<div class="diagram diagram-forward">${hexes.join('')}</div>`;
}

function buildForwardTurnDiagram(fwdCount) {
  const fwdHexes = [];
  for (let i = fwdCount - 1; i >= 0; i--) {
    const isStart = i === 0;
    fwdHexes.push(hex(isStart ? 'dia-start' : '', isStart ? '▲' : ''));
  }

  return `<div class="diagram diagram-forward-turn">
    <div class="dia-turn-results">
      ${hex('dia-end', `<span style="display:inline-block;transform:rotate(-60deg)">▲</span>`)}
      ${hex('dia-end', `<span style="display:inline-block;transform:rotate(60deg)">▲</span>`)}
    </div>
    ${fwdHexes.join('')}
  </div>`;
}

function buildTurnDiagram(tyCount) {
  const deg = tyCount * 60;
  return `<div class="diagram diagram-turn">
    <div class="dia-turn-results">
      ${hex('dia-end', `<span style="display:inline-block;transform:rotate(-${deg}deg)">▲</span>`)}
      ${hex('dia-end', `<span style="display:inline-block;transform:rotate(${deg}deg)">▲</span>`)}
    </div>
    ${hex('dia-start', '▲')}
  </div>`;
}

function buildSlipDiagram() {
  return `<div class="diagram diagram-turn">
    <div class="dia-turn-results">
      ${hex('dia-end', '▲')}
      ${hex('dia-end', '▲')}
    </div>
    ${hex('dia-start', '▲')}
  </div>`;
}

function buildSpecialTurnDiagram(turnCount, puCount, pdCount) {
  const deg = turnCount * 60;
  let altLabel = '';
  if (puCount > 0) altLabel = `+${puCount} alt`;
  if (pdCount > 0) altLabel = `-${pdCount} alt`;

  return `<div class="diagram diagram-special">
    ${hex('dia-end', `<span style="display:inline-block;transform:rotate(180deg)">▲</span>`)}
    ${hex('dia-start', '▲')}
    ${altLabel ? `<div class="dia-alt-label">${altLabel}</div>` : ''}
  </div>`;
}

function buildStallDiagram(puCount, pdCount) {
  let altLabel = '';
  if (puCount > 0) altLabel = `+${puCount} alt`;
  if (pdCount > 0) altLabel = `-${pdCount} alt`;

  return `<div class="diagram diagram-special">
    ${hex('dia-start', '▲')}
    ${altLabel ? `<div class="dia-alt-label">${altLabel}</div>` : ''}
  </div>`;
}

function buildForwardAltDiagram(fwdCount, puCount, pdCount) {
  let altLabel = '';
  if (puCount > 0) altLabel = `+${puCount} alt`;
  if (pdCount > 0) altLabel = `-${pdCount} alt`;

  const hexes = [];
  for (let i = fwdCount; i >= 0; i--) {
    const isEnd = i === fwdCount;
    const isStart = i === 0;
    let cls = '';
    if (isStart) cls = 'dia-start';
    else if (isEnd) cls = 'dia-end';
    hexes.push(hex(cls, isStart ? '▲' : ''));
  }
  return `<div class="diagram diagram-forward">
    ${hexes.join('')}
    ${altLabel ? `<div class="dia-alt-label">${altLabel}</div>` : ''}
  </div>`;
}

function buildFallbackDiagram(steps) {
  return `<div class="diagram diagram-special">
    ${hex('dia-start', '▲')}
    <div class="dia-alt-label">${steps.join(', ')}</div>
  </div>`;
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
    const yawHtml = buildMinimalIndicators(card.yaw, YAW_ALL, YAW_SYMBOLS);
    const pitchHtml = buildMinimalIndicators(card.pitch, PITCH_ALL, PITCH_SYMBOLS);
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
      symbol: YAW_SYMBOLS[card.direction],
    };
  },
  pitch(card) {
    return {
      ...card,
      directionLabel: card.direction.charAt(0).toUpperCase() + card.direction.slice(1),
      symbol: PITCH_SYMBOLS[card.direction],
    };
  },
  damage(card) {
    const icons = { none: '—', wound: '✦', discard: '✂', discardMultiple: '✂✂' };
    return {
      ...card,
      effectClass: card.effect || 'none',
      effectIcon: icons[card.effect] || '?',
    };
  },
};

function renderTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] !== undefined ? data[key] : '';
  });
}

const templateCache = {};

async function loadTemplate(type) {
  if (templateCache[type]) return templateCache[type];
  const response = await fetch(`templates/${type}.html`);
  if (!response.ok) return null;
  templateCache[type] = await response.text();
  return templateCache[type];
}

export async function renderCard(card) {
  const template = await loadTemplate(card.type);
  if (!template) return `<div class="card">${card.name || card.direction}</div>`;
  const preprocess = preprocessors[card.type];
  const processed = preprocess ? preprocess(card) : card;
  return renderTemplate(template, processed);
}

export async function preloadTemplates() {
  await Promise.all([loadTemplate('maneuver'), loadTemplate('yaw'), loadTemplate('pitch')]);
}
