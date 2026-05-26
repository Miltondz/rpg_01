import { Logger } from '../utils/Logger.js';

const log = Logger.tag('HitFlash');

// Emissive colours per damage type
const FLASH_COLORS = {
  fire:        new THREE.Color(1.0, 0.3, 0.0),
  ice:         new THREE.Color(0.4, 0.8, 1.0),
  lightning:   new THREE.Color(0.9, 0.9, 0.2),
  poison:      new THREE.Color(0.3, 0.9, 0.2),
  dark:        new THREE.Color(0.5, 0.0, 0.8),
  holy:        new THREE.Color(1.0, 0.95, 0.6),
  physical:    new THREE.Color(1.0, 1.0, 1.0),
  default:     new THREE.Color(1.0, 1.0, 1.0),
};

const FLASH_FRAMES   = 3;    // frames at full emissive
const FADE_FRAMES    = 6;    // frames lerping back to original

/**
 * HitFlashSystem — flashes enemy/character mesh emissive colour on hit.
 * Uses Renderer's render loop via a frame callback list.
 */
export class HitFlashSystem {
  constructor(renderer) {
    this._renderer  = renderer;   // Renderer instance
    this._active    = new Map();  // meshId → { mesh, origEmissive, color, frame, max }
  }

  /**
   * Trigger a flash on a Three.js mesh.
   * @param {THREE.Mesh|null} mesh
   * @param {string} damageType  - 'fire', 'ice', 'physical', etc.
   * @param {boolean} isCritical - Critical hits get a 2nd brighter flash
   * @returns {Promise} resolves after flash animation completes
   */
  flash(mesh, damageType = 'physical', isCritical = false) {
    if (!mesh) return Promise.resolve();

    const color = FLASH_COLORS[damageType?.toLowerCase()] ?? FLASH_COLORS.default;
    const totalFrames = FLASH_FRAMES + FADE_FRAMES + (isCritical ? 4 : 0);

    return new Promise(resolve => {
      this._applyFlash(mesh, color, totalFrames, resolve);
    });
  }

  /**
   * Call this every render frame so flashes animate correctly.
   */
  update() {
    for (const [id, state] of this._active) {
      state.frame++;

      if (state.frame <= FLASH_FRAMES) {
        // Full emissive intensity
        this._setEmissive(state.mesh, state.color);
      } else if (state.frame <= FLASH_FRAMES + FADE_FRAMES) {
        // Lerp back
        const t = (state.frame - FLASH_FRAMES) / FADE_FRAMES;
        const lerped = state.color.clone().lerp(state.origEmissive, t);
        this._setEmissive(state.mesh, lerped);
      } else {
        // Done — restore original
        this._setEmissive(state.mesh, state.origEmissive);
        state.resolve?.();
        this._active.delete(id);
      }
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _applyFlash(mesh, color, totalFrames, resolve) {
    const id = mesh.uuid;
    // Capture original emissive (each material or first in array)
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const origEmissive = mat?.emissive
      ? mat.emissive.clone()
      : new THREE.Color(0, 0, 0);

    // Cancel any ongoing flash on this mesh
    if (this._active.has(id)) {
      this._active.get(id).resolve?.();
    }

    this._active.set(id, { mesh, origEmissive, color, frame: 0, max: totalFrames, resolve });
  }

  _setEmissive(mesh, color) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (mat?.emissive) {
        mat.emissive.copy(color);
        mat.needsUpdate = false; // emissive change doesn't require needsUpdate
      }
    }
  }

  dispose() {
    this._active.clear();
  }
}
