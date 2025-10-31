/**
 * GeometryInstancer - Optimized geometry instancing for repeated elements
 * Implements instanced meshes for floor, wall, and ceiling elements to improve performance
 */

export class GeometryInstancer {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = renderer.getScene();
    
    // Instance managers for different geometry types
    this.floorInstances = null;
    this.wallInstances = null;
    this.ceilingInstances = null;
    
    // Geometry and material caches
    this.geometryCache = new Map();
    this.materialCache = new Map();
    
    // Instance data tracking
    this.instanceData = {
      floors: [],
      walls: [],
      ceilings: []
    };
    
    // Performance settings
    this.maxInstances = 10000; // Maximum instances per type
    this.tileSize = 2.0;
    this.wallHeight = 3.0;
    
    console.log('GeometryInstancer initialized');
  }

  /**
   * Initialize instanced geometries for a level
   * @param {Object} levelData - Level data with dimensions and tile information
   */
  initializeInstances(levelData) {
    console.log('Initializing geometry instances for level:', levelData.id);
    
    // Clear existing instances
    this.clearInstances();
    
    // Count tiles by type to determine instance counts
    const tileCounts = this.countTilesByType(levelData);
    console.log('Tile counts:', tileCounts);
    
    // Create instanced geometries
    this.createFloorInstances(tileCounts.floors);
    this.createWallInstances(tileCounts.walls);
    this.createCeilingInstances(tileCounts.ceilings);
    
    // Populate instance data
    this.populateInstances(levelData);
    
    console.log('Geometry instances initialized successfully');
  }

  /**
   * Count tiles by type from level data
   * @param {Object} levelData - Level data
   * @returns {Object} Counts of each tile type
   */
  countTilesByType(levelData) {
    const counts = { floors: 0, walls: 0, ceilings: 0 };
    
    if (!levelData.tiles) return counts;
    
    // Count tiles from the tiles array
    for (let i = 0; i < levelData.tiles.length; i++) {
      const tileType = levelData.tiles[i];
      
      switch (tileType) {
        case 1: // Floor
          counts.floors++;
          counts.ceilings++; // Floors also need ceilings
          break;
        case 2: // Wall
          counts.walls++;
          break;
        case 3: // Door (treated as floor for instancing)
          counts.floors++;
          counts.ceilings++;
          break;
        case 4: // Transition (treated as floor)
          counts.floors++;
          counts.ceilings++;
          break;
      }
    }
    
    return counts;
  }

  /**
   * Create instanced floor geometry
   * @param {number} count - Number of floor instances needed
   */
  createFloorInstances(count) {
    if (count === 0) return;
    
    const geometry = this.getOrCreateGeometry('floor', () => {
      const geo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
      geo.rotateX(-Math.PI / 2); // Rotate to be horizontal
      return geo;
    });
    
    const material = this.getOrCreateMaterial('floor', () => {
      return new THREE.MeshLambertMaterial({ 
        color: 0x444444,
        side: THREE.DoubleSide
      });
    });
    
    this.floorInstances = new THREE.InstancedMesh(geometry, material, count);
    this.floorInstances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    this.scene.add(this.floorInstances);
    
    console.log(`Created ${count} floor instances`);
  }

  /**
   * Create instanced wall geometry
   * @param {number} count - Number of wall instances needed
   */
  createWallInstances(count) {
    if (count === 0) return;
    
    const geometry = this.getOrCreateGeometry('wall', () => {
      return new THREE.BoxGeometry(this.tileSize, this.wallHeight, this.tileSize);
    });
    
    const material = this.getOrCreateMaterial('wall', () => {
      return new THREE.MeshLambertMaterial({ color: 0x666666 });
    });
    
    this.wallInstances = new THREE.InstancedMesh(geometry, material, count);
    this.wallInstances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    this.scene.add(this.wallInstances);
    
    console.log(`Created ${count} wall instances`);
  }

  /**
   * Create instanced ceiling geometry
   * @param {number} count - Number of ceiling instances needed
   */
  createCeilingInstances(count) {
    if (count === 0) return;
    
    const geometry = this.getOrCreateGeometry('ceiling', () => {
      const geo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
      geo.rotateX(Math.PI / 2); // Rotate to be horizontal, facing down
      return geo;
    });
    
    const material = this.getOrCreateMaterial('ceiling', () => {
      return new THREE.MeshLambertMaterial({ 
        color: 0x333333,
        side: THREE.DoubleSide
      });
    });
    
    this.ceilingInstances = new THREE.InstancedMesh(geometry, material, count);
    this.ceilingInstances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    this.scene.add(this.ceilingInstances);
    
    console.log(`Created ${count} ceiling instances`);
  }

  /**
   * Populate instance matrices with tile positions
   * @param {Object} levelData - Level data
   */
  populateInstances(levelData) {
    let floorIndex = 0;
    let wallIndex = 0;
    let ceilingIndex = 0;
    
    const matrix = new THREE.Matrix4();
    
    // Iterate through all tiles and set instance positions
    for (let z = 0; z < levelData.height; z++) {
      for (let x = 0; x < levelData.width; x++) {
        const tileIndex = z * levelData.width + x;
        const tileType = levelData.tiles[tileIndex];
        
        const worldX = x * this.tileSize;
        const worldZ = z * this.tileSize;
        
        switch (tileType) {
          case 1: // Floor
            this.setFloorInstance(floorIndex++, worldX, worldZ, matrix);
            this.setCeilingInstance(ceilingIndex++, worldX, worldZ, matrix);
            break;
            
          case 2: // Wall
            this.setWallInstance(wallIndex++, worldX, worldZ, matrix);
            break;
            
          case 3: // Door (floor + ceiling, door mesh handled separately)
            this.setFloorInstance(floorIndex++, worldX, worldZ, matrix);
            this.setCeilingInstance(ceilingIndex++, worldX, worldZ, matrix);
            break;
            
          case 4: // Transition (floor + ceiling)
            this.setFloorInstance(floorIndex++, worldX, worldZ, matrix);
            this.setCeilingInstance(ceilingIndex++, worldX, worldZ, matrix);
            break;
        }
      }
    }
    
    // Update instance matrices
    if (this.floorInstances) {
      this.floorInstances.instanceMatrix.needsUpdate = true;
    }
    if (this.wallInstances) {
      this.wallInstances.instanceMatrix.needsUpdate = true;
    }
    if (this.ceilingInstances) {
      this.ceilingInstances.instanceMatrix.needsUpdate = true;
    }
    
    console.log(`Populated instances: ${floorIndex} floors, ${wallIndex} walls, ${ceilingIndex} ceilings`);
  }

  /**
   * Set floor instance position
   */
  setFloorInstance(index, worldX, worldZ, matrix) {
    if (!this.floorInstances || index >= this.floorInstances.count) return;
    
    matrix.makeTranslation(worldX, 0, worldZ);
    this.floorInstances.setMatrixAt(index, matrix);
  }

  /**
   * Set wall instance position
   */
  setWallInstance(index, worldX, worldZ, matrix) {
    if (!this.wallInstances || index >= this.wallInstances.count) return;
    
    matrix.makeTranslation(worldX, this.wallHeight / 2, worldZ);
    this.wallInstances.setMatrixAt(index, matrix);
  }

  /**
   * Set ceiling instance position
   */
  setCeilingInstance(index, worldX, worldZ, matrix) {
    if (!this.ceilingInstances || index >= this.ceilingInstances.count) return;
    
    matrix.makeTranslation(worldX, this.wallHeight, worldZ);
    this.ceilingInstances.setMatrixAt(index, matrix);
  }

  /**
   * Get or create cached geometry
   */
  getOrCreateGeometry(type, createFn) {
    if (!this.geometryCache.has(type)) {
      this.geometryCache.set(type, createFn());
    }
    return this.geometryCache.get(type);
  }

  /**
   * Get or create cached material
   */
  getOrCreateMaterial(type, createFn) {
    if (!this.materialCache.has(type)) {
      this.materialCache.set(type, createFn());
    }
    return this.materialCache.get(type);
  }

  /**
   * Clear all instances and remove from scene
   */
  clearInstances() {
    if (this.floorInstances) {
      this.scene.remove(this.floorInstances);
      this.floorInstances.dispose();
      this.floorInstances = null;
    }
    
    if (this.wallInstances) {
      this.scene.remove(this.wallInstances);
      this.wallInstances.dispose();
      this.wallInstances = null;
    }
    
    if (this.ceilingInstances) {
      this.scene.remove(this.ceilingInstances);
      this.ceilingInstances.dispose();
      this.ceilingInstances = null;
    }
    
    // Clear instance data
    this.instanceData = {
      floors: [],
      walls: [],
      ceilings: []
    };
    
    console.log('Geometry instances cleared');
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    this.clearInstances();
    
    // Dispose cached geometries
    for (const geometry of this.geometryCache.values()) {
      geometry.dispose();
    }
    this.geometryCache.clear();
    
    // Dispose cached materials
    for (const material of this.materialCache.values()) {
      material.dispose();
    }
    this.materialCache.clear();
    
    console.log('GeometryInstancer disposed');
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      floorInstances: this.floorInstances ? this.floorInstances.count : 0,
      wallInstances: this.wallInstances ? this.wallInstances.count : 0,
      ceilingInstances: this.ceilingInstances ? this.ceilingInstances.count : 0,
      cachedGeometries: this.geometryCache.size,
      cachedMaterials: this.materialCache.size
    };
  }
}