/**
 * Debug UI System for Dungeon Crawler Engine
 * Provides real-time feedback and system monitoring
 */

export class DebugUI {
  constructor() {
    // Debug panel elements
    this.elements = {
      panel: null,
      position: null,
      direction: null,
      fps: null,
      tileType: null,
      walkable: null
    };
    
    // Toast system
    this.toastContainer = null;
    this.toastQueue = [];
    this.maxToasts = 3;
    
    // Performance tracking
    this.performanceData = {
      frameCount: 0,
      fps: 60,
      frameTimeHistory: [],
      maxFrameTimeHistory: 60,
      lastUpdateTime: 0,
      updateInterval: 100 // Update UI every 100ms
    };
    
    this.isInitialized = false;
  }

  /**
   * Initialize the debug UI system
   */
  initialize() {
    try {
      this.initializeDebugPanel();
      this.initializeToastSystem();
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('DebugUI initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize DebugUI:', error);
      return false;
    }
  }

  /**
   * Initialize debug panel elements with proper naming
   */
  initializeDebugPanel() {
    // Get main debug panel
    this.elements.panel = document.getElementById('debug-panel');
    if (!this.elements.panel) {
      throw new Error('Debug panel element not found');
    }
    
    // Add data attributes for easy identification
    this.elements.panel.setAttribute('data-ui-component', 'debug-panel');
    this.elements.panel.setAttribute('data-ui-name', 'main-debug-panel');
    
    // Get individual debug elements
    this.elements.position = document.getElementById('debug-position');
    this.elements.direction = document.getElementById('debug-direction');
    this.elements.fps = document.getElementById('debug-fps');
    this.elements.tileType = document.getElementById('debug-tile-type');
    
    // Add data attributes to each element for identification
    if (this.elements.position) {
      this.elements.position.setAttribute('data-ui-component', 'position-display');
      this.elements.position.setAttribute('data-ui-name', 'player-position');
    }
    
    if (this.elements.direction) {
      this.elements.direction.setAttribute('data-ui-component', 'direction-display');
      this.elements.direction.setAttribute('data-ui-name', 'player-direction');
    }
    
    if (this.elements.fps) {
      this.elements.fps.setAttribute('data-ui-component', 'fps-display');
      this.elements.fps.setAttribute('data-ui-name', 'performance-counter');
    }
    
    if (this.elements.tileType) {
      this.elements.tileType.setAttribute('data-ui-component', 'tile-display');
      this.elements.tileType.setAttribute('data-ui-name', 'current-tile-info');
    }
    
    // Add walkability status element if it doesn't exist
    this.addWalkabilityDisplay();
    
    // Verify all critical elements exist
    const missingElements = [];
    Object.entries(this.elements).forEach(([key, element]) => {
      if (key !== 'panel' && key !== 'walkable' && !element) {
        missingElements.push(key);
      }
    });
    
    if (missingElements.length > 0) {
      console.warn('Missing debug elements:', missingElements);
    }
  }

  /**
   * Add walkability status display to debug panel
   */
  addWalkabilityDisplay() {
    const walkableItem = document.createElement('div');
    walkableItem.className = 'debug-item';
    walkableItem.setAttribute('data-ui-component', 'walkable-display');
    walkableItem.setAttribute('data-ui-name', 'tile-walkability-status');
    
    const label = document.createElement('span');
    label.className = 'debug-label';
    label.textContent = 'Walkable:';
    
    const value = document.createElement('span');
    value.id = 'debug-walkable';
    value.className = 'debug-value';
    value.textContent = 'Yes';
    value.setAttribute('data-ui-component', 'walkable-value');
    value.setAttribute('data-ui-name', 'walkability-indicator');
    
    walkableItem.appendChild(label);
    walkableItem.appendChild(value);
    
    // Insert after tile type
    const tileTypeItem = this.elements.tileType?.parentElement;
    if (tileTypeItem && this.elements.panel) {
      tileTypeItem.parentNode.insertBefore(walkableItem, tileTypeItem.nextSibling);
      this.elements.walkable = value;
    }
  }

  /**
   * Initialize toast notification system
   */
  initializeToastSystem() {
    this.toastContainer = document.getElementById('toast-container');
    if (!this.toastContainer) {
      throw new Error('Toast container element not found');
    }
    
    // Add data attributes for identification
    this.toastContainer.setAttribute('data-ui-component', 'toast-container');
    this.toastContainer.setAttribute('data-ui-name', 'notification-system');
  }

  /**
   * Set up event listeners for debug functionality
   */
  setupEventListeners() {
    // Toggle debug panel visibility
    document.addEventListener('keydown', (event) => {
      if (event.code === 'F1') {
        event.preventDefault();
        this.toggleDebugPanel();
      }
    });
  }

  /**
   * Update debug information
   * @param {Object} gameState - Current game state
   */
  update(gameState) {
    if (!this.isInitialized) return;
    
    const now = performance.now();
    
    // Throttle UI updates for performance
    if (now - this.performanceData.lastUpdateTime < this.performanceData.updateInterval) {
      return;
    }
    
    this.performanceData.lastUpdateTime = now;
    
    // Update position display
    if (this.elements.position && gameState.position) {
      this.elements.position.textContent = `${gameState.position.x}, ${gameState.position.z}`;
    }
    
    // Update direction display
    if (this.elements.direction && typeof gameState.direction === 'number') {
      const directionNames = ['N', 'E', 'S', 'W'];
      const degrees = gameState.rotation ? Math.round(gameState.rotation * 180 / Math.PI) : 0;
      this.elements.direction.textContent = `${directionNames[gameState.direction]} (${degrees}°)`;
    }
    
    // Update tile type and walkability
    if (gameState.currentTile) {
      if (this.elements.tileType) {
        this.elements.tileType.textContent = gameState.currentTile.type || 'unknown';
      }
      
      if (this.elements.walkable) {
        const isWalkable = gameState.currentTile.walkable !== false;
        this.elements.walkable.textContent = isWalkable ? 'Yes' : 'No';
        this.elements.walkable.style.color = isWalkable ? '#00ff00' : '#ff0000';
      }
    }
  }

  /**
   * Update FPS display with performance metrics
   * @param {Object} performanceMetrics - Performance data
   */
  updatePerformance(performanceMetrics) {
    if (!this.isInitialized || !this.elements.fps) return;
    
    const fps = Math.round(performanceMetrics.currentFPS || 60);
    const frameTime = (performanceMetrics.averageFrameTime || 16.67).toFixed(1);
    
    this.elements.fps.textContent = `${fps} fps (${frameTime}ms)`;
    
    // Color code based on performance
    let color = '#00ff00'; // Green for good performance
    if (fps < 55) {
      color = '#ffff00'; // Yellow for moderate performance
    }
    if (fps < 30) {
      color = '#ff0000'; // Red for poor performance
    }
    
    this.elements.fps.style.color = color;
  }

  /**
   * Show toast notification with proper queuing
   * @param {string} message - Message to display
   * @param {string} type - Toast type (info, success, warning, error)
   * @param {number} duration - Display duration in milliseconds
   */
  showToast(message, type = 'info', duration = 3000) {
    if (!this.isInitialized || !this.toastContainer) {
      console.warn('Toast system not initialized');
      return;
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('data-ui-component', 'toast-notification');
    toast.setAttribute('data-ui-name', `toast-${type}-${Date.now()}`);
    
    // Add to queue and manage display
    this.toastQueue.push({
      element: toast,
      duration: duration,
      timestamp: Date.now()
    });
    
    // Display toast
    this.displayToast(toast, duration);
    
    // Clean up old toasts if too many
    this.cleanupToasts();
  }

  /**
   * Display a toast notification
   * @param {HTMLElement} toast - Toast element
   * @param {number} duration - Display duration
   */
  displayToast(toast, duration) {
    this.toastContainer.appendChild(toast);
    
    // Auto-remove after duration
    setTimeout(() => {
      this.removeToast(toast);
    }, duration);
  }

  /**
   * Remove a toast notification with animation
   * @param {HTMLElement} toast - Toast element to remove
   */
  removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.add('fade-out');
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // Remove from queue
      this.toastQueue = this.toastQueue.filter(item => item.element !== toast);
    }, 300);
  }

  /**
   * Clean up excess toasts
   */
  cleanupToasts() {
    while (this.toastQueue.length > this.maxToasts) {
      const oldestToast = this.toastQueue.shift();
      if (oldestToast) {
        this.removeToast(oldestToast.element);
      }
    }
  }

  /**
   * Toggle debug panel visibility
   */
  toggleDebugPanel() {
    if (!this.elements.panel) return;
    
    const isVisible = this.elements.panel.style.display !== 'none';
    this.elements.panel.style.display = isVisible ? 'none' : 'block';
    
    this.showToast(
      `Debug panel ${isVisible ? 'hidden' : 'shown'}`,
      'info',
      1500
    );
  }

  /**
   * Show system status information
   * @param {Object} systemStatus - System status data
   */
  showSystemStatus(systemStatus) {
    const messages = [];
    
    if (systemStatus.memoryUsage) {
      messages.push(`Memory: ${systemStatus.memoryUsage.toFixed(1)}MB`);
    }
    
    if (systemStatus.loadTime) {
      messages.push(`Load Time: ${systemStatus.loadTime}ms`);
    }
    
    if (systemStatus.activeAnimations) {
      messages.push(`Animations: ${systemStatus.activeAnimations}`);
    }
    
    if (messages.length > 0) {
      this.showToast(messages.join(' | '), 'info', 2000);
    }
  }

  /**
   * Show error message with detailed information
   * @param {string} error - Error message
   * @param {Object} context - Additional context
   */
  showError(error, context = {}) {
    let message = error;
    
    if (context.position) {
      message += ` at (${context.position.x}, ${context.position.z})`;
    }
    
    if (context.system) {
      message += ` [${context.system}]`;
    }
    
    this.showToast(message, 'error', 4000);
    console.error('DebugUI Error:', error, context);
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    this.showToast(message, 'success', 2000);
  }

  /**
   * Show warning message
   * @param {string} message - Warning message
   */
  showWarning(message) {
    this.showToast(message, 'warning', 2500);
  }

  /**
   * Get debug UI element by name
   * @param {string} name - Element name
   * @returns {HTMLElement|null} - Element or null if not found
   */
  getElementByName(name) {
    return document.querySelector(`[data-ui-name="${name}"]`);
  }

  /**
   * Get all debug UI elements by component type
   * @param {string} component - Component type
   * @returns {NodeList} - List of elements
   */
  getElementsByComponent(component) {
    return document.querySelectorAll(`[data-ui-component="${component}"]`);
  }

  /**
   * Cleanup and destroy debug UI
   */
  destroy() {
    // Clear toast queue
    this.toastQueue.forEach(item => {
      if (item.element && item.element.parentNode) {
        item.element.parentNode.removeChild(item.element);
      }
    });
    this.toastQueue = [];
    
    // Reset elements
    this.elements = {};
    this.isInitialized = false;
    
    console.log('DebugUI destroyed');
  }
}