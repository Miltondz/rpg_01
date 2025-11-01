// Movement Controller - Player movement, rotation, and animation
export class MovementController {
  constructor(gridSystem, collisionSystem, renderer) {
    this.gridSystem = gridSystem;
    this.collisionSystem = collisionSystem;
    this.renderer = renderer;
    
    this.currentPosition = {x: 0, z: 0};
    this.currentDirection = 0; // 0=North, 1=East, 2=South, 3=West
    this.isAnimating = false;
    this.animationData = null;
    
    // Animation durations (in milliseconds)
    this.MOVE_DURATION = 250;
    this.TURN_DURATION = 200;
  }

  // Get current position
  getPosition() {
    return {...this.currentPosition};
  }

  // Get current direction
  getDirection() {
    return this.currentDirection;
  }

  // Set position (for initialization)
  setPosition(x, z, direction = null) {
    this.currentPosition = {x, z};
    if (direction !== null) {
      this.currentDirection = direction;
    }
  }

  // Calculate forward position based on current direction
  calculateForwardPosition() {
    // CORRECTED: Invert North/South to match Three.js camera directions
    const directions = [
      {x: 0, z: 1},  // North (toward positive Z in grid, matches camera -Z)
      {x: 1, z: 0},  // East (toward positive X)
      {x: 0, z: -1}, // South (toward negative Z in grid, matches camera +Z)
      {x: -1, z: 0}  // West (toward negative X)
    ];
    
    const dir = directions[this.currentDirection];
    const targetPos = {
      x: this.currentPosition.x + dir.x,
      z: this.currentPosition.z + dir.z
    };
    
    return targetPos;
  }

  // Calculate backward position
  calculateBackwardPosition() {
    // Backward is opposite of forward - CORRECTED
    const directions = [
      {x: 0, z: -1}, // South (opposite of corrected North)
      {x: -1, z: 0}, // West (opposite of East)
      {x: 0, z: 1},  // North (opposite of corrected South)
      {x: 1, z: 0}   // East (opposite of West)
    ];
    
    const dir = directions[this.currentDirection];
    return {
      x: this.currentPosition.x + dir.x,
      z: this.currentPosition.z + dir.z
    };
  }

  // Calculate strafe left position
  calculateStrafeLeftPosition() {
    // Strafe left = 90 degrees counterclockwise from current direction - CORRECTED
    const directions = [
      {x: -1, z: 0}, // West (left of corrected North)
      {x: 0, z: 1},  // North (left of East) - CORRECTED
      {x: 1, z: 0},  // East (left of corrected South)
      {x: 0, z: -1}  // South (left of West) - CORRECTED
    ];
    
    const dir = directions[this.currentDirection];
    return {
      x: this.currentPosition.x + dir.x,
      z: this.currentPosition.z + dir.z
    };
  }

  // Calculate strafe right position
  calculateStrafeRightPosition() {
    // Strafe right = 90 degrees clockwise from current direction - CORRECTED
    const directions = [
      {x: 1, z: 0},  // East (right of corrected North)
      {x: 0, z: -1}, // South (right of East) - CORRECTED
      {x: -1, z: 0}, // West (right of corrected South)
      {x: 0, z: 1}   // North (right of West) - CORRECTED
    ];
    
    const dir = directions[this.currentDirection];
    return {
      x: this.currentPosition.x + dir.x,
      z: this.currentPosition.z + dir.z
    };
  }

  // Movement methods that return promises for animation completion
  async moveForward() {
    if (this.isAnimating || !this.isEnabled()) return false;
    
    const targetPos = this.calculateForwardPosition();
    const directionNames = ['North', 'East', 'South', 'West'];
    console.log(`FORWARD: Moving ${directionNames[this.currentDirection]} from (${this.currentPosition.x},${this.currentPosition.z}) to (${targetPos.x},${targetPos.z})`);
    
    const collision = await this.collisionSystem.checkMovement(
      this.currentPosition.x, this.currentPosition.z,
      targetPos.x, targetPos.z
    );
    
    if (collision.blocked) {
      console.log(`Movement blocked: ${collision.reason} - ${collision.message}`);
      this._handleCollisionFeedback(collision);
      return false;
    }
    
    // Handle special actions (like level transitions)
    if (collision.action) {
      this._handleSpecialAction(collision);
    }
    
    return this._animateMovement(targetPos);
  }

  async moveBackward() {
    if (this.isAnimating || !this.isEnabled()) return false;
    
    const targetPos = this.calculateBackwardPosition();
    const directionNames = ['North', 'East', 'South', 'West'];
    console.log(`BACKWARD: Moving opposite of ${directionNames[this.currentDirection]} from (${this.currentPosition.x},${this.currentPosition.z}) to (${targetPos.x},${targetPos.z})`);
    
    const collision = await this.collisionSystem.checkMovement(
      this.currentPosition.x, this.currentPosition.z,
      targetPos.x, targetPos.z
    );
    
    if (collision.blocked) {
      this._handleCollisionFeedback(collision);
      return false;
    }
    
    if (collision.action) {
      this._handleSpecialAction(collision);
    }
    
    return this._animateMovement(targetPos);
  }

  async strafeLeft() {
    if (this.isAnimating || !this.isEnabled()) return false;
    
    const targetPos = this.calculateStrafeLeftPosition();
    const collision = await this.collisionSystem.checkMovement(
      this.currentPosition.x, this.currentPosition.z,
      targetPos.x, targetPos.z
    );
    
    if (collision.blocked) {
      this._handleCollisionFeedback(collision);
      return false;
    }
    
    if (collision.action) {
      this._handleSpecialAction(collision);
    }
    
    return this._animateMovement(targetPos);
  }

  async strafeRight() {
    if (this.isAnimating || !this.isEnabled()) return false;
    
    const targetPos = this.calculateStrafeRightPosition();
    const collision = await this.collisionSystem.checkMovement(
      this.currentPosition.x, this.currentPosition.z,
      targetPos.x, targetPos.z
    );
    
    if (collision.blocked) {
      this._handleCollisionFeedback(collision);
      return false;
    }
    
    if (collision.action) {
      this._handleSpecialAction(collision);
    }
    
    return this._animateMovement(targetPos);
  }

  // Turn left (counterclockwise)
  async turnLeft() {
    if (this.isAnimating || !this.isEnabled()) return;
    
    const startDirection = this.currentDirection;
    // Turn left = decrease direction index (counterclockwise)
    const targetDirection = (this.currentDirection + 3) % 4; // Same as -1 but handles wrap-around
    
    console.log(`Turning left: ${startDirection} -> ${targetDirection}`);
    return this._animateRotation(startDirection, targetDirection);
  }

  // Turn right (clockwise)
  async turnRight() {
    if (this.isAnimating || !this.isEnabled()) return;
    
    const startDirection = this.currentDirection;
    // Turn right = increase direction index (clockwise)
    const targetDirection = (this.currentDirection + 1) % 4;
    
    console.log(`Turning right: ${startDirection} -> ${targetDirection}`);
    return this._animateRotation(startDirection, targetDirection);
  }

  // Check if currently animating
  getIsAnimating() {
    return this.isAnimating;
  }

  // Start animation
  startAnimation(type, startValue, targetValue, duration) {
    this.isAnimating = true;
    this.animationData = {
      type,
      startTime: performance.now(),
      duration,
      startValue,
      targetValue
    };
  }

  // Update animation (called each frame)
  update(deltaTime) {
    if (!this.isAnimating || !this.animationData) return;

    const elapsed = performance.now() - this.animationData.startTime;
    const progress = Math.min(elapsed / this.animationData.duration, 1.0);
    
    // Ease-out cubic easing
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    if (progress >= 1.0) {
      // Animation complete - set exact final values
      this._completeAnimation();
      return;
    }

    // Update camera based on animation type
    if (this.animationData.type === 'position') {
      const currentWorldPos = {
        x: this.animationData.startValue.x + (this.animationData.targetValue.x - this.animationData.startValue.x) * easedProgress,
        z: this.animationData.startValue.z + (this.animationData.targetValue.z - this.animationData.startValue.z) * easedProgress
      };
      
      // Update camera position
      if (this.renderer && this.renderer.updateCameraPosition) {
        this.renderer.updateCameraPosition(currentWorldPos);
      }
      
    } else if (this.animationData.type === 'rotation') {
      const currentRotation = this.animationData.startValue + (this.animationData.targetValue - this.animationData.startValue) * easedProgress;
      
      // Update camera rotation
      if (this.renderer && this.renderer.updateCameraRotation) {
        this.renderer.updateCameraRotation(currentRotation);
      }
    }
  }

  // Private method to animate movement
  async _animateMovement(targetGridPos) {
    return new Promise((resolve) => {
      const startWorldPos = this.gridSystem.gridToWorld(this.currentPosition.x, this.currentPosition.z);
      const targetWorldPos = this.gridSystem.gridToWorld(targetGridPos.x, targetGridPos.z);
      
      this.startAnimation('position', startWorldPos, targetWorldPos, this.MOVE_DURATION);
      this.animationData.onComplete = () => {
        // Update grid position to exact target
        this.currentPosition = { ...targetGridPos };
        
        // Emit movement completed event
        this._emitMovementCompleted(targetGridPos);
        
        resolve(true);
      };
    });
  }

  // Private method to animate rotation
  async _animateRotation(startDirection, targetDirection) {
    return new Promise((resolve) => {
      const startRadians = this._directionToRadians(startDirection);
      const targetRadians = this._directionToRadians(targetDirection);
      
      // ✅ ALGORITMO MEJORADO: Calcula diferencia primero
      let actualTarget = targetRadians;
      const diff = targetRadians - startRadians;
      
      // Elige el camino de rotación más corto
      if (Math.abs(diff) > Math.PI) {
        if (diff > 0) {
          actualTarget = targetRadians - 2 * Math.PI;
        } else {
          actualTarget = targetRadians + 2 * Math.PI;
        }
      }
      
      this.startAnimation('rotation', startRadians, actualTarget, this.TURN_DURATION);
      this.animationData.onComplete = () => {
        // Update direction to exact target
        this.currentDirection = targetDirection;
        resolve();
      };
    });
  }

  // Convert direction index to radians
  _directionToRadians(direction) {
    // ✅ MAPEO DIRECTO: Sin correcciones adicionales
    // Norte: 0° (mira hacia -Z), Este: 90° (mira hacia +X)
    // Sur: 180° (mira hacia +Z), Oeste: -90° (mira hacia -X)
    const angles = [
      0,              // Norte: 0° (mira hacia -Z)
      Math.PI / 2,    // Este: 90° (mira hacia +X)
      Math.PI,        // Sur: 180° (mira hacia +Z)
      -Math.PI / 2    // Oeste: -90° (mira hacia -X)
    ];
    console.log(`Converting direction ${direction} to ${angles[direction]} radians (${angles[direction] * 180 / Math.PI}°)`);
    return angles[direction];
  }

  // Complete animation and set exact final values
  _completeAnimation() {
    if (!this.animationData) return;
    
    const onComplete = this.animationData.onComplete;
    
    if (this.animationData.type === 'position') {
      // Set exact final world position
      if (this.renderer && this.renderer.updateCameraPosition) {
        this.renderer.updateCameraPosition(this.animationData.targetValue);
      }
    } else if (this.animationData.type === 'rotation') {
      // Set exact final rotation
      if (this.renderer && this.renderer.updateCameraRotation) {
        this.renderer.updateCameraRotation(this.animationData.targetValue);
      }
    }
    
    // Clear animation state first
    this.isAnimating = false;
    this.animationData = null;
    
    // Call completion callback after clearing state
    if (onComplete) {
      onComplete();
    }
  }

  // Get current world position for camera
  getCurrentWorldPosition() {
    return this.gridSystem.gridToWorld(this.currentPosition.x, this.currentPosition.z);
  }

  // Get current rotation in radians
  getCurrentRotation() {
    return this._directionToRadians(this.currentDirection);
  }

  // Handle collision feedback (can be overridden or extended)
  _handleCollisionFeedback(collision) {
    // Log collision for debugging
    console.log(`Movement blocked: ${collision.reason} - ${collision.message}`);
    
    // Emit event for UI feedback (if event system is available)
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent('movementBlocked', {
        detail: {
          reason: collision.reason,
          message: collision.message,
          data: collision.data
        }
      });
      window.dispatchEvent(event);
    }
  }

  // Handle special actions from collision system
  _handleSpecialAction(collision) {
    switch (collision.action) {
      case 'door_opened':
        console.log('Door opened automatically');
        // Emit door opened event
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          const event = new CustomEvent('doorOpened', {
            detail: { tile: collision.data }
          });
          window.dispatchEvent(event);
        }
        break;
        
      case 'level_transition':
        console.log('Level transition triggered');
        // Emit level transition event
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          const event = new CustomEvent('levelTransition', {
            detail: {
              transitionData: collision.transitionData,
              currentPosition: this.currentPosition
            }
          });
          window.dispatchEvent(event);
        }
        break;
        
      default:
        console.log(`Unknown action: ${collision.action}`);
    }
  }

  // Emit movement completed event for game loop integration
  _emitMovementCompleted(newPosition) {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent('movementCompleted', {
        detail: {
          newPosition: newPosition,
          previousPosition: this.currentPosition,
          direction: this.currentDirection,
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(event);
    }
  }

  // Add method to enable/disable movement (for combat)
  setEnabled(enabled) {
    this.movementEnabled = enabled !== false;
  }

  // Check if movement is enabled
  isEnabled() {
    return this.movementEnabled !== false;
  }
}