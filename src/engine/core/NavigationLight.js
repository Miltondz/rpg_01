import { Logger } from '../utils/Logger.js';

const log = Logger.tag('NavLight');

/**
 * NavigationLight — magic lantern attached to camera, decays by step count.
 *
 * Lifecycle:
 *   initialize(camera) → attach PointLight to camera
 *   step()             → consume 1 step; lower intensity
 *   restore(n)         → refill n steps (torch pickup, rest spot)
 *   update(timeMs)     → call every frame; applies dying flicker when depleted
 *   dispose()          → detach light
 */
export class NavigationLight {
  static MAX_STEPS      = 40;
  static BASE_INTENSITY = 0.4;
  static WARN_THRESHOLD = 10;   // steps remaining at which warning flicker starts

  constructor() {
    this._camera    = null;
    this._light     = null;
    this._steps     = NavigationLight.MAX_STEPS;
    this._warnPhase = Math.random() * Math.PI * 2;
  }

  initialize(camera) {
    this._camera = camera;

    this._light = new THREE.PointLight(0xffd4a0, NavigationLight.BASE_INTENSITY, 12, 2.0);
    this._light.position.set(0.15, 0, 0.35); // slightly right and forward (hand-held lantern)
    camera.add(this._light);

    log.info('initialized', { maxSteps: NavigationLight.MAX_STEPS });
  }

  /** Consume 1 step charge. Call on each movement completion. */
  step() {
    this._steps = Math.max(0, this._steps - 1);
    this._applyIntensity();
    if (this._steps === NavigationLight.WARN_THRESHOLD) {
      window.dispatchEvent(new CustomEvent('navLightWarning', {
        detail: { stepsLeft: this._steps }
      }));
      log.info('warning threshold reached');
    }
    if (this._steps === 0) {
      window.dispatchEvent(new CustomEvent('navLightDepleted'));
      log.info('depleted');
    }
  }

  /**
   * Restore step charges (e.g. torch pickup, rest altar).
   * @param {number} amount
   */
  restore(amount = NavigationLight.MAX_STEPS) {
    this._steps = Math.min(NavigationLight.MAX_STEPS, this._steps + amount);
    this._applyIntensity();
    window.dispatchEvent(new CustomEvent('navLightRestored', {
      detail: { stepsLeft: this._steps }
    }));
    log.info('restored', { steps: this._steps });
  }

  get stepsRemaining() { return this._steps; }

  get fraction() { return this._steps / NavigationLight.MAX_STEPS; }

  /** Call every render frame — applies dying flicker when steps nearly exhausted. */
  update(timeMs) {
    if (!this._light) return;

    if (this._steps <= 0) {
      // Completely dark — rare dying ember flicker
      const ember = Math.max(0, Math.sin(timeMs * 0.006 + this._warnPhase) * 0.06);
      this._light.intensity = ember;
      return;
    }

    if (this._steps <= NavigationLight.WARN_THRESHOLD) {
      // Warning flicker — intensity oscillates around reduced level
      const base    = NavigationLight.BASE_INTENSITY * this.fraction;
      const flicker = Math.sin(timeMs * 0.009 + this._warnPhase) * 0.18 +
                      Math.sin(timeMs * 0.023 + this._warnPhase + 1.4) * 0.08;
      this._light.intensity = Math.max(0, base + flicker * base);
    }
    // Otherwise intensity is set by _applyIntensity() on each step — no per-frame update needed
  }

  dispose() {
    if (this._light && this._camera) {
      this._camera.remove(this._light);
    }
    this._light  = null;
    this._camera = null;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _applyIntensity() {
    if (!this._light) return;
    this._light.intensity = NavigationLight.BASE_INTENSITY * this.fraction;
  }
}
