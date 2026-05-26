import { Logger } from '../utils/Logger.js';

const log = Logger.tag('SpriteManager');

/**
 * SpriteManager — persistent THREE.Sprite billboards for enemy groups
 * visible in the dungeon before an encounter triggers.
 *
 * Each sprite is tied to an encounter entry {x, z, enemies[]}.
 * Sprites appear when EncounterSystem registers them; cleared
 * individually when that encounter is defeated (encounterDefeated event).
 *
 * Public API:
 *   register(encounterId, worldX, worldZ, enemyType)
 *   remove(encounterId)
 *   clear()
 */
export class SpriteManager {
  static HEIGHT     = 1.0;  // world units — sprite centre Y
  static SCALE_W    = 0.85;
  static SCALE_H    = 1.06; // 4:5 aspect (128×160 portrait)

  constructor(scene) {
    this._scene   = scene;
    this._sprites = new Map();  // encounterId → THREE.Sprite
  }

  /**
   * Add a billboard sprite for an encounter at a world position.
   * @param {string} encounterId  - Unique id (e.g. encounter tile key "5,3")
   * @param {number} worldX
   * @param {number} worldZ
   * @param {string} enemyType    - Used for portrait colour (e.g. 'skeleton', 'bat')
   */
  register(encounterId, worldX, worldZ, enemyType = 'unknown') {
    if (this._sprites.has(encounterId)) return; // already registered

    const canvas  = this._makePortrait(enemyType);
    const texture = new THREE.CanvasTexture(canvas);
    const mat     = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite  = new THREE.Sprite(mat);

    sprite.scale.set(SpriteManager.SCALE_W, SpriteManager.SCALE_H, 1);
    sprite.position.set(worldX, SpriteManager.HEIGHT, worldZ);
    sprite.userData.encounterId = encounterId;

    this._scene.add(sprite);
    this._sprites.set(encounterId, sprite);
    log.debug('registered', { encounterId, worldX, worldZ });
  }

  /**
   * Remove and dispose a single encounter's sprite.
   * @param {string} encounterId
   */
  remove(encounterId) {
    const sprite = this._sprites.get(encounterId);
    if (!sprite) return;
    this._scene.remove(sprite);
    sprite.material.map?.dispose();
    sprite.material.dispose();
    this._sprites.delete(encounterId);
    log.debug('removed', { encounterId });
  }

  /** Remove all sprites. */
  clear() {
    for (const [id] of this._sprites) this.remove(id);
    log.debug('cleared');
  }

  dispose() {
    this.clear();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _makePortrait(enemyType) {
    const W = 128, H = 160;
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background
    const bg = this._typeColor(enemyType);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Dark border
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth   = 4;
    ctx.strokeRect(2, 2, W - 4, H - 4);

    // Silhouette — simple shape hinting at creature
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    // Head circle
    ctx.arc(W * 0.5, H * 0.32, W * 0.22, 0, Math.PI * 2);
    ctx.fill();
    // Body trapezoid
    ctx.beginPath();
    ctx.moveTo(W * 0.22, H * 0.55);
    ctx.lineTo(W * 0.78, H * 0.55);
    ctx.lineTo(W * 0.72, H * 0.88);
    ctx.lineTo(W * 0.28, H * 0.88);
    ctx.closePath();
    ctx.fill();

    // Enemy type label at bottom
    ctx.fillStyle    = 'rgba(255,255,255,0.75)';
    ctx.font         = 'bold 11px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(enemyType.replace(/_/g, ' ').toUpperCase(), W * 0.5, H - 6);

    return canvas;
  }

  _typeColor(enemyType) {
    const map = {
      skeleton:  '#2a1a10',
      ghost:     '#0a1a2a',
      bat:       '#1a0a20',
      slime:     '#0a2010',
      spider:    '#200a10',
      wolf:      '#1a1208',
      golem:     '#181818',
      troll:     '#101a08',
      lich:      '#0a0520',
      boss:      '#200010',
    };
    const key = Object.keys(map).find(k => enemyType.includes(k));
    return map[key] ?? '#181010';
  }
}
