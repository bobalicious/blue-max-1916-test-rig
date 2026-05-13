import { executeMove, executeMoveWithPath } from './hex.js';
import { buildDeck, shuffle, drawCards, reshuffleDiscard } from './deck.js';
import { BoardRenderer } from './board-renderer.js';
import { PlaytestUI } from './playtest-ui.js';
import { selectBotMoves } from './bot-ai.js';
import { buildCombatQueue, drawDamageCards, applyDamageCard, calculateAttackScore, getValidTargets } from './combat.js';

const AIRCRAFT_DIR = 'aircraft/default';

const gameState = {
  phase: 'SETUP',
  turn: 1,
  aircraftDef: null,
  cardData: null,
  aircraft: [],
  damageDeck: [],
  playerIndex: 0,
  currentMoveIndex: 0,
  combatQueue: [],
  combatIndex: 0,
  combatCards: [],
};

let boardRenderer;
let ui;
let logEl;

function log(msg, cls) {
  if (!logEl) return;
  const entry = document.createElement('div');
  entry.className = `log-entry${cls ? ' ' + cls : ''}`;
  entry.textContent = msg;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

function getPlayer() {
  return gameState.aircraft[gameState.playerIndex];
}

async function loadAircraftData() {
  const defRes = await fetch(`${AIRCRAFT_DIR}/aircraft.json`);
  const aircraftDef = await defRes.json();

  const fetches = [
    fetch(`${AIRCRAFT_DIR}/${aircraftDef.decks.maneuver}`),
    fetch(`${AIRCRAFT_DIR}/${aircraftDef.decks.yaw}`),
    fetch(`${AIRCRAFT_DIR}/${aircraftDef.decks.pitch}`),
  ];
  if (aircraftDef.decks.special) {
    fetches.push(fetch(`${AIRCRAFT_DIR}/${aircraftDef.decks.special}`));
  }
  if (aircraftDef.decks.damage) {
    fetches.push(fetch(`${AIRCRAFT_DIR}/${aircraftDef.decks.damage}`));
  }

  const responses = await Promise.all(fetches);
  const specialIdx = aircraftDef.decks.special ? 3 : -1;
  const damageIdx = aircraftDef.decks.damage ? (specialIdx >= 0 ? 4 : 3) : -1;

  return {
    aircraftDef,
    maneuver: await responses[0].json(),
    yaw: await responses[1].json(),
    pitch: await responses[2].json(),
    special: specialIdx >= 0 ? await responses[specialIdx].json() : [],
    damage: damageIdx >= 0 ? await responses[damageIdx].json() : [],
  };
}

function createAircraftState(id, label, side, isPlayer, q, r, facing, cardData, aircraftDef) {
  return {
    id, label, side, isPlayer,
    q, r, facing,
    altitude: aircraftDef.startAltitude,
    landed: false, crashed: false,
    maneuverDeck: shuffle(buildDeck(cardData.maneuver)),
    maneuverDiscard: [],
    maneuverHand: [],
    specialDeck: shuffle(buildDeck(cardData.special)),
    yawAll: buildDeck(cardData.yaw),
    pitchAll: buildDeck(cardData.pitch),
    yawAvailable: [],
    pitchAvailable: [],
    playBoard: [
      { maneuver: null, yaw: null, pitch: null },
      { maneuver: null, yaw: null, pitch: null },
      { maneuver: null, yaw: null, pitch: null },
    ],
    moveHistory: [],
    wounds: 0,
    damageTaken: [],
    damageCount: 0,
    destroyed: false,
  };
}

function initGame(numBots, bounds) {
  const total = 1 + numBots;
  const aircraft = [];

  const side0 = [];
  const side1 = [];
  for (let i = 0; i < total; i++) {
    if (i < Math.ceil(total / 2)) side0.push(i);
    else side1.push(i);
  }

  const halfC = bounds.maxQ - 1;
  const halfR = bounds.maxR;

  function spreadPositions(count, range) {
    const positions = [];
    if (count === 1) { positions.push(0); return positions; }
    const step = Math.floor((range * 2) / (count - 1));
    for (let i = 0; i < count; i++) {
      positions.push(-range + step * i + Math.floor(Math.random() * 2));
    }
    return positions;
  }

  const topQs = spreadPositions(side0.length, halfC);
  const bottomQs = spreadPositions(side1.length, halfC);

  for (let si = 0; si < side0.length; si++) {
    const i = side0[si];
    aircraft.push(createAircraftState(
      i, i === 0 ? 'Player' : `Bot ${i}`,
      0, i === 0, topQs[si], -halfR + Math.floor(Math.random() * 2), 3,
      gameState.cardData, gameState.aircraftDef,
    ));
  }

  for (let si = 0; si < side1.length; si++) {
    const i = side1[si];
    aircraft.push(createAircraftState(
      i, `Bot ${i}`,
      1, false, bottomQs[si], halfR - Math.floor(Math.random() * 2), 0,
      gameState.cardData, gameState.aircraftDef,
    ));
  }

  gameState.aircraft = aircraft;
  gameState.damageDeck = shuffle(buildDeck(gameState.cardData.damage));
  gameState.playerIndex = 0;
  gameState.turn = 1;
  gameState.currentMoveIndex = 0;
}

function dealAllAircraft() {
  for (const ac of gameState.aircraft) {
    if (ac.crashed || ac.landed) continue;

    const needed = 7 - ac.maneuverHand.length;
    if (needed > 0) {
      if (ac.maneuverDeck.length < needed) {
        reshuffleDiscard(ac.maneuverDeck, ac.maneuverDiscard);
        log(`${ac.label} reshuffled discard pile into deck`);
      }
      const drawn = drawCards(ac.maneuverDeck, needed);
      ac.maneuverHand.push(...drawn);
      log(`${ac.label} drew ${drawn.length} maneuver card${drawn.length !== 1 ? 's' : ''}`);
    }

    ac.yawAvailable = [...ac.yawAll];
    ac.pitchAvailable = [...ac.pitchAll];
    ac.playBoard = [
      { maneuver: null, yaw: null, pitch: null },
      { maneuver: null, yaw: null, pitch: null },
      { maneuver: null, yaw: null, pitch: null },
    ];
    ac.moveHistory = [];
    ac.pathSegments = [];
  }
}

function dealPhase() {
  gameState.phase = 'DEAL';
  log(`── Turn ${gameState.turn} ──`, 'log-turn');
  dealAllAircraft();
  gameState.currentMoveIndex = 0;

  gameState.phase = 'SELECT';
  const player = getPlayer();
  boardRenderer.centerOn(player.q, player.r);
  ui.render();
  boardRenderer.renderAircraft(gameState.aircraft);
  boardRenderer.renderGhosts(gameState.aircraft);
  boardRenderer.renderCardLabels(gameState.aircraft, -1);
  ui.updateAircraftInfo(boardRenderer.getAircraftInfo(player));
}

function handlePlayTurn() {
  log('All cards locked in');
  for (const ac of gameState.aircraft) {
    if (ac.isPlayer || ac.crashed || ac.landed) continue;
    const result = selectBotMoves(ac, gameState.aircraft, gameState.aircraftDef, boardRenderer.getBounds());
    ac.playBoard = result.playBoard;
    ac.maneuverHand = result.hand;
    ac.yawAvailable = result.yawAvail;
    ac.pitchAvailable = result.pitchAvail;

    const moves = ac.playBoard.map(m => m.maneuver ? m.maneuver.name : '?').join(', ');
    log(`${ac.label} planned: ${moves}`);
  }

  gameState.phase = 'EXECUTE';
  gameState.currentMoveIndex = 0;
  ui.render();
}

function handleNextMove() {
  const i = gameState.currentMoveIndex;
  if (i >= 3) return;

  log(`Move ${i + 1}:`, 'log-move');
  const ceiling = gameState.aircraftDef.ceiling;
  const newStates = [];

  for (const ac of gameState.aircraft) {
    if (ac.crashed || ac.landed) { newStates.push(null); continue; }

    const move = ac.playBoard[i];
    if (!move || !move.maneuver || !move.yaw || !move.pitch) { newStates.push(null); continue; }

    ac.moveHistory.push({ q: ac.q, r: ac.r, facing: ac.facing, altitude: ac.altitude, side: ac.side });
    const result = executeMoveWithPath(ac, move.maneuver, move.yaw, move.pitch, ceiling);
    if (!ac.pathSegments) ac.pathSegments = [];
    ac.pathSegments.push(result.path);
    newStates.push(result.state);

    log(`  ${ac.label}: ${move.maneuver.name} / ${move.yaw.direction} / ${move.pitch.direction}`);

    if (move.maneuver.effect === 'Draw 2 special cards' && ac.specialDeck.length > 0) {
      const count = Math.min(2, ac.specialDeck.length);
      const drawn = drawCards(ac.specialDeck, count);
      ac.maneuverHand.push(...drawn);
      log(`  ${ac.label} drew ${count} special card${count !== 1 ? 's' : ''}`);
    }
  }

  for (let idx = 0; idx < gameState.aircraft.length; idx++) {
    const ac = gameState.aircraft[idx];
    const ns = newStates[idx];
    if (!ns) continue;

    ac.q = ns.q; ac.r = ns.r; ac.facing = ns.facing; ac.altitude = ns.altitude;

    if (ac.altitude <= 0) {
      ac.altitude = 0;
      const move = ac.playBoard[i];
      if (move.maneuver.name === 'Slow') {
        ac.landed = true;
        log(`  ${ac.label} LANDED`);
      } else {
        ac.crashed = true;
        log(`  ${ac.label} CRASHED`);
      }
    }
  }

  boardRenderer.renderGhosts(gameState.aircraft);
  boardRenderer.renderAircraft(gameState.aircraft);
  boardRenderer.renderCardLabels(gameState.aircraft, i);
  ui.updateAircraftInfo(boardRenderer.getAircraftInfo(getPlayer()));

  gameState.combatQueue = buildCombatQueue(gameState.aircraft, i);
  gameState.combatIndex = 0;
  gameState.currentMoveIndex = i + 1;

  if (gameState.combatQueue.length > 0) {
    gameState.phase = 'COMBAT_SHOW';
    showNextCombat();
  } else {
    finishMoveStep();
  }
}

function showNextCombat() {
  const ci = gameState.combatIndex;
  if (ci >= gameState.combatQueue.length) {
    finishMoveStep();
    return;
  }

  const combat = gameState.combatQueue[ci];
  boardRenderer.clearCombatHighlights();

  if (combat.playerChoose) {
    gameState.phase = 'COMBAT_CHOOSE';
    ui.render();
    return;
  }

  boardRenderer.highlightCombat(combat.attacker, combat.target);
  log(`  ${combat.attacker.label} fires at ${combat.target.label} (score ${combat.score})`, 'log-combat');
  gameState.phase = 'COMBAT_SHOW';
  ui.render();
}

function handlePlayerTargetChosen(target) {
  const ci = gameState.combatIndex;

  if (!target) {
    gameState.combatQueue.splice(ci, 1);
    if (ci < gameState.combatQueue.length) {
      showNextCombat();
    } else {
      finishMoveStep();
    }
    return;
  }

  const combat = gameState.combatQueue[ci];
  const moveIndex = gameState.currentMoveIndex - 1;
  const { score, modifiers } = calculateAttackScore(combat.attacker, target, moveIndex);

  combat.target = target;
  combat.score = score;
  combat.modifiers = modifiers;
  combat.playerChoose = false;

  boardRenderer.highlightCombat(combat.attacker, combat.target);
  log(`  ${combat.attacker.label} fires at ${combat.target.label} (score ${score})`, 'log-combat');
  gameState.phase = 'COMBAT_SHOW';
  ui.render();
}

function handleResolveCombat() {
  const ci = gameState.combatIndex;
  const { attacker, target, score } = gameState.combatQueue[ci];

  if (score <= 0) {
    log(`    Cannot hit (score 0)`, 'log-miss');
    boardRenderer.clearCombatHighlights();
    gameState.combatIndex++;
    if (gameState.combatIndex < gameState.combatQueue.length) {
      showNextCombat();
    } else {
      finishMoveStep();
    }
    return;
  }

  const drawn = drawDamageCards(gameState.damageDeck, score);
  const cardResults = [];

  for (const card of drawn) {
    const { result, discarded } = applyDamageCard(target, card);
    cardResults.push({ card, result, discarded });
    if (result === 'miss') {
      log(`    Near Miss`, 'log-miss');
    } else {
      log(`    ${card.name}: ${result}`, 'log-hit');
      for (const d of discarded) {
        log(`      Discarded: ${d.name || d.direction} (${d.type})`, 'log-hit');
      }
    }
  }

  if (target.damageCount >= 15) target.destroyed = true;
  if (target.destroyed) log(`    ${target.label} DESTROYED!`, 'log-destroyed');

  ui.showCombatCards(cardResults, () => {
    boardRenderer.clearCombatHighlights();
    gameState.combatIndex++;

    if (gameState.combatIndex < gameState.combatQueue.length) {
      showNextCombat();
    } else {
      finishMoveStep();
    }
  });
}

function finishMoveStep() {
  boardRenderer.clearCombatHighlights();

  for (const ac of gameState.aircraft) {
    if (ac.destroyed && !ac.crashed) ac.crashed = true;
  }

  gameState.phase = 'EXECUTE';
  gameState.combatQueue = [];
  gameState.combatIndex = 0;

  boardRenderer.renderAircraft(gameState.aircraft);
  ui.updateAircraftInfo(boardRenderer.getAircraftInfo(getPlayer()));
  ui.render();
}

function handleEndTurn() {
  for (const ac of gameState.aircraft) {
    if (ac.crashed || ac.landed) continue;
    for (const move of ac.playBoard) {
      if (move.maneuver) {
        if (move.maneuver.category === 'special') { /* one-use, don't return */ }
        else { ac.maneuverDiscard.push(move.maneuver); }
      }
    }
  }
  gameState.turn++;
  dealPhase();
}

function startGame(numBots) {
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  logEl = document.getElementById('game-log');
  logEl.innerHTML = '';

  const logToggle = document.getElementById('log-toggle');
  logToggle.addEventListener('click', () => {
    logEl.classList.toggle('log-hidden');
    logToggle.textContent = logEl.classList.contains('log-hidden') ? 'Show' : 'Hide';
  });

  const rosterToggle = document.getElementById('roster-toggle');
  const rosterList = document.getElementById('roster-list');
  rosterToggle.addEventListener('click', () => {
    rosterList.classList.toggle('roster-hidden');
    rosterToggle.textContent = rosterList.classList.contains('roster-hidden') ? 'Show' : 'Hide';
  });

  const svg = document.getElementById('hex-board');
  boardRenderer = new BoardRenderer(svg, 15, 30, 22);
  initGame(numBots, boardRenderer.getBounds());
  ui = new PlaytestUI(gameState, getPlayer, handlePlayTurn, handleNextMove, handleEndTurn, handleResolveCombat, handlePlayerTargetChosen);
  ui.setBoardRenderer(boardRenderer);

  log(`Game started: ${numBots} bot${numBots !== 1 ? 's' : ''}, ${gameState.aircraft.length} aircraft total`);

  dealPhase();
}

async function init() {
  const cardData = await loadAircraftData();
  gameState.aircraftDef = cardData.aircraftDef;
  gameState.cardData = { maneuver: cardData.maneuver, yaw: cardData.yaw, pitch: cardData.pitch, special: cardData.special, damage: cardData.damage };

  document.getElementById('start-game').addEventListener('click', () => {
    const numBots = parseInt(document.getElementById('bot-count').value, 10) || 1;
    startGame(numBots);
  });
}

init();
