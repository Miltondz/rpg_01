/**
 * EnemyAI - AI system for enemy behavior in combat
 * Implements 4 AI archetypes: Aggressive, Defensive, Tactical, Berserker
 */

export class EnemyAI {
  constructor(archetype = 'AGGRESSIVE') {
    this.archetype = archetype;
    this.targetPriority = this.getTargetPriority(archetype);
    this.actionWeights = this.getActionWeights(archetype);
    
    console.log(`EnemyAI initialized with ${archetype} archetype`);
  }

  /**
   * Get target priority system for AI archetype
   * @param {string} archetype - AI behavior type
   * @returns {Object} Target priority configuration
   */
  getTargetPriority(archetype) {
    const priorities = {
      'AGGRESSIVE': {
        primary: 'lowest_hp',
        secondary: 'lowest_defense',
        ignorePosition: true,
        focusFire: true
      },
      'DEFENSIVE': {
        primary: 'support_allies',
        secondary: 'highest_threat',
        protectAllies: true,
        healThreshold: 0.3
      },
      'TACTICAL': {
        primary: 'highest_threat',
        secondary: 'strategic_target',
        analyzeThreats: true,
        adaptiveStrategy: true
      },
      'BERSERKER': {
        primary: 'random',
        secondary: 'nearest',
        rageThreshold: 0.5,
        rageBonus: 1.5
      }
    };

    return priorities[archetype] || priorities['AGGRESSIVE'];
  }

  /**
   * Get action weights for AI archetype
   * @param {string} archetype - AI behavior type
   * @returns {Object} Action weight configuration
   */
  getActionWeights(archetype) {
    const weights = {
      'AGGRESSIVE': {
        attack: 0.7,
        skill: 0.25,
        defend: 0.03,
        heal: 0.02,
        utility: 0.0
      },
      'DEFENSIVE': {
        attack: 0.3,
        skill: 0.2,
        defend: 0.2,
        heal: 0.25,
        utility: 0.05
      },
      'TACTICAL': {
        attack: 0.4,
        skill: 0.35,
        defend: 0.1,
        heal: 0.1,
        utility: 0.05
      },
      'BERSERKER': {
        attack: 0.6,
        skill: 0.35,
        defend: 0.02,
        heal: 0.01,
        utility: 0.02
      }
    };

    return weights[archetype] || weights['AGGRESSIVE'];
  }

  /**
   * Select best action for enemy based on AI archetype
   * @param {Object} enemy - Enemy making the decision
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - All enemies in combat
   * @returns {Object} Selected action with target
   */
  selectAction(enemy, playerParty, enemies) {
    if (!enemy.isAlive()) {
      return null;
    }

    const availableActions = this.getAvailableActions(enemy);
    if (availableActions.length === 0) {
      return null;
    }

    const actionScores = availableActions.map(action => ({
      action: action,
      score: this.scoreAction(action, enemy, playerParty, enemies),
      target: this.selectTarget(action, enemy, playerParty, enemies)
    }));

    const validActions = actionScores.filter(actionScore => 
      actionScore.target !== null && actionScore.score > 0
    );

    if (validActions.length === 0) {
      return this.getFallbackAction(enemy, playerParty);
    }

    const selectedAction = this.selectActionByArchetype(validActions, enemy);
    
    console.log(`${enemy.name} (${this.archetype}) selects ${selectedAction.action.name} on ${selectedAction.target.name}`);
    
    return {
      action: selectedAction.action,
      target: selectedAction.target,
      score: selectedAction.score
    };
  }

  /**
   * Score an action based on AI archetype and situation
   * @param {Object} action - Action to score
   * @param {Object} enemy - Enemy performing action
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - All enemies in combat
   * @returns {number} Action score (0-1)
   */
  scoreAction(action, enemy, playerParty, enemies) {
    let baseScore = this.actionWeights[action.type] || 0.1;
    
    switch (this.archetype) {
      case 'AGGRESSIVE':
        baseScore = this.scoreAggressiveAction(action, enemy, baseScore);
        break;
      case 'DEFENSIVE':
        baseScore = this.scoreDefensiveAction(action, enemy, enemies, baseScore);
        break;
      case 'TACTICAL':
        baseScore = this.scoreTacticalAction(action, enemy, playerParty, baseScore);
        break;
      case 'BERSERKER':
        baseScore = this.scoreBerserkerAction(action, enemy, baseScore);
        break;
    }
    
    // Apply boss-specific scoring if this is a boss AI
    if (this.isBossAI && enemy.tier === 'boss') {
      baseScore = this.scoreBossAction(action, enemy, playerParty, baseScore);
    }
    
    baseScore = this.applySituationalModifiers(action, enemy, playerParty, enemies, baseScore);
    
    return Math.max(0, Math.min(1, baseScore));
  }

  /**
   * Score action for Aggressive AI
   */
  scoreAggressiveAction(action, enemy, baseScore) {
    if (action.type === 'attack' || action.type === 'skill') {
      baseScore *= 1.5;
      if (action.skillData && action.skillData.damageMultiplier > 1.2) {
        baseScore *= 1.3;
      }
    }
    if (action.type === 'defend' || (action.effects && action.effects.includes('buff'))) {
      baseScore *= 0.3;
    }
    return baseScore;
  }

  /**
   * Score action for Defensive AI
   */
  scoreDefensiveAction(action, enemy, enemies, baseScore) {
    const hpPercentage = enemy.getHPPercentage();
    
    if (hpPercentage < this.targetPriority.healThreshold) {
      if (action.effects && action.effects.includes('healing')) {
        baseScore *= 2.0;
      }
    }
    
    if (action.type === 'defend' || (action.effects && action.effects.includes('buff'))) {
      baseScore *= 1.4;
    }
    
    const woundedAllies = enemies.filter(ally => 
      ally.isAlive() && ally.getHPPercentage() < 0.5
    );
    
    if (woundedAllies.length > 0 && action.effects && action.effects.includes('healing')) {
      baseScore *= 1.6;
    }
    
    return baseScore;
  }

  /**
   * Score action for Tactical AI
   */
  scoreTacticalAction(action, enemy, playerParty, baseScore) {
    const aliveMembers = playerParty.getAliveMembers();
    const healers = aliveMembers.filter(member => member.class === 'cleric');
    
    if (healers.length > 0 && (action.type === 'attack' || action.type === 'skill')) {
      baseScore *= 1.4;
    }
    
    if (action.effects && action.effects.includes('utility')) {
      baseScore *= 1.2;
    }
    
    if (action.type === 'skill' && action.skillData && action.skillData.damageMultiplier > 1.5) {
      const weakTargets = aliveMembers.filter(member => member.getHPPercentage() < 0.3);
      if (weakTargets.length > 0) {
        baseScore *= 1.5;
      }
    }
    
    return baseScore;
  }

  /**
   * Score action for Berserker AI
   */
  scoreBerserkerAction(action, enemy, baseScore) {
    const hpPercentage = enemy.getHPPercentage();
    const isRaging = hpPercentage < this.targetPriority.rageThreshold;
    
    if (isRaging) {
      if (action.type === 'attack' || action.type === 'skill') {
        baseScore *= this.targetPriority.rageBonus;
        if (action.skillData && action.skillData.damageMultiplier > 1.0) {
          baseScore *= 1.3;
        }
      }
      if (action.type === 'defend') {
        baseScore *= 0.1;
      }
    } else {
      baseScore *= (0.7 + Math.random() * 0.6);
    }
    
    return baseScore;
  }

  /**
   * Apply situational modifiers to action score
   */
  applySituationalModifiers(action, enemy, playerParty, enemies, baseScore) {
    if (action.apCost > enemy.currentAP) {
      return 0;
    }
    
    if (action.apCost >= enemy.currentAP * 0.8) {
      baseScore *= 0.8;
    }
    
    const aliveEnemies = enemies.filter(e => e.isAlive()).length;
    const aliveParty = playerParty.getAliveMembers().length;
    
    if (aliveEnemies < aliveParty) {
      if (action.type === 'defend' || (action.effects && action.effects.includes('healing'))) {
        baseScore *= 1.3;
      }
    }
    
    if (enemy.getHPPercentage() < 0.2) {
      if (action.effects && action.effects.includes('healing')) {
        baseScore *= 2.0;
      } else if (action.type === 'attack') {
        baseScore *= 1.2;
      }
    }
    
    return baseScore;
  }

  /**
   * Select action based on AI archetype behavior
   */
  selectActionByArchetype(validActions, enemy) {
    switch (this.archetype) {
      case 'AGGRESSIVE':
        return this.selectAggressiveAction(validActions, enemy);
      case 'DEFENSIVE':
        return this.selectDefensiveAction(validActions, enemy);
      case 'TACTICAL':
        return this.selectTacticalAction(validActions, enemy);
      case 'BERSERKER':
        return this.selectBerserkerAction(validActions, enemy);
      default:
        return validActions.reduce((best, current) => 
          current.score > best.score ? current : best
        );
    }
  }

  /**
   * Aggressive AI action selection
   */
  selectAggressiveAction(validActions, enemy) {
    const attackActions = validActions.filter(a => 
      a.action.type === 'attack' || a.action.type === 'skill'
    );
    
    if (attackActions.length > 0) {
      return attackActions.reduce((best, current) => 
        current.score > best.score ? current : best
      );
    }
    
    return validActions[0];
  }

  /**
   * Defensive AI action selection
   */
  selectDefensiveAction(validActions, enemy) {
    const hpPercentage = enemy.getHPPercentage();
    
    if (hpPercentage < this.targetPriority.healThreshold) {
      const healActions = validActions.filter(a => 
        a.action.effects && a.action.effects.includes('healing')
      );
      
      if (healActions.length > 0) {
        return healActions[0];
      }
    }
    
    const defensiveActions = validActions.filter(a => 
      a.action.type === 'defend' || 
      (a.action.effects && a.action.effects.includes('buff'))
    );
    
    if (defensiveActions.length > 0) {
      return defensiveActions[0];
    }
    
    const attackActions = validActions.filter(a => 
      a.action.type === 'attack' || a.action.type === 'skill'
    );
    
    return attackActions.length > 0 ? attackActions[0] : validActions[0];
  }

  /**
   * Tactical AI action selection
   */
  selectTacticalAction(validActions, enemy) {
    const highValueActions = validActions.filter(a => a.score >= 0.7);
    
    if (highValueActions.length > 0) {
      return highValueActions.reduce((best, current) => 
        current.score > best.score ? current : best
      );
    }
    
    return validActions.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  }

  /**
   * Berserker AI action selection
   */
  selectBerserkerAction(validActions, enemy) {
    const hpPercentage = enemy.getHPPercentage();
    const isRaging = hpPercentage < this.targetPriority.rageThreshold;
    
    if (isRaging) {
      const attackActions = validActions.filter(a => 
        a.action.type === 'attack' || a.action.type === 'skill'
      );
      
      if (attackActions.length > 0) {
        const weightedActions = attackActions.map(a => ({
          ...a,
          score: a.score * (0.8 + Math.random() * 0.4)
        }));
        
        return weightedActions.reduce((best, current) => 
          current.score > best.score ? current : best
        );
      }
    }
    
    const randomIndex = Math.floor(Math.random() * validActions.length);
    return validActions[randomIndex];
  }

  /**
   * Select target for an action based on AI archetype
   */
  selectTarget(action, enemy, playerParty, enemies) {
    if (action.targetType === 'self') {
      return enemy;
    }
    
    if (action.targetType === 'single_ally' || action.targetType === 'all_allies') {
      return this.selectAllyTarget(action, enemy, enemies);
    }
    
    const aliveMembers = playerParty.getAliveMembers();
    if (aliveMembers.length === 0) {
      return null;
    }
    
    switch (action.targetType) {
      case 'single_enemy':
        return this.selectSingleEnemyTarget(aliveMembers, enemy);
      case 'all_enemies':
        return aliveMembers;
      case 'front_row_enemies':
        return this.selectFrontRowTargets(aliveMembers, playerParty);
      case 'back_row_enemies':
        return this.selectBackRowTargets(aliveMembers, playerParty);
      default:
        return aliveMembers[0];
    }
  }

  /**
   * Select single enemy target based on AI archetype
   */
  selectSingleEnemyTarget(aliveMembers, enemy) {
    switch (this.archetype) {
      case 'AGGRESSIVE':
        return this.selectWeakestTarget(aliveMembers);
      case 'DEFENSIVE':
        return this.selectHighestThreatTarget(aliveMembers, enemy);
      case 'TACTICAL':
        return this.selectStrategicTarget(aliveMembers, enemy);
      case 'BERSERKER':
        return this.selectRandomTarget(aliveMembers, enemy);
      default:
        return aliveMembers[0];
    }
  }

  /**
   * Select weakest target (lowest HP)
   */
  selectWeakestTarget(targets) {
    return targets.reduce((weakest, current) => 
      current.currentHP < weakest.currentHP ? current : weakest
    );
  }

  /**
   * Select highest threat target
   */
  selectHighestThreatTarget(targets, enemy) {
    let highestThreat = targets[0];
    let highestThreatLevel = 0;
    
    for (const target of targets) {
      const threatLevel = this.calculateThreatLevel(target, enemy);
      if (threatLevel > highestThreatLevel) {
        highestThreatLevel = threatLevel;
        highestThreat = target;
      }
    }
    
    return highestThreat;
  }

  /**
   * Calculate threat level of a target
   */
  calculateThreatLevel(target, enemy) {
    if (!target.stats) return 0;
    
    const damageThreat = Math.min(1, target.stats.ATK / (enemy.stats.HP * 0.1));
    const survivalThreat = Math.min(1, target.stats.HP / (target.maxHP || target.stats.HP));
    const speedThreat = Math.min(1, target.stats.SPD / 20);
    
    return (damageThreat * 0.4 + survivalThreat * 0.3 + speedThreat * 0.3);
  }

  /**
   * Select strategic target based on tactical analysis
   */
  selectStrategicTarget(targets, enemy) {
    const healers = targets.filter(t => t.class === 'cleric');
    if (healers.length > 0) {
      return this.selectWeakestTarget(healers);
    }
    
    const dps = targets.filter(t => t.class === 'mage' || t.class === 'rogue');
    if (dps.length > 0) {
      return this.selectWeakestTarget(dps);
    }
    
    return this.selectWeakestTarget(targets);
  }

  /**
   * Select random target with berserker behavior
   */
  selectRandomTarget(targets, enemy) {
    const hpPercentage = enemy.getHPPercentage();
    const isRaging = hpPercentage < this.targetPriority.rageThreshold;
    
    if (isRaging) {
      const randomChoice = Math.random();
      if (randomChoice < 0.4) {
        return this.selectWeakestTarget(targets);
      } else if (randomChoice < 0.7) {
        return targets[0];
      }
    }
    
    return targets[Math.floor(Math.random() * targets.length)];
  }

  /**
   * Select ally target for healing/buff actions
   */
  selectAllyTarget(action, enemy, enemies) {
    const aliveAllies = enemies.filter(ally => ally.isAlive() && ally !== enemy);
    
    if (action.targetType === 'all_allies') {
      return aliveAllies;
    }
    
    if (aliveAllies.length === 0) {
      return enemy;
    }
    
    if (action.effects && action.effects.includes('healing')) {
      return aliveAllies.reduce((weakest, current) => 
        current.getHPPercentage() < weakest.getHPPercentage() ? current : weakest
      );
    }
    
    return aliveAllies[0];
  }

  /**
   * Select front row targets
   */
  selectFrontRowTargets(aliveMembers, playerParty) {
    const frontRowSize = Math.min(2, aliveMembers.length);
    return aliveMembers.slice(0, frontRowSize);
  }

  /**
   * Select back row targets
   */
  selectBackRowTargets(aliveMembers, playerParty) {
    if (aliveMembers.length <= 2) {
      return [];
    }
    return aliveMembers.slice(2);
  }

  /**
   * Get available actions for an enemy
   */
  getAvailableActions(enemy) {
    const actions = [];
    
    // Basic attack (always available if has AP)
    if (enemy.hasAP(1)) {
      actions.push({
        id: 'basic_attack',
        name: 'Attack',
        type: 'attack',
        apCost: 1,
        targetType: 'single_enemy',
        effects: ['damage']
      });
    }
    
    // Enemy skills (from database)
    if (enemy.skills && enemy.skills.length > 0) {
      let availableSkills = enemy.skills;
      
      // For boss enemies, filter by current phase
      if (enemy.phases && enemy.phases.length > 0) {
        availableSkills = enemy.getCurrentPhaseSkills();
      }
      
      for (const skill of availableSkills) {
        if (enemy.hasAP(skill.apCost)) {
          actions.push({
            id: skill.id,
            name: skill.name,
            type: skill.type || 'skill',
            apCost: skill.apCost,
            targetType: skill.targetType || 'single_enemy',
            effects: skill.effects || ['damage'],
            skillData: skill
          });
        }
      }
    }
    
    // Defend action (always available if has AP)
    if (enemy.hasAP(1)) {
      actions.push({
        id: 'defend',
        name: 'Defend',
        type: 'defend',
        apCost: 1,
        targetType: 'self',
        effects: ['defense_boost']
      });
    }
    
    return actions;
  }

  /**
   * Get fallback action when no valid actions are available
   */
  getFallbackAction(enemy, playerParty) {
    const aliveMembers = playerParty.getAliveMembers();
    if (aliveMembers.length === 0) {
      return null;
    }
    
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
      score: 0.1
    };
  }

  /**
   * Enhanced boss AI behavior for phase transitions
   */
  handleBossPhaseTransition(enemy, newPhase) {
    console.log(`${enemy.name} enters phase ${newPhase + 1}! AI adapting strategy...`);
    
    // Adjust AI behavior based on phase
    switch (newPhase) {
      case 1: // Second phase - more aggressive
        this.actionWeights.attack *= 1.2;
        this.actionWeights.skill *= 1.3;
        break;
      case 2: // Third phase - tactical focus
        this.actionWeights.skill *= 1.5;
        this.actionWeights.utility *= 2.0;
        break;
      case 3: // Final phase - desperate measures
        this.actionWeights.attack *= 1.5;
        this.actionWeights.skill *= 1.8;
        this.actionWeights.defend *= 0.5;
        break;
    }
  }

  /**
   * Boss-specific action scoring
   */
  scoreBossAction(action, enemy, playerParty, baseScore) {
    const hpPercentage = enemy.getHPPercentage();
    const currentPhase = enemy.currentPhase || 0;
    
    // Phase-specific behavior modifications
    if (currentPhase >= 2) { // Later phases
      if (action.effects && action.effects.includes('ultimate')) {
        baseScore *= 2.0; // Prioritize ultimate abilities
      }
      
      if (hpPercentage < 0.3 && action.effects && action.effects.includes('healing')) {
        baseScore *= 1.8; // Desperate healing
      }
    }
    
    // Multi-target abilities become more valuable with more enemies
    const aliveEnemies = playerParty.getAliveMembers().length;
    if (aliveEnemies >= 3 && action.targetType === 'all_enemies') {
      baseScore *= 1.4;
    }
    
    // Signature abilities (high AP cost, high damage) get priority
    if (action.apCost >= 3 && action.skillData && action.skillData.damageMultiplier >= 2.0) {
      baseScore *= 1.3;
    }
    
    return baseScore;
  }

  /**
   * Create AI instance for enemy type
   * @param {string} enemyType - Type of enemy
   * @returns {EnemyAI} AI instance
   */
  static createForEnemyType(enemyType) {
    const aiTypes = {
      // Tier 1 enemies
      'goblin': 'AGGRESSIVE',
      'giant_rat': 'AGGRESSIVE', 
      'skeleton': 'DEFENSIVE',
      'goblin_shaman': 'TACTICAL',
      
      // Tier 2 enemies
      'orc': 'BERSERKER',
      'dire_wolf': 'AGGRESSIVE',
      'undead_knight': 'DEFENSIVE',
      'shadow_beast': 'TACTICAL',
      
      // Tier 3 enemies
      'orc_shaman': 'TACTICAL',
      'lich_lieutenant': 'TACTICAL',
      'ancient_golem': 'DEFENSIVE',
      'shadow_general': 'TACTICAL',
      
      // Boss enemies
      'shadow_lord': 'TACTICAL',
      'ancient_lich': 'TACTICAL',
      'elemental_overlord': 'TACTICAL'
    };
    
    const archetype = aiTypes[enemyType] || 'AGGRESSIVE';
    const ai = new EnemyAI(archetype);
    
    // Mark as boss AI for special behavior
    if (enemyType.includes('lord') || enemyType.includes('lich') || enemyType.includes('overlord')) {
      ai.isBossAI = true;
    }
    
    return ai;
  }
}