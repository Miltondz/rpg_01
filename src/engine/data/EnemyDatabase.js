/**
 * EnemyDatabase - Complete enemy roster for Crypt of Shadows
 * Contains 15 enemy types across 3 tiers plus 3 bosses with unique abilities
 */

export class EnemyDatabase {
  constructor() {
    this.enemies = new Map();
    this.initializeEnemyData();
  }

  /**
   * Initialize all enemy data
   */
  initializeEnemyData() {
    // TIER 1 ENEMIES (Levels 1-3)
    this.addEnemy('goblin', {
      name: 'Goblin Scout',
      tier: 1,
      baseLevel: 1,
      baseStats: {
        HP: 25,
        ATK: 8,
        DEF: 4,
        SPD: 7,
        element: 'Physical'
      },
      aiType: 'AGGRESSIVE',
      skills: [
        {
          id: 'quick_strike',
          name: 'Quick Strike',
          type: 'skill',
          apCost: 2,
          targetType: 'single_enemy',
          effects: ['damage'],
          damageMultiplier: 1.2,
          description: 'A fast attack with increased damage'
        }
      ],
      lootTable: {
        gold: { min: 3, max: 8 },
        experience: 15,
        items: [
          { itemId: 'rusty_dagger', chance: 0.1 },
          { itemId: 'health_potion_small', chance: 0.3 }
        ]
      }
    });

    this.addEnemy('giant_rat', {
      name: 'Giant Rat',
      tier: 1,
      baseLevel: 1,
      baseStats: {
        HP: 20,
        ATK: 6,
        DEF: 2,
        SPD: 9,
        element: 'Physical'
      },
      aiType: 'AGGRESSIVE',
      skills: [
        {
          id: 'disease_bite',
          name: 'Disease Bite',
          type: 'skill',
          apCost: 1,
          targetType: 'single_enemy',
          effects: ['damage', 'poison'],
          damageMultiplier: 0.8,
          statusEffect: { type: 'poison', duration: 3, damage: 2 },
          description: 'Bite that inflicts poison damage over time'
        }
      ],
      lootTable: {
        gold: { min: 1, max: 5 },
        experience: 10,
        items: [
          { itemId: 'rat_tail', chance: 0.4 },
          { itemId: 'health_potion_small', chance: 0.2 }
        ]
      }
    });

    this.addEnemy('skeleton', {
      name: 'Skeleton Warrior',
      tier: 1,
      baseLevel: 2,
      baseStats: {
        HP: 30,
        ATK: 10,
        DEF: 6,
        SPD: 5,
        element: 'Undead'
      },
      aiType: 'DEFENSIVE',
      skills: [
        {
          id: 'bone_shield',
          name: 'Bone Shield',
          type: 'skill',
          apCost: 2,
          targetType: 'self',
          effects: ['defense_boost'],
          defenseBonus: 5,
          duration: 3,
          description: 'Increases defense for several turns'
        }
      ],
      resistances: {
        'Physical': 0.8,
        'Fire': 1.2,
        'Ice': 0.9
      },
      lootTable: {
        gold: { min: 5, max: 12 },
        experience: 20,
        items: [
          { itemId: 'bone_fragment', chance: 0.5 },
          { itemId: 'rusty_sword', chance: 0.15 }
        ]
      }
    });

    this.addEnemy('goblin_shaman', {
      name: 'Goblin Shaman',
      tier: 1,
      baseLevel: 3,
      baseStats: {
        HP: 28,
        ATK: 12,
        DEF: 5,
        SPD: 6,
        element: 'Dark'
      },
      aiType: 'TACTICAL',
      skills: [
        {
          id: 'dark_bolt',
          name: 'Dark Bolt',
          type: 'skill',
          apCost: 2,
          targetType: 'single_enemy',
          effects: ['damage'],
          damageMultiplier: 1.5,
          element: 'Dark',
          description: 'Magical dark energy attack'
        },
        {
          id: 'heal_ally',
          name: 'Heal Ally',
          type: 'skill',
          apCost: 2,
          targetType: 'single_ally',
          effects: ['healing'],
          healAmount: 15,
          description: 'Heals a wounded ally'
        }
      ],
      lootTable: {
        gold: { min: 8, max: 15 },
        experience: 30,
        items: [
          { itemId: 'dark_crystal', chance: 0.3 },
          { itemId: 'mana_potion', chance: 0.4 }
        ]
      }
    });

    // TIER 2 ENEMIES (Levels 4-7)
    this.addEnemy('orc', {
      name: 'Orc Warrior',
      tier: 2,
      baseLevel: 4,
      baseStats: {
        HP: 45,
        ATK: 15,
        DEF: 8,
        SPD: 4,
        element: 'Physical'
      },
      aiType: 'BERSERKER',
      skills: [
        {
          id: 'rage_strike',
          name: 'Rage Strike',
          type: 'skill',
          apCost: 3,
          targetType: 'single_enemy',
          effects: ['damage'],
          damageMultiplier: 2.0,
          description: 'Powerful attack that deals massive damage'
        },
        {
          id: 'intimidate',
          name: 'Intimidate',
          type: 'skill',
          apCost: 1,
          targetType: 'all_enemies',
          effects: ['debuff'],
          statusEffect: { type: 'fear', duration: 2, atkReduction: 3 },
          description: 'Reduces enemy attack power'
        }
      ],
      lootTable: {
        gold: { min: 12, max: 25 },
        experience: 40,
        items: [
          { itemId: 'iron_sword', chance: 0.2 },
          { itemId: 'leather_armor', chance: 0.15 }
        ]
      }
    });

    this.addEnemy('dire_wolf', {
      name: 'Dire Wolf',
      tier: 2,
      baseLevel: 4,
      baseStats: {
        HP: 40,
        ATK: 13,
        DEF: 6,
        SPD: 11,
        element: 'Physical'
      },
      aiType: 'AGGRESSIVE',
      skills: [
        {
          id: 'pack_howl',
          name: 'Pack Howl',
          type: 'skill',
          apCost: 2,
          targetType: 'all_allies',
          effects: ['buff'],
          statusEffect: { type: 'pack_bonus', duration: 4, atkBonus: 2, spdBonus: 2 },
          description: 'Boosts all ally stats'
        },
        {
          id: 'savage_bite',
          name: 'Savage Bite',
          type: 'skill',
          apCost: 2,
          targetType: 'single_enemy',
          effects: ['damage', 'bleed'],
          damageMultiplier: 1.4,
          statusEffect: { type: 'bleed', duration: 3, damage: 3 },
          description: 'Bite that causes bleeding'
        }
      ],
      lootTable: {
        gold: { min: 10, max: 20 },
        experience: 35,
        items: [
          { itemId: 'wolf_pelt', chance: 0.6 },
          { itemId: 'fang', chance: 0.4 }
        ]
      }
    });

    this.addEnemy('undead_knight', {
      name: 'Undead Knight',
      tier: 2,
      baseLevel: 6,
      baseStats: {
        HP: 55,
        ATK: 18,
        DEF: 12,
        SPD: 3,
        element: 'Undead'
      },
      aiType: 'DEFENSIVE',
      skills: [
        {
          id: 'death_strike',
          name: 'Death Strike',
          type: 'skill',
          apCost: 3,
          targetType: 'single_enemy',
          effects: ['damage', 'life_drain'],
          damageMultiplier: 1.6,
          lifeDrain: 0.5,
          description: 'Attack that heals the caster'
        },
        {
          id: 'undead_resilience',
          name: 'Undead Resilience',
          type: 'skill',
          apCost: 2,
          targetType: 'self',
          effects: ['defense_boost', 'status_immunity'],
          defenseBonus: 8,
          duration: 4,
          description: 'Greatly increases defense and immunity'
        }
      ],
      resistances: {
        'Physical': 0.7,
        'Dark': 0.5,
        'Light': 1.5
      },
      lootTable: {
        gold: { min: 20, max: 35 },
        experience: 60,
        items: [
          { itemId: 'steel_sword', chance: 0.25 },
          { itemId: 'chain_mail', chance: 0.2 }
        ]
      }
    });

    this.addEnemy('shadow_beast', {
      name: 'Shadow Beast',
      tier: 2,
      baseLevel: 5,
      baseStats: {
        HP: 38,
        ATK: 16,
        DEF: 7,
        SPD: 8,
        element: 'Dark'
      },
      aiType: 'TACTICAL',
      skills: [
        {
          id: 'shadow_step',
          name: 'Shadow Step',
          type: 'skill',
          apCost: 2,
          targetType: 'self',
          effects: ['evasion_boost'],
          evasionBonus: 30,
          duration: 2,
          description: 'Greatly increases evasion'
        },
        {
          id: 'darkness_aura',
          name: 'Darkness Aura',
          type: 'skill',
          apCost: 3,
          targetType: 'all_enemies',
          effects: ['debuff'],
          statusEffect: { type: 'blind', duration: 3, accuracyReduction: 25 },
          description: 'Reduces enemy accuracy'
        }
      ],
      lootTable: {
        gold: { min: 15, max: 28 },
        experience: 45,
        items: [
          { itemId: 'shadow_essence', chance: 0.5 },
          { itemId: 'dark_crystal', chance: 0.3 }
        ]
      }
    });

    // TIER 3 ENEMIES (Levels 8-11)
    this.addEnemy('orc_shaman', {
      name: 'Orc Shaman',
      tier: 3,
      baseLevel: 8,
      baseStats: {
        HP: 50,
        ATK: 20,
        DEF: 10,
        SPD: 6,
        element: 'Fire'
      },
      aiType: 'TACTICAL',
      skills: [
        {
          id: 'fireball',
          name: 'Fireball',
          type: 'skill',
          apCost: 3,
          targetType: 'single_enemy',
          effects: ['damage', 'burn'],
          damageMultiplier: 1.8,
          element: 'Fire',
          statusEffect: { type: 'burn', duration: 3, damage: 4 },
          description: 'Fire magic that burns the target'
        },
        {
          id: 'flame_barrier',
          name: 'Flame Barrier',
          type: 'skill',
          apCost: 2,
          targetType: 'all_allies',
          effects: ['buff', 'reflect'],
          reflectDamage: 5,
          duration: 3,
          description: 'Reflects damage back to attackers'
        }
      ],
      lootTable: {
        gold: { min: 25, max: 45 },
        experience: 80,
        items: [
          { itemId: 'fire_staff', chance: 0.3 },
          { itemId: 'flame_crystal', chance: 0.4 }
        ]
      }
    });

    this.addEnemy('lich_lieutenant', {
      name: 'Lich Lieutenant',
      tier: 3,
      baseLevel: 9,
      baseStats: {
        HP: 65,
        ATK: 25,
        DEF: 15,
        SPD: 7,
        element: 'Dark'
      },
      aiType: 'TACTICAL',
      skills: [
        {
          id: 'drain_life',
          name: 'Drain Life',
          type: 'skill',
          apCost: 3,
          targetType: 'single_enemy',
          effects: ['damage', 'life_drain'],
          damageMultiplier: 1.5,
          lifeDrain: 0.8,
          element: 'Dark',
          description: 'Drains life force from target'
        },
        {
          id: 'bone_prison',
          name: 'Bone Prison',
          type: 'skill',
          apCost: 2,
          targetType: 'single_enemy',
          effects: ['stun'],
          statusEffect: { type: 'stun', duration: 2 },
          description: 'Immobilizes target with bone cage'
        },
        {
          id: 'necromantic_aura',
          name: 'Necromantic Aura',
          type: 'skill',
          apCost: 3,
          targetType: 'all_allies',
          effects: ['buff', 'regeneration'],
          statusEffect: { type: 'regeneration', duration: 5, healPerTurn: 8 },
          description: 'Heals all undead allies over time'
        }
      ],
      resistances: {
        'Physical': 0.6,
        'Dark': 0.3,
        'Light': 1.8,
        'Fire': 0.8
      },
      lootTable: {
        gold: { min: 40, max: 70 },
        experience: 120,
        items: [
          { itemId: 'lich_staff', chance: 0.4 },
          { itemId: 'necromantic_tome', chance: 0.3 }
        ]
      }
    });

    this.addEnemy('ancient_golem', {
      name: 'Ancient Golem',
      tier: 3,
      baseLevel: 10,
      baseStats: {
        HP: 80,
        ATK: 22,
        DEF: 20,
        SPD: 2,
        element: 'Earth'
      },
      aiType: 'DEFENSIVE',
      skills: [
        {
          id: 'earthquake',
          name: 'Earthquake',
          type: 'skill',
          apCost: 3,
          targetType: 'all_enemies',
          effects: ['damage'],
          damageMultiplier: 1.2,
          element: 'Earth',
          description: 'Ground attack that hits all enemies'
        },
        {
          id: 'stone_skin',
          name: 'Stone Skin',
          type: 'skill',
          apCost: 2,
          targetType: 'self',
          effects: ['defense_boost', 'damage_reduction'],
          defenseBonus: 15,
          damageReduction: 0.5,
          duration: 4,
          description: 'Greatly reduces incoming damage'
        },
        {
          id: 'repair',
          name: 'Repair',
          type: 'skill',
          apCost: 2,
          targetType: 'self',
          effects: ['healing'],
          healAmount: 25,
          description: 'Restores golem health'
        }
      ],
      resistances: {
        'Physical': 0.5,
        'Fire': 0.7,
        'Ice': 0.7,
        'Lightning': 1.3
      },
      lootTable: {
        gold: { min: 35, max: 60 },
        experience: 100,
        items: [
          { itemId: 'golem_core', chance: 0.6 },
          { itemId: 'earth_crystal', chance: 0.4 }
        ]
      }
    });

    this.addEnemy('shadow_general', {
      name: 'Shadow General',
      tier: 3,
      baseLevel: 11,
      baseStats: {
        HP: 70,
        ATK: 28,
        DEF: 18,
        SPD: 9,
        element: 'Dark'
      },
      aiType: 'TACTICAL',
      skills: [
        {
          id: 'shadow_command',
          name: 'Shadow Command',
          type: 'skill',
          apCost: 2,
          targetType: 'all_allies',
          effects: ['buff'],
          statusEffect: { type: 'command', duration: 4, atkBonus: 5, spdBonus: 3 },
          description: 'Boosts all ally combat stats'
        },
        {
          id: 'void_strike',
          name: 'Void Strike',
          type: 'skill',
          apCost: 3,
          targetType: 'single_enemy',
          effects: ['damage', 'armor_pierce'],
          damageMultiplier: 2.2,
          element: 'Dark',
          ignoreDefense: 0.7,
          description: 'Pierces through armor defenses'
        },
        {
          id: 'shadow_clone',
          name: 'Shadow Clone',
          type: 'skill',
          apCost: 3,
          targetType: 'self',
          effects: ['summon'],
          summonType: 'shadow_minion',
          summonLevel: 8,
          description: 'Creates a shadow minion ally'
        }
      ],
      lootTable: {
        gold: { min: 50, max: 80 },
        experience: 140,
        items: [
          { itemId: 'shadow_blade', chance: 0.5 },
          { itemId: 'general_insignia', chance: 0.3 }
        ]
      }
    });

    // BOSS ENEMIES
    this.addEnemy('shadow_lord', {
      name: 'Shadow Lord Malachar',
      tier: 'boss',
      baseLevel: 12,
      baseStats: {
        HP: 200,
        ATK: 35,
        DEF: 25,
        SPD: 8,
        element: 'Dark'
      },
      aiType: 'TACTICAL',
      phases: [
        {
          hpThreshold: 1.0,
          skills: ['shadow_wave', 'dark_command', 'void_shield']
        },
        {
          hpThreshold: 0.6,
          skills: ['shadow_wave', 'dark_command', 'void_shield', 'summon_minions']
        },
        {
          hpThreshold: 0.3,
          skills: ['apocalypse', 'shadow_regeneration', 'final_darkness']
        }
      ],
      skills: [
        {
          id: 'shadow_wave',
          name: 'Shadow Wave',
          type: 'skill',
          apCost: 2,
          targetType: 'all_enemies',
          effects: ['damage'],
          damageMultiplier: 1.4,
          element: 'Dark',
          description: 'Dark energy wave hits all enemies'
        },
        {
          id: 'dark_command',
          name: 'Dark Command',
          type: 'skill',
          apCost: 2,
          targetType: 'all_allies',
          effects: ['buff', 'summon'],
          statusEffect: { type: 'dark_blessing', duration: 5, atkBonus: 8 },
          description: 'Empowers all dark allies'
        },
        {
          id: 'void_shield',
          name: 'Void Shield',
          type: 'skill',
          apCost: 3,
          targetType: 'self',
          effects: ['defense_boost', 'reflect'],
          defenseBonus: 20,
          reflectDamage: 10,
          duration: 3,
          description: 'Creates protective void barrier'
        },
        {
          id: 'summon_minions',
          name: 'Summon Shadow Minions',
          type: 'skill',
          apCost: 3,
          targetType: 'battlefield',
          effects: ['summon'],
          summonCount: 2,
          summonType: 'shadow_minion',
          summonLevel: 8,
          description: 'Calls forth shadow minions'
        },
        {
          id: 'apocalypse',
          name: 'Shadow Apocalypse',
          type: 'skill',
          apCost: 3,
          targetType: 'all_enemies',
          effects: ['damage', 'debuff'],
          damageMultiplier: 2.0,
          element: 'Dark',
          statusEffect: { type: 'doom', duration: 3, damagePerTurn: 15 },
          description: 'Ultimate dark magic attack'
        },
        {
          id: 'shadow_regeneration',
          name: 'Shadow Regeneration',
          type: 'skill',
          apCost: 2,
          targetType: 'self',
          effects: ['healing'],
          healAmount: 40,
          description: 'Regenerates health from darkness'
        },
        {
          id: 'final_darkness',
          name: 'Final Darkness',
          type: 'skill',
          apCost: 3,
          targetType: 'single_enemy',
          effects: ['damage', 'instant_death'],
          damageMultiplier: 3.0,
          element: 'Dark',
          instantDeathChance: 0.15,
          description: 'Devastating single-target attack'
        }
      ],
      resistances: {
        'Physical': 0.4,
        'Dark': 0.2,
        'Light': 2.0,
        'Fire': 0.6,
        'Ice': 0.6
      },
      lootTable: {
        gold: { min: 200, max: 300 },
        experience: 500,
        items: [
          { itemId: 'shadow_crown', chance: 1.0 },
          { itemId: 'legendary_weapon', chance: 0.8 },
          { itemId: 'shadow_essence_pure', chance: 0.9 }
        ]
      }
    });

    // Third boss - Elemental Overlord
    this.addEnemy('elemental_overlord', {
      name: 'Elemental Overlord Pyraxis',
      tier: 'boss',
      baseLevel: 13,
      baseStats: {
        HP: 250,
        ATK: 40,
        DEF: 30,
        SPD: 10,
        element: 'Fire'
      },
      aiType: 'TACTICAL',
      phases: [
        {
          hpThreshold: 1.0,
          skills: ['flame_burst', 'elemental_shield', 'fire_tornado']
        },
        {
          hpThreshold: 0.7,
          skills: ['flame_burst', 'elemental_shield', 'fire_tornado', 'elemental_shift', 'ice_storm']
        },
        {
          hpThreshold: 0.4,
          skills: ['elemental_chaos', 'lightning_storm', 'absolute_zero', 'elemental_fury']
        },
        {
          hpThreshold: 0.2,
          skills: ['elemental_apocalypse', 'primal_restoration', 'reality_tear']
        }
      ],
      skills: [
        {
          id: 'flame_burst',
          name: 'Flame Burst',
          type: 'skill',
          apCost: 2,
          targetType: 'all_enemies',
          effects: ['damage', 'burn'],
          damageMultiplier: 1.3,
          element: 'Fire',
          statusEffect: { type: 'burn', duration: 3, damage: 6 },
          description: 'Explosive fire damage to all enemies'
        },
        {
          id: 'elemental_shield',
          name: 'Elemental Shield',
          type: 'skill',
          apCost: 2,
          targetType: 'self',
          effects: ['defense_boost', 'elemental_immunity'],
          defenseBonus: 25,
          elementalImmunity: ['Fire', 'Ice', 'Lightning'],
          duration: 4,
          description: 'Becomes immune to elemental damage'
        },
        {
          id: 'fire_tornado',
          name: 'Fire Tornado',
          type: 'skill',
          apCost: 3,
          targetType: 'single_enemy',
          effects: ['damage', 'knockback'],
          damageMultiplier: 2.8,
          element: 'Fire',
          knockbackChance: 0.8,
          description: 'Devastating fire attack with knockback'
        },
        {
          id: 'elemental_shift',
          name: 'Elemental Shift',
          type: 'skill',
          apCost: 2,
          targetType: 'self',
          effects: ['transformation'],
          elementChange: 'Ice',
          statBonus: { ATK: 5, SPD: 3 },
          newResistances: { 'Fire': 2.0, 'Ice': 0.1, 'Lightning': 0.8 },
          description: 'Shifts to ice element with new abilities'
        },
        {
          id: 'ice_storm',
          name: 'Ice Storm',
          type: 'skill',
          apCost: 3,
          targetType: 'all_enemies',
          effects: ['damage', 'freeze'],
          damageMultiplier: 1.5,
          element: 'Ice',
          statusEffect: { type: 'freeze', duration: 2, skipTurn: true },
          description: 'Freezing storm that may skip enemy turns'
        },
        {
          id: 'elemental_chaos',
          name: 'Elemental Chaos',
          type: 'skill',
          apCost: 3,
          targetType: 'all_enemies',
          effects: ['damage', 'random_element'],
          damageMultiplier: 1.8,
          randomElements: ['Fire', 'Ice', 'Lightning'],
          statusEffects: [
            { type: 'burn', duration: 2, damage: 4 },
            { type: 'freeze', duration: 1, skipTurn: false },
            { type: 'shock', duration: 3, spdReduction: 5 }
          ],
          description: 'Random elemental attacks with various effects'
        },
        {
          id: 'lightning_storm',
          name: 'Lightning Storm',
          type: 'skill',
          apCost: 3,
          targetType: 'all_enemies',
          effects: ['damage', 'paralysis'],
          damageMultiplier: 1.6,
          element: 'Lightning',
          statusEffect: { type: 'paralysis', duration: 2, accuracyReduction: 50 },
          description: 'Lightning that reduces accuracy and speed'
        },
        {
          id: 'absolute_zero',
          name: 'Absolute Zero',
          type: 'skill',
          apCost: 3,
          targetType: 'single_enemy',
          effects: ['damage', 'instant_freeze'],
          damageMultiplier: 3.5,
          element: 'Ice',
          instantFreezeChance: 0.25,
          description: 'Ultimate ice attack with freeze chance'
        },
        {
          id: 'elemental_fury',
          name: 'Elemental Fury',
          type: 'skill',
          apCost: 2,
          targetType: 'self',
          effects: ['rage', 'multi_element'],
          atkBonus: 15,
          spdBonus: 8,
          multiElementAttacks: true,
          duration: 5,
          description: 'Enters berserk state with multi-element attacks'
        },
        {
          id: 'elemental_apocalypse',
          name: 'Elemental Apocalypse',
          type: 'skill',
          apCost: 3,
          targetType: 'all_enemies',
          effects: ['damage', 'ultimate'],
          damageMultiplier: 2.5,
          elements: ['Fire', 'Ice', 'Lightning'],
          statusEffect: { type: 'elemental_doom', duration: 4, damagePerTurn: 20 },
          description: 'Ultimate attack combining all elements'
        },
        {
          id: 'primal_restoration',
          name: 'Primal Restoration',
          type: 'skill',
          apCost: 2,
          targetType: 'self',
          effects: ['healing', 'cleanse'],
          healAmount: 60,
          cleansesAllDebuffs: true,
          description: 'Massive healing and removes all debuffs'
        },
        {
          id: 'reality_tear',
          name: 'Reality Tear',
          type: 'skill',
          apCost: 3,
          targetType: 'single_enemy',
          effects: ['damage', 'reality_damage'],
          damageMultiplier: 4.0,
          element: 'Void',
          ignoreAllDefenses: true,
          realityDamageChance: 0.3,
          description: 'Tears through reality itself, ignoring all defenses'
        }
      ],
      resistances: {
        'Physical': 0.3,
        'Fire': 0.1,
        'Ice': 0.8,
        'Lightning': 0.6,
        'Dark': 0.7,
        'Light': 1.2
      },
      lootTable: {
        gold: { min: 300, max: 500 },
        experience: 800,
        items: [
          { itemId: 'elemental_core', chance: 1.0 },
          { itemId: 'overlord_crown', chance: 1.0 },
          { itemId: 'primal_essence', chance: 0.9 },
          { itemId: 'legendary_staff', chance: 0.8 },
          { itemId: 'elemental_orb', chance: 0.7 }
        ]
      }
    });

    // Additional mini-boss for variety
    this.addEnemy('ancient_lich', {
      name: 'Ancient Lich Morteus',
      tier: 'boss',
      baseLevel: 11,
      baseStats: {
        HP: 150,
        ATK: 30,
        DEF: 20,
        SPD: 6,
        element: 'Dark'
      },
      aiType: 'TACTICAL',
      phases: [
        {
          hpThreshold: 1.0,
          skills: ['death_ray', 'bone_armor', 'life_drain_aura']
        },
        {
          hpThreshold: 0.5,
          skills: ['death_ray', 'bone_armor', 'life_drain_aura', 'raise_undead', 'lich_form']
        }
      ],
      skills: [
        {
          id: 'death_ray',
          name: 'Death Ray',
          type: 'skill',
          apCost: 3,
          targetType: 'single_enemy',
          effects: ['damage', 'life_drain'],
          damageMultiplier: 2.5,
          element: 'Dark',
          lifeDrain: 1.0,
          description: 'Powerful death magic that heals the lich'
        },
        {
          id: 'bone_armor',
          name: 'Bone Armor',
          type: 'skill',
          apCost: 2,
          targetType: 'self',
          effects: ['defense_boost', 'damage_reduction'],
          defenseBonus: 15,
          damageReduction: 0.3,
          duration: 4,
          description: 'Surrounds lich with protective bones'
        },
        {
          id: 'life_drain_aura',
          name: 'Life Drain Aura',
          type: 'skill',
          apCost: 2,
          targetType: 'all_enemies',
          effects: ['damage', 'life_drain'],
          damageMultiplier: 0.8,
          element: 'Dark',
          lifeDrain: 0.5,
          description: 'Drains life from all enemies'
        },
        {
          id: 'raise_undead',
          name: 'Raise Undead',
          type: 'skill',
          apCost: 3,
          targetType: 'battlefield',
          effects: ['summon'],
          summonCount: 3,
          summonType: 'skeleton',
          summonLevel: 6,
          description: 'Raises skeleton warriors'
        },
        {
          id: 'lich_form',
          name: 'True Lich Form',
          type: 'skill',
          apCost: 3,
          targetType: 'self',
          effects: ['transformation'],
          atkBonus: 10,
          spdBonus: 4,
          newSkills: ['soul_burn', 'death_nova'],
          duration: 999,
          description: 'Transforms into true lich form'
        }
      ],
      resistances: {
        'Physical': 0.3,
        'Dark': 0.1,
        'Light': 2.5,
        'Fire': 0.5,
        'Ice': 0.4
      },
      lootTable: {
        gold: { min: 150, max: 250 },
        experience: 300,
        items: [
          { itemId: 'lich_phylactery', chance: 1.0 },
          { itemId: 'staff_of_death', chance: 0.7 },
          { itemId: 'necromantic_robes', chance: 0.6 }
        ]
      }
    });

    console.log('EnemyDatabase initialized with', this.enemies.size, 'enemy types');
  }

  /**
   * Add enemy to database
   * @param {string} id - Enemy type ID
   * @param {Object} data - Enemy data
   */
  addEnemy(id, data) {
    this.enemies.set(id, {
      id: id,
      ...data,
      createdAt: Date.now()
    });
  }

  /**
   * Get enemy data by ID
   * @param {string} enemyId - Enemy type ID
   * @returns {Object|null} Enemy data or null
   */
  getEnemy(enemyId) {
    return this.enemies.get(enemyId) || null;
  }

  /**
   * Get enemies by tier
   * @param {number|string} tier - Tier number (1, 2, 3) or 'boss'
   * @returns {Array} Array of enemy data
   */
  getEnemiesByTier(tier) {
    const enemies = [];
    for (const [id, data] of this.enemies) {
      if (data.tier === tier) {
        enemies.push({ id, ...data });
      }
    }
    return enemies;
  }

  /**
   * Get random enemy from tier
   * @param {number|string} tier - Tier to select from
   * @returns {Object|null} Random enemy data
   */
  getRandomEnemyFromTier(tier) {
    const tierEnemies = this.getEnemiesByTier(tier);
    if (tierEnemies.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * tierEnemies.length);
    return tierEnemies[randomIndex];
  }

  /**
   * Get enemies by level range
   * @param {number} minLevel - Minimum level
   * @param {number} maxLevel - Maximum level
   * @returns {Array} Array of suitable enemies
   */
  getEnemiesByLevelRange(minLevel, maxLevel) {
    const enemies = [];
    for (const [id, data] of this.enemies) {
      if (data.baseLevel >= minLevel && data.baseLevel <= maxLevel) {
        enemies.push({ id, ...data });
      }
    }
    return enemies;
  }

  /**
   * Create enemy encounter group
   * @param {string} encounterType - Type of encounter
   * @param {number} partyLevel - Average party level
   * @returns {Array} Array of enemy configurations
   */
  createEncounterGroup(encounterType, partyLevel) {
    const encounters = {
      'easy': () => this.createEasyEncounter(partyLevel),
      'normal': () => this.createNormalEncounter(partyLevel),
      'hard': () => this.createHardEncounter(partyLevel),
      'boss': () => this.createBossEncounter(partyLevel),
      'mini_boss': () => this.createMiniBossEncounter(partyLevel)
    };

    const createFunction = encounters[encounterType];
    if (!createFunction) {
      console.warn('Unknown encounter type:', encounterType);
      return this.createNormalEncounter(partyLevel);
    }

    return createFunction();
  }

  /**
   * Create easy encounter (1-2 enemies, level -1 to +0)
   */
  createEasyEncounter(partyLevel) {
    const enemyLevel = Math.max(1, partyLevel - 1 + Math.floor(Math.random() * 2));
    const suitableEnemies = this.getEnemiesByLevelRange(enemyLevel - 1, enemyLevel + 1);
    
    if (suitableEnemies.length === 0) {
      return [{ type: 'goblin', level: enemyLevel }];
    }

    const enemyCount = Math.random() < 0.7 ? 1 : 2;
    const enemies = [];

    for (let i = 0; i < enemyCount; i++) {
      const randomEnemy = suitableEnemies[Math.floor(Math.random() * suitableEnemies.length)];
      enemies.push({
        type: randomEnemy.id,
        level: enemyLevel + Math.floor(Math.random() * 2)
      });
    }

    return enemies;
  }

  /**
   * Create normal encounter (2-3 enemies, level -0 to +1)
   */
  createNormalEncounter(partyLevel) {
    const enemyLevel = partyLevel + Math.floor(Math.random() * 2);
    const suitableEnemies = this.getEnemiesByLevelRange(enemyLevel - 1, enemyLevel + 1);
    
    if (suitableEnemies.length === 0) {
      return [{ type: 'goblin', level: enemyLevel }];
    }

    const enemyCount = 2 + Math.floor(Math.random() * 2); // 2-3 enemies
    const enemies = [];

    for (let i = 0; i < enemyCount; i++) {
      const randomEnemy = suitableEnemies[Math.floor(Math.random() * suitableEnemies.length)];
      enemies.push({
        type: randomEnemy.id,
        level: enemyLevel + Math.floor(Math.random() * 2) - 1
      });
    }

    return enemies;
  }

  /**
   * Create hard encounter (3-4 enemies, level +0 to +2)
   */
  createHardEncounter(partyLevel) {
    const enemyLevel = partyLevel + 1 + Math.floor(Math.random() * 2);
    const suitableEnemies = this.getEnemiesByLevelRange(enemyLevel - 1, enemyLevel + 1);
    
    if (suitableEnemies.length === 0) {
      return [{ type: 'orc', level: enemyLevel }];
    }

    const enemyCount = 3 + Math.floor(Math.random() * 2); // 3-4 enemies
    const enemies = [];

    for (let i = 0; i < enemyCount; i++) {
      const randomEnemy = suitableEnemies[Math.floor(Math.random() * suitableEnemies.length)];
      enemies.push({
        type: randomEnemy.id,
        level: enemyLevel + Math.floor(Math.random() * 2)
      });
    }

    return enemies;
  }

  /**
   * Create mini-boss encounter
   */
  createMiniBossEncounter(partyLevel) {
    const bossLevel = partyLevel + 2;
    const tier3Enemies = this.getEnemiesByTier(3);
    
    if (tier3Enemies.length === 0) {
      return [{ type: 'ancient_lich', level: bossLevel }];
    }

    const randomBoss = tier3Enemies[Math.floor(Math.random() * tier3Enemies.length)];
    const enemies = [{ type: randomBoss.id, level: bossLevel }];

    // 50% chance to add minions
    if (Math.random() < 0.5) {
      const minionCount = 1 + Math.floor(Math.random() * 2);
      const tier2Enemies = this.getEnemiesByTier(2);
      
      for (let i = 0; i < minionCount; i++) {
        if (tier2Enemies.length > 0) {
          const randomMinion = tier2Enemies[Math.floor(Math.random() * tier2Enemies.length)];
          enemies.push({
            type: randomMinion.id,
            level: Math.max(1, bossLevel - 2)
          });
        }
      }
    }

    return enemies;
  }

  /**
   * Create boss encounter
   */
  createBossEncounter(partyLevel) {
    const bossEnemies = this.getEnemiesByTier('boss');
    
    if (bossEnemies.length === 0) {
      return [{ type: 'shadow_lord', level: partyLevel + 3 }];
    }

    // Select appropriate boss based on party level
    let selectedBoss;
    if (partyLevel >= 13) {
      selectedBoss = this.getEnemy('elemental_overlord');
    } else if (partyLevel >= 12) {
      selectedBoss = this.getEnemy('shadow_lord');
    } else if (partyLevel >= 10) {
      selectedBoss = this.getEnemy('ancient_lich');
    } else {
      // Scale down boss for lower levels
      selectedBoss = bossEnemies[Math.floor(Math.random() * bossEnemies.length)];
    }

    return [{
      type: selectedBoss.id,
      level: Math.max(selectedBoss.baseLevel, partyLevel + 2)
    }];
  }

  /**
   * Get all enemy IDs
   * @returns {Array} Array of enemy IDs
   */
  getAllEnemyIds() {
    return Array.from(this.enemies.keys());
  }

  /**
   * Get enemy count by tier
   * @returns {Object} Count by tier
   */
  getEnemyCountByTier() {
    const counts = { 1: 0, 2: 0, 3: 0, boss: 0 };
    
    for (const [id, data] of this.enemies) {
      counts[data.tier] = (counts[data.tier] || 0) + 1;
    }
    
    return counts;
  }

  /**
   * Validate enemy database completeness
   * @returns {Object} Validation results
   */
  validateDatabase() {
    const counts = this.getEnemyCountByTier();
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      summary: counts
    };

    // Check tier requirements (4 enemies per tier + bosses)
    if (counts[1] < 4) {
      validation.errors.push(`Tier 1 needs ${4 - counts[1]} more enemies`);
      validation.isValid = false;
    }
    
    if (counts[2] < 4) {
      validation.errors.push(`Tier 2 needs ${4 - counts[2]} more enemies`);
      validation.isValid = false;
    }
    
    if (counts[3] < 4) {
      validation.errors.push(`Tier 3 needs ${4 - counts[3]} more enemies`);
      validation.isValid = false;
    }
    
    if (counts.boss < 3) {
      validation.errors.push(`Need ${3 - counts.boss} more boss enemies`);
      validation.isValid = false;
    }

    // Check for missing required fields
    for (const [id, data] of this.enemies) {
      if (!data.name || !data.baseStats || !data.aiType) {
        validation.errors.push(`Enemy ${id} missing required fields`);
        validation.isValid = false;
      }
    }

    return validation;
  }
}

// Create and export singleton instance
export const enemyDatabase = new EnemyDatabase();