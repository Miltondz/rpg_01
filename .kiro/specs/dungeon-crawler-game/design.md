# FASE 2: SISTEMAS DE JUEGO - Design Document

## Overview

La Fase 2 construye sobre el motor sólido de la Fase 1 para crear un juego completo con sistemas de combate por turnos, progresión de personajes, inventario y loop de gameplay. El diseño se enfoca en crear una experiencia táctica y satisfactoria que mantenga a los jugadores comprometidos a través de mecánicas de progresión bien balanceadas.

## Architecture

### System Integration

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Character System│────│  Combat System  │────│   Party Manager │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Inventory System│────│   Loot System   │────│   Shop System   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Save System   │────│   Game Loop     │────│   Enemy AI      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Components and Interfaces

### Character System

**Core Stats (5 primary attributes):**

```javascript
class Character {
  constructor(characterClass) {
    this.stats = {
      HP: 0,        // Health Points - vida actual y máxima
      ATK: 0,       // Attack Power - poder de ataque
      DEF: 0,       // Defense - resistencia al daño
      SPD: 0,       // Speed - velocidad y evasión
      element: ''   // Elemental Affinity - tipo elemental
    };
    
    this.level = 1;
    this.experience = 0;
    this.skills = [];
    this.equipment = {
      weapon: null,
      armor: null,
      accessory: null
    };
  }
}
```

**Class Specifications:**

#### Warrior
- **Role:** Tank/Melee DPS
- **Base Stats:** HP: 60, ATK: 12, DEF: 10, SPD: 5
- **Growth:** +12 HP, +2 ATK, +2 DEF, +1 SPD per level
- **Skills:** Power Strike, Taunt, Cleave, Iron Will, Execute

#### Rogue
- **Role:** DPS/Critical Specialist
- **Base Stats:** HP: 45, ATK: 10, DEF: 6, SPD: 12
- **Growth:** +9 HP, +2 ATK, +1 DEF, +2 SPD per level
- **Skills:** Backstab, Poison Blade, Evasion, Multi-Strike, Assassinate

#### Mage
- **Role:** AoE Damage/Elemental
- **Base Stats:** HP: 35, ATK: 8, DEF: 5, SPD: 8
- **Growth:** +7 HP, +3 ATK, +1 DEF, +1 SPD per level
- **Skills:** Fireball, Ice Shard, Lightning Storm, Mana Shield, Meteor

#### Cleric
- **Role:** Healer/Support
- **Base Stats:** HP: 50, ATK: 7, DEF: 8, SPD: 6
- **Growth:** +10 HP, +1 ATK, +2 DEF, +1 SPD per level
- **Skills:** Heal, Bless, Mass Heal, Resurrect, Divine Shield

### Combat System

**Turn-Based Mechanics:**

```javascript
class CombatSystem {
  constructor() {
    this.turnOrder = [];
    this.currentTurn = 0;
    this.combatState = 'PLAYER_TURN'; // PLAYER_TURN, ENEMY_TURN, VICTORY, DEFEAT
  }
  
  // Action Point System
  processAction(character, action, target) {
    if (character.currentAP >= action.cost) {
      character.currentAP -= action.cost;
      return this.executeAction(action, character, target);
    }
    return false;
  }
  
  // Damage Calculation
  calculateDamage(attacker, defender, action) {
    let baseDamage = attacker.stats.ATK - (defender.stats.DEF / 2);
    let variance = 0.9 + (Math.random() * 0.2); // ±10% variance
    let elementalModifier = this.getElementalModifier(attacker.element, defender.element);
    
    return Math.floor(baseDamage * variance * elementalModifier);
  }
}
```

**AI Behavior System:**

```javascript
class EnemyAI {
  constructor(archetype) {
    this.archetype = archetype; // AGGRESSIVE, DEFENSIVE, TACTICAL, BERSERKER
    this.targetPriority = this.getTargetPriority(archetype);
  }
  
  selectAction(enemy, playerParty) {
    const availableActions = this.getAvailableActions(enemy);
    const scores = availableActions.map(action => 
      this.scoreAction(action, enemy, playerParty)
    );
    
    return availableActions[scores.indexOf(Math.max(...scores))];
  }
}
```

### Inventory System

**Item Management:**

```javascript
class InventorySystem {
  constructor() {
    this.slots = new Array(40).fill(null); // 40 slot grid
    this.gold = 0;
  }
  
  addItem(item, quantity = 1) {
    if (item.stackable) {
      return this.addStackableItem(item, quantity);
    } else {
      return this.addUniqueItem(item);
    }
  }
  
  equipItem(character, item, slot) {
    if (this.canEquip(character, item)) {
      const previousItem = character.equipment[slot];
      character.equipment[slot] = item;
      this.recalculateStats(character);
      return previousItem;
    }
    return null;
  }
}
```

**Item Types and Rarities:**

```javascript
const ItemRarity = {
  COMMON: { color: '#FFFFFF', statBonus: 1.0 },
  UNCOMMON: { color: '#00FF00', statBonus: 1.1 },
  RARE: { color: '#0080FF', statBonus: 1.2 },
  EPIC: { color: '#8000FF', statBonus: 1.35 }
};

const ItemTypes = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  ACCESSORY: 'accessory',
  CONSUMABLE: 'consumable',
  KEY_ITEM: 'key_item',
  MATERIAL: 'material'
};
```

### Save System

**Save Data Structure:**

```javascript
class SaveData {
  constructor() {
    this.metadata = {
      version: '2.0.0',
      timestamp: Date.now(),
      playtime: 0,
      location: ''
    };
    
    this.party = {
      characters: [],
      formation: [],
      gold: 0
    };
    
    this.inventory = {
      items: [],
      equipment: {}
    };
    
    this.world = {
      currentDungeon: '',
      currentFloor: 0,
      playerPosition: { x: 0, z: 0, direction: 0 },
      clearedEncounters: [],
      openedDoors: [],
      discoveredAreas: []
    };
    
    this.progress = {
      completedQuests: [],
      unlockedAreas: [],
      defeatedBosses: []
    };
  }
}
```

## Data Models

### Character Data Model

```javascript
const CharacterSchema = {
  id: String,
  name: String,
  class: String, // 'warrior', 'rogue', 'mage', 'cleric'
  level: Number,
  experience: Number,
  stats: {
    HP: { current: Number, max: Number },
    ATK: Number,
    DEF: Number,
    SPD: Number,
    element: String
  },
  skills: [{
    id: String,
    level: Number,
    cooldown: Number
  }],
  equipment: {
    weapon: ItemReference,
    armor: ItemReference,
    accessory: ItemReference
  },
  statusEffects: [{
    type: String,
    duration: Number,
    value: Number
  }]
};
```

### Combat Data Model

```javascript
const CombatEncounter = {
  id: String,
  type: String, // 'random', 'scripted', 'boss'
  enemies: [{
    id: String,
    level: Number,
    position: { row: String, index: Number },
    currentHP: Number,
    statusEffects: Array
  }],
  environment: {
    terrain: String,
    weather: String,
    modifiers: Array
  },
  rewards: {
    experience: Number,
    gold: { min: Number, max: Number },
    loot: [{
      itemId: String,
      chance: Number,
      quantity: { min: Number, max: Number }
    }]
  }
};
```

### Item Data Model

```javascript
const ItemSchema = {
  id: String,
  name: String,
  type: String, // ItemTypes enum
  rarity: String, // ItemRarity enum
  level: Number,
  stackable: Boolean,
  maxStack: Number,
  value: Number, // Gold value
  
  // Equipment specific
  stats: {
    ATK: Number,
    DEF: Number,
    HP: Number,
    SPD: Number
  },
  requirements: {
    level: Number,
    class: Array<String>
  },
  
  // Consumable specific
  effects: [{
    type: String, // 'heal', 'buff', 'cure'
    value: Number,
    duration: Number
  }],
  
  // Special properties
  modifiers: [{
    type: String,
    value: Number
  }]
};
```

## Error Handling

### Combat System Errors
- **Invalid Action**: Validate AP cost and availability before execution
- **Target Selection**: Ensure target is valid and alive
- **Animation Conflicts**: Queue actions if animations are in progress
- **AI Deadlock**: Implement fallback "basic attack" if AI cannot decide

### Save System Errors
- **Corrupted Save**: Validate JSON structure and offer auto-save recovery
- **Storage Full**: Compress save data and warn user
- **Version Mismatch**: Implement save migration system
- **Concurrent Access**: Lock save operations to prevent conflicts

### Inventory Errors
- **Full Inventory**: Provide clear feedback and drop options
- **Invalid Equipment**: Check class and level requirements
- **Item Duplication**: Implement unique ID system for tracking
- **Stack Overflow**: Validate stack limits before adding items

## Testing Strategy

### Unit Testing
- **Character Stats**: Verify stat calculations and level progression
- **Combat Mechanics**: Test damage formulas and action resolution
- **Inventory Operations**: Validate item management and equipment
- **Save/Load**: Ensure data integrity across save cycles

### Integration Testing
- **Combat Flow**: Complete combat from start to victory/defeat
- **Progression Loop**: XP gain, level up, skill unlock sequence
- **Item Management**: Loot generation, inventory, equipment cycle
- **Game State**: Save, load, continue gameplay verification

### Balance Testing
- **Combat Duration**: Ensure encounters last 2-12 minutes
- **Difficulty Curve**: Validate enemy scaling matches player progression
- **Resource Management**: Test potion usage and gold economy
- **Skill Effectiveness**: Verify all skills are useful and balanced

### Performance Testing
- **Combat Performance**: 60fps with 6 enemies and effects
- **Save Performance**: Complete save/load under 1 second
- **Memory Usage**: No leaks during extended gameplay sessions
- **UI Responsiveness**: All interactions under 100ms response time

## Performance Benchmarks

### Target Metrics
- **Frame Rate**: 60fps sustained during combat
- **Memory Usage**: <400MB after 2 hours of gameplay
- **Save Time**: <500ms for complete game state
- **Load Time**: <1 second for any save file
- **Combat Turn**: <200ms for AI decision making

### Optimization Strategies
- **Object Pooling**: Reuse combat effect objects
- **Lazy Loading**: Load enemy data only when needed
- **Batch Operations**: Group inventory updates
- **Compressed Saves**: Use JSON compression for save files
- **Efficient Rendering**: Minimize DOM updates during combat

This design provides a comprehensive foundation for implementing all Phase 2 systems while maintaining the performance and quality standards established in Phase 1.