/**
 * UI Enhancement Manager for Dungeon Crawler Game
 * Coordinates UI polish, visual effects, and audio feedback systems
 */

import { UIPolishSystem } from './UIPolishSystem.js';
import { VisualEffectsSystem } from './VisualEffectsSystem.js';
import { AudioPlaceholderSystem } from './AudioPlaceholderSystem.js';

export class UIEnhancementManager {
  constructor() {
    // Sub-systems
    this.polishSystem = new UIPolishSystem();
    this.effectsSystem = new VisualEffectsSystem();
    this.audioSystem = new AudioPlaceholderSystem();
    
    // Manager state
    this.isInitialized = false;
    this.enhancementLevel = 'full'; // 'minimal', 'standard', 'full'
    
    // Performance monitoring
    this.performanceMetrics = {
      frameRate: 60,
      lastFrameTime: 0,
      frameCount: 0
    };
  }

  /**
   * Initialize all UI enhancement systems
   * @param {Object} options - Configuration options
   */
  async initialize(options = {}) {
    try {
      console.log('Initializing UI Enhancement Manager...');
      
      // Set enhancement level
      this.enhancementLevel = options.enhancementLevel || 'full';
      
      // Initialize systems based on enhancement level
      await this.initializeSystems();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      // Setup global event coordination
      this.setupEventCoordination();
      
      this.isInitialized = true;
      console.log('UI Enhancement Manager initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize UI Enhancement Manager:', error);
      return false;
    }
  }

  /**
   * Initialize sub-systems based on enhancement level
   */
  async initializeSystems() {
    const promises = [];
    
    // Always initialize polish system (minimal impact)
    promises.push(this.polishSystem.initialize());
    
    // Initialize effects system based on enhancement level
    if (this.enhancementLevel === 'standard' || this.enhancementLevel === 'full') {
      promises.push(this.effectsSystem.initialize());
    }
    
    // Initialize audio system for full enhancement
    if (this.enhancementLevel === 'full') {
      promises.push(this.audioSystem.initialize());
    }
    
    const results = await Promise.all(promises);
    
    // Log initialization results
    console.log('UI Polish System:', results[0] ? 'Initialized' : 'Failed');
    if (results[1] !== undefined) {
      console.log('Visual Effects System:', results[1] ? 'Initialized' : 'Failed');
    }
    if (results[2] !== undefined) {
      console.log('Audio System:', results[2] ? 'Initialized' : 'Failed');
    }
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    let lastTime = performance.now();
    
    const monitorFrame = (currentTime) => {
      const deltaTime = currentTime - lastTime;
      this.performanceMetrics.frameRate = 1000 / deltaTime;
      this.performanceMetrics.lastFrameTime = deltaTime;
      this.performanceMetrics.frameCount++;
      
      // Adjust enhancement level based on performance
      if (this.performanceMetrics.frameCount % 60 === 0) {
        this.adjustEnhancementLevel();
      }
      
      lastTime = currentTime;
      requestAnimationFrame(monitorFrame);
    };
    
    requestAnimationFrame(monitorFrame);
  }

  /**
   * Setup event coordination between systems
   */
  setupEventCoordination() {
    // Coordinate UI polish and audio feedback
    document.addEventListener('click', (event) => {
      if (event.target.matches('button, .btn, .action-btn')) {
        // Trigger coordinated feedback
        this.triggerButtonFeedback(event.target);
      }
    });
    
    // Coordinate combat effects
    window.addEventListener('combatEvent', (event) => {
      this.coordinateCombatEffects(event.detail);
    });
    
    // Coordinate character events
    window.addEventListener('levelUp', (event) => {
      this.coordinateLevelUpEffects(event.detail);
    });
    
    // Coordinate modal events
    window.addEventListener('modalOpen', (event) => {
      this.coordinateModalEffects('open', event.detail);
    });
    
    window.addEventListener('modalClose', (event) => {
      this.coordinateModalEffects('close', event.detail);
    });
  }

  /**
   * Trigger coordinated button feedback
   * @param {HTMLElement} button - Button element
   */
  triggerButtonFeedback(button) {
    // Visual feedback (always available)
    if (this.polishSystem.isInitialized) {
      // Polish system handles visual feedback automatically
    }
    
    // Audio feedback (if available)
    if (this.audioSystem.isInitialized) {
      if (button.disabled || button.classList.contains('disabled')) {
        this.audioSystem.playSound('buttonDisabled');
      } else {
        this.audioSystem.playSound('buttonClick');
      }
    }
  }

  /**
   * Coordinate combat effects across systems
   * @param {Object} eventData - Combat event data
   */
  coordinateCombatEffects(eventData) {
    switch (eventData.type) {
      case 'damageDealt':
        this.coordinateDamageEffects(eventData.data);
        break;
      case 'healingApplied':
        this.coordinateHealingEffects(eventData.data);
        break;
      case 'skillUsed':
        this.coordinateSkillEffects(eventData.data);
        break;
      case 'criticalHit':
        this.coordinateCriticalEffects(eventData.data);
        break;
      case 'combatStarted':
        this.coordinateCombatStart(eventData.data);
        break;
      case 'combatEnded':
        this.coordinateCombatEnd(eventData.data);
        break;
    }
  }

  /**
   * Coordinate damage effects
   * @param {Object} damageData - Damage event data
   */
  coordinateDamageEffects(damageData) {
    // Visual effects
    if (this.effectsSystem.isInitialized) {
      this.effectsSystem.playDamageEffect(damageData);
    }
    
    // Audio effects
    if (this.audioSystem.isInitialized) {
      if (damageData.isCritical) {
        this.audioSystem.playSound('criticalHit');
      } else {
        this.audioSystem.playSound('attack');
      }
    }
    
    // UI polish (screen shake for heavy damage)
    if (this.polishSystem.isInitialized && damageData.damage > 20) {
      // Screen shake is handled by visual effects system
    }
  }

  /**
   * Coordinate healing effects
   * @param {Object} healData - Healing event data
   */
  coordinateHealingEffects(healData) {
    // Visual effects
    if (this.effectsSystem.isInitialized) {
      this.effectsSystem.playHealingEffect(healData);
    }
    
    // Audio effects
    if (this.audioSystem.isInitialized) {
      this.audioSystem.playSound('heal');
    }
    
    // UI polish (success feedback)
    if (this.polishSystem.isInitialized) {
      const targetElement = document.querySelector(`[data-combatant-id="${healData.target.id}"]`);
      if (targetElement) {
        this.polishSystem.showSuccess(targetElement);
      }
    }
  }

  /**
   * Coordinate skill effects
   * @param {Object} skillData - Skill event data
   */
  coordinateSkillEffects(skillData) {
    // Visual effects
    if (this.effectsSystem.isInitialized) {
      this.effectsSystem.playSkillEffect(skillData);
    }
    
    // Audio effects
    if (this.audioSystem.isInitialized) {
      const soundName = this.getSkillSoundName(skillData.skill);
      this.audioSystem.playSound(soundName);
    }
  }

  /**
   * Coordinate critical hit effects
   * @param {Object} critData - Critical hit data
   */
  coordinateCriticalEffects(critData) {
    // Visual effects
    if (this.effectsSystem.isInitialized) {
      this.effectsSystem.playCriticalHitEffect(critData);
    }
    
    // Audio effects
    if (this.audioSystem.isInitialized) {
      this.audioSystem.playSound('criticalHit');
    }
    
    // UI polish (screen flash)
    if (this.polishSystem.isInitialized) {
      // Screen flash is handled by visual effects system
    }
  }

  /**
   * Coordinate combat start effects
   * @param {Object} combatData - Combat start data
   */
  coordinateCombatStart(combatData) {
    // Visual effects
    if (this.effectsSystem.isInitialized) {
      this.effectsSystem.playScreenEffect('fade');
    }
    
    // Audio effects
    if (this.audioSystem.isInitialized) {
      this.audioSystem.playSound('notification');
    }
    
    // UI polish (modal transition)
    if (this.polishSystem.isInitialized) {
      // Modal transitions are handled automatically
    }
  }

  /**
   * Coordinate combat end effects
   * @param {Object} endData - Combat end data
   */
  coordinateCombatEnd(endData) {
    // Visual effects
    if (this.effectsSystem.isInitialized) {
      if (endData.result === 'victory') {
        this.effectsSystem.playVictoryEffect(endData);
      }
    }
    
    // Audio effects
    if (this.audioSystem.isInitialized) {
      if (endData.result === 'victory') {
        this.audioSystem.playSound('success');
      } else {
        this.audioSystem.playSound('error');
      }
    }
  }

  /**
   * Coordinate level up effects
   * @param {Object} levelUpData - Level up data
   */
  coordinateLevelUpEffects(levelUpData) {
    // Visual effects
    if (this.effectsSystem.isInitialized) {
      this.effectsSystem.playLevelUpEffect(levelUpData);
    }
    
    // Audio effects
    if (this.audioSystem.isInitialized) {
      this.audioSystem.playSound('levelUp');
    }
    
    // UI polish (success notification)
    if (this.polishSystem.isInitialized) {
      this.polishSystem.showNotification(
        `${levelUpData.character.name} reached level ${levelUpData.newLevel}!`,
        'success',
        4000
      );
    }
  }

  /**
   * Coordinate modal effects
   * @param {string} action - 'open' or 'close'
   * @param {Object} modalData - Modal data
   */
  coordinateModalEffects(action, modalData) {
    // Audio effects
    if (this.audioSystem.isInitialized) {
      this.audioSystem.playSound(action === 'open' ? 'modalOpen' : 'modalClose');
    }
    
    // UI polish handles modal transitions automatically
  }

  /**
   * Get appropriate sound name for skill
   * @param {Object} skill - Skill data
   * @returns {string} Sound name
   */
  getSkillSoundName(skill) {
    switch (skill.element) {
      case 'fire':
        return 'fireball';
      case 'ice':
        return 'iceShard';
      case 'lightning':
        return 'lightning';
      case 'healing':
        return 'heal';
      default:
        return 'attack';
    }
  }

  /**
   * Adjust enhancement level based on performance
   */
  adjustEnhancementLevel() {
    const avgFrameRate = this.performanceMetrics.frameRate;
    
    // Reduce enhancement level if performance is poor
    if (avgFrameRate < 30 && this.enhancementLevel === 'full') {
      console.log('Reducing enhancement level due to performance');
      this.setEnhancementLevel('standard');
    } else if (avgFrameRate < 20 && this.enhancementLevel === 'standard') {
      console.log('Reducing enhancement level to minimal due to performance');
      this.setEnhancementLevel('minimal');
    }
    
    // Increase enhancement level if performance improves
    else if (avgFrameRate > 50 && this.enhancementLevel === 'minimal') {
      console.log('Increasing enhancement level due to good performance');
      this.setEnhancementLevel('standard');
    } else if (avgFrameRate > 55 && this.enhancementLevel === 'standard') {
      console.log('Increasing enhancement level to full due to excellent performance');
      this.setEnhancementLevel('full');
    }
  }

  /**
   * Set enhancement level
   * @param {string} level - Enhancement level ('minimal', 'standard', 'full')
   */
  setEnhancementLevel(level) {
    if (level === this.enhancementLevel) return;
    
    const previousLevel = this.enhancementLevel;
    this.enhancementLevel = level;
    
    // Adjust systems based on new level
    if (level === 'minimal') {
      // Disable visual effects and audio
      if (this.effectsSystem.isInitialized) {
        this.effectsSystem.dispose();
      }
      if (this.audioSystem.isInitialized) {
        this.audioSystem.setEnabled(false);
      }
    } else if (level === 'standard') {
      // Enable visual effects, keep audio minimal
      if (!this.effectsSystem.isInitialized && previousLevel === 'minimal') {
        this.effectsSystem.initialize();
      }
      if (this.audioSystem.isInitialized) {
        this.audioSystem.setEnabled(false);
      }
    } else if (level === 'full') {
      // Enable all systems
      if (!this.effectsSystem.isInitialized) {
        this.effectsSystem.initialize();
      }
      if (!this.audioSystem.isInitialized) {
        this.audioSystem.initialize();
      } else {
        this.audioSystem.setEnabled(true);
      }
    }
    
    console.log(`Enhancement level changed from ${previousLevel} to ${level}`);
  }

  /**
   * Show loading indicator with coordinated feedback
   * @param {HTMLElement} element - Element to show loading on
   * @param {string} text - Loading text
   */
  showLoading(element, text = 'Loading') {
    if (this.polishSystem.isInitialized) {
      this.polishSystem.showLoading(element, text);
    }
    
    if (this.audioSystem.isInitialized) {
      this.audioSystem.playSound('notification');
    }
  }

  /**
   * Hide loading indicator
   * @param {HTMLElement} element - Element to hide loading from
   */
  hideLoading(element) {
    if (this.polishSystem.isInitialized) {
      this.polishSystem.hideLoading(element);
    }
  }

  /**
   * Show confirmation dialog with coordinated feedback
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Confirmation callback
   * @param {Function} onCancel - Cancellation callback
   */
  showConfirmation(message, onConfirm, onCancel = null) {
    if (this.polishSystem.isInitialized) {
      this.polishSystem.showConfirmation(message, onConfirm, onCancel);
    }
    
    if (this.audioSystem.isInitialized) {
      this.audioSystem.playSound('notification');
    }
  }

  /**
   * Show notification with coordinated feedback
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @param {number} duration - Duration in milliseconds
   */
  showNotification(message, type = 'info', duration = 3000) {
    if (this.polishSystem.isInitialized) {
      this.polishSystem.showNotification(message, type, duration);
    }
    
    if (this.audioSystem.isInitialized) {
      const soundName = type === 'success' ? 'success' : 
                       type === 'error' ? 'error' : 'notification';
      this.audioSystem.playSound(soundName);
    }
  }

  /**
   * Show success feedback
   * @param {HTMLElement} element - Element to show success on
   * @param {string} message - Success message
   */
  showSuccess(element, message = '') {
    if (this.polishSystem.isInitialized) {
      this.polishSystem.showSuccess(element, message);
    }
    
    if (this.audioSystem.isInitialized) {
      this.audioSystem.playSound('success');
    }
  }

  /**
   * Show error feedback
   * @param {HTMLElement} element - Element to show error on
   * @param {string} message - Error message
   */
  showError(element, message = '') {
    if (this.polishSystem.isInitialized) {
      this.polishSystem.showError(element, message);
    }
    
    if (this.audioSystem.isInitialized) {
      this.audioSystem.playSound('error');
    }
  }

  /**
   * Get comprehensive status of all systems
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      enhancementLevel: this.enhancementLevel,
      performance: this.performanceMetrics,
      systems: {
        polish: this.polishSystem.getStatus(),
        effects: this.effectsSystem.getStatus(),
        audio: this.audioSystem.getStatus()
      }
    };
  }

  /**
   * Dispose of all enhancement systems
   */
  dispose() {
    console.log('Disposing UI Enhancement Manager...');
    
    // Dispose sub-systems
    if (this.polishSystem.isInitialized) {
      this.polishSystem.dispose();
    }
    
    if (this.effectsSystem.isInitialized) {
      this.effectsSystem.dispose();
    }
    
    if (this.audioSystem.isInitialized) {
      this.audioSystem.dispose();
    }
    
    this.isInitialized = false;
    
    console.log('UI Enhancement Manager disposed');
  }
}

// Create and export singleton instance
export const uiEnhancementManager = new UIEnhancementManager();