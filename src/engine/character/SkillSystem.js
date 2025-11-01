/**
 * SkillSystem - Manages character skills, abilities, and their effects
 * Handles skill definitions, activation, cooldowns, and combat integration
 */

import { combatBalanceConfig } from '../balance/CombatBalanceConfig.js';

export class SkillSystem {
    constructor() {
        // Skill database
        this.skills = new Map();

        // Active cooldowns (characterId -> skillId -> remainingTurns)
        this.cooldowns = new Map();

        // Balance configuration
        this.balanceConfig = combatBalanceConfig;

        // Initialize skill database
        this.initializeSkills();

        console.log('SkillSystem initialized with', this.skills.size, 'skills');
    }

    /**
     * Initialize all skill definitions
     */
    initializeSkills() {
        // Warrior Skills
        this.registerSkill({
            id: 'power_strike',
            name: 'Power Strike',
            description: '150% damage to single enemy',
            class: 'warrior',
            apCost: this.balanceConfig.getActionAPCost('skill_basic'),
            cooldown: this.balanceConfig.getSkillCooldown('basic'),
            targetType: 'enemy_single',
            effects: [
                {
                    type: 'damage',
                    value: 1.5, // 150% of normal attack
                    element: 'Physical'
                }
            ]
        });

        this.registerSkill({
            id: 'taunt',
            name: 'Taunt',
            description: 'Force enemies to attack you for 2 turns',
            class: 'warrior',
            apCost: 1,
            cooldown: 3,
            targetType: 'self',
            effects: [
                {
                    type: 'status',
                    statusType: 'taunt',
                    duration: 2,
                    value: 1
                }
            ]
        });

        this.registerSkill({
            id: 'cleave',
            name: 'Cleave',
            description: '120% damage to all front row enemies',
            class: 'warrior',
            apCost: this.balanceConfig.getActionAPCost('skill_advanced'),
            cooldown: this.balanceConfig.getSkillCooldown('powerful'),
            targetType: 'enemy_front_row',
            effects: [
                {
                    type: 'damage',
                    value: 1.2,
                    element: 'Physical'
                }
            ]
        });

        this.registerSkill({
            id: 'iron_will',
            name: 'Iron Will',
            description: 'Increase DEF by 50% for 3 turns',
            class: 'warrior',
            apCost: 2,
            cooldown: 4,
            targetType: 'self',
            effects: [
                {
                    type: 'status',
                    statusType: 'defense_boost',
                    duration: 3,
                    value: 0.5
                }
            ]
        });

        this.registerSkill({
            id: 'execute',
            name: 'Execute',
            description: '300% damage if enemy HP < 25%',
            class: 'warrior',
            apCost: this.balanceConfig.getActionAPCost('skill_ultimate'),
            cooldown: this.balanceConfig.getSkillCooldown('ultimate'),
            targetType: 'enemy_single',
            effects: [
                {
                    type: 'conditional_damage',
                    condition: 'low_hp',
                    threshold: 0.25,
                    value: 3.0,
                    fallbackValue: 1.0,
                    element: 'Physical'
                }
            ]
        });

        // Rogue Skills
        this.registerSkill({
            id: 'backstab',
            name: 'Backstab',
            description: '200% damage with high critical chance',
            class: 'rogue',
            apCost: 2,
            cooldown: 0,
            targetType: 'enemy_single',
            effects: [
                {
                    type: 'damage',
                    value: 2.0,
                    element: 'Physical',
                    criticalBonus: 0.3 // +30% critical chance
                }
            ]
        });

        this.registerSkill({
            id: 'poison_blade',
            name: 'Poison Blade',
            description: 'Apply poison for 3 turns (10 damage/turn)',
            class: 'rogue',
            apCost: 1,
            cooldown: 2,
            targetType: 'enemy_single',
            effects: [
                {
                    type: 'status',
                    statusType: 'poison',
                    duration: 3,
                    value: 10
                }
            ]
        });

        this.registerSkill({
            id: 'evasion',
            name: 'Evasion',
            description: 'Increase SPD by 100% for 2 turns',
            class: 'rogue',
            apCost: 2,
            cooldown: 4,
            targetType: 'self',
            effects: [
                {
                    type: 'status',
                    statusType: 'speed_boost',
                    duration: 2,
                    value: 1.0
                }
            ]
        });

        this.registerSkill({
            id: 'multi_strike',
            name: 'Multi Strike',
            description: '3 attacks at 60% damage each',
            class: 'rogue',
            apCost: 3,
            cooldown: 3,
            targetType: 'enemy_single',
            effects: [
                {
                    type: 'multi_attack',
                    attacks: 3,
                    damagePerAttack: 0.6,
                    element: 'Physical'
                }
            ]
        });

        this.registerSkill({
            id: 'assassinate',
            name: 'Assassinate',
            description: 'Instant kill if enemy HP < 15%',
            class: 'rogue',
            apCost: 3,
            cooldown: 6,
            targetType: 'enemy_single',
            effects: [
                {
                    type: 'instant_kill',
                    condition: 'low_hp',
                    threshold: 0.15,
                    fallbackDamage: 2.5
                }
            ]
        });

        // Mage Skills
        this.registerSkill({
            id: 'fireball',
            name: 'Fireball',
            description: '150% Fire damage to single enemy',
            class: 'mage',
            apCost: 2,
            cooldown: 0,
            targetType: 'enemy_single',
            effects: [
                {
                    type: 'damage',
                    value: 1.5,
                    element: 'Fire'
                }
            ]
        });

        this.registerSkill({
            id: 'ice_shard',
            name: 'Ice Shard',
            description: '120% Ice damage, slows enemy',
            class: 'mage',
            apCost: 2,
            cooldown: 1,
            targetType: 'enemy_single',
            effects: [
                {
                    type: 'damage',
                    value: 1.2,
                    element: 'Ice'
                },
                {
                    type: 'status',
                    statusType: 'slow',
                    duration: 2,
                    value: 0.5
                }
            ]
        });

        this.registerSkill({
            id: 'lightning_storm',
            name: 'Lightning Storm',
            description: '100% Lightning damage to all enemies',
            class: 'mage',
            apCost: 3,
            cooldown: 3,
            targetType: 'enemy_all',
            effects: [
                {
                    type: 'damage',
                    value: 1.0,
                    element: 'Lightning'
                }
            ]
        });

        this.registerSkill({
            id: 'mana_shield',
            name: 'Mana Shield',
            description: 'Absorb next 3 attacks',
            class: 'mage',
            apCost: 2,
            cooldown: 5,
            targetType: 'self',
            effects: [
                {
                    type: 'status',
                    statusType: 'shield',
                    duration: 999, // Until 3 hits absorbed
                    value: 3
                }
            ]
        });

        this.registerSkill({
            id: 'meteor',
            name: 'Meteor',
            description: '250% Fire damage to all enemies',
            class: 'mage',
            apCost: 4,
            cooldown: 6,
            targetType: 'enemy_all',
            effects: [
                {
                    type: 'damage',
                    value: 2.5,
                    element: 'Fire'
                }
            ]
        });

        // Cleric Skills
        this.registerSkill({
            id: 'heal',
            name: 'Heal',
            description: 'Restore 50% HP to ally',
            class: 'cleric',
            apCost: 2,
            cooldown: 0,
            targetType: 'ally_single',
            effects: [
                {
                    type: 'heal',
                    value: 0.5, // 50% of max HP
                    scaling: 'percentage'
                }
            ]
        });

        this.registerSkill({
            id: 'bless',
            name: 'Bless',
            description: 'Increase ATK by 30% for 4 turns',
            class: 'cleric',
            apCost: 2,
            cooldown: 2,
            targetType: 'ally_single',
            effects: [
                {
                    type: 'status',
                    statusType: 'attack_boost',
                    duration: 4,
                    value: 0.3
                }
            ]
        });

        this.registerSkill({
            id: 'mass_heal',
            name: 'Mass Heal',
            description: 'Restore 30% HP to all allies',
            class: 'cleric',
            apCost: 3,
            cooldown: 4,
            targetType: 'ally_all',
            effects: [
                {
                    type: 'heal',
                    value: 0.3,
                    scaling: 'percentage'
                }
            ]
        });

        this.registerSkill({
            id: 'resurrect',
            name: 'Resurrect',
            description: 'Revive fallen ally with 25% HP',
            class: 'cleric',
            apCost: 3,
            cooldown: 8,
            targetType: 'ally_dead',
            effects: [
                {
                    type: 'resurrect',
                    value: 0.25
                }
            ]
        });

        this.registerSkill({
            id: 'divine_shield',
            name: 'Divine Shield',
            description: 'Make ally immune to damage for 2 turns',
            class: 'cleric',
            apCost: 3,
            cooldown: 7,
            targetType: 'ally_single',
            effects: [
                {
                    type: 'status',
                    statusType: 'immunity',
                    duration: 2,
                    value: 1
                }
            ]
        });
    }

    /**
     * Register a skill in the system
     * @param {Object} skillData - Skill definition
     */
    registerSkill(skillData) {
        this.skills.set(skillData.id, skillData);
    }

    /**
     * Get skill by ID
     * @param {string} skillId - Skill identifier
     * @returns {Object|null} Skill data or null if not found
     */
    getSkill(skillId) {
        return this.skills.get(skillId) || null;
    }

    /**
     * Get all skills for a character class
     * @param {string} characterClass - Character class
     * @returns {Array} Array of skills for the class
     */
    getSkillsForClass(characterClass) {
        const classSkills = [];
        for (const skill of this.skills.values()) {
            if (skill.class === characterClass.toLowerCase()) {
                classSkills.push(skill);
            }
        }
        return classSkills;
    }

    /**
     * Check if character can use a skill
     * @param {Object} character - Character object
     * @param {string} skillId - Skill to check
     * @returns {Object} Result with canUse boolean and reason
     */
    canUseSkill(character, skillId) {
        const skill = this.getSkill(skillId);

        if (!skill) {
            return { canUse: false, reason: 'Skill not found' };
        }

        // Check if character has the skill unlocked
        if (!character.hasSkill(skillId)) {
            return { canUse: false, reason: 'Skill not unlocked' };
        }

        // Check AP cost
        if (!character.hasAP(skill.apCost)) {
            return { canUse: false, reason: 'Not enough AP' };
        }

        // Check cooldown
        if (this.isOnCooldown(character.id, skillId)) {
            const remaining = this.getCooldownRemaining(character.id, skillId);
            return { canUse: false, reason: `On cooldown (${remaining} turns)` };
        }

        return { canUse: true, reason: 'Available' };
    }

    /**
     * Use a skill
     * @param {Object} character - Character using the skill
     * @param {string} skillId - Skill to use
     * @param {Array} targets - Target characters/enemies
     * @returns {Object} Skill use result
     */
    useSkill(character, skillId, targets) {
        const canUse = this.canUseSkill(character, skillId);

        if (!canUse.canUse) {
            return {
                success: false,
                reason: canUse.reason,
                effects: []
            };
        }

        const skill = this.getSkill(skillId);

        // Consume AP
        character.useAP(skill.apCost);

        // Apply cooldown
        if (skill.cooldown > 0) {
            this.setCooldown(character.id, skillId, skill.cooldown);
        }

        // Apply skill effects
        const effects = this.applySkillEffects(character, skill, targets);

        console.log(`${character.name} used ${skill.name}`);

        return {
            success: true,
            skill: skill,
            effects: effects,
            targets: targets
        };
    }

    /**
     * Apply skill effects to targets
     * @param {Object} caster - Character casting the skill
     * @param {Object} skill - Skill being used
     * @param {Array} targets - Target characters
     * @returns {Array} Array of effect results
     */
    applySkillEffects(caster, skill, targets) {
        const results = [];

        for (const target of targets) {
            for (const effect of skill.effects) {
                const result = this.applyEffect(caster, target, effect);
                results.push({
                    target: target,
                    effect: effect,
                    result: result
                });
            }
        }

        return results;
    }

    /**
     * Apply a single effect to a target
     * @param {Object} caster - Character casting the effect
     * @param {Object} target - Target of the effect
     * @param {Object} effect - Effect definition
     * @returns {Object} Effect result
     */
    applyEffect(caster, target, effect) {
        switch (effect.type) {
            case 'damage':
                return this.applyDamage(caster, target, effect);

            case 'heal':
                return this.applyHeal(caster, target, effect);

            case 'status':
                return this.applyStatus(target, effect);

            case 'conditional_damage':
                return this.applyConditionalDamage(caster, target, effect);

            case 'multi_attack':
                return this.applyMultiAttack(caster, target, effect);

            case 'instant_kill':
                return this.applyInstantKill(caster, target, effect);

            case 'resurrect':
                return this.applyResurrect(target, effect);

            default:
                console.warn(`Unknown effect type: ${effect.type}`);
                return { type: 'unknown', success: false };
        }
    }

    /**
     * Apply damage effect
     * @param {Object} caster - Character dealing damage
     * @param {Object} target - Target taking damage
     * @param {Object} effect - Damage effect
     * @returns {Object} Damage result
     */
    applyDamage(caster, target, effect) {
        let baseDamage = caster.stats.ATK * effect.value;

        // Apply elemental modifiers (simplified)
        const elementalModifier = this.getElementalModifier(effect.element, target.stats.element);
        baseDamage *= elementalModifier;

        // Apply defense
        const finalDamage = Math.max(1, Math.floor(baseDamage - (target.stats.DEF / 2)));

        // Apply damage variance (±10%)
        const variance = 0.9 + (Math.random() * 0.2);
        let actualDamage = Math.floor(finalDamage * variance);

        // Check for critical hit
        let isCritical = false;
        const critChance = 0.05 + (caster.stats.SPD / 300) + (effect.criticalBonus || 0);
        if (Math.random() < critChance) {
            isCritical = true;
            actualDamage *= 2;
        }

        const died = target.takeDamage(actualDamage);

        return {
            type: 'damage',
            damage: actualDamage,
            element: effect.element,
            critical: isCritical,
            died: died
        };
    }

    /**
     * Apply healing effect
     * @param {Object} caster - Character casting heal
     * @param {Object} target - Target being healed
     * @param {Object} effect - Heal effect
     * @returns {Object} Heal result
     */
    applyHeal(caster, target, effect) {
        let healAmount;

        if (effect.scaling === 'percentage') {
            healAmount = Math.floor(target.maxHP * effect.value);
        } else {
            healAmount = effect.value;
        }

        const actualHealing = target.heal(healAmount);

        return {
            type: 'heal',
            amount: actualHealing,
            target: target
        };
    }

    /**
     * Apply status effect
     * @param {Object} target - Target receiving status
     * @param {Object} effect - Status effect
     * @returns {Object} Status result
     */
    applyStatus(target, effect) {
        // Add status effect to target
        const statusEffect = {
            type: effect.statusType,
            duration: effect.duration,
            value: effect.value,
            source: 'skill'
        };

        target.statusEffects.push(statusEffect);

        return {
            type: 'status',
            statusType: effect.statusType,
            duration: effect.duration,
            applied: true
        };
    }

    /**
     * Apply conditional damage (like Execute)
     * @param {Object} caster - Character dealing damage
     * @param {Object} target - Target taking damage
     * @param {Object} effect - Conditional damage effect
     * @returns {Object} Damage result
     */
    applyConditionalDamage(caster, target, effect) {
        let damageMultiplier = effect.fallbackValue || 1.0;

        if (effect.condition === 'low_hp') {
            const hpPercentage = target.getHPPercentage();
            if (hpPercentage <= effect.threshold) {
                damageMultiplier = effect.value;
            }
        }

        const modifiedEffect = { ...effect, value: damageMultiplier };
        return this.applyDamage(caster, target, modifiedEffect);
    }

    /**
     * Apply multi-attack effect
     * @param {Object} caster - Character attacking
     * @param {Object} target - Target being attacked
     * @param {Object} effect - Multi-attack effect
     * @returns {Object} Multi-attack result
     */
    applyMultiAttack(caster, target, effect) {
        const results = [];
        let totalDamage = 0;

        for (let i = 0; i < effect.attacks; i++) {
            if (target.isAlive()) {
                const attackEffect = {
                    type: 'damage',
                    value: effect.damagePerAttack,
                    element: effect.element
                };

                const result = this.applyDamage(caster, target, attackEffect);
                results.push(result);
                totalDamage += result.damage;
            }
        }

        return {
            type: 'multi_attack',
            attacks: results,
            totalDamage: totalDamage,
            hits: results.length
        };
    }

    /**
     * Apply instant kill effect
     * @param {Object} caster - Character attempting kill
     * @param {Object} target - Target for instant kill
     * @param {Object} effect - Instant kill effect
     * @returns {Object} Kill result
     */
    applyInstantKill(caster, target, effect) {
        let instantKill = false;

        if (effect.condition === 'low_hp') {
            const hpPercentage = target.getHPPercentage();
            if (hpPercentage <= effect.threshold) {
                target.takeDamage(target.currentHP); // Kill instantly
                instantKill = true;
            }
        }

        if (!instantKill && effect.fallbackDamage) {
            const fallbackEffect = {
                type: 'damage',
                value: effect.fallbackDamage,
                element: 'Physical'
            };
            return this.applyDamage(caster, target, fallbackEffect);
        }

        return {
            type: 'instant_kill',
            success: instantKill,
            target: target
        };
    }

    /**
     * Apply resurrect effect
     * @param {Object} target - Target to resurrect
     * @param {Object} effect - Resurrect effect
     * @returns {Object} Resurrect result
     */
    applyResurrect(target, effect) {
        if (target.isDead()) {
            const reviveHP = Math.floor(target.maxHP * effect.value);
            target.currentHP = reviveHP;

            return {
                type: 'resurrect',
                success: true,
                hp: reviveHP
            };
        }

        return {
            type: 'resurrect',
            success: false,
            reason: 'Target not dead'
        };
    }

    /**
     * Get elemental damage modifier
     * @param {string} attackElement - Attacking element
     * @param {string} defenseElement - Defending element
     * @returns {number} Damage modifier
     */
    getElementalModifier(attackElement, defenseElement) {
        const modifiers = {
            'Fire': { 'Ice': 1.5, 'Fire': 0.5 },
            'Ice': { 'Fire': 1.5, 'Ice': 0.5 },
            'Lightning': { 'Physical': 1.2 },
            'Physical': { 'Lightning': 0.8 }
        };

        return modifiers[attackElement]?.[defenseElement] || 1.0;
    }

    /**
     * Set skill cooldown
     * @param {string} characterId - Character ID
     * @param {string} skillId - Skill ID
     * @param {number} turns - Cooldown duration in turns
     */
    setCooldown(characterId, skillId, turns) {
        if (!this.cooldowns.has(characterId)) {
            this.cooldowns.set(characterId, new Map());
        }

        this.cooldowns.get(characterId).set(skillId, turns);
    }

    /**
     * Check if skill is on cooldown
     * @param {string} characterId - Character ID
     * @param {string} skillId - Skill ID
     * @returns {boolean} True if on cooldown
     */
    isOnCooldown(characterId, skillId) {
        const characterCooldowns = this.cooldowns.get(characterId);
        if (!characterCooldowns) return false;

        const remaining = characterCooldowns.get(skillId);
        return remaining && remaining > 0;
    }

    /**
     * Get remaining cooldown turns
     * @param {string} characterId - Character ID
     * @param {string} skillId - Skill ID
     * @returns {number} Remaining turns
     */
    getCooldownRemaining(characterId, skillId) {
        const characterCooldowns = this.cooldowns.get(characterId);
        if (!characterCooldowns) return 0;

        return characterCooldowns.get(skillId) || 0;
    }

    /**
     * Reduce all cooldowns by 1 turn (call at end of character's turn)
     * @param {string} characterId - Character ID
     */
    reduceCooldowns(characterId) {
        const characterCooldowns = this.cooldowns.get(characterId);
        if (!characterCooldowns) return;

        for (const [skillId, remaining] of characterCooldowns.entries()) {
            if (remaining > 0) {
                characterCooldowns.set(skillId, remaining - 1);
            }
        }
    }

    /**
     * Clear all cooldowns for a character
     * @param {string} characterId - Character ID
     */
    clearCooldowns(characterId) {
        this.cooldowns.delete(characterId);
    }

    /**
     * Get all available skills for a character
     * @param {Object} character - Character object
     * @returns {Array} Array of usable skills
     */
    getAvailableSkills(character) {
        const availableSkills = [];

        for (const skillId of character.unlockedSkills) {
            const skill = this.getSkill(skillId);
            const canUse = this.canUseSkill(character, skillId);

            availableSkills.push({
                skill: skill,
                canUse: canUse.canUse,
                reason: canUse.reason,
                cooldownRemaining: this.getCooldownRemaining(character.id, skillId)
            });
        }

        return availableSkills;
    }

    /**
     * Get skill progression for a character class
     * @param {string} characterClass - Character class
     * @returns {Array} Array of skill progression data
     */
    getSkillProgression(characterClass) {
        const progressions = {
            'warrior': [
                { level: 1, skillId: 'power_strike', name: 'Power Strike' },
                { level: 3, skillId: 'taunt', name: 'Taunt' },
                { level: 5, skillId: 'cleave', name: 'Cleave' },
                { level: 7, skillId: 'iron_will', name: 'Iron Will' },
                { level: 10, skillId: 'execute', name: 'Execute' }
            ],
            'rogue': [
                { level: 1, skillId: 'backstab', name: 'Backstab' },
                { level: 3, skillId: 'poison_blade', name: 'Poison Blade' },
                { level: 5, skillId: 'evasion', name: 'Evasion' },
                { level: 7, skillId: 'multi_strike', name: 'Multi Strike' },
                { level: 10, skillId: 'assassinate', name: 'Assassinate' }
            ],
            'mage': [
                { level: 1, skillId: 'fireball', name: 'Fireball' },
                { level: 3, skillId: 'ice_shard', name: 'Ice Shard' },
                { level: 5, skillId: 'lightning_storm', name: 'Lightning Storm' },
                { level: 7, skillId: 'mana_shield', name: 'Mana Shield' },
                { level: 10, skillId: 'meteor', name: 'Meteor' }
            ],
            'cleric': [
                { level: 1, skillId: 'heal', name: 'Heal' },
                { level: 3, skillId: 'bless', name: 'Bless' },
                { level: 5, skillId: 'mass_heal', name: 'Mass Heal' },
                { level: 7, skillId: 'resurrect', name: 'Resurrect' },
                { level: 10, skillId: 'divine_shield', name: 'Divine Shield' }
            ]
        };

        return progressions[characterClass.toLowerCase()] || [];
    }
}