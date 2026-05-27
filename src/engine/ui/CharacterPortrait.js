/**
 * CharacterPortrait — procedural canvas art for party members and enemies.
 * No external assets. All drawings use Canvas 2D API with geometric shapes.
 *
 * Usage:
 *   const canvas = CharacterPortrait.createCanvas('warrior', 96, 128);
 *   document.body.appendChild(canvas);                       // DOM card avatar
 *
 *   const tex = new THREE.CanvasTexture(
 *     CharacterPortrait.createCanvas('goblin', 128, 128));   // 3D sprite texture
 */
export class CharacterPortrait {
  /**
   * Create a new <canvas> element with the portrait drawn.
   * @param {string} typeKey - character class or enemy type (case-insensitive)
   * @param {number} w - canvas pixel width
   * @param {number} h - canvas pixel height
   */
  static createCanvas(typeKey, w = 96, h = 128) {
    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    CharacterPortrait.draw(canvas, typeKey);
    return canvas;
  }

  /**
   * (Re)draw a portrait onto an existing canvas.
   * Tries assets/portraits/<key>.png first; falls back to procedural Canvas 2D.
   */
  static draw(canvas, typeKey) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const key = String(typeKey || 'unknown').toLowerCase().replace(/[^a-z_]/g, '_');

    const drawProcedural = () => {
      ctx.clearRect(0, 0, w, h);
      const fn = _P[key] || _P.unknown;
      fn(ctx, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    };

    // Draw procedural immediately as placeholder
    drawProcedural();

    // Attempt PNG override
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    };
    img.src = `assets/portraits/${key}.png`;
  }

  /**
   * Feature #24: Animated portrait using a horizontal spritesheet.
   * Falls back to procedural idle blink if no spritesheet is found.
   *
   * @param {string} typeKey - character class or enemy type
   * @param {number} w - canvas width
   * @param {number} h - canvas height
   * @param {number} frameCount - number of frames in spritesheet
   * @param {number} fps - animation speed in frames per second
   * @returns {HTMLCanvasElement} with _stopAnimation() method attached
   */
  static createAnimatedCanvas(typeKey, w = 96, h = 128, frameCount = 4, fps = 2) {
    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const key = String(typeKey || 'unknown').toLowerCase().replace(/[^a-z_]/g, '_');
    const sheetSrc = `assets/portraits/${key}_sheet.png`;
    let frame = 0;

    // Try spritesheet first
    const sheet = new Image();
    let useSheet = false;
    sheet.onload = () => { useSheet = true; };
    sheet.src = sheetSrc;

    // Draw procedural first as placeholder
    CharacterPortrait.draw(canvas, typeKey);

    const draw = () => {
      if (useSheet && sheet.complete) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(sheet, frame * w, 0, w, h, 0, 0, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
      } else {
        // Procedural idle: subtle blink every 2 frames
        if (frame % (frameCount - 1) === 0 && frame !== 0) {
          const _fn = _P[key] || _P.unknown;
          if (_fn) {
            ctx.clearRect(0, 0, w, h);
            _fn(ctx, w, h);
            // Darken eyes slightly for blink
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(Math.floor(w * 0.25), Math.floor(h * 0.32),
                         Math.floor(w * 0.5), Math.floor(h * 0.06));
          }
        }
      }
      frame = (frame + 1) % frameCount;
    };

    const interval = setInterval(draw, Math.round(1000 / fps));
    canvas._stopAnimation = () => clearInterval(interval);
    return canvas;
  }
}

// ─── Private drawing helpers ──────────────────────────────────────────────────

function _bg(ctx, w, h, top, bot) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function _circle(ctx, x, y, r, fill, stroke, lw = 1.5) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill)   { ctx.fillStyle   = fill;   ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function _rect(ctx, x, y, w, h, fill, stroke, lw = 1.5) {
  if (fill)   { ctx.fillStyle   = fill;   ctx.fillRect(x, y, w, h); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); }
}

function _poly(ctx, pts, fill, stroke, lw = 1.5) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill)   { ctx.fillStyle   = fill;   ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function _line(ctx, x1, y1, x2, y2, color, lw = 2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth   = lw;
  ctx.stroke();
}

function _face(ctx, cx, cy, r, skin, eyeColor = '#221100') {
  _circle(ctx, cx, cy, r, skin);
  _circle(ctx, cx - r * 0.30, cy - r * 0.05, r * 0.13, eyeColor);
  _circle(ctx, cx + r * 0.30, cy - r * 0.05, r * 0.13, eyeColor);
}

// ─── Portrait library ─────────────────────────────────────────────────────────
const _P = {};

// ── PARTY CLASSES ─────────────────────────────────────────────────────────────

_P.warrior = (ctx, w, h) => {
  _bg(ctx, w, h, '#081422', '#0f2a48');
  const cx = w / 2;
  // Helmet
  _circle(ctx, cx, h * 0.21, w * 0.14, '#5a6e80', '#88aacc', 1.5);
  _rect(ctx, cx - w * 0.09, h * 0.23, w * 0.18, h * 0.06, '#2a4a7a');
  // Face
  _face(ctx, cx, h * 0.21, w * 0.09, '#cc9966', '#331100');
  // Shoulder pads
  _rect(ctx, cx - w * 0.30, h * 0.34, w * 0.11, h * 0.13, '#4a5e6e', '#6688aa', 1);
  _rect(ctx, cx + w * 0.19, h * 0.34, w * 0.11, h * 0.13, '#4a5e6e', '#6688aa', 1);
  // Torso (plate)
  _rect(ctx, cx - w * 0.20, h * 0.35, w * 0.40, h * 0.28, '#3a4e5e');
  _rect(ctx, cx - w * 0.10, h * 0.37, w * 0.20, h * 0.14, '#5a7080', '#88aacc', 1);
  // Shield (left)
  _poly(ctx, [
    [cx - w * 0.40, h * 0.40], [cx - w * 0.22, h * 0.36],
    [cx - w * 0.18, h * 0.64], [cx - w * 0.40, h * 0.70]
  ], '#1a3a8a', '#4477ff', 1.5);
  _line(ctx, cx - w * 0.36, h * 0.46, cx - w * 0.22, h * 0.58, '#4477ff', 1.5);
  _line(ctx, cx - w * 0.22, h * 0.46, cx - w * 0.36, h * 0.58, '#4477ff', 1.5);
  // Sword (right, angled)
  _line(ctx, cx + w * 0.24, h * 0.28, cx + w * 0.42, h * 0.66, '#ddd0a0', 3.5);
  _line(ctx, cx + w * 0.16, h * 0.44, cx + w * 0.32, h * 0.40, '#aaaaaa', 2.5);
  // Legs
  _rect(ctx, cx - w * 0.17, h * 0.63, w * 0.14, h * 0.25, '#2e3e4e');
  _rect(ctx, cx + w * 0.03, h * 0.63, w * 0.14, h * 0.25, '#2e3e4e');
  _rect(ctx, cx - w * 0.18, h * 0.84, w * 0.16, h * 0.08, '#1e2e3e');
  _rect(ctx, cx + w * 0.02, h * 0.84, w * 0.16, h * 0.08, '#1e2e3e');
};

_P.rogue = (ctx, w, h) => {
  _bg(ctx, w, h, '#0a0614', '#160a28');
  const cx = w / 2;
  // Cloak body
  _poly(ctx, [
    [cx - w * 0.36, h * 0.96], [cx + w * 0.36, h * 0.96],
    [cx + w * 0.24, h * 0.33], [cx - w * 0.24, h * 0.33]
  ], '#160828', '#2a1044', 1);
  // Hood
  _circle(ctx, cx, h * 0.18, w * 0.18, '#1e0c38');
  _face(ctx, cx, h * 0.20, w * 0.11, '#bb9966', '#220044');
  // Shadow over brow
  ctx.fillStyle = 'rgba(16,4,32,0.65)';
  ctx.fillRect(cx - w * 0.13, h * 0.10, w * 0.26, h * 0.08);
  // Glowing eyes
  _circle(ctx, cx - w * 0.08, h * 0.20, w * 0.038, '#cc44ff');
  _circle(ctx, cx + w * 0.08, h * 0.20, w * 0.038, '#cc44ff');
  _circle(ctx, cx - w * 0.08, h * 0.20, w * 0.07,  'rgba(190,60,255,0.18)');
  _circle(ctx, cx + w * 0.08, h * 0.20, w * 0.07,  'rgba(190,60,255,0.18)');
  // Daggers
  _line(ctx, cx + w * 0.18, h * 0.48, cx + w * 0.40, h * 0.74, '#ddddee', 2.5);
  _line(ctx, cx + w * 0.13, h * 0.50, cx + w * 0.23, h * 0.46, '#886644', 2.5);
  _line(ctx, cx - w * 0.18, h * 0.50, cx - w * 0.38, h * 0.72, '#ccccdd', 2);
  _line(ctx, cx - w * 0.13, h * 0.48, cx - w * 0.23, h * 0.44, '#886644', 2);
};

_P.mage = (ctx, w, h) => {
  _bg(ctx, w, h, '#060410', '#100828');
  const cx = w / 2;
  // Wizard hat
  _poly(ctx, [
    [cx, h * 0.01], [cx - w * 0.20, h * 0.26], [cx + w * 0.20, h * 0.26]
  ], '#3a0077', '#8833ff', 1.5);
  _poly(ctx, [
    [cx - w * 0.22, h * 0.23], [cx + w * 0.22, h * 0.23],
    [cx + w * 0.20, h * 0.30],  [cx - w * 0.20, h * 0.30]
  ], '#4a0099');
  // Hat star
  ctx.fillStyle = '#ffdd44';
  ctx.font = `${Math.floor(w * 0.12)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', cx, h * 0.14);
  // Face
  _face(ctx, cx, h * 0.36, w * 0.11, '#ccaa88', '#220044');
  // Robe
  _poly(ctx, [
    [cx - w * 0.06, h * 0.46], [cx + w * 0.06, h * 0.46],
    [cx + w * 0.30, h * 0.94], [cx - w * 0.30, h * 0.94]
  ], '#28086a');
  _line(ctx, cx - w * 0.06, h * 0.46, cx - w * 0.30, h * 0.94, '#6633cc', 1);
  _line(ctx, cx + w * 0.06, h * 0.46, cx + w * 0.30, h * 0.94, '#6633cc', 1);
  // Arms (sleeve)
  _line(ctx, cx - w * 0.06, h * 0.50, cx - w * 0.30, h * 0.62, '#28086a', 11);
  _line(ctx, cx + w * 0.06, h * 0.50, cx + w * 0.30, h * 0.58, '#28086a', 11);
  // Staff
  _line(ctx, cx + w * 0.32, h * 0.08, cx + w * 0.30, h * 0.96, '#5a3a99', 3);
  // Orb
  const og = ctx.createRadialGradient(cx + w * 0.32, h * 0.06, 0, cx + w * 0.32, h * 0.06, w * 0.09);
  og.addColorStop(0,   '#ffffff');
  og.addColorStop(0.3, '#44eeff');
  og.addColorStop(1,   'rgba(0,180,255,0)');
  ctx.fillStyle = og;
  ctx.beginPath();
  ctx.arc(cx + w * 0.32, h * 0.06, w * 0.09, 0, Math.PI * 2);
  ctx.fill();
  _circle(ctx, cx + w * 0.32, h * 0.06, w * 0.06, '#00aaee', '#88eeff', 1.5);
  // Rune on robe
  ctx.strokeStyle = '#9966ff'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.07, h * 0.62); ctx.lineTo(cx, h * 0.55);
  ctx.lineTo(cx + w * 0.07, h * 0.62);
  ctx.moveTo(cx - w * 0.07, h * 0.56); ctx.lineTo(cx + w * 0.07, h * 0.56);
  ctx.stroke();
};

_P.cleric = (ctx, w, h) => {
  _bg(ctx, w, h, '#140e00', '#221a00');
  const cx = w / 2;
  // Halo (outer glow then ring)
  _circle(ctx, cx, h * 0.18, w * 0.22, 'rgba(255,210,40,0.10)');
  _circle(ctx, cx, h * 0.18, w * 0.19, null, 'rgba(255,200,0,0.55)', 3);
  _circle(ctx, cx, h * 0.18, w * 0.17, null, 'rgba(255,240,80,0.25)', 6);
  // Head
  _face(ctx, cx, h * 0.20, w * 0.12, '#ddbb88', '#332200');
  // Robe
  _poly(ctx, [
    [cx - w * 0.04, h * 0.32], [cx + w * 0.04, h * 0.32],
    [cx + w * 0.28, h * 0.94], [cx - w * 0.28, h * 0.94]
  ], '#ddd8cc');
  // Tabard (gold)
  _rect(ctx, cx - w * 0.04, h * 0.38, w * 0.08, h * 0.38, '#cc9922');
  _rect(ctx, cx - w * 0.15, h * 0.51, w * 0.30, h * 0.10, '#cc9922');
  // Cross highlights
  _rect(ctx, cx - w * 0.025, h * 0.40, w * 0.05, h * 0.34, '#ffdd44');
  _rect(ctx, cx - w * 0.13, h * 0.52, w * 0.26, h * 0.08, '#ffdd44');
  // Arms
  _line(ctx, cx - w * 0.04, h * 0.36, cx - w * 0.26, h * 0.56, '#ddd8cc', 9);
  _line(ctx, cx + w * 0.04, h * 0.36, cx + w * 0.26, h * 0.56, '#ddd8cc', 9);
  // Scepter
  _line(ctx, cx + w * 0.28, h * 0.30, cx + w * 0.26, h * 0.94, '#ccaa44', 2.5);
  _circle(ctx, cx + w * 0.27, h * 0.28, w * 0.06, '#ffdd44', '#ffffff', 1.5);
};

_P.paladin = _P.warrior; // reuse warrior base

_P.ranger = (ctx, w, h) => {
  _bg(ctx, w, h, '#081608', '#0e2410');
  const cx = w / 2;
  // Hood
  _circle(ctx, cx, h * 0.17, w * 0.16, '#1a3318');
  _face(ctx, cx, h * 0.20, w * 0.11, '#cc9966', '#221100');
  // Cloak / tunic
  _poly(ctx, [
    [cx - w * 0.22, h * 0.32], [cx + w * 0.22, h * 0.32],
    [cx + w * 0.20, h * 0.80], [cx - w * 0.20, h * 0.80]
  ], '#1a3a18');
  // Quiver
  _rect(ctx, cx + w * 0.20, h * 0.28, w * 0.07, h * 0.30, '#553322');
  for (let i = 0; i < 3; i++)
    _line(ctx, cx + w * 0.21 + i * w * 0.015, h * 0.27,
               cx + w * 0.22 + i * w * 0.015, h * 0.42, '#aa8833', 1.5);
  // Bow (arc left)
  ctx.strokeStyle = '#774422'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx - w * 0.32, h * 0.50, w * 0.24, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
  _line(ctx, cx - w * 0.32, h * 0.24, cx - w * 0.32, h * 0.76, '#ccaa66', 1.5);
  // Legs
  _rect(ctx, cx - w * 0.14, h * 0.80, w * 0.12, h * 0.16, '#1a2e18');
  _rect(ctx, cx + w * 0.02, h * 0.80, w * 0.12, h * 0.16, '#1a2e18');
};

// ── ENEMIES ───────────────────────────────────────────────────────────────────

_P.goblin = (ctx, w, h) => {
  _bg(ctx, w, h, '#081600', '#102400');
  const cx = w / 2;
  // Pointy ears
  _poly(ctx, [[cx - w * 0.22, h * 0.16], [cx - w * 0.12, h * 0.30], [cx - w * 0.06, h * 0.18]], '#336611');
  _poly(ctx, [[cx + w * 0.22, h * 0.16], [cx + w * 0.12, h * 0.30], [cx + w * 0.06, h * 0.18]], '#336611');
  // Head
  _circle(ctx, cx, h * 0.27, w * 0.16, '#448822');
  // Eyes
  _circle(ctx, cx - w * 0.07, h * 0.24, w * 0.038, '#ff3300');
  _circle(ctx, cx + w * 0.07, h * 0.24, w * 0.038, '#ff3300');
  _circle(ctx, cx - w * 0.07, h * 0.24, w * 0.016, '#ffcc00');
  _circle(ctx, cx + w * 0.07, h * 0.24, w * 0.016, '#ffcc00');
  // Nose / mouth
  _circle(ctx, cx, h * 0.29, w * 0.025, '#336611');
  _line(ctx, cx - w * 0.09, h * 0.33, cx + w * 0.09, h * 0.33, '#224400', 1.5);
  // Tusks
  _poly(ctx, [[cx - w * 0.06, h * 0.33], [cx - w * 0.04, h * 0.39], [cx - w * 0.02, h * 0.33]], '#eeeebb');
  _poly(ctx, [[cx + w * 0.06, h * 0.33], [cx + w * 0.04, h * 0.39], [cx + w * 0.02, h * 0.33]], '#eeeebb');
  // Scrawny body
  _rect(ctx, cx - w * 0.14, h * 0.42, w * 0.28, h * 0.24, '#336611');
  // Arms
  _line(ctx, cx - w * 0.14, h * 0.46, cx - w * 0.30, h * 0.64, '#448822', 7);
  _line(ctx, cx + w * 0.14, h * 0.46, cx + w * 0.30, h * 0.62, '#448822', 7);
  // Crude dagger
  _line(ctx, cx + w * 0.30, h * 0.57, cx + w * 0.40, h * 0.74, '#886644', 4);
  _rect(ctx, cx + w * 0.27, h * 0.54, w * 0.10, w * 0.04, '#aaaaaa');
  // Legs
  _rect(ctx, cx - w * 0.12, h * 0.66, w * 0.10, h * 0.24, '#225511');
  _rect(ctx, cx + w * 0.02, h * 0.66, w * 0.10, h * 0.24, '#225511');
};

_P.skeleton = (ctx, w, h) => {
  _bg(ctx, w, h, '#090909', '#161010');
  const cx = w / 2;
  // Skull
  _circle(ctx, cx, h * 0.19, w * 0.13, '#ccccbb');
  _poly(ctx, [
    [cx - w * 0.10, h * 0.27], [cx + w * 0.10, h * 0.27],
    [cx + w * 0.08, h * 0.35], [cx - w * 0.08, h * 0.35]
  ], '#bbbbaa');
  // Teeth
  for (let i = 0; i < 4; i++)
    _rect(ctx, cx - w * 0.08 + i * w * 0.044, h * 0.28, w * 0.034, h * 0.055, '#ddddcc');
  // Eye sockets
  _circle(ctx, cx - w * 0.07, h * 0.17, w * 0.04, '#0a0a0a');
  _circle(ctx, cx + w * 0.07, h * 0.17, w * 0.04, '#0a0a0a');
  _circle(ctx, cx - w * 0.07, h * 0.17, w * 0.022, '#88ccff');
  _circle(ctx, cx + w * 0.07, h * 0.17, w * 0.022, '#88ccff');
  // Spine
  for (let i = 0; i < 5; i++) {
    const sy = h * 0.37 + i * h * 0.07;
    _rect(ctx, cx - w * 0.04, sy, w * 0.08, h * 0.045, '#bbbbaa');
    _line(ctx, cx - w * 0.06, sy + h * 0.022, cx + w * 0.06, sy + h * 0.022, '#aaaaaa', 1.5);
  }
  // Ribs
  ctx.strokeStyle = '#bbbbaa'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const ry = h * (0.40 + i * 0.08);
    ctx.beginPath(); ctx.arc(cx - w * 0.04, ry, w * 0.10, -Math.PI * 0.1, Math.PI * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + w * 0.04, ry, w * 0.10, Math.PI * 0.3, Math.PI * 1.1); ctx.stroke();
  }
  // Arms
  _line(ctx, cx - w * 0.08, h * 0.38, cx - w * 0.28, h * 0.58, '#bbbbaa', 3);
  _line(ctx, cx + w * 0.08, h * 0.38, cx + w * 0.30, h * 0.55, '#bbbbaa', 3);
  // Sword
  _line(ctx, cx + w * 0.32, h * 0.34, cx + w * 0.36, h * 0.70, '#886644', 2.5);
  _line(ctx, cx + w * 0.25, h * 0.45, cx + w * 0.40, h * 0.45, '#777755', 2);
  // Legs (thin bone)
  _line(ctx, cx - w * 0.04, h * 0.68, cx - w * 0.10, h * 0.92, '#ccccbb', 3.5);
  _line(ctx, cx + w * 0.04, h * 0.68, cx + w * 0.10, h * 0.92, '#ccccbb', 3.5);
  _line(ctx, cx - w * 0.10, h * 0.92, cx - w * 0.18, h * 0.94, '#bbbbaa', 2.5);
  _line(ctx, cx + w * 0.10, h * 0.92, cx + w * 0.18, h * 0.94, '#bbbbaa', 2.5);
};

_P.orc = (ctx, w, h) => {
  _bg(ctx, w, h, '#0c1200', '#1a2200');
  const cx = w / 2;
  // Head (wide, heavy brow)
  _circle(ctx, cx, h * 0.22, w * 0.17, '#5a7a22');
  _rect(ctx, cx - w * 0.17, h * 0.13, w * 0.34, h * 0.07, '#446618');
  // Eyes
  _circle(ctx, cx - w * 0.09, h * 0.20, w * 0.04, '#ff8800');
  _circle(ctx, cx + w * 0.09, h * 0.20, w * 0.04, '#ff8800');
  // Tusks
  _poly(ctx, [[cx - w * 0.09, h * 0.33], [cx - w * 0.05, h * 0.22], [cx - w * 0.02, h * 0.33]], '#eeeebb');
  _poly(ctx, [[cx + w * 0.09, h * 0.33], [cx + w * 0.05, h * 0.22], [cx + w * 0.02, h * 0.33]], '#eeeebb');
  // Massive torso
  _poly(ctx, [
    [cx - w * 0.28, h * 0.38], [cx + w * 0.28, h * 0.38],
    [cx + w * 0.24, h * 0.74], [cx - w * 0.24, h * 0.74]
  ], '#4a6a1a');
  _line(ctx, cx - w * 0.10, h * 0.44, cx - w * 0.08, h * 0.60, '#3a5a10', 2);
  _line(ctx, cx + w * 0.10, h * 0.44, cx + w * 0.08, h * 0.60, '#3a5a10', 2);
  _line(ctx, cx - w * 0.14, h * 0.52, cx + w * 0.14, h * 0.52, '#3a5a10', 1.5);
  // Thick arms
  _line(ctx, cx - w * 0.26, h * 0.42, cx - w * 0.40, h * 0.66, '#5a7a22', 12);
  _line(ctx, cx + w * 0.26, h * 0.42, cx + w * 0.42, h * 0.62, '#5a7a22', 12);
  // Battle axe
  _line(ctx, cx + w * 0.40, h * 0.28, cx + w * 0.38, h * 0.82, '#886644', 4);
  _poly(ctx, [
    [cx + w * 0.28, h * 0.28], [cx + w * 0.48, h * 0.28],
    [cx + w * 0.44, h * 0.50], [cx + w * 0.30, h * 0.50]
  ], '#888888', '#aaaaaa', 1.5);
  // Legs
  _rect(ctx, cx - w * 0.20, h * 0.74, w * 0.16, h * 0.20, '#3a5a10');
  _rect(ctx, cx + w * 0.04, h * 0.74, w * 0.16, h * 0.20, '#3a5a10');
};

_P.dire_wolf = (ctx, w, h) => {
  _bg(ctx, w, h, '#160800', '#281200');
  const cx = w / 2;
  // Body
  _poly(ctx, [
    [cx - w * 0.36, h * 0.54], [cx + w * 0.32, h * 0.50],
    [cx + w * 0.36, h * 0.72], [cx - w * 0.30, h * 0.80]
  ], '#6a4422');
  // Head
  _circle(ctx, cx - w * 0.22, h * 0.42, w * 0.15, '#553318');
  // Snout
  _poly(ctx, [
    [cx - w * 0.38, h * 0.43], [cx - w * 0.14, h * 0.39],
    [cx - w * 0.14, h * 0.53], [cx - w * 0.38, h * 0.55]
  ], '#441e0c');
  _circle(ctx, cx - w * 0.36, h * 0.44, w * 0.04, '#221100');
  // Eyes (orange)
  _circle(ctx, cx - w * 0.16, h * 0.39, w * 0.04, '#ff6600');
  _circle(ctx, cx - w * 0.28, h * 0.39, w * 0.04, '#ff6600');
  // Ears
  _poly(ctx, [[cx - w * 0.28, h * 0.28], [cx - w * 0.17, h * 0.28], [cx - w * 0.22, h * 0.20]], '#553318');
  _poly(ctx, [[cx - w * 0.14, h * 0.30], [cx - w * 0.06, h * 0.30], [cx - w * 0.10, h * 0.22]], '#553318');
  // Four legs
  _line(ctx, cx - w * 0.26, h * 0.72, cx - w * 0.30, h * 0.94, '#553318', 7);
  _line(ctx, cx - w * 0.10, h * 0.74, cx - w * 0.12, h * 0.94, '#553318', 7);
  _line(ctx, cx + w * 0.10, h * 0.68, cx + w * 0.14, h * 0.94, '#553318', 7);
  _line(ctx, cx + w * 0.26, h * 0.64, cx + w * 0.30, h * 0.90, '#553318', 7);
  // Tail (curve)
  ctx.strokeStyle = '#6a4422'; ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.32, h * 0.54);
  ctx.quadraticCurveTo(cx + w * 0.50, h * 0.34, cx + w * 0.44, h * 0.24);
  ctx.stroke();
};

_P.shadow_beast = (ctx, w, h) => {
  _bg(ctx, w, h, '#000000', '#060012');
  const cx = w / 2;
  // Misty shadow form
  ctx.fillStyle = '#180030'; ctx.beginPath(); ctx.arc(cx, h * 0.56, w * 0.36, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#100024'; ctx.beginPath(); ctx.arc(cx - w * 0.12, h * 0.44, w * 0.26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0c001e'; ctx.beginPath(); ctx.arc(cx + w * 0.14, h * 0.52, w * 0.22, 0, Math.PI * 2); ctx.fill();
  // Tendrils
  ctx.strokeStyle = 'rgba(100,0,180,0.45)'; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * w * 0.26, h * 0.56 + Math.sin(a) * h * 0.22);
    ctx.quadraticCurveTo(
      cx + Math.cos(a + 0.6) * w * 0.42,
      h * 0.56 + Math.sin(a + 0.6) * h * 0.34,
      cx + Math.cos(a + 1.1) * w * 0.32,
      h * 0.56 + Math.sin(a + 1.1) * h * 0.26
    );
    ctx.stroke();
  }
  // Glowing red eyes
  const _eye = (ex, ey) => {
    const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, w * 0.09);
    g.addColorStop(0,   '#ffffff');
    g.addColorStop(0.2, '#ff4400');
    g.addColorStop(1,   'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(ex - w * 0.10, ey - h * 0.08, w * 0.20, h * 0.16);
  };
  _eye(cx - w * 0.12, h * 0.40);
  _eye(cx + w * 0.12, h * 0.40);
};

_P.undead_knight = (ctx, w, h) => {
  _bg(ctx, w, h, '#040810', '#08121e');
  const cx = w / 2;
  // Dark plate body
  _poly(ctx, [
    [cx - w * 0.24, h * 0.36], [cx + w * 0.24, h * 0.36],
    [cx + w * 0.22, h * 0.74], [cx - w * 0.22, h * 0.74]
  ], '#0c1826');
  // Helmet
  _poly(ctx, [
    [cx - w * 0.16, h * 0.10], [cx + w * 0.16, h * 0.10],
    [cx + w * 0.16, h * 0.36], [cx - w * 0.16, h * 0.36]
  ], '#0e1c30');
  _poly(ctx, [[cx - w * 0.16, h * 0.10], [cx + w * 0.16, h * 0.10], [cx, h * 0.04]], '#0e1c30');
  // Eye slit glow
  _rect(ctx, cx - w * 0.13, h * 0.22, w * 0.26, h * 0.044, '#000000');
  _line(ctx, cx - w * 0.12, h * 0.242, cx + w * 0.12, h * 0.242, '#00aaff', 2.5);
  _circle(ctx, cx, h * 0.242, w * 0.20, 'rgba(0,100,220,0.08)');
  // Shoulder pauldrons
  _circle(ctx, cx - w * 0.27, h * 0.38, w * 0.11, '#121e30');
  _circle(ctx, cx + w * 0.27, h * 0.38, w * 0.11, '#121e30');
  // Armor lines
  ctx.strokeStyle = '#182840'; ctx.lineWidth = 1;
  _line(ctx, cx, h * 0.38, cx, h * 0.72, '#182840', 1.5);
  _line(ctx, cx - w * 0.24, h * 0.52, cx + w * 0.24, h * 0.52, '#182840', 1.5);
  // Greatsword
  _line(ctx, cx + w * 0.06, h * 0.16, cx + w * 0.06, h * 0.94, '#2a3a50', 6);
  _line(ctx, cx + w * 0.06, h * 0.16, cx + w * 0.06, h * 0.94, '#0088ff', 1.5);
  _line(ctx, cx - w * 0.10, h * 0.42, cx + w * 0.22, h * 0.42, '#2a3a50', 3.5);
  // Rune glyphs
  ctx.strokeStyle = '#0066cc'; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) ctx.strokeRect(cx + w * 0.02, h * (0.52 + i * 0.10), w * 0.07, h * 0.06);
  // Legs
  _rect(ctx, cx - w * 0.18, h * 0.74, w * 0.14, h * 0.20, '#0c1826');
  _rect(ctx, cx + w * 0.04, h * 0.74, w * 0.14, h * 0.20, '#0c1826');
};

_P.lich_lieutenant = (ctx, w, h) => {
  _bg(ctx, w, h, '#040008', '#0e0018');
  const cx = w / 2;
  // Crown spikes
  for (let i = 0; i < 5; i++) {
    const kx = cx - w * 0.16 + i * w * 0.08;
    _poly(ctx, [[kx, h * (0.03 + (i % 2) * 0.04)], [kx + w * 0.05, h * 0.10], [kx + w * 0.08, h * (0.03 + (i % 2) * 0.04)]], '#551188', '#9900ff', 1);
  }
  _rect(ctx, cx - w * 0.18, h * 0.08, w * 0.36, h * 0.045, '#441077');
  // Skull
  _circle(ctx, cx, h * 0.20, w * 0.14, '#b8b8a8');
  _poly(ctx, [
    [cx - w * 0.10, h * 0.30], [cx + w * 0.10, h * 0.30],
    [cx + w * 0.08, h * 0.36], [cx - w * 0.08, h * 0.36]
  ], '#aaa890');
  // Eye sockets + purple glow
  _circle(ctx, cx - w * 0.07, h * 0.18, w * 0.04, '#110022');
  _circle(ctx, cx + w * 0.07, h * 0.18, w * 0.04, '#110022');
  _circle(ctx, cx - w * 0.07, h * 0.18, w * 0.026, '#bb00ff');
  _circle(ctx, cx + w * 0.07, h * 0.18, w * 0.026, '#bb00ff');
  _circle(ctx, cx - w * 0.07, h * 0.18, w * 0.06, 'rgba(180,0,255,0.2)');
  _circle(ctx, cx + w * 0.07, h * 0.18, w * 0.06, 'rgba(180,0,255,0.2)');
  // Robes
  _poly(ctx, [
    [cx - w * 0.07, h * 0.38], [cx + w * 0.07, h * 0.38],
    [cx + w * 0.30, h * 0.96], [cx - w * 0.30, h * 0.96]
  ], '#110022');
  _line(ctx, cx - w * 0.07, h * 0.38, cx - w * 0.30, h * 0.96, '#330055', 1);
  _line(ctx, cx + w * 0.07, h * 0.38, cx + w * 0.30, h * 0.96, '#330055', 1);
  // Spectral wisps
  ctx.strokeStyle = 'rgba(180,0,255,0.38)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const xi = cx - w * 0.20 + i * w * 0.20;
    ctx.beginPath(); ctx.moveTo(xi, h * 0.58); ctx.quadraticCurveTo(xi + w * 0.07, h * 0.67, xi - w * 0.04, h * 0.78); ctx.stroke();
  }
  // Staff
  _line(ctx, cx + w * 0.26, h * 0.12, cx + w * 0.28, h * 0.92, '#441166', 2.5);
  const sg = ctx.createRadialGradient(cx + w * 0.25, h * 0.10, 0, cx + w * 0.25, h * 0.10, w * 0.08);
  sg.addColorStop(0, '#dd00ff'); sg.addColorStop(0.4, '#880088'); sg.addColorStop(1, 'transparent');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx + w * 0.25, h * 0.10, w * 0.08, 0, Math.PI * 2); ctx.fill();
  // Bony arms
  _line(ctx, cx - w * 0.07, h * 0.44, cx - w * 0.30, h * 0.62, '#110022', 7);
  _line(ctx, cx + w * 0.07, h * 0.44, cx + w * 0.26, h * 0.60, '#110022', 7);
};

_P.ancient_lich = _P.lich_lieutenant;

_P.ancient_golem = (ctx, w, h) => {
  _bg(ctx, w, h, '#0e0a06', '#1e1410');
  const cx = w / 2;
  // Square stone head
  _rect(ctx, cx - w * 0.20, h * 0.10, w * 0.40, h * 0.24, '#6a6050', '#888070', 1.5);
  // Eye slots
  _rect(ctx, cx - w * 0.15, h * 0.17, w * 0.11, h * 0.07, '#220000');
  _rect(ctx, cx + w * 0.04, h * 0.17, w * 0.11, h * 0.07, '#220000');
  // Eye glow
  ctx.fillStyle = '#ff6600'; ctx.fillRect(cx - w * 0.14, h * 0.18, w * 0.09, h * 0.045);
  ctx.fillRect(cx + w * 0.05, h * 0.18, w * 0.09, h * 0.045);
  // Massive torso
  _rect(ctx, cx - w * 0.32, h * 0.34, w * 0.64, h * 0.48, '#5a5040', '#706050', 1);
  // Stone texture
  ctx.strokeStyle = '#443830'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) _line(ctx, cx - w * 0.32, h * (0.42 + i * 0.08), cx + w * 0.32, h * (0.44 + i * 0.08), '#443830', 1);
  for (let i = 0; i < 3; i++) _line(ctx, cx + (-w * 0.22 + i * w * 0.22), h * 0.34, cx + (-w * 0.20 + i * w * 0.22), h * 0.82, '#443830', 1);
  // Rune (glowing orange)
  ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 1.8;
  const R = [[cx - w * 0.08, h * 0.50], [cx, h * 0.44], [cx + w * 0.08, h * 0.50], [cx, h * 0.56]];
  ctx.beginPath(); R.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.stroke();
  // Arms (rock slabs)
  _rect(ctx, cx - w * 0.50, h * 0.34, w * 0.18, h * 0.40, '#5a5040', '#706050', 1);
  _rect(ctx, cx + w * 0.32, h * 0.34, w * 0.18, h * 0.40, '#5a5040', '#706050', 1);
  _rect(ctx, cx - w * 0.52, h * 0.70, w * 0.22, h * 0.14, '#6a6050');
  _rect(ctx, cx + w * 0.30, h * 0.70, w * 0.22, h * 0.14, '#6a6050');
  // Legs
  _rect(ctx, cx - w * 0.24, h * 0.82, w * 0.18, h * 0.14, '#5a5040');
  _rect(ctx, cx + w * 0.06, h * 0.82, w * 0.18, h * 0.14, '#5a5040');
};

_P.goblin_shaman = (ctx, w, h) => {
  _bg(ctx, w, h, '#091600', '#122400');
  const cx = w / 2;
  // Bone hat
  _poly(ctx, [[cx, h * 0.01], [cx - w * 0.14, h * 0.22], [cx + w * 0.14, h * 0.22]], '#224400');
  _rect(ctx, cx - w * 0.16, h * 0.20, w * 0.32, h * 0.05, '#1a3300');
  _line(ctx, cx - w * 0.05, h * 0.08, cx + w * 0.05, h * 0.10, '#ccccaa', 1.5);
  _circle(ctx, cx, h * 0.14, w * 0.022, '#ccccaa');
  // Ears
  _poly(ctx, [[cx - w * 0.20, h * 0.20], [cx - w * 0.10, h * 0.32], [cx - w * 0.05, h * 0.22]], '#336611');
  _poly(ctx, [[cx + w * 0.20, h * 0.20], [cx + w * 0.10, h * 0.32], [cx + w * 0.05, h * 0.22]], '#336611');
  // Head
  _circle(ctx, cx, h * 0.30, w * 0.13, '#448822');
  // Glowing eyes (magic green)
  _circle(ctx, cx - w * 0.07, h * 0.27, w * 0.038, '#aaff00');
  _circle(ctx, cx + w * 0.07, h * 0.27, w * 0.038, '#aaff00');
  _circle(ctx, cx - w * 0.07, h * 0.27, w * 0.07, 'rgba(140,255,0,0.14)');
  _circle(ctx, cx + w * 0.07, h * 0.27, w * 0.07, 'rgba(140,255,0,0.14)');
  // Robe
  _poly(ctx, [
    [cx - w * 0.05, h * 0.40], [cx + w * 0.05, h * 0.40],
    [cx + w * 0.22, h * 0.90], [cx - w * 0.22, h * 0.90]
  ], '#1a3300');
  // Skull staff
  _line(ctx, cx + w * 0.22, h * 0.18, cx + w * 0.24, h * 0.92, '#553300', 2.5);
  _circle(ctx, cx + w * 0.22, h * 0.16, w * 0.07, '#ccccaa');
  _circle(ctx, cx + w * 0.19, h * 0.14, w * 0.022, '#000000');
  _circle(ctx, cx + w * 0.25, h * 0.14, w * 0.022, '#000000');
  // Magic particles
  ctx.fillStyle = 'rgba(100,255,0,0.65)';
  for (let i = 0; i < 5; i++) {
    const px = cx - w * 0.12 + i * w * 0.06;
    const py = h * 0.70 + Math.sin(i * 1.3) * h * 0.05;
    ctx.beginPath(); ctx.arc(px, py, w * 0.016, 0, Math.PI * 2); ctx.fill();
  }
  // Arms
  _line(ctx, cx - w * 0.05, h * 0.44, cx - w * 0.24, h * 0.60, '#1a3300', 8);
  _line(ctx, cx + w * 0.05, h * 0.44, cx + w * 0.22, h * 0.58, '#1a3300', 8);
};

_P.orc_shaman = (ctx, w, h) => {
  _bg(ctx, w, h, '#0e1200', '#1a2000');
  const cx = w / 2;
  // Bone/horn headdress
  _line(ctx, cx - w * 0.09, h * 0.11, cx - w * 0.16, h * 0.02, '#ccccaa', 3);
  _line(ctx, cx + w * 0.09, h * 0.11, cx + w * 0.16, h * 0.02, '#ccccaa', 3);
  _line(ctx, cx, h * 0.09, cx, h * 0.00, '#ccccaa', 3);
  // Head
  _circle(ctx, cx, h * 0.24, w * 0.17, '#5a7a22');
  _rect(ctx, cx - w * 0.17, h * 0.15, w * 0.34, h * 0.07, '#446618');
  // Eyes (ritual glow)
  _circle(ctx, cx - w * 0.09, h * 0.22, w * 0.04, '#ffaa00');
  _circle(ctx, cx + w * 0.09, h * 0.22, w * 0.04, '#ffaa00');
  _circle(ctx, cx - w * 0.09, h * 0.22, w * 0.08, 'rgba(255,140,0,0.18)');
  _circle(ctx, cx + w * 0.09, h * 0.22, w * 0.08, 'rgba(255,140,0,0.18)');
  // Tusks
  _poly(ctx, [[cx - w * 0.08, h * 0.34], [cx - w * 0.04, h * 0.24], [cx - w * 0.01, h * 0.34]], '#eeeebb');
  _poly(ctx, [[cx + w * 0.08, h * 0.34], [cx + w * 0.04, h * 0.24], [cx + w * 0.01, h * 0.34]], '#eeeebb');
  // Armor-robe
  _rect(ctx, cx - w * 0.24, h * 0.38, w * 0.48, h * 0.44, '#3a5010');
  // Orange rune
  ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.07, h * 0.46); ctx.lineTo(cx, h * 0.42); ctx.lineTo(cx + w * 0.07, h * 0.46);
  ctx.moveTo(cx - w * 0.09, h * 0.53); ctx.lineTo(cx + w * 0.09, h * 0.53);
  ctx.moveTo(cx, h * 0.42); ctx.lineTo(cx, h * 0.60); ctx.stroke();
  // Staff
  _line(ctx, cx - w * 0.26, h * 0.08, cx - w * 0.24, h * 0.90, '#553300', 3.5);
  const sor = ctx.createRadialGradient(cx - w * 0.26, h * 0.07, 0, cx - w * 0.26, h * 0.07, w * 0.08);
  sor.addColorStop(0, '#ffcc44'); sor.addColorStop(0.5, '#ff8800'); sor.addColorStop(1, 'transparent');
  ctx.fillStyle = sor; ctx.beginPath(); ctx.arc(cx - w * 0.26, h * 0.07, w * 0.08, 0, Math.PI * 2); ctx.fill();
  _line(ctx, cx - w * 0.24, h * 0.44, cx - w * 0.32, h * 0.66, '#5a7a22', 10);
  _line(ctx, cx + w * 0.24, h * 0.44, cx + w * 0.36, h * 0.62, '#5a7a22', 10);
};

_P.shadow_general = (ctx, w, h) => {
  _bg(ctx, w, h, '#000000', '#03000a');
  const cx = w / 2;
  // Full dark plate
  _poly(ctx, [
    [cx - w * 0.26, h * 0.30], [cx + w * 0.26, h * 0.30],
    [cx + w * 0.24, h * 0.82], [cx - w * 0.24, h * 0.82]
  ], '#06091a');
  // Dark helmet
  _poly(ctx, [
    [cx - w * 0.18, h * 0.08], [cx + w * 0.18, h * 0.08],
    [cx + w * 0.18, h * 0.34], [cx - w * 0.18, h * 0.34]
  ], '#08091e');
  _poly(ctx, [[cx - w * 0.18, h * 0.08], [cx + w * 0.18, h * 0.08], [cx, h * 0.01]], '#08091e');
  // Eye slit (dual-color glow)
  _rect(ctx, cx - w * 0.14, h * 0.18, w * 0.28, h * 0.05, '#000000');
  const eg = ctx.createLinearGradient(cx - w * 0.14, 0, cx + w * 0.14, 0);
  eg.addColorStop(0, '#4400aa'); eg.addColorStop(0.5, '#ffffff'); eg.addColorStop(1, '#4400aa');
  ctx.fillStyle = eg; ctx.fillRect(cx - w * 0.14, h * 0.195, w * 0.28, h * 0.028);
  // Armor edge lines
  ctx.strokeStyle = '#2200aa'; ctx.lineWidth = 1;
  ctx.strokeRect(cx - w * 0.26, h * 0.30, w * 0.52, h * 0.52);
  ctx.strokeRect(cx - w * 0.18, h * 0.08, w * 0.36, h * 0.26);
  // Aura
  _circle(ctx, cx, h * 0.56, w * 0.38, 'rgba(60,0,120,0.14)');
  _circle(ctx, cx, h * 0.56, w * 0.48, 'rgba(40,0,90,0.09)');
  // Void greatsword
  _line(ctx, cx + w * 0.08, h * 0.10, cx + w * 0.07, h * 0.96, '#14143a', 7);
  _line(ctx, cx + w * 0.08, h * 0.10, cx + w * 0.07, h * 0.96, '#5500ee', 2);
  _line(ctx, cx - w * 0.08, h * 0.38, cx + w * 0.24, h * 0.38, '#14143a', 4.5);
  // Floating shadow orbs
  ctx.fillStyle = 'rgba(100,0,200,0.55)';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * w * 0.32, h * 0.56 + Math.sin(a) * h * 0.22, w * 0.026, 0, Math.PI * 2); ctx.fill();
  }
  _rect(ctx, cx - w * 0.20, h * 0.82, w * 0.15, h * 0.14, '#06091a');
  _rect(ctx, cx + w * 0.05, h * 0.82, w * 0.15, h * 0.14, '#06091a');
};

_P.giant_rat = (ctx, w, h) => {
  _bg(ctx, w, h, '#0e0800', '#1c1000');
  const cx = w / 2;
  // Hunched body
  _circle(ctx, cx + w * 0.06, h * 0.58, w * 0.28, '#664422');
  // Head
  _circle(ctx, cx - w * 0.18, h * 0.46, w * 0.14, '#553318');
  // Snout
  _poly(ctx, [
    [cx - w * 0.34, h * 0.44], [cx - w * 0.10, h * 0.40],
    [cx - w * 0.10, h * 0.53], [cx - w * 0.34, h * 0.54]
  ], '#44300e');
  _circle(ctx, cx - w * 0.33, h * 0.47, w * 0.04, '#ff8899');
  // Eyes
  _circle(ctx, cx - w * 0.20, h * 0.42, w * 0.032, '#ff2200');
  _circle(ctx, cx - w * 0.12, h * 0.43, w * 0.032, '#ff2200');
  // Ears
  _circle(ctx, cx - w * 0.20, h * 0.34, w * 0.07, '#883322');
  _circle(ctx, cx - w * 0.10, h * 0.34, w * 0.07, '#883322');
  // Tail
  ctx.strokeStyle = '#884422'; ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.34, h * 0.60);
  ctx.quadraticCurveTo(cx + w * 0.50, h * 0.44, cx + w * 0.44, h * 0.30);
  ctx.stroke();
  // Legs / claws
  _line(ctx, cx - w * 0.12, h * 0.74, cx - w * 0.18, h * 0.90, '#553318', 5);
  _line(ctx, cx + w * 0.02, h * 0.76, cx, h * 0.90, '#553318', 5);
  _line(ctx, cx + w * 0.16, h * 0.74, cx + w * 0.18, h * 0.90, '#553318', 5);
  ctx.strokeStyle = '#aaaaaa'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const bx = cx - w * 0.16 + i * w * 0.14;
    ctx.beginPath(); ctx.moveTo(bx, h * 0.90); ctx.lineTo(bx - w * 0.03, h * 0.95); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, h * 0.90); ctx.lineTo(bx, h * 0.96); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, h * 0.90); ctx.lineTo(bx + w * 0.03, h * 0.95); ctx.stroke();
  }
};

// ── SHATTERED SANCTUM ENEMIES ─────────────────────────────────────────────────

_P.fungal_spider = (ctx, w, h) => {
  _bg(ctx, w, h, '#060e04', '#0e1a06');
  const cx = w / 2;
  // Abdomen (large, fungal-spotted)
  _circle(ctx, cx + w * 0.08, h * 0.58, w * 0.24, '#2a4a18');
  for (let i = 0; i < 6; i++) {
    const fx = cx + w * (-0.06 + (i % 3) * 0.10), fy = h * (0.46 + Math.floor(i / 3) * 0.14);
    _circle(ctx, fx, fy, w * 0.04, '#8822aa', null, 0);
  }
  // Thorax
  _circle(ctx, cx - w * 0.06, h * 0.44, w * 0.14, '#1e3610');
  // Head
  _circle(ctx, cx - w * 0.18, h * 0.36, w * 0.10, '#1a3010');
  // Compound eyes (6 dots)
  const eyes = [[-0.24, 0.30], [-0.16, 0.28], [-0.10, 0.30], [-0.24, 0.38], [-0.16, 0.40], [-0.10, 0.40]];
  eyes.forEach(([ex, ey]) => _circle(ctx, cx + w * ex, h * ey, w * 0.025, '#44ff44'));
  // Fangs
  _poly(ctx, [[cx - w * 0.22, h * 0.44], [cx - w * 0.28, h * 0.52], [cx - w * 0.18, h * 0.46]], '#ccddaa');
  _poly(ctx, [[cx - w * 0.16, h * 0.44], [cx - w * 0.20, h * 0.52], [cx - w * 0.12, h * 0.46]], '#ccddaa');
  // Legs (8, 4 each side)
  ctx.strokeStyle = '#336611'; ctx.lineWidth = 2.5;
  const legPairs = [[-0.08, 0.42, -0.38, 0.28], [-0.06, 0.46, -0.40, 0.46], [-0.02, 0.50, -0.36, 0.66], [0.04, 0.54, -0.28, 0.78]];
  legPairs.forEach(([bx, by, ex, ey]) => { ctx.beginPath(); ctx.moveTo(cx + w * bx, h * by); ctx.quadraticCurveTo(cx + w * ((bx + ex) / 2 - 0.08), h * ((by + ey) / 2), cx + w * ex, h * ey); ctx.stroke(); });
  const rlegPairs = [[0.06, 0.42, 0.38, 0.28], [0.08, 0.46, 0.42, 0.44], [0.12, 0.50, 0.40, 0.64], [0.16, 0.54, 0.34, 0.76]];
  rlegPairs.forEach(([bx, by, ex, ey]) => { ctx.beginPath(); ctx.moveTo(cx + w * bx, h * by); ctx.quadraticCurveTo(cx + w * ((bx + ex) / 2 + 0.06), h * ((by + ey) / 2), cx + w * ex, h * ey); ctx.stroke(); });
  // Fungal cap mushroom on back
  _poly(ctx, [[cx + w * 0.04, h * 0.34], [cx - w * 0.06, h * 0.50], [cx + w * 0.14, h * 0.50]], '#8822aa', '#aa44cc', 1);
  _rect(ctx, cx + w * 0.03, h * 0.47, w * 0.05, h * 0.10, '#553366');
};

_P.cave_troll = (ctx, w, h) => {
  _bg(ctx, w, h, '#0a0806', '#161210');
  const cx = w / 2;
  // Massive rocky body
  _poly(ctx, [
    [cx - w * 0.36, h * 0.34], [cx + w * 0.36, h * 0.34],
    [cx + w * 0.32, h * 0.82], [cx - w * 0.32, h * 0.82]
  ], '#4a4436');
  // Stone skin cracks
  ctx.strokeStyle = '#2a2218'; ctx.lineWidth = 1;
  _line(ctx, cx - w * 0.18, h * 0.38, cx - w * 0.08, h * 0.60, '#2a2218', 1.5);
  _line(ctx, cx + w * 0.10, h * 0.40, cx + w * 0.20, h * 0.58, '#2a2218', 1.5);
  _line(ctx, cx - w * 0.24, h * 0.52, cx + w * 0.24, h * 0.56, '#2a2218', 1.5);
  // Oversized head
  _circle(ctx, cx, h * 0.22, w * 0.22, '#5a5040');
  _rect(ctx, cx - w * 0.22, h * 0.14, w * 0.44, h * 0.06, '#3e3830'); // heavy brow
  // Flat nose, mouth
  _circle(ctx, cx - w * 0.05, h * 0.25, w * 0.04, '#3a3228');
  _circle(ctx, cx + w * 0.05, h * 0.25, w * 0.04, '#3a3228');
  _line(ctx, cx - w * 0.14, h * 0.31, cx + w * 0.14, h * 0.31, '#2a2218', 2.5);
  // Dim orange eyes
  _circle(ctx, cx - w * 0.10, h * 0.19, w * 0.05, '#ff6600');
  _circle(ctx, cx + w * 0.10, h * 0.19, w * 0.05, '#ff6600');
  _circle(ctx, cx - w * 0.10, h * 0.19, w * 0.09, 'rgba(255,80,0,0.12)');
  _circle(ctx, cx + w * 0.10, h * 0.19, w * 0.09, 'rgba(255,80,0,0.12)');
  // Huge arms reaching down
  _line(ctx, cx - w * 0.34, h * 0.40, cx - w * 0.44, h * 0.76, '#5a5040', 18);
  _line(ctx, cx + w * 0.34, h * 0.40, cx + w * 0.44, h * 0.72, '#5a5040', 18);
  // Fists / claws
  _circle(ctx, cx - w * 0.44, h * 0.78, w * 0.10, '#4a4030');
  _circle(ctx, cx + w * 0.44, h * 0.74, w * 0.10, '#4a4030');
  // Legs
  _rect(ctx, cx - w * 0.26, h * 0.82, w * 0.20, h * 0.14, '#3a3428');
  _rect(ctx, cx + w * 0.06, h * 0.82, w * 0.20, h * 0.14, '#3a3428');
  // Rock projectile in hand (right)
  _circle(ctx, cx + w * 0.46, h * 0.62, w * 0.09, '#6a6050', '#887860', 1.5);
};

_P.shadow_acolyte = (ctx, w, h) => {
  _bg(ctx, w, h, '#020006', '#080012');
  const cx = w / 2;
  // Dark hooded robe
  _poly(ctx, [
    [cx - w * 0.24, h * 0.28], [cx + w * 0.24, h * 0.28],
    [cx + w * 0.28, h * 0.96], [cx - w * 0.28, h * 0.96]
  ], '#0c000e');
  _circle(ctx, cx, h * 0.18, w * 0.16, '#0e0018'); // hood
  // Pale face, partially shadowed
  _face(ctx, cx, h * 0.20, w * 0.10, '#9988aa', '#220033');
  ctx.fillStyle = 'rgba(8,0,14,0.72)'; ctx.fillRect(cx - w * 0.12, h * 0.10, w * 0.24, h * 0.08);
  // Void mark on face (triangle)
  ctx.strokeStyle = '#8800ff'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx, h * 0.15); ctx.lineTo(cx - w * 0.05, h * 0.23); ctx.lineTo(cx + w * 0.05, h * 0.23); ctx.closePath(); ctx.stroke();
  _circle(ctx, cx, h * 0.19, w * 0.016, '#cc44ff');
  // Glowing violet eyes
  _circle(ctx, cx - w * 0.06, h * 0.19, w * 0.026, '#aa00ff');
  _circle(ctx, cx + w * 0.06, h * 0.19, w * 0.026, '#aa00ff');
  _circle(ctx, cx - w * 0.06, h * 0.19, w * 0.05, 'rgba(150,0,255,0.2)');
  _circle(ctx, cx + w * 0.06, h * 0.19, w * 0.05, 'rgba(150,0,255,0.2)');
  // Floating dark particles
  ctx.fillStyle = 'rgba(120,0,200,0.55)';
  [[cx - w * 0.28, h * 0.44], [cx + w * 0.28, h * 0.52], [cx - w * 0.20, h * 0.70], [cx + w * 0.18, h * 0.76], [cx - w * 0.10, h * 0.86]].forEach(([px, py]) => {
    ctx.beginPath(); ctx.arc(px, py, w * 0.022, 0, Math.PI * 2); ctx.fill();
  });
  // Ritual dagger
  _line(ctx, cx + w * 0.18, h * 0.50, cx + w * 0.28, h * 0.72, '#440066', 3);
  _line(ctx, cx + w * 0.12, h * 0.52, cx + w * 0.22, h * 0.48, '#663399', 2);
  // Robe hem runes
  ctx.strokeStyle = '#440088'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) ctx.strokeRect(cx - w * 0.22 + i * w * 0.12, h * 0.88, w * 0.08, h * 0.05);
};

_P.corrupted_paladin = (ctx, w, h) => {
  _bg(ctx, w, h, '#080408', '#120c12');
  const cx = w / 2;
  // Once-golden plate, now cracked and void-stained
  _poly(ctx, [
    [cx - w * 0.26, h * 0.34], [cx + w * 0.26, h * 0.34],
    [cx + w * 0.24, h * 0.80], [cx - w * 0.24, h * 0.80]
  ], '#2a1e10');
  // Gold remnants on armor edges
  ctx.strokeStyle = '#665522'; ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - w * 0.26, h * 0.34, w * 0.52, h * 0.46);
  _line(ctx, cx, h * 0.34, cx, h * 0.80, '#665522', 1);
  _line(ctx, cx - w * 0.26, h * 0.57, cx + w * 0.26, h * 0.57, '#665522', 1);
  // Corrupted cross on chest (half gold, half void)
  _rect(ctx, cx - w * 0.025, h * 0.40, w * 0.05, h * 0.22, '#ffcc00');
  _rect(ctx, cx - w * 0.13, h * 0.49, w * 0.26, h * 0.06, '#ffcc00');
  // Void corruption over right half
  ctx.fillStyle = 'rgba(80,0,120,0.72)'; ctx.fillRect(cx, h * 0.34, w * 0.26, h * 0.46);
  // Cracked helmet
  _poly(ctx, [[cx - w * 0.16, h * 0.10], [cx + w * 0.16, h * 0.10], [cx + w * 0.16, h * 0.34], [cx - w * 0.16, h * 0.34]], '#2a1e10');
  _rect(ctx, cx - w * 0.14, h * 0.18, w * 0.28, h * 0.05, '#000');
  // Left eye: golden glow; right eye: void purple
  _circle(ctx, cx - w * 0.07, h * 0.205, w * 0.036, '#ffcc00');
  _circle(ctx, cx + w * 0.07, h * 0.205, w * 0.036, '#8800ff');
  _circle(ctx, cx + w * 0.07, h * 0.205, w * 0.07, 'rgba(100,0,200,0.30)');
  // Crack lines on helmet
  _line(ctx, cx + w * 0.04, h * 0.10, cx + w * 0.10, h * 0.26, '#550088', 1.5);
  _line(ctx, cx + w * 0.10, h * 0.26, cx + w * 0.06, h * 0.34, '#550088', 1.5);
  // Pauldrons
  _circle(ctx, cx - w * 0.28, h * 0.38, w * 0.10, '#2a1e10', '#665522', 1);
  _circle(ctx, cx + w * 0.28, h * 0.38, w * 0.10, '#220040', '#660099', 1);
  // Holy sword (left, still bright) + void energy right
  _line(ctx, cx - w * 0.08, h * 0.18, cx - w * 0.06, h * 0.94, '#ccaa44', 4);
  _line(ctx, cx - w * 0.18, h * 0.40, cx + w * 0.02, h * 0.40, '#ccaa44', 2.5);
  ctx.strokeStyle = '#aa00ff'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2, r = w * 0.14;
    ctx.moveTo(cx + w * 0.24, h * 0.50); ctx.lineTo(cx + w * 0.24 + Math.cos(a) * r, h * 0.50 + Math.sin(a) * h * 0.08);
  }
  ctx.stroke();
  // Legs
  _rect(ctx, cx - w * 0.20, h * 0.80, w * 0.16, h * 0.16, '#2a1e10');
  _rect(ctx, cx + w * 0.04, h * 0.80, w * 0.16, h * 0.16, '#200034');
};

_P.outpost_warden = (ctx, w, h) => {
  _bg(ctx, w, h, '#060a10', '#0c1420');
  const cx = w / 2;
  // Heavy iron plate (dark grey-blue)
  _poly(ctx, [
    [cx - w * 0.30, h * 0.34], [cx + w * 0.30, h * 0.34],
    [cx + w * 0.28, h * 0.86], [cx - w * 0.28, h * 0.86]
  ], '#1e2a36');
  // Plate rivets
  [[cx - w * 0.24, h * 0.40], [cx + w * 0.24, h * 0.40], [cx - w * 0.24, h * 0.60], [cx + w * 0.24, h * 0.60]].forEach(([rx, ry]) => _circle(ctx, rx, ry, w * 0.018, '#3a4a5a'));
  _line(ctx, cx, h * 0.34, cx, h * 0.86, '#2a3a4a', 1.5);
  _line(ctx, cx - w * 0.30, h * 0.60, cx + w * 0.30, h * 0.60, '#2a3a4a', 1.5);
  // Warden badge (chest emblem - crossed keys)
  ctx.strokeStyle = '#cc9900'; ctx.lineWidth = 1.8;
  _line(ctx, cx - w * 0.06, h * 0.44, cx + w * 0.06, h * 0.56, '#cc9900', 2.5);
  _line(ctx, cx + w * 0.06, h * 0.44, cx - w * 0.06, h * 0.56, '#cc9900', 2.5);
  _circle(ctx, cx, h * 0.50, w * 0.08, null, '#cc9900', 1.5);
  // Closed visored helmet (full face)
  _poly(ctx, [[cx - w * 0.18, h * 0.08], [cx + w * 0.18, h * 0.08], [cx + w * 0.18, h * 0.34], [cx - w * 0.18, h * 0.34]], '#1a2432');
  _poly(ctx, [[cx - w * 0.18, h * 0.08], [cx + w * 0.18, h * 0.08], [cx, h * 0.02]], '#1a2432');
  // Visor slit
  _rect(ctx, cx - w * 0.14, h * 0.20, w * 0.28, h * 0.04, '#000');
  _line(ctx, cx - w * 0.14, h * 0.22, cx + w * 0.14, h * 0.22, '#4488cc', 2);
  // Big pauldrons
  _circle(ctx, cx - w * 0.32, h * 0.38, w * 0.12, '#1e2a36', '#2a3a4a', 1.5);
  _circle(ctx, cx + w * 0.32, h * 0.38, w * 0.12, '#1e2a36', '#2a3a4a', 1.5);
  // Twin axes
  _line(ctx, cx - w * 0.36, h * 0.22, cx - w * 0.34, h * 0.84, '#664422', 3.5);
  _poly(ctx, [[cx - w * 0.46, h * 0.22], [cx - w * 0.24, h * 0.22], [cx - w * 0.26, h * 0.40], [cx - w * 0.44, h * 0.40]], '#777777', '#aaaaaa', 1.5);
  _line(ctx, cx + w * 0.36, h * 0.22, cx + w * 0.34, h * 0.84, '#664422', 3.5);
  _poly(ctx, [[cx + w * 0.24, h * 0.22], [cx + w * 0.46, h * 0.22], [cx + w * 0.44, h * 0.40], [cx + w * 0.26, h * 0.40]], '#777777', '#aaaaaa', 1.5);
  // Legs
  _rect(ctx, cx - w * 0.22, h * 0.86, w * 0.18, h * 0.12, '#1a2432');
  _rect(ctx, cx + w * 0.04, h * 0.86, w * 0.18, h * 0.12, '#1a2432');
};

_P.corrupted_captain = (ctx, w, h) => {
  _bg(ctx, w, h, '#030810', '#06122a');
  const cx = w / 2;
  // Ghostly form (semi-transparent outer glow)
  const cg = ctx.createRadialGradient(cx, h * 0.52, 0, cx, h * 0.52, w * 0.46);
  cg.addColorStop(0, 'rgba(40,120,220,0.18)'); cg.addColorStop(1, 'transparent');
  ctx.fillStyle = cg; ctx.fillRect(0, 0, w, h);
  // Spectral captain coat (tattered)
  _poly(ctx, [
    [cx - w * 0.22, h * 0.32], [cx + w * 0.22, h * 0.32],
    [cx + w * 0.28, h * 0.90], [cx + w * 0.14, h * 0.84],
    [cx, h * 0.92], [cx - w * 0.14, h * 0.82],
    [cx - w * 0.28, h * 0.90]
  ], 'rgba(20,50,100,0.8)');
  // Gold trim (faded)
  _line(ctx, cx - w * 0.22, h * 0.32, cx - w * 0.28, h * 0.90, '#446688', 1.5);
  _line(ctx, cx + w * 0.22, h * 0.32, cx + w * 0.28, h * 0.90, '#446688', 1.5);
  _line(ctx, cx - w * 0.22, h * 0.52, cx + w * 0.22, h * 0.52, '#446688', 1);
  // Captain's hat (tricorn ghost)
  _poly(ctx, [[cx - w * 0.20, h * 0.14], [cx + w * 0.20, h * 0.14], [cx + w * 0.18, h * 0.28], [cx - w * 0.18, h * 0.28]], 'rgba(20,50,100,0.9)');
  _poly(ctx, [[cx - w * 0.22, h * 0.14], [cx + w * 0.22, h * 0.14], [cx, h * 0.04]], 'rgba(20,50,100,0.9)');
  // Skull face (ghostly blue)
  _circle(ctx, cx, h * 0.22, w * 0.12, 'rgba(160,200,255,0.70)');
  _circle(ctx, cx - w * 0.06, h * 0.20, w * 0.04, 'rgba(0,20,80,0.90)');
  _circle(ctx, cx + w * 0.06, h * 0.20, w * 0.04, 'rgba(0,20,80,0.90)');
  _circle(ctx, cx - w * 0.06, h * 0.20, w * 0.024, '#44aaff');
  _circle(ctx, cx + w * 0.06, h * 0.20, w * 0.024, '#44aaff');
  // Ethereal sword (glowing blue)
  _line(ctx, cx + w * 0.16, h * 0.26, cx + w * 0.40, h * 0.78, 'rgba(100,180,255,0.85)', 3);
  _line(ctx, cx + w * 0.09, h * 0.40, cx + w * 0.23, h * 0.35, 'rgba(100,180,255,0.65)', 2);
  // Floating tendrils (corruption)
  ctx.strokeStyle = 'rgba(80,140,255,0.38)'; ctx.lineWidth = 1.5;
  [[-0.28, 0.44, -0.38, 0.68], [-0.26, 0.60, -0.42, 0.80], [0.24, 0.48, 0.38, 0.70]].forEach(([x1,y1,x2,y2]) => {
    ctx.beginPath(); ctx.moveTo(cx + w * x1, h * y1); ctx.quadraticCurveTo(cx + w * (x1 - 0.08), h * ((y1 + y2) / 2), cx + w * x2, h * y2); ctx.stroke();
  });
  // Rank medallion (gold, cracked)
  _circle(ctx, cx - w * 0.10, h * 0.42, w * 0.055, 'rgba(180,140,40,0.65)', '#996622', 1);
  _line(ctx, cx - w * 0.13, h * 0.40, cx - w * 0.07, h * 0.44, '#664400', 1);
};

_P.hollow_king = (ctx, w, h) => {
  _bg(ctx, w, h, '#000000', '#040008');
  const cx = w / 2;
  // Void aura (multiple concentric halos)
  [0.48, 0.40, 0.32].forEach((r, i) => {
    _circle(ctx, cx, h * 0.52, w * r, `rgba(${60 + i * 20},0,${120 + i * 30},${0.10 + i * 0.06})`);
  });
  // Crown of void (jagged spikes)
  const spikes = [[-0.22, 0.08, -0.18, 0.20], [-0.10, 0.04, -0.08, 0.18], [0, 0.02, 0, 0.17], [0.10, 0.04, 0.08, 0.18], [0.22, 0.08, 0.18, 0.20]];
  spikes.forEach(([sx, sy, ex, ey]) => {
    _poly(ctx, [[cx + w * sx, h * sy], [cx + w * ((sx + ex) / 2 - 0.03), h * ey], [cx + w * ex, h * sy]], '#330066', '#8800cc', 1);
  });
  _rect(ctx, cx - w * 0.24, h * 0.18, w * 0.48, h * 0.05, '#220044', '#6600aa', 1);
  // "Body" — just swirling void mass, no solid form
  const vg = ctx.createRadialGradient(cx, h * 0.54, 0, cx, h * 0.54, w * 0.34);
  vg.addColorStop(0, '#180030'); vg.addColorStop(0.6, '#0c0020'); vg.addColorStop(1, 'transparent');
  ctx.fillStyle = vg; ctx.beginPath(); ctx.ellipse(cx, h * 0.54, w * 0.34, h * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  // Void tendrils radiating out
  ctx.strokeStyle = 'rgba(120,0,220,0.45)'; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * w * 0.24, h * 0.54 + Math.sin(a) * h * 0.24);
    ctx.quadraticCurveTo(cx + Math.cos(a + 0.5) * w * 0.38, h * 0.54 + Math.sin(a + 0.5) * h * 0.32, cx + Math.cos(a + 0.9) * w * 0.30, h * 0.54 + Math.sin(a + 0.9) * h * 0.26);
    ctx.stroke();
  }
  // Eyes — two massive glowing voids
  const eyeGlow = (ex, ey) => {
    const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, w * 0.12);
    eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.15, '#dd00ff'); eg.addColorStop(0.5, '#5500aa'); eg.addColorStop(1, 'transparent');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, w * 0.12, 0, Math.PI * 2); ctx.fill();
    _circle(ctx, ex, ey, w * 0.04, '#ffffff');
  };
  eyeGlow(cx - w * 0.10, h * 0.38);
  eyeGlow(cx + w * 0.10, h * 0.38);
  // Void crown jewel
  const cjg = ctx.createRadialGradient(cx, h * 0.21, 0, cx, h * 0.21, w * 0.06);
  cjg.addColorStop(0, '#ffffff'); cjg.addColorStop(0.3, '#ee00ff'); cjg.addColorStop(1, 'transparent');
  ctx.fillStyle = cjg; ctx.beginPath(); ctx.arc(cx, h * 0.21, w * 0.06, 0, Math.PI * 2); ctx.fill();
  // Floating void shards
  ctx.fillStyle = 'rgba(180,0,255,0.6)';
  [[cx - w * 0.38, h * 0.34], [cx + w * 0.38, h * 0.38], [cx - w * 0.42, h * 0.62], [cx + w * 0.40, h * 0.58], [cx, h * 0.84]].forEach(([px, py]) => {
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-w * 0.022, -w * 0.022, w * 0.044, w * 0.044);
    ctx.restore();
  });
};

// ── SHATTERED SANCTUM NPCs ─────────────────────────────────────────────────────

_P.npc_voss = _P.voss = (ctx, w, h) => {
  _bg(ctx, w, h, '#060c12', '#101c2a');
  const cx = w / 2;
  // Military coat (dark navy + gold trim)
  _poly(ctx, [[cx - w * 0.24, h * 0.36], [cx + w * 0.24, h * 0.36], [cx + w * 0.26, h * 0.94], [cx - w * 0.26, h * 0.94]], '#0e1e30');
  _line(ctx, cx, h * 0.36, cx, h * 0.94, '#335588', 1.5);
  _line(ctx, cx - w * 0.10, h * 0.50, cx + w * 0.10, h * 0.50, '#cc9900', 2);
  _line(ctx, cx - w * 0.10, h * 0.58, cx + w * 0.10, h * 0.58, '#cc9900', 2);
  _line(ctx, cx - w * 0.10, h * 0.66, cx + w * 0.10, h * 0.66, '#cc9900', 2);
  // Rank epaulettes
  _rect(ctx, cx - w * 0.32, h * 0.34, w * 0.12, h * 0.08, '#cc9900');
  _rect(ctx, cx + w * 0.20, h * 0.34, w * 0.12, h * 0.08, '#cc9900');
  // Battle-scarred face (older, strong jawline, scar)
  _face(ctx, cx, h * 0.24, w * 0.13, '#bb9966', '#221100');
  _line(ctx, cx + w * 0.06, h * 0.18, cx + w * 0.04, h * 0.28, '#996644', 1.5); // scar
  // Grey-streaked short hair
  _circle(ctx, cx, h * 0.14, w * 0.14, '#3a3a3a');
  _rect(ctx, cx - w * 0.14, h * 0.10, w * 0.28, h * 0.06, '#2a2a2a');
  // Command baton
  _line(ctx, cx + w * 0.22, h * 0.48, cx + w * 0.32, h * 0.72, '#885522', 3.5);
  _circle(ctx, cx + w * 0.22, h * 0.46, w * 0.04, '#cc9900');
  // Arms
  _line(ctx, cx - w * 0.24, h * 0.40, cx - w * 0.32, h * 0.62, '#0e1e30', 10);
  _line(ctx, cx + w * 0.24, h * 0.40, cx + w * 0.30, h * 0.60, '#0e1e30', 10);
};

_P.npc_mira = _P.mira = (ctx, w, h) => {
  _bg(ctx, w, h, '#060e06', '#0c1a0a');
  const cx = w / 2;
  // Herbalist robe (earthy green-brown)
  _poly(ctx, [[cx - w * 0.20, h * 0.36], [cx + w * 0.20, h * 0.36], [cx + w * 0.26, h * 0.94], [cx - w * 0.26, h * 0.94]], '#1e3018');
  // Herb pouch belt
  _rect(ctx, cx - w * 0.24, h * 0.55, w * 0.48, h * 0.06, '#553322');
  _circle(ctx, cx - w * 0.12, h * 0.58, w * 0.05, '#554422');
  _circle(ctx, cx + w * 0.08, h * 0.58, w * 0.05, '#554422');
  // Kind face, young-ish, braided hair
  _face(ctx, cx, h * 0.24, w * 0.12, '#ddaa77', '#221100');
  // Braid (side)
  _line(ctx, cx + w * 0.13, h * 0.16, cx + w * 0.16, h * 0.36, '#774422', 5);
  _line(ctx, cx - w * 0.13, h * 0.16, cx - w * 0.16, h * 0.36, '#774422', 5);
  // Headband with leaf motif
  _rect(ctx, cx - w * 0.14, h * 0.13, w * 0.28, h * 0.04, '#2a5a18');
  ctx.fillStyle = '#44aa22';
  ctx.font = `${Math.floor(w * 0.09)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✿', cx, h * 0.15);
  // Herb bundle in hand
  _line(ctx, cx - w * 0.30, h * 0.48, cx - w * 0.26, h * 0.72, '#664422', 3);
  ['#44aa22','#66cc44','#88bb66'].forEach((c, i) => _circle(ctx, cx - w * (0.28 - i * 0.04), h * 0.46, w * 0.03, c));
  // Arms
  _line(ctx, cx - w * 0.20, h * 0.40, cx - w * 0.32, h * 0.60, '#1e3018', 9);
  _line(ctx, cx + w * 0.20, h * 0.40, cx + w * 0.28, h * 0.58, '#1e3018', 9);
};

_P.npc_aldric = _P.aldric = (ctx, w, h) => {
  _bg(ctx, w, h, '#030610', '#06122a');
  const cx = w / 2;
  // Ghost form — translucent blue overlay
  const gg = ctx.createRadialGradient(cx, h * 0.50, 0, cx, h * 0.50, w * 0.44);
  gg.addColorStop(0, 'rgba(60,120,220,0.14)'); gg.addColorStop(1, 'transparent');
  ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h);
  // Captain's uniform (spectral)
  _poly(ctx, [[cx - w * 0.22, h * 0.32], [cx + w * 0.22, h * 0.32], [cx + w * 0.24, h * 0.88], [cx - w * 0.24, h * 0.88]], 'rgba(30,60,120,0.72)');
  _line(ctx, cx, h * 0.32, cx, h * 0.88, 'rgba(80,140,220,0.4)', 1.5);
  _line(ctx, cx - w * 0.22, h * 0.52, cx + w * 0.22, h * 0.52, 'rgba(80,140,220,0.3)', 1);
  // Shoulder decoration
  _rect(ctx, cx - w * 0.30, h * 0.32, w * 0.12, h * 0.06, 'rgba(100,160,255,0.50)');
  _rect(ctx, cx + w * 0.18, h * 0.32, w * 0.12, h * 0.06, 'rgba(100,160,255,0.50)');
  // Ghostly face — pale blue, sad expression
  _circle(ctx, cx, h * 0.22, w * 0.13, 'rgba(140,190,255,0.70)');
  _circle(ctx, cx - w * 0.07, h * 0.20, w * 0.038, 'rgba(0,30,100,0.90)');
  _circle(ctx, cx + w * 0.07, h * 0.20, w * 0.038, 'rgba(0,30,100,0.90)');
  _circle(ctx, cx - w * 0.07, h * 0.20, w * 0.022, '#88ccff');
  _circle(ctx, cx + w * 0.07, h * 0.20, w * 0.022, '#88ccff');
  // Sad downturned mouth
  ctx.strokeStyle = 'rgba(80,140,220,0.8)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, h * 0.28, w * 0.06, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
  // Captain hat (ghostly tricorn)
  _poly(ctx, [[cx - w * 0.18, h * 0.10], [cx + w * 0.18, h * 0.10], [cx + w * 0.16, h * 0.22], [cx - w * 0.16, h * 0.22]], 'rgba(20,50,120,0.80)');
  _poly(ctx, [[cx - w * 0.20, h * 0.10], [cx + w * 0.20, h * 0.10], [cx, h * 0.03]], 'rgba(20,50,120,0.80)');
  // Ghostly sword (faint)
  _line(ctx, cx + w * 0.14, h * 0.28, cx + w * 0.36, h * 0.70, 'rgba(100,180,255,0.45)', 2.5);
  // Fade at bottom
  const fade = ctx.createLinearGradient(0, h * 0.70, 0, h);
  fade.addColorStop(0, 'transparent'); fade.addColorStop(1, '#030610');
  ctx.fillStyle = fade; ctx.fillRect(0, h * 0.70, w, h * 0.30);
};

_P.npc_archivist = _P.archivist = (ctx, w, h) => {
  _bg(ctx, w, h, '#020006', '#06000e');
  const cx = w / 2;
  // Shadowy scholar robes (very dark, old-world)
  _poly(ctx, [[cx - w * 0.22, h * 0.32], [cx + w * 0.22, h * 0.32], [cx + w * 0.28, h * 0.96], [cx - w * 0.28, h * 0.96]], '#0a000e');
  _line(ctx, cx, h * 0.32, cx, h * 0.96, '#220033', 1.5);
  // Layered cloak collar
  _poly(ctx, [[cx - w * 0.28, h * 0.30], [cx + w * 0.28, h * 0.30], [cx + w * 0.20, h * 0.50], [cx - w * 0.20, h * 0.50]], '#080010');
  // Ancient tome carried (under arm)
  _rect(ctx, cx - w * 0.34, h * 0.54, w * 0.12, h * 0.20, '#331a00');
  _rect(ctx, cx - w * 0.33, h * 0.55, w * 0.10, h * 0.18, '#221200');
  _line(ctx, cx - w * 0.33, h * 0.60, cx - w * 0.23, h * 0.60, '#664400', 1);
  _line(ctx, cx - w * 0.33, h * 0.65, cx - w * 0.23, h * 0.65, '#664400', 1);
  _line(ctx, cx - w * 0.33, h * 0.70, cx - w * 0.23, h * 0.70, '#664400', 1);
  // Pale, ageless face — sharp features, slight smile
  _face(ctx, cx, h * 0.22, w * 0.11, '#c8b0c8', '#220033');
  // Knowing half-smile
  ctx.strokeStyle = '#998899'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx + w * 0.04, h * 0.275, w * 0.05, -Math.PI * 0.1, Math.PI * 0.35); ctx.stroke();
  // Silver-streaked dark hair, swept back
  _circle(ctx, cx, h * 0.14, w * 0.13, '#1a1020');
  _rect(ctx, cx - w * 0.12, h * 0.09, w * 0.24, h * 0.05, '#1a1020');
  _line(ctx, cx - w * 0.12, h * 0.09, cx - w * 0.14, h * 0.24, '#555566', 2);
  _line(ctx, cx + w * 0.12, h * 0.09, cx + w * 0.14, h * 0.24, '#555566', 2);
  // Quill pen in hand
  _line(ctx, cx + w * 0.22, h * 0.36, cx + w * 0.36, h * 0.60, '#ccccaa', 2.5);
  _poly(ctx, [[cx + w * 0.23, h * 0.34], [cx + w * 0.28, h * 0.30], [cx + w * 0.32, h * 0.36]], '#ccccaa');
  // Faint rune glow on robes (subtle)
  ctx.strokeStyle = 'rgba(100,0,150,0.28)'; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) ctx.strokeRect(cx - w * 0.16 + i * w * 0.12, h * 0.72, w * 0.08, h * 0.07);
  // Eye glow — cool grey-violet
  _circle(ctx, cx - w * 0.06, h * 0.20, w * 0.022, '#9966cc');
  _circle(ctx, cx + w * 0.06, h * 0.20, w * 0.022, '#9966cc');
};

// Fallback
_P.unknown = (ctx, w, h) => {
  _bg(ctx, w, h, '#0e0e0e', '#1e1e1e');
  const cx = w / 2;
  _circle(ctx, cx, h * 0.42, w * 0.28, '#2a2a2a', '#444444', 2);
  ctx.fillStyle   = '#666666';
  ctx.font        = `bold ${Math.floor(w * 0.40)}px monospace`;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', cx, h * 0.42);
};
