import { Logger } from '../utils/Logger.js';
import { ResolutionManager } from '../core/ResolutionManager.js';

const log = Logger.tag('UI:Options');

const DEFAULTS = {
  musicVolume:      0.5,
  sfxVolume:        0.7,
  minimapEnabled:   true,
  fpsCounterEnabled: false,
};

const CONTROLS = [
  ['W / ↑',    'Move Forward'],
  ['S / ↓',    'Move Backward'],
  ['A / ←',    'Turn Left'],
  ['D / →',    'Turn Right'],
  ['Q',        'Strafe Left'],
  ['E',        'Strafe Right'],
  ['Space',    'Interact'],
  ['I',        'Inventory'],
  ['C',        'Character Sheet'],
  ['Esc',      'Pause Menu'],
  ['F5',       'Quick Save'],
  ['F9',       'Quick Load'],
];

export class OptionsScreen {
  constructor(resolutionManager = null) {
    this._opts              = { ...DEFAULTS };
    this._el                = null;
    this._keyHandler        = null;
    this._resolutionManager = resolutionManager;
    this._loadFromStorage();
    this._build();
  }

  get options() { return { ...this._opts }; }

  show() {
    this._el.classList.remove('hidden');
    this._keyHandler = (e) => { if (e.code === 'Escape') { e.preventDefault(); this._back(); } };
    document.addEventListener('keydown', this._keyHandler);
    log.info('Options shown');
  }

  hide() {
    this._el.classList.add('hidden');
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    log.info('Options hidden');
  }

  // ──────────────────────────────────────────────
  _build() {
    const ctrlRows = CONTROLS.map(([key, desc]) =>
      `<div class="ctrl-row"><span class="ctrl-key">${key}</span><span>${desc}</span></div>`
    ).join('');

    this._el = document.createElement('div');
    this._el.id        = 'options-screen';
    this._el.className = 'options-screen hidden';
    this._el.innerHTML = `
      <div class="options-content">
        <h2 class="options-title">OPTIONS</h2>

        <div class="options-section">
          <h3 class="options-section-title">AUDIO</h3>
          <label class="options-row">
            <span class="opt-label">Music Volume</span>
            <input type="range" class="opt-slider" id="opt-music"
                   min="0" max="1" step="0.05" value="${this._opts.musicVolume}">
            <span class="opt-val" id="opt-music-val">${_pct(this._opts.musicVolume)}</span>
          </label>
          <label class="options-row">
            <span class="opt-label">SFX Volume</span>
            <input type="range" class="opt-slider" id="opt-sfx"
                   min="0" max="1" step="0.05" value="${this._opts.sfxVolume}">
            <span class="opt-val" id="opt-sfx-val">${_pct(this._opts.sfxVolume)}</span>
          </label>
        </div>

        <div class="options-section">
          <h3 class="options-section-title">DISPLAY</h3>
          <label class="options-row options-toggle-row">
            <span class="opt-label">Minimap</span>
            <input type="checkbox" class="opt-check" id="opt-minimap"
                   ${this._opts.minimapEnabled ? 'checked' : ''}>
            <span class="opt-toggle-track"><span class="opt-toggle-thumb"></span></span>
          </label>
          <label class="options-row options-toggle-row">
            <span class="opt-label">FPS Counter</span>
            <input type="checkbox" class="opt-check" id="opt-fps"
                   ${this._opts.fpsCounterEnabled ? 'checked' : ''}>
            <span class="opt-toggle-track"><span class="opt-toggle-thumb"></span></span>
          </label>
          <div class="options-row" id="resolution-row" style="${this._resolutionManager ? '' : 'display:none'}">
            <span class="opt-label">Resolution</span>
            <div class="opt-resolution-btns" id="opt-res-btns">
              ${this._buildResolutionButtons()}
            </div>
          </div>
        </div>

        <div class="options-section">
          <h3 class="options-section-title">CONTROLS</h3>
          <div class="controls-ref">${ctrlRows}</div>
        </div>

        <button class="menu-item options-back-btn" id="opt-back-btn">BACK [Esc]</button>
      </div>
    `;
    document.body.appendChild(this._el);
    this._wireEvents();
  }

  _wireEvents() {
    const slider = (id, key) => {
      const el  = this._el.querySelector(`#${id}`);
      const val = this._el.querySelector(`#${id}-val`);
      el.addEventListener('input', () => {
        this._opts[key] = parseFloat(el.value);
        val.textContent = _pct(this._opts[key]);
        this._save();
        window.dispatchEvent(new CustomEvent('optionChanged', { detail: { key, value: this._opts[key] } }));
      });
    };
    const toggle = (id, key) => {
      const el = this._el.querySelector(`#${id}`);
      el.addEventListener('change', () => {
        this._opts[key] = el.checked;
        this._save();
        window.dispatchEvent(new CustomEvent('optionChanged', { detail: { key, value: this._opts[key] } }));
      });
    };

    slider('opt-music', 'musicVolume');
    slider('opt-sfx',   'sfxVolume');
    toggle('opt-minimap', 'minimapEnabled');
    toggle('opt-fps',     'fpsCounterEnabled');

    // Resolution buttons
    if (this._resolutionManager) {
      this._el.querySelector('#opt-res-btns')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-res-w]');
        if (!btn) return;
        const w = parseInt(btn.dataset.resW);
        const h = parseInt(btn.dataset.resH);
        this._resolutionManager.apply(w, h);
        this._updateResolutionButtons();
      });
    }

    this._el.querySelector('#opt-back-btn').addEventListener('click', () => this._back());
  }

  _buildResolutionButtons() {
    if (!this._resolutionManager) return '';
    const cur = this._resolutionManager.getCurrent();
    return this._resolutionManager.getPresets().map(p => {
      const active = (p.w === cur?.w && p.h === cur?.h) ? ' res-btn--active' : '';
      return `<button class="opt-res-btn${active}" data-res-w="${p.w}" data-res-h="${p.h}">${p.label}</button>`;
    }).join('');
  }

  _updateResolutionButtons() {
    const container = this._el.querySelector('#opt-res-btns');
    if (!container || !this._resolutionManager) return;
    const cur = this._resolutionManager.getCurrent();
    container.querySelectorAll('[data-res-w]').forEach(btn => {
      const active = parseInt(btn.dataset.resW) === cur?.w && parseInt(btn.dataset.resH) === cur?.h;
      btn.classList.toggle('res-btn--active', active);
    });
  }

  _back() { window.dispatchEvent(new CustomEvent('optionsBack')); }

  _loadFromStorage() {
    try {
      const s = localStorage.getItem('dungeonOptions');
      if (s) Object.assign(this._opts, JSON.parse(s));
    } catch { /* ignore */ }
  }

  _save() {
    try { localStorage.setItem('dungeonOptions', JSON.stringify(this._opts)); } catch { /* ignore */ }
  }
}

function _pct(v) { return Math.round(v * 100) + '%'; }
