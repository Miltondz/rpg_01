/**
 * Character - Base character class with stats, progression, and equipment
 * Handles character creation, stat management, leveling, and skill progression
 */

export class Character {
  constructor(characterClass, name = null) {
    // Basic character info
    this.id = this.generateId();
    this.name = name || this.getDefaultName(characterClass);
    this.class = characterClass;
    this.level = 1;
    this.experience = 0;
    
    // Core stats - initialized by class
    this.baseStats = {
      HP: 0,        // Health Points
      ATK: 0,       // Attack Power
      DEF: 0,       // Defense
      SPD: 0,       // Speed
      element: 'Physical' // Elemental Affinity
    };
    
    // Current stats (base + equipment + buffs)
    this.stats = { ...this.baseStats };
    
    // Health management
    this.currentHP = 0;
    this.maxHP = 0;
    
    // Combat state
    this.currentAP = 3; // Action Points per turn
    this.maxAP = 3;
    this.statusEffects = [];
    
    // Equipment slots
    this.equipment = {
      weapon: null,
      armor: null,
      accessory: null
    };
    
    // Skills and abilities
    this.skills = []; // Array of skill objects with full data
    this.unlockedSkills = []; // Array of skill IDs
    
    // Initialize character based on class
    this.initializeClass(characterClass);
    
    console.log(`Created ${characterClass} character: ${this.name} (Level ${this.level})`);
  }

  /**
   * Initialize character stats and skills based on class
   * @param {string} characterClass - The character class
   */
  initializeClass(characterClass) {
    const classData = this.getClassData(characterClass);
    
    // Set base stats
    this.baseStats = { ...classData.baseStats };
    this.stats = { ...this.baseStats };
    
    // Set HP
    this.maxHP = this.stats.HP;
    this.currentHP = this.maxHP;
    
    // Unlock starting skill
    if (classData.startingSkill) {
      this.unlockSkill(classData.startingSkill);
    }
    
    console.log(`Initialized ${characterClass} with stats:`, this.stats);
  }

  /**
   * Get class-specific data
   * @param {string} characterClass - The character class
   * @returns {Object} Class data including stats and growth
   */
  getClassData(characterClass) {
    // Import CharacterClasses dynamically to avoid circular imports
    const definition = this.getClassDefinition(characterClass);
    
    if (definition) {
      return {
        baseStats: definition.baseStats,
        growth: definition.growth,
        startingSkill: definition.startingSkill
      };
    }
    
    // Fallback to warrior if class not found
    return this.getClassDefinition('warrior');
  }

  /**
   * Get class definition (internal method to avoid import issues)
   * @param {string} characterClass - The character class
   * @returns {Object} Class definition
   */
  getClassDefinition(characterClass) {
    const classDefinitions = {
      'warrior': {
        baseStats: {
          HP: 60,
          ATK: 12,
          DEF: 10,
          SPD: 5,
          element: 'Physical'
        },
        growth: {
          HP: 12,
          ATK: 2,
          DEF: 2,
          SPD: 1
        },
        startingSkill: 'power_strike'
      },
      'rogue': {
        baseStats: {
          HP: 45,
          ATK: 10,
          DEF: 6,
          SPD: 12,
          element: 'Physical'
        },
        growth: {
          HP: 9,
          ATK: 2,
          DEF: 1,
          SPD: 2
        },
        startingSkill: 'backstab'
      },
      'mage': {
        baseStats: {
          HP: 35,
          ATK: 8,
          DEF: 5,
          SPD: 8,
          element: 'Fire'
        },
        growth: {
          HP: 7,
          ATK: 3,
          DEF: 1,
          SPD: 1
        },
        startingSkill: 'fireball'
      },
      'cleric': {
        baseStats: {
          HP: 50,
          ATK: 7,
          DEF: 8,
          SPD: 6,
          element: 'Physical'
        },
        growth: {
          HP: 10,
          ATK: 1,
          DEF: 2,
          SPD: 1
        },
        startingSkill: 'heal'
      }
    };
    
    return classDefinitions[characterClass.toLowerCase()] || classDefinitions['warrior'];
  }

  /**
   * Calculate experience needed for next level
   * Formula: XP_needed = 50 × Level²
   * @param {number} level - Target level
   * @returns {number} Experience needed for that level
   */
  getExperienceForLevel(level) {
    return 50 * (level * level);
  }

  /**
   * Get total experience needed from level 1 to target level
   * @param {number} level - Target level
   * @returns {number} Total experience needed
   */
  getTotalExperienceForLevel(level) {
    let total = 0;
    for (let i = 2; i <= level; i++) {
      total += this.getExperienceForLevel(i);
    }
    return total;
  }

  /**
   * Get experience needed for next level
   * @returns {number} Experience needed to level up
   */
  getExperienceToNextLevel() {
    const nextLevelXP = this.getExperienceForLevel(this.level + 1);
    return nextLevelXP - this.experience;
  }

  /**
   * Add experience and handle level ups
   * @param {number} xp - Experience points to add
   * @returns {boolean} True if leveled up
   */
  addExperience(xp) {
    this.experience += xp;
    
    let leveledUp = false;
    const nextLevelXP = this.getExperienceForLevel(this.level + 1);
    
    // Check for level up (can level multiple times with large XP gains)
    while (this.experience >= nextLevelXP && this.level < 20) {
      this.levelUp();
      leveledUp = true;
    }
    
    return leveledUp;
  }

  /**
   * Level up the character
   */
  levelUp() {
    const oldLevel = this.level;
    this.level++;
    
    // Get class growth data
    const classData = this.getClassData(this.class);
    const growth = classData.growth;
    
    // Increase base stats
    this.baseStats.HP += growth.HP;
    this.baseStats.ATK += growth.ATK;
    this.baseStats.DEF += growth.DEF;
    this.baseStats.SPD += growth.SPD;
    
    // Recalculate current stats
    this.recalculateStats();
    
    // Restore HP to full on level up
    this.currentHP = this.maxHP;
    
    // Check for new skill unlocks
    this.checkSkillUnlocks();
    
    console.log(`${this.name} leveled up! ${oldLevel} → ${this.level}`);
    console.log(`New stats:`, this.stats);
    
    // Emit level up event
    this.emitEvent('levelUp', {
      character: this,
      oldLevel: oldLevel,
      newLevel: this.level,
      statsGained: growth
    });
  }

  /**
   * Check and unlock new skills based on level
   */
  checkSkillUnlocks() {
    const skillUnlocks = this.getSkillUnlocks(this.class);
    
    for (const unlock of skillUnlocks) {
      if (this.level >= unlock.level && !this.hasSkill(unlock.skillId)) {
        this.unlockSkill(unlock.skillId);
        
        console.log(`${this.name} unlocked skill: ${unlock.skillId}`);
        
        // Emit skill unlock event
        this.emitEvent('skillUnlocked', {
          character: this,
          skillId: unlock.skillId,
          level: this.level
        });
      }
    }
  }

  /**
   * Get skill unlock progression for a class
   * @param {string} characterClass - The character class
   * @returns {Array} Array of skill unlocks with level requirements
   */
  getSkillUnlocks(characterClass) {
    const skillProgression = {
      'warrior': [
        { level: 1, skillId: 'power_strike' },
        { level: 3, skillId: 'taunt' },
        { level: 5, skillId: 'cleave' },
        { level: 7, skillId: 'iron_will' },
        { level: 10, skillId: 'execute' }
      ],
      'rogue': [
        { level: 1, skillId: 'backstab' },
        { level: 3, skillId: 'poison_blade' },
        { level: 5, skillId: 'evasion' },
        { level: 7, skillId: 'multi_strike' },
        { level: 10, skillId: 'assassinate' }
      ],
      'mage': [
        { level: 1, skillId: 'fireball' },
        { level: 3, skillId: 'ice_shard' },
        { level: 5, skillId: 'lightning_storm' },
        { level: 7, skillId: 'mana_shield' },
        { level: 10, skillId: 'meteor' }
      ],
      'cleric': [
        { level: 1, skillId: 'heal' },
        { level: 3, skillId: 'bless' },
        { level: 5, skillId: 'mass_heal' },
        { level: 7, skillId: 'resurrect' },
        { level: 10, skillId: 'divine_shield' }
      ]
    };
    
    return skillProgression[characterClass.toLowerCase()] || [];
  }

  /**
   * Unlock a skill
   * @param {string} skillId - The skill to unlock
   */
  unlockSkill(skillId) {
    if (!this.hasSkill(skillId)) {
      this.unlockedSkills.push(skillId);
      
      // Add skill object to skills array
      const skillData = this.getSkillData(skillId);
      if (skillData) {
        this.skills.push(skillData);
      }
    }
  }

  /**
   * Get skill data by ID
   * @param {string} skillId - The skill ID
   * @returns {Object} Skill data object
   */
  getSkillData(skillId) {
    // Basic skill definitions - in a real implementation this would come from a skill system
    const skillDatabase = {
      'power_strike': {
        id: 'power_strike',
        name: 'Power Strike',
        description: 'A powerful melee attack that deals extra damage',
        apCost: 2,
        cooldown: 0,
        type: 'attack'
      },
      'taunt': {
        id: 'taunt',
        name: 'Taunt',
        description: 'Forces enemies to target this character',
        apCost: 1,
        cooldown: 2,
        type: 'utility'
      },
      'cleave': {
        id: 'cleave',
        name: 'Cleave',
        description: 'Attacks multiple enemies in front row',
        apCost: 3,
        cooldown: 1,
        type: 'attack'
      },
      'iron_will': {
        id: 'iron_will',
        name: 'Iron Will',
        description: 'Increases defense and resistance to status effects',
        apCost: 2,
        cooldown: 3,
        type: 'buff'
      },
      'execute': {
        id: 'execute',
        name: 'Execute',
        description: 'Deals massive damage to low-health enemies',
        apCost: 3,
        cooldown: 4,
        type: 'attack'
      },
      'backstab': {
        id: 'backstab',
        name: 'Backstab',
        description: 'High critical chance attack from behind',
        apCost: 2,
        cooldown: 0,
        type: 'attack'
      },
      'poison_blade': {
        id: 'poison_blade',
        name: 'Poison Blade',
        description: 'Attacks that apply poison damage over time',
        apCost: 2,
        cooldown: 1,
        type: 'attack'
      },
      'evasion': {
        id: 'evasion',
        name: 'Evasion',
        description: 'Greatly increases dodge chance for several turns',
        apCost: 1,
        cooldown: 3,
        type: 'buff'
      },
      'multi_strike': {
        id: 'multi_strike',
        name: 'Multi Strike',
        description: 'Attacks the same target multiple times',
        apCost: 3,
        cooldown: 2,
        type: 'attack'
      },
      'assassinate': {
        id: 'assassinate',
        name: 'Assassinate',
        description: 'Chance to instantly kill a target',
        apCost: 3,
        cooldown: 5,
        type: 'attack'
      },
      'fireball': {
        id: 'fireball',
        name: 'Fireball',
        description: 'Launches a fireball that deals fire damage',
        apCost: 2,
        cooldown: 0,
        type: 'spell'
      },
      'ice_shard': {
        id: 'ice_shard',
        name: 'Ice Shard',
        description: 'Ice attack that may slow the target',
        apCost: 2,
        cooldown: 1,
        type: 'spell'
      },
      'lightning_storm': {
        id: 'lightning_storm',
        name: 'Lightning Storm',
        description: 'Area lightning attack hitting multiple enemies',
        apCost: 3,
        cooldown: 2,
        type: 'spell'
      },
      'mana_shield': {
        id: 'mana_shield',
        name: 'Mana Shield',
        description: 'Creates a magical barrier that absorbs damage',
        apCost: 2,
        cooldown: 3,
        type: 'buff'
      },
      'meteor': {
        id: 'meteor',
        name: 'Meteor',
        description: 'Devastating area attack with massive damage',
        apCost: 4,
        cooldown: 5,
        type: 'spell'
      },
      'heal': {
        id: 'heal',
        name: 'Heal',
        description: 'Restores health to a single target',
        apCost: 2,
        cooldown: 0,
        type: 'heal'
      },
      'bless': {
        id: 'bless',
        name: 'Bless',
        description: 'Increases target\'s stats temporarily',
        apCost: 2,
        cooldown: 1,
        type: 'buff'
      },
      'mass_heal': {
        id: 'mass_heal',
        name: 'Mass Heal',
        description: 'Heals all party members',
        apCost: 3,
        cooldown: 2,
        type: 'heal'
      },
      'resurrect': {
        id: 'resurrect',
        name: 'Resurrect',
        description: 'Brings a fallen ally back to life',
        apCost: 4,
        cooldown: 4,
        type: 'heal'
      },
      'divine_shield': {
        id: 'divine_shield',
        name: 'Divine Shield',
        description: 'Grants immunity to damage for a short time',
        apCost: 3,
        cooldown: 6,
        type: 'buff'
      }
    };
    
    return skillDatabase[skillId] || null;
  }

  /**
   * Check if character has a skill
   * @param {string} skillId - The skill to check
   * @returns {boolean} True if character has the skill
   */
  hasSkill(skillId) {
    return this.unlockedSkills.includes(skillId);
  }

  /**
   * Equip an item using the equipment system
   * @param {Object} item - The item to equip
   * @param {string} slot - The equipment slot (weapon, armor, accessory)
   * @returns {Object} Result with success status and previous item
   */
  equipItem(item, slot) {
    // This method now delegates to the EquipmentSystem
    // The actual implementation will be handled by the system that manages this character
    console.warn('equipItem called directly on Character - should use EquipmentSystem');
    return { success: false, message: 'Use EquipmentSystem.equipItem instead', previousItem: null };
  }

  /**
   * Unequip an item using the equipment system
   * @param {string} slot - The equipment slot to unequip
   * @returns {Object} Result with success status and unequipped item
   */
  unequipItem(slot) {
    // This method now delegates to the EquipmentSystem
    // The actual implementation will be handled by the system that manages this character
    console.warn('unequipItem called directly on Character - should use EquipmentSystem');
    return { success: false, message: 'Use EquipmentSystem.unequipItem instead', item: null };
  }

  /**
   * Check if character can equip an item (basic validation)
   * @param {Object} item - The item to check
   * @returns {boolean} True if item can be equipped (basic check only)
   */
  canEquip(item) {
    // Basic validation - full validation should use EquipmentSystem.canEquip
    if (!item) return false;
    
    // Check level requirement
    if (item.requirements && item.requirements.level > this.level) {
      return false;
    }
    
    // Check class requirement
    if (item.requirements && item.requirements.class) {
      const allowedClasses = Array.isArray(item.requirements.class) 
        ? item.requirements.class 
        : [item.requirements.class];
      
      // Check both lowercase and original case for compatibility
      const characterClass = this.class.toLowerCase();
      const hasClassMatch = allowedClasses.some(allowedClass => 
        allowedClass.toLowerCase() === characterClass
      );
      
      if (!hasClassMatch) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get base stats without equipment bonuses
   * @returns {Object} Base stats
   */
  getBaseStats() {
    return { ...this.baseStats };
  }

  /**
   * Recalculate all stats including equipment bonuses
   * This method is called by the EquipmentSystem when equipment changes
   */
  recalculateStats() {
    // Start with base stats
    this.stats = { ...this.baseStats };
    
    // Add equipment bonuses using proper item stat calculation
    for (const slot in this.equipment) {
      const item = this.equipment[slot];
      if (item && item.stats) {
        // Use item's getFinalStats method if available (includes rarity bonuses)
        const itemStats = typeof item.getFinalStats === 'function' 
          ? item.getFinalStats() 
          : item.stats;
          
        for (const stat in itemStats) {
          if (this.stats.hasOwnProperty(stat)) {
            this.stats[stat] += itemStats[stat];
          }
        }
      }
    }
    
    // Update max HP and ensure current HP doesn't exceed max
    this.maxHP = this.stats.HP;
    if (this.currentHP > this.maxHP) {
      this.currentHP = this.maxHP;
    }
  }

  /**
   * Take damage
   * @param {number} damage - Amount of damage to take
   * @returns {boolean} True if character died
   */
  takeDamage(damage) {
    this.currentHP = Math.max(0, this.currentHP - damage);
    
    const died = this.currentHP === 0;
    if (died) {
      console.log(`${this.name} has been defeated!`);
      this.emitEvent('characterDied', { character: this });
    }
    
    return died;
  }

  /**
   * Heal character
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
   * Restore character to full health
   */
  fullHeal() {
    this.currentHP = this.maxHP;
    console.log(`${this.name} fully healed to ${this.maxHP} HP`);
  }

  /**
   * Check if character is alive
   * @returns {boolean} True if character is alive
   */
  isAlive() {
    return this.currentHP > 0;
  }

  /**
   * Check if character is dead
   * @returns {boolean} True if character is dead
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
   * Check if character has enough AP for an action
   * @param {number} cost - AP cost to check
   * @returns {boolean} True if character has enough AP
   */
  hasAP(cost) {
    return this.currentAP >= cost;
  }

  /**
   * Generate unique character ID
   * @returns {string} Unique character ID
   */
  generateId() {
    return 'char_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Get default name for character class
   * @param {string} characterClass - The character class
   * @returns {string} Default name
   */
  getDefaultName(characterClass) {
    const defaultNames = {
      'warrior': 'Warrior',
      'rogue': 'Rogue',
      'mage': 'Mage',
      'cleric': 'Cleric'
    };
    
    return defaultNames[characterClass.toLowerCase()] || 'Character';
  }

  /**
   * Emit character event
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  emitEvent(eventType, data) {
    // Only emit events in browser environment
    if (typeof window !== 'undefined' && window.CustomEvent) {
      const event = new CustomEvent(eventType, { detail: data });
      window.dispatchEvent(event);
    }
  }

  /**
   * Get character summary for display
   * @returns {Object} Character summary
   */
  getSummary() {
    return {
      id: this.id,
      name: this.name,
      class: this.class,
      level: this.level,
      experience: this.experience,
      experienceToNext: this.getExperienceToNextLevel(),
      stats: { ...this.stats },
      currentHP: this.currentHP,
      maxHP: this.maxHP,
      currentAP: this.currentAP,
      maxAP: this.maxAP,
      equipment: { ...this.equipment },
      skills: [...this.unlockedSkills],
      isAlive: this.isAlive()
    };
  }

  /**
   * Serialize character for saving
   * @returns {Object} Serialized character data
   */
  serialize() {
    return {
      id: this.id,
      name: this.name,
      class: this.class,
      level: this.level,
      experience: this.experience,
      baseStats: { ...this.baseStats },
      currentHP: this.currentHP,
      equipment: { ...this.equipment },
      unlockedSkills: [...this.unlockedSkills],
      statusEffects: [...this.statusEffects]
    };
  }

  /**
   * Deserialize character from save data
   * @param {Object} data - Serialized character data
   * @returns {Character} Restored character
   */
  static deserialize(data) {
    const character = new Character(data.class, data.name);
    
    character.id = data.id;
    character.level = data.level;
    character.experience = data.experience;
    character.baseStats = { ...data.baseStats };
    character.currentHP = data.currentHP;
    character.equipment = { ...data.equipment };
    character.unlockedSkills = [...data.unlockedSkills];
    character.statusEffects = [...data.statusEffects];
    
    // Recalculate derived stats
    character.recalculateStats();
    
    return character;
  }
}