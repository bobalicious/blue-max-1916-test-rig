import { hexDistance, bearingFromTo, hexNeighbor, executeMove, HEX_DIRECTIONS } from './hex.js';
import { getValidManeuvers, getValidYaws, getValidPitches } from './validation.js';

function facingDiff(a, b) {
  const d = Math.abs(a - b);
  return Math.min(d, 6 - d);
}

function isInRearArc(aircraft, observer) {
  const bearing = bearingFromTo(aircraft, observer);
  const rearDir = (aircraft.facing + 3) % 6;
  return facingDiff(bearing, rearDir) <= 1;
}

function isFacingToward(observer, target) {
  const bearing = bearingFromTo(observer, target);
  return facingDiff(observer.facing, bearing) <= 1;
}

function isBeingTailed(bot, allAircraft) {
  const enemies = allAircraft.filter(a => a.side !== bot.side && !a.crashed && !a.landed && !a.destroyed);
  for (const enemy of enemies) {
    if (hexDistance(bot, enemy) > 4) continue;
    if (!isInRearArc(bot, enemy)) continue;
    if (!isFacingToward(enemy, bot)) continue;
    return true;
  }
  return false;
}

function nearestEnemy(bot, allAircraft) {
  const enemies = allAircraft.filter(a => a.side !== bot.side && !a.crashed && !a.landed && !a.destroyed);
  if (enemies.length === 0) return null;
  let best = enemies[0];
  let bestDist = hexDistance(bot, enemies[0]);
  for (let i = 1; i < enemies.length; i++) {
    const d = hexDistance(bot, enemies[i]);
    if (d < bestDist) { best = enemies[i]; bestDist = d; }
  }
  return { target: best, dist: bestDist };
}

function decideBehavior(bot, allAircraft) {
  const enemy = nearestEnemy(bot, allAircraft);
  if (!enemy) return { behavior: 'PATROL', target: null };

  if (isBeingTailed(bot, allAircraft) && Math.random() < 0.6) {
    return { behavior: 'EVADE', target: enemy.target };
  }

  if (enemy.dist > 8) {
    return { behavior: 'CLOSE', target: enemy.target };
  }

  return { behavior: 'ATTACK', target: enemy.target };
}

function boundaryPenalty(state, halfQ, halfR) {
  let penalty = 0;
  const edgeQ = Math.max(0, Math.abs(state.q) - halfQ + 2);
  const edgeR = Math.max(0, Math.abs(state.r) - halfR + 2);
  penalty += edgeQ * edgeQ * 15;
  penalty += edgeR * edgeR * 15;
  if (Math.abs(state.q) > halfQ || Math.abs(state.r) > halfR) {
    penalty += 100;
  }
  return penalty;
}

function altitudePenalty(state, ceiling) {
  let penalty = 0;
  if (state.altitude <= 1) penalty += 20;
  if (state.altitude >= ceiling) penalty += 5;
  return penalty;
}

// PATROL: no enemies nearby, fly toward centre, maintain altitude, vary direction slightly
function scoreMovePatrol(resultState, currentState, halfQ, halfR, ceiling) {
  let score = 0;
  const distFromCentre = Math.abs(resultState.q) + Math.abs(resultState.r);
  score -= distFromCentre * 2;
  score -= boundaryPenalty(resultState, halfQ, halfR);
  score -= altitudePenalty(resultState, ceiling);
  score += hexDistance(currentState, resultState) * 1;
  if (resultState.altitude >= 2 && resultState.altitude <= ceiling - 1) score += 3;
  return score;
}

// CLOSE: enemy is far, fly toward them, get to similar altitude
function scoreMoveClosing(resultState, target, currentState, halfQ, halfR, ceiling) {
  let score = 0;

  const distToTarget = hexDistance(resultState, target);
  const prevDist = hexDistance(currentState, target);
  score += (prevDist - distToTarget) * 8;

  const bearingToTarget = bearingFromTo(resultState, target);
  score -= facingDiff(resultState.facing, bearingToTarget) * 3;

  score -= Math.abs(resultState.altitude - target.altitude) * 2;

  score -= boundaryPenalty(resultState, halfQ, halfR);
  score -= altitudePenalty(resultState, ceiling);

  return score;
}

// ATTACK: enemy is close, get behind them, align facing, stay within firing range
function scoreMoveAttacking(resultState, target, currentState, halfQ, halfR, ceiling) {
  let score = 0;

  const rearDir = (target.facing + 3) % 6;
  const rearHex = hexNeighbor(target.q, target.r, rearDir);
  const distToRear = hexDistance(resultState, rearHex);
  score -= distToRear * 6;

  const distToTarget = hexDistance(resultState, target);
  if (distToTarget >= 1 && distToTarget <= 3) score += 10;
  if (distToTarget > 5) score -= (distToTarget - 5) * 6;
  if (distToTarget < 1) score -= 8;

  score -= facingDiff(resultState.facing, target.facing) * 5;

  const bearingToTarget = bearingFromTo(resultState, target);
  if (bearingToTarget === resultState.facing) score += 8;
  else if (facingDiff(resultState.facing, bearingToTarget) <= 1) score += 4;

  score -= Math.abs(resultState.altitude - target.altitude) * 4;

  const moved = hexDistance(currentState, resultState);
  if (distToTarget <= 3 && moved > 2) score -= (moved - 2) * 3;

  score -= boundaryPenalty(resultState, halfQ, halfR);
  score -= altitudePenalty(resultState, ceiling);

  return score;
}

// EVADE: someone is on our tail, break away but don't just fly off the map
function scoreMoveEvading(resultState, currentState, threat, halfQ, halfR, ceiling) {
  let score = 0;

  const distFromThreat = hexDistance(resultState, threat);
  score += distFromThreat * 3;

  score += facingDiff(resultState.facing, currentState.facing) * 5;

  const threatBearing = bearingFromTo(threat, resultState);
  if (facingDiff(threat.facing, threatBearing) > 1) score += 8;

  score += Math.abs(resultState.altitude - currentState.altitude) * 3;

  score -= boundaryPenalty(resultState, halfQ, halfR) * 2;
  score -= altitudePenalty(resultState, ceiling);

  const distFromCentre = Math.abs(resultState.q) + Math.abs(resultState.r);
  score -= distFromCentre * 0.5;

  return score;
}

export function selectBotMoves(bot, allAircraft, aircraftDef, boardBounds) {
  const { behavior, target } = decideBehavior(bot, allAircraft);
  const playBoard = [
    { maneuver: null, yaw: null, pitch: null },
    { maneuver: null, yaw: null, pitch: null },
    { maneuver: null, yaw: null, pitch: null },
  ];

  const halfQ = boardBounds ? boardBounds.maxQ : 7;
  const halfR = boardBounds ? boardBounds.maxR : 15;
  const ceiling = aircraftDef.ceiling;

  let hand = [...bot.maneuverHand];
  let yawAvail = [...bot.yawAvailable];
  let pitchAvail = [...bot.pitchAvailable];
  let simAircraft = { q: bot.q, r: bot.r, facing: bot.facing, altitude: bot.altitude };

  for (let moveIndex = 0; moveIndex < 3; moveIndex++) {
    const validManeuvers = getValidManeuvers(hand, playBoard, moveIndex);
    if (validManeuvers.length === 0) break;

    let bestCombo = null;
    let bestScore = -Infinity;

    for (const maneuver of validManeuvers) {
      playBoard[moveIndex].maneuver = maneuver;
      const validYaws = getValidYaws(yawAvail, playBoard, moveIndex);

      for (const yaw of validYaws) {
        playBoard[moveIndex].yaw = yaw;
        const validPitches = getValidPitches(pitchAvail, playBoard, moveIndex, simAircraft);

        for (const pitch of validPitches) {
          const resultState = executeMove(simAircraft, maneuver, yaw, pitch, ceiling);

          let score;
          switch (behavior) {
            case 'PATROL':
              score = scoreMovePatrol(resultState, simAircraft, halfQ, halfR, ceiling);
              break;
            case 'CLOSE':
              score = scoreMoveClosing(resultState, target, simAircraft, halfQ, halfR, ceiling);
              break;
            case 'ATTACK':
              score = scoreMoveAttacking(resultState, target, simAircraft, halfQ, halfR, ceiling);
              break;
            case 'EVADE':
              score = scoreMoveEvading(resultState, simAircraft, target, halfQ, halfR, ceiling);
              break;
            default:
              score = 0;
          }

          if (score > bestScore) {
            bestScore = score;
            bestCombo = { maneuver, yaw, pitch, resultState };
          }
        }
      }

      playBoard[moveIndex].maneuver = null;
      playBoard[moveIndex].yaw = null;
    }

    if (bestCombo) {
      playBoard[moveIndex] = { maneuver: bestCombo.maneuver, yaw: bestCombo.yaw, pitch: bestCombo.pitch };
      hand = hand.filter(c => c.id !== bestCombo.maneuver.id);
      yawAvail = yawAvail.filter(c => c.id !== bestCombo.yaw.id);
      pitchAvail = pitchAvail.filter(c => c.id !== bestCombo.pitch.id);
      simAircraft = bestCombo.resultState;
    }
  }

  return { playBoard, hand, yawAvail, pitchAvail };
}
