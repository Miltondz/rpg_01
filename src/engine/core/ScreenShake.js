/**
 * ScreenShake — exponential-decay camera shake for Three.js.
 *
 * Spec §8: shakeIntensity *= decay each frame.
 * force 0.3 = basic attack, 1.2 = massive critical.
 *
 * Usage:
 *   const shake = new ScreenShake(camera);
 *   shake.trigger(0.6);
 *   // call shake.update() in the render loop
 */
export class ScreenShake {
  static DECAY = 0.88;    // per-frame decay factor
  static MIN   = 0.003;   // intensity below this = done

  constructor(camera) {
    this._camera    = camera;
    this._intensity = 0;
    this._origin    = null;   // THREE.Vector3 resting position — captured on first use
  }

  /** Trigger shake with given force (0.3 basic, 1.2 critical). */
  trigger(force) {
    if (!this._camera) return;
    // Capture camera's current resting position first time
    if (!this._origin) {
      this._origin = this._camera.position.clone();
    }
    this._intensity = Math.max(this._intensity, force);
  }

  /**
   * Call once per render frame BEFORE rendering.
   * Applies random offset and decays intensity.
   */
  update() {
    if (!this._camera || this._intensity < ScreenShake.MIN) {
      this._restoreOrigin();
      return;
    }

    // Random displacement in camera-local space
    const i = this._intensity;
    this._camera.position.set(
      (this._origin?.x ?? 0) + (Math.random() - 0.5) * i,
      (this._origin?.y ?? 0) + (Math.random() - 0.5) * i * 0.4,
      (this._origin?.z ?? 0) + (Math.random() - 0.5) * i * 0.2,
    );

    this._intensity *= ScreenShake.DECAY;
    if (this._intensity < ScreenShake.MIN) {
      this._intensity = 0;
      this._restoreOrigin();
    }
  }

  /**
   * Notify ScreenShake that the camera origin has changed
   * (e.g., player moved). Call after any intentional camera movement.
   */
  updateOrigin() {
    if (this._camera && this._intensity < ScreenShake.MIN) {
      this._origin = this._camera.position.clone();
    }
  }

  _restoreOrigin() {
    if (this._origin && this._camera) {
      this._camera.position.copy(this._origin);
    }
  }

  dispose() {
    this._restoreOrigin();
    this._origin = null;
  }
}
