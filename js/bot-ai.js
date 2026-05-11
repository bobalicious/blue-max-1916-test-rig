import { hexDistance, bearingFromTo, hexNeighbor, executeMove } from './hex.js';
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
  const enemies = allAircraft.filter(a => a.side !== bot.side && !a.crashed && !a.landed);
  for (const enemy of enemies) {
    if (hexDistance(bot, enemy) > 4) continue;
    if (!isInRearArc(bot, enemy)) continue;
    if (!isFacingToward(enemy, bot)) continue;
    return true;
  }
  return false;
}

function decideBehavior(bot, allAircraft) {
  if (isBeingTailed(bot, allAircraft) && Math.random() < 0.75) {
    return { behavior: 'EVADE', target: null };
  }

  const enemies = allAircraft.filter(a => a.side !== bot.side && !a.crashed && !a.landed);
  if (enemies.length === 0) {
    return { behavior: 'EVADE', target: null };
  }

  let nearest = enemies[0];
  let nearestDist = hexDistance(bot, enemies[0]);
  for (let i = 1; i < enemies.length; i++) {
    const d = hexDistance(bot, enemies[i]);
    if (d < nearestDist) { nearest = enemies[i]; nearestDist = d; }
  }

  return { behavior: 'ATTACK', target: nearest };
}

function scoreMoveEvading(resultState, currentState) {
  let score = 0;
  score += facingDiff(resultState.facing, currentState.facing) * 10;
  score += hexDistance(currentState, resultState) * 3;
  score += Math.abs(resultState.altitude - currentState.altitude) * 2;
  return score;
}

function scoreMoveAttacking(resultState, target, currentState) {
  let score = 0;

  const rearDir = (target.facing + 3) % 6;
  const rearHex = hexNeighbor(target.q, target.r, rearDir);
  score -= hexDistance(resultState, rearHex) * 5;

  const distToTarget = hexDistance(resultState, target);
  if (distToTarget > 3) score -= (distToTarget - 3) * 8;
  if (distToTarget < 1) score -= 5;

  score -= facingDiff(resultState.facing, target.facing) * 4;
  score -= Math.abs(resultState.altitude - target.altitude) * 3;

  if (distToTarget <= 2) {
    const moved = hexDistance(currentState, resultState);
    if (moved > 2) score -= (moved - 2) * 3;
  }

  return score;
}

export function selectBotMoves(bot, allAircraft, aircraftDef) {
  const { behavior, target } = decideBehavior(bot, allAircraft);
  const playBoard = [
    { maneuver: null, yaw: null, pitch: null },
    { maneuver: null, yaw: null, pitch: null },
    { maneuver: null, yaw: null, pitch: null },
  ];

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
          const resultState = executeMove(simAircraft, maneuver, yaw, pitch, aircraftDef.ceiling);
          const score = behavior === 'EVADE'
            ? scoreMoveEvading(resultState, simAircraft)
            : scoreMoveAttacking(resultState, target, simAircraft);

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
