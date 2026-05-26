/**
 * CombatantEntity — visual/positional wrapper around a Character or Enemy.
 * Holds 3D mesh reference, grid position, and provides animation interface.
 */
export class CombatantEntity {
  // Lerp animation config
  static STEP_DURATION  = 280;   // ms for step forward/back
  static STEP_FRACTION  = 0.12;  // fraction of distance to centre to move
  static IDLE_AMP       = 0.04;  // base vertical bob amplitude (world units)
  static IDLE_FREQ      = 0.0014; // radians/ms
  static IDLE_ACTIVE_MULT = 1.35; // active-turn amplitude multiplier

  constructor(combatant) {
    this.combatant  = combatant;
    this.mesh       = null;         // THREE.Object3D — set by BattleGrid
    this.gridPos    = null;         // { col, row, w, h }
    this.homePos    = null;         // THREE.Vector3 resting position
    this._centreLine = 0;           // world X of arena centre (set by BattleGrid)

    // Idle sway — unique per entity to avoid synchrony
    this._idleOffset = Math.random() * Math.PI * 2;
    this._idleFreq   = CombatantEntity.IDLE_FREQ * (0.8 + Math.random() * 0.4);

    this._isAnimating = false;
  }

  get id()   { return this.combatant.id; }
  get name() { return this.combatant.name; }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Lerp mesh ~12% toward arena centre. Resolves when done. */
  stepForward() {
    if (!this.mesh || !this.homePos) return Promise.resolve();
    const target = this._stepForwardTarget();
    return this._lerpTo(target, CombatantEntity.STEP_DURATION);
  }

  /** Lerp mesh back to home grid position. Resolves when done. */
  stepBack() {
    if (!this.mesh || !this.homePos) return Promise.resolve();
    return this._lerpTo(this.homePos, CombatantEntity.STEP_DURATION);
  }

  /** Brief scale burst to signal attack. */
  playAttackAnimation() {
    if (!this.mesh) return Promise.resolve();
    return this._scaleBurst(1.18, 120);
  }

  /** Micro knockback on hit. */
  playHitAnimation() {
    if (!this.mesh) return Promise.resolve();
    return this._scaleBurst(0.88, 80);
  }

  /**
   * Call every render frame.
   * @param {number}  time          - performance.now()
   * @param {boolean} isActiveTurn  - true = this entity's turn
   */
  updateIdleAnimation(time, isActiveTurn) {
    if (!this.mesh || this._isAnimating) return;

    const amp  = CombatantEntity.IDLE_AMP * (isActiveTurn ? CombatantEntity.IDLE_ACTIVE_MULT : 1);
    const yOff = Math.sin(time * this._idleFreq + this._idleOffset) * amp;

    // Only modify Y so X/Z remain locked to grid position
    this.mesh.position.y = (this.homePos?.y ?? 0) + yOff;
  }

  /** Get 2D screen pixel position for DOM overlay elements. */
  getScreenPosition(camera, canvas) {
    if (!this.mesh || !camera || !canvas) return null;
    const pos = new THREE.Vector3();
    this.mesh.getWorldPosition(pos);
    pos.project(camera);
    return {
      x: (pos.x * 0.5 + 0.5) * canvas.clientWidth,
      y: (-pos.y * 0.5 + 0.5) * canvas.clientHeight,
    };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _stepForwardTarget() {
    const home   = this.homePos.clone();
    const dir    = Math.sign(this._centreLine - home.x) || 1;
    const dist   = Math.abs(this._centreLine - home.x);
    home.x      += dir * dist * CombatantEntity.STEP_FRACTION;
    return home;
  }

  _lerpTo(target, durationMs) {
    return new Promise(resolve => {
      if (!this.mesh) { resolve(); return; }
      this._isAnimating = true;
      const start    = this.mesh.position.clone();
      const startT   = performance.now();

      const tick = (now) => {
        const t = Math.min((now - startT) / durationMs, 1);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out quad
        this.mesh.position.lerpVectors(start, target, eased);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          this.mesh.position.copy(target);
          this._isAnimating = false;
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  _scaleBurst(peakScale, durationMs) {
    return new Promise(resolve => {
      if (!this.mesh) { resolve(); return; }
      const startT = performance.now();
      const tick = (now) => {
        const t = Math.min((now - startT) / durationMs, 1);
        // Quick up, then spring back
        const s = 1 + (peakScale - 1) * Math.sin(t * Math.PI);
        this.mesh.scale.setScalar(s);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          this.mesh.scale.setScalar(1);
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }
}
