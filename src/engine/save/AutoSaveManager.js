/**
 * AutoSaveManager - Handles automatic saving with triggers and validation
 * Manages auto-save triggers, corruption recovery, and save validation
 */

export class AutoSaveManager {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this.gameState = null;
    
    // Auto-save configuration
    this.enabled = true;
    this.interval = 300000; // 5 minutes in milliseconds
    this.timer = null;
    this.lastAutoSave = 0;
    
    // Trigger tracking
    this.triggerCooldown = 10000; // 10 seconds between triggered auto-saves
    this.lastTriggeredSave = 0;
    
    // Validation and recovery
    this.validationEnabled = true;
    this.backupCount = 3; // Keep 3 backup auto-saves
    
    // Event listeners
    this.listeners = new Set();
    
    // Bind event handlers
    this.handlers = {
      combatVictory: this._onCombatVictory.bind(this),
      levelTransition: this._onLevelTransition.bind(this),
      characterLevelUp: this._onCharacterLevelUp.bind(this),
      beforeUnload: this._onBeforeUnload.bind(this)
    };
    
    console.log('AutoSaveManager initialized');
  }

  /**
   * Initialize auto-save manager with game state
   * @param {Object} gameState - Game state reference
   */
  initialize(gameState) {
    this.gameState = gameState;
    this._bindGameEvents();
    this._startTimer();
    
    console.log('AutoSaveManager initialized with game state');
  }

  /**
   * Enable or disable auto-save
   * @param {boolean} enabled - Auto-save enabled state
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    
    if (enabled) {
      this._startTimer();
      this._bindGameEvents();
    } else {
      this._stopTimer();
      this._unbindGameEvents();
    }
    
    console.log(`Auto-save ${enabled ? 'enabled' : 'disabled'}`);
    this._emitEvent('autoSaveToggled', { enabled });
  }

  /**
   * Set auto-save interval
   * @param {number} interval - Interval in milliseconds (minimum 60 seconds)
   */
  setInterval(interval) {
    this.interval = Math.max(60000, interval); // Minimum 1 minute
    
    if (this.enabled) {
      this._startTimer(); // Restart timer with new interval
    }
    
    console.log(`Auto-save interval set to ${this.interval / 1000} seconds`);
    this._emitEvent('intervalChanged', { interval: this.interval });
  }

  /**
   * Perform auto-save if conditions are met
   * @param {string} trigger - What triggered the auto-save
   * @returns {Promise<boolean>} True if auto-save was performed
   */
  async performAutoSave(trigger = 'timer') {
    if (!this.enabled || !this.gameState) {
      return false;
    }

    const now = Date.now();
    
    // Check cooldown for triggered saves (not timer-based)
    if (trigger !== 'timer' && (now - this.lastTriggeredSave) < this.triggerCooldown) {
      console.log(`Auto-save skipped due to cooldown (${trigger})`);
      return false;
    }

    // Check minimum interval for timer-based saves
    if (trigger === 'timer' && (now - this.lastAutoSave) < this.interval) {
      return false;
    }

    try {
      console.log(`Performing auto-save (trigger: ${trigger})`);
      
      // Validate game state before saving
      if (this.validationEnabled && !this._validateGameState()) {
        console.warn('Game state validation failed, skipping auto-save');
        return false;
      }

      // Create backup of current auto-save before overwriting
      await this._createBackup();
      
      // Perform the auto-save
      const result = await this.saveSystem.saveGame('auto', {
        includeScreenshot: false // Skip screenshot for auto-saves to improve performance
      });
      
      if (result.success) {
        this.lastAutoSave = now;
        if (trigger !== 'timer') {
          this.lastTriggeredSave = now;
        }
        
        console.log(`Auto-save completed successfully (${result.duration}ms)`);
        this._emitEvent('autoSaveCompleted', { trigger, result });
        
        return true;
      } else {
        console.error('Auto-save failed:', result.error);
        this._emitEvent('autoSaveFailed', { trigger, error: result.error });
        
        return false;
      }
      
    } catch (error) {
      console.error('Auto-save error:', error);
      this._emitEvent('autoSaveError', { trigger, error: error.message });
      
      return false;
    }
  }

  /**
   * Validate save data integrity
   * @param {number|string} slotId - Slot to validate (defaults to auto-save)
   * @returns {Promise<Object>} Validation result
   */
  async validateSave(slotId = 'auto') {
    try {
      if (!this.saveSystem.hasSave(slotId)) {
        return {
          isValid: false,
          error: 'Save does not exist',
          canRecover: false
        };
      }

      // Attempt to load and validate the save
      const result = await this.saveSystem.loadGame(slotId);
      
      if (result.success) {
        const validation = result.saveData.validate();
        
        return {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          canRecover: !validation.isValid && this._hasRecoveryOptions(slotId)
        };
      } else {
        return {
          isValid: false,
          error: result.error,
          canRecover: this._hasRecoveryOptions(slotId)
        };
      }
      
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        canRecover: this._hasRecoveryOptions(slotId)
      };
    }
  }

  /**
   * Attempt to recover corrupted save using backup
   * @param {number|string} slotId - Slot to recover
   * @returns {Promise<Object>} Recovery result
   */
  async recoverSave(slotId = 'auto') {
    try {
      console.log(`Attempting to recover save for slot ${slotId}`);
      
      // For auto-save, try backup auto-saves
      if (slotId === 'auto') {
        for (let i = 1; i <= this.backupCount; i++) {
          const backupKey = `${this.saveSystem.AUTO_SAVE_KEY}_backup_${i}`;
          
          if (localStorage.getItem(backupKey)) {
            try {
              // Temporarily restore backup to auto-save slot
              const backupData = localStorage.getItem(backupKey);
              localStorage.setItem(this.saveSystem.AUTO_SAVE_KEY, backupData);
              
              // Validate the restored save
              const validation = await this.validateSave('auto');
              
              if (validation.isValid) {
                console.log(`Successfully recovered auto-save from backup ${i}`);
                this._emitEvent('saveRecovered', { slotId, backupIndex: i });
                
                return {
                  success: true,
                  message: `Recovered from backup ${i}`,
                  backupIndex: i
                };
              }
              
            } catch (error) {
              console.warn(`Backup ${i} is also corrupted:`, error);
            }
          }
        }
        
        return {
          success: false,
          error: 'No valid backups found'
        };
      }
      
      // For manual saves, try to recover from auto-save
      const autoSaveValidation = await this.validateSave('auto');
      
      if (autoSaveValidation.isValid) {
        // Copy auto-save to the corrupted slot
        const autoSaveData = localStorage.getItem(this.saveSystem.AUTO_SAVE_KEY);
        const targetKey = this.saveSystem._getSaveKey(slotId);
        localStorage.setItem(targetKey, autoSaveData);
        
        console.log(`Recovered slot ${slotId} from auto-save`);
        this._emitEvent('saveRecovered', { slotId, source: 'auto-save' });
        
        return {
          success: true,
          message: 'Recovered from auto-save',
          source: 'auto-save'
        };
      }
      
      return {
        success: false,
        error: 'No valid recovery source found'
      };
      
    } catch (error) {
      console.error('Save recovery failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get auto-save status and statistics
   * @returns {Object} Auto-save status
   */
  getStatus() {
    const now = Date.now();
    
    return {
      enabled: this.enabled,
      interval: this.interval,
      lastAutoSave: this.lastAutoSave,
      timeSinceLastSave: now - this.lastAutoSave,
      timeUntilNextSave: Math.max(0, this.interval - (now - this.lastAutoSave)),
      hasAutoSave: this.saveSystem.hasSave('auto'),
      backupCount: this._getBackupCount()
    };
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
   * Start auto-save timer
   * @private
   */
  _startTimer() {
    this._stopTimer(); // Clear existing timer
    
    if (this.enabled) {
      this.timer = setInterval(() => {
        this.performAutoSave('timer');
      }, this.interval);
    }
  }

  /**
   * Stop auto-save timer
   * @private
   */
  _stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Bind game event listeners
   * @private
   */
  _bindGameEvents() {
    if (typeof window !== 'undefined') {
      window.addEventListener('combatVictory', this.handlers.combatVictory);
      window.addEventListener('levelTransition', this.handlers.levelTransition);
      window.addEventListener('characterLevelUp', this.handlers.characterLevelUp);
      window.addEventListener('beforeunload', this.handlers.beforeUnload);
    }
  }

  /**
   * Unbind game event listeners
   * @private
   */
  _unbindGameEvents() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('combatVictory', this.handlers.combatVictory);
      window.removeEventListener('levelTransition', this.handlers.levelTransition);
      window.removeEventListener('characterLevelUp', this.handlers.characterLevelUp);
      window.removeEventListener('beforeunload', this.handlers.beforeUnload);
    }
  }

  /**
   * Handle combat victory event
   * @private
   */
  _onCombatVictory() {
    this.performAutoSave('combat_victory');
  }

  /**
   * Handle level transition event
   * @private
   */
  _onLevelTransition() {
    this.performAutoSave('level_transition');
  }

  /**
   * Handle character level up event
   * @private
   */
  _onCharacterLevelUp() {
    this.performAutoSave('character_level_up');
  }

  /**
   * Handle page unload event
   * @private
   */
  _onBeforeUnload() {
    // Perform synchronous auto-save on page unload
    if (this.enabled && this.gameState) {
      try {
        // Use synchronous localStorage operation for immediate save
        const saveData = this.saveSystem.saveGame('auto', { includeScreenshot: false });
        console.log('Emergency auto-save on page unload');
      } catch (error) {
        console.error('Emergency auto-save failed:', error);
      }
    }
  }

  /**
   * Validate current game state
   * @returns {boolean} True if game state is valid for saving
   * @private
   */
  _validateGameState() {
    if (!this.gameState) {
      return false;
    }

    // Check if party exists and has characters
    if (!this.gameState.partyManager || this.gameState.partyManager.getPartySize() === 0) {
      console.warn('Cannot auto-save: No party or empty party');
      return false;
    }

    // Check if any party members are alive
    if (this.gameState.partyManager.isPartyDead()) {
      console.warn('Cannot auto-save: All party members are dead');
      return false;
    }

    // Check if currently in combat (might want to skip auto-save during combat)
    if (this.gameState.combatSystem && this.gameState.combatSystem.isInCombat()) {
      console.log('Skipping auto-save: Currently in combat');
      return false;
    }

    // Check if currently animating (movement, etc.)
    if (this.gameState.movementController && this.gameState.movementController.getIsAnimating()) {
      console.log('Skipping auto-save: Currently animating');
      return false;
    }

    return true;
  }

  /**
   * Create backup of current auto-save
   * @private
   */
  async _createBackup() {
    if (!this.saveSystem.hasSave('auto')) {
      return; // No auto-save to backup
    }

    try {
      const currentAutoSave = localStorage.getItem(this.saveSystem.AUTO_SAVE_KEY);
      
      if (currentAutoSave) {
        // Shift existing backups
        for (let i = this.backupCount; i > 1; i--) {
          const sourceKey = `${this.saveSystem.AUTO_SAVE_KEY}_backup_${i - 1}`;
          const targetKey = `${this.saveSystem.AUTO_SAVE_KEY}_backup_${i}`;
          
          const sourceData = localStorage.getItem(sourceKey);
          if (sourceData) {
            localStorage.setItem(targetKey, sourceData);
          } else {
            localStorage.removeItem(targetKey);
          }
        }
        
        // Save current auto-save as backup 1
        const backup1Key = `${this.saveSystem.AUTO_SAVE_KEY}_backup_1`;
        localStorage.setItem(backup1Key, currentAutoSave);
        
        console.log('Auto-save backup created');
      }
      
    } catch (error) {
      console.warn('Failed to create auto-save backup:', error);
    }
  }

  /**
   * Check if recovery options are available
   * @param {number|string} slotId - Slot to check recovery for
   * @returns {boolean} True if recovery options exist
   * @private
   */
  _hasRecoveryOptions(slotId) {
    if (slotId === 'auto') {
      // Check for backup auto-saves
      for (let i = 1; i <= this.backupCount; i++) {
        const backupKey = `${this.saveSystem.AUTO_SAVE_KEY}_backup_${i}`;
        if (localStorage.getItem(backupKey)) {
          return true;
        }
      }
      return false;
    } else {
      // Check if auto-save exists as recovery option
      return this.saveSystem.hasSave('auto');
    }
  }

  /**
   * Get number of available backups
   * @returns {number} Number of backups
   * @private
   */
  _getBackupCount() {
    let count = 0;
    
    for (let i = 1; i <= this.backupCount; i++) {
      const backupKey = `${this.saveSystem.AUTO_SAVE_KEY}_backup_${i}`;
      if (localStorage.getItem(backupKey)) {
        count++;
      }
    }
    
    return count;
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
        console.error('Error in auto-save event listener:', error);
      }
    });

    // Also emit as DOM event
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const domEvent = new CustomEvent(`autoSave_${eventType}`, {
        detail: event
      });
      window.dispatchEvent(domEvent);
    }
  }

  /**
   * Cleanup and destroy auto-save manager
   */
  destroy() {
    this._stopTimer();
    this._unbindGameEvents();
    this.listeners.clear();
    this.gameState = null;
    
    console.log('AutoSaveManager destroyed');
  }
}