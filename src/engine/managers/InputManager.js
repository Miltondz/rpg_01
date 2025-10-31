/**
 * @fileoverview Input Manager - Handles keyboard input, action queuing, and input blocking
 */

/**
 * Input Manager class that handles keyboard events and manages action queuing
 */
export class InputManager {
  constructor() {
    // Key mapping for movement controls - STANDARD CONFIGURATION
    this.keyMap = {
      'KeyW': 'backward',    // ✅ W ahora va hacia atrás (para compensar inversión)
      'ArrowUp': 'backward', // ✅ Flecha arriba va hacia atrás
      'KeyS': 'forward',     // ✅ S ahora va hacia adelante (para compensar inversión)
      'ArrowDown': 'forward', // ✅ Flecha abajo va hacia adelante
      'KeyA': 'turnRight',   // ✅ A ahora gira derecha (para compensar inversión)
      'ArrowLeft': 'turnRight', // ✅ Flecha izquierda gira derecha
      'KeyD': 'turnLeft',    // ✅ D ahora gira izquierda (para compensar inversión)
      'ArrowRight': 'turnLeft', // ✅ Flecha derecha gira izquierda
      'KeyQ': 'strafeLeft',
      'KeyE': 'strafeRight',
      'Space': 'interact',
      'KeyT': 'loadTest', // T key to load test level
      'KeyL': 'loadTest'  // L key to load test level (cycle through levels)
    };

    // Action queue to prevent input loss during animations
    this.actionQueue = [];

    // Input blocking state
    this.inputBlocked = false;

    // Cooldown system to prevent accidental double-input
    this.lastActionTime = 0;
    this.cooldownDuration = 50; // 50ms cooldown between actions

    // Track pressed keys to prevent key repeat
    this.pressedKeys = new Set();

    // Bind event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    // Initialize event listeners
    this.initialize();
  }

  /**
   * Initialize keyboard event listeners
   */
  initialize() {
    // Check if document is available (browser environment)
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this.handleKeyDown);
      document.addEventListener('keyup', this.handleKeyUp);
    }
  }

  /**
   * Clean up event listeners
   */
  destroy() {
    // Check if document is available (browser environment)
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.handleKeyDown);
      document.removeEventListener('keyup', this.handleKeyUp);
    }
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleKeyDown(event) {
    // Prevent default behavior for game keys
    if (this.keyMap[event.code]) {
      event.preventDefault();
    }

    // Check if input is blocked
    if (this.inputBlocked) {
      return;
    }

    // Check cooldown
    const currentTime = performance.now();
    if (currentTime - this.lastActionTime < this.cooldownDuration) {
      return;
    }

    // Check if key is already pressed (prevent key repeat)
    if (this.pressedKeys.has(event.code)) {
      return;
    }

    // Get action type from key mapping
    const actionType = this.keyMap[event.code];
    if (!actionType) {
      return;
    }

    // Mark key as pressed
    this.pressedKeys.add(event.code);

    // Create action and add to queue
    const action = {
      type: actionType,
      timestamp: currentTime
    };

    this.actionQueue.push(action);
    this.lastActionTime = currentTime;
  }

  /**
   * Handle keyup events
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleKeyUp(event) {
    // Remove key from pressed keys set
    this.pressedKeys.delete(event.code);
  }

  /**
   * Get the next action from the queue
   * @returns {InputAction|null} The next action or null if queue is empty
   */
  getNextAction() {
    if (this.inputBlocked || this.actionQueue.length === 0) {
      return null;
    }

    return this.actionQueue.shift();
  }

  /**
   * Check if there are pending actions in the queue
   * @returns {boolean} True if there are pending actions
   */
  hasPendingActions() {
    return this.actionQueue.length > 0;
  }

  /**
   * Block input (typically during animations)
   */
  blockInput() {
    this.inputBlocked = true;
  }

  /**
   * Unblock input (typically after animations complete)
   */
  unblockInput() {
    this.inputBlocked = false;
  }

  /**
   * Check if input is currently blocked
   * @returns {boolean} True if input is blocked
   */
  isInputBlocked() {
    return this.inputBlocked;
  }

  /**
   * Clear all pending actions from the queue
   */
  clearActionQueue() {
    this.actionQueue = [];
  }

  /**
   * Get the current size of the action queue
   * @returns {number} Number of pending actions
   */
  getQueueSize() {
    return this.actionQueue.length;
  }

  /**
   * Set the cooldown duration between actions
   * @param {number} duration - Cooldown duration in milliseconds
   */
  setCooldownDuration(duration) {
    this.cooldownDuration = Math.max(0, duration);
  }

  /**
   * Get the current cooldown duration
   * @returns {number} Cooldown duration in milliseconds
   */
  getCooldownDuration() {
    return this.cooldownDuration;
  }

  /**
   * Check if an action type is valid
   * @param {string} actionType - The action type to check
   * @returns {boolean} True if the action type is valid
   */
  isValidActionType(actionType) {
    const validActions = ['forward', 'backward', 'turnLeft', 'turnRight', 'strafeLeft', 'strafeRight', 'interact', 'loadTest'];
    return validActions.includes(actionType);
  }

  /**
   * Get all currently pressed keys
   * @returns {Set<string>} Set of currently pressed key codes
   */
  getPressedKeys() {
    return new Set(this.pressedKeys);
  }
}