/**
 * @fileoverview Core data structure interfaces for the dungeon crawler engine
 */

/**
 * @typedef {Object} TileData
 * @property {'floor'|'wall'|'door'|'transition'|'empty'} type - Type of tile
 * @property {boolean} walkable - Whether the tile can be walked on
 * @property {boolean} [closed] - For doors: whether the door is closed
 * @property {boolean} [locked] - For doors: whether the door is locked
 * @property {'bronze'|'silver'|'gold'} [keyType] - For doors: required key type
 * @property {'vertical'|'horizontal'} [orientation] - For doors: door orientation
 * @property {string} [targetLevel] - For transitions: target level identifier
 * @property {SpawnPoint} [targetSpawn] - For transitions: spawn point in target level
 */

/**
 * @typedef {Object} PlayerState
 * @property {Position} position - Current grid position
 * @property {number} direction - Current facing direction (0=North, 1=East, 2=South, 3=West)
 * @property {string[]} keys - Array of key types the player possesses
 * @property {number} health - Player health points
 * @property {string} level - Current level identifier
 */

/**
 * @typedef {Object} AnimationState
 * @property {'move'|'rotate'} type - Type of animation
 * @property {number} startTime - Animation start timestamp
 * @property {number} duration - Animation duration in milliseconds
 * @property {Position|number} startValue - Starting position or rotation value
 * @property {Position|number} targetValue - Target position or rotation value
 * @property {Function} [easingFunction] - Easing function for animation
 */

/**
 * @typedef {Object} Position
 * @property {number} x - X coordinate
 * @property {number} z - Z coordinate
 */

/**
 * @typedef {Object} SpawnPoint
 * @property {number} x - Spawn X coordinate
 * @property {number} z - Spawn Z coordinate
 * @property {number} direction - Spawn facing direction
 */

/**
 * @typedef {Object} DoorData
 * @property {number} x - Door X coordinate
 * @property {number} z - Door Z coordinate
 * @property {boolean} closed - Whether door is closed
 * @property {boolean} locked - Whether door is locked
 * @property {'bronze'|'silver'|'gold'|null} keyType - Required key type
 * @property {'vertical'|'horizontal'} orientation - Door orientation
 * @property {THREE.Mesh} [mesh] - Three.js mesh object
 */

/**
 * @typedef {Object} LevelData
 * @property {string} id - Level identifier
 * @property {number} width - Level width in tiles
 * @property {number} height - Level height in tiles
 * @property {SpawnPoint} spawn - Player spawn point
 * @property {number[]} tiles - Flat array of tile types (width × height)
 * @property {DoorDefinition[]} [doors] - Door definitions
 * @property {TransitionDefinition[]} [transitions] - Transition definitions
 */

/**
 * @typedef {Object} DoorDefinition
 * @property {number} x - Door X coordinate
 * @property {number} z - Door Z coordinate
 * @property {'vertical'|'horizontal'} orientation - Door orientation
 * @property {boolean} [locked] - Whether door is locked
 * @property {'bronze'|'silver'|'gold'} [keyType] - Required key type
 * @property {boolean} [closed] - Whether door starts closed (default: true)
 */

/**
 * @typedef {Object} TransitionDefinition
 * @property {number} x - Transition X coordinate
 * @property {number} z - Transition Z coordinate
 * @property {'stairs'|'portal'|'door'} type - Type of transition
 * @property {string} target - Target level identifier
 * @property {SpawnPoint} spawn - Spawn point in target level
 */

/**
 * @typedef {Object} CollisionResult
 * @property {boolean} blocked - Whether movement is blocked
 * @property {string} [reason] - Reason for blocking (wall, door, out_of_bounds, etc.)
 * @property {TileData} [data] - Tile data at target position
 */

/**
 * @typedef {Object} InputAction
 * @property {'forward'|'backward'|'turnLeft'|'turnRight'|'strafeLeft'|'strafeRight'|'interact'} type - Action type
 * @property {number} timestamp - When action was queued
 */

// Export empty object to make this a module
export {};