/**
 * PartyManager - Manages party composition, formation, and party-wide operations
 * Handles up to 4 characters with front/back row positioning
 */

export class PartyManager {
  constructor() {
    // Party composition (max 4 characters)
    this.party = [];
    this.maxPartySize = 4;
    
    // Formation system (front row / back row)
    this.formation = {
      frontRow: [], // Positions 0, 1
      backRow: []   // Positions 2, 3
    };
    
    // Party statistics
    this.stats = {
      totalLevel: 0,
      averageLevel: 0,
      totalHP: 0,
      currentHP: 0,
      aliveMembers: 0
    };
    
    // Party resources
    this.gold = 100; // Starting gold
    
    console.log('PartyManager initialized');
  }

  /**
   * Add character to party
   * @param {Object} character - Character to add
   * @param {number} position - Position in party (0-3)
   * @returns {boolean} True if successfully added
   */
  addCharacter(character, position = null) {
    if (this.party.length >= this.maxPartySize) {
      console.warn('Party is full, cannot add more characters');
      return false;
    }

    if (this.hasCharacter(character.id)) {
      console.warn('Character already in party');
      return false;
    }

    // Add to party array
    if (position !== null && position >= 0 && position < this.maxPartySize) {
      // Insert at specific position
      this.party[position] = character;
    } else {
      // Add to first available slot
      this.party.push(character);
    }

    // Update formation
    this.updateFormation();
    this.updatePartyStats();

    console.log(`${character.name} joined the party at position ${this.party.indexOf(character)}`);
    
    // Emit party change event
    this.emitPartyChangeEvent('characterAdded', character);
    
    return true;
  }

  /**
   * Remove character from party
   * @param {string} characterId - ID of character to remove
   * @returns {Object|null} Removed character or null
   */
  removeCharacter(characterId) {
    const index = this.party.findIndex(char => char && char.id === characterId);
    
    if (index === -1) {
      console.warn('Character not found in party');
      return null;
    }

    const removedCharacter = this.party[index];
    this.party[index] = null; // Keep position but set to null
    
    // Compact array to remove null values
    this.party = this.party.filter(char => char !== null);
    
    this.updateFormation();
    this.updatePartyStats();

    console.log(`${removedCharacter.name} left the party`);
    
    // Emit party change event
    this.emitPartyChangeEvent('characterRemoved', removedCharacter);
    
    return removedCharacter;
  }

  /**
   * Move character to different position
   * @param {string} characterId - ID of character to move
   * @param {number} newPosition - New position (0-3)
   * @returns {boolean} True if successfully moved
   */
  moveCharacter(characterId, newPosition) {
    if (newPosition < 0 || newPosition >= this.maxPartySize) {
      console.warn('Invalid position');
      return false;
    }

    const currentIndex = this.party.findIndex(char => char && char.id === characterId);
    if (currentIndex === -1) {
      console.warn('Character not found in party');
      return false;
    }

    const character = this.party[currentIndex];
    
    // Remove from current position
    this.party.splice(currentIndex, 1);
    
    // Insert at new position
    this.party.splice(newPosition, 0, character);
    
    this.updateFormation();
    
    console.log(`${character.name} moved to position ${newPosition}`);
    
    // Emit party change event
    this.emitPartyChangeEvent('characterMoved', character);
    
    return true;
  }

  /**
   * Swap two characters' positions
   * @param {string} characterId1 - First character ID
   * @param {string} characterId2 - Second character ID
   * @returns {boolean} True if successfully swapped
   */
  swapCharacters(characterId1, characterId2) {
    const index1 = this.party.findIndex(char => char && char.id === characterId1);
    const index2 = this.party.findIndex(char => char && char.id === characterId2);
    
    if (index1 === -1 || index2 === -1) {
      console.warn('One or both characters not found in party');
      return false;
    }

    // Swap positions
    [this.party[index1], this.party[index2]] = [this.party[index2], this.party[index1]];
    
    this.updateFormation();
    
    console.log(`Swapped positions of ${this.party[index1].name} and ${this.party[index2].name}`);
    
    // Emit party change event
    this.emitPartyChangeEvent('charactersSwapped', { 
      character1: this.party[index1], 
      character2: this.party[index2] 
    });
    
    return true;
  }

  /**
   * Update formation based on party positions
   */
  updateFormation() {
    this.formation.frontRow = [];
    this.formation.backRow = [];
    
    for (let i = 0; i < this.party.length; i++) {
      const character = this.party[i];
      if (character) {
        if (i < 2) {
          this.formation.frontRow.push(character);
        } else {
          this.formation.backRow.push(character);
        }
      }
    }
  }

  /**
   * Get formation effects for a character
   * @param {Object} character - Character to check
   * @returns {Object} Formation effects
   */
  getFormationEffects(character) {
    const effects = {
      damageModifier: 1.0,
      evasionBonus: 0,
      defenseModifier: 1.0,
      description: 'No formation effects'
    };

    if (this.isInFrontRow(character)) {
      // Front row: takes more damage but deals more damage
      effects.damageModifier = 1.1; // +10% damage dealt
      effects.defenseModifier = 0.9; // -10% defense (takes more damage)
      effects.description = 'Front Row: +10% damage dealt, -10% defense';
    } else if (this.isInBackRow(character)) {
      // Back row: takes less damage but has evasion bonus
      effects.evasionBonus = 0.1; // +10% evasion chance
      effects.defenseModifier = 1.1; // +10% defense
      effects.description = 'Back Row: +10% evasion, +10% defense';
    }

    return effects;
  }

  /**
   * Check if character is in front row
   * @param {Object} character - Character to check
   * @returns {boolean} True if in front row
   */
  isInFrontRow(character) {
    return this.formation.frontRow.some(char => char.id === character.id);
  }

  /**
   * Check if character is in back row
   * @param {Object} character - Character to check
   * @returns {boolean} True if in back row
   */
  isInBackRow(character) {
    return this.formation.backRow.some(char => char.id === character.id);
  }

  /**
   * Get character position in party
   * @param {string} characterId - Character ID
   * @returns {number} Position (0-3) or -1 if not found
   */
  getCharacterPosition(characterId) {
    return this.party.findIndex(char => char && char.id === characterId);
  }

  /**
   * Check if party has a specific character
   * @param {string} characterId - Character ID to check
   * @returns {boolean} True if character is in party
   */
  hasCharacter(characterId) {
    return this.party.some(char => char && char.id === characterId);
  }

  /**
   * Get character by ID
   * @param {string} characterId - Character ID
   * @returns {Object|null} Character object or null
   */
  getCharacter(characterId) {
    return this.party.find(char => char && char.id === characterId) || null;
  }

  /**
   * Get all alive party members
   * @returns {Array} Array of alive characters
   */
  getAliveMembers() {
    return this.party.filter(char => char && char.isAlive());
  }

  /**
   * Get all dead party members
   * @returns {Array} Array of dead characters
   */
  getDeadMembers() {
    return this.party.filter(char => char && char.isDead());
  }

  /**
   * Check if entire party is dead
   * @returns {boolean} True if all party members are dead
   */
  isPartyDead() {
    return this.party.length > 0 && this.getAliveMembers().length === 0;
  }

  /**
   * Check if party is full
   * @returns {boolean} True if party has maximum members
   */
  isPartyFull() {
    return this.party.length >= this.maxPartySize;
  }

  /**
   * Get party size
   * @returns {number} Number of characters in party
   */
  getPartySize() {
    return this.party.length;
  }

  /**
   * Update party statistics
   */
  updatePartyStats() {
    this.stats.totalLevel = this.party.reduce((sum, char) => sum + (char ? char.level : 0), 0);
    this.stats.averageLevel = this.party.length > 0 ? this.stats.totalLevel / this.party.length : 0;
    this.stats.totalHP = this.party.reduce((sum, char) => sum + (char ? char.maxHP : 0), 0);
    this.stats.currentHP = this.party.reduce((sum, char) => sum + (char ? char.currentHP : 0), 0);
    this.stats.aliveMembers = this.getAliveMembers().length;
  }

  /**
   * Heal entire party
   * @param {number} amount - Amount to heal (or percentage if < 1)
   * @param {boolean} isPercentage - True if amount is percentage
   * @returns {Object} Healing results
   */
  healParty(amount, isPercentage = false) {
    const results = {
      totalHealing: 0,
      membersHealed: 0
    };

    for (const character of this.party) {
      if (character && character.isAlive()) {
        let healAmount = amount;
        if (isPercentage) {
          healAmount = Math.floor(character.maxHP * amount);
        }
        
        const actualHealing = character.heal(healAmount);
        results.totalHealing += actualHealing;
        
        if (actualHealing > 0) {
          results.membersHealed++;
        }
      }
    }

    this.updatePartyStats();
    return results;
  }

  /**
   * Restore party to full health
   */
  fullHealParty() {
    for (const character of this.party) {
      if (character) {
        character.fullHeal();
      }
    }
    
    this.updatePartyStats();
    console.log('Party fully healed');
  }

  /**
   * Reset AP for all party members
   */
  resetPartyAP() {
    for (const character of this.party) {
      if (character && character.isAlive()) {
        character.resetAP();
      }
    }
    
    console.log('Party AP reset');
  }

  /**
   * Apply status effect to entire party
   * @param {Object} statusEffect - Status effect to apply
   * @param {boolean} aliveOnly - Only apply to alive members
   */
  applyPartyStatusEffect(statusEffect, aliveOnly = true) {
    for (const character of this.party) {
      if (character && (!aliveOnly || character.isAlive())) {
        character.statusEffects.push({ ...statusEffect });
      }
    }
    
    console.log(`Applied ${statusEffect.type} to party`);
  }

  /**
   * Get party formation display
   * @returns {Object} Formation layout for UI
   */
  getFormationDisplay() {
    return {
      frontRow: this.formation.frontRow.map(char => ({
        id: char.id,
        name: char.name,
        class: char.class,
        level: char.level,
        hp: char.currentHP,
        maxHP: char.maxHP,
        isAlive: char.isAlive()
      })),
      backRow: this.formation.backRow.map(char => ({
        id: char.id,
        name: char.name,
        class: char.class,
        level: char.level,
        hp: char.currentHP,
        maxHP: char.maxHP,
        isAlive: char.isAlive()
      }))
    };
  }

  /**
   * Get party summary for display
   * @returns {Object} Party summary
   */
  getPartySummary() {
    this.updatePartyStats();
    
    return {
      size: this.party.length,
      maxSize: this.maxPartySize,
      stats: { ...this.stats },
      formation: this.getFormationDisplay(),
      members: this.party.map(char => char ? char.getSummary() : null).filter(Boolean)
    };
  }

  /**
   * Validate party composition
   * @returns {Object} Validation results
   */
  validateParty() {
    const validation = {
      isValid: true,
      warnings: [],
      suggestions: []
    };

    // Check party size
    if (this.party.length === 0) {
      validation.isValid = false;
      validation.warnings.push('Party is empty');
      return validation;
    }

    // Check for duplicate classes
    const classes = this.party.map(char => char.class);
    const uniqueClasses = [...new Set(classes)];
    
    if (classes.length !== uniqueClasses.length) {
      validation.warnings.push('Party has duplicate classes');
    }

    // Check for healer
    const hasHealer = this.party.some(char => char.class === 'cleric');
    if (!hasHealer) {
      validation.suggestions.push('Consider adding a Cleric for healing');
    }

    // Check for tank
    const hasTank = this.party.some(char => char.class === 'warrior');
    if (!hasTank) {
      validation.suggestions.push('Consider adding a Warrior for tanking');
    }

    // Check level balance
    const levels = this.party.map(char => char.level);
    const minLevel = Math.min(...levels);
    const maxLevel = Math.max(...levels);
    
    if (maxLevel - minLevel > 3) {
      validation.warnings.push('Large level difference between party members');
    }

    return validation;
  }

  /**
   * Emit party change event
   * @param {string} eventType - Type of change
   * @param {Object} character - Character involved in change
   */
  emitPartyChangeEvent(eventType, character) {
    const event = new CustomEvent('partyChange', {
      detail: {
        type: eventType,
        character: character,
        party: this.getPartySummary(),
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Get current gold amount
   * @returns {number} Current gold
   */
  getGold() {
    return this.gold;
  }

  /**
   * Add gold to party
   * @param {number} amount - Amount of gold to add
   * @returns {number} New gold total
   */
  addGold(amount) {
    if (amount < 0) {
      console.warn('Cannot add negative gold amount');
      return this.gold;
    }
    
    this.gold += amount;
    console.log(`Added ${amount} gold. Total: ${this.gold}`);
    
    // Emit gold change event
    this.emitGoldChangeEvent('goldAdded', amount);
    
    return this.gold;
  }

  /**
   * Spend gold from party
   * @param {number} amount - Amount of gold to spend
   * @returns {boolean} True if successful, false if insufficient funds
   */
  spendGold(amount) {
    if (amount < 0) {
      console.warn('Cannot spend negative gold amount');
      return false;
    }
    
    if (this.gold < amount) {
      console.warn(`Insufficient gold. Need ${amount}, have ${this.gold}`);
      return false;
    }
    
    this.gold -= amount;
    console.log(`Spent ${amount} gold. Remaining: ${this.gold}`);
    
    // Emit gold change event
    this.emitGoldChangeEvent('goldSpent', amount);
    
    return true;
  }

  /**
   * Set gold amount (for loading saves)
   * @param {number} amount - Gold amount to set
   */
  setGold(amount) {
    if (amount < 0) {
      console.warn('Cannot set negative gold amount');
      return;
    }
    
    const oldGold = this.gold;
    this.gold = amount;
    
    console.log(`Gold set from ${oldGold} to ${this.gold}`);
  }

  /**
   * Check if party can afford an amount
   * @param {number} amount - Amount to check
   * @returns {boolean} True if party can afford it
   */
  canAfford(amount) {
    return this.gold >= amount;
  }

  /**
   * Get average party level
   * @returns {number} Average level of all party members
   */
  getAverageLevel() {
    if (this.party.length === 0) return 1;
    
    const totalLevel = this.party.reduce((sum, char) => {
      return sum + (char ? char.level : 0);
    }, 0);
    
    return Math.floor(totalLevel / this.party.length);
  }

  /**
   * Emit gold change event
   * @param {string} eventType - Type of gold change
   * @param {number} amount - Amount changed
   */
  emitGoldChangeEvent(eventType, amount) {
    const event = new CustomEvent('goldChange', {
      detail: {
        type: eventType,
        amount: amount,
        newTotal: this.gold,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Serialize party for saving
   * @returns {Object} Serialized party data
   */
  serialize() {
    return {
      party: this.party.map(char => char ? char.serialize() : null),
      formation: {
        frontRow: this.formation.frontRow.map(char => char.id),
        backRow: this.formation.backRow.map(char => char.id)
      },
      gold: this.gold
    };
  }

  /**
   * Deserialize party from save data
   * @param {Object} data - Serialized party data
   * @param {Function} characterDeserializer - Function to deserialize characters
   */
  deserialize(data, characterDeserializer) {
    this.party = [];
    
    for (const charData of data.party) {
      if (charData) {
        const character = characterDeserializer(charData);
        this.party.push(character);
      }
    }
    
    // Restore gold
    this.gold = data.gold || 100;
    
    this.updateFormation();
    this.updatePartyStats();
  }
}