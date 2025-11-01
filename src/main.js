/**
 * Main entry point for the Dungeon Crawler Engine
 * Sets up the core systems and initializes the game
 */

// Import core engine components
import { GridSystem } from './engine/core/GridSystem.js';
import { Renderer } from './engine/core/Renderer.js';
import { InputManager } from './engine/managers/InputManager.js';
import { MovementController } from './engine/managers/MovementController.js';
import { GameLoopManager } from './engine/managers/GameLoopManager.js';
import { CollisionSystem } from './engine/systems/CollisionSystem.js';
import { DoorSystem } from './engine/systems/DoorSystem.js';
import { TransitionSystem } from './engine/systems/TransitionSystem.js';
import { DungeonLoader } from './engine/loaders/DungeonLoader.js';
import { GeometryFactory } from './engine/utils/GeometryFactory.js';
import { DebugUI } from './engine/ui/DebugUI.js';
import { PerformanceManager } from './engine/performance/PerformanceManager.js';

// Import performance systems
import { PerformanceOptimizer } from './engine/performance/PerformanceOptimizer.js';
import { MemoryManager } from './engine/performance/MemoryManager.js';
import { PerformanceTester } from './engine/performance/PerformanceTester.js';

// Import game systems
import { CombatSystem } from './engine/combat/CombatSystem.js';
import { PartyManager } from './engine/character/PartyManager.js';
import { SaveSystem } from './engine/save/SaveSystem.js';
import { shopSystem } from './engine/shop/ShopSystem.js';
import { lootSystem } from './engine/loot/LootSystem.js';
import { InventorySystem } from './engine/inventory/InventorySystem.js';
import { itemDatabase } from './engine/inventory/ItemDatabase.js';
import { enemyDatabase } from './engine/data/EnemyDatabase.js';

/**
 * Main Game Engine Class
 */
class DungeonCrawlerEngine {
  constructor() {
    // Core systems
    this.gridSystem = null;
    this.renderer = null;
    this.inputManager = null;
    this.movementController = null;
    this.gameLoopManager = null;
    this.collisionSystem = null;
    this.doorSystem = null;
    this.transitionSystem = null;
    this.dungeonLoader = null;
    this.geometryFactory = null;
    this.debugUI = null;
    this.performanceManager = null;
    
    // Performance systems
    this.performanceOptimizer = null;
    this.memoryManager = null;
    this.performanceTester = null;
    
    // Game systems
    this.combatSystem = null;
    this.partyManager = null;
    this.saveSystem = null;
    this.shopSystem = shopSystem;
    this.lootSystem = lootSystem;
    this.inventorySystem = null;
    this.itemDatabase = itemDatabase;
    this.enemyDatabase = enemyDatabase;
    
    // Game state
    this.isInitialized = false;
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.animationFrameId = null;
    
    // Performance tracking
    this.frameCount = 0;
    this.fps = 60;
    this.targetFPS = 60;
    this.frameTimeHistory = [];
    this.maxFrameTimeHistory = 60; // Keep last 60 frames for averaging
    this.performanceMetrics = {
      averageFPS: 60,
      minFPS: 60,
      maxFPS: 60,
      averageFrameTime: 16.67, // milliseconds
      maxFrameTime: 16.67,
      totalFrames: 0,
      droppedFrames: 0
    };
    
    // System status tracking
    this.systemStatus = {
      memoryUsage: 0,
      loadTime: 0,
      activeAnimations: 0,
      lastMemoryCheck: 0
    };
  }

  /**
   * Initialize the game engine
   */
  async initialize() {
    try {
      console.log('Initializing Dungeon Crawler Engine...');
      
      // Initialize core systems
      this.initializeSystems();
      
      // Initialize debug UI
      this.debugUI = new DebugUI();
      if (!this.debugUI.initialize()) {
        throw new Error('Failed to initialize debug UI');
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('Engine initialized successfully');
      
      // Initialize performance manager
      await this.performanceManager.initialize({
        enableInstancing: true,
        enableMemoryManagement: true,
        enableBenchmarking: true,
        enableFrustumCulling: true,
        autoOptimize: true
      });
      
      // Initialize performance systems
      this.performanceOptimizer.startMonitoring();
      this.memoryManager.startMonitoring();
      await this.performanceTester.initialize();
      
      // Load initial test level automatically - start with 10x10 test room
      await this.loadInitialTestLevel();
      
      // Initialize game loop manager after level is loaded
      if (this.gameLoopManager) {
        await this.gameLoopManager.initialize();
      }
      
      // Log initial player state for debugging
      const playerPos = this.movementController.getPosition();
      const playerDir = this.movementController.getDirection();
      console.log(`Player initialized at (${playerPos.x}, ${playerPos.z}) facing direction ${playerDir}`);
      
      // Debug: Show surrounding tiles
      this.debugSurroundingTiles(playerPos.x, playerPos.z);
      
      // Initialize minimap
      setTimeout(() => {
        this.initializeMinimap();
      }, 1000); // Delay to ensure DOM is ready
      
      // Add debug key for real-time diagnostics
      window.addEventListener('keydown', (event) => {
        if (event.code === 'KeyI') { // I key for info
          this.debugCurrentState();
        }
        if (event.code === 'KeyM') { // M key for minimap test
          this.testMinimap();
        }
        if (event.code === 'KeyP') { // P key for complete diagnosis
          this.fullDiagnosis();
        }
        if (event.code === 'KeyF') { // F key for performance stats
          this.showPerformanceStats();
        }
        if (event.code === 'KeyT') { // T key for extended session test
          this.runExtendedSessionTest();
        }
        if (event.code === 'KeyL') { // L key for loading next test level
          this.loadTestLevel();
        }
        if (event.code === 'KeyC') { // C key for combat performance test
          this.runCombatPerformanceTest();
        }
        if (event.code === 'KeyS') { // S key for save/load performance test
          this.runSaveLoadPerformanceTest();
        }
        if (event.code === 'KeyR') { // R key for performance report
          this.showPerformanceReport();
        }
      });
      
      // Show ready message
      this.debugUI.showSuccess('Engine Ready - Use WASD to move, Space to interact');
      
    } catch (error) {
      console.error('Failed to initialize engine:', error);
      if (this.debugUI) {
        this.debugUI.showError('Failed to initialize engine', { system: 'Engine' });
      }
    }
  }

  /**
   * Initialize core game systems
   */
  initializeSystems() {
    // Get canvas element
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    
    // Create core systems
    this.gridSystem = new GridSystem();
    this.renderer = new Renderer(canvas);
    this.inputManager = new InputManager();
    this.geometryFactory = new GeometryFactory();
    this.doorSystem = new DoorSystem(this.gridSystem, this.renderer);
    this.collisionSystem = new CollisionSystem(this.gridSystem, this.doorSystem);
    this.movementController = new MovementController(this.gridSystem, this.collisionSystem, this.renderer);
    this.dungeonLoader = new DungeonLoader(this.gridSystem, this.doorSystem, this.renderer, this.geometryFactory);
    this.transitionSystem = new TransitionSystem(this.dungeonLoader, this.movementController, this.inputManager);
    
    // Initialize performance manager
    this.performanceManager = new PerformanceManager(this.renderer, this.renderer.getCamera());
    
    // Initialize performance systems
    this.performanceOptimizer = new PerformanceOptimizer();
    this.memoryManager = new MemoryManager();
    this.performanceTester = new PerformanceTester(this);
    
    // Initialize game systems
    this.combatSystem = new CombatSystem();
    this.partyManager = new PartyManager();
    this.saveSystem = new SaveSystem();
    this.inventorySystem = new InventorySystem(40);
    
    // Initialize game loop manager
    this.gameLoopManager = new GameLoopManager(this);
    
    // Initialize camera position based on movement controller
    const initialWorldPos = this.movementController.getCurrentWorldPosition();
    const initialRotation = this.movementController.getCurrentRotation();
    this.renderer.updateCameraPosition(initialWorldPos);
    this.renderer.updateCameraRotation(initialRotation);
    
    console.log('Core systems initialized');
  }



  /**
   * Track system memory usage and performance
   */
  updateSystemStatus() {
    const now = performance.now();
    
    // Check memory usage every 5 seconds
    if (now - this.systemStatus.lastMemoryCheck > 5000) {
      if (performance.memory) {
        this.systemStatus.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
      }
      this.systemStatus.lastMemoryCheck = now;
    }
    
    // Count active animations
    this.systemStatus.activeAnimations = 0;
    if (this.movementController && this.movementController.getIsAnimating()) {
      this.systemStatus.activeAnimations++;
    }
    if (this.doorSystem && this.doorSystem.hasActiveAnimations) {
      this.systemStatus.activeAnimations += this.doorSystem.getActiveAnimationCount();
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    
    // Handle visibility change (pause when tab not active)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
    
    // Movement and collision events
    window.addEventListener('movementBlocked', (event) => {
      this.handleMovementBlocked(event.detail);
    });
    
    window.addEventListener('doorOpened', (event) => {
      this.handleDoorOpened(event.detail);
    });
    
    window.addEventListener('levelTransition', (event) => {
      this.handleLevelTransition(event.detail);
    });
    
    window.addEventListener('transitionError', (event) => {
      this.handleTransitionError(event.detail);
    });
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (this.renderer) {
      this.renderer.handleResize();
    }
  }

  /**
   * Start the game loop with proper initialization
   */
  start() {
    if (!this.isInitialized) {
      console.error('Engine not initialized');
      return;
    }
    
    if (this.isRunning) {
      console.warn('Game loop already running');
      return;
    }
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    
    // Reset performance metrics
    this.resetPerformanceMetrics();
    
    // Start the game loop
    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
    
    console.log('Game loop started - targeting 60fps');
  }

  /**
   * Pause the game loop
   */
  pause() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Cancel the animation frame to stop the loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    console.log('Game loop paused');
  }

  /**
   * Resume the game loop
   */
  resume() {
    if (this.isInitialized && !this.isRunning) {
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
      console.log('Game loop resumed');
    }
  }
  
  /**
   * Stop the game loop completely
   */
  stop() {
    this.pause();
    this.isInitialized = false;
    console.log('Game loop stopped');
  }

  /**
   * Main game loop with enhanced performance tracking
   */
  gameLoop(currentTime) {
    if (!this.isRunning) return;
    
    // Calculate delta time in seconds for consistent timing
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;
    
    // Cap delta time to prevent large jumps (e.g., when tab becomes active)
    const cappedDeltaTime = Math.min(deltaTime, 1/30); // Max 30fps minimum
    
    // Performance tracking - start frame timing
    const frameStartTime = performance.now();
    
    // Update all game systems
    this.update(cappedDeltaTime);
    
    // Render the scene
    this.render();
    
    // Performance tracking - end frame timing
    const frameEndTime = performance.now();
    const frameTime = frameEndTime - frameStartTime;
    
    // Update performance metrics
    this.updatePerformanceMetrics(deltaTime, frameTime);
    
    // Continue the game loop
    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  /**
   * Update all game systems with coordinated timing
   */
  update(deltaTime) {
    // Convert deltaTime to milliseconds for systems that expect it
    const deltaTimeMs = deltaTime * 1000;
    
    // Process input actions (non-blocking)
    this.processInput();
    
    // Update movement controller with animation interpolation
    if (this.movementController) {
      this.movementController.update(deltaTimeMs);
    }
    
    // Update door system animations
    if (this.doorSystem) {
      this.doorSystem.update(deltaTimeMs);
    }
    
    // Note: TransitionSystem doesn't need frame-by-frame updates
    // It uses promise-based async operations for transitions
    
    // Update performance manager
    if (this.performanceManager) {
      this.performanceManager.update(performance.now(), this.frameCount);
    }
    
    // Update system status and debug UI
    this.updateSystemStatus();
    this.updateDebugUI();
  }

  /**
   * Process input actions from the input manager
   */
  processInput() {
    if (!this.inputManager || !this.movementController) return;
    
    // Skip input processing if movement is animating
    if (this.movementController.getIsAnimating()) {
      this.inputManager.blockInput();
      return;
    } else {
      this.inputManager.unblockInput();
    }
    
    // Get next action from input queue
    const action = this.inputManager.getNextAction();
    if (!action) return;
    
    // Process the action (don't await here to avoid blocking the game loop)
    this.handleInputAction(action).catch(error => {
      console.error('Error handling input action:', error);
    });
  }

  /**
   * Handle a specific input action
   * @param {InputAction} action - The action to handle
   */
  async handleInputAction(action) {
    if (!this.movementController) return;
    
    switch (action.type) {
      case 'forward':
        await this.movementController.moveForward();
        break;
      case 'backward':
        await this.movementController.moveBackward();
        break;
      case 'strafeLeft':
        await this.movementController.strafeLeft();
        break;
      case 'strafeRight':
        await this.movementController.strafeRight();
        break;
      case 'turnLeft':
        await this.movementController.turnLeft();
        break;
      case 'turnRight':
        await this.movementController.turnRight();
        break;
      case 'interact':
        this.performInteraction();
        break;
      case 'loadTest':
        await this.loadTestLevel();
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  }



  /**
   * Perform interaction (Space key) - Handle door interactions per requirement 4.4
   */
  async performInteraction() {
    if (!this.movementController || !this.doorSystem || !this.collisionSystem) {
      this.debugUI.showWarning('Systems not ready for interaction');
      return;
    }

    const position = this.movementController.getPosition();
    const direction = this.movementController.getDirection();
    const directionNames = ['North', 'East', 'South', 'West'];
    
    console.log(`=== INTERACTION DEBUG ===`);
    console.log(`Player at (${position.x}, ${position.z}) facing ${directionNames[direction]}`);
    
    // Calculate the tile the player is facing - USING SAME LOGIC AS MOVEMENT
    const directions = [
      {x: 0, z: -1}, // North
      {x: 1, z: 0},  // East
      {x: 0, z: 1},  // South
      {x: -1, z: 0}  // West
    ];
    
    const dir = directions[direction];
    const targetX = position.x + dir.x;
    const targetZ = position.z + dir.z;
    
    console.log(`Looking for interaction at (${targetX}, ${targetZ})`);
    
    // Check if there's a door at the target position
    const tile = this.gridSystem.getTile(targetX, targetZ);
    console.log(`Tile at target position:`, tile);
    
    if (!tile || tile.type !== 'door') {
      console.log(`No door found. Tile type: ${tile ? tile.type : 'undefined'}`);
      this.debugUI.showToast('Nothing to interact with');
      return;
    }

    // Get player's keys (for now, simulate having no keys - this will be enhanced later)
    const playerKeys = this.collisionSystem.playerKeys || [];
    
    try {
      // Handle door interaction
      const result = await this.doorSystem.handleDoorInteraction(targetX, targetZ, playerKeys);
      
      if (result.success) {
        this.debugUI.showSuccess(result.message);
        
        // If door was unlocked with a key, could remove key from inventory here
        if (result.action === 'unlock_and_open' && result.keyUsed) {
          console.log(`Used ${result.keyUsed} key to unlock door`);
        }
      } else {
        this.debugUI.showWarning(result.message);
      }
      
    } catch (error) {
      console.error('Error during door interaction:', error);
      this.debugUI.showError('Failed to interact with door', { system: 'DoorSystem' });
    }
  }

  /**
   * Load initial test level - starts with 10x10 room
   */
  async loadInitialTestLevel() {
    try {
      console.log('Loading initial 10x10 test room...');
      
      // Load the new 10x10 test room by default
      await this.dungeonLoader.loadLevelFromFile('./levels/test-room-10x10.json');
      
      // Verify level was loaded
      if (!this.dungeonLoader.isLevelLoaded()) {
        throw new Error('Initial test level failed to load properly');
      }
      
      // Initialize performance optimizations for the level
      if (this.performanceManager) {
        this.performanceManager.initializeLevelOptimizations(this.dungeonLoader.getCurrentLevel());
      }
      
      // Set up player spawn position and camera
      this.dungeonLoader.setupPlayerSpawn(this.movementController);
      
      // Show level statistics
      const stats = this.dungeonLoader.getLevelStats();
      console.log('Initial test level loaded successfully:', stats);
      
      // Initialize test level index for cycling
      this.currentTestLevelIndex = 1; // Start at index 1 since we loaded index 0
      
      this.debugUI.showSuccess(`Level "${stats.id}" loaded (${stats.dimensions}) - Press L to cycle levels`);
      
    } catch (error) {
      console.error('Failed to load initial test level:', error);
      this.debugUI.showError(`Failed to load initial test level: ${error.message}`, { system: 'DungeonLoader' });
    }
  }

  /**
   * Load test level for collision system verification
   */
  async loadTestLevel() {
    try {
      console.log('Loading test level...');
      
      // Cycle through different test levels for comprehensive testing
      const testLevels = [
        './levels/test-room-10x10.json',
        './levels/multi-room-20x20.json',
        './levels/test-collision.json'
      ];
      
      // Get current level index or start with first level
      if (this.currentTestLevelIndex === undefined) {
        this.currentTestLevelIndex = 0;
      }
      
      const levelPath = testLevels[this.currentTestLevelIndex];
      console.log(`Loading test level: ${levelPath}`);
      
      // Use the enhanced DungeonLoader to load from file
      await this.dungeonLoader.loadLevelFromFile(levelPath);
      
      // Verify level was loaded
      if (!this.dungeonLoader.isLevelLoaded()) {
        throw new Error('Test level failed to load properly');
      }
      
      // Initialize performance optimizations for the level
      if (this.performanceManager) {
        this.performanceManager.cleanupLevelOptimizations();
        this.performanceManager.initializeLevelOptimizations(this.dungeonLoader.getCurrentLevel());
      }
      
      // Set up player spawn position and camera
      this.dungeonLoader.setupPlayerSpawn(this.movementController);
      
      // Show level statistics
      const stats = this.dungeonLoader.getLevelStats();
      console.log('Test level loaded successfully:', stats);
      
      // Verify grid has tiles
      const playerPos = this.movementController.getPosition();
      const currentTile = this.gridSystem.getTile(playerPos.x, playerPos.z);
      console.log(`Player at (${playerPos.x}, ${playerPos.z}), tile:`, currentTile);
      
      // Test complete movement flow from input to rendering
      this.testMovementFlow();
      
      // Test edge cases
      this.testEdgeCases();
      
      this.debugUI.showSuccess(`Level "${stats.id}" loaded (${stats.dimensions}) - Press L to cycle levels`);
      
      // Move to next level for next load
      this.currentTestLevelIndex = (this.currentTestLevelIndex + 1) % testLevels.length;
      
    } catch (error) {
      console.error('Failed to load test level:', error);
      this.debugUI.showError(`Failed to load test level: ${error.message}`, { system: 'DungeonLoader' });
    }
  }

  /**
   * Render the scene with Three.js integration
   */
  render() {
    if (!this.renderer) return;
    
    // Update camera position and rotation from movement controller
    if (this.movementController) {
      const worldPos = this.movementController.getCurrentWorldPosition();
      const rotation = this.movementController.getCurrentRotation();
      
      // Only update camera if position or rotation changed
      this.renderer.updateCameraPosition(worldPos);
      this.renderer.updateCameraRotation(rotation);
    }
    
    // Render the Three.js scene
    this.renderer.render();
  }

  /**
   * Update debug UI with current game state
   */
  updateDebugUI() {
    if (!this.debugUI || !this.movementController) return;
    
    const position = this.movementController.getPosition();
    const direction = this.movementController.getDirection();
    const rotation = this.movementController.getCurrentRotation();
    const currentTile = this.gridSystem ? this.gridSystem.getTile(position.x, position.z) : null;
    
    // Prepare game state for debug UI
    const gameState = {
      position: position,
      direction: direction,
      rotation: rotation,
      currentTile: currentTile
    };
    
    // Update debug UI
    this.debugUI.update(gameState);
    
    // Update minimap
    this.updateMinimap();
  }

  /**
   * Initialize minimap
   */
  initializeMinimap() {
    console.log('Initializing minimap...');
    const minimapGrid = document.getElementById('minimap-grid');
    if (!minimapGrid) {
      console.error('Minimap grid element not found!');
      return;
    }
    
    console.log('Minimap grid found, creating cells...');
    
    // Clear existing grid
    minimapGrid.innerHTML = '';
    
    // Get current level dimensions
    const currentLevel = this.dungeonLoader ? this.dungeonLoader.getCurrentLevel() : null;
    const width = currentLevel ? currentLevel.width : 5;
    const height = currentLevel ? currentLevel.height : 5;
    
    console.log(`Creating ${width}x${height} minimap grid`);
    
    // Update CSS grid template
    minimapGrid.style.gridTemplateColumns = `repeat(${width}, 20px)`;
    minimapGrid.style.gridTemplateRows = `repeat(${height}, 20px)`;
    
    // Create grid based on actual level size
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const cell = document.createElement('div');
        cell.className = 'minimap-cell';
        cell.id = `minimap-${x}-${z}`;
        minimapGrid.appendChild(cell);
      }
    }
    
    console.log('Minimap cells created, updating tiles...');
    
    // Update minimap with level data
    this.updateMinimapTiles();
    
    console.log('Minimap initialization complete');
  }

  /**
   * Update minimap tiles based on level data
   */
  updateMinimapTiles() {
    if (!this.gridSystem) {
      console.log('No grid system available for minimap');
      return;
    }
    
    console.log('Updating minimap tiles...');
    
    // Get current level dimensions
    const currentLevel = this.dungeonLoader ? this.dungeonLoader.getCurrentLevel() : null;
    const width = currentLevel ? currentLevel.width : 5;
    const height = currentLevel ? currentLevel.height : 5;
    
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const cell = document.getElementById(`minimap-${x}-${z}`);
        if (!cell) {
          console.log(`Cell not found: minimap-${x}-${z}`);
          continue;
        }
        
        const tile = this.gridSystem.getTile(x, z);
        if (!tile) {
          console.log(`No tile data at (${x}, ${z})`);
          continue;
        }
        
        // Reset classes
        cell.className = 'minimap-cell';
        
        // Set tile type
        switch (tile.type) {
          case 'wall':
            cell.classList.add('wall');
            cell.textContent = '■';
            break;
          case 'floor':
            cell.classList.add('floor');
            cell.textContent = '·';
            break;
          case 'door':
            cell.classList.add('door');
            cell.textContent = 'D';
            break;
          case 'transition':
            cell.classList.add('floor');
            cell.textContent = 'T';
            break;
          default:
            cell.classList.add('wall');
            cell.textContent = '?';
        }
      }
    }
    
    console.log('Minimap tiles updated');
  }

  /**
   * Update minimap with player position and direction
   */
  updateMinimap() {
    if (!this.movementController) return;
    
    const position = this.movementController.getPosition();
    const direction = this.movementController.getDirection();
    const directionNames = ['north', 'east', 'south', 'west'];
    
    // Get current level dimensions
    const currentLevel = this.dungeonLoader ? this.dungeonLoader.getCurrentLevel() : null;
    const width = currentLevel ? currentLevel.width : 5;
    const height = currentLevel ? currentLevel.height : 5;
    
    // Clear all player markers
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const cell = document.getElementById(`minimap-${x}-${z}`);
        if (cell) {
          cell.classList.remove('player', 'north', 'east', 'south', 'west');
          // Restore original tile content
          const tile = this.gridSystem.getTile(x, z);
          if (tile) {
            switch (tile.type) {
              case 'wall': cell.textContent = '■'; break;
              case 'floor': cell.textContent = '·'; break;
              case 'door': cell.textContent = 'D'; break;
              case 'transition': cell.textContent = 'T'; break;
              default: cell.textContent = '?'; break;
            }
          }
        }
      }
    }
    
    // Set current player position with directional arrow
    const playerCell = document.getElementById(`minimap-${position.x}-${position.z}`);
    if (playerCell) {
      playerCell.classList.add('player', directionNames[direction]);
      
      // Use directional arrows instead of 'P'
      const arrows = ['↑', '→', '↓', '←']; // N, E, S, W
      playerCell.textContent = arrows[direction];
    }
  }

  /**
   * Update performance metrics and FPS tracking
   */
  updatePerformanceMetrics(deltaTime, frameTime) {
    this.frameCount++;
    this.performanceMetrics.totalFrames++;
    
    // Calculate current FPS
    const currentFPS = deltaTime > 0 ? 1 / deltaTime : 60;
    
    // Track frame time history for averaging
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.maxFrameTimeHistory) {
      this.frameTimeHistory.shift();
    }
    
    // Update performance metrics
    this.performanceMetrics.averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    this.performanceMetrics.maxFrameTime = Math.max(this.performanceMetrics.maxFrameTime, frameTime);
    
    // Update FPS metrics
    this.fps = this.fps * 0.9 + currentFPS * 0.1; // Smoothed FPS
    this.performanceMetrics.averageFPS = this.fps;
    this.performanceMetrics.minFPS = Math.min(this.performanceMetrics.minFPS, currentFPS);
    this.performanceMetrics.maxFPS = Math.max(this.performanceMetrics.maxFPS, currentFPS);
    
    // Track dropped frames (frames that took longer than target)
    const targetFrameTime = 1000 / this.targetFPS;
    if (frameTime > targetFrameTime * 1.5) {
      this.performanceMetrics.droppedFrames++;
    }
    
    // Update FPS display every 30 frames for smoother updates
    if (this.frameCount % 30 === 0) {
      this.updateFPSDisplay();
    }
  }
  
  /**
   * Update FPS display in debug UI
   */
  updateFPSDisplay() {
    if (this.debugUI) {
      const performanceData = {
        currentFPS: this.fps,
        averageFrameTime: this.performanceMetrics.averageFrameTime,
        ...this.performanceMetrics
      };
      
      this.debugUI.updatePerformance(performanceData);
    }
  }
  
  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics() {
    this.frameCount = 0;
    this.frameTimeHistory = [];
    this.performanceMetrics = {
      averageFPS: 60,
      minFPS: 60,
      maxFPS: 60,
      averageFrameTime: 16.67,
      maxFrameTime: 16.67,
      totalFrames: 0,
      droppedFrames: 0
    };
    console.log('Performance metrics reset');
  }
  
  /**
   * Get current performance statistics
   */
  getPerformanceStats() {
    return {
      ...this.performanceMetrics,
      currentFPS: Math.round(this.fps),
      frameTimeHistory: [...this.frameTimeHistory],
      isRunning: this.isRunning,
      targetFPS: this.targetFPS
    };
  }

  /**
   * Handle movement blocked events
   */
  handleMovementBlocked(detail) {
    const { reason, message } = detail;
    
    // Show appropriate feedback based on reason
    switch (reason) {
      case 'wall':
        this.debugUI.showWarning('Cannot walk through walls');
        break;
      case 'door_locked':
        this.debugUI.showWarning(message);
        break;
      case 'out_of_bounds':
        this.debugUI.showWarning('Cannot leave the dungeon');
        break;
      case 'corner_blocked_both':
      case 'corner_blocked_partial':
        this.debugUI.showWarning('Path is blocked');
        break;
      default:
        this.debugUI.showWarning(message || 'Movement blocked');
    }
  }

  /**
   * Handle door opened events
   */
  handleDoorOpened(detail) {
    this.debugUI.showSuccess('Door opened');
  }

  /**
   * Handle level transition events
   */
  async handleLevelTransition(detail) {
    const { transitionData } = detail;
    
    if (!transitionData || !transitionData.targetLevel) {
      this.debugUI.showWarning('Invalid transition data');
      return;
    }
    
    if (!this.transitionSystem) {
      this.debugUI.showError('Transition system not available');
      return;
    }
    
    try {
      this.debugUI.showToast(`Transitioning to ${transitionData.targetLevel}...`, 'info');
      
      // Start the transition with fade effects
      const success = await this.transitionSystem.startTransition(transitionData);
      
      if (success) {
        this.debugUI.showSuccess(`Level "${transitionData.targetLevel}" loaded`);
        // Reinitialize minimap for new level
        setTimeout(() => {
          this.initializeMinimap();
        }, 100);
      } else {
        this.debugUI.showError('Level transition failed');
      }
      
    } catch (error) {
      console.error('Level transition error:', error);
      this.debugUI.showError('Level transition failed', { system: 'TransitionSystem' });
    }
  }

  /**
   * Handle transition error events
   */
  handleTransitionError(detail) {
    const { message } = detail;
    this.debugUI.showError(`Transition Error: ${message}`, { system: 'TransitionSystem' });
  }

  /**
   * Debug function to show surrounding tiles
   */
  debugSurroundingTiles(centerX, centerZ) {
    console.log('=== Surrounding Tiles Debug ===');
    for (let z = centerZ - 1; z <= centerZ + 1; z++) {
      let row = '';
      for (let x = centerX - 1; x <= centerX + 1; x++) {
        const tile = this.gridSystem.getTile(x, z);
        if (x === centerX && z === centerZ) {
          row += '[P]'; // Player position
        } else if (tile) {
          row += `[${tile.type.charAt(0).toUpperCase()}]`; // First letter of tile type
        } else {
          row += '[?]'; // Unknown
        }
      }
      console.log(`z=${z}: ${row}`);
    }
    console.log('===============================');
  }

  /**
   * Debug current game state (press I key)
   */
  debugCurrentState() {
    if (!this.movementController) return;
    
    const pos = this.movementController.getPosition();
    const dir = this.movementController.getDirection();
    const dirNames = ['North', 'East', 'South', 'West'];
    const rotation = this.movementController.getCurrentRotation();
    
    console.log('=== CURRENT STATE DEBUG ===');
    console.log(`Player Position: (${pos.x}, ${pos.z})`);
    console.log(`Player Direction: ${dir} (${dirNames[dir]})`);
    console.log(`Camera Rotation: ${rotation} radians (${rotation * 180 / Math.PI} degrees)`);
    
    // Show what's in each direction from current position
    const directions = [
      {name: 'North', dx: 0, dz: -1},
      {name: 'East', dx: 1, dz: 0},
      {name: 'South', dx: 0, dz: 1},
      {name: 'West', dx: -1, dz: 0}
    ];
    
    console.log('Tiles in each direction:');
    directions.forEach(({name, dx, dz}) => {
      const tile = this.gridSystem.getTile(pos.x + dx, pos.z + dz);
      console.log(`  ${name}: ${tile ? tile.type : 'undefined'} at (${pos.x + dx}, ${pos.z + dz})`);
    });
    
    console.log('==========================');
  }

  /**
   * Test minimap functionality (press M key)
   */
  testMinimap() {
    console.log('=== MINIMAP TEST ===');
    
    const minimapElement = document.getElementById('minimap');
    const minimapGrid = document.getElementById('minimap-grid');
    
    console.log('Minimap element:', minimapElement);
    console.log('Minimap grid:', minimapGrid);
    
    if (minimapGrid) {
      console.log('Grid children count:', minimapGrid.children.length);
      
      // Force create a simple test grid
      minimapGrid.innerHTML = '';
      for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'minimap-cell wall';
        cell.textContent = '■';
        cell.style.width = '20px';
        cell.style.height = '20px';
        cell.style.display = 'inline-block';
        cell.style.border = '1px solid #00ff00';
        cell.style.backgroundColor = '#666';
        cell.style.color = '#fff';
        minimapGrid.appendChild(cell);
      }
      
      console.log('Test grid created with', minimapGrid.children.length, 'cells');
    }
    
    console.log('==================');
  }

  /**
   * Complete system diagnosis (press P key)
   */
  fullDiagnosis() {
    console.log('=== COMPLETE SYSTEM DIAGNOSIS ===');
    
    const pos = this.movementController.getPosition();
    const dir = this.movementController.getDirection();
    const rotation = this.movementController.getCurrentRotation();
    
    console.log(`Current Position: (${pos.x}, ${pos.z})`);
    console.log(`Current Direction: ${dir} (${['North', 'East', 'South', 'West'][dir]})`);
    console.log(`Camera Rotation: ${rotation} radians (${rotation * 180 / Math.PI}°)`);
    
    // Test all movement calculations
    console.log('\n--- MOVEMENT CALCULATIONS ---');
    const forward = this.movementController.calculateForwardPosition();
    const backward = this.movementController.calculateBackwardPosition();
    const strafeL = this.movementController.calculateStrafeLeftPosition();
    const strafeR = this.movementController.calculateStrafeRightPosition();
    
    console.log(`Forward would go to: (${forward.x}, ${forward.z})`);
    console.log(`Backward would go to: (${backward.x}, ${backward.z})`);
    console.log(`Strafe Left would go to: (${strafeL.x}, ${strafeL.z})`);
    console.log(`Strafe Right would go to: (${strafeR.x}, ${strafeR.z})`);
    
    // Show what tiles are in each direction
    console.log('\n--- TILES IN EACH DIRECTION ---');
    const tiles = {
      forward: this.gridSystem.getTile(forward.x, forward.z),
      backward: this.gridSystem.getTile(backward.x, backward.z),
      strafeLeft: this.gridSystem.getTile(strafeL.x, strafeL.z),
      strafeRight: this.gridSystem.getTile(strafeR.x, strafeR.z)
    };
    
    console.log(`Forward tile: ${tiles.forward ? tiles.forward.type : 'undefined'}`);
    console.log(`Backward tile: ${tiles.backward ? tiles.backward.type : 'undefined'}`);
    console.log(`Strafe Left tile: ${tiles.strafeLeft ? tiles.strafeLeft.type : 'undefined'}`);
    console.log(`Strafe Right tile: ${tiles.strafeRight ? tiles.strafeRight.type : 'undefined'}`);
    
    console.log('================================');
  }
  
  /**
   * Show detailed performance statistics (press F key)
   */
  showPerformanceStats() {
    if (this.performanceManager) {
      const detailedReport = this.performanceManager.getDetailedReport();
      const metrics = this.performanceManager.getPerformanceMetrics();
      
      console.log('=== ENHANCED PERFORMANCE STATISTICS ===');
      console.log(`Current FPS: ${metrics.fps.toFixed(1)}`);
      console.log(`Frame Time: ${metrics.frameTime.toFixed(2)}ms`);
      console.log(`Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB`);
      console.log(`Render Calls: ${metrics.renderCalls}`);
      console.log(`Instanced Objects: ${metrics.instancedObjects}`);
      console.log(`Culled Objects: ${metrics.culledObjects}`);
      console.log(`Optimizations Applied: ${metrics.optimizationCount}`);
      console.log(`Performance Alerts: ${metrics.alerts}`);
      
      // Show benchmark details
      if (detailedReport.benchmark) {
        const bench = detailedReport.benchmark;
        console.log('\n--- Benchmark Details ---');
        console.log(`Average FPS: ${bench.fps.average.toFixed(1)}`);
        console.log(`Min FPS: ${bench.fps.min.toFixed(1)}`);
        console.log(`Max FPS: ${bench.fps.max.toFixed(1)}`);
        console.log(`Frame Time P95: ${bench.frameTime.p95.toFixed(2)}ms`);
        console.log(`Frame Time P99: ${bench.frameTime.p99.toFixed(2)}ms`);
      }
      
      // Show memory details
      if (detailedReport.memory) {
        const mem = detailedReport.memory;
        console.log('\n--- Memory Details ---');
        console.log(`Peak Memory: ${mem.peakMemoryUsage.toFixed(2)}MB`);
        console.log(`Undisposed Resources: ${mem.undisposedResources}`);
        console.log(`Queued for Disposal: ${mem.queuedForDisposal}`);
      }
      
      // Show culling details
      if (detailedReport.culling) {
        const cull = detailedReport.culling;
        console.log('\n--- Culling Details ---');
        console.log(`Total Objects: ${cull.totalObjects}`);
        console.log(`Visible Objects: ${cull.visibleObjects}`);
        console.log(`Culled Objects: ${cull.culledObjects}`);
        console.log(`Culling Ratio: ${(cull.cullingRatio * 100).toFixed(1)}%`);
        console.log(`Culling Time: ${cull.cullingTime.toFixed(2)}ms`);
      }
      
      console.log('=====================================');
      
      // Show in toast for user visibility
      this.debugUI.showToast(`FPS: ${metrics.fps.toFixed(1)} | Mem: ${metrics.memoryUsage.toFixed(1)}MB | Culled: ${metrics.culledObjects}`, 'info');
    } else {
      // Fallback to basic stats
      const stats = this.getPerformanceStats();
      console.log('=== BASIC PERFORMANCE STATISTICS ===');
      console.log(`Current FPS: ${stats.currentFPS}`);
      console.log(`Average FPS: ${stats.averageFPS.toFixed(1)}`);
      console.log(`Frame Time: ${stats.averageFrameTime.toFixed(2)}ms`);
      console.log('===================================');
      
      this.debugUI.showToast(`FPS: ${stats.currentFPS} | Frame: ${stats.averageFrameTime.toFixed(1)}ms`, 'info');
    }
  }

  /**
   * Run extended session test for memory leak detection (press T key)
   */
  async runExtendedSessionTest() {
    if (!this.performanceManager) {
      this.debugUI.showWarning('Performance manager not available');
      return;
    }
    
    this.debugUI.showToast('Starting extended session test (10 minutes)...', 'info');
    console.log('Starting extended session test...');
    
    try {
      const results = await this.performanceManager.runExtendedSessionTest(600000); // 10 minutes
      
      console.log('=== EXTENDED SESSION TEST RESULTS ===');
      console.log(`Duration: ${results.duration / 1000}s`);
      console.log(`Memory Snapshots: ${results.memorySnapshots.length}`);
      console.log(`Performance Snapshots: ${results.performanceSnapshots.length}`);
      console.log(`Leaks Detected: ${results.leaksDetected.length}`);
      console.log(`Recommendations: ${results.recommendations.length}`);
      
      if (results.recommendations.length > 0) {
        console.log('\n--- Recommendations ---');
        results.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.severity.toUpperCase()}] ${rec.message}`);
          if (rec.details) console.log(`   ${rec.details}`);
        });
      }
      
      console.log('====================================');
      
      // Show summary in UI
      const summary = `Test completed: ${results.leaksDetected.length} leaks, ${results.recommendations.length} recommendations`;
      this.debugUI.showSuccess(summary);
      
    } catch (error) {
      console.error('Extended session test failed:', error);
      this.debugUI.showError('Extended session test failed', { system: 'PerformanceManager' });
    }
  }

  /**
   * Test complete movement flow from input to rendering
   */
  testMovementFlow() {
    console.log('=== TESTING MOVEMENT FLOW ===');
    
    const position = this.movementController.getPosition();
    const direction = this.movementController.getDirection();
    
    console.log(`Starting position: (${position.x}, ${position.z}), direction: ${direction}`);
    
    // Test all movement calculations
    const movements = {
      forward: this.movementController.calculateForwardPosition(),
      backward: this.movementController.calculateBackwardPosition(),
      strafeLeft: this.movementController.calculateStrafeLeftPosition(),
      strafeRight: this.movementController.calculateStrafeRightPosition()
    };
    
    // Test collision detection for each movement
    Object.entries(movements).forEach(([movementType, targetPos]) => {
      const collision = this.collisionSystem.checkMovement(
        position.x, position.z, 
        targetPos.x, targetPos.z
      );
      
      const tile = this.gridSystem.getTile(targetPos.x, targetPos.z);
      console.log(`${movementType}: (${targetPos.x}, ${targetPos.z}) - ${tile ? tile.type : 'undefined'} - ${collision.blocked ? 'BLOCKED' : 'ALLOWED'}`);
      
      if (collision.blocked) {
        console.log(`  Reason: ${collision.reason}`);
      }
    });
    
    // Test door interactions
    this.testDoorInteractions();
    
    console.log('===========================');
  }

  /**
   * Test door interactions at current position
   */
  testDoorInteractions() {
    console.log('--- Testing Door Interactions ---');
    
    const position = this.movementController.getPosition();
    const directions = [
      {name: 'North', dx: 0, dz: -1},
      {name: 'East', dx: 1, dz: 0},
      {name: 'South', dx: 0, dz: 1},
      {name: 'West', dx: -1, dz: 0}
    ];
    
    directions.forEach(({name, dx, dz}) => {
      const checkX = position.x + dx;
      const checkZ = position.z + dz;
      const tile = this.gridSystem.getTile(checkX, checkZ);
      
      if (tile && tile.type === 'door') {
        console.log(`Door found ${name} at (${checkX}, ${checkZ})`);
        console.log(`  Locked: ${tile.locked}, Key: ${tile.keyType || 'none'}`);
        console.log(`  Orientation: ${tile.orientation}`);
        console.log(`  Walkable: ${tile.walkable}`);
      }
    });
  }

  /**
   * Test edge cases and boundary conditions
   */
  testEdgeCases() {
    console.log('=== TESTING EDGE CASES ===');
    
    const position = this.movementController.getPosition();
    const currentLevel = this.dungeonLoader.getCurrentLevel();
    
    if (!currentLevel) {
      console.log('No current level data available');
      return;
    }
    
    console.log(`Level dimensions: ${currentLevel.width}x${currentLevel.height}`);
    
    // Test boundary conditions
    const boundaries = [
      {name: 'Top-left corner', x: 0, z: 0},
      {name: 'Top-right corner', x: currentLevel.width - 1, z: 0},
      {name: 'Bottom-left corner', x: 0, z: currentLevel.height - 1},
      {name: 'Bottom-right corner', x: currentLevel.width - 1, z: currentLevel.height - 1},
      {name: 'Out of bounds (negative)', x: -1, z: -1},
      {name: 'Out of bounds (positive)', x: currentLevel.width, z: currentLevel.height}
    ];
    
    boundaries.forEach(({name, x, z}) => {
      const tile = this.gridSystem.getTile(x, z);
      const isValid = this.gridSystem.isValidPosition(x, z);
      console.log(`${name} (${x}, ${z}): ${tile ? tile.type : 'undefined'} - Valid: ${isValid}`);
    });
    
    // Test transition tiles
    console.log('--- Transition Tiles ---');
    if (currentLevel.transitions && currentLevel.transitions.length > 0) {
      currentLevel.transitions.forEach((transition, index) => {
        const tile = this.gridSystem.getTile(transition.x, transition.z);
        console.log(`Transition ${index + 1}: (${transition.x}, ${transition.z}) -> ${transition.target}`);
        console.log(`  Tile type: ${tile ? tile.type : 'undefined'}`);
        console.log(`  Target spawn: (${transition.spawn.x}, ${transition.spawn.z})`);
      });
    } else {
      console.log('No transitions in current level');
    }
    
    // Test door states
    console.log('--- Door States ---');
    if (currentLevel.doors && currentLevel.doors.length > 0) {
      currentLevel.doors.forEach((door, index) => {
        const tile = this.gridSystem.getTile(door.x, door.z);
        console.log(`Door ${index + 1}: (${door.x}, ${door.z})`);
        console.log(`  Locked: ${door.locked}, Key: ${door.keyType || 'none'}`);
        console.log(`  Orientation: ${door.orientation}`);
        console.log(`  Tile walkable: ${tile ? tile.walkable : 'undefined'}`);
      });
    } else {
      console.log('No doors in current level');
    }
    
    console.log('========================');
  }

  /**
   * Get debug UI instance for external access
   */
  getDebugUI() {
    return this.debugUI;
  }

  /**
   * Run combat performance test (press C key)
   */
  async runCombatPerformanceTest() {
    if (!this.performanceTester) {
      this.debugUI.showWarning('Performance tester not available');
      return;
    }
    
    this.debugUI.showToast('Starting combat performance test (100 combats)...', 'info');
    console.log('Starting combat performance test...');
    
    try {
      const results = await this.performanceTester.runCombatPerformanceTest({
        targetCount: 100,
        enemyCount: 6
      });
      
      console.log('=== COMBAT PERFORMANCE TEST RESULTS ===');
      console.log(`Combats completed: ${results.combats.length}`);
      console.log(`Average combat time: ${results.metrics.avgCombatTime.toFixed(0)}ms`);
      console.log(`Average FPS: ${results.metrics.avgFPS.toFixed(1)}`);
      console.log(`Min FPS: ${results.metrics.minFPS.toFixed(1)}`);
      console.log(`Memory increase: ${results.metrics.memoryIncrease.toFixed(1)}MB`);
      console.log(`Success rate: ${(results.metrics.successRate * 100).toFixed(1)}%`);
      console.log('======================================');
      
      // Show summary in UI
      const fpsStatus = results.metrics.avgFPS >= 55 ? '✅' : '❌';
      const summary = `Combat test: ${fpsStatus} ${results.metrics.avgFPS.toFixed(1)} FPS avg, ${results.metrics.avgCombatTime.toFixed(0)}ms avg time`;
      this.debugUI.showSuccess(summary);
      
    } catch (error) {
      console.error('Combat performance test failed:', error);
      this.debugUI.showError('Combat performance test failed', { system: 'PerformanceTester' });
    }
  }

  /**
   * Run save/load performance test (press S key)
   */
  async runSaveLoadPerformanceTest() {
    if (!this.performanceTester) {
      this.debugUI.showWarning('Performance tester not available');
      return;
    }
    
    this.debugUI.showToast('Starting save/load performance test (50 operations)...', 'info');
    console.log('Starting save/load performance test...');
    
    try {
      const results = await this.performanceTester.runSaveLoadPerformanceTest({
        targetCount: 50
      });
      
      console.log('=== SAVE/LOAD PERFORMANCE TEST RESULTS ===');
      console.log(`Operations completed: ${results.operations.length}`);
      console.log(`Average save time: ${results.metrics.avgSaveTime.toFixed(0)}ms`);
      console.log(`Average load time: ${results.metrics.avgLoadTime.toFixed(0)}ms`);
      console.log(`Max save time: ${results.metrics.maxSaveTime.toFixed(0)}ms`);
      console.log(`Max load time: ${results.metrics.maxLoadTime.toFixed(0)}ms`);
      console.log(`Success rate: ${(results.metrics.successRate * 100).toFixed(1)}%`);
      console.log(`Failure count: ${results.metrics.failureCount}`);
      console.log('=========================================');
      
      // Show summary in UI
      const saveStatus = results.metrics.avgSaveTime < 1000 ? '✅' : '❌';
      const loadStatus = results.metrics.avgLoadTime < 1000 ? '✅' : '❌';
      const summary = `Save/Load test: ${saveStatus} ${results.metrics.avgSaveTime.toFixed(0)}ms save, ${loadStatus} ${results.metrics.avgLoadTime.toFixed(0)}ms load`;
      this.debugUI.showSuccess(summary);
      
    } catch (error) {
      console.error('Save/load performance test failed:', error);
      this.debugUI.showError('Save/load performance test failed', { system: 'PerformanceTester' });
    }
  }

  /**
   * Show comprehensive performance report (press R key)
   */
  showPerformanceReport() {
    if (!this.performanceTester) {
      this.debugUI.showWarning('Performance tester not available');
      return;
    }
    
    const results = this.performanceTester.getTestResults();
    const optimizerMetrics = this.performanceOptimizer.getMetrics();
    const memoryStats = this.memoryManager.getMemoryStats();
    
    console.log('=== COMPREHENSIVE PERFORMANCE REPORT ===');
    
    // Current performance metrics
    console.log('\n--- Current Performance ---');
    console.log(`FPS: ${optimizerMetrics.avgFPS.toFixed(1)} (min: ${optimizerMetrics.minFPS.toFixed(1)}, max: ${optimizerMetrics.maxFPS.toFixed(1)})`);
    console.log(`Frame Time: ${optimizerMetrics.frameTime.toFixed(2)}ms`);
    console.log(`Memory Usage: ${optimizerMetrics.memoryUsage.toFixed(1)}MB (peak: ${optimizerMetrics.peakMemory.toFixed(1)}MB)`);
    
    // Optimization status
    console.log('\n--- Optimizations ---');
    console.log(`Object Pooling: ${optimizerMetrics.optimizations.objectPooling ? 'Enabled' : 'Disabled'}`);
    console.log(`Batch Rendering: ${optimizerMetrics.optimizations.batchRendering ? 'Enabled' : 'Disabled'}`);
    console.log(`Culling: ${optimizerMetrics.optimizations.culling ? 'Enabled' : 'Disabled'}`);
    console.log(`Particle Limit: ${optimizerMetrics.optimizations.particleLimit}`);
    console.log(`Effect Quality: ${optimizerMetrics.optimizations.effectQuality}`);
    
    // Memory analysis
    console.log('\n--- Memory Analysis ---');
    console.log(`Current Usage: ${memoryStats.current.toFixed(1)}MB`);
    console.log(`Peak Usage: ${memoryStats.peak.toFixed(1)}MB`);
    console.log(`Object Counts:`, memoryStats.objectCounts);
    
    // Test results summary
    if (results.summary) {
      const summary = results.summary;
      console.log('\n--- Test Results Summary ---');
      console.log(`Total Tests Run: ${summary.totalTests}`);
      
      if (summary.combat.testsRun > 0) {
        console.log(`Combat Tests: ${summary.combat.testsRun} (${(summary.combat.passRate * 100).toFixed(1)}% pass rate)`);
        console.log(`  Avg FPS: ${summary.combat.avgFPS.toFixed(1)}, Avg Time: ${summary.combat.avgCombatTime.toFixed(0)}ms`);
      }
      
      if (summary.saveLoad.testsRun > 0) {
        console.log(`Save/Load Tests: ${summary.saveLoad.testsRun} (${(summary.saveLoad.passRate * 100).toFixed(1)}% pass rate)`);
        console.log(`  Avg Save: ${summary.saveLoad.avgSaveTime.toFixed(0)}ms, Avg Load: ${summary.saveLoad.avgLoadTime.toFixed(0)}ms`);
      }
      
      if (summary.session.testsRun > 0) {
        console.log(`Session Tests: ${summary.session.testsRun}`);
        console.log(`  Duration: ${summary.session.duration.toFixed(1)}min, Memory Increase: ${summary.session.memoryIncrease.toFixed(1)}MB`);
        console.log(`  Min FPS: ${summary.session.minFPS.toFixed(1)}`);
      }
    }
    
    console.log('=======================================');
    
    // Show summary in UI
    const fpsStatus = optimizerMetrics.avgFPS >= 55 ? '✅' : '❌';
    const memoryStatus = optimizerMetrics.memoryUsage <= 400 ? '✅' : '❌';
    const uiSummary = `Performance: ${fpsStatus} ${optimizerMetrics.avgFPS.toFixed(1)} FPS, ${memoryStatus} ${optimizerMetrics.memoryUsage.toFixed(1)}MB`;
    this.debugUI.showToast(uiSummary, 'info');
  }

  /**
   * Dispose of engine resources
   */
  dispose() {
    console.log('Disposing DungeonCrawlerEngine...');
    
    // Stop game loop
    this.stop();
    
    // Dispose performance systems
    if (this.performanceTester) {
      this.performanceTester.destroy();
    }
    
    if (this.performanceOptimizer) {
      this.performanceOptimizer.destroy();
    }
    
    if (this.memoryManager) {
      this.memoryManager.destroy();
    }
    
    // Dispose performance manager
    if (this.performanceManager) {
      this.performanceManager.dispose();
    }
    
    // Dispose other systems
    if (this.dungeonLoader) {
      this.dungeonLoader.dispose();
    }
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    console.log('DungeonCrawlerEngine disposed');
  }
}

// Initialize and start the engine when page loads
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing engine...');
  
  const engine = new DungeonCrawlerEngine();
  
  try {
    await engine.initialize();
    engine.start();
    
    // Make engine globally accessible for debugging
    window.dungeonEngine = engine;
    
  } catch (error) {
    console.error('Failed to start engine:', error);
  }
});