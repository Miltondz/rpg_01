/**
 * CombatSystem - Core turn-based combat system with encounter management
 * Handles combat initialization, turn order, AP management, and combat state
 */

import { ActionSystem } from './ActionSystem.js';
import { ActionResolver } from './ActionResolver.js';
import { EnemyAI } from './EnemyAI.js';
import { AIActionValidator } from './AIActionValidator.js';
import { lootSystem } from '../loot/LootSystem.js';
import { BattleFSM, BattleState } from './BattleFSM.js';
import { BattleActionExecutor } from './BattleActionExecutor.js';
import { BattleGrid } from './BattleGrid.js';

export class CombatSystem {
  constructor() {
    // Action system for handling combat actions
    this.actionSystem    = new ActionSystem();
    this.actionResolver  = new ActionResolver(this.actionSystem);
    this.aiValidator     = new AIActionValidator();
    this.battleExecutor  = new BattleActionExecutor(this.actionResolver);
    this.battleGrid      = new BattleGrid();

    // Scene reference — set by main.js after systems init
    this._scene = null;
    // Battle FSM — authoritative state machine
    this.fsm = new BattleFSM();

    // Combat state management (kept in sync with FSM for backward compat)
    this.combatState = 'INACTIVE'; // INACTIVE, PLAYER_TURN, ENEMY_TURN, VICTORY, DEFEAT
    this.isActive = false;

    // Pending targeted action (set during PLAYER_INPUT_TARGETING)
    this._pendingAction = null;
    
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
    this.animationsEnabled = false; // Set true to add AI turn delays for visual pacing
    
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
    this._pendingAction = null;

    // Set current character
    this.currentCharacter = this.turnOrder[0];

    console.log('Combat initialized:', {
      playerParty: this.playerParty.getAliveMembers().length,
      enemies: this.enemies.length,
      turnOrder: this.turnOrder.map(c => c.name || c.id)
    });

    // FSM: VICTORY/DEFEAT are terminal — reset to IDLE before starting new combat,
    // otherwise the BATTLE_INIT transition is rejected and the FSM stays stuck.
    if (!this.fsm.is(BattleState.IDLE)) {
      this.fsm.reset();
    }
    this.fsm.transition(BattleState.BATTLE_INIT);

    // Place combatants on 3D battle grid
    this._placeCombatantsOnGrid();

    // Emit combat start event
    this.emitCombatEvent('combatStarted', {
      playerParty: this.playerParty.getPartySummary(),
      enemies: this.enemies.map(e => this.getEnemySummary(e)),
      turnOrder: this.getTurnOrderSummary()
    });

    // Kick off first turn after the UI has had time to render (combatStarted handler runs first)
    setTimeout(() => {
      if (!this.isActive) return;
      this.fsm.transition(BattleState.TURN_START);
      this.updateCombatState();
      this.emitCombatEvent('turnStarted', this.getCurrentTurnInfo());
      if (this.combatState === 'ENEMY_TURN') {
        this.handleEnemyTurn();
      }
    }, 250);

    return true;
  }

  /**
   * Calculate turn order based on speed + random initiative roll.
   * Re-rolled fresh every combat so order varies each encounter.
   */
  calculateTurnOrder() {
    this.turnOrder = [];

    const alivePartyMembers = this.playerParty.getAliveMembers();
    this.turnOrder.push(...alivePartyMembers);

    const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive && enemy.isAlive());
    this.turnOrder.push(...aliveEnemies);

    // Each combatant rolls: SPD + random(0, SPD * 0.5)
    // Pre-compute so each character gets one stable roll for the whole combat
    const initiative = new Map();
    for (const c of this.turnOrder) {
      const spd = (c.stats ? c.stats.SPD : (c.speed || 5)) || 5;
      initiative.set(c, spd + Math.random() * spd * 0.5);
    }

    this.turnOrder.sort((a, b) => (initiative.get(b) ?? 0) - (initiative.get(a) ?? 0));

    console.log('Turn order calculated:', this.turnOrder.map(c => ({
      name: c.name || c.id,
      spd: c.stats ? c.stats.SPD : (c.speed || 5),
      initiative: Math.round(initiative.get(c) ?? 0),
      type: c.class ? 'player' : 'enemy'
    })));
  }

  /**
   * Initialize AI systems for all enemies
   */
  initializeEnemyAI() {
    for (const enemy of this.enemies) {
      if (!enemy.ai) {
        const ai = EnemyAI.createForEnemyType(enemy.type ?? enemy.id ?? '');
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

    // Emit turn-end event for the character whose turn just finished
    if (this.currentCharacter) {
      this.emitCombatEvent('turnEnded', { character: this.currentCharacter, turnNumber: this.turnNumber });
    }

    // Move to next character in turn order
    this.currentTurnIndex++;

    // Check if we've completed a full round
    if (this.currentTurnIndex >= this.turnOrder.length) {
      this.currentTurnIndex = 0;
      this.turnNumber++;
      this.emitCombatEvent('roundStarted', { turnNumber: this.turnNumber });

      // Recalculate turn order (remove dead characters)
      this.updateTurnOrder();

      console.log(`Starting round ${this.turnNumber}`);
    }

    // Skip dead characters mid-round (may have died since round start)
    let safetyLimit = this.turnOrder.length + 1;
    while (safetyLimit-- > 0 && this.turnOrder.length > 0) {
      const candidate = this.turnOrder[this.currentTurnIndex];
      const alive = candidate?.isAlive ? candidate.isAlive() : (candidate?.currentHP ?? 0) > 0;
      if (alive) break;
      // Skip dead character
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
    }

    // Set current character
    this.currentCharacter = this.turnOrder[this.currentTurnIndex];

    // Reset current character's AP and tick status effects
    if (this.currentCharacter) {
      if (this.currentCharacter.resetAP) {
        this.currentCharacter.resetAP();
      } else {
        this.currentCharacter.currentAP = this.currentCharacter.maxAP || this.maxAP;
      }

      this.tickStatusEffects(this.currentCharacter);
      this.tickSkillCooldowns(this.currentCharacter);

      // Determine combat state based on current character
      this.updateCombatState();
    }

    const turnInfo = this.getCurrentTurnInfo();

    // FSM: if stuck in targeting state (e.g. player cancelled implicitly), reset it
    if (this.fsm.is(BattleState.PLAYER_INPUT_TARGETING)) {
      this._pendingAction = null;
      this.fsm.transition(BattleState.PLAYER_INPUT_ACTION);
    }

    // FSM: start of new turn
    this.fsm.transition(BattleState.TURN_START);
    this.updateCombatState();

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
   * Tick status effects for a character at the start of their turn.
   * Applies per-turn effects (poison/burn/regen) and decrements duration.
   * Removes expired effects.
   */
  tickStatusEffects(character) {
    if (!Array.isArray(character.statusEffects) || character.statusEffects.length === 0) return;

    const messages = [];
    const remaining = [];

    for (const effect of character.statusEffects) {
      // Per-turn damage/healing
      switch (effect.type) {
        case 'poison':
        case 'burn': {
          const dmg = Math.max(1, Math.floor(effect.value ?? 5));
          if (typeof character.takeDamage === 'function') character.takeDamage(dmg);
          messages.push(`${character.name} takes ${dmg} ${effect.type} damage`);
          break;
        }
        case 'regen': {
          const hp = Math.max(1, Math.floor(effect.value ?? 5));
          if (typeof character.heal === 'function') character.heal(hp);
          messages.push(`${character.name} regenerates ${hp} HP`);
          break;
        }
        default:
          break;
      }

      // Decrement duration
      effect.duration = (effect.duration ?? 1) - 1;
      if (effect.duration > 0) {
        remaining.push(effect);
      }
    }

    character.statusEffects = remaining;

    if (messages.length > 0) {
      this.emitCombatEvent('statusEffectTick', { character, messages });
    }
  }

  /**
   * Decrement skill cooldowns for a character at the start of their turn.
   */
  tickSkillCooldowns(character) {
    if (!Array.isArray(character.skills)) return;
    for (const skill of character.skills) {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown--;
      }
    }
  }

  /**
   * Update combat state based on current character
   */
  updateCombatState() {
    if (!this.currentCharacter) return;

    const isPlayerCharacter = this.playerParty.hasCharacter(this.currentCharacter.id);

    if (isPlayerCharacter) {
      this.combatState = 'PLAYER_TURN';
      // FSM: player is now choosing an action
      if (this.fsm.isOneOf(BattleState.TURN_START, BattleState.TURN_END)) {
        this.fsm.transition(BattleState.PLAYER_INPUT_ACTION);
      }
    } else {
      this.combatState = 'ENEMY_TURN';
      // FSM: enemy turn goes straight to resolution (AI decides immediately)
      if (this.fsm.isOneOf(BattleState.TURN_START, BattleState.TURN_END)) {
        this.fsm.transition(BattleState.ACTION_RESOLUTION);
      }
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

    // FSM: terminal states
    if (result === 'victory') {
      this.fsm.transition(BattleState.VICTORY);
    } else if (result === 'defeat') {
      this.fsm.transition(BattleState.DEFEAT);
    } else {
      // fled, etc. — reset FSM
      this.fsm.reset();
    }

    // Clear status effects from all combatants
    const allCombatants = [
      ...(this.playerParty?.getAliveMembers() ?? []),
      ...this.enemies
    ];
    for (const c of allCombatants) {
      if (Array.isArray(c.statusEffects)) c.statusEffects = [];
    }

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

    // Notify campaign manager — include isBossVictory flag for phase triggers
    if (result === 'victory') {
      const isBossVictory = this.enemies.some(e => e.tier === 'boss');
      window.dispatchEvent(new CustomEvent(
        'combat:encounter_complete',
        { detail: { victory: true, isBossVictory, enemies: this.enemies, loot: rewards?.loot ?? [] } }
      ));
    }
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
    
    // Validate AP cost (use ?? so 0-cost actions like flee are preserved)
    const apCost = action.apCost ?? 1;
    if (!character.hasAP || !character.hasAP(apCost)) {
      console.warn('Insufficient AP for action');
      return { success: false, error: 'Insufficient AP' };
    }
    
    // FSM: enter ACTION_RESOLUTION — blocks all player input
    this.fsm.transition(BattleState.ACTION_RESOLUTION);

    // Sequenced execution: visual steps + logic via BattleActionExecutor
    const resolution = await this.battleExecutor.execute(
      action, character, targets, this.playerParty, this.enemies
    );

    if (resolution.success) {
      if (character.useAP) {
        character.useAP(apCost);
      } else {
        character.currentAP -= apCost;
      }

      this.emitCombatEvent('actionExecuted', {
        character,
        action,
        result: resolution.executionResult,
        messages: resolution.executionResult?.messages ?? []
      });

      this.updateTurnOrder();

      const effects = resolution.executionResult?.effects ?? [];
      if (effects.some(e => e.type === 'flee_success')) {
        this.fsm.transition(BattleState.TURN_END);
        this.endCombat('fled', null);
        return resolution;
      }

      const endCondition = this.checkCombatEnd();
      if (endCondition) {
        let rewards = null;
        if (endCondition === 'victory') {
          try { rewards = this.calculateRewards(); } catch (e) { console.error('calculateRewards failed:', e); }
        }
        this.fsm.transition(BattleState.TURN_END);
        this.endCombat(endCondition, rewards);
      } else {
        // FSM: resolution done → TURN_END
        this.fsm.transition(BattleState.TURN_END);
        if (character.currentAP <= 0) {
          this.nextTurn();
        } else {
          // Player has AP remaining — back to choosing action
          this.fsm.transition(BattleState.TURN_START);
          this.updateCombatState();
        }
      }
    } else {
      // Action failed — return to input without consuming turn
      this.fsm.transition(BattleState.TURN_END);
      this.fsm.transition(BattleState.TURN_START);
      this.updateCombatState();
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
  getAvailableActions(character, inventorySystem = null) {
    return this.actionSystem.getAvailableActions(character, inventorySystem);
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
        maxAP: this.currentCharacter.maxAP || 3
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
      type: enemy.type || 'unknown',
      level: enemy.level || 1,
      currentHP: enemy.currentHP,
      maxHP: enemy.maxHP,
      currentAP: enemy.currentAP ?? 0,
      maxAP: enemy.maxAP ?? 3,
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
   * Handle enemy turn with AI decision-making.
   * NOTE: processAction() already calls nextTurn() when the character's AP hits 0.
   * This method must NOT call nextTurn() itself — only re-enter for multi-AP actions.
   */
  async handleEnemyTurn() {
    if (!this.currentCharacter || this.combatState !== 'ENEMY_TURN') {
      return;
    }

    const enemy = this.currentCharacter;

    if (this.animationsEnabled) await this.delay(500);

    const aiDecision = this.getAIActionWithFallback(enemy);

    if (!aiDecision) {
      console.warn(`${enemy.name} has no valid AI decision, skipping turn`);
      this.skipTurn();
      return;
    }

    console.log(`${enemy.name} AI decision:`, aiDecision);

    const result = await this.executeAIAction(enemy, aiDecision);

    if (!result?.success) {
      // Action failed — skip remaining AP to prevent infinite loop
      if (enemy === this.currentCharacter && this.isActive) {
        this.skipTurn();
      }
      return;
    }

    // If enemy still has AP and is still the active combatant, take another action.
    // processAction already called nextTurn() when AP hit 0, so we only schedule
    // another handleEnemyTurn when AP > 0.
    if (enemy.currentAP > 0 && enemy === this.currentCharacter && this.isActive && this.combatState === 'ENEMY_TURN') {
      const delay = this.animationsEnabled ? 800 : 0;
      setTimeout(() => this.handleEnemyTurn(), delay);
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
    if (this.animationsEnabled) await this.delay(300);

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
    if (this.animationsEnabled) await this.delay(500);
    
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
  /**
   * Enter targeting mode for a player action that requires a target.
   * Call this instead of processAction when the action needs target selection.
   */
  /** Called by main.js so BattleGrid can add meshes to the live scene. */
  setScene(scene) {
    this._scene = scene;
  }

  _placeCombatantsOnGrid() {
    if (!this._scene) return;
    const members = this.playerParty.getAliveMembers();
    // Position grid centred in front of the camera (approx dungeon origin)
    this.battleGrid.setOrigin(-BattleGrid.COLS * BattleGrid.CELL * 0.5, 4);
    this.battleGrid.placeEntities(members, this.enemies, this._scene);
    // Pass entity registry to executor so visual methods resolve correctly
    this.battleExecutor.setVisualSystems({ entityRegistry: this.battleGrid.entities });
  }

  enterTargeting(action) {
    if (!this.fsm.is(BattleState.PLAYER_INPUT_ACTION)) return false;
    this._pendingAction = action;
    return this.fsm.transition(BattleState.PLAYER_INPUT_TARGETING, { action });
  }

  /**
   * Cancel targeting — returns to action selection without AP cost.
   */
  cancelTargeting() {
    if (!this.fsm.is(BattleState.PLAYER_INPUT_TARGETING)) return false;
    this._pendingAction = null;
    return this.fsm.transition(BattleState.PLAYER_INPUT_ACTION);
  }

  /**
   * Confirm target selection and execute the pending action.
   */
  async confirmTargeting(targets) {
    if (!this.fsm.is(BattleState.PLAYER_INPUT_TARGETING) || !this._pendingAction) return null;
    const action = this._pendingAction;
    this._pendingAction = null;
    return this.processAction(this.currentCharacter, action, targets);
  }

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
    this._pendingAction = null;
    this.fsm.reset();

    console.log('CombatSystem reset');
  }
}