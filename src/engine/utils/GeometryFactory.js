// Geometry Factory - Three.js geometry creation utilities
export class GeometryFactory {
  constructor() {
    this.tileSize = 2.0; // 2x2 meter tiles
    this.wallHeight = 3.0; // 3 meter high walls
  }

  // Cheap hash-based per-tile color variation — avoids uniform flat look
  _tileVariation(x, z) {
    return ((x * 31 + z * 17) & 0xff) / 255; // 0..1
  }

  // Create floor geometry
  createFloor(x, z) {
    const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    geometry.rotateX(-Math.PI / 2);

    const v = this._tileVariation(x, z) * 0.04;
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0.18 + v, 0.15 + v * 0.8, 0.12 + v * 0.6),
      shininess: 40,
      specular: new THREE.Color(0.06, 0.04, 0.02),
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * this.tileSize, 0, z * this.tileSize);
    return mesh;
  }

  // Create wall geometry — wall block + thin base trim as child
  createWall(x, z) {
    const v = this._tileVariation(x, z) * 0.06 - 0.03; // ±0.03 variation
    const wallMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0.29 + v, 0.27 + v * 0.9, 0.24 + v * 0.8),
      shininess: 8,
      specular: new THREE.Color(0.04, 0.03, 0.02),
    });

    const wallGeo = new THREE.BoxGeometry(this.tileSize, this.wallHeight, this.tileSize);
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(x * this.tileSize, this.wallHeight / 2, z * this.tileSize);

    // Base trim — slightly darker, sits at floor level
    const trimGeo = new THREE.BoxGeometry(this.tileSize + 0.04, 0.14, this.tileSize + 0.04);
    const trimMat = new THREE.MeshPhongMaterial({
      color: 0x1a1410,
      shininess: 3,
    });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    // Local y relative to wall center: floor(0.07) - wallCenter(1.5) = -1.43
    trim.position.set(0, -(this.wallHeight / 2) + 0.07, 0);
    wallMesh.add(trim);

    return wallMesh;
  }

  // Create ceiling geometry
  createCeiling(x, z) {
    const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    geometry.rotateX(Math.PI / 2);

    const v = this._tileVariation(x, z) * 0.03;
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0.08 + v, 0.09 + v, 0.12 + v),
      shininess: 5,
      specular: new THREE.Color(0.02, 0.02, 0.03),
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * this.tileSize, this.wallHeight, z * this.tileSize);
    return mesh;
  }

  // Create door geometry
  createDoor(x, z, orientation = 'vertical', doorSystem = null) {
    let geometry;

    if (orientation === 'vertical') {
      geometry = new THREE.BoxGeometry(0.2, this.wallHeight * 0.9, this.tileSize * 0.8);
    } else {
      geometry = new THREE.BoxGeometry(this.tileSize * 0.8, this.wallHeight * 0.9, 0.2);
    }

    const material = new THREE.MeshPhongMaterial({
      color: 0x5c3010,
      shininess: 12,
      specular: new THREE.Color(0.06, 0.03, 0.01),
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * this.tileSize, this.wallHeight * 0.45, z * this.tileSize);
    mesh.userData = { orientation, gridX: x, gridZ: z, isDoor: true };

    if (doorSystem) {
      doorSystem.setDoorMesh(x, z, mesh);
    }
    return mesh;
  }

  // Create basic cube geometry (utility)
  createCube(size = 1, color = 0xffffff) {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshPhongMaterial({ color, shininess: 10 });
    return new THREE.Mesh(geometry, material);
  }

  // Create basic plane geometry (utility)
  createPlane(width = 1, height = 1, color = 0xffffff) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshPhongMaterial({
      color,
      shininess: 10,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geometry, material);
  }
}