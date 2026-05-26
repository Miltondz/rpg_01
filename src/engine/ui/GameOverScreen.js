import { Logger } from '../utils/Logger.js';

const log = Logger.tag('UI:GameOver');

export class GameOverScreen {
  constructor() {
    this._el = null;
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.id = 'game-over-screen';
    this._el.style.cssText = `
      display:none; position:fixed; inset:0; z-index:9990;
      background:#000; font-family:'Press Start 2P','Courier New',monospace;
      color:#FF0055; text-align:center; padding:60px 40px;
      flex-direction:column; align-items:center; justify-content:center;
    `;
    this._el.innerHTML = `
      <div style="max-width:500px">
        <div id="go-skull" style="font-size:72px;margin-bottom:20px;filter:grayscale(80%);opacity:0.7">💀</div>
        <h1 style="font-size:16px;color:#FF0055;letter-spacing:6px;margin-bottom:12px">GAME OVER</h1>
        <p id="go-subtitle" style="font-size:7px;color:#550022;letter-spacing:2px;margin-bottom:32px">YOUR PARTY HAS FALLEN</p>
        <div id="go-survivors" style="font-size:6px;color:#330011;margin-bottom:32px;line-height:2"></div>
        <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
          <button id="go-retry-btn" style="
            font-family:inherit;font-size:7px;color:#FF0055;
            background:#000;border:1px solid #FF0055;
            padding:10px 20px;cursor:pointer;letter-spacing:2px;
          ">↺ RETRY</button>
          <button id="go-load-btn" style="
            font-family:inherit;font-size:7px;color:#FF3377;
            background:#000;border:1px solid #330011;
            padding:10px 20px;cursor:pointer;letter-spacing:2px;
          ">📂 LOAD SAVE</button>
          <button id="go-menu-btn" style="
            font-family:inherit;font-size:7px;color:#550022;
            background:#000;border:1px solid #220008;
            padding:10px 20px;cursor:pointer;letter-spacing:2px;
          ">◀ MENU</button>
        </div>
      </div>
      <style>
        @keyframes go-flicker { 0%,100%{opacity:1} 45%{opacity:0.85} 50%{opacity:0.4} 55%{opacity:0.85} }
        #game-over-screen.visible h1 { animation: go-flicker 3s infinite; }
      </style>
    `;
    document.body.appendChild(this._el);

    this._el.querySelector('#go-retry-btn').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('gameStateChange', { detail: { type: 'retryCombat' } }));
    });
    this._el.querySelector('#go-load-btn').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('gameStateChange', { detail: { type: 'loadSave' } }));
    });
    this._el.querySelector('#go-menu-btn').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('gameStateChange', { detail: { type: 'returnToMenu' } }));
    });
  }

  show(detail = {}) {
    this._el.style.display = 'flex';
    this._el.classList.add('visible');
    log.info('game over screen shown');

    const survivorsEl = this._el.querySelector('#go-survivors');
    if (detail.party?.length) {
      survivorsEl.innerHTML = detail.party
        .filter(Boolean)
        .map(c => `${c.name} — ${(typeof c.isDead === 'function' ? c.isDead() : c.currentHP <= 0) ? '<span style="color:#330011">FALLEN</span>' : `HP ${c.currentHP}/${c.maxHP}`}`)
        .join('<br>');
    } else {
      survivorsEl.innerHTML = '';
    }

    // Hide retry if no last encounter to retry
    this._el.querySelector('#go-retry-btn').style.display = detail.canRetry === false ? 'none' : '';
  }

  hide() {
    this._el.style.display = 'none';
    this._el.classList.remove('visible');
  }
}
