// Collision System - Movement validation and special tile interactions
export class CollisionSystem {
  constructor(gridSystem, doorSystem = null) {
    this.gridSystem = gridSystem;
    this.doorSystem = doorSystem;
    this.playerKeys = []; // Track player's keys
  }

  /**
   * Set the door system reference for door interactions
   * @param {import('./DoorSystem.js').DoorSystem} doorSystem 
   */
  setDoorSystem(doorSystem) {
    this.doorSystem = doorSystem;
  }

  /**
   * Set player's current keys
   * @param {Array<string>} keys - Array of key types the player has
   */
  setPlayerKeys(keys) {
    this.playerKeys = [...keys];
  }

  /**
   * Add a key to player's inventory
   * @param {string} keyType - Type of key to add
   */
  addPlayerKey(keyType) {
    if (!this.playerKeys.includes(keyType)) {
      this.playerKeys.push(keyType);
    }
  }

  /**
   * Check if movement from one position to another is valid
   * Handles walls, boundaries, doors, and special tiles
   * @param {number} fromX - Starting grid X coordinate
   * @param {number} fromZ - Starting grid Z coordinate  
   * @param {number} toX - Target grid X coordinate
   * @param {number} toZ - Target grid Z coordinate
   * @returns {Object} Movement validation result
   */
  async checkMovement(fromX, fromZ, toX, toZ) {
    // Check if target position is within grid boundaries
    if (!this.gridSystem.isValidPosition(toX, toZ)) {
      return {
        blocked: true,
        reason: 'out_of_bounds',
        message: 'Cannot move outside dungeon boundaries',
        data: null
      };
    }

    // Check for diagonal movement blocking (corner collision prevention)
    if (this.isDiagonalMovement(fromX, fromZ, toX, toZ)) {
      const cornerBlocked = this.checkCornerCollision(fromX, fromZ, toX, toZ);
      if (cornerBlocked.blocked) {
        return cornerBlocked;
      }
    }

    const targetTile = this.gridSystem.getTile(toX, toZ);
    if (!targetTile) {
      return {
        blocked: true,
        reason: 'no_tile_data',
        message: 'No tile data found',
        data: null
      };
    }

    // Handle different tile types
    switch (targetTile.type) {
      case 'wall':
        return {
          blocked: true,
          reason: 'wall',
          message: 'Cannot walk through walls',
          data: targetTile
        };

      case 'empty':
        return {
          blocked: true,
          reason: 'empty_space',
          message: 'Cannot walk into empty space',
          data: targetTile
        };

      case 'door':
        return await this.handleDoorCollision(toX, toZ, targetTile);

      case 'transition':
        return this.handleTransitionTile(toX, toZ, targetTile);

      case 'floor':
        // Floor tiles should always be walkable
        if (!targetTile.walkable) {
          return {
            blocked: true,
            reason: 'floor_not_walkable',
            message: 'Floor tile is marked as not walkable',
            data: targetTile
          };
        }
        break;

      default:
        // Unknown tile type - check walkability
        if (!targetTile.walkable) {
          return {
            blocked: true,
            reason: 'not_walkable',
            message: `Tile type '${targetTile.type}' is not walkable`,
            data: targetTile
          };
        }
    }

    // Movement is valid
    return {
      blocked: false,
      reason: null,
      message: null,
      data: targetTile
    };
  }

  /**
   * Handle collision with door tiles
   * @param {number} x - Door grid X coordinate
   * @param {number} z - Door grid Z coordinate
   * @param {Object} doorTile - Door tile data
   * @returns {Object} Collision result with door handling
   */
  async handleDoorCollision(x, z, doorTile) {
    // If door is already open (walkable), allow movement
    if (doorTile.walkable && !doorTile.closed) {
      return {
        blocked: false,
        reason: 'door_open',
        message: 'Moving through open door',
        data: doorTile
      };
    }

    // Door is closed - check if it can be opened
    if (this.canOpenDoor(x, z, this.playerKeys)) {
      // Automatically open unlocked door
      if (this.doorSystem) {
        try {
          await this.doorSystem.openDoor(x, z);
          return {
            blocked: false,
            reason: 'door_opened',
            message: 'Door opened automatically',
            data: doorTile,
            action: 'door_opened'
          };
        } catch (error) {
          return {
            blocked: true,
            reason: 'door_open_failed',
            message: 'Failed to open door',
            data: doorTile
          };
        }
      } else {
        // No door system available, but door should be openable
        return {
          blocked: false,
          reason: 'door_should_open',
          message: 'Door should open (no door system)',
          data: doorTile
        };
      }
    } else {
      // Door is locked and player doesn't have key
      const keyRequired = doorTile.keyType || 'unknown';
      return {
        blocked: true,
        reason: 'door_locked',
        message: `Door is locked. Requires ${keyRequired} key.`,
        data: doorTile
      };
    }
  }

  /**
   * Handle transition tile detection
   * @param {number} x - Transition grid X coordinate
   * @param {number} z - Transition grid Z coordinate
   * @param {Object} transitionTile - Transition tile data
   * @returns {Object} Transition handling result
   */
  handleTransitionTile(x, z, transitionTile) {
    console.log(`Transition detected at (${x}, ${z}) to level: ${transitionTile.targetLevel}`);
    
    // Transition tiles are walkable and trigger level changes
    return {
      blocked: false,
      reason: 'transition',
      message: 'Entering transition area',
      data: transitionTile,
      action: 'level_transition',
      transitionData: {
        targetLevel: transitionTile.targetLevel,
        targetSpawn: transitionTile.targetSpawn
      }
    };
  }

  /**
   * Check if movement is diagonal
   * @param {number} fromX - Starting X
   * @param {number} fromZ - Starting Z
   * @param {number} toX - Target X
   * @param {number} toZ - Target Z
   * @returns {boolean} True if movement is diagonal
   */
  isDiagonalMovement(fromX, fromZ, toX, toZ) {
    const deltaX = Math.abs(toX - fromX);
    const deltaZ = Math.abs(toZ - fromZ);
    return deltaX > 0 && deltaZ > 0;
  }

  /**
   * Check for corner collision in diagonal movement
   * Prevents diagonal movement when adjacent tiles block the path
   * @param {number} fromX - Starting X
   * @param {number} fromZ - Starting Z
   * @param {number} toX - Target X
   * @param {number} toZ - Target Z
   * @returns {Object} Corner collision result
   */
  checkCornerCollision(fromX, fromZ, toX, toZ) {
    // Check the two adjacent tiles that form the "corner"
    const adjacentX = this.gridSystem.getTile(toX, fromZ);
    const adjacentZ = this.gridSystem.getTile(fromX, toZ);

    // If either adjacent tile blocks movement, prevent diagonal movement
    const xBlocked = !adjacentX || !adjacentX.walkable || adjacentX.type === 'wall';
    const zBlocked = !adjacentZ || !adjacentZ.walkable || adjacentZ.type === 'wall';

    if (xBlocked && zBlocked) {
      return {
        blocked: true,
        reason: 'corner_blocked_both',
        message: 'Cannot move diagonally - both adjacent tiles are blocked',
        data: { adjacentX, adjacentZ }
      };
    }

    if (xBlocked || zBlocked) {
      return {
        blocked: true,
        reason: 'corner_blocked_partial',
        message: 'Cannot move diagonally - adjacent tile is blocked',
        data: { adjacentX, adjacentZ }
      };
    }

    return {
      blocked: false,
      reason: null,
      message: null,
      data: null
    };
  }

  /**
   * Check if a tile is walkable
   * @param {number} x - Grid X coordinate
   * @param {number} z - Grid Z coordinate
   * @returns {boolean} True if tile is walkable
   */
  isWalkable(x, z) {
    if (!this.gridSystem.isValidPosition(x, z)) {
      return false;
    }
    
    const tile = this.gridSystem.getTile(x, z);
    if (!tile) return false;
    
    return tile.walkable === true;
  }

  /**
   * Check if tile contains a door
   * @param {number} x - Grid X coordinate
   * @param {number} z - Grid Z coordinate
   * @returns {boolean} True if tile contains a door
   */
  isDoor(x, z) {
    const tile = this.gridSystem.getTile(x, z);
    return tile && tile.type === 'door';
  }

  /**
   * Check if tile is a transition
   * @param {number} x - Grid X coordinate
   * @param {number} z - Grid Z coordinate
   * @returns {boolean} True if tile is a transition
   */
  isTransition(x, z) {
    const tile = this.gridSystem.getTile(x, z);
    return tile && tile.type === 'transition';
  }

  /**
   * Check if door can be opened (unlocked or player has key)
   * @param {number} x - Grid X coordinate
   * @param {number} z - Grid Z coordinate
   * @param {Array<string>} playerKeys - Array of keys the player has
   * @returns {boolean} True if door can be opened
   */
  canOpenDoor(x, z, playerKeys = []) {
    const tile = this.gridSystem.getTile(x, z);
    if (!tile || tile.type !== 'door') return false;
    
    // If door is not locked, it can be opened
    if (!tile.locked) return true;
    
    // If door is locked, check if player has the required key
    if (tile.keyType && playerKeys.includes(tile.keyType)) {
      return true;
    }
    
    return false;
  }

  /**
   * Validate movement in a specific direction from current position
   * @param {number} currentX - Current grid X
   * @param {number} currentZ - Current grid Z
   * @param {number} direction - Direction (0=North, 1=East, 2=South, 3=West)
   * @returns {Object} Movement validation result
   */
  async validateDirectionalMovement(currentX, currentZ, direction) {
    const directions = [
      {x: 0, z: -1}, // North
      {x: 1, z: 0},  // East
      {x: 0, z: 1},  // South
      {x: -1, z: 0}  // West
    ];
    
    if (direction < 0 || direction >= directions.length) {
      return {
        blocked: true,
        reason: 'invalid_direction',
        message: 'Invalid movement direction',
        data: null
      };
    }
    
    const dir = directions[direction];
    const targetX = currentX + dir.x;
    const targetZ = currentZ + dir.z;
    
    return await this.checkMovement(currentX, currentZ, targetX, targetZ);
  }

  /**
   * Get collision information for debugging
   * @param {number} x - Grid X coordinate
   * @param {number} z - Grid Z coordinate
   * @returns {Object} Detailed collision information
   */
  getCollisionInfo(x, z) {
    const tile = this.gridSystem.getTile(x, z);
    const isValid = this.gridSystem.isValidPosition(x, z);
    
    return {
      position: { x, z },
      isValidPosition: isValid,
      tile: tile,
      isWalkable: this.isWalkable(x, z),
      isDoor: this.isDoor(x, z),
      isTransition: this.isTransition(x, z),
      canOpenDoor: this.isDoor(x, z) ? this.canOpenDoor(x, z, this.playerKeys) : false
    };
  }
}