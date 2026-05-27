# Análisis Profundo de Repos de Referencia — v2

Repos analizados:
- **darkmoor** (ntk4/darkmoor) — Java/libGDX, remake completo de Eye of the Beholder II
- **Lands of Lore JS** (stephan-romhart) — Port vanilla JS del motor Westwood 1993

Proyecto destino: `C:\Milton\rpg_01` — vanilla ES6 + Three.js r128, sin bundler, combate por turnos, movimiento en grilla.

---

## GRÁFICOS Y RENDERIZADO

---

### 1. Minimapa Fog-of-War con Shapes de Corredor

**Fuente:** `js/automap.js` (LoL JS, 7.5 KB, completamente funcional)

**Qué hace:**
Cada tile tiene flag `explored: 0/1`. Al moverse el jugador, `setTileAsExplored(x, y)` marca el tile actual + vecinos en patrón de cono. El `automap.draw()` itera tiles, solo renderiza `explored == 1`, y usa detección de vecinos (N/S/E/W) para elegir entre 16 formas de sprite de corredor. También dibuja puertas y teleports con símbolos distintos y leyenda.

```javascript
// automap.js — lógica de detección de vecino norte/sur/este/oeste:
if (!this.isNotSolid(x, y-1)) {   // norte = pared
  if (!this.isNotSolid(x-1, y)) { // oeste = pared
    spritePos = 12; // esquina NW
  } else {
    spritePos = 4;  // corredor abierto al oeste
  }
}
// 16 variantes de spritePos según combinación de vecinos
```

**Qué nos falta:** `updateMinimap()` en `main.js` renderiza TODOS los tiles al cargar nivel. Sin exploración progresiva.

**Cómo portar:**
1. Agregar a `GridSystem.js` → `tile.explored = false` en `buildGrid()`
2. En `MovementController.js` `movementCompleted` → `this._grid.setTileExplored(x, z)` (marca tile + 4 vecinos)
3. En `main.js:updateMinimap()` → agregar `if (!tile.explored) { cell.style.visibility = 'hidden'; continue; }`
4. En `DungeonLoader.js` `loadLevel()` → marcar spawn tile: `gridSystem.setTileExplored(spawn.x, spawn.z)`

**Esfuerzo:** ~2h. Sin archivos nuevos. Alta recompensa atmosférica.

---

### 2. Sistema de Animaciones de Cámara (State Machine)

**Fuente:** `js/map.js` (LoL JS) — `Map.cameraAnimation` state machine frame-based

**Qué hace:**
`cameraAnimation` es un objeto con `action` (string) y `frame` (contador). Cada frame del game loop llama `handleCameraAnimation()` que despacha a `cameraAnimation${action}()`. Acciones implementadas:

| Acción | Efecto | Frames |
|--------|--------|--------|
| `StepForward` | zoom 1.1 → 1.0 | 4 frames |
| `StepBackward` | zoom 0.95 → 1.0 | 4 frames |
| `StepLeft/Right` | offset X -53→-83→0 con `tempMap` | 3 frames |
| `TurnLeft/Right` | offset X ±230→±310→0 con `tempMap` | 3 frames |
| `WallHit` | zoom 1.05→1.0 (frontal) / offset lateral | 5 frames |
| `Fade` | opacity 1→0 / 0→1 | 20 frames |

El `tempMap` es un segundo render del estado anterior para efectos de transición.

**Qué nos falta:** Movimiento instantáneo (snap). `MovementController.js` tiene interpolación de posición pero sin animación de zoom de cámara. Giros instantáneos.

**Cómo portar:**
```javascript
// En Renderer.js o main.js — agregar sistema de animación de cámara:
class CameraAnimator {
  constructor(camera) {
    this._camera = camera;
    this._anim = null;
  }
  startWallHit(direction) {
    this._anim = { action: 'wallHit', direction, frame: 0, maxFrames: 5 };
  }
  startTurn(dir) { // 'left'|'right'
    this._anim = { action: 'turn', dir, frame: 0, maxFrames: 3 };
  }
  update() {
    if (!this._anim) return;
    if (this._anim.action === 'wallHit') {
      const t = this._anim.frame / this._anim.maxFrames;
      this._camera.fov = 75 + Math.sin(t * Math.PI) * 5; // bump FOV
      this._camera.updateProjectionMatrix();
    }
    if (++this._anim.frame >= this._anim.maxFrames) this._anim = null;
  }
}
```
Escuchar `movementBlocked` → `startWallHit()`. Integrar en game loop `render()`.

**Esfuerzo:** Camera bump: ~2h. Animaciones de paso/giro completas: ~6h.

---

### 3. Sistema de Texturas por Profundidad

**Fuente:** `js/textures.js` + `js/map.js` (LoL JS)

**Qué hace:**
`Textures.getTextureSetFileList(textureSetId)` genera paths de PNG para combinación de:
- **Profundidad:** 0 (enfrente) → 3 (lejos)
- **Tipo:** ceiling / floor / wall
- **Posición:** left / center / right / frontal

Resultado: ~36 PNGs por texture-set. Los tiles almacenan `textures[textureId]` que mapea a textureSetId. La perspectiva se crea mostrando los PNGs correctos según profundidad.

```javascript
// Nombre generado: 'textures/dungeon1/wall-1-left.png'
// textureSet['file_1_wall_left'] = Config.image_folder + 'textures/' + textureSetId + '/wall-1-left.png'
```

**Qué nos falta:** Three.js maneja esto mejor con geometría 3D real. No portar directamente. Pero el concepto de múltiples texture-sets por nivel (cada Maze en darkmoor tiene `wallTilesetName`) sí vale.

**Lo que vale rescatar:** El sistema de `textureSets[]` por nivel en el JSON del mapa — cada nivel puede declarar múltiples conjuntos de texturas y los tiles referencian por ID. Nuestro `DungeonLoader.js` ya soporta temas pero con un solo set.

**Esfuerzo:** N/A para el renderizado 2D. Para soporte multi-textureset en niveles: ~2h.

---

### 4. Sprite 2D con Escalado por Profundidad

**Fuente:** `js/sprite.js` + `js/map.js getSpriteZoomData()` (LoL JS)

**Qué hace:**
`Sprite.draw(dx,dy,dw,dh,sx,sy,sw,sh)` dibuja sprites de canvas con soporte de zoom (`Config.canvas_zoom`). `getSpriteZoomData(zoomX, zoomY, textureSize, spriteX, spriteY)` calcula posición y escala de sprite según su distancia al jugador. El centro Y está desplazado 28px arriba del centro de la ventana.

```javascript
// map.js getSpriteZoomData:
var y_center = (Config.window_height / 2) - 28; // sprites no centran exactamente
// Calcula destination rect para billboard sprite en perspectiva
```

**Relevancia para nosotros:** Three.js maneja sprites 3D con `THREE.Sprite`. Este concepto es útil si se quieren sprites 2D sobre el viewport 3D (NPCs, items en suelo visibles desde exploración).

**Esfuerzo:** ~3h para sistema de sprites 2D overlay sobre canvas Three.js.

---

### 5. Decoración por Cara de Tile con Hooks

**Fuente:** `Decoration.java` + `DecorationSet.java` (darkmoor)

**Qué hace:**
Cada tile tiene decoraciones independientes por cara (N/S/E/W). Cada `Decoration` tiene:
- `textureIds[16]` — textura por posición de ViewField
- `location[16]` — posición en pantalla por ViewField position
- `swap[16]` — flip horizontal por ViewField position
- `onBashId`, `onHackId`, `onClickId` — IDs de acción al interactuar
- `blocking` — si el jugador puede pasar a través
- `forceDisplay` — ignora culling por profundidad
- `hideItems` — oculta items en este tile (cache secreto)

```java
// Ejemplo: barril en cara norte del tile, clickable
decoration.setTextureId(ViewFieldPosition.M, 5);  // cerca, centro
decoration.setTextureId(ViewFieldPosition.H, 3);  // medio, centro
decoration.setOnClickId(42);  // script ID 42 al hacer click
decoration.setBlocking(false); // no bloquea movimiento
```

**Qué nos falta:** `ZoneTriggerSystem.js` maneja triggers por tile pero sin componente visual de decoración por cara. Props son geometría Three.js, no sprites por cara.

**Cómo portar:**
Agregar a schema JSON de tiles:
```json
"decorations": {
  "north": { "id": "barrel", "onClickScript": "open_barrel_42", "blocking": false },
  "east": { "id": "torch", "emitsLight": true }
}
```
En `DungeonLoader.js`, crear sprites `THREE.Sprite` posicionados en la cara correcta.

**Esfuerzo:** ~1 día. Nuevo schema de tiles + renders en DungeonLoader.

---

### 6. Brújula Dinámica

**Fuente:** `Compass.java` (darkmoor)

**Qué hace:**
`Compass.CardinalPoint`: North(0), South(1), West(2), East(3). `CompassRotation`: Rotate90/180/270. Matriz `DIRECTIONS_FROM_VIEWS[4][4]` para calcular qué cardinal corresponde visualmente en relación al punto de vista actual. Método `rotate(direction, rotation)` para girar entidades.

```java
// DIRECTIONS_FROM_VIEWS — desde perspectiva Norte, ver al Oeste = estás mirando hacia Oeste
static CardinalPoint[][] = {
  {North, South, West, East},  // mirando Norte
  {South, North, East, West},  // mirando Sur
  {West,  East,  South, North}, // mirando Oeste
  {East,  West,  North, South}  // mirando Este
};
```

**Qué nos falta:** El HUD de brújula en `ExplorationHUD.js` ya existe pero no calcula direcciones relativas para mostrar qué hay a izquierda/derecha según orientación actual.

**Cómo portar:** Agregar a `Direction.js` el método `getRelativeDirection(facing, absolute)` usando la misma matriz. El HUD puede mostrar "←W  N→  E" cuando miras Norte.

**Esfuerzo:** ~1h. Sin archivos nuevos.

---

## MECÁNICAS DE COMBATE

---

### 7. Dados XdY+Z

**Fuente:** `Dice.java` (darkmoor)

**Qué hace:**
Encapsula expresión de dado: `diceThrows × faces + modifier`. `roll()` tira todos los dados y suma. `getD20(count)` tira N d20s. `DCType` enum para dificultad de chequeos: VeryEasy(0), Easy(10), Average(15), Tough(15), Challenging(...), NearlyImpossible(40). XML serializable: `<dice throws="2" faces="6" modifier="3"/>`.

```java
new Dice(2, 6, 3).roll(); // 2d6+3 → entre 5 y 15
Dice.getD20(1) >= DCType.Average.value(); // chequeo promedio
```

**Qué nos falta:** `EnemyDatabase.js` usa `{ atk: { min: 5, max: 10 } }` — rango plano sin expresión de dado. No hay sistema de chequeos de habilidad.

**Port JS:**
```javascript
// src/engine/utils/Dice.js
export class Dice {
  constructor(throws, faces, modifier = 0) {
    this.throws = throws; this.faces = faces; this.modifier = modifier;
  }
  static parse(expr) {
    const m = expr.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!m) throw new Error(`Invalid dice expr: ${expr}`);
    return new Dice(+m[1], +m[2], m[3] ? +m[3] : 0);
  }
  roll() {
    let v = 0;
    for (let i = 0; i < this.throws; i++) v += Math.floor(Math.random() * this.faces) + 1;
    return v + this.modifier;
  }
  get min() { return this.throws + this.modifier; }
  get max() { return this.throws * this.faces + this.modifier; }
  toString() { return `${this.throws}d${this.faces}${this.modifier >= 0 ? '+' : ''}${this.modifier}`; }
}

export const DC = { VeryEasy: 0, Easy: 10, Average: 15, Tough: 20, Hard: 25, NearlyImpossible: 40 };
```

**Esfuerzo:** 1h archivo nuevo. +3h migrar EnemyDatabase + ItemDatabase a sintaxis de dados.

---

### 8. CriticalHit Configurable: Rango + Multiplicador

**Fuente:** `CriticalHit.java` (darkmoor)

**Qué hace:**
Cada arma/skill tiene `minimum`, `maximum` (rango de roll), y `multiplier`. Default: rolls 20–20 × 2. Una espada élfica podría ser 19–20 × 2; hacha legendaria 17–20 × 3.

```java
CriticalHit crit = new CriticalHit(); // min=20, max=20, multiplier=2
crit.isCriticalHit(roll); // roll >= min && roll <= max
damage *= crit.getMultiplier(); // daño × multiplicador
```

**Qué nos falta:** `ActionResolver.js` usa `critChance` como porcentaje plano (ej. 15%). Bug conocido: Rogue puede mostrar >100% crit. Sin multiplicador configurable.

**Port JS (en `CombatBalanceConfig.js`):**
```javascript
static CRIT_DEFAULTS = { minimum: 19, maximum: 20, multiplier: 2 };
// En ActionResolver.resolveAction():
const roll = Math.floor(Math.random() * 20) + 1;
const critCfg = action.critConfig ?? character.critConfig ?? CombatBalanceConfig.CRIT_DEFAULTS;
const isCrit = roll >= critCfg.minimum && roll <= critCfg.maximum;
const finalDamage = baseDamage * (isCrit ? critCfg.multiplier : 1);
```
Items en `ItemDatabase` agregan `critConfig: { minimum: 18, maximum: 20, multiplier: 3 }`.

**Esfuerzo:** ~2h. Corrige el bug del Rogue como efecto secundario.

---

### 9. Sistema de Defensa y Resistencias

**Fuente:** `Defense.java` (darkmoor — campo muy minimal, solo shell)

**Qué hace realmente en darkmoor:**
`Defense` es una clase de datos que encapsula valores de armadura/resistencia. Los monstruos tienen campos específicos:
- `poisonImmunity` (bool) — inmune a veneno
- `canSeeInvisible` (bool) — ve invisibilidad
- `backRowAttack` (bool) — puede atacar desde fila trasera
- `hasHealMagic` (bool) — puede curarse con magia

**Qué nos falta:** `Enemy.js` tiene `baseStats.DEF` plano. Sin resistencias elementales ni inmunidades. `ActionResolver.js` aplica DEF como reducción plana.

**Cómo extender:**
```javascript
// En EnemyDatabase addEnemy():
resistances: {
  fire: 0.5,      // 50% resistencia al fuego
  ice: 0,         // sin resistencia al hielo
  poison: 'immune', // inmune a veneno
  physical: 0      // sin resistencia física
},
immunities: ['sleep', 'paralysis'],
flags: { canSeeInvisible: false, backRowAttack: true, hasHealMagic: false }
```

**Esfuerzo:** ~3h. Ampliar schema de EnemyDatabase + leer resistencias en ActionResolver.

---

### 10. Secuencia de Ataque (NWN2-style)

**Fuente:** `Attack.java` (darkmoor)

**Qué hace:**
Modelado según NWN2: attack roll d20 + `baseattackbonus` + `modifier` + `sizemodifier` - `rangepenality`. Rango calculado como distancia euclidiana entre atacante y objetivo. Distingue entre **atacar** (intento) y **dañar** (éxito confirmado).

```java
// Attack.java:
int baseattackbonus = 0;
int modifier = 0;        // stat modifier
int sizemodifier = 0;    // size penalty/bonus
int rangepenality = 0;   // distance penalty
// roll d20 + bonuses vs target AC
```

**Qué nos falta:** `ActionResolver.js` calcula daño directo sin roll to-hit separado. No hay chance de miss basada en precisión vs evasión.

**Cómo portar:**
```javascript
// En ActionResolver.js:
const attackRoll = Math.floor(Math.random() * 20) + 1 + attacker.stats.ATK_BONUS;
const targetAC = defender.stats.DEF + defender.stats.EVASION;
if (attackRoll < targetAC) return { hit: false, damage: 0, missed: true };
// si hit → calcular daño
```

**Esfuerzo:** ~3h. Requiere nuevas stats (`ATK_BONUS`, `EVASION`) en Character y Enemy.

---

### 11. Saving Throws

**Fuente:** `SavingThrowType.java` (darkmoor)

**Qué hace:**
3 tipos de saving throw, mapeados a stats del personaje:

| Tipo | Stat | Casos de uso |
|------|------|--------------|
| `Fortitude` | Constitución | Veneno, parálisis, enfermedad |
| `Reflex` | Destreza | Explosiones, daño en área (mitad de daño al pasar) |
| `Will` | Sabiduría | Hechizos mentales, dominación, miedo |

**Qué nos falta:** Skills y hechizos no tienen `savingThrowType`. Sin mecánica de resistencia de hechizos.

**Cómo portar:**
```javascript
// En SkillSystem.js — agregar a skills que lo requieran:
{ id: 'sleep_spell', savingThrow: 'Will', savingThrowDC: 15 }

// En ActionResolver.js:
if (action.savingThrow) {
  const stat = { Fortitude: 'CON', Reflex: 'DEX', Will: 'WIS' }[action.savingThrow];
  const roll = Math.floor(Math.random() * 20) + 1 + Math.floor((target.stats[stat] - 10) / 2);
  if (roll >= action.savingThrowDC) return { effect: 'resisted', damage: 0 };
}
```

**Esfuerzo:** ~2h. Alta profundidad de juego por poco esfuerzo.

---

### 12. Posicionamiento Frontal/Trasero del Partido

**Fuente:** `Team.java` (darkmoor) + `Hero.java`

**Qué hace:**
`Team` mantiene formación del partido. `isHeroInFront(hero)` determina si un héroe está en fila frontal. `getFrontEntity(SquarePosition position)` obtiene el personaje frontal en posición NW/NE/SW/SE/Center. Héroes en fila trasera no pueden atacar en combate físico, solo con armas de rango.

```java
// Hero.java:
if (team.isHeroInFront(this)) {
  attacks[hand.value()] = new Attack(this, target, weapon);
} else {
  handActions[hand.value()] = new HandAction(ActionResult.CantReach); // no alcanza
}
```

**Qué nos falta:** `PartyManager.js` tiene `party[]` array plano. Sin distinción front/back row. Todos los personajes atacan a cualquier enemigo sin restricción de posición.

**Cómo portar:**
```javascript
// En PartyManager.js:
this.frontRow = []; // índices 0-1
this.backRow = [];  // índices 2-3

// En TargetingSystem.js:
if (character.row === 'back' && action.type === 'attack' && !action.ranged) {
  return { valid: false, error: 'Back row cannot reach enemies' };
}
```
UI en `CombatUI.js`: mostrar formación 2×2 con drag-and-drop para cambiar posiciones.

**Esfuerzo:** ~4h. Fundamental para profundidad táctica.

---

## ENEMIGOS Y AI

---

### 13. Estructura Completa de Monster

**Fuente:** `Monster.java` (darkmoor, ~500 líneas)

**Campos relevantes:**
```java
String name, weaponName;
Item weapon;                    // arma equipada
MonsterBehaviour currentBehaviour; // AI state
CardinalPoint direction;        // cara actual
boolean hasHealMagic;           // puede curarse
byte detectionRange;            // rango de detección del partido
int sightRange;                 // rango visual
boolean smartAI;                // abre puertas, usa palancas, lanza hechizos
boolean teleports;              // puede teletransportarse
float pickupRate;               // probabilidad de recoger items del suelo
float stealRate;                // probabilidad de robar al partido
boolean backRowAttack;          // puede atacar desde fila trasera
boolean canSeeInvisible;        // ve personajes invisibles
int attackSpeed;                // ms mínimos entre ataques
boolean poisonImmunity;
boolean canMove;
SquarePosition position;        // sub-posición en tile (NW/NE/SW/SE)
int reward;                     // XP/oro al morir
int texture;                    // frame de textura actual
```

**Qué nos falta en `Enemy.js`:**
Sin `detectionRange`/`sightRange` (todos detectan al instante). Sin `smartAI`. Sin `pickupRate`/`stealRate`. Sin sub-posición en tile. Sin `hasHealMagic` flag.

**Cómo ampliar `EnemyDatabase.js`:**
```javascript
this.addEnemy('skeleton_warrior', {
  tier: 1,
  baseStats: { HP: 30, ATK: 8, DEF: 4, SPD: 6 },
  aiType: 'aggressive',
  detectionRange: 3,   // detecta al partido a 3 tiles
  sightRange: 5,       // lo ve a 5 tiles
  smartAI: false,      // no abre puertas
  pickupRate: 0.1,     // 10% de recoger items
  stealRate: 0,
  hasHealMagic: false,
  poisonImmunity: false,
  reward: 45           // XP al morir
});
```

**Esfuerzo:** ~2h para ampliar schema. ~1 día para conectar detectionRange/sightRange a `EncounterSystem.js`.

---

### 14. Comportamiento Grupal (Team / MonsterBehaviour)

**Fuente:** `Team.java` + `Monster.java` (darkmoor)

**Qué hace:**
Monstruos tienen `MonsterBehaviour currentBehaviour` (state machine de AI individual). `Team.getFrontEntity(pos)` para posicionamiento relativo. Monstruos con `smartAI=true` pueden: abrir puertas, activar palancas, lanzar hechizos de curación a aliados, perseguir al partido en múltiples tiles.

`detectionRange` = radio en tiles donde el monstruo se activa y comienza a perseguir. `sightRange` = hasta dónde ve (para activación visual). Monstruos con `hasHealMagic` priorizan curar aliados bajos de HP antes de atacar.

**Qué nos falta:** `EnemyAI.js` tiene 4 arquetipos (Aggressive/Defensive/Tactical/Berserker) pero todos actúan idénticamente en exploración — no rastrean al partido entre tiles. Sin sistema de alerta.

**Cómo ampliar `EnemyAI.js`:**
```javascript
// Agregar states de AI de exploración:
updateExploration(enemy, playerPos, grid) {
  const dist = Math.abs(enemy.x - playerPos.x) + Math.abs(enemy.z - playerPos.z);
  if (dist <= enemy.detectionRange) {
    enemy.aiState = 'pursuing';
    // mover hacia jugador un tile por turno
  } else if (enemy.aiState === 'pursuing' && dist > enemy.sightRange) {
    enemy.aiState = 'idle';
    // volver a posición base
  }
}
```

**Esfuerzo:** ~1 día. Requiere integración con `GridSystem.js` para pathfinding básico (BFS).

---

## SISTEMAS DE MAPA Y NIVEL

---

### 15. WallSwitch — Palancas de Pared

**Fuente:** `actor/WallSwitch.java` (darkmoor)

**Qué hace:**
Actor en cara de tile. Campos: `reusable`, `wasUsed`, `activatedDecoration`/`deactivatedDecoration` (IDs de textura para estado on/off), `neededItem` (requiere item específico), `consumeItem` (lo consume), `side` (CardinalPoint — en qué cara está), `lockLevel` (nivel de traba, necesita ladrón para abrir). Tiene lista de `WallSwitchScript` — cada script define una acción en respuesta (abrir puerta, activar teleporter, etc.). Soporte para lock-picking con `pickLock()`.

```java
// Ejemplo: palanca que abre puerta y requiere ser pisada exacta
switch.setNeededItem("iron_key");
switch.setConsumeItem(false);
switch.setReusable(false);
switch.setActivatedDecoration(8);    // textura "palanca arriba"
switch.setDeactivatedDecoration(7);  // textura "palanca abajo"
```

**Qué nos falta:** `DoorSystem.js` maneja puertas pero sin palancas de pared. `ZoneTriggerSystem.js` tiene triggers por tile pero sin estado visual (decoración que cambia).

**Cómo portar:**
```json
// En tile JSON:
"wallSwitch": {
  "side": "north", "reusable": false,
  "neededItem": "iron_key", "consumeItem": false,
  "deactivatedSprite": "lever_down", "activatedSprite": "lever_up",
  "scripts": [{ "action": "openDoor", "target": { "x": 5, "z": 3 } }]
}
```
En `CollisionSystem.js` → al `onClickTile` → buscar wallSwitch → ejecutar scripts → cambiar textura.

**Esfuerzo:** ~1 día (nuevo TileActor system + scripts básicos).

---

### 16. PressurePlate — Placa de Presión

**Fuente:** `actor/PressurePlate.java` (darkmoor)

**Qué hace:**
Trigger automático al pisar. Campos: `scripts` (lista de `PressurePlateScript`), `decorationID` (textura — generalmente invisible en suelo). Eventos: `onTeamEnter` (activa scripts), `onTeamLeave`. Comparable a `ZoneTriggerSystem` pero con estado visual y scripting más potente.

**Qué nos falta:** `ZoneTriggerSystem.js` maneja `flavor_text` y `hud_message` pero sin efectos de gameplay (daño, activar puertas, spawner).

**Cómo portar:** Extender `ZoneTriggerSystem.js` con tipo de trigger `pressure_plate`:
```json
"triggers": [{ "type": "pressure_plate", "script": "spawn_trap", "once": true }]
```

**Esfuerzo:** ~3h ampliando ZoneTriggerSystem.

---

### 17. Pit — Trampa de Pozo

**Fuente:** `actor/Pit.java` (darkmoor)

**Qué hace:**
Tile que no bloquea movimiento (`canPassThrough=true`) pero aplica daño al pisar. Campos: `damage` (Dice — dado de daño), `hidden` (invisible hasta activar), `target` (DungeonLocation — dónde cae el partido), `difficulty` (chequeo de Reflex para evitar), `illusion` (pozo falso, sin daño), `monsterTrigger` (monstruos también caen).

```java
pit.setDamage(new Dice(1, 6, 0));  // 1d6 daño de caída
pit.setHidden(true);                // invisible hasta pisar
pit.setDifficulty(15);              // DC 15 Reflex para mitad de daño
pit.setTarget(new DungeonLocation(2, 3, "floor_2")); // cae al nivel inferior
```

**Cómo portar:** Nuevo tipo de tile `"pit"` en JSON. En `CollisionSystem.js`, al entrar en tile `type: 'pit'`:
```javascript
if (tile.type === 'pit') {
  if (!tile.hidden || tile.revealed) {
    const dmg = Dice.parse(tile.damage).roll();
    const saved = rollReflex(character) >= tile.difficulty;
    party.takeDamage(saved ? Math.floor(dmg/2) : dmg);
    if (tile.target) transitionSystem.teleportTo(tile.target);
  }
}
```

**Esfuerzo:** ~4h. Requiere Dice system primero.

---

### 18. Teleporter Configurable

**Fuente:** `actor/Teleporter.java` (darkmoor)

**Qué hace:** Actor en tile con `target` (DungeonLocation — mapId + posición + dirección de llegada). Seamless: el partido aparece en el tile destino mirando en la dirección definida.

**Qué tenemos:** `TransitionSystem.js` + `DoorSystem.js` ya manejan transiciones entre niveles. Los tiles de tipo `transition` en el JSON ya definen destino.

**Lo que falta:** Teletransportadores dentro del mismo nivel (sin cambio de piso). Agregar `"type": "teleporter"` en tiles además de `"type": "transition"`.

**Esfuerzo:** ~1h. `CollisionSystem.js` ya tiene código de transición.

---

### 19. ForceField — Campo de Fuerza

**Fuente:** `actor/ForceField.java` (darkmoor)

**Qué hace:**
Actor passable (`setBlocking(false)`, `setCanPassThrough(true)`) con 4 tipos:

| Tipo | Efecto |
|------|--------|
| `Spin` | Gira el partido (CompassRotation: 90/180/270°) |
| `Move` | Empuja al partido en dirección cardinal |
| `Block` | No se puede atravesar (en esa dirección) |
| `FaceTo` | Fuerza orientación al salir del tile |

Flags: `affectTeam`, `affectMonsters`, `affectItems` — permite ForceFields selectivos (ej. monstruos pasan, jugador no).

**Cómo portar:**
```json
// Tile JSON:
"forceField": { "type": "Spin", "spin": "Rotate180", "affectTeam": true, "affectMonsters": false }
```
En `CollisionSystem.js` al entrar en tile con `forceField`:
```javascript
if (tile.forceField?.type === 'Spin') {
  movementController.forceRotate(tile.forceField.spin); // gira 180° sin input
}
```

**Esfuerzo:** ~3h.

---

### 20. MazeZone — Zonas de Nivel con XP Multiplier

**Fuente:** `Maze.java` (darkmoor)

**Qué hace:** `Maze` contiene `ArrayList<MazeZone> zones`. Cada `MazeZone` define un área rectangular del nivel. `Maze.experienceMultiplier` por zona — permite que secciones profundas den más XP. También: `wallTilesetName` y `decorationName` por Maze completo (un piso = un set de texturas + decoraciones).

**Qué nos falta:** Nuestros niveles son un solo tema. Sin zonas con multiplicadores. `ExperienceSystem.js` da XP flat.

**Cómo portar:** Agregar a `levels/*.json`:
```json
"zones": [
  { "id": "crypt_entrance", "xpMultiplier": 1.0, "tiles": [[0,0],[8,8]] },
  { "id": "inner_sanctum", "xpMultiplier": 1.5, "tiles": [[9,9],[18,18]] }
]
```

**Esfuerzo:** ~2h.

---

## NARRATIVA Y SCRIPTING

---

### 21. CampDialog — Sistema de Campamento

**Fuente:** `CampDialog.java` (darkmoor)

**Qué hace:**
Menú de campamento accesible desde exploración. `BaseWindow` con sub-ventanas apiladas (`ArrayDeque<BaseWindow>`). Ventana principal (`MainWindow`) con opciones: descansar, memorizar hechizos, revisar personajes, guardar partida. Al descansar, restaura HP/SP y refresca slots de hechizos.

```java
CampDialog camp = new CampDialog(game, parentScreen);
// Dimensiones fijas: Rectangle(0, 0, 352, 288)
// Windows stack: permite sub-menús (ej. "Descansar" → "¿Cuántas horas?")
```

**Qué nos falta:** No hay sistema de descanso. `SaveSystem.js` permite guardar pero sin contexto de campamento. `SkillSystem.js` no restaura recursos al descansar.

**Cómo portar:**
```javascript
// Nuevo: src/engine/ui/CampUI.js
class CampUI {
  show() { /* overlay con opciones */ }
  async rest(hours) {
    await partyManager.restoreHP(hours);
    spellSystem?.restoreSlots();
    autoSaveManager.save('camp_rest');
    window.dispatchEvent(new CustomEvent('campRested', { detail: { hours } }));
  }
}
```
Activar con tecla `C` en exploración (actualmente `C` = combat perf test, reasignar).

**Esfuerzo:** ~1 día.

---

### 22. EventSquare — Tiles con Scripts de Narrativa

**Fuente:** `actor/EventSquare.java` (darkmoor — inferido de Square.java imports)

**Qué hace:** Actor especial en tile que dispara scripts en `OnTeamEnter`, `OnTeamStand`, `OnTeamLeave`. Base para cutscenes, diálogos NPC en tile, inicio de quests, locks de zona.

**Qué tenemos:** `ZoneTriggerSystem.js` ya implementa `triggers[]` con `once` flag — es esencialmente la misma idea. La diferencia es que darkmoor tiene scripts más ricos (cadenas, condicionales).

**Lo que vale rescatar:** El patrón de separar `onEnter`/`onStand`/`onLeave` — nuestro ZoneTriggerSystem solo tiene `onEnter` implícito. Agregar `"triggerOn": "leave"` para algunas narrativas.

**Esfuerzo:** ~1h. Ampliar ZoneTriggerSystem con `triggerOn` field.

---

### 23. Spell como Script Ejecutable

**Fuente:** `Spell.java` (darkmoor)

**Qué hace:**
Hechizo tiene `ScriptInterface<Spell> script` — al lanzar, ejecuta `script.getInstance().onCast(spell, hero)`. El script define el efecto real del hechizo. Campos del hechizo: `level` (nivel del slot), `heroClass` (qué clase puede usarlo), `range` (SpellRange enum), `duration`, `castingTime`, `description`.

```java
// Spell.java — el efecto real está en el script, no hardcoded:
public class FireballScript implements ISpellScript {
  public void onCast(Spell spell, Hero caster) {
    // daño en área alrededor del punto objetivo
  }
}
```

**Qué nos falta:** `SkillSystem.js` define skills con `type: 'damage'` y stats hardcodeadas. Sin scripting de efectos.

**Cómo portar:** Hechizos como funciones en `SkillSystem.js`:
```javascript
{ id: 'fireball', level: 3, heroClass: 'mage', range: 'area',
  onCast: (caster, targets, level) => {
    const dmg = Dice.parse('4d6').roll();
    targets.forEach(t => t.takeDamage(dmg, 'fire'));
  }
}
```

**Esfuerzo:** ~3h. Muy potente para modding futuro.

---

## HECHIZOS Y HABILIDADES

---

### 24. SpellBook por Clase con Niveles de Slot

**Fuente:** `SpellBook.java` + `Hero.java` (darkmoor)

**Qué hace:**
Cada héroe tiene listas de hechizos separadas por clase: `mageSpells` y `clericSpells` (en Hero), cada una es `List<List<Spell>>` — outer list = nivel del slot (1-9), inner list = hechizos de ese nivel. `pushSpell(spell)` agrega. `popSpell(class, level, slot)` consume el slot al lanzar. `SpellBook.open(hero, item)` — ítem Book abre grimorio Mago, HolySymbol abre libro de Clérigo.

```java
// Hero.java:
List<List<Spell>> mageSpells;   // [nivel1:[hechizo1,hechizo2], nivel2:[...], ...]
List<List<Spell>> clericSpells;
hero.getSpells(HeroClass.Mage, 2); // hechizos de nivel 2 disponibles
hero.popSpell(HeroClass.Mage, 2, 1); // consume slot nivel-2, slot-1
```

**Qué nos falta:** `SkillSystem.js` usa AP como recurso único, sin slots por nivel ni distinción por clase.

**Cómo portar:**
```javascript
// En Character.js — agregar spell slots:
this.spellSlots = {
  mage:   { 1: 2, 2: 1, 3: 0 },  // slots disponibles por nivel
  cleric: { 1: 2, 2: 1, 3: 0 }
};

castSpell(spellId) {
  const spell = SkillSystem.getSpell(spellId);
  if (this.spellSlots[this.class][spell.level] <= 0) return false;
  this.spellSlots[this.class][spell.level]--;
  spell.onCast(this, targets);
  return true;
}
// Restaurar al descansar en campamento
restoreSpellSlots() { this.spellSlots = this.getBaseSpellSlots(); }
```

**Esfuerzo:** ~1 día. Requiere CampUI para restaurar slots.

---

## UI Y EXPERIENCIA DE USUARIO

---

### 25. Drag-and-Drop de Items con MouseCursor

**Fuente:** `controls.js` (LoL JS)

**Qué hace:**
`MouseCursor` es un objeto global con `item` (el item arrastrado), `init()` (agrega listener de mousemove), `draw(x,y)` (dibuja item sobre cursor), `destroy()` (quita listener). Al hacer click en slot de equipment con item en cursor → equipa (si tipo correcto). Al hacer click en slot con item → levanta el item al cursor.

```javascript
MouseCursor.item = equipedItem; // tomar item
MouseCursor.init();             // activar seguimiento de mouse
// En click destino:
if (MouseCursor.item.type == 'equipment' && MouseCursor.item.category == itemCategory) {
  chars[id].equipment[itemCategory] = MouseCursor.item;
  MouseCursor.item = {};
  MouseCursor.destroy();
}
```

**Qué nos falta:** `InventoryUI.js` usa click + modal para mover items. Sin drag verdadero sobre el canvas.

**Cómo portar:** Agregar a `InventoryUI.js`:
```javascript
// pointerdown en slot → guardar item en dragState
// pointermove en document → mover overlay DIV con imagen
// pointerup sobre slot destino → soltar item
```

**Esfuerzo:** ~3h. Mayor flujo UX para inventario.

---

### 26. Character Visual con Barras Animadas

**Fuente:** `character.js` (LoL JS)

**Qué hace:**
`Character` con: `health`, `mana`, `strength`, `baseStrength`, `armor`, `baseArmor`. 8 slots de equipment: `helmet`, `bodyArmor`, `armArmor`, `weapon`, `shield`, `boots`, `ringLeft`, `ringRight`. `update()` recalcula stats sumando todos los items equipados. `draw(x,y)` dibuja: portrait animado (spritesheet horizontal, `portraitFrame * portraitWidth`), barra de salud vertical verde, barra de mana vertical azul.

```javascript
// Portrait animado — spritesheet horizontal:
Interface.sprites[char.id].draw(x+2, y+2, 31, 35,
  char.portraitFrame * 31, 0, 31, 35
);
// Barra de salud proporcional:
var healthHeight = Math.round(35 / 100 * char.health);
```

**Qué tenemos:** `CharacterPortrait.js` genera retratos estáticos. `ExplorationHUD.js` muestra HP bars. Sin animación de portrait.

**Lo que vale rescatar:** El patrón de portrait animado (spritesheet con frames de idle animation) + barras verticales laterales proporcionales. Actualmente usamos barras horizontales.

**Esfuerzo:** ~2h para animar portraits con spritesheet. Bajo impacto funcional, alto impacto visual.

---

### 27. Layout de Interfaz Tipo Westwood

**Fuente:** `interface.js` + `config.js` (LoL JS)

**Qué hace:**
`Config.window_x`, `Config.window_y`, `Config.window_width`, `Config.window_height` definen el área de viewport 3D. Todo lo demás es interfaz. `Interface.clickRects` es mapa de rectángulos para hit-testing: `partyMove[direction]`, `automap`, `characterDetailItems[category]`, `characterDetailButtonClose`. División clara: canvas dividido en área de juego (3D) + área de interfaz (sprites).

```javascript
// config.js determina layout:
Config.window_x = 64;     // viewport 3D empieza en x=64
Config.window_width = 320; // ancho del viewport
// Todo a la izquierda de x=64 = interfaz con retratos del partido
```

**Qué tenemos:** Three.js canvas a pantalla completa. HUD como DOM overlay. Botones de movimiento no existen (solo teclado).

**Lo que vale rescatar:** Botones de movimiento clickables en la interfaz (para mobile o accesibilidad). El `clickRects` es elegante: un solo listener en el canvas checa contra todos los rectángulos.

**Esfuerzo:** ~2h para agregar botones de movimiento clickables al HUD.

---

## MECÁNICAS GENERALES

---

### 28. Item Tipos Completos (LoL JS)

**Fuente:** `item.js` (LoL JS)

**Tipos de items comentados en código:**
```javascript
// Equipment: Waffen (armas), Schilde (escudos), Kleidung (ropa),
//            Ringe (anillos), Amulette (amuletos), Helme (cascos), Schuhe (zapatos)
// Keys: llaves
// Healings: pociones de curación
// Questitems: items de quest
// Textscrolls: pergaminos de texto/lore
// Magic Scrolls: pergaminos de hechizos
```
Item tiene: `id`, `mapPosition` (sub-posición en tile NW/NE/SW/SE), `mapDepth`, `mapX`, `mapY`, `texturePosX`, `type`, `category`, `actionSize` (tamaño del área clickable en el mundo 3D).

**Lo que vale rescatar:** `mapPosition` para items en el suelo con 4 sub-slots por tile. `actionSize` para calcular área de click en espacio 3D. `Magic Scrolls` como categoría — enseña hechizos al Mago al usarlos (consume el scroll).

**Esfuerzo:** Pergaminos de hechizos: ~2h. Sub-posiciones de items: ~3h (requiere tile actor system).

---

### 29. GameMechanics Centralizado

**Fuente:** `GameMechanics.java` (darkmoor)

**Qué hace:** Clase de configuración global. En darkmoor es minimalista (solo `getRandom()`), pero el patrón importa: **todas** las fórmulas de mecánica de juego pasan por aquí.

**Qué tenemos:** `CombatBalanceConfig.js` centraliza modificadores de combate. Patrón ya establecido. Ampliar con constantes de exploración, detección, XP, economía.

**Esfuerzo:** ~1h. Ampliar `CombatBalanceConfig.js` con nuevas constantes.

---

## TABLA DE PRIORIDADES COMPLETA

| # | Feature | Fuente | Impacto | Esfuerzo | Prioridad |
|---|---------|--------|---------|----------|-----------|
| 1 | Fog-of-war minimapa | LoL JS automap.js | Alto | 2h | **Fase 1** |
| 2 | Camera bump al chocar pared | LoL JS map.js | Medio | 2h | **Fase 1** |
| 3 | CriticalHit configurable | darkmoor | Alto | 2h | **Fase 1** |
| 4 | Saving throws (Fortitude/Reflex/Will) | darkmoor | Alto | 2h | **Fase 1** |
| 5 | Brújula con direcciones relativas | darkmoor Compass | Bajo | 1h | **Fase 1** |
| 6 | Drag-and-drop de items | LoL JS controls | Medio | 3h | **Fase 1** |
| 7 | MazeZone XP multiplier | darkmoor Maze | Bajo | 2h | **Fase 1** |
| 8 | Resistencias/inmunidades de enemigos | darkmoor Monster | Alto | 3h | **Fase 1** |
| 9 | Dados XdY+Z | darkmoor Dice | Alto | 4h | **Fase 1** |
| 10 | Posicionamiento front/back row | darkmoor Team | Alto | 4h | **Fase 2** |
| 11 | Secuencia de ataque con roll to-hit | darkmoor Attack | Alto | 3h | **Fase 2** |
| 12 | Decoración por cara de tile | darkmoor Decoration | Medio | 1 día | **Fase 2** |
| 13 | WallSwitch con scripts | darkmoor actor | Alto | 1 día | **Fase 2** |
| 14 | Pit — trampa de pozo | darkmoor actor | Medio | 4h | **Fase 2** |
| 15 | ForceField — campos de fuerza | darkmoor actor | Medio | 3h | **Fase 2** |
| 16 | Monster struct ampliado | darkmoor Monster | Alto | 1 día | **Fase 2** |
| 17 | Animaciones cámara completas | LoL JS map.js | Medio | 6h | **Fase 2** |
| 18 | CampDialog + sistema de descanso | darkmoor CampDialog | Alto | 1 día | **Fase 2** |
| 19 | EventSquare onEnter/Stand/Leave | darkmoor actor | Medio | 1h | **Fase 2** |
| 20 | Spell como script ejecutable | darkmoor Spell | Alto | 3h | **Fase 2** |
| 21 | SpellBook con slots por nivel | darkmoor SpellBook | Alto | 1 día | **Fase 3** |
| 22 | AI de exploración con detectionRange | darkmoor Monster | Alto | 1 día | **Fase 3** |
| 23 | Items en suelo con sub-posición | LoL JS item.js | Medio | 3h | **Fase 3** |
| 24 | Portrait animado (spritesheet) | LoL JS character.js | Bajo | 2h | **Fase 3** |
| 25 | Pergaminos de hechizos (Magic Scrolls) | LoL JS item.js | Medio | 2h | **Fase 3** |
| 26 | ViewField cono de visión | darkmoor ViewField | Medio | 1 día | **Fase 3** |
| 27 | Botones de movimiento clickables | LoL JS interface.js | Medio | 2h | **Fase 3** |

---

## ROADMAP DE IMPLEMENTACIÓN EN 3 FASES

### Fase 1 — Quick Wins (≤4h cada uno, impacto inmediato)

1. **Fog-of-war minimapa** — `GridSystem.js` + `main.js:updateMinimap()`. Exploración progresiva del mapa.
2. **Camera bump al chocar pared** — listener `movementBlocked` → offset temporal de cámara Three.js.
3. **CriticalHit configurable** — `CombatBalanceConfig.js` + `ActionResolver.js`. Corrige bug del Rogue.
4. **Saving throws** — `ActionResolver.js`. Hechizos con resistencia Fortitude/Reflex/Will.
5. **Resistencias de enemigos** — ampliar schema `EnemyDatabase.js` con `resistances` + leer en `ActionResolver.js`.
6. **Dados XdY+Z** — nuevo `src/engine/utils/Dice.js` + migrar `EnemyDatabase.js`.
7. **Brújula con relativas** — ampliar `Direction.js` con `getRelativeDirection()`.

### Fase 2 — Sistemas Core (1 día cada uno, añaden profundidad de juego)

8. **Front/Back row** — `PartyManager.js` + `TargetingSystem.js`. Táctica de formación.
9. **Roll to-hit separado** — `ActionResolver.js`. Ataques pueden fallar según precisión vs evasión.
10. **WallSwitch + PressurePlate + Pit** — nuevo `TileActorSystem.js`. Puzzles y trampas.
11. **ForceField** — `CollisionSystem.js`. Corredores con giros forzados.
12. **Monster struct ampliado** — `EnemyDatabase.js` + `EnemyAI.js`. `detectionRange`, `smartAI`, `stealRate`.
13. **CampDialog** — nuevo `CampUI.js`. Descanso, restauración de recursos.
14. **Spell como script** — refactorizar `SkillSystem.js`. Efectos definidos como funciones.
15. **Animaciones de cámara completas** — `CameraAnimator` class. Step/turn/strafe animated.
16. **Decoración por cara de tile** — ampliar schema JSON + `DungeonLoader.js`.

### Fase 3 — Features Avanzados (2+ días, contenido de campaña)

17. **SpellBook con slots por nivel** — `Character.js` + nueva `SpellUI.js`. D&D-style magic.
18. **AI de exploración** — `EnemyAI.js` + BFS pathfinding en `GridSystem.js`. Monstruos persiguen.
19. **Items en suelo con sub-posición** — tiles con 4 slots NW/NE/SW/SE visibles.
20. **ViewField cono de visión** — 16 posiciones para targeting/loot/decoraciones visibles.
21. **MazeZone + multi-textureset** — zonas con XP multiplier y texturas por área.

---

## NO VALE LA PENA PORTAR

| Feature | Razón |
|---------|-------|
| `AutoMap.java` (darkmoor) | Solo esqueleto con `TODO...`. Usar `automap.js` de LoL JS. |
| `textures.js` (LoL JS) | Pre-sliced PNGs por profundidad. Three.js lo supera con geometría real. |
| `bitmap_font.js` (LoL JS) | Canvas bitmap font. CSS con Press Start 2P es superior en DPI. |
| `GameMechanics.java` (darkmoor) | Solo `new Random()` sin semilla. Ya tenemos `CombatBalanceConfig.js`. |
| `ThrownItem.java` (darkmoor) | Físicas de proyectil en tiempo real. Innecesario en combate por turnos. |
| `BodySlot.Belt` / quiver system | Demasiado granular para etapa actual. Añadir después de SpellBook. |
| Multi-clase de héroe (darkmoor Hero) | `checkClass()` permite múltiples profesiones. Complejidad innecesaria ahora. |
| `sprite.js` (LoL JS) canvas rendering | Redundante con Three.js para vistas 3D. Útil solo para UI 2D pura. |
| `SwitchCount.java` (darkmoor) | Simple contador de activaciones. `ZoneTriggerSystem` + `once: true` lo cubre. |
| `Config.move_rules` (LoL JS) | Tabla de reglas de movimiento por dirección. Ya resuelta en `Direction.js`. |
