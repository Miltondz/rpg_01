/**
 * PerformanceOptimizer - Monitors and optimizes game performance
 * Handles FPS monitoring, memory management, and performance tuning
 */

export class PerformanceOptimizer {
  constructor() {
    // Performance monitoring
    this.fpsHistory = [];
    this.memoryHistory = [];
    this.performanceMetrics = {
      avgFPS: 0,
      minFPS: 60,
      maxFPS: 0,
      memoryUsage: 0,
      peakMemory: 0,
      frameTime: 0
    };
    
    // Performance targets
    this.targets = {
      minFPS: 55,
      maxMemory: 400, // MB
      maxFrameTime: 16.67 // 60 FPS = 16.67ms per frame
    };
    
    // Optimization settings
    this.optimizations = {
      objectPooling: true,
      batchRendering: true,
      culling: true,
      lodSystem: false,
      particleLimit: 100,
      effectQuality: 'high'
    };
    
    // Performance state
    this.isMonitoring = false;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.monitoringInterval = null;
    
    // Object pools for performance
    this.objectPools = new Map();
    
    console.log('PerformanceOptimizer initialized');
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    
    // Monitor performance every second
    this.monitoringInterval = setInterval(() => {
      this.updatePerformanceMetrics();
      this.checkPerformanceThresholds();
    }, 1000);
    
    // Start frame time monitoring
    this.startFrameTimeMonitoring();
    
    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('Performance monitoring stopped');
  }

  /**
   * Start frame time monitoring using requestAnimationFrame
   */
  startFrameTimeMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();
    let fpsSum = 0;
    
    const measureFrame = (currentTime) => {
      if (!this.isMonitoring) return;
      
      const deltaTime = currentTime - lastTime;
      
      if (deltaTime > 0) {
        const fps = 1000 / deltaTime;
        fpsSum += fps;
        frameCount++;
        
        // Update metrics every 60 frames (roughly 1 second at 60fps)
        if (frameCount >= 60) {
          const avgFPS = fpsSum / frameCount;
          this.updateFPSMetrics(avgFPS, deltaTime);
          
          frameCount = 0;
          fpsSum = 0;
        }
      }
      
      lastTime = currentTime;
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
  }

  /**
   * Update FPS metrics
   * @param {number} fps - Current FPS
   * @param {number} frameTime - Frame time in milliseconds
   */
  updateFPSMetrics(fps, frameTime) {
    this.performanceMetrics.avgFPS = fps;
    this.performanceMetrics.minFPS = Math.min(this.performanceMetrics.minFPS, fps);
    this.performanceMetrics.maxFPS = Math.max(this.performanceMetrics.maxFPS, fps);
    this.performanceMetrics.frameTime = frameTime;
    
    // Keep FPS history (last 60 seconds)
    this.fpsHistory.push({ time: Date.now(), fps });
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics() {
    // Update memory usage
    if (performance.memory) {
      const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      this.performanceMetrics.memoryUsage = memoryMB;
      this.performanceMetrics.peakMemory = Math.max(this.performanceMetrics.peakMemory, memoryMB);
      
      // Keep memory history (last 60 seconds)
      this.memoryHistory.push({ time: Date.now(), memory: memoryMB });
      if (this.memoryHistory.length > 60) {
        this.memoryHistory.shift();
      }
    }
  }

  /**
   * Check performance thresholds and apply optimizations
   */
  checkPerformanceThresholds() {
    const metrics = this.performanceMetrics;
    
    // Check FPS threshold
    if (metrics.avgFPS < this.targets.minFPS) {
      console.warn(`Low FPS detected: ${metrics.avgFPS.toFixed(1)}`);
      this.applyFPSOptimizations();
    }
    
    // Check memory threshold
    if (metrics.memoryUsage > this.targets.maxMemory) {
      console.warn(`High memory usage: ${metrics.memoryUsage.toFixed(1)}MB`);
      this.applyMemoryOptimizations();
    }
    
    // Check frame time threshold
    if (metrics.frameTime > this.targets.maxFrameTime * 1.5) {
      console.warn(`High frame time: ${metrics.frameTime.toFixed(2)}ms`);
      this.applyFrameTimeOptimizations();
    }
  }

  /**
   * Apply optimizations for low FPS
   */
  applyFPSOptimizations() {
    console.log('Applying FPS optimizations...');
    
    // Reduce particle limit
    if (this.optimizations.particleLimit > 50) {
      this.optimizations.particleLimit = Math.max(50, this.optimizations.particleLimit - 20);
      console.log(`Reduced particle limit to ${this.optimizations.particleLimit}`);
    }
    
    // Lower effect quality
    if (this.optimizations.effectQuality === 'high') {
      this.optimizations.effectQuality = 'medium';
      console.log('Reduced effect quality to medium');
    } else if (this.optimizations.effectQuality === 'medium') {
      this.optimizations.effectQuality = 'low';
      console.log('Reduced effect quality to low');
    }
    
    // Enable more aggressive optimizations
    this.optimizations.culling = true;
    this.optimizations.batchRendering = true;
    
    this.emitOptimizationEvent('fpsOptimization', this.optimizations);
  }

  /**
   * Apply optimizations for high memory usage
   */
  applyMemoryOptimizations() {
    console.log('Applying memory optimizations...');
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
      console.log('Forced garbage collection');
    }
    
    // Clear object pools
    this.clearObjectPools();
    
    // Enable object pooling
    this.optimizations.objectPooling = true;
    
    this.emitOptimizationEvent('memoryOptimization', this.optimizations);
  }

  /**
   * Apply optimizations for high frame time
   */
  applyFrameTimeOptimizations() {
    console.log('Applying frame time optimizations...');
    
    // Enable all performance optimizations
    this.optimizations.objectPooling = true;
    this.optimizations.batchRendering = true;
    this.optimizations.culling = true;
    
    // Reduce computational load
    if (this.optimizations.particleLimit > 30) {
      this.optimizations.particleLimit = 30;
    }
    
    this.emitOptimizationEvent('frameTimeOptimization', this.optimizations);
  }

  /**
   * Create or get object from pool
   * @param {string} type - Object type
   * @param {Function} createFn - Function to create new object
   * @returns {Object} Pooled object
   */
  getPooledObject(type, createFn) {
    if (!this.optimizations.objectPooling) {
      return createFn();
    }
    
    if (!this.objectPools.has(type)) {
      this.objectPools.set(type, []);
    }
    
    const pool = this.objectPools.get(type);
    
    if (pool.length > 0) {
      return pool.pop();
    }
    
    return createFn();
  }

  /**
   * Return object to pool
   * @param {string} type - Object type
   * @param {Object} object - Object to return
   */
  returnToPool(type, object) {
    if (!this.optimizations.objectPooling) {
      return;
    }
    
    if (!this.objectPools.has(type)) {
      this.objectPools.set(type, []);
    }
    
    const pool = this.objectPools.get(type);
    
    // Reset object state if it has a reset method
    if (object.reset && typeof object.reset === 'function') {
      object.reset();
    }
    
    // Limit pool size to prevent memory bloat
    if (pool.length < 50) {
      pool.push(object);
    }
  }

  /**
   * Clear all object pools
   */
  clearObjectPools() {
    for (const [type, pool] of this.objectPools) {
      pool.length = 0;
    }
    console.log('Cleared object pools');
  }

  /**
   * Get current performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.performanceMetrics,
      fpsHistory: [...this.fpsHistory],
      memoryHistory: [...this.memoryHistory],
      optimizations: { ...this.optimizations },
      targets: { ...this.targets }
    };
  }

  /**
   * Get performance summary
   * @returns {Object} Performance summary
   */
  getPerformanceSummary() {
    const metrics = this.performanceMetrics;
    
    return {
      fps: {
        current: metrics.avgFPS,
        min: metrics.minFPS,
        max: metrics.maxFPS,
        target: this.targets.minFPS,
        status: metrics.avgFPS >= this.targets.minFPS ? 'good' : 'poor'
      },
      memory: {
        current: metrics.memoryUsage,
        peak: metrics.peakMemory,
        target: this.targets.maxMemory,
        status: metrics.memoryUsage <= this.targets.maxMemory ? 'good' : 'high'
      },
      frameTime: {
        current: metrics.frameTime,
        target: this.targets.maxFrameTime,
        status: metrics.frameTime <= this.targets.maxFrameTime ? 'good' : 'slow'
      },
      optimizations: this.optimizations
    };
  }

  /**
   * Set performance targets
   * @param {Object} targets - New performance targets
   */
  setTargets(targets) {
    this.targets = { ...this.targets, ...targets };
    console.log('Performance targets updated:', this.targets);
  }

  /**
   * Set optimization settings
   * @param {Object} optimizations - Optimization settings
   */
  setOptimizations(optimizations) {
    this.optimizations = { ...this.optimizations, ...optimizations };
    console.log('Optimization settings updated:', this.optimizations);
    
    this.emitOptimizationEvent('settingsChanged', this.optimizations);
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.performanceMetrics = {
      avgFPS: 0,
      minFPS: 60,
      maxFPS: 0,
      memoryUsage: 0,
      peakMemory: 0,
      frameTime: 0
    };
    
    this.fpsHistory = [];
    this.memoryHistory = [];
    
    console.log('Performance metrics reset');
  }

  /**
   * Benchmark system performance
   * @returns {Promise<Object>} Benchmark results
   */
  async benchmark() {
    console.log('Starting performance benchmark...');
    
    const results = {
      startTime: Date.now(),
      initialMemory: this.performanceMetrics.memoryUsage,
      tests: {}
    };
    
    // CPU benchmark - mathematical operations
    const cpuStart = performance.now();
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += Math.sqrt(i) * Math.sin(i);
    }
    const cpuTime = performance.now() - cpuStart;
    results.tests.cpu = { time: cpuTime, score: 1000000 / cpuTime };
    
    // Memory allocation benchmark
    const memStart = performance.now();
    const arrays = [];
    for (let i = 0; i < 1000; i++) {
      arrays.push(new Array(1000).fill(Math.random()));
    }
    const memTime = performance.now() - memStart;
    results.tests.memory = { time: memTime, allocations: 1000000 };
    
    // Cleanup
    arrays.length = 0;
    
    // Object creation benchmark
    const objStart = performance.now();
    const objects = [];
    for (let i = 0; i < 10000; i++) {
      objects.push({
        id: i,
        name: `Object${i}`,
        data: new Array(10).fill(i),
        timestamp: Date.now()
      });
    }
    const objTime = performance.now() - objStart;
    results.tests.objects = { time: objTime, count: 10000 };
    
    results.endTime = Date.now();
    results.totalTime = results.endTime - results.startTime;
    results.finalMemory = this.performanceMetrics.memoryUsage;
    results.memoryIncrease = results.finalMemory - results.initialMemory;
    
    console.log('Benchmark completed:', results);
    return results;
  }

  /**
   * Emit optimization event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  emitOptimizationEvent(type, data) {
    const event = new CustomEvent('performanceOptimization', {
      detail: {
        type,
        data,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Destroy performance optimizer
   */
  destroy() {
    this.stopMonitoring();
    this.clearObjectPools();
    this.objectPools.clear();
    
    console.log('PerformanceOptimizer destroyed');
  }
}