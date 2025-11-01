/**
 * ItemDatabase - Basic item database for performance testing
 * Provides simple item creation for testing purposes
 */

export class ItemDatabase {
  constructor() {
    this.items = new Map();
    this.itemTypes = ['weapon', 'armor', 'accessory', 'consumable', 'material', 'key_item'];
    this.rarities = ['common', 'uncommon', 'rare', 'epic'];
    
    this.initializeBasicItems();
  }

  /**
   * Initialize basic items for testing
   */
  initializeBasicItems() {
    // Basic weapons
    this.addItem('sword_basic', {
      name: 'Basic Sword',
      type: 'weapon',
      rarity: 'common',
      stats: { ATK: 10 },
      value: 50
    });
    
    this.addItem('staff_basic', {
      name: 'Basic Staff',
      type: 'weapon',
      rarity: 'common',
      stats: { ATK: 8, SPD: 2 },
      value: 45
    });
    
    // Basic armor
    this.addItem('leather_armor', {
      name: 'Leather Armor',
      type: 'armor',
      rarity: 'common',
      stats: { DEF: 5, HP: 10 },
      value: 40
    });
    
    // Basic accessories
    this.addItem('ring_basic', {
      name: 'Basic Ring',
      type: 'accessory',
      rarity: 'common',
      stats: { SPD: 3 },
      value: 30
    });
    
    // Consumables
    this.addItem('health_potion', {
      name: 'Health Potion',
      type: 'consumable',
      rarity: 'common',
      effects: [{ type: 'heal', value: 50 }],
      value: 25,
      stackable: true,
      maxStack: 99
    });
    
    this.addItem('mana_potion', {
      name: 'Mana Potion',
      type: 'consumable',
      rarity: 'common',
      effects: [{ type: 'restore_ap', value: 2 }],
      value: 20,
      stackable: true,
      maxStack: 99
    });
  }

  /**
   * Add item to database
   * @param {string} id - Item ID
   * @param {Object} itemData - Item data
   */
  addItem(id, itemData) {
    this.items.set(id, {
      id,
      ...itemData,
      level: itemData.level || 1
    });
  }

  /**
   * Get item by ID
   * @param {string} id - Item ID
   * @returns {Object|null} Item data
   */
  getItem(id) {
    return this.items.get(id) || null;
  }

  /**
   * Create item instance
   * @param {string} id - Item ID
   * @param {number} level - Item level
   * @returns {Object|null} Item instance
   */
  createItem(id, level = 1) {
    const template = this.getItem(id);
    if (!template) return null;
    
    return {
      ...template,
      level,
      instanceId: this.generateInstanceId(),
      createdAt: Date.now()
    };
  }

  /**
   * Get random item for testing
   * @returns {Object} Random item
   */
  getRandomItem() {
    const itemIds = Array.from(this.items.keys());
    const randomId = itemIds[Math.floor(Math.random() * itemIds.length)];
    return this.createItem(randomId);
  }

  /**
   * Get items by type
   * @param {string} type - Item type
   * @returns {Array} Items of specified type
   */
  getItemsByType(type) {
    const items = [];
    for (const [id, item] of this.items) {
      if (item.type === type) {
        items.push(this.createItem(id));
      }
    }
    return items;
  }

  /**
   * Generate unique instance ID
   * @returns {string} Instance ID
   */
  generateInstanceId() {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all item IDs
   * @returns {Array} Array of item IDs
   */
  getAllItemIds() {
    return Array.from(this.items.keys());
  }

  /**
   * Get database stats
   * @returns {Object} Database statistics
   */
  getStats() {
    const stats = {
      totalItems: this.items.size,
      byType: {},
      byRarity: {}
    };
    
    for (const item of this.items.values()) {
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
      stats.byRarity[item.rarity] = (stats.byRarity[item.rarity] || 0) + 1;
    }
    
    return stats;
  }
}

// Create and export singleton instance
export const itemDatabase = new ItemDatabase();