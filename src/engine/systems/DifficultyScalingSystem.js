/**
 * DifficultyScalingSystem - Manages dynamic difficulty scaling and balance
 * Handles enemy level scaling, stat scaling, and loot scaling based on party progression
 */

import { combatBalanceConfig } from '../balance/CombatBalanceConfig.js';

export class DifficultyScalingSystem {
  constructor(partyManager, lootSystem) {
    this.partyManager = partyManager;
    this.lootSystem = lootSystem;
    this.balanceConfig = combatBalanceConfig;
    
    // Scaling configuration
    this.scalingConfig = {
      // Enemy level scaling
      levelVariance: 2,        // ±2 levels from base
      floorLevelBase: 1,       // Base level for floor 1
      floorLevelIncrement: 2,  // Level increase per floor
      
      // Stat scaling formulas
      hpScaling: {
        base: 30,              // Base HP at level 1
        perLevel: 8,           // HP increase per level
        variance: 0.1          // ±10% variance
      },
      
      atkScaling: {
        base: 8,               // Base ATK at level 1
        perLevel: 2,           // ATK increase per level
        variance: 0.15         // ±15% variance
      },
      
      defScaling: {
        base: 5,               // Base DEF at level 1
        perLevel: 1.5,         // DEF increase per level
        variance: 0.1          // ±10% variance
      },
      
      spdScaling: {
        base: 6,               // Base SPD at level 1
        perLevel: 1,           // SPD increase per level
        variance: 0.2          // ±20% variance
      },
      
      // Loot scaling
      lootScaling: {
        baseGold: 10,          // Base gold per enemy level
        goldVariance: 0.3,     // ±30% gold variance
        rarityBonus: {         // Rarity chance bonus per level difference
          uncommon: 0.02,      // +2% per level
          rare: 0.01,          // +1% per level
          epic: 0.005          // +0.5% per level
        }
      }
    };
    
    // Difficulty modifiers
    this.difficultyModifiers = {
      easy: {
        enemyStatMultiplier: 0.8,
        lootMultiplier: 1.2,
        experienceMultiplier: 1.1
      },
      normal: {
        enemyStatMultiplier: 1.0,
        lootMultiplier: 1.0,
        experienceMultiplier: 1.0
      },
      hard: {
        enemyStatMultiplier: 1.3,
        lootMultiplier: 0.9,
        experienceMultiplier: 1.2
      },
      nightmare: {
        enemyStatMultiplier: 1.6,
        lootMultiplier: 0.8,
        experienceMultiplier: 1.5
      }
    };
    
    this.currentDifficulty = 'normal';
    
    console.log('DifficultyScalingSystem initialized');
  }

  /**
   * Calculate appropriate enemy level for current context
   * @param {number} dungeonFloor - Current dungeon floor
   * @param {Object} encounterType - Type of encounter ('random', 'scripted', 'boss')
   * @returns {number} Scaled enemy level
   */
  calculateEnemyLevel(dungeonFloor, encounterType = 'random') {
    const partyLevel = this.partyManager.getAverageLevel();
    
    // Base level calculation
    let baseLevel = this.scalingConfig.floorLevelBase + 
                   (dungeonFloor - 1) * this.scalingConfig.floorLevelIncrement;
    
    // Adjust based on encounter type
    switch (encounterType) {
      case 'boss':
        baseLevel += 2; // Bosses are 2 levels higher
        break;
      case 'scripted':
        baseLevel += 1; // Scripted encounters are 1 level higher
        break;
      case 'random':
      default:
        // No adjustment for random encounters
        break;
    }
    
    // Apply party level influence (50% base level, 50% party level)
    const targetLevel = Math.floor((baseLevel + partyLevel) / 2);
    
    // Add variance
    const variance = Math.floor(Math.random() * (this.scalingConfig.levelVariance * 2 + 1)) - 
                    this.scalingConfig.levelVariance;
    
    const finalLevel = Math.max(1, targetLevel + variance);
    
    console.log(`Enemy level calculation: Floor ${dungeonFloor}, Party ${partyLevel}, Base ${baseLevel}, Final ${finalLevel}`);
    
    return finalLevel;
  }

  /**
   * Scale enemy stats based on level and difficulty
   * @param {Object} enemy - Enemy object to scale
   * @param {number} targetLevel - Target level for scaling
   * @param {string} encounterType - Type of encounter for balance scaling
   * @returns {Object} Scaled stats
   */
  scaleEnemyStats(enemy, targetLevel, encounterType = 'random') {
    const config = this.scalingConfig;
    const difficulty = this.difficultyModifiers[this.currentDifficulty];
    const balanceConfig = this.balanceConfig.difficultyCurve.statScaling;
    
    // Calculate base stats using balance configuration
    const scaledStats = {
      HP: this.calculateScaledStat(balanceConfig.hp, targetLevel),
      ATK: this.calculateScaledStat(balanceConfig.atk, targetLevel),
      DEF: this.calculateScaledStat(balanceConfig.def, targetLevel),
      SPD: this.calculateScaledStat(balanceConfig.spd, targetLevel)
    };
    
    // Apply encounter type multipliers for combat duration balance
    const hpMultiplier = this.balanceConfig.balanceParameters.enemyHPMultipliers[encounterType] || 1.0;
    const atkMultiplier = this.balanceConfig.balanceParameters.enemyATKMultipliers[encounterType] || 1.0;
    
    scaledStats.HP = Math.floor(scaledStats.HP * hpMultiplier);
    scaledStats.ATK = Math.floor(scaledStats.ATK * atkMultiplier);
    
    // Apply difficulty modifiers
    scaledStats.HP = Math.floor(scaledStats.HP * difficulty.enemyStatMultiplier);
    scaledStats.ATK = Math.floor(scaledStats.ATK * difficulty.enemyStatMultiplier);
    scaledStats.DEF = Math.floor(scaledStats.DEF * difficulty.enemyStatMultiplier);
    scaledStats.SPD = Math.floor(scaledStats.SPD * difficulty.enemyStatMultiplier);
    
    // Apply enemy type modifiers
    if (enemy.statModifiers) {
      scaledStats.HP = Math.floor(scaledStats.HP * (enemy.statModifiers.hp || 1.0));
      scaledStats.ATK = Math.floor(scaledStats.ATK * (enemy.statModifiers.atk || 1.0));
      scaledStats.DEF = Math.floor(scaledStats.DEF * (enemy.statModifiers.def || 1.0));
      scaledStats.SPD = Math.floor(scaledStats.SPD * (enemy.statModifiers.spd || 1.0));
    }
    
    console.log(`Scaled ${enemy.name} (${encounterType}) to level ${targetLevel}:`, scaledStats);
    
    return scaledStats;
  }

  /**
   * Calculate scaled stat value with variance
   * @param {Object} statConfig - Stat scaling configuration
   * @param {number} level - Target level
   * @returns {number} Scaled stat value
   */
  calculateScaledStat(statConfig, level) {
    // Base calculation: base + (level - 1) * perLevel
    const baseValue = statConfig.base + (level - 1) * statConfig.perLevel;
    
    // Apply variance
    const variance = 1 + (Math.random() * 2 - 1) * statConfig.variance;
    
    return Math.floor(baseValue * variance);
  }

  /**
   * Scale loot rewards based on enemy level and party progression
   * @param {Array} enemies - Array of defeated enemies
   * @param {number} partyLevel - Average party level
   * @returns {Object} Scaled loot rewards
   */
  scaleLootRewards(enemies, partyLevel) {
    const config = this.scalingConfig.lootScaling;
    const difficulty = this.difficultyModifiers[this.currentDifficulty];
    
    let totalGold = 0;
    const lootItems = [];
    
    for (const enemy of enemies) {
      const enemyLevel = enemy.level || 1;
      
      // Calculate gold reward
      const baseGold = config.baseGold * enemyLevel;
      const goldVariance = 1 + (Math.random() * 2 - 1) * config.goldVariance;
      const enemyGold = Math.floor(baseGold * goldVariance * difficulty.lootMultiplier);
      
      totalGold += enemyGold;
      
      // Calculate item drops
      const itemDrops = this.calculateItemDrops(enemy, partyLevel);
      lootItems.push(...itemDrops);
    }
    
    return {
      gold: totalGold,
      items: lootItems
    };
  }

  /**
   * Calculate item drops for a specific enemy
   * @param {Object} enemy - Enemy that was defeated
   * @param {number} partyLevel - Average party level
   * @returns {Array} Array of dropped items
   */
  calculateItemDrops(enemy, partyLevel) {
    const config = this.scalingConfig.lootScaling;
    const drops = [];
    
    // Base drop chance (varies by enemy type)
    const baseDropChance = enemy.dropChance || 0.3; // 30% default
    
    if (Math.random() < baseDropChance) {
      // Determine item rarity based on level difference
      const levelDifference = Math.max(0, enemy.level - partyLevel);
      
      const rarityChances = {
        common: 0.6 - (levelDifference * 0.05),
        uncommon: 0.25 + (levelDifference * config.rarityBonus.uncommon),
        rare: 0.12 + (levelDifference * config.rarityBonus.rare),
        epic: 0.03 + (levelDifference * config.rarityBonus.epic)
      };
      
      // Normalize probabilities
      const totalChance = Object.values(rarityChances).reduce((sum, chance) => sum + chance, 0);
      Object.keys(rarityChances).forEach(rarity => {
        rarityChances[rarity] /= totalChance;
      });
      
      // Select rarity
      const rarity = this.selectRarity(rarityChances);
      
      // Generate item of selected rarity
      if (this.lootSystem && this.lootSystem.generateItem) {
        const item = this.lootSystem.generateItem(rarity, enemy.level, enemy.type);
        if (item) {
          drops.push(item);
        }
      }
    }
    
    return drops;
  }

  /**
   * Select rarity based on weighted probabilities
   * @param {Object} rarityChances - Rarity probability weights
   * @returns {string} Selected rarity
   */
  selectRarity(rarityChances) {
    const random = Math.random();
    let cumulative = 0;
    
    for (const [rarity, chance] of Object.entries(rarityChances)) {
      cumulative += chance;
      if (random <= cumulative) {
        return rarity;
      }
    }
    
    return 'common'; // Fallback
  }

  /**
   * Calculate experience rewards with scaling
   * @param {Array} enemies - Array of defeated enemies
   * @param {number} partyLevel - Average party level
   * @param {string} encounterType - Type of encounter
   * @returns {number} Scaled experience reward
   */
  calculateExperienceReward(enemies, partyLevel, encounterType = 'random') {
    const difficulty = this.difficultyModifiers[this.currentDifficulty];
    let totalExperience = 0;
    
    for (const enemy of enemies) {
      const enemyLevel = enemy.level || 1;
      
      // Use balance configuration for XP calculation
      const baseXP = this.balanceConfig.calculateXPReward(enemyLevel, partyLevel, encounterType);
      
      // Apply difficulty modifier
      const finalXP = Math.floor(baseXP * difficulty.experienceMultiplier);
      
      totalExperience += finalXP;
    }
    
    return totalExperience;
  }

  /**
   * Set difficulty level
   * @param {string} difficulty - Difficulty level ('easy', 'normal', 'hard', 'nightmare')
   * @returns {boolean} True if difficulty was set successfully
   */
  setDifficulty(difficulty) {
    if (!this.difficultyModifiers[difficulty]) {
      console.error('Unknown difficulty level:', difficulty);
      return false;
    }
    
    this.currentDifficulty = difficulty;
    console.log('Difficulty set to:', difficulty);
    
    // Emit difficulty change event
    this.emitScalingEvent('difficultyChanged', {
      newDifficulty: difficulty,
      modifiers: this.difficultyModifiers[difficulty]
    });
    
    return true;
  }

  /**
   * Get current difficulty settings
   * @returns {Object} Current difficulty configuration
   */
  getCurrentDifficulty() {
    return {
      level: this.currentDifficulty,
      modifiers: this.difficultyModifiers[this.currentDifficulty]
    };
  }

  /**
   * Adjust scaling configuration
   * @param {Object} newConfig - New scaling configuration
   */
  updateScalingConfig(newConfig) {
    this.scalingConfig = {
      ...this.scalingConfig,
      ...newConfig
    };
    
    console.log('Scaling configuration updated');
    
    this.emitScalingEvent('configUpdated', {
      newConfig: this.scalingConfig
    });
  }

  /**
   * Get recommended enemy level for current party and floor
   * @param {number} dungeonFloor - Current dungeon floor
   * @returns {Object} Recommended level information
   */
  getRecommendedEnemyLevel(dungeonFloor) {
    const partyLevel = this.partyManager.getAverageLevel();
    const recommendedLevel = this.calculateEnemyLevel(dungeonFloor, 'random');
    
    return {
      partyLevel: partyLevel,
      recommendedLevel: recommendedLevel,
      floorBaseLevel: this.scalingConfig.floorLevelBase + 
                     (dungeonFloor - 1) * this.scalingConfig.floorLevelIncrement,
      difficulty: this.currentDifficulty
    };
  }

  /**
   * Validate encounter balance
   * @param {Array} enemies - Array of enemies in encounter
   * @param {number} partyLevel - Average party level
   * @returns {Object} Balance analysis
   */
  validateEncounterBalance(enemies, partyLevel) {
    const totalEnemyPower = enemies.reduce((sum, enemy) => {
      const level = enemy.level || 1;
      const statTotal = (enemy.stats?.HP || 30) + 
                       (enemy.stats?.ATK || 8) + 
                       (enemy.stats?.DEF || 5) + 
                       (enemy.stats?.SPD || 6);
      return sum + (level * statTotal);
    }, 0);
    
    // Estimate party power (simplified)
    const partySize = this.partyManager.getAliveMembers().length;
    const estimatedPartyPower = partyLevel * partySize * 50; // Rough estimate
    
    const powerRatio = totalEnemyPower / estimatedPartyPower;
    
    let balanceRating;
    if (powerRatio < 0.5) {
      balanceRating = 'too_easy';
    } else if (powerRatio < 0.8) {
      balanceRating = 'easy';
    } else if (powerRatio < 1.2) {
      balanceRating = 'balanced';
    } else if (powerRatio < 1.8) {
      balanceRating = 'hard';
    } else {
      balanceRating = 'too_hard';
    }
    
    return {
      powerRatio: powerRatio,
      balanceRating: balanceRating,
      totalEnemyPower: totalEnemyPower,
      estimatedPartyPower: estimatedPartyPower,
      recommendation: this.getBalanceRecommendation(balanceRating)
    };
  }

  /**
   * Get balance recommendation based on rating
   * @param {string} balanceRating - Current balance rating
   * @returns {string} Recommendation text
   */
  getBalanceRecommendation(balanceRating) {
    switch (balanceRating) {
      case 'too_easy':
        return 'Consider adding more enemies or increasing their level';
      case 'easy':
        return 'Encounter may be slightly easy for the party';
      case 'balanced':
        return 'Encounter appears well-balanced';
      case 'hard':
        return 'Encounter may be challenging but fair';
      case 'too_hard':
        return 'Consider reducing enemy count or level';
      default:
        return 'Balance analysis inconclusive';
    }
  }

  /**
   * Get scaling statistics
   * @returns {Object} Current scaling statistics
   */
  getScalingStats() {
    const partyLevel = this.partyManager.getAverageLevel();
    
    return {
      currentDifficulty: this.currentDifficulty,
      partyLevel: partyLevel,
      scalingConfig: this.scalingConfig,
      difficultyModifiers: this.difficultyModifiers[this.currentDifficulty]
    };
  }

  /**
   * Emit scaling event
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  emitScalingEvent(eventType, data) {
    const event = new CustomEvent('difficultyScalingEvent', {
      detail: {
        type: eventType,
        data: data,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Reset scaling system
   */
  reset() {
    this.currentDifficulty = 'normal';
    console.log('DifficultyScalingSystem reset');
  }
}