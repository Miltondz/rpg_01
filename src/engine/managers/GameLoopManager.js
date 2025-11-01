/**
 * GameLoopManager - Integrates exploration, combat, and progression systems
 * Manages the complete game loop with encounters, safe zones, and difficulty scaling
 */

import { EncounterSystem } from '../systems/EncounterSystem.js';
import { SafeZoneSystem } from '../systems/SafeZoneSystem.js';
import { DifficultyScalingSystem } from '../systems/DifficultyScalingSystem.js';

export class GameLoopManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    
    // Core systems from engine
    this.movementController = gameEngine.movementController;
    this.combatSystem = gameEngine.combatSystem;
    this.partyManager = gameEngine.partyManager;
    this.saveSystem = gameEngine.saveSystem;
    this.shopSystem = gameEngine.shopSystem;
    this.lootSystem = gameEngine.lootSystem;
    this.dungeonLoader = gameEngine.dungeonLoader;
    
    // Game loop systems
    this.encounterSystem = null;
    this.safeZoneSystem = null;
    this.difficultyScaling = null;
    
    // Game state
    this.isInitialized = false;
    this.currentDungeonFloor = 1;
    this.gameLoopActive = false;
    
    // Event listeners
    this.eventListeners = new Map();
    
    console.log('GameLoopManager created');
  }

  /**
   * Initialize the game loop manager and all subsystems
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    try {
      console.log('Initializing GameLoopManager...');
      
      // Validate required systems
      if (!this.validateRequiredSystems()) {
        throw new Error('Required systems not available');
      }
      
      // Initialize game loop systems
      this.encounterSystem = new EncounterSystem(this.combatSystem, this.partyManager);
      this.safeZoneSystem = new SafeZoneSystem(this.saveSystem, this.shopSystem, this.partyManager);
      this.difficultyScaling = new DifficultyScalingSystem(this.partyManager, this.lootSystem);
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize safe zones for current level
      this.initializeLevelSafeZones();
      
      // Set up scripted encounters
      this.initializeLevelEncounters();
      
      this.isInitialized = true;
      this.gameLoopActive = true;
      
      console.log('GameLoopManager initialized successfully');
      
      // Emit initialization event
      this.emitGameLoopEvent('initialized', {
        systems: ['encounter', 'safeZone', 'difficultyScaling']
      });
      
      return true;
      
    } catch (error) {
      console.error('Failed to initialize GameLoopManager:', error);
      return false;
    }
  }

  /**
   * Validate that all required systems are available
   * @returns {boolean} True if all systems are available
   */
  validateRequiredSystems() {
    const requiredSystems = [
      'movementController',
      'combatSystem', 
      'partyManager',
      'saveSystem',
      'shopSystem',
      'lootSystem',
      'dungeonLoader'
    ];
    
    for (const systemName of requiredSystems) {
      if (!this[systemName]) {
        console.error(`Required system not available: ${systemName}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Set up event listeners for game loop integration
   */
  setupEventListeners() {
    // Movement events
    this.addEventListener('movementCompleted', (event) => {
      this.handleMovementCompleted(event.detail);
    });
    
    // Combat events
    this.addEventListener('combatEvent', (event) => {
      this.handleCombatEvent(event.detail);
    });
    
    // Encounter events
    this.addEventListener('encounterEvent', (event) => {
      this.handleEncounterEvent(event.detail);
    });
    
    // Safe zone events
    this.addEventListener('safeZoneEvent', (event) => {
      this.handleSafeZoneEvent(event.detail);
    });
    
    // Level transition events
    this.addEventListener('levelTransition', (event) => {
      this.handleLevelTransition(event.detail);
    });
    
    console.log('Game loop event listeners set up');
  }

  /**
   * Add event listener with cleanup tracking
   * @param {string} eventType - Type of event to listen for
   * @param {Function} handler - Event handler function
   */
  addEventListener(eventType, handler) {
    window.addEventListener(eventType, handler);
    
    // Track for cleanup
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(handler);
  }

  /**
   * Handle movement completion - check for encounters and safe zones
   * @param {Object} movementData - Movement completion data
   */
  async handleMovementCompleted(movementData) {
    if (!this.gameLoopActive || !this.isInitialized) {
      return;
    }
    
    const newPosition = movementData.newPosition;
    const currentLevel = this.dungeonLoader.getCurrentLevel();
    
    console.log('Processing movement to:', newPosition);
    
    // Check for safe zone entry first
    const safeZone = this.safeZoneSystem.checkSafeZoneEntry(newPosition);
    if (safeZone) {
      console.log('Entered safe zone:', safeZone.name);
      this.handleSafeZoneEntry(safeZone);
      return; // No encounters in safe zones
    }
    
    // Check for encounters if not in safe zone
    try {
      const encounter = await this.encounterSystem.checkForEncounter(newPosition, currentLevel);
      if (encounter) {
        console.log('Encounter triggered:', encounter.id);
        await this.handleEncounterTriggered(encounter);
      }
    } catch (error) {
      console.error('Error checking for encounter:', error);
    }
  }

  /**
   * Handle safe zone entry
   * @param {Object} safeZone - Safe zone data
   */
  handleSafeZoneEntry(safeZone) {
    // Show safe zone UI or notification
    this.emitGameLoopEvent('safeZoneEntered', {
      safeZone: safeZone,
      availableServices: this.safeZoneSystem.getAvailableServices()
    });
    
    // Auto-save if enabled
    if (safeZone.services.includes('save')) {
      this.performAutoSave('safeZone', safeZone);
    }
  }

  /**
   * Handle encounter triggered
   * @param {Object} encounter - Encounter data
   */
  async handleEncounterTriggered(encounter) {
    // Pause movement during combat
    this.gameLoopActive = false;
    
    // Scale enemies based on current difficulty and party level
    for (const enemy of encounter.enemies) {
      const scaledLevel = this.difficultyScaling.calculateEnemyLevel(
        this.currentDungeonFloor, 
        encounter.type
      );
      
      const scaledStats = this.difficultyScaling.scaleEnemyStats(enemy, scaledLevel);
      
      // Apply scaled stats to enemy
      enemy.level = scaledLevel;
      enemy.stats = scaledStats;
      enemy.currentHP = scaledStats.HP;
      enemy.maxHP = scaledStats.HP;
    }
    
    // Validate encounter balance
    const balanceCheck = this.difficultyScaling.validateEncounterBalance(
      encounter.enemies, 
      this.partyManager.getAverageLevel()
    );
    
    console.log('Encounter balance:', balanceCheck.balanceRating);
    
    // Emit encounter start event
    this.emitGameLoopEvent('encounterStarted', {
      encounter: encounter,
      balance: balanceCheck
    });
  }

  /**
   * Handle combat events
   * @param {Object} combatEventData - Combat event data
   */
  handleCombatEvent(combatEventData) {
    switch (combatEventData.type) {
      case 'combatStarted':
        this.onCombatStarted(combatEventData.data);
        break;
        
      case 'combatEnded':
        this.onCombatEnded(combatEventData.data);
        break;
        
      case 'turnStarted':
        this.onTurnStarted(combatEventData.data);
        break;
        
      default:
        // Handle other combat events as needed
        break;
    }
  }

  /**
   * Handle combat started
   * @param {Object} combatData - Combat start data
   */
  onCombatStarted(combatData) {
    console.log('Combat started with', combatData.enemies.length, 'enemies');
    
    // Disable movement during combat
    if (this.movementController) {
      this.movementController.setEnabled(false);
    }
    
    this.emitGameLoopEvent('combatPhaseStarted', combatData);
  }

  /**
   * Handle combat ended
   * @param {Object} combatResults - Combat end results
   */
  async onCombatEnded(combatResults) {
    console.log('Combat ended:', combatResults.result);
    
    // Re-enable movement
    if (this.movementController) {
      this.movementController.setEnabled(true);
    }
    
    // Process combat results
    if (combatResults.result === 'victory') {
      await this.processCombatVictory(combatResults);
    } else if (combatResults.result === 'defeat') {
      await this.processCombatDefeat(combatResults);
    }
    
    // Notify encounter system
    this.encounterSystem.onCombatEnd(combatResults.result);
    
    // Resume game loop
    this.gameLoopActive = true;
    
    this.emitGameLoopEvent('combatPhaseEnded', combatResults);
  }

  /**
   * Process combat victory rewards
   * @param {Object} combatResults - Combat results with rewards
   */
  async processCombatVictory(combatResults) {
    const rewards = combatResults.rewards;
    
    if (rewards) {
      // Apply experience to party
      if (rewards.experience > 0) {
        this.partyManager.distributeExperience(rewards.experience);
      }
      
      // Add gold to party
      if (rewards.gold > 0) {
        this.partyManager.addGold(rewards.gold);
      }
      
      // Add loot to inventory
      if (rewards.loot && rewards.loot.length > 0) {
        for (const item of rewards.loot) {
          this.partyManager.addItemToInventory(item);
        }
      }
      
      console.log('Victory rewards processed:', rewards);
    }
    
    // Auto-save after combat victory
    this.performAutoSave('combatVictory', combatResults);
  }

  /**
   * Process combat defeat
   * @param {Object} combatResults - Combat results
   */
  async processCombatDefeat(combatResults) {
    console.log('Processing combat defeat...');
    
    // Handle defeat consequences (could load last save, respawn, etc.)
    this.emitGameLoopEvent('gameOver', {
      reason: 'combat_defeat',
      combatResults: combatResults
    });
  }

  /**
   * Handle turn started (for any turn-based mechanics)
   * @param {Object} turnData - Turn start data
   */
  onTurnStarted(turnData) {
    // Could handle turn-based environmental effects, time passage, etc.
    console.log('Turn started:', turnData.turnNumber);
  }

  /**
   * Handle encounter events
   * @param {Object} encounterEventData - Encounter event data
   */
  handleEncounterEvent(encounterEventData) {
    switch (encounterEventData.type) {
      case 'encounterTriggered':
        console.log('Encounter system triggered encounter');
        break;
        
      case 'encounterEnded':
        console.log('Encounter system ended encounter');
        break;
        
      default:
        break;
    }
  }

  /**
   * Handle safe zone events
   * @param {Object} safeZoneEventData - Safe zone event data
   */
  handleSafeZoneEvent(safeZoneEventData) {
    switch (safeZoneEventData.type) {
      case 'safeZoneDiscovered':
        console.log('New safe zone discovered:', safeZoneEventData.data.name);
        this.emitGameLoopEvent('safeZoneDiscovered', safeZoneEventData.data);
        break;
        
      case 'healingPerformed':
        console.log('Healing performed at safe zone');
        this.emitGameLoopEvent('partyHealed', safeZoneEventData.data);
        break;
        
      case 'savePerformed':
        console.log('Save performed at safe zone');
        break;
        
      default:
        break;
    }
  }

  /**
   * Handle level transitions
   * @param {Object} transitionData - Level transition data
   */
  async handleLevelTransition(transitionData) {
    console.log('Handling level transition:', transitionData);
    
    // Update current floor
    if (transitionData.targetFloor) {
      this.currentDungeonFloor = transitionData.targetFloor;
    }
    
    // Reinitialize systems for new level
    await this.reinitializeForNewLevel();
    
    this.emitGameLoopEvent('levelChanged', {
      newFloor: this.currentDungeonFloor,
      transitionData: transitionData
    });
  }

  /**
   * Reinitialize systems for new level
   */
  async reinitializeForNewLevel() {
    console.log('Reinitializing systems for floor', this.currentDungeonFloor);
    
    // Reset encounter system state
    this.encounterSystem.reset();
    
    // Reset safe zone discovery state
    this.safeZoneSystem.reset();
    
    // Initialize safe zones and encounters for new level
    this.initializeLevelSafeZones();
    this.initializeLevelEncounters();
  }

  /**
   * Initialize safe zones for current level
   */
  initializeLevelSafeZones() {
    const currentLevel = this.dungeonLoader.getCurrentLevel();
    if (!currentLevel) return;
    
    // Add safe zones based on level configuration
    if (currentLevel.safeZones) {
      for (const safeZoneConfig of currentLevel.safeZones) {
        this.safeZoneSystem.registerSafeZone(
          safeZoneConfig.x,
          safeZoneConfig.z,
          safeZoneConfig.type,
          safeZoneConfig.config || {}
        );
      }
    } else {
      // Add default safe zones for testing
      this.addDefaultSafeZones(currentLevel);
    }
    
    console.log('Safe zones initialized for current level');
  }

  /**
   * Add default safe zones for testing
   * @param {Object} level - Current level data
   */
  addDefaultSafeZones(level) {
    // Add an altar at spawn point
    if (level.spawn) {
      this.safeZoneSystem.registerSafeZone(
        level.spawn.x,
        level.spawn.z,
        'altar'
      );
    }
    
    // Add a camp somewhere in the middle of larger levels
    if (level.width > 10 && level.height > 10) {
      const midX = Math.floor(level.width / 2);
      const midZ = Math.floor(level.height / 2);
      
      // Find a floor tile near the middle
      for (let radius = 0; radius < 5; radius++) {
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dz = -radius; dz <= radius; dz++) {
            const checkX = midX + dx;
            const checkZ = midZ + dz;
            
            const tile = this.gameEngine.gridSystem.getTile(checkX, checkZ);
            if (tile && tile.type === 'floor') {
              this.safeZoneSystem.registerSafeZone(checkX, checkZ, 'camp');
              return;
            }
          }
        }
      }
    }
  }

  /**
   * Initialize scripted encounters for current level
   */
  initializeLevelEncounters() {
    const currentLevel = this.dungeonLoader.getCurrentLevel();
    if (!currentLevel) return;
    
    // Add scripted encounters based on level configuration
    if (currentLevel.scriptedEncounters) {
      for (const encounterConfig of currentLevel.scriptedEncounters) {
        this.encounterSystem.addScriptedEncounter(
          encounterConfig.x,
          encounterConfig.z,
          encounterConfig
        );
      }
    }
    
    console.log('Scripted encounters initialized for current level');
  }

  /**
   * Perform auto-save
   * @param {string} trigger - What triggered the auto-save
   * @param {Object} context - Context data for the save
   */
  async performAutoSave(trigger, context) {
    try {
      const autoSaveData = {
        trigger: trigger,
        context: context,
        gameLoop: {
          currentFloor: this.currentDungeonFloor,
          encounterStats: this.encounterSystem.getEncounterStats(),
          difficulty: this.difficultyScaling.getCurrentDifficulty()
        }
      };
      
      await this.saveSystem.performAutoSave(autoSaveData);
      console.log('Auto-save completed:', trigger);
      
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }

  /**
   * Use safe zone service
   * @param {string} serviceType - Type of service to use
   * @returns {Promise<Object>} Service result
   */
  async useSafeZoneService(serviceType) {
    if (!this.safeZoneSystem.isInSafeZone) {
      return {
        success: false,
        error: 'Not in a safe zone'
      };
    }
    
    return await this.safeZoneSystem.useService(serviceType);
  }

  /**
   * Get current game loop status
   * @returns {Object} Current status
   */
  getGameLoopStatus() {
    return {
      isInitialized: this.isInitialized,
      gameLoopActive: this.gameLoopActive,
      currentFloor: this.currentDungeonFloor,
      inSafeZone: this.safeZoneSystem ? this.safeZoneSystem.isInSafeZone : false,
      inCombat: this.encounterSystem ? this.encounterSystem.isInCombat : false,
      encounterStats: this.encounterSystem ? this.encounterSystem.getEncounterStats() : null,
      difficulty: this.difficultyScaling ? this.difficultyScaling.getCurrentDifficulty() : null
    };
  }

  /**
   * Set difficulty level
   * @param {string} difficulty - New difficulty level
   * @returns {boolean} True if successful
   */
  setDifficulty(difficulty) {
    if (!this.difficultyScaling) {
      return false;
    }
    
    return this.difficultyScaling.setDifficulty(difficulty);
  }

  /**
   * Emit game loop event
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  emitGameLoopEvent(eventType, data) {
    const event = new CustomEvent('gameLoopEvent', {
      detail: {
        type: eventType,
        data: data,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Cleanup and dispose of game loop manager
   */
  dispose() {
    console.log('Disposing GameLoopManager...');
    
    // Remove event listeners
    for (const [eventType, handlers] of this.eventListeners) {
      for (const handler of handlers) {
        window.removeEventListener(eventType, handler);
      }
    }
    this.eventListeners.clear();
    
    // Reset systems
    if (this.encounterSystem) {
      this.encounterSystem.reset();
    }
    
    if (this.safeZoneSystem) {
      this.safeZoneSystem.reset();
    }
    
    if (this.difficultyScaling) {
      this.difficultyScaling.reset();
    }
    
    this.isInitialized = false;
    this.gameLoopActive = false;
    
    console.log('GameLoopManager disposed');
  }
}