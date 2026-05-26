import { Logger } from '../utils/Logger.js';

const log = Logger.tag('Props');

/**
 * PropSystem — creates decorative 3D props + per-tile PointLights from tileMetadata.
 *
 * tileMetadata entry shape (extends Phase-11 schema):
 *   { x, z, props: [ { type, side? } ], lightSource?: { color, intensity, distance } }
 *
 * Prop types: torch_wall, candle, debris, barrel, pillar
 * side (torch_wall): 'north'|'south'|'east'|'west' — which wall face the torch mounts on
 */
export class PropSystem {
  // Prop definitions: geometry/material recipe + optional light
  static DEFS = {
    torch_wall: { hasLight: true,  lightColor: 0xff7711, lightIntensity: 1.8, lightDist: 7 },
    candle:     { hasLight: true,  lightColor: 0xffcc44, lightIntensity: 0.9, lightDist: 4 },
    debris:     { hasLight: false },
    barrel:     { hasLight: false },
    pillar:     { hasLight: false },
  };

  // Wall-mount offsets per side (fraction of tileSize from tile centre)
  static SIDE_OFFSET = {
    north: { x:  0,    z: -0.45 },
    south: { x:  0,    z:  0.45 },
    east:  { x:  0.45, z:  0    },
    west:  { x: -0.45, z:  0    },
  };

  constructor(tileSize = 2.0) {
    this._tileSize = tileSize;
    this._meshes   = [];   // { mesh, key }
    this._lights   = [];   // { light, phase, freq, basePower }
    this._scene    = null;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Spawn all props defined in level.tileMetadata into scene.
   * Call once after DungeonLoader.generateGeometry().
   */
  buildForLevel(level, scene) {
    this._scene = scene;
    if (!Array.isArray(level.tileMetadata)) return;

    for (const meta of level.tileMetadata) {
      if (!Array.isArray(meta.props)) continue;
      for (const propDef of meta.props) {
        this._spawnProp(meta.x, meta.z, propDef);
      }
    }
    log.info('props spawned', { count: this._meshes.length, lights: this._lights.length });
  }

  /** Call every frame — updates torch/candle flicker. */
  update(timeMs) {
    const t = timeMs * 0.001;
    for (const l of this._lights) {
      l.light.intensity = l.basePower * (
        0.82 +
        Math.sin(t * l.freq        + l.phase) * 0.12 +
        Math.sin(t * l.freq * 3.1  + l.phase + 1.2) * 0.04 +
        Math.sin(t * l.freq * 7.7  + l.phase + 2.5) * 0.02
      );
    }
  }

  /** Remove all props from scene and free GPU resources. */
  clear() {
    for (const { mesh } of this._meshes) {
      this._scene?.remove(mesh);
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material?.dispose();
      }
    }
    for (const { light } of this._lights) {
      this._scene?.remove(light);
    }
    this._meshes = [];
    this._lights = [];
    log.debug('props cleared');
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _spawnProp(tileX, tileZ, propDef) {
    const def  = PropSystem.DEFS[propDef.type];
    if (!def) { log.warn('unknown prop type', propDef.type); return; }

    const T    = this._tileSize;
    const side = propDef.side ?? 'north';
    const off  = PropSystem.SIDE_OFFSET[side] ?? PropSystem.SIDE_OFFSET.north;

    const wx = tileX * T + off.x * T;
    const wz = tileZ * T + off.z * T;

    const mesh = this._buildMesh(propDef.type, side);
    if (!mesh) return;

    mesh.position.set(wx, 0, wz);
    mesh.userData.propType   = propDef.type;
    mesh.userData.interactive = !!propDef.interactive;
    this._scene?.add(mesh);
    this._meshes.push({ mesh, key: `${propDef.type}_${tileX}_${tileZ}` });

    if (def.hasLight) {
      const light = new THREE.PointLight(def.lightColor, def.lightIntensity, def.lightDist, 2);
      light.position.set(wx, 1.6, wz);
      this._scene?.add(light);
      this._lights.push({
        light,
        basePower: def.lightIntensity,
        phase:     Math.random() * Math.PI * 2,
        freq:      1.8 + Math.random() * 1.4,
      });
    }
  }

  _buildMesh(type, side) {
    switch (type) {
      case 'torch_wall': return this._buildTorch(side);
      case 'candle':     return this._buildCandle();
      case 'debris':     return this._buildDebris();
      case 'barrel':     return this._buildBarrel();
      case 'pillar':     return this._buildPillar();
      default:           return null;
    }
  }

  // Torch: thin cylinder (handle) + small cone (flame stand)
  _buildTorch(side) {
    const group = new THREE.Group();

    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6);
    const handleMat = new THREE.MeshPhongMaterial({ color: 0x4a2e10, shininess: 5 });
    const handle    = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = 1.55;
    group.add(handle);

    // Flame glow — small emissive sphere
    const flameGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const flameMat = new THREE.MeshPhongMaterial({
      color: 0xff8800, emissive: new THREE.Color(0.8, 0.4, 0.0),
      shininess: 0,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 1.78;
    group.add(flame);

    // Rotate group so handle leans toward wall
    const rot = { north: 0, south: Math.PI, east: -Math.PI / 2, west: Math.PI / 2 };
    group.rotation.y = rot[side] ?? 0;

    return group;
  }

  // Candle: thin cylinder, small emissive sphere at top
  _buildCandle() {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.05, 0.055, 0.28, 8);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xe8e0c8, shininess: 4 });
    const body    = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.14;
    group.add(body);

    const flameGeo = new THREE.SphereGeometry(0.045, 6, 6);
    const flameMat = new THREE.MeshPhongMaterial({
      color: 0xffcc44, emissive: new THREE.Color(0.6, 0.4, 0.0), shininess: 0,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.30;
    group.add(flame);

    return group;
  }

  // Debris: 3-5 small flat irregular quads scattered on floor
  _buildDebris() {
    const group = new THREE.Group();
    const mat   = new THREE.MeshPhongMaterial({ color: 0x3a3228, shininess: 1 });
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const w   = 0.10 + Math.random() * 0.18;
      const h   = 0.06 + Math.random() * 0.08;
      const geo = new THREE.PlaneGeometry(w, h);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 0.7,
        0.005,
        (Math.random() - 0.5) * 0.7
      );
      mesh.rotation.y = Math.random() * Math.PI;
      group.add(mesh);
    }
    return group;
  }

  // Barrel: squat cylinder
  _buildBarrel() {
    const geo = new THREE.CylinderGeometry(0.22, 0.20, 0.50, 10);
    const mat = new THREE.MeshPhongMaterial({ color: 0x3d2610, shininess: 6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.25;
    return mesh;
  }

  // Pillar: tall thin cylinder
  _buildPillar() {
    const geo = new THREE.CylinderGeometry(0.18, 0.20, 2.8, 8);
    const mat = new THREE.MeshPhongMaterial({ color: 0x6a5a48, shininess: 3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 1.4;
    return mesh;
  }
}
