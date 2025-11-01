# Dungeon Crawler Game - Balance Documentation

## Overview

This document provides comprehensive balance documentation for the Dungeon Crawler Game Phase 2 implementation. It covers all formulas, stats, progression systems, and balance decisions made during development.

## Table of Contents

1. [Character System Balance](#character-system-balance)
2. [Combat System Balance](#combat-system-balance)
3. [Progression System](#progression-system)
4. [Equipment and Items](#equipment-and-items)
5. [Enemy Design](#enemy-design)
6. [Resource Economy](#resource-economy)
7. [Difficulty Scaling](#difficulty-scaling)
8. [Performance Targets](#performance-targets)

## Character System Balance

### Base Stats by Class

| Class   | HP  | ATK | DEF | SPD | Element  | Role              |
|---------|-----|-----|-----|-----|----------|-------------------|
| Warrior | 60  | 12  | 10  | 5   | Physical | Tank/Melee DPS    |
| Rogue   | 45  | 10  | 6   | 12  | Physical | DPS/Critical      |
| Mage    | 35  | 8   | 5   | 8   | Fire     | AoE/Elemental     |
| Cleric  | 50  | 7   | 8   | 6   | Physical | Healer/Support    |

### Stat Growth per Level

| Class   | HP/Level | ATK/Level | DEF/Level | SPD/Level |
|---------|----------|-----------|-----------|-----------|
| Warrior | +12      | +2        | +2        | +1        |
| Rogue   | +9       | +2        | +1        | +2        |
| Mage    | +7       | +3        | +1        | +1        |
| Cleric  | +10      | +1        | +2        | +1        |

### Experience Formula

**Level Progression Formula:** `XP_needed = 50 × Level²`

**Experience Requirements by Level:**
- Level 1 → 2: 200 XP
- Level 2 → 3: 450 XP  
- Level 3 → 4: 800 XP
- Level 4 → 5: 1,250 XP
- Level 5 → 6: 1,800 XP
- Level 10 → 11: 6,050 XP

**Design Rationale:** Exponential curve ensures meaningful progression while preventing rapid power spikes. Target: 30-45 minutes per level through normal gameplay.

## Combat System Balance

### Action Point (AP) System

**Base AP per Turn:** 3 AP per character

**AP Costs by Action Type:**
- Basic Attack: 1 AP
- Defend: 1 AP
- Use Item: 1 AP
- Flee: 2 AP
- Basic Skills: 2 AP
- Advanced Skills: 3 AP
- Ultimate Skills: 4 AP

### Damage Calculation Formula

**Base Damage Formula:**
```
Damage = (ATK × Skill_Multiplier) - (DEF ÷ 2)
Final_Damage = Base_Damage × Variance × Elemental_Modifier
```

**Variance:** ±10% (0.9 to 1.1 multiplier)

**Critical Hit System:**
- Base Critical Chance: 5%
- Speed Bonus: +SPD/30%
- Critical Damage: 2.0x multiplier

### Elemental Damage Modifiers

| Attacker → Defender | Modifier |
|-------------------|----------|
| Fire → Ice        | 1.5x     |
| Ice → Fire        | 1.5x     |
| Lightning → Physical | 1.2x   |
| Physical → Lightning | 0.8x   |
| Same Element      | 0.5x     |

### Combat Duration Targets

| Encounter Type | Target Duration | HP Multiplier | ATK Multiplier |
|---------------|----------------|---------------|----------------|
| Random        | 2-4 minutes    | 1.0x          | 1.0x           |
| Mini-Boss     | 4-6 minutes    | 2.5x          | 1.3x           |
| Boss          | 8-12 minutes   | 4.0x          | 1.5x           |

## Progression System

### Skill Unlock Schedule

#### Warrior Skills
- Level 1: Power Strike (150% damage, 2 AP)
- Level 3: Taunt (Force enemy targeting, 1 AP, 3 turn cooldown)
- Level 5: Cleave (120% AoE front row, 3 AP, 3 turn cooldown)
- Level 7: Iron Will (50% DEF boost, 2 AP, 4 turn cooldown)
- Level 10: Execute (300% damage if enemy <25% HP, 4 AP, 5 turn cooldown)

#### Rogue Skills
- Level 1: Backstab (200% damage, +30% crit, 2 AP)
- Level 3: Poison Blade (Poison 3 turns, 10 dmg/turn, 1 AP, 2 turn cooldown)
- Level 5: Evasion (100% SPD boost, 2 AP, 4 turn cooldown)
- Level 7: Multi Strike (3 attacks × 60% damage, 3 AP, 3 turn cooldown)
- Level 10: Assassinate (Instant kill if <15% HP, 3 AP, 6 turn cooldown)

#### Mage Skills
- Level 1: Fireball (150% Fire damage, 2 AP)
- Level 3: Ice Shard (120% Ice damage + slow, 2 AP, 1 turn cooldown)
- Level 5: Lightning Storm (100% Lightning AoE, 3 AP, 3 turn cooldown)
- Level 7: Mana Shield (Absorb 3 attacks, 2 AP, 5 turn cooldown)
- Level 10: Meteor (250% Fire AoE, 4 AP, 6 turn cooldown)

#### Cleric Skills
- Level 1: Heal (50% HP restore, 2 AP)
- Level 3: Bless (30% ATK boost 4 turns, 2 AP, 2 turn cooldown)
- Level 5: Mass Heal (30% HP restore all allies, 3 AP, 4 turn cooldown)
- Level 7: Resurrect (Revive with 25% HP, 3 AP, 8 turn cooldown)
- Level 10: Divine Shield (Immunity 2 turns, 3 AP, 7 turn cooldown)

### XP Reward System

**Base XP Formula:** `Base_XP = Enemy_Level × 25`

**Level Difference Modifiers:**
- Enemy 3+ levels below party: 0.5x XP
- Enemy 1-2 levels below party: 0.8x XP
- Equal level: 1.0x XP
- Enemy 1-2 levels above party: 1.3x XP
- Enemy 3+ levels above party: 1.5x XP

**Encounter Type Multipliers:**
- Boss encounters: 2.0x XP
- Mini-boss encounters: 1.5x XP
- Random encounters: 1.0x XP

## Equipment and Items

### Item Rarity System

| Rarity   | Color Code | Stat Bonus | Drop Rate |
|----------|------------|------------|-----------|
| Common   | #FFFFFF    | 1.0x       | 60%       |
| Uncommon | #00FF00    | 1.1x       | 25%       |
| Rare     | #0080FF    | 1.2x       | 12%       |
| Epic     | #8000FF    | 1.35x      | 3%        |

### Equipment Stat Ranges (Level 1 Base)

#### Weapons
- **Swords:** ATK 8-12, DEF 0-2
- **Staves:** ATK 6-10, SPD 1-3
- **Daggers:** ATK 7-9, SPD 2-4
- **Maces:** ATK 9-11, HP 5-15

#### Armor
- **Light Armor:** DEF 3-6, SPD 0-2
- **Heavy Armor:** DEF 6-10, HP 10-20, SPD -1-0
- **Robes:** DEF 2-4, ATK 1-3

#### Accessories
- **Rings:** Any stat +1-4
- **Amulets:** HP +5-15, any other stat +1-2
- **Charms:** Elemental resistance or special effects

### Consumable Items

#### Health Potions
- **Small:** 25 HP, 25 gold
- **Medium:** 60 HP, 60 gold
- **Large:** 120 HP, 120 gold
- **Full:** 100% HP, 200 gold

#### AP Potions
- **AP Potion:** +2 AP, 40 gold

#### Buff Potions
- **Strength Potion:** +5 ATK for 5 turns, 80 gold
- **Defense Potion:** +5 DEF for 5 turns, 80 gold
- **Speed Potion:** +5 SPD for 5 turns, 80 gold

## Enemy Design

### Enemy Tiers and Distribution

**Tier 1 Enemies (Levels 1-3):** 4 types
- Goblin Scout, Giant Rat, Skeleton Warrior, Goblin Shaman

**Tier 2 Enemies (Levels 4-7):** 4 types  
- Orc Warrior, Dire Wolf, Undead Knight, Shadow Beast

**Tier 3 Enemies (Levels 8-11):** 4 types
- Orc Shaman, Lich Lieutenant, Ancient Golem, Shadow General

**Boss Enemies:** 3 types
- Ancient Lich Morteus (Level 11)
- Shadow Lord Malachar (Level 12) 
- Elemental Overlord Pyraxis (Level 13)

### AI Behavior Types

#### Aggressive AI
- **Target Priority:** Lowest HP enemy
- **Behavior:** Always attacks, prefers damage skills
- **Usage:** 40% of enemies

#### Defensive AI  
- **Target Priority:** Protect allies, heal when <50% HP
- **Behavior:** Uses defensive skills, heals allies
- **Usage:** 20% of enemies

#### Tactical AI
- **Target Priority:** Eliminate threats by class priority
- **Behavior:** Uses optimal skill combinations
- **Usage:** 30% of enemies

#### Berserker AI
- **Target Priority:** Random when >50% HP, strongest when <50% HP
- **Behavior:** Damage bonus when low HP, reckless attacks
- **Usage:** 10% of enemies

### Enemy Stat Scaling Formula

**HP Scaling:** `Base_HP + (Level - Base_Level) × 8`
**ATK Scaling:** `Base_ATK + (Level - Base_Level) × 2`
**DEF Scaling:** `Base_DEF + (Level - Base_Level) × 1.5`
**SPD Scaling:** `Base_SPD + (Level - Base_Level) × 1`

## Resource Economy

### Gold Economy Balance

**Enemy Gold Drops:**
- **Base Formula:** `Gold = Enemy_Level × 10`
- **Boss Multiplier:** 3.0x
- **Variance:** ±30%

**Shop Pricing:**
- **Equipment:** Base_Value × 1.5
- **Consumables:** Fixed prices (see consumables table)
- **Sell Value:** 60% of purchase price

### Potion Drop Rates (per enemy defeated)

| Potion Type        | Drop Rate |
|-------------------|-----------|
| Health Potion (S) | 25%       |
| Health Potion (M) | 15%       |
| Health Potion (L) | 8%        |
| AP Potion         | 12%       |
| Buff Potion       | 5%        |

### Resource Usage Targets (per dungeon floor)

| Resource Type     | Target Usage |
|------------------|--------------|
| Health Potions   | 2-3 per floor|
| AP Potions       | 1-2 per floor|
| Buff Potions     | 0-1 per floor|

## Difficulty Scaling

### Floor-Based Progression

**Base Level Formula:** `Floor_Level = 1 + (Floor - 1) × 2`

**Enemy Level Modifiers:**
- Regular enemies: Floor level ±1
- Elite enemies: Floor level +1
- Boss enemies: Floor level +3

### Challenge Rating System

**Power Ratio Thresholds:**
- **Trivial:** 0.3 (30% of party power)
- **Easy:** 0.6 (60% of party power)  
- **Moderate:** 1.0 (Equal to party power)
- **Hard:** 1.4 (140% of party power)
- **Deadly:** 2.0 (200% of party power)

**Target Distribution:**
- 20% Easy encounters
- 60% Moderate encounters  
- 20% Hard encounters

### Encounter Frequency

**Random Encounter Rate:** 15-20% per movement tile
**Encounter Cooldown:** 3 tiles after combat (no encounters)
**Safe Zone Frequency:** Every 15-20 tiles

## Performance Targets

### Combat Performance
- **Frame Rate:** 60 FPS sustained during combat
- **Combat Duration:** 2-12 minutes based on encounter type
- **Turn Processing:** <200ms for AI decisions
- **Animation Speed:** 0.5-2.0 seconds per action

### Save System Performance
- **Save Time:** <500ms for complete game state
- **Load Time:** <1 second for any save file
- **Auto-save Triggers:** Post-combat, level transitions, 5-minute intervals
- **Save File Size:** <1MB compressed

### Memory Usage
- **Target:** <400MB after 2 hours gameplay
- **Leak Prevention:** Object pooling for combat effects
- **Garbage Collection:** Minimize allocations during combat

## Balance Validation Methods

### Automated Testing
- **Combat Duration Validation:** Measure actual vs target combat times
- **Progression Pacing:** Track XP/hour and level progression rates
- **Resource Economy:** Monitor gold income vs expenditure ratios
- **Difficulty Curve:** Validate encounter challenge ratings

### Manual Testing Scenarios
- **New Player Experience:** Level 1-3 progression smoothness
- **Mid-Game Balance:** Level 5-8 challenge and reward balance
- **End-Game Content:** Level 10+ boss encounter difficulty
- **Resource Management:** Potion usage and gold economy sustainability

### Key Performance Indicators (KPIs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Combat Duration | 2-12 min | Average per encounter type |
| Level Progression | 30-45 min/level | Playtime tracking |
| Potion Usage | 2-3/floor | Resource consumption |
| Death Rate | <20% per floor | Player survival statistics |
| Engagement | 2-3 hours | Vertical slice completion |

## Conclusion

This balance documentation provides the foundation for maintaining consistent gameplay experience across all systems. Regular testing and iteration based on player feedback will ensure these balance targets remain optimal for player engagement and satisfaction.

All formulas and values in this document are implemented in the `CombatBalanceConfig.js` system and can be adjusted through configuration updates without code changes.