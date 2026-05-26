import { Logger } from '../utils/Logger.js';

const log = Logger.tag('TargetingOverlay');

/**
 * TargetingOverlay — Bezier intent lines + vignette for PLAYER_INPUT_TARGETING state.
 *
 * Spec §1 / §9:
 *  - Full-screen Canvas 2D overlay draws animated Bezier curve from card → enemy screen pos
 *  - Dashed circles along curve (Slay the Spire style)
 *  - Ambient light dims 60% on enter, restores on exit
 *  - Radial gradient vignette via CSS overlay div
 *  - THREE.SpotLight on each valid target; concentric reticle rotates on hover
 */
export class TargetingOverlay {
  static DASH_RADIUS  = 6;    // px per node circle
  static DASH_SPACING = 20;   // px between nodes along curve
  static LINE_COLOR   = 'rgba(255, 210, 60, 0.92)';
  static LINE_WIDTH   = 3.5;
  static ANIM_SPEED   = 0.004; // dash offset animation speed (radians/ms)

  constructor(renderer) {
    this._renderer = renderer;       // Renderer instance
    this._canvas   = null;
    this._ctx      = null;
    this._vignette = null;

    this._active       = false;
    this._fromPos      = null;  // { x, y } DOM pixel origin (card centre)
    this._toPos        = null;  // { x, y } DOM pixel target (projected enemy)
    this._validTargets = [];    // CombatantEntity[]
    this._spotLights   = [];    // THREE.SpotLight[]
    this._reticles     = [];    // THREE.Mesh[] floor reticles

    this._animOffset   = 0;
    this._rafId        = null;
    this._origAmbient  = 0;    // stored ambient intensity
  }

  initialize() {
    this._createCanvas();
    this._createVignette();
  }

  /**
   * Enter targeting mode.
   * @param {CombatantEntity[]} validTargets - Entities the action can hit
   * @param {{ x, y }}          fromDOMPos   - Screen pos of origin card
   * @param {THREE.Scene}       scene
   */
  enter(validTargets, fromDOMPos, scene) {
    this._active      = true;
    this._validTargets = validTargets;
    this._fromPos     = fromDOMPos;
    this._toPos       = null;
    this._scene       = scene;

    this._canvas.style.display = 'block';
    this._vignette.style.display = 'block';

    // Dim ambient light 60%
    const amb = this._renderer?.ambientLight;
    if (amb) {
      this._origAmbient = amb.intensity;
      amb.intensity     = this._origAmbient * 0.4;
    }

    this._addSpotLights(validTargets, scene);
    this._loop(performance.now());
    log.info('targeting entered', { targets: validTargets.length });
  }

  /**
   * Update target pointer as mouse moves over valid targets.
   * @param {{ x, y }} domPos - Screen position from getBoundingClientRect() of the hovered slot
   * @param {CombatantEntity} entity - The hovered entity (for reticle update)
   */
  setHoverTarget(domPos, entity) {
    if (!this._active) return;
    if (!domPos) { this._toPos = null; return; }
    this._toPos = domPos;
    this._updateReticles(entity);
  }

  /** Leave targeting — restore scene, hide overlays. */
  exit() {
    this._active = false;
    cancelAnimationFrame(this._rafId);

    this._canvas.style.display  = 'none';
    this._vignette.style.display = 'none';

    if (this._ctx) {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }

    // Restore ambient
    const amb = this._renderer?.ambientLight;
    if (amb && this._origAmbient > 0) {
      amb.intensity = this._origAmbient;
    }

    this._removeSpotLights();
    this._removeReticles();
    log.info('targeting exited');
  }

  dispose() {
    this.exit();
    this._canvas?.remove();
    this._vignette?.remove();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _loop(now) {
    if (!this._active) return;
    this._animOffset = now * TargetingOverlay.ANIM_SPEED;
    this._draw();
    this._rotateReticles();
    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  _draw() {
    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    if (!this._fromPos || !this._toPos) return;

    const from = this._fromPos;
    const to   = this._toPos;

    // Control point: midpoint pulled upward for a nice arc
    const cpX = (from.x + to.x) * 0.5;
    const cpY = Math.min(from.y, to.y) - Math.abs(to.x - from.x) * 0.4 - 60;

    const points = this._sampleBezier(from, { x: cpX, y: cpY }, to, 120);

    // ── Outer glow backbone ──────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.strokeStyle = 'rgba(255, 130, 20, 0.22)';
    ctx.lineWidth   = 18;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();

    // ── Mid glow ────────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.strokeStyle = 'rgba(255, 200, 60, 0.45)';
    ctx.lineWidth   = 8;
    ctx.stroke();

    // ── Core spine ──────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.strokeStyle = 'rgba(255, 230, 100, 0.85)';
    ctx.lineWidth   = TargetingOverlay.LINE_WIDTH;
    ctx.stroke();
    ctx.restore();

    // ── Animated dots along the curve ───────────────────────────────────────
    let distAcc = 0;
    const offset = (this._animOffset * TargetingOverlay.DASH_SPACING) %
                   TargetingOverlay.DASH_SPACING;

    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      distAcc += Math.hypot(dx, dy);

      const bucket = Math.floor(distAcc / TargetingOverlay.DASH_SPACING);
      if (distAcc >= offset + TargetingOverlay.DASH_SPACING * bucket) {
        const t = i / points.length;
        const r = TargetingOverlay.DASH_RADIUS * (0.4 + 0.8 * t);

        // Outer halo per dot
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 140, 20, 0.35)';
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${Math.round(200 + 55 * t)}, ${Math.round(60 * (1 - t))}, 0.95)`;
        ctx.fill();
      }
    }

    // Arrow at target end
    this._drawArrowhead(ctx, points[points.length - 2], to);
  }

  _sampleBezier(p0, p1, p2, steps) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const it = 1 - t;
      pts.push({
        x: it * it * p0.x + 2 * it * t * p1.x + t * t * p2.x,
        y: it * it * p0.y + 2 * it * t * p1.y + t * t * p2.y,
      });
    }
    return pts;
  }

  _drawArrowhead(ctx, from, to) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const size  = 16;
    ctx.save();
    ctx.translate(to.x, to.y);
    ctx.rotate(angle);

    // Outer glow
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(-size - 4, -(size * 0.5 + 4));
    ctx.lineTo(-size - 4,  (size * 0.5 + 4));
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 130, 20, 0.4)';
    ctx.fill();

    // Core arrow
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(-size, -size * 0.45);
    ctx.lineTo(-size,  size * 0.45);
    ctx.closePath();
    ctx.fillStyle = TargetingOverlay.LINE_COLOR;
    ctx.fill();

    ctx.restore();
  }

  _addSpotLights(targets, scene) {
    if (!scene) return;
    for (const entity of targets) {
      if (!entity.mesh) continue;
      const spot = new THREE.SpotLight(0xffe0a0, 1.8, 8, Math.PI / 5, 0.4, 1.5);
      const pos  = entity.homePos?.clone() ?? new THREE.Vector3();
      spot.position.set(pos.x, pos.y + 6, pos.z);
      spot.target  = entity.mesh;
      spot.userData.targetId = entity.id;
      scene.add(spot);
      scene.add(spot.target);
      this._spotLights.push(spot);

      // Floor reticle
      const reticle = this._createReticle(pos);
      scene.add(reticle);
      this._reticles.push({ mesh: reticle, entityId: entity.id });
    }
  }

  _createReticle(pos) {
    const geo = new THREE.RingGeometry(0.55, 0.70, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe060,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 0.02, pos.z);
    return mesh;
  }

  _rotateReticles() {
    for (const r of this._reticles) {
      r.mesh.rotation.y += 0.025;
    }
  }

  _updateReticles(hoveredEntity) {
    for (const r of this._reticles) {
      const mat = r.mesh.material;
      mat.opacity = r.entityId === hoveredEntity?.id ? 1.0 : 0.4;
      mat.color.setHex(r.entityId === hoveredEntity?.id ? 0xfff200 : 0xffe060);
    }
  }

  _removeSpotLights() {
    for (const spot of this._spotLights) {
      spot.parent?.remove(spot);
      spot.dispose?.();
    }
    this._spotLights = [];
  }

  _removeReticles() {
    for (const r of this._reticles) {
      r.mesh.parent?.remove(r.mesh);
      r.mesh.geometry?.dispose();
      r.mesh.material?.dispose();
    }
    this._reticles = [];
  }

  _createCanvas() {
    let c = document.getElementById('targeting-canvas');
    if (!c) {
      c = document.createElement('canvas');
      c.id = 'targeting-canvas';
      document.body.appendChild(c);
    }
    c.style.cssText = [
      'position:fixed', 'inset:0', 'width:100%', 'height:100%',
      'pointer-events:none', 'z-index:8000', 'display:none',
    ].join(';');
    this._canvas = c;
    this._ctx    = c.getContext('2d');
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());
  }

  _resizeCanvas() {
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
  }

  _createVignette() {
    let v = document.getElementById('targeting-vignette');
    if (!v) {
      v = document.createElement('div');
      v.id = 'targeting-vignette';
      document.body.appendChild(v);
    }
    v.style.cssText = [
      'position:fixed', 'inset:0',
      'background:radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.78) 100%)',
      'pointer-events:none', 'z-index:7900', 'display:none',
    ].join(';');
    this._vignette = v;
  }
}
