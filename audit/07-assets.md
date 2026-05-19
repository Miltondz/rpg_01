# F7 — Assets & Data

## Levels en disco

```
levels/
  crypt-of-shadows-config.json      ← manifest campana
  crypt-of-shadows-floor-1.json
  crypt-of-shadows-floor-2.json
  crypt-of-shadows-floor-3.json
  crypt-of-shadows-floor-4.json
  crypt-of-shadows-floor-5.json
  multi-room-20x20.json
  next_level.json                   ← huerfano probable
  test-collision.json
  test-room-10x10.json              ← cargado por defecto
```

## Levels referenciados en codigo

| Archivo | Referencia |
|---|---|
| `main.js:582` | `./levels/test-room-10x10.json` (default boot) |
| `main.js:620-624` | array test cycle: `test-room-10x10.json`, `multi-room-20x20.json`, `test-collision.json` |
| ningun lugar | `crypt-of-shadows-*` |
| ningun lugar | `next_level.json` |

**Levels de campana shippeada (Crypt of Shadows) NO se cargan jamas en flujo principal.** Solo accesibles editando `main.js` o cargando manualmente via consola:

```js
window.dungeonEngine.dungeonLoader.loadLevelFromFile('./levels/crypt-of-shadows-floor-1.json')
```

## Manifest `crypt-of-shadows-config.json`

No leido en codigo. Existe pero ningun loader lo consume. Probable: campaign launcher pensado para fase futura.

## Databases pobladas

### `itemDatabase` (`src/engine/inventory/ItemDatabase.js`)

Constructor llena la DB. README dice "30+ items". Verificar conteo real:

```js
window.dungeonEngine.itemDatabase.getAllItems().length
```

### `enemyDatabase` (`src/engine/data/EnemyDatabase.js`)

Constructor llena 1321 lineas. README dice "15 enemigos + 3 bosses".

```js
window.dungeonEngine.enemyDatabase.getAllEnemies().length
```

## Validators

- `validate-enemy-roster.js` (root) — Node script standalone
- `validate-performance-systems.js` (root) — idem

Ejecucion:
```powershell
node validate-enemy-roster.js
node validate-performance-systems.js
```

Estos validators podrian detectar items/enemies referenciados por id pero no existentes (no verificado).

## Assets de render

`GeometryFactory` crea geometria procedural (no carga modelos externos). No hay sprites, no hay texturas, no hay audio files. Three.js solo usa primitivas + materials por color.

`AudioPlaceholderSystem` placeholder — sin SFX reales (confirmado por known-issues.md).

## Cross-references item/enemy ↔ level

No verificado en este pass. Levels podrian referenciar enemies/items por id en encounter tables. Si id no existe en DB → encounter falla silenciosa.

Recomendado:
```js
Logger.tag('Asset').error(`Level "${levelId}" references unknown enemy "${enemyId}"`);
```

## Schema levels JSON

No documentado en `docs/`. `DungeonLoader.loadLevelFromFile` parsea y construye grid + doors + transitions. Cada level debe tener:

```
{
  id, name, width, height,
  tiles: [[]],       // 2D array tile types
  doors: [...],      // optional
  transitions: [...],// optional
  spawn: {x, z, direction}
}
```

Estructura inferida de `main.js:1356-1407` (`testEdgeCases`).

## Recomendaciones

1. **Loader de campana**:
   ```js
   const campaign = await fetch('./levels/crypt-of-shadows-config.json').then(r => r.json());
   await dungeonLoader.loadLevelFromFile(campaign.floors[0]);
   ```

2. **Validator de level schema** al cargar:
   - tiles 2D consistente con width/height
   - spawn dentro de bounds y sobre tile walkable
   - door tiles tienen `keyType` valido
   - transition target existe

3. **Validator de cross-refs** ejecutado al boot:
   - cada enemy id en encounter tables existe en `enemyDatabase`
   - cada item id en loot tables existe en `itemDatabase`
   - cada skill id en character classes existe en `SkillSystem`

4. **Borrar `next_level.json`** si confirmado huerfano. O documentar uso.

5. **Logger.tag('Asset')** en cada `loadLevelFromFile`:
   ```
   [Asset] Loading "crypt-of-shadows-floor-1.json"... 
   [Asset] Loaded: 20x20, 47 walls, 8 doors, 2 transitions, 12 enemies, 23 items. (134ms)
   ```

## Conclusion F7

Contenido shippeado existe en disco pero **no esta cableado al flujo principal**. Levels campana, manifest, enemies, items — todo presente y desconectado. Esto convierte "Phase 2 Complete" en **assets-ready** mas que **playable-ready**. Falta el ultimo cable que conecta `partyCreationUI → loadCampaign(config) → encounters → combat → ...`.
