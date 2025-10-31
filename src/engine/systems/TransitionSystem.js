/**
 * @fileoverview TransitionSystem - Level transition management with fade effects
 * Handles level transitions, fade overlays, and coordination between systems
 */

/**
 * TransitionSystem manages level transitions with smooth fade effects
 * Coordinates input blocking, level loading, and visual feedback
 */
export class TransitionSystem {
  constructor(dungeonLoader, movementController, inputManager) {
    this.dungeonLoader = dungeonLoader;
    this.movementController = movementController;
    this.inputManager = inputManager;
    
    this.isTransitioning = false;
    this.fadeOverlay = null;
    this.transitionQueue = [];
    
    // Transition timing (requirement 5.2, 5.4)
    this.FADE_DURATION = 300; // milliseconds
    
    this.initializeFadeOverlay();
  }

  /**
   * Initialize the fade overlay element (requirement 5.2)
   */
  initializeFadeOverlay() {
    // Check if overlay already exists
    this.fadeOverlay = document.getElementById('fade-overlay');
    
    if (!this.fadeOverlay) {
      // Create fade overlay element
      this.fadeOverlay = document.createElement('div');
      this.fadeOverlay.id = 'fade-overlay';
      this.fadeOverlay.className = 'fade-overlay';
      
      // Add to game container
      const gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        gameContainer.appendChild(this.fadeOverlay);
      } else {
        console.error('Game container not found, cannot add fade overlay');
        return;
      }
    }
    
    console.log('Fade overlay initialized');
  }

  /**
   * Start level transition with fade effects (requirement 5.1, 5.2)
   * @param {Object} transitionData - Transition information from collision system
   * @returns {Promise<boolean>} Success status of transition
   */
  async startTransition(transitionData) {
    if (this.isTransitioning) {
      console.log('Transition already in progress, queuing request');
      return new Promise((resolve) => {
        this.transitionQueue.push({ transitionData, resolve });
      });
    }

    console.log('Starting level transition:', transitionData);
    
    try {
      this.isTransitioning = true;
      
      // Block input during transition (requirement 5.2)
      this.blockInput();
      
      // Phase 1: Fade out (requirement 5.2)
      await this.fadeOut();
      
      // Phase 2: Load new level (requirement 5.3)
      await this.loadTargetLevel(transitionData);
      
      // Phase 3: Fade in (requirement 5.4)
      await this.fadeIn();
      
      // Restore input
      this.unblockInput();
      
      this.isTransitioning = false;
      
      // Process queued transitions
      this.processTransitionQueue();
      
      console.log('Level transition completed successfully');
      return true;
      
    } catch (error) {
      console.error('Level transition failed:', error);
      
      // Restore input even on failure
      this.unblockInput();
      this.isTransitioning = false;
      
      // Show error message
      this.showTransitionError(error.message);
      
      return false;
    }
  }

  /**
   * Fade screen to black (requirement 5.2)
   * @returns {Promise<void>}
   */
  async fadeOut() {
    return new Promise((resolve) => {
      if (!this.fadeOverlay) {
        console.error('Fade overlay not available');
        resolve();
        return;
      }
      
      console.log('Fading out...');
      
      // Set initial state
      this.fadeOverlay.style.opacity = '0';
      this.fadeOverlay.style.display = 'block';
      
      // Force reflow to ensure initial state is applied
      this.fadeOverlay.offsetHeight;
      
      // Add active class to trigger CSS transition
      this.fadeOverlay.classList.add('active');
      
      // Wait for transition to complete
      setTimeout(() => {
        console.log('Fade out complete');
        resolve();
      }, this.FADE_DURATION);
    });
  }

  /**
   * Fade screen from black (requirement 5.4)
   * @returns {Promise<void>}
   */
  async fadeIn() {
    return new Promise((resolve) => {
      if (!this.fadeOverlay) {
        console.error('Fade overlay not available');
        resolve();
        return;
      }
      
      console.log('Fading in...');
      
      // Remove active class to trigger fade in
      this.fadeOverlay.classList.remove('active');
      
      // Wait for transition to complete
      setTimeout(() => {
        this.fadeOverlay.style.display = 'none';
        console.log('Fade in complete');
        resolve();
      }, this.FADE_DURATION);
    });
  }

  /**
   * Load target level and set up player spawn (requirement 5.3, 5.4)
   * @param {Object} transitionData - Transition information
   */
  async loadTargetLevel(transitionData) {
    const { targetLevel, targetSpawn } = transitionData;
    
    if (!targetLevel) {
      throw new Error('No target level specified in transition data');
    }
    
    console.log(`Loading target level: ${targetLevel}`);
    
    try {
      // Construct level file path
      const levelPath = `./levels/${targetLevel}.json`;
      
      // Load the new level
      console.log(`Attempting to load level from: ${levelPath}`);
      await this.dungeonLoader.loadLevelFromFile(levelPath);
      
      // Verify level was loaded
      if (!this.dungeonLoader.isLevelLoaded()) {
        throw new Error('Level failed to load properly');
      }
      
      // Set up player spawn position (requirement 5.4)
      if (targetSpawn) {
        // Use spawn point from transition data
        console.log(`Setting player spawn from transition data: (${targetSpawn.x}, ${targetSpawn.z}, ${targetSpawn.direction || 0})`);
        this.movementController.setPosition(
          targetSpawn.x, 
          targetSpawn.z, 
          targetSpawn.direction || 0
        );
      } else {
        // Use default spawn point from level data
        console.log('Setting player spawn from level data');
        this.dungeonLoader.setupPlayerSpawn(this.movementController);
      }
      
      // Update camera to new position
      const worldPos = this.movementController.getCurrentWorldPosition();
      const rotation = this.movementController.getCurrentRotation();
      
      console.log(`Updating camera position: (${worldPos.x}, ${worldPos.z}) rotation: ${rotation}`);
      
      if (this.dungeonLoader.renderer) {
        this.dungeonLoader.renderer.updateCameraPosition(worldPos);
        this.dungeonLoader.renderer.updateCameraRotation(rotation);
      }
      
      // Log level statistics for debugging
      const stats = this.dungeonLoader.getLevelStats();
      console.log('Level loaded successfully:', stats);
      
    } catch (error) {
      console.error(`Failed to load level "${targetLevel}":`, error);
      throw new Error(`Failed to load level "${targetLevel}": ${error.message}`);
    }
  }

  /**
   * Block input during transitions (requirement 5.2)
   */
  blockInput() {
    if (this.inputManager && this.inputManager.blockInput) {
      this.inputManager.blockInput();
      console.log('Input blocked for transition');
    }
  }

  /**
   * Restore input after transitions (requirement 5.4)
   */
  unblockInput() {
    if (this.inputManager && this.inputManager.unblockInput) {
      this.inputManager.unblockInput();
      console.log('Input restored after transition');
    }
  }

  /**
   * Process queued transitions
   */
  processTransitionQueue() {
    if (this.transitionQueue.length > 0) {
      const { transitionData, resolve } = this.transitionQueue.shift();
      this.startTransition(transitionData).then(resolve);
    }
  }

  /**
   * Show transition error message
   * @param {string} message - Error message to display
   */
  showTransitionError(message) {
    // Emit error event for UI feedback
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent('transitionError', {
        detail: { message }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Check if currently transitioning
   * @returns {boolean} True if transition is in progress
   */
  isTransitionInProgress() {
    return this.isTransitioning;
  }

  /**
   * Get transition queue length
   * @returns {number} Number of queued transitions
   */
  getQueueLength() {
    return this.transitionQueue.length;
  }

  /**
   * Cancel all queued transitions
   */
  clearTransitionQueue() {
    // Reject all queued promises
    this.transitionQueue.forEach(({ resolve }) => {
      resolve(false);
    });
    
    this.transitionQueue = [];
    console.log('Transition queue cleared');
  }

  /**
   * Dispose of transition system resources
   */
  dispose() {
    this.clearTransitionQueue();
    
    // Remove fade overlay
    if (this.fadeOverlay && this.fadeOverlay.parentNode) {
      this.fadeOverlay.parentNode.removeChild(this.fadeOverlay);
    }
    
    this.dungeonLoader = null;
    this.movementController = null;
    this.inputManager = null;
    this.fadeOverlay = null;
    
    console.log('TransitionSystem disposed');
  }
}