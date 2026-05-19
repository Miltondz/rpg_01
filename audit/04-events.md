# F4 — Event Bus

CustomEvents sobre `window` = bus implicito. Sin registro central, sin tipos.

## Pares emisor → listener

### OK (ambos lados existen y al menos uno conectado en main)

| Evento | Emisor | Listener |
|---|---|---|
| `movementBlocked` | MovementController:385 | main.js:291 |
| `doorOpened` | MovementController:403 | main.js:295 |
| `levelTransition` | MovementController:414 | main.js:299, GameLoopManager:134, AutoSaveManager:341 |
| `transitionError` | TransitionSystem:264 | main.js:303 |
| `movementCompleted` | MovementController:432 | GameLoopManager:114 |

### Eventos solo en UIs huerfanas (no llegan a main.js)

| Evento | Emisor | Listener(es) |
|---|---|---|
| `combatEvent` | CombatSystem:524 | CombatUI, CombatResultsUI, CombatAnimations, CombatUIManager, VisualEffectsSystem, AudioPlaceholderSystem, UIEnhancementManager, GameLoopManager, PerformanceTester |
| `levelUp` | (nadie? `characterLevelUp` si) | VisualEffectsSystem, UIEnhancementManager, CharacterSheetUI, AudioPlaceholderSystem |
| `characterLevelUp` | ExperienceSystem:363 | CharacterSystem:51 |
| `partyChange` | PartyManager:484 | CharacterSystem:57, CharacterSheetUI:260, PartyCreationUI:293 |
| `goldChange` | PartyManager:594 | (sin listener) HUERFANO |
| `itemEquipped` | EquipmentUI:361, CharacterSheetUI:998 | VisualEffectsSystem:393, CharacterSheetUI:267, AudioPlaceholderSystem:125 |
| `itemUnequipped` | EquipmentUI:401, CharacterSheetUI:648 | CharacterSheetUI:274 |
| `equipmentChange` | EquipmentSystem:379 | (sin listener) HUERFANO |
| `openEquipmentSelection` | CharacterSheetUI:694 | (sin listener) HUERFANO |
| `gameStart` | PartyCreationUI:546 | PartyCreationUI:296 (self-listen?) HUERFANO en main |
| `gameLoadRequested` | SaveLoadUI:593 | (sin listener) HUERFANO |
| `gameStateChange` | CombatUIManager:358,374,390,406 | (sin listener) HUERFANO |
| `combatUIAction` | CombatUI:592 | CombatUIManager:73 |
| `combatUIRequest` | CombatUI:697 | CombatUIManager:74 |
| `combatResultsAction` | CombatResultsUI:702 | CombatUIManager:77 |
| `combatResultsRequest` | CombatResultsUI:594 | CombatUIManager:78 |
| `encounterEvent` | EncounterSystem:625 | GameLoopManager:124 |
| `safeZoneEvent` | SafeZoneSystem:586 | GameLoopManager:129 |
| `difficultyScalingEvent` | DifficultyScalingSystem:470 | (sin listener) HUERFANO |
| `combatVictory` | (nadie emite?) | AutoSaveManager:340 HUERFANO inverso |
| `itemPickup` | (nadie) | AudioPlaceholderSystem:129 HUERFANO inverso |
| `modalOpen` / `modalClose` | (nadie) | AudioPlaceholderSystem:134-138, UIEnhancementManager:137 HUERFANO inverso |
| `notification` | (nadie) | AudioPlaceholderSystem:143 HUERFANO inverso |
| `gameLoopEvent` | GameLoopManager:609 | (sin listener) HUERFANO |
| `memoryEvent` | MemoryManager:458 | PerformanceTester:84 |
| `performanceOptimization` | PerformanceOptimizer:457 | PerformanceTester:79 |
| `performanceTest` | PerformanceTester:1042 | (sin listener) HUERFANO |
| `autoSave_*` | AutoSaveManager:539 | (sin listener) HUERFANO |
| `saveSystem_*` | SaveSystem:486 | (sin listener) HUERFANO |
| `partyChange` event en Character.js | Character.emitEvent (generico) | varios | ver Character.js:749 |

## Resumen

- **Eventos huerfanos sin listener:** `goldChange`, `equipmentChange`, `openEquipmentSelection`, `gameLoadRequested`, `gameStateChange`, `difficultyScalingEvent`, `gameLoopEvent`, `performanceTest`, `autoSave_*`, `saveSystem_*`.
- **Listeners huerfanos sin emisor:** `combatVictory` (deberia emitirse en CombatSystem al ganar), `itemPickup`, `modalOpen`, `modalClose`, `notification`, `levelUp` (¿es `characterLevelUp` mal nombrado?).
- **Nomenclatura inconsistente:** `levelUp` vs `characterLevelUp`. Probablemente refactor incompleto.

## Recomendacion

1. Crear `src/engine/core/EventBus.js` wrapper sobre `window.dispatchEvent`, con:
   - Registro de tipos canonicos (constantes)
   - Logger automatico (`Logger.tag('Event:<name>')`)
   - Conteo de listeners
   - Warning si emite evento sin listeners

2. Renombrar `levelUp` → `characterLevelUp` (o viceversa) en todas las UIs.

3. Anadir emit de `combatVictory` en `CombatSystem.endCombat(victory)`.

4. Decidir: borrar emisores huerfanos, o anadir listeners en main para diagnostico.

## Conclusion F4

Bus implicito con **~10 eventos huerfanos** en cada direccion. Cluster combat funciona internamente entre UIs combat pero esas UIs no estan montadas (F2/F5). Limpio bus + canonizar nombres es prerequisito de cualquier integracion estable.
