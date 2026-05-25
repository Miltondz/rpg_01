import { Logger } from '../utils/Logger.js';

const log = Logger.tag('UI:MainMenu');

const CREDITS_HTML = `
<div class="mm-credits-body">
  <p class="mm-credits-section">DESIGN &amp; DEVELOPMENT</p>
  <p class="mm-credits-name">MILTON</p>
  <p class="mm-credits-section">ENGINE</p>
  <p class="mm-credits-name">VANILLA ES6 + THREE.JS r128</p>
  <p class="mm-credits-section">AESTHETIC</p>
  <p class="mm-credits-name">DUNGEON MASTER · DAGGERFALL<br>BALDUR'S GATE · MORROWIND</p>
  <p class="mm-credits-section">FONT</p>
  <p class="mm-credits-name">PRESS START 2P</p>
  <button class="mm-btn mm-btn-back" id="mm-credits-back">◀ BACK</button>
</div>
`;

export class MainMenuScreen {
  constructor(saveSystem) {
    this._saveSystem  = saveSystem;
    this._el          = null;
    this._items       = [];
    this._selectedIdx = 0;
    this._keyHandler  = null;
    this._showingCredits = false;
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.id        = 'main-menu-screen';
    this._el.className = 'main-menu-screen hidden';
    this._el.innerHTML = `
      <div class="mm-scanlines"></div>
      <div class="mm-particles" id="mm-particles"></div>

      <!-- Main panel -->
      <div class="mm-frame" id="mm-main-panel">
        <div class="mm-corner mm-corner-tl">┌</div>
        <div class="mm-corner mm-corner-tr">┐</div>
        <div class="mm-corner mm-corner-bl">└</div>
        <div class="mm-corner mm-corner-br">┘</div>

        <div class="mm-title-area">
          <div class="mm-skull">☠</div>
          <h1 class="mm-title">CRYPT<br>OF SHADOWS</h1>
          <div class="mm-subtitle">── DUNGEON CRAWLER ──</div>
        </div>

        <nav class="mm-nav" id="main-menu-nav">
          <button class="mm-btn" data-action="new-game">▶ NEW GAME</button>
          <button class="mm-btn" data-action="continue">▶ CONTINUE</button>
          <button class="mm-btn" data-action="options">▶ OPTIONS</button>
          <button class="mm-btn" data-action="credits">▶ CREDITS</button>
          <button class="mm-btn mm-btn-quit" data-action="quit">▶ QUIT</button>
        </nav>

        <p class="mm-hint">W · S · ↑↓ NAVIGATE &nbsp;·&nbsp; ENTER SELECT</p>
      </div>

      <!-- Credits panel (hidden by default) -->
      <div class="mm-frame mm-credits-panel hidden" id="mm-credits-panel">
        <div class="mm-corner mm-corner-tl">┌</div>
        <div class="mm-corner mm-corner-tr">┐</div>
        <div class="mm-corner mm-corner-bl">└</div>
        <div class="mm-corner mm-corner-br">┘</div>
        <div class="mm-credits-title">── CREDITS ──</div>
        ${CREDITS_HTML}
      </div>
    `;
    document.body.appendChild(this._el);

    this._items = Array.from(this._el.querySelectorAll('#main-menu-nav .mm-btn'));
    this._items.forEach((btn, i) => {
      btn.addEventListener('click',      () => { if (!btn.disabled) this._activate(i); });
      btn.addEventListener('mouseenter', () => this._select(i));
    });

    this._el.querySelector('#mm-credits-back')
      ?.addEventListener('click', () => this._hideCredits());

    this._spawnParticles();
  }

  _spawnParticles() {
    const container = this._el.querySelector('#mm-particles');
    if (!container) return;
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      p.className = 'mm-particle';
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation-delay: ${(Math.random() * 4).toFixed(2)}s;
        animation-duration: ${(3 + Math.random() * 4).toFixed(2)}s;
      `;
      container.appendChild(p);
    }
  }

  show() {
    this._el.classList.remove('hidden');
    this._hideCredits();
    this._refreshContinue();
    this._select(0);

    this._keyHandler = (e) => this._handleKey(e);
    document.addEventListener('keydown', this._keyHandler);
    log.info('Main menu shown');
  }

  hide() {
    this._el.classList.add('hidden');
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    log.info('Main menu hidden');
  }

  _refreshContinue() {
    const btn     = this._items.find(b => b.dataset.action === 'continue');
    if (!btn) return;
    const hasSave = this._hasSave();
    btn.disabled  = !hasSave;
    btn.classList.toggle('mm-btn-disabled', !hasSave);
  }

  _hasSave() {
    if (!this._saveSystem) return false;
    if (this._saveSystem.hasSave('auto')) return true;
    for (let i = 1; i <= 3; i++) {
      if (this._saveSystem.hasSave(i)) return true;
    }
    return false;
  }

  _select(idx) {
    this._selectedIdx = idx;
    this._items.forEach((btn, i) => btn.classList.toggle('mm-btn-active', i === idx));
  }

  _activate(idx) {
    const btn    = this._items[idx];
    if (btn.disabled) return;
    const action = btn.dataset.action;
    if (action === 'new-game') window.dispatchEvent(new CustomEvent('mainMenuNewGame'));
    if (action === 'continue') window.dispatchEvent(new CustomEvent('mainMenuContinue'));
    if (action === 'options')  window.dispatchEvent(new CustomEvent('mainMenuOptions'));
    if (action === 'credits')  this._showCredits();
    if (action === 'quit')     this._confirmQuit();
  }

  _showCredits() {
    this._showingCredits = true;
    this._el.querySelector('#mm-main-panel')?.classList.add('hidden');
    this._el.querySelector('#mm-credits-panel')?.classList.remove('hidden');
  }

  _hideCredits() {
    this._showingCredits = false;
    this._el.querySelector('#mm-main-panel')?.classList.remove('hidden');
    this._el.querySelector('#mm-credits-panel')?.classList.add('hidden');
  }

  _confirmQuit() {
    // In a browser, window.close() only works on self-opened windows.
    // Show a quick flash confirm then attempt close.
    if (confirm('Quit the game?')) {
      window.close();
      // Fallback: blank page
      document.body.innerHTML = '<div style="background:#000;color:#FF0055;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;font-size:14px">GAME OVER — close this tab</div>';
    }
  }

  _handleKey(e) {
    if (this._showingCredits) {
      if (e.code === 'Escape' || e.code === 'Backspace') this._hideCredits();
      return;
    }
    const n = this._items.length;
    if (e.code === 'ArrowUp'   || e.code === 'KeyW') {
      e.preventDefault(); this._select((this._selectedIdx - 1 + n) % n);
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault(); this._select((this._selectedIdx + 1) % n);
    } else if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault(); this._activate(this._selectedIdx);
    } else if (e.code === 'Escape') {
      // do nothing on main menu
    }
  }
}
