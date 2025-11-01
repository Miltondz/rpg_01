/**
 * SaveSystem - Manages save/load operations with multiple slots and auto-save
 * Handles 3 manual save slots plus 1 auto-save slot with validation and recovery
 */

import { SaveData } from './SaveData.js';

export class SaveSystem {
  constructor() {
    this.SAVE_KEY_PREFIX = 'dungeon_crawler_save_';
    this.AUTO_SAVE_KEY = 'dungeon_crawler_autosave';
    this.MANUAL_SLOTS = 3;
    this.AUTO_SAVE_SLOT = 'auto';
    
    // Auto-save configuration
    this.autoSaveEnabled = true;
    this.autoSaveInterval = 300000; // 5 minutes
    this.autoSaveTimer = null;
    this.lastAutoSave = 0;
    
    // Game state reference (set by game initialization)
    this.gameState = null;
    
    // Event listeners
    this.listeners = new Set();
    
    console.log('SaveSystem initialized');
  }

  /**
   * Initialize save system with game state reference
   * @param {Object} gameState - Reference to current game state
   */
  initialize(gameState) {
    this.gameState = gameState;
    this._startAutoSaveTimer();
    console.log('SaveSystem initialized with game state');
  }

  /**
   * Save game to specific slot
   * @param {number|string} slotId - Slot ID (1-3 for manual, 'auto' for auto-save)
   * @param {Object} options - Save options
   * @returns {Promise<Object>} Save result
   */
  async saveGame(slotId, options = {}) {
    const startTime = performance.now();
    
    try {
      // Validate slot ID
      if (!this._isValidSlotId(slotId)) {
        throw new Error(`Invalid slot ID: ${slotId}`);
      }

      // Check if game state is available
      if (!this.gameState) {
        throw new Error('Game state not initialized');
      }

      // Create save data from current game state
      const saveData = SaveData.fromGameState(this.gameState);
      
      // Add screenshot if requested and available
      if (options.includeScreenshot && this.gameState.renderer) {
        try {
          const screenshot = await this._captureScreenshot();
          saveData.setScreenshot(screenshot);
        } catch (error) {
          console.warn('Failed to capture screenshot:', error);
        }
      }

      // Validate save data
      const validation = saveData.validate();
      if (!validation.isValid) {
        throw new Error(`Save validation failed: ${validation.errors.join(', ')}`);
      }

      // Serialize save data
      const serializedData = saveData.serialize();
      
      // Store in localStorage
      const saveKey = this._getSaveKey(slotId);
      localStorage.setItem(saveKey, serializedData);
      
      // Update last save time
      this.lastAutoSave = Date.now();
      
      const duration = performance.now() - startTime;
      
      console.log(`Game saved to slot ${slotId} in ${Math.round(duration)}ms`);
      
      // Emit save event
      this._emitEvent('gameSaved', {
        slotId,
        duration,
        size: serializedData.length,
        metadata: saveData.getDisplayMetadata()
      });
      
      return {
        success: true,
        slotId,
        duration,
        size: serializedData.length,
        metadata: saveData.getDisplayMetadata()
      };
      
    } catch (error) {
      console.error(`Failed to save game to slot ${slotId}:`, error);
      
      // Emit save error event
      this._emitEvent('saveError', {
        slotId,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load game from specific slot
   * @param {number|string} slotId - Slot ID to load from
   * @returns {Promise<Object>} Load result with game state
   */
  async loadGame(slotId) {
    const startTime = performance.now();
    
    try {
      // Validate slot ID
      if (!this._isValidSlotId(slotId)) {
        throw new Error(`Invalid slot ID: ${slotId}`);
      }

      // Check if save exists
      if (!this.hasSave(slotId)) {
        throw new Error(`No save found in slot ${slotId}`);
      }

      // Load serialized data
      const saveKey = this._getSaveKey(slotId);
      const serializedData = localStorage.getItem(saveKey);
      
      if (!serializedData) {
        throw new Error(`Save data corrupted or missing for slot ${slotId}`);
      }

      // Deserialize save data
      const saveData = SaveData.deserialize(serializedData);
      
      // Validate loaded data
      const validation = saveData.validate();
      if (!validation.isValid) {
        // Try to recover from auto-save if this is a manual slot
        if (slotId !== 'auto' && this.hasSave('auto')) {
          console.warn(`Save slot ${slotId} corrupted, attempting auto-save recovery`);
          return this.loadGame('auto');
        }
        
        throw new Error(`Save validation failed: ${validation.errors.join(', ')}`);
      }

      // Check compatibility
      if (!saveData.isCompatible()) {
        console.warn(`Save version ${saveData.metadata.version} may not be fully compatible`);
      }

      const duration = performance.now() - startTime;
      
      console.log(`Game loaded from slot ${slotId} in ${Math.round(duration)}ms`);
      
      // Emit load event
      this._emitEvent('gameLoaded', {
        slotId,
        duration,
        metadata: saveData.getDisplayMetadata()
      });
      
      return {
        success: true,
        slotId,
        duration,
        saveData,
        metadata: saveData.getDisplayMetadata()
      };
      
    } catch (error) {
      console.error(`Failed to load game from slot ${slotId}:`, error);
      
      // Emit load error event
      this._emitEvent('loadError', {
        slotId,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete save from specific slot
   * @param {number|string} slotId - Slot ID to delete
   * @returns {boolean} Success status
   */
  deleteSave(slotId) {
    try {
      if (!this._isValidSlotId(slotId)) {
        throw new Error(`Invalid slot ID: ${slotId}`);
      }

      const saveKey = this._getSaveKey(slotId);
      localStorage.removeItem(saveKey);
      
      console.log(`Save deleted from slot ${slotId}`);
      
      // Emit delete event
      this._emitEvent('saveDeleted', { slotId });
      
      return true;
      
    } catch (error) {
      console.error(`Failed to delete save from slot ${slotId}:`, error);
      return false;
    }
  }

  /**
   * Check if save exists in slot
   * @param {number|string} slotId - Slot ID to check
   * @returns {boolean} True if save exists
   */
  hasSave(slotId) {
    if (!this._isValidSlotId(slotId)) {
      return false;
    }
    
    const saveKey = this._getSaveKey(slotId);
    return localStorage.getItem(saveKey) !== null;
  }

  /**
   * Get save metadata for all slots
   * @returns {Object} Metadata for all save slots
   */
  getAllSaveMetadata() {
    const metadata = {
      manual: {},
      auto: null
    };

    // Check manual slots
    for (let i = 1; i <= this.MANUAL_SLOTS; i++) {
      if (this.hasSave(i)) {
        try {
          const saveKey = this._getSaveKey(i);
          const serializedData = localStorage.getItem(saveKey);
          const saveData = SaveData.deserialize(serializedData);
          metadata.manual[i] = saveData.getDisplayMetadata();
        } catch (error) {
          console.error(`Failed to load metadata for slot ${i}:`, error);
          metadata.manual[i] = { corrupted: true, error: error.message };
        }
      } else {
        metadata.manual[i] = null;
      }
    }

    // Check auto-save slot
    if (this.hasSave('auto')) {
      try {
        const saveKey = this._getSaveKey('auto');
        const serializedData = localStorage.getItem(saveKey);
        const saveData = SaveData.deserialize(serializedData);
        metadata.auto = saveData.getDisplayMetadata();
      } catch (error) {
        console.error('Failed to load auto-save metadata:', error);
        metadata.auto = { corrupted: true, error: error.message };
      }
    }

    return metadata;
  }

  /**
   * Perform auto-save if conditions are met
   * @returns {Promise<boolean>} True if auto-save was performed
   */
  async performAutoSave() {
    if (!this.autoSaveEnabled || !this.gameState) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastAutoSave < this.autoSaveInterval) {
      return false; // Too soon for auto-save
    }

    console.log('Performing auto-save...');
    
    const result = await this.saveGame('auto', { includeScreenshot: false });
    
    if (result.success) {
      console.log('Auto-save completed successfully');
      return true;
    } else {
      console.error('Auto-save failed:', result.error);
      return false;
    }
  }

  /**
   * Trigger auto-save on specific events
   * @param {string} trigger - Event that triggered auto-save
   */
  async triggerAutoSave(trigger) {
    if (!this.autoSaveEnabled) {
      return;
    }

    console.log(`Auto-save triggered by: ${trigger}`);
    
    // Always auto-save on these triggers regardless of timer
    const forceTriggers = ['combat_victory', 'level_transition', 'manual_trigger'];
    
    if (forceTriggers.includes(trigger)) {
      await this.saveGame('auto', { includeScreenshot: false });
    } else {
      await this.performAutoSave();
    }
  }

  /**
   * Enable or disable auto-save
   * @param {boolean} enabled - Auto-save enabled state
   */
  setAutoSaveEnabled(enabled) {
    this.autoSaveEnabled = enabled;
    
    if (enabled) {
      this._startAutoSaveTimer();
    } else {
      this._stopAutoSaveTimer();
    }
    
    console.log(`Auto-save ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set auto-save interval
   * @param {number} interval - Interval in milliseconds
   */
  setAutoSaveInterval(interval) {
    this.autoSaveInterval = Math.max(60000, interval); // Minimum 1 minute
    
    if (this.autoSaveEnabled) {
      this._startAutoSaveTimer(); // Restart timer with new interval
    }
    
    console.log(`Auto-save interval set to ${this.autoSaveInterval / 1000} seconds`);
  }

  /**
   * Add event listener
   * @param {Function} callback - Event callback
   */
  addEventListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove event listener
   * @param {Function} callback - Event callback
   */
  removeEventListener(callback) {
    this.listeners.delete(callback);
  }

  // Private methods

  /**
   * Validate slot ID
   * @param {number|string} slotId - Slot ID to validate
   * @returns {boolean} True if valid
   * @private
   */
  _isValidSlotId(slotId) {
    if (slotId === 'auto') return true;
    if (typeof slotId === 'number' && slotId >= 1 && slotId <= this.MANUAL_SLOTS) return true;
    return false;
  }

  /**
   * Get localStorage key for slot
   * @param {number|string} slotId - Slot ID
   * @returns {string} Storage key
   * @private
   */
  _getSaveKey(slotId) {
    if (slotId === 'auto') {
      return this.AUTO_SAVE_KEY;
    }
    return `${this.SAVE_KEY_PREFIX}${slotId}`;
  }

  /**
   * Start auto-save timer
   * @private
   */
  _startAutoSaveTimer() {
    this._stopAutoSaveTimer(); // Clear existing timer
    
    if (this.autoSaveEnabled) {
      this.autoSaveTimer = setInterval(() => {
        this.performAutoSave();
      }, this.autoSaveInterval);
    }
  }

  /**
   * Stop auto-save timer
   * @private
   */
  _stopAutoSaveTimer() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Capture screenshot for save preview
   * @returns {Promise<string>} Base64 encoded screenshot
   * @private
   */
  async _captureScreenshot() {
    if (!this.gameState.renderer || !this.gameState.renderer.renderer) {
      throw new Error('Renderer not available for screenshot');
    }

    return new Promise((resolve, reject) => {
      try {
        // Render current frame
        this.gameState.renderer.render();
        
        // Get canvas and convert to base64
        const canvas = this.gameState.renderer.renderer.domElement;
        const dataURL = canvas.toDataURL('image/jpeg', 0.7); // 70% quality for smaller size
        
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Emit event to listeners
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @private
   */
  _emitEvent(eventType, data) {
    const event = {
      type: eventType,
      data,
      timestamp: Date.now()
    };

    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in save system event listener:', error);
      }
    });

    // Also emit as DOM event for UI components
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const domEvent = new CustomEvent(`saveSystem_${eventType}`, {
        detail: event
      });
      window.dispatchEvent(domEvent);
    }
  }

  /**
   * Get storage usage statistics
   * @returns {Object} Storage usage info
   */
  getStorageStats() {
    let totalSize = 0;
    const slotSizes = {};

    // Check manual slots
    for (let i = 1; i <= this.MANUAL_SLOTS; i++) {
      if (this.hasSave(i)) {
        const saveKey = this._getSaveKey(i);
        const data = localStorage.getItem(saveKey);
        const size = new Blob([data]).size;
        slotSizes[i] = size;
        totalSize += size;
      }
    }

    // Check auto-save
    if (this.hasSave('auto')) {
      const saveKey = this._getSaveKey('auto');
      const data = localStorage.getItem(saveKey);
      const size = new Blob([data]).size;
      slotSizes.auto = size;
      totalSize += size;
    }

    return {
      totalSize,
      slotSizes,
      totalSizeFormatted: this._formatBytes(totalSize)
    };
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   * @private
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Cleanup old saves and optimize storage
   */
  cleanup() {
    // For now, just log storage stats
    // In future, could implement automatic cleanup of old saves
    const stats = this.getStorageStats();
    console.log('Save system storage usage:', stats);
  }

  /**
   * Destroy save system and cleanup resources
   */
  destroy() {
    this._stopAutoSaveTimer();
    this.listeners.clear();
    this.gameState = null;
    console.log('SaveSystem destroyed');
  }
}