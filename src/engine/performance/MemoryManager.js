/**
 * MemoryManager - Memory management and leak detection system
 * Handles proper disposal of geometries, materials, and textures
 */

export class MemoryManager {
  constructor() {
    // Memory tracking
    this.allocatedResources = new Map();
    this.disposedResources = new Set();
    
    // Memory statistics
    this.stats = {
      geometries: 0,
      materials: 0,
      textures: 0,
      meshes: 0,
      totalAllocated: 0,
      totalDisposed: 0,
      peakMemoryUsage: 0,
      currentMemoryUsage: 0
    };
    
    // Memory monitoring
    this.memoryCheckInterval = null;
    this.memoryHistory = [];
    this.maxHistoryLength = 100;
    
    // Disposal queue for batch processing
    this.disposalQueue = [];
    this.batchSize = 50;
    
    console.log('MemoryManager initialized');
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs = 5000) {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
    
    this.memoryCheckInterval = setInterval(() => {
      this.updateMemoryStats();
      this.processDisposalQueue();
      this.detectMemoryLeaks();
    }, intervalMs);
    
    console.log(`Memory monitoring started (${intervalMs}ms interval)`);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    
    console.log('Memory monitoring stopped');
  }

  /**
   * Register a resource for tracking
   * @param {Object} resource - Three.js resource (geometry, material, texture, mesh)
   * @param {string} type - Resource type
   * @param {string} id - Unique identifier
   */
  registerResource(resource, type, id = null) {
    const resourceId = id || this.generateResourceId(resource, type);
    
    if (this.allocatedResources.has(resourceId)) {
      console.warn(`Resource ${resourceId} already registered`);
      return resourceId;
    }
    
    const resourceInfo = {
      resource,
      type,
      id: resourceId,
      allocatedAt: performance.now(),
      memoryEstimate: this.estimateResourceMemory(resource, type)
    };
    
    this.allocatedResources.set(resourceId, resourceInfo);
    this.stats[type + 's']++;
    this.stats.totalAllocated++;
    
    return resourceId;
  }

  /**
   * Dispose of a resource
   * @param {string} resourceId - Resource identifier
   * @param {boolean} immediate - Whether to dispose immediately or queue
   */
  disposeResource(resourceId, immediate = false) {
    const resourceInfo = this.allocatedResources.get(resourceId);
    if (!resourceInfo) {
      console.warn(`Resource ${resourceId} not found for disposal`);
      return;
    }
    
    if (immediate) {
      this.performDisposal(resourceInfo);
    } else {
      this.disposalQueue.push(resourceInfo);
    }
  }

  /**
   * Dispose of multiple resources by type
   * @param {string} type - Resource type to dispose
   */
  disposeResourcesByType(type) {
    const resourcesToDispose = [];
    
    for (const [id, info] of this.allocatedResources) {
      if (info.type === type) {
        resourcesToDispose.push(info);
      }
    }
    
    resourcesToDispose.forEach(info => {
      this.disposalQueue.push(info);
    });
    
    console.log(`Queued ${resourcesToDispose.length} ${type} resources for disposal`);
  }

  /**
   * Perform actual resource disposal
   * @param {Object} resourceInfo - Resource information
   */
  performDisposal(resourceInfo) {
    const { resource, type, id } = resourceInfo;
    
    try {
      // Dispose based on resource type
      switch (type) {
        case 'geometry':
          if (resource && typeof resource.dispose === 'function') {
            resource.dispose();
          }
          break;
          
        case 'material':
          if (resource && typeof resource.dispose === 'function') {
            resource.dispose();
          }
          break;
          
        case 'texture':
          if (resource && typeof resource.dispose === 'function') {
            resource.dispose();
          }
          break;
          
        case 'mesh':
          if (resource) {
            // Dispose geometry and materials
            if (resource.geometry && typeof resource.geometry.dispose === 'function') {
              resource.geometry.dispose();
            }
            if (resource.material) {
              if (Array.isArray(resource.material)) {
                resource.material.forEach(mat => {
                  if (mat && typeof mat.dispose === 'function') {
                    mat.dispose();
                  }
                });
              } else if (typeof resource.material.dispose === 'function') {
                resource.material.dispose();
              }
            }
          }
          break;
          
        default:
          console.warn(`Unknown resource type for disposal: ${type}`);
      }
      
      // Remove from tracking
      this.allocatedResources.delete(id);
      this.disposedResources.add(id);
      
      // Update stats
      this.stats[type + 's']--;
      this.stats.totalDisposed++;
      
    } catch (error) {
      console.error(`Error disposing resource ${id}:`, error);
    }
  }

  /**
   * Process disposal queue in batches
   */
  processDisposalQueue() {
    if (this.disposalQueue.length === 0) return;
    
    const batchSize = Math.min(this.batchSize, this.disposalQueue.length);
    const batch = this.disposalQueue.splice(0, batchSize);
    
    batch.forEach(resourceInfo => {
      this.performDisposal(resourceInfo);
    });
    
    if (batch.length > 0) {
      console.log(`Disposed ${batch.length} resources from queue`);
    }
  }

  /**
   * Clear all resources immediately
   */
  clearAllResources() {
    console.log('Clearing all tracked resources...');
    
    const resourceIds = Array.from(this.allocatedResources.keys());
    resourceIds.forEach(id => {
      this.disposeResource(id, true);
    });
    
    // Clear disposal queue
    this.disposalQueue = [];
    
    console.log(`Cleared ${resourceIds.length} resources`);
  }

  /**
   * Update memory statistics
   */
  updateMemoryStats() {
    // Get browser memory info if available
    if (performance.memory) {
      const memoryInfo = performance.memory;
      this.stats.currentMemoryUsage = memoryInfo.usedJSHeapSize / 1024 / 1024; // MB
      this.stats.peakMemoryUsage = Math.max(
        this.stats.peakMemoryUsage,
        this.stats.currentMemoryUsage
      );
      
      // Add to history
      this.memoryHistory.push({
        timestamp: performance.now(),
        usage: this.stats.currentMemoryUsage,
        allocated: this.stats.totalAllocated,
        disposed: this.stats.totalDisposed
      });
      
      // Trim history
      if (this.memoryHistory.length > this.maxHistoryLength) {
        this.memoryHistory.shift();
      }
    }
  }

  /**
   * Detect potential memory leaks
   */
  detectMemoryLeaks() {
    const threshold = 100; // Alert if more than 100 undisposed resources
    const undisposedCount = this.allocatedResources.size;
    
    if (undisposedCount > threshold) {
      console.warn(`Potential memory leak detected: ${undisposedCount} undisposed resources`);
      
      // Log resource breakdown
      const breakdown = {};
      for (const info of this.allocatedResources.values()) {
        breakdown[info.type] = (breakdown[info.type] || 0) + 1;
      }
      console.warn('Resource breakdown:', breakdown);
    }
    
    // Check memory growth trend
    if (this.memoryHistory.length >= 10) {
      const recent = this.memoryHistory.slice(-10);
      const trend = this.calculateMemoryTrend(recent);
      
      if (trend > 5) { // Growing by more than 5MB over recent samples
        console.warn(`Memory usage trending upward: +${trend.toFixed(2)}MB`);
      }
    }
  }

  /**
   * Calculate memory usage trend
   * @param {Array} samples - Memory history samples
   * @returns {number} Trend in MB
   */
  calculateMemoryTrend(samples) {
    if (samples.length < 2) return 0;
    
    const first = samples[0].usage;
    const last = samples[samples.length - 1].usage;
    
    return last - first;
  }

  /**
   * Estimate memory usage of a resource
   * @param {Object} resource - Three.js resource
   * @param {string} type - Resource type
   * @returns {number} Estimated memory in bytes
   */
  estimateResourceMemory(resource, type) {
    switch (type) {
      case 'geometry':
        if (resource.attributes) {
          let size = 0;
          for (const attribute of Object.values(resource.attributes)) {
            if (attribute.array) {
              size += attribute.array.byteLength;
            }
          }
          return size;
        }
        return 1024; // Default estimate
        
      case 'material':
        return 512; // Default material size
        
      case 'texture':
        if (resource.image) {
          const width = resource.image.width || 256;
          const height = resource.image.height || 256;
          return width * height * 4; // RGBA
        }
        return 1024; // Default texture size
        
      case 'mesh':
        return 256; // Mesh object overhead
        
      default:
        return 128; // Default size
    }
  }

  /**
   * Generate unique resource ID
   * @param {Object} resource - Three.js resource
   * @param {string} type - Resource type
   * @returns {string} Unique ID
   */
  generateResourceId(resource, type) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${type}_${timestamp}_${random}`;
  }

  /**
   * Get memory statistics
   * @returns {Object} Memory statistics
   */
  getStats() {
    return {
      ...this.stats,
      undisposedResources: this.allocatedResources.size,
      queuedForDisposal: this.disposalQueue.length,
      memoryHistory: [...this.memoryHistory]
    };
  }

  /**
   * Get detailed resource breakdown
   * @returns {Object} Resource breakdown by type
   */
  getResourceBreakdown() {
    const breakdown = {
      geometry: 0,
      material: 0,
      texture: 0,
      mesh: 0
    };
    
    for (const info of this.allocatedResources.values()) {
      breakdown[info.type]++;
    }
    
    return breakdown;
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection() {
    if (window.gc) {
      window.gc();
      console.log('Forced garbage collection');
    } else {
      console.warn('Garbage collection not available');
    }
  }

  /**
   * Dispose of memory manager
   */
  dispose() {
    this.stopMonitoring();
    this.clearAllResources();
    this.memoryHistory = [];
    console.log('MemoryManager disposed');
  }
}