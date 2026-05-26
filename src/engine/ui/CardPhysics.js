/**
 * CardPhysics — spring-damper physics for combat action cards.
 *
 * Uses Hooke's law: F = -k*x - c*v
 * Applied independently to rotX, rotY, translateY, scale.
 *
 * Usage:
 *   const physics = new CardPhysics(cardElement);
 *   physics.start();
 *   // attach mouse events via attachTo()
 *   physics.dispose(); // cleanup on card removal
 */
export class CardPhysics {
  // Spring constants
  static K       = 0.18;   // stiffness
  static DAMPING = 0.72;   // damping coefficient (0 = no damping, 1 = critical)
  static MAX_ROT = 18;     // max tilt degrees
  static MAX_Y   = 6;      // max vertical translate px

  // Idle sway
  static SWAY_FREQ   = 0.0008; // radians per ms
  static SWAY_AMP_Y  = 3;      // px
  static SWAY_AMP_R  = 1.5;    // degrees

  constructor(element) {
    this.el = element;

    // Physics state for each DOF
    this._rotX  = { pos: 0, vel: 0, target: 0 };
    this._rotY  = { pos: 0, vel: 0, target: 0 };
    this._transY = { pos: 0, vel: 0, target: 0 };
    this._scale  = { pos: 1, vel: 0, target: 1 };

    this._hovering  = false;
    this._mouseX    = 0;
    this._mouseY    = 0;

    // Unique phase offset so cards don't sway in sync
    this._idlePhase = Math.random() * Math.PI * 2;
    this._idleFreqY = CardPhysics.SWAY_FREQ * (0.85 + Math.random() * 0.3);
    this._idleFreqR = CardPhysics.SWAY_FREQ * (0.70 + Math.random() * 0.4);

    this._rafId   = null;
    this._lastT   = 0;
    this._running = false;

    this._boundMove  = this._onMouseMove.bind(this);
    this._boundLeave = this._onMouseLeave.bind(this);
    this._boundEnter = this._onMouseEnter.bind(this);
  }

  /** Attach mouse listeners and start animation loop. */
  start() {
    this.el.addEventListener('mousemove',  this._boundMove);
    this.el.addEventListener('mouseleave', this._boundLeave);
    this.el.addEventListener('mouseenter', this._boundEnter);
    this._running = true;
    this._lastT = performance.now();
    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  /** Attach to a card element that may have been re-rendered. */
  attachTo(element) {
    this.dispose();
    this.el = element;
    this.start();
  }

  /** Set AP-insufficient state (grey out, no interaction). */
  setDisabled(disabled) {
    if (disabled) {
      this.el.style.filter   = 'grayscale(100%) brightness(35%) contrast(80%)';
      this.el.style.pointerEvents = 'none';
      this._hovering = false;
      this._resetTargets();
    } else {
      this.el.style.filter   = '';
      this.el.style.pointerEvents = '';
    }
  }

  dispose() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._running = false;
    this.el.removeEventListener('mousemove',  this._boundMove);
    this.el.removeEventListener('mouseleave', this._boundLeave);
    this.el.removeEventListener('mouseenter', this._boundEnter);
    this._clearTransform();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _loop(t) {
    if (!this._running) return;
    const dt = Math.min(t - this._lastT, 50); // cap at 50ms to avoid spiral on tab blur
    this._lastT = t;

    this._updateSway(t);
    this._spring(this._rotX,  dt);
    this._spring(this._rotY,  dt);
    this._spring(this._transY, dt);
    this._spring(this._scale,  dt);
    this._applyTransform();

    this._rafId = requestAnimationFrame(tt => this._loop(tt));
  }

  _updateSway(t) {
    if (this._hovering) return;
    this._rotY.target   = Math.sin(t * this._idleFreqR + this._idlePhase) * CardPhysics.SWAY_AMP_R;
    this._transY.target = Math.sin(t * this._idleFreqY + this._idlePhase + 1) * CardPhysics.SWAY_AMP_Y;
    this._rotX.target   = 0;
    this._scale.target  = 1;
  }

  _spring(dof, dt) {
    const dx = dof.target - dof.pos;
    const force = CardPhysics.K * dx - CardPhysics.DAMPING * dof.vel;
    dof.vel += force * dt;
    dof.pos += dof.vel * dt * 0.05; // scale factor keeps units sensible
  }

  _applyTransform() {
    const rx = Math.max(-CardPhysics.MAX_ROT, Math.min(CardPhysics.MAX_ROT, this._rotX.pos));
    const ry = Math.max(-CardPhysics.MAX_ROT, Math.min(CardPhysics.MAX_ROT, this._rotY.pos));
    const ty = Math.max(-CardPhysics.MAX_Y,   Math.min(CardPhysics.MAX_Y,   this._transY.pos));
    const sc = Math.max(0.95, Math.min(1.08, this._scale.pos));

    this.el.style.transform = [
      `perspective(600px)`,
      `rotateX(${rx}deg)`,
      `rotateY(${ry}deg)`,
      `translateY(${ty}px)`,
      `scale(${sc})`,
    ].join(' ');

    // Update CSS vars for shader/glow effects on the card
    this.el.style.setProperty('--card-rot-x', `${rx}deg`);
    this.el.style.setProperty('--card-rot-y', `${ry}deg`);
  }

  _onMouseEnter() {
    this._hovering = true;
    this._scale.target = 1.06;
  }

  _onMouseMove(e) {
    const rect = this.el.getBoundingClientRect();
    // Normalise: -1..+1 from centre
    const nx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
    const ny = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;

    this._rotY.target  =  nx * CardPhysics.MAX_ROT;
    this._rotX.target  = -ny * CardPhysics.MAX_ROT * 0.6; // less aggressive on X
    this._transY.target = -ny * CardPhysics.MAX_Y * 0.5;
  }

  _onMouseLeave() {
    this._hovering = false;
    this._resetTargets();
  }

  _resetTargets() {
    this._rotX.target   = 0;
    this._rotY.target   = 0;
    this._transY.target = 0;
    this._scale.target  = 1;
  }

  _clearTransform() {
    if (this.el) {
      this.el.style.transform = '';
      this.el.style.filter    = '';
      this.el.style.pointerEvents = '';
    }
  }
}
