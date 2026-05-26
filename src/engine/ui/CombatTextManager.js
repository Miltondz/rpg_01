/**
 * CombatTextManager — ballistic DOM damage numbers.
 *
 * Spec §6: parabolic physics, scale pop, critical hierarchy.
 * Numbers spawn in #combat-text-layer (pointer-events: none, position: fixed).
 */
export class CombatTextManager {
  static GRAVITY      = 0.38;   // px/frame² downward acceleration
  static LIFETIME_MS  = 1100;   // fade-out completes here
  static INIT_VY      = -7.5;   // initial upward velocity (negative = up)
  static VX_RANGE     = 2.8;    // ±px/frame horizontal spread

  constructor() {
    this._layer  = null;
    this._active = [];  // { el, x, y, vx, vy, birth, lifetime }
    this._rafId  = null;
    this._running = false;
  }

  initialize() {
    // Create layer if not present
    let layer = document.getElementById('combat-text-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'combat-text-layer';
      document.body.appendChild(layer);
    }
    this._layer = layer;
    this._running = true;
    this._loop(performance.now());
  }

  /**
   * Spawn a damage/heal number at screen coordinates.
   * @param {number}  value      - Damage or heal amount
   * @param {{ x, y }} screenPos - Pixel coordinates on screen
   * @param {boolean} isCritical
   * @param {'damage'|'heal'|'miss'} type
   */
  spawnText(value, screenPos, isCritical = false, type = 'damage') {
    if (!this._layer || !screenPos) return;

    const el = document.createElement('div');
    el.className = 'combat-text' + (isCritical ? ' crit' : '') + ` ct-${type}`;
    el.textContent = type === 'miss' ? 'MISS' : (type === 'heal' ? `+${value}` : `${value}`);

    // Position
    el.style.left = `${screenPos.x}px`;
    el.style.top  = `${screenPos.y}px`;

    this._layer.appendChild(el);

    // Pop scale animation
    const initScale = isCritical ? 2.5 : 1.5;
    el.style.transform = `translate(-50%, -50%) scale(${initScale})`;
    // Brief delay then spring to 1.0 via CSS transition
    requestAnimationFrame(() => {
      el.style.transition = 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)';
      el.style.transform  = 'translate(-50%, -50%) scale(1)';
    });

    if (isCritical) {
      // Chaotic initial shake for first 10 frames
      this._applyInitialCritShake(el);
    }

    this._active.push({
      el,
      x: screenPos.x,
      y: screenPos.y,
      vx: (Math.random() - 0.5) * CombatTextManager.VX_RANGE * 2,
      vy: CombatTextManager.INIT_VY + (Math.random() - 0.5) * 2,
      birth: performance.now(),
      lifetime: CombatTextManager.LIFETIME_MS + (isCritical ? 300 : 0),
      shakeFrames: isCritical ? 10 : 0,
    });
  }

  dispose() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._layer) this._layer.innerHTML = '';
    this._active = [];
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _loop(now) {
    if (!this._running) return;

    const surviving = [];
    for (const p of this._active) {
      const age = now - p.birth;
      if (age >= p.lifetime) {
        p.el.remove();
        continue;
      }

      // Physics
      p.vy += CombatTextManager.GRAVITY;
      p.x  += p.vx;
      p.y  += p.vy;

      // Opacity fade in final 40%
      const lifeRatio = age / p.lifetime;
      const opacity   = lifeRatio > 0.6 ? 1 - ((lifeRatio - 0.6) / 0.4) : 1;

      // Crit shake override for first N frames
      let extraTransform = '';
      if (p.shakeFrames > 0) {
        p.shakeFrames--;
        const sx = (Math.random() - 0.5) * 5;
        const sy = (Math.random() - 0.5) * 5;
        extraTransform = ` translate(${sx}px, ${sy}px)`;
      }

      p.el.style.left    = `${p.x}px`;
      p.el.style.top     = `${p.y}px`;
      p.el.style.opacity = opacity;
      if (extraTransform) {
        p.el.style.transform = `translate(-50%, -50%) scale(1)${extraTransform}`;
      }

      surviving.push(p);
    }

    this._active = surviving;
    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  _applyInitialCritShake(el) {
    // Add pulsing glow class for crits — CSS handles it
    el.style.animation = 'critPulse 0.15s ease-out 3';
  }
}

// Singleton
export const combatTextManager = new CombatTextManager();
