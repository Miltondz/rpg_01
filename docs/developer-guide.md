# Dungeon Crawler Game - Developer Guide

## Overview

This guide provides comprehensive instructions for developers working on the Dungeon Crawler Game. It covers system architecture, adding new content, and extending existing functionality.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Adding New Content](#adding-new-content)
3. [Extending Systems](#extending-systems)
4. [Testing Guidelines](#testing-guidelines)
5. [Performance Considerations](#performance-considerations)
6. [Code Standards](#code-standards)

## System Architecture

### Core Systems Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Game Engine Architecture                  │
├─────────────────────────────────────────────────────────────┤
│  Character System  │  Combat System   │  Inventory System   │
│  - Character.js    │  - CombatSystem  │  - InventorySystem  │
│  - SkillSystem.js  │  - EnemyAI.js    │  - ItemDatabase.js  │
│  - Party.js        │  - Enemy.js      │  - Equipment.js     │
├─────────────────────────────────────────────────────────────┤
│  Game Loop Manager │  Save System     │  Balance System     │
│  - GameLoop.js     │  - SaveSystem.js │  - BalanceConfig.js │
│  - Encounter.js    │  - Serializer.js │  - Tuning.js        │
├─────────────────────────────────────────────────────────────┤
│  UI Systems        │  Performance     │  Data Management    │
│  - CombatUI.js     │  - Optimizer.js  │  - EnemyDatabase.js │
│  - InventoryUI.js  │  - Memory.js     │  - LevelData.js     │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

#### Singleton Pattern
Used for system managers and databases:
```javascript
// Example: EnemyDatabase
export const enemyDatabase = new EnemyDatabase();
```

#### Observer Pattern
Used for event handling:
```javascript
// Character events
character.emitEvent('levelUp', { character, oldLevel, newLevel });
```

#### Strategy Pattern
Used for AI behaviors:
```javascript
// AI behavior selection
const behavior = AIBehaviorFactory.create(enemy.aiType);
```

## Adding New Content

### Adding New Enemies

#### Step 1: Define Enemy Data
Add enemy to `EnemyDatabase.js`:

```javascript
this.addEnemy('new_enemy_id', {
  name: 'New Enemy Name',
  tier: 2, // 1, 2, 3, or 'boss'
  baseLevel: 5,
  baseStats: {
    HP: 40,
    ATK: 15,
    DEF: 8,
    SPD: 6,
    element: 'Fire'
  },
  aiType: 'AGGRESSIVE', // AGGRESSIVE, DEFENSIVE, TACTICAL, BERSERKER
  skills: [
    {
      id: 'new_skill',
      name: 'New Skill',
      type: 'skill',
      apCost: 2,
      targetType: 'single_enemy',
      effects: ['damage'],
      damageMultiplier: 1.5,
      description: 'Skill description'
    }
  ],
  resistances: {
    'Physical': 0.8,
    'Fire': 0.5,
    'Ice': 1.2
  },
  lootTable: {
    gold: { min: 15, max: 25 },
    experience: 45,
    items: [
      { itemId: 'fire_crystal', chance: 0.3 },
      { itemId: 'health_potion', chance: 0.4 }
    ]
  }
});
```

#### Step 2: Balance Validation
Use the balance system to validate:

```javascript
// Test enemy power rating
const powerRating = combatBalanceConfig.calculateEnemyPower(enemy);
console.log('Enemy power rating:', powerRating);

// Validate against party
const balanceResult = combatBalanceConfig.validateEncounterBalance(
  [enemy], 
  partyPower
);
```

#### Step 3: Add to Encounter Tables
Update encounter generation in `EnemyDatabase.js`:

```javascript
// Add to appropriate tier methods
createNormalEncounter(partyLevel) {
  // Include new enemy in suitable enemy selection
  const suitableEnemies = this.getEnemiesByLevelRange(enemyLevel - 1, enemyLevel + 1);
  // New enemy will be automatically included if level range matches
}
```

### Adding New Items

#### Step 1: Define Item Data
Add to `ItemDatabase.js`:

```javascript
this.addItem('new_weapon_id', {
  name: 'Flame Sword',
  type: 'weapon',
  rarity: 'rare',
  level: 5,
  stats: {
    ATK: 18,
    HP: 5
  },
  requirements: {
    level: 5,
    class: ['warrior', 'rogue']
  },
  effects: [
    {
      type: 'elemental_damage',
      element: 'Fire',
      bonus: 0.2
    }
  ],
  value: 150,
  description: 'A sword imbued with fire magic'
});
```

#### Step 2: Add to Loot Tables
Update enemy loot tables to include new item:

```javascript
// In enemy definition
lootTable: {
  items: [
    { itemId: 'new_weapon_id', chance: 0.15 },
    // ... other items
  ]
}
```

#### Step 3: Add to Shop Inventory
Update shop system to include item in appropriate level ranges.

### Adding New Skills

#### Step 1: Define Skill in SkillSystem
Add to `SkillSystem.js` initialization:

```javascript
this.registerSkill({
  id: 'new_skill_id',
  name: 'New Skill Name',
  description: 'Skill description and effects',
  class: 'warrior', // Target class
  apCost: 3,
  cooldown: 2,
  targetType: 'enemy_single', // enemy_single, enemy_all, ally_single, ally_all, self
  effects: [
    {
      type: 'damage',
      value: 1.8, // 180% damage
      element: 'Physical'
    },
    {
      type: 'status',
      statusType: 'stun',
      duration: 1,
      value: 1
    }
  ]
});
```

#### Step 2: Add to Class Progression
Update skill progression in `Character.js`:

```javascript
getSkillUnlocks(characterClass) {
  const skillProgression = {
    'warrior': [
      // ... existing skills
      { level: 8, skillId: 'new_skill_id' }
    ]
  };
}
```

#### Step 3: Implement Effect Handling
If using new effect types, add handling in `SkillSystem.js`:

```javascript
applyEffect(caster, target, effect) {
  switch (effect.type) {
    // ... existing cases
    case 'new_effect_type':
      return this.applyNewEffect(caster, target, effect);
  }
}

applyNewEffect(caster, target, effect) {
  // Implement new effect logic
  return {
    type: 'new_effect_type',
    success: true,
    // ... effect results
  };
}
```

### Adding New Character Classes

#### Step 1: Define Class Data
Add to `Character.js` class definitions:

```javascript
getClassDefinition(characterClass) {
  const classDefinitions = {
    // ... existing classes
    'new_class': {
      baseStats: {
        HP: 40,
        ATK: 14,
        DEF: 7,
        SPD: 9,
        element: 'Lightning'
      },
      growth: {
        HP: 8,
        ATK: 2.5,
        DEF: 1.5,
        SPD: 1.5
      },
      startingSkill: 'new_class_skill'
    }
  };
}
```

#### Step 2: Create Skill Progression
Add skill progression for new class:

```javascript
getSkillUnlocks(characterClass) {
  const skillProgression = {
    // ... existing classes
    'new_class': [
      { level: 1, skillId: 'skill_1' },
      { level: 3, skillId: 'skill_2' },
      { level: 5, skillId: 'skill_3' },
      { level: 7, skillId: 'skill_4' },
      { level: 10, skillId: 'skill_5' }
    ]
  };
}
```

#### Step 3: Create Class Skills
Define 5 skills for the new class in `SkillSystem.js` following the progression pattern.

## Extending Systems

### Adding New AI Behaviors

#### Step 1: Define AI Type
Add new AI type to `EnemyAI.js`:

```javascript
class EnemyAI {
  constructor(archetype) {
    this.archetype = archetype; // Add 'NEW_TYPE' to existing types
    this.targetPriority = this.getTargetPriority(archetype);
  }

  getTargetPriority(archetype) {
    const priorities = {
      // ... existing types
      'NEW_TYPE': {
        primary: 'custom_logic',
        secondary: 'lowest_hp',
        behavior: 'new_behavior_pattern'
      }
    };
  }

  selectAction(enemy, playerParty) {
    // Add handling for new AI type
    if (this.archetype === 'NEW_TYPE') {
      return this.selectNewTypeAction(enemy, playerParty);
    }
    // ... existing logic
  }

  selectNewTypeAction(enemy, playerParty) {
    // Implement new AI behavior logic
    const availableActions = this.getAvailableActions(enemy);
    // Custom scoring and selection logic
    return bestAction;
  }
}
```

#### Step 2: Update Enemy Definitions
Assign new AI type to appropriate enemies:

```javascript
this.addEnemy('smart_enemy', {
  // ... other properties
  aiType: 'NEW_TYPE'
});
```

### Adding New Status Effects

#### Step 1: Define Status Effect
Add to status effect handling system:

```javascript
// In SkillSystem.js or dedicated StatusEffectSystem
applyStatus(target, effect) {
  const statusEffect = {
    type: effect.statusType,
    duration: effect.duration,
    value: effect.value,
    source: 'skill'
  };

  // Add handling for new status type
  if (effect.statusType === 'new_status') {
    statusEffect.customData = effect.customData;
  }

  target.statusEffects.push(statusEffect);
}

// Add status processing
processStatusEffects(character) {
  for (const status of character.statusEffects) {
    switch (status.type) {
      // ... existing cases
      case 'new_status':
        this.processNewStatus(character, status);
        break;
    }
  }
}

processNewStatus(character, status) {
  // Implement new status effect logic
  // Modify character stats, apply damage, etc.
}
```

### Adding New Equipment Types

#### Step 1: Define Equipment Slot
Add new slot to `Character.js`:

```javascript
// In Character constructor
this.equipment = {
  weapon: null,
  armor: null,
  accessory: null,
  new_slot: null // Add new equipment slot
};
```

#### Step 2: Update Equipment System
Modify equipment validation and stat calculation:

```javascript
// In EquipmentSystem or Character.js
canEquip(character, item) {
  // Add validation for new equipment type
  if (item.type === 'new_equipment_type') {
    return this.validateNewEquipmentType(character, item);
  }
  // ... existing validation
}

recalculateStats() {
  // Include new equipment slot in stat calculation
  for (const slot in this.equipment) {
    const item = this.equipment[slot];
    if (item && item.stats) {
      // Apply item stats including new slot
    }
  }
}
```

## Testing Guidelines

### Unit Testing Structure

#### Test File Organization
```
tests/
├── character/
│   ├── Character.test.js
│   ├── SkillSystem.test.js
│   └── Party.test.js
├── combat/
│   ├── CombatSystem.test.js
│   ├── EnemyAI.test.js
│   └── DamageCalculation.test.js
├── inventory/
│   ├── InventorySystem.test.js
│   ├── ItemDatabase.test.js
│   └── Equipment.test.js
└── integration/
    ├── GameLoop.test.js
    ├── SaveLoad.test.js
    └── Balance.test.js
```

#### Example Test Structure
```javascript
// Character.test.js
describe('Character System', () => {
  let character;

  beforeEach(() => {
    character = new Character('warrior', 'Test Warrior');
  });

  describe('Level Progression', () => {
    test('should calculate correct XP for level', () => {
      expect(character.getExperienceForLevel(2)).toBe(200);
      expect(character.getExperienceForLevel(5)).toBe(1250);
    });

    test('should level up when gaining sufficient XP', () => {
      const initialLevel = character.level;
      character.addExperience(200);
      expect(character.level).toBe(initialLevel + 1);
    });
  });

  describe('Stat Calculation', () => {
    test('should apply equipment bonuses correctly', () => {
      const weapon = { stats: { ATK: 10 } };
      character.equipment.weapon = weapon;
      character.recalculateStats();
      expect(character.stats.ATK).toBe(character.baseStats.ATK + 10);
    });
  });
});
```

### Integration Testing

#### Combat System Integration
```javascript
// Test complete combat flow
describe('Combat Integration', () => {
  test('should complete full combat encounter', () => {
    const party = createTestParty();
    const enemies = createTestEnemies();
    const combat = new CombatSystem(party, enemies);
    
    // Simulate combat until completion
    while (!combat.isComplete()) {
      combat.processTurn();
    }
    
    expect(combat.getResult()).toBeDefined();
    expect(combat.getResult().winner).toMatch(/party|enemies/);
  });
});
```

#### Save/Load Testing
```javascript
describe('Save System Integration', () => {
  test('should preserve complete game state', () => {
    const gameState = createCompleteGameState();
    const saveData = saveSystem.save(gameState);
    const loadedState = saveSystem.load(saveData);
    
    expect(loadedState).toEqual(gameState);
  });
});
```

### Balance Testing

#### Automated Balance Validation
```javascript
// Balance.test.js
describe('Balance Validation', () => {
  test('combat duration should meet targets', () => {
    const encounters = generateTestEncounters();
    
    encounters.forEach(encounter => {
      const duration = simulateCombat(encounter);
      const target = getTargetDuration(encounter.type);
      
      expect(duration).toBeGreaterThanOrEqual(target.min);
      expect(duration).toBeLessThanOrEqual(target.max);
    });
  });

  test('progression pacing should be appropriate', () => {
    const progression = simulateProgression(10); // 10 levels
    
    progression.forEach((level, index) => {
      const timePerLevel = level.timeMinutes;
      expect(timePerLevel).toBeGreaterThanOrEqual(30);
      expect(timePerLevel).toBeLessThanOrEqual(45);
    });
  });
});
```

## Performance Considerations

### Memory Management

#### Object Pooling
```javascript
// For frequently created/destroyed objects
class EffectPool {
  constructor() {
    this.pool = [];
    this.active = [];
  }

  acquire() {
    const effect = this.pool.pop() || new Effect();
    this.active.push(effect);
    return effect;
  }

  release(effect) {
    const index = this.active.indexOf(effect);
    if (index !== -1) {
      this.active.splice(index, 1);
      effect.reset();
      this.pool.push(effect);
    }
  }
}
```

#### Lazy Loading
```javascript
// Load data only when needed
class EnemyDatabase {
  getEnemy(id) {
    if (!this.loadedEnemies.has(id)) {
      this.loadedEnemies.set(id, this.loadEnemyData(id));
    }
    return this.loadedEnemies.get(id);
  }
}
```

### Performance Monitoring

#### Frame Rate Monitoring
```javascript
class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
  }

  update() {
    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - this.lastTime >= 1000) {
      const fps = this.frameCount;
      console.log(`FPS: ${fps}`);
      
      if (fps < 50) {
        console.warn('Performance warning: FPS below target');
      }
      
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  }
}
```

#### Memory Usage Tracking
```javascript
class MemoryTracker {
  static logMemoryUsage() {
    if (performance.memory) {
      const memory = performance.memory;
      console.log({
        used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB'
      });
    }
  }
}
```

## Code Standards

### Naming Conventions

#### Classes and Constructors
```javascript
// PascalCase for classes
class CharacterSystem { }
class EnemyAI { }
```

#### Methods and Variables
```javascript
// camelCase for methods and variables
calculateDamage(attacker, defender) { }
const currentHealth = character.getCurrentHP();
```

#### Constants
```javascript
// UPPER_SNAKE_CASE for constants
const MAX_PARTY_SIZE = 4;
const DEFAULT_AP_PER_TURN = 3;
```

#### Files and Directories
```javascript
// PascalCase for class files
Character.js
SkillSystem.js

// kebab-case for utility files
combat-utils.js
balance-config.js
```

### Documentation Standards

#### JSDoc Comments
```javascript
/**
 * Calculate damage dealt by attacker to defender
 * @param {Object} attacker - Character dealing damage
 * @param {Object} defender - Character receiving damage
 * @param {Object} skill - Skill being used (optional)
 * @returns {number} Final damage amount
 */
calculateDamage(attacker, defender, skill = null) {
  // Implementation
}
```

#### Class Documentation
```javascript
/**
 * CharacterSystem - Manages character creation, progression, and stats
 * 
 * Handles:
 * - Character creation and initialization
 * - Level progression and XP management
 * - Stat calculation and equipment bonuses
 * - Skill unlocking and progression
 * 
 * @example
 * const character = new Character('warrior', 'Aragorn');
 * character.addExperience(100);
 * character.equipItem(sword, 'weapon');
 */
class Character {
  // Implementation
}
```

### Error Handling

#### Graceful Degradation
```javascript
// Always provide fallbacks
getEnemy(id) {
  const enemy = this.enemies.get(id);
  if (!enemy) {
    console.warn(`Enemy ${id} not found, using default`);
    return this.getDefaultEnemy();
  }
  return enemy;
}
```

#### Input Validation
```javascript
// Validate inputs at system boundaries
addExperience(xp) {
  if (typeof xp !== 'number' || xp < 0) {
    console.error('Invalid XP amount:', xp);
    return false;
  }
  
  this.experience += xp;
  return true;
}
```

### Version Control

#### Commit Message Format
```
type(scope): description

feat(combat): add new AI behavior type
fix(inventory): resolve item stacking bug
docs(balance): update damage calculation formulas
test(character): add level progression tests
```

#### Branch Naming
```
feature/new-enemy-types
bugfix/inventory-stacking
hotfix/critical-save-bug
docs/developer-guide-update
```

This developer guide provides the foundation for maintaining and extending the Dungeon Crawler Game codebase. Follow these patterns and standards to ensure consistency and maintainability across all development work.