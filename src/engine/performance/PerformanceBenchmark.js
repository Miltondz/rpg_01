/**
 * PerformanceBenchmark - Performance benchmarking and monitoring tools
 * Provides comprehensive performance analysis for frame rate, memory usage, and system metrics
 */

export class PerformanceBenchmark {
  constructor() {
    // Benchmark configuration
    this.config = {
      targetFPS: 60,
      sampleSize: 100,
      memoryCheckInterval: 1000,
      performanceThresholds: {
        criticalFPS: 30,
        warningFPS: 45,
        maxMemoryMB: 300,
        maxFrameTimeMs: 33.33 // ~30fps
      }
    };
    
    // Performance metrics
    this.metrics = {
      fps: {
        current: 60,
        average: 60,
        min: 60,
        max: 60,
        samples: [],
        history: []
      },
      frameTime: {
        current: 16.67,
        average: 16.67,
        min: 16.67,
        max: 16.67,
        samples: [],
        p95: 16.67,
        p99: 16.67
      },
      memory: {
        current: 0,
        peak: 0,
        average: 0,
        samples: [],
        growth: 0
      },
      render: {
        drawCalls: 0,
        triangles: 0,
        geometries: 0,
        textures: 0
      },
      system: {
        cpuUsage: 0,
        gpuUsage: 0,
        temperature: 0
      }
    };
    
    // Benchmark state
    this.isRunning = false;
    this.startTime = 0;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    
    // Event listeners
    this.listeners = new Map();
    
    // Performance alerts
    this.alerts = {
      enabled: true,
      lastAlert: 0,
      alertCooldown: 5000 // 5 seconds between alerts
    };
    
    console.log('PerformanceBenchmark initialized');
  }

  /**
   * Start performance benchmarking
   * @param {Object} options - Benchmark options
   */
  start(options = {}) {
    if (this.isRunning) {
      console.warn('Benchmark already running');
      return;
    }
    
    // Apply options
    Object.assign(this.config, options);
    
    // Reset metrics
    this.resetMetrics();
    
    // Start benchmarking
    this.isRunning = true;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    
    console.log('Performance benchmarking started');
    this.emit('benchmarkStarted', { config: this.config });
  }

  /**
   * Stop performance benchmarking
   */
  stop() {
    if (!this.isRunning) {
      console.warn('Benchmark not running');
      return;
    }
    
    this.isRunning = false;
    
    const duration = performance.now() - this.startTime;
    const report = this.generateReport(duration);
    
    console.log('Performance benchmarking stopped');
    console.log('Benchmark Report:', report);
    
    this.emit('benchmarkStopped', { report });
    
    return report;
  }

  /**
   * Update performance metrics for current frame
   * @param {number} currentTime - Current timestamp
   * @param {Object} renderInfo - Render information from Three.js
   */
  updateFrame(currentTime, renderInfo = {}) {
    if (!this.isRunning) return;
    
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.frameCount++;
    
    // Update FPS metrics
    this.updateFPSMetrics(deltaTime);
    
    // Update frame time metrics
    this.updateFrameTimeMetrics(deltaTime);
    
    // Update render metrics
    this.updateRenderMetrics(renderInfo);
    
    // Check for performance issues
    this.checkPerformanceThresholds();
    
    // Update memory periodically
    if (this.frameCount % 60 === 0) { // Every 60 frames (~1 second at 60fps)
      this.updateMemoryMetrics();
    }
  }

  /**
   * Update FPS metrics
   * @param {number} deltaTime - Time since last frame in milliseconds
   */
  updateFPSMetrics(deltaTime) {
    const fps = deltaTime > 0 ? 1000 / deltaTime : 0;
    
    this.metrics.fps.current = fps;
    this.metrics.fps.samples.push(fps);
    
    // Update min/max
    this.metrics.fps.min = Math.min(this.metrics.fps.min, fps);
    this.metrics.fps.max = Math.max(this.metrics.fps.max, fps);
    
    // Maintain sample size
    if (this.metrics.fps.samples.length > this.config.sampleSize) {
      this.metrics.fps.samples.shift();
    }
    
    // Calculate average
    this.metrics.fps.average = this.calculateAverage(this.metrics.fps.samples);
    
    // Add to history (keep last 1000 samples)
    this.metrics.fps.history.push({ time: performance.now(), fps });
    if (this.metrics.fps.history.length > 1000) {
      this.metrics.fps.history.shift();
    }
  }

  /**
   * Update frame time metrics
   * @param {number} deltaTime - Frame time in milliseconds
   */
  updateFrameTimeMetrics(deltaTime) {
    this.metrics.frameTime.current = deltaTime;
    this.metrics.frameTime.samples.push(deltaTime);
    
    // Update min/max
    this.metrics.frameTime.min = Math.min(this.metrics.frameTime.min, deltaTime);
    this.metrics.frameTime.max = Math.max(this.metrics.frameTime.max, deltaTime);
    
    // Maintain sample size
    if (this.metrics.frameTime.samples.length > this.config.sampleSize) {
      this.metrics.frameTime.samples.shift();
    }
    
    // Calculate statistics
    this.metrics.frameTime.average = this.calculateAverage(this.metrics.frameTime.samples);
    this.metrics.frameTime.p95 = this.calculatePercentile(this.metrics.frameTime.samples, 95);
    this.metrics.frameTime.p99 = this.calculatePercentile(this.metrics.frameTime.samples, 99);
  }

  /**
   * Update memory metrics
   */
  updateMemoryMetrics() {
    if (!performance.memory) return;
    
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    
    this.metrics.memory.current = memoryMB;
    this.metrics.memory.peak = Math.max(this.metrics.memory.peak, memoryMB);
    this.metrics.memory.samples.push(memoryMB);
    
    // Maintain sample size
    if (this.metrics.memory.samples.length > this.config.sampleSize) {
      this.metrics.memory.samples.shift();
    }
    
    // Calculate average and growth
    this.metrics.memory.average = this.calculateAverage(this.metrics.memory.samples);
    
    if (this.metrics.memory.samples.length >= 2) {
      const recent = this.metrics.memory.samples.slice(-10);
      this.metrics.memory.growth = this.calculateGrowthRate(recent);
    }
  }

  /**
   * Update render metrics
   * @param {Object} renderInfo - Render information
   */
  updateRenderMetrics(renderInfo) {
    if (renderInfo.renderer && renderInfo.renderer.info) {
      const info = renderInfo.renderer.info;
      
      this.metrics.render.drawCalls = info.render.calls;
      this.metrics.render.triangles = info.render.triangles;
      this.metrics.render.geometries = info.memory.geometries;
      this.metrics.render.textures = info.memory.textures;
    }
  }

  /**
   * Check performance thresholds and emit alerts
   */
  checkPerformanceThresholds() {
    if (!this.alerts.enabled) return;
    
    const now = performance.now();
    if (now - this.alerts.lastAlert < this.alerts.alertCooldown) return;
    
    const thresholds = this.config.performanceThresholds;
    
    // Check FPS
    if (this.metrics.fps.current < thresholds.criticalFPS) {
      this.emitAlert('critical', 'fps', {
        current: this.metrics.fps.current,
        threshold: thresholds.criticalFPS
      });
    } else if (this.metrics.fps.current < thresholds.warningFPS) {
      this.emitAlert('warning', 'fps', {
        current: this.metrics.fps.current,
        threshold: thresholds.warningFPS
      });
    }
    
    // Check memory
    if (this.metrics.memory.current > thresholds.maxMemoryMB) {
      this.emitAlert('warning', 'memory', {
        current: this.metrics.memory.current,
        threshold: thresholds.maxMemoryMB
      });
    }
    
    // Check frame time
    if (this.metrics.frameTime.current > thresholds.maxFrameTimeMs) {
      this.emitAlert('warning', 'frameTime', {
        current: this.metrics.frameTime.current,
        threshold: thresholds.maxFrameTimeMs
      });
    }
  }

  /**
   * Emit performance alert
   * @param {string} level - Alert level (warning, critical)
   * @param {string} type - Alert type (fps, memory, frameTime)
   * @param {Object} data - Alert data
   */
  emitAlert(level, type, data) {
    this.alerts.lastAlert = performance.now();
    
    const alert = {
      level,
      type,
      data,
      timestamp: performance.now()
    };
    
    console.warn(`Performance Alert [${level.toUpperCase()}] ${type}:`, data);
    this.emit('performanceAlert', alert);
  }

  /**
   * Run performance stress test
   * @param {number} duration - Test duration in milliseconds
   * @param {Object} options - Test options
   */
  async runStressTest(duration = 30000, options = {}) {
    console.log(`Starting ${duration}ms stress test...`);
    
    const testConfig = {
      ...this.config,
      sampleSize: 1000, // Larger sample size for stress test
      ...options
    };
    
    this.start(testConfig);
    
    const startTime = performance.now();
    const results = {
      duration,
      samples: [],
      issues: []
    };
    
    // Run test loop
    while (performance.now() - startTime < duration && this.isRunning) {
      await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
      
      // Collect sample
      results.samples.push({
        time: performance.now() - startTime,
        fps: this.metrics.fps.current,
        frameTime: this.metrics.frameTime.current,
        memory: this.metrics.memory.current
      });
      
      // Check for issues
      if (this.metrics.fps.current < this.config.performanceThresholds.criticalFPS) {
        results.issues.push({
          time: performance.now() - startTime,
          type: 'low_fps',
          value: this.metrics.fps.current
        });
      }
    }
    
    const report = this.stop();
    results.finalReport = report;
    
    console.log('Stress test completed:', results);
    return results;
  }

  /**
   * Generate performance report
   * @param {number} duration - Benchmark duration
   * @returns {Object} Performance report
   */
  generateReport(duration) {
    return {
      duration,
      frameCount: this.frameCount,
      averageFPS: this.metrics.fps.average,
      fps: {
        min: this.metrics.fps.min,
        max: this.metrics.fps.max,
        average: this.metrics.fps.average,
        stability: this.calculateStability(this.metrics.fps.samples)
      },
      frameTime: {
        min: this.metrics.frameTime.min,
        max: this.metrics.frameTime.max,
        average: this.metrics.frameTime.average,
        p95: this.metrics.frameTime.p95,
        p99: this.metrics.frameTime.p99
      },
      memory: {
        peak: this.metrics.memory.peak,
        average: this.metrics.memory.average,
        growth: this.metrics.memory.growth
      },
      render: { ...this.metrics.render },
      performance: this.calculatePerformanceScore(),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Calculate performance score (0-100)
   * @returns {number} Performance score
   */
  calculatePerformanceScore() {
    const fpsScore = Math.min(100, (this.metrics.fps.average / this.config.targetFPS) * 100);
    const memoryScore = Math.max(0, 100 - (this.metrics.memory.peak / this.config.performanceThresholds.maxMemoryMB) * 100);
    const stabilityScore = this.calculateStability(this.metrics.fps.samples) * 100;
    
    return Math.round((fpsScore * 0.5 + memoryScore * 0.3 + stabilityScore * 0.2));
  }

  /**
   * Generate performance recommendations
   * @returns {Array} Array of recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.fps.average < this.config.targetFPS * 0.8) {
      recommendations.push({
        type: 'fps',
        severity: 'high',
        message: 'Consider reducing geometry complexity or implementing LOD system'
      });
    }
    
    if (this.metrics.memory.growth > 1) {
      recommendations.push({
        type: 'memory',
        severity: 'medium',
        message: 'Memory usage is growing, check for memory leaks'
      });
    }
    
    if (this.metrics.render.drawCalls > 100) {
      recommendations.push({
        type: 'render',
        severity: 'medium',
        message: 'High draw call count, consider geometry instancing'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate average of array
   * @param {Array} values - Array of numbers
   * @returns {number} Average value
   */
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate percentile of array
   * @param {Array} values - Array of numbers
   * @param {number} percentile - Percentile (0-100)
   * @returns {number} Percentile value
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate stability (inverse of coefficient of variation)
   * @param {Array} values - Array of numbers
   * @returns {number} Stability score (0-1)
   */
  calculateStability(values) {
    if (values.length < 2) return 1;
    
    const mean = this.calculateAverage(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const cv = mean > 0 ? stdDev / mean : 0;
    return Math.max(0, 1 - cv);
  }

  /**
   * Calculate growth rate
   * @param {Array} values - Array of numbers
   * @returns {number} Growth rate
   */
  calculateGrowthRate(values) {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    
    return last - first;
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics.fps = {
      current: 60,
      average: 60,
      min: 60,
      max: 60,
      samples: [],
      history: []
    };
    
    this.metrics.frameTime = {
      current: 16.67,
      average: 16.67,
      min: 16.67,
      max: 16.67,
      samples: [],
      p95: 16.67,
      p99: 16.67
    };
    
    this.metrics.memory = {
      current: 0,
      peak: 0,
      average: 0,
      samples: [],
      growth: 0
    };
    
    this.frameCount = 0;
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return JSON.parse(JSON.stringify(this.metrics));
  }

  /**
   * Dispose of benchmark system
   */
  dispose() {
    if (this.isRunning) {
      this.stop();
    }
    
    this.listeners.clear();
    console.log('PerformanceBenchmark disposed');
  }
}