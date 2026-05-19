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

    // Aliases and additional consumables used by ShopSystem / level files
    this.addItem('small_health_potion', {
      name: 'Small Health Potion',
      type: 'consumable',
      rarity: 'common',
      effects: [{ type: 'heal', value: 25 }],
      value: 15,
      stackable: true,
      maxStack: 99
    });
    this.addItem('health_potion_small', {
      name: 'Small Health Potion',
      type: 'consumable',
      rarity: 'common',
      effects: [{ type: 'heal', value: 25 }],
      value: 15,
      stackable: true,
      maxStack: 99
    });
    this.addItem('large_health_potion', {
      name: 'Large Health Potion',
      type: 'consumable',
      rarity: 'uncommon',
      effects: [{ type: 'heal', value: 100 }],
      value: 60,
      stackable: true,
      maxStack: 99
    });
    this.addItem('full_health_potion', {
      name: 'Full Health Potion',
      type: 'consumable',
      rarity: 'rare',
      effects: [{ type: 'heal', value: 9999 }],
      value: 150,
      stackable: true,
      maxStack: 30
    });
    this.addItem('ap_potion', {
      name: 'AP Potion',
      type: 'consumable',
      rarity: 'common',
      effects: [{ type: 'restore_ap', value: 3 }],
      value: 30,
      stackable: true,
      maxStack: 99
    });
    this.addItem('greater_ap_potion', {
      name: 'Greater AP Potion',
      type: 'consumable',
      rarity: 'uncommon',
      effects: [{ type: 'restore_ap', value: 9 }],
      value: 80,
      stackable: true,
      maxStack: 30
    });
    this.addItem('antidote', {
      name: 'Antidote',
      type: 'consumable',
      rarity: 'common',
      effects: [{ type: 'cure_poison', value: 1 }],
      value: 18,
      stackable: true,
      maxStack: 99
    });
    this.addItem('panacea', {
      name: 'Panacea',
      type: 'consumable',
      rarity: 'uncommon',
      effects: [{ type: 'cure_all', value: 1 }],
      value: 90,
      stackable: true,
      maxStack: 20
    });
    this.addItem('strength_elixir', {
      name: 'Strength Elixir',
      type: 'consumable',
      rarity: 'uncommon',
      effects: [{ type: 'buff_atk', value: 5, duration: 3 }],
      value: 45,
      stackable: true,
      maxStack: 20
    });
    this.addItem('defense_elixir', {
      name: 'Defense Elixir',
      type: 'consumable',
      rarity: 'uncommon',
      effects: [{ type: 'buff_def', value: 5, duration: 3 }],
      value: 45,
      stackable: true,
      maxStack: 20
    });
    this.addItem('speed_elixir', {
      name: 'Speed Elixir',
      type: 'consumable',
      rarity: 'uncommon',
      effects: [{ type: 'buff_spd', value: 5, duration: 3 }],
      value: 40,
      stackable: true,
      maxStack: 20
    });
    this.addItem('berserker_elixir', {
      name: 'Berserker Elixir',
      type: 'consumable',
      rarity: 'rare',
      effects: [{ type: 'buff_atk', value: 15, duration: 2 }, { type: 'debuff_def', value: 8, duration: 2 }],
      value: 120,
      stackable: true,
      maxStack: 10
    });
    this.addItem('guardian_elixir', {
      name: 'Guardian Elixir',
      type: 'consumable',
      rarity: 'rare',
      effects: [{ type: 'buff_def', value: 15, duration: 2 }],
      value: 120,
      stackable: true,
      maxStack: 10
    });
    this.addItem('phoenix_down', {
      name: 'Phoenix Down',
      type: 'consumable',
      rarity: 'rare',
      effects: [{ type: 'revive', value: 1 }],
      value: 200,
      stackable: true,
      maxStack: 5
    });
    this.addItem('elixir_of_life', {
      name: 'Elixir of Life',
      type: 'consumable',
      rarity: 'epic',
      effects: [{ type: 'revive', value: 1 }, { type: 'heal', value: 9999 }],
      value: 500,
      stackable: true,
      maxStack: 3
    });

    // Materials
    this.addItem('iron_ore', {
      name: 'Iron Ore',
      type: 'material',
      rarity: 'common',
      value: 8,
      stackable: true,
      maxStack: 99
    });
    this.addItem('magic_crystal', {
      name: 'Magic Crystal',
      type: 'material',
      rarity: 'uncommon',
      value: 35,
      stackable: true,
      maxStack: 50
    });
    this.addItem('mithril_ore', {
      name: 'Mithril Ore',
      type: 'material',
      rarity: 'rare',
      value: 120,
      stackable: true,
      maxStack: 20
    });
    this.addItem('dragon_scale', {
      name: 'Dragon Scale',
      type: 'material',
      rarity: 'epic',
      value: 500,
      stackable: true,
      maxStack: 10
    });

    // Key items
    this.addItem('bronze_key', {
      name: 'Bronze Key',
      type: 'key_item',
      rarity: 'common',
      value: 0,
      stackable: true,
      maxStack: 5
    });

    // Additional weapons/armor for shop
    this.addItem('rusty_sword', {
      name: 'Rusty Sword',
      type: 'weapon',
      rarity: 'common',
      stats: { ATK: 6 },
      value: 20
    });
    this.addItem('iron_sword', {
      name: 'Iron Sword',
      type: 'weapon',
      rarity: 'common',
      stats: { ATK: 14 },
      value: 80
    });
    this.addItem('iron_shield', {
      name: 'Iron Shield',
      type: 'armor',
      rarity: 'common',
      stats: { DEF: 8 },
      value: 70
    });
    this.addItem('chain_mail', {
      name: 'Chain Mail',
      type: 'armor',
      rarity: 'uncommon',
      stats: { DEF: 14, HP: 20 },
      value: 150
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
      description: itemData.description || itemData.name || id,
      icon: itemData.icon || '●',
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
   * Generate a random item matching optional filters.
   * STUB: the original implementation was never written; ShopSystem expected this method
   * and crashed at module-load when it didn't exist. Returns a random matching item
   * from the current sparse database, or null if no match.
   * @param {number} level - target item level
   * @param {string} type - ItemTypes.WEAPON / ARMOR / ACCESSORY / CONSUMABLE
   * @param {string} rarity - ItemRarity.* (ignored for now, no rarity data on items)
   * @returns {Object|null}
   */
  generateRandomItem(level = 1, type = null, rarity = null) {
    const candidates = [];
    for (const item of this.items.values()) {
      if (type && item.type !== type) continue;
      candidates.push(item);
    }
    if (candidates.length === 0) return null;
    const template = candidates[Math.floor(Math.random() * candidates.length)];
    return this.createItem(template.id, level);
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