/**
 * PerformanceManager - Central performance optimization and monitoring system
 * Integrates geometry instancing, memory management, benchmarking, and frustum culling
 */

import { GeometryInstancer } from './GeometryInstancer.js';
import { MemoryManager } from './MemoryManager.js';
import { PerformanceBenchmark } from './PerformanceBenchmark.js';
import { FrustumCuller } from './FrustumCuller.js';

export class PerformanceManager {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;
    
    // Performance subsystems
    this.geometryInstancer = new GeometryInstancer(renderer);
    this.memoryManager = new MemoryManager();
    this.benchmark = new PerformanceBenchmark();
    this.frustumCuller = new FrustumCuller(camera, renderer);
    
    // Performance configuration
    this.config = {
      enableInstancing: true,
      enableMemoryManagement: true,
      enableBenchmarking: true,
      enableFrustumCulling: true,
      autoOptimize: true,
      optimizationInterval: 10000, // 10 seconds
      memoryLeakThreshold: 500, // MB
      fpsThreshold: 45
    };
    
    // Performance state
    this.isInitialized = false;
    this.isMonitoring = false;
    this.lastOptimization = 0;
    
    // Performance metrics aggregation
    this.aggregatedMetrics = {
      performance: {
        fps: 60,
        frameTime: 16.67,
        memoryUsage: 0,
        renderCalls: 0
      },
      optimization: {
        instancedObjects: 0,
        culledObjects: 0,
        memoryFreed: 0,
        optimizationCount: 0
      },
      alerts: []
    };
    
    // Event listeners for performance events
    this.setupEventListeners();
    
    console.log('PerformanceManager initialized');
  }

  /**
   * Initialize performance management systems
   * @param {Object} options - Configuration options
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      console.warn('PerformanceManager already initialized');
      return;
    }
    
    // Apply configuration
    Object.assign(this.config, options);
    
    try {
      // Initialize subsystems based on configuration
      if (this.config.enableMemoryManagement) {
        this.memoryManager.startMonitoring();
      }
      
      if (this.config.enableBenchmarking) {
        this.benchmark.start();
      }
      
      if (this.config.enableFrustumCulling) {
        this.frustumCuller.enable();
      }
      
      this.isInitialized = true;
      this.isMonitoring = true;
      
      console.log('PerformanceManager initialized successfully');
      
      // Start auto-optimization if enabled
      if (this.config.autoOptimize) {
        this.startAutoOptimization();
      }
      
    } catch (error) {
      console.error('Failed to initialize PerformanceManager:', error);
      throw error;
    }
  }

  /**
   * Update performance systems for current frame
   * @param {number} currentTime - Current timestamp
   * @param {number} frameCount - Current frame count
   */
  update(currentTime, frameCount) {
    if (!this.isInitialized || !this.isMonitoring) return;
    
    try {
      // Update benchmark with render info
      const renderInfo = this.getRenderInfo();
      this.benchmark.updateFrame(currentTime, renderInfo);
      
      // Update frustum culling
      this.frustumCuller.update(frameCount);
      
      // Update aggregated metrics
      this.updateAggregatedMetrics();
      
      // Check for auto-optimization
      if (this.config.autoOptimize && 
          currentTime - this.lastOptimization > this.config.optimizationInterval) {
        this.performAutoOptimization();
        this.lastOptimization = currentTime;
      }
      
    } catch (error) {
      console.error('Error updating PerformanceManager:', error);
    }
  }

  /**
   * Initialize geometry instancing for a level
   * @param {Object} levelData - Level data
   */
  initializeLevelOptimizations(levelData) {
    if (!this.config.enableInstancing) return;
    
    try {
      console.log('Initializing level optimizations...');
      
      // Initialize geometry instancing
      this.geometryInstancer.initializeInstances(levelData);
      
      // Register instanced objects with frustum culler
      if (this.config.enableFrustumCulling) {
        this.registerInstancedObjectsForCulling();
      }
      
      // Update optimization metrics
      const instanceStats = this.geometryInstancer.getStats();
      this.aggregatedMetrics.optimization.instancedObjects = 
        instanceStats.floorInstances + instanceStats.wallInstances + instanceStats.ceilingInstances;
      
      console.log('Level optimizations initialized');
      
    } catch (error) {
      console.error('Error initializing level optimizations:', error);
    }
  }

  /**
   * Register instanced objects with frustum culler
   */
  registerInstancedObjectsForCulling() {
    // Register floor instances
    if (this.geometryInstancer.floorInstances) {
      this.frustumCuller.registerObject(this.geometryInstancer.floorInstances, {
        priority: 1,
        maxDistance: 15
      });
    }
    
    // Register wall instances
    if (this.geometryInstancer.wallInstances) {
      this.frustumCuller.registerObject(this.geometryInstancer.wallInstances, {
        priority: 2,
        maxDistance: 20
      });
    }
    
    // Register ceiling instances
    if (this.geometryInstancer.ceilingInstances) {
      this.frustumCuller.registerObject(this.geometryInstancer.ceilingInstances, {
        priority: 0,
        maxDistance: 12
      });
    }
  }

  /**
   * Clean up level optimizations
   */
  cleanupLevelOptimizations() {
    try {
      console.log('Cleaning up level optimizations...');
      
      // Clear geometry instances
      this.geometryInstancer.clearInstances();
      
      // Clear frustum culler
      this.frustumCuller.clear();
      
      // Force memory cleanup
      this.memoryManager.processDisposalQueue();
      
      console.log('Level optimizations cleaned up');
      
    } catch (error) {
      console.error('Error cleaning up level optimizations:', error);
    }
  }

  /**
   * Register a mesh for memory management
   * @param {THREE.Mesh} mesh - Mesh to register
   * @param {string} type - Mesh type
   */
  registerMesh(mesh, type = 'mesh') {
    if (!this.config.enableMemoryManagement) return;
    
    try {
      // Register geometry
      if (mesh.geometry) {
        this.memoryManager.registerResource(mesh.geometry, 'geometry');
      }
      
      // Register materials
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(material => {
            this.memoryManager.registerResource(material, 'material');
          });
        } else {
          this.memoryManager.registerResource(mesh.material, 'material');
        }
      }
      
      // Register mesh itself
      this.memoryManager.registerResource(mesh, 'mesh');
      
      // Register with frustum culler if enabled
      if (this.config.enableFrustumCulling && type !== 'instanced') {
        this.frustumCuller.registerObject(mesh);
      }
      
    } catch (error) {
      console.error('Error registering mesh:', error);
    }
  }

  /**
   * Dispose of a mesh and its resources
   * @param {THREE.Mesh} mesh - Mesh to dispose
   */
  disposeMesh(mesh) {
    if (!this.config.enableMemoryManagement) return;
    
    try {
      // Unregister from frustum culler
      this.frustumCuller.unregisterObject(mesh);
      
      // Queue for disposal (will be processed in batches)
      if (mesh.geometry) {
        this.memoryManager.disposeResource(mesh.geometry.uuid);
      }
      
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(material => {
            this.memoryManager.disposeResource(material.uuid);
          });
        } else {
          this.memoryManager.disposeResource(mesh.material.uuid);
        }
      }
      
      this.memoryManager.disposeResource(mesh.uuid);
      
    } catch (error) {
      console.error('Error disposing mesh:', error);
    }
  }

  /**
   * Perform automatic optimization based on current performance
   */
  performAutoOptimization() {
    try {
      console.log('Performing auto-optimization...');
      
      const metrics = this.getPerformanceMetrics();
      let optimizationsApplied = 0;
      
      // Optimize based on FPS
      if (metrics.fps < this.config.fpsThreshold) {
        console.log('Low FPS detected, applying optimizations...');
        
        // Reduce frustum culling frequency for better performance
        this.frustumCuller.setUpdateFrequency(
          Math.min(this.frustumCuller.config.updateFrequency + 1, 5)
        );
        
        // Reduce render distance
        const currentDistance = this.frustumCuller.config.maxRenderDistance;
        this.frustumCuller.setMaxRenderDistance(Math.max(currentDistance * 0.9, 10));
        
        optimizationsApplied++;
      }
      
      // Optimize based on memory usage
      if (metrics.memoryUsage > this.config.memoryLeakThreshold) {
        console.log('High memory usage detected, cleaning up...');
        
        // Force memory cleanup
        this.memoryManager.processDisposalQueue();
        this.memoryManager.forceGarbageCollection();
        
        optimizationsApplied++;
      }
      
      // Update optimization count
      this.aggregatedMetrics.optimization.optimizationCount += optimizationsApplied;
      
      if (optimizationsApplied > 0) {
        console.log(`Applied ${optimizationsApplied} optimizations`);
      }
      
    } catch (error) {
      console.error('Error during auto-optimization:', error);
    }
  }

  /**
   * Run extended gameplay session test for memory leak detection
   * @param {number} duration - Test duration in milliseconds
   * @returns {Promise<Object>} Test results
   */
  async runExtendedSessionTest(duration = 600000) { // 10 minutes default
    console.log(`Starting ${duration / 1000}s extended session test...`);
    
    const testResults = {
      duration,
      startTime: performance.now(),
      memorySnapshots: [],
      performanceSnapshots: [],
      leaksDetected: [],
      recommendations: []
    };
    
    const snapshotInterval = 30000; // 30 seconds
    let nextSnapshot = performance.now() + snapshotInterval;
    
    // Run stress test with benchmark
    const stressTestPromise = this.benchmark.runStressTest(duration, {
      sampleSize: 2000
    });
    
    // Monitor memory during test
    while (performance.now() - testResults.startTime < duration) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (performance.now() >= nextSnapshot) {
        // Take memory snapshot
        const memoryStats = this.memoryManager.getStats();
        const performanceStats = this.getPerformanceMetrics();
        
        testResults.memorySnapshots.push({
          time: performance.now() - testResults.startTime,
          ...memoryStats
        });
        
        testResults.performanceSnapshots.push({
          time: performance.now() - testResults.startTime,
          ...performanceStats
        });
        
        // Check for memory leaks
        if (memoryStats.currentMemoryUsage > this.config.memoryLeakThreshold) {
          testResults.leaksDetected.push({
            time: performance.now() - testResults.startTime,
            memoryUsage: memoryStats.currentMemoryUsage,
            undisposedResources: memoryStats.undisposedResources
          });
        }
        
        nextSnapshot += snapshotInterval;
      }
    }
    
    // Wait for stress test to complete
    const stressResults = await stressTestPromise;
    testResults.stressTestResults = stressResults;
    
    // Generate recommendations
    testResults.recommendations = this.generateExtendedTestRecommendations(testResults);
    
    console.log('Extended session test completed:', testResults);
    return testResults;
  }

  /**
   * Generate recommendations from extended test results
   * @param {Object} testResults - Test results
   * @returns {Array} Array of recommendations
   */
  generateExtendedTestRecommendations(testResults) {
    const recommendations = [];
    
    // Check for memory leaks
    if (testResults.leaksDetected.length > 0) {
      recommendations.push({
        type: 'memory_leak',
        severity: 'high',
        message: 'Memory leaks detected during extended session',
        details: `${testResults.leaksDetected.length} leak events detected`
      });
    }
    
    // Check memory growth trend
    if (testResults.memorySnapshots.length >= 2) {
      const firstSnapshot = testResults.memorySnapshots[0];
      const lastSnapshot = testResults.memorySnapshots[testResults.memorySnapshots.length - 1];
      const growth = lastSnapshot.currentMemoryUsage - firstSnapshot.currentMemoryUsage;
      
      if (growth > 50) { // More than 50MB growth
        recommendations.push({
          type: 'memory_growth',
          severity: 'medium',
          message: 'Significant memory growth during session',
          details: `Memory grew by ${growth.toFixed(2)}MB`
        });
      }
    }
    
    // Check performance degradation
    if (testResults.performanceSnapshots.length >= 2) {
      const firstPerf = testResults.performanceSnapshots[0];
      const lastPerf = testResults.performanceSnapshots[testResults.performanceSnapshots.length - 1];
      const fpsDrop = firstPerf.fps - lastPerf.fps;
      
      if (fpsDrop > 10) {
        recommendations.push({
          type: 'performance_degradation',
          severity: 'medium',
          message: 'Performance degradation detected',
          details: `FPS dropped by ${fpsDrop.toFixed(1)}`
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Get render information from Three.js renderer
   * @returns {Object} Render information
   */
  getRenderInfo() {
    return {
      renderer: this.renderer.getRenderer(),
      scene: this.renderer.getScene(),
      camera: this.camera
    };
  }

  /**
   * Update aggregated performance metrics
   */
  updateAggregatedMetrics() {
    const benchmarkMetrics = this.benchmark.getMetrics();
    const memoryStats = this.memoryManager.getStats();
    const cullingStats = this.frustumCuller.getStats();
    
    this.aggregatedMetrics.performance = {
      fps: benchmarkMetrics.fps.current,
      frameTime: benchmarkMetrics.frameTime.current,
      memoryUsage: memoryStats.currentMemoryUsage,
      renderCalls: benchmarkMetrics.render.drawCalls
    };
    
    this.aggregatedMetrics.optimization.culledObjects = cullingStats.culledObjects;
  }

  /**
   * Setup event listeners for performance events
   */
  setupEventListeners() {
    // Listen for benchmark alerts
    this.benchmark.on('performanceAlert', (alert) => {
      this.aggregatedMetrics.alerts.push(alert);
      console.warn('Performance Alert:', alert);
    });
    
    // Listen for benchmark completion
    this.benchmark.on('benchmarkStopped', (data) => {
      console.log('Benchmark completed:', data.report);
    });
  }

  /**
   * Start auto-optimization timer
   */
  startAutoOptimization() {
    console.log('Auto-optimization enabled');
    // Auto-optimization is handled in the update loop
  }

  /**
   * Get comprehensive performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return {
      fps: this.aggregatedMetrics.performance.fps,
      frameTime: this.aggregatedMetrics.performance.frameTime,
      memoryUsage: this.aggregatedMetrics.performance.memoryUsage,
      renderCalls: this.aggregatedMetrics.performance.renderCalls,
      instancedObjects: this.aggregatedMetrics.optimization.instancedObjects,
      culledObjects: this.aggregatedMetrics.optimization.culledObjects,
      optimizationCount: this.aggregatedMetrics.optimization.optimizationCount,
      alerts: this.aggregatedMetrics.alerts.length
    };
  }

  /**
   * Get detailed performance report
   * @returns {Object} Detailed performance report
   */
  getDetailedReport() {
    return {
      benchmark: this.benchmark.getMetrics(),
      memory: this.memoryManager.getStats(),
      culling: this.frustumCuller.getStats(),
      instancing: this.geometryInstancer.getStats(),
      aggregated: this.aggregatedMetrics
    };
  }

  /**
   * Pause performance monitoring
   */
  pause() {
    this.isMonitoring = false;
    console.log('Performance monitoring paused');
  }

  /**
   * Resume performance monitoring
   */
  resume() {
    this.isMonitoring = true;
    console.log('Performance monitoring resumed');
  }

  /**
   * Dispose of performance manager and all subsystems
   */
  dispose() {
    console.log('Disposing PerformanceManager...');
    
    this.isMonitoring = false;
    
    // Dispose subsystems
    this.geometryInstancer.dispose();
    this.memoryManager.dispose();
    this.benchmark.dispose();
    this.frustumCuller.dispose();
    
    // Clear metrics
    this.aggregatedMetrics.alerts = [];
    
    console.log('PerformanceManager disposed');
  }
}