/**
 * TouchControls — virtual D-pad + action buttons for mobile / touchscreen.
 *
 * Layout:
 *   Bottom-left:  D-pad  (↑ forward, ↓ backward, ← turnLeft, → turnRight)
 *   Bottom-right: Aux    (Q strafe-left, E strafe-right, SPACE interact)
 *   Top-right:    Toggle button (show/hide; persists in localStorage)
 *
 * Usage:
 *   const tc = new TouchControls(inputManager);
 *   tc.initialize();
 *   tc.dispose();  // on cleanup
 *
 * Disable programmatically:
 *   tc.setEnabled(false);   // hides overlay, ignores touches
 *   tc.setEnabled(true);
 */

const STORAGE_KEY = 'darkbit_touch_enabled';

const BTN = [
  // D-pad
  { id: 'tc-forward',     action: 'forward',    label: '▲', col: 2, row: 1, pad: 'left'  },
  { id: 'tc-backward',    action: 'backward',   label: '▼', col: 2, row: 3, pad: 'left'  },
  { id: 'tc-turnLeft',    action: 'turnLeft',   label: '◄', col: 1, row: 2, pad: 'left'  },
  { id: 'tc-turnRight',   action: 'turnRight',  label: '►', col: 3, row: 2, pad: 'left'  },
  // Aux
  { id: 'tc-strafeLeft',  action: 'strafeLeft', label: 'Q',     col: 1, row: 1, pad: 'right' },
  { id: 'tc-strafeRight', action: 'strafeRight',label: 'E',     col: 3, row: 1, pad: 'right' },
  { id: 'tc-interact',    action: 'interact',   label: '⚡',    col: 2, row: 2, pad: 'right', large: true },
  { id: 'tc-menu',        action: 'openMenu',   label: '☰',    col: 3, row: 3, pad: 'right' },
];

export class TouchControls {
  constructor(inputManager) {
    this._input    = inputManager;
    this._root     = null;
    this._toggle   = null;
    this._enabled  = localStorage.getItem(STORAGE_KEY) !== 'false';
    this._handlers = new Map(); // btnEl → handler
  }

  initialize() {
    this._injectStyles();
    this._buildDOM();
    this._applyEnabled();
  }

  /** Show or hide the controls overlay. Persisted across reloads. */
  setEnabled(val) {
    this._enabled = !!val;
    localStorage.setItem(STORAGE_KEY, this._enabled);
    this._applyEnabled();
  }

  isEnabled() { return this._enabled; }

  dispose() {
    for (const [el, h] of this._handlers) {
      el.removeEventListener('touchstart', h);
      el.removeEventListener('mousedown',  h);
    }
    this._handlers.clear();
    this._root?.remove();
    this._toggle?.remove();
    this._root = this._toggle = null;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _applyEnabled() {
    if (!this._root) return;
    this._root.style.display   = this._enabled ? 'grid' : 'none';
    if (this._toggle) {
      this._toggle.textContent = this._enabled ? '🕹️' : '🕹️';
      this._toggle.title       = this._enabled ? 'Hide touch controls' : 'Show touch controls';
      this._toggle.classList.toggle('tc-toggle--off', !this._enabled);
    }
  }

  _fire(action, e) {
    e.preventDefault();
    e.stopPropagation();
    this._input.injectAction(action);
  }

  _bind(el, action) {
    const h = (e) => this._fire(action, e);
    el.addEventListener('touchstart', h, { passive: false });
    el.addEventListener('mousedown',  h);
    this._handlers.set(el, h);
  }

  _buildDOM() {
    // ── Toggle button (always visible, top-right) ─────────────────────────
    this._toggle = document.createElement('button');
    this._toggle.id        = 'tc-toggle';
    this._toggle.className = 'tc-toggle';
    this._toggle.title     = 'Toggle touch controls';
    this._toggle.textContent = '🕹️';
    this._toggle.addEventListener('click', () => this.setEnabled(!this._enabled));
    document.body.appendChild(this._toggle);

    // ── Left pad ─────────────────────────────────────────────────────────
    const leftPad  = this._makePad('tc-pad tc-pad--left');
    // ── Right pad ────────────────────────────────────────────────────────
    const rightPad = this._makePad('tc-pad tc-pad--right');

    for (const def of BTN) {
      const btn = document.createElement('button');
      btn.id        = def.id;
      btn.className = `tc-btn${def.large ? ' tc-btn--large' : ''}`;
      btn.style.gridColumn = def.col;
      btn.style.gridRow    = def.row;
      btn.textContent      = def.label;
      btn.setAttribute('aria-label', def.action);

      this._bind(btn, def.action);
      (def.pad === 'left' ? leftPad : rightPad).appendChild(btn);
    }

    // ── Root wrapper (invisible positioning container) ───────────────────
    this._root = document.createElement('div');
    this._root.id = 'tc-root';
    this._root.appendChild(leftPad);
    this._root.appendChild(rightPad);
    document.body.appendChild(this._root);
  }

  _makePad(className) {
    const pad = document.createElement('div');
    pad.className = className;
    return pad;
  }

  _injectStyles() {
    if (document.getElementById('tc-styles')) return;
    const s = document.createElement('style');
    s.id = 'tc-styles';
    s.textContent = `
      /* ── Touch Controls — Dark-Bit Glitch palette ── */
      #tc-root {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        height: 200px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding: 0 12px 12px;
        pointer-events: none;
        z-index: 900;
        user-select: none;
        -webkit-user-select: none;
      }

      .tc-pad {
        display: grid;
        grid-template-columns: repeat(3, 60px);
        grid-template-rows: repeat(3, 60px);
        gap: 4px;
        pointer-events: all;
      }

      .tc-btn {
        width: 60px; height: 60px;
        background: rgba(0,0,0,0.72);
        border: 1.5px solid rgba(0,255,238,0.55);
        border-radius: 6px;
        color: #c8c8b4;
        font-size: 22px;
        line-height: 1;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        transition: background 80ms, border-color 80ms;
      }

      .tc-btn:active,
      .tc-btn.tc-active {
        background: rgba(0,255,238,0.18);
        border-color: #00ffee;
        color: #00ffee;
      }

      .tc-btn--large {
        width: 60px; height: 60px;
        background: rgba(0,0,0,0.80);
        border: 1.5px solid rgba(255,0,204,0.65);
        color: #ff00cc;
        font-size: 26px;
      }

      .tc-btn--large:active {
        background: rgba(255,0,204,0.22);
        border-color: #ff00cc;
      }

      /* Toggle — fixed top-right */
      .tc-toggle {
        position: fixed;
        top: 12px; right: 12px;
        width: 44px; height: 44px;
        background: rgba(0,0,0,0.70);
        border: 1.5px solid rgba(0,255,238,0.45);
        border-radius: 8px;
        font-size: 22px;
        cursor: pointer;
        z-index: 910;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        display: flex; align-items: center; justify-content: center;
      }

      .tc-toggle--off {
        border-color: rgba(255,0,204,0.4);
        opacity: 0.55;
      }

      /* Hide on desktop by default — only show if touch device */
      @media (hover: hover) and (pointer: fine) {
        #tc-root   { display: none !important; }
        .tc-toggle { display: none !important; }
      }
    `;
    document.head.appendChild(s);
  }
}
