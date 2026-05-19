# F1 — Smoke Test (boot)

## Carga base

`index.html` → CDN Three.js r128 + `src/main.js` (ES module).

### DOM declarado en index.html

- `#game-canvas`
- `#debug-panel` (+ children: `#debug-position`, `#debug-direction`, `#debug-fps`, `#debug-tile-type`)
- `#toast-container`
- `#fade-overlay`
- `#minimap` (+ `#minimap-grid`)
- `#controls-help`

### Resultados esperados al cargar `http://localhost:8000/`

1. `DungeonCrawlerEngine` se construye OK
2. `initializeSystems()` crea 18+ subsystems → `console.log('Core systems initialized')`
3. `performanceManager.initialize()` OK
4. `loadInitialTestLevel()` fetch `./levels/test-room-10x10.json` → si server bien, OK
5. `gameLoopManager.initialize()` OK
6. Render loop arranca → canvas dibuja
7. Toast: "Engine Ready - Use WASD..."

### Errores probables (sin parche)

| Sintoma | Causa probable |
|---|---|
| Pantalla negra | Three.js CDN bloqueado o falla `Renderer` shaders/camera setup |
| `Failed to load level` toast | Servir desde `file://` (CORS sobre `fetch`) o ruta `levels/` incorrecta |
| Controles W/S invertidos | `InputManager.keyMap` invierte por design (ver F6) |
| Tecla I/C/Esc no abre nada | UIs no montadas (ver F5) |
| Tecla M no muestra mapa | M solo hace `testMinimap()` debug, no abre Map UI |
| Encuentros nunca disparan | `EncounterSystem` instanciado dentro de `GameLoopManager` pero sin trigger desde MovementController |
| Boton "comprar" no responde | `ShopUI` no importada en main |

### Smoke checks recomendados (pre-fix)

Abrir DevTools console y verificar:

```js
// 1. Engine global
window.dungeonEngine                    // debe existir
window.dungeonEngine.isInitialized      // true
window.dungeonEngine.isRunning          // true

// 2. UIs montadas (NINGUNA salvo debug)
window.dungeonEngine.combatUI           // undefined
window.dungeonEngine.inventoryUI        // undefined
window.dungeonEngine.shopUI             // undefined

// 3. Party
window.dungeonEngine.partyManager.party // vacia, sin characters

// 4. Level activo
window.dungeonEngine.dungeonLoader.getCurrentLevel().id  // "test-room-10x10"
// NOT crypt-of-shadows-floor-1
```

### Comando rapido para reproducir

```powershell
python -m http.server 8000
# Browser: http://localhost:8000/
# DevTools console → ejecutar checks arriba
```

## Conclusion F1

Boot **arranca** pero queda en estado "exploracion debug-only". No hay pantalla de menu, no hay party, no hay UI de inventario/combate, no se carga campana. Sistema funcional como tech demo de movimiento + minimap.
