import { TextureGenerator } from './TextureGenerator.js';

// Geometry Factory - Three.js geometry creation utilities
export class GeometryFactory {
  // Maps level theme → explicit pixel-art texture names.
  // Using explicit names avoids the HEAD-check collision with old generic PNGs
  // (ruin_wall.png, fungal_wall.png, etc.) which are preserved for special zones.
  static THEME_TEXTURES = {
    stone:  { wall: 'shadow_wall',  floor: 'cracked_floor' },
    ruin:   { wall: 'slate_wall',   floor: 'cracked_tile'  },
    crypt:  { wall: 'shadow_wall',  floor: 'cracked_floor' },
    cave:   { wall: 'rough_wall',   floor: 'dark_floor'    },
    fungal: { wall: 'stained_wall', floor: 'dark_floor'    },
    void:   { wall: 'stained_wall', floor: 'arcane_floor'  },
  };

  constructor() {
    this.tileSize  = 2.0;  // 2×2 metre tiles
    this.wallHeight = 3.0; // 3-metre walls
    this._theme = 'stone';

    this.texGen = new TextureGenerator();
  }

  setTheme(theme) {
    this._theme = theme || 'stone';
  }

  _wallTex() {
    const map = GeometryFactory.THEME_TEXTURES[this._theme];
    const tex = this.texGen.get(map?.wall ?? 'shadow_wall');
    if (tex) tex.repeat.set(1, 1);
    return tex;
  }

  _wallNormalTex() {
    const map = GeometryFactory.THEME_TEXTURES[this._theme];
    const name = (map?.wall ?? 'shadow_wall') + '_normal';
    const tex = this.texGen.get(name);
    if (tex) tex.repeat.set(1, 1);
    return tex;
  }

  _floorTex() {
    const map = GeometryFactory.THEME_TEXTURES[this._theme];
    const tex = this.texGen.get(map?.floor ?? 'cracked_floor');
    if (tex) tex.repeat.set(1, 1);
    return tex;
  }

  _floorNormalTex() {
    const map = GeometryFactory.THEME_TEXTURES[this._theme];
    const name = (map?.floor ?? 'cracked_floor') + '_normal';
    const tex = this.texGen.get(name);
    if (tex) tex.repeat.set(1, 1);
    return tex;
  }

  // Cheap hash-based per-tile colour variation — keeps identical tiles from looking cloned
  _tileVariation(x, z) {
    return ((x * 31 + z * 17) & 0xff) / 255; // 0..1
  }

  // Near-white with slight blue-gray bias — lets pixel-art show true colors.
  // Subtle per-tile variation breaks repetition without shifting the palette.
  _tileColor(x, z, rBase = 0.90, gBase = 0.90, bBase = 0.96) {
    const v = this._tileVariation(x, z) * 0.05 - 0.025; // ±0.025
    return new THREE.Color(
      Math.min(1, rBase + v),
      Math.min(1, gBase + v),
      Math.min(1, bBase + v)
    );
  }

  // ── Floor ────────────────────────────────────────────────────────────────

  createFloor(x, z) {
    const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    geometry.rotateX(-Math.PI / 2);

    const map       = this._floorTex();
    const normalMap = this._floorNormalTex();

    const material = new THREE.MeshStandardMaterial({
      map,
      normalMap,
      normalScale: new THREE.Vector2(1.4, 1.4),
      color:     this._tileColor(x, z, 0.88, 0.88, 0.94),
      roughness: 0.70,   // worn stone — slight wet sheen from torch
      metalness: 0.02,
      envMapIntensity: 0.4,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * this.tileSize, 0, z * this.tileSize);
    return mesh;
  }

  // ── Wall ─────────────────────────────────────────────────────────────────

  createWall(x, z) {
    const map       = this._wallTex();
    const normalMap = this._wallNormalTex();

    const wallMat = new THREE.MeshStandardMaterial({
      map,
      normalMap,
      normalScale: new THREE.Vector2(1.8, 1.8),  // strong relief on rough stone
      color:     this._tileColor(x, z, 0.80, 0.78, 0.86),
      roughness: 0.88,   // rough dry stone
      metalness: 0.00,
      // Very faint blue-cyan emissive — arcane crypt atmosphere
      emissive:          new THREE.Color(0.00, 0.005, 0.012),
      emissiveIntensity: 1.0,
    });

    const wallGeo = new THREE.BoxGeometry(this.tileSize, this.wallHeight, this.tileSize);
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(x * this.tileSize, this.wallHeight / 2, z * this.tileSize);

    // Base trim — darker stone at floor level
    const trimGeo = new THREE.BoxGeometry(this.tileSize + 0.04, 0.14, this.tileSize + 0.04);
    const trimMat = new THREE.MeshStandardMaterial({
      color:     0x14100c,
      roughness: 0.95,
      metalness: 0.0,
    });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(0, -(this.wallHeight / 2) + 0.07, 0);
    wallMesh.add(trim);

    return wallMesh;
  }

  // ── Ceiling ───────────────────────────────────────────────────────────────

  /**
   * @param {number} x
   * @param {number} z
   * @param {number} [height] - Y position of ceiling; defaults to wallHeight
   */
  createCeiling(x, z, height = null) {
    const y = (height != null && height > 0) ? height : this.wallHeight;

    const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    geometry.rotateX(Math.PI / 2);

    const map = this.texGen.get('ceiling');
    if (map) map.repeat.set(1, 1);

    const v = this._tileVariation(x, z) * 0.02;
    const material = new THREE.MeshStandardMaterial({
      map,
      color:    new THREE.Color(0.72 + v, 0.72 + v, 0.80 + v),
      roughness: 0.96,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * this.tileSize, y, z * this.tileSize);
    return mesh;
  }

  // ── Door ──────────────────────────────────────────────────────────────────

  createDoor(x, z, orientation = 'vertical', doorSystem = null) {
    let geometry;
    if (orientation === 'vertical') {
      geometry = new THREE.BoxGeometry(0.2, this.wallHeight * 0.9, this.tileSize * 0.8);
    } else {
      geometry = new THREE.BoxGeometry(this.tileSize * 0.8, this.wallHeight * 0.9, 0.2);
    }

    const map = this.texGen.get('woodDoor');
    const material = new THREE.MeshPhongMaterial({
      map,
      color:    new THREE.Color(0.88, 0.88, 0.94),  // near-white, slight blue bias
      shininess: 20,
      specular:  new THREE.Color(0.00, 0.06, 0.08),  // faint cyan specular
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * this.tileSize, this.wallHeight * 0.45, z * this.tileSize);
    mesh.userData = { orientation, gridX: x, gridZ: z, isDoor: true };

    if (doorSystem) {
      doorSystem.setDoorMesh(x, z, mesh);
    }
    return mesh;
  }

  // ── Transition marker (stairs) ───────────────────────────────────────────

  createTransitionMarker(x, z) {
    const geometry = new THREE.PlaneGeometry(this.tileSize * 0.85, this.tileSize * 0.85);
    geometry.rotateX(-Math.PI / 2);

    const map = this.texGen.get('stairMarker');
    const material = new THREE.MeshPhongMaterial({
      map,
      color:    new THREE.Color(0.7, 0.65, 0.55),
      shininess: 10,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * this.tileSize, 0.01, z * this.tileSize); // 1mm above floor
    return mesh;
  }

  // ── Generic utilities ────────────────────────────────────────────────────

  createCube(size = 1, color = 0xffffff) {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshPhongMaterial({ color, shininess: 10 });
    return new THREE.Mesh(geometry, material);
  }

  createPlane(width = 1, height = 1, color = 0xffffff) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshPhongMaterial({
      color,
      shininess: 10,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geometry, material);
  }

  dispose() {
    this.texGen.dispose();
  }
}
