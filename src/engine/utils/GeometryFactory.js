// Geometry Factory - Three.js geometry creation utilities
export class GeometryFactory {
  constructor() {
    this.tileSize = 2.0; // 2x2 meter tiles
    this.wallHeight = 3.0; // 3 meter high walls
  }

  // Create floor geometry
  createFloor(x, z) {
    // Floor is a horizontal plane at y=0
    const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    geometry.rotateX(-Math.PI / 2); // Rotate to be horizontal
    
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x444444,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * this.tileSize, 0, z * this.tileSize);
    
    return mesh;
  }

  // Create wall geometry
  createWall(x, z) {
    const geometry = new THREE.BoxGeometry(this.tileSize, this.wallHeight, this.tileSize);
    
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x666666
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * this.tileSize, this.wallHeight / 2, z * this.tileSize);
    
    return mesh;
  }

  // Create ceiling geometry
  createCeiling(x, z) {
    const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    geometry.rotateX(Math.PI / 2); // Rotate to be horizontal, facing down
    
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x333333,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * this.tileSize, this.wallHeight, z * this.tileSize);
    
    return mesh;
  }

  // Create door geometry
  createDoor(x, z, orientation = 'vertical', doorSystem = null) {
    let geometry;
    
    if (orientation === 'vertical') {
      // Door spans Z-axis (north-south)
      geometry = new THREE.BoxGeometry(0.2, this.wallHeight * 0.9, this.tileSize * 0.8);
    } else {
      // Door spans X-axis (east-west)
      geometry = new THREE.BoxGeometry(this.tileSize * 0.8, this.wallHeight * 0.9, 0.2);
    }
    
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513 // Brown color for doors
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * this.tileSize, this.wallHeight * 0.45, z * this.tileSize);
    
    // Store orientation and position info for animation
    mesh.userData = { 
      orientation,
      gridX: x,
      gridZ: z,
      isDoor: true
    };
    
    // Register mesh with door system for animation management
    if (doorSystem) {
      doorSystem.setDoorMesh(x, z, mesh);
    }
    
    return mesh;
  }

  // Create basic cube geometry (utility)
  createCube(size = 1, color = 0xffffff) {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshLambertMaterial({ color });
    return new THREE.Mesh(geometry, material);
  }

  // Create basic plane geometry (utility)
  createPlane(width = 1, height = 1, color = 0xffffff) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshLambertMaterial({ 
      color,
      side: THREE.DoubleSide
    });
    return new THREE.Mesh(geometry, material);
  }
}