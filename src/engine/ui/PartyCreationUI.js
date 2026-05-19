/**
 * PartyCreationUI - redesigned two-panel layout.
 * Left: create character form + available roster.
 * Right: 2×2 formation grid.
 * Footer: validation + action buttons (always visible).
 * Click-to-add replaces mandatory drag-and-drop.
 */

import { CharacterClasses } from '../character/CharacterClasses.js';

export class PartyCreationUI {
  constructor(characterSystem) {
    this.characterSystem = characterSystem;
    this.container = null;
    this.isVisible = false;
    this.selectedClass = 'warrior';
    this.draggedCharacter = null;
  }

  show() {
    if (this.isVisible) return;
    this._buildDOM();
    document.body.appendChild(this.container);
    this.isVisible = true;
    this._bindEvents();
    this._refresh();
  }

  hide() {
    if (!this.isVisible) return;
    this.container?.parentNode?.removeChild(this.container);
    this.container = null;
    this.isVisible = false;
  }

  // ── DOM construction ────────────────────────────────────────────────────────

  _buildDOM() {
    this._injectStyles();

    this.container = document.createElement('div');
    this.container.className = 'pc-overlay';
    this.container.innerHTML = `
      <div class="pc-modal">

        <div class="pc-header">
          <span class="pc-title">⚔ Create Your Party</span>
          <button class="pc-close" id="pc-close">✕</button>
        </div>

        <div class="pc-body">

          <!-- LEFT PANEL -->
          <div class="pc-left">

            <section class="pc-section">
              <h3 class="pc-section-title">New Character</h3>
              <div class="pc-field">
                <label class="pc-label">Name</label>
                <input class="pc-input" id="pc-name" type="text"
                       placeholder="Character name…" maxlength="20" autocomplete="off">
              </div>
              <div class="pc-field">
                <label class="pc-label">Class</label>
                <select class="pc-input" id="pc-class">
                  <option value="warrior">Warrior</option>
                  <option value="rogue">Rogue</option>
                  <option value="mage">Mage</option>
                  <option value="cleric">Cleric</option>
                </select>
              </div>
              <div class="pc-preview" id="pc-preview"></div>
              <button class="pc-btn pc-btn-create" id="pc-create">+ Create Character</button>
            </section>

            <section class="pc-section pc-section-roster">
              <h3 class="pc-section-title">Available <span id="pc-roster-count">(0)</span></h3>
              <div class="pc-roster" id="pc-roster">
                <p class="pc-empty">No characters yet</p>
              </div>
            </section>

          </div><!-- /left -->

          <!-- RIGHT PANEL -->
          <div class="pc-right">

            <section class="pc-section pc-section-formation">
              <h3 class="pc-section-title">Party Formation</h3>

              <div class="pc-formation-info">
                <span class="pc-badge front">Front ↑ +10% ATK  −10% DEF</span>
                <span class="pc-badge back">Back ↓ +10% EVA  +10% DEF</span>
              </div>

              <div class="pc-grid">
                <div class="pc-row-label">Front</div>
                <div class="pc-slot" data-pos="0" id="pc-slot-0"><span class="pc-slot-empty">Click roster<br>to assign</span></div>
                <div class="pc-slot" data-pos="1" id="pc-slot-1"><span class="pc-slot-empty">Click roster<br>to assign</span></div>
                <div class="pc-row-label">Back</div>
                <div class="pc-slot" data-pos="2" id="pc-slot-2"><span class="pc-slot-empty">Click roster<br>to assign</span></div>
                <div class="pc-slot" data-pos="3" id="pc-slot-3"><span class="pc-slot-empty">Click roster<br>to assign</span></div>
              </div>

              <p class="pc-hint">Click available character to add · Click slot character to remove</p>
            </section>

          </div><!-- /right -->

        </div><!-- /body -->

        <div class="pc-footer">
          <div class="pc-validation" id="pc-validation"></div>
          <div class="pc-actions">
            <button class="pc-btn pc-btn-test" id="pc-test">Quick Party</button>
            <button class="pc-btn pc-btn-start" id="pc-start" disabled>▶ Start Game</button>
          </div>
        </div>

      </div><!-- /modal -->
    `;
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  _bindEvents() {
    const q = id => this.container.querySelector(id);

    q('#pc-close').addEventListener('click', () => this.hide());
    q('#pc-create').addEventListener('click', () => this._createCharacter());
    q('#pc-test').addEventListener('click', () => this._testParty());
    q('#pc-start').addEventListener('click', () => this._startGame());

    q('#pc-class').addEventListener('change', e => {
      this.selectedClass = e.target.value;
      this._renderPreview();
    });

    // Drag-and-drop (bonus, not required)
    this._setupDnD();
  }

  _setupDnD() {
    const body = this.container.querySelector('.pc-body');

    body.addEventListener('dragstart', e => {
      const card = e.target.closest('[data-char-id]');
      if (!card) return;
      this.draggedCharacter = card.dataset.charId;
      card.classList.add('pc-dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    body.addEventListener('dragend', e => {
      const card = e.target.closest('[data-char-id]');
      if (card) card.classList.remove('pc-dragging');
      this.draggedCharacter = null;
    });
    body.addEventListener('dragover', e => {
      if (e.target.closest('.pc-slot')) { e.preventDefault(); e.target.closest('.pc-slot').classList.add('pc-drop-target'); }
    });
    body.addEventListener('dragleave', e => {
      const slot = e.target.closest('.pc-slot');
      if (slot) slot.classList.remove('pc-drop-target');
    });
    body.addEventListener('drop', e => {
      const slot = e.target.closest('.pc-slot');
      if (!slot || !this.draggedCharacter) return;
      e.preventDefault();
      slot.classList.remove('pc-drop-target');
      this._assignToSlot(this.draggedCharacter, parseInt(slot.dataset.pos));
    });
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  _createCharacter() {
    const input = this.container.querySelector('#pc-name');
    const name  = input.value.trim() || null;
    try {
      this.characterSystem.createCharacter(this.selectedClass, name);
      input.value = '';
      this._refresh();
    } catch (err) {
      this._setValidation(`⚠ ${err.message}`, 'warn');
    }
  }

  _testParty() {
    try {
      this.characterSystem.createTestParty('balanced');
    } catch (e) { /* ignore if already exists */ }
    this._refresh();
  }

  _startGame() {
    const size = this.characterSystem.partyManager.getPartySize();
    if (size === 0) { this._setValidation('⚠ Add at least one character to the party.', 'warn'); return; }
    window.dispatchEvent(new CustomEvent('gameStart', {
      detail: { party: this.characterSystem.getParty(), timestamp: Date.now() }
    }));
    this.hide();
  }

  _assignToSlot(charId, pos) {
    const party   = this.characterSystem.partyManager.party;
    const char    = this.characterSystem.getCharacter(charId);
    if (!char) return;

    const alreadyInParty = this.characterSystem.partyManager.hasCharacter(charId);
    if (party[pos]) {
      // Slot occupied — swap or replace
      if (alreadyInParty) {
        this.characterSystem.partyManager.swapCharacters(charId, party[pos].id);
      } else {
        this.characterSystem.removeFromParty(party[pos].id);
        this.characterSystem.partyManager.addCharacter(char, pos);
      }
    } else {
      if (alreadyInParty) {
        this.characterSystem.partyManager.moveCharacter(charId, pos);
      } else {
        this.characterSystem.partyManager.addCharacter(char, pos);
      }
    }
    this._refresh();
  }

  _removeFromSlot(pos) {
    const party = this.characterSystem.partyManager.party;
    if (party[pos]) {
      this.characterSystem.removeFromParty(party[pos].id);
      this._refresh();
    }
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  _refresh() {
    this._renderPreview();
    this._renderRoster();
    this._renderFormation();
    this._renderValidation();
  }

  _renderPreview() {
    const preview = this.container.querySelector('#pc-preview');
    if (!preview) return;
    const def = CharacterClasses.getClassDefinition(this.selectedClass);
    if (!def) { preview.innerHTML = ''; return; }
    const s = def.baseStats;
    preview.innerHTML = `
      <div class="pc-preview-inner">
        <strong>${def.name}</strong>
        <p class="pc-preview-desc">${def.description}</p>
        <div class="pc-stat-row">
          <span>HP <b>${s.HP}</b></span><span>ATK <b>${s.ATK}</b></span>
          <span>DEF <b>${s.DEF}</b></span><span>SPD <b>${s.SPD}</b></span>
        </div>
        <div class="pc-skill-list">
          ${(def.skillProgression || []).slice(0,3).map(sk => `<span>Lv${sk.level}: ${sk.name}</span>`).join('')}
        </div>
      </div>
    `;
  }

  _renderRoster() {
    const roster  = this.container.querySelector('#pc-roster');
    const counter = this.container.querySelector('#pc-roster-count');
    const all = this.characterSystem.getAllCharacters();
    const available = all.filter(c => !this.characterSystem.partyManager.hasCharacter(c.id));
    counter.textContent = `(${available.length})`;

    if (available.length === 0) {
      roster.innerHTML = '<p class="pc-empty">All characters assigned</p>';
      return;
    }
    roster.innerHTML = '';
    available.forEach(char => {
      const card = this._makeCard(char, true);
      card.addEventListener('click', () => {
        // Click: auto-assign to first empty slot
        const party = this.characterSystem.partyManager.party;
        const emptyPos = [0,1,2,3].find(i => !party[i]);
        if (emptyPos !== undefined) {
          this._assignToSlot(char.id, emptyPos);
        } else {
          this._setValidation('⚠ Party is full (4 members max).', 'warn');
        }
      });
      roster.appendChild(card);
    });
  }

  _renderFormation() {
    const party = this.characterSystem.partyManager.party;
    [0,1,2,3].forEach(pos => {
      const slot = this.container.querySelector(`#pc-slot-${pos}`);
      if (!slot) return;
      slot.innerHTML = '';
      slot.classList.remove('pc-slot-filled');
      if (party[pos]) {
        slot.classList.add('pc-slot-filled');
        const card = this._makeCard(party[pos], false);
        card.addEventListener('click', () => this._removeFromSlot(pos));
        const hint = document.createElement('span');
        hint.className = 'pc-slot-remove';
        hint.textContent = '✕ remove';
        card.appendChild(hint);
        slot.appendChild(card);
      } else {
        slot.innerHTML = '<span class="pc-slot-empty">Click roster<br>to assign</span>';
      }
    });
  }

  _renderValidation() {
    const result  = this.characterSystem.validateParty();
    const size    = this.characterSystem.partyManager.getPartySize();
    const startBtn = this.container.querySelector('#pc-start');
    const valDiv   = this.container.querySelector('#pc-validation');

    const ready = result.isValid && size > 0;
    startBtn.disabled = !ready;

    if (ready) {
      valDiv.innerHTML = '<span class="pc-val-ok">✔ Party ready to adventure!</span>';
    } else if (size === 0) {
      valDiv.innerHTML = '<span class="pc-val-info">Add at least one character to your party.</span>';
    } else {
      const msgs = [...(result.warnings||[]), ...(result.suggestions||[])].slice(0,2);
      valDiv.innerHTML = msgs.map(m => `<span class="pc-val-warn">⚠ ${m}</span>`).join('');
    }
  }

  _setValidation(msg, type='info') {
    const valDiv = this.container.querySelector('#pc-validation');
    if (valDiv) valDiv.innerHTML = `<span class="pc-val-${type}">${msg}</span>`;
  }

  _makeCard(char, draggable = false) {
    const div = document.createElement('div');
    div.className = `pc-card pc-card-${char.class}`;
    div.dataset.charId = char.id;
    if (draggable) div.draggable = true;
    const hp = Math.round((char.currentHP / char.maxHP) * 100);
    const classColors = { warrior:'#c0392b', rogue:'#27ae60', mage:'#2980b9', cleric:'#f39c12' };
    div.innerHTML = `
      <div class="pc-card-top">
        <span class="pc-card-name">${char.name}</span>
        <span class="pc-card-level">Lv.${char.level}</span>
      </div>
      <span class="pc-card-class" style="color:${classColors[char.class]||'#aaa'}">${char.class}</span>
      <div class="pc-card-hp">
        <div class="pc-card-hp-bar" style="width:${hp}%"></div>
        <span class="pc-card-hp-text">${char.currentHP}/${char.maxHP}</span>
      </div>
      <div class="pc-card-stats">
        <span>ATK ${char.stats.ATK}</span>
        <span>DEF ${char.stats.DEF}</span>
        <span>SPD ${char.stats.SPD}</span>
      </div>
    `;
    return div;
  }

  // ── Styles ───────────────────────────────────────────────────────────────────

  _injectStyles() {
    if (document.getElementById('pc-styles')) return;
    const s = document.createElement('style');
    s.id = 'pc-styles';
    s.textContent = `
      /* ── reset user-select for form elements ── */
      .pc-overlay input, .pc-overlay select, .pc-overlay button {
        user-select: text;
        -webkit-user-select: text;
      }

      .pc-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.85);
        display: flex; align-items: center; justify-content: center;
        z-index: 3000;
        font-family: 'Courier New', monospace;
        color: #ccc;
      }

      .pc-modal {
        background: #111;
        border: 2px solid #00cc44;
        border-radius: 8px;
        width: min(96vw, 860px);
        max-height: 90vh;
        display: flex; flex-direction: column;
        overflow: hidden;
      }

      /* Header */
      .pc-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 18px;
        border-bottom: 1px solid #00cc44;
        flex-shrink: 0;
      }
      .pc-title { color: #00ff55; font-size: 18px; font-weight: bold; }
      .pc-close {
        background: none; border: 1px solid #555; color: #aaa;
        width: 30px; height: 30px; border-radius: 4px; cursor: pointer; font-size: 14px;
      }
      .pc-close:hover { border-color: #ff4444; color: #ff4444; }

      /* Body — two panels side-by-side */
      .pc-body {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 0; overflow: hidden; flex: 1; min-height: 0;
      }

      .pc-left {
        border-right: 1px solid #222;
        overflow-y: auto;
        display: flex; flex-direction: column; gap: 0;
      }
      .pc-right { overflow-y: auto; }

      .pc-section {
        padding: 14px 16px;
        border-bottom: 1px solid #222;
      }
      .pc-section-roster { flex: 1; }
      .pc-section-formation { height: 100%; }

      .pc-section-title {
        margin: 0 0 10px; font-size: 13px; color: #00ff55;
        text-transform: uppercase; letter-spacing: 1px;
        border-bottom: 1px solid #222; padding-bottom: 6px;
      }

      /* Form */
      .pc-field { margin-bottom: 10px; }
      .pc-label { display: block; font-size: 11px; color: #888; margin-bottom: 4px; }
      .pc-input {
        width: 100%; box-sizing: border-box;
        background: #0a0a0a; border: 1px solid #333; color: #00ff55;
        padding: 7px 8px; border-radius: 4px; font-family: inherit; font-size: 13px;
        outline: none;
      }
      .pc-input:focus { border-color: #00cc44; }

      /* Preview */
      .pc-preview { margin: 8px 0; }
      .pc-preview-inner {
        background: #0d0d0d; border: 1px solid #2a2a2a;
        border-radius: 4px; padding: 10px; font-size: 12px;
      }
      .pc-preview-inner strong { color: #00ff55; display: block; margin-bottom: 4px; }
      .pc-preview-desc { color: #666; font-size: 11px; margin: 0 0 8px; }
      .pc-stat-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
      .pc-stat-row span { color: #888; font-size: 11px; }
      .pc-stat-row b { color: #00cc44; }
      .pc-skill-list { display: flex; flex-direction: column; gap: 2px; }
      .pc-skill-list span { font-size: 10px; color: #556; }

      /* Buttons */
      .pc-btn {
        cursor: pointer; border-radius: 4px; font-family: inherit;
        font-size: 13px; padding: 8px 14px; border: 1px solid;
        transition: background 0.15s, color 0.15s;
      }
      .pc-btn-create {
        width: 100%; background: #001a00; border-color: #00cc44; color: #00ff55;
      }
      .pc-btn-create:hover { background: #00cc44; color: #000; }
      .pc-btn-test { background: #1a001a; border-color: #cc44ff; color: #cc44ff; }
      .pc-btn-test:hover { background: #cc44ff; color: #000; }
      .pc-btn-start {
        background: #003300; border-color: #00ff55; color: #00ff55;
        padding: 8px 22px; font-weight: bold;
      }
      .pc-btn-start:hover:not(:disabled) { background: #00ff55; color: #000; }
      .pc-btn-start:disabled { background: #1a1a1a; border-color: #333; color: #444; cursor: not-allowed; }

      /* Roster */
      .pc-roster { display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; }
      .pc-empty { color: #444; font-size: 12px; text-align: center; margin: 14px 0; }

      /* Formation grid */
      .pc-formation-info { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
      .pc-badge {
        font-size: 10px; padding: 3px 8px; border-radius: 3px;
        border: 1px solid; white-space: nowrap;
      }
      .pc-badge.front { color: #ff9944; border-color: #ff9944; }
      .pc-badge.back  { color: #44aaff; border-color: #44aaff; }

      .pc-grid {
        display: grid;
        grid-template-columns: 40px 1fr 1fr;
        grid-template-rows: auto auto;
        gap: 8px;
        align-items: start;
      }
      .pc-row-label {
        writing-mode: vertical-rl; text-orientation: mixed;
        font-size: 11px; color: #555; text-align: center;
        padding: 4px 0; align-self: center;
      }

      .pc-slot {
        min-height: 90px; border: 2px dashed #2a2a2a; border-radius: 6px;
        display: flex; align-items: center; justify-content: center;
        transition: border-color 0.2s, background 0.2s;
        cursor: default; overflow: hidden;
      }
      .pc-slot.pc-slot-filled { border-style: solid; border-color: #2a5a2a; }
      .pc-slot.pc-drop-target { border-color: #00ff55; background: rgba(0,255,85,0.05); }
      .pc-slot-empty { font-size: 11px; color: #333; text-align: center; padding: 8px; }

      .pc-hint { font-size: 10px; color: #444; margin: 10px 0 0; text-align: center; }

      /* Character cards */
      .pc-card {
        background: #0d0d0d; border: 1px solid #222; border-radius: 5px;
        padding: 8px 10px; cursor: pointer; position: relative;
        transition: border-color 0.15s, transform 0.1s;
        width: 100%; box-sizing: border-box;
      }
      .pc-card:hover { border-color: #00cc44; transform: translateY(-1px); }
      .pc-card.pc-dragging { opacity: 0.45; transform: rotate(3deg); }

      .pc-card-warrior { border-left: 3px solid #c0392b; }
      .pc-card-rogue   { border-left: 3px solid #27ae60; }
      .pc-card-mage    { border-left: 3px solid #2980b9; }
      .pc-card-cleric  { border-left: 3px solid #f39c12; }

      .pc-card-top { display: flex; justify-content: space-between; margin-bottom: 3px; }
      .pc-card-name { color: #ddd; font-size: 13px; font-weight: bold; }
      .pc-card-level { font-size: 11px; color: #666; }
      .pc-card-class { font-size: 11px; display: block; margin-bottom: 5px; }

      .pc-card-hp { position: relative; height: 12px; background: #222; border-radius: 6px; overflow: hidden; margin-bottom: 5px; }
      .pc-card-hp-bar { height: 100%; background: linear-gradient(90deg, #c0392b, #e67e22, #27ae60); }
      .pc-card-hp-text {
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 9px; color: #fff; text-shadow: 0 0 3px #000;
      }
      .pc-card-stats { display: flex; gap: 8px; font-size: 10px; color: #666; }
      .pc-slot-remove {
        display: block; font-size: 9px; color: #ff4444; text-align: right;
        margin-top: 4px; opacity: 0;
        transition: opacity 0.15s;
      }
      .pc-card:hover .pc-slot-remove { opacity: 1; }

      /* Footer */
      .pc-footer {
        flex-shrink: 0;
        padding: 10px 16px;
        border-top: 1px solid #222;
        display: flex; justify-content: space-between; align-items: center;
        gap: 10px;
      }
      .pc-validation { flex: 1; font-size: 12px; }
      .pc-val-ok   { color: #00ff55; }
      .pc-val-warn { color: #ff9944; }
      .pc-val-info { color: #6688aa; }
      .pc-actions { display: flex; gap: 10px; flex-shrink: 0; }

      /* Scrollbars */
      .pc-left::-webkit-scrollbar,
      .pc-right::-webkit-scrollbar,
      .pc-roster::-webkit-scrollbar { width: 4px; }
      .pc-left::-webkit-scrollbar-track,
      .pc-right::-webkit-scrollbar-track,
      .pc-roster::-webkit-scrollbar-track { background: #0a0a0a; }
      .pc-left::-webkit-scrollbar-thumb,
      .pc-right::-webkit-scrollbar-thumb,
      .pc-roster::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }

      @media (max-width: 600px) {
        .pc-body { grid-template-columns: 1fr; }
        .pc-left { border-right: none; border-bottom: 1px solid #222; max-height: 50vh; }
      }
    `;
    document.head.appendChild(s);
  }
}
