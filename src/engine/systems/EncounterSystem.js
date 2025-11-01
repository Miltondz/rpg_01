/**
 * EncounterSystem - Manages random encounters and exploration integration
 * Handles encounter triggers, cooldowns, and scripted encounters
 */

import { Enemy } from '../combat/Enemy.js';
import { enemyDatabase } from '../data/EnemyDatabase.js';

export class EncounterSystem {
  constructor(combatSystem, partyManager) {
    this.combatSystem = combatSystem;
    this.partyManager = partyManager;
    
    // Encounter settings
    this.encounterChance = 0.17; // 17% chance (15-20% range)
    this.encounterCooldown = 3; // No encounters for 3 tiles after combat
    
    // State tracking
    this.lastEncounterPosition = null;
    this.movesSinceEncounter = 0;
    this.isInCombat = false;
    this.scriptedEncounters = new Map(); // Position-based scripted encounters
    
    // Encounter tables by dungeon level/area
    this.encounterTables = new Map();
    this.initializeDefaultEncounterTables();
    
    console.log('EncounterSystem initialized');
  }

  /**
   * Initialize encounter tables using the enemy database
   */
  initializeDefaultEncounterTables() {
    // Crypt of Shadows Floor 1 encounters (levels 1-3)
    this.encounterTables.set('crypt-of-shadows-floor-1', {
      minLevel: 1,
      maxLevel: 3,
      encounters: [
        { 
          id: 'goblin_scout', 
          weight: 40, 
          enemies: [{ type: 'goblin', level: 1 }] 
        },
        { 
          id: 'rat_infestation', 
          weight: 30, 
          enemies: [
            { type: 'giant_rat', level: 1 },
            { type: 'giant_rat', level: 1 }
          ] 
        },
        { 
          id: 'skeleton_guard', 
          weight: 20, 
          enemies: [{ type: 'skeleton', level: 2 }] 
        },
        { 
          id: 'goblin_duo', 
          weight: 10, 
          enemies: [
            { type: 'goblin', level: 1 },
            { type: 'goblin', level: 2 }
          ] 
        }
      ]
    });

    // Crypt of Shadows Floor 2 encounters (levels 3-5)
    this.encounterTables.set('crypt-of-shadows-floor-2', {
      minLevel: 3,
      maxLevel: 5,
      encounters: [
        { 
          id: 'orc_invader', 
          weight: 35, 
          enemies: [{ type: 'orc', level: 3 }] 
        },
        { 
          id: 'undead_patrol', 
          weight: 25, 
          enemies: [
            { type: 'skeleton', level: 3 },
            { type: 'skeleton', level: 2 }
          ] 
        },
        { 
          id: 'shaman_ritual', 
          weight: 20, 
          enemies: [
            { type: 'goblin_shaman', level: 4 },
            { type: 'goblin', level: 2 }
          ] 
        },
        { 
          id: 'dire_wolf_hunt', 
          weight: 20, 
          enemies: [{ type: 'dire_wolf', level: 4 }] 
        }
      ]
    });

    // Crypt of Shadows Floor 3 encounters (levels 5-7)
    this.encounterTables.set('crypt-of-shadows-floor-3', {
      minLevel: 5,
      maxLevel: 7,
      encounters: [
        { 
          id: 'orc_warband', 
          weight: 30, 
          enemies: [
            { type: 'orc', level: 5 },
            { type: 'orc', level: 4 }
          ] 
        },
        { 
          id: 'fallen_knight', 
          weight: 25, 
          enemies: [{ type: 'undead_knight', level: 6 }] 
        },
        { 
          id: 'shadow_stalker', 
          weight: 25, 
          enemies: [{ type: 'shadow_beast', level: 5 }] 
        },
        { 
          id: 'mixed_forces', 
          weight: 20, 
          enemies: [
            { type: 'orc_shaman', level: 6 },
            { type: 'skeleton', level: 4 },
            { type: 'goblin', level: 3 }
          ] 
        }
      ]
    });

    // Crypt of Shadows Floor 4 encounters (levels 7-9)
    this.encounterTables.set('crypt-of-shadows-floor-4', {
      minLevel: 7,
      maxLevel: 9,
      encounters: [
        { 
          id: 'lich_servants', 
          weight: 30, 
          enemies: [
            { type: 'lich_lieutenant', level: 8 },
            { type: 'skeleton', level: 6 }
          ] 
        },
        { 
          id: 'golem_guardian', 
          weight: 25, 
          enemies: [{ type: 'ancient_golem', level: 9 }] 
        },
        { 
          id: 'shadow_legion', 
          weight: 25, 
          enemies: [
            { type: 'shadow_beast', level: 7 },
            { type: 'shadow_beast', level: 6 }
          ] 
        },
        { 
          id: 'elite_forces', 
          weight: 20, 
          enemies: [
            { type: 'undead_knight', level: 8 },
            { type: 'orc_shaman', level: 7 }
          ] 
        }
      ]
    });

    // Crypt of Shadows Floor 5 encounters (levels 9-12)
    this.encounterTables.set('crypt-of-shadows-floor-5', {
      minLevel: 9,
      maxLevel: 12,
      encounters: [
        { 
          id: 'shadow_generals', 
          weight: 35, 
          enemies: [{ type: 'shadow_general', level: 10 }] 
        },
        { 
          id: 'ancient_powers', 
          weight: 25, 
          enemies: [
            { type: 'ancient_lich', level: 11 },
            { type: 'lich_lieutenant', level: 9 }
          ] 
        },
        { 
          id: 'final_guardians', 
          weight: 25, 
          enemies: [
            { type: 'ancient_golem', level: 10 },
            { type: 'shadow_general', level: 9 }
          ] 
        },
        { 
          id: 'shadow_army', 
          weight: 15, 
          enemies: [
            { type: 'shadow_beast', level: 9 },
            { type: 'shadow_beast', level: 8 },
            { type: 'undead_knight', level: 8 }
          ] 
        }
      ]
    });

    console.log('Crypt of Shadows encounter tables initialized');
  }

  /**
   * Check for encounter when player moves to a new position
   * @param {Object} newPosition - New player position {x, z}
   * @param {Object} currentLevel - Current dungeon level data
   * @returns {Promise<Object|null>} Encounter data or null
   */
  async checkForEncounter(newPosition, currentLevel) {
    // Don't trigger encounters if already in combat
    if (this.isInCombat) {
      return null;
    }

    // Check for scripted encounters first
    const scriptedEncounter = this.checkScriptedEncounter(newPosition, currentLevel);
    if (scriptedEncounter) {
      return await this.triggerEncounter(scriptedEncounter, newPosition);
    }

    // Check encounter cooldown
    if (this.movesSinceEncounter < this.encounterCooldown) {
      this.movesSinceEncounter++;
      return null;
    }

    // Check for random encounter
    if (Math.random() < this.encounterChance) {
      const randomEncounter = this.generateRandomEncounter(currentLevel);
      if (randomEncounter) {
        return await this.triggerEncounter(randomEncounter, newPosition);
      }
    }

    // Increment moves since last encounter
    this.movesSinceEncounter++;
    return null;
  }

  /**
   * Check for scripted encounters at specific positions
   * @param {Object} position - Position to check {x, z}
   * @param {Object} currentLevel - Current level data
   * @returns {Object|null} Scripted encounter data or null
   */
  checkScriptedEncounter(position, currentLevel) {
    const positionKey = `${position.x},${position.z}`;
    
    // Check if there's a scripted encounter at this position
    if (this.scriptedEncounters.has(positionKey)) {
      const encounter = this.scriptedEncounters.get(positionKey);
      
      // Check if encounter conditions are met
      if (this.evaluateEncounterConditions(encounter, currentLevel)) {
        // Remove one-time encounters
        if (encounter.oneTime) {
          this.scriptedEncounters.delete(positionKey);
        }
        return encounter;
      }
    }

    return null;
  }

  /**
   * Generate random encounter based on current level
   * @param {Object} currentLevel - Current dungeon level data
   * @returns {Object|null} Random encounter data or null
   */
  generateRandomEncounter(currentLevel) {
    // Determine encounter table based on level
    const floorName = currentLevel.id || 'crypt-of-shadows-floor-1';
    let encounterTable = this.encounterTables.get(floorName);
    
    // Fallback to dynamic generation if no specific table found
    if (!encounterTable) {
      console.log('No predefined encounter table, generating dynamic encounter for:', floorName);
      return this.generateDynamicEncounter(currentLevel);
    }

    if (!encounterTable.encounters.length) {
      console.warn('Empty encounter table for level:', floorName);
      return this.generateDynamicEncounter(currentLevel);
    }

    // Calculate total weight
    const totalWeight = encounterTable.encounters.reduce((sum, enc) => sum + enc.weight, 0);
    
    // Select random encounter based on weight
    let randomValue = Math.random() * totalWeight;
    
    for (const encounter of encounterTable.encounters) {
      randomValue -= encounter.weight;
      if (randomValue <= 0) {
        return {
          type: 'random',
          id: encounter.id,
          enemies: encounter.enemies,
          environment: this.getEnvironmentData(currentLevel)
        };
      }
    }

    // Fallback to first encounter
    return {
      type: 'random',
      id: encounterTable.encounters[0].id,
      enemies: encounterTable.encounters[0].enemies,
      environment: this.getEnvironmentData(currentLevel)
    };
  }

  /**
   * Generate dynamic encounter using enemy database
   * @param {Object} currentLevel - Current dungeon level data
   * @returns {Object} Dynamic encounter data
   */
  generateDynamicEncounter(currentLevel) {
    const partyLevel = this.partyManager.getAverageLevel();
    
    // Determine encounter difficulty based on floor
    let encounterType = 'normal';
    const floorNumber = this.extractFloorNumber(currentLevel.id);
    
    if (floorNumber >= 4) {
      encounterType = Math.random() < 0.3 ? 'hard' : 'normal';
    } else if (floorNumber <= 2) {
      encounterType = Math.random() < 0.3 ? 'easy' : 'normal';
    }
    
    // Generate encounter group using enemy database
    const enemies = enemyDatabase.createEncounterGroup(encounterType, partyLevel);
    
    return {
      type: 'random',
      id: `dynamic_${encounterType}_${Date.now()}`,
      enemies: enemies,
      environment: this.getEnvironmentData(currentLevel)
    };
  }

  /**
   * Extract floor number from level ID
   * @param {string} levelId - Level identifier
   * @returns {number} Floor number
   */
  extractFloorNumber(levelId) {
    const match = levelId.match(/floor-(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  /**
   * Trigger an encounter
   * @param {Object} encounterData - Encounter configuration
   * @param {Object} position - Position where encounter occurred
   * @returns {Promise<Object>} Encounter result
   */
  async triggerEncounter(encounterData, position) {
    console.log('Triggering encounter:', encounterData.id, 'at position:', position);

    // Set combat state
    this.isInCombat = true;
    this.lastEncounterPosition = { ...position };
    this.movesSinceEncounter = 0;

    // Create enemy instances
    const enemies = this.createEnemyInstances(encounterData.enemies);
    
    // Scale enemies based on party level
    this.scaleEnemies(enemies);

    // Initialize combat
    const combatInitialized = this.combatSystem.initializeCombat(
      this.partyManager, 
      enemies, 
      {
        type: encounterData.type,
        id: encounterData.id,
        position: position,
        environment: encounterData.environment
      }
    );

    if (!combatInitialized) {
      console.error('Failed to initialize combat for encounter');
      this.isInCombat = false;
      return null;
    }

    // Emit encounter event
    this.emitEncounterEvent('encounterTriggered', {
      encounter: encounterData,
      position: position,
      enemies: enemies.map(e => ({
        id: e.id,
        name: e.name,
        level: e.level,
        type: e.type
      }))
    });

    return {
      type: encounterData.type,
      id: encounterData.id,
      enemies: enemies,
      position: position
    };
  }

  /**
   * Create enemy instances from encounter data
   * @param {Array} enemyData - Array of enemy configurations
   * @returns {Array} Array of Enemy instances
   */
  createEnemyInstances(enemyData) {
    const enemies = [];
    
    for (let i = 0; i < enemyData.length; i++) {
      const config = enemyData[i];
      const enemy = new Enemy(config.type, config.level || 1);
      
      // Set unique ID for this encounter
      enemy.id = `${config.type}_${i}_${Date.now()}`;
      
      enemies.push(enemy);
    }
    
    return enemies;
  }

  /**
   * Scale enemy stats based on party level for balanced encounters
   * @param {Array} enemies - Array of Enemy instances
   */
  scaleEnemies(enemies) {
    const partyLevel = this.partyManager.getAverageLevel();
    
    for (const enemy of enemies) {
      // Scale enemy level to be within ±2 levels of party average
      const levelDifference = partyLevel - enemy.level;
      
      if (Math.abs(levelDifference) > 2) {
        const targetLevel = Math.max(1, partyLevel + (Math.random() * 4 - 2)); // ±2 levels
        enemy.scaleToLevel(Math.floor(targetLevel));
      }
    }
  }

  /**
   * Add scripted encounter at specific position
   * @param {number} x - Grid X position
   * @param {number} z - Grid Z position
   * @param {Object} encounterData - Encounter configuration
   */
  addScriptedEncounter(x, z, encounterData) {
    const positionKey = `${x},${z}`;
    this.scriptedEncounters.set(positionKey, {
      ...encounterData,
      type: 'scripted',
      position: { x, z }
    });
    
    console.log(`Added scripted encounter "${encounterData.id}" at (${x}, ${z})`);
  }

  /**
   * Remove scripted encounter at position
   * @param {number} x - Grid X position
   * @param {number} z - Grid Z position
   */
  removeScriptedEncounter(x, z) {
    const positionKey = `${x},${z}`;
    const removed = this.scriptedEncounters.delete(positionKey);
    
    if (removed) {
      console.log(`Removed scripted encounter at (${x}, ${z})`);
    }
    
    return removed;
  }

  /**
   * Evaluate encounter conditions (for scripted encounters)
   * @param {Object} encounter - Encounter data
   * @param {Object} currentLevel - Current level data
   * @returns {boolean} True if conditions are met
   */
  evaluateEncounterConditions(encounter, currentLevel) {
    // Check party level requirements
    if (encounter.minPartyLevel) {
      const partyLevel = this.partyManager.getAverageLevel();
      if (partyLevel < encounter.minPartyLevel) {
        return false;
      }
    }

    // Check if encounter has already been completed
    if (encounter.oneTime && encounter.completed) {
      return false;
    }

    // Check custom conditions
    if (encounter.conditions) {
      for (const condition of encounter.conditions) {
        if (!this.evaluateCondition(condition, currentLevel)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   * @param {Object} condition - Condition to evaluate
   * @param {Object} currentLevel - Current level data
   * @returns {boolean} True if condition is met
   */
  evaluateCondition(condition, currentLevel) {
    switch (condition.type) {
      case 'party_size':
        return this.partyManager.getAliveMembers().length >= condition.value;
      
      case 'has_item':
        // Would check inventory for specific item
        return true; // Placeholder
      
      case 'level_progress':
        // Check if certain areas have been explored
        return true; // Placeholder
      
      default:
        console.warn('Unknown condition type:', condition.type);
        return true;
    }
  }

  /**
   * Get environment data for encounter
   * @param {Object} currentLevel - Current level data
   * @returns {Object} Environment data
   */
  getEnvironmentData(currentLevel) {
    return {
      terrain: currentLevel.terrain || 'dungeon',
      lighting: currentLevel.lighting || 'dim',
      weather: 'none', // Indoor dungeon
      modifiers: currentLevel.environmentModifiers || []
    };
  }

  /**
   * Handle combat end to reset encounter state
   * @param {string} result - Combat result ('victory' or 'defeat')
   */
  onCombatEnd(result) {
    console.log('Combat ended with result:', result);
    
    this.isInCombat = false;
    
    // Reset encounter cooldown after combat
    this.movesSinceEncounter = 0;
    
    // Emit encounter end event
    this.emitEncounterEvent('encounterEnded', {
      result: result,
      position: this.lastEncounterPosition
    });
  }

  /**
   * Set encounter chance (for difficulty adjustment)
   * @param {number} chance - New encounter chance (0.0 to 1.0)
   */
  setEncounterChance(chance) {
    this.encounterChance = Math.max(0, Math.min(1, chance));
    console.log('Encounter chance set to:', this.encounterChance);
  }

  /**
   * Set encounter cooldown
   * @param {number} cooldown - Number of moves before encounters can trigger again
   */
  setEncounterCooldown(cooldown) {
    this.encounterCooldown = Math.max(0, cooldown);
    console.log('Encounter cooldown set to:', this.encounterCooldown);
  }

  /**
   * Get encounter statistics
   * @returns {Object} Encounter statistics
   */
  getEncounterStats() {
    return {
      encounterChance: this.encounterChance,
      encounterCooldown: this.encounterCooldown,
      movesSinceEncounter: this.movesSinceEncounter,
      isInCombat: this.isInCombat,
      scriptedEncountersCount: this.scriptedEncounters.size,
      lastEncounterPosition: this.lastEncounterPosition
    };
  }

  /**
   * Emit encounter event
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  emitEncounterEvent(eventType, data) {
    const event = new CustomEvent('encounterEvent', {
      detail: {
        type: eventType,
        data: data,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Reset encounter system
   */
  reset() {
    this.lastEncounterPosition = null;
    this.movesSinceEncounter = 0;
    this.isInCombat = false;
    this.scriptedEncounters.clear();
    
    console.log('EncounterSystem reset');
  }
}