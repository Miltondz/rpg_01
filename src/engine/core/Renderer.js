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
   * Create Three.js scene with Dark-Bit Glitch settings
   */
  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // pitch black
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
   * Create WebGL renderer with retro pixel-art settings.
   * Initial buffer size uses canvas CSS dimensions; ResolutionManager calls
   * setResolution() to set the final size after CSS layout.
   */
  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance'
    });

    // Bootstrap at current layout size; ResolutionManager will override this
    const w = this.canvas.clientWidth  || 1024;
    const h = this.canvas.clientHeight || 768;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.renderer.setClearColor(0x000000, 1.0);
  }

  /** Called by ResolutionManager to set buffer + camera aspect. */
  setResolution(w, h) {
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Dark-Bit Glitch lighting:
   *   Hemisphere:  dark blue-ash ceiling / near-black floor — base fill that keeps
   *                geometry readable without washing out the high-contrast pixel-art
   *   Ambient:     dark charcoal-blue — ensures tiles beyond torch range aren't pure void
   *   Lantern:     cool near-white, wide range — primary reveal light, flickers
   *   Cyan rim:    electric cyan — digital corruption accent, hits back-walls
   *   Magenta:     neon magenta — very faint deep-shadow tint
   */
  setupLighting() {
    // Hemisphere: dark blue-ash top / near-black floor
    this.hemisphereLight = new THREE.HemisphereLight(0x1c1c2e, 0x05050a, 0.65);
    this.scene.add(this.hemisphereLight);

    // Ambient fill — slightly brighter for PBR materials (was 0.50)
    this.ambientLight = new THREE.AmbientLight(0x303045, 0.65);
    this.scene.add(this.ambientLight);

    // Primary lantern — boosted intensity for PBR normal-map reads
    this._torchBase = 1.2;
    this.pointLight = new THREE.PointLight(0xeef0cc, this._torchBase, 22, 1.5);
    this.pointLight.position.set(0, 0.1, 0.5);
    this.camera.add(this.pointLight);

    // Cyan rim — electric digital glow behind camera (boosted slightly)
    this.rimLight = new THREE.PointLight(0x00ffee, 0.40, 12, 2);
    this.rimLight.position.set(0, 0.2, -1.2);
    this.camera.add(this.rimLight);

    // Magenta accent — faint deep-shadow tint
    this.accentLight = new THREE.PointLight(0xff00cc, 0.16, 7, 2);
    this.accentLight.position.set(0.8, -0.3, 0.8);
    this.camera.add(this.accentLight);

    this.scene.add(this.camera);
    console.log('Lighting system configured');
  }

  /**
   * Fog — very dark blue-black exponential.
   * Color 0x05050e (not pure black) so tiles at 4-6 tiles still carry some hue.
   * Density 0.055 keeps ~4 tiles ahead readable before fade.
   */
  setupFog() {
    this.scene.fog = new THREE.FogExp2(0x05050e, 0.055);
    console.log('Fog effects configured');
  }

  /**
   * Apply renderer settings from a theme object.
   * Safe to call after initialize() — only sets what is present in theme.renderer.
   * @param {object} theme  Full theme object (see CryptTheme.js)
   */
  applyTheme(theme) {
    const t = theme?.renderer;
    if (!t) return;
    if (this.scene?.fog) {
      if (t.fogColor     !== undefined) this.scene.fog.color.setHex(t.fogColor);
      if (t.fogDensity   !== undefined) this.scene.fog.density = t.fogDensity;
    }
    if (this.ambientLight) {
      if (t.ambientColor     !== undefined) this.ambientLight.color.setHex(t.ambientColor);
      if (t.ambientIntensity !== undefined) this.ambientLight.intensity = t.ambientIntensity;
    }
    if (this.hemisphereLight) {
      if (t.hemiSkyColor    !== undefined) this.hemisphereLight.color.setHex(t.hemiSkyColor);
      if (t.hemiGroundColor !== undefined) this.hemisphereLight.groundColor.setHex(t.hemiGroundColor);
      if (t.hemiIntensity   !== undefined) this.hemisphereLight.intensity = t.hemiIntensity;
    }
    if (this.pointLight) {
      if (t.torchColor     !== undefined) this.pointLight.color.setHex(t.torchColor);
      if (t.torchIntensity !== undefined) this._torchBase = t.torchIntensity;
    }
    if (this.rimLight) {
      if (t.rimColor     !== undefined) this.rimLight.color.setHex(t.rimColor);
      if (t.rimIntensity !== undefined) this.rimLight.intensity = t.rimIntensity;
    }
    if (this.accentLight) {
      if (t.accentColor     !== undefined) this.accentLight.color.setHex(t.accentColor);
      if (t.accentIntensity !== undefined) this.accentLight.intensity = t.accentIntensity;
    }
    if (this.renderer && t.clearColor !== undefined) {
      this.renderer.setClearColor(t.clearColor, 1);
    }
  }

  /**
   * Handle window resize events
   */
  handleResize() {
    if (!this.camera || !this.renderer) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
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
    
    // Remove Mesh objects only — lights and camera are children of scene/camera and stay
    const objectsToRemove = [];
    this.scene.traverse((object) => {
      if (object.isMesh) objectsToRemove.push(object);
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
   * Animate torch intensity — three desynced sine waves for natural flicker.
   * Factor range 0.72–1.0 × _torchBase, so intensity never diverges from base.
   */
  updateTorchFlicker(time) {
    if (!this.pointLight) return;
    const t = time * 0.001;
    const factor =
      0.88 +
      Math.sin(t * 2.1)  * 0.07 +
      Math.sin(t * 7.3)  * 0.04 +
      Math.sin(t * 19.7) * 0.02;
    this.pointLight.intensity = this._torchBase * Math.max(0.72, Math.min(1.0, factor));
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