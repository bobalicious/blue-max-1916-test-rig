import { getValidManeuvers, getValidYaws, getValidPitches, cascadeClear } from './validation.js';
import { renderCard, preloadTemplates } from './card-renderer.js';
import { yawIconHtml, pitchIconHtml } from './aircraft-shape.js';

const CATEGORY_COLORS = {
  straight: '#859900', turn: '#b58900', special: '#dc322f', utility: '#6c71c4',
};

export class PlaytestUI {
  constructor(gameState, getPlayer, onPlayTurn, onNextMove, onEndTurn, onResolveCombat, onPlayerTargetChosen) {
    this.gs = gameState;
    this.getPlayer = getPlayer;
    this.onPlayTurn = onPlayTurn;
    this.onNextMove = onNextMove;
    this.onEndTurn = onEndTurn;
    this.onResolveCombat = onResolveCombat;
    this.onPlayerTargetChosen = onPlayerTargetChosen;
    this.activeSlot = null;
    this.combatCardsDismiss = null;

    this.altitudeStatusEl = document.getElementById('altitude-status');
    this.playBoardEl = document.getElementById('play-board');
    this.cardPickerEl = document.getElementById('card-picker');
    this.actionButtonsEl = document.getElementById('action-buttons');
    this.turnInfoEl = document.getElementById('turn-info');
    this.deckInfoEl = document.getElementById('deck-info');
    this.aircraftInfoEl = document.getElementById('aircraft-info');

    this.modalEl = document.getElementById('card-modal');
    this.modalCardEl = this.modalEl.querySelector('.card-modal-card');
    this.modalCards = [];
    this.modalIndex = 0;

    this.modalEl.querySelector('.card-modal-overlay').addEventListener('click', () => this._closeModal());
    this.modalEl.querySelector('.card-modal-prev').addEventListener('click', () => this._modalNav(-1));
    this.modalEl.querySelector('.card-modal-next').addEventListener('click', () => this._modalNav(1));
    document.addEventListener('keydown', (e) => {
      if (this.modalEl.classList.contains('hidden')) return;
      if (e.key === 'Escape') this._closeModal();
      if (e.key === 'ArrowLeft') this._modalNav(-1);
      if (e.key === 'ArrowRight') this._modalNav(1);
    });

    preloadTemplates();
  }

  get p() { return this.getPlayer(); }

  render() {
    this.renderRoster();
    this.renderAltitudeStatus();
    this.renderPlayBoard();
    this.renderCardPicker();
    this.renderActionButtons();
    this.renderInfo();
  }

  renderRoster() {
    const listEl = document.getElementById('roster-list');
    if (!listEl || listEl.classList.contains('roster-hidden')) return;

    listEl.innerHTML = '';
    const allAircraft = this.gs.aircraft;
    if (!allAircraft || allAircraft.length === 0) return;

    for (const ac of allAircraft) {
      const row = document.createElement('div');
      row.className = `roster-row roster-side-${ac.side}${ac.isPlayer ? ' roster-player' : ''}`;

      if (ac.destroyed || ac.crashed) {
        row.classList.add('roster-dead');
      } else if (ac.landed) {
        row.classList.add('roster-landed');
      }

      const w = ac.wounds || 0;
      row.innerHTML = `
        <span class="roster-name">${ac.label}</span>
        <span class="roster-stat">H${ac.altitude}</span>
        <span class="roster-stat${(ac.damageCount || 0) >= 12 ? ' roster-critical' : ''}">D${ac.damageCount || 0}</span>
        <span class="roster-stat${w >= 2 ? ' roster-critical' : ''}">W${w}</span>
        ${ac.destroyed || ac.crashed ? '<span class="roster-status">X</span>' : ''}
        ${ac.landed ? '<span class="roster-status">L</span>' : ''}
      `;

      if (this._selectedAircraft && this._selectedAircraft.id === ac.id) {
        row.classList.add('roster-selected');
      }

      row.addEventListener('click', () => {
        if (this._selectedAircraft && this._selectedAircraft.id === ac.id) {
          this.selectAircraft(null);
        } else {
          this.selectAircraft(ac);
        }
      });

      listEl.appendChild(row);
    }
  }

  selectAircraft(ac) {
    this._selectedAircraft = ac || null;
    if (this._boardRenderer) {
      this._boardRenderer.clearFiringArc();
      if (ac) {
        this._boardRenderer.renderFiringArc(ac);
      }
    }
    this.renderRoster();
  }

  setBoardRenderer(renderer) {
    this._boardRenderer = renderer;
    renderer.onSelectAircraft = (q, r) => {
      if (q === null) {
        this.selectAircraft(null);
        return;
      }
      const ac = this.gs.aircraft.find(a => a.q === q && a.r === r);
      if (ac) this.selectAircraft(ac);
    };
  }

  renderAltitudeStatus() {
    const { altitude, landed, crashed } = this.p;
    const ceiling = this.gs.aircraftDef ? this.gs.aircraftDef.ceiling : '?';
    const p = this.p;
    const dmg = p.damageCount || 0;
    const wounds = p.wounds || 0;

    let statusText = '';
    let statusClass = '';
    if (crashed || p.destroyed) { statusText = 'DESTROYED'; statusClass = 'stat-destroyed'; }
    else if (landed) { statusText = 'LANDED'; statusClass = 'stat-landed'; }

    this.altitudeStatusEl.innerHTML = `
      <div class="player-stats">
        <div class="stat">
          <span class="stat-label">Height</span>
          <span class="stat-value">${altitude}<span class="stat-max">/${ceiling}</span></span>
        </div>
        <div class="stat">
          <span class="stat-label">Damage</span>
          <span class="stat-value${dmg >= 12 ? ' stat-critical' : ''}">${dmg}<span class="stat-max">/15</span></span>
        </div>
        <div class="stat">
          <span class="stat-label">Wounds</span>
          <span class="stat-value${wounds >= 2 ? ' stat-critical' : ''}">${wounds}<span class="stat-max">/3</span></span>
        </div>
        ${statusText ? `<div class="stat-alert ${statusClass}">${statusText}</div>` : ''}
      </div>
    `;
  }

  renderInfo() {
    this.turnInfoEl.textContent = `Turn ${this.gs.turn}`;
    const p = this.p;
    this.deckInfoEl.textContent =
      `Deck: ${p.maneuverDeck.length} | Discard: ${p.maneuverDiscard.length} | Hand: ${p.maneuverHand.length} | Special: ${p.specialDeck.length}`;
  }

  updateAircraftInfo(text) {
    this.aircraftInfoEl.textContent = text;
  }

  // --- Play Board ---

  renderPlayBoard() {
    this.playBoardEl.innerHTML = '';
    const p = this.p;

    const headers = document.createElement('div');
    headers.className = 'pb-row pb-headers';
    for (let i = 0; i < 3; i++) {
      const h = document.createElement('div');
      h.className = 'pb-header';
      h.textContent = `Move ${i + 1}`;
      headers.appendChild(h);
    }
    this.playBoardEl.appendChild(headers);

    const rows = [
      { label: 'Maneuver', key: 'maneuver' },
      { label: 'Yaw', key: 'yaw' },
      { label: 'Pitch', key: 'pitch' },
    ];

    for (const row of rows) {
      const rowEl = document.createElement('div');
      rowEl.className = 'pb-row';

      for (let i = 0; i < 3; i++) {
        const card = p.playBoard[i][row.key];
        const slot = document.createElement('div');

        const isActive = this.activeSlot &&
          this.activeSlot.moveIndex === i && this.activeSlot.slotType === row.key;
        const canSelect = this._canSelectSlot(i, row.key);

        slot.className = 'pb-slot';
        if (card) slot.classList.add('pb-filled');
        else if (isActive) slot.classList.add('pb-active');
        else if (!canSelect) slot.classList.add('pb-blocked');

        if (card) {
          slot.innerHTML = this._renderSlotContent(card, row.key);
          if (this.gs.phase === 'SELECT') {
            slot.addEventListener('click', () => this._clearSlot(i, row.key));
            slot.title = 'Click to remove';
          }
        } else if (canSelect && this.gs.phase === 'SELECT') {
          slot.textContent = row.label;
          slot.addEventListener('click', () => this._activateSlot(i, row.key));
        } else {
          slot.textContent = row.label;
        }

        if (this.gs.phase === 'EXECUTE' && this.gs.currentMoveIndex === i) {
          slot.classList.add('pb-executing');
        }

        rowEl.appendChild(slot);
      }

      this.playBoardEl.appendChild(rowEl);
    }
  }

  _renderSlotContent(card, type) {
    if (type === 'maneuver') {
      const color = CATEGORY_COLORS[card.category] || '#888';
      return `<span class="slot-card slot-maneuver" style="border-color:${color}">${card.name}</span>`;
    }
    if (type === 'yaw') {
      return `<span class="slot-card slot-yaw">${yawIconHtml(card.direction, 14)} ${card.directionLabel || card.direction}</span>`;
    }
    if (type === 'pitch') {
      return `<span class="slot-card slot-pitch">${pitchIconHtml(card.direction, 21)} ${card.directionLabel || card.direction}</span>`;
    }
    return card.name || card.direction;
  }

  _canSelectSlot(moveIndex, slotType) {
    if (this.gs.phase !== 'SELECT') return false;
    if (slotType === 'yaw' || slotType === 'pitch') {
      return !!this.p.playBoard[moveIndex].maneuver;
    }
    return true;
  }

  _activateSlot(moveIndex, slotType) {
    this.activeSlot = { moveIndex, slotType };
    this.render();
  }

  _clearSlot(moveIndex, slotType) {
    const p = this.p;
    const move = p.playBoard[moveIndex];
    const card = move[slotType];
    if (!card) return;

    if (slotType === 'maneuver') {
      if (move.yaw) p.yawAvailable.push(move.yaw);
      if (move.pitch) p.pitchAvailable.push(move.pitch);
      p.maneuverHand.push(card);
      move.maneuver = null;
      move.yaw = null;
      move.pitch = null;
      cascadeClear(p.playBoard, moveIndex + 1);
    } else if (slotType === 'yaw') {
      p.yawAvailable.push(card);
      move.yaw = null;
    } else if (slotType === 'pitch') {
      p.pitchAvailable.push(card);
      move.pitch = null;
    }

    this.activeSlot = null;
    this.render();
  }

  // --- Card Picker ---

  renderCardPicker() {
    this.cardPickerEl.innerHTML = '';

    if (!this.activeSlot) {
      this._renderHandOverview();
      return;
    }

    const p = this.p;
    const { moveIndex, slotType } = this.activeSlot;
    let validCards = [];

    if (slotType === 'maneuver') {
      validCards = getValidManeuvers(p.maneuverHand, p.playBoard, moveIndex);
    } else if (slotType === 'yaw') {
      validCards = getValidYaws(p.yawAvailable, p.playBoard, moveIndex);
    } else if (slotType === 'pitch') {
      validCards = getValidPitches(p.pitchAvailable, p.playBoard, moveIndex, p);
    }

    if (validCards.length === 0) {
      const msg = document.createElement('div');
      msg.className = 'picker-empty';
      msg.textContent = 'No valid cards available';
      this.cardPickerEl.appendChild(msg);
    }

    const grid = document.createElement('div');
    grid.className = 'picker-grid';

    for (let ci = 0; ci < validCards.length; ci++) {
      const card = validCards[ci];
      const tile = this._createCardTile(card, slotType);
      tile.addEventListener('click', () => this._placeCard(moveIndex, slotType, card));
      const viewBtn = this._createViewBtn();
      viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._openModal(validCards, ci);
      });
      tile.appendChild(viewBtn);
      grid.appendChild(tile);
    }

    this.cardPickerEl.appendChild(grid);

    const cancel = document.createElement('button');
    cancel.className = 'btn btn-cancel';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => {
      this.activeSlot = null;
      this.render();
    });
    this.cardPickerEl.appendChild(cancel);
  }

  _renderHandOverview() {
    if (this.gs.phase !== 'SELECT') return;
    const p = this.p;
    this._renderHandSection('Maneuver', p.maneuverHand, 'maneuver');
    this._renderHandSection('Yaw', p.yawAvailable, 'yaw');
    this._renderHandSection('Pitch', p.pitchAvailable, 'pitch');
  }

  _renderHandSection(title, cards, type) {
    const label = document.createElement('div');
    label.className = 'picker-label';
    label.textContent = title;
    this.cardPickerEl.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'picker-grid';

    for (let ci = 0; ci < cards.length; ci++) {
      const card = cards[ci];
      const tile = this._createCardTile(card, type);
      const idx = ci;
      tile.addEventListener('click', () => this._openModal(cards, idx));
      grid.appendChild(tile);
    }
    this.cardPickerEl.appendChild(grid);
  }

  _createCardTile(card, type) {
    const tile = document.createElement('div');
    tile.className = `card-tile card-tile-${type}`;

    if (type === 'maneuver') {
      const color = CATEGORY_COLORS[card.category] || '#888';
      tile.style.borderColor = color;
      tile.innerHTML = `
        <div class="tile-name">${card.name}</div>
        <div class="tile-sub">${card.subtitle || ''}</div>
      `;
    } else if (type === 'yaw') {
      tile.innerHTML = `
        <div class="tile-symbol">${yawIconHtml(card.direction, 14)}</div>
        <div class="tile-name">${card.direction}</div>
      `;
    } else if (type === 'pitch') {
      tile.innerHTML = `
        <div class="tile-symbol">${pitchIconHtml(card.direction, 21)}</div>
        <div class="tile-name">${card.direction}</div>
      `;
    }

    return tile;
  }

  _placeCard(moveIndex, slotType, card) {
    const p = this.p;
    const move = p.playBoard[moveIndex];

    if (slotType === 'maneuver') {
      const idx = p.maneuverHand.findIndex(c => c.id === card.id);
      if (idx !== -1) p.maneuverHand.splice(idx, 1);
      move.maneuver = card;
      cascadeClear(p.playBoard, moveIndex);
    } else if (slotType === 'yaw') {
      const idx = p.yawAvailable.findIndex(c => c.id === card.id);
      if (idx !== -1) p.yawAvailable.splice(idx, 1);
      move.yaw = card;
    } else if (slotType === 'pitch') {
      const idx = p.pitchAvailable.findIndex(c => c.id === card.id);
      if (idx !== -1) p.pitchAvailable.splice(idx, 1);
      move.pitch = card;
    }

    this.activeSlot = null;
    this.render();
  }

  // --- Action Buttons ---

  renderActionButtons() {
    this.actionButtonsEl.innerHTML = '';
    const p = this.p;

    if (this.gs.phase === 'SELECT') {
      const playBtn = document.createElement('button');
      playBtn.className = 'btn btn-play';
      playBtn.textContent = 'Play Turn';
      const complete = p.playBoard.every(m => m.maneuver && m.yaw && m.pitch);
      playBtn.disabled = !complete;
      playBtn.addEventListener('click', () => this.onPlayTurn());
      this.actionButtonsEl.appendChild(playBtn);

      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn btn-clear';
      clearBtn.textContent = 'Clear All';
      clearBtn.addEventListener('click', () => this._clearAll());
      this.actionButtonsEl.appendChild(clearBtn);
    }

    if (this.gs.phase === 'EXECUTE') {
      if (this.gs.currentMoveIndex < 3) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-next';
        nextBtn.textContent = `Execute Move ${this.gs.currentMoveIndex + 1}`;
        nextBtn.addEventListener('click', () => this.onNextMove());
        this.actionButtonsEl.appendChild(nextBtn);
      } else {
        const endBtn = document.createElement('button');
        endBtn.className = 'btn btn-end';
        endBtn.textContent = 'End Turn';
        endBtn.addEventListener('click', () => this.onEndTurn());
        this.actionButtonsEl.appendChild(endBtn);
      }
    }

    if (this.gs.phase === 'COMBAT_CHOOSE') {
      const ci = this.gs.combatIndex;
      const combat = this.gs.combatQueue[ci];
      if (combat && combat.validTargets) {
        const info = document.createElement('div');
        info.className = 'combat-info';
        info.innerHTML = `<strong>${combat.attacker.label}</strong> — choose target:`;
        this.actionButtonsEl.appendChild(info);

        for (const t of combat.validTargets) {
          const btn = document.createElement('button');
          btn.className = 'btn btn-target';
          btn.textContent = `${t.label} (Dmg ${t.damageCount || 0})`;
          btn.addEventListener('click', () => this.onPlayerTargetChosen(t));
          this.actionButtonsEl.appendChild(btn);
        }

        const skipBtn = document.createElement('button');
        skipBtn.className = 'btn btn-clear';
        skipBtn.textContent = 'Don\'t fire';
        skipBtn.addEventListener('click', () => this.onPlayerTargetChosen(null));
        this.actionButtonsEl.appendChild(skipBtn);
      }
    }

    if (this.gs.phase === 'COMBAT_SHOW') {
      const ci = this.gs.combatIndex;
      const combat = this.gs.combatQueue[ci];
      if (combat) {
        const info = document.createElement('div');
        info.className = 'combat-info';
        info.innerHTML = `<strong>${combat.attacker.label}</strong> fires at <strong>${combat.target.label}</strong>`;
        this.actionButtonsEl.appendChild(info);

        if (combat.modifiers && combat.modifiers.length > 0) {
          const mods = document.createElement('div');
          mods.className = 'combat-modifiers';
          for (const m of combat.modifiers) {
            const sign = m.value >= 0 ? '+' : '';
            mods.innerHTML += `<div class="combat-mod"><span class="mod-value">${sign}${m.value}</span> ${m.label}</div>`;
          }
          mods.innerHTML += `<div class="combat-mod combat-mod-total"><span class="mod-value">= ${combat.score}</span> Total</div>`;
          this.actionButtonsEl.appendChild(mods);
        }

        const resolveBtn = document.createElement('button');
        resolveBtn.className = 'btn btn-combat';
        resolveBtn.textContent = combat.score > 0 ? `Draw ${combat.score} Damage Card${combat.score !== 1 ? 's' : ''}` : 'Cannot hit';
        resolveBtn.disabled = combat.score <= 0;
        resolveBtn.addEventListener('click', () => this.onResolveCombat());
        this.actionButtonsEl.appendChild(resolveBtn);
      }
    }
  }

  _clearAll() {
    const p = this.p;
    for (const move of p.playBoard) {
      if (move.maneuver) p.maneuverHand.push(move.maneuver);
      if (move.yaw) p.yawAvailable.push(move.yaw);
      if (move.pitch) p.pitchAvailable.push(move.pitch);
      move.maneuver = null;
      move.yaw = null;
      move.pitch = null;
    }
    this.activeSlot = null;
    this.render();
  }

  _createViewBtn() {
    const btn = document.createElement('button');
    btn.className = 'tile-view-btn';
    btn.textContent = '⤢';
    btn.title = 'View full card';
    return btn;
  }

  // --- Card Modal ---

  async _openModal(cards, startIndex) {
    this.modalCards = cards;
    this.modalIndex = startIndex;
    await this._renderModalCard();
    this.modalEl.classList.remove('hidden');
  }

  _closeModal() {
    this.modalEl.classList.add('hidden');
    this.modalCards = [];
    this.render();
  }

  async _modalNav(dir) {
    if (this.modalCards.length === 0) return;
    this.modalIndex = (this.modalIndex + dir + this.modalCards.length) % this.modalCards.length;
    await this._renderModalCard();
  }

  async _renderModalCard() {
    const card = this.modalCards[this.modalIndex];
    const cardHtml = await renderCard(card);

    const playInfo = this._getPlayability(card);
    const btnHtml = this.gs.phase === 'SELECT'
      ? `<button class="btn btn-modal-play" ${playInfo.disabled ? 'disabled' : ''}>${playInfo.label}</button>`
      : '';

    this.modalCardEl.innerHTML = `
      <div class="modal-card-wrap">
        ${cardHtml}
        ${btnHtml}
      </div>
    `;

    const playBtn = this.modalCardEl.querySelector('.btn-modal-play');
    if (playBtn && !playInfo.disabled) {
      playBtn.addEventListener('click', () => this._playFromModal(card, playInfo.slotIndex));
    }
  }

  _getPlayability(card) {
    const p = this.p;
    const board = p.playBoard;
    const cardType = card.type === 'maneuver' ? 'maneuver' : card.type;

    if (cardType === 'maneuver') {
      for (let i = 0; i < 3; i++) {
        if (board[i].maneuver) continue;
        const valid = getValidManeuvers(p.maneuverHand, board, i);
        if (valid.some(c => c.id === card.id)) {
          return { disabled: false, slotIndex: i, label: `Play → Move ${i + 1}` };
        }
      }
      return { disabled: true, label: 'Cannot play' };
    }

    if (cardType === 'yaw') {
      for (let i = 0; i < 3; i++) {
        if (!board[i].maneuver || board[i].yaw) continue;
        const valid = getValidYaws(p.yawAvailable, board, i);
        if (valid.some(c => c.id === card.id)) {
          return { disabled: false, slotIndex: i, label: `Play → Move ${i + 1}` };
        }
      }
      return { disabled: true, label: 'Cannot play' };
    }

    if (cardType === 'pitch') {
      for (let i = 0; i < 3; i++) {
        if (!board[i].maneuver || !board[i].yaw || board[i].pitch) continue;
        const valid = getValidPitches(p.pitchAvailable, board, i, p);
        if (valid.some(c => c.id === card.id)) {
          return { disabled: false, slotIndex: i, label: `Play → Move ${i + 1}` };
        }
      }
      return { disabled: true, label: 'Cannot play' };
    }

    return { disabled: true, label: 'Cannot play' };
  }

  _playFromModal(card, slotIndex) {
    const p = this.p;
    const move = p.playBoard[slotIndex];
    const cardType = card.type === 'maneuver' ? 'maneuver' : card.type;

    if (cardType === 'maneuver') {
      const idx = p.maneuverHand.findIndex(c => c.id === card.id);
      if (idx !== -1) p.maneuverHand.splice(idx, 1);
      move.maneuver = card;
      cascadeClear(p.playBoard, slotIndex);
      this.activeSlot = null;
      this.render();
      const validYaws = getValidYaws(p.yawAvailable, p.playBoard, slotIndex);
      if (validYaws.length > 0) { this._openModal(validYaws, 0); }
      else { this._closeModal(); }
    } else if (cardType === 'yaw') {
      const idx = p.yawAvailable.findIndex(c => c.id === card.id);
      if (idx !== -1) p.yawAvailable.splice(idx, 1);
      move.yaw = card;
      this.activeSlot = null;
      this.render();
      const validPitches = getValidPitches(p.pitchAvailable, p.playBoard, slotIndex, p);
      if (validPitches.length > 0) { this._openModal(validPitches, 0); }
      else { this._closeModal(); }
    } else if (cardType === 'pitch') {
      const idx = p.pitchAvailable.findIndex(c => c.id === card.id);
      if (idx !== -1) p.pitchAvailable.splice(idx, 1);
      move.pitch = card;
      this.activeSlot = null;
      this._closeModal();
    }
  }

  // --- Combat Card Viewer ---

  async showCombatCards(cardResults, onDismiss) {
    this.combatCardsDismiss = onDismiss;
    this.combatResults = cardResults;
    this.modalIndex = 0;
    this._combatSubIndex = 0;
    await this._renderCombatResult();
    this.modalEl.classList.remove('hidden');
  }

  async _renderCombatResult() {
    const entry = this.combatResults[this.modalIndex];
    const sub = this._combatSubIndex;

    if (sub === 0) {
      const cardHtml = await renderCard(entry.card);
      const counter = `${this.modalIndex + 1} / ${this.combatResults.length}`;
      const resultLabel = entry.result === 'miss'
        ? '<div class="combat-result-label combat-result-miss">Near Miss</div>'
        : `<div class="combat-result-label combat-result-hit">${entry.result}</div>`;

      this.modalCardEl.innerHTML = `
        <div class="modal-card-wrap">
          ${cardHtml}
          ${resultLabel}
          <div class="combat-card-counter">${counter}</div>
          <button class="btn ${entry.discarded.length > 0 ? 'btn-combat' : 'btn-next'} combat-advance-btn">
            ${entry.discarded.length > 0 ? 'Show Discarded Card' + (entry.discarded.length > 1 ? 's' : '') : this.modalIndex === this.combatResults.length - 1 ? 'Continue' : 'Next Card'}
          </button>
        </div>
      `;
    } else {
      const discardedCard = entry.discarded[sub - 1];
      const cardHtml = await renderCard(discardedCard);
      const remaining = entry.discarded.length - sub;
      const isLast = remaining === 0 && this.modalIndex === this.combatResults.length - 1;

      this.modalCardEl.innerHTML = `
        <div class="modal-card-wrap">
          <div class="discard-banner">DISCARDED</div>
          ${cardHtml}
          <button class="btn ${isLast ? 'btn-combat' : 'btn-next'} combat-advance-btn">
            ${remaining > 0 ? 'Next Discarded Card' : isLast ? 'Continue' : 'Next Card'}
          </button>
        </div>
      `;
    }

    const advanceBtn = this.modalCardEl.querySelector('.combat-advance-btn');
    if (advanceBtn) {
      advanceBtn.addEventListener('click', () => this._advanceCombatResult());
    }
  }

  _advanceCombatResult() {
    const entry = this.combatResults[this.modalIndex];

    if (this._combatSubIndex < entry.discarded.length) {
      this._combatSubIndex++;
      this._renderCombatResult();
      return;
    }

    this.modalIndex++;
    this._combatSubIndex = 0;

    if (this.modalIndex >= this.combatResults.length) {
      this.modalEl.classList.add('hidden');
      this.combatResults = [];
      if (this.combatCardsDismiss) {
        this.combatCardsDismiss();
        this.combatCardsDismiss = null;
      }
      return;
    }

    this._renderCombatResult();
  }
}
