import { Logger } from '../utils/Logger.js';

const log = Logger.tag('BattleBackground');

// UV-warp vertex + fragment shaders for the combat backdrop
const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = `
uniform float uTime;
uniform vec3  uColorTop;
uniform vec3  uColorMid;
uniform vec3  uColorBot;
uniform float uWarpAmt;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 uv = vUv;

  // Animated UV warp
  float t = uTime * 0.4;
  uv.x += sin(uv.y * 3.1 + t * 1.1) * uWarpAmt;
  uv.y += cos(uv.x * 2.7 + t * 0.9) * uWarpAmt * 0.6;

  // Layered noise for texture
  float n  = noise(uv * 4.0  + t * 0.3)  * 0.5;
       n  += noise(uv * 9.0  - t * 0.5)  * 0.25;
       n  += noise(uv * 18.0 + t * 0.15) * 0.125;
  n = clamp(n, 0.0, 1.0);

  // Vertical gradient blended with noise
  float y = vUv.y + n * 0.12;
  vec3 col;
  if (y < 0.5) {
    col = mix(uColorBot, uColorMid, y * 2.0);
  } else {
    col = mix(uColorMid, uColorTop, (y - 0.5) * 2.0);
  }

  // Subtle vignette
  vec2 vig = vUv * (1.0 - vUv);
  float v = pow(vig.x * vig.y * 18.0, 0.35);
  col *= 0.55 + 0.45 * v;

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Map level-id fragments → palette name */
const LEVEL_PALETTE_MAP = [
  [/crypt/,   'crypt'],
  [/cave/,    'cave'],
  [/forest/,  'forest'],
  [/fire|volcano|lava/, 'fire'],
  [/ice|frost|snow/,    'ice'],
  [/swamp|marsh/,       'swamp'],
  [/desert|sand/,       'desert'],
];

export class BattleBackgroundManager {
  static PALETTES = {
    default: { top: [0.02, 0.01, 0.05], mid: [0.06, 0.03, 0.12], bot: [0.08, 0.04, 0.16], warp: 0.04 },
    crypt:   { top: [0.02, 0.01, 0.04], mid: [0.08, 0.02, 0.16], bot: [0.10, 0.03, 0.22], warp: 0.05 },
    cave:    { top: [0.03, 0.02, 0.02], mid: [0.07, 0.05, 0.03], bot: [0.10, 0.07, 0.04], warp: 0.03 },
    forest:  { top: [0.01, 0.04, 0.02], mid: [0.03, 0.10, 0.04], bot: [0.04, 0.14, 0.05], warp: 0.04 },
    fire:    { top: [0.10, 0.01, 0.00], mid: [0.18, 0.04, 0.00], bot: [0.24, 0.06, 0.00], warp: 0.06 },
    ice:     { top: [0.01, 0.04, 0.10], mid: [0.03, 0.08, 0.18], bot: [0.04, 0.10, 0.24], warp: 0.03 },
    swamp:   { top: [0.02, 0.04, 0.01], mid: [0.06, 0.10, 0.03], bot: [0.08, 0.12, 0.04], warp: 0.05 },
    desert:  { top: [0.08, 0.05, 0.01], mid: [0.14, 0.09, 0.02], bot: [0.18, 0.11, 0.03], warp: 0.02 },
  };

  constructor(renderer) {
    this._renderer = renderer;
    this._mesh     = null;
    this._uniforms = null;
    this._active   = false;
  }

  initialize() {
    const scene = this._renderer?.getScene?.();
    if (!scene) { log.warn('no scene — backdrop skipped'); return; }
    this._buildBackdrop(scene);
    log.info('initialized');
  }

  /** Show backdrop for a given level id. */
  enter(levelId) {
    if (!this._mesh) return;
    const key = this._paletteKey(levelId);
    this._applyPalette(key);
    this._mesh.visible = true;
    this._active = true;
    log.debug('enter', { levelId, palette: key });
  }

  /** Hide backdrop. */
  exit() {
    if (this._mesh) this._mesh.visible = false;
    this._active = false;
    log.debug('exit');
  }

  /** Call every render frame while active. */
  update(timeMs) {
    if (this._uniforms) this._uniforms.uTime.value = timeMs * 0.001;
  }

  dispose() {
    this.exit();
    this._mesh?.geometry?.dispose();
    this._mesh?.material?.dispose();
    this._mesh?.parent?.remove(this._mesh);
    this._mesh = null;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _buildBackdrop(scene) {
    const pal  = BattleBackgroundManager.PALETTES.default;
    this._uniforms = {
      uTime:     { value: 0 },
      uColorTop: { value: new THREE.Vector3(...pal.top) },
      uColorMid: { value: new THREE.Vector3(...pal.mid) },
      uColorBot: { value: new THREE.Vector3(...pal.bot) },
      uWarpAmt:  { value: pal.warp },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms:       this._uniforms,
      depthWrite:     false,
      depthTest:      true,
      side:           THREE.DoubleSide,
    });

    // Large backdrop plane centred at battle arena, far behind enemy rank
    const geo = new THREE.PlaneGeometry(28, 14);
    this._mesh = new THREE.Mesh(geo, mat);
    // Position: centred in X, mid-height in Y, behind enemy back row (~Z=12)
    this._mesh.position.set(0, 3.5, 14);
    this._mesh.renderOrder = -1;
    this._mesh.visible = false;
    scene.add(this._mesh);
  }

  _paletteKey(levelId = '') {
    const id = levelId.toLowerCase();
    for (const [re, key] of LEVEL_PALETTE_MAP) {
      if (re.test(id)) return key;
    }
    return 'default';
  }

  _applyPalette(key) {
    const pal = BattleBackgroundManager.PALETTES[key] ?? BattleBackgroundManager.PALETTES.default;
    this._uniforms.uColorTop.value.set(...pal.top);
    this._uniforms.uColorMid.value.set(...pal.mid);
    this._uniforms.uColorBot.value.set(...pal.bot);
    this._uniforms.uWarpAmt.value = pal.warp;
  }
}
