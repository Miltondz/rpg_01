/**
 * ActionSystem - Handles combat actions, damage calculations, and effects
 * Implements 5 action types: Attack, Skill, Item, Defend, Flee
 */

import { combatBalanceConfig } from '../balance/CombatBalanceConfig.js';

export class ActionSystem {
  constructor() {
    // Elemental effectiveness chart
    this.elementalChart = {
      'Fire': { 'Ice': 1.5, 'Fire': 0.5, 'Physical': 1.0 },
      'Ice': { 'Fire': 1.5, 'Ice': 0.5, 'Physical': 1.0 },
      'Physical': { 'Fire': 1.0, 'Ice': 1.0, 'Physical': 1.0 }
    };
    
    this.balanceConfig = combatBalanceConfig;
    
    console.log('ActionSystem initialized with balance configuration');
  }

  /**
   * Get available actions for a character
   * @param {Object} character - Character to get actions for
   * @returns {Array} Array of available actions
   */
  getAvailableActions(character) {
    const actions = [];
    
    // Basic Attack (always available)
    actions.push(this.getBasicAttackAction());
    
    // Skills (if character has any and enough AP)
    if (character.skills) {
      for (const skill of character.skills) {
        if (character.hasAP(skill.apCost)) {
          actions.push(this.getSkillAction(skill));
        }
      }
    }
    
    // Items (placeholder - would check inventory)
    actions.push(this.getItemAction());
    
    // Defend (always available)
    actions.push(this.getDefendAction());
    
    // Flee (always available for player characters)
    if (character.class) { // Player characters have class property
      actions.push(this.getFleeAction());
    }
    
    return actions;
  }

  /**
   * Get basic attack action
   * @returns {Object} Basic attack action
   */
  getBasicAttackAction() {
    return {
      id: 'basic_attack',
      name: 'Attack',
      type: 'attack',
      apCost: this.balanceConfig.getActionAPCost('basic_attack'),
      targetType: 'single_enemy',
      description: 'Basic physical attack',
      effects: ['damage']
    };
  }

  /**
   * Get skill action from skill data
   * @param {Object} skill - Skill data
   * @returns {Object} Skill action
   */
  getSkillAction(skill) {
    return {
      id: skill.id,
      name: skill.name,
      type: 'skill',
      apCost: skill.apCost,
      targetType: this.getSkillTargetType(skill),
      description: skill.description,
      effects: this.getSkillEffects(skill),
      skillData: skill
    };
  }

  /**
   * Get item action
   * @returns {Object} Item action
   */
  getItemAction() {
    return {
      id: 'use_item',
      name: 'Item',
      type: 'item',
      apCost: 1,
      targetType: 'single_ally',
      description: 'Use an item from inventory',
      effects: ['item_effect']
    };
  }

  /**
   * Get defend action
   * @returns {Object} Defend action
   */
  getDefendAction() {
    return {
      id: 'defend',
      name: 'Defend',
      type: 'defend',
      apCost: this.balanceConfig.getActionAPCost('defend'),
      targetType: 'self',
      description: 'Reduce incoming damage and gain AP',
      effects: ['defense_boost', 'ap_gain']
    };
  }

  /**
   * Get flee action
   * @returns {Object} Flee action
   */
  getFleeAction() {
    return {
      id: 'flee',
      name: 'Flee',
      type: 'flee',
      apCost: this.balanceConfig.getActionAPCost('flee'),
      targetType: 'none',
      description: 'Attempt to escape from combat',
      effects: ['escape_attempt']
    };
  }

  /**
   * Execute an action
   * @param {Object} action - Action to execute
   * @param {Object} attacker - Character performing the action
   * @param {Object|Array} targets - Target(s) of the action
   * @returns {Object} Action result
   */
  executeAction(action, attacker, targets) {
    const result = {
      success: true,
      action: action,
      attacker: attacker,
      targets: Array.isArray(targets) ? targets : [targets],
      effects: [],
      damage: [],
      healing: [],
      statusEffects: [],
      messages: []
    };

    switch (action.type) {
      case 'attack':
        return this.executeAttack(action, attacker, targets, result);
      
      case 'skill':
        return this.executeSkill(action, attacker, targets, result);
      
      case 'item':
        return this.executeItem(action, attacker, targets, result);
      
      case 'defend':
        return this.executeDefend(action, attacker, result);
      
      case 'flee':
        return this.executeFlee(action, attacker, result);
      
      default:
        result.success = false;
        result.messages.push('Unknown action type');
        return result;
    }
  }

  /**
   * Execute attack action
   * @param {Object} action - Attack action
   * @param {Object} attacker - Attacking character
   * @param {Object|Array} targets - Target(s)
   * @param {Object} result - Result object to populate
   * @returns {Object} Action result
   */
  executeAttack(action, attacker, targets, result) {
    const targetArray = Array.isArray(targets) ? targets : [targets];
    
    for (const target of targetArray) {
      if (!target || !target.isAlive()) {
        continue;
      }
      
      // Calculate damage
      const damageResult = this.calculateDamage(attacker, target, action);
      
      // Apply damage
      const actualDamage = Math.max(1, damageResult.finalDamage); // Minimum 1 damage
      const died = target.takeDamage(actualDamage);
      
      // Check for boss phase transitions after damage
      if (!died && target.tier === 'boss' && typeof target.checkPhaseTransition === 'function') {
        const phaseChanged = target.checkPhaseTransition();
        if (phaseChanged) {
          result.messages.push(`${target.name} enters a new phase!`);
        }
      }
      
      // Record results
      result.damage.push({
        target: target,
        damage: actualDamage,
        isCritical: damageResult.isCritical,
        elementalModifier: damageResult.elementalModifier,
        died: died
      });
      
      result.messages.push(
        `${attacker.name} attacks ${target.name} for ${actualDamage} damage${damageResult.isCritical ? ' (Critical!)' : ''}`
      );
      
      if (died) {
        result.messages.push(`${target.name} has been defeated!`);
      }
    }
    
    return result;
  }

  /**
   * Execute skill action
   * @param {Object} action - Skill action
   * @param {Object} attacker - Character using skill
   * @param {Object|Array} targets - Target(s)
   * @param {Object} result - Result object to populate
   * @returns {Object} Action result
   */
  executeSkill(action, attacker, targets, result) {
    const skill = action.skillData;
    const targetArray = Array.isArray(targets) ? targets : [targets];
    
    // Handle different skill types
    switch (skill.type) {
      case 'attack':
        return this.executeSkillAttack(skill, attacker, targetArray, result);
      
      case 'heal':
        return this.executeSkillHeal(skill, attacker, targetArray, result);
      
      case 'buff':
        return this.executeSkillBuff(skill, attacker, targetArray, result);
      
      case 'utility':
        return this.executeSkillUtility(skill, attacker, targetArray, result);
      
      default:
        // Default to attack-type skill
        return this.executeSkillAttack(skill, attacker, targetArray, result);
    }
  }

  /**
   * Execute attack-type skill
   * @param {Object} skill - Skill data
   * @param {Object} attacker - Character using skill
   * @param {Array} targets - Target array
   * @param {Object} result - Result object
   * @returns {Object} Action result
   */
  executeSkillAttack(skill, attacker, targets, result) {
    const skillMultiplier = this.getSkillDamageMultiplier(skill.id);
    
    for (const target of targets) {
      if (!target || !target.isAlive()) {
        continue;
      }
      
      // Calculate skill damage
      const damageResult = this.calculateDamage(attacker, target, { type: 'skill', skillMultiplier });
      
      // Apply damage
      const actualDamage = Math.max(1, damageResult.finalDamage);
      const died = target.takeDamage(actualDamage);
      
      // Check for boss phase transitions after damage
      if (!died && target.tier === 'boss' && typeof target.checkPhaseTransition === 'function') {
        const phaseChanged = target.checkPhaseTransition();
        if (phaseChanged) {
          result.messages.push(`${target.name} enters a new phase!`);
        }
      }
      
      // Record results
      result.damage.push({
        target: target,
        damage: actualDamage,
        isCritical: damageResult.isCritical,
        elementalModifier: damageResult.elementalModifier,
        died: died
      });
      
      result.messages.push(
        `${attacker.name} uses ${skill.name} on ${target.name} for ${actualDamage} damage${damageResult.isCritical ? ' (Critical!)' : ''}`
      );
      
      if (died) {
        result.messages.push(`${target.name} has been defeated!`);
      }
    }
    
    return result;
  }

  /**
   * Execute healing skill
   * @param {Object} skill - Skill data
   * @param {Object} caster - Character using skill
   * @param {Array} targets - Target array
   * @param {Object} result - Result object
   * @returns {Object} Action result
   */
  executeSkillHeal(skill, caster, targets, result) {
    const healingPower = this.getSkillHealingPower(skill.id, caster);
    
    for (const target of targets) {
      if (!target) {
        continue;
      }
      
      const actualHealing = target.heal(healingPower);
      
      if (actualHealing > 0) {
        result.healing.push({
          target: target,
          healing: actualHealing
        });
        
        result.messages.push(
          `${caster.name} heals ${target.name} for ${actualHealing} HP`
        );
      }
    }
    
    return result;
  }

  /**
   * Execute buff skill
   * @param {Object} skill - Skill data
   * @param {Object} caster - Character using skill
   * @param {Array} targets - Target array
   * @param {Object} result - Result object
   * @returns {Object} Action result
   */
  executeSkillBuff(skill, caster, targets, result) {
    const buffEffect = this.getSkillBuffEffect(skill.id);
    
    for (const target of targets) {
      if (!target) {
        continue;
      }
      
      // Apply buff status effect
      target.statusEffects.push({
        type: buffEffect.type,
        value: buffEffect.value,
        duration: buffEffect.duration,
        source: skill.id
      });
      
      result.statusEffects.push({
        target: target,
        effect: buffEffect
      });
      
      result.messages.push(
        `${caster.name} casts ${skill.name} on ${target.name}`
      );
    }
    
    return result;
  }

  /**
   * Execute utility skill
   * @param {Object} skill - Skill data
   * @param {Object} caster - Character using skill
   * @param {Array} targets - Target array
   * @param {Object} result - Result object
   * @returns {Object} Action result
   */
  executeSkillUtility(skill, caster, targets, result) {
    // Handle specific utility skills
    switch (skill.id) {
      case 'taunt':
        // Force enemies to target this character
        result.messages.push(`${caster.name} taunts the enemies!`);
        break;
      
      case 'evasion':
        // Increase evasion for several turns
        caster.statusEffects.push({
          type: 'evasion_boost',
          value: 0.3, // +30% evasion
          duration: 3,
          source: skill.id
        });
        result.messages.push(`${caster.name} becomes more evasive!`);
        break;
      
      default:
        result.messages.push(`${caster.name} uses ${skill.name}`);
    }
    
    return result;
  }

  /**
   * Execute item action
   * @param {Object} action - Item action
   * @param {Object} user - Character using item
   * @param {Object|Array} targets - Target(s)
   * @param {Object} result - Result object
   * @returns {Object} Action result
   */
  executeItem(action, user, targets, result) {
    // Placeholder for item system integration
    result.messages.push(`${user.name} uses an item`);
    return result;
  }

  /**
   * Execute defend action
   * @param {Object} action - Defend action
   * @param {Object} defender - Character defending
   * @param {Object} result - Result object
   * @returns {Object} Action result
   */
  executeDefend(action, defender, result) {
    // Apply defense buff
    defender.statusEffects.push({
      type: 'defense_boost',
      value: 0.5, // 50% damage reduction
      duration: 1, // Until next turn
      source: 'defend'
    });
    
    // Gain 1 AP
    defender.currentAP = Math.min(defender.maxAP, defender.currentAP + 1);
    
    result.messages.push(`${defender.name} takes a defensive stance and gains 1 AP`);
    return result;
  }

  /**
   * Execute flee action
   * @param {Object} action - Flee action
   * @param {Object} character - Character attempting to flee
   * @param {Object} result - Result object
   * @returns {Object} Action result
   */
  executeFlee(action, character, result) {
    // Calculate flee chance based on speed
    const fleeChance = Math.min(0.8, 0.3 + (character.stats.SPD / 100));
    const success = Math.random() < fleeChance;
    
    if (success) {
      result.messages.push(`${character.name} successfully flees from combat!`);
      result.effects.push({ type: 'flee_success' });
    } else {
      result.messages.push(`${character.name} failed to escape!`);
      result.effects.push({ type: 'flee_failed' });
    }
    
    return result;
  }

  /**
   * Calculate damage for an attack
   * @param {Object} attacker - Attacking character
   * @param {Object} defender - Defending character
   * @param {Object} action - Action being performed
   * @returns {Object} Damage calculation result
   */
  calculateDamage(attacker, defender, action) {
    // Base damage calculation: ATK - (DEF/2)
    const attackPower = attacker.stats.ATK;
    const defense = defender.stats.DEF;
    let baseDamage = attackPower - Math.floor(defense / 2);
    
    // Apply skill multiplier if applicable
    if (action.skillMultiplier) {
      baseDamage *= action.skillMultiplier;
    }
    
    // Ensure minimum damage
    baseDamage = Math.max(1, baseDamage);
    
    // Apply variance (±10%)
    const variance = 0.9 + (Math.random() * 0.2);
    let finalDamage = Math.floor(baseDamage * variance);
    
    // Check for critical hit
    const criticalChance = this.calculateCriticalChance(attacker);
    const isCritical = Math.random() < criticalChance;
    
    if (isCritical) {
      finalDamage *= 2; // Critical hits deal 2x damage
    }
    
    // Apply elemental modifiers
    const elementalModifier = this.getElementalModifier(
      attacker.stats.element,
      defender.stats.element
    );
    finalDamage = Math.floor(finalDamage * elementalModifier);
    
    // Apply status effect modifiers
    finalDamage = this.applyStatusEffectModifiers(finalDamage, attacker, defender);
    
    return {
      baseDamage: baseDamage,
      finalDamage: Math.max(1, finalDamage), // Minimum 1 damage
      isCritical: isCritical,
      elementalModifier: elementalModifier,
      variance: variance
    };
  }

  /**
   * Calculate critical hit chance
   * @param {Object} character - Character to calculate for
   * @returns {number} Critical hit chance (0-1)
   */
  calculateCriticalChance(character) {
    const baseChance = 0.05; // 5% base critical chance
    const speedBonus = character.stats.SPD / 30; // SPD/30 additional chance
    return Math.min(0.5, baseChance + speedBonus); // Max 50% critical chance
  }

  /**
   * Get elemental damage modifier
   * @param {string} attackerElement - Attacker's element
   * @param {string} defenderElement - Defender's element
   * @returns {number} Damage modifier
   */
  getElementalModifier(attackerElement, defenderElement) {
    if (!this.elementalChart[attackerElement]) {
      return 1.0;
    }
    
    return this.elementalChart[attackerElement][defenderElement] || 1.0;
  }

  /**
   * Apply status effect modifiers to damage
   * @param {number} damage - Base damage
   * @param {Object} attacker - Attacking character
   * @param {Object} defender - Defending character
   * @returns {number} Modified damage
   */
  applyStatusEffectModifiers(damage, attacker, defender) {
    let modifiedDamage = damage;
    
    // Check defender's status effects
    for (const effect of defender.statusEffects || []) {
      if (effect.type === 'defense_boost') {
        modifiedDamage *= (1 - effect.value); // Reduce damage
      }
    }
    
    // Check attacker's status effects
    for (const effect of attacker.statusEffects || []) {
      if (effect.type === 'attack_boost') {
        modifiedDamage *= (1 + effect.value); // Increase damage
      }
    }
    
    return Math.floor(modifiedDamage);
  }

  /**
   * Get skill damage multiplier
   * @param {string} skillId - Skill ID
   * @returns {number} Damage multiplier
   */
  getSkillDamageMultiplier(skillId) {
    const multipliers = {
      'power_strike': 1.5,
      'backstab': 1.3,
      'cleave': 0.8, // Lower per-target damage for AoE
      'execute': 2.0,
      'multi_strike': 0.6, // Multiple hits
      'fireball': 1.4,
      'ice_shard': 1.2,
      'lightning_storm': 1.0, // AoE spell
      'meteor': 2.5
    };
    
    return multipliers[skillId] || 1.0;
  }

  /**
   * Get skill healing power
   * @param {string} skillId - Skill ID
   * @param {Object} caster - Character casting the skill
   * @returns {number} Healing amount
   */
  getSkillHealingPower(skillId, caster) {
    const basePower = caster.stats.ATK; // Use ATK as base for healing power
    
    const healingMultipliers = {
      'heal': 1.5,
      'mass_heal': 1.0, // Lower per-target for AoE
      'resurrect': 0.5 // Brings back with low HP
    };
    
    const multiplier = healingMultipliers[skillId] || 1.0;
    return Math.floor(basePower * multiplier);
  }

  /**
   * Get skill buff effect
   * @param {string} skillId - Skill ID
   * @returns {Object} Buff effect data
   */
  getSkillBuffEffect(skillId) {
    const buffEffects = {
      'bless': {
        type: 'stat_boost',
        value: 0.2, // +20% to all stats
        duration: 5
      },
      'iron_will': {
        type: 'defense_boost',
        value: 0.3, // +30% defense
        duration: 4
      },
      'mana_shield': {
        type: 'magic_shield',
        value: 0.5, // 50% magic damage reduction
        duration: 3
      },
      'divine_shield': {
        type: 'immunity',
        value: 1.0, // Complete damage immunity
        duration: 2
      }
    };
    
    return buffEffects[skillId] || {
      type: 'unknown_buff',
      value: 0.1,
      duration: 1
    };
  }

  /**
   * Get skill target type
   * @param {Object} skill - Skill data
   * @returns {string} Target type
   */
  getSkillTargetType(skill) {
    const targetTypes = {
      'power_strike': 'single_enemy',
      'taunt': 'all_enemies',
      'cleave': 'front_row_enemies',
      'iron_will': 'self',
      'execute': 'single_enemy',
      'backstab': 'single_enemy',
      'poison_blade': 'single_enemy',
      'evasion': 'self',
      'multi_strike': 'single_enemy',
      'assassinate': 'single_enemy',
      'fireball': 'single_enemy',
      'ice_shard': 'single_enemy',
      'lightning_storm': 'all_enemies',
      'mana_shield': 'self',
      'meteor': 'all_enemies',
      'heal': 'single_ally',
      'bless': 'single_ally',
      'mass_heal': 'all_allies',
      'resurrect': 'single_ally',
      'divine_shield': 'single_ally'
    };
    
    return targetTypes[skill.id] || 'single_enemy';
  }

  /**
   * Get skill effects
   * @param {Object} skill - Skill data
   * @returns {Array} Array of effect types
   */
  getSkillEffects(skill) {
    const skillEffects = {
      'power_strike': ['damage'],
      'taunt': ['taunt'],
      'cleave': ['damage', 'aoe'],
      'iron_will': ['buff', 'defense'],
      'execute': ['damage', 'execute'],
      'backstab': ['damage', 'critical'],
      'poison_blade': ['damage', 'poison'],
      'evasion': ['buff', 'evasion'],
      'multi_strike': ['damage', 'multi_hit'],
      'assassinate': ['damage', 'instant_kill'],
      'fireball': ['damage', 'fire'],
      'ice_shard': ['damage', 'ice', 'slow'],
      'lightning_storm': ['damage', 'lightning', 'aoe'],
      'mana_shield': ['buff', 'shield'],
      'meteor': ['damage', 'fire', 'aoe'],
      'heal': ['healing'],
      'bless': ['buff', 'stats'],
      'mass_heal': ['healing', 'aoe'],
      'resurrect': ['healing', 'resurrect'],
      'divine_shield': ['buff', 'immunity']
    };
    
    return skillEffects[skill.id] || ['unknown'];
  }
}