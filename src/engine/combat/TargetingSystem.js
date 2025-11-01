/**
 * TargetingSystem - Handles target selection and validation for combat actions
 * Supports single, AoE, and ally targeting with range restrictions
 */

export class TargetingSystem {
  constructor() {
    console.log('TargetingSystem initialized');
  }

  /**
   * Get valid targets for an action
   * @param {Object} action - Action being performed
   * @param {Object} caster - Character performing the action
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - Array of enemies
   * @returns {Array} Array of valid target objects
   */
  getValidTargets(action, caster, playerParty, enemies) {
    const targets = [];
    const isPlayerCharacter = playerParty.hasCharacter(caster.id);
    
    switch (action.targetType) {
      case 'single_enemy':
        return this.getSingleEnemyTargets(isPlayerCharacter, playerParty, enemies);
      
      case 'single_ally':
        return this.getSingleAllyTargets(isPlayerCharacter, playerParty, enemies);
      
      case 'all_enemies':
        return this.getAllEnemyTargets(isPlayerCharacter, playerParty, enemies);
      
      case 'all_allies':
        return this.getAllAllyTargets(isPlayerCharacter, playerParty, enemies);
      
      case 'front_row_enemies':
        return this.getFrontRowEnemyTargets(isPlayerCharacter, playerParty, enemies);
      
      case 'back_row_enemies':
        return this.getBackRowEnemyTargets(isPlayerCharacter, playerParty, enemies);
      
      case 'self':
        return [caster];
      
      case 'none':
        return [];
      
      default:
        console.warn(`Unknown target type: ${action.targetType}`);
        return [];
    }
  }

  /**
   * Get single enemy targets
   * @param {boolean} isPlayerCharacter - Is the caster a player character
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - Array of enemies
   * @returns {Array} Valid enemy targets
   */
  getSingleEnemyTargets(isPlayerCharacter, playerParty, enemies) {
    if (isPlayerCharacter) {
      // Player targeting enemies
      return enemies.filter(enemy => enemy.isAlive());
    } else {
      // Enemy targeting player characters
      return playerParty.getAliveMembers();
    }
  }

  /**
   * Get single ally targets
   * @param {boolean} isPlayerCharacter - Is the caster a player character
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - Array of enemies
   * @returns {Array} Valid ally targets
   */
  getSingleAllyTargets(isPlayerCharacter, playerParty, enemies) {
    if (isPlayerCharacter) {
      // Player targeting allies (including self)
      return playerParty.party.filter(char => char && char.isAlive());
    } else {
      // Enemy targeting other enemies
      return enemies.filter(enemy => enemy.isAlive());
    }
  }

  /**
   * Get all enemy targets
   * @param {boolean} isPlayerCharacter - Is the caster a player character
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - Array of enemies
   * @returns {Array} All enemy targets
   */
  getAllEnemyTargets(isPlayerCharacter, playerParty, enemies) {
    if (isPlayerCharacter) {
      return enemies.filter(enemy => enemy.isAlive());
    } else {
      return playerParty.getAliveMembers();
    }
  }

  /**
   * Get all ally targets
   * @param {boolean} isPlayerCharacter - Is the caster a player character
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - Array of enemies
   * @returns {Array} All ally targets
   */
  getAllAllyTargets(isPlayerCharacter, playerParty, enemies) {
    if (isPlayerCharacter) {
      return playerParty.party.filter(char => char && char.isAlive());
    } else {
      return enemies.filter(enemy => enemy.isAlive());
    }
  }

  /**
   * Get front row enemy targets
   * @param {boolean} isPlayerCharacter - Is the caster a player character
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - Array of enemies
   * @returns {Array} Front row enemy targets
   */
  getFrontRowEnemyTargets(isPlayerCharacter, playerParty, enemies) {
    if (isPlayerCharacter) {
      // Target front row enemies (first 2 positions)
      return enemies.filter((enemy, index) => index < 2 && enemy.isAlive());
    } else {
      // Target player front row
      return playerParty.formation.frontRow.filter(char => char.isAlive());
    }
  }

  /**
   * Get back row enemy targets
   * @param {boolean} isPlayerCharacter - Is the caster a player character
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - Array of enemies
   * @returns {Array} Back row enemy targets
   */
  getBackRowEnemyTargets(isPlayerCharacter, playerParty, enemies) {
    if (isPlayerCharacter) {
      // Target back row enemies (positions 2+)
      return enemies.filter((enemy, index) => index >= 2 && enemy.isAlive());
    } else {
      // Target player back row
      return playerParty.formation.backRow.filter(char => char.isAlive());
    }
  }

  /**
   * Validate target selection
   * @param {Object} action - Action being performed
   * @param {Object} caster - Character performing the action
   * @param {Object|Array} selectedTargets - Selected target(s)
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - Array of enemies
   * @returns {Object} Validation result
   */
  validateTargets(action, caster, selectedTargets, playerParty, enemies) {
    const validation = {
      isValid: true,
      errors: [],
      validTargets: []
    };

    // Get valid targets for this action
    const validTargets = this.getValidTargets(action, caster, playerParty, enemies);
    
    // Convert selected targets to array
    const targetArray = Array.isArray(selectedTargets) ? selectedTargets : [selectedTargets];
    
    // Check if action requires targets
    if (action.targetType === 'none') {
      validation.validTargets = [];
      return validation;
    }

    // Check if targets were provided when required
    if (validTargets.length > 0 && targetArray.length === 0) {
      validation.isValid = false;
      validation.errors.push('Action requires target selection');
      return validation;
    }

    // Validate each selected target
    for (const target of targetArray) {
      if (!target) {
        validation.errors.push('Invalid target: null or undefined');
        continue;
      }

      // Check if target is in valid targets list
      const isValidTarget = validTargets.some(validTarget => 
        validTarget.id === target.id
      );

      if (!isValidTarget) {
        validation.errors.push(`Invalid target: ${target.name || target.id}`);
        continue;
      }

      // Check if target is alive (for most actions)
      if (action.type !== 'resurrect' && !target.isAlive()) {
        validation.errors.push(`Target is not alive: ${target.name || target.id}`);
        continue;
      }

      // Check range restrictions
      const rangeCheck = this.checkRange(action, caster, target, playerParty);
      if (!rangeCheck.inRange) {
        validation.errors.push(`Target out of range: ${target.name || target.id}`);
        continue;
      }

      validation.validTargets.push(target);
    }

    // Check target count requirements
    const targetCountCheck = this.validateTargetCount(action, validation.validTargets);
    if (!targetCountCheck.isValid) {
      validation.isValid = false;
      validation.errors.push(...targetCountCheck.errors);
    }

    // Set overall validity
    validation.isValid = validation.errors.length === 0;

    return validation;
  }

  /**
   * Check if target is in range
   * @param {Object} action - Action being performed
   * @param {Object} caster - Character performing the action
   * @param {Object} target - Target to check
   * @param {Object} playerParty - Player party manager
   * @returns {Object} Range check result
   */
  checkRange(action, caster, target, playerParty) {
    const result = {
      inRange: true,
      distance: 0,
      maxRange: this.getActionRange(action)
    };

    // Most actions have unlimited range in turn-based combat
    // Range restrictions mainly apply to formation-based targeting
    
    const casterIsPlayer = playerParty.hasCharacter(caster.id);
    const targetIsPlayer = playerParty.hasCharacter(target.id);
    
    // Check if targeting across battle lines (player vs enemy)
    if (casterIsPlayer !== targetIsPlayer) {
      // Cross-battle targeting is always allowed
      result.distance = 1;
      return result;
    }

    // Same-side targeting (ally abilities)
    result.distance = 0; // Same side, no distance restriction
    return result;
  }

  /**
   * Get action range
   * @param {Object} action - Action to check
   * @returns {number} Maximum range (0 = unlimited)
   */
  getActionRange(action) {
    const ranges = {
      'basic_attack': 0, // Unlimited in turn-based
      'defend': 0,
      'flee': 0,
      'use_item': 0
    };

    return ranges[action.id] || 0; // Default unlimited range
  }

  /**
   * Validate target count requirements
   * @param {Object} action - Action being performed
   * @param {Array} targets - Selected targets
   * @returns {Object} Validation result
   */
  validateTargetCount(action, targets) {
    const validation = {
      isValid: true,
      errors: []
    };

    const requirements = this.getTargetCountRequirements(action);
    
    if (targets.length < requirements.min) {
      validation.isValid = false;
      validation.errors.push(
        `Action requires at least ${requirements.min} target(s), got ${targets.length}`
      );
    }

    if (targets.length > requirements.max) {
      validation.isValid = false;
      validation.errors.push(
        `Action allows maximum ${requirements.max} target(s), got ${targets.length}`
      );
    }

    return validation;
  }

  /**
   * Get target count requirements for an action
   * @param {Object} action - Action to check
   * @returns {Object} Min/max target requirements
   */
  getTargetCountRequirements(action) {
    const requirements = {
      'single_enemy': { min: 1, max: 1 },
      'single_ally': { min: 1, max: 1 },
      'all_enemies': { min: 0, max: 99 }, // Variable based on available enemies
      'all_allies': { min: 0, max: 99 }, // Variable based on available allies
      'front_row_enemies': { min: 0, max: 99 },
      'back_row_enemies': { min: 0, max: 99 },
      'self': { min: 1, max: 1 },
      'none': { min: 0, max: 0 }
    };

    return requirements[action.targetType] || { min: 0, max: 1 };
  }

  /**
   * Auto-select targets for AoE actions
   * @param {Object} action - Action being performed
   * @param {Object} caster - Character performing the action
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - Array of enemies
   * @returns {Array} Auto-selected targets
   */
  autoSelectTargets(action, caster, playerParty, enemies) {
    const validTargets = this.getValidTargets(action, caster, playerParty, enemies);
    
    switch (action.targetType) {
      case 'all_enemies':
      case 'all_allies':
      case 'front_row_enemies':
      case 'back_row_enemies':
        return validTargets; // Return all valid targets for AoE
      
      case 'self':
        return [caster];
      
      case 'none':
        return [];
      
      default:
        return []; // Single target actions require manual selection
    }
  }

  /**
   * Get targeting information for UI
   * @param {Object} action - Action to get info for
   * @param {Object} caster - Character performing the action
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - Array of enemies
   * @returns {Object} Targeting information
   */
  getTargetingInfo(action, caster, playerParty, enemies) {
    const validTargets = this.getValidTargets(action, caster, playerParty, enemies);
    const requirements = this.getTargetCountRequirements(action);
    
    return {
      targetType: action.targetType,
      validTargets: validTargets.map(target => ({
        id: target.id,
        name: target.name,
        type: playerParty.hasCharacter(target.id) ? 'ally' : 'enemy',
        isAlive: target.isAlive(),
        currentHP: target.currentHP,
        maxHP: target.maxHP
      })),
      requiresSelection: !this.isAutoTargeting(action.targetType),
      minTargets: requirements.min,
      maxTargets: requirements.max,
      description: this.getTargetingDescription(action.targetType)
    };
  }

  /**
   * Check if action type uses auto-targeting
   * @param {string} targetType - Target type to check
   * @returns {boolean} True if auto-targeting
   */
  isAutoTargeting(targetType) {
    const autoTargetTypes = [
      'all_enemies',
      'all_allies', 
      'front_row_enemies',
      'back_row_enemies',
      'self',
      'none'
    ];
    
    return autoTargetTypes.includes(targetType);
  }

  /**
   * Get human-readable targeting description
   * @param {string} targetType - Target type
   * @returns {string} Description
   */
  getTargetingDescription(targetType) {
    const descriptions = {
      'single_enemy': 'Select one enemy',
      'single_ally': 'Select one ally',
      'all_enemies': 'Targets all enemies',
      'all_allies': 'Targets all allies',
      'front_row_enemies': 'Targets front row enemies',
      'back_row_enemies': 'Targets back row enemies',
      'self': 'Targets self',
      'none': 'No target required'
    };
    
    return descriptions[targetType] || 'Unknown targeting';
  }

  /**
   * Apply formation effects to targeting
   * @param {Array} targets - Original targets
   * @param {Object} playerParty - Player party manager
   * @returns {Array} Targets with formation effects applied
   */
  applyFormationEffects(targets, playerParty) {
    return targets.map(target => {
      if (playerParty.hasCharacter(target.id)) {
        const formationEffects = playerParty.getFormationEffects(target);
        return {
          ...target,
          formationEffects: formationEffects
        };
      }
      return target;
    });
  }
}