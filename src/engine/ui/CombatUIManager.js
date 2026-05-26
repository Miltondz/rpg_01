/**
 * Combat UI Manager - Integrates all combat UI components
 * Coordinates CombatUI, CombatAnimations, and CombatResultsUI
 */

import { CombatUI } from './CombatUI.js';
import { CombatAnimations } from './CombatAnimations.js';
import { CombatResultsUI } from './CombatResultsUI.js';
import { combatTextManager } from './CombatTextManager.js';

export class CombatUIManager {
  constructor() {
    // UI Components
    this.combatUI = null;
    this.combatAnimations = null;
    this.combatResultsUI = null;
    
    // State
    this.isInitialized = false;
    this.isActive = false;
    this.currentCombatSystem = null;
    this.targetingOverlay   = null;
    this._isTargeting       = false;
    this._targetingFromPos  = null;
    this._targetingEnemyHUD = null;
    this._targetingPartyHUD = null;
    this._onPartySlotClick  = null;
    this._onPartySlotHover  = null;

    // Event handlers
    this.boundHandlers = {
      combatUIAction:      this.handleCombatUIAction.bind(this),
      combatUIRequest:     this.handleCombatUIRequest.bind(this),
      combatResultsAction: this.handleCombatResultsAction.bind(this),
      combatResultsRequest: this.handleCombatResultsRequest.bind(this),
      battleStateChange:   this.handleBattleStateChange.bind(this),
      keydownTargeting:    this.handleKeydownTargeting.bind(this),
    };
  }

  /**
   * Initialize the combat UI manager
   * @param {Object} combatSystem - Combat system instance
   * @param {Object} partyManager - Party manager (for gold distribution)
   * @param {Object} inventorySystem - Inventory system (for loot distribution)
   */
  async initialize(combatSystem, partyManager = null, inventorySystem = null) {
    if (this.isInitialized) return true;
    try {
      this.currentCombatSystem = combatSystem;
      this.partyManager = partyManager;
      this.inventorySystem = inventorySystem;
      
      // Initialize UI components
      this.combatUI = new CombatUI();
      this.combatAnimations = new CombatAnimations();
      this.combatResultsUI = new CombatResultsUI();

      // Initialize all components
      const initResults = await Promise.all([
        this.combatUI.initialize(),
        this.combatAnimations.initialize(),
        this.combatResultsUI.initialize()
      ]);

      if (!initResults.every(result => result)) {
        throw new Error('Failed to initialize one or more UI components');
      }

      // Ensure singleton combatTextManager is initialized (idempotent)
      if (combatTextManager && !combatTextManager._running) {
        combatTextManager.initialize();
      }

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('CombatUIManager initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize CombatUIManager:', error);
      return false;
    }
  }

  /**
   * Setup event listeners for UI coordination
   */
  setupEventListeners() {
    // Combat UI events
    window.addEventListener('combatUIAction', this.boundHandlers.combatUIAction);
    window.addEventListener('combatUIRequest', this.boundHandlers.combatUIRequest);
    
    // Combat results events
    window.addEventListener('combatResultsAction', this.boundHandlers.combatResultsAction);
    window.addEventListener('combatResultsRequest', this.boundHandlers.combatResultsRequest);
    
    // Combat system events
    window.addEventListener('combatEvent', (event) => {
      this.handleCombatEvent(event.detail);
    });

    // FSM state changes — drive targeting overlay
    window.addEventListener('battleStateChange', this.boundHandlers.battleStateChange);

    // Escape cancels targeting
    window.addEventListener('keydown', this.boundHandlers.keydownTargeting);
  }

  setTargetingOverlay(overlay) {
    this.targetingOverlay = overlay;
  }

  handleBattleStateChange(event) {
    const { state } = event.detail ?? {};
    if (state === 'PLAYER_INPUT_TARGETING') {
      this._enterTargetingUI();
      // Disable buttons while selecting target — prevents double "cannot target now"
      this.combatUI?.elements?.actionMenu?.querySelectorAll('.action-btn')
        ?.forEach(b => { b.disabled = true; b.classList.add('disabled'); });
    } else {
      if (this._isTargeting) this._exitTargetingUI();
      if (state === 'ACTION_RESOLUTION') {
        // Lock buttons while action executes to prevent double-fire
        this.combatUI?.elements?.actionMenu?.querySelectorAll('.action-btn')
          ?.forEach(b => { b.disabled = true; b.classList.add('disabled'); });
      } else if (state === 'PLAYER_INPUT_ACTION' && this.isActive) {
        const char = this.currentCombatSystem?.currentCharacter;
        if (char) this.updatePlayerActions(char);
      }
    }
  }

  handleKeydownTargeting(event) {
    if (event.key === 'Escape' && this._isTargeting) {
      this.currentCombatSystem?.cancelTargeting();
    }
  }

  _enterTargetingUI() {
    if (!this.targetingOverlay || !this.currentCombatSystem) return;

    const cs = this.currentCombatSystem;
    if (!cs.fsm?.is?.('PLAYER_INPUT_TARGETING')) return;

    this._isTargeting = true;

    const action = cs._pendingAction;

    // ── ALLY targeting (heal, bless, divine_shield, items, etc.) ──
    if (action?.targetType === 'single_ally') {
      const aliveAllies = cs.playerParty?.getAliveMembers() ?? [];

      // Single alive ally → auto-confirm, no overlay
      if (aliveAllies.length === 1) {
        cs.confirmTargeting([aliveAllies[0]]);
        return;
      }

      const partyHUD = this.combatUI?.elements?.partyHUD;
      if (partyHUD) {
        partyHUD.querySelectorAll('.party-slot:not(.dead)').forEach(s => s.classList.add('targeting-active'));

        this._onPartySlotClick = (e) => {
          const slot = e.target.closest('.party-slot.targeting-active');
          if (!slot) return;
          const id   = slot.getAttribute('data-combatant-id');
          const ally = aliveAllies.find(a => a.id === id) ?? null;
          if (ally) cs.confirmTargeting([ally]);
        };
        this._onPartySlotHover = (e) => {
          const slot = e.target.closest('.party-slot.targeting-active');
          partyHUD.querySelectorAll('.party-slot').forEach(s => s.classList.remove('targeting-hover'));
          if (slot) slot.classList.add('targeting-hover');
        };

        partyHUD.addEventListener('click',     this._onPartySlotClick);
        partyHUD.addEventListener('mouseover', this._onPartySlotHover);
        this._targetingPartyHUD = partyHUD;
      }

      this.combatUI?.addLogMessage('Select an ally to target...', 'system');
      return;
    }

    // ── ENEMY targeting (attack skills, etc.) ──
    const aliveEnemies = (cs.enemies ?? []).filter(e => e.isAlive?.());
    const validEntities = aliveEnemies.map(e => cs.battleGrid?.entities?.get(e.id)).filter(Boolean);

    // Single alive enemy → auto-confirm immediately
    if (aliveEnemies.length === 1) {
      const combatant = validEntities[0]?.combatant ?? aliveEnemies[0];
      cs.confirmTargeting([combatant]);
      return;
    }

    const scene = cs._scene ?? null;
    this.targetingOverlay.enter(validEntities, this._targetingFromPos, scene);

    const enemyHUD = this.combatUI?.elements?.enemyHUD;
    if (enemyHUD) {
      enemyHUD.querySelectorAll('.enemy-slot').forEach(s => s.classList.add('targeting-active'));

      this._onEnemySlotHover = (e) => {
        const slot = e.target.closest('.enemy-slot.targeting-active');
        if (!slot) return;
        const rect   = slot.getBoundingClientRect();
        const domPos = { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.5 };
        const id     = slot.getAttribute('data-combatant-id');
        const entity = cs.battleGrid?.entities?.get(id) ?? null;
        this.targetingOverlay?.setHoverTarget(domPos, entity);
      };
      this._onEnemySlotClick = (e) => {
        const slot = e.target.closest('.enemy-slot.targeting-active');
        if (!slot) return;
        const id        = slot.getAttribute('data-combatant-id');
        const entity    = cs.battleGrid?.entities?.get(id) ?? null;
        const combatant = entity?.combatant ?? aliveEnemies.find(en => en.id === id) ?? null;
        if (combatant) cs.confirmTargeting([combatant]);
      };
      enemyHUD.addEventListener('mouseover', this._onEnemySlotHover);
      enemyHUD.addEventListener('click',     this._onEnemySlotClick);
      this._targetingEnemyHUD = enemyHUD;
    }
  }

  _exitTargetingUI() {
    this._isTargeting = false;
    this.targetingOverlay?.exit();

    // Clean up enemy targeting
    const hub = this._targetingEnemyHUD;
    if (hub) {
      hub.querySelectorAll('.enemy-slot').forEach(s => s.classList.remove('targeting-active'));
      if (this._onEnemySlotHover) hub.removeEventListener('mouseover', this._onEnemySlotHover);
      if (this._onEnemySlotClick) hub.removeEventListener('click',     this._onEnemySlotClick);
    }
    this._onEnemySlotHover  = null;
    this._onEnemySlotClick  = null;
    this._targetingEnemyHUD = null;

    // Clean up ally targeting
    const partyHub = this._targetingPartyHUD;
    if (partyHub) {
      partyHub.querySelectorAll('.party-slot').forEach(s => {
        s.classList.remove('targeting-active');
        s.classList.remove('targeting-hover');
      });
      if (this._onPartySlotClick) partyHub.removeEventListener('click',     this._onPartySlotClick);
      if (this._onPartySlotHover) partyHub.removeEventListener('mouseover', this._onPartySlotHover);
    }
    this._onPartySlotClick  = null;
    this._onPartySlotHover  = null;
    this._targetingPartyHUD = null;
  }

  /**
   * Handle combat events from the combat system
   * @param {Object} eventData - Combat event data
   */
  handleCombatEvent(eventData) {
    switch (eventData.type) {
      case 'combatStarted':
        this.handleCombatStarted(eventData.data);
        break;
      case 'combatEnded':
        this.handleCombatEnded(eventData.data);
        break;
      case 'turnStarted':
        this.handleTurnStarted(eventData.data);
        break;
      case 'actionExecuted':
        this.handleActionExecuted(eventData.data);
        break;
      case 'aiActionCompleted':
        // Enemy attacked — ensure HP display refreshes
        this.requestStatsUpdate();
        break;
      case 'statusEffectTick':
        this.handleStatusEffectTick(eventData.data);
        break;
      case 'turnEnded':
        this.requestStatsUpdate();
        break;
      case 'roundStarted':
        this.combatUI?.addLogMessage(`--- Round ${eventData.data?.turnNumber ?? '?'} ---`, 'system');
        break;
    }
  }

  /**
   * Handle combat started
   * @param {Object} combatData - Combat start data
   */
  handleCombatStarted(combatData) {
    if (!this.isInitialized) return;

    // Cancel any pending hide from a previous combat ending
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = null;
    }

    // Clean up any targeting state left over from the previous combat
    if (this._isTargeting) this._exitTargetingUI();

    this.isActive = true;
    this.combatUI.showCombat(combatData);
    this.combatUI.addLogMessage('Combat begins!', 'system');
    console.log('Combat UI activated');
  }

  /**
   * Handle combat ended
   * @param {Object} endData - Combat end data
   */
  handleCombatEnded(endData) {
    if (!this.isActive) return;

    if (endData.result === 'victory' && endData.rewards) {
      this.distributeRewards(endData.rewards);
      window.dispatchEvent(new CustomEvent('combatVictory', { detail: endData }));
    } else if (endData.result === 'fled') {
      this.combatUI?.addLogMessage('You escaped from combat!', 'system');
    } else if (endData.result === 'defeat') {
      this.combatUI?.addLogMessage('Your party has been defeated...', 'damage');
    }

    const delay = endData.result === 'fled' ? 1200 : 2000;
    this._hideTimeout = setTimeout(() => {
      this._hideTimeout = null;
      this.combatUI.hideCombat();
      this.isActive = false;
      if (endData.result === 'defeat') {
        const party = this.currentCombatSystem?.playerParty?.party ?? [];
        window.dispatchEvent(new CustomEvent('partyDefeated', { detail: { party } }));
      }
    }, delay);
  }

  /**
   * Distribute XP, gold, and loot to the party after victory
   * @param {Object} rewards - { experience, gold, loot[] }
   */
  distributeRewards(rewards) {
    const cs = this.currentCombatSystem;
    if (!cs) return;

    const party = cs.playerParty;
    if (!party) return;

    // XP — split equally among alive members
    if (rewards.experience) {
      const aliveMembers = party.getAliveMembers();
      const xpPerMember = Math.floor(rewards.experience / Math.max(1, aliveMembers.length));
      for (const member of aliveMembers) {
        if (typeof member.addExperience === 'function') {
          member.addExperience(xpPerMember);
        }
      }
      console.log(`Distributed ${rewards.experience} XP → ${xpPerMember} each to ${aliveMembers.length} members`);
    }

    // Gold — add to party pool
    if (rewards.gold) {
      if (typeof party.addGold === 'function') {
        party.addGold(rewards.gold);
        console.log(`Added ${rewards.gold} gold to party`);
      } else if (party.gold !== undefined) {
        party.gold += rewards.gold;
        console.log(`Added ${rewards.gold} gold (direct)`);
      }
    }

    // Loot — add to inventory if available
    if (Array.isArray(rewards.loot) && rewards.loot.length > 0 && this.inventorySystem) {
      for (const item of rewards.loot) {
        try {
          this.inventorySystem.addItem(item, item.quantity ?? 1);
        } catch (e) {
          console.warn('Failed to add loot item:', item?.name, e);
        }
      }
      console.log(`Added ${rewards.loot.length} loot items to inventory`);
    }

    // Notify all open UI panels to refresh
    window.dispatchEvent(new CustomEvent('partyDataChanged', { detail: { source: 'combatRewards', rewards } }));
  }

  /**
   * Handle turn started
   * @param {Object} turnData - Turn data
   */
  handleTurnStarted(turnData) {
    if (!this.isActive || !turnData.currentCharacter) return;

    // Update turn display
    this.combatUI.updateTurnDisplay(turnData);

    if (turnData.currentCharacter.type === 'player') {
      // Pass the REAL Character object (with hasAP, skills, etc.), not the summary
      const realChar = this.currentCombatSystem?.currentCharacter;
      if (realChar) this.updatePlayerActions(realChar);
      this.combatUI.addLogMessage(`${turnData.currentCharacter.name}'s turn — choose your action...`, 'system');
    } else {
      // Enemy turn — disable action buttons
      this.combatUI.updateActions([], null);
      this.combatUI.addLogMessage(`${turnData.currentCharacter.name}'s turn...`, 'system');
    }
  }

  /**
   * Handle action executed
   * @param {Object} actionData - Action execution data
   */
  handleActionExecuted(actionData) {
    // Visual animations — CombatSystem emits { character, action, result }
    const actorId = actionData?.actorId ?? actionData?.actor?.id ?? actionData?.character?.id;
    const resultTargets = actionData?.result?.targets ?? [];
    const targetIds = actionData?.targetIds
      ?? (actionData?.targets ?? resultTargets).map(t => t?.id ?? t?.name).filter(Boolean);
    const actionType = actionData?.actionType ?? actionData?.action?.type ?? '';

    if (actorId) {
      const attackClass = actionType === 'skill' ? 'casting' : 'attacking';
      this.combatUI?.applyCombatantAnimation(actorId, attackClass, 400);
    }

    if (targetIds.length > 0) {
      const hitClass = actionType === 'fire' ? 'fire-hit'
        : actionType === 'ice' ? 'ice-hit'
        : actionType === 'lightning' ? 'lightning-hit'
        : actionType === 'heal' ? 'healing-glow'
        : 'hit-flash';
      setTimeout(() => {
        for (const id of targetIds) {
          this.combatUI?.applyCombatantAnimation(id, hitClass, 400);
        }
      }, 200);
    }

    // Show action messages in combat log
    const messages = actionData?.messages ?? actionData?.result?.messages ?? [];
    for (const msg of messages) {
      const type = msg.toLowerCase().includes('defeat') || msg.toLowerCase().includes('damage')
        ? 'damage'
        : msg.toLowerCase().includes('heal')
          ? 'healing'
          : 'action';
      this.combatUI?.addLogMessage(msg, type);
    }
    // Update combatant stats after action
    this.requestStatsUpdate();
  }

  handleStatusEffectTick(tickData) {
    for (const msg of tickData?.messages ?? []) {
      this.combatUI?.addLogMessage(msg, 'status');
    }
    this.requestStatsUpdate();
  }

  /**
   * Update available actions for player character
   * @param {Object} character - Current player character
   */
  updatePlayerActions(character) {
    if (!this.currentCombatSystem) return;

    const availableActions = this.currentCombatSystem.getAvailableActions(character, this.inventorySystem);

    this.combatUI.updateActions(availableActions, character);
  }

  /**
   * Handle combat UI actions
   * @param {CustomEvent} event - UI action event
   */
  handleCombatUIAction(event) {
    const { type, data } = event.detail;
    
    switch (type) {
      case 'action':
        this.executePlayerAction(data.action, data.character, data.fromDOMPos ?? null);
        break;
      case 'skip':
        this.skipPlayerTurn();
        break;
    }
  }

  /**
   * Handle combat UI requests
   * @param {CustomEvent} event - UI request event
   */
  handleCombatUIRequest(event) {
    const { type } = event.detail;
    
    switch (type) {
      case 'updateStats':
        this.requestStatsUpdate();
        break;
    }
  }

  /**
   * Handle combat results actions
   * @param {CustomEvent} event - Results action event
   */
  handleCombatResultsAction(event) {
    const { action, results } = event.detail;
    
    switch (action) {
      case 'continue':
        this.handleContinueExploration();
        break;
      case 'retry':
        this.handleRetryCombat();
        break;
      case 'load':
        this.handleLoadSave();
        break;
      case 'menu':
        this.handleReturnToMenu();
        break;
    }
  }

  /**
   * Handle combat results requests
   * @param {CustomEvent} event - Results request event
   */
  handleCombatResultsRequest(event) {
    const { type } = event.detail;
    
    switch (type) {
      case 'checkLevelUps':
        this.checkForLevelUps();
        break;
    }
  }

  /**
   * Execute player action
   * @param {Object} action - Action to execute
   * @param {Object} character - Character performing action
   */
  async executePlayerAction(action, _characterSummary, fromDOMPos = null) {
    if (!this.currentCombatSystem) return;

    // Use the REAL Character object from CombatSystem — processAction does identity check
    const character = this.currentCombatSystem.currentCharacter;
    if (!character) {
      this.combatUI.addLogMessage('No active character!', 'error');
      return;
    }

    // Skills/items that need explicit target selection (single_enemy or single_ally).
    // AoE, self, and none target types are resolved automatically.
    const needsExplicitTarget = (action.targetType === 'single_enemy' || action.targetType === 'single_ally')
      && (action.type === 'skill' || action.type === 'item')
      && this.targetingOverlay;

    if (needsExplicitTarget) {
      // If already in targeting (e.g. double-click), cancel first then re-enter
      if (this.currentCombatSystem.fsm?.is?.('PLAYER_INPUT_TARGETING')) {
        this.currentCombatSystem.cancelTargeting();
      }
      // Arc origin: use the character's portrait card, not the action button
      let charCardPos = fromDOMPos;
      const charCard = document.querySelector(`[data-combatant-id="${character.id}"]`);
      if (charCard) {
        const r = charCard.getBoundingClientRect();
        charCardPos = { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
      }
      this._targetingFromPos = charCardPos;
      const ok = this.currentCombatSystem.enterTargeting(action);
      if (!ok) this.combatUI?.addLogMessage('Cannot target now — not your turn.', 'warning');
      return;
    }

    const targets = this.getActionTargets(action, character);

    // targetType 'none' (flee) legitimately has zero targets — don't block it
    if (action.targetType !== 'none' && (!targets || targets.length === 0)) {
      this.combatUI.addLogMessage('No valid targets!', 'warning');
      return;
    }

    try {
      const result = await this.currentCombatSystem.processAction(character, action, targets);
      if (!result.success) {
        const msg = result.errors?.[0] ?? result.error ?? 'unknown error';
        this.combatUI.addLogMessage(`Action failed: ${msg}`, 'error');
      } else if (action.type === 'item' && action.inventorySlotIndex !== undefined && this.inventorySystem) {
        // Consume the item from inventory after successful use
        this.inventorySystem.removeItem(action.inventorySlotIndex, 1);
        // Refresh action buttons (consumable list may have changed)
        this.updatePlayerActions(character);
      }
    } catch (error) {
      console.error('Error executing action:', error);
      this.combatUI.addLogMessage('Action execution failed!', 'error');
    }
  }

  /**
   * Get targets for an action
   * @param {Object} action - Action data
   * @param {Object} character - Character performing action
   * @returns {Array} Target array
   */
  getActionTargets(action, character) {
    if (!this.currentCombatSystem) return [];

    const cs = this.currentCombatSystem;
    const aliveEnemies = cs.enemies.filter(e => e.isAlive && e.isAlive());
    const aliveAllies = cs.playerParty ? cs.playerParty.getAliveMembers() : [];

    switch (action.targetType) {
      case 'single_enemy':
        return aliveEnemies.slice(0, 1);
      case 'single_ally':
        return aliveAllies.slice(0, 1);
      case 'all_enemies':
        return aliveEnemies;
      case 'all_allies':
        return aliveAllies;
      case 'self':
        return [character];
      case 'none':
        return [];
      default:
        return aliveEnemies.slice(0, 1);
    }
  }

  /**
   * Skip player turn
   */
  skipPlayerTurn() {
    if (!this.currentCombatSystem) return;
    
    this.currentCombatSystem.skipTurn();
  }

  /**
   * Request stats update from combat system
   */
  requestStatsUpdate() {
    if (!this.currentCombatSystem) return;

    const status = this.currentCombatSystem.getCombatStatus();

    // Try fast in-place refresh first (preserves animations + avoids DOM rebuild)
    const partyMembers = status.playerParty?.members || [];
    const enemies      = status.enemies || [];
    const allCombatants = [...partyMembers, ...enemies];

    let usedFastPath = allCombatants.length > 0;
    for (const c of allCombatants) {
      if (!this.combatUI.elements.combatContainer?.querySelector(`[data-combatant-id="${c.id}"]`)) {
        usedFastPath = false;
        break;
      }
    }

    if (usedFastPath) {
      allCombatants.forEach(c => this.combatUI.refreshCombatantSlot(c));
    } else {
      // Slots missing (first render or enemy died/was added) — full rebuild
      if (status.playerParty) this.combatUI.updatePartyDisplay(partyMembers);
      if (status.enemies)     this.combatUI.updateEnemyDisplay(enemies);
    }

    // Keep turn banner AP in sync after partial AP use
    const cur = this.currentCombatSystem.currentCharacter;
    if (cur && cur.currentAP !== undefined) {
      const apEl = this.combatUI?.elements?.turnIndicator?.querySelector('.turn-ap');
      if (apEl) apEl.textContent = `AP: ${cur.currentAP}/${cur.maxAP || 3}`;
    }
  }

  /**
   * Check for level ups after combat
   */
  checkForLevelUps() {
    const cs = this.currentCombatSystem;
    if (!cs?.playerParty) return;

    // Listen for levelUp events emitted by Character.levelUp() during addExperience
    // Results are async (fired during distributeRewards), so this is a no-op sweep
    // The 'levelUp' CustomEvent from Character carries the real data
    const members = cs.playerParty.getAliveMembers();
    for (const member of members) {
      if (member._pendingLevelUpData) {
        this.combatResultsUI?.showLevelUpCelebration(member._pendingLevelUpData);
        delete member._pendingLevelUpData;
      }
    }
  }

  /**
   * Handle continue exploration
   */
  handleContinueExploration() {
    console.log('Continuing exploration...');
    
    // Emit event for game state manager
    const event = new CustomEvent('gameStateChange', {
      detail: { 
        type: 'continueExploration',
        source: 'combatResults'
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Handle retry combat
   */
  handleRetryCombat() {
    console.log('Retrying combat...');
    
    // Emit event for game state manager
    const event = new CustomEvent('gameStateChange', {
      detail: { 
        type: 'retryCombat',
        source: 'combatResults'
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Handle load save
   */
  handleLoadSave() {
    console.log('Loading save...');
    
    // Emit event for save system
    const event = new CustomEvent('gameStateChange', {
      detail: { 
        type: 'loadSave',
        source: 'combatResults'
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Handle return to menu
   */
  handleReturnToMenu() {
    console.log('Returning to menu...');
    
    // Emit event for game state manager
    const event = new CustomEvent('gameStateChange', {
      detail: { 
        type: 'returnToMenu',
        source: 'combatResults'
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Show combat UI (external interface)
   * @param {Object} combatData - Combat data
   */
  showCombat(combatData) {
    if (this.combatUI) {
      this.combatUI.showCombat(combatData);
      this.isActive = true;
    }
  }

  /**
   * Hide combat UI (external interface)
   */
  hideCombat() {
    if (this.combatUI) {
      this.combatUI.hideCombat();
      this.isActive = false;
    }
  }

  /**
   * Add log message (external interface)
   * @param {string} message - Log message
   * @param {string} type - Message type
   */
  addLogMessage(message, type = 'system') {
    if (this.combatUI) {
      this.combatUI.addLogMessage(message, type);
    }
  }

  /**
   * Get UI manager status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isActive: this.isActive,
      components: {
        combatUI: this.combatUI ? this.combatUI.getStatus() : null,
        combatAnimations: this.combatAnimations ? this.combatAnimations.getStatus() : null,
        combatResultsUI: this.combatResultsUI ? this.combatResultsUI.getStatus() : null
      }
    };
  }

  /**
   * Dispose of UI manager and all components
   */
  dispose() {
    // Remove event listeners
    window.removeEventListener('combatUIAction',      this.boundHandlers.combatUIAction);
    window.removeEventListener('combatUIRequest',     this.boundHandlers.combatUIRequest);
    window.removeEventListener('combatResultsAction', this.boundHandlers.combatResultsAction);
    window.removeEventListener('combatResultsRequest',this.boundHandlers.combatResultsRequest);
    window.removeEventListener('battleStateChange',   this.boundHandlers.battleStateChange);
    window.removeEventListener('keydown',             this.boundHandlers.keydownTargeting);
    if (this._isTargeting) this._exitTargetingUI();
    
    // Dispose components
    if (this.combatUI) {
      this.combatUI.dispose();
      this.combatUI = null;
    }
    
    if (this.combatAnimations) {
      this.combatAnimations.dispose();
      this.combatAnimations = null;
    }
    
    if (this.combatResultsUI) {
      this.combatResultsUI.dispose();
      this.combatResultsUI = null;
    }
    
    this.currentCombatSystem = null;
    this.isInitialized = false;
    this.isActive = false;
    
    console.log('CombatUIManager disposed');
  }
}