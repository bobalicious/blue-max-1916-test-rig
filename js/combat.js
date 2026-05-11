import { hexDistance, bearingFromTo, HEX_DIRECTIONS } from './hex.js';
import { shuffle, drawCards } from './deck.js';

function facingDiff(a, b) {
  const d = Math.abs(a - b);
  return Math.min(d, 6 - d);
}

function isInFiringArc(attacker, target) {
  const fwd = HEX_DIRECTIONS[attacker.facing];
  const left = HEX_DIRECTIONS[(attacker.facing + 5) % 6];
  const right = HEX_DIRECTIONS[(attacker.facing + 1) % 6];

  let q = attacker.q, r = attacker.r;
  for (let d = 1; d <= 5; d++) {
    q += fwd.dq;
    r += fwd.dr;
    if (target.q === q && target.r === r) return true;
    if (d <= 4) {
      if (target.q === q + left.dq && target.r === r + left.dr) return true;
      if (target.q === q + right.dq && target.r === r + right.dr) return true;
    }
  }
  return false;
}

function isDirectlyInFront(attacker, target) {
  const fwd = HEX_DIRECTIONS[attacker.facing];
  let q = attacker.q, r = attacker.r;
  for (let d = 1; d <= 5; d++) {
    q += fwd.dq;
    r += fwd.dr;
    if (target.q === q && target.r === r) return true;
  }
  return false;
}

function flewStraight(ac, moveIndex) {
  const move = ac.playBoard[moveIndex];
  if (!move || !move.maneuver || !move.yaw) return false;
  return move.maneuver.category === 'straight' && move.yaw.direction === 'straight';
}

function areInLine(a, b) {
  const diff = facingDiff(a.facing, b.facing);
  return diff === 0 || diff === 3;
}

function isAlive(ac) {
  return !ac.destroyed && !ac.crashed;
}

export function getValidTargets(attacker, allAircraft) {
  return allAircraft.filter(t => {
    if (t.id === attacker.id) return false;
    if (t.side === attacker.side) return false;
    if (!isAlive(t) && !t.landed) return false;
    if (hexDistance(attacker, t) > 5) return false;
    if (!isInFiringArc(attacker, t)) return false;
    return true;
  });
}

export function calculateAttackScore(attacker, target, moveIndex) {
  const modifiers = [];
  let score = 1;
  modifiers.push({ label: 'Base', value: 1 });

  if (isDirectlyInFront(attacker, target)) {
    score += 2;
    modifiers.push({ label: 'Directly in front', value: 2 });
  } else {
    modifiers.push({ label: 'In firing arc', value: 0 });
  }

  if (attacker.altitude === target.altitude) {
    score += 1;
    modifiers.push({ label: 'Same height', value: 1 });
  }
  if (Math.abs(attacker.altitude - target.altitude) > 2) {
    score -= 1;
    modifiers.push({ label: 'Height diff > 2', value: -1 });
  }

  const attackerMove = attacker.playBoard[moveIndex];
  if (attackerMove && attackerMove.pitch) {
    const pitchDir = attackerMove.pitch.direction;
    const targetAbove = target.altitude > attacker.altitude;
    const targetBelow = target.altitude < attacker.altitude;
    if ((pitchDir === 'dive' && targetAbove) || (pitchDir === 'climb' && targetBelow)) {
      score -= 1;
      modifiers.push({ label: 'Pitch opposes target', value: -1 });
    }
  }

  if (target.landed) {
    score += 2;
    modifiers.push({ label: 'Target landed', value: 2 });
  } else {
    if (flewStraight(target, moveIndex)) {
      score += 1;
      modifiers.push({ label: 'Target flew straight', value: 1 });
    }
  }
  if (flewStraight(attacker, moveIndex)) {
    score += 1;
    modifiers.push({ label: 'Attacker flew straight', value: 1 });
  }
  if (areInLine(attacker, target) || target.landed) {
    score += 1;
    modifiers.push({ label: 'In line', value: 1 });
  }

  const wounds = attacker.wounds || 0;
  if (wounds > 0) {
    score -= wounds;
    modifiers.push({ label: `Attacker wounds`, value: -wounds });
  }

  const finalScore = Math.max(score, 0);
  return { score: finalScore, modifiers };
}

function selectBotTarget(attacker, allAircraft, moveIndex) {
  const targets = getValidTargets(attacker, allAircraft);
  if (targets.length === 0) return null;

  let mostDamaged = targets[0];
  for (let i = 1; i < targets.length; i++) {
    if ((targets[i].damageCount || 0) > (mostDamaged.damageCount || 0)) {
      mostDamaged = targets[i];
    }
  }
  return mostDamaged;
}

function removeCardFromPool(pool, matchFn) {
  const idx = pool.findIndex(matchFn);
  if (idx !== -1) return pool.splice(idx, 1)[0];
  return null;
}

function applyDiscardTarget(ac, target) {
  const deck = target.deck;
  if (deck === 'yaw') {
    const pool = ac.yawAll;
    if (target.random) {
      if (pool.length > 0) return pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    } else if (target.direction) {
      let card = removeCardFromPool(pool, c => c.direction === target.direction);
      if (!card && target.fallback) card = removeCardFromPool(pool, c => c.direction === target.fallback);
      return card;
    }
  } else if (deck === 'pitch') {
    const pool = ac.pitchAll;
    if (target.random) {
      if (pool.length > 0) return pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    } else if (target.direction) {
      let card = removeCardFromPool(pool, c => c.direction === target.direction);
      if (!card && target.fallback) card = removeCardFromPool(pool, c => c.direction === target.fallback);
      return card;
    }
  } else if (deck === 'maneuver') {
    const pools = [ac.maneuverHand, ac.maneuverDeck, ac.maneuverDiscard];
    if (target.random) {
      const all = [...ac.maneuverHand, ...ac.maneuverDeck, ...ac.maneuverDiscard];
      if (all.length > 0) {
        const pick = all[Math.floor(Math.random() * all.length)];
        for (const pool of pools) {
          const card = removeCardFromPool(pool, c => c.id === pick.id);
          if (card) return card;
        }
      }
    } else if (target.name) {
      for (const pool of pools) {
        const card = removeCardFromPool(pool, c => c.name === target.name);
        if (card) return card;
      }
      if (target.fallbackName) {
        for (const pool of pools) {
          const card = removeCardFromPool(pool, c => c.name === target.fallbackName);
          if (card) return card;
        }
      }
    }
  }
  return null;
}

export function applyDamageCard(ac, card) {
  ac.damageCount = (ac.damageCount || 0) + 1;
  ac.damageTaken = ac.damageTaken || [];
  ac.damageTaken.push(card);

  const discarded = [];

  if (card.effect === 'none') return { result: 'miss', discarded };
  if (card.effect === 'wound') {
    ac.wounds = (ac.wounds || 0) + 1;
    if (ac.wounds >= 3) ac.destroyed = true;
    return { result: `wound (${ac.wounds}/3)`, discarded };
  }
  if (card.effect === 'discard') {
    const removed = applyDiscardTarget(ac, card.target);
    if (removed) discarded.push(removed);
    return { result: card.name, discarded };
  }
  if (card.effect === 'discardMultiple') {
    for (const t of card.targets) {
      const removed = applyDiscardTarget(ac, t);
      if (removed) discarded.push(removed);
    }
    return { result: card.name, discarded };
  }
  return { result: card.name, discarded };
}

export function buildCombatQueue(allAircraft, moveIndex) {
  const queue = [];
  const shooters = allAircraft.filter(ac => isAlive(ac) && !ac.landed);

  for (const attacker of shooters) {
    if (attacker.isPlayer) {
      const targets = getValidTargets(attacker, allAircraft);
      if (targets.length > 0) {
        queue.push({ attacker, target: null, score: 0, modifiers: [], playerChoose: true, validTargets: targets });
      }
    } else {
      const target = selectBotTarget(attacker, allAircraft, moveIndex);
      if (!target) continue;
      const { score, modifiers } = calculateAttackScore(attacker, target, moveIndex);
      if (score <= 0) continue;
      queue.push({ attacker, target, score, modifiers });
    }
  }

  return queue;
}

export function drawDamageCards(damageDeck, count) {
  if (damageDeck.length < count) {
    const reshuffled = shuffle([...damageDeck]);
    damageDeck.length = 0;
    damageDeck.push(...reshuffled);
  }
  return drawCards(damageDeck, Math.min(count, damageDeck.length));
}
