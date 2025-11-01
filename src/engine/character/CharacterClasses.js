/**
 * CharacterClasses - Defines the four character classes with their unique progressions
 * Warrior, Rogue, Mage, and Cleric with distinct stat growth and abilities
 */

export class CharacterClasses {
  /**
   * Get all available character classes
   * @returns {Array} Array of class names
   */
  static getAvailableClasses() {
    return ['warrior', 'rogue', 'mage', 'cleric'];
  }

  /**
   * Get detailed class information
   * @param {string} className - Name of the class
   * @returns {Object} Complete class definition
   */
  static getClassDefinition(className) {
    const definitions = {
      warrior: {
        name: 'Warrior',
        description: 'Tank/Melee DPS - High HP and DEF, excels in close combat',
        role: 'Tank/Melee DPS',
        primaryStats: ['HP', 'DEF'],
        secondaryStats: ['ATK'],
        baseStats: {
          HP: 60,
          ATK: 12,
          DEF: 10,
          SPD: 5,
          element: 'Physical'
        },
        growth: {
          HP: 12,    // +12 HP per level
          ATK: 2,    // +2 ATK per level
          DEF: 2,    // +2 DEF per level
          SPD: 1     // +1 SPD per level
        },
        startingSkill: 'power_strike',
        skillProgression: [
          { level: 1, skillId: 'power_strike', name: 'Power Strike' },
          { level: 3, skillId: 'taunt', name: 'Taunt' },
          { level: 5, skillId: 'cleave', name: 'Cleave' },
          { level: 7, skillId: 'iron_will', name: 'Iron Will' },
          { level: 10, skillId: 'execute', name: 'Execute' }
        ],
        strengths: [
          'High survivability with massive HP pool',
          'Strong defensive capabilities',
          'Excellent front-line fighter',
          'Can protect allies with taunt abilities'
        ],
        weaknesses: [
          'Low speed makes them act last',
          'Limited ranged options',
          'Vulnerable to magic damage'
        ]
      },

      rogue: {
        name: 'Rogue',
        description: 'DPS/Critical Specialist - High SPD and critical hits',
        role: 'DPS/Critical',
        primaryStats: ['SPD', 'ATK'],
        secondaryStats: ['HP'],
        baseStats: {
          HP: 45,
          ATK: 10,
          DEF: 6,
          SPD: 12,
          element: 'Physical'
        },
        growth: {
          HP: 9,     // +9 HP per level
          ATK: 2,    // +2 ATK per level
          DEF: 1,    // +1 DEF per level
          SPD: 2     // +2 SPD per level
        },
        startingSkill: 'backstab',
        skillProgression: [
          { level: 1, skillId: 'backstab', name: 'Backstab' },
          { level: 3, skillId: 'poison_blade', name: 'Poison Blade' },
          { level: 5, skillId: 'evasion', name: 'Evasion' },
          { level: 7, skillId: 'multi_strike', name: 'Multi Strike' },
          { level: 10, skillId: 'assassinate', name: 'Assassinate' }
        ],
        strengths: [
          'Highest critical hit chance',
          'Fast action speed',
          'High single-target damage',
          'Status effects and debuffs'
        ],
        weaknesses: [
          'Low HP makes them fragile',
          'Poor defensive stats',
          'Limited AoE capabilities'
        ]
      },

      mage: {
        name: 'Mage',
        description: 'AoE/Elemental Damage - High ATK with elemental magic',
        role: 'AoE/Elemental',
        primaryStats: ['ATK'],
        secondaryStats: ['SPD'],
        baseStats: {
          HP: 35,
          ATK: 8,
          DEF: 5,
          SPD: 8,
          element: 'Fire'
        },
        growth: {
          HP: 7,     // +7 HP per level
          ATK: 3,    // +3 ATK per level (highest growth)
          DEF: 1,    // +1 DEF per level
          SPD: 1     // +1 SPD per level
        },
        startingSkill: 'fireball',
        skillProgression: [
          { level: 1, skillId: 'fireball', name: 'Fireball' },
          { level: 3, skillId: 'ice_shard', name: 'Ice Shard' },
          { level: 5, skillId: 'lightning_storm', name: 'Lightning Storm' },
          { level: 7, skillId: 'mana_shield', name: 'Mana Shield' },
          { level: 10, skillId: 'meteor', name: 'Meteor' }
        ],
        strengths: [
          'Highest attack power growth',
          'Excellent AoE damage',
          'Elemental advantages',
          'Versatile spell arsenal'
        ],
        weaknesses: [
          'Lowest HP pool',
          'Very fragile defensively',
          'High AP costs for powerful spells'
        ]
      },

      cleric: {
        name: 'Cleric',
        description: 'Healer/Support - Healing and buff abilities',
        role: 'Healer/Support',
        primaryStats: ['HP', 'DEF'],
        secondaryStats: ['ATK'],
        baseStats: {
          HP: 50,
          ATK: 7,
          DEF: 8,
          SPD: 6,
          element: 'Physical'
        },
        growth: {
          HP: 10,    // +10 HP per level
          ATK: 1,    // +1 ATK per level (lowest growth)
          DEF: 2,    // +2 DEF per level
          SPD: 1     // +1 SPD per level
        },
        startingSkill: 'heal',
        skillProgression: [
          { level: 1, skillId: 'heal', name: 'Heal' },
          { level: 3, skillId: 'bless', name: 'Bless' },
          { level: 5, skillId: 'mass_heal', name: 'Mass Heal' },
          { level: 7, skillId: 'resurrect', name: 'Resurrect' },
          { level: 10, skillId: 'divine_shield', name: 'Divine Shield' }
        ],
        strengths: [
          'Essential healing abilities',
          'Powerful support buffs',
          'Can resurrect fallen allies',
          'Good survivability'
        ],
        weaknesses: [
          'Lowest damage output',
          'Limited offensive options',
          'Relies on party members for damage'
        ]
      }
    };

    return definitions[className.toLowerCase()] || null;
  }

  /**
   * Get class base stats
   * @param {string} className - Name of the class
   * @returns {Object} Base stats for the class
   */
  static getBaseStats(className) {
    const definition = this.getClassDefinition(className);
    return definition ? definition.baseStats : null;
  }

  /**
   * Get class growth stats
   * @param {string} className - Name of the class
   * @returns {Object} Growth stats per level
   */
  static getGrowthStats(className) {
    const definition = this.getClassDefinition(className);
    return definition ? definition.growth : null;
  }

  /**
   * Get skill progression for a class
   * @param {string} className - Name of the class
   * @returns {Array} Skill unlock progression
   */
  static getSkillProgression(className) {
    const definition = this.getClassDefinition(className);
    return definition ? definition.skillProgression : [];
  }

  /**
   * Get starting skill for a class
   * @param {string} className - Name of the class
   * @returns {string} Starting skill ID
   */
  static getStartingSkill(className) {
    const definition = this.getClassDefinition(className);
    return definition ? definition.startingSkill : null;
  }

  /**
   * Calculate stats at a specific level
   * @param {string} className - Name of the class
   * @param {number} level - Character level
   * @returns {Object} Calculated stats at that level
   */
  static calculateStatsAtLevel(className, level) {
    const definition = this.getClassDefinition(className);
    if (!definition) return null;

    const baseStats = { ...definition.baseStats };
    const growth = definition.growth;
    
    // Apply growth for each level beyond 1
    const levelsGained = level - 1;
    
    baseStats.HP += growth.HP * levelsGained;
    baseStats.ATK += growth.ATK * levelsGained;
    baseStats.DEF += growth.DEF * levelsGained;
    baseStats.SPD += growth.SPD * levelsGained;
    
    return baseStats;
  }

  /**
   * Get skills available at a specific level
   * @param {string} className - Name of the class
   * @param {number} level - Character level
   * @returns {Array} Array of available skill IDs
   */
  static getSkillsAtLevel(className, level) {
    const progression = this.getSkillProgression(className);
    return progression
      .filter(skill => skill.level <= level)
      .map(skill => skill.skillId);
  }

  /**
   * Get next skill unlock for a class
   * @param {string} className - Name of the class
   * @param {number} currentLevel - Current character level
   * @returns {Object|null} Next skill unlock or null if none
   */
  static getNextSkillUnlock(className, currentLevel) {
    const progression = this.getSkillProgression(className);
    return progression.find(skill => skill.level > currentLevel) || null;
  }

  /**
   * Validate class name
   * @param {string} className - Name to validate
   * @returns {boolean} True if valid class name
   */
  static isValidClass(className) {
    return this.getAvailableClasses().includes(className.toLowerCase());
  }

  /**
   * Get class comparison data for character creation
   * @returns {Object} Comparison data for all classes
   */
  static getClassComparison() {
    const classes = this.getAvailableClasses();
    const comparison = {};

    for (const className of classes) {
      const definition = this.getClassDefinition(className);
      comparison[className] = {
        name: definition.name,
        role: definition.role,
        description: definition.description,
        baseStats: definition.baseStats,
        growth: definition.growth,
        strengths: definition.strengths,
        weaknesses: definition.weaknesses,
        skillCount: definition.skillProgression.length
      };
    }

    return comparison;
  }

  /**
   * Get recommended party compositions
   * @returns {Array} Array of recommended party setups
   */
  static getRecommendedParties() {
    return [
      {
        name: 'Balanced Party',
        description: 'Well-rounded team for beginners',
        composition: ['warrior', 'rogue', 'mage', 'cleric'],
        strengths: ['Covers all roles', 'Good survivability', 'Versatile']
      },
      {
        name: 'Tank & Spank',
        description: 'Heavy defense with magical damage',
        composition: ['warrior', 'warrior', 'mage', 'cleric'],
        strengths: ['Very tanky', 'High magical damage', 'Excellent healing']
      },
      {
        name: 'Glass Cannon',
        description: 'High damage but fragile',
        composition: ['rogue', 'rogue', 'mage', 'mage'],
        strengths: ['Massive damage output', 'Fast combat', 'High critical chance']
      },
      {
        name: 'Fortress',
        description: 'Maximum survivability',
        composition: ['warrior', 'cleric', 'cleric', 'mage'],
        strengths: ['Nearly unkillable', 'Constant healing', 'Long battles']
      }
    ];
  }
}