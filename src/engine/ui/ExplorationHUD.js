/**
 * ExplorationHUD — pixel-art dungeon crawler HUD.
 * Hot-pink / neon-green aesthetic.
 *
 * Panels:
 *  - Party column (left): up to 4 vertical member cards (combat-card style)
 *  - Compass (top-center): W·N·E·S with active direction highlighted
 *  - Quest panel (top-right): location name + objective
 *  - Event log (bottom-left): scrolling message feed with toggle
 *  - Hotbar (bottom-center): 8 numbered action slots with click callbacks
 *  - Minimap: #minimap/#minimap-grid restyled; toggle collapse
 */
import { CharacterPortrait } from './CharacterPortrait.js';
import { ThemeManager }      from '../themes/ThemeManager.js';
import { Dir }               from '../core/Direction.js';

const FALLBACK_SLOTS = [
  { key: '1', label: 'ATK',  sym: '⚔' },
  { key: '2', label: 'DEF',  sym: '🛡' },
  { key: '3', label: 'POT',  sym: '⚗' },
  { key: '4', label: 'JRN',  sym: '📜' },
  { key: '5', label: 'STS',  sym: '✦' },
  { key: '6', label: 'INV',  sym: '⊞' },
  { key: '7', label: 'BES',  sym: '⊠' },
  { key: '8', label: 'MNU',  sym: '≡' },
];

export class ExplorationHUD {
  constructor() {
    this._log           = [];
    this._maxLog        = 5;
    this._direction     = 0;
    this._location      = '';
    this._quest         = '';
    this.elements       = {};
    this._visible       = true;
    this._hotbarClickCb = null;
    this._messageCb     = null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────────────────────────────────────

  initialize() {
    this.elements.partyCol = document.getElementById('hud-party-col');
    this.elements.compass  = document.getElementById('hud-compass');
    this.elements.quest    = document.getElementById('hud-quest');
    this.elements.log      = document.getElementById('hud-log');
    this.elements.hotbar   = document.getElementById('hud-hotbar');

    if (!this.elements.partyCol) {
      console.warn('[ExplorationHUD] DOM not ready — call initialize() after DOM load');
      return false;
    }

    this._setupLog();
    this._setupMinimapToggle();
    this._buildHotbar();
    this._renderCompass();
    this._buildMovementButtons(); // Feature #27
    this.addMessage('El sistema respira...', 'ambient');
    this.addMessage('Prepárate.', 'system');

    ThemeManager.onChange(() => this._buildHotbar());

    return true;
  }

  // Register callback fired on every hotbar slot click: fn(slotIndex)
  onHotbarClick(fn) { this._hotbarClickCb = fn; }

  // Register callback fired on every addMessage call: fn({text, type})
  onMessage(fn) { this._messageCb = fn; }

  // ─────────────────────────────────────────────────────────────────────────────
  // Party column — vertical card style
  // ─────────────────────────────────────────────────────────────────────────────

  updateParty(members) {
    const col = this.elements.partyCol;
    if (!col) return;

    const alive = members.filter(Boolean);

    if (col.children.length === alive.length && alive.length > 0) {
      alive.forEach((m, i) => this._updateMemberCard(col.children[i], m));
      return;
    }

    col.innerHTML = '';
    alive.forEach(m => col.appendChild(this._buildMemberCard(m)));
  }

  _buildMemberCard(member) {
    const slot = document.createElement('div');
    slot.className = 'hud-combatant-slot' + (member.isAlive?.() === false ? ' hud-slot-dead' : '');
    slot.setAttribute('data-member-id', member.id ?? '');

    // Name — top
    const name = document.createElement('div');
    name.className = 'hud-combatant-name';
    name.textContent = (member.name || '???').toUpperCase().slice(0, 12);
    slot.appendChild(name);

    // Portrait row: [HP side-bar] [card] [AP side-bar]
    const row = document.createElement('div');
    row.className = 'hud-portrait-row';

    const hpPct  = member.maxHP > 0 ? Math.max(0, Math.min(100, (member.currentHP / member.maxHP) * 100)) : 0;
    const tc = ThemeManager.current?.canvas;
    const hpColor = hpPct <= 15 ? (tc?.barHpLow ?? '#FF0000')
      : hpPct <= 35 ? (tc?.barHpMid ?? '#FF5500')
      : (tc?.barHp ?? '#FF0055');

    row.appendChild(this._makeSideBar('hud-hp-fill', hpPct, hpColor));

    const card = document.createElement('div');
    card.className = 'hud-portrait-card';
    const avatar = document.createElement('div');
    avatar.className = 'hud-portrait-avatar';
    avatar.appendChild(CharacterPortrait.createCanvas(member.class || 'unknown', 36, 44));
    card.appendChild(avatar);
    row.appendChild(card);

    const ap = member.currentAP ?? 0;
    const maxAP = member.maxAP ?? 3;
    row.appendChild(this._makeSideBar('hud-ap-fill', maxAP > 0 ? (ap / maxAP) * 100 : 0, '#0088FF'));

    slot.appendChild(row);

    // Stat text: HP  AP  LV
    const stats = document.createElement('div');
    stats.className = 'hud-stat-text';

    const hpTxt = document.createElement('span');
    hpTxt.className = 'hud-hp-text';
    hpTxt.textContent = `HP:${member.currentHP}/${member.maxHP}`;
    stats.appendChild(hpTxt);

    const apTxt = document.createElement('span');
    apTxt.className = 'hud-ap-text';
    apTxt.textContent = `AP:${ap}/${maxAP}`;
    stats.appendChild(apTxt);

    const lvTxt = document.createElement('span');
    lvTxt.className = 'hud-lv-text';
    lvTxt.textContent = `LV${String(member.level || 1).padStart(2, '0')}`;
    stats.appendChild(lvTxt);

    slot.appendChild(stats);
    return slot;
  }

  _makeSideBar(fillClass, pct, color) {
    const bar = document.createElement('div');
    bar.className = 'hud-side-bar';
    const fill = document.createElement('div');
    fill.className = `hud-side-fill ${fillClass}`;
    fill.style.height = pct + '%';
    fill.style.background = color;
    bar.appendChild(fill);
    return bar;
  }

  _updateMemberCard(card, member) {
    if (!card) return;
    card.classList.toggle('hud-slot-dead', member.isAlive?.() === false);

    const hpFill = card.querySelector('.hud-hp-fill');
    if (hpFill) {
      const pct = member.maxHP > 0 ? Math.max(0, (member.currentHP / member.maxHP) * 100) : 0;
      hpFill.style.height = pct + '%';
      const tc = ThemeManager.current?.canvas;
      hpFill.style.background = pct <= 15 ? (tc?.barHpLow ?? '#FF0000')
        : pct <= 35 ? (tc?.barHpMid ?? '#FF5500')
        : (tc?.barHp ?? '#FF0055');
    }

    const apFill = card.querySelector('.hud-ap-fill');
    if (apFill) {
      const ap = member.currentAP ?? 0;
      const maxAP = member.maxAP ?? 3;
      apFill.style.height = (maxAP > 0 ? (ap / maxAP) * 100 : 0) + '%';
    }

    const hpTxt = card.querySelector('.hud-hp-text');
    if (hpTxt) hpTxt.textContent = `HP:${member.currentHP}/${member.maxHP}`;

    const apTxt = card.querySelector('.hud-ap-text');
    if (apTxt) apTxt.textContent = `AP:${member.currentAP ?? 0}/${member.maxAP ?? 3}`;

    const lvTxt = card.querySelector('.hud-lv-text');
    if (lvTxt) lvTxt.textContent = `LV${String(member.level || 1).padStart(2, '0')}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Compass
  // ─────────────────────────────────────────────────────────────────────────────

  setCompass(directionIndex) {
    this._direction = directionIndex;
    this._renderCompass();
  }

  _renderCompass() {
    const el = this.elements.compass;
    if (!el) return;

    // Layout: [left] ·-· [ahead(active)] ·-· [right]
    // slot 0=left, 1=ahead, 2=right
    const slots = [0, 1, 2].map(slot => ({
      label: Dir.label(Dir.getRelativeDirection(this._direction, slot)),
      active: slot === 1
    }));

    el.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'hud-compass-row';

    slots.forEach(({ label, active }, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'hud-compass-sep';
        sep.textContent = '·-·';
        row.appendChild(sep);
      }
      const span = document.createElement('span');
      span.className = 'hud-compass-dir' + (active ? ' hud-compass-active' : '');
      span.textContent = label;
      if (active) {
        const tri = document.createElement('span');
        tri.className = 'hud-compass-tri';
        tri.textContent = '^';
        span.prepend(tri);
      }
      row.appendChild(span);
    });

    el.appendChild(row);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Quest / Location panel
  // ─────────────────────────────────────────────────────────────────────────────

  setLocation(name = '', questText = '') {
    this._location = name;
    this._quest    = questText;
    const el = this.elements.quest;
    if (!el) return;

    el.innerHTML = '';

    const locName = document.createElement('div');
    locName.className = 'hud-quest-name';
    locName.textContent = (name || '').toUpperCase();
    el.appendChild(locName);

    if (questText) {
      const qt = document.createElement('div');
      qt.className = 'hud-quest-text';
      qt.textContent = questText;
      el.appendChild(qt);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Event log with header + toggle
  // ─────────────────────────────────────────────────────────────────────────────

  addMessage(text, type = 'system') {
    this._log.push({ text, type, id: Date.now() + Math.random() });
    if (this._log.length > this._maxLog) this._log.shift();
    this._renderLog();
    if (typeof this._messageCb === 'function') this._messageCb({ text, type });
  }

  _setupLog() {
    const el = this.elements.log;
    if (!el) return;

    // Header row (persists across renders)
    const header = document.createElement('div');
    header.className = 'hud-log-header';

    const title = document.createElement('span');
    title.className = 'hud-log-title';
    title.textContent = 'LOG';
    header.appendChild(title);

    const btn = document.createElement('button');
    btn.className = 'hud-toggle-btn';
    btn.textContent = '−';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const collapsed = el.classList.toggle('hud-collapsed');
      btn.textContent = collapsed ? '+' : '−';
    });
    header.appendChild(btn);
    el.appendChild(header);

    // Lines container (target for _renderLog)
    const lines = document.createElement('div');
    lines.className = 'hud-log-lines';
    el.appendChild(lines);
    this.elements.logLines = lines;
  }

  _renderLog() {
    const target = this.elements.logLines ?? this.elements.log;
    if (!target) return;

    target.innerHTML = '';
    this._log.forEach((entry, i) => {
      const line = document.createElement('div');
      line.className = `hud-log-line hud-log-${entry.type}`;
      const age = this._log.length - 1 - i;
      line.style.opacity = Math.max(0.25, 1 - age * 0.18);

      const gt = document.createElement('span');
      gt.className = 'hud-log-gt';
      gt.textContent = '> ';
      line.appendChild(gt);

      const txt = document.createElement('span');
      txt.textContent = entry.text;
      line.appendChild(txt);

      target.appendChild(line);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Minimap toggle
  // ─────────────────────────────────────────────────────────────────────────────

  _setupMinimapToggle() {
    const mm = document.getElementById('minimap');
    if (!mm) return;

    const header = document.createElement('div');
    header.className = 'hud-log-header hud-map-header';

    const title = document.createElement('span');
    title.className = 'hud-log-title';
    title.textContent = 'MAP';
    header.appendChild(title);

    const btn = document.createElement('button');
    btn.className = 'hud-toggle-btn';
    btn.textContent = '−';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const collapsed = mm.classList.toggle('hud-map-collapsed');
      btn.textContent = collapsed ? '+' : '−';
    });
    header.appendChild(btn);

    mm.prepend(header);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Hotbar
  // ─────────────────────────────────────────────────────────────────────────────

  _buildHotbar() {
    const el = this.elements.hotbar;
    if (!el) return;
    el.innerHTML = '';
    const slots = ThemeManager.current?.hotbar ?? FALLBACK_SLOTS;
    slots.forEach((slot, i) => el.appendChild(this._makeSlot(i, slot)));
  }

  _makeSlot(index, { key, label, sym }) {
    const slot = document.createElement('div');
    slot.className = 'hud-hotbar-slot';
    slot.setAttribute('data-slot', index);

    const num = document.createElement('span');
    num.className = 'hud-hotbar-num';
    num.textContent = key;
    slot.appendChild(num);

    const canvas = document.createElement('canvas');
    canvas.width = 34;
    canvas.height = 34;
    canvas.className = 'hud-hotbar-icon';
    const ctx = canvas.getContext('2d');
    const tc  = ThemeManager.current?.canvas;
    ctx.fillStyle = tc?.iconBg ?? '#000';
    ctx.fillRect(0, 0, 34, 34);
    ctx.fillStyle = tc?.iconFg ?? '#FF3377';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sym, 17, 18);
    slot.appendChild(canvas);

    const lbl = document.createElement('span');
    lbl.className = 'hud-hotbar-label';
    lbl.textContent = label;
    slot.appendChild(lbl);

    slot.addEventListener('click', () => {
      if (typeof this._hotbarClickCb === 'function') this._hotbarClickCb(index);
    });

    return slot;
  }

  setHotbarActive(index) {
    if (!this.elements.hotbar) return;
    this.elements.hotbar.querySelectorAll('.hud-hotbar-slot').forEach((s, i) => {
      s.classList.toggle('hud-hotbar-active', i === index);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Visibility
  // ─────────────────────────────────────────────────────────────────────────────

  show() {
    const root = document.getElementById('pixel-hud');
    if (root) root.style.display = '';
    this._visible = true;
  }

  hide() {
    const root = document.getElementById('pixel-hud');
    if (root) root.style.display = 'none';
    this._visible = false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Feature #27: Clickable movement buttons
  // ─────────────────────────────────────────────────────────────────────────────

  _buildMovementButtons() {
    const container = document.getElementById('hud-movement-buttons');
    if (!container) return;
    container.innerHTML = '';

    // 3×3 grid layout: row/col 1-based
    // Row 1: [turnLeft] [forward] [turnRight]
    // Row 2: [strafeLeft] [interact] [strafeRight]
    // Row 3: [—] [backward] [—]
    const defs = [
      { action: 'turnLeft',   label: '↺', row: 1, col: 1, title: 'Turn Left (A)' },
      { action: 'forward',    label: '▲', row: 1, col: 2, title: 'Forward (W)' },
      { action: 'turnRight',  label: '↻', row: 1, col: 3, title: 'Turn Right (D)' },
      { action: 'strafeLeft', label: '◄', row: 2, col: 1, title: 'Strafe Left (Q)' },
      { action: 'interact',   label: '✦', row: 2, col: 2, title: 'Interact (Space)' },
      { action: 'strafeRight',label: '►', row: 2, col: 3, title: 'Strafe Right (E)' },
      { action: 'backward',   label: '▼', row: 3, col: 2, title: 'Backward (S)' },
    ];

    container.style.cssText = [
      'position:fixed', 'bottom:8px', 'right:8px',
      'display:grid', 'grid-template-columns:repeat(3,36px)',
      'grid-template-rows:repeat(3,36px)', 'gap:2px', 'z-index:200',
    ].join(';');

    for (const d of defs) {
      const btn = document.createElement('button');
      btn.textContent = d.label;
      btn.title       = d.title;
      btn.setAttribute('data-action', d.action);
      btn.style.cssText = [
        `grid-row:${d.row}`, `grid-column:${d.col}`,
        'background:rgba(0,0,0,0.7)', 'border:1px solid #FF0055',
        'color:#FF3377', 'font-size:14px', 'cursor:pointer',
        'display:flex', 'align-items:center', 'justify-content:center',
        'border-radius:2px', 'touch-action:manipulation',
      ].join(';');
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('hudMovementButton', {
          detail: { action: d.action }
        }));
      });
      container.appendChild(btn);
    }
  }
}
