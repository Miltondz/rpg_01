/**
 * Item class and related utilities
 * Defines item structure, types, and rarity system
 */

export const ItemTypes = {
    WEAPON: 'weapon',
    ARMOR: 'armor',
    ACCESSORY: 'accessory',
    CONSUMABLE: 'consumable',
    KEY_ITEM: 'key_item',
    MATERIAL: 'material'
};

export const ItemRarity = {
    COMMON: { 
        name: 'common', 
        color: '#FFFFFF', 
        statBonus: 1.0,
        dropChance: 0.6 
    },
    UNCOMMON: { 
        name: 'uncommon', 
        color: '#00FF00', 
        statBonus: 1.1,
        dropChance: 0.25 
    },
    RARE: { 
        name: 'rare', 
        color: '#0080FF', 
        statBonus: 1.2,
        dropChance: 0.12 
    },
    EPIC: { 
        name: 'epic', 
        color: '#8000FF', 
        statBonus: 1.35,
        dropChance: 0.03 
    }
};

export class Item {
    constructor(config) {
        this.id = config.id || this._generateId();
        this.name = config.name || 'Unknown Item';
        this.type = config.type || ItemTypes.MATERIAL;
        this.rarity = config.rarity || ItemRarity.COMMON.name;
        this.level = config.level || 1;
        this.description = config.description || '';
        this.icon = config.icon || 'default';
        
        // Stacking properties
        this.stackable = config.stackable !== undefined ? config.stackable : this._isStackableByType();
        this.maxStack = config.maxStack || (this.stackable ? 99 : 1);
        
        // Economic properties
        this.value = config.value || this._calculateBaseValue();
        
        // Equipment specific properties
        this.stats = config.stats || {};
        this.requirements = config.requirements || {};
        
        // Consumable specific properties
        this.effects = config.effects || [];
        this.usable = config.usable !== undefined ? config.usable : this.type === ItemTypes.CONSUMABLE;
        
        // Special properties and modifiers
        this.modifiers = config.modifiers || [];
        this.setBonus = config.setBonus || null;
    }

    /**
     * Get item's display color based on rarity
     * @returns {string} Hex color code
     */
    getColor() {
        const rarityData = Object.values(ItemRarity).find(r => r.name === this.rarity);
        return rarityData ? rarityData.color : ItemRarity.COMMON.color;
    }

    /**
     * Get stat bonus multiplier based on rarity
     * @returns {number} Stat bonus multiplier
     */
    getStatBonus() {
        const rarityData = Object.values(ItemRarity).find(r => r.name === this.rarity);
        return rarityData ? rarityData.statBonus : ItemRarity.COMMON.statBonus;
    }

    /**
     * Calculate final stats with rarity bonus
     * @returns {Object} Final stats object
     */
    getFinalStats() {
        const bonus = this.getStatBonus();
        const finalStats = {};
        
        Object.entries(this.stats).forEach(([stat, value]) => {
            finalStats[stat] = Math.floor(value * bonus);
        });
        
        return finalStats;
    }

    /**
     * Check if character can use this item
     * @param {Object} character - Character to check against
     * @returns {Object} Validation result
     */
    canUse(character) {
        const requirements = this.requirements;
        
        // Level requirement
        if (requirements.level && character.level < requirements.level) {
            return { 
                canUse: false, 
                reason: `Requires level ${requirements.level}` 
            };
        }
        
        // Class requirement
        if (requirements.class && requirements.class.length > 0) {
            if (!requirements.class.includes(character.class)) {
                return { 
                    canUse: false, 
                    reason: `Requires class: ${requirements.class.join(' or ')}` 
                };
            }
        }
        
        return { canUse: true };
    }

    /**
     * Use the item (for consumables)
     * @param {Object} target - Target to use item on
     * @returns {Object} Usage result
     */
    use(target) {
        if (!this.usable) {
            return { success: false, message: 'Item is not usable' };
        }

        const results = [];
        
        this.effects.forEach(effect => {
            const result = this._applyEffect(effect, target);
            results.push(result);
        });

        return {
            success: true,
            message: `Used ${this.name}`,
            effects: results
        };
    }

    /**
     * Get tooltip information
     * @returns {Object} Tooltip data
     */
    getTooltip() {
        const tooltip = {
            name: this.name,
            type: this.type,
            rarity: this.rarity,
            level: this.level,
            description: this.description,
            value: this.value,
            stats: this.getFinalStats(),
            requirements: this.requirements,
            effects: this.effects
        };

        return tooltip;
    }

    /**
     * Compare with another item for tooltips
     * @param {Item} otherItem - Item to compare with
     * @returns {Object} Comparison data
     */
    compareWith(otherItem) {
        if (!otherItem || this.type !== otherItem.type) {
            return null;
        }

        const thisStats = this.getFinalStats();
        const otherStats = otherItem.getFinalStats();
        const comparison = {};

        // Compare all stats
        const allStats = new Set([...Object.keys(thisStats), ...Object.keys(otherStats)]);
        
        allStats.forEach(stat => {
            const thisValue = thisStats[stat] || 0;
            const otherValue = otherStats[stat] || 0;
            const difference = thisValue - otherValue;
            
            if (difference !== 0) {
                comparison[stat] = {
                    current: otherValue,
                    new: thisValue,
                    difference: difference,
                    isUpgrade: difference > 0
                };
            }
        });

        return comparison;
    }

    // Private methods

    _generateId() {
        return 'item_' + Math.random().toString(36).substring(2, 11);
    }

    _isStackableByType() {
        return this.type === ItemTypes.CONSUMABLE || 
               this.type === ItemTypes.MATERIAL;
    }

    _calculateBaseValue() {
        let baseValue = 10;
        
        // Adjust by type
        const typeMultipliers = {
            [ItemTypes.WEAPON]: 3.0,
            [ItemTypes.ARMOR]: 2.5,
            [ItemTypes.ACCESSORY]: 2.0,
            [ItemTypes.CONSUMABLE]: 0.5,
            [ItemTypes.MATERIAL]: 0.3,
            [ItemTypes.KEY_ITEM]: 0
        };
        
        baseValue *= (typeMultipliers[this.type] || 1.0);
        
        // Adjust by level
        baseValue *= (1 + (this.level - 1) * 0.5);
        
        // Adjust by rarity
        const rarityMultipliers = {
            'common': 1.0,
            'uncommon': 2.0,
            'rare': 4.0,
            'epic': 8.0
        };
        
        baseValue *= (rarityMultipliers[this.rarity] || 1.0);
        
        return Math.floor(baseValue);
    }

    _applyEffect(effect, target) {
        switch (effect.type) {
            case 'heal':
                return this._applyHeal(effect, target);
            case 'buff':
                return this._applyBuff(effect, target);
            case 'cure':
                return this._applyCure(effect, target);
            case 'restore_ap':
                return this._applyAPRestore(effect, target);
            default:
                return { success: false, message: 'Unknown effect type' };
        }
    }

    _applyHeal(effect, target) {
        if (!target.stats || !target.stats.HP) {
            return { success: false, message: 'Invalid heal target' };
        }

        const healAmount = effect.value;
        const oldHP = target.stats.HP.current;
        target.stats.HP.current = Math.min(
            target.stats.HP.current + healAmount,
            target.stats.HP.max
        );
        
        const actualHeal = target.stats.HP.current - oldHP;
        
        return {
            success: true,
            message: `Healed ${actualHeal} HP`,
            value: actualHeal
        };
    }

    _applyBuff(effect, target) {
        if (!target.statusEffects) {
            target.statusEffects = [];
        }

        target.statusEffects.push({
            type: effect.stat,
            value: effect.value,
            duration: effect.duration || 3,
            source: this.name
        });

        return {
            success: true,
            message: `Applied ${effect.stat} buff (+${effect.value})`,
            value: effect.value
        };
    }

    _applyCure(effect, target) {
        if (!target.statusEffects) {
            return { success: false, message: 'No status effects to cure' };
        }

        const beforeCount = target.statusEffects.length;
        target.statusEffects = target.statusEffects.filter(se => 
            !effect.conditions.includes(se.type)
        );
        const curedCount = beforeCount - target.statusEffects.length;

        return {
            success: curedCount > 0,
            message: curedCount > 0 ? `Cured ${curedCount} status effect(s)` : 'No effects to cure',
            value: curedCount
        };
    }

    _applyAPRestore(effect, target) {
        if (!target.currentAP && target.currentAP !== 0) {
            return { success: false, message: 'Target has no AP system' };
        }

        const maxAP = target.maxAP || 3; // Default max AP
        const restoreAmount = effect.value;
        const oldAP = target.currentAP;
        
        target.currentAP = Math.min(target.currentAP + restoreAmount, maxAP);
        const actualRestore = target.currentAP - oldAP;

        return {
            success: actualRestore > 0,
            message: actualRestore > 0 ? `Restored ${actualRestore} AP` : 'AP already at maximum',
            value: actualRestore
        };
    }
}

/**
 * Item factory for creating predefined items
 * @deprecated Use ItemDatabase for comprehensive item creation
 */
export class ItemFactory {
    static createHealthPotion(size = 'small') {
        const potions = {
            small: { name: 'Small Health Potion', heal: 25, value: 15 },
            medium: { name: 'Health Potion', heal: 50, value: 30 },
            large: { name: 'Large Health Potion', heal: 100, value: 60 },
            full: { name: 'Full Health Potion', heal: 9999, value: 150 }
        };

        const config = potions[size] || potions.small;

        return new Item({
            name: config.name,
            type: ItemTypes.CONSUMABLE,
            rarity: ItemRarity.COMMON.name,
            description: `Restores ${config.heal} HP`,
            value: config.value,
            stackable: true,
            effects: [{
                type: 'heal',
                value: config.heal
            }],
            icon: 'potion_health'
        });
    }

    static createWeapon(name, level = 1, rarity = ItemRarity.COMMON.name, classRestriction = null) {
        const baseATK = 8 + (level - 1) * 2;
        
        const requirements = { level: level };
        if (classRestriction) {
            requirements.class = Array.isArray(classRestriction) ? classRestriction : [classRestriction];
        }
        
        return new Item({
            name: name,
            type: ItemTypes.WEAPON,
            rarity: rarity,
            level: level,
            description: `A ${rarity} weapon${classRestriction ? ` for ${Array.isArray(classRestriction) ? classRestriction.join('/') : classRestriction}` : ''}`,
            stats: {
                ATK: baseATK
            },
            requirements: requirements,
            stackable: false,
            icon: 'weapon_sword'
        });
    }

    static createArmor(name, level = 1, rarity = ItemRarity.COMMON.name, classRestriction = null) {
        const baseDEF = 5 + (level - 1) * 1.5;
        const baseHP = 10 + (level - 1) * 3;
        
        const requirements = { level: level };
        if (classRestriction) {
            requirements.class = Array.isArray(classRestriction) ? classRestriction : [classRestriction];
        }
        
        return new Item({
            name: name,
            type: ItemTypes.ARMOR,
            rarity: rarity,
            level: level,
            description: `A ${rarity} armor piece${classRestriction ? ` for ${Array.isArray(classRestriction) ? classRestriction.join('/') : classRestriction}` : ''}`,
            stats: {
                DEF: Math.floor(baseDEF),
                HP: Math.floor(baseHP)
            },
            requirements: requirements,
            stackable: false,
            icon: 'armor_chest'
        });
    }

    static createAccessory(name, level = 1, rarity = ItemRarity.COMMON.name, statType = 'SPD') {
        const baseValue = 3 + (level - 1) * 1;
        
        const stats = {};
        stats[statType] = Math.floor(baseValue);
        
        return new Item({
            name: name,
            type: ItemTypes.ACCESSORY,
            rarity: rarity,
            level: level,
            description: `A ${rarity} accessory that boosts ${statType}`,
            stats: stats,
            requirements: {
                level: level
            },
            stackable: false,
            icon: 'accessory_ring'
        });
    }
}