/**
 * PerformanceTester - Comprehensive performance testing system
 * Handles combat stress tests, save/load performance, and extended gameplay sessions
 */

import { PerformanceOptimizer } from './PerformanceOptimizer.js';
import { MemoryManager } from './MemoryManager.js';

export class PerformanceTester {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    
    // Performance systems
    this.optimizer = new PerformanceOptimizer();
    this.memoryManager = new MemoryManager();
    
    // Test configuration
    this.testConfig = {
      combat: {
        targetCount: 100,
        enemyCount: 6,
        maxTurnTime: 5000, // 5 seconds max per turn
        targetFPS: 55
      },
      saveLoad: {
        targetCount: 50,
        targetTime: 1000, // 1 second max
        testTypes: ['basic', 'stress', 'concurrent']
      },
      session: {
        maxDuration: 7200000, // 2 hours in milliseconds
        checkInterval: 60000, // Check every minute
        memoryThreshold: 200 // MB increase threshold
      }
    };
    
    // Test state
    this.activeTests = new Set();
    this.testResults = new Map();
    this.testStartTime = 0;
    
    // Performance data
    this.performanceData = {
      combat: [],
      saveLoad: [],
      session: null
    };
    
    console.log('PerformanceTester initialized');
  }

  /**
   * Initialize performance testing
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      // Start performance monitoring
      this.optimizer.startMonitoring();
      this.memoryManager.startMonitoring();
      
      // Set up event listeners
      this.setupEventListeners();
      
      console.log('PerformanceTester initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize PerformanceTester:', error);
      return false;
    }
  }

  /**
   * Set up event listeners for performance monitoring
   */
  setupEventListeners() {
    // Listen for performance optimization events
    window.addEventListener('performanceOptimization', (event) => {
      this.handleOptimizationEvent(event.detail);
    });
    
    // Listen for memory events
    window.addEventListener('memoryEvent', (event) => {
      this.handleMemoryEvent(event.detail);
    });
    
    // Listen for combat events
    window.addEventListener('combatEvent', (event) => {
      this.handleCombatEvent(event.detail);
    });
  }

  /**
   * Run combat performance test
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results
   */
  async runCombatPerformanceTest(options = {}) {
    const config = { ...this.testConfig.combat, ...options };
    
    console.log(`Starting combat performance test: ${config.targetCount} combats with ${config.enemyCount} enemies`);
    
    this.activeTests.add('combat');
    const testId = `combat_${Date.now()}`;
    
    const testResults = {
      testId,
      startTime: Date.now(),
      config,
      combats: [],
      metrics: {
        totalDuration: 0,
        avgCombatTime: 0,
        avgFPS: 0,
        minFPS: 60,
        maxFPS: 0,
        memoryStart: 0,
        memoryEnd: 0,
        memoryPeak: 0
      },
      status: 'running'
    };
    
    try {
      // Record initial state
      testResults.metrics.memoryStart = this.getCurrentMemoryUsage();
      
      // Run combat tests
      for (let i = 0; i < config.targetCount && this.activeTests.has('combat'); i++) {
        const combatResult = await this.runSingleCombatTest(config);
        testResults.combats.push(combatResult);
        
        // Update metrics
        this.updateCombatMetrics(testResults, combatResult);
        
        // Emit progress event
        this.emitTestEvent('combatProgress', {
          testId,
          progress: (i + 1) / config.targetCount,
          completed: i + 1,
          total: config.targetCount
        });
        
        // Brief pause between combats
        await this.delay(100);
      }
      
      // Finalize results
      testResults.endTime = Date.now();
      testResults.metrics.totalDuration = testResults.endTime - testResults.startTime;
      testResults.metrics.memoryEnd = this.getCurrentMemoryUsage();
      testResults.status = this.activeTests.has('combat') ? 'completed' : 'cancelled';
      
      // Calculate final metrics
      this.finalizeCombatMetrics(testResults);
      
      console.log(`Combat performance test completed: ${testResults.combats.length} combats in ${testResults.metrics.totalDuration}ms`);
      
    } catch (error) {
      console.error('Combat performance test failed:', error);
      testResults.status = 'failed';
      testResults.error = error.message;
    } finally {
      this.activeTests.delete('combat');
    }
    
    this.testResults.set(testId, testResults);
    this.performanceData.combat.push(testResults);
    
    this.emitTestEvent('combatTestCompleted', testResults);
    return testResults;
  }

  /**
   * Run single combat test
   * @param {Object} config - Test configuration
   * @returns {Promise<Object>} Combat result
   */
  async runSingleCombatTest(config) {
    const startTime = performance.now();
    const startMemory = this.getCurrentMemoryUsage();
    const startFPS = this.optimizer.getMetrics().avgFPS;
    
    // Create test enemies
    const enemies = this.createTestEnemies(config.enemyCount);
    
    // Initialize combat
    const combatSystem = this.gameEngine.combatSystem;
    const initSuccess = combatSystem.initializeCombat(
      this.gameEngine.partyManager,
      enemies
    );
    
    if (!initSuccess) {
      throw new Error('Failed to initialize combat');
    }
    
    // Monitor performance during combat
    const performanceMonitor = this.startCombatPerformanceMonitoring();
    
    try {
      // Simulate combat
      const combatResult = await this.simulateFullCombat(combatSystem, config.maxTurnTime);
      
      const endTime = performance.now();
      const endMemory = this.getCurrentMemoryUsage();
      const endFPS = this.optimizer.getMetrics().avgFPS;
      
      // Stop monitoring
      const performanceData = this.stopCombatPerformanceMonitoring(performanceMonitor);
      
      return {
        duration: endTime - startTime,
        result: combatResult.result,
        turnCount: combatResult.turnCount,
        startFPS,
        endFPS,
        avgFPS: performanceData.avgFPS,
        minFPS: performanceData.minFPS,
        maxFPS: performanceData.maxFPS,
        memoryStart: startMemory,
        memoryEnd: endMemory,
        memoryDelta: endMemory - startMemory,
        frameDrops: performanceData.frameDrops,
        success: combatResult.result !== 'timeout'
      };
      
    } catch (error) {
      this.stopCombatPerformanceMonitoring(performanceMonitor);
      throw error;
    }
  }

  /**
   * Create test enemies for combat
   * @param {number} count - Number of enemies
   * @returns {Array} Enemy array
   */
  createTestEnemies(count) {
    const enemies = [];
    const enemyTypes = ['goblin', 'orc', 'skeleton', 'spider', 'troll', 'dragon'];
    
    for (let i = 0; i < count; i++) {
      const type = enemyTypes[i % enemyTypes.length];
      const level = Math.floor(Math.random() * 5) + 3; // Level 3-7
      
      try {
        const enemy = this.gameEngine.enemyDatabase.createEnemy(type, level);
        enemies.push(enemy);
      } catch (error) {
        console.warn(`Failed to create enemy ${type}, using fallback`);
        // Create a basic enemy as fallback
        const fallbackEnemy = {
          id: `test_enemy_${i}`,
          name: `Test Enemy ${i}`,
          type: 'basic',
          level: level,
          stats: { HP: 50, ATK: 10, DEF: 5, SPD: 8 },
          currentHP: 50,
          maxHP: 50,
          isAlive: () => true,
          takeDamage: () => {},
          getAIDecision: () => ({ action: { name: 'attack', apCost: 1 }, target: null })
        };
        enemies.push(fallbackEnemy);
      }
    }
    
    return enemies;
  }

  /**
   * Simulate full combat with performance monitoring
   * @param {Object} combatSystem - Combat system instance
   * @param {number} maxTurnTime - Maximum time per turn
   * @returns {Promise<Object>} Combat result
   */
  async simulateFullCombat(combatSystem, maxTurnTime) {
    let turnCount = 0;
    const maxTurns = 100; // Prevent infinite combat
    const startTime = Date.now();
    
    while (combatSystem.isActive && turnCount < maxTurns) {
      const turnStart = Date.now();
      
      try {
        // Process current turn
        await this.processCombatTurn(combatSystem);
        turnCount++;
        
        // Check for turn timeout
        const turnDuration = Date.now() - turnStart;
        if (turnDuration > maxTurnTime) {
          console.warn(`Turn ${turnCount} took ${turnDuration}ms (timeout)`);
        }
        
        // Brief delay for animations
        await this.delay(50);
        
      } catch (error) {
        console.error(`Error in combat turn ${turnCount}:`, error);
        break;
      }
    }
    
    const totalDuration = Date.now() - startTime;
    
    return {
      result: combatSystem.combatResults ? combatSystem.combatResults.result : 'timeout',
      turnCount,
      duration: totalDuration,
      success: combatSystem.combatResults !== null
    };
  }

  /**
   * Process single combat turn
   * @param {Object} combatSystem - Combat system instance
   */
  async processCombatTurn(combatSystem) {
    const currentChar = combatSystem.currentCharacter;
    
    if (!currentChar) {
      combatSystem.nextTurn();
      return;
    }
    
    if (combatSystem.combatState === 'PLAYER_TURN') {
      await this.simulatePlayerTurn(combatSystem, currentChar);
    }
    // AI turns are handled automatically by the combat system
  }

  /**
   * Simulate player turn with AI-like behavior
   * @param {Object} combatSystem - Combat system instance
   * @param {Object} character - Current character
   */
  async simulatePlayerTurn(combatSystem, character) {
    const actions = combatSystem.getAvailableActions(character);
    if (actions.length === 0) {
      combatSystem.skipTurn();
      return;
    }
    
    // Choose action (prefer attack, then skills)
    let action = actions.find(a => a.name === 'attack') || actions[0];
    
    // Get valid targets
    const targetInfo = combatSystem.getTargetingInfo(action, character);
    if (targetInfo.validTargets.length === 0) {
      combatSystem.skipTurn();
      return;
    }
    
    // Choose target (prefer lowest HP enemy)
    const target = targetInfo.validTargets.reduce((lowest, current) => {
      const currentHP = current.currentHP || current.stats?.HP || 100;
      const lowestHP = lowest.currentHP || lowest.stats?.HP || 100;
      return currentHP < lowestHP ? current : lowest;
    });
    
    // Execute action
    await combatSystem.processAction(character, action, target);
  }

  /**
   * Start combat performance monitoring
   * @returns {Object} Monitor handle
   */
  startCombatPerformanceMonitoring() {
    const monitor = {
      startTime: Date.now(),
      fpsReadings: [],
      frameDrops: 0,
      isActive: true
    };
    
    // Monitor FPS every 100ms
    const fpsInterval = setInterval(() => {
      if (!monitor.isActive) return;
      
      const fps = this.optimizer.getMetrics().avgFPS;
      monitor.fpsReadings.push(fps);
      
      if (fps < 30) {
        monitor.frameDrops++;
      }
    }, 100);
    
    monitor.cleanup = () => {
      clearInterval(fpsInterval);
      monitor.isActive = false;
    };
    
    return monitor;
  }

  /**
   * Stop combat performance monitoring
   * @param {Object} monitor - Monitor handle
   * @returns {Object} Performance data
   */
  stopCombatPerformanceMonitoring(monitor) {
    monitor.cleanup();
    
    const fpsReadings = monitor.fpsReadings;
    
    return {
      duration: Date.now() - monitor.startTime,
      avgFPS: fpsReadings.length > 0 ? fpsReadings.reduce((a, b) => a + b) / fpsReadings.length : 0,
      minFPS: fpsReadings.length > 0 ? Math.min(...fpsReadings) : 0,
      maxFPS: fpsReadings.length > 0 ? Math.max(...fpsReadings) : 0,
      frameDrops: monitor.frameDrops,
      samples: fpsReadings.length
    };
  }

  /**
   * Run save/load performance test
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results
   */
  async runSaveLoadPerformanceTest(options = {}) {
    const config = { ...this.testConfig.saveLoad, ...options };
    
    console.log(`Starting save/load performance test: ${config.targetCount} operations`);
    
    this.activeTests.add('saveLoad');
    const testId = `saveLoad_${Date.now()}`;
    
    const testResults = {
      testId,
      startTime: Date.now(),
      config,
      operations: [],
      metrics: {
        totalDuration: 0,
        avgSaveTime: 0,
        avgLoadTime: 0,
        maxSaveTime: 0,
        maxLoadTime: 0,
        failureCount: 0,
        totalSize: 0
      },
      status: 'running'
    };
    
    try {
      for (let i = 0; i < config.targetCount && this.activeTests.has('saveLoad'); i++) {
        const testType = config.testTypes[i % config.testTypes.length];
        const operationResult = await this.runSingleSaveLoadTest(testType);
        
        testResults.operations.push(operationResult);
        this.updateSaveLoadMetrics(testResults, operationResult);
        
        // Emit progress event
        this.emitTestEvent('saveLoadProgress', {
          testId,
          progress: (i + 1) / config.targetCount,
          completed: i + 1,
          total: config.targetCount
        });
        
        await this.delay(50);
      }
      
      testResults.endTime = Date.now();
      testResults.metrics.totalDuration = testResults.endTime - testResults.startTime;
      testResults.status = this.activeTests.has('saveLoad') ? 'completed' : 'cancelled';
      
      this.finalizeSaveLoadMetrics(testResults);
      
      console.log(`Save/load performance test completed: ${testResults.operations.length} operations`);
      
    } catch (error) {
      console.error('Save/load performance test failed:', error);
      testResults.status = 'failed';
      testResults.error = error.message;
    } finally {
      this.activeTests.delete('saveLoad');
    }
    
    this.testResults.set(testId, testResults);
    this.performanceData.saveLoad.push(testResults);
    
    this.emitTestEvent('saveLoadTestCompleted', testResults);
    return testResults;
  }

  /**
   * Run single save/load test
   * @param {string} testType - Type of test
   * @returns {Promise<Object>} Operation result
   */
  async runSingleSaveLoadTest(testType) {
    const saveSystem = this.gameEngine.saveSystem;
    
    // Prepare test data based on type
    if (testType === 'stress') {
      await this.createLargeGameState();
    }
    
    const result = {
      testType,
      saveTime: 0,
      loadTime: 0,
      saveSuccess: false,
      loadSuccess: false,
      saveSize: 0,
      error: null
    };
    
    try {
      // Test save operation
      const saveStart = performance.now();
      const saveResult = await saveSystem.saveGame(1);
      result.saveTime = performance.now() - saveStart;
      result.saveSuccess = saveResult.success;
      result.saveSize = saveResult.size || 0;
      
      if (!saveResult.success) {
        result.error = saveResult.error;
        return result;
      }
      
      // Test load operation
      const loadStart = performance.now();
      const loadResult = await saveSystem.loadGame(1);
      result.loadTime = performance.now() - loadStart;
      result.loadSuccess = loadResult.success;
      
      if (!loadResult.success) {
        result.error = loadResult.error;
      }
      
    } catch (error) {
      result.error = error.message;
    }
    
    return result;
  }

  /**
   * Create large game state for stress testing
   */
  async createLargeGameState() {
    // Add many items to inventory
    const inventory = this.gameEngine.inventorySystem;
    
    for (let i = 0; i < 35; i++) {
      try {
        const item = this.gameEngine.itemDatabase.getRandomItem();
        inventory.addItem(item, Math.floor(Math.random() * 10) + 1);
      } catch (error) {
        // Ignore item creation errors
      }
    }
    
    // Level up characters multiple times
    for (let i = 0; i < 10; i++) {
      this.gameEngine.partyManager.distributeExperience(500);
    }
  }

  /**
   * Run extended session test
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results
   */
  async runExtendedSessionTest(options = {}) {
    const config = { ...this.testConfig.session, ...options };
    
    console.log(`Starting extended session test: ${config.maxDuration / 60000} minutes`);
    
    this.activeTests.add('session');
    const testId = `session_${Date.now()}`;
    
    const testResults = {
      testId,
      startTime: Date.now(),
      config,
      checkpoints: [],
      activities: [],
      metrics: {
        duration: 0,
        memoryStart: 0,
        memoryEnd: 0,
        memoryPeak: 0,
        memoryIncrease: 0,
        avgFPS: 0,
        minFPS: 60,
        activitiesPerformed: 0
      },
      status: 'running'
    };
    
    try {
      testResults.metrics.memoryStart = this.getCurrentMemoryUsage();
      
      const sessionMonitor = this.startSessionMonitoring(testResults);
      
      while (this.activeTests.has('session')) {
        const elapsed = Date.now() - testResults.startTime;
        
        if (elapsed >= config.maxDuration) {
          break;
        }
        
        // Perform random gameplay activities
        await this.performRandomActivity(testResults);
        
        // Check memory and performance
        if (elapsed % config.checkInterval === 0) {
          this.recordSessionCheckpoint(testResults);
        }
        
        await this.delay(1000);
      }
      
      this.stopSessionMonitoring(sessionMonitor);
      
      testResults.endTime = Date.now();
      testResults.metrics.duration = testResults.endTime - testResults.startTime;
      testResults.metrics.memoryEnd = this.getCurrentMemoryUsage();
      testResults.metrics.memoryIncrease = testResults.metrics.memoryEnd - testResults.metrics.memoryStart;
      testResults.status = this.activeTests.has('session') ? 'completed' : 'cancelled';
      
      this.finalizeSessionMetrics(testResults);
      
      console.log(`Extended session test completed: ${testResults.metrics.duration / 60000} minutes`);
      
    } catch (error) {
      console.error('Extended session test failed:', error);
      testResults.status = 'failed';
      testResults.error = error.message;
    } finally {
      this.activeTests.delete('session');
    }
    
    this.testResults.set(testId, testResults);
    this.performanceData.session = testResults;
    
    this.emitTestEvent('sessionTestCompleted', testResults);
    return testResults;
  }

  /**
   * Perform random gameplay activity during session test
   * @param {Object} testResults - Test results object
   */
  async performRandomActivity(testResults) {
    const activities = [
      () => this.simulateMovement(),
      () => this.simulateInventoryActivity(),
      () => this.simulateQuickCombat(),
      () => this.simulateSaveLoad(),
      () => this.simulateMenuNavigation()
    ];
    
    const activity = activities[Math.floor(Math.random() * activities.length)];
    const activityName = activity.name || 'unknown';
    
    const startTime = Date.now();
    
    try {
      await activity();
      
      testResults.activities.push({
        name: activityName,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        success: true
      });
      
      testResults.metrics.activitiesPerformed++;
      
    } catch (error) {
      testResults.activities.push({
        name: activityName,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Simulate movement activity
   */
  async simulateMovement() {
    // Simulate player movement
    for (let i = 0; i < 5; i++) {
      // Trigger movement-related events
      await this.delay(100);
    }
  }

  /**
   * Simulate inventory activity
   */
  async simulateInventoryActivity() {
    const inventory = this.gameEngine.inventorySystem;
    
    // Add and remove items
    try {
      const item = this.gameEngine.itemDatabase.getRandomItem();
      inventory.addItem(item);
      await this.delay(50);
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Simulate quick combat
   */
  async simulateQuickCombat() {
    try {
      await this.runSingleCombatTest({ enemyCount: 2, maxTurnTime: 2000 });
    } catch (error) {
      // Ignore combat errors during session test
    }
  }

  /**
   * Simulate save/load operation
   */
  async simulateSaveLoad() {
    try {
      const saveSystem = this.gameEngine.saveSystem;
      await saveSystem.saveGame(3);
      await this.delay(100);
      await saveSystem.loadGame(3);
    } catch (error) {
      // Ignore save/load errors during session test
    }
  }

  /**
   * Simulate menu navigation
   */
  async simulateMenuNavigation() {
    // Simulate UI interactions
    await this.delay(200);
  }

  /**
   * Start session monitoring
   * @param {Object} testResults - Test results object
   * @returns {Object} Monitor handle
   */
  startSessionMonitoring(testResults) {
    const monitor = {
      isActive: true,
      fpsReadings: [],
      memoryReadings: []
    };
    
    const monitorInterval = setInterval(() => {
      if (!monitor.isActive) return;
      
      const fps = this.optimizer.getMetrics().avgFPS;
      const memory = this.getCurrentMemoryUsage();
      
      monitor.fpsReadings.push(fps);
      monitor.memoryReadings.push(memory);
      
      // Update peak memory
      testResults.metrics.memoryPeak = Math.max(testResults.metrics.memoryPeak, memory);
      
      // Update min FPS
      testResults.metrics.minFPS = Math.min(testResults.metrics.minFPS, fps);
      
    }, 5000); // Every 5 seconds
    
    monitor.cleanup = () => {
      clearInterval(monitorInterval);
      monitor.isActive = false;
    };
    
    return monitor;
  }

  /**
   * Stop session monitoring
   * @param {Object} monitor - Monitor handle
   */
  stopSessionMonitoring(monitor) {
    monitor.cleanup();
  }

  /**
   * Record session checkpoint
   * @param {Object} testResults - Test results object
   */
  recordSessionCheckpoint(testResults) {
    const checkpoint = {
      timestamp: Date.now(),
      elapsed: Date.now() - testResults.startTime,
      memory: this.getCurrentMemoryUsage(),
      fps: this.optimizer.getMetrics().avgFPS,
      activitiesCount: testResults.activities.length
    };
    
    testResults.checkpoints.push(checkpoint);
    
    this.emitTestEvent('sessionCheckpoint', {
      testId: testResults.testId,
      checkpoint
    });
  }

  /**
   * Update combat metrics
   * @param {Object} testResults - Test results object
   * @param {Object} combatResult - Combat result
   */
  updateCombatMetrics(testResults, combatResult) {
    const metrics = testResults.metrics;
    
    metrics.avgFPS = (metrics.avgFPS * (testResults.combats.length - 1) + combatResult.avgFPS) / testResults.combats.length;
    metrics.minFPS = Math.min(metrics.minFPS, combatResult.minFPS);
    metrics.maxFPS = Math.max(metrics.maxFPS, combatResult.maxFPS);
    metrics.memoryPeak = Math.max(metrics.memoryPeak, combatResult.memoryEnd);
  }

  /**
   * Finalize combat metrics
   * @param {Object} testResults - Test results object
   */
  finalizeCombatMetrics(testResults) {
    const combats = testResults.combats;
    const metrics = testResults.metrics;
    
    if (combats.length > 0) {
      metrics.avgCombatTime = combats.reduce((sum, c) => sum + c.duration, 0) / combats.length;
      
      const successfulCombats = combats.filter(c => c.success);
      metrics.successRate = successfulCombats.length / combats.length;
      
      metrics.memoryIncrease = metrics.memoryEnd - metrics.memoryStart;
    }
  }

  /**
   * Update save/load metrics
   * @param {Object} testResults - Test results object
   * @param {Object} operationResult - Operation result
   */
  updateSaveLoadMetrics(testResults, operationResult) {
    const metrics = testResults.metrics;
    
    if (operationResult.saveSuccess) {
      const saveCount = testResults.operations.filter(op => op.saveSuccess).length;
      metrics.avgSaveTime = (metrics.avgSaveTime * (saveCount - 1) + operationResult.saveTime) / saveCount;
      metrics.maxSaveTime = Math.max(metrics.maxSaveTime, operationResult.saveTime);
      metrics.totalSize += operationResult.saveSize;
    }
    
    if (operationResult.loadSuccess) {
      const loadCount = testResults.operations.filter(op => op.loadSuccess).length;
      metrics.avgLoadTime = (metrics.avgLoadTime * (loadCount - 1) + operationResult.loadTime) / loadCount;
      metrics.maxLoadTime = Math.max(metrics.maxLoadTime, operationResult.loadTime);
    }
    
    if (!operationResult.saveSuccess || !operationResult.loadSuccess) {
      metrics.failureCount++;
    }
  }

  /**
   * Finalize save/load metrics
   * @param {Object} testResults - Test results object
   */
  finalizeSaveLoadMetrics(testResults) {
    const operations = testResults.operations;
    const metrics = testResults.metrics;
    
    if (operations.length > 0) {
      metrics.successRate = operations.filter(op => op.saveSuccess && op.loadSuccess).length / operations.length;
      metrics.avgOperationTime = (metrics.avgSaveTime + metrics.avgLoadTime) / 2;
    }
  }

  /**
   * Finalize session metrics
   * @param {Object} testResults - Test results object
   */
  finalizeSessionMetrics(testResults) {
    const checkpoints = testResults.checkpoints;
    const metrics = testResults.metrics;
    
    if (checkpoints.length > 0) {
      metrics.avgFPS = checkpoints.reduce((sum, c) => sum + c.fps, 0) / checkpoints.length;
      metrics.memoryPeak = Math.max(...checkpoints.map(c => c.memory));
    }
    
    metrics.activitiesPerMinute = (metrics.activitiesPerformed / (metrics.duration / 60000));
  }

  /**
   * Get current memory usage
   * @returns {number} Memory usage in MB
   */
  getCurrentMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Stop specific test
   * @param {string} testType - Type of test to stop
   */
  stopTest(testType) {
    this.activeTests.delete(testType);
    console.log(`Stopped ${testType} test`);
  }

  /**
   * Stop all active tests
   */
  stopAllTests() {
    this.activeTests.clear();
    console.log('Stopped all active tests');
  }

  /**
   * Get test results
   * @param {string} testId - Test ID (optional)
   * @returns {Object} Test results
   */
  getTestResults(testId = null) {
    if (testId) {
      return this.testResults.get(testId);
    }
    
    return {
      combat: this.performanceData.combat,
      saveLoad: this.performanceData.saveLoad,
      session: this.performanceData.session,
      summary: this.generateTestSummary()
    };
  }

  /**
   * Generate test summary
   * @returns {Object} Test summary
   */
  generateTestSummary() {
    const summary = {
      totalTests: this.testResults.size,
      combat: {
        testsRun: this.performanceData.combat.length,
        avgFPS: 0,
        avgCombatTime: 0,
        passRate: 0
      },
      saveLoad: {
        testsRun: this.performanceData.saveLoad.length,
        avgSaveTime: 0,
        avgLoadTime: 0,
        passRate: 0
      },
      session: {
        testsRun: this.performanceData.session ? 1 : 0,
        memoryIncrease: 0,
        minFPS: 0,
        duration: 0
      }
    };
    
    // Calculate combat summary
    if (this.performanceData.combat.length > 0) {
      const combatTests = this.performanceData.combat;
      summary.combat.avgFPS = combatTests.reduce((sum, t) => sum + t.metrics.avgFPS, 0) / combatTests.length;
      summary.combat.avgCombatTime = combatTests.reduce((sum, t) => sum + t.metrics.avgCombatTime, 0) / combatTests.length;
      summary.combat.passRate = combatTests.filter(t => t.metrics.avgFPS >= this.testConfig.combat.targetFPS).length / combatTests.length;
    }
    
    // Calculate save/load summary
    if (this.performanceData.saveLoad.length > 0) {
      const saveLoadTests = this.performanceData.saveLoad;
      summary.saveLoad.avgSaveTime = saveLoadTests.reduce((sum, t) => sum + t.metrics.avgSaveTime, 0) / saveLoadTests.length;
      summary.saveLoad.avgLoadTime = saveLoadTests.reduce((sum, t) => sum + t.metrics.avgLoadTime, 0) / saveLoadTests.length;
      summary.saveLoad.passRate = saveLoadTests.filter(t => 
        t.metrics.avgSaveTime < this.testConfig.saveLoad.targetTime && 
        t.metrics.avgLoadTime < this.testConfig.saveLoad.targetTime
      ).length / saveLoadTests.length;
    }
    
    // Calculate session summary
    if (this.performanceData.session) {
      const session = this.performanceData.session;
      summary.session.memoryIncrease = session.metrics.memoryIncrease;
      summary.session.minFPS = session.metrics.minFPS;
      summary.session.duration = session.metrics.duration / 60000; // Convert to minutes
    }
    
    return summary;
  }

  /**
   * Handle optimization event
   * @param {Object} eventData - Event data
   */
  handleOptimizationEvent(eventData) {
    console.log('Performance optimization applied:', eventData.type);
  }

  /**
   * Handle memory event
   * @param {Object} eventData - Event data
   */
  handleMemoryEvent(eventData) {
    if (eventData.type === 'memoryCheck' && eventData.data.usage > 400) {
      console.warn('High memory usage detected during testing:', eventData.data.usage);
    }
  }

  /**
   * Handle combat event
   * @param {Object} eventData - Event data
   */
  handleCombatEvent(eventData) {
    // Track combat events during testing
    if (this.activeTests.has('combat') || this.activeTests.has('session')) {
      // Could log combat performance data here
    }
  }

  /**
   * Emit test event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  emitTestEvent(type, data) {
    const event = new CustomEvent('performanceTest', {
      detail: {
        type,
        data,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Destroy performance tester
   */
  destroy() {
    this.stopAllTests();
    this.optimizer.destroy();
    this.memoryManager.destroy();
    
    console.log('PerformanceTester destroyed');
  }
}