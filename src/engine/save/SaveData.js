/**
 * SaveData - Complete save data structure for preserving all game state
 * Handles serialization and compression for localStorage
 */

export class SaveData {
  constructor() {
    this.metadata = {
      version: '2.0.0',
      timestamp: Date.now(),
      playtime: 0,
      location: '',
      partyLevel: 1,
      screenshot: null // Base64 encoded screenshot for save slot preview
    };
    
    this.party = {
      characters: [],
      formation: {
        frontRow: [],
        backRow: []
      },
      gold: 100
    };
    
    this.inventory = {
      slots: new Array(40).fill(null),
      gold: 100 // Duplicate for compatibility, synced with party.gold
    };
    
    this.world = {
      currentDungeon: '',
      currentFloor: 0,
      playerPosition: { x: 0, z: 0 },
      playerDirection: 0,
      clearedEncounters: [],
      openedDoors: [],
      discoveredAreas: [],
      visitedLocations: []
    };
    
    this.progress = {
      completedQuests: [],
      unlockedAreas: [],
      defeatedBosses: [],
      gameStartTime: Date.now(),
      lastSaveTime: Date.now()
    };
    
    this.settings = {
      difficulty: 'normal',
      autoSaveEnabled: true,
      autoSaveInterval: 300000 // 5 minutes in milliseconds
    };
  }

  /**
   * Create save data from current game state
   * @param {Object} gameState - Current game state object
   * @returns {SaveData} Populated save data instance
   */
  static fromGameState(gameState) {
    const saveData = new SaveData();
    
    // Update metadata
    saveData.metadata.timestamp = Date.now();
    saveData.metadata.playtime = gameState.playtime || 0;
    saveData.metadata.location = gameState.currentLocation || 'Unknown';
    
    // Party data
    if (gameState.partyManager) {
      const partyData = gameState.partyManager.serialize();
      saveData.party = partyData;
      
      // Calculate average party level for metadata
      const totalLevel = partyData.characters
        .filter(char => char !== null)
        .reduce((sum, char) => sum + (char.level || 1), 0);
      saveData.metadata.partyLevel = Math.floor(totalLevel / Math.max(partyData.characters.filter(char => char !== null).length, 1));
    }
    
    // Inventory data
    if (gameState.inventorySystem) {
      saveData.inventory = gameState.inventorySystem.serialize();
      // Sync gold between party and inventory
      saveData.inventory.gold = saveData.party.gold;
    }
    
    // World state
    if (gameState.movementController) {
      saveData.world.playerPosition = gameState.movementController.getPosition();
      saveData.world.playerDirection = gameState.movementController.getDirection();
    }
    
    if (gameState.dungeonLoader) {
      saveData.world.currentDungeon = gameState.dungeonLoader.currentDungeon || '';
      saveData.world.currentFloor = gameState.dungeonLoader.currentFloor || 0;
    }
    
    // Copy world progress data
    if (gameState.worldState) {
      saveData.world.clearedEncounters = [...(gameState.worldState.clearedEncounters || [])];
      saveData.world.openedDoors = [...(gameState.worldState.openedDoors || [])];
      saveData.world.discoveredAreas = [...(gameState.worldState.discoveredAreas || [])];
      saveData.world.visitedLocations = [...(gameState.worldState.visitedLocations || [])];
    }
    
    // Progress data
    if (gameState.progressManager) {
      saveData.progress.completedQuests = [...(gameState.progressManager.completedQuests || [])];
      saveData.progress.unlockedAreas = [...(gameState.progressManager.unlockedAreas || [])];
      saveData.progress.defeatedBosses = [...(gameState.progressManager.defeatedBosses || [])];
    }
    
    // Update save time
    saveData.progress.lastSaveTime = Date.now();
    
    return saveData;
  }

  /**
   * Serialize save data to JSON string with compression
   * @returns {string} Compressed JSON string
   */
  serialize() {
    try {
      const jsonString = JSON.stringify(this, null, 0); // No formatting for smaller size
      
      // Simple compression: remove unnecessary whitespace and compress common patterns
      const compressed = this._compressData(jsonString);
      
      console.log(`Save data serialized: ${jsonString.length} -> ${compressed.length} bytes (${Math.round((1 - compressed.length / jsonString.length) * 100)}% compression)`);
      
      return compressed;
    } catch (error) {
      console.error('Failed to serialize save data:', error);
      throw new Error('Save serialization failed');
    }
  }

  /**
   * Deserialize save data from JSON string
   * @param {string} serializedData - Compressed JSON string
   * @returns {SaveData} Deserialized save data instance
   */
  static deserialize(serializedData) {
    try {
      // Decompress data
      const decompressed = SaveData._decompressData(serializedData);
      
      // Parse JSON
      const data = JSON.parse(decompressed);
      
      // Create new instance and copy data
      const saveData = new SaveData();
      
      // Copy all properties, maintaining structure
      if (data.metadata) {
        Object.assign(saveData.metadata, data.metadata);
      }
      
      if (data.party) {
        Object.assign(saveData.party, data.party);
      }
      
      if (data.inventory) {
        Object.assign(saveData.inventory, data.inventory);
      }
      
      if (data.world) {
        Object.assign(saveData.world, data.world);
      }
      
      if (data.progress) {
        Object.assign(saveData.progress, data.progress);
      }
      
      if (data.settings) {
        Object.assign(saveData.settings, data.settings);
      }
      
      console.log('Save data deserialized successfully');
      return saveData;
      
    } catch (error) {
      console.error('Failed to deserialize save data:', error);
      throw new Error('Save deserialization failed');
    }
  }

  /**
   * Validate save data integrity
   * @returns {Object} Validation result with success status and errors
   */
  validate() {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check required metadata
    if (!this.metadata.version) {
      validation.errors.push('Missing save version');
      validation.isValid = false;
    }
    
    if (!this.metadata.timestamp || typeof this.metadata.timestamp !== 'number') {
      validation.errors.push('Invalid timestamp');
      validation.isValid = false;
    }

    // Check party data
    if (!this.party || !Array.isArray(this.party.characters)) {
      validation.errors.push('Invalid party data');
      validation.isValid = false;
    } else if (this.party.characters.filter(char => char !== null).length === 0) {
      validation.errors.push('No characters in party');
      validation.isValid = false;
    }

    // Check inventory data
    if (!this.inventory || !Array.isArray(this.inventory.slots)) {
      validation.errors.push('Invalid inventory data');
      validation.isValid = false;
    } else if (this.inventory.slots.length !== 40) {
      validation.warnings.push('Inventory slot count mismatch');
    }

    // Check world data
    if (!this.world || typeof this.world.playerPosition !== 'object') {
      validation.errors.push('Invalid world data');
      validation.isValid = false;
    }

    // Version compatibility check
    if (this.metadata.version !== '2.0.0') {
      validation.warnings.push(`Save version ${this.metadata.version} may not be fully compatible`);
    }

    return validation;
  }

  /**
   * Get save metadata for display in save slots
   * @returns {Object} Display metadata
   */
  getDisplayMetadata() {
    return {
      timestamp: this.metadata.timestamp,
      playtime: this.metadata.playtime,
      location: this.metadata.location,
      partyLevel: this.metadata.partyLevel,
      screenshot: this.metadata.screenshot,
      partySize: this.party.characters.filter(char => char !== null).length,
      gold: this.party.gold,
      version: this.metadata.version
    };
  }

  /**
   * Update playtime
   * @param {number} additionalTime - Time to add in milliseconds
   */
  updatePlaytime(additionalTime) {
    this.metadata.playtime += additionalTime;
  }

  /**
   * Set screenshot for save slot preview
   * @param {string} screenshotData - Base64 encoded screenshot
   */
  setScreenshot(screenshotData) {
    this.metadata.screenshot = screenshotData;
  }

  /**
   * Simple data compression using common pattern replacement
   * @param {string} data - Data to compress
   * @returns {string} Compressed data
   * @private
   */
  _compressData(data) {
    // Replace common JSON patterns with shorter equivalents
    const patterns = [
      ['"id":', '§i:'],
      ['"name":', '§n:'],
      ['"level":', '§l:'],
      ['"type":', '§t:'],
      ['"quantity":', '§q:'],
      ['"rarity":', '§r:'],
      ['"stats":', '§s:'],
      ['"equipment":', '§e:'],
      ['"position":', '§p:'],
      ['null', '§0'],
      ['true', '§1'],
      ['false', '§2']
    ];

    let compressed = data;
    for (const [pattern, replacement] of patterns) {
      compressed = compressed.replace(new RegExp(pattern, 'g'), replacement);
    }

    return compressed;
  }

  /**
   * Decompress data by reversing compression patterns
   * @param {string} compressedData - Compressed data
   * @returns {string} Decompressed data
   * @private
   */
  static _decompressData(compressedData) {
    // Reverse the compression patterns
    const patterns = [
      ['§i:', '"id":'],
      ['§n:', '"name":'],
      ['§l:', '"level":'],
      ['§t:', '"type":'],
      ['§q:', '"quantity":'],
      ['§r:', '"rarity":'],
      ['§s:', '"stats":'],
      ['§e:', '"equipment":'],
      ['§p:', '"position":'],
      ['§0', 'null'],
      ['§1', 'true'],
      ['§2', 'false']
    ];

    let decompressed = compressedData;
    for (const [pattern, replacement] of patterns) {
      decompressed = decompressed.replace(new RegExp(pattern, 'g'), replacement);
    }

    return decompressed;
  }

  /**
   * Create a deep copy of the save data
   * @returns {SaveData} Deep copy of this save data
   */
  clone() {
    const serialized = this.serialize();
    return SaveData.deserialize(serialized);
  }

  /**
   * Get save data size in bytes
   * @returns {number} Size in bytes
   */
  getSize() {
    return new Blob([this.serialize()]).size;
  }

  /**
   * Check if save data is compatible with current game version
   * @returns {boolean} True if compatible
   */
  isCompatible() {
    // For now, only accept exact version match
    // In future, could implement migration logic
    return this.metadata.version === '2.0.0';
  }
}