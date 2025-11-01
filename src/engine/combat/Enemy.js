/**
 * Enemy - Enhanced enemy class for combat encounters
 * Provides enemy stats, behavior, and combat functionality with database integration
 */

import { enemyDatabase } from '../data/EnemyDatabase.js';

export class Enemy {
  constructor(enemyType, level = 1) {
    // Get enemy data from database
    this.enemyData = enemyDatabase.getEnemy(enemyType);
    if (!this.enemyData) {
      console.warn(`Unknown enemy type: ${enemyType}, using default`);
      this.enemyData = this.getDefaultEnemyData(enemyType);
    }
    
    // Basic enemy info
    this.id = this.generateId();
    this.name = this.enemyData.name;
    this.type = enemyType;
    this.level = level;
    this.tier = this.enemyData.tier;
    
    // Combat stats
    this.stats = this.calculateStats(level);
    this.currentHP = this.stats.HP;
    this.maxHP = this.stats.HP;
    
    // Combat state
    this.currentAP = 3;
    this.maxAP = 3;
    this.statusEffects = [];
    
    // AI behavior and skills
    this.aiType = this.enemyData.aiType;
    this.skills = this.enemyData.skills || [];
    this.resistances = this.enemyData.resistances || {};
    this.phases = this.enemyData.phases || null; // For boss enemies
    this.currentPhase = 0;
    this.ai = null; // Will be set by combat system
    
    console.log(`Created ${enemyType} enemy: ${this.name} (Level ${level}, Tier ${this.tier})`);
  }

  /**
   * Calculate enemy stats based on level using database data
   * @param {number} level - Enemy level
   * @returns {Object} Calculated stats
   */
  calculateStats(level) {
    const baseStats = this.enemyData.baseStats;
    const levelDifference = level - this.enemyData.baseLevel;
    const levelMultiplier = 1 + levelDifference * 0.15; // 15% increase per level above base
    
    return {
      HP: Math.floor(baseStats.HP * levelMultiplier),
      ATK: Math.floor(baseStats.ATK * levelMultiplier),
      DEF: Math.floor(baseStats.DEF * levelMultiplier),
      SPD: Math.floor(baseStats.SPD * levelMultiplier),
      element: baseStats.element
    };
  }

  /**
   * Get default enemy data for unknown types
   * @param {string} enemyType - Type of enemy
   * @returns {Object} Default enemy data
   */
  getDefaultEnemyData(enemyType) {
    return {
      name: `Unknown ${enemyType}`,
      tier: 1,
      baseLevel: 1,
      baseStats: {
        HP: 25,
        ATK: 8,
        DEF: 4,
        SPD: 7,
        element: 'Physical'
      },
      aiType: 'AGGRESSIVE',
      skills: [],
      resistances: {},
      lootTable: {
        gold: { min: 1, max: 5 },
        experience: 10,
        items: []
      }
    };
  }

  /**
   * Take damage
   * @param {number} damage - Amount of damage to take
   * @returns {boolean} True if enemy died
   */
  takeDamage(damage) {
    this.currentHP = Math.max(0, this.currentHP - damage);
    
    const died = this.currentHP === 0;
    if (died) {
      console.log(`${this.name} has been defeated!`);
    }
    
    return died;
  }

  /**
   * Heal enemy
   * @param {number} amount - Amount to heal
   * @returns {number} Actual amount healed
   */
  heal(amount) {
    const oldHP = this.currentHP;
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    const actualHealing = this.currentHP - oldHP;
    
    if (actualHealing > 0) {
      console.log(`${this.name} healed for ${actualHealing} HP`);
    }
    
    return actualHealing;
  }

  /**
   * Check if enemy is alive
   * @returns {boolean} True if enemy is alive
   */
  isAlive() {
    return this.currentHP > 0;
  }

  /**
   * Check if enemy is dead
   * @returns {boolean} True if enemy is dead
   */
  isDead() {
    return this.currentHP === 0;
  }

  /**
   * Get HP percentage
   * @returns {number} HP percentage (0-1)
   */
  getHPPercentage() {
    return this.maxHP > 0 ? this.currentHP / this.maxHP : 0;
  }

  /**
   * Scale enemy to specific level
   * @param {number} targetLevel - Target level to scale to
   */
  scaleToLevel(targetLevel) {
    if (targetLevel === this.level) {
      return;
    }

    const oldLevel = this.level;
    this.level = targetLevel;
    
    // Recalculate stats
    const newStats = this.calculateStats(targetLevel);
    const hpPercentage = this.getHPPercentage();
    
    this.stats = newStats;
    this.maxHP = newStats.HP;
    this.currentHP = Math.floor(newStats.HP * hpPercentage); // Maintain HP percentage
    
    console.log(`Scaled ${this.name} from level ${oldLevel} to ${targetLevel}`);
  }

  /**
   * Apply damage with resistance calculation
   * @param {number} damage - Base damage amount
   * @param {string} element - Damage element type
   * @returns {number} Actual damage dealt
   */
  takeDamageWithElement(damage, element = 'Physical') {
    let actualDamage = damage;
    
    // Apply elemental resistance
    if (this.resistances && this.resistances[element]) {
      actualDamage = Math.floor(damage * this.resistances[element]);
    }
    
    this.currentHP = Math.max(0, this.currentHP - actualDamage);
    
    const died = this.currentHP === 0;
    if (died) {
      console.log(`${this.name} has been defeated by ${element} damage!`);
    }
    
    return actualDamage;
  }

  /**
   * Check if enemy has specific skill
   * @param {string} skillId - Skill ID to check
   * @returns {boolean} True if enemy has the skill
   */
  hasSkill(skillId) {
    return this.skills.some(skill => skill.id === skillId);
  }

  /**
   * Get available skills for current AP
   * @returns {Array} Array of usable skills
   */
  getAvailableSkills() {
    return this.skills.filter(skill => this.currentAP >= skill.apCost);
  }

  /**
   * Use skill by ID
   * @param {string} skillId - ID of skill to use
   * @returns {Object|null} Skill data or null if not available
   */
  useSkill(skillId) {
    const skill = this.skills.find(s => s.id === skillId);
    if (!skill || !this.hasAP(skill.apCost)) {
      return null;
    }
    
    this.useAP(skill.apCost);
    return skill;
  }

  /**
   * Check boss phase transition
   * @returns {boolean} True if phase changed
   */
  checkPhaseTransition() {
    if (!this.phases || this.phases.length <= 1) {
      return false;
    }
    
    const hpPercentage = this.getHPPercentage();
    const currentPhaseData = this.phases[this.currentPhase];
    
    // Check if we should advance to next phase
    for (let i = this.currentPhase + 1; i < this.phases.length; i++) {
      const nextPhase = this.phases[i];
      if (hpPercentage <= nextPhase.hpThreshold) {
        console.log(`${this.name} enters phase ${i + 1}!`);
        this.currentPhase = i;
        this.onPhaseTransition(nextPhase);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Handle phase transition effects
   * @param {Object} phaseData - New phase data
   */
  onPhaseTransition(phaseData) {
    // Update available skills for this phase
    if (phaseData.skills) {
      this.currentPhaseSkills = phaseData.skills;
    }
    
    // Apply phase-specific effects
    if (phaseData.effects) {
      for (const effect of phaseData.effects) {
        this.applyPhaseEffect(effect);
      }
    }
    
    // Restore some AP for dramatic effect
    this.currentAP = Math.min(this.maxAP, this.currentAP + 1);
  }

  /**
   * Apply phase-specific effect
   * @param {Object} effect - Effect to apply
   */
  applyPhaseEffect(effect) {
    switch (effect.type) {
      case 'heal':
        this.heal(effect.amount || Math.floor(this.maxHP * 0.2));
        break;
      case 'stat_boost':
        if (effect.stat && effect.amount) {
          this.stats[effect.stat] += effect.amount;
        }
        break;
      case 'new_skills':
        if (effect.skills) {
          this.skills.push(...effect.skills);
        }
        break;
    }
  }

  /**
   * Get current phase skills (for boss enemies)
   * @returns {Array} Available skills for current phase
   */
  getCurrentPhaseSkills() {
    if (!this.phases || this.currentPhase >= this.phases.length) {
      return this.skills;
    }
    
    const phaseData = this.phases[this.currentPhase];
    if (!phaseData.skills) {
      return this.skills;
    }
    
    // Filter skills to only those available in current phase
    return this.skills.filter(skill => 
      phaseData.skills.includes(skill.id)
    );
  }

  /**
   * Get loot drops for this enemy
   * @returns {Object} Loot drop data
   */
  getLootDrops() {
    if (!this.enemyData.lootTable) {
      return {
        gold: 0,
        experience: 0,
        items: []
      };
    }
    
    const lootTable = this.enemyData.lootTable;
    const drops = {
      gold: 0,
      experience: lootTable.experience || 0,
      items: []
    };
    
    // Calculate gold drop
    if (lootTable.gold) {
      drops.gold = Math.floor(
        Math.random() * (lootTable.gold.max - lootTable.gold.min + 1) + lootTable.gold.min
      );
    }
    
    // Calculate item drops
    if (lootTable.items) {
      for (const itemDrop of lootTable.items) {
        if (Math.random() < itemDrop.chance) {
          const quantity = itemDrop.quantity || { min: 1, max: 1 };
          const dropQuantity = Math.floor(
            Math.random() * (quantity.max - quantity.min + 1) + quantity.min
          );
          
          drops.items.push({
            itemId: itemDrop.itemId,
            quantity: dropQuantity
          });
        }
      }
    }
    
    return drops;
  }

  /**
   * Reset AP to maximum (start of turn)
   */
  resetAP() {
    this.currentAP = this.maxAP;
  }

  /**
   * Use AP for an action
   * @param {number} cost - AP cost of the action
   * @returns {boolean} True if AP was successfully used
   */
  useAP(cost) {
    if (this.currentAP >= cost) {
      this.currentAP -= cost;
      return true;
    }
    return false;
  }

  /**
   * Check if enemy has enough AP for an action
   * @param {number} cost - AP cost to check
   * @returns {boolean} True if enemy has enough AP
   */
  hasAP(cost) {
    return this.currentAP >= cost;
  }

  /**
   * Generate unique enemy ID
   * @returns {string} Unique enemy ID
   */
  generateId() {
    return 'enemy_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Get enemy summary for display
   * @returns {Object} Enemy summary
   */
  getSummary() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      level: this.level,
      stats: { ...this.stats },
      currentHP: this.currentHP,
      maxHP: this.maxHP,
      currentAP: this.currentAP,
      maxAP: this.maxAP,
      aiType: this.aiType,
      isAlive: this.isAlive()
    };
  }

  /**
   * Set AI system for this enemy
   * @param {EnemyAI} aiSystem - AI system instance
   */
  setAI(aiSystem) {
    this.ai = aiSystem;
  }

  /**
   * Get AI decision for this enemy's turn
   * @param {Object} playerParty - Player party manager
   * @param {Array} enemies - All enemies in combat
   * @returns {Object|null} AI decision with action and target
   */
  getAIDecision(playerParty, enemies) {
    if (!this.ai || !this.isAlive()) {
      return null;
    }
    
    return this.ai.selectAction(this, playerParty, enemies);
  }

  /**
   * Create enemy from template
   * @param {string} enemyType - Type of enemy to create
   * @param {number} level - Enemy level
   * @returns {Enemy} New enemy instance
   */
  static create(enemyType, level = 1) {
    return new Enemy(enemyType, level);
  }

  /**
   * Create multiple enemies
   * @param {Array} enemyList - Array of {type, level} objects
   * @returns {Array} Array of enemy instances
   */
  static createGroup(enemyList) {
    return enemyList.map(enemyData => 
      new Enemy(enemyData.type, enemyData.level || 1)
    );
  }
}