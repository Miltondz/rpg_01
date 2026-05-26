/**
 * Combat UI System for Dungeon Crawler Game
 * Handles combat interface, HP/AP displays, action menus, and turn indicators
 */
import { CharacterPortrait } from './CharacterPortrait.js';
import { CardPhysics } from './CardPhysics.js';

export class CombatUI {
  constructor() {
    // UI Elements
    this.elements = {
      combatContainer: null,
      partyHUD: null,
      enemyHUD: null,
      actionMenu: null,
      turnIndicator: null,
      combatLog: null
    };
    
    // Combat state
    this.isActive = false;
    this.currentCharacter = null;
    this.availableActions = [];
    
    // Event handlers
    this.actionHandlers = new Map();

    // Spring physics instances for action cards
    this._cardPhysics = [];

    this.isInitialized = false;
  }

  /**
   * Initialize the combat UI system
   */
  initialize() {
    try {
      this.createCombatContainer();
      this.createTurnBanner();
      this.createBattleArena();
      this.createBottomPanel();
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('CombatUI initialized successfully');

      return true;
    } catch (error) {
      console.error('Failed to initialize CombatUI:', error);
      return false;
    }
  }

  /**
   * Create main combat container
   */
  createCombatContainer() {
    // Separate backdrop div — must live inside #game-container so position:absolute clips correctly
    let backdrop = document.getElementById('combat-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'combat-backdrop';
      const gameContainer = document.getElementById('game-container') ?? document.body;
      gameContainer.appendChild(backdrop);
    }
    backdrop.className = 'combat-backdrop hidden';
    this.elements.backdrop = backdrop;

    // Reuse the element declared in index.html to avoid duplicate IDs
    let el = document.getElementById('combat-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'combat-container';
      document.body.appendChild(el);
    }
    el.removeAttribute('style');
    el.className = 'combat-container hidden';
    el.setAttribute('data-ui-component', 'combat-container');
    el.setAttribute('data-ui-name', 'main-combat-interface');
    el.innerHTML = '';
    this.elements.combatContainer = el;
  }

  createTurnBanner() {
    const banner = document.createElement('div');
    banner.className = 'combat-turn-banner';
    banner.setAttribute('data-ui-component', 'turn-indicator');
    banner.setAttribute('data-ui-name', 'current-turn-display');

    const left = document.createElement('span');
    left.className = 'turn-label';
    left.textContent = 'Turn 1';

    const mid = document.createElement('span');
    mid.className = 'turn-char';
    mid.textContent = 'Waiting...';

    const right = document.createElement('span');
    right.className = 'turn-ap';
    right.textContent = '';

    banner.appendChild(left);
    banner.appendChild(mid);
    banner.appendChild(right);
    this.elements.combatContainer.appendChild(banner);
    this.elements.turnIndicator = banner;
  }

  createBattleArena() {
    const arena = document.createElement('div');
    arena.className = 'combat-arena';

    // Party side — LEFT (back col on left, front col on right toward enemies)
    const partySide = document.createElement('div');
    partySide.className = 'combat-side party-side';

    const partyLabel = document.createElement('div');
    partyLabel.className = 'side-label';
    partyLabel.textContent = 'Your Party';
    partySide.appendChild(partyLabel);

    // Formation column labels: Back | Front
    const formationHeader = document.createElement('div');
    formationHeader.className = 'formation-header';
    const backLabel = document.createElement('div');
    backLabel.className = 'formation-col-label';
    backLabel.textContent = '← Back';
    const frontLabel = document.createElement('div');
    frontLabel.className = 'formation-col-label front-label';
    frontLabel.textContent = 'Front →';
    formationHeader.appendChild(backLabel);
    formationHeader.appendChild(frontLabel);
    partySide.appendChild(formationHeader);

    this.elements.partyHUD = document.createElement('div');
    this.elements.partyHUD.className = 'party-formation';
    this.elements.partyHUD.setAttribute('data-ui-component', 'party-grid');
    this.elements.partyHUD.setAttribute('data-ui-name', 'party-combatants');
    partySide.appendChild(this.elements.partyHUD);

    // VS divider — CENTER
    const vsDivider = document.createElement('div');
    vsDivider.className = 'combat-vs-divider';
    const vsTop = document.createElement('span');
    vsTop.className = 'vs-icon';
    vsTop.textContent = '⚔';
    const vsText = document.createElement('span');
    vsText.className = 'vs-text';
    vsText.textContent = 'VS';
    const vsBot = document.createElement('span');
    vsBot.className = 'vs-icon vs-icon-bottom';
    vsBot.textContent = '⚔';
    vsDivider.appendChild(vsTop);
    vsDivider.appendChild(vsText);
    vsDivider.appendChild(vsBot);

    // Enemy side — RIGHT
    const enemySide = document.createElement('div');
    enemySide.className = 'combat-side enemies-side';

    const enemyLabel = document.createElement('div');
    enemyLabel.className = 'side-label';
    enemyLabel.textContent = 'Enemies';
    enemySide.appendChild(enemyLabel);

    this.elements.enemyHUD = document.createElement('div');
    this.elements.enemyHUD.className = 'enemy-column';
    this.elements.enemyHUD.setAttribute('data-ui-component', 'enemy-grid');
    this.elements.enemyHUD.setAttribute('data-ui-name', 'enemy-combatants');
    enemySide.appendChild(this.elements.enemyHUD);

    arena.appendChild(partySide);
    arena.appendChild(vsDivider);
    arena.appendChild(enemySide);
    this.elements.combatContainer.appendChild(arena);
  }

  createBottomPanel() {
    const bottom = document.createElement('div');
    bottom.className = 'combat-bottom';

    const actionsPanel = document.createElement('div');
    actionsPanel.className = 'combat-actions-panel';

    const actionsLabel = document.createElement('div');
    actionsLabel.className = 'panel-label';
    actionsLabel.textContent = 'Actions';
    actionsPanel.appendChild(actionsLabel);

    this.elements.actionMenu = document.createElement('div');
    this.elements.actionMenu.className = 'action-menu';
    this.elements.actionMenu.setAttribute('data-ui-component', 'action-buttons');
    this.elements.actionMenu.setAttribute('data-ui-name', 'available-actions');
    this.createDefaultActionButtons();
    actionsPanel.appendChild(this.elements.actionMenu);

    const logPanel = document.createElement('div');
    logPanel.className = 'combat-log-panel';

    const logLabel = document.createElement('div');
    logLabel.className = 'panel-label';
    logLabel.textContent = 'Combat Log';
    logPanel.appendChild(logLabel);

    this.elements.combatLog = document.createElement('div');
    this.elements.combatLog.className = 'combat-log-content';
    this.elements.combatLog.setAttribute('data-ui-component', 'log-content');
    this.elements.combatLog.setAttribute('data-ui-name', 'combat-messages');
    logPanel.appendChild(this.elements.combatLog);

    bottom.appendChild(actionsPanel);
    bottom.appendChild(logPanel);
    this.elements.combatContainer.appendChild(bottom);
  }

  _actionIcon(id) {
    const o = (inner) =>
      `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
    const f = (inner) =>
      `<svg width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" stroke="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

    const icons = {
      // Sword: diagonal blade + perpendicular crossguard + pommel
      attack:       o('<line x1="2" y1="14" x2="12" y2="4"/><line x1="4" y1="12" x2="8" y2="8"/><circle cx="2.5" cy="13.5" r="1.2" fill="currentColor" stroke="none"/>'),
      basic_attack: o('<line x1="2" y1="14" x2="12" y2="4"/><line x1="4" y1="12" x2="8" y2="8"/><circle cx="2.5" cy="13.5" r="1.2" fill="currentColor" stroke="none"/>'),
      // 4-pointed star
      skill:        f('<path d="M8 1L9.4 6.3 14.5 8 9.4 9.7 8 15 6.6 9.7 1.5 8 6.6 6.3Z"/>'),
      // Potion flask: narrow neck → wide body
      item:         o('<path d="M6 1.5h4v3.5l2.5 4.5v5h-9v-5L6 5V1.5z"/><line x1="5.5" y1="1.5" x2="10.5" y2="1.5"/>'),
      use_item:     o('<path d="M6 1.5h4v3.5l2.5 4.5v5h-9v-5L6 5V1.5z"/><line x1="5.5" y1="1.5" x2="10.5" y2="1.5"/>'),
      // Classic shield
      defend:       f('<path d="M8 1.5L14 4.5V10Q13.5 15.5 8 15.5Q2.5 15.5 2 10V4.5Z"/>'),
      // Double chevron right
      flee:         o('<polyline points="2,4 7,8 2,12"/><polyline points="7,4 12,8 7,12"/>'),
      // Two right-pointing triangles (end-turn / skip)
      skip:         f('<path d="M2 3L7.5 8 2 13ZM7.5 3L13 8 7.5 13Z"/>'),
    };

    if (!icons[id]) {
      if (id?.startsWith('use_item')) return icons.item;
      return icons.skill;
    }
    return icons[id];
  }

  createDefaultActionButtons() {
    const defaultActions = [
      { id: 'attack', name: 'Attack', apCost: 1 },
      { id: 'skill',  name: 'Skill',  apCost: 2 },
      { id: 'item',   name: 'Item',   apCost: 1 },
      { id: 'defend', name: 'Defend', apCost: 1 },
      { id: 'flee',   name: 'Flee',   apCost: 0 }
    ];

    defaultActions.forEach(action => {
      const button = document.createElement('button');
      button.className = 'action-btn';
      button.setAttribute('data-action-id', action.id);
      button.innerHTML = `<span class="action-icon">${this._actionIcon(action.id)}</span><span class="action-name">${action.name}</span><span class="action-cost">${action.apCost} AP</span>`;
      this.elements.actionMenu.appendChild(button);
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // combatEvent is handled exclusively by CombatUIManager — no listener here (prevents double-handling)

    // Action button clicks — use closest() so clicks on inner text divs are captured too
    this.elements.actionMenu.addEventListener('click', (event) => {
      const btn = event.target.closest('.action-btn');
      if (!btn || btn.disabled) return;
      const actionId = btn.getAttribute('data-action-id');
      this.handleActionClick(actionId);
    });
  }

  /**
   * Show combat interface
   * @param {Object} combatData - Initial combat data
   */
  showCombat(combatData) {
    if (!this.isInitialized) {
      console.error('CombatUI not initialized');
      return;
    }

    this.isActive = true;
    // Reset inline styles, then lock opacity to 0 BEFORE removing hidden.
    // playCombatStartAnimation() fires on the same combatStarted event and handles the fade-in.
    this.elements.combatContainer.style.cssText = '';
    this.elements.combatContainer.style.opacity = '0';
    this.elements.backdrop?.classList.remove('hidden');
    this.elements.combatContainer.classList.remove('hidden');

    // Clear action menu so stale buttons from previous combat don't show
    if (this.elements.actionMenu) this.elements.actionMenu.innerHTML = '';

    // Clear previous log
    this.clearCombatLog();
    
    // Update initial display
    // getPartySummary() returns {members:[...]} — normalise to array
    const partyMembers = Array.isArray(combatData.playerParty)
      ? combatData.playerParty
      : (combatData.playerParty?.members ?? []);
    this.updatePartyDisplay(partyMembers);
    this.updateEnemyDisplay(combatData.enemies ?? []);
    // turnOrder is an array from getTurnOrderSummary(); build the shape updateTurnDisplay expects
    const turnOrderArr = combatData.turnOrder ?? [];
    const firstActive = Array.isArray(turnOrderArr)
      ? (turnOrderArr.find(t => t.isCurrentTurn) ?? turnOrderArr[0] ?? null)
      : turnOrderArr.currentCharacter ?? null;
    this.updateTurnDisplay({ turnNumber: 1, currentCharacter: firstActive });
    
    // Initial log message will be added by CombatUIManager after this call
  }

  /**
   * Hide combat interface
   */
  hideCombat() {
    this.isActive = false;
    const container = this.elements.combatContainer;

    const _doHide = () => {
      container.style.cssText = '';
      container.classList.add('hidden');
      this.elements.backdrop?.classList.add('hidden');
      this.clearCombatLog();
      if (this.elements.actionMenu) this.elements.actionMenu.innerHTML = '';
    };

    // If playCombatEndAnimation already faded to 0, hide immediately.
    // Otherwise do a quick fade-out first.
    const currentOpacity = parseFloat(container.style.opacity ?? '1');
    if (currentOpacity < 0.05) {
      _doHide();
    } else {
      container.style.transition = 'opacity 0.3s ease-in';
      container.style.opacity = '0';
      setTimeout(_doHide, 310);
    }
  }

  /**
   * Update party display with HP/AP bars
   * @param {Array} partyMembers - Party member data
   */
  updatePartyDisplay(partyMembers) {
    this.elements.partyHUD.innerHTML = '';

    // Grid is 2 cols × 2 rows: left col = Back row, right col = Front row (faces enemies).
    // party[0..1] = front row, party[2..3] = back row.
    // Always emit all 4 cells — empty placeholders keep front-row locked to RIGHT column.
    const front = partyMembers.slice(0, 2);
    const back  = partyMembers.slice(2, 4);
    for (let i = 0; i < 2; i++) {
      // Left col (back)
      const backCell = document.createElement('div');
      backCell.className = 'formation-cell';
      if (back[i]) backCell.appendChild(this.createCombatantCard(back[i], 'party', i + 2));
      this.elements.partyHUD.appendChild(backCell);
      // Right col (front — toward enemies)
      const frontCell = document.createElement('div');
      frontCell.className = 'formation-cell front-cell';
      if (front[i]) {
        const slot = this.createCombatantCard(front[i], 'party', i);
        const innerCard = slot.querySelector('.combatant-card');
        if (innerCard) innerCard.classList.add('front-row-card');
        frontCell.appendChild(slot);
      }
      this.elements.partyHUD.appendChild(frontCell);
    }
  }

  /**
   * Update enemy display with HP/AP bars
   * @param {Array} enemies - Enemy data
   */
  updateEnemyDisplay(enemies) {
    this.elements.enemyHUD.innerHTML = '';
    
    enemies.forEach((enemy, index) => {
      const enemyCard = this.createCombatantCard(enemy, 'enemy', index);
      this.elements.enemyHUD.appendChild(enemyCard);
    });
  }

  /**
   * Create combatant card with HP/AP bars
   * @param {Object} combatant - Combatant data
   * @param {string} type - 'party' or 'enemy'
   * @param {number} index - Position index
   * @returns {HTMLElement} Combatant card element
   */
  _hpColor(pct) {
    if (pct <= 0)  return '#333333';
    if (pct <= 15) return '#ff0000';
    if (pct <= 35) return '#ff4400';
    if (pct <= 50) return '#ff8800';
    if (pct <= 75) return '#ffaa00';
    if (pct <= 90) return '#ccff00';
    return '#00ff00';
  }

  _apColor(pct) {
    if (pct <= 0)  return '#444444';
    if (pct <= 25) return '#ff6600';
    if (pct <= 50) return '#ffaa00';
    if (pct <= 75) return '#00aaff';
    return '#0088ff';
  }

  createCombatantCard(combatant, type, index) {
    const isEnemy = type === 'enemy';
    const hpPct   = Math.max(0, (combatant.currentHP / combatant.maxHP) * 100);
    const maxAP   = combatant.maxAP || 3;
    const curAP   = Math.max(0, combatant.currentAP || 0);
    const apPct   = (curAP / maxAP) * 100;

    // ── Slot wrapper (carries data-combatant-id for targeting) ──
    const slot = document.createElement('div');
    slot.className = `combatant-slot ${isEnemy ? 'enemy-slot' : 'party-slot'}`;
    slot.setAttribute('data-ui-component', 'combatant-card');
    slot.setAttribute('data-ui-name', `${type}-${combatant.id || index}`);
    slot.setAttribute('data-combatant-id', combatant.id || `${type}-${index}`);
    if (combatant.currentHP <= 0) slot.classList.add('dead');

    // ── Name (above portrait) ──
    const nameDiv = document.createElement('div');
    nameDiv.className = 'combatant-name';
    nameDiv.textContent = `${combatant.name} (Lv.${combatant.level || 1})`;
    slot.appendChild(nameDiv);

    // ── Portrait row: [HP bar] | [card] | [AP bar] ──
    const portraitRow = document.createElement('div');
    portraitRow.className = 'combatant-portrait-row';

    // HP vertical bar — left side
    const hpBar = document.createElement('div');
    hpBar.className = 'stat-side-bar hp-side-bar';
    hpBar.setAttribute('data-ui-component', 'hp-bar');
    hpBar.setAttribute('data-ui-name', `${type}-${combatant.id || index}-hp`);
    const hpFill = document.createElement('div');
    hpFill.className = 'stat-side-fill hp-side-fill';
    hpFill.style.height = `${hpPct}%`;
    hpFill.style.background = this._hpColor(hpPct);
    if (hpPct <= 15 && hpPct > 0) hpFill.style.boxShadow = '0 0 6px rgba(255,0,0,0.7)';
    hpBar.appendChild(hpFill);
    portraitRow.appendChild(hpBar);

    // Portrait card (portrait only — no bars inside)
    const card = document.createElement('div');
    card.className = `combatant-card ${isEnemy ? 'enemy-card' : 'party-card'}`;
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'combatant-avatar';
    const portraitKey = isEnemy ? (combatant.type || 'unknown') : (combatant.class || 'unknown');
    avatarDiv.appendChild(CharacterPortrait.createCanvas(portraitKey, 96, 128));
    card.appendChild(avatarDiv);
    portraitRow.appendChild(card);

    // AP vertical bar — right side
    const apBar = document.createElement('div');
    apBar.className = 'stat-side-bar ap-side-bar';
    apBar.setAttribute('data-ui-component', 'ap-bar');
    apBar.setAttribute('data-ui-name', `${type}-${combatant.id || index}-ap`);
    const apFill = document.createElement('div');
    apFill.className = 'stat-side-fill ap-side-fill';
    apFill.style.height = `${apPct}%`;
    apFill.style.background = this._apColor(apPct);
    if (apPct >= 75) apFill.style.boxShadow = '0 0 5px rgba(0,136,255,0.5)';
    apBar.appendChild(apFill);
    portraitRow.appendChild(apBar);

    slot.appendChild(portraitRow);

    // ── Stat numbers (below portrait, outside card) ──
    const statText = document.createElement('div');
    statText.className = 'combatant-stat-text';
    statText.innerHTML =
      `<span class="hp-text">${combatant.currentHP}/${combatant.maxHP}</span>` +
      `<span class="ap-text">${curAP}/${maxAP}AP</span>`;
    slot.appendChild(statText);

    return slot;
  }

  /**
   * Update turn indicator with enhanced information
   * @param {Object} turnData - Turn information
   */
  updateTurnDisplay(turnData) {
    if (!turnData || !this.elements.turnIndicator) return;

    const banner = this.elements.turnIndicator;
    const labelEl = banner.querySelector('.turn-label');
    const charEl   = banner.querySelector('.turn-char');
    const apEl     = banner.querySelector('.turn-ap');

    if (labelEl) labelEl.textContent = `Turn ${turnData.turnNumber || 1}`;

    if (turnData.currentCharacter) {
      const char = turnData.currentCharacter;
      if (charEl) charEl.textContent = char.name || 'Unknown';
      if (apEl && char.currentAP !== undefined) {
        apEl.textContent = `AP: ${char.currentAP}/${char.maxAP || 3}`;
      }
      banner.className = 'combat-turn-banner ' +
        (char.type === 'player' ? 'player-turn' : 'enemy-turn');
      this.highlightCurrentCharacter(char.id, char.type);
    }
  }

  /**
   * Highlight current character's card
   * @param {string} characterId - Character ID
   * @param {string} type - 'player' or 'enemy'
   */
  highlightCurrentCharacter(characterId, type) {
    const allSlots = this.elements.combatContainer.querySelectorAll('.combatant-slot');
    allSlots.forEach(s => s.classList.remove('current-turn'));

    const slot = this.elements.combatContainer.querySelector(
      `[data-combatant-id="${characterId}"]`
    );
    if (slot) slot.classList.add('current-turn');
  }

  /**
   * Update available actions with enhanced feedback
   * @param {Array} actions - Available actions
   * @param {Object} character - Current character
   */
  updateActions(actions, character) {
    this.currentCharacter = character;

    // Dispose existing card physics before rebuilding
    this._disposeCardPhysics();
    this.elements.actionMenu.innerHTML = '';

    // If no character provided, show disabled default actions
    if (!character) {
      this.availableActions = [];
      this.createDefaultActionButtons();
      const buttons = this.elements.actionMenu.querySelectorAll('.action-btn');
      buttons.forEach(btn => { btn.disabled = true; btn.classList.add('disabled'); });
      return;
    }

    // Create action buttons based on available actions or defaults
    const actionsToShow = actions && actions.length > 0 ? actions : this.getDefaultActions();
    this.availableActions = actionsToShow; // must reflect what buttons are shown
    
    actionsToShow.forEach(action => {
      const button = document.createElement('button');
      button.className = 'action-btn';
      button.setAttribute('data-action-id', action.id);
      button.setAttribute('data-ui-component', 'action-button');
      button.setAttribute('data-ui-name', `action-${action.id}`);
      
      // Check if character has enough AP
      const apCost = action.apCost || 1;
      const hasEnoughAP = character.currentAP >= apCost;
      
      if (!hasEnoughAP) {
        button.disabled = true;
        button.classList.add('disabled');
        button.title = `Not enough AP (need ${apCost}, have ${character.currentAP})`;
      } else {
        button.title = action.description || `${action.name} - Costs ${apCost} AP`;
      }
      
      // Add special styling for different action types
      if (action.id === 'flee') {
        button.classList.add('flee-btn');
      } else if (action.id === 'defend') {
        button.classList.add('defend-btn');
      } else if (action.id === 'skill') {
        button.classList.add('skill-btn');
      } else if (action.id === 'item') {
        button.classList.add('item-btn');
      }
      
      const apCostClass = hasEnoughAP ? 'ap-available' : 'ap-insufficient';
      button.innerHTML = `<span class="action-icon">${this._actionIcon(action.id)}</span><span class="action-name">${action.name}</span><span class="action-cost ${apCostClass}">${apCost} AP</span>`;
      
      this.elements.actionMenu.appendChild(button);
    });
    
    // Add skip turn button (always available)
    const skipButton = document.createElement('button');
    skipButton.className = 'action-btn skip-btn';
    skipButton.setAttribute('data-action-id', 'skip');
    skipButton.setAttribute('data-ui-component', 'skip-button');
    skipButton.setAttribute('data-ui-name', 'skip-turn-action');
    skipButton.title = 'End current turn without taking any actions';
    skipButton.innerHTML = `<span class="action-icon">${this._actionIcon('skip')}</span><span class="action-name">Skip</span><span class="action-cost">End Turn</span>`;
    
    this.elements.actionMenu.appendChild(skipButton);

    // Attach spring physics to all rendered cards (skip button too)
    requestAnimationFrame(() => {
      const cards = this.elements.actionMenu.querySelectorAll('.action-btn');
      cards.forEach(card => {
        const phys = new CardPhysics(card);
        phys.start();
        // AP validation — disable physics interaction for unaffordable cards
        if (card.disabled) phys.setDisabled(true);
        this._cardPhysics.push(phys);
      });
    });
  }

  _disposeCardPhysics() {
    for (const p of this._cardPhysics) p.dispose();
    this._cardPhysics = [];
  }

  /**
   * Get default actions for combat
   * @returns {Array} Default action set
   */
  getDefaultActions() {
    return [
      { id: 'attack', name: 'Attack', apCost: 1, description: 'Basic physical attack' },
      { id: 'skill', name: 'Skill', apCost: 2, description: 'Use character skill' },
      { id: 'item', name: 'Item', apCost: 1, description: 'Use inventory item' },
      { id: 'defend', name: 'Defend', apCost: 1, description: 'Reduce incoming damage' },
      { id: 'flee', name: 'Flee', apCost: 0, description: 'Attempt to escape combat' }
    ];
  }

  /**
   * Handle action button click
   * @param {string} actionId - Action ID
   */
  handleActionClick(actionId) {
    if (!this.isActive) return;
    
    if (actionId === 'skip') {
      this.emitActionEvent('skip', null);
      return;
    }
    
    const action = this.availableActions.find(a => a.id === actionId);
    if (!action) {
      console.warn('Action not found:', actionId);
      return;
    }
    
    // Check AP cost
    if (this.currentCharacter.currentAP < (action.apCost || 1)) {
      this.addLogMessage('Not enough AP for this action!', 'warning');
      return;
    }
    
    const btn = this.elements.actionMenu.querySelector(`[data-action-id="${actionId}"]`);
    const rect = btn?.getBoundingClientRect();
    const fromDOMPos = rect
      ? { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.5 }
      : null;
    this.emitActionEvent('action', { action, character: this.currentCharacter, fromDOMPos });
  }

  /**
   * Emit action event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  emitActionEvent(type, data) {
    const event = new CustomEvent('combatUIAction', {
      detail: { type, data }
    });
    window.dispatchEvent(event);
  }

  /**
   * Handle combat events
   * @param {Object} eventData - Combat event data
   */
  handleCombatEvent(eventData) {
    switch (eventData.type) {
      case 'combatStarted':
        this.showCombat(eventData.data);
        break;
      case 'combatEnded':
        this.handleCombatEnd(eventData.data);
        break;
      case 'turnStarted':
        this.handleTurnStart(eventData.data);
        break;
      case 'actionExecuted':
        this.handleActionExecuted(eventData.data);
        break;
      case 'damageDealt':
        this.handleDamageDealt(eventData.data);
        break;
      case 'healingApplied':
        this.handleHealingApplied(eventData.data);
        break;
    }
  }

  /**
   * Handle combat end
   * @param {Object} endData - Combat end data
   */
  handleCombatEnd(endData) {
    this.addLogMessage(`Combat ended: ${endData.result}`, 'system');
    
    // Show results after a delay
    setTimeout(() => {
      this.hideCombat();
    }, 3000);
  }

  /**
   * Handle turn start
   * @param {Object} turnData - Turn data
   */
  handleTurnStart(turnData) {
    this.updateTurnDisplay(turnData);
    
    if (turnData.currentCharacter) {
      const char = turnData.currentCharacter;
      this.addLogMessage(`${char.name}'s turn begins`, 'system');
    }
  }

  /**
   * Handle action executed
   * @param {Object} actionData - Action execution data
   */
  handleActionExecuted(actionData) {
    const { character, action, result } = actionData;
    
    if (result.success) {
      this.addLogMessage(`${character.name} uses ${action.name}`, 'action');
    } else {
      this.addLogMessage(`${character.name}'s ${action.name} failed!`, 'error');
    }
    
    // Update character displays
    this.updateCombatantStats();
  }

  /**
   * Handle damage dealt
   * @param {Object} damageData - Damage data
   */
  handleDamageDealt(damageData) {
    const { target, damage, isCritical } = damageData;
    const critText = isCritical ? ' (CRITICAL!)' : '';
    this.addLogMessage(`${target.name} takes ${damage} damage${critText}`, 'damage');
    
    this.updateCombatantStats();
  }

  /**
   * Handle healing applied
   * @param {Object} healData - Healing data
   */
  handleHealingApplied(healData) {
    const { target, healing } = healData;
    this.addLogMessage(`${target.name} heals ${healing} HP`, 'healing');
    
    this.updateCombatantStats();
  }

  /**
   * Update all combatant stats displays
   */
  updateCombatantStats() {
    const event = new CustomEvent('combatUIRequest', {
      detail: { type: 'updateStats' }
    });
    window.dispatchEvent(event);
  }

  /**
   * Refresh a single combatant's stat bars/text in-place (no DOM rebuild, animation-safe).
   * @param {Object} combatant - Updated combatant data (must have id matching data-combatant-id)
   */
  refreshCombatantSlot(combatant) {
    const slot = this.elements.combatContainer?.querySelector(
      `[data-combatant-id="${combatant.id}"]`
    );
    if (!slot) return;

    const hpPct = Math.max(0, (combatant.currentHP / combatant.maxHP) * 100);
    const maxAP = combatant.maxAP || 3;
    const curAP = Math.max(0, combatant.currentAP || 0);
    const apPct = (curAP / maxAP) * 100;

    const hpFill = slot.querySelector('.hp-side-fill');
    if (hpFill) {
      hpFill.style.height = `${hpPct}%`;
      hpFill.style.background = this._hpColor(hpPct);
      hpFill.style.boxShadow = (hpPct <= 15 && hpPct > 0) ? '0 0 6px rgba(255,0,0,0.7)' : '';
    }

    const apFill = slot.querySelector('.ap-side-fill');
    if (apFill) {
      apFill.style.height = `${apPct}%`;
      apFill.style.background = this._apColor(apPct);
      apFill.style.boxShadow = (apPct >= 75) ? '0 0 5px rgba(0,136,255,0.5)' : '';
    }

    const statText = slot.querySelector('.combatant-stat-text');
    if (statText) {
      statText.innerHTML =
        `<span class="hp-text">${combatant.currentHP}/${combatant.maxHP}</span>` +
        `<span class="ap-text">${curAP}/${maxAP}AP</span>`;
    }

    if (combatant.currentHP <= 0) slot.classList.add('dead');
    else slot.classList.remove('dead');
  }

  /**
   * Add message to combat log
   * @param {string} message - Log message
   * @param {string} type - Message type (system, action, damage, healing, error, warning)
   */
  addLogMessage(message, type = 'system') {
    if (!this.elements.combatLog) {
      console.warn('Combat log element not found');
      return;
    }
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.setAttribute('data-ui-component', 'log-entry');
    logEntry.setAttribute('data-ui-name', `log-${type}-${Date.now()}`);
    
    logEntry.innerHTML = `<span class="log-message">${message}</span>`;
    
    this.elements.combatLog.appendChild(logEntry);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      this.elements.combatLog.scrollTop = this.elements.combatLog.scrollHeight;
    }, 10);
    
    // Keep only last 50 entries
    const entries = this.elements.combatLog.querySelectorAll('.log-entry');
    if (entries.length > 50) {
      entries[0].remove();
    }
    
    console.log(`Combat log: [${type}] ${message}`); // Debug output
  }

  /**
   * Clear combat log
   */
  clearCombatLog() {
    if (this.elements.combatLog) {
      this.elements.combatLog.innerHTML = '';
      console.log('Combat log cleared');
    } else {
      console.warn('Combat log element not found for clearing');
    }
  }

  /**
   * Apply a CSS animation class to a combatant card, then remove it.
   * @param {string} combatantId
   * @param {string} cssClass
   * @param {number} duration - ms before class is removed
   */
  applyCombatantAnimation(combatantId, cssClass, duration = 450) {
    const card = this.elements.combatContainer?.querySelector(`[data-combatant-id="${combatantId}"]`);
    if (!card) return;
    card.classList.add(cssClass);
    setTimeout(() => card.classList.remove(cssClass), duration);
  }

  /**
   * Register action handler
   * @param {string} actionId - Action ID
   * @param {Function} handler - Handler function
   */
  registerActionHandler(actionId, handler) {
    this.actionHandlers.set(actionId, handler);
  }

  /**
   * Unregister action handler
   * @param {string} actionId - Action ID
   */
  unregisterActionHandler(actionId) {
    this.actionHandlers.delete(actionId);
  }

  /**
   * Get combat UI status
   * @returns {Object} UI status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isActive: this.isActive,
      currentCharacter: this.currentCharacter,
      availableActions: this.availableActions.length
    };
  }

  /**
   * Dispose of combat UI
   */
  dispose() {
    if (this.elements.combatContainer && this.elements.combatContainer.parentNode) {
      this.elements.combatContainer.parentNode.removeChild(this.elements.combatContainer);
    }
    
    this.actionHandlers.clear();
    this._disposeCardPhysics();
    this.elements = {};
    this.isInitialized = false;
    this.isActive = false;
    
    console.log('CombatUI disposed');
  }

}