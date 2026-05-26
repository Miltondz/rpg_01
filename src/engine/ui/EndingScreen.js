import { Logger } from '../utils/Logger.js';

const log = Logger.tag('UI:Ending');

export class EndingScreen {
  constructor() {
    this._el = null;
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.id = 'ending-screen';
    this._el.style.cssText = `
      display:none; position:fixed; inset:0; z-index:9999;
      background:#000; display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      font-family:'Press Start 2P','Courier New',monospace;
      color:#FF0055; text-align:center; padding:40px;
    `;
    this._el.innerHTML = `
      <div id="ending-content" style="max-width:600px">
        <div id="ending-skull" style="font-size:64px;margin-bottom:24px;animation:ending-pulse 2s infinite">💀</div>
        <h1 style="font-size:14px;color:#00FF44;letter-spacing:4px;margin-bottom:16px">VICTORY</h1>
        <h2 id="ending-title" style="font-size:10px;color:#FF0055;margin-bottom:24px">CRYPT OF SHADOWS CONQUERED</h2>
        <p id="ending-text" style="font-size:7px;color:#FF3377;line-height:1.8;margin-bottom:32px">
          The Shadow Lord has fallen.<br>
          The crypt grows silent.<br>
          Your legend is written in blood.
        </p>
        <div id="ending-stats" style="font-size:6px;color:#550022;margin-bottom:32px;line-height:2"></div>
        <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
          <button id="ending-menu-btn" style="
            font-family:inherit;font-size:7px;color:#FF0055;
            background:#000;border:1px solid #FF0055;
            padding:10px 20px;cursor:pointer;letter-spacing:2px;
          ">◀ MAIN MENU</button>
          <button id="ending-credits-btn" style="
            font-family:inherit;font-size:7px;color:#00FF44;
            background:#000;border:1px solid #00FF44;
            padding:10px 20px;cursor:pointer;letter-spacing:2px;
          ">★ CREDITS</button>
        </div>
      </div>
      <style>
        @keyframes ending-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      </style>
    `;
    document.body.appendChild(this._el);

    this._el.querySelector('#ending-menu-btn').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('gameStateChange', { detail: { type: 'returnToMenu' } }));
    });
    this._el.querySelector('#ending-credits-btn').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('gameStateChange', { detail: { type: 'returnToMenu' } }));
    });
  }

  show(detail = {}) {
    this._el.style.display = 'flex';
    log.info('ending screen shown');

    // Populate stats if party available
    const statsEl = this._el.querySelector('#ending-stats');
    if (detail.party) {
      const lines = detail.party
        .filter(Boolean)
        .map(c => `${c.name} — LV ${c.level ?? 1} ${(c.class ?? c.characterClass ?? '').toUpperCase()}`)
        .join('<br>');
      statsEl.innerHTML = lines;
    }
  }

  hide() {
    this._el.style.display = 'none';
  }
}
