// Movement Controller - Player movement, rotation, and animation
import { Dir } from '../core/Direction.js';
import { Logger } from '../utils/Logger.js';

const log = Logger.tag('Movement');

export class MovementController {
  constructor(gridSystem, collisionSystem, renderer) {
    this.gridSystem = gridSystem;
    this.collisionSystem = collisionSystem;
    this.renderer = renderer;

    this.currentPosition = {x: 0, z: 0};
    this.currentDirection = Dir.NORTH; // 0=N, 1=E, 2=S, 3=W (see core/Direction.js)
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
    const d = Dir.forward(this.currentDirection);
    return { x: this.currentPosition.x + d.x, z: this.currentPosition.z + d.z };
  }

  // Calculate backward position
  calculateBackwardPosition() {
    const d = Dir.backward(this.currentDirection);
    return { x: this.currentPosition.x + d.x, z: this.currentPosition.z + d.z };
  }

  // Calculate strafe left position
  calculateStrafeLeftPosition() {
    const d = Dir.left(this.currentDirection);
    return { x: this.currentPosition.x + d.x, z: this.currentPosition.z + d.z };
  }

  // Calculate strafe right position
  calculateStrafeRightPosition() {
    const d = Dir.right(this.currentDirection);
    return { x: this.currentPosition.x + d.x, z: this.currentPosition.z + d.z };
  }

  // Movement methods that return promises for animation completion
  async moveForward() {
    if (this.isAnimating || !this.isEnabled()) return false;

    const targetPos = this.calculateForwardPosition();
    log.debug(`forward: dir=${Dir.name(this.currentDirection)} (${this.currentPosition.x},${this.currentPosition.z}) -> (${targetPos.x},${targetPos.z})`);
    
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
    log.debug(`backward: dir=${Dir.name(this.currentDirection)} (${this.currentPosition.x},${this.currentPosition.z}) -> (${targetPos.x},${targetPos.z})`);
    
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
    log.debug(`strafeLeft: dir=${Dir.name(this.currentDirection)} (${this.currentPosition.x},${this.currentPosition.z}) -> (${targetPos.x},${targetPos.z})`);
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
    log.debug(`strafeRight: dir=${Dir.name(this.currentDirection)} (${this.currentPosition.x},${this.currentPosition.z}) -> (${targetPos.x},${targetPos.z})`);
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
    const targetDirection = Dir.turnLeft(this.currentDirection);
    log.debug(`turnLeft: ${Dir.name(startDirection)} -> ${Dir.name(targetDirection)}`);
    return this._animateRotation(startDirection, targetDirection);
  }

  // Turn right (clockwise)
  async turnRight() {
    if (this.isAnimating || !this.isEnabled()) return;

    const startDirection = this.currentDirection;
    const targetDirection = Dir.turnRight(this.currentDirection);
    log.debug(`turnRight: ${Dir.name(startDirection)} -> ${Dir.name(targetDirection)}`);
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

      if (this.renderer && this.renderer.updateCameraPosition) {
        this.renderer.updateCameraPosition(currentWorldPos);
      }

      // Camera bob — half-sine over movement progress
      const bobY = Math.sin(progress * Math.PI) * 0.06;
      if (this.renderer?.camera) {
        this.renderer.camera.position.y = 1.5 + bobY;
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

  // Convert direction index to radians (canonical, sourced from Direction.js)
  _directionToRadians(direction) {
    return Dir.toRadians(direction);
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