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
   */
  async initialize(combatSystem) {
    try {
      this.currentCombatSystem = combatSystem;
      
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
    }
  }

  /**
   * Handle combat started
   * @param {Object} combatData - Combat start data
   */
  handleCombatStarted(combatData) {
    if (!this.isInitialized) return;
    
    this.isActive = true;
    
    // Show combat UI
    this.combatUI.showCombat(combatData);
    
    console.log('Combat UI activated');
  }

  /**
   * Handle combat ended
   * @param {Object} endData - Combat end data
   */
  handleCombatEnded(endData) {
    if (!this.isActive) return;
    
    // Hide combat UI after a delay to show final animations
    setTimeout(() => {
      this.combatUI.hideCombat();
      this.isActive = false;
    }, 2000);
    
    console.log('Combat UI deactivated');
  }

  /**
   * Handle turn started
   * @param {Object} turnData - Turn data
   */
  handleTurnStarted(turnData) {
    if (!this.isActive || !turnData.currentCharacter) return;
    
    // Update actions for current character if it's a player character
    if (turnData.currentCharacter.type === 'player') {
      this.updatePlayerActions(turnData.currentCharacter);
    } else {
      // Clear actions for enemy turns
      this.combatUI.updateActions([], turnData.currentCharacter);
    }
  }

  /**
   * Handle action executed
   * @param {Object} actionData - Action execution data
   */
  handleActionExecuted(actionData) {
    // Update combatant stats after action
    this.requestStatsUpdate();
  }

  /**
   * Update available actions for player character
   * @param {Object} character - Current player character
   */
  updatePlayerActions(character) {
    if (!this.currentCombatSystem) return;
    
    // Get available actions from combat system
    const availableActions = this.currentCombatSystem.getAvailableActions(character);
    
    // Update UI
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
  async executePlayerAction(action, character) {
    if (!this.currentCombatSystem) return;
    
    // Get targets for the action
    const targets = this.getActionTargets(action, character);
    
    if (!targets || targets.length === 0) {
      this.combatUI.addLogMessage('No valid targets for this action!', 'warning');
      return;
    }
    
    // Execute action through combat system
    try {
      const result = await this.currentCombatSystem.processAction(character, action, targets);
      
      if (!result.success) {
        this.combatUI.addLogMessage(`Action failed: ${result.error}`, 'error');
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
    
    // Get targeting info from combat system
    const targetingInfo = this.currentCombatSystem.getTargetingInfo(action, character);
    
    // For now, auto-select targets based on action type
    // In a full implementation, this would show a target selection UI
    switch (action.targetType) {
      case 'single_enemy':
        return targetingInfo.validTargets.filter(t => t.type === 'enemy').slice(0, 1);
      case 'single_ally':
        return targetingInfo.validTargets.filter(t => t.type === 'player').slice(0, 1);
      case 'all_enemies':
        return targetingInfo.validTargets.filter(t => t.type === 'enemy');
      case 'all_allies':
        return targetingInfo.validTargets.filter(t => t.type === 'player');
      case 'self':
        return [character];
      default:
        return targetingInfo.validTargets.slice(0, 1);
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
    // This would integrate with the character system
    // For now, we'll simulate a level up check
    console.log('Checking for level ups...');
    
    // Example level up data (would come from character system)
    const levelUpData = {
      character: { id: 'warrior-1', name: 'Test Warrior' },
      newLevel: 2,
      statsGained: { HP: 12, ATK: 2, DEF: 2, SPD: 1 },
      skillsUnlocked: [{ name: 'Power Strike' }]
    };
    
    // Show level up if applicable
    // this.combatResultsUI.showLevelUpCelebration(levelUpData);
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