/**
 * @fileoverview Grid system for managing discrete coordinate system and tile data
 */

import { Dir } from './Direction.js';

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

        // MazeZones: array of { id, xpMultiplier, tiles: [[x1,z1],[x2,z2]] (bounding box corners) }
        this.zones = [];

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
                    walkable: false,
                    explored: false
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

    setZones(zones) {
        this.zones = Array.isArray(zones) ? zones : [];
    }

    getZoneMultiplier(x, z) {
        for (const zone of this.zones) {
            if (!zone.tiles || zone.tiles.length < 2) continue;
            const [[x1, z1], [x2, z2]] = zone.tiles;
            if (x >= Math.min(x1, x2) && x <= Math.max(x1, x2) &&
                z >= Math.min(z1, z2) && z <= Math.max(z1, z2)) {
                return zone.xpMultiplier ?? 1;
            }
        }
        return 1;
    }

    setTileExplored(x, z) {
        const offsets = [[0,0],[0,-1],[0,1],[-1,0],[1,0]];
        for (const [dx, dz] of offsets) {
            const tile = this.getTile(x + dx, z + dz);
            if (tile) tile.explored = true;
        }
    }

    // Feature #23: Ground items with sub-positions (NW/NE/SW/SE)
    // Sub-slots: 0=NW, 1=NE, 2=SW, 3=SE (matching LoL JS mapPosition)
    static GROUND_SLOTS = ['NW', 'NE', 'SW', 'SE'];

    /**
     * Add an item to a tile's ground slots.
     * Returns the slot index used, or -1 if tile is full.
     */
    addGroundItem(x, z, item) {
        const tile = this.getTile(x, z);
        if (!tile) return -1;
        if (!tile.groundItems) tile.groundItems = [null, null, null, null];
        const slot = tile.groundItems.indexOf(null);
        if (slot === -1) return -1;
        tile.groundItems[slot] = { ...item, subPos: GridSystem.GROUND_SLOTS[slot] };
        return slot;
    }

    /**
     * Remove ground item from tile by slot index.
     */
    removeGroundItem(x, z, slot) {
        const tile = this.getTile(x, z);
        if (!tile?.groundItems) return null;
        const item = tile.groundItems[slot] ?? null;
        if (item) tile.groundItems[slot] = null;
        return item;
    }

    /**
     * Get all non-null ground items on a tile.
     */
    getGroundItems(x, z) {
        const tile = this.getTile(x, z);
        return (tile?.groundItems ?? []).filter(Boolean);
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
        for (let i = 0; i < 4; i++) {
            const dir = Dir.delta(i);
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