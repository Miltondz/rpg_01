# Auditoria de Integracion — Reporte Ejecutivo

**Fecha:** 2026-05-18
**Branch:** master
**Commit base:** a20bf52

## Veredicto

El engine RPG esta ~85% completo a nivel **modular** pero ~25% **integrado**. Los modulos individuales funcionan en sus harnesses `test-*.html` pero `src/main.js` solo cablea el subsistema de exploracion (movimiento, colision, render, debug UI, minimap). El 90% de las UIs (combat, inventario, equipamiento, personaje, tienda, save, party creation) **no se importan en main.js**, no se montan, no son accesibles fuera de tests aislados. El contenido shippeado ("Crypt of Shadows" floors 1-5) **nunca se carga en flujo principal** — solo test rooms.

Adicionalmente, los controles tienen **tres tablas direccionales inconsistentes** y al menos **dos capas de inversion compensatoria** que se cancelan/multiplican entre si.

## Findings por severidad

### CRITICAL (bloquean uso del juego)

| # | Hallazgo | Archivo |
|---|---|---|
| C1 | UIs no integradas en `main.js` — CombatUI, InventoryUI, EquipmentUI, CharacterSheetUI, ShopUI, SaveLoadUI, PartyCreationUI, CombatUIManager, UIEnhancementManager. Solo `DebugUI` importada. | `src/main.js:7-33` |
| C2 | `CombatSystem` instanciado pero sin UI manager. Iniciar combate desde flujo principal = sin interfaz visible para acciones. | `src/main.js:229` |
| C3 | Levels de campana NUNCA cargados. `loadInitialTestLevel()` hardcodea `test-room-10x10.json`. Floors `crypt-of-shadows-floor-{1..5}.json` solo accesibles si edita codigo. | `src/main.js:577-610` |
| C4 | InputManager invierte W↔S y A↔D "para compensar inversion". MovementController tiene tabla "CORRECTED" que tambien invierte Z. Doble inversion = controles inconsistentes y comentarios mienten respecto a la tabla. | `src/engine/managers/InputManager.js:11-25`, `src/engine/managers/MovementController.js:38-103` |
| C5 | Sin keybinds para acciones de combate (`1-5`), inventario (`I`), personaje (`C`), menu (`ESC`) que el README documenta. `InputManager.keyMap` solo tiene movement/interact/loadTest. | `src/engine/managers/InputManager.js:11-25` |
| C6 | `PartyManager` instanciado vacio. Sin `PartyCreationUI` cableada, no hay forma de crear party desde flujo principal. Combat sin party = imposible. | `src/main.js:230` |

### HIGH

| # | Hallazgo | Archivo |
|---|---|---|
| H1 | Tres tablas N/E/S/W diferentes en distintos archivos: `main.js:528-533` canonica `{0,-1},{1,0},{0,1},{-1,0}`. `MovementController.calculateForwardPosition` invertida. `main.js:1078-1083` canonica de nuevo. Edicion en una rompe la otra. | varios |
| H2 | `AutoSaveManager` no instanciado. `SaveSystem` se crea pero `SaveLoadUI` no, autosave nunca arranca. | `src/main.js:231` |
| H3 | `BalanceTuningSystem`, `ResourceEconomySystem`, `DifficultyScalingSystem`, `SafeZoneSystem` referenciados internamente por `GameLoopManager` pero no inicializados explicitamente. Pueden funcionar via singleton, pero sin verificacion de estado. | `src/engine/managers/GameLoopManager.js:6-8` |
| H4 | `EnemyDatabase` instancia tiene 15 enemigos shippeados, pero sin spawn pipeline (no encounter UI conectada) = nunca aparecen. | — |
| H5 | `CombatAnimations` espera `#combat-container` en DOM. `index.html` no lo declara. | `src/engine/ui/CombatAnimations.js:607` |

### MEDIUM

| # | Hallazgo |
|---|---|
| M1 | `index.html` solo declara markup para: canvas, debug-panel, toast-container, fade-overlay, minimap, controls-help. Otras UIs deben `createElement` su DOM dinamicamente. Riesgo de huerfanos no-removidos al cambiar pantalla. |
| M2 | 13 UIs distintas crean styles inline via `<style id="*-styles">`. Sin coordinacion z-index → modales se solapan impredeciblemente. |
| M3 | Eventos huerfanos: `combatVictory` (escuchado por `AutoSaveManager`), `gameLoadRequested` (emitido por `SaveLoadUI` sin listener), `openEquipmentSelection` (emitido por `CharacterSheetUI` sin listener en main). |
| M4 | `CharacterSystem` (facade) existe pero `main.js` accede directo a `PartyManager`. Facade muerto o requerido por UIs no-integradas. |
| M5 | `controls-help` en `index.html` muestra "A/← = Turn Left" pero InputManager mapea `KeyA → turnRight`. Mensaje al usuario contradice comportamiento. |

### LOW

| # | Hallazgo |
|---|---|
| L1 | `console.log` directos sin niveles ni filtros. Imposible separar diagnostico de produccion. |
| L2 | Test harnesses HTML duplican algun stub de modulo (no verificado al detalle). Riesgo de drift entre stub y real. |
| L3 | `next_level.json` existe en `levels/` pero no referenciado. Probable archivo huerfano de prueba. |
| L4 | `index.js` barrels (`combat/index.js`, `inventory/index.js`, `save/index.js`) creados pero `main.js` no los usa — importa archivos individuales. |

## Fix plan ordenado por dependencias

**Regla:** no arreglar capas superiores antes que las inferiores.

### Etapa 0 — Infraestructura de diagnostico (PREREQUISITO)
0.1. Crear `src/engine/utils/Logger.js` con niveles (DEBUG/INFO/WARN/ERROR), tags por subsistema, toggle global, sink a consola + buffer in-memory para volcado.
0.2. Crear `src/engine/utils/SystemInspector.js` con `window.inspect()` que reporta estado vivo de cada subsistema (init? hp? listeners count? referencias).
0.3. Reemplazar `console.log` sembrados en `main.js`, `MovementController`, `InputManager`, `CollisionSystem` por `Logger.debug/info/warn`.

### Etapa 1 — Direcciones canonicas (resuelve C4, H1)
1.1. Crear `src/engine/core/Direction.js` con UNICA tabla N/E/S/W + helpers (`forward(dir)`, `turnLeft(dir)`, `turnRight(dir)`, `opposite(dir)`).
1.2. Borrar tablas locales en `MovementController`, `main.js` (2 sitios), reemplazar con import de `Direction.js`.
1.3. Restaurar `InputManager.keyMap`: W→forward, S→backward, A→turnLeft, D→turnRight. Borrar comentarios "compensar inversion".
1.4. Si Three.js camera apunta -Z = pantalla, ajustar UNA SOLA VEZ en `Renderer.updateCameraRotation`, no en MovementController.
1.5. Tests: `LogLevel.DEBUG` + `Logger.tag('Movement')` → cada moveForward loguea `dir=N pos=(x,z) → (x',z') blocked=false`.

### Etapa 2 — Keybinds completos (resuelve C5, M5)
2.1. Anadir a `InputManager.keyMap`: `Digit1..5 → combatAction1..5`, `KeyI → openInventory`, `KeyC → openCharacterSheet`, `Escape → openMenu`, `KeyM → openMap`.
2.2. Crear stubs `handleInputAction` en `main.js` para nuevos types.
2.3. Sincronizar texto en `controls-help` de `index.html`.

### Etapa 3 — Montaje de UIs (resuelve C1, C2, C6, H5, M1)
3.1. Anadir DOM containers a `index.html`: `#combat-container`, `#inventory-container`, `#character-sheet-container`, `#equipment-container`, `#shop-container`, `#save-load-container`, `#party-creation-container`, `#main-menu-container`. Display `none` por defecto.
3.2. Importar UIs en `main.js`. Anadir a `initializeSystems()`: `new CombatUIManager()`, `new InventoryUI(inventorySystem)`, etc.
3.3. Anadir `initializeUIs()` async que llama `.initialize()` de cada UI tras subsystems creados.
3.4. Crear `UIRouter` (`src/engine/ui/UIRouter.js`) que maneja show/hide exclusivo de pantallas (party creation → exploration → combat → results → exploration). Centraliza z-index.
3.5. Logger.tag('UI') por cada show/hide.

### Etapa 4 — Flujo de juego (resuelve C3, C6, H2, H4)
4.1. Arrancar con `PartyCreationUI` antes de cargar level. Solo despues de `gameStart` event → load level.
4.2. Cambiar `loadInitialTestLevel` → `loadCampaign` que lee `levels/crypt-of-shadows-config.json` y carga floor 1.
4.3. Cablear `EncounterSystem` → `combatStart` event → `CombatUIManager.startCombat(enemies, party)`.
4.4. Cablear `CombatSystem` victory → `CombatResultsUI.show(results)` → close → resume exploration.
4.5. Instanciar `AutoSaveManager` y arrancar monitor.

### Etapa 5 — Limpieza eventos huerfanos (resuelve M3)
5.1. Auditar pares emisor↔listener (ver `audit/04-events.md`). Por cada huerfano: borrar emisor o anadir listener.
5.2. Documentar bus de eventos en `docs/event-bus.md` (lista canonica).

### Etapa 6 — Validacion
6.1. Anadir `test-integration-main.html` que carga `src/main.js` real (no stubs) y ejercita: crear party → cargar floor 1 → moverse → encounter → combat → victoria → save → load → continuar.
6.2. Smoke automatizado: cada subsystem reporta `isReady()` tras init. Falla loud si alguno false.

## Estimacion

| Etapa | Tiempo | Dificultad |
|---|---|---|
| 0 Logger/Inspector | 2-3h | baja |
| 1 Direcciones | 2-4h | media (riesgo regresion movement) |
| 2 Keybinds | 1h | baja |
| 3 UI mount | 6-10h | media |
| 4 Flujo juego | 8-12h | alta |
| 5 Eventos | 2-3h | baja |
| 6 Validacion | 3-5h | media |
| **Total** | **24-38h** | — |

## Logs propuestos (resumen — detalle en `08-logging-plan.md`)

- `Logger.tag('Boot')` cada paso init, con tiempo transcurrido
- `Logger.tag('Movement')` cada accion: pre-state, target, collision result, post-state
- `Logger.tag('Input')` cada key → action mapping, queue size, blocked?
- `Logger.tag('UI:<Screen>')` show/hide con stack de pantallas activas
- `Logger.tag('Event:<name>')` cada CustomEvent dispatch con detail + listener count
- `Logger.tag('Combat')` turn start/end, action chosen, damage rolls
- `Logger.tag('Save')` save/load tiempo + size
- `Logger.tag('Asset')` carga level: tile count, doors, transitions, errors schema

Toggle por tag: `window.Logger.enable('Movement', 'Input')` en consola.
Toggle global: `window.Logger.setLevel('DEBUG')`.
Buffer dump: `window.Logger.dump()` retorna ultimo N (config) entradas para copy/paste a issue.

## Archivos generados

- `audit/REPORT.md` (este)
- `audit/01-smoke.md` — boot smoke + missing DOM + module load errors esperados
- `audit/02-imports.md` — graph de imports + singletons mal-usados + circulares
- `audit/03-init.md` — orden init + deps en constructores
- `audit/04-events.md` — pares emisor↔listener + huerfanos
- `audit/05-ui.md` — UI classes vs DOM ids vs main.js mounting
- `audit/06-controls.md` — keymap + tablas direccion comparadas linea-a-linea
- `audit/07-assets.md` — levels referenciados vs existentes + databases populated
- `audit/08-logging-plan.md` — diseno Logger + SystemInspector + tags catalogo
