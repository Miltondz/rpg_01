import { Logger } from '../utils/Logger.js';

const log = Logger.tag('UI:PauseMenu');

const ITEMS = [
  { label: 'RESUME',       action: 'resume'        },
  { label: 'OPTIONS',      action: 'options'       },
  { label: 'SAVE GAME',    action: 'save'          },
  { label: 'LOAD GAME',    action: 'load'          },
  { label: 'EXIT TO MENU', action: 'exit-to-menu'  },
];

export class PauseMenuScreen {
  constructor() {
    this._el          = null;
    this._items       = [];
    this._selectedIdx = 0;
    this._keyHandler  = null;
    this._build();
  }

  _build() {
    const btns = ITEMS.map(({ label, action }) =>
      `<button class="menu-item" data-action="${action}">${label}</button>`
    ).join('');

    this._el = document.createElement('div');
    this._el.id        = 'pause-menu-screen';
    this._el.className = 'pause-menu-screen hidden';
    this._el.innerHTML = `
      <div class="pause-menu-backdrop"></div>
      <div class="pause-menu-content">
        <h2 class="pause-menu-title">PAUSED</h2>
        <nav class="pause-menu-nav">${btns}</nav>
      </div>
    `;
    document.body.appendChild(this._el);

    this._items = Array.from(this._el.querySelectorAll('.menu-item'));
    this._items.forEach((btn, i) => {
      btn.addEventListener('click',      () => this._activate(i));
      btn.addEventListener('mouseenter', () => this._select(i));
    });
  }

  show() {
    this._el.classList.remove('hidden');
    this._select(0);

    this._keyHandler = (e) => this._handleKey(e);
    document.addEventListener('keydown', this._keyHandler);
    log.info('Pause menu shown');
  }

  hide() {
    this._el.classList.add('hidden');
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    log.info('Pause menu hidden');
  }

  _select(idx) {
    this._selectedIdx = idx;
    this._items.forEach((btn, i) => btn.classList.toggle('menu-item-active', i === idx));
  }

  _activate(idx) {
    const action = this._items[idx].dataset.action;
    window.dispatchEvent(new CustomEvent('pauseAction', { detail: { action } }));
  }

  _handleKey(e) {
    const n = this._items.length;
    if (e.code === 'ArrowUp'   || e.code === 'KeyW') {
      e.preventDefault(); this._select((this._selectedIdx - 1 + n) % n);
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault(); this._select((this._selectedIdx + 1) % n);
    } else if (e.code === 'Enter') {
      e.preventDefault(); this._activate(this._selectedIdx);
    } else if (e.code === 'Escape') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('pauseAction', { detail: { action: 'resume' } }));
    }
  }
}
