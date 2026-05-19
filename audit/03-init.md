# F3 — Init Order & Dependencies

## Orden en `DungeonCrawlerEngine.initialize()`

```
1. initializeSystems()
2. new DebugUI() + debugUI.initialize()
3. setupEventListeners()
4. performanceManager.initialize()
5. performanceOptimizer.startMonitoring()
6. memoryManager.startMonitoring()
7. performanceTester.initialize()
8. loadInitialTestLevel()
9. gameLoopManager.initialize()
10. minimap setup (setTimeout 1000ms)
11. extra keydown handlers
```

## initializeSystems() orden

```
canvas = document.getElementById('game-canvas')
gridSystem = new GridSystem()
renderer = new Renderer(canvas)
inputManager = new InputManager()                ← arranca listeners ya
geometryFactory = new GeometryFactory()
doorSystem = new DoorSystem(gridSystem, renderer)
collisionSystem = new CollisionSystem(gridSystem, doorSystem)
movementController = new MovementController(gridSystem, collisionSystem, renderer)
dungeonLoader = new DungeonLoader(gridSystem, doorSystem, renderer, geometryFactory)
transitionSystem = new TransitionSystem(dungeonLoader, movementController, inputManager)
performanceManager = new PerformanceManager(renderer, renderer.getCamera())
performanceOptimizer = new PerformanceOptimizer()
memoryManager = new MemoryManager()
performanceTester = new PerformanceTester(this)
combatSystem = new CombatSystem()
partyManager = new PartyManager()
saveSystem = new SaveSystem()
inventorySystem = new InventorySystem(40)
gameLoopManager = new GameLoopManager(this)        ← engine pasado, accede a ALL
```

## Problemas detectados

### P1 — `InputManager` arranca listeners en constructor
```js
// InputManager.js:45
this.initialize();  // dentro de constructor: addEventListener keydown/keyup
```
Empieza a aceptar teclas antes de que `MovementController.update` corra. Acciones se encolan, OK (queue) — pero si crashea init posterior, queue inflado.

### P2 — `GameLoopManager(this)` recibe engine entero
```js
gameLoopManager = new GameLoopManager(this)
```
Acoplamiento maximo. Lee `engine.partyManager`, `engine.combatSystem`, etc. Si el orden cambia, todo se rompe silenciosamente.

### P3 — `CombatSystem` constructor crea sub-managers
```js
// CombatSystem.js:6-10
import ActionSystem, ActionResolver, EnemyAI, AIActionValidator, lootSystem
```
Si `new CombatSystem()` falla constructor, mensaje generico.

### P4 — Combat NO recibe `partyManager`
`new CombatSystem()` sin args. ¿Como sabe quien es la party? Probable acceso via singleton o via event en `startCombat()`. Sin verificacion.

### P5 — `partyManager` arranca vacio
Ningun `partyManager.addCharacter(...)` en init. Si combat inicia sin party → crash o NPE.

### P6 — `inventorySystem` arranca vacio
40 slots vacios. No hay items iniciales, no hay equipo de party.

### P7 — `saveSystem` no ata `autoSaveManager`
```js
saveSystem = new SaveSystem()
// no: new AutoSaveManager(saveSystem)
```
Save manual posible (si UI existiera). Auto-save no funciona.

### P8 — `gameLoopManager.initialize()` se llama DESPUES de `loadInitialTestLevel()`
```js
await this.loadInitialTestLevel();
if (this.gameLoopManager) await this.gameLoopManager.initialize();
```
Level cargado pero `EncounterSystem.setLevel()` etc. podrian no haber recibido el level loaded. Posible: hooks `levelTransition` event los actualiza. Verificar.

### P9 — Camera position inicial antes de level
```js
// initializeSystems() lines 238-241
const initialWorldPos = this.movementController.getCurrentWorldPosition();
this.renderer.updateCameraPosition(initialWorldPos);
```
Pero level no cargado aun → `currentWorldPosition` es default `(0,0)`. Camera salta despues cuando level setea spawn.

## Mapa de dependencias en constructores

```
GridSystem()                       — no deps
Renderer(canvas)                   — DOM
InputManager()                     — DOM (event listeners)
GeometryFactory()                  — no deps
DoorSystem(grid, renderer)         — grid, renderer
CollisionSystem(grid, doorSystem)  — grid, doors
MovementController(grid, col, ren) — grid, collision, renderer
DungeonLoader(g, d, r, gf)         — grid, doors, renderer, geomFactory
TransitionSystem(loader, mc, im)   — loader, movement, input
PerformanceManager(r, camera)      — renderer + camera (from renderer)
CombatSystem()                     — singletons internos
PartyManager()                     — no deps
SaveSystem()                       — no deps
InventorySystem(40)                — no deps
GameLoopManager(engine)            — ENGINE ENTERO
```

## Recomendaciones

1. **Dependency injection container**. `Engine.subsystems` map + `register/get`. Cada subsystem declara `requires=[...]`. Init topologico.
2. **`isReady()` por subsystem.** Verificacion post-init explicita.
3. **`PartyManager` debe recibir party via `PartyCreationUI`.** No iniciar exploracion sin party.
4. **Camera setup post-level**. No antes.
5. **Logger.tag('Boot')** en cada paso con `performance.now()` delta.

## Conclusion F3

Orden no es disastroso pero acoplamiento `GameLoopManager(this)` es bomba latente. Sin party/inventory pre-pobladas, sin AutoSave conectado, sin verificacion `isReady`. Init es "happy path only".
