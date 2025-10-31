/**
 * FrustumCuller - Frustum culling optimization system
 * Optimizes rendering by culling objects outside the camera's view frustum
 */

export class FrustumCuller {
  constructor(camera, renderer) {
    this.camera = camera;
    this.renderer = renderer;
    
    // Frustum for culling calculations
    this.frustum = new THREE.Frustum();
    this.cameraMatrix = new THREE.Matrix4();
    
    // Culling configuration
    this.config = {
      enabled: true,
      maxRenderDistance: 20, // Maximum render distance in world units
      cullBackfaces: true,
      updateFrequency: 1, // Update frustum every N frames
      debugMode: false
    };
    
    // Culling statistics
    this.stats = {
      totalObjects: 0,
      visibleObjects: 0,
      culledObjects: 0,
      cullingTime: 0,
      frameCount: 0
    };
    
    // Object tracking
    this.cullableObjects = new Set();
    this.visibleObjects = new Set();
    this.culledObjects = new Set();
    
    // Performance tracking
    this.lastUpdateFrame = 0;
    
    console.log('FrustumCuller initialized');
  }

  /**
   * Enable frustum culling
   */
  enable() {
    this.config.enabled = true;
    console.log('Frustum culling enabled');
  }

  /**
   * Disable frustum culling
   */
  disable() {
    this.config.enabled = false;
    
    // Make all objects visible when disabled
    for (const object of this.cullableObjects) {
      object.visible = true;
    }
    
    console.log('Frustum culling disabled');
  }

  /**
   * Register an object for frustum culling
   * @param {THREE.Object3D} object - Object to register
   * @param {Object} options - Culling options
   */
  registerObject(object, options = {}) {
    if (!object || !object.isObject3D) {
      console.warn('Invalid object for frustum culling');
      return;
    }
    
    // Add culling metadata
    object.userData.culling = {
      enabled: options.enabled !== false,
      priority: options.priority || 0,
      minDistance: options.minDistance || 0,
      maxDistance: options.maxDistance || this.config.maxRenderDistance,
      boundingSphere: null,
      lastVisible: true
    };
    
    // Calculate bounding sphere for efficient culling
    this.calculateBoundingSphere(object);
    
    this.cullableObjects.add(object);
    this.stats.totalObjects++;
    
    console.log(`Registered object for culling: ${object.type || 'Object3D'}`);
  }

  /**
   * Unregister an object from frustum culling
   * @param {THREE.Object3D} object - Object to unregister
   */
  unregisterObject(object) {
    if (this.cullableObjects.has(object)) {
      this.cullableObjects.delete(object);
      this.visibleObjects.delete(object);
      this.culledObjects.delete(object);
      this.stats.totalObjects--;
      
      // Ensure object is visible when unregistered
      object.visible = true;
      
      console.log(`Unregistered object from culling: ${object.type || 'Object3D'}`);
    }
  }

  /**
   * Update frustum culling for current frame
   * @param {number} frameCount - Current frame count
   */
  update(frameCount) {
    if (!this.config.enabled || this.cullableObjects.size === 0) {
      return;
    }
    
    this.stats.frameCount = frameCount;
    
    // Update frustum only at specified frequency
    if (frameCount - this.lastUpdateFrame >= this.config.updateFrequency) {
      this.updateFrustum();
      this.performCulling();
      this.lastUpdateFrame = frameCount;
    }
  }

  /**
   * Update camera frustum
   */
  updateFrustum() {
    // Update camera matrix
    this.camera.updateMatrixWorld();
    this.cameraMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    
    // Update frustum
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);
  }

  /**
   * Perform frustum culling on all registered objects
   */
  performCulling() {
    const startTime = performance.now();
    
    let visibleCount = 0;
    let culledCount = 0;
    
    // Clear previous frame data
    this.visibleObjects.clear();
    this.culledObjects.clear();
    
    for (const object of this.cullableObjects) {
      const cullingData = object.userData.culling;
      
      if (!cullingData || !cullingData.enabled) {
        object.visible = true;
        this.visibleObjects.add(object);
        visibleCount++;
        continue;
      }
      
      // Check if object should be culled
      const shouldCull = this.shouldCullObject(object, cullingData);
      
      if (shouldCull) {
        object.visible = false;
        this.culledObjects.add(object);
        culledCount++;
        cullingData.lastVisible = false;
      } else {
        object.visible = true;
        this.visibleObjects.add(object);
        visibleCount++;
        cullingData.lastVisible = true;
      }
    }
    
    // Update statistics
    this.stats.visibleObjects = visibleCount;
    this.stats.culledObjects = culledCount;
    this.stats.cullingTime = performance.now() - startTime;
    
    if (this.config.debugMode) {
      console.log(`Culling: ${visibleCount} visible, ${culledCount} culled (${this.stats.cullingTime.toFixed(2)}ms)`);
    }
  }

  /**
   * Determine if an object should be culled
   * @param {THREE.Object3D} object - Object to check
   * @param {Object} cullingData - Culling metadata
   * @returns {boolean} True if object should be culled
   */
  shouldCullObject(object, cullingData) {
    // Distance culling
    const distance = this.camera.position.distanceTo(object.position);
    
    if (distance < cullingData.minDistance || distance > cullingData.maxDistance) {
      return true;
    }
    
    // Frustum culling using bounding sphere
    if (cullingData.boundingSphere) {
      const sphere = cullingData.boundingSphere.clone();
      sphere.applyMatrix4(object.matrixWorld);
      
      if (!this.frustum.intersectsSphere(sphere)) {
        return true;
      }
    }
    
    // Additional culling checks can be added here
    // (e.g., occlusion culling, LOD-based culling)
    
    return false;
  }

  /**
   * Calculate bounding sphere for an object
   * @param {THREE.Object3D} object - Object to calculate bounds for
   */
  calculateBoundingSphere(object) {
    const cullingData = object.userData.culling;
    
    if (object.geometry) {
      // For meshes with geometry
      if (!object.geometry.boundingSphere) {
        object.geometry.computeBoundingSphere();
      }
      cullingData.boundingSphere = object.geometry.boundingSphere.clone();
    } else {
      // For other objects, create a default bounding sphere
      const box = new THREE.Box3().setFromObject(object);
      cullingData.boundingSphere = new THREE.Sphere();
      box.getBoundingSphere(cullingData.boundingSphere);
    }
    
    // Ensure minimum radius for very small objects
    if (cullingData.boundingSphere.radius < 0.1) {
      cullingData.boundingSphere.radius = 0.1;
    }
  }

  /**
   * Set maximum render distance
   * @param {number} distance - Maximum render distance
   */
  setMaxRenderDistance(distance) {
    this.config.maxRenderDistance = distance;
    
    // Update all registered objects
    for (const object of this.cullableObjects) {
      if (object.userData.culling) {
        object.userData.culling.maxDistance = Math.min(
          object.userData.culling.maxDistance,
          distance
        );
      }
    }
    
    console.log(`Max render distance set to ${distance}`);
  }

  /**
   * Set culling update frequency
   * @param {number} frequency - Update frequency (frames)
   */
  setUpdateFrequency(frequency) {
    this.config.updateFrequency = Math.max(1, frequency);
    console.log(`Culling update frequency set to ${frequency} frames`);
  }

  /**
   * Enable debug mode
   */
  enableDebugMode() {
    this.config.debugMode = true;
    console.log('Frustum culling debug mode enabled');
  }

  /**
   * Disable debug mode
   */
  disableDebugMode() {
    this.config.debugMode = false;
    console.log('Frustum culling debug mode disabled');
  }

  /**
   * Get objects within camera frustum
   * @returns {Array} Array of visible objects
   */
  getVisibleObjects() {
    return Array.from(this.visibleObjects);
  }

  /**
   * Get objects outside camera frustum
   * @returns {Array} Array of culled objects
   */
  getCulledObjects() {
    return Array.from(this.culledObjects);
  }

  /**
   * Get culling statistics
   * @returns {Object} Culling statistics
   */
  getStats() {
    return {
      ...this.stats,
      cullingRatio: this.stats.totalObjects > 0 ? 
        this.stats.culledObjects / this.stats.totalObjects : 0,
      efficiency: this.stats.cullingTime > 0 ? 
        this.stats.totalObjects / this.stats.cullingTime : 0
    };
  }

  /**
   * Optimize culling performance
   */
  optimize() {
    console.log('Optimizing frustum culling performance...');
    
    // Adjust update frequency based on performance
    const avgCullingTime = this.stats.cullingTime;
    
    if (avgCullingTime > 2) { // If culling takes more than 2ms
      this.config.updateFrequency = Math.min(this.config.updateFrequency + 1, 5);
      console.log(`Increased culling frequency to ${this.config.updateFrequency} frames`);
    } else if (avgCullingTime < 0.5 && this.config.updateFrequency > 1) {
      this.config.updateFrequency = Math.max(this.config.updateFrequency - 1, 1);
      console.log(`Decreased culling frequency to ${this.config.updateFrequency} frames`);
    }
    
    // Remove objects that are never visible
    const objectsToRemove = [];
    for (const object of this.cullableObjects) {
      const cullingData = object.userData.culling;
      if (cullingData && !cullingData.lastVisible) {
        // Could implement logic to remove permanently invisible objects
      }
    }
  }

  /**
   * Verify frustum culling is working correctly
   * @returns {Object} Verification results
   */
  verify() {
    console.log('Verifying frustum culling...');
    
    const results = {
      totalObjects: this.stats.totalObjects,
      registeredObjects: this.cullableObjects.size,
      visibleObjects: this.stats.visibleObjects,
      culledObjects: this.stats.culledObjects,
      averageCullingTime: this.stats.cullingTime,
      issues: []
    };
    
    // Check for issues
    if (this.stats.culledObjects === 0 && this.stats.totalObjects > 10) {
      results.issues.push('No objects being culled - check frustum calculation');
    }
    
    if (this.stats.cullingTime > 5) {
      results.issues.push('Culling taking too long - consider reducing update frequency');
    }
    
    if (this.cullableObjects.size !== this.stats.totalObjects) {
      results.issues.push('Mismatch between registered and tracked objects');
    }
    
    console.log('Frustum culling verification:', results);
    return results;
  }

  /**
   * Clear all registered objects
   */
  clear() {
    for (const object of this.cullableObjects) {
      object.visible = true;
    }
    
    this.cullableObjects.clear();
    this.visibleObjects.clear();
    this.culledObjects.clear();
    
    this.stats.totalObjects = 0;
    this.stats.visibleObjects = 0;
    this.stats.culledObjects = 0;
    
    console.log('Frustum culler cleared');
  }

  /**
   * Dispose of frustum culler
   */
  dispose() {
    this.clear();
    console.log('FrustumCuller disposed');
  }
}