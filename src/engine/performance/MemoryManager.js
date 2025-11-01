/**
 * MemoryManager - Manages memory usage and prevents memory leaks
 * Handles object lifecycle, garbage collection, and memory monitoring
 */

export class MemoryManager {
  constructor() {
    // Memory tracking
    this.trackedObjects = new WeakMap();
    this.objectCounts = new Map();
    this.memorySnapshots = [];
    
    // Cleanup handlers
    this.cleanupHandlers = new Map();
    this.intervalCleanups = new Set();
    
    // Memory thresholds
    this.thresholds = {
      warning: 300, // MB
      critical: 500, // MB
      cleanup: 400 // MB
    };
    
    // Monitoring state
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    console.log('MemoryManager initialized');
  }

  /**
   * Start memory monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor memory every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
      this.takeMemorySnapshot();
    }, 5000);
    
    console.log('Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('Memory monitoring stopped');
  }

  /**
   * Track object for memory management
   * @param {Object} object - Object to track
   * @param {string} type - Object type
   * @param {Function} cleanupFn - Optional cleanup function
   */
  trackObject(object, type, cleanupFn = null) {
    if (!object || typeof object !== 'object') {
      return;
    }
    
    // Track object with metadata
    this.trackedObjects.set(object, {
      type,
      createdAt: Date.now(),
      cleanupFn
    });
    
    // Update object count
    const currentCount = this.objectCounts.get(type) || 0;
    this.objectCounts.set(type, currentCount + 1);
    
    // Register cleanup handler if provided
    if (cleanupFn) {
      this.cleanupHandlers.set(object, cleanupFn);
    }
  }

  /**
   * Untrack object
   * @param {Object} object - Object to untrack
   */
  untrackObject(object) {
    if (!object || !this.trackedObjects.has(object)) {
      return;
    }
    
    const metadata = this.trackedObjects.get(object);
    
    // Update object count
    const currentCount = this.objectCounts.get(metadata.type) || 0;
    this.objectCounts.set(metadata.type, Math.max(0, currentCount - 1));
    
    // Remove cleanup handler
    this.cleanupHandlers.delete(object);
    
    // Remove from tracking
    this.trackedObjects.delete(object);
  }

  /**
   * Clean up object and remove from tracking
   * @param {Object} object - Object to clean up
   */
  cleanupObject(object) {
    if (!object) return;
    
    // Run cleanup function if available
    if (this.cleanupHandlers.has(object)) {
      const cleanupFn = this.cleanupHandlers.get(object);
      try {
        cleanupFn(object);
      } catch (error) {
        console.error('Error during object cleanup:', error);
      }
    }
    
    // Call object's destroy method if available
    if (object.destroy && typeof object.destroy === 'function') {
      try {
        object.destroy();
      } catch (error) {
        console.error('Error calling object destroy method:', error);
      }
    }
    
    // Remove event listeners if object has them
    if (object.removeAllListeners && typeof object.removeAllListeners === 'function') {
      object.removeAllListeners();
    }
    
    // Clear object properties to help GC
    if (object.clear && typeof object.clear === 'function') {
      object.clear();
    }
    
    // Untrack the object
    this.untrackObject(object);
  }

  /**
   * Register cleanup for intervals and timeouts
   * @param {number} intervalId - Interval or timeout ID
   * @param {string} type - 'interval' or 'timeout'
   */
  registerCleanup(intervalId, type = 'interval') {
    this.intervalCleanups.add({ id: intervalId, type });
  }

  /**
   * Clean up all registered intervals and timeouts
   */
  cleanupIntervals() {
    for (const cleanup of this.intervalCleanups) {
      try {
        if (cleanup.type === 'interval') {
          clearInterval(cleanup.id);
        } else {
          clearTimeout(cleanup.id);
        }
      } catch (error) {
        console.error('Error clearing interval/timeout:', error);
      }
    }
    
    this.intervalCleanups.clear();
    console.log('Cleaned up intervals and timeouts');
  }

  /**
   * Check current memory usage and trigger cleanup if needed
   */
  checkMemoryUsage() {
    if (!performance.memory) {
      return;
    }
    
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    
    if (memoryMB > this.thresholds.critical) {
      console.error(`Critical memory usage: ${memoryMB.toFixed(1)}MB`);
      this.performEmergencyCleanup();
    } else if (memoryMB > this.thresholds.cleanup) {
      console.warn(`High memory usage: ${memoryMB.toFixed(1)}MB - performing cleanup`);
      this.performCleanup();
    } else if (memoryMB > this.thresholds.warning) {
      console.warn(`Memory usage warning: ${memoryMB.toFixed(1)}MB`);
    }
    
    // Emit memory event
    this.emitMemoryEvent('memoryCheck', {
      usage: memoryMB,
      thresholds: this.thresholds,
      objectCounts: Object.fromEntries(this.objectCounts)
    });
  }

  /**
   * Take memory snapshot for analysis
   */
  takeMemorySnapshot() {
    if (!performance.memory) {
      return;
    }
    
    const snapshot = {
      timestamp: Date.now(),
      used: performance.memory.usedJSHeapSize / 1024 / 1024,
      total: performance.memory.totalJSHeapSize / 1024 / 1024,
      limit: performance.memory.jsHeapSizeLimit / 1024 / 1024,
      objectCounts: Object.fromEntries(this.objectCounts)
    };
    
    this.memorySnapshots.push(snapshot);
    
    // Keep only last 100 snapshots
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots.shift();
    }
  }

  /**
   * Perform routine cleanup
   */
  performCleanup() {
    console.log('Performing memory cleanup...');
    
    // Clean up intervals and timeouts
    this.cleanupIntervals();
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
      console.log('Forced garbage collection');
    }
    
    // Emit cleanup event
    this.emitMemoryEvent('cleanup', {
      type: 'routine',
      objectCounts: Object.fromEntries(this.objectCounts)
    });
  }

  /**
   * Perform emergency cleanup when memory is critically high
   */
  performEmergencyCleanup() {
    console.log('Performing emergency memory cleanup...');
    
    // Clean up all intervals and timeouts
    this.cleanupIntervals();
    
    // Clear memory snapshots except the last few
    if (this.memorySnapshots.length > 10) {
      this.memorySnapshots = this.memorySnapshots.slice(-10);
    }
    
    // Force multiple garbage collections
    if (window.gc) {
      for (let i = 0; i < 3; i++) {
        window.gc();
      }
      console.log('Forced multiple garbage collections');
    }
    
    // Emit emergency cleanup event
    this.emitMemoryEvent('emergencyCleanup', {
      objectCounts: Object.fromEntries(this.objectCounts)
    });
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Memory statistics
   */
  getMemoryStats() {
    const stats = {
      current: 0,
      peak: 0,
      snapshots: this.memorySnapshots.length,
      objectCounts: Object.fromEntries(this.objectCounts),
      thresholds: this.thresholds
    };
    
    if (performance.memory) {
      stats.current = performance.memory.usedJSHeapSize / 1024 / 1024;
      stats.total = performance.memory.totalJSHeapSize / 1024 / 1024;
      stats.limit = performance.memory.jsHeapSizeLimit / 1024 / 1024;
    }
    
    // Calculate peak from snapshots
    if (this.memorySnapshots.length > 0) {
      stats.peak = Math.max(...this.memorySnapshots.map(s => s.used));
    }
    
    return stats;
  }

  /**
   * Get memory usage trend
   * @returns {Object} Memory trend analysis
   */
  getMemoryTrend() {
    if (this.memorySnapshots.length < 2) {
      return { trend: 'insufficient_data', change: 0 };
    }
    
    const recent = this.memorySnapshots.slice(-10);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    
    const change = newest.used - oldest.used;
    const timeSpan = newest.timestamp - oldest.timestamp;
    const rate = change / (timeSpan / 1000); // MB per second
    
    let trend = 'stable';
    if (rate > 0.1) {
      trend = 'increasing';
    } else if (rate < -0.1) {
      trend = 'decreasing';
    }
    
    return {
      trend,
      change,
      rate,
      timeSpan,
      samples: recent.length
    };
  }

  /**
   * Analyze memory leaks
   * @returns {Object} Leak analysis
   */
  analyzeLeaks() {
    const analysis = {
      suspiciousTypes: [],
      growingTypes: [],
      recommendations: []
    };
    
    // Check for types with unusually high counts
    for (const [type, count] of this.objectCounts) {
      if (count > 1000) {
        analysis.suspiciousTypes.push({ type, count });
      }
    }
    
    // Check memory trend
    const trend = this.getMemoryTrend();
    if (trend.trend === 'increasing' && trend.rate > 0.5) {
      analysis.recommendations.push('Memory usage is increasing rapidly - check for memory leaks');
    }
    
    // Check for growing object types (would need historical data)
    // This is a simplified version
    if (analysis.suspiciousTypes.length > 0) {
      analysis.recommendations.push('High object counts detected - review object lifecycle management');
    }
    
    return analysis;
  }

  /**
   * Create memory report
   * @returns {Object} Comprehensive memory report
   */
  createMemoryReport() {
    const stats = this.getMemoryStats();
    const trend = this.getMemoryTrend();
    const leaks = this.analyzeLeaks();
    
    return {
      timestamp: Date.now(),
      stats,
      trend,
      leaks,
      snapshots: this.memorySnapshots.slice(-20), // Last 20 snapshots
      summary: {
        status: this.getMemoryStatus(stats.current),
        recommendation: this.getMemoryRecommendation(stats, trend, leaks)
      }
    };
  }

  /**
   * Get memory status based on current usage
   * @param {number} currentUsage - Current memory usage in MB
   * @returns {string} Status
   */
  getMemoryStatus(currentUsage) {
    if (currentUsage > this.thresholds.critical) {
      return 'critical';
    } else if (currentUsage > this.thresholds.cleanup) {
      return 'high';
    } else if (currentUsage > this.thresholds.warning) {
      return 'warning';
    }
    return 'normal';
  }

  /**
   * Get memory recommendation
   * @param {Object} stats - Memory stats
   * @param {Object} trend - Memory trend
   * @param {Object} leaks - Leak analysis
   * @returns {string} Recommendation
   */
  getMemoryRecommendation(stats, trend, leaks) {
    if (stats.current > this.thresholds.critical) {
      return 'Immediate action required - restart application or perform emergency cleanup';
    }
    
    if (trend.trend === 'increasing' && trend.rate > 1) {
      return 'Memory leak suspected - investigate object lifecycle and event listeners';
    }
    
    if (leaks.suspiciousTypes.length > 0) {
      return 'High object counts detected - review object pooling and cleanup procedures';
    }
    
    if (stats.current > this.thresholds.warning) {
      return 'Monitor memory usage closely and consider cleanup';
    }
    
    return 'Memory usage is within normal parameters';
  }

  /**
   * Set memory thresholds
   * @param {Object} thresholds - New threshold values
   */
  setThresholds(thresholds) {
    this.thresholds = { ...this.thresholds, ...thresholds };
    console.log('Memory thresholds updated:', this.thresholds);
  }

  /**
   * Emit memory event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  emitMemoryEvent(type, data) {
    const event = new CustomEvent('memoryEvent', {
      detail: {
        type,
        data,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Destroy memory manager and cleanup
   */
  destroy() {
    this.stopMonitoring();
    this.cleanupIntervals();
    
    // Clear all tracking
    this.objectCounts.clear();
    this.cleanupHandlers.clear();
    this.memorySnapshots.length = 0;
    
    console.log('MemoryManager destroyed');
  }
}