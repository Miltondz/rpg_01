import { Logger } from '../utils/Logger.js';
import { CombatantEntity } from './CombatantEntity.js';

const log = Logger.tag('BattleGrid');

/**
 * BattleGrid — spatial layout for combat entities in 3D space.
 *
 * Layout:
 *   Columns 0..(COLS/2-1) = player side (left of centre)
 *   Columns (COLS/2)..COLS-1 = enemy side (right of centre)
 *   Rows 0..ROWS-1 = depth positions
 *
 * Three.js mapping:
 *   X axis → columns (left = negative X)
 *   Z axis → rows (front row = smaller Z)
 *   Y = 0 (floor level, meshes sit at their own height)
 *
 * Cell size matches GeometryFactory.tileSize = 2.0 units.
 */
export class BattleGrid {
  static COLS = 6;       // 3 player cols + 3 enemy cols
  static ROWS = 3;
  static CELL = 2.5;     // world units per cell
  static CENTRE_Z = 0;   // world Z of the middle row

  constructor() {
    // occupancy[col][row] = entityId | null
    this._cells = Array.from({ length: BattleGrid.COLS }, () =>
      new Array(BattleGrid.ROWS).fill(null)
    );

    // Map<entityId, CombatantEntity>
    this.entities = new Map();

    // Arena centre in world space (set by placeEntities)
    this._originX = 0;
    this._originZ = 0;
  }

  /** Set world-space origin (arena top-left corner). */
  setOrigin(worldX, worldZ) {
    this._originX = worldX;
    this._originZ = worldZ;
  }

  /** Convert grid (col, row) → Three.js world position Vector3. */
  cellToWorld(col, row) {
    return new THREE.Vector3(
      this._originX + col * BattleGrid.CELL,
      0,
      this._originZ + row * BattleGrid.CELL
    );
  }

  /** Centre of a multi-cell entity occupying (col, row, w, h). */
  entityCentre(col, row, w, h) {
    return new THREE.Vector3(
      this._originX + (col + (w - 1) * 0.5) * BattleGrid.CELL,
      0,
      this._originZ + (row + (h - 1) * 0.5) * BattleGrid.CELL
    );
  }

  /**
   * Place all combatants on the grid at combat start.
   * @param {Object[]} playerMembers  - Array of Character objects
   * @param {Object[]} enemies        - Array of Enemy objects
   * @param {THREE.Scene} scene
   */
  placeEntities(playerMembers, enemies, scene) {
    this._clearAll();

    // Player party: left half (cols 0..2), one per row
    playerMembers.forEach((member, i) => {
      const col = 1;                    // all in col 1 (front-left)
      const row = Math.min(i, BattleGrid.ROWS - 1);
      this._placeEntity(member, col, row, 1, 1, scene);
    });

    // Enemies: right half (cols 3..5)
    let eCol = BattleGrid.COLS - 2;    // start at col 4
    let eRow = 0;
    for (const enemy of enemies) {
      const gs = enemy.gridSize ?? { w: 1, h: 1 };
      // Wrap to next column block if row would overflow
      if (eRow + gs.h > BattleGrid.ROWS) {
        eCol -= gs.w;
        eRow = 0;
      }
      if (eCol < BattleGrid.COLS / 2) {
        log.warn('too many enemies for grid', { id: enemy.id });
        break;
      }
      this._placeEntity(enemy, eCol, eRow, gs.w, gs.h, scene);
      eRow += gs.h;
    }

    // Compute arena centre (mid-point between player front and enemy front)
    this._centreLine = this._originX + (BattleGrid.COLS / 2) * BattleGrid.CELL;
    log.info('grid populated', { players: playerMembers.length, enemies: enemies.length });
  }

  /**
   * Get CombatantEntity for a character/enemy by id.
   * @param {string} id
   * @returns {CombatantEntity|null}
   */
  getEntity(id) {
    return this.entities.get(id) ?? null;
  }

  /** X coordinate of the arena centre line (used for step-forward targets). */
  get centreLine() { return this._centreLine ?? 0; }

  // ── Private ───────────────────────────────────────────────────────────────

  _placeEntity(combatant, col, row, w, h, scene) {
    // Occupy cells
    for (let dc = 0; dc < w; dc++) {
      for (let dr = 0; dr < h; dr++) {
        const c = col + dc, r = row + dr;
        if (c < BattleGrid.COLS && r < BattleGrid.ROWS) {
          this._cells[c][r] = combatant.id;
        }
      }
    }

    // Create CombatantEntity
    const entity = new CombatantEntity(combatant);
    entity.gridPos = { col, row, w, h };
    entity.homePos = this.entityCentre(col, row, w, h);

    // Create a simple placeholder mesh (billboard quad)
    // In Phase 7 this will be replaced by proper sprites/models
    entity.mesh = this._makePlaceholderMesh(combatant, w, h);
    entity.mesh.position.copy(entity.homePos);
    entity.mesh.userData.combatantId = combatant.id;

    if (scene) scene.add(entity.mesh);

    // Give entity the centre-line X so stepForward() knows direction
    entity._centreLine = this._centreLine ?? 0;

    // Attach back-reference on the combatant itself for quick lookup
    combatant._combatEntity = entity;

    this.entities.set(combatant.id, entity);
    log.debug('placed', { id: combatant.id, col, row, w, h });
  }

  _makePlaceholderMesh(combatant, w, h) {
    const width  = w * BattleGrid.CELL * 0.85;
    const height = h * BattleGrid.CELL * 0.85;
    const geo = new THREE.PlaneGeometry(width, height);
    geo.rotateY(Math.PI); // face toward camera (negative Z)

    const isEnemy  = !combatant.class;   // Characters have .class, Enemies don't
    const color    = isEnemy ? 0xcc3333 : 0x3377cc;
    const mat = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = height / 2; // sit on floor
    return mesh;
  }

  _clearAll() {
    // Remove old meshes from scene
    for (const entity of this.entities.values()) {
      entity.mesh?.parent?.remove(entity.mesh);
      entity.mesh?.geometry?.dispose();
      entity.mesh?.material?.dispose();
      if (entity.combatant) delete entity.combatant._combatEntity;
    }
    this.entities.clear();
    for (let c = 0; c < BattleGrid.COLS; c++) {
      this._cells[c].fill(null);
    }
  }

  dispose() {
    this._clearAll();
  }
}
