import { Logger } from '../utils/Logger.js';

const log = Logger.tag('UI:CampaignSelect');

const DIFF_COLOR = { Normal: '#00FF44', Hard: '#FF9900', Brutal: '#FF0055' };

export class CampaignSelectUI {
  constructor() {
    this._el = null;
    this._campaigns = [];
    this._selected = null;
    this._onSelect = null;
    this._onBack = null;
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.id = 'campaign-select-screen';
    this._el.style.cssText = `
      display:none; position:fixed; inset:0; z-index:8000;
      background:#000; font-family:'Press Start 2P','Courier New',monospace;
      color:#FF3377; overflow-y:auto;
    `;
    this._el.innerHTML = `
      <div style="max-width:700px;margin:0 auto;padding:40px 20px">
        <h1 style="font-size:10px;color:#FF0055;letter-spacing:4px;margin-bottom:8px;text-align:center">SELECT CAMPAIGN</h1>
        <p style="font-size:6px;color:#550022;text-align:center;margin-bottom:32px">Choose your adventure. Each campaign is a complete dungeon with its own story.</p>
        <div id="cs-list" style="display:flex;flex-direction:column;gap:12px"></div>
        <div style="margin-top:32px;text-align:center">
          <button id="cs-back-btn" style="
            font-family:inherit;font-size:7px;color:#550022;
            background:#000;border:1px solid #550022;
            padding:10px 24px;cursor:pointer;letter-spacing:2px;
          ">◀ BACK</button>
          <button id="cs-start-btn" style="
            font-family:inherit;font-size:7px;color:#FF0055;
            background:#000;border:1px solid #FF0055;
            padding:10px 24px;cursor:pointer;letter-spacing:2px;
            margin-left:16px;opacity:0.4;pointer-events:none;
          " disabled>▶ CONTINUE</button>
        </div>
      </div>
    `;
    document.body.appendChild(this._el);

    this._el.querySelector('#cs-back-btn').addEventListener('click', () => {
      this._onBack?.();
    });
    this._el.querySelector('#cs-start-btn').addEventListener('click', () => {
      if (this._selected) this._onSelect?.(this._selected);
    });
  }

  async show({ onSelect, onBack } = {}) {
    this._onSelect = onSelect;
    this._onBack = onBack;
    this._el.style.display = 'block';
    log.info('campaign select shown');

    if (this._campaigns.length === 0) {
      await this._loadCampaigns();
    }
    this._renderList();
  }

  hide() {
    this._el.style.display = 'none';
    this._selected = null;
  }

  async _loadCampaigns() {
    try {
      const res = await fetch('campaigns/index.json');
      if (res.ok) this._campaigns = await res.json();
    } catch (e) {
      log.warn('failed to load campaign index', { error: e.message });
      this._campaigns = [];
    }
  }

  _renderList() {
    const list = this._el.querySelector('#cs-list');
    list.innerHTML = '';
    for (const c of this._campaigns) {
      const card = document.createElement('div');
      card.dataset.id = c.id;
      card.style.cssText = `
        border:1px solid #330011; padding:16px 20px; cursor:pointer;
        background:#000; transition:border-color 0.1s;
      `;
      const diffColor = DIFF_COLOR[c.difficulty] ?? '#FF3377';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
          <span style="font-size:9px;color:${c.color ?? '#FF0055'};letter-spacing:2px">${c.name.toUpperCase()}</span>
          <span style="font-size:6px;color:${diffColor}">${c.difficulty ?? ''}</span>
        </div>
        <p style="font-size:6px;color:#FF3377;margin:0 0 10px;line-height:1.8">${c.tagline ?? ''}</p>
        <div style="display:flex;gap:12px;font-size:5px;color:#550022">
          <span>${c.floors ?? '?'} FLOORS</span>
          <span>LV ${c.recommendedLevel ?? 1}+</span>
          ${(c.tags ?? []).map(t => `<span style="color:#330022">${t}</span>`).join('')}
        </div>
      `;
      card.addEventListener('click', () => this._selectCard(c.id));
      list.appendChild(card);
    }
  }

  _selectCard(id) {
    this._selected = id;
    const list = this._el.querySelector('#cs-list');
    for (const card of list.children) {
      const isSelected = card.dataset.id === id;
      card.style.borderColor = isSelected ? '#FF0055' : '#330011';
      card.style.background = isSelected ? '#110005' : '#000';
    }
    const btn = this._el.querySelector('#cs-start-btn');
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    log.info('campaign selected', { id });
  }
}
