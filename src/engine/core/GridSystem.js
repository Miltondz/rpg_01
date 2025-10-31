/**
 * @fileoverview Grid system for managing discrete coordinate system and tile data
 */

/**
 * GridSystem manages the discrete coordinate system where the game world is divided
 * into 2x2 meter tiles. Provides coordinate conversion, tile data storage, and
 * utility methods for grid-based operations.
 */
export class GridSystem {
    /**
     * @param {number} width - Grid width in tiles
     * @param {number} height - Grid height in tiles
     */
    constructor(width = 20, height = 20) {
        this.width = width;
        this.height = height;
        this.tileSize = 2.0; // Each tile is 2x2 meters
        
        // Use Map with string keys for efficient tile lookup
        /** @type {Map<string, import('../../types/interfaces.js').TileData>} */
        this.tiles = new Map();
        
        // Initialize with empty tiles
        this.initializeGrid();
    }

    /**
     * Initialize grid with empty tiles
     * @private
     */
    initializeGrid() {
        for (let x = 0; x < this.width; x++) {
            for (let z = 0; z < this.height; z++) {
                const key = this.getKey(x, z);
                this.tiles.set(key, {
                    type: 'empty',
                    walkable: false
                });
            }
        }
    }

    /**
     * Generate string key for tile coordinates
     * @param {number} x - Grid X coordinate
     * @param {number} z - Grid Z coordinate
     * @returns {string} String key for Map lookup
     * @private
     */
    getKey(x, z) {
        return `${x},${z}`;
    }

    /**
     * Convert grid coordinates to world coordinates
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridZ - Grid Z coordinate
     * @returns {import('../../types/interfaces.js').Position} World position
     */
    gridToWorld(gridX, gridZ) {
        return {
            x: gridX * this.tileSize,
            z: gridZ * this.tileSize  // TEMPORARILY REVERTED - Testing if this fixes camera position
        };
    }

    /**
     * Convert world coordinates to grid coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldZ - World Z coordinate
     * @returns {import('../../types/interfaces.js').Position} Grid position
     */
    worldToGrid(worldX, worldZ) {
        return {
            x: Math.floor(worldX / this.tileSize),
            z: Math.floor(worldZ / this.tileSize)  // TEMPORARILY REVERTED - Testing if this fixes camera position
        };
    }

    /**
     * Set tile data at specified grid coordinates
     * @param {number} x - Grid X coordinate
     * @param {number} z - Grid Z coordinate
     * @param {import('../../types/interfaces.js').TileData} tileData - Tile data to set
     */
    setTile(x, z, tileData) {
        if (!this.isValidPosition(x, z)) {
            console.warn(`GridSystem: Attempted to set tile at invalid position (${x}, ${z})`);
            return;
        }
        
        const key = this.getKey(x, z);
        this.tiles.set(key, { ...tileData });
    }

    /**
     * Get tile data at specified grid coordinates
     * @param {number} x - Grid X coordinate
     * @param {number} z - Grid Z coordinate
     * @returns {import('../../types/interfaces.js').TileData|null} Tile data or null if not found
     */
    getTile(x, z) {
        const key = this.getKey(x, z);
        return this.tiles.get(key) || null;
    }

    /**
     * Check if position is within grid boundaries
     * @param {number} x - Grid X coordinate
     * @param {number} z - Grid Z coordinate
     * @returns {boolean} True if position is valid
     */
    isValidPosition(x, z) {
        return x >= 0 && x < this.width && z >= 0 && z < this.height;
    }

    /**
     * Get adjacent tiles (north, east, south, west)
     * @param {number} x - Grid X coordinate
     * @param {number} z - Grid Z coordinate
     * @returns {Array<{position: import('../../types/interfaces.js').Position, tile: import('../../types/interfaces.js').TileData|null}>} Array of adjacent tiles with their positions
     */
    getAdjacentTiles(x, z) {
        const adjacent = [];
        const directions = [
            { x: 0, z: -1 }, // North
            { x: 1, z: 0 },  // East
            { x: 0, z: 1 },  // South
            { x: -1, z: 0 }  // West
        ];

        for (const dir of directions) {
            const adjX = x + dir.x;
            const adjZ = z + dir.z;
            const position = { x: adjX, z: adjZ };
            const tile = this.isValidPosition(adjX, adjZ) ? this.getTile(adjX, adjZ) : null;
            
            adjacent.push({ position, tile });
        }

        return adjacent;
    }

    /**
     * Check if a tile is walkable
     * @param {number} x - Grid X coordinate
     * @param {number} z - Grid Z coordinate
     * @returns {boolean} True if tile is walkable
     */
    isWalkable(x, z) {
        if (!this.isValidPosition(x, z)) {
            return false;
        }
        
        const tile = this.getTile(x, z);
        return tile ? tile.walkable : false;
    }

    /**
     * Get all tiles of a specific type
     * @param {'floor'|'wall'|'door'|'transition'|'empty'} type - Tile type to search for
     * @returns {Array<{position: import('../../types/interfaces.js').Position, tile: import('../../types/interfaces.js').TileData}>} Array of matching tiles with positions
     */
    getTilesByType(type) {
        const matchingTiles = [];
        
        for (let x = 0; x < this.width; x++) {
            for (let z = 0; z < this.height; z++) {
                const tile = this.getTile(x, z);
                if (tile && tile.type === type) {
                    matchingTiles.push({
                        position: { x, z },
                        tile
                    });
                }
            }
        }
        
        return matchingTiles;
    }

    /**
     * Clear all tiles and reset to empty
     */
    clear() {
        this.tiles.clear();
        this.initializeGrid();
    }

    /**
     * Get grid dimensions
     * @returns {{width: number, height: number}} Grid dimensions
     */
    getDimensions() {
        return {
            width: this.width,
            height: this.height
        };
    }

    /**
     * Resize the grid (clears existing data)
     * @param {number} width - New width in tiles
     * @param {number} height - New height in tiles
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.tiles.clear();
        this.initializeGrid();
    }

    /**
     * Get tile size in world units
     * @returns {number} Tile size in meters
     */
    getTileSize() {
        return this.tileSize;
    }

    /**
     * Check if two positions are adjacent (including diagonals)
     * @param {number} x1 - First position X
     * @param {number} z1 - First position Z
     * @param {number} x2 - Second position X
     * @param {number} z2 - Second position Z
     * @returns {boolean} True if positions are adjacent
     */
    areAdjacent(x1, z1, x2, z2) {
        const dx = Math.abs(x1 - x2);
        const dz = Math.abs(z1 - z2);
        return (dx <= 1 && dz <= 1) && !(dx === 0 && dz === 0);
    }

    /**
     * Calculate Manhattan distance between two grid positions
     * @param {number} x1 - First position X
     * @param {number} z1 - First position Z
     * @param {number} x2 - Second position X
     * @param {number} z2 - Second position Z
     * @returns {number} Manhattan distance
     */
    getManhattanDistance(x1, z1, x2, z2) {
        return Math.abs(x1 - x2) + Math.abs(z1 - z2);
    }
}