/**
 * AIActionValidator - Validates AI actions and provides fallback behaviors
 * Ensures AI actions are legal and handles edge cases
 */

export class AIActionValidator {
  constructor() {
    this.validationRules = this.initializeValidationRules();
  }

  /**
   * Initialize validation rules for different action types
   * @returns {Object} Validation rules configuration
   */
  initializeValidationRules() {
    return {
      'attack': {
        requiresTarget: true,
        targetMustBeAlive: true,
        targetMustBeEnemy: true,
        minAP: 1
      },
      'skill': {
        requiresTarget: true,
        targetMustBeAlive: true,
        checkSkillRequirements: true,
        minAP: 1
      },
      'defend': {
        requiresTarget: false,
        targetSelf: true,
        minAP: 1
      },
      'item': {
        requiresTarget: true,
        checkInventory: true,
        minAP: 1
      },
      'flee': {
        requiresTarget: false,
        playerOnly: true,
        minAP: 2
      }
    };
  }

  /**
   * Validate an AI action before execution
   * @param {Object} enemy - Enemy performing action
   * @param {Object} action - Action to validate
   * @param {Object|Array} target - Target(s) for action
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - All enemies in combat
   * @returns {Object} Validation result
   */
  validateAction(enemy, action, target, playerParty, enemies) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestedFallback: null
    };

    // Basic enemy state validation
    if (!this.validateEnemyState(enemy, result)) {
      return result;
    }

    // Action structure validation
    if (!this.validateActionStructure(action, result)) {
      return result;
    }

    // AP cost validation
    if (!this.validateAPCost(enemy, action, result)) {
      return result;
    }

    // Target validation
    if (!this.validateTarget(action, target, playerParty, enemies, result)) {
      return result;
    }

    // Action-specific validation
    if (!this.validateActionSpecific(enemy, action, target, result)) {
      return result;
    }

    return result;
  }

  /**
   * Validate enemy state
   * @param {Object} enemy - Enemy to validate
   * @param {Object} result - Validation result object
   * @returns {boolean} True if enemy state is valid
   */
  validateEnemyState(enemy, result) {
    if (!enemy) {
      result.isValid = false;
      result.errors.push('Enemy is null or undefined');
      return false;
    }

    if (!enemy.isAlive()) {
      result.isValid = false;
      result.errors.push('Enemy is not alive');
      return false;
    }

    if (enemy.currentAP <= 0) {
      result.isValid = false;
      result.errors.push('Enemy has no AP remaining');
      return false;
    }

    return true;
  }

  /**
   * Validate action structure
   * @param {Object} action - Action to validate
   * @param {Object} result - Validation result object
   * @returns {boolean} True if action structure is valid
   */
  validateActionStructure(action, result) {
    if (!action) {
      result.isValid = false;
      result.errors.push('Action is null or undefined');
      return false;
    }

    if (!action.type) {
      result.isValid = false;
      result.errors.push('Action missing type');
      return false;
    }

    if (!action.id || !action.name) {
      result.warnings.push('Action missing id or name');
    }

    return true;
  }

  /**
   * Validate AP cost
   * @param {Object} enemy - Enemy performing action
   * @param {Object} action - Action to validate
   * @param {Object} result - Validation result object
   * @returns {boolean} True if AP cost is valid
   */
  validateAPCost(enemy, action, result) {
    const apCost = action.apCost || 1;
    
    if (apCost > enemy.currentAP) {
      result.isValid = false;
      result.errors.push(`Insufficient AP: need ${apCost}, have ${enemy.currentAP}`);
      return false;
    }

    if (apCost <= 0) {
      result.warnings.push('Action has zero or negative AP cost');
    }

    return true;
  }

  /**
   * Validate target selection
   * @param {Object} action - Action being performed
   * @param {Object|Array} target - Target(s) to validate
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - All enemies in combat
   * @param {Object} result - Validation result object
   * @returns {boolean} True if target is valid
   */
  validateTarget(action, target, playerParty, enemies, result) {
    const rules = this.validationRules[action.type];
    
    if (!rules) {
      result.warnings.push(`No validation rules for action type: ${action.type}`);
      return true; // Allow unknown action types
    }

    // Check if target is required
    if (rules.requiresTarget && !target) {
      result.isValid = false;
      result.errors.push('Action requires a target');
      return false;
    }

    // Validate target based on action type
    if (target) {
      return this.validateTargetByType(action, target, playerParty, enemies, result);
    }

    return true;
  }

  /**
   * Validate target based on action targeting type
   * @param {Object} action - Action being performed
   * @param {Object|Array} target - Target(s) to validate
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - All enemies in combat
   * @param {Object} result - Validation result object
   * @returns {boolean} True if target type is valid
   */
  validateTargetByType(action, target, playerParty, enemies, result) {
    const targetType = action.targetType || 'single_enemy';
    
    switch (targetType) {
      case 'single_enemy':
        return this.validateSingleEnemyTarget(target, playerParty, result);
      
      case 'all_enemies':
        return this.validateAllEnemiesTarget(target, playerParty, result);
      
      case 'single_ally':
        return this.validateSingleAllyTarget(target, enemies, result);
      
      case 'all_allies':
        return this.validateAllAlliesTarget(target, enemies, result);
      
      case 'self':
        return this.validateSelfTarget(target, result);
      
      default:
        result.warnings.push(`Unknown target type: ${targetType}`);
        return true;
    }
  }

  /**
   * Validate single enemy target
   * @param {Object} target - Target to validate
   * @param {Object} playerParty - Player party manager
   * @param {Object} result - Validation result object
   * @returns {boolean} True if target is valid
   */
  validateSingleEnemyTarget(target, playerParty, result) {
    if (Array.isArray(target)) {
      result.isValid = false;
      result.errors.push('Single target expected, got array');
      return false;
    }

    if (!target.isAlive || !target.isAlive()) {
      result.isValid = false;
      result.errors.push('Target is not alive');
      return false;
    }

    // Check if target is actually a player character
    if (!playerParty.hasCharacter(target.id)) {
      result.isValid = false;
      result.errors.push('Target is not a player character');
      return false;
    }

    return true;
  }

  /**
   * Validate all enemies target
   * @param {Array} targets - Targets to validate
   * @param {Object} playerParty - Player party manager
   * @param {Object} result - Validation result object
   * @returns {boolean} True if targets are valid
   */
  validateAllEnemiesTarget(targets, playerParty, result) {
    if (!Array.isArray(targets)) {
      result.isValid = false;
      result.errors.push('All enemies target must be an array');
      return false;
    }

    const aliveMembers = playerParty.getAliveMembers();
    if (targets.length !== aliveMembers.length) {
      result.warnings.push('Target array length does not match alive party members');
    }

    for (const target of targets) {
      if (!target.isAlive || !target.isAlive()) {
        result.warnings.push('Some targets in array are not alive');
        break;
      }
    }

    return true;
  }

  /**
   * Validate single ally target
   * @param {Object} target - Target to validate
   * @param {Array} enemies - All enemies in combat
   * @param {Object} result - Validation result object
   * @returns {boolean} True if target is valid
   */
  validateSingleAllyTarget(target, enemies, result) {
    if (Array.isArray(target)) {
      result.isValid = false;
      result.errors.push('Single ally target expected, got array');
      return false;
    }

    if (!target.isAlive || !target.isAlive()) {
      result.isValid = false;
      result.errors.push('Ally target is not alive');
      return false;
    }

    // Check if target is actually an enemy (ally to the acting enemy)
    const isAlly = enemies.some(enemy => enemy.id === target.id);
    if (!isAlly) {
      result.isValid = false;
      result.errors.push('Target is not an ally');
      return false;
    }

    return true;
  }

  /**
   * Validate all allies target
   * @param {Array} targets - Targets to validate
   * @param {Array} enemies - All enemies in combat
   * @param {Object} result - Validation result object
   * @returns {boolean} True if targets are valid
   */
  validateAllAlliesTarget(targets, enemies, result) {
    if (!Array.isArray(targets)) {
      result.isValid = false;
      result.errors.push('All allies target must be an array');
      return false;
    }

    const aliveEnemies = enemies.filter(enemy => enemy.isAlive());
    if (targets.length > aliveEnemies.length) {
      result.warnings.push('More targets than alive allies');
    }

    return true;
  }

  /**
   * Validate self target
   * @param {Object} target - Target to validate
   * @param {Object} result - Validation result object
   * @returns {boolean} True if target is valid
   */
  validateSelfTarget(target, result) {
    if (Array.isArray(target)) {
      result.isValid = false;
      result.errors.push('Self target should not be an array');
      return false;
    }

    if (!target.isAlive || !target.isAlive()) {
      result.isValid = false;
      result.errors.push('Self target is not alive');
      return false;
    }

    return true;
  }

  /**
   * Validate action-specific requirements
   * @param {Object} enemy - Enemy performing action
   * @param {Object} action - Action to validate
   * @param {Object|Array} target - Target(s) for action
   * @param {Object} result - Validation result object
   * @returns {boolean} True if action-specific validation passes
   */
  validateActionSpecific(enemy, action, target, result) {
    switch (action.type) {
      case 'skill':
        return this.validateSkillAction(enemy, action, result);
      
      case 'item':
        return this.validateItemAction(enemy, action, result);
      
      case 'flee':
        return this.validateFleeAction(enemy, action, result);
      
      default:
        return true; // No specific validation needed
    }
  }

  /**
   * Validate skill action
   * @param {Object} enemy - Enemy performing skill
   * @param {Object} action - Skill action
   * @param {Object} result - Validation result object
   * @returns {boolean} True if skill is valid
   */
  validateSkillAction(enemy, action, result) {
    if (!action.skillData) {
      result.warnings.push('Skill action missing skill data');
      return true; // Allow it but warn
    }

    // Check if enemy has the skill
    if (enemy.skills) {
      const hasSkill = enemy.skills.some(skill => skill.id === action.id);
      if (!hasSkill) {
        result.isValid = false;
        result.errors.push(`Enemy does not have skill: ${action.id}`);
        return false;
      }
    }

    // Check skill cooldown (if implemented)
    if (action.skillData.cooldown && action.skillData.currentCooldown > 0) {
      result.isValid = false;
      result.errors.push(`Skill is on cooldown: ${action.skillData.currentCooldown} turns remaining`);
      return false;
    }

    return true;
  }

  /**
   * Validate item action
   * @param {Object} enemy - Enemy using item
   * @param {Object} action - Item action
   * @param {Object} result - Validation result object
   * @returns {boolean} True if item usage is valid
   */
  validateItemAction(enemy, action, result) {
    // Enemies typically don't use items, but allow for special cases
    result.warnings.push('Enemy attempting to use item - unusual behavior');
    return true;
  }

  /**
   * Validate flee action
   * @param {Object} enemy - Enemy attempting to flee
   * @param {Object} action - Flee action
   * @param {Object} result - Validation result object
   * @returns {boolean} True if flee is valid
   */
  validateFleeAction(enemy, action, result) {
    // Enemies typically don't flee, but allow for special cases
    result.warnings.push('Enemy attempting to flee - unusual behavior');
    return true;
  }

  /**
   * Generate fallback action for invalid AI decision
   * @param {Object} enemy - Enemy needing fallback
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - All enemies in combat
   * @returns {Object|null} Fallback action or null
   */
  generateFallbackAction(enemy, playerParty, enemies) {
    // Try basic attack first
    const aliveMembers = playerParty.getAliveMembers();
    if (aliveMembers.length > 0 && enemy.hasAP(1)) {
      const randomTarget = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
      
      return {
        action: {
          id: 'basic_attack',
          name: 'Attack',
          type: 'attack',
          apCost: 1,
          targetType: 'single_enemy',
          effects: ['damage']
        },
        target: randomTarget,
        score: 0.1,
        isFallback: true
      };
    }

    // Try defend if can't attack
    if (enemy.hasAP(1)) {
      return {
        action: {
          id: 'defend',
          name: 'Defend',
          type: 'defend',
          apCost: 1,
          targetType: 'self',
          effects: ['defense_boost']
        },
        target: enemy,
        score: 0.05,
        isFallback: true
      };
    }

    // No valid actions available
    return null;
  }
}