/**
 * Equipment System - Manages character equipment slots, stat bonuses, and requirements
 * Handles equipping/unequipping items and real-time stat recalculation
 */

export class EquipmentSystem {
    constructor() {
        this.listeners = new Set();
        console.log('EquipmentSystem initialized');
    }

    /**
     * Equip an item to a character
     * @param {Object} character - Character to equip item on
     * @param {Object} item - Item to equip
     * @param {string} slot - Equipment slot (weapon, armor, accessory)
     * @returns {Object} Result with success status and previous item
     */
    equipItem(character, item, slot) {
        // Validate inputs
        if (!character || !item || !slot) {
            return { 
                success: false, 
                message: 'Invalid parameters for equipment',
                previousItem: null 
            };
        }

        // Validate slot type
        if (!['weapon', 'armor', 'accessory'].includes(slot)) {
            return { 
                success: false, 
                message: 'Invalid equipment slot',
                previousItem: null 
            };
        }

        // Validate item type matches slot
        if (!this._validateItemSlot(item, slot)) {
            return { 
                success: false, 
                message: `Item type ${item.type} cannot be equipped in ${slot} slot`,
                previousItem: null 
            };
        }

        // Check equipment requirements
        const canEquip = this.canEquip(character, item);
        if (!canEquip.success) {
            return { 
                success: false, 
                message: canEquip.reason,
                previousItem: null 
            };
        }

        // Store previous item
        const previousItem = character.equipment[slot];

        // Equip the new item
        character.equipment[slot] = item;

        // Recalculate character stats
        this._recalculateCharacterStats(character);

        // Notify listeners
        this._notifyEquipmentChange(character, slot, item, previousItem);

        console.log(`${character.name} equipped ${item.name} in ${slot} slot`);

        return { 
            success: true, 
            message: `Equipped ${item.name}`,
            previousItem: previousItem 
        };
    }

    /**
     * Unequip an item from a character
     * @param {Object} character - Character to unequip item from
     * @param {string} slot - Equipment slot to unequip
     * @returns {Object} Result with success status and unequipped item
     */
    unequipItem(character, slot) {
        // Validate inputs
        if (!character || !slot) {
            return { 
                success: false, 
                message: 'Invalid parameters for unequipping',
                item: null 
            };
        }

        // Validate slot type
        if (!['weapon', 'armor', 'accessory'].includes(slot)) {
            return { 
                success: false, 
                message: 'Invalid equipment slot',
                item: null 
            };
        }

        // Check if slot has an item
        const item = character.equipment[slot];
        if (!item) {
            return { 
                success: false, 
                message: `No item equipped in ${slot} slot`,
                item: null 
            };
        }

        // Unequip the item
        character.equipment[slot] = null;

        // Recalculate character stats
        this._recalculateCharacterStats(character);

        // Notify listeners
        this._notifyEquipmentChange(character, slot, null, item);

        console.log(`${character.name} unequipped ${item.name} from ${slot} slot`);

        return { 
            success: true, 
            message: `Unequipped ${item.name}`,
            item: item 
        };
    }

    /**
     * Check if a character can equip an item
     * @param {Object} character - Character to check
     * @param {Object} item - Item to check
     * @returns {Object} Validation result
     */
    canEquip(character, item) {
        // Check level requirement
        if (item.requirements && item.requirements.level) {
            if (character.level < item.requirements.level) {
                return { 
                    success: false, 
                    reason: `Requires level ${item.requirements.level} (current: ${character.level})` 
                };
            }
        }

        // Check class requirement
        if (item.requirements && item.requirements.class) {
            const allowedClasses = Array.isArray(item.requirements.class) 
                ? item.requirements.class 
                : [item.requirements.class];
            
            // Check both lowercase and original case for compatibility
            const characterClass = character.class.toLowerCase();
            const hasClassMatch = allowedClasses.some(allowedClass => 
                allowedClass.toLowerCase() === characterClass
            );
            
            if (!hasClassMatch) {
                return { 
                    success: false, 
                    reason: `Requires class: ${allowedClasses.join(' or ')} (current: ${character.class})` 
                };
            }
        }

        return { success: true };
    }

    /**
     * Get equipment stat bonuses for a character
     * @param {Object} character - Character to calculate bonuses for
     * @returns {Object} Stat bonuses from equipment
     */
    getEquipmentBonuses(character) {
        const bonuses = {
            HP: 0,
            ATK: 0,
            DEF: 0,
            SPD: 0
        };

        // Sum bonuses from all equipped items
        Object.values(character.equipment).forEach(item => {
            if (item && item.stats) {
                const finalStats = this._getFinalItemStats(item);
                Object.entries(finalStats).forEach(([stat, value]) => {
                    if (bonuses.hasOwnProperty(stat)) {
                        bonuses[stat] += value;
                    }
                });
            }
        });

        return bonuses;
    }

    /**
     * Get comparison data between current equipment and new item
     * @param {Object} character - Character to compare for
     * @param {Object} newItem - New item to compare
     * @param {string} slot - Equipment slot to compare
     * @returns {Object} Comparison data
     */
    getEquipmentComparison(character, newItem, slot) {
        const currentItem = character.equipment[slot];
        
        if (!currentItem) {
            // No current item, show new item stats as pure gains
            const newStats = this._getFinalItemStats(newItem);
            const comparison = {};
            
            Object.entries(newStats).forEach(([stat, value]) => {
                if (value > 0) {
                    comparison[stat] = {
                        current: 0,
                        new: value,
                        difference: value,
                        isUpgrade: true
                    };
                }
            });
            
            return comparison;
        }

        // Compare current vs new item
        const currentStats = this._getFinalItemStats(currentItem);
        const newStats = this._getFinalItemStats(newItem);
        const comparison = {};

        // Get all stats from both items
        const allStats = new Set([
            ...Object.keys(currentStats),
            ...Object.keys(newStats)
        ]);

        allStats.forEach(stat => {
            const currentValue = currentStats[stat] || 0;
            const newValue = newStats[stat] || 0;
            const difference = newValue - currentValue;

            if (difference !== 0) {
                comparison[stat] = {
                    current: currentValue,
                    new: newValue,
                    difference: difference,
                    isUpgrade: difference > 0
                };
            }
        });

        return comparison;
    }

    /**
     * Add equipment change listener
     * @param {Function} callback - Callback function
     */
    addChangeListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * Remove equipment change listener
     * @param {Function} callback - Callback function
     */
    removeChangeListener(callback) {
        this.listeners.delete(callback);
    }

    // Private methods

    /**
     * Validate that an item can be equipped in a specific slot
     * @param {Object} item - Item to validate
     * @param {string} slot - Equipment slot
     * @returns {boolean} Whether item can be equipped in slot
     */
    _validateItemSlot(item, slot) {
        if (!item || !item.type) {
            return false;
        }

        const slotTypeMapping = {
            'weapon': ['weapon'],
            'armor': ['armor'],
            'accessory': ['accessory']
        };

        const allowedTypes = slotTypeMapping[slot];
        return allowedTypes && allowedTypes.includes(item.type);
    }

    /**
     * Get final stats for an item including rarity bonuses
     * @param {Object} item - Item to get stats for
     * @returns {Object} Final item stats
     */
    _getFinalItemStats(item) {
        if (!item.stats) return {};

        // If item has getFinalStats method (from Item class), use it
        if (typeof item.getFinalStats === 'function') {
            return item.getFinalStats();
        }

        // Otherwise calculate manually
        const rarity = item.rarity || 'common';
        const rarityBonuses = {
            'common': 1.0,
            'uncommon': 1.1,
            'rare': 1.2,
            'epic': 1.35
        };

        const bonus = rarityBonuses[rarity] || 1.0;
        const finalStats = {};

        Object.entries(item.stats).forEach(([stat, value]) => {
            finalStats[stat] = Math.floor(value * bonus);
        });

        return finalStats;
    }

    /**
     * Recalculate character stats including equipment bonuses
     * @param {Object} character - Character to recalculate stats for
     */
    _recalculateCharacterStats(character) {
        // Start with base stats
        character.stats = { ...character.baseStats };

        // Add equipment bonuses
        const equipmentBonuses = this.getEquipmentBonuses(character);
        Object.entries(equipmentBonuses).forEach(([stat, bonus]) => {
            if (character.stats.hasOwnProperty(stat)) {
                character.stats[stat] += bonus;
            }
        });

        // Update max HP and ensure current HP doesn't exceed max
        character.maxHP = character.stats.HP;
        if (character.currentHP > character.maxHP) {
            character.currentHP = character.maxHP;
        }

        console.log(`Recalculated stats for ${character.name}:`, character.stats);
    }

    /**
     * Notify listeners of equipment changes
     * @param {Object} character - Character that had equipment changed
     * @param {string} slot - Equipment slot that changed
     * @param {Object} newItem - New item equipped (null if unequipped)
     * @param {Object} previousItem - Previous item (null if slot was empty)
     */
    _notifyEquipmentChange(character, slot, newItem, previousItem) {
        const eventData = {
            character: character,
            slot: slot,
            newItem: newItem,
            previousItem: previousItem,
            equipmentBonuses: this.getEquipmentBonuses(character)
        };

        this.listeners.forEach(callback => {
            try {
                callback(eventData);
            } catch (error) {
                console.error('Error in equipment change listener:', error);
            }
        });

        // Also emit a global event (browser only)
        if (typeof window !== 'undefined' && window.CustomEvent) {
            const event = new CustomEvent('equipmentChange', { detail: eventData });
            window.dispatchEvent(event);
        }
    }
}