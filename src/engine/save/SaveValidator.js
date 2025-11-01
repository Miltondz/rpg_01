/**
 * SaveValidator - Comprehensive save data validation and integrity checking
 * Validates save data structure, content, and compatibility
 */

export class SaveValidator {
  constructor() {
    this.requiredVersion = '2.0.0';
    this.validationRules = this._initializeValidationRules();
  }

  /**
   * Validate complete save data
   * @param {SaveData} saveData - Save data to validate
   * @returns {Object} Validation result
   */
  validate(saveData) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      // Basic structure validation
      this._validateStructure(saveData, result);
      
      // Metadata validation
      this._validateMetadata(saveData.metadata, result);
      
      // Party validation
      this._validateParty(saveData.party, result);
      
      // Inventory validation
      this._validateInventory(saveData.inventory, result);
      
      // World state validation
      this._validateWorld(saveData.world, result);
      
      // Progress validation
      this._validateProgress(saveData.progress, result);
      
      // Cross-reference validation
      this._validateCrossReferences(saveData, result);
      
      // Compatibility validation
      this._validateCompatibility(saveData, result);
      
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error.message}`);
    }

    return result;
  }

  /**
   * Quick validation for basic integrity
   * @param {SaveData} saveData - Save data to validate
   * @returns {boolean} True if basic validation passes
   */
  quickValidate(saveData) {
    try {
      // Check essential structure
      if (!saveData || typeof saveData !== 'object') return false;
      if (!saveData.metadata || !saveData.party || !saveData.inventory) return false;
      
      // Check version
      if (!saveData.metadata.version) return false;
      
      // Check party has characters
      if (!Array.isArray(saveData.party.characters) || saveData.party.characters.filter(c => c !== null).length === 0) return false;
      
      // Check inventory structure
      if (!Array.isArray(saveData.inventory.slots) || saveData.inventory.slots.length !== 40) return false;
      
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate save data against schema
   * @param {Object} data - Raw save data
   * @returns {Object} Schema validation result
   */
  validateSchema(data) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check required top-level properties
    const requiredProps = ['metadata', 'party', 'inventory', 'world', 'progress'];
    
    for (const prop of requiredProps) {
      if (!(prop in data)) {
        result.errors.push(`Missing required property: ${prop}`);
        result.isValid = false;
      }
    }

    // Validate property types
    if (data.metadata && typeof data.metadata !== 'object') {
      result.errors.push('metadata must be an object');
      result.isValid = false;
    }

    if (data.party && typeof data.party !== 'object') {
      result.errors.push('party must be an object');
      result.isValid = false;
    }

    if (data.inventory && typeof data.inventory !== 'object') {
      result.errors.push('inventory must be an object');
      result.isValid = false;
    }

    if (data.world && typeof data.world !== 'object') {
      result.errors.push('world must be an object');
      result.isValid = false;
    }

    if (data.progress && typeof data.progress !== 'object') {
      result.errors.push('progress must be an object');
      result.isValid = false;
    }

    return result;
  }

  // Private validation methods

  /**
   * Validate basic save data structure
   * @param {SaveData} saveData - Save data
   * @param {Object} result - Validation result
   * @private
   */
  _validateStructure(saveData, result) {
    if (!saveData) {
      result.errors.push('Save data is null or undefined');
      result.isValid = false;
      return;
    }

    const schemaResult = this.validateSchema(saveData);
    result.errors.push(...schemaResult.errors);
    result.warnings.push(...schemaResult.warnings);
    
    if (!schemaResult.isValid) {
      result.isValid = false;
    }
  }

  /**
   * Validate metadata section
   * @param {Object} metadata - Metadata object
   * @param {Object} result - Validation result
   * @private
   */
  _validateMetadata(metadata, result) {
    if (!metadata) {
      result.errors.push('Missing metadata');
      result.isValid = false;
      return;
    }

    // Version validation
    if (!metadata.version) {
      result.errors.push('Missing save version');
      result.isValid = false;
    } else if (typeof metadata.version !== 'string') {
      result.errors.push('Save version must be a string');
      result.isValid = false;
    }

    // Timestamp validation
    if (!metadata.timestamp) {
      result.errors.push('Missing timestamp');
      result.isValid = false;
    } else if (typeof metadata.timestamp !== 'number' || metadata.timestamp <= 0) {
      result.errors.push('Invalid timestamp');
      result.isValid = false;
    }

    // Playtime validation
    if (metadata.playtime !== undefined && (typeof metadata.playtime !== 'number' || metadata.playtime < 0)) {
      result.warnings.push('Invalid playtime value');
    }

    // Party level validation
    if (metadata.partyLevel !== undefined && (typeof metadata.partyLevel !== 'number' || metadata.partyLevel < 1)) {
      result.warnings.push('Invalid party level');
    }

    result.details.metadata = {
      version: metadata.version,
      timestamp: metadata.timestamp,
      playtime: metadata.playtime || 0
    };
  }

  /**
   * Validate party section
   * @param {Object} party - Party object
   * @param {Object} result - Validation result
   * @private
   */
  _validateParty(party, result) {
    if (!party) {
      result.errors.push('Missing party data');
      result.isValid = false;
      return;
    }

    // Characters validation
    if (!Array.isArray(party.characters)) {
      result.errors.push('Party characters must be an array');
      result.isValid = false;
      return;
    }

    const validCharacters = party.characters.filter(char => char !== null);
    
    if (validCharacters.length === 0) {
      result.errors.push('Party has no characters');
      result.isValid = false;
    } else if (validCharacters.length > 4) {
      result.errors.push('Party has too many characters (max 4)');
      result.isValid = false;
    }

    // Validate each character
    validCharacters.forEach((character, index) => {
      this._validateCharacter(character, index, result);
    });

    // Formation validation
    if (party.formation) {
      if (!Array.isArray(party.formation.frontRow) || !Array.isArray(party.formation.backRow)) {
        result.warnings.push('Invalid formation structure');
      }
    }

    // Gold validation
    if (typeof party.gold !== 'number' || party.gold < 0) {
      result.warnings.push('Invalid gold amount');
    }

    result.details.party = {
      characterCount: validCharacters.length,
      gold: party.gold || 0
    };
  }

  /**
   * Validate individual character
   * @param {Object} character - Character object
   * @param {number} index - Character index
   * @param {Object} result - Validation result
   * @private
   */
  _validateCharacter(character, index, result) {
    if (!character || typeof character !== 'object') {
      result.errors.push(`Character ${index} is invalid`);
      result.isValid = false;
      return;
    }

    // Required character properties
    const requiredProps = ['id', 'name', 'class', 'level'];
    
    for (const prop of requiredProps) {
      if (!(prop in character)) {
        result.errors.push(`Character ${index} missing ${prop}`);
        result.isValid = false;
      }
    }

    // Validate character class
    const validClasses = ['warrior', 'rogue', 'mage', 'cleric'];
    if (character.class && !validClasses.includes(character.class)) {
      result.errors.push(`Character ${index} has invalid class: ${character.class}`);
      result.isValid = false;
    }

    // Validate level
    if (typeof character.level !== 'number' || character.level < 1 || character.level > 100) {
      result.errors.push(`Character ${index} has invalid level: ${character.level}`);
      result.isValid = false;
    }

    // Validate stats
    if (character.stats) {
      this._validateCharacterStats(character.stats, index, result);
    }

    // Validate equipment
    if (character.equipment) {
      this._validateCharacterEquipment(character.equipment, index, result);
    }
  }

  /**
   * Validate character stats
   * @param {Object} stats - Character stats
   * @param {number} index - Character index
   * @param {Object} result - Validation result
   * @private
   */
  _validateCharacterStats(stats, index, result) {
    const requiredStats = ['HP', 'ATK', 'DEF', 'SPD'];
    
    for (const stat of requiredStats) {
      if (!(stat in stats)) {
        result.warnings.push(`Character ${index} missing ${stat} stat`);
      } else if (typeof stats[stat] !== 'number' || stats[stat] < 0) {
        result.warnings.push(`Character ${index} has invalid ${stat} stat`);
      }
    }

    // Validate HP structure if it's an object
    if (stats.HP && typeof stats.HP === 'object') {
      if (typeof stats.HP.current !== 'number' || typeof stats.HP.max !== 'number') {
        result.warnings.push(`Character ${index} has invalid HP structure`);
      } else if (stats.HP.current > stats.HP.max || stats.HP.current < 0) {
        result.warnings.push(`Character ${index} has invalid HP values`);
      }
    }
  }

  /**
   * Validate character equipment
   * @param {Object} equipment - Character equipment
   * @param {number} index - Character index
   * @param {Object} result - Validation result
   * @private
   */
  _validateCharacterEquipment(equipment, index, result) {
    const validSlots = ['weapon', 'armor', 'accessory'];
    
    for (const slot of validSlots) {
      if (equipment[slot] && typeof equipment[slot] !== 'object') {
        result.warnings.push(`Character ${index} has invalid ${slot} equipment`);
      }
    }
  }

  /**
   * Validate inventory section
   * @param {Object} inventory - Inventory object
   * @param {Object} result - Validation result
   * @private
   */
  _validateInventory(inventory, result) {
    if (!inventory) {
      result.errors.push('Missing inventory data');
      result.isValid = false;
      return;
    }

    // Slots validation
    if (!Array.isArray(inventory.slots)) {
      result.errors.push('Inventory slots must be an array');
      result.isValid = false;
    } else if (inventory.slots.length !== 40) {
      result.errors.push(`Inventory must have 40 slots, found ${inventory.slots.length}`);
      result.isValid = false;
    } else {
      // Validate each slot
      inventory.slots.forEach((slot, index) => {
        if (slot !== null) {
          this._validateInventorySlot(slot, index, result);
        }
      });
    }

    // Gold validation
    if (typeof inventory.gold !== 'number' || inventory.gold < 0) {
      result.warnings.push('Invalid inventory gold amount');
    }

    const usedSlots = inventory.slots ? inventory.slots.filter(slot => slot !== null).length : 0;
    result.details.inventory = {
      usedSlots,
      totalSlots: 40,
      gold: inventory.gold || 0
    };
  }

  /**
   * Validate inventory slot
   * @param {Object} slot - Inventory slot
   * @param {number} index - Slot index
   * @param {Object} result - Validation result
   * @private
   */
  _validateInventorySlot(slot, index, result) {
    if (!slot || typeof slot !== 'object') {
      result.warnings.push(`Inventory slot ${index} is invalid`);
      return;
    }

    if (!slot.item) {
      result.warnings.push(`Inventory slot ${index} missing item`);
      return;
    }

    if (typeof slot.quantity !== 'number' || slot.quantity <= 0) {
      result.warnings.push(`Inventory slot ${index} has invalid quantity`);
    }

    // Validate item structure
    const item = slot.item;
    if (!item.id || !item.name || !item.type) {
      result.warnings.push(`Inventory slot ${index} has incomplete item data`);
    }
  }

  /**
   * Validate world section
   * @param {Object} world - World object
   * @param {Object} result - Validation result
   * @private
   */
  _validateWorld(world, result) {
    if (!world) {
      result.errors.push('Missing world data');
      result.isValid = false;
      return;
    }

    // Player position validation
    if (!world.playerPosition || typeof world.playerPosition !== 'object') {
      result.errors.push('Missing or invalid player position');
      result.isValid = false;
    } else {
      if (typeof world.playerPosition.x !== 'number' || typeof world.playerPosition.z !== 'number') {
        result.errors.push('Invalid player position coordinates');
        result.isValid = false;
      }
    }

    // Player direction validation
    if (typeof world.playerDirection !== 'number' || world.playerDirection < 0 || world.playerDirection > 3) {
      result.warnings.push('Invalid player direction');
    }

    // Current floor validation
    if (typeof world.currentFloor !== 'number' || world.currentFloor < 0) {
      result.warnings.push('Invalid current floor');
    }

    result.details.world = {
      position: world.playerPosition,
      direction: world.playerDirection,
      floor: world.currentFloor || 0
    };
  }

  /**
   * Validate progress section
   * @param {Object} progress - Progress object
   * @param {Object} result - Validation result
   * @private
   */
  _validateProgress(progress, result) {
    if (!progress) {
      result.errors.push('Missing progress data');
      result.isValid = false;
      return;
    }

    // Validate arrays
    const arrayProps = ['completedQuests', 'unlockedAreas', 'defeatedBosses'];
    
    for (const prop of arrayProps) {
      if (progress[prop] && !Array.isArray(progress[prop])) {
        result.warnings.push(`Progress ${prop} should be an array`);
      }
    }

    // Validate timestamps
    if (progress.gameStartTime && (typeof progress.gameStartTime !== 'number' || progress.gameStartTime <= 0)) {
      result.warnings.push('Invalid game start time');
    }

    if (progress.lastSaveTime && (typeof progress.lastSaveTime !== 'number' || progress.lastSaveTime <= 0)) {
      result.warnings.push('Invalid last save time');
    }

    result.details.progress = {
      questsCompleted: progress.completedQuests ? progress.completedQuests.length : 0,
      areasUnlocked: progress.unlockedAreas ? progress.unlockedAreas.length : 0,
      bossesDefeated: progress.defeatedBosses ? progress.defeatedBosses.length : 0
    };
  }

  /**
   * Validate cross-references between sections
   * @param {SaveData} saveData - Complete save data
   * @param {Object} result - Validation result
   * @private
   */
  _validateCrossReferences(saveData, result) {
    // Validate gold consistency between party and inventory
    if (saveData.party && saveData.inventory) {
      if (saveData.party.gold !== saveData.inventory.gold) {
        result.warnings.push('Gold mismatch between party and inventory');
      }
    }

    // Validate formation references
    if (saveData.party && saveData.party.formation) {
      const characterIds = saveData.party.characters
        .filter(char => char !== null)
        .map(char => char.id);
      
      const formationIds = [
        ...(saveData.party.formation.frontRow || []),
        ...(saveData.party.formation.backRow || [])
      ];

      for (const id of formationIds) {
        if (!characterIds.includes(id)) {
          result.warnings.push(`Formation references non-existent character: ${id}`);
        }
      }
    }
  }

  /**
   * Validate version compatibility
   * @param {SaveData} saveData - Save data
   * @param {Object} result - Validation result
   * @private
   */
  _validateCompatibility(saveData, result) {
    if (!saveData.metadata || !saveData.metadata.version) {
      result.errors.push('Cannot determine save version');
      result.isValid = false;
      return;
    }

    const saveVersion = saveData.metadata.version;
    
    if (saveVersion !== this.requiredVersion) {
      result.warnings.push(`Save version ${saveVersion} may not be fully compatible with current version ${this.requiredVersion}`);
    }

    result.details.compatibility = {
      saveVersion,
      requiredVersion: this.requiredVersion,
      isCompatible: saveVersion === this.requiredVersion
    };
  }

  /**
   * Initialize validation rules
   * @returns {Object} Validation rules
   * @private
   */
  _initializeValidationRules() {
    return {
      maxCharacters: 4,
      maxLevel: 100,
      maxGold: 999999,
      inventorySlots: 40,
      validClasses: ['warrior', 'rogue', 'mage', 'cleric'],
      validDirections: [0, 1, 2, 3],
      requiredStats: ['HP', 'ATK', 'DEF', 'SPD']
    };
  }
}