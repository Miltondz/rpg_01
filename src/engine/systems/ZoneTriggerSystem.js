import { Logger } from '../utils/Logger.js';

const log = Logger.tag('ZoneTrigger');

/**
 * ZoneTriggerSystem — fires tile-based triggers on movementCompleted.
 *
 * Tile schema (in tileMetadata or promoted from tutorialHints by DungeonLoader):
 *   { x, z, triggers: [{ type, text, title?, once?, msgType? }] }
 *
 * Trigger types:
 *   "flavor_text"  — typewriter DOM text overlay
 *   "hud_message"  — sends to ExplorationHUD event log via zoneTriggerHudMessage CustomEvent
 *                    optional: msgType ('system'|'loot'|'danger'|'ambient', default 'system')
 *   (other)        — dispatches zoneTriggerFired CustomEvent with { type, trigger, x, z }
 *
 * once: true → fires only the first time that tile is stepped on.
 */
export class ZoneTriggerSystem {
  static TYPEWRITER_SPEED = 28;   // ms per character
  static DISPLAY_TIME     = 3800; // ms text stays visible after typing completes
  static FADE_TIME        = 600;  // ms fade-out

  constructor(gridSystem) {
    this._grid   = gridSystem;
    this._fired  = new Set();
    this._panel  = null;
    this._titleEl = null;
    this._textEl  = null;
    this._typeTimer = null;
    this._hideTimer = null;
  }

  initialize() {
    this._createPanel();
    log.info('initialized');
  }

  /**
   * Check tile at (x, z) for triggers and fire them.
   * Call from movementCompleted handler for onEnter / onStand.
   *
   * Feature #19: triggerOn field:
   *   'enter' (default) — fires once when stepping onto tile
   *   'stand'           — fires every time player is on this tile (no dedup)
   *   'leave'           — fires when player leaves; use checkLeaveTriggers(prev)
   */
  checkTriggers(x, z) {
    const tile = this._grid?.getTile(x, z);
    if (!tile?.triggers) return;

    for (const trigger of tile.triggers) {
      const on = trigger.triggerOn ?? 'enter';
      if (on === 'leave') continue; // handled by checkLeaveTriggers

      const key = `${x},${z}::${trigger.type}::${(trigger.text ?? '').slice(0, 20)}`;
      if (on === 'enter' && trigger.once && this._fired.has(key)) continue;
      // 'stand' fires every time — no dedup check

      this._fire(trigger, x, z);
      if (on === 'enter' && trigger.once !== false) this._fired.add(key);
    }
  }

  /**
   * Call with the tile the player just LEFT to fire 'leave' triggers.
   * @param {number} x - Previous tile X
   * @param {number} z - Previous tile Z
   */
  checkLeaveTriggers(x, z) {
    const tile = this._grid?.getTile(x, z);
    if (!tile?.triggers) return;

    for (const trigger of tile.triggers) {
      if ((trigger.triggerOn ?? 'enter') !== 'leave') continue;
      const key = `leave::${x},${z}::${(trigger.text ?? '').slice(0, 20)}`;
      if (trigger.once && this._fired.has(key)) continue;

      this._fire(trigger, x, z);
      if (trigger.once !== false) this._fired.add(key);
    }
  }

  _fire(trigger, x, z) {
    switch (trigger.type) {
      case 'flavor_text':
        this._showText(trigger.title ?? '', trigger.text ?? '');
        break;
      case 'hud_message':
        window.dispatchEvent(new CustomEvent('zoneTriggerHudMessage', {
          detail: { text: trigger.text ?? '', msgType: trigger.msgType ?? 'system' }
        }));
        break;
      default:
        window.dispatchEvent(new CustomEvent('zoneTriggerFired', {
          detail: { type: trigger.type, trigger, x, z }
        }));
    }
  }

  dispose() {
    clearTimeout(this._typeTimer);
    clearTimeout(this._hideTimer);
    this._panel?.remove();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _createPanel() {
    let p = document.getElementById('zone-trigger-panel');
    if (!p) {
      p = document.createElement('div');
      p.id = 'zone-trigger-panel';
      document.body.appendChild(p);
    }
    p.style.cssText = [
      'position:fixed',
      'bottom:80px',
      'left:50%',
      'transform:translateX(-50%)',
      'min-width:280px',
      'max-width:520px',
      'background:rgba(6,3,12,0.88)',
      'border:1px solid rgba(180,140,60,0.55)',
      'border-radius:4px',
      'padding:10px 16px',
      'pointer-events:none',
      'z-index:7500',
      'opacity:0',
      'transition:opacity 0.3s ease',
      'font-family:monospace',
    ].join(';');

    this._titleEl = document.createElement('div');
    this._titleEl.style.cssText = 'color:#c8a850;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;';

    this._textEl = document.createElement('div');
    this._textEl.style.cssText = 'color:#d4c8a8;font-size:13px;line-height:1.45;';

    p.appendChild(this._titleEl);
    p.appendChild(this._textEl);
    this._panel = p;
  }

  _showText(title, fullText) {
    clearTimeout(this._typeTimer);
    clearTimeout(this._hideTimer);

    this._titleEl.textContent = title;
    this._textEl.textContent  = '';
    this._panel.style.opacity = '1';

    let i = 0;
    const type = () => {
      if (i < fullText.length) {
        this._textEl.textContent += fullText[i++];
        this._typeTimer = setTimeout(type, ZoneTriggerSystem.TYPEWRITER_SPEED);
      } else {
        // Typing done — schedule hide
        this._hideTimer = setTimeout(() => this._hide(), ZoneTriggerSystem.DISPLAY_TIME);
      }
    };
    type();
  }

  _hide() {
    this._panel.style.opacity = '0';
  }
}
