/**
 * CameraAnimator — frame-based camera effect state machine.
 * Ported from LoL JS map.js cameraAnimation pattern.
 *
 * Supported actions:
 *   wallHit   — bumps FOV on wall collision
 *   step      — subtle FOV pulse on each forward step
 *   turnLeft  — slight roll tilt to the left
 *   turnRight — slight roll tilt to the right
 *   strafe    — lateral displacement pulse
 */
export class CameraAnimator {
  constructor(camera) {
    this._camera   = camera;
    this._anim     = null;
    this._baseFov  = 75;
  }

  setBaseFov(fov) { this._baseFov = fov; }

  startWallHit() {
    this._anim = { action: 'wallHit', frame: 0, maxFrames: 6 };
  }

  startStep() {
    this._anim = { action: 'step', frame: 0, maxFrames: 4 };
  }

  startTurn(dir) {
    this._anim = { action: 'turn', dir, frame: 0, maxFrames: 4 };
  }

  startStrafe(dir) {
    this._anim = { action: 'strafe', dir, frame: 0, maxFrames: 3 };
  }

  isActive() { return this._anim !== null; }

  update() {
    const a = this._anim;
    if (!a || !this._camera) return;

    const t = a.frame / a.maxFrames;

    switch (a.action) {
      case 'wallHit': {
        // FOV bump 75 → 80 → 75 using half-sine
        this._camera.fov = this._baseFov + Math.sin(t * Math.PI) * 5;
        this._camera.updateProjectionMatrix();
        break;
      }
      case 'step': {
        // Subtle FOV pulse ±2
        this._camera.fov = this._baseFov + Math.sin(t * Math.PI) * 2;
        this._camera.updateProjectionMatrix();
        break;
      }
      case 'turn': {
        // Roll tilt ±0.05 rad, peaks at mid-frame
        const sign = a.dir === 'right' ? -1 : 1;
        this._camera.rotation.z = sign * Math.sin(t * Math.PI) * 0.05;
        break;
      }
      case 'strafe': {
        // Slight FOV squeeze
        this._camera.fov = this._baseFov - Math.sin(t * Math.PI) * 1.5;
        this._camera.updateProjectionMatrix();
        break;
      }
    }

    if (++a.frame >= a.maxFrames) {
      this._reset();
      this._anim = null;
    }
  }

  _reset() {
    if (!this._camera) return;
    this._camera.fov = this._baseFov;
    this._camera.updateProjectionMatrix();
    this._camera.rotation.z = 0;
  }
}
