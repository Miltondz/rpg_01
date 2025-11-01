/**
 * CombatSystem - Core turn-based combat system with encounter management
 * Handles combat initialization, turn order, AP management, and combat state
 */

import { ActionSystem } from './ActionSystem.js';
import { ActionResolver } from './ActionResolver.js';
import { EnemyAI } from './EnemyAI.js';
import { AIActionValidator } from './AIActionValidator.js';
import { lootSystem } from '../loot/LootSystem.js';

export class CombatSystem {
  constructor() {
    // Action system for handling combat actions
    this.actionSystem = new ActionSystem();
    this.actionResolver = new ActionResolver(this.actionSystem);
    this.aiValidator = new AIActionValidator();
    // Combat state management
    this.combatState = 'INACTIVE'; // INACTIVE, PLAYER_TURN, ENEMY_TURN, VICTORY, DEFEAT
    this.isActive = false;
    
    // Participants
    this.playerParty = null;
    this.enemies = [];
    
    // Turn management
    this.turnOrder = [];
    this.currentTurnIndex = 0;
    this.currentCharacter = null;
    this.turnNumber = 1;
    
    // Combat settings
    this.maxAP = 3; // Action Points per turn
    
    // Combat results
    this.combatResults = null;
    
    console.log('CombatSystem initialized');
  }

  /**
   * Initialize combat encounter
   * @param {Object} playerParty - Player's party manager
   * @param {Array} enemies - Array of enemy objects
   * @param {Object} encounterData - Additional encounter data
   * @returns {boolean} True if combat successfully initialized
   */
  initializeCombat(playerParty, enemies, encounterData = {}) {
    if (this.isActive) {
      console.warn('Combat already active');
      return false;
    }

    // Validate inputs
    if (!playerParty || !playerParty.getAliveMembers().length) {
      console.error('No alive party members for combat');
      return false;
    }

    if (!enemies || !enemies.length) {
      console.error('No enemies for combat');
      return false;
    }

    // Set up combat participants
    this.playerParty = playerParty;
    this.enemies = [...enemies];
    
    // Initialize AI for enemies
    this.initializeEnemyAI();
    
    // Reset all participants' AP
    this.resetAllAP();
    
    // Calculate turn order
    this.calculateTurnOrder();
    
    // Set initial combat state
    this.isActive = true;
    this.combatState = 'PLAYER_TURN';
    this.currentTurnIndex = 0;
    this.turnNumber = 1;
    this.combatResults = null;
    
    // Set current character
    this.currentCharacter = this.turnOrder[0];
    
    console.log('Combat initialized:', {
      playerParty: this.playerParty.getAliveMembers().length,
      enemies: this.enemies.length,
      turnOrder: this.turnOrder.map(c => c.name || c.id)
    });
    
    // Emit combat start event
    this.emitCombatEvent('combatStarted', {
      playerParty: this.playerParty.getPartySummary(),
      enemies: this.enemies.map(e => this.getEnemySummary(e)),
      turnOrder: this.getTurnOrderSummary()
    });
    
    return true;
  }

  /**
   * Calculate turn order based on speed stats
   */
  calculateTurnOrder() {
    this.turnOrder = [];
    
    // Add all alive party members
    const alivePartyMembers = this.playerParty.getAliveMembers();
    this.turnOrder.push(...alivePartyMembers);
    
    // Add all alive enemies
    const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive && enemy.isAlive());
    this.turnOrder.push(...aliveEnemies);
    
    // Sort by speed (highest first), with random tiebreaker
    this.turnOrder.sort((a, b) => {
      const speedA = a.stats ? a.stats.SPD : (a.speed || 5);
      const speedB = b.stats ? b.stats.SPD : (b.speed || 5);
      
      if (speedA === speedB) {
        return Math.random() - 0.5; // Random tiebreaker
      }
      
      return speedB - speedA; // Highest speed first
    });
    
    console.log('Turn order calculated:', this.turnOrder.map(c => ({
      name: c.name || c.id,
      speed: c.stats ? c.stats.SPD : (c.speed || 5),
      type: c.class ? 'player' : 'enemy'
    })));
  }

  /**
   * Initialize AI systems for all enemies
   */
  initializeEnemyAI() {
    for (const enemy of this.enemies) {
      if (!enemy.ai) {
        const ai = EnemyAI.createForEnemyType(enemy.type);
        enemy.setAI(ai);
        console.log(`Initialized ${ai.archetype} AI for ${enemy.name}`);
      }
    }
  }

  /**
   * Reset AP for all combat participants
   */
  resetAllAP() {
    // Reset party AP
    if (this.playerParty) {
      this.playerParty.resetPartyAP();
    }
    
    // Reset enemy AP
    for (const enemy of this.enemies) {
      if (enemy.resetAP) {
        enemy.resetAP();
      } else {
        enemy.currentAP = enemy.maxAP || this.maxAP;
      }
    }
  }

  /**
   * Start next turn
   * @returns {Object} Current turn information
   */
  nextTurn() {
    if (!this.isActive) {
      console.warn('Combat not active');
      return null;
    }

    // Move to next character in turn order
    this.currentTurnIndex++;
    
    // Check if we've completed a full round
    if (this.currentTurnIndex >= this.turnOrder.length) {
      this.currentTurnIndex = 0;
      this.turnNumber++;
      
      // Recalculate turn order (remove dead characters)
      this.updateTurnOrder();
      
      console.log(`Starting turn ${this.turnNumber}`);
    }
    
    // Set current character
    this.currentCharacter = this.turnOrder[this.currentTurnIndex];
    
    // Reset current character's AP
    if (this.currentCharacter) {
      if (this.currentCharacter.resetAP) {
        this.currentCharacter.resetAP();
      } else {
        this.currentCharacter.currentAP = this.currentCharacter.maxAP || this.maxAP;
      }
      
      // Determine combat state based on current character
      this.updateCombatState();
    }
    
    const turnInfo = this.getCurrentTurnInfo();
    
    // Emit turn start event
    this.emitCombatEvent('turnStarted', turnInfo);
    
    // Handle AI turn if current character is an enemy
    if (this.combatState === 'ENEMY_TURN') {
      this.handleEnemyTurn();
    }
    
    return turnInfo;
  }

  /**
   * Update turn order by removing dead characters
   */
  updateTurnOrder() {
    const oldLength = this.turnOrder.length;
    
    // Filter out dead characters
    this.turnOrder = this.turnOrder.filter(character => {
      if (character.isAlive) {
        return character.isAlive();
      }
      // For enemies without isAlive method, check HP
      return character.currentHP > 0;
    });
    
    // Adjust current turn index if characters were removed
    if (this.turnOrder.length < oldLength && this.currentTurnIndex >= this.turnOrder.length) {
      this.currentTurnIndex = 0;
    }
    
    console.log('Turn order updated, removed dead characters');
  }

  /**
   * Update combat state based on current character
   */
  updateCombatState() {
    if (!this.currentCharacter) {
      return;
    }
    
    // Check if current character is player or enemy
    const isPlayerCharacter = this.playerParty.hasCharacter(this.currentCharacter.id);
    
    if (isPlayerCharacter) {
      this.combatState = 'PLAYER_TURN';
    } else {
      this.combatState = 'ENEMY_TURN';
    }
  }

  /**
   * Check if combat should end
   * @returns {string|null} End condition ('victory', 'defeat') or null if continuing
   */
  checkCombatEnd() {
    const alivePartyMembers = this.playerParty.getAliveMembers();
    const aliveEnemies = this.enemies.filter(enemy => 
      enemy.isAlive ? enemy.isAlive() : enemy.currentHP > 0
    );
    
    if (alivePartyMembers.length === 0) {
      return 'defeat';
    }
    
    if (aliveEnemies.length === 0) {
      return 'victory';
    }
    
    return null;
  }

  /**
   * End combat with specified result
   * @param {string} result - Combat result ('victory' or 'defeat')
   * @param {Object} rewards - Rewards for victory (XP, gold, loot)
   */
  endCombat(result, rewards = null) {
    if (!this.isActive) {
      console.warn('Combat not active');
      return;
    }
    
    this.isActive = false;
    this.combatState = result.toUpperCase();
    
    // Create combat results
    this.combatResults = {
      result: result,
      turnNumber: this.turnNumber,
      rewards: rewards,
      partyState: this.playerParty.getPartySummary(),
      timestamp: Date.now()
    };
    
    console.log(`Combat ended: ${result}`, this.combatResults);
    
    // Emit combat end event
    this.emitCombatEvent('combatEnded', this.combatResults);
  }

  /**
   * Process action during combat
   * @param {Object} character - Character performing action
   * @param {Object} action - Action to perform
   * @param {Object|Array} targets - Target(s) for the action
   * @returns {Promise<Object>} Action result
   */
  async processAction(character, action, targets) {
    if (!this.isActive) {
      console.warn('Combat not active');
      return { success: false, error: 'Combat not active' };
    }
    
    if (character !== this.currentCharacter) {
      console.warn('Not this character\'s turn');
      return { success: false, error: 'Not your turn' };
    }
    
    // Validate AP cost
    const apCost = action.apCost || 1;
    if (!character.hasAP || !character.hasAP(apCost)) {
      console.warn('Insufficient AP for action');
      return { success: false, error: 'Insufficient AP' };
    }
    
    // Use ActionResolver for complete action processing
    const resolution = await this.actionResolver.resolveAction(
      action, character, targets, this.playerParty, this.enemies
    );
    
    if (resolution.success) {
      // Use AP after successful action
      if (character.useAP) {
        character.useAP(apCost);
      } else {
        character.currentAP -= apCost;
      }
      
      // Check if combat should end after this action
      const endCondition = this.checkCombatEnd();
      if (endCondition) {
        // Calculate rewards for victory
        const rewards = endCondition === 'victory' ? this.calculateRewards() : null;
        this.endCombat(endCondition, rewards);
      } else if (character.currentAP <= 0) {
        // End turn if no AP remaining
        this.nextTurn();
      }
    }
    
    return resolution;
  }

  /**
   * Execute action using the action system
   * @param {Object} character - Character performing action
   * @param {Object} action - Action to perform
   * @param {Object|Array} targets - Target(s) for the action
   * @returns {Object} Action result
   */
  executeAction(character, action, targets) {
    console.log(`${character.name} uses ${action.name}`);
    
    // Use ActionSystem to execute the action
    const result = this.actionSystem.executeAction(action, character, targets);
    
    // Emit action event
    this.emitCombatEvent('actionExecuted', {
      character: character,
      action: action,
      result: result
    });
    
    return result;
  }

  /**
   * Get available actions for a character
   * @param {Object} character - Character to get actions for
   * @returns {Array} Array of available actions
   */
  getAvailableActions(character) {
    return this.actionSystem.getAvailableActions(character);
  }

  /**
   * Get targeting information for an action
   * @param {Object} action - Action to get targeting info for
   * @param {Object} character - Character performing the action
   * @returns {Object} Targeting information
   */
  getTargetingInfo(action, character) {
    return this.actionResolver.targetingSystem.getTargetingInfo(
      action, character, this.playerParty, this.enemies
    );
  }

  /**
   * Calculate rewards for victory
   * @returns {Object} Reward data
   */
  calculateRewards() {
    const alivePartyMembers = this.playerParty.getAliveMembers();
    const totalEnemyLevel = this.enemies.reduce((sum, enemy) => sum + (enemy.level || 1), 0);
    const averagePartyLevel = this.playerParty.getAverageLevel();
    
    // Base XP calculation
    const baseXP = totalEnemyLevel * 25;
    const xpPerMember = Math.floor(baseXP / alivePartyMembers.length);
    
    // Generate loot from defeated enemies
    const loot = lootSystem.generateCombatLoot(this.enemies, averagePartyLevel);
    
    return {
      experience: xpPerMember,
      gold: loot.gold,
      loot: loot.items
    };
  }

  /**
   * Get current turn information
   * @returns {Object} Current turn data
   */
  getCurrentTurnInfo() {
    return {
      turnNumber: this.turnNumber,
      currentCharacter: this.currentCharacter ? {
        id: this.currentCharacter.id,
        name: this.currentCharacter.name,
        type: this.playerParty.hasCharacter(this.currentCharacter.id) ? 'player' : 'enemy',
        currentAP: this.currentCharacter.currentAP,
        maxAP: this.currentCharacter.maxAP || this.maxAP
      } : null,
      combatState: this.combatState,
      turnIndex: this.currentTurnIndex,
      totalTurns: this.turnOrder.length
    };
  }

  /**
   * Get turn order summary
   * @returns {Array} Turn order information
   */
  getTurnOrderSummary() {
    return this.turnOrder.map((character, index) => ({
      index: index,
      id: character.id,
      name: character.name,
      type: this.playerParty.hasCharacter(character.id) ? 'player' : 'enemy',
      speed: character.stats ? character.stats.SPD : (character.speed || 5),
      isCurrentTurn: index === this.currentTurnIndex
    }));
  }

  /**
   * Get enemy summary for events
   * @param {Object} enemy - Enemy object
   * @returns {Object} Enemy summary
   */
  getEnemySummary(enemy) {
    return {
      id: enemy.id,
      name: enemy.name,
      level: enemy.level || 1,
      currentHP: enemy.currentHP,
      maxHP: enemy.maxHP,
      isAlive: enemy.isAlive ? enemy.isAlive() : enemy.currentHP > 0
    };
  }

  /**
   * Skip current character's turn
   * @returns {Object} Turn information
   */
  skipTurn() {
    if (!this.isActive || !this.currentCharacter) {
      console.warn('Cannot skip turn - combat not active or no current character');
      return null;
    }
    
    console.log(`${this.currentCharacter.name} skipped their turn`);
    
    // Set AP to 0 to end turn
    this.currentCharacter.currentAP = 0;
    
    // Move to next turn
    return this.nextTurn();
  }

  /**
   * Get combat status
   * @returns {Object} Current combat status
   */
  getCombatStatus() {
    return {
      isActive: this.isActive,
      combatState: this.combatState,
      turnInfo: this.getCurrentTurnInfo(),
      turnOrder: this.getTurnOrderSummary(),
      playerParty: this.playerParty ? this.playerParty.getPartySummary() : null,
      enemies: this.enemies.map(e => this.getEnemySummary(e)),
      combatResults: this.combatResults
    };
  }

  /**
   * Emit combat event
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  emitCombatEvent(eventType, data) {
    const event = new CustomEvent('combatEvent', {
      detail: {
        type: eventType,
        data: data,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Handle enemy turn with AI decision-making
   */
  async handleEnemyTurn() {
    if (!this.currentCharacter || this.combatState !== 'ENEMY_TURN') {
      return;
    }

    const enemy = this.currentCharacter;
    
    // Add delay for AI thinking animation
    await this.delay(500);
    
    // Get AI decision with validation and fallback
    const aiDecision = this.getAIActionWithFallback(enemy);
    
    if (!aiDecision) {
      console.warn(`${enemy.name} has no valid AI decision, skipping turn`);
      this.skipTurn();
      return;
    }
    
    console.log(`${enemy.name} AI decision:`, aiDecision);
    
    // Execute AI action with animation delay
    await this.executeAIAction(enemy, aiDecision);
    
    // Check if enemy has more AP for additional actions
    if (enemy.currentAP > 0 && this.isActive) {
      // AI can take another action
      setTimeout(() => this.handleEnemyTurn(), 800);
    } else if (this.isActive) {
      // End enemy turn
      setTimeout(() => this.nextTurn(), 1000);
    }
  }

  /**
   * Execute AI action with proper animation and delays
   * @param {Object} enemy - Enemy performing action
   * @param {Object} aiDecision - AI decision with action and target
   */
  async executeAIAction(enemy, aiDecision) {
    const { action, target } = aiDecision;
    
    // Emit AI action start event
    this.emitCombatEvent('aiActionStarted', {
      enemy: enemy,
      action: action,
      target: target
    });
    
    // Add animation delay
    await this.delay(300);
    
    // Execute the action
    const result = await this.processAction(enemy, action, target);
    
    // Emit AI action completed event
    this.emitCombatEvent('aiActionCompleted', {
      enemy: enemy,
      action: action,
      target: target,
      result: result
    });
    
    // Add delay for result visualization
    await this.delay(500);
    
    return result;
  }

  /**
   * Validate AI action before execution
   * @param {Object} enemy - Enemy performing action
   * @param {Object} action - Action to validate
   * @param {Object|Array} target - Target(s) for action
   * @returns {boolean} True if action is valid
   */
  validateAIAction(enemy, action, target) {
    // Check if enemy is alive and it's their turn
    if (!enemy.isAlive() || enemy !== this.currentCharacter) {
      return false;
    }
    
    // Check AP cost
    if (!enemy.hasAP(action.apCost)) {
      return false;
    }
    
    // Check target validity
    if (Array.isArray(target)) {
      return target.every(t => t && (t.isAlive ? t.isAlive() : t.currentHP > 0));
    } else if (target) {
      return target.isAlive ? target.isAlive() : target.currentHP > 0;
    }
    
    return true;
  }

  /**
   * Get AI action with validation and fallback handling
   * @param {Object} enemy - Enemy needing action
   * @returns {Object|null} AI action or null
   */
  getAIActionWithFallback(enemy) {
    // Try to get AI decision
    let aiDecision = enemy.getAIDecision(this.playerParty, this.enemies);
    
    // Validate the decision
    if (aiDecision) {
      const validation = this.aiValidator.validateAction(
        enemy, aiDecision.action, aiDecision.target, this.playerParty, this.enemies
      );
      
      if (validation.isValid) {
        // Log any warnings
        if (validation.warnings.length > 0) {
          console.warn(`AI action warnings for ${enemy.name}:`, validation.warnings);
        }
        return aiDecision;
      } else {
        console.warn(`Invalid AI action for ${enemy.name}:`, validation.errors);
      }
    }
    
    // Generate fallback action
    const fallbackAction = this.aiValidator.generateFallbackAction(enemy, this.playerParty, this.enemies);
    
    if (fallbackAction) {
      console.log(`Using fallback action for ${enemy.name}:`, fallbackAction.action.name);
      return fallbackAction;
    }
    
    return null;
  }

  /**
   * Utility delay function for AI animations
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset combat system
   */
  reset() {
    this.isActive = false;
    this.combatState = 'INACTIVE';
    this.playerParty = null;
    this.enemies = [];
    this.turnOrder = [];
    this.currentTurnIndex = 0;
    this.currentCharacter = null;
    this.turnNumber = 1;
    this.combatResults = null;
    
    console.log('CombatSystem reset');
  }
}