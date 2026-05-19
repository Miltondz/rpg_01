# F6 — Controls & Direction Tables

## Estado actual: TRIPLE INVERSION

### Capa 1 — InputManager keymap (invertido)

`src/engine/managers/InputManager.js:11-25`:

```js
this.keyMap = {
  'KeyW': 'backward',    // W → atras
  'KeyS': 'forward',     // S → adelante
  'KeyA': 'turnRight',   // A → girar derecha
  'KeyD': 'turnLeft',    // D → girar izquierda
  ...
};
```

Comentarios: "para compensar inversion". Workaround.

### Capa 2 — MovementController tabla forward

`src/engine/managers/MovementController.js:38-44`:

```js
// CORRECTED: Invert North/South to match Three.js camera directions
const directions = [
  {x: 0, z: 1},  // North (toward positive Z in grid, matches camera -Z)
  {x: 1, z: 0},  // East
  {x: 0, z: -1}, // South
  {x: -1, z: 0}  // West
];
```

**El comentario miente.** Index 0 etiquetado `North` pero `z: +1`. En convencion estandar `z+` apunta hacia abajo de pantalla (`South`). Esta tabla esta **invertida en N/S**.

### Capa 3 — main.js performInteraction (canonica)

`src/main.js:528-533`:

```js
const directions = [
  {x: 0, z: -1}, // North
  {x: 1, z: 0},  // East
  {x: 0, z: 1},  // South
  {x: -1, z: 0}  // West
];
```

**Tabla canonica original**, N apunta a `z: -1`. Cuando jugador presiona `Space` para interactuar, busca puerta usando esta tabla — distinta a la que usa para moverse.

### Capa 4 — main.js debug (canonica de nuevo)

`src/main.js:1078-1083`:
```js
const directions = [
  {name: 'North', dx: 0, dz: -1},  // canonica
  ...
];
```

## Consecuencias observables

1. **Mover hacia adelante** y luego **interactuar con puerta** apuntan a **direcciones opuestas** (cuando moves con W y la puerta esta delante visualmente).
2. Logs de debug muestran direcciones inconsistentes con movimiento real.
3. Minimap arrow direccion puede no coincidir con camera direccion.
4. Editar UNA tabla rompe el resto (efecto domino).

## Keymap completo actual

```
KeyW          → backward
KeyS          → forward
KeyA          → turnRight
KeyD          → turnLeft
ArrowUp       → backward
ArrowDown     → forward
ArrowLeft     → turnRight
ArrowRight    → turnLeft
KeyQ          → strafeLeft
KeyE          → strafeRight
Space         → interact
KeyT          → loadTest
KeyL          → loadTest
```

## Keybinds documentados pero NO mapeados

Segun README + `index.html` controls-help:

| Key | Documentado | Implementado |
|---|---|---|
| 1-5 | combat actions | NO |
| I | inventory | NO (en main.js es debugCurrentState() en keydown global) |
| C | character sheet | NO (es combat perf test) |
| ESC | game menu | NO |
| Space | confirm | si (interact) |
| M | open map | NO (es testMinimap debug) |
| P | (no documentado) | full diagnosis debug |
| F | (no documentado) | perf stats debug |
| T | (no documentado) | extended session test |
| R | (no documentado) | perf report |
| L | (no documentado) | cycle test levels |

Hay **2 listeners de keydown distintos**:
1. `InputManager` (mapea a action queue, processed por `MovementController`).
2. `main.js:158` `window.addEventListener('keydown')` — atrapa I/M/P/F/T/L/C/S/R **directo**, bypass InputManager.

## controls-help DOM dice una cosa, codigo hace otra

`index.html:62-65`:
```html
<span class="key">A/←</span> Turn Left
<span class="key">D/→</span> Turn Right
```

Pero InputManager: `KeyA → turnRight`. **Contradiccion al usuario.**

## Fix propuesto

### Paso 1 — `src/engine/core/Direction.js` (nuevo)

```javascript
export const Direction = Object.freeze({
  NORTH: 0, EAST: 1, SOUTH: 2, WEST: 3,
});

// Canonical grid table: z+ = South (down on screen)
const DELTAS = [
  { x: 0, z: -1 },  // N
  { x: 1, z: 0 },   // E
  { x: 0, z: 1 },   // S
  { x: -1, z: 0 },  // W
];

export const Dir = {
  forward: (dir) => DELTAS[dir],
  backward: (dir) => DELTAS[(dir + 2) % 4],
  left: (dir) => DELTAS[(dir + 3) % 4],
  right: (dir) => DELTAS[(dir + 1) % 4],
  turnLeft: (dir) => (dir + 3) % 4,
  turnRight: (dir) => (dir + 1) % 4,
  opposite: (dir) => (dir + 2) % 4,
  name: (dir) => ['North', 'East', 'South', 'West'][dir],
  toRadians: (dir) => dir * Math.PI / 2,
};
```

### Paso 2 — `Renderer.updateCameraRotation()` aplica conversion Three.js UNA vez

Si Three.js camera mira `-Z`, entonces grid N (`z=-1`) coincide con camera forward. Sin inversion en MovementController.

Si la camera de hecho mira `+Z` (configurado asi en Renderer), entonces ajustar SOLO el angulo en `Renderer.updateCameraRotation`, no las tablas grid.

### Paso 3 — InputManager normal

```js
this.keyMap = {
  'KeyW': 'forward', 'ArrowUp': 'forward',
  'KeyS': 'backward', 'ArrowDown': 'backward',
  'KeyA': 'turnLeft', 'ArrowLeft': 'turnLeft',
  'KeyD': 'turnRight', 'ArrowRight': 'turnRight',
  'KeyQ': 'strafeLeft', 'KeyE': 'strafeRight',
  'Space': 'interact',
  'Digit1': 'combatAction1', ... 'Digit5': 'combatAction5',
  'KeyI': 'openInventory',
  'KeyC': 'openCharacterSheet',
  'Escape': 'openMenu',
  'KeyM': 'openMap',
};
```

### Paso 4 — MovementController usa `Dir.forward(currentDirection)` etc

Borrar 4 tablas locales duplicadas.

### Paso 5 — main.js performInteraction usa `Dir.forward(direction)`

Borrar tabla local.

### Paso 6 — Sync controls-help

Actualizar `index.html`.

## Logger sugerido

```js
Logger.tag('Input').debug(`keydown ${event.code} → ${action.type}, queueSize=${this.actionQueue.length}, blocked=${this.inputBlocked}`);
Logger.tag('Movement').debug(`${actionType}: dir=${Dir.name(this.currentDirection)} pos=(${pos.x},${pos.z}) → (${target.x},${target.z}) blocked=${collision.blocked}`);
```

## Conclusion F6

Controles invertidos = sintoma. Causa = **3-4 tablas direccionales no coordinadas** + **2 listeners keydown competidores** + **comentarios codigo que mienten** + **controls-help DOM desincronizado**. Fix requiere **modulo Direction canonico** y limpieza atomica.
