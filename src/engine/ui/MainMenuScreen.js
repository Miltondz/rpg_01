import { Logger } from '../utils/Logger.js';

const log = Logger.tag('UI:MainMenu');

export class MainMenuScreen {
  constructor(saveSystem) {
    this._saveSystem = saveSystem;
    this._el         = null;
    this._items      = [];
    this._selectedIdx = 0;
    this._keyHandler  = null;
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.id        = 'main-menu-screen';
    this._el.className = 'main-menu-screen hidden';
    this._el.innerHTML = `
      <div class="main-menu-bg"></div>
      <div class="main-menu-content">
        <h1 class="menu-game-title">CRYPT OF SHADOWS</h1>
        <nav class="menu-nav" id="main-menu-nav">
          <button class="menu-item" data-action="new-game">NEW GAME</button>
          <button class="menu-item" data-action="continue">CONTINUE</button>
          <button class="menu-item" data-action="options">OPTIONS</button>
        </nav>
        <p class="menu-footer-hint">↑↓ / W S to navigate &nbsp;·&nbsp; Enter to select</p>
      </div>
    `;
    document.body.appendChild(this._el);

    this._items = Array.from(this._el.querySelectorAll('.menu-item'));
    this._items.forEach((btn, i) => {
      btn.addEventListener('click',      () => { if (!btn.disabled) this._activate(i); });
      btn.addEventListener('mouseenter', () => this._select(i));
    });
  }

  show() {
    this._el.classList.remove('hidden');
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
    const btn     = this._el.querySelector('[data-action="continue"]');
    const hasSave = this._hasSave();
    btn.disabled  = !hasSave;
    btn.classList.toggle('menu-item-disabled', !hasSave);
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
    this._items.forEach((btn, i) => btn.classList.toggle('menu-item-active', i === idx));
  }

  _activate(idx) {
    const btn    = this._items[idx];
    if (btn.disabled) return;
    const action = btn.dataset.action;
    if (action === 'new-game') window.dispatchEvent(new CustomEvent('mainMenuNewGame'));
    if (action === 'continue') window.dispatchEvent(new CustomEvent('mainMenuContinue'));
    if (action === 'options')  window.dispatchEvent(new CustomEvent('mainMenuOptions'));
  }

  _handleKey(e) {
    const n = this._items.length;
    if (e.code === 'ArrowUp'   || e.code === 'KeyW') {
      e.preventDefault(); this._select((this._selectedIdx - 1 + n) % n);
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault(); this._select((this._selectedIdx + 1) % n);
    } else if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault(); this._activate(this._selectedIdx);
    }
  }
}
