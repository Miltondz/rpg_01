/**
 * Combat UI Manager - Integrates all combat UI components
 * Coordinates CombatUI, CombatAnimations, and CombatResultsUI
 */

import { CombatUI } from './CombatUI.js';
import { CombatAnimations } from './CombatAnimations.js';
import { CombatResultsUI } from './CombatResultsUI.js';

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
    
    // Event handlers
    this.boundHandlers = {
      combatUIAction: this.handleCombatUIAction.bind(this),
      combatUIRequest: this.handleCombatUIRequest.bind(this),
      combatResultsAction: this.handleCombatResultsAction.bind(this),
      combatResultsRequest: this.handleCombatResultsRequest.bind(this)
    };
  }

  /**
   * Initialize the combat UI manager
   * @param {Object} combatSystem - Combat system instance
   * @param {Object} partyManager - Party manager (for gold distribution)
   * @param {Object} inventorySystem - Inventory system (for loot distribution)
   */
  async initialize(combatSystem, partyManager = null, inventorySystem = null) {
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

    // Distribute rewards immediately so XP/gold/loot land before results screen
    if (endData.result === 'victory' && endData.rewards) {
      this.distributeRewards(endData.rewards);
      // AutoSaveManager listens for combatVictory to trigger post-combat save
      window.dispatchEvent(new CustomEvent('combatVictory', { detail: endData }));
    }

    // Hide combat UI after a delay to show final animations
    setTimeout(() => {
      this.combatUI.hideCombat();
      this.isActive = false;
    }, 2000);
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

    // XP — distribute to all alive members
    if (rewards.experience) {
      const aliveMembers = party.getAliveMembers();
      for (const member of aliveMembers) {
        if (typeof member.addExperience === 'function') {
          member.addExperience(rewards.experience);
        }
      }
      console.log(`Distributed ${rewards.experience} XP to ${party.getAliveMembers().length} members`);
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
      this.updatePlayerActions(this.currentCombatSystem.currentCharacter);
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

    // Pass inventorySystem so real consumable items appear as actions
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
        this.executePlayerAction(data.action, data.character);
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
  async executePlayerAction(action, _characterSummary) {
    if (!this.currentCombatSystem) return;

    // Use the REAL Character object from CombatSystem — processAction does identity check
    const character = this.currentCombatSystem.currentCharacter;
    if (!character) {
      this.combatUI.addLogMessage('No active character!', 'error');
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
    
    // Get current combat status
    const status = this.currentCombatSystem.getCombatStatus();
    
    if (status.playerParty) {
      this.combatUI.updatePartyDisplay(status.playerParty.members || []);
    }
    
    if (status.enemies) {
      this.combatUI.updateEnemyDisplay(status.enemies);
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
    Object.entries(this.boundHandlers).forEach(([event, handler]) => {
      window.removeEventListener(event, handler);
    });
    
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