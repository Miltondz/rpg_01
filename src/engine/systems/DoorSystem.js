// Door System - Door state management and animations
export class DoorSystem {
  constructor(gridSystem, renderer = null) {
    this.gridSystem = gridSystem;
    this.renderer = renderer;
    this.doors = new Map(); // Key: "x,z", Value: door state
    this.animatingDoors = new Map();
    this.slideDistance = 1.5; // 1.5 meters as per requirement 4.2
  }

  /**
   * Set renderer reference for mesh management
   * @param {import('../core/Renderer.js').Renderer} renderer 
   */
  setRenderer(renderer) {
    this.renderer = renderer;
  }

  // Create a door at the specified position
  createDoor(x, z, properties) {
    const key = `${x},${z}`;
    const doorData = {
      x,
      z,
      closed: properties.closed !== false, // Default to closed
      locked: properties.locked || false,
      keyType: properties.keyType || null,
      orientation: properties.orientation || 'vertical',
      mesh: null, // Will be set by renderer
      originalPosition: null, // Store original position for animations
      isAnimating: false
    };
    
    this.doors.set(key, doorData);
    
    // Update grid tile
    this.gridSystem.setTile(x, z, {
      type: 'door',
      walkable: !doorData.closed,
      closed: doorData.closed,
      locked: doorData.locked,
      keyType: doorData.keyType,
      orientation: doorData.orientation
    });
    
    return doorData;
  }

  /**
   * Set the mesh for a door (called by renderer/geometry factory)
   * @param {number} x - Grid X coordinate
   * @param {number} z - Grid Z coordinate  
   * @param {THREE.Mesh} mesh - Door mesh object
   */
  setDoorMesh(x, z, mesh) {
    const door = this.getDoor(x, z);
    if (door) {
      door.mesh = mesh;
      // Store original position for animations
      door.originalPosition = {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z
      };
    }
  }

  // Get door at position
  getDoor(x, z) {
    const key = `${x},${z}`;
    return this.doors.get(key) || null;
  }

  // Check if door is open
  isDoorOpen(x, z) {
    const door = this.getDoor(x, z);
    return door && !door.closed;
  }

  // Open door (returns promise for animation completion)
  async openDoor(x, z) {
    const door = this.getDoor(x, z);
    if (!door || !door.closed || door.isAnimating) return false;
    
    console.log(`Opening door at (${x}, ${z})`);
    
    // Mark door as opening and start animation
    door.closed = false;
    door.isAnimating = true;
    this.startDoorAnimation(door, 'open');
    
    // Update grid walkability immediately (requirement 4.3)
    this.gridSystem.setTile(x, z, {
      ...this.gridSystem.getTile(x, z),
      walkable: true,
      closed: false
    });
    
    return new Promise((resolve) => {
      setTimeout(() => {
        door.isAnimating = false;
        console.log(`Door at (${x}, ${z}) opened successfully`);
        resolve(true);
      }, 300); // 300ms animation duration as per requirement 4.2
    });
  }

  // Close door
  async closeDoor(x, z) {
    const door = this.getDoor(x, z);
    if (!door || door.closed || door.isAnimating) return false;
    
    console.log(`Closing door at (${x}, ${z})`);
    
    // Mark door as closing and start animation
    door.closed = true;
    door.isAnimating = true;
    this.startDoorAnimation(door, 'close');
    
    // Update grid walkability
    this.gridSystem.setTile(x, z, {
      ...this.gridSystem.getTile(x, z),
      walkable: false,
      closed: true
    });
    
    return new Promise((resolve) => {
      setTimeout(() => {
        door.isAnimating = false;
        console.log(`Door at (${x}, ${z}) closed successfully`);
        resolve(true);
      }, 300); // 300ms animation duration
    });
  }

  // Start door animation with perpendicular sliding motion (requirement 4.2)
  startDoorAnimation(door, action) {
    const key = `${door.x},${door.z}`;
    
    if (!door.mesh || !door.originalPosition) {
      console.warn(`Cannot animate door at (${door.x}, ${door.z}) - missing mesh or original position`);
      return;
    }

    // Calculate slide direction based on orientation (requirement 4.5)
    let slideDirection = { x: 0, z: 0 };
    
    if (door.orientation === 'vertical') {
      // Vertical doors slide along Z-axis (north-south)
      slideDirection.z = action === 'open' ? this.slideDistance : -this.slideDistance;
    } else {
      // Horizontal doors slide along X-axis (east-west)  
      slideDirection.x = action === 'open' ? this.slideDistance : -this.slideDistance;
    }

    const animationData = {
      door,
      action,
      startTime: performance.now(),
      duration: 300, // 300ms as per requirement 4.2
      startPosition: {
        x: door.mesh.position.x,
        y: door.mesh.position.y,
        z: door.mesh.position.z
      },
      targetPosition: {
        x: door.originalPosition.x + slideDirection.x,
        y: door.originalPosition.y,
        z: door.originalPosition.z + slideDirection.z
      }
    };

    // If closing, slide back to original position
    if (action === 'close') {
      animationData.targetPosition = {
        x: door.originalPosition.x,
        y: door.originalPosition.y,
        z: door.originalPosition.z
      };
    }
    
    this.animatingDoors.set(key, animationData);
    console.log(`Started ${action} animation for door at (${door.x}, ${door.z}), orientation: ${door.orientation}`);
  }

  // Update door animations with smooth interpolation
  update(deltaTime) {
    for (const [key, animation] of this.animatingDoors.entries()) {
      const elapsed = performance.now() - animation.startTime;
      const progress = Math.min(elapsed / animation.duration, 1.0);
      
      // Apply ease-out cubic easing for smooth animation
      const easedProgress = this.easeOutCubic(progress);
      
      // Update door mesh position
      if (animation.door.mesh) {
        const startPos = animation.startPosition;
        const targetPos = animation.targetPosition;
        
        animation.door.mesh.position.set(
          startPos.x + (targetPos.x - startPos.x) * easedProgress,
          startPos.y + (targetPos.y - startPos.y) * easedProgress,
          startPos.z + (targetPos.z - startPos.z) * easedProgress
        );
      }
      
      if (progress >= 1.0) {
        // Animation complete - ensure exact final position
        if (animation.door.mesh) {
          animation.door.mesh.position.set(
            animation.targetPosition.x,
            animation.targetPosition.y,
            animation.targetPosition.z
          );
        }
        
        this.animatingDoors.delete(key);
        console.log(`Door animation completed for door at (${animation.door.x}, ${animation.door.z})`);
      }
      
      // Store progress for external use
      animation.progress = progress;
    }
  }

  /**
   * Ease-out cubic easing function for smooth animations
   * @param {number} t - Progress value (0 to 1)
   * @returns {number} Eased progress value
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Handle Space key interaction with doors (requirement 4.4)
   * @param {number} x - Door grid X coordinate
   * @param {number} z - Door grid Z coordinate
   * @param {Array<string>} playerKeys - Array of keys the player has
   * @returns {Object} Interaction result
   */
  async handleDoorInteraction(x, z, playerKeys = []) {
    const door = this.getDoor(x, z);
    if (!door) {
      return {
        success: false,
        message: 'No door found at this position',
        action: null
      };
    }

    // If door is already open, try to close it
    if (!door.closed) {
      const result = await this.closeDoor(x, z);
      return {
        success: result,
        message: result ? 'Door closed' : 'Cannot close door',
        action: 'close'
      };
    }

    // Door is closed - check if it can be opened
    if (!door.locked) {
      // Unlocked door - open it
      const result = await this.openDoor(x, z);
      return {
        success: result,
        message: result ? 'Door opened' : 'Cannot open door',
        action: 'open'
      };
    }

    // Door is locked - check for required key
    if (door.keyType && playerKeys.includes(door.keyType)) {
      // Player has the required key - open the door
      const result = await this.openDoor(x, z);
      return {
        success: result,
        message: result ? `Door unlocked with ${door.keyType} key` : 'Cannot open door',
        action: 'unlock_and_open',
        keyUsed: door.keyType
      };
    }

    // Player doesn't have the required key
    const keyRequired = door.keyType || 'unknown';
    return {
      success: false,
      message: `Door is locked. Requires ${keyRequired} key.`,
      action: 'locked',
      keyRequired: keyRequired
    };
  }

  /**
   * Check if door can be opened automatically (for collision system)
   * @param {number} x - Door grid X coordinate
   * @param {number} z - Door grid Z coordinate
   * @param {Array<string>} playerKeys - Array of keys the player has
   * @returns {boolean} True if door can be opened
   */
  canOpenDoor(x, z, playerKeys = []) {
    const door = this.getDoor(x, z);
    if (!door || !door.closed) return false;
    
    // If door is not locked, it can be opened
    if (!door.locked) return true;
    
    // If door is locked, check if player has the required key
    if (door.keyType && playerKeys.includes(door.keyType)) {
      return true;
    }
    
    return false;
  }

  /**
   * Get door state information for debugging
   * @param {number} x - Grid X coordinate
   * @param {number} z - Grid Z coordinate
   * @returns {Object} Door state information
   */
  getDoorInfo(x, z) {
    const door = this.getDoor(x, z);
    if (!door) return null;

    return {
      position: { x: door.x, z: door.z },
      closed: door.closed,
      locked: door.locked,
      keyType: door.keyType,
      orientation: door.orientation,
      isAnimating: door.isAnimating,
      hasMesh: !!door.mesh
    };
  }

  /**
   * Get all doors in the system
   * @returns {Array} Array of all door data
   */
  getAllDoors() {
    return Array.from(this.doors.values());
  }

  // Get all animating doors (for renderer)
  getAnimatingDoors() {
    return Array.from(this.animatingDoors.values());
  }

  /**
   * Dispose of door system resources
   */
  dispose() {
    this.doors.clear();
    this.animatingDoors.clear();
    console.log('DoorSystem disposed');
  }
}