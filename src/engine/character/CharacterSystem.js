/**
 * CharacterSystem - Main system that coordinates all character-related functionality
 * Integrates Character, SkillSystem, ExperienceSystem, and PartyManager
 */

import { Character } from './Character.js';
import { SkillSystem } from './SkillSystem.js';
import { ExperienceSystem } from './ExperienceSystem.js';
import { PartyManager } from './PartyManager.js';
import { CharacterClasses } from './CharacterClasses.js';
import { EquipmentSystem } from '../equipment/EquipmentSystem.js';

export class CharacterSystem {
  constructor() {
    // Initialize subsystems
    this.skillSystem = new SkillSystem();
    this.experienceSystem = new ExperienceSystem();
    this.partyManager = new PartyManager();
    this.equipmentSystem = new EquipmentSystem();
    
    // Character registry
    this.characters = new Map();
    
    // System state
    this.isInitialized = false;
    
    console.log('CharacterSystem initialized');
  }

  /**
   * Initialize the character system
   */
  initialize() {
    if (this.isInitialized) {
      console.warn('CharacterSystem already initialized');
      return;
    }

    // Set up event listeners
    this.setupEventListeners();
    
    this.isInitialized = true;
    console.log('CharacterSystem fully initialized');
  }

  /**
   * Set up event listeners for character system events
   */
  setupEventListeners() {
    // Listen for character level-ups to update skill unlocks
    window.addEventListener('characterLevelUp', (event) => {
      const { character } = event.detail;
      this.handleCharacterLevelUp(character);
    });

    // Listen for party changes
    window.addEventListener('partyChange', (event) => {
      this.handlePartyChange(event.detail);
    });
  }

  /**
   * Create a new character
   * @param {string} characterClass - Character class
   * @param {string} name - Character name (optional)
   * @returns {Object} Created character
   */
  createCharacter(characterClass, name = null) {
    if (!CharacterClasses.isValidClass(characterClass)) {
      throw new Error(`Invalid character class: ${characterClass}`);
    }

    const character = new Character(characterClass, name);
    this.characters.set(character.id, character);
    
    console.log(`Created character: ${character.name} (${character.class})`);
    
    return character;
  }

  /**
   * Get character by ID
   * @param {string} characterId - Character ID
   * @returns {Object|null} Character or null if not found
   */
  getCharacter(characterId) {
    return this.characters.get(characterId) || null;
  }

  /**
   * Delete a character
   * @param {string} characterId - Character ID to delete
   * @returns {boolean} True if deleted successfully
   */
  deleteCharacter(characterId) {
    const character = this.characters.get(characterId);
    if (!character) {
      return false;
    }

    // Remove from party if present
    if (this.partyManager.hasCharacter(characterId)) {
      this.partyManager.removeCharacter(characterId);
    }

    // Remove from registry
    this.characters.delete(characterId);
    
    console.log(`Deleted character: ${character.name}`);
    return true;
  }

  /**
   * Add character to party
   * @param {string} characterId - Character ID
   * @param {number} position - Position in party (optional)
   * @returns {boolean} True if added successfully
   */
  addToParty(characterId, position = null) {
    const character = this.getCharacter(characterId);
    if (!character) {
      console.error('Character not found');
      return false;
    }

    return this.partyManager.addCharacter(character, position);
  }

  /**
   * Remove character from party
   * @param {string} characterId - Character ID
   * @returns {boolean} True if removed successfully
   */
  removeFromParty(characterId) {
    return this.partyManager.removeCharacter(characterId) !== null;
  }

  /**
   * Use a skill
   * @param {string} characterId - Character using the skill
   * @param {string} skillId - Skill to use
   * @param {Array} targetIds - Target character/enemy IDs
   * @returns {Object} Skill use result
   */
  useSkill(characterId, skillId, targetIds) {
    const character = this.getCharacter(characterId);
    if (!character) {
      return { success: false, reason: 'Character not found' };
    }

    // Get target objects (this would need to be expanded for enemies)
    const targets = targetIds.map(id => this.getCharacter(id)).filter(Boolean);
    
    return this.skillSystem.useSkill(character, skillId, targets);
  }

  /**
   * Equip an item to a character
   * @param {string} characterId - Character ID
   * @param {Object} item - Item to equip
   * @param {string} slot - Equipment slot (weapon, armor, accessory)
   * @returns {Object} Equipment result
   */
  equipItem(characterId, item, slot) {
    const character = this.getCharacter(characterId);
    if (!character) {
      return { success: false, message: 'Character not found', previousItem: null };
    }

    return this.equipmentSystem.equipItem(character, item, slot);
  }

  /**
   * Unequip an item from a character
   * @param {string} characterId - Character ID
   * @param {string} slot - Equipment slot to unequip
   * @returns {Object} Unequip result
   */
  unequipItem(characterId, slot) {
    const character = this.getCharacter(characterId);
    if (!character) {
      return { success: false, message: 'Character not found', item: null };
    }

    return this.equipmentSystem.unequipItem(character, slot);
  }

  /**
   * Check if a character can equip an item
   * @param {string} characterId - Character ID
   * @param {Object} item - Item to check
   * @returns {Object} Validation result
   */
  canEquipItem(characterId, item) {
    const character = this.getCharacter(characterId);
    if (!character) {
      return { success: false, reason: 'Character not found' };
    }

    return this.equipmentSystem.canEquip(character, item);
  }

  /**
   * Get equipment comparison for a character
   * @param {string} characterId - Character ID
   * @param {Object} item - Item to compare
   * @param {string} slot - Equipment slot
   * @returns {Object} Comparison data
   */
  getEquipmentComparison(characterId, item, slot) {
    const character = this.getCharacter(characterId);
    if (!character) {
      return null;
    }

    return this.equipmentSystem.getEquipmentComparison(character, item, slot);
  }

  /**
   * Add experience to party
   * @param {number} totalXP - Total XP to distribute
   * @param {Object} options - Distribution options
   * @returns {Object} Distribution results
   */
  addExperienceToParty(totalXP, options = {}) {
    const party = this.partyManager.party;
    return this.experienceSystem.distributeExperience(party, totalXP, options);
  }

  /**
   * Handle character level-up
   * @param {Object} character - Character that leveled up
   */
  handleCharacterLevelUp(character) {
    // Update party stats if character is in party
    if (this.partyManager.hasCharacter(character.id)) {
      this.partyManager.updatePartyStats();
    }

    // Log level-up
    console.log(`${character.name} reached level ${character.level}!`);
  }

  /**
   * Handle party changes
   * @param {Object} changeData - Party change data
   */
  handlePartyChange(changeData) {
    const { type, character } = changeData;
    
    switch (type) {
      case 'characterAdded':
        console.log(`${character.name} joined the party`);
        break;
      case 'characterRemoved':
        console.log(`${character.name} left the party`);
        break;
      case 'characterMoved':
        console.log(`${character.name} changed position in party`);
        break;
    }
  }

  /**
   * Get available character classes
   * @returns {Array} Array of class information
   */
  getAvailableClasses() {
    return CharacterClasses.getAvailableClasses().map(className => 
      CharacterClasses.getClassDefinition(className)
    );
  }

  /**
   * Get class comparison data
   * @returns {Object} Class comparison information
   */
  getClassComparison() {
    return CharacterClasses.getClassComparison();
  }

  /**
   * Get recommended party compositions
   * @returns {Array} Recommended party setups
   */
  getRecommendedParties() {
    return CharacterClasses.getRecommendedParties();
  }

  /**
   * Create a pre-made party for testing
   * @param {string} partyType - Type of party to create
   * @returns {Array} Array of created characters
   */
  createTestParty(partyType = 'balanced') {
    const compositions = {
      balanced: ['warrior', 'rogue', 'mage', 'cleric'],
      physical: ['warrior', 'warrior', 'rogue', 'rogue'],
      magical: ['mage', 'mage', 'cleric', 'cleric'],
      glass_cannon: ['rogue', 'rogue', 'mage', 'mage']
    };

    const composition = compositions[partyType] || compositions.balanced;
    const party = [];

    for (let i = 0; i < composition.length; i++) {
      const characterClass = composition[i];
      const character = this.createCharacter(characterClass, `${characterClass.charAt(0).toUpperCase() + characterClass.slice(1)} ${i + 1}`);
      
      // Add some levels for testing
      this.experienceSystem.addExperience(character, 500 * (i + 1));
      
      this.addToParty(character.id);
      party.push(character);
    }

    console.log(`Created ${partyType} test party with ${party.length} characters`);
    return party;
  }

  /**
   * Get system status
   * @returns {Object} System status information
   */
  getSystemStatus() {
    return {
      isInitialized: this.isInitialized,
      totalCharacters: this.characters.size,
      partySize: this.partyManager.getPartySize(),
      partyStats: this.partyManager.stats,
      skillsRegistered: this.skillSystem.skills.size,
      equipmentSystemActive: !!this.equipmentSystem
    };
  }

  /**
   * Get all characters summary
   * @returns {Array} Array of character summaries
   */
  getAllCharacters() {
    return Array.from(this.characters.values()).map(char => char.getSummary());
  }

  /**
   * Get party summary
   * @returns {Object} Party summary
   */
  getParty() {
    return this.partyManager.getPartySummary();
  }

  /**
   * Validate current party
   * @returns {Object} Validation results
   */
  validateParty() {
    return this.partyManager.validateParty();
  }

  /**
   * Serialize entire character system
   * @returns {Object} Serialized data
   */
  serialize() {
    const charactersData = {};
    for (const [id, character] of this.characters.entries()) {
      charactersData[id] = character.serialize();
    }

    return {
      characters: charactersData,
      party: this.partyManager.serialize(),
      systemVersion: '1.0.0'
    };
  }

  /**
   * Deserialize character system
   * @param {Object} data - Serialized data
   */
  deserialize(data) {
    // Clear existing data
    this.characters.clear();
    
    // Restore characters
    for (const [id, charData] of Object.entries(data.characters)) {
      const character = Character.deserialize(charData);
      this.characters.set(id, character);
    }

    // Restore party
    this.partyManager.deserialize(data.party, (charData) => {
      return Character.deserialize(charData);
    });

    console.log('CharacterSystem deserialized successfully');
  }

  /**
   * Reset character system
   */
  reset() {
    this.characters.clear();
    this.partyManager = new PartyManager();
    this.skillSystem = new SkillSystem();
    this.experienceSystem = new ExperienceSystem();
    this.equipmentSystem = new EquipmentSystem();
    
    console.log('CharacterSystem reset');
  }
}