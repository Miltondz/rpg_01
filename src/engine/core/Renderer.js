/**
 * Renderer - Three.js scene, camera, and rendering management
 * Handles all 3D rendering operations with retro aesthetic settings
 */

export class Renderer {
  constructor(canvas) {
    if (!canvas) {
      throw new Error('Canvas element is required for Renderer');
    }
    
    this.canvas = canvas;
    
    // Three.js core components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Lighting components
    this.ambientLight = null;
    this.pointLight = null;
    
    // Render settings
    this.fogNear = 1;
    this.fogFar = 12;
    
    this.initialize();
  }

  /**
   * Initialize Three.js scene, camera, and renderer
   */
  initialize() {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.setupLighting();
    this.setupFog();
    
    console.log('Renderer initialized successfully');
  }

  /**
   * Create Three.js scene with retro settings
   */
  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // Black background for retro feel
  }

  /**
   * Configure perspective camera with 60° FOV and proper aspect ratio handling
   */
  createCamera() {
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    
    this.camera = new THREE.PerspectiveCamera(
      60,    // Field of view (60 degrees as specified)
      aspect, // Aspect ratio
      0.1,   // Near clipping plane
      100    // Far clipping plane
    );
    
    // Set initial camera position (will be updated by MovementController)
    this.camera.position.set(0, 1.5, 0); // Eye level height
    
    // CAMERA FIX: Set initial rotation to ensure correct orientation
    // In Three.js, default camera looks down -Z axis (which should be North in our system)
    this.camera.rotation.set(0, 0, 0); // Explicit initial rotation
  }

  /**
   * Create WebGL renderer with retro settings
   */
  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // Disable antialiasing for retro pixelated look
      alpha: false,     // No transparency needed
      powerPreference: 'high-performance'
    });
    
    // Set renderer size
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    
    // Disable shadow mapping for now (retro games didn't have complex shadows)
    this.renderer.shadowMap.enabled = false;
    
    // Set clear color to black
    this.renderer.setClearColor(0x000000, 1.0);
  }

  /**
   * Set up lighting system (ambient light, point light attached to camera, fog effects)
   */
  setupLighting() {
    // Ambient light - low intensity warm white for basic illumination
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);
    
    // Point light attached to camera - simulates torch/lantern effect
    this.pointLight = new THREE.PointLight(
      0xff8800, // Orange color for torch-like effect
      1.0,      // Intensity
      10,       // Range (10 meters)
      2         // Decay factor
    );
    
    // Position light slightly above and forward of camera
    this.pointLight.position.set(0, 0.2, 0.5);
    
    // Attach light to camera so it moves with player
    this.camera.add(this.pointLight);
    this.scene.add(this.camera);
    
    console.log('Lighting system configured');
  }

  /**
   * Set up fog effects for atmospheric depth
   */
  setupFog() {
    // Black fog that starts close and becomes opaque at distance
    this.scene.fog = new THREE.Fog(
      0x000000,    // Black fog color
      this.fogNear, // Start distance (1 meter)
      this.fogFar   // Full opacity distance (12 meters)
    );
    
    console.log('Fog effects configured');
  }

  /**
   * Handle window resize events
   */
  handleResize() {
    if (!this.camera || !this.renderer) return;
    
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    // Update camera aspect ratio
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    // Update renderer size
    this.renderer.setSize(width, height);
    
    console.log(`Renderer resized to ${width}x${height}`);
  }

  /**
   * Update camera position and rotation
   */
  updateCamera(position, rotation) {
    if (!this.camera) return;
    
    // Update camera position (add eye level height)
    this.camera.position.set(
      position.x,
      position.y + 1.5, // Eye level height
      position.z
    );
    
    // Update camera rotation
    this.camera.rotation.set(
      rotation.x,
      rotation.y,
      rotation.z
    );
  }

  /**
   * Update only camera position (for movement animations)
   */
  updateCameraPosition(position) {
    if (!this.camera) return;
    
    this.camera.position.set(
      position.x,
      1.5, // Eye level height
      position.z
    );
  }

  /**
   * Update only camera rotation (for turn animations)
   */
  updateCameraRotation(yRotation) {
    if (!this.camera) return;
    
    // ✅ ASIGNACIÓN DIRECTA: Solo modifica el eje Y
    this.camera.rotation.y = yRotation;
  }

  /**
   * Add geometry to the scene
   */
  addToScene(object) {
    if (object && this.scene) {
      this.scene.add(object);
    }
  }

  /**
   * Remove geometry from the scene
   */
  removeFromScene(object) {
    if (object && this.scene) {
      this.scene.remove(object);
    }
  }

  /**
   * Clear all objects from the scene (except lights and camera)
   */
  clearScene() {
    if (!this.scene) return;
    
    // Remove all objects except lights and camera
    const objectsToRemove = [];
    this.scene.traverse((object) => {
      if (object !== this.camera && 
          object !== this.ambientLight && 
          object !== this.pointLight &&
          object.type === 'Mesh') {
        objectsToRemove.push(object);
      }
    });
    
    objectsToRemove.forEach(object => {
      this.scene.remove(object);
      
      // Dispose of geometry and materials to free memory
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    console.log('Scene cleared');
  }

  /**
   * Render the scene
   */
  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Get the Three.js scene object
   */
  getScene() {
    return this.scene;
  }

  /**
   * Get the Three.js camera object
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Get the Three.js renderer object
   */
  getRenderer() {
    return this.renderer;
  }

  /**
   * Dispose of renderer resources
   */
  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    // Clear scene
    this.clearScene();
    
    console.log('Renderer disposed');
  }
}