# F2 — Imports & Singletons

## main.js imports (25 modulos)

```
core: GridSystem, Renderer
managers: InputManager, MovementController, GameLoopManager
systems: CollisionSystem, DoorSystem, TransitionSystem
loaders: DungeonLoader
utils: GeometryFactory
ui: DebugUI  ← UNICA UI
performance: PerformanceManager, PerformanceOptimizer, MemoryManager, PerformanceTester
combat: CombatSystem
character: PartyManager
save: SaveSystem
shop: shopSystem (singleton)
loot: lootSystem (singleton)
inventory: InventorySystem, itemDatabase (singleton)
data: enemyDatabase (singleton)
```

## NO importadas en main.js (existen, listas, no cableadas)

### UIs huerfanas (13)
- `CombatUI` (`ui/CombatUI.js`)
- `CombatUIManager` (`ui/CombatUIManager.js`) — orquestador
- `CombatAnimations` (`ui/CombatAnimations.js`)
- `CombatResultsUI` (`ui/CombatResultsUI.js`)
- `InventoryUI` (`ui/InventoryUI.js`)
- `EquipmentUI` (`ui/EquipmentUI.js`)
- `CharacterSheetUI` (`ui/CharacterSheetUI.js`)
- `ShopUI` (`ui/ShopUI.js`)
- `SaveLoadUI` (`ui/SaveLoadUI.js`)
- `PartyCreationUI` (`ui/PartyCreationUI.js`)
- `UIEnhancementManager` (`ui/UIEnhancementManager.js`) + sub: `UIPolishSystem`, `VisualEffectsSystem`, `AudioPlaceholderSystem`
- `uiEnhancementManager` singleton existe

### Sistemas no instanciados desde main.js
- `CharacterSystem` (facade) — existe `src/engine/character/CharacterSystem.js`, no usado
- `AutoSaveManager` — existe `src/engine/save/AutoSaveManager.js`, no instanciado
- `BalanceTuningSystem` (`balanceTuningSystem` singleton) — disponible, no referenciado en main
- `ResourceEconomySystem` (`resourceEconomySystem` singleton) — idem
- `ConsumableSystem` (`consumableSystem` singleton) — idem
- `EquipmentSystem` — solo importado via `CharacterSystem` (facade muerto)
- `SkillSystem` — solo via `CharacterSystem`
- `ExperienceSystem` — solo via `CharacterSystem`
- `CharacterClasses` — solo via `CharacterSystem` y `PartyCreationUI`

## Singletons

| Singleton | Definido en | Importado por (main?) | Estado |
|---|---|---|---|
| `itemDatabase` | `inventory/ItemDatabase.js:178` | si | OK |
| `enemyDatabase` | `data/EnemyDatabase.js:1321` | si | OK |
| `shopSystem` | `shop/ShopSystem.js:445` | si | OK |
| `lootSystem` | `loot/LootSystem.js:484` | si | OK |
| `combatBalanceConfig` | `balance/CombatBalanceConfig.js:400` | NO (via subsystems) | OK transitivo |
| `balanceTuningSystem` | `balance/BalanceTuningSystem.js:483` | NO | huerfano |
| `resourceEconomySystem` | `balance/ResourceEconomySystem.js:591` | NO | huerfano |
| `consumableSystem` | `inventory/ConsumableSystem.js:370` | NO | huerfano |
| `uiEnhancementManager` | `ui/UIEnhancementManager.js:581` | NO | huerfano |

## Imports circulares detectados (analisis estatico)

Ninguno claro al nivel uno. Posibles indirectos via singletons (ej. `ShopSystem → itemDatabase ← LootSystem → ShopSystem?` — no, `LootSystem` no importa ShopSystem). Limpio.

## Riesgo: `new` de un singleton

Codigo nuevo podria escribir `new ItemDatabase()` esperando una clase y obtener instancia vacia. Mitigacion: exportar SOLO la instancia (no la clase) en los archivos singleton, o marcar la clase como `_internal`. Actualmente ambos exports coexisten:

```
inventory/ItemDatabase.js
  export class ItemDatabase { ... }   ← peligroso
  export const itemDatabase = new ItemDatabase();
```

## Index barrels sin usar

- `combat/index.js`
- `inventory/index.js`
- `save/index.js`
- `character/index.js`

`main.js` importa archivos individuales. Barrels son codigo muerto.

## Conclusion F2

`main.js` importa 25 modulos de ~60 disponibles. **>50% del engine no llega al runtime principal.** Singletons OK. Sin circulares. Codigo muerto: facades + barrels + UIEnhancementManager.
