# FASE 2: SISTEMAS DE JUEGO - Requirements Document

## Introduction

La Fase 2 transforma el motor técnico de la Fase 1 en un juego funcional completo con sistemas de combate por turnos, progresión de personajes, inventario y loop de gameplay. El objetivo es crear un **vertical slice jugable** donde los jugadores puedan experimentar el ciclo completo de exploración, combate, progresión y gestión de recursos.

## Glossary

- **Character System**: Sistema de personajes con stats, clases, niveles y habilidades
- **Combat System**: Sistema de combate por turnos con mecánicas tácticas
- **Party**: Grupo de hasta 4 personajes controlados por el jugador
- **Action Points (AP)**: Puntos de acción que limitan las acciones por turno
- **Stats**: Atributos numéricos que definen las capacidades de personajes y enemigos
- **Skills**: Habilidades especiales que consumen AP y tienen efectos únicos
- **Inventory System**: Sistema de gestión de items, equipamiento y recursos
- **Loot System**: Sistema de generación y distribución de recompensas
- **Save System**: Sistema de guardado y carga de progreso del juego
- **Enemy AI**: Inteligencia artificial que controla el comportamiento de enemigos

## Requirements

### Requirement 1: Character System and Progression

**User Story:** As a player, I want to create and develop a party of characters with different classes and abilities, so that I can customize my playstyle and feel progression.

#### Acceptance Criteria

1. THE Character System SHALL support 4 distinct classes: Warrior, Rogue, Mage, and Cleric
2. WHEN a character is created, THE Character System SHALL assign base stats according to class specifications
3. WHEN a character gains experience, THE Character System SHALL calculate level progression using exponential curve formula
4. THE Character System SHALL unlock new skills at predetermined levels for each class
5. THE Character System SHALL maintain party composition of up to 4 characters with front/back row positioning

### Requirement 2: Combat System

**User Story:** As a player, I want engaging turn-based combat with tactical depth, so that battles feel strategic and rewarding.

#### Acceptance Criteria

1. THE Combat System SHALL implement turn-based combat with Action Points (AP) limiting actions per turn
2. WHEN combat begins, THE Combat System SHALL determine turn order and present combat UI
3. THE Combat System SHALL support 5 action types: Attack, Skill, Item, Defend, and Flee
4. THE Combat System SHALL calculate damage using ATK vs DEF formulas with elemental modifiers
5. THE Combat System SHALL implement 4 distinct AI behaviors: Aggressive, Defensive, Tactical, and Berserker

### Requirement 3: Inventory and Equipment System

**User Story:** As a player, I want to collect, manage, and equip items to improve my characters, so that I can optimize my party's effectiveness.

#### Acceptance Criteria

1. THE Inventory System SHALL provide 40 shared inventory slots with drag-and-drop organization
2. THE Equipment System SHALL support weapons, armor, and accessories with stat bonuses
3. THE Loot System SHALL generate items with 4 rarity tiers: Common, Uncommon, Rare, and Epic
4. THE Shop System SHALL allow buying and selling items with dynamic pricing
5. THE Item System SHALL include consumables, equipment, key items, and materials

### Requirement 4: Save and Load System

**User Story:** As a player, I want to save my progress and continue later, so that I don't lose my advancement.

#### Acceptance Criteria

1. THE Save System SHALL provide 3 manual save slots plus 1 auto-save slot
2. THE Save System SHALL preserve complete game state including party, inventory, and world progress
3. THE Auto-Save System SHALL trigger after combat victories, level transitions, and every 5 minutes
4. THE Load System SHALL validate save integrity and handle corrupted saves gracefully
5. THE Save System SHALL complete save/load operations in under 1 second

### Requirement 5: Game Loop and Progression

**User Story:** As a player, I want a satisfying gameplay loop that combines exploration, combat, and character development, so that I feel motivated to continue playing.

#### Acceptance Criteria

1. THE Game Loop SHALL integrate exploration, random encounters, combat, and progression seamlessly
2. THE Encounter System SHALL trigger random battles with 15-20% chance per movement tile
3. THE Progression System SHALL provide meaningful rewards through XP, loot, and character advancement
4. THE Difficulty System SHALL scale enemy strength based on dungeon level and party progression
5. THE Safe Zone System SHALL provide rest points for saving, healing, and shopping

### Requirement 6: Performance and Polish

**User Story:** As a player, I want smooth, polished gameplay without bugs or performance issues, so that I can focus on enjoying the game.

#### Acceptance Criteria

1. THE Game Systems SHALL maintain 60fps during combat with up to 6 enemies
2. THE UI System SHALL provide responsive, intuitive interfaces for all game functions
3. THE Balance System SHALL ensure combat encounters take 2-12 minutes depending on type
4. THE Testing System SHALL validate zero critical bugs and fewer than 5 minor issues
5. THE Polish System SHALL include visual effects, animations, and audio feedback