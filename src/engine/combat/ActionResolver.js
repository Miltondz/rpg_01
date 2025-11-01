/**
 * ActionResolver - Handles complete action resolution including validation, execution, and effects
 * Coordinates between targeting, action execution, and animation systems
 */

import { TargetingSystem } from './TargetingSystem.js';

export class ActionResolver {
  constructor(actionSystem) {
    this.actionSystem = actionSystem;
    this.targetingSystem = new TargetingSystem();
    
    // Animation and effect queues
    this.animationQueue = [];
    this.effectQueue = [];
    
    console.log('ActionResolver initialized');
  }

  /**
   * Resolve a complete action from start to finish
   * @param {Object} action - Action to resolve
   * @param {Object} caster - Character performing the action
   * @param {Object|Array} selectedTargets - Selected target(s)
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - Array of enemies
   * @returns {Promise<Object>} Complete action resolution result
   */
  async resolveAction(action, caster, selectedTargets, playerParty, enemies) {
    const resolution = {
      success: false,
      action: action,
      caster: caster,
      selectedTargets: selectedTargets,
      validationResult: null,
      executionResult: null,
      animationResults: [],
      finalTargets: [],
      errors: []
    };

    try {
      // Step 1: Validate action and targets
      console.log(`Resolving action: ${action.name} by ${caster.name}`);
      
      const validation = this.validateAction(action, caster, selectedTargets, playerParty, enemies);
      resolution.validationResult = validation;
      
      if (!validation.isValid) {
        resolution.errors.push(...validation.errors);
        return resolution;
      }

      // Step 2: Determine final targets (handle auto-targeting)
      const finalTargets = this.determineFinalTargets(action, caster, selectedTargets, playerParty, enemies);
      resolution.finalTargets = finalTargets;

      // Step 3: Execute the action
      const executionResult = this.actionSystem.executeAction(action, caster, finalTargets);
      resolution.executionResult = executionResult;

      // Step 4: Process animations and visual effects
      const animationResults = await this.processAnimations(executionResult, caster, finalTargets);
      resolution.animationResults = animationResults;

      // Step 5: Apply status effects and cleanup
      this.processStatusEffects(executionResult);

      resolution.success = true;
      console.log(`Action resolved successfully: ${action.name}`);

    } catch (error) {
      console.error('Error resolving action:', error);
      resolution.errors.push(`Action resolution failed: ${error.message}`);
    }

    return resolution;
  }

  /**
   * Validate action and targets
   * @param {Object} action - Action to validate
   * @param {Object} caster - Character performing the action
   * @param {Object|Array} selectedTargets - Selected target(s)
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - Array of enemies
   * @returns {Object} Validation result
   */
  validateAction(action, caster, selectedTargets, playerParty, enemies) {
    const validation = {
      isValid: true,
      errors: []
    };

    // Validate caster state
    if (!caster.isAlive()) {
      validation.isValid = false;
      validation.errors.push('Caster is not alive');
      return validation;
    }

    // Validate AP cost
    const apCost = action.apCost || 1;
    if (!caster.hasAP(apCost)) {
      validation.isValid = false;
      validation.errors.push(`Insufficient AP: need ${apCost}, have ${caster.currentAP}`);
      return validation;
    }

    // Validate targets using targeting system
    const targetValidation = this.targetingSystem.validateTargets(
      action, caster, selectedTargets, playerParty, enemies
    );

    if (!targetValidation.isValid) {
      validation.isValid = false;
      validation.errors.push(...targetValidation.errors);
    }

    // Validate skill-specific requirements
    if (action.type === 'skill') {
      const skillValidation = this.validateSkillRequirements(action, caster);
      if (!skillValidation.isValid) {
        validation.isValid = false;
        validation.errors.push(...skillValidation.errors);
      }
    }

    return validation;
  }

  /**
   * Validate skill-specific requirements
   * @param {Object} action - Skill action
   * @param {Object} caster - Character casting the skill
   * @returns {Object} Validation result
   */
  validateSkillRequirements(action, caster) {
    const validation = {
      isValid: true,
      errors: []
    };

    const skill = action.skillData;
    if (!skill) {
      validation.isValid = false;
      validation.errors.push('Skill data not found');
      return validation;
    }

    // Check if character has the skill
    if (!caster.hasSkill(skill.id)) {
      validation.isValid = false;
      validation.errors.push(`Character does not have skill: ${skill.name}`);
    }

    // Check cooldown (if skill system tracks cooldowns)
    if (skill.cooldown && skill.currentCooldown > 0) {
      validation.isValid = false;
      validation.errors.push(`Skill is on cooldown: ${skill.currentCooldown} turns remaining`);
    }

    return validation;
  }

  /**
   * Determine final targets for the action
   * @param {Object} action - Action being performed
   * @param {Object} caster - Character performing the action
   * @param {Object|Array} selectedTargets - Selected target(s)
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - Array of enemies
   * @returns {Array} Final target array
   */
  determineFinalTargets(action, caster, selectedTargets, playerParty, enemies) {
    // Handle auto-targeting actions
    if (this.targetingSystem.isAutoTargeting(action.targetType)) {
      return this.targetingSystem.autoSelectTargets(action, caster, playerParty, enemies);
    }

    // Handle manual target selection
    const targetArray = Array.isArray(selectedTargets) ? selectedTargets : [selectedTargets];
    
    // Filter out invalid targets (dead, etc.)
    return targetArray.filter(target => {
      if (!target) return false;
      
      // Allow targeting dead allies for resurrection
      if (action.type === 'skill' && action.skillData && action.skillData.id === 'resurrect') {
        return !target.isAlive();
      }
      
      return target.isAlive();
    });
  }

  /**
   * Process animations and visual effects
   * @param {Object} executionResult - Result from action execution
   * @param {Object} caster - Character who performed the action
   * @param {Array} targets - Target array
   * @returns {Promise<Array>} Animation results
   */
  async processAnimations(executionResult, caster, targets) {
    const animationResults = [];

    try {
      // Caster animation (attack, cast, etc.)
      const casterAnimation = await this.playCasterAnimation(executionResult.action, caster);
      animationResults.push(casterAnimation);

      // Target animations (hit effects, damage numbers, etc.)
      for (const target of targets) {
        const targetAnimation = await this.playTargetAnimation(executionResult, target);
        animationResults.push(targetAnimation);
      }

      // Special effect animations
      if (executionResult.action.type === 'skill') {
        const skillEffects = await this.playSkillEffects(executionResult.action, caster, targets);
        animationResults.push(...skillEffects);
      }

    } catch (error) {
      console.warn('Animation processing failed:', error);
      // Continue without animations rather than failing the action
    }

    return animationResults;
  }

  /**
   * Play caster animation
   * @param {Object} action - Action being performed
   * @param {Object} caster - Character performing the action
   * @returns {Promise<Object>} Animation result
   */
  async playCasterAnimation(action, caster) {
    // Placeholder for animation system integration
    const animationType = this.getCasterAnimationType(action);
    
    console.log(`Playing ${animationType} animation for ${caster.name}`);
    
    // Simulate animation delay
    await this.delay(300);
    
    return {
      type: 'caster_animation',
      character: caster,
      animation: animationType,
      duration: 300
    };
  }

  /**
   * Play target animation
   * @param {Object} executionResult - Execution result
   * @param {Object} target - Target character
   * @returns {Promise<Object>} Animation result
   */
  async playTargetAnimation(executionResult, target) {
    const animations = [];
    
    // Damage animations
    for (const damageInfo of executionResult.damage || []) {
      if (damageInfo.target.id === target.id) {
        console.log(`Playing damage animation for ${target.name}: ${damageInfo.damage} damage`);
        
        // Damage number animation
        animations.push({
          type: 'damage_number',
          target: target,
          value: damageInfo.damage,
          isCritical: damageInfo.isCritical
        });
        
        // Hit effect animation
        animations.push({
          type: 'hit_effect',
          target: target,
          effectType: damageInfo.isCritical ? 'critical_hit' : 'normal_hit'
        });
      }
    }
    
    // Healing animations
    for (const healInfo of executionResult.healing || []) {
      if (healInfo.target.id === target.id) {
        console.log(`Playing healing animation for ${target.name}: ${healInfo.healing} healing`);
        
        animations.push({
          type: 'healing_number',
          target: target,
          value: healInfo.healing
        });
      }
    }
    
    // Status effect animations
    for (const statusInfo of executionResult.statusEffects || []) {
      if (statusInfo.target.id === target.id) {
        console.log(`Playing status effect animation for ${target.name}: ${statusInfo.effect.type}`);
        
        animations.push({
          type: 'status_effect',
          target: target,
          effect: statusInfo.effect
        });
      }
    }
    
    // Simulate animation delay
    await this.delay(200);
    
    return {
      type: 'target_animations',
      target: target,
      animations: animations
    };
  }

  /**
   * Play skill effect animations
   * @param {Object} action - Skill action
   * @param {Object} caster - Character casting the skill
   * @param {Array} targets - Target array
   * @returns {Promise<Array>} Skill effect results
   */
  async playSkillEffects(action, caster, targets) {
    const effects = [];
    const skill = action.skillData;
    
    if (!skill) return effects;
    
    console.log(`Playing skill effects for ${skill.name}`);
    
    // Determine effect type based on skill
    const effectType = this.getSkillEffectType(skill.id);
    
    effects.push({
      type: 'skill_effect',
      skill: skill,
      caster: caster,
      targets: targets,
      effectType: effectType
    });
    
    // Simulate effect duration
    await this.delay(500);
    
    return effects;
  }

  /**
   * Process status effects from action result
   * @param {Object} executionResult - Result from action execution
   */
  processStatusEffects(executionResult) {
    // Update status effect durations
    for (const statusInfo of executionResult.statusEffects || []) {
      const target = statusInfo.target;
      const effect = statusInfo.effect;
      
      console.log(`Applied ${effect.type} to ${target.name} for ${effect.duration} turns`);
      
      // Status effects are already added to target in ActionSystem
      // This is where we could add additional processing like stacking rules
    }
  }

  /**
   * Get caster animation type for action
   * @param {Object} action - Action being performed
   * @returns {string} Animation type
   */
  getCasterAnimationType(action) {
    const animationTypes = {
      'attack': 'melee_attack',
      'skill': 'cast_skill',
      'item': 'use_item',
      'defend': 'defend_stance',
      'flee': 'flee_attempt'
    };
    
    return animationTypes[action.type] || 'generic_action';
  }

  /**
   * Get skill effect type for animations
   * @param {string} skillId - Skill ID
   * @returns {string} Effect type
   */
  getSkillEffectType(skillId) {
    const effectTypes = {
      'fireball': 'fire_explosion',
      'ice_shard': 'ice_impact',
      'lightning_storm': 'lightning_strikes',
      'meteor': 'meteor_impact',
      'heal': 'healing_light',
      'mass_heal': 'area_healing',
      'bless': 'blessing_aura',
      'divine_shield': 'divine_barrier'
    };
    
    return effectTypes[skillId] || 'generic_skill';
  }

  /**
   * Utility function for animation delays
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get action resolution summary
   * @param {Object} resolution - Complete resolution result
   * @returns {Object} Summary for UI display
   */
  getResolutionSummary(resolution) {
    const summary = {
      success: resolution.success,
      actionName: resolution.action.name,
      casterName: resolution.caster.name,
      targetCount: resolution.finalTargets.length,
      totalDamage: 0,
      totalHealing: 0,
      statusEffectsApplied: 0,
      errors: resolution.errors
    };

    if (resolution.executionResult) {
      const result = resolution.executionResult;
      
      // Calculate totals
      summary.totalDamage = (result.damage || []).reduce((sum, d) => sum + d.damage, 0);
      summary.totalHealing = (result.healing || []).reduce((sum, h) => sum + h.healing, 0);
      summary.statusEffectsApplied = (result.statusEffects || []).length;
      
      // Add messages
      summary.messages = result.messages || [];
    }

    return summary;
  }

  /**
   * Clear animation and effect queues
   */
  clearQueues() {
    this.animationQueue = [];
    this.effectQueue = [];
  }
}