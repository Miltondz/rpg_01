/**
 * TextureGenerator — procedural canvas textures for dungeon geometry.
 * All textures are generated once, cached, and shared across materials.
 * Drop a real PNG at assets/textures/dungeon/<name>.png to override any texture —
 * GeometryFactory checks that path first and falls back to procedural only on 404.
 */
export class TextureGenerator {
  constructor() {
    this._cache = new Map();
  }

  /** Get (or generate) a named texture. */
  get(name) {
    if (this._cache.has(name)) return this._cache.get(name);
    const gen = `_${name}`;
    if (typeof this[gen] !== 'function') {
      console.warn(`TextureGenerator: unknown texture "${name}"`);
      return null;
    }
    const tex = this[gen]();
    this._cache.set(name, tex);
    return tex;
  }

  dispose() {
    for (const tex of this._cache.values()) tex.dispose();
    this._cache.clear();
  }

  // ─── internal helpers ────────────────────────────────────────────────────

  _canvas(w = 256, h = 256) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  }

  _wrap(tex) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    return tex;
  }

  /** Per-pixel luminance noise. amount = max ± delta (0-255). */
  _noise(ctx, w, h, amount) {
    const id = ctx.getImageData(0, 0, w, h);
    const d  = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 2 * amount;
      d[i]   = Math.min(255, Math.max(0, d[i]   + n));
      d[i+1] = Math.min(255, Math.max(0, d[i+1] + n));
      d[i+2] = Math.min(255, Math.max(0, d[i+2] + n));
    }
    ctx.putImageData(id, 0, 0);
  }

  /** Scratch/vein lines — adds worn surface detail. */
  _scratches(ctx, w, h, count = 12, alpha = 0.12) {
    for (let i = 0; i < count; i++) {
      ctx.save();
      ctx.strokeStyle = `rgba(0,0,0,${alpha + Math.random() * alpha})`;
      ctx.lineWidth   = Math.random() * 1.2 + 0.3;
      ctx.beginPath();
      const x0 = Math.random() * w, y0 = Math.random() * h;
      const len = 10 + Math.random() * 40;
      const ang = Math.random() * Math.PI * 2;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Running-bond stone block grid. */
  _stoneGrid(ctx, w, h, bw, bh, rBase, gBase, bBase, brightRange) {
    // mortar already on background; draw stones on top
    const rows = Math.ceil(h / bh) + 1;
    const cols = Math.ceil(w / bw) + 2;
    for (let row = 0; row < rows; row++) {
      const ox = (row % 2 === 0) ? 0 : bw * 0.5;
      for (let col = 0; col < cols; col++) {
        const x  = Math.round(col * bw - ox);
        const y  = Math.round(row * bh);
        const vw = bw - 4 + (Math.random() - 0.5) * 6;
        const vh = bh - 3 + (Math.random() - 0.5) * 5;
        const br = (1 - brightRange * 0.5) + Math.random() * brightRange;
        const r  = Math.round(rBase * br);
        const g  = Math.round(gBase * br);
        const b  = Math.round(bBase * br);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x + 2, y + 2, vw, vh);
        // subtle highlight on top edge — simulates ambient bounce
        ctx.fillStyle = `rgba(255,240,210,${0.04 + Math.random() * 0.04})`;
        ctx.fillRect(x + 2, y + 2, vw, 1);
      }
    }
  }

  // ─── stone wall ──────────────────────────────────────────────────────────

  _stoneWall() {
    const W = 256, H = 256;
    const [c, ctx] = this._canvas(W, H);

    // mortar (dark brownish-grey)
    ctx.fillStyle = '#191410';
    ctx.fillRect(0, 0, W, H);

    // running-bond blocks
    this._stoneGrid(ctx, W, H, 70, 44, 68, 58, 44, 0.32);

    // moss/stain patches — a few low-opacity green smears
    for (let i = 0; i < 6; i++) {
      const gx = Math.random() * W, gy = Math.random() * H;
      const gr = 20 + Math.random() * 30;
      const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      grd.addColorStop(0, `rgba(20,35,8,${0.18 + Math.random() * 0.14})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }

    this._scratches(ctx, W, H, 14, 0.10);
    this._noise(ctx, W, H, 16);

    return this._wrap(new THREE.CanvasTexture(c));
  }

  // ─── stone floor ─────────────────────────────────────────────────────────

  _stoneFloor() {
    const W = 256, H = 256;
    const [c, ctx] = this._canvas(W, H);

    // mortar
    ctx.fillStyle = '#100e0b';
    ctx.fillRect(0, 0, W, H);

    // large floor slabs — more square than wall blocks
    this._stoneGrid(ctx, W, H, 92, 88, 52, 44, 34, 0.26);

    // worn path marks
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.strokeStyle = `rgba(0,0,0,${0.18 + Math.random() * 0.15})`;
      ctx.lineWidth   = 1.5 + Math.random() * 2;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(Math.random() * W, Math.random() * H);
      ctx.quadraticCurveTo(
        Math.random() * W, Math.random() * H,
        Math.random() * W, Math.random() * H
      );
      ctx.stroke();
      ctx.restore();
    }

    this._scratches(ctx, W, H, 8, 0.09);
    this._noise(ctx, W, H, 12);

    return this._wrap(new THREE.CanvasTexture(c));
  }

  // ─── ceiling ─────────────────────────────────────────────────────────────

  _ceiling() {
    const W = 256, H = 256;
    const [c, ctx] = this._canvas(W, H);

    // very dark base
    ctx.fillStyle = '#0b0a09';
    ctx.fillRect(0, 0, W, H);

    // rough, barely-visible stone blocks
    this._stoneGrid(ctx, W, H, 78, 56, 30, 26, 20, 0.20);

    // grime/soot patches
    for (let i = 0; i < 8; i++) {
      const gx = Math.random() * W, gy = Math.random() * H;
      const gr = 15 + Math.random() * 35;
      const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      grd.addColorStop(0, `rgba(0,0,0,${0.25 + Math.random() * 0.2})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }

    this._noise(ctx, W, H, 10);

    return this._wrap(new THREE.CanvasTexture(c));
  }

  // ─── wood door ───────────────────────────────────────────────────────────

  _woodDoor() {
    const W = 128, H = 256;
    const [c, ctx] = this._canvas(W, H);

    // frame / dark surround
    ctx.fillStyle = '#1c0f06';
    ctx.fillRect(0, 0, W, H);

    // 6 horizontal planks
    const plankCount = 6;
    const pH = Math.floor((H - 4) / plankCount);
    for (let i = 0; i < plankCount; i++) {
      const y0 = 2 + i * pH;
      const br = 0.65 + Math.random() * 0.35;
      const r  = Math.round(105 * br);
      const g  = Math.round(58  * br);
      const b  = Math.round(18  * br);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(3, y0 + 1, W - 6, pH - 2);

      // wood grain — faint vertical streaks
      for (let gl = 0; gl < 10; gl++) {
        const gx = 4 + Math.random() * (W - 8);
        ctx.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.12})`;
        ctx.lineWidth   = 0.5 + Math.random();
        ctx.beginPath();
        ctx.moveTo(gx, y0);
        ctx.lineTo(gx + (Math.random() - 0.5) * 6, y0 + pH);
        ctx.stroke();
      }

      // top-edge plank bevel
      ctx.fillStyle = `rgba(255,230,190,${0.08 + Math.random() * 0.04})`;
      ctx.fillRect(3, y0 + 1, W - 6, 1);
    }

    // horizontal iron reinforcement band (middle)
    const bandY = Math.round(H * 0.48);
    ctx.fillStyle = '#262626';
    ctx.fillRect(0, bandY - 8, W, 16);
    // band rivets
    for (let ri = 0; ri < 5; ri++) {
      const rx = Math.round(W * 0.1 + ri * W * 0.2);
      ctx.fillStyle = '#484848';
      ctx.beginPath();
      ctx.arc(rx, bandY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#707070';
      ctx.beginPath();
      ctx.arc(rx - 1, bandY - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // corner studs
    const studs = [[16,20],[W-16,20],[16,H-20],[W-16,H-20]];
    for (const [sx, sy] of studs) {
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6a6a6a';
      ctx.beginPath(); ctx.arc(sx-1, sy-1, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    this._noise(ctx, W, H, 14);

    return this._wrap(new THREE.CanvasTexture(c));
  }

  // ─── stair / transition marker ───────────────────────────────────────────

  _stairMarker() {
    const W = 256, H = 256;
    const [c, ctx] = this._canvas(W, H);

    // dark stone floor base
    ctx.fillStyle = '#0e0c0a';
    ctx.fillRect(0, 0, W, H);

    // 5 stair treads (top-down orthographic — carved into floor)
    const steps = 5;
    const stepH = Math.floor(H * 0.7 / steps);
    const startY = Math.floor(H * 0.15);
    for (let s = 0; s < steps; s++) {
      const indent = s * 12;
      const sw = W - indent * 2;
      const sy = startY + s * stepH;
      const br = 0.4 + s * 0.1;
      ctx.fillStyle = `rgb(${Math.round(55*br)},${Math.round(48*br)},${Math.round(36*br)})`;
      ctx.fillRect(indent, sy, sw, stepH - 2);
      // shadow on bottom edge of each tread
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(indent, sy + stepH - 3, sw, 3);
      // highlight on top edge
      ctx.fillStyle = 'rgba(255,220,150,0.10)';
      ctx.fillRect(indent, sy, sw, 2);
    }

    // subtle arrow pointing down (destination indicator)
    ctx.fillStyle = 'rgba(255,200,80,0.18)';
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.82);
    ctx.lineTo(W * 0.38, H * 0.68);
    ctx.lineTo(W * 0.62, H * 0.68);
    ctx.closePath();
    ctx.fill();

    this._noise(ctx, W, H, 10);
    return this._wrap(new THREE.CanvasTexture(c));
  }
}
