/**
 * CombatBalanceConfig - Centralized balance configuration for combat timing and difficulty
 * Implements target combat durations and resource economy balance
 */

export class CombatBalanceConfig {
  constructor() {
    // Combat timing targets (in seconds)
    this.combatTimingTargets = {
      random: { min: 120, max: 240 },      // 2-4 minutes
      mini_boss: { min: 240, max: 360 },   // 4-6 minutes  
      boss: { min: 480, max: 720 }         // 8-12 minutes
    };

    // Combat balance parameters
    this.balanceParameters = {
      // Enemy HP scaling to achieve target combat duration
      enemyHPMultipliers: {
        random: 1.0,      // Base HP for random encounters
        mini_boss: 2.5,   // 2.5x HP for mini-bosses
        boss: 4.0         // 4x HP for bosses
      },

      // Enemy ATK scaling for appropriate challenge
      enemyATKMultipliers: {
        random: 1.0,      // Base ATK for random encounters
        mini_boss: 1.3,   // 30% more ATK for mini-bosses
        boss: 1.5         // 50% more ATK for bosses
      },

      // AP costs for tactical depth
      actionAPCosts: {
        basic_attack: 1,
        defend: 1,
        item: 1,
        flee: 2,
        skill_basic: 2,     // Basic skills (Power Strike, Backstab, etc.)
        skill_advanced: 3,  // Advanced skills (Cleave, Lightning Storm, etc.)
        skill_ultimate: 4   // Ultimate skills (Meteor, Execute, etc.)
      },

      // Skill cooldowns for tactical pacing
      skillCooldowns: {
        basic: 0,          // No cooldown for basic skills
        utility: 2,        // 2 turns for utility skills
        powerful: 3,       // 3 turns for powerful skills
        ultimate: 5        // 5 turns for ultimate skills
      }
    };

    // Resource economy balance
    this.resourceEconomy = {
      // Potion usage targets (per floor)
      potionUsageTargets: {
        healthPotions: { min: 2, max: 3 },
        apPotions: { min: 1, max: 2 },
        buffPotions: { min: 0, max: 1 }
      },

      // Potion drop rates (per enemy defeated)
      potionDropRates: {
        health_potion_small: 0.25,   // 25% chance
        health_potion_medium: 0.15,  // 15% chance
        health_potion_large: 0.08,   // 8% chance
        ap_potion: 0.12,             // 12% chance
        buff_potion: 0.05            // 5% chance
      },

      // Shop pricing for sustainable economy
      shopPricing: {
        health_potion_small: 25,
        health_potion_medium: 60,
        health_potion_large: 120,
        ap_potion: 40,
        buff_potion: 80,
        equipment_multiplier: 1.5    // Equipment costs 1.5x base value
      },

      // Gold economy balance
      goldEconomy: {
        enemyGoldBase: 10,           // Base gold per enemy level
        bossGoldMultiplier: 3.0,     // Bosses give 3x gold
        shopInflation: 1.2,          // Shop prices 20% higher than base
        sellValueRatio: 0.6          // Sell items for 60% of purchase price
      }
    };

    // Progression pacing targets
    this.progressionPacing = {
      // XP targets for level progression timing
      levelProgressionTargets: {
        timePerLevel: { min: 30, max: 45 }, // 30-45 minutes per level
        xpPerMinute: 25,                    // Target XP gain rate
        combatsPerLevel: { min: 8, max: 12 } // 8-12 combats per level
      },

      // XP rewards scaling
      xpRewards: {
        baseXPPerLevel: 25,          // Base XP = enemy level * 25
        levelDifferenceModifier: {
          tooLow: 0.5,              // 50% XP if enemy 3+ levels below party
          low: 0.8,                 // 80% XP if enemy 1-2 levels below party
          equal: 1.0,               // 100% XP for equal level
          high: 1.3,                // 130% XP if enemy 1-2 levels above party
          tooHigh: 1.5              // 150% XP if enemy 3+ levels above party
        },
        bossXPMultiplier: 2.0,      // Bosses give 2x XP
        partyXPSplit: true          // XP split among alive party members
      }
    };

    // Difficulty curve parameters
    this.difficultyCurve = {
      // Enemy stat scaling per level
      statScaling: {
        hp: { base: 30, perLevel: 8, variance: 0.1 },
        atk: { base: 8, perLevel: 2, variance: 0.15 },
        def: { base: 5, perLevel: 1.5, variance: 0.1 },
        spd: { base: 6, perLevel: 1, variance: 0.2 }
      },

      // Floor-based difficulty progression
      floorProgression: {
        baseLevel: 1,               // Starting level for floor 1
        levelIncrement: 2,          // +2 levels per floor
        eliteBonus: 1,              // +1 level for elite enemies
        bossBonus: 3                // +3 levels for bosses
      },

      // Challenge rating thresholds
      challengeRatings: {
        trivial: 0.3,               // 30% of party power
        easy: 0.6,                  // 60% of party power
        moderate: 1.0,              // Equal to party power
        hard: 1.4,                  // 140% of party power
        deadly: 2.0                 // 200% of party power
      }
    };

    console.log('CombatBalanceConfig initialized with comprehensive balance parameters');
  }

  /**
   * Get target combat duration for encounter type
   * @param {string} encounterType - Type of encounter
   * @returns {Object} Min/max duration in seconds
   */
  getCombatDurationTarget(encounterType) {
    return this.combatTimingTargets[encounterType] || this.combatTimingTargets.random;
  }

  /**
   * Calculate enemy HP for target combat duration
   * @param {number} baseHP - Base enemy HP
   * @param {string} encounterType - Type of encounter
   * @param {number} partyDPS - Estimated party damage per second
   * @returns {number} Scaled HP value
   */
  calculateTargetEnemyHP(baseHP, encounterType, partyDPS) {
    const durationTarget = this.getCombatDurationTarget(encounterType);
    const targetDuration = (durationTarget.min + durationTarget.max) / 2; // Average target
    
    // Calculate HP needed for target duration
    const targetHP = Math.floor(partyDPS * targetDuration);
    
    // Apply encounter type multiplier
    const multiplier = this.balanceParameters.enemyHPMultipliers[encounterType] || 1.0;
    
    return Math.max(baseHP, Math.floor(targetHP * multiplier));
  }

  /**
   * Get AP cost for action type
   * @param {string} actionType - Type of action
   * @returns {number} AP cost
   */
  getActionAPCost(actionType) {
    return this.balanceParameters.actionAPCosts[actionType] || 1;
  }

  /**
   * Get skill cooldown for skill tier
   * @param {string} skillTier - Skill tier (basic, utility, powerful, ultimate)
   * @returns {number} Cooldown in turns
   */
  getSkillCooldown(skillTier) {
    return this.balanceParameters.skillCooldowns[skillTier] || 0;
  }

  /**
   * Calculate XP reward for enemy defeat
   * @param {number} enemyLevel - Level of defeated enemy
   * @param {number} partyLevel - Average party level
   * @param {string} encounterType - Type of encounter
   * @returns {number} XP reward
   */
  calculateXPReward(enemyLevel, partyLevel, encounterType = 'random') {
    const baseXP = enemyLevel * this.progressionPacing.xpRewards.baseXPPerLevel;
    
    // Apply level difference modifier
    const levelDiff = enemyLevel - partyLevel;
    let modifier = this.progressionPacing.xpRewards.levelDifferenceModifier.equal;
    
    if (levelDiff <= -3) {
      modifier = this.progressionPacing.xpRewards.levelDifferenceModifier.tooLow;
    } else if (levelDiff <= -1) {
      modifier = this.progressionPacing.xpRewards.levelDifferenceModifier.low;
    } else if (levelDiff >= 3) {
      modifier = this.progressionPacing.xpRewards.levelDifferenceModifier.tooHigh;
    } else if (levelDiff >= 1) {
      modifier = this.progressionPacing.xpRewards.levelDifferenceModifier.high;
    }
    
    // Apply encounter type multiplier
    if (encounterType === 'boss' || encounterType === 'mini_boss') {
      modifier *= this.progressionPacing.xpRewards.bossXPMultiplier;
    }
    
    return Math.floor(baseXP * modifier);
  }

  /**
   * Get potion drop rate for item type
   * @param {string} potionType - Type of potion
   * @returns {number} Drop rate (0-1)
   */
  getPotionDropRate(potionType) {
    return this.resourceEconomy.potionDropRates[potionType] || 0.1;
  }

  /**
   * Get shop price for item
   * @param {string} itemType - Type of item
   * @param {number} baseValue - Base item value
   * @returns {number} Shop price
   */
  getShopPrice(itemType, baseValue) {
    if (this.resourceEconomy.shopPricing[itemType]) {
      return this.resourceEconomy.shopPricing[itemType];
    }
    
    // For equipment, use multiplier
    if (itemType.includes('weapon') || itemType.includes('armor') || itemType.includes('accessory')) {
      return Math.floor(baseValue * this.resourceEconomy.shopPricing.equipment_multiplier);
    }
    
    return Math.floor(baseValue * this.resourceEconomy.goldEconomy.shopInflation);
  }

  /**
   * Validate encounter balance
   * @param {Array} enemies - Array of enemies in encounter
   * @param {number} partyPower - Estimated party power
   * @returns {Object} Balance analysis
   */
  validateEncounterBalance(enemies, partyPower) {
    const totalEnemyPower = enemies.reduce((sum, enemy) => {
      return sum + this.calculateEnemyPower(enemy);
    }, 0);
    
    const powerRatio = totalEnemyPower / partyPower;
    
    let challengeRating = 'moderate';
    for (const [rating, threshold] of Object.entries(this.difficultyCurve.challengeRatings)) {
      if (powerRatio <= threshold) {
        challengeRating = rating;
        break;
      }
    }
    
    return {
      powerRatio,
      challengeRating,
      totalEnemyPower,
      partyPower,
      isBalanced: challengeRating === 'moderate' || challengeRating === 'hard',
      recommendation: this.getBalanceRecommendation(challengeRating)
    };
  }

  /**
   * Calculate enemy power rating
   * @param {Object} enemy - Enemy object
   * @returns {number} Power rating
   */
  calculateEnemyPower(enemy) {
    const level = enemy.level || 1;
    const hp = enemy.stats?.HP || 30;
    const atk = enemy.stats?.ATK || 8;
    const def = enemy.stats?.DEF || 5;
    
    // Simple power calculation: (HP + ATK*5 + DEF*2) * level_factor
    const levelFactor = 1 + (level - 1) * 0.2;
    return Math.floor((hp + atk * 5 + def * 2) * levelFactor);
  }

  /**
   * Get balance recommendation
   * @param {string} challengeRating - Current challenge rating
   * @returns {string} Recommendation
   */
  getBalanceRecommendation(challengeRating) {
    const recommendations = {
      trivial: 'Increase enemy count or level - too easy',
      easy: 'Consider adding one more enemy or increasing level by 1',
      moderate: 'Well balanced encounter',
      hard: 'Challenging but fair encounter',
      deadly: 'Reduce enemy count or level - may be too difficult'
    };
    
    return recommendations[challengeRating] || 'Balance analysis inconclusive';
  }

  /**
   * Update balance parameters
   * @param {Object} newParameters - New balance parameters to merge
   */
  updateBalanceParameters(newParameters) {
    this.balanceParameters = {
      ...this.balanceParameters,
      ...newParameters
    };
    
    console.log('Balance parameters updated');
  }

  /**
   * Get progression pacing analysis
   * @param {number} currentLevel - Current party level
   * @param {number} playtimeMinutes - Current playtime in minutes
   * @returns {Object} Progression analysis
   */
  getProgressionAnalysis(currentLevel, playtimeMinutes) {
    const target = this.progressionPacing.levelProgressionTargets;
    const expectedLevel = Math.floor(playtimeMinutes / ((target.min + target.max) / 2));
    const levelDifference = currentLevel - expectedLevel;
    
    let pacing = 'on_track';
    if (levelDifference > 1) {
      pacing = 'ahead';
    } else if (levelDifference < -1) {
      pacing = 'behind';
    }
    
    return {
      currentLevel,
      expectedLevel,
      levelDifference,
      pacing,
      playtimeMinutes,
      recommendation: this.getProgressionRecommendation(pacing)
    };
  }

  /**
   * Get progression recommendation
   * @param {string} pacing - Current pacing status
   * @returns {string} Recommendation
   */
  getProgressionRecommendation(pacing) {
    const recommendations = {
      ahead: 'Consider increasing difficulty or reducing XP rewards',
      on_track: 'Progression pacing is optimal',
      behind: 'Consider increasing XP rewards or reducing difficulty'
    };
    
    return recommendations[pacing] || 'Monitor progression closely';
  }

  /**
   * Export current balance configuration
   * @returns {Object} Complete balance configuration
   */
  exportConfig() {
    return {
      combatTimingTargets: this.combatTimingTargets,
      balanceParameters: this.balanceParameters,
      resourceEconomy: this.resourceEconomy,
      progressionPacing: this.progressionPacing,
      difficultyCurve: this.difficultyCurve
    };
  }

  /**
   * Import balance configuration
   * @param {Object} config - Balance configuration to import
   */
  importConfig(config) {
    if (config.combatTimingTargets) this.combatTimingTargets = config.combatTimingTargets;
    if (config.balanceParameters) this.balanceParameters = config.balanceParameters;
    if (config.resourceEconomy) this.resourceEconomy = config.resourceEconomy;
    if (config.progressionPacing) this.progressionPacing = config.progressionPacing;
    if (config.difficultyCurve) this.difficultyCurve = config.difficultyCurve;
    
    console.log('Balance configuration imported');
  }
}

// Export singleton instance
export const combatBalanceConfig = new CombatBalanceConfig();