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

  /** Get (or generate) a named texture. Returns procedural immediately; swaps to PNG if found. */
  get(name) {
    if (this._cache.has(name)) return this._cache.get(name);
    const gen = `_${name}`;
    const hasProcedural = typeof this[gen] === 'function';

    if (!hasProcedural) {
      console.warn(`TextureGenerator: unknown texture "${name}"`);
      return null;
    }

    const tex = this[gen]();
    this._cache.set(name, tex);

    // Async PNG override — HEAD check first to avoid 404 console noise
    const url = `assets/textures/dungeon/${name}.png`;
    fetch(url, { method: 'HEAD' })
      .then(r => {
        if (!r.ok) return;
        new THREE.TextureLoader().load(url, (loaded) => {
          loaded.wrapS    = loaded.wrapT    = THREE.RepeatWrapping;
          loaded.magFilter                  = THREE.NearestFilter;
          loaded.minFilter                  = THREE.LinearMipmapLinearFilter;
          loaded.generateMipmaps            = true;
          loaded.repeat.copy(tex.repeat);   // preserve repeat set by GeometryFactory
          this._cache.set(name, loaded);
          // Mutate the existing texture so live materials update automatically
          tex.image       = loaded.image;
          tex.needsUpdate = true;
        });
      })
      .catch(() => {});

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
    tex.magFilter  = THREE.NearestFilter;              // pixel-art: sharp close-up
    tex.minFilter  = THREE.LinearMipmapLinearFilter;   // smooth mip transitions at distance
    tex.generateMipmaps = true;
    return tex;
  }

  // Dark-Bit Glitch palette constants
  static PITCH_BLACK  = '#000000';
  static CHARCOAL     = '#1a1a1a';
  static ASH          = '#3c3c3c';
  static BONE_WHITE   = '#c8c8b4';
  static NEON_MAGENTA = [255,   0, 255];
  static ELEC_CYAN    = [  0, 255, 255];

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

  /**
   * Scatter neon pixel clusters — digital corruption glitch accent.
   * density = probability per pixel (0.001–0.01 typical)
   */
  _glitchPixels(ctx, w, h, density = 0.003) {
    const id = ctx.getImageData(0, 0, w, h);
    const d  = id.data;
    const [mr, mg, mb] = TextureGenerator.NEON_MAGENTA;
    const [cr, cg, cb] = TextureGenerator.ELEC_CYAN;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.random() < density) {
        const isCyan = Math.random() < 0.5;
        d[i]   = isCyan ? cr : mr;
        d[i+1] = isCyan ? cg : mg;
        d[i+2] = isCyan ? cb : mb;
        d[i+3] = 255;
      }
    }
    ctx.putImageData(id, 0, 0);
  }

  // ─── stone wall — Dark-Bit Glitch ────────────────────────────────────────

  _stoneWallCanvas() {
    const W = 256, H = 256;
    const [c, ctx] = this._canvas(W, H);

    // Pitch-black base
    ctx.fillStyle = TextureGenerator.PITCH_BLACK;
    ctx.fillRect(0, 0, W, H);

    // Charcoal running-bond blocks — increased brightness for normal-map depth reads
    const BW = 64, BH = 40;
    const rows = Math.ceil(H / BH) + 1;
    const cols = Math.ceil(W / BW) + 2;
    for (let row = 0; row < rows; row++) {
      const ox = (row % 2) ? BW * 0.5 : 0;
      for (let col = 0; col < cols; col++) {
        const x  = Math.round(col * BW - ox);
        const y  = Math.round(row * BH);
        // Higher contrast: 80–160 range (31–63%) — detail visible in low torch light
        const v  = 80 + Math.floor(Math.random() * 80);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x + 1, y + 1, BW - 2, BH - 2);
        // Bright top-edge highlight (bevel)
        ctx.fillStyle = `rgba(220,216,195,${0.55 + Math.random() * 0.30})`;
        ctx.fillRect(x + 1, y + 1, BW - 2, 2);
        // Strong bottom shadow
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(x + 1, y + BH - 3, BW - 2, 2);
        // Right shadow edge
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(x + BW - 2, y + 1, 1, BH - 2);
      }
    }

    // Mortar lines (1px black between blocks)
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 1;
    for (let row = 0; row < rows; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * BH); ctx.lineTo(W, row * BH);
      ctx.stroke();
    }

    // Bone-white diagonal crack lines
    ctx.strokeStyle = `rgba(200,196,172,0.60)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const x0 = Math.random() * W, y0 = Math.random() * H;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + (Math.random() - 0.5) * 60, y0 + Math.random() * 50);
      ctx.stroke();
    }

    // Sparse glitch pixels
    this._glitchPixels(ctx, W, H, 0.003);
    return [c, ctx];
  }

  _stoneWall() {
    const [c] = this._stoneWallCanvas();
    return this._wrap(new THREE.CanvasTexture(c));
  }

  // ─── stone floor — Dark-Bit Glitch ───────────────────────────────────────

  _stoneFloorCanvas() {
    const W = 256, H = 256;
    const [c, ctx] = this._canvas(W, H);

    // Near-black base
    ctx.fillStyle = '#060606';
    ctx.fillRect(0, 0, W, H);

    // Large slabs — strong edge contrast for normal-map depth
    const SW = 80, SH = 80;
    for (let row = 0; row <= Math.ceil(H / SH); row++) {
      for (let col = 0; col <= Math.ceil(W / SW); col++) {
        const x = col * SW;
        const y = row * SH;
        // Higher contrast: 60–130 (24–51%)
        const v = 60 + Math.floor(Math.random() * 70);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x + 2, y + 2, SW - 4, SH - 4);
        // Bright top-left bevel
        ctx.fillStyle = `rgba(190,188,168,0.50)`;
        ctx.fillRect(x + 2, y + 2, SW - 4, 2);
        ctx.fillRect(x + 2, y + 2, 2, SH - 4);
        // Dark bottom-right shadow
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x + 2, y + SH - 4, SW - 4, 2);
        ctx.fillRect(x + SW - 4, y + 2, 2, SH - 4);
      }
    }

    // Deep grout lines
    ctx.strokeStyle = 'rgba(0,0,0,0.95)';
    ctx.lineWidth = 2;
    for (let row = 0; row <= Math.ceil(H / SH); row++) {
      ctx.beginPath(); ctx.moveTo(0, row*SH); ctx.lineTo(W, row*SH); ctx.stroke();
    }
    for (let col = 0; col <= Math.ceil(W / SW); col++) {
      ctx.beginPath(); ctx.moveTo(col*SW, 0); ctx.lineTo(col*SW, H); ctx.stroke();
    }

    // Faint worn path
    ctx.strokeStyle = 'rgba(190,186,162,0.07)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(W * 0.3, 0);
    ctx.quadraticCurveTo(W * 0.5, H * 0.5, W * 0.7, H);
    ctx.stroke();

    this._glitchPixels(ctx, W, H, 0.002);
    return [c, ctx];
  }

  _stoneFloor() {
    const [c] = this._stoneFloorCanvas();
    return this._wrap(new THREE.CanvasTexture(c));
  }

  // ─── ceiling — Dark-Bit Glitch ────────────────────────────────────────────

  _ceiling() {
    const W = 256, H = 256;
    const [c, ctx] = this._canvas(W, H);

    // Absolute pitch black
    ctx.fillStyle = TextureGenerator.PITCH_BLACK;
    ctx.fillRect(0, 0, W, H);

    // Barely-visible block variation (1-6% brightness)
    const id = ctx.getImageData(0, 0, W, H);
    const d  = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.floor(Math.random() * 15);
      d[i] = d[i+1] = d[i+2] = v;
      d[i+3] = 255;
    }
    ctx.putImageData(id, 0, 0);

    // Very rare cyan glitch — almost invisible ceiling seams
    this._glitchPixels(ctx, W, H, 0.0005);

    return this._wrap(new THREE.CanvasTexture(c));
  }

  // ─── door — dark iron with cyan rune glyph ───────────────────────────────

  _woodDoor() {
    const W = 128, H = 256;
    const [c, ctx] = this._canvas(W, H);

    // Near-black iron base
    ctx.fillStyle = '#0a0a0e';
    ctx.fillRect(0, 0, W, H);

    // Two vertical iron plates
    for (let p = 0; p < 2; p++) {
      const px = p * (W / 2);
      const v = 22 + Math.floor(Math.random() * 12);
      ctx.fillStyle = `rgb(${v},${v},${v + 4})`;
      ctx.fillRect(px + 2, 2, W / 2 - 4, H - 4);
      // Left bevel highlight
      ctx.fillStyle = 'rgba(180,180,200,0.18)';
      ctx.fillRect(px + 2, 2, 1, H - 4);
    }

    // Horizontal reinforcement bands
    for (let b = 0; b < 4; b++) {
      const by = Math.round(H * (0.15 + b * 0.23));
      ctx.fillStyle = '#2e2e32';
      ctx.fillRect(0, by, W, 7);
      // Rivets
      for (let r = 0; r < 4; r++) {
        const rx = Math.round(W * (0.15 + r * 0.23));
        ctx.fillStyle = '#484850';
        ctx.beginPath(); ctx.arc(rx, by + 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#707078';
        ctx.beginPath(); ctx.arc(rx - 1, by + 2, 1, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Cyan rune glyph centre — Dark-Bit Glitch accent
    ctx.strokeStyle = 'rgba(0,220,220,0.65)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'square';
    const cx = W * 0.5, cy = H * 0.5;
    ctx.beginPath();
    // Vertical bar
    ctx.moveTo(cx, cy - 28); ctx.lineTo(cx, cy + 28);
    // Horizontal bar
    ctx.moveTo(cx - 20, cy); ctx.lineTo(cx + 20, cy);
    // Diagonal ticks
    ctx.moveTo(cx - 14, cy - 16); ctx.lineTo(cx + 14, cy + 16);
    ctx.moveTo(cx + 14, cy - 16); ctx.lineTo(cx - 14, cy + 16);
    ctx.stroke();
    // Glyph glow cluster
    this._glitchPixels(ctx, W, H, 0.004);

    this._noise(ctx, W, H, 8);
    return this._wrap(new THREE.CanvasTexture(c));
  }

  // ─── stair / transition marker — Dark-Bit Glitch ────────────────────────

  _stairMarker() {
    const W = 256, H = 256;
    const [c, ctx] = this._canvas(W, H);

    ctx.fillStyle = TextureGenerator.PITCH_BLACK;
    ctx.fillRect(0, 0, W, H);

    // Dark charcoal stair treads — top-down orthographic
    const steps = 5;
    const stepH = Math.floor(H * 0.65 / steps);
    const startY = Math.floor(H * 0.16);
    for (let s = 0; s < steps; s++) {
      const indent = s * 14;
      const sw = W - indent * 2;
      const sy = startY + s * stepH;
      const v = 16 + s * 8; // each tread slightly lighter — depth cue
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(indent, sy, sw, stepH - 2);
      // Bone-white top edge
      ctx.fillStyle = `rgba(200,196,172,${0.4 + s * 0.06})`;
      ctx.fillRect(indent, sy, sw, 1);
      // Black shadow bottom edge
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(indent, sy + stepH - 2, sw, 2);
    }

    // Cyan chevron arrow — destination indicator
    ctx.strokeStyle = 'rgba(0,255,220,0.75)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(W * 0.38, H * 0.78);
    ctx.lineTo(W * 0.50, H * 0.88);
    ctx.lineTo(W * 0.62, H * 0.78);
    ctx.stroke();
    // Second chevron (double arrow)
    ctx.strokeStyle = 'rgba(0,200,200,0.45)';
    ctx.beginPath();
    ctx.moveTo(W * 0.38, H * 0.70);
    ctx.lineTo(W * 0.50, H * 0.80);
    ctx.lineTo(W * 0.62, H * 0.70);
    ctx.stroke();

    this._glitchPixels(ctx, W, H, 0.004);
    return this._wrap(new THREE.CanvasTexture(c));
  }

  // ─── dark smooth slate wall ──────────────────────────────────────────────
  _slateWallCanvas() {
    const W = 256, H = 256;
    const [c, ctx] = this._canvas(W, H);

    // Very dark blue-black base
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, W, H);

    // Wide horizontal courses — boosted contrast for normal-map read
    const BH = 56, BW = 80;
    const rows = Math.ceil(H / BH) + 1;
    for (let row = 0; row < rows; row++) {
      const ox = (row % 2) ? BW * 0.5 : 0;
      const cols = Math.ceil(W / BW) + 2;
      for (let col = 0; col < cols; col++) {
        const x = Math.round(col * BW - ox);
        const y = Math.round(row * BH);
        const v = 55 + Math.floor(Math.random() * 60); // 55–115 range
        ctx.fillStyle = `rgb(${v},${v},${Math.min(255,v+12)})`;
        ctx.fillRect(x + 1, y + 1, BW - 2, BH - 2);
        // Top-edge sheen
        ctx.fillStyle = `rgba(160,170,230,${0.30 + Math.random() * 0.20})`;
        ctx.fillRect(x + 1, y + 1, BW - 2, 2);
        // Bottom shadow
        ctx.fillStyle = 'rgba(0,0,0,0.70)';
        ctx.fillRect(x + 1, y + BH - 3, BW - 2, 2);
      }
    }

    // Mortar lines
    ctx.strokeStyle = 'rgba(0,0,0,0.90)';
    ctx.lineWidth = 1;
    for (let row = 1; row < rows; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * BH); ctx.lineTo(W, row * BH);
      ctx.stroke();
    }

    this._glitchPixels(ctx, W, H, 0.001);
    return [c, ctx];
  }

  _slateWall() {
    const [c] = this._slateWallCanvas();
    return this._wrap(new THREE.CanvasTexture(c));
  }

  // ─── rough cave wall — irregular, porous stone ───────────────────────────
  _roughWall() {
    const W = 256, H = 256;
    const [c, ctx] = this._canvas(W, H);

    ctx.fillStyle = '#0c0907';
    ctx.fillRect(0, 0, W, H);

    // Irregular polygon-like stone chunks
    for (let i = 0; i < 40; i++) {
      const cx2 = Math.random() * W;
      const cy2 = Math.random() * H;
      const rx  = 12 + Math.random() * 32;
      const ry  = 10 + Math.random() * 22;
      const v   = 28 + Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgb(${v+4},${v},${Math.max(0,v-4)})`;
      ctx.beginPath();
      // Slightly irregular ellipse
      ctx.ellipse(cx2, cy2, rx + (Math.random()-0.5)*8, ry + (Math.random()-0.5)*6,
        Math.random() * Math.PI, 0, Math.PI*2);
      ctx.fill();
      // Dark outline
      ctx.strokeStyle = `rgba(0,0,0,0.6)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Diagonal crack network
    ctx.strokeStyle = `rgba(180,164,140,0.35)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const x0 = Math.random() * W, y0 = Math.random() * H;
      ctx.moveTo(x0, y0);
      for (let j = 0; j < 3; j++) {
        ctx.lineTo(x0 + (Math.random()-0.5)*80, y0 + Math.random()*60);
      }
      ctx.stroke();
    }

    this._noise(ctx, W, H, 12);
    this._glitchPixels(ctx, W, H, 0.002);
    return this._wrap(new THREE.CanvasTexture(c));
  }

  // ─── dark/corrupted floor ─────────────────────────────────────────────────
  _darkFloorCanvas() {
    const W = 256, H = 256;
    const [c, ctx] = this._canvas(W, H);

    ctx.fillStyle = '#030305';
    ctx.fillRect(0, 0, W, H);

    // Irregular flagstone tiles — higher contrast for normal map
    const id = ctx.getImageData(0, 0, W, H);
    const d  = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 28 + Math.floor(Math.random() * 50); // 28–78 range
      d[i] = v + 2; d[i+1] = v; d[i+2] = v + 6; d[i+3] = 255;
    }
    ctx.putImageData(id, 0, 0);

    // Irregular tile patches (flagstone look)
    for (let i = 0; i < 12; i++) {
      const tx = Math.random() * W, ty = Math.random() * H;
      const tw = 30 + Math.random() * 50, th = 25 + Math.random() * 40;
      const v  = 55 + Math.floor(Math.random() * 50);
      ctx.fillStyle = `rgba(${v+2},${v},${v+6},0.6)`;
      ctx.fillRect(tx, ty, tw, th);
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tx, ty, tw, th);
    }

    // Cracks
    ctx.strokeStyle = 'rgba(100,80,60,0.40)';
    ctx.lineWidth = 1.5;
    const ox = W * 0.5, oy = H * 0.45;
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + Math.random()*0.4;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(ang)*70 + (Math.random()-0.5)*20,
                 oy + Math.sin(ang)*70 + (Math.random()-0.5)*20);
      ctx.stroke();
    }

    this._glitchPixels(ctx, W, H, 0.003);
    return [c, ctx];
  }

  _darkFloor() {
    const [c] = this._darkFloorCanvas();
    return this._wrap(new THREE.CanvasTexture(c));
  }

  // ─── arcane/rune floor — mystical symbols ────────────────────────────────
  _arcaneFloor() {
    const W = 256, H = 256;
    const [c, ctx] = this._canvas(W, H);

    // Deep purple-black
    ctx.fillStyle = '#050310';
    ctx.fillRect(0, 0, W, H);

    // Circular rune pattern near centre
    const cx2 = W * 0.5, cy2 = H * 0.5;
    ctx.strokeStyle = 'rgba(80,40,200,0.30)';
    ctx.lineWidth = 1;
    for (let r = 20; r <= 90; r += 22) {
      ctx.beginPath();
      ctx.arc(cx2, cy2, r, 0, Math.PI*2);
      ctx.stroke();
    }
    // Cross lines
    ctx.strokeStyle = 'rgba(60,20,160,0.22)';
    ctx.beginPath();
    ctx.moveTo(cx2-100, cy2); ctx.lineTo(cx2+100, cy2);
    ctx.moveTo(cx2, cy2-100); ctx.lineTo(cx2, cy2+100);
    ctx.stroke();
    // Faint cyan accent
    ctx.strokeStyle = 'rgba(0,200,200,0.12)';
    ctx.beginPath();
    ctx.moveTo(cx2-70, cy2-70); ctx.lineTo(cx2+70, cy2+70);
    ctx.moveTo(cx2+70, cy2-70); ctx.lineTo(cx2-70, cy2+70);
    ctx.stroke();

    this._noise(ctx, W, H, 5);
    this._glitchPixels(ctx, W, H, 0.004);
    return this._wrap(new THREE.CanvasTexture(c));
  }

  // ─── procedural normal-map generator (Sobel filter) ─────────────────────

  /**
   * Derive a tangent-space normal map from an existing canvas.
   * Treats grayscale luminance as height; applies Sobel 3×3 kernel.
   * @param {HTMLCanvasElement} src - source canvas (colour or height)
   * @param {number} strength - exaggeration factor (1.5–3.0 typical)
   * @returns {HTMLCanvasElement} new canvas with RGB-encoded normals
   */
  _sobelNormal(src, strength = 2.0) {
    const W = src.width, H = src.height;
    const sCtx = src.getContext('2d');
    const srcD = sCtx.getImageData(0, 0, W, H).data;

    // Luminance height map
    const h = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const b = i * 4;
      h[i] = (0.299 * srcD[b] + 0.587 * srcD[b+1] + 0.114 * srcD[b+2]) / 255;
    }

    const [nc, nCtx] = this._canvas(W, H);
    const nd = nCtx.getImageData(0, 0, W, H);
    const d  = nd.data;

    const at = (x, y) => h[((y + H) % H) * W + ((x + W) % W)];

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        // Sobel X (right − left, 3-tap weighted)
        const nx = (
          -at(x-1,y-1) - 2*at(x-1,y) - at(x-1,y+1) +
           at(x+1,y-1) + 2*at(x+1,y) + at(x+1,y+1)
        ) * strength;
        // Sobel Y (bottom − top)
        const ny = (
          -at(x-1,y-1) - 2*at(x,y-1) - at(x+1,y-1) +
           at(x-1,y+1) + 2*at(x,y+1) + at(x+1,y+1)
        ) * strength;

        const len = Math.sqrt(nx*nx + ny*ny + 1) || 1;
        const i = (y * W + x) * 4;
        d[i]   = Math.round(( nx/len * 0.5 + 0.5) * 255); // R = X
        d[i+1] = Math.round((-ny/len * 0.5 + 0.5) * 255); // G = Y (OpenGL convention)
        d[i+2] = Math.round(( 1/len  * 0.5 + 0.5) * 255); // B = Z
        d[i+3] = 255;
      }
    }

    nCtx.putImageData(nd, 0, 0);
    return nc;
  }

  // Normal maps derived from each surface's colour texture
  _stoneWallNormal() {
    const [c] = this._stoneWallCanvas();
    return this._wrap(new THREE.CanvasTexture(this._sobelNormal(c, 2.8)));
  }
  _stoneFloorNormal() {
    const [c] = this._stoneFloorCanvas();
    return this._wrap(new THREE.CanvasTexture(this._sobelNormal(c, 2.2)));
  }
  _slateWallNormal() {
    const [c] = this._slateWallCanvas();
    return this._wrap(new THREE.CanvasTexture(this._sobelNormal(c, 3.0)));
  }
  _darkFloorNormal() {
    const [c] = this._darkFloorCanvas();
    return this._wrap(new THREE.CanvasTexture(this._sobelNormal(c, 1.8)));
  }

  // Aliases so GeometryFactory.THEME_TEXTURES can request "<name>_normal"
  _shadow_wall_normal()  { return this._slateWallNormal();  }
  _cracked_floor_normal(){ return this._stoneFloorNormal(); }
  _rough_wall_normal()   { return this._stoneWallNormal();  }
  _dark_floor_normal()   { return this._darkFloorNormal();  }
  _slate_wall_normal()   { return this._slateWallNormal();  }
  _cracked_tile_normal() { return this._stoneFloorNormal(); }
  _arcane_floor_normal() { return this._darkFloorNormal();  }
  _stained_wall_normal() { return this._stoneWallNormal();  }

  // ─── pixel-art spritesheet tiles ─────────────────────────────────────────
  // PNGs at assets/textures/dungeon/<name>.png (512×512).
  // Procedural fallback used during HEAD check or on 404.
  // Theme → texture mapping lives in GeometryFactory.THEME_TEXTURES.
  _cracked_floor() { return this._stoneFloor(); }
  _shadow_wall()   { return this._slateWall();  }
  _stained_wall()  { return this._roughWall();  }
  _rough_wall()    { return this._roughWall();  }
  _rune_floor()    { return this._arcaneFloor(); }
  _dark_floor()    { return this._darkFloor();  }
  _slate_wall()    { return this._slateWall();  }
  _cracked_tile()  { return this._stoneFloor(); }
  _arcane_floor()  { return this._arcaneFloor(); }

  // ─── legacy generic theme textures (kept for special-zone use) ───────────
  _ruin_wall()     { return this._stoneWall();  }
  _ruin_floor()    { return this._stoneFloor(); }
  _void_wall()     { return this._slateWall();  }
  _void_floor()    { return this._arcaneFloor(); }
  _fungal_wall()   { return this._roughWall();  }
  _fungal_floor()  { return this._darkFloor();  }
}
