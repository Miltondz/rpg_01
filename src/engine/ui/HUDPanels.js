/**
 * HUDPanels — overlay panels for Journal (BG/Morrowind style) and
 * Bestiary (Morrowind/X-COM style). Wired to hotbar slots 4 (JRN) and 7 (BES).
 */

const CATEGORIES = ['ALL', 'EVENTS', 'COMBAT', 'LOCATIONS', 'ITEMS'];

const LOG_CATEGORY = {
  system:  'EVENTS',
  danger:  'COMBAT',
  loot:    'ITEMS',
  ambient: 'LOCATIONS',
};

const TIER_ORDER = { 1: 0, 2: 1, 3: 2, boss: 3, normal: 0, elite: 1, miniboss: 2 };

export class HUDPanels {
  constructor() {
    this._panels      = {};
    this._fullLog     = [];           // { text, type, cat, ts }
    this._bestiary    = new Map();    // key → full enemy data
    this._journalCat  = 'ALL';
    this._selectedBeast = null;
  }

  initialize() {
    this._injectStyles();
    this._createJournalPanel();
    this._createBestiaryPanel();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') this.closeAll();
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  toggle(id) {
    const panel = this._panels[id];
    if (!panel) return;
    const wasHidden = panel.classList.contains('hidden');
    this.closeAll();
    if (wasHidden) {
      this._refresh(id);
      panel.classList.remove('hidden');
    }
  }

  closeAll() {
    Object.values(this._panels).forEach(p => p.classList.add('hidden'));
  }

  isAnyOpen() {
    return Object.values(this._panels).some(p => !p.classList.contains('hidden'));
  }

  appendLog(entry) {
    const cat = LOG_CATEGORY[entry.type] ?? 'EVENTS';
    this._fullLog.push({ ...entry, cat, ts: Date.now() });
    if (this._fullLog.length > 300) this._fullLog.shift();
  }

  registerEncounter(enemy) {
    if (!enemy) return;
    const key = enemy.type ?? enemy.id ?? enemy.name;
    if (!key) return;
    if (this._bestiary.has(key)) {
      // increment encounter count
      this._bestiary.get(key).encounters++;
      return;
    }
    this._bestiary.set(key, {
      name:        enemy.name          ?? key,
      type:        enemy.type          ?? key,
      tier:        enemy.tier          ?? 'normal',
      level:       enemy.level         ?? enemy.baseStats?.SPD ?? '?',
      element:     enemy.baseStats?.element    ?? '—',
      hp:          enemy.baseStats?.HP         ?? '?',
      atk:         enemy.baseStats?.ATK        ?? '?',
      def:         enemy.baseStats?.DEF        ?? '?',
      spd:         enemy.baseStats?.SPD        ?? '?',
      resistances: enemy.resistances            ?? {},
      loot:        enemy.lootTable?.drops?.map(d => d.itemId).join(', ') ?? '—',
      description: enemy.description            ?? 'A creature of the darkness.',
      aiType:      enemy.aiType                 ?? '—',
      skills:      (enemy.skills ?? []).map(s => typeof s === 'string' ? s : s.id).join(', ') || '—',
      encountered: new Date().toLocaleDateString(),
      encounters:  1,
    });
  }

  // ── Construction ─────────────────────────────────────────────────────────────

  _createJournalPanel() {
    const panel = document.createElement('div');
    panel.id = 'hud-journal-panel';
    panel.className = 'hudp-panel hidden';

    panel.innerHTML = `
      <div class="hudp-header">
        <span class="hudp-icon">📜</span>
        <span class="hudp-title">JOURNAL</span>
        <div class="hudp-cat-tabs" id="jrn-cat-tabs">
          ${CATEGORIES.map(c => `<button class="hudp-cat-btn${c === 'ALL' ? ' hudp-cat-active' : ''}" data-cat="${c}">${c}</button>`).join('')}
        </div>
        <button class="hudp-close" id="jrn-close">[X]</button>
      </div>
      <div class="hudp-content" id="hud-journal-content"></div>
    `;

    document.body.appendChild(panel);
    this._panels['journal'] = panel;

    panel.querySelector('#jrn-close').addEventListener('click', () => this.closeAll());
    panel.querySelectorAll('.hudp-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._journalCat = btn.dataset.cat;
        panel.querySelectorAll('.hudp-cat-btn').forEach(b => b.classList.remove('hudp-cat-active'));
        btn.classList.add('hudp-cat-active');
        this._refreshJournal();
      });
    });
  }

  _createBestiaryPanel() {
    const panel = document.createElement('div');
    panel.id = 'hud-bestiary-panel';
    panel.className = 'hudp-panel hudp-panel-wide hidden';

    panel.innerHTML = `
      <div class="hudp-header">
        <span class="hudp-icon">☠</span>
        <span class="hudp-title">BESTIARY</span>
        <span class="hudp-subtitle" id="bes-count">0 creatures</span>
        <button class="hudp-close" id="bes-close">[X]</button>
      </div>
      <div class="hudp-bestiary-body">
        <div class="hudp-beast-list" id="bes-list">
          <div class="hudp-overlay-empty">No creatures encountered.</div>
        </div>
        <div class="hudp-beast-detail" id="bes-detail">
          <div class="hudp-overlay-empty">Select a creature<br>to view research data.</div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this._panels['bestiary'] = panel;
    panel.querySelector('#bes-close').addEventListener('click', () => this.closeAll());
  }

  // ── Refresh ──────────────────────────────────────────────────────────────────

  _refresh(id) {
    if (id === 'journal')  this._refreshJournal();
    if (id === 'bestiary') this._refreshBestiary();
  }

  _refreshJournal() {
    const el = document.getElementById('hud-journal-content');
    if (!el) return;
    el.innerHTML = '';

    const cat = this._journalCat;
    let entries = [...this._fullLog].reverse();
    if (cat !== 'ALL') entries = entries.filter(e => e.cat === cat);

    if (entries.length === 0) {
      el.innerHTML = `<div class="hudp-overlay-empty">No entries in this category.</div>`;
      return;
    }

    let lastDate = null;
    entries.forEach(entry => {
      const d = new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(entry.ts).toLocaleDateString();
      if (dateStr !== lastDate) {
        lastDate = dateStr;
        const sep = document.createElement('div');
        sep.className = 'hudp-date-sep';
        sep.textContent = `── ${dateStr} ──`;
        el.appendChild(sep);
      }
      const line = document.createElement('div');
      line.className = `hudp-log-line hudp-log-${entry.type ?? 'system'}`;
      line.innerHTML = `<span class="hudp-log-time">${d}</span><span class="hudp-log-gt">&gt;</span><span class="hudp-log-text">${entry.text}</span>`;
      el.appendChild(line);
    });
  }

  _refreshBestiary() {
    const list   = document.getElementById('bes-list');
    const detail = document.getElementById('bes-detail');
    const count  = document.getElementById('bes-count');
    if (!list || !detail) return;

    const n = this._bestiary.size;
    if (count) count.textContent = `${n} creature${n !== 1 ? 's' : ''} researched`;

    list.innerHTML = '';

    if (n === 0) {
      list.innerHTML = `<div class="hudp-overlay-empty">No creatures encountered.</div>`;
      detail.innerHTML = `<div class="hudp-overlay-empty">Select a creature<br>to view research data.</div>`;
      return;
    }

    // Sort by tier
    const sorted = [...this._bestiary.entries()].sort((a, b) => {
      const ta = TIER_ORDER[a[1].tier] ?? 0;
      const tb = TIER_ORDER[b[1].tier] ?? 0;
      return ta - tb || a[1].name.localeCompare(b[1].name);
    });

    sorted.forEach(([key, entry]) => {
      const row = document.createElement('div');
      row.className = 'hudp-beast-row';
      if (key === this._selectedBeast) row.classList.add('hudp-beast-active');

      const tierBadge = this._tierBadge(entry.tier);
      row.innerHTML = `
        <div class="hudp-beast-name">${entry.name.toUpperCase()}</div>
        <div class="hudp-beast-meta">${tierBadge} · ${entry.element} · ×${entry.encounters}</div>
      `;
      row.addEventListener('click', () => {
        this._selectedBeast = key;
        list.querySelectorAll('.hudp-beast-row').forEach(r => r.classList.remove('hudp-beast-active'));
        row.classList.add('hudp-beast-active');
        this._showBeastDetail(detail, entry);
      });
      list.appendChild(row);
    });

    // Auto-select first if none selected
    if (!this._selectedBeast && sorted.length > 0) {
      const [key, entry] = sorted[0];
      this._selectedBeast = key;
      list.querySelector('.hudp-beast-row')?.classList.add('hudp-beast-active');
      this._showBeastDetail(detail, entry);
    } else if (this._selectedBeast && this._bestiary.has(this._selectedBeast)) {
      this._showBeastDetail(detail, this._bestiary.get(this._selectedBeast));
    }
  }

  _showBeastDetail(el, entry) {
    const tierBadge = this._tierBadge(entry.tier);
    const res = Object.entries(entry.resistances ?? {})
      .map(([k, v]) => `<span class="hudp-res-tag ${v > 0 ? 'hudp-res-weak' : 'hudp-res-immune'}">${k.toUpperCase()} ${v > 0 ? `×${v}` : 'IMM'}</span>`)
      .join('') || '—';

    el.innerHTML = `
      <div class="hudp-bd-name">${entry.name.toUpperCase()}</div>
      <div class="hudp-bd-meta">${tierBadge} · ELEMENT: ${entry.element.toUpperCase()}</div>
      <div class="hudp-bd-desc">${entry.description}</div>

      <div class="hudp-bd-section">COMBAT STATS</div>
      <div class="hudp-bd-stats">
        <div class="hudp-bd-stat"><span>HP</span><span>${entry.hp}</span></div>
        <div class="hudp-bd-stat"><span>ATK</span><span>${entry.atk}</span></div>
        <div class="hudp-bd-stat"><span>DEF</span><span>${entry.def}</span></div>
        <div class="hudp-bd-stat"><span>SPD</span><span>${entry.spd}</span></div>
        <div class="hudp-bd-stat"><span>AI</span><span>${entry.aiType.toUpperCase()}</span></div>
      </div>

      <div class="hudp-bd-section">RESISTANCES</div>
      <div class="hudp-bd-res">${res}</div>

      <div class="hudp-bd-section">ABILITIES</div>
      <div class="hudp-bd-skills">${entry.skills}</div>

      <div class="hudp-bd-section">LOOT</div>
      <div class="hudp-bd-loot">${entry.loot}</div>

      <div class="hudp-bd-footer">
        First encountered: ${entry.encountered} · Encounters: ${entry.encounters}
      </div>
    `;
  }

  _tierBadge(tier) {
    const MAP = { 1: 'TIER I', 2: 'TIER II', 3: 'TIER III', boss: 'BOSS', normal: 'NORMAL', elite: 'ELITE', miniboss: 'MINIBOSS' };
    const cls = tier === 'boss' || tier === 3 ? 'hudp-tier-boss' : 'hudp-tier-normal';
    return `<span class="hudp-tier-badge ${cls}">${MAP[tier] ?? String(tier).toUpperCase()}</span>`;
  }

  // ── Styles ────────────────────────────────────────────────────────────────────

  _injectStyles() {
    if (document.getElementById('hudp-styles')) return;
    const s = document.createElement('style');
    s.id = 'hudp-styles';
    s.textContent = `
      /* ── HUDPanels — Journal & Bestiary ── */
      .hudp-panel {
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: min(96vw, 600px);
        max-height: 88vh;
        background: rgba(0,0,0,0.95);
        border: 1px solid var(--hud-pink, #FF0055);
        z-index: 300;
        font-family: var(--hud-font, 'Press Start 2P', monospace);
        display: flex; flex-direction: column;
        box-shadow: 0 0 30px rgba(255,0,85,0.2);
      }
      .hudp-panel-wide { width: min(96vw, 800px); }
      /* Header */
      .hudp-header {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 14px;
        border-bottom: 1px solid var(--hud-dim, #550022);
        flex-shrink: 0;
        flex-wrap: wrap;
      }
      .hudp-icon { font-size: 16px; }
      .hudp-title { font-size: 8px; color: var(--hud-pink, #FF0055); letter-spacing: 3px; }
      .hudp-subtitle { font-size: 6px; color: var(--hud-dim, #550022); margin-left: 4px; }
      .hudp-close {
        margin-left: auto; font-size: 7px; color: var(--hud-pink, #FF0055);
        background: none; border: 1px solid var(--hud-dim, #550022);
        font-family: inherit; cursor: pointer; padding: 3px 6px;
      }
      .hudp-close:hover { color: #00FF44; border-color: #00FF44; }
      /* Category tabs */
      .hudp-cat-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
      .hudp-cat-btn {
        font-family: inherit; font-size: 6px; letter-spacing: 1px;
        background: none; border: 1px solid var(--hud-dim, #550022);
        color: var(--hud-dim, #550022); padding: 3px 8px; cursor: pointer;
        transition: all 0.1s;
      }
      .hudp-cat-btn:hover { border-color: var(--hud-text, #FF3377); color: var(--hud-text, #FF3377); }
      .hudp-cat-active { border-color: var(--hud-pink, #FF0055) !important; color: var(--hud-pink, #FF0055) !important; }
      /* Journal content */
      .hudp-content { flex: 1; overflow-y: auto; padding: 10px 14px; display: flex; flex-direction: column; gap: 2px; }
      .hudp-content::-webkit-scrollbar { width: 3px; }
      .hudp-content::-webkit-scrollbar-thumb { background: var(--hud-dim, #550022); }
      .hudp-date-sep { font-size: 6px; color: var(--hud-dim, #550022); text-align: center; letter-spacing: 2px; margin: 6px 0 3px; }
      .hudp-log-line { display: flex; gap: 6px; font-size: 6px; line-height: 1.9; align-items: flex-start; }
      .hudp-log-time { color: var(--hud-dim, #550022); flex-shrink: 0; font-size: 6px; }
      .hudp-log-gt { color: var(--hud-pink, #FF0055); flex-shrink: 0; }
      .hudp-log-text { color: var(--hud-text, #FF3377); }
      .hudp-log-danger .hudp-log-text { color: #FF0055; }
      .hudp-log-loot .hudp-log-text { color: #00FF44; }
      .hudp-log-ambient .hudp-log-text { color: var(--hud-dim, #550022); }
      /* Bestiary body */
      .hudp-bestiary-body { display: grid; grid-template-columns: 200px 1fr; flex: 1; overflow: hidden; min-height: 0; }
      .hudp-beast-list { overflow-y: auto; border-right: 1px solid var(--hud-dim, #550022); padding: 8px; display: flex; flex-direction: column; gap: 4px; }
      .hudp-beast-list::-webkit-scrollbar { width: 3px; }
      .hudp-beast-list::-webkit-scrollbar-thumb { background: var(--hud-dim, #550022); }
      .hudp-beast-row { border: 1px solid var(--hud-dim, #550022); padding: 7px 10px; cursor: pointer; transition: border-color 0.1s; }
      .hudp-beast-row:hover { border-color: var(--hud-text, #FF3377); }
      .hudp-beast-active { border-color: var(--hud-pink, #FF0055) !important; background: rgba(255,0,85,0.04); }
      .hudp-beast-name { font-size: 7px; color: var(--hud-text, #FF3377); margin-bottom: 3px; }
      .hudp-beast-meta { font-size: 6px; color: var(--hud-dim, #550022); }
      /* Bestiary detail */
      .hudp-beast-detail { overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
      .hudp-beast-detail::-webkit-scrollbar { width: 3px; }
      .hudp-beast-detail::-webkit-scrollbar-thumb { background: var(--hud-dim, #550022); }
      .hudp-bd-name { font-size: 9px; color: var(--hud-pink, #FF0055); letter-spacing: 2px; }
      .hudp-bd-meta { font-size: 7px; color: var(--hud-dim, #550022); }
      .hudp-bd-desc { font-size: 7px; color: var(--hud-text, #FF3377); line-height: 1.9; border-top: 1px solid var(--hud-dim, #550022); padding-top: 6px; }
      .hudp-bd-section { font-size: 6px; color: var(--hud-dim, #550022); letter-spacing: 2px; border-bottom: 1px solid var(--hud-dim, #550022); padding-bottom: 3px; margin-top: 4px; }
      .hudp-bd-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
      .hudp-bd-stat { font-size: 7px; display: flex; justify-content: space-between; color: var(--hud-text, #FF3377); }
      .hudp-bd-stat span:last-child { color: var(--hud-pink, #FF0055); }
      .hudp-bd-res { display: flex; gap: 6px; flex-wrap: wrap; font-size: 6px; }
      .hudp-res-tag { padding: 2px 6px; border: 1px solid; }
      .hudp-res-weak { color: #FF6600; border-color: #662200; }
      .hudp-res-immune { color: #00FF44; border-color: #004422; }
      .hudp-bd-skills, .hudp-bd-loot { font-size: 7px; color: var(--hud-text, #FF3377); line-height: 1.8; }
      .hudp-bd-footer { font-size: 6px; color: var(--hud-dim, #550022); border-top: 1px solid var(--hud-dim, #550022); padding-top: 6px; margin-top: auto; }
      /* Tier badges */
      .hudp-tier-badge { font-size: 6px; padding: 2px 5px; border: 1px solid; }
      .hudp-tier-normal { color: var(--hud-dim, #550022); border-color: var(--hud-dim, #550022); }
      .hudp-tier-boss { color: #FF0055; border-color: #FF0055; }
      /* Empty state */
      .hudp-overlay-empty { font-size: 7px; color: var(--hud-dim, #550022); text-align: center; padding: 30px 20px; line-height: 2; letter-spacing: 1px; }
      /* Legacy compat */
      .hud-overlay-panel { display: none !important; }
    `;
    document.head.appendChild(s);
  }
}
