/**
 * @fileoverview DungeonLoader - Level loading and JSON parsing system
 * Handles loading level data from JSON files and generating 3D geometry
 */

/**
 * DungeonLoader manages level loading, geometry generation, and scene management
 * for dungeon levels. Parses JSON level data and creates corresponding 3D geometry.
 */
export class DungeonLoader {
  constructor(gridSystem, doorSystem, renderer = null, geometryFactory = null) {
    this.gridSystem = gridSystem;
    this.doorSystem = doorSystem;
    this.renderer = renderer;
    this.geometryFactory = geometryFactory;
    this.currentLevel = null;
    this.levelGeometry = new Map(); // Track created geometry for cleanup
  }

  /**
   * Set renderer reference for geometry management
   * @param {import('../core/Renderer.js').Renderer} renderer 
   */
  setRenderer(renderer) {
    this.renderer = renderer;
  }

  /**
   * Set geometry factory reference for mesh creation
   * @param {import('../utils/GeometryFactory.js').GeometryFactory} geometryFactory 
   */
  setGeometryFactory(geometryFactory) {
    this.geometryFactory = geometryFactory;
  }

  /**
   * Load level from JSON data (requirement 6.1)
   * @param {Object|string} levelData - Level data object or JSON string
   * @returns {Promise<Object>} Loaded level data
   */
  async loadLevel(levelData) {
    try {
      console.log('Loading level...');
      
      // Clear existing level and dispose resources (requirement 6.5)
      this.clearLevel();
      
      // Parse level data (requirement 6.1)
      const level = typeof levelData === 'string' ? JSON.parse(levelData) : levelData;
      
      // Validate required properties (requirement 6.1)
      this.validateLevelData(level);
      
      // Resize grid to match level dimensions
      this.gridSystem.resize(level.width, level.height);
      
      // Build grid from tiles array (requirement 6.2)
      this.buildGrid(level);
      
      // Generate 3D geometry from tile data (requirement 6.3)
      this.generateGeometry(level);
      
      // Create doors from definitions (requirement 6.4)
      if (level.doors) {
        this.createDoors(level.doors);
      }
      
      // Register transitions (requirement 6.5)
      if (level.transitions) {
        this.registerTransitions(level.transitions);
      }
      
      this.currentLevel = level;
      console.log(`Level "${level.id}" loaded successfully (${level.width}x${level.height})`);
      
      return level;
      
    } catch (error) {
      console.error('Failed to load level:', error);
      throw error;
    }
  }

  /**
   * Validate level data structure (requirement 6.1)
   * @param {Object} level - Level data to validate
   * @throws {Error} If level data is invalid
   */
  validateLevelData(level) {
    if (!level.width || !level.height || !level.tiles) {
      throw new Error('Invalid level data: missing required properties (width, height, tiles)');
    }
    
    if (!Array.isArray(level.tiles)) {
      throw new Error('Invalid level data: tiles must be an array');
    }
    
    if (level.tiles.length !== level.width * level.height) {
      throw new Error(`Invalid level data: tiles array length (${level.tiles.length}) does not match dimensions (${level.width}x${level.height})`);
    }
    
    if (!level.spawn) {
      console.warn('Level data missing spawn point, using default (0,0,0)');
      level.spawn = { x: 0, z: 0, direction: 0 };
    }
  }

  /**
   * Build grid data structure from tiles array (requirement 6.2)
   * @param {Object} level - Level data containing tiles array
   */
  buildGrid(level) {
    const { width, height, tiles } = level;
    
    console.log(`Building grid from ${width}x${height} tile array`);
    
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const index = z * width + x;
        const tileType = tiles[index];
        
        let tileData;
        switch (tileType) {
          case 0: // Empty/void
            tileData = {
              type: 'empty',
              walkable: false
            };
            break;
          case 1: // Floor
            tileData = {
              type: 'floor',
              walkable: true
            };
            break;
          case 2: // Wall
            tileData = {
              type: 'wall',
              walkable: false
            };
            break;
          default:
            // Unknown tile type, treat as wall for safety
            console.warn(`Unknown tile type ${tileType} at (${x}, ${z}), treating as wall`);
            tileData = {
              type: 'wall',
              walkable: false
            };
        }
        
        this.gridSystem.setTile(x, z, tileData);
      }
    }
    
    console.log('Grid data structure built successfully');
  }

  /**
   * Generate 3D geometry from tile data (requirement 6.3)
   * @param {Object} level - Level data
   */
  generateGeometry(level) {
    if (!this.geometryFactory || !this.renderer) {
      console.warn('Cannot generate geometry: missing geometryFactory or renderer');
      return;
    }
    
    console.log('Generating 3D geometry from tile data...');
    
    const { width, height } = level;
    let floorCount = 0;
    let wallCount = 0;
    let ceilingCount = 0;
    
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const tile = this.gridSystem.getTile(x, z);
        
        if (tile && tile.type === 'floor') {
          // Create floor mesh
          const floorMesh = this.geometryFactory.createFloor(x, z);
          this.renderer.addToScene(floorMesh);
          this.trackGeometry(`floor_${x}_${z}`, floorMesh);
          floorCount++;
          
          // Create ceiling mesh above floor tiles
          const ceilingMesh = this.geometryFactory.createCeiling(x, z);
          this.renderer.addToScene(ceilingMesh);
          this.trackGeometry(`ceiling_${x}_${z}`, ceilingMesh);
          ceilingCount++;
        }
        
        if (tile && tile.type === 'wall') {
          // Create wall mesh
          const wallMesh = this.geometryFactory.createWall(x, z);
          this.renderer.addToScene(wallMesh);
          this.trackGeometry(`wall_${x}_${z}`, wallMesh);
          wallCount++;
        }
      }
    }
    
    console.log(`Generated geometry: ${floorCount} floors, ${wallCount} walls, ${ceilingCount} ceilings`);
  }

  /**
   * Track created geometry for cleanup (requirement 6.5)
   * @param {string} key - Unique identifier for the geometry
   * @param {THREE.Mesh} mesh - The mesh object to track
   */
  trackGeometry(key, mesh) {
    this.levelGeometry.set(key, mesh);
  }

  /**
   * Create doors from door definitions (requirement 6.4)
   * @param {Array} doorDefinitions - Array of door definition objects
   */
  createDoors(doorDefinitions) {
    console.log(`Creating ${doorDefinitions.length} doors...`);
    
    for (const doorDef of doorDefinitions) {
      try {
        // Validate door definition
        if (typeof doorDef.x !== 'number' || typeof doorDef.z !== 'number') {
          console.error('Invalid door definition: missing or invalid coordinates', doorDef);
          continue;
        }
        
        // Create door data in door system
        const doorData = this.doorSystem.createDoor(doorDef.x, doorDef.z, {
          closed: doorDef.closed !== false, // Default to closed
          locked: doorDef.locked || false,
          keyType: doorDef.keyType || null,
          orientation: doorDef.orientation || 'vertical'
        });

        // Create door mesh if geometry factory and renderer are available
        if (this.geometryFactory && this.renderer) {
          const doorMesh = this.geometryFactory.createDoor(
            doorDef.x, 
            doorDef.z, 
            doorDef.orientation || 'vertical',
            this.doorSystem
          );
          
          // Add mesh to scene and track for cleanup
          this.renderer.addToScene(doorMesh);
          this.trackGeometry(`door_${doorDef.x}_${doorDef.z}`, doorMesh);
          
          console.log(`Created door at (${doorDef.x}, ${doorDef.z}) - orientation: ${doorDef.orientation || 'vertical'}, locked: ${doorDef.locked || false}`);
        }
        
      } catch (error) {
        console.error(`Failed to create door at (${doorDef.x}, ${doorDef.z}):`, error);
      }
    }
  }

  /**
   * Register transition tiles (requirement 6.5)
   * @param {Array} transitionDefinitions - Array of transition definition objects
   */
  registerTransitions(transitionDefinitions) {
    console.log(`Registering ${transitionDefinitions.length} transitions...`);
    
    for (const transition of transitionDefinitions) {
      try {
        // Validate transition definition
        if (typeof transition.x !== 'number' || typeof transition.z !== 'number') {
          console.error('Invalid transition definition: missing or invalid coordinates', transition);
          continue;
        }
        
        if (!transition.target) {
          console.error('Invalid transition definition: missing target level', transition);
          continue;
        }
        
        // Set transition tile data
        this.gridSystem.setTile(transition.x, transition.z, {
          type: 'transition',
          walkable: true,
          targetLevel: transition.target,
          targetSpawn: transition.spawn || {x: 0, z: 0, direction: 0},
          transitionType: transition.type || 'stairs'
        });
        
        console.log(`Registered transition at (${transition.x}, ${transition.z}) to "${transition.target}"`);
        
      } catch (error) {
        console.error(`Failed to register transition at (${transition.x}, ${transition.z}):`, error);
      }
    }
  }

  /**
   * Clear current level and dispose of resources (requirement 6.5)
   */
  clearLevel() {
    console.log('Clearing current level...');
    
    // Dispose of all tracked geometry
    this.disposeGeometry();
    
    // Clear grid system
    if (this.gridSystem) {
      this.gridSystem.clear();
    }
    
    // Clear door system
    if (this.doorSystem) {
      this.doorSystem.dispose();
    }
    
    // Clear renderer scene
    if (this.renderer) {
      this.renderer.clearScene();
    }
    
    this.currentLevel = null;
    console.log('Level cleared successfully');
  }

  /**
   * Dispose of all tracked geometry and free memory (requirement 6.5)
   */
  disposeGeometry() {
    console.log(`Disposing of ${this.levelGeometry.size} geometry objects...`);
    
    for (const [key, mesh] of this.levelGeometry.entries()) {
      try {
        // Remove from scene
        if (this.renderer) {
          this.renderer.removeFromScene(mesh);
        }
        
        // Dispose of geometry and materials
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(material => material.dispose());
          } else {
            mesh.material.dispose();
          }
        }
        
      } catch (error) {
        console.error(`Error disposing geometry "${key}":`, error);
      }
    }
    
    // Clear tracking map
    this.levelGeometry.clear();
  }

  /**
   * Get current level data
   * @returns {Object|null} Current level data or null if no level loaded
   */
  getCurrentLevel() {
    return this.currentLevel;
  }

  /**
   * Get spawn point for current level (requirement 6.5)
   * @returns {Object} Spawn point with x, z coordinates and direction
   */
  getSpawnPoint() {
    if (!this.currentLevel || !this.currentLevel.spawn) {
      console.warn('No spawn point defined, using default (0,0,0)');
      return {x: 0, z: 0, direction: 0};
    }
    
    return {
      x: this.currentLevel.spawn.x,
      z: this.currentLevel.spawn.z,
      direction: this.currentLevel.spawn.direction || 0
    };
  }

  /**
   * Load level from file path
   * @param {string} levelPath - Path to the level JSON file
   * @returns {Promise<Object>} Loaded level data
   */
  async loadLevelFromFile(levelPath) {
    try {
      console.log(`Loading level from file: ${levelPath}`);
      
      const response = await fetch(levelPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch level file: ${response.status} ${response.statusText}`);
      }
      
      const levelData = await response.json();
      return await this.loadLevel(levelData);
      
    } catch (error) {
      console.error(`Failed to load level from file "${levelPath}":`, error);
      throw error;
    }
  }

  /**
   * Set player spawn position and camera setup for new levels (requirement 6.5)
   * @param {import('../managers/MovementController.js').MovementController} movementController - Movement controller to update
   */
  setupPlayerSpawn(movementController) {
    if (!movementController) {
      console.error('Cannot setup player spawn: MovementController not provided');
      return;
    }
    
    const spawn = this.getSpawnPoint();
    
    console.log(`=== SPAWN DEBUG ===`);
    console.log(`Grid spawn position: (${spawn.x}, ${spawn.z})`);
    
    // Set player position and direction
    movementController.setPosition(spawn.x, spawn.z, spawn.direction);
    
    // Update camera position and rotation
    if (this.renderer) {
      const worldPos = movementController.getCurrentWorldPosition();
      const rotation = movementController.getCurrentRotation();
      
      console.log(`Grid to World conversion: (${spawn.x}, ${spawn.z}) -> (${worldPos.x}, ${worldPos.z})`);
      console.log(`Setting camera: position (${worldPos.x}, ${worldPos.z}), rotation ${rotation} radians (${rotation * 180 / Math.PI} degrees)`);
      
      // Check what tile is at spawn position
      const spawnTile = this.gridSystem.getTile(spawn.x, spawn.z);
      console.log(`Tile at spawn position: ${spawnTile ? spawnTile.type : 'undefined'}`);
      
      this.renderer.updateCameraPosition(worldPos);
      this.renderer.updateCameraRotation(rotation);
    }
    
    console.log(`Player spawned at grid (${spawn.x}, ${spawn.z}) facing direction ${spawn.direction}`);
    console.log(`==================`);
  }

  /**
   * Get level statistics for debugging
   * @returns {Object} Level statistics
   */
  getLevelStats() {
    if (!this.currentLevel) {
      return null;
    }
    
    const stats = {
      id: this.currentLevel.id,
      dimensions: `${this.currentLevel.width}x${this.currentLevel.height}`,
      totalTiles: this.currentLevel.width * this.currentLevel.height,
      doors: this.currentLevel.doors ? this.currentLevel.doors.length : 0,
      transitions: this.currentLevel.transitions ? this.currentLevel.transitions.length : 0,
      geometryObjects: this.levelGeometry.size,
      spawn: this.getSpawnPoint()
    };
    
    return stats;
  }

  /**
   * Check if a level is currently loaded
   * @returns {boolean} True if a level is loaded
   */
  isLevelLoaded() {
    return this.currentLevel !== null;
  }

  /**
   * Dispose of loader resources
   */
  dispose() {
    this.clearLevel();
    this.gridSystem = null;
    this.doorSystem = null;
    this.renderer = null;
    this.geometryFactory = null;
    console.log('DungeonLoader disposed');
  }
}