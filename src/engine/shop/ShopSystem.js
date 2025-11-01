/**
 * Shop System - Handles buying and selling items with dynamic pricing
 * Provides shop inventory that scales with game progression
 */

import { itemDatabase } from '../inventory/ItemDatabase.js';
import { ItemTypes, ItemRarity } from '../inventory/Item.js';

export class ShopSystem {
    constructor() {
        this.shopInventory = new Map();
        this.refreshCooldown = 0;
        this.lastRefreshLevel = 1;
        this._initializeShop();
        console.log('ShopSystem initialized');
    }

    /**
     * Buy an item from the shop
     * @param {string} itemId - ID of item to buy
     * @param {number} quantity - Quantity to buy
     * @param {Object} playerInventory - Player's inventory system
     * @param {number} playerGold - Player's current gold
     * @returns {Object} Purchase result
     */
    buyItem(itemId, quantity, playerInventory, playerGold) {
        const shopItem = this.shopInventory.get(itemId);
        if (!shopItem) {
            return {
                success: false,
                message: 'Item not available in shop'
            };
        }

        if (shopItem.stock < quantity) {
            return {
                success: false,
                message: `Only ${shopItem.stock} in stock`
            };
        }

        const totalCost = shopItem.price * quantity;
        if (playerGold < totalCost) {
            return {
                success: false,
                message: `Not enough gold. Need ${totalCost}, have ${playerGold}`
            };
        }

        // Create item instances
        const items = [];
        for (let i = 0; i < quantity; i++) {
            const item = itemDatabase.getItem(shopItem.baseItemId);
            if (item) {
                items.push(item);
            }
        }

        if (items.length === 0) {
            return {
                success: false,
                message: 'Failed to create item instances'
            };
        }

        // Try to add items to inventory
        const addResult = this._addItemsToInventory(items, playerInventory);
        if (!addResult.success) {
            return addResult;
        }

        // Reduce shop stock
        shopItem.stock -= quantity;
        if (shopItem.stock <= 0) {
            this.shopInventory.delete(itemId);
        }

        return {
            success: true,
            message: `Purchased ${quantity}x ${shopItem.name}`,
            cost: totalCost,
            items: items
        };
    }

    /**
     * Sell an item to the shop
     * @param {Object} item - Item to sell
     * @param {number} quantity - Quantity to sell
     * @param {Object} playerInventory - Player's inventory system
     * @returns {Object} Sale result
     */
    sellItem(item, quantity, playerInventory) {
        if (!item) {
            return {
                success: false,
                message: 'Invalid item'
            };
        }

        // Key items cannot be sold
        if (item.type === ItemTypes.KEY_ITEM) {
            return {
                success: false,
                message: 'Key items cannot be sold'
            };
        }

        const sellPrice = this.getSellPrice(item);
        const totalValue = sellPrice * quantity;

        // Remove items from inventory (handled by inventory system)
        // This is just the shop's calculation

        return {
            success: true,
            message: `Sold ${quantity}x ${item.name}`,
            value: totalValue,
            pricePerItem: sellPrice
        };
    }

    /**
     * Get buy price for an item (full price)
     * @param {Object} item - Item to price
     * @returns {number} Buy price
     */
    getBuyPrice(item) {
        if (!item) return 0;
        
        // Base price from item value
        let price = item.value || 10;
        
        // Rarity multiplier for shop prices
        const rarityMultipliers = {
            'common': 1.0,
            'uncommon': 1.5,
            'rare': 2.5,
            'epic': 4.0
        };
        
        const multiplier = rarityMultipliers[item.rarity] || 1.0;
        price = Math.floor(price * multiplier);
        
        return Math.max(1, price);
    }

    /**
     * Get sell price for an item (50% of buy price as per requirements)
     * @param {Object} item - Item to price
     * @returns {number} Sell price
     */
    getSellPrice(item) {
        if (!item) return 0;
        
        const buyPrice = this.getBuyPrice(item);
        return Math.floor(buyPrice * 0.5); // 50% of buy price
    }

    /**
     * Refresh shop inventory based on party level
     * @param {number} partyLevel - Average party level
     * @param {boolean} forceRefresh - Force refresh regardless of cooldown
     */
    refreshShop(partyLevel, forceRefresh = false) {
        if (!forceRefresh && this.refreshCooldown > 0) {
            this.refreshCooldown--;
            return;
        }

        if (!forceRefresh && Math.abs(partyLevel - this.lastRefreshLevel) < 2) {
            return; // Don't refresh if level hasn't changed significantly
        }

        console.log(`Refreshing shop for party level ${partyLevel}`);
        
        this.shopInventory.clear();
        this._generateShopInventory(partyLevel);
        
        this.lastRefreshLevel = partyLevel;
        this.refreshCooldown = 5; // Refresh cooldown to prevent spam
    }

    /**
     * Get current shop inventory
     * @returns {Array} Array of shop items
     */
    getShopInventory() {
        return Array.from(this.shopInventory.values());
    }

    /**
     * Get shop item by ID
     * @param {string} itemId - Shop item ID
     * @returns {Object|null} Shop item or null
     */
    getShopItem(itemId) {
        return this.shopInventory.get(itemId) || null;
    }

    /**
     * Check if shop has item in stock
     * @param {string} itemId - Item ID to check
     * @param {number} quantity - Quantity needed
     * @returns {boolean} True if in stock
     */
    hasInStock(itemId, quantity = 1) {
        const shopItem = this.shopInventory.get(itemId);
        return shopItem && shopItem.stock >= quantity;
    }

    // Private methods

    _initializeShop() {
        // Start with basic level 1 shop
        this._generateShopInventory(1);
    }

    _generateShopInventory(partyLevel) {
        // Always stock basic consumables
        this._addBasicConsumables(partyLevel);
        
        // Add level-appropriate equipment
        this._addEquipment(partyLevel);
        
        // Add materials and accessories
        this._addMaterials(partyLevel);
        this._addAccessories(partyLevel);
        
        console.log(`Generated shop inventory with ${this.shopInventory.size} items`);
    }

    _addBasicConsumables(partyLevel) {
        // Health potions - always available, stock scales with level
        const baseStock = Math.max(5, Math.floor(partyLevel * 2));
        
        this._addShopItem('small_health_potion', baseStock + 15, partyLevel);
        this._addShopItem('health_potion', baseStock + 10, partyLevel);
        
        if (partyLevel >= 2) {
            this._addShopItem('large_health_potion', baseStock + 5, partyLevel);
        }
        
        if (partyLevel >= 4) {
            this._addShopItem('full_health_potion', Math.max(2, Math.floor(partyLevel / 2)), partyLevel);
        }

        // AP potions - scale with party level
        if (partyLevel >= 2) {
            this._addShopItem('ap_potion', Math.max(3, Math.floor(partyLevel * 1.5)), partyLevel);
        }
        
        if (partyLevel >= 4) {
            this._addShopItem('greater_ap_potion', Math.max(1, Math.floor(partyLevel / 3)), partyLevel);
        }

        // Status cure items - always useful
        this._addShopItem('antidote', baseStock + 7, partyLevel);
        
        if (partyLevel >= 3) {
            this._addShopItem('panacea', Math.max(2, Math.floor(partyLevel / 2)), partyLevel);
        }

        // Buff elixirs - become more available at higher levels
        if (partyLevel >= 2) {
            const buffStock = Math.max(2, Math.floor(partyLevel / 2));
            this._addShopItem('strength_elixir', buffStock + 3, partyLevel);
            this._addShopItem('defense_elixir', buffStock + 3, partyLevel);
            this._addShopItem('speed_elixir', buffStock + 3, partyLevel);
        }

        if (partyLevel >= 5) {
            const rareBuffStock = Math.max(1, Math.floor(partyLevel / 4));
            this._addShopItem('berserker_elixir', rareBuffStock + 1, partyLevel);
            this._addShopItem('guardian_elixir', rareBuffStock + 1, partyLevel);
        }

        // Rare consumables - very limited stock
        if (partyLevel >= 6) {
            this._addShopItem('phoenix_down', Math.max(1, Math.floor(partyLevel / 5)), partyLevel);
        }
        
        if (partyLevel >= 8) {
            this._addShopItem('elixir_of_life', 1, partyLevel);
        }
    }

    _addEquipment(partyLevel) {
        // Generate level-appropriate equipment that scales with progression
        const equipmentLevel = Math.max(1, partyLevel - 1);
        const levelRange = Math.min(3, Math.floor(partyLevel / 2) + 1);
        
        // Weapons - more variety at higher levels
        const weaponCount = Math.min(5, 2 + Math.floor(partyLevel / 3));
        for (let i = 0; i < weaponCount; i++) {
            const item = itemDatabase.generateRandomItem(
                equipmentLevel + Math.floor(Math.random() * levelRange),
                ItemTypes.WEAPON,
                this._getShopRarity(partyLevel)
            );
            
            if (item) {
                const stock = Math.max(1, Math.floor(Math.random() * 2) + 1);
                this._addGeneratedItem(item, stock);
            }
        }

        // Armor pieces - scale with party level
        const armorCount = Math.min(4, 1 + Math.floor(partyLevel / 2));
        for (let i = 0; i < armorCount; i++) {
            const item = itemDatabase.generateRandomItem(
                equipmentLevel + Math.floor(Math.random() * levelRange),
                ItemTypes.ARMOR,
                this._getShopRarity(partyLevel)
            );
            
            if (item) {
                const stock = Math.max(1, Math.floor(Math.random() * 2) + 1);
                this._addGeneratedItem(item, stock);
            }
        }
    }

    _addAccessories(partyLevel) {
        // Accessories become more available at higher levels
        const accessoryCount = Math.min(3, 1 + Math.floor(partyLevel / 4));
        
        for (let i = 0; i < accessoryCount; i++) {
            const item = itemDatabase.generateRandomItem(
                partyLevel + Math.floor(Math.random() * 2),
                ItemTypes.ACCESSORY,
                this._getShopRarity(partyLevel)
            );
            
            if (item) {
                this._addGeneratedItem(item, 1);
            }
        }
    }

    _addMaterials(partyLevel) {
        // Basic materials - stock scales with party progression
        const materialStock = Math.max(10, partyLevel * 5);
        
        this._addShopItem('iron_ore', materialStock, partyLevel);
        
        if (partyLevel >= 3) {
            const rareStock = Math.max(5, Math.floor(partyLevel * 2));
            this._addShopItem('magic_crystal', rareStock, partyLevel);
        }
        
        // Higher level materials
        if (partyLevel >= 6) {
            this._addShopItem('mithril_ore', Math.max(2, Math.floor(partyLevel / 2)), partyLevel);
        }
        
        if (partyLevel >= 8) {
            this._addShopItem('dragon_scale', Math.max(1, Math.floor(partyLevel / 4)), partyLevel);
        }
    }

    _addShopItem(itemId, stock, partyLevel) {
        const item = itemDatabase.getItem(itemId);
        if (!item) {
            console.warn(`Shop item not found: ${itemId}`);
            return;
        }

        const shopItemId = `shop_${itemId}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        
        this.shopInventory.set(shopItemId, {
            id: shopItemId,
            baseItemId: itemId,
            name: item.name,
            type: item.type,
            rarity: item.rarity,
            level: item.level,
            description: item.description,
            price: this.getBuyPrice(item),
            stock: stock,
            icon: item.icon
        });
    }

    _addGeneratedItem(item, stock) {
        const shopItemId = `shop_gen_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        
        this.shopInventory.set(shopItemId, {
            id: shopItemId,
            baseItemId: item.id,
            name: item.name,
            type: item.type,
            rarity: item.rarity,
            level: item.level,
            description: item.description,
            price: this.getBuyPrice(item),
            stock: stock,
            icon: item.icon,
            stats: item.getFinalStats(),
            requirements: item.requirements
        });
    }

    _getShopRarity(partyLevel) {
        // Shop inventory quality scales with party progression
        const roll = Math.random();
        
        // Epic items (very rare, high level only)
        if (partyLevel >= 8 && roll < 0.05) return ItemRarity.EPIC.name;
        if (partyLevel >= 6 && roll < 0.08) return ItemRarity.EPIC.name;
        
        // Rare items (uncommon, mid-high level)
        if (partyLevel >= 6 && roll < 0.25) return ItemRarity.RARE.name;
        if (partyLevel >= 4 && roll < 0.15) return ItemRarity.RARE.name;
        
        // Uncommon items (fairly common at mid level)
        if (partyLevel >= 4 && roll < 0.45) return ItemRarity.UNCOMMON.name;
        if (partyLevel >= 2 && roll < 0.30) return ItemRarity.UNCOMMON.name;
        
        // Common items (always available)
        return ItemRarity.COMMON.name;
    }

    _addItemsToInventory(items, playerInventory) {
        let allAdded = true;
        const results = [];

        for (const item of items) {
            const result = playerInventory.addItem(item, 1);
            results.push(result);
            if (!result.success) {
                allAdded = false;
            }
        }

        return {
            success: allAdded,
            message: allAdded ? 'Items added to inventory' : 'Some items could not be added - inventory full',
            results: results
        };
    }
}

// Global instance
export const shopSystem = new ShopSystem();