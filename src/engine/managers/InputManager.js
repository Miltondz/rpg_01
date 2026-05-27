/**
 * @fileoverview Input Manager - Handles keyboard input, action queuing, and input blocking
 */

import { Logger } from '../utils/Logger.js';

const log = Logger.tag('Input');

/**
 * Input Manager class that handles keyboard events and manages action queuing
 */
export class InputManager {
  constructor() {
    // Canonical keymap. W=forward, A=turnLeft, etc. No more compensatory inversion.
    this.keyMap = {
      // Movement
      'KeyW':       'forward',
      'ArrowUp':    'forward',
      'KeyS':       'backward',
      'ArrowDown':  'backward',
      'KeyA':       'turnLeft',
      'ArrowLeft':  'turnLeft',
      'KeyD':       'turnRight',
      'ArrowRight': 'turnRight',
      'KeyQ':       'strafeLeft',
      'KeyE':       'strafeRight',

      // Interact
      'Space':      'interact',

      // UI / screens
      'KeyI':       'openInventory',
      'KeyC':       'openCharacterSheet',
      'KeyP':       'openParty',
      'KeyM':       'openMap',
      'Escape':     'openMenu',
      'F5':         'quickSave',
      'F9':         'quickLoad',

      // Combat actions (1-5 on number row)
      'Digit1':     'combatAction1',
      'Digit2':     'combatAction2',
      'Digit3':     'combatAction3',
      'Digit4':     'combatAction4',
      'Digit5':     'combatAction5',

      // Camp / rest (Feature #18)
      'KeyZ':       'openCamp',

      // Dev / debug (kept from previous build)
      'KeyT':       'loadTest',
      'KeyL':       'loadTest',
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
    // Never intercept keys when user is typing in a form element
    const tag = event.target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select'
        || event.target?.isContentEditable) {
      return;
    }

    // Prevent default browser behavior for mapped game keys
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

    log.debug(`keydown ${event.code} -> ${actionType} (queue=${this.actionQueue.length}, blocked=${this.inputBlocked})`);
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
   * Inject an action directly — used by TouchControls and any non-keyboard input.
   * Respects inputBlocked and cooldown, same as keyboard path.
   */
  injectAction(actionType) {
    if (this.inputBlocked) return false;
    const now = performance.now();
    if (now - this.lastActionTime < this.cooldownDuration) return false;
    this.actionQueue.push({ type: actionType, timestamp: now });
    this.lastActionTime = now;
    log.debug(`inject -> ${actionType} (queue=${this.actionQueue.length})`);
    return true;
  }

  /**
   * Check if an action type is valid
   * @param {string} actionType - The action type to check
   * @returns {boolean} True if the action type is valid
   */
  isValidActionType(actionType) {
    const validActions = [
      'forward', 'backward', 'turnLeft', 'turnRight', 'strafeLeft', 'strafeRight',
      'interact',
      'openInventory', 'openCharacterSheet', 'openParty', 'openMap', 'openMenu',
      'quickSave', 'quickLoad',
      'combatAction1', 'combatAction2', 'combatAction3', 'combatAction4', 'combatAction5',
      'loadTest',
    ];
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