/**
 * CampUI — campsite rest & management overlay.
 * Ported from darkmoor CampDialog.java.
 *
 * Options: Rest (restore HP + spell slots), Save, Review Party.
 * Activated by 'openCamp' action (Z key).
 */
import { Logger } from '../utils/Logger.js';

const log = Logger.tag('UI:Camp');

export class CampUI {
  constructor(partyManager, saveSystem, autoSaveManager) {
    this._party     = partyManager;
    this._save      = saveSystem;
    this._autoSave  = autoSaveManager;
    this._el        = null;
    this._visible   = false;
    this._onClose   = null;
  }

  onClose(fn) { this._onClose = fn; }

  initialize() {
    this._el = this._build();
    document.body.appendChild(this._el);
    log.info('initialized');
  }

  show() {
    if (!this._el) this.initialize();
    this._el.style.display = 'flex';
    this._visible = true;
    window.dispatchEvent(new CustomEvent('campOpened'));
  }

  hide() {
    if (this._el) this._el.style.display = 'none';
    this._visible = false;
    this._onClose?.();
    window.dispatchEvent(new CustomEvent('campClosed'));
  }

  isVisible() { return this._visible; }

  // ── Rest ──────────────────────────────────────────────────────────────────

  async rest(hours = 8) {
    const members = this._party?.getActiveMembers?.() ?? [];
    if (members.length === 0) { this._toast('No party to rest'); return; }

    for (const m of members) {
      if (!m.isAlive?.() && m.isDead?.()) continue;
      // Restore HP: 1 hour = (maxHP / 8) restored
      const perHour = Math.ceil((m.maxHP ?? 100) / 8);
      const healed  = Math.min(m.maxHP - m.currentHP, perHour * hours);
      if (healed > 0) m.currentHP = (m.currentHP ?? 0) + healed;
      // Restore spell slots
      m.restoreSpellSlots?.();
    }

    this._autoSave?.save?.('camp_rest');
    this._toast(`Party rested ${hours}h. HP and spell slots restored.`);
    window.dispatchEvent(new CustomEvent('campRested', { detail: { hours } }));
    log.info(`Party rested ${hours}h`);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _build() {
    const overlay = document.createElement('div');
    overlay.id = 'camp-ui-overlay';
    overlay.style.cssText = `
      display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85);
      align-items:center; justify-content:center; z-index:900;
      font-family:'Press Start 2P',monospace; color:#FF3377;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background:#000; border:2px solid #FF0055;
      box-shadow:0 0 16px #FF0055; padding:24px 32px; min-width:280px;
      display:flex; flex-direction:column; gap:12px;
    `;

    const title = document.createElement('div');
    title.textContent = '⛺ CAMP';
    title.style.cssText = 'font-size:14px; color:#FF0055; margin-bottom:8px; text-align:center;';
    panel.appendChild(title);

    const buttons = [
      { label: '[ REST (8h) ]',   action: () => this.rest(8)  },
      { label: '[ REST (4h) ]',   action: () => this.rest(4)  },
      { label: '[ SAVE GAME ]',   action: () => this._doSave() },
      { label: '[ LEAVE CAMP ]',  action: () => this.hide()   },
    ];

    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.textContent = b.label;
      btn.style.cssText = `
        background:none; border:1px solid #FF0055; color:#FF3377;
        font-family:'Press Start 2P',monospace; font-size:9px;
        padding:8px 12px; cursor:pointer; text-align:left;
      `;
      btn.onmouseenter = () => { btn.style.background = '#FF005522'; };
      btn.onmouseleave = () => { btn.style.background = 'none'; };
      btn.addEventListener('click', b.action);
      panel.appendChild(btn);
    }

    this._toastEl = document.createElement('div');
    this._toastEl.style.cssText = 'font-size:7px; color:#00FF44; min-height:16px; margin-top:4px;';
    panel.appendChild(this._toastEl);

    overlay.appendChild(panel);

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hide();
    });

    return overlay;
  }

  _toast(msg) {
    if (this._toastEl) this._toastEl.textContent = msg;
    log.debug(msg);
  }

  async _doSave() {
    if (this._save) {
      try {
        await this._save.saveGame?.('camp_manual');
        this._toast('Game saved.');
      } catch (e) {
        this._toast('Save failed: ' + e.message);
      }
    } else {
      this._toast('Save system unavailable.');
    }
  }
}
