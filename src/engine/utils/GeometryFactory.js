import { TextureGenerator } from './TextureGenerator.js';

// Geometry Factory - Three.js geometry creation utilities
export class GeometryFactory {
  constructor() {
    this.tileSize  = 2.0;  // 2×2 metre tiles
    this.wallHeight = 3.0; // 3-metre walls

    this.texGen = new TextureGenerator();
  }

  // Cheap hash-based per-tile colour variation — keeps identical tiles from looking cloned
  _tileVariation(x, z) {
    return ((x * 31 + z * 17) & 0xff) / 255; // 0..1
  }

  // Warm tint that subtly varies per tile while staying near-white (lets texture dominate)
  _tileColor(x, z, rBase = 1.0, gBase = 0.97, bBase = 0.91) {
    const v = this._tileVariation(x, z) * 0.06 - 0.03; // ±0.03
    return new THREE.Color(
      Math.min(1, rBase + v),
      Math.min(1, gBase + v * 0.8),
      Math.min(1, bBase + v * 0.6)
    );
  }

  // ── Floor ────────────────────────────────────────────────────────────────

  createFloor(x, z) {
    const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    geometry.rotateX(-Math.PI / 2);

    const map = this.texGen.get('stoneFloor');
    if (map) map.repeat.set(1, 1);

    const material = new THREE.MeshPhongMaterial({
      map,
      color:    this._tileColor(x, z, 0.95, 0.90, 0.82),
      shininess: 28,
      specular:  new THREE.Color(0.05, 0.04, 0.03),
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * this.tileSize, 0, z * this.tileSize);
    return mesh;
  }

  // ── Wall ─────────────────────────────────────────────────────────────────

  createWall(x, z) {
    const map = this.texGen.get('stoneWall');
    // One texture unit spans the full wall face — stones look naturally sized
    if (map) map.repeat.set(1, 1.4);

    const wallMat = new THREE.MeshPhongMaterial({
      map,
      color:    this._tileColor(x, z, 0.98, 0.93, 0.84),
      shininess: 6,
      specular:  new THREE.Color(0.03, 0.02, 0.01),
    });

    const wallGeo = new THREE.BoxGeometry(this.tileSize, this.wallHeight, this.tileSize);
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(x * this.tileSize, this.wallHeight / 2, z * this.tileSize);

    // Base trim — darker stone at floor level
    const trimGeo = new THREE.BoxGeometry(this.tileSize + 0.04, 0.14, this.tileSize + 0.04);
    const trimMat = new THREE.MeshPhongMaterial({
      color: 0x14100c,
      shininess: 2,
    });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(0, -(this.wallHeight / 2) + 0.07, 0);
    wallMesh.add(trim);

    return wallMesh;
  }

  // ── Ceiling ───────────────────────────────────────────────────────────────

  createCeiling(x, z) {
    const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    geometry.rotateX(Math.PI / 2);

    const map = this.texGen.get('ceiling');
    if (map) map.repeat.set(1, 1);

    const v = this._tileVariation(x, z) * 0.02;
    const material = new THREE.MeshPhongMaterial({
      map,
      color:    new THREE.Color(0.28 + v, 0.25 + v, 0.22 + v),
      shininess: 3,
      specular:  new THREE.Color(0.01, 0.01, 0.01),
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * this.tileSize, this.wallHeight, z * this.tileSize);
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
      color:    new THREE.Color(0.90, 0.75, 0.60),
      shininess: 14,
      specular:  new THREE.Color(0.05, 0.03, 0.01),
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
