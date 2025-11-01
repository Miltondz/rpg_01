/**
 * Consumable System - Handles consumable item effects and combat integration
 * Manages potions, elixirs, and other consumable items during gameplay
 */

export class ConsumableSystem {
    constructor() {
        this.activeEffects = new Map(); // Track active temporary effects
        this.listeners = new Set();
    }

    /**
     * Use a consumable item on a target
     * @param {Item} item - Consumable item to use
     * @param {Object} target - Target character or entity
     * @param {Object} context - Additional context (combat state, etc.)
     * @returns {Object} Usage result with effects applied
     */
    useConsumable(item, target, context = {}) {
        if (!item.usable || item.type !== 'consumable') {
            return { 
                success: false, 
                message: 'Item is not consumable',
                effects: []
            };
        }

        const results = [];
        let overallSuccess = true;

        // Apply each effect from the item
        for (const effect of item.effects) {
            const result = this._applyConsumableEffect(effect, target, context);
            results.push(result);
            
            if (!result.success) {
                overallSuccess = false;
            }
        }

        // Notify listeners of consumable use
        this._notifyConsumableUsed(item, target, results);

        return {
            success: overallSuccess,
            message: `Used ${item.name}`,
            effects: results,
            item: item
        };
    }

    /**
     * Process temporary effects (called each turn in combat)
     * @param {Object} character - Character to process effects for
     */
    processTemporaryEffects(character) {
        if (!character.statusEffects) {
            character.statusEffects = [];
        }

        const expiredEffects = [];
        
        // Decrease duration and collect expired effects
        character.statusEffects.forEach((effect, index) => {
            if (effect.duration !== undefined) {
                effect.duration--;
                if (effect.duration <= 0) {
                    expiredEffects.push(index);
                }
            }
        });

        // Remove expired effects (in reverse order to maintain indices)
        expiredEffects.reverse().forEach(index => {
            const expiredEffect = character.statusEffects[index];
            character.statusEffects.splice(index, 1);
            this._notifyEffectExpired(character, expiredEffect);
        });

        return expiredEffects.length > 0;
    }

    /**
     * Get all active temporary effects for a character
     * @param {Object} character - Character to check
     * @returns {Array} Array of active effects
     */
    getActiveEffects(character) {
        return character.statusEffects || [];
    }

    /**
     * Calculate total stat modifiers from active effects
     * @param {Object} character - Character to calculate for
     * @returns {Object} Stat modifiers object
     */
    calculateEffectModifiers(character) {
        const modifiers = {
            ATK: 0,
            DEF: 0,
            SPD: 0,
            HP: 0
        };

        if (!character.statusEffects) {
            return modifiers;
        }

        character.statusEffects.forEach(effect => {
            if (effect.type && modifiers.hasOwnProperty(effect.type)) {
                modifiers[effect.type] += effect.value || 0;
            }
        });

        return modifiers;
    }

    /**
     * Check if character has a specific status effect
     * @param {Object} character - Character to check
     * @param {string} effectType - Type of effect to look for
     * @returns {boolean} Whether character has the effect
     */
    hasStatusEffect(character, effectType) {
        if (!character.statusEffects) return false;
        
        return character.statusEffects.some(effect => effect.type === effectType);
    }

    /**
     * Remove specific status effect from character
     * @param {Object} character - Character to remove effect from
     * @param {string} effectType - Type of effect to remove
     * @returns {boolean} Whether effect was removed
     */
    removeStatusEffect(character, effectType) {
        if (!character.statusEffects) return false;

        const initialLength = character.statusEffects.length;
        character.statusEffects = character.statusEffects.filter(effect => effect.type !== effectType);
        
        return character.statusEffects.length < initialLength;
    }

    /**
     * Add change listener for consumable events
     * @param {Function} callback - Callback function
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * Remove change listener
     * @param {Function} callback - Callback function
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    // Private methods

    _applyConsumableEffect(effect, target, context) {
        switch (effect.type) {
            case 'heal':
                return this._applyHeal(effect, target);
            case 'restore_ap':
                return this._applyAPRestore(effect, target, context);
            case 'buff':
                return this._applyBuff(effect, target);
            case 'cure':
                return this._applyCure(effect, target);
            case 'revive':
                return this._applyRevive(effect, target);
            default:
                return { 
                    success: false, 
                    message: `Unknown effect type: ${effect.type}`,
                    effectType: effect.type
                };
        }
    }

    _applyHeal(effect, target) {
        if (!target.stats || !target.stats.HP) {
            return { 
                success: false, 
                message: 'Invalid heal target',
                effectType: 'heal'
            };
        }

        const healAmount = effect.value;
        const oldHP = target.stats.HP.current;
        const maxHP = target.stats.HP.max;
        
        // Handle full heal (9999 value)
        const actualHealAmount = healAmount >= 9999 ? maxHP : healAmount;
        
        target.stats.HP.current = Math.min(oldHP + actualHealAmount, maxHP);
        const actualHeal = target.stats.HP.current - oldHP;

        return {
            success: actualHeal > 0,
            message: actualHeal > 0 ? `Healed ${actualHeal} HP` : 'Already at full health',
            value: actualHeal,
            effectType: 'heal'
        };
    }

    _applyAPRestore(effect, target, context) {
        // Only works in combat context
        if (!context.inCombat) {
            return {
                success: false,
                message: 'AP potions can only be used in combat',
                effectType: 'restore_ap'
            };
        }

        if (target.currentAP === undefined) {
            return { 
                success: false, 
                message: 'Target has no AP system',
                effectType: 'restore_ap'
            };
        }

        const maxAP = target.maxAP || 3;
        const restoreAmount = effect.value;
        const oldAP = target.currentAP;
        
        target.currentAP = Math.min(target.currentAP + restoreAmount, maxAP);
        const actualRestore = target.currentAP - oldAP;

        return {
            success: actualRestore > 0,
            message: actualRestore > 0 ? `Restored ${actualRestore} AP` : 'AP already at maximum',
            value: actualRestore,
            effectType: 'restore_ap'
        };
    }

    _applyBuff(effect, target) {
        if (!target.statusEffects) {
            target.statusEffects = [];
        }

        // Check if same buff type already exists
        const existingEffect = target.statusEffects.find(se => 
            se.type === effect.stat && se.source === 'consumable'
        );

        if (existingEffect) {
            // Refresh duration and update value if new buff is stronger
            existingEffect.duration = effect.duration || 3;
            if (effect.value > existingEffect.value) {
                existingEffect.value = effect.value;
            }
        } else {
            // Add new buff
            target.statusEffects.push({
                type: effect.stat,
                value: effect.value,
                duration: effect.duration || 3,
                source: 'consumable'
            });
        }

        return {
            success: true,
            message: `Applied ${effect.stat} buff (+${effect.value}) for ${effect.duration || 3} turns`,
            value: effect.value,
            effectType: 'buff'
        };
    }

    _applyCure(effect, target) {
        if (!target.statusEffects || target.statusEffects.length === 0) {
            return { 
                success: false, 
                message: 'No status effects to cure',
                effectType: 'cure'
            };
        }

        const conditions = effect.conditions || ['poison', 'burn', 'freeze', 'paralysis'];
        const beforeCount = target.statusEffects.length;
        
        target.statusEffects = target.statusEffects.filter(se => 
            !conditions.includes(se.type)
        );
        
        const curedCount = beforeCount - target.statusEffects.length;

        return {
            success: curedCount > 0,
            message: curedCount > 0 ? `Cured ${curedCount} negative effect(s)` : 'No negative effects to cure',
            value: curedCount,
            effectType: 'cure'
        };
    }

    _applyRevive(effect, target) {
        if (!target.stats || !target.stats.HP) {
            return { 
                success: false, 
                message: 'Invalid revive target',
                effectType: 'revive'
            };
        }

        if (target.stats.HP.current > 0) {
            return {
                success: false,
                message: 'Target is not defeated',
                effectType: 'revive'
            };
        }

        const reviveHP = Math.floor(target.stats.HP.max * (effect.value / 100));
        target.stats.HP.current = reviveHP;

        // Clear negative status effects on revive
        if (target.statusEffects) {
            target.statusEffects = target.statusEffects.filter(se => 
                !['poison', 'burn', 'freeze', 'paralysis'].includes(se.type)
            );
        }

        return {
            success: true,
            message: `Revived with ${reviveHP} HP`,
            value: reviveHP,
            effectType: 'revive'
        };
    }

    _notifyConsumableUsed(item, target, effects) {
        this.listeners.forEach(callback => {
            try {
                callback({
                    type: 'consumable_used',
                    item: item,
                    target: target,
                    effects: effects
                });
            } catch (error) {
                console.error('Error in consumable listener:', error);
            }
        });
    }

    _notifyEffectExpired(character, effect) {
        this.listeners.forEach(callback => {
            try {
                callback({
                    type: 'effect_expired',
                    character: character,
                    effect: effect
                });
            } catch (error) {
                console.error('Error in effect expiration listener:', error);
            }
        });
    }
}

// Global instance
export const consumableSystem = new ConsumableSystem();