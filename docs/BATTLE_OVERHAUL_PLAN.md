# Plan de Trabajo: Combat Visual Overhaul
## Arquitectura reactiva, asíncrona y con game feel

---

## DIAGNÓSTICO DEL ESTADO ACTUAL

| Componente | Existe | Estado |
|---|---|---|
| `CombatSystem` | ✓ | Síncrono, estados simples (5): INACTIVE/PLAYER_TURN/ENEMY_TURN/VICTORY/DEFEAT |
| `processAction()` | ✓ | Ya async pero sin cadena visual |
| `TargetingSystem` | ✓ | Lógica de filtros, sin overlay visual |
| `VisualEffectsSystem` | ✓ | Screen shake CSS (no Three.js), sin hit flash emissive |
| `CombatUI` | ✓ | Tarjetas DOM, sin física de resorte |
| `CombatAnimations` | ✓ | Placeholder, sin step forward/back |
| `Renderer` | ✓ | Three.js, sin shake de cámara, sin SpotLight dinámico |
| **BattleFSM** | ✗ | No existe |
| **Bezier targeting overlay** | ✗ | No existe |
| **Ballistic combat text** | ✗ | No existe |
| **Hit stop / emissive flash** | ✗ | No existe |
| **Spring physics (tarjetas)** | ✗ | No existe |
| **Battle background shader** | ✗ | No existe |
| **Visible enemies en mapa** | ✗ | No existe |
| **Screen shatter transition** | ✗ | No existe |
| **Grid 3D con entity sizing** | ✗ | No existe |

---

## DEPENDENCIAS CRÍTICAS

```
BattleFSM ──────────────────┬──► Card Physics (estado PLAYER_INPUT_ACTION)
                             ├──► Vignette/Spotlight (estado PLAYER_INPUT_TARGETING)
                             └──► Bezier Overlay (estado PLAYER_INPUT_TARGETING)

Async Action Chain ──────────┬──► Hit Stop + Hit Flash
                             ├──► Screen Shake (cámara Three.js)
                             ├──► Ballistic Damage Numbers
                             └──► Step Forward / Step Back

Battle Grid 3D ──────────────┬──► Entity Sizing (Goblin 1x1, Dragón 2x4)
                             └──► Step Forward destino correcto

BattleFSM + Async Chain ─────► TODO lo demás depende de estas dos
```

---

## FASE 1 — NÚCLEO: Battle FSM Asíncrona
**Prioridad: BLOQUEANTE. Nada visual puede existir sin esto.**

### Tareas:
1. **Crear `src/engine/combat/BattleFSM.js`**
   - 6 estados: `BATTLE_INIT | TURN_START | PLAYER_INPUT_ACTION | PLAYER_INPUT_TARGETING | ACTION_RESOLUTION | TURN_END`
   - Cada transición: `async transition(newState)` retorna Promise
   - Guard: si estado === `ACTION_RESOLUTION`, bloquear todos los inputs (flag global)
   - Eventos emitidos: `battleStateChange` (CustomEvent window)

2. **Refactorizar `CombatSystem` para delegar a BattleFSM**
   - Los 5 estados actuales mapean a los 6 nuevos
   - `initializeCombat()` → entra a `BATTLE_INIT`
   - `processAction()` → entra a `ACTION_RESOLUTION`, retorna a `TURN_END`
   - `handleEnemyTurn()` → también pasa por `ACTION_RESOLUTION`

3. **Bloqueo de inputs por estado**
   - `InputManager.blockInput()` se llama al entrar en `ACTION_RESOLUTION`
   - `InputManager.unblockInput()` al salir de `TURN_END`

**Entregable:** FSM navegable. `window.dungeonEngine.combatSystem.fsm.currentState` visible en DevTools.

---

## FASE 2 — NÚCLEO: Cadena Asíncrona de Acciones (Delay-Chain)
**Prioridad: BLOQUEANTE para todos los módulos visuales de impacto.**

### Tareas:
1. **Crear `src/engine/combat/BattleActionExecutor.js`**
   - Implementa `executeBattleAction(action, attacker, targets)` según spec:
     ```
     await attacker.stepForward()
     await triggerProjectileOrLineEffect()
     for target: await Promise.all([hitEffects, combatText, screenShake])
     await attacker.stepBack()
     ```
   - Stubs vacíos para cada paso (se rellenan en fases posteriores)
   - `CombatSystem.processAction()` delega aquí dentro del estado `ACTION_RESOLUTION`

2. **Interfaz de entidad combatiente (`CombatantEntity`)**
   - Cada personaje/enemigo expone: `stepForward()`, `stepBack()`, `playIdleAnimation()`, `playHitAnimation()`
   - Por ahora, stubs que retornan `Promise.resolve()` inmediatamente
   - Se reemplazarán con animaciones Three.js en Fase 7

**Entregable:** Combate funciona igual que antes, pero internamente secuenciado por awaits. Log muestra orden correcto.

---

## FASE 3 — ESTRUCTURA: Battle Grid 3D con Entity Sizing
**Depende de: Fase 1 (saber cuándo estamos en combate)**

### Tareas:
1. **Crear `src/engine/combat/BattleGrid.js`**
   - Grilla separada de la grilla de exploración
   - División espacial: mitad izquierda (jugadores), mitad derecha (enemigos)
   - Coordenadas Three.js calculadas desde posición de grilla
   - `occupyCells(entityId, x, y, width, height)` — previene solapamiento

2. **Schema de dimensiones de entidad**
   - Campo `gridSize: { w, h }` en `EnemyDatabase` (Goblin: 1x1, Beholder: 2x2, etc.)
   - `BattleGrid.placeEntity(entity)` calcula offset y centro del mesh

3. **Integrar en `BattleFSM.BATTLE_INIT`**
   - Al iniciar combate, instanciar BattleGrid y posicionar meshes de entidades

**Entregable:** Entidades combatientes en posiciones correctas sin solapamiento.

---

## FASE 4 — VISUAL: Física de Tarjetas (Spring Physics)
**Depende de: Fase 1 (estados FSM para saber cuándo mostrar tarjetas)**

### Tareas:
1. **Crear `src/engine/ui/CardPhysics.js`**
   - Ley de Hooke: `F = -k*x - c*v` por tarjeta
   - Loop `requestAnimationFrame` propio
   - CSS variables: `--card-rot-x`, `--card-rot-y`, `--card-translate-y`, `--card-scale`
   - `onMouseMove(deltaX, deltaY)` → actualiza velocidades
   - `onMouseLeave()` → deja oscilar hasta equilibrio

2. **Idle Sway pasivo**
   - `sin(TIME * freq + offset)` individual por tarjeta
   - Offset aleatorio en construcción (evita sincronía)
   - Amplitud: ~3px vertical, ~1.5° rotación

3. **Validación AP y bloqueo visual**
   - Si `card.cost > character.currentAP`: `filter: grayscale(100%) brightness(35%) contrast(80%)` + `pointer-events: none`
   - Se recalcula al cambiar de turno

4. **Integrar CardPhysics en `CombatUI`**
   - Al renderizar tarjetas en `PLAYER_INPUT_ACTION`, adjuntar instancia CardPhysics

**Entregable:** Tarjetas flotan, se inclinan con mouse, rebotan al soltar.

---

## FASE 5 — VISUAL: Hit Stop + Hit Flash + Screen Shake (Three.js)
**Depende de: Fase 2 (async chain para timing exacto)**

### Tareas:
1. **Hit Stop**
   - `BattleActionExecutor` pausa el delta visual del game loop 60–100ms
   - Flag `Renderer.pauseVisualUpdates = true` durante ese tiempo
   - `setTimeout` para reanudar

2. **Hit Flash (emissive Three.js)**
   - Crear `src/engine/combat/HitFlashSystem.js`
   - `flash(mesh, type)`: modifica `mesh.material.emissive` a `0xffffff` (físico) o `0xff2200` (fuego)
   - Dura exactamente 3 frames de render, luego lerp suave a emissive original

3. **Screen Shake (cámara Three.js)**
   - Crear `src/engine/core/ScreenShake.js`
   - `trigger(force)`: asigna `shakeIntensity = force`
   - En render loop: `camera.position += (Math.random()-0.5) * shakeIntensity` en XYZ
   - `shakeIntensity *= 0.9` por frame (decay exponencial)
   - Reemplaza el CSS shake actual en `VisualEffectsSystem`

4. **Partículas de energía**
   - 10–15 planos texturizados, dispersión radial desde centro del mesh
   - Scale → 0 en 0.4s con `requestAnimationFrame`

**Entregable:** Golpes se "sienten". Cámara tiembla. Enemigos flashean.

---

## FASE 6 — VISUAL: Números de Daño Balísticos
**Depende de: Fase 2 (spawn en momento exacto del impacto)**

### Tareas:
1. **Crear `src/engine/ui/CombatTextManager.js`**
   - Contenedor `#combat-text-layer` con `position: absolute; pointer-events: none; z-index: 1000`
   - `spawnText(damage, screenPos, isCritical)`:
     - Crea elemento DOM en `screenPos`
     - Física de parábola: `vx` aleatorio, `vy` negativo inicial, `gravity += 0.5` por frame
     - Opacidad decae a 0 en ~1.2s

2. **Escala y jerarquía crítica**
   - Normal: scale pop 150% → elástico a 100%
   - Crítico: scale pop 250%, fuente pesada, color dorado/rojo, `text-shadow` alta intensidad, temblor caótico primeros 10 frames

3. **Proyección 3D → 2D para posicionamiento**
   - `Renderer.worldToScreen(vector3)` usando `THREE.Vector3.project(camera)` + viewport
   - Posición inicial del texto = posición proyectada del mesh impactado

**Entregable:** Números saltan y caen en arco desde la posición del enemigo en pantalla.

---

## FASE 7 — VISUAL: Indicador de Turno + Step Forward/Back
**Depende de: Fase 2 (stubs de stepForward/stepBack), Fase 3 (grid para destino)**

### Tareas:
1. **Implementar `stepForward()` y `stepBack()` en CombatantEntity**
   - Lerp lineal de posición 3D: 10% hacia centro de arena
   - Duración: ~0.3s usando `requestAnimationFrame`
   - Retorna Promise que resuelve al terminar

2. **Idle acentuado del turno activo**
   - Entidad activa: frecuencia y amplitud senoidal +35% vs entidades en espera
   - Cambio suave al tomar/perder turno

**Entregable:** Entidad activa avanza, ataca, regresa. Animación idle diferenciada.

---

## FASE 8 — VISUAL: Targeting Avanzado (Bezier + Vignette)
**Depende de: Fase 1 (estado PLAYER_INPUT_TARGETING), Fase 3 (posiciones 3D)**

### Tareas:
1. **Canvas 2D overlay para línea Bézier**
   - `<canvas id="targeting-overlay">` con `position: fixed; top:0; left:0; pointer-events: none`
   - Al entrar en `PLAYER_INPUT_TARGETING`: canvas activo
   - `drawBezierIntent(fromDOM, toWorld3D)`:
     - `fromDOM`: centro de la tarjeta seleccionada en DOM
     - `toWorld3D`: `worldToScreen()` de entidad objetivo bajo cursor
     - Curva Bézier cuadrática con puntos intermedios estilo Slay the Spire
     - Segmentos discontinuos (círculos o flechas)
   - Cancel con Escape → volver a `PLAYER_INPUT_ACTION` sin coste AP

2. **Vignette teatral**
   - Al entrar en `PLAYER_INPUT_TARGETING`: `ambientLight.intensity *= 0.4`
   - Gradiente radial CSS periférico (overlay DOM)
   - Al salir: reverso suave

3. **Spotlight en objetivos válidos**
   - `THREE.SpotLight` desde eje superior sobre cada objetivo válido
   - Hover sobre objetivo: reticula circular concéntrica en el suelo, rotación angular constante

**Entregable:** Targeting cinematográfico. Línea Bézier sigue al cursor. Pantalla oscurece excepto objetivos.

---

## FASE 9 — VISUAL: Fondos de Batalla Procedurales
**Depende de: Fase 1 (BATTLE_INIT), independiente de otras fases visuales**

### Tareas:
1. **Diccionario level ID → fondos**
   - `BattleBackgroundManager.js`: objeto JS mapea `"crypt-of-shadows-floor-1"` → paleta oscura/gótica
   - Selección aleatoria de entre lista para cada ID

2. **Shader de fondo (Canvas 2D o Three.js PlaneGeometry)**
   - Iterative UV Warping con funciones trigonométricas + tiempo
   - Paletas: morado oscuro, negro, verde necromántico según tema de nivel
   - Actualizado en render loop con variable TIME

**Entregable:** Fondo animado hipnótico durante combate, tonos acorde al dungeon.

---

## FASE 10 — MAPA: Entidades Visibles + Transición Dramática
**Semi-independiente, puede implementarse en paralelo con Fase 9**

### Tareas:
1. **Sprites/meshes de enemigos en mapa 3D**
   - `EncounterSystem` instancia meshes visibles en grid
   - AABB collision detection al moverse el jugador
   - Al colisionar: freeze de movimiento 1.5s

2. **Toast de encuentro**
   - Elemento DOM centrado con fade-out CSS
   - Textos dinámicos: "¡Emboscada! X ataca primero" / "Te encuentras con X"

3. **Screen Shatter (transición)**
   - Screenshot del canvas Three.js (`.toDataURL()`)
   - CSS Grid divide imagen en N bloques
   - Bloques salen disparados en direcciones opuestas (transform + transition)
   - Revela la arena de combate 3D debajo

**Entregable:** Enemigos visibles en dungeon. Transición de entrada al combate cinematográfica.

---

## RESUMEN DE FASES

| Fase | Módulo | Tipo | Bloquea a |
|------|--------|------|-----------|
| 1 | BattleFSM | Core | Todo |
| 2 | Async Action Chain | Core | 5, 6, 7, 8 |
| 3 | Battle Grid 3D | Estructura | 7, 8 |
| 4 | Card Spring Physics | Visual UI | — |
| 5 | Hit Stop/Flash/Shake | Visual Impacto | — |
| 6 | Ballistic Damage Text | Visual UI | — |
| 7 | Step Forward/Back + Idle | Visual 3D | — |
| 8 | Targeting Bezier + Vignette | Visual UI+3D | — |
| 9 | Battle Backgrounds | Visual 3D | — |
| 10 | Visible Enemies + Shatter | Mapa/Transición | — |

**Fases 1 y 2 son bloqueantes. Fases 4–10 pueden ejecutarse en orden flexible una vez 1+2+3 estén listas.**

---

## ARCHIVOS NUEVOS A CREAR

```
src/engine/combat/BattleFSM.js
src/engine/combat/BattleActionExecutor.js
src/engine/combat/BattleGrid.js
src/engine/combat/HitFlashSystem.js
src/engine/core/ScreenShake.js
src/engine/ui/CardPhysics.js
src/engine/ui/CombatTextManager.js
src/engine/ui/BattleBackgroundManager.js
src/engine/ui/TargetingOverlay.js
```

## ARCHIVOS A REFACTORIZAR

```
src/engine/combat/CombatSystem.js     — delegar a BattleFSM + BattleActionExecutor
src/engine/combat/TargetingSystem.js  — integrar con TargetingOverlay + cancel state
src/engine/ui/CombatUI.js             — integrar CardPhysics
src/engine/ui/CombatUIManager.js      — escuchar battleStateChange events
src/engine/ui/VisualEffectsSystem.js  — reemplazar CSS shake con ScreenShake Three.js
src/engine/core/Renderer.js           — exponer worldToScreen(), integrar ScreenShake
src/engine/systems/EncounterSystem.js — spawn visible meshes, AABB collision
src/engine/data/EnemyDatabase.js      — agregar campo gridSize { w, h }
```
