/**
 * Loot System - Handles loot generation, drop tables, and reward distribution
 * Provides level-appropriate drops with proper rarity distribution
 */

import { itemDatabase } from '../inventory/ItemDatabase.js';
import { ItemRarity, ItemTypes } from '../inventory/Item.js';
import { combatBalanceConfig } from '../balance/CombatBalanceConfig.js';

export class LootSystem {
    constructor() {
        this.lootTables = new Map();
        this.balanceConfig = combatBalanceConfig;
        this._initializeLootTables();
        console.log('LootSystem initialized with loot tables and balance configuration');
    }

    /**
     * Generate loot for an enemy defeat
     * @param {string} enemyType - Type of enemy defeated
     * @param {number} enemyLevel - Level of defeated enemy
     * @param {number} partyLevel - Average party level for scaling
     * @param {boolean} isBoss - Whether this is a boss encounter
     * @returns {Object} Generated loot with items and gold
     */
    generateLoot(enemyType, enemyLevel, partyLevel, isBoss = false) {
        const loot = {
            gold: this._generateGold(enemyType, enemyLevel, isBoss),
            items: []
        };

        // Boss encounters guarantee rare/epic items
        if (isBoss) {
            loot.items.push(...this._generateBossLoot(enemyLevel, partyLevel));
        } else {
            // Regular enemy loot generation
            const lootTable = this.lootTables.get(enemyType) || this.lootTables.get('default');
            loot.items.push(...this._generateRegularLoot(lootTable, enemyLevel, partyLevel));
        }

        console.log(`Generated loot for ${enemyType} (Level ${enemyLevel}):`, loot);
        return loot;
    }

    /**
     * Generate loot for multiple enemies
     * @param {Array} enemies - Array of defeated enemies
     * @param {number} partyLevel - Average party level
     * @returns {Object} Combined loot from all enemies
     */
    generateCombatLoot(enemies, partyLevel) {
        const combinedLoot = {
            gold: 0,
            items: []
        };

        enemies.forEach(enemy => {
            const enemyLoot = this.generateLoot(
                enemy.type, 
                enemy.level, 
                partyLevel, 
                enemy.isBoss || false
            );
            
            combinedLoot.gold += enemyLoot.gold;
            combinedLoot.items.push(...enemyLoot.items);
        });

        return combinedLoot;
    }

    /**
     * Get loot table for enemy type
     * @param {string} enemyType - Enemy type
     * @returns {Object} Loot table configuration
     */
    getLootTable(enemyType) {
        return this.lootTables.get(enemyType) || this.lootTables.get('default');
    }

    /**
     * Get all available enemy types with loot tables
     * @returns {Array} Array of enemy type names
     */
    getAvailableEnemyTypes() {
        return Array.from(this.lootTables.keys()).filter(key => key !== 'default');
    }

    /**
     * Test loot generation for balancing purposes
     * @param {string} enemyType - Enemy type to test
     * @param {number} enemyLevel - Enemy level
     * @param {number} partyLevel - Party level
     * @param {number} iterations - Number of test iterations
     * @param {boolean} isBoss - Whether to test boss loot
     * @returns {Object} Loot generation statistics
     */
    testLootGeneration(enemyType, enemyLevel, partyLevel, iterations = 100, isBoss = false) {
        const stats = {
            totalGold: 0,
            totalItems: 0,
            rarityCount: {
                [ItemRarity.COMMON.name]: 0,
                [ItemRarity.UNCOMMON.name]: 0,
                [ItemRarity.RARE.name]: 0,
                [ItemRarity.EPIC.name]: 0
            },
            typeCount: {},
            levelRange: { min: Infinity, max: -Infinity },
            averageItemsPerDrop: 0
        };

        for (let i = 0; i < iterations; i++) {
            const loot = this.generateLoot(enemyType, enemyLevel, partyLevel, isBoss);
            
            stats.totalGold += loot.gold;
            stats.totalItems += loot.items.length;
            
            loot.items.forEach(item => {
                // Count rarity
                stats.rarityCount[item.rarity] = (stats.rarityCount[item.rarity] || 0) + 1;
                
                // Count type
                stats.typeCount[item.type] = (stats.typeCount[item.type] || 0) + 1;
                
                // Track level range
                stats.levelRange.min = Math.min(stats.levelRange.min, item.level);
                stats.levelRange.max = Math.max(stats.levelRange.max, item.level);
            });
        }

        stats.averageGold = stats.totalGold / iterations;
        stats.averageItemsPerDrop = stats.totalItems / iterations;
        
        // Fix infinite values if no items were generated
        if (stats.levelRange.min === Infinity) {
            stats.levelRange.min = 0;
            stats.levelRange.max = 0;
        }

        return stats;
    }

    // Private methods

    _initializeLootTables() {
        // Default loot table for unknown enemies
        this._addLootTable('default', {
            goldRange: { min: 5, max: 15 },
            dropChance: 0.3,
            items: [
                { type: ItemTypes.CONSUMABLE, chance: 0.6, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.MATERIAL, chance: 0.3, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.WEAPON, chance: 0.1, rarity: ItemRarity.COMMON.name }
            ]
        });

        // Goblin loot table - Basic enemies with common drops
        this._addLootTable('goblin', {
            goldRange: { min: 3, max: 8 },
            dropChance: 0.4,
            items: [
                { type: ItemTypes.CONSUMABLE, chance: 0.5, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.MATERIAL, chance: 0.3, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.WEAPON, chance: 0.15, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.ARMOR, chance: 0.05, rarity: ItemRarity.COMMON.name }
            ]
        });

        // Orc loot table - Stronger enemies with better drops
        this._addLootTable('orc', {
            goldRange: { min: 8, max: 18 },
            dropChance: 0.5,
            items: [
                { type: ItemTypes.WEAPON, chance: 0.25, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.ARMOR, chance: 0.2, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.CONSUMABLE, chance: 0.25, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.MATERIAL, chance: 0.15, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.WEAPON, chance: 0.08, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.ARMOR, chance: 0.05, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.WEAPON, chance: 0.015, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.ACCESSORY, chance: 0.01, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.WEAPON, chance: 0.005, rarity: ItemRarity.EPIC.name }
            ]
        });

        // Skeleton loot table - Undead with unique drops
        this._addLootTable('skeleton', {
            goldRange: { min: 5, max: 12 },
            dropChance: 0.35,
            items: [
                { type: ItemTypes.MATERIAL, chance: 0.4, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.CONSUMABLE, chance: 0.3, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.WEAPON, chance: 0.2, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.ACCESSORY, chance: 0.1, rarity: ItemRarity.UNCOMMON.name }
            ]
        });

        // Fire Elemental loot table - Magical enemies with elemental items
        this._addLootTable('fire_elemental', {
            goldRange: { min: 10, max: 25 },
            dropChance: 0.6,
            items: [
                { type: ItemTypes.MATERIAL, chance: 0.3, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.WEAPON, chance: 0.2, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.CONSUMABLE, chance: 0.15, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.ACCESSORY, chance: 0.15, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.ARMOR, chance: 0.1, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.WEAPON, chance: 0.08, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.ACCESSORY, chance: 0.02, rarity: ItemRarity.EPIC.name }
            ]
        });

        // Ice Elemental loot table - Similar to fire but different element focus
        this._addLootTable('ice_elemental', {
            goldRange: { min: 10, max: 25 },
            dropChance: 0.6,
            items: [
                { type: ItemTypes.MATERIAL, chance: 0.4, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.WEAPON, chance: 0.25, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.CONSUMABLE, chance: 0.2, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.ACCESSORY, chance: 0.1, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.ARMOR, chance: 0.05, rarity: ItemRarity.RARE.name }
            ]
        });

        // Additional enemy types for comprehensive coverage
        this._addLootTable('troll', {
            goldRange: { min: 15, max: 35 },
            dropChance: 0.7,
            items: [
                { type: ItemTypes.WEAPON, chance: 0.35, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.ARMOR, chance: 0.3, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.MATERIAL, chance: 0.2, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.CONSUMABLE, chance: 0.1, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.ACCESSORY, chance: 0.05, rarity: ItemRarity.RARE.name }
            ]
        });

        this._addLootTable('spider', {
            goldRange: { min: 4, max: 10 },
            dropChance: 0.45,
            items: [
                { type: ItemTypes.MATERIAL, chance: 0.5, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.CONSUMABLE, chance: 0.3, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.WEAPON, chance: 0.15, rarity: ItemRarity.COMMON.name },
                { type: ItemTypes.ACCESSORY, chance: 0.05, rarity: ItemRarity.UNCOMMON.name }
            ]
        });

        this._addLootTable('wraith', {
            goldRange: { min: 12, max: 28 },
            dropChance: 0.55,
            items: [
                { type: ItemTypes.ACCESSORY, chance: 0.3, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.MATERIAL, chance: 0.25, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.CONSUMABLE, chance: 0.25, rarity: ItemRarity.UNCOMMON.name },
                { type: ItemTypes.WEAPON, chance: 0.15, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.ARMOR, chance: 0.05, rarity: ItemRarity.RARE.name }
            ]
        });

        // Boss loot tables - High-tier enemies with guaranteed good drops
        this._addLootTable('boss_tier1', {
            goldRange: { min: 50, max: 100 },
            dropChance: 1.0, // Bosses always drop items
            guaranteedDrops: 2, // Minimum number of items
            items: [
                { type: ItemTypes.WEAPON, chance: 0.3, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.ARMOR, chance: 0.3, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.ACCESSORY, chance: 0.2, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.CONSUMABLE, chance: 0.15, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.WEAPON, chance: 0.05, rarity: ItemRarity.EPIC.name }
            ]
        });

        this._addLootTable('boss_tier2', {
            goldRange: { min: 100, max: 200 },
            dropChance: 1.0,
            guaranteedDrops: 3,
            items: [
                { type: ItemTypes.WEAPON, chance: 0.25, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.ARMOR, chance: 0.25, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.ACCESSORY, chance: 0.2, rarity: ItemRarity.RARE.name },
                { type: ItemTypes.WEAPON, chance: 0.15, rarity: ItemRarity.EPIC.name },
                { type: ItemTypes.ARMOR, chance: 0.1, rarity: ItemRarity.EPIC.name },
                { type: ItemTypes.ACCESSORY, chance: 0.05, rarity: ItemRarity.EPIC.name }
            ]
        });

        this._addLootTable('boss_final', {
            goldRange: { min: 200, max: 400 },
            dropChance: 1.0,
            guaranteedDrops: 4,
            items: [
                { type: ItemTypes.WEAPON, chance: 0.3, rarity: ItemRarity.EPIC.name },
                { type: ItemTypes.ARMOR, chance: 0.3, rarity: ItemRarity.EPIC.name },
                { type: ItemTypes.ACCESSORY, chance: 0.25, rarity: ItemRarity.EPIC.name },
                { type: ItemTypes.CONSUMABLE, chance: 0.15, rarity: ItemRarity.EPIC.name }
            ]
        });
    }

    _addLootTable(enemyType, config) {
        this.lootTables.set(enemyType, config);
    }

    _generateGold(enemyType, enemyLevel, isBoss) {
        const lootTable = this.lootTables.get(enemyType) || this.lootTables.get('default');
        const { min, max } = lootTable.goldRange;
        
        // Use balance configuration for gold economy
        const goldEconomy = this.balanceConfig.resourceEconomy.goldEconomy;
        
        // Base gold amount using balance config
        let goldAmount = goldEconomy.enemyGoldBase * enemyLevel;
        
        // Add variance from loot table
        const variance = 0.5 + Math.random(); // 50% to 150% of base
        goldAmount = Math.floor(goldAmount * variance);
        
        // Boss multiplier from balance config
        if (isBoss) {
            goldAmount = Math.floor(goldAmount * goldEconomy.bossGoldMultiplier);
        }
        
        return goldAmount;
    }

    _generateRegularLoot(lootTable, enemyLevel, partyLevel) {
        const items = [];
        
        // Check if any loot drops
        if (Math.random() > lootTable.dropChance) {
            return items; // No loot this time
        }
        
        // Generate items based on loot table
        for (const itemEntry of lootTable.items) {
            if (Math.random() <= itemEntry.chance) {
                const item = this._generateLevelAppropriateItem(
                    itemEntry.type,
                    enemyLevel,
                    partyLevel,
                    itemEntry.rarity
                );
                
                if (item) {
                    items.push(item);
                }
            }
        }
        
        return items;
    }

    _generateBossLoot(enemyLevel, partyLevel) {
        const items = [];
        const bossTable = this._getBossLootTable(enemyLevel);
        
        if (!bossTable) {
            console.warn(`No boss loot table found for level ${enemyLevel}, using default boss table`);
            return this._generateBossLoot(3, partyLevel); // Fallback to tier 1 boss
        }
        
        // Guaranteed drops for bosses - ensure we get the minimum number
        const guaranteedDrops = bossTable.guaranteedDrops || 2;
        let attempts = 0;
        const maxAttempts = guaranteedDrops * 3; // Prevent infinite loops
        
        // Generate guaranteed items with retry logic
        while (items.length < guaranteedDrops && attempts < maxAttempts) {
            attempts++;
            
            // Select random item entry from boss table
            const itemEntry = bossTable.items[Math.floor(Math.random() * bossTable.items.length)];
            
            const item = this._generateLevelAppropriateItem(
                itemEntry.type,
                enemyLevel,
                partyLevel,
                itemEntry.rarity
            );
            
            if (item) {
                items.push(item);
                console.log(`Boss guaranteed drop ${items.length}/${guaranteedDrops}: ${item.name} (${item.rarity})`);
            }
        }
        
        // Ensure we have at least one rare or epic item for bosses
        const hasRareOrEpic = items.some(item => 
            item.rarity === ItemRarity.RARE.name || item.rarity === ItemRarity.EPIC.name
        );
        
        if (!hasRareOrEpic && items.length > 0) {
            // Replace the first item with a guaranteed rare/epic
            const rareEpicEntries = bossTable.items.filter(entry => 
                entry.rarity === ItemRarity.RARE.name || entry.rarity === ItemRarity.EPIC.name
            );
            
            if (rareEpicEntries.length > 0) {
                const rareEntry = rareEpicEntries[Math.floor(Math.random() * rareEpicEntries.length)];
                const rareItem = this._generateLevelAppropriateItem(
                    rareEntry.type,
                    enemyLevel,
                    partyLevel,
                    rareEntry.rarity
                );
                
                if (rareItem) {
                    items[0] = rareItem;
                    console.log(`Boss guaranteed rare/epic: ${rareItem.name} (${rareItem.rarity})`);
                }
            }
        }
        
        // Additional chance for bonus items (lower probability)
        for (const itemEntry of bossTable.items) {
            if (Math.random() <= itemEntry.chance * 0.25) { // 25% of normal chance for bonus items
                const item = this._generateLevelAppropriateItem(
                    itemEntry.type,
                    enemyLevel,
                    partyLevel,
                    itemEntry.rarity
                );
                
                if (item) {
                    items.push(item);
                    console.log(`Boss bonus drop: ${item.name} (${item.rarity})`);
                }
            }
        }
        
        return items;
    }

    _getBossLootTable(enemyLevel) {
        let bossTable;
        if (enemyLevel <= 3) {
            bossTable = this.lootTables.get('boss_tier1');
        } else if (enemyLevel <= 6) {
            bossTable = this.lootTables.get('boss_tier2');
        } else {
            bossTable = this.lootTables.get('boss_final');
        }
        
        // Fallback to tier1 if no table found
        if (!bossTable) {
            console.warn(`Boss loot table not found for level ${enemyLevel}, using boss_tier1`);
            bossTable = this.lootTables.get('boss_tier1');
        }
        
        return bossTable;
    }

    _generateLevelAppropriateItem(itemType, enemyLevel, partyLevel, rarity) {
        // Calculate target level (±2 levels from party average)
        // Use party level as base, with ±2 level variance
        const levelVariance = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const targetLevel = Math.max(1, partyLevel + levelVariance);
        
        try {
            const item = itemDatabase.generateRandomItem(targetLevel, itemType, rarity);
            if (item) {
                console.log(`Generated ${rarity} ${itemType} at level ${targetLevel} (party level: ${partyLevel})`);
                return item;
            }
        } catch (error) {
            console.warn(`Failed to generate item of type ${itemType} at level ${targetLevel}:`, error);
        }
        
        // Fallback: try to generate any item of the specified type and rarity
        try {
            return itemDatabase.generateRandomItem(partyLevel, itemType, rarity);
        } catch (error) {
            console.warn(`Fallback item generation failed for ${itemType}:`, error);
            return null;
        }
    }
}

// Global instance
export const lootSystem = new LootSystem();