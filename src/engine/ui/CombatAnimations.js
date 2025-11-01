/**
 * Combat Animations System for Dungeon Crawler Game
 * Handles attack animations, damage numbers, hit effects, and visual feedback
 */

export class CombatAnimations {
  constructor() {
    // Animation state
    this.activeAnimations = new Map();
    this.animationQueue = [];
    this.isProcessing = false;
    
    // Animation settings
    this.settings = {
      attackDuration: 600,
      damageDuration: 1200,
      hitFlashDuration: 200,
      shakeIntensity: 10,
      shakeDuration: 300
    };
    
    // Damage number pool for performance
    this.damageNumberPool = [];
    this.maxPoolSize = 20;
    
    this.isInitialized = false;
  }

  /**
   * Initialize the animation system
   */
  initialize() {
    try {
      this.createDamageNumberPool();
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('CombatAnimations initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize CombatAnimations:', error);
      return false;
    }
  }

  /**
   * Create pool of damage number elements for reuse
   */
  createDamageNumberPool() {
    for (let i = 0; i < this.maxPoolSize; i++) {
      const damageNumber = document.createElement('div');
      damageNumber.className = 'damage-number';
      damageNumber.setAttribute('data-ui-component', 'damage-number');
      damageNumber.setAttribute('data-ui-name', `damage-number-${i}`);
      damageNumber.style.display = 'none';
      document.body.appendChild(damageNumber);
      
      this.damageNumberPool.push(damageNumber);
    }
  }

  /**
   * Setup event listeners for combat events
   */
  setupEventListeners() {
    window.addEventListener('combatEvent', (event) => {
      this.handleCombatEvent(event.detail);
    });
  }

  /**
   * Handle combat events and trigger appropriate animations
   * @param {Object} eventData - Combat event data
   */
  handleCombatEvent(eventData) {
    switch (eventData.type) {
      case 'actionExecuted':
        this.handleActionAnimation(eventData.data);
        break;
      case 'damageDealt':
        this.showDamageNumber(eventData.data);
        break;
      case 'healingApplied':
        this.showHealingNumber(eventData.data);
        break;
      case 'characterDied':
        this.playDeathAnimation(eventData.data);
        break;
      case 'combatStarted':
        this.playCombatStartAnimation();
        break;
      case 'combatEnded':
        this.playCombatEndAnimation(eventData.data);
        break;
    }
  }

  /**
   * Handle action animations based on action type
   * @param {Object} actionData - Action execution data
   */
  async handleActionAnimation(actionData) {
    const { character, action, target, result } = actionData;
    
    if (!result.success) {
      this.playFailedActionAnimation(character);
      return;
    }
    
    // Get character card element
    const characterCard = this.getCharacterCard(character.id);
    if (!characterCard) return;
    
    // Play action-specific animation
    switch (action.type) {
      case 'attack':
        await this.playAttackAnimation(characterCard, target);
        break;
      case 'skill':
        await this.playSkillAnimation(characterCard, action, target);
        break;
      case 'item':
        await this.playItemAnimation(characterCard, action, target);
        break;
      case 'defend':
        await this.playDefendAnimation(characterCard);
        break;
      default:
        await this.playGenericActionAnimation(characterCard);
    }
  }

  /**
   * Play attack animation (lunge forward, swing, recoil)
   * @param {HTMLElement} characterCard - Character card element
   * @param {Object} target - Target data
   */
  async playAttackAnimation(characterCard, target) {
    const animationId = `attack-${Date.now()}`;
    this.activeAnimations.set(animationId, true);
    
    try {
      // Phase 1: Lunge forward
      characterCard.style.transition = 'transform 0.2s ease-out';
      characterCard.style.transform = 'translateX(20px) scale(1.1)';
      characterCard.classList.add('attacking');
      
      await this.delay(200);
      
      // Phase 2: Swing (brief pause at peak)
      characterCard.style.transform = 'translateX(25px) scale(1.15) rotate(5deg)';
      
      await this.delay(100);
      
      // Phase 3: Hit effect on target
      if (target) {
        this.playHitEffect(target);
      }
      
      await this.delay(100);
      
      // Phase 4: Recoil back to position
      characterCard.style.transition = 'transform 0.3s ease-in';
      characterCard.style.transform = 'translateX(0) scale(1) rotate(0deg)';
      
      await this.delay(300);
      
      // Cleanup
      characterCard.classList.remove('attacking');
      characterCard.style.transition = '';
      characterCard.style.transform = '';
      
    } finally {
      this.activeAnimations.delete(animationId);
    }
  }

  /**
   * Play skill animation with special effects
   * @param {HTMLElement} characterCard - Character card element
   * @param {Object} action - Skill action data
   * @param {Object} target - Target data
   */
  async playSkillAnimation(characterCard, action, target) {
    const animationId = `skill-${Date.now()}`;
    this.activeAnimations.set(animationId, true);
    
    try {
      // Create skill effect overlay
      const skillEffect = document.createElement('div');
      skillEffect.className = `skill-effect ${action.element || 'neutral'}`;
      skillEffect.setAttribute('data-ui-component', 'skill-effect');
      skillEffect.setAttribute('data-ui-name', `skill-${action.id}-effect`);
      
      characterCard.appendChild(skillEffect);
      
      // Phase 1: Charge up
      characterCard.style.transition = 'all 0.3s ease-out';
      characterCard.style.transform = 'scale(1.2)';
      characterCard.classList.add('casting');
      
      skillEffect.style.opacity = '0';
      skillEffect.style.transform = 'scale(0)';
      skillEffect.style.transition = 'all 0.3s ease-out';
      
      await this.delay(100);
      
      // Phase 2: Skill activation
      skillEffect.style.opacity = '1';
      skillEffect.style.transform = 'scale(1)';
      
      await this.delay(200);
      
      // Phase 3: Effect on target
      if (target) {
        this.playSkillHitEffect(target, action.element);
      }
      
      await this.delay(200);
      
      // Phase 4: Return to normal
      characterCard.style.transform = 'scale(1)';
      skillEffect.style.opacity = '0';
      skillEffect.style.transform = 'scale(1.5)';
      
      await this.delay(300);
      
      // Cleanup
      characterCard.classList.remove('casting');
      characterCard.style.transition = '';
      characterCard.style.transform = '';
      skillEffect.remove();
      
    } finally {
      this.activeAnimations.delete(animationId);
    }
  }

  /**
   * Play item use animation
   * @param {HTMLElement} characterCard - Character card element
   * @param {Object} action - Item action data
   * @param {Object} target - Target data
   */
  async playItemAnimation(characterCard, action, target) {
    const animationId = `item-${Date.now()}`;
    this.activeAnimations.set(animationId, true);
    
    try {
      // Create item effect
      const itemEffect = document.createElement('div');
      itemEffect.className = 'item-effect';
      itemEffect.textContent = '💊'; // Generic item icon
      itemEffect.setAttribute('data-ui-component', 'item-effect');
      itemEffect.setAttribute('data-ui-name', `item-${action.id}-effect`);
      
      characterCard.appendChild(itemEffect);
      
      // Animate item use
      characterCard.classList.add('using-item');
      itemEffect.style.opacity = '0';
      itemEffect.style.transform = 'translateY(20px)';
      itemEffect.style.transition = 'all 0.4s ease-out';
      
      await this.delay(100);
      
      itemEffect.style.opacity = '1';
      itemEffect.style.transform = 'translateY(-10px)';
      
      await this.delay(300);
      
      // Effect on target
      if (target && action.type === 'healing') {
        this.playHealingEffect(target);
      }
      
      await this.delay(200);
      
      // Cleanup
      itemEffect.style.opacity = '0';
      itemEffect.style.transform = 'translateY(-30px)';
      
      await this.delay(200);
      
      characterCard.classList.remove('using-item');
      itemEffect.remove();
      
    } finally {
      this.activeAnimations.delete(animationId);
    }
  }

  /**
   * Play defend animation
   * @param {HTMLElement} characterCard - Character card element
   */
  async playDefendAnimation(characterCard) {
    const animationId = `defend-${Date.now()}`;
    this.activeAnimations.set(animationId, true);
    
    try {
      // Create shield effect
      const shieldEffect = document.createElement('div');
      shieldEffect.className = 'shield-effect';
      shieldEffect.textContent = '🛡️';
      shieldEffect.setAttribute('data-ui-component', 'shield-effect');
      shieldEffect.setAttribute('data-ui-name', 'defend-shield');
      
      characterCard.appendChild(shieldEffect);
      
      // Animate defense
      characterCard.classList.add('defending');
      characterCard.style.transition = 'all 0.3s ease-out';
      characterCard.style.transform = 'scale(0.9)';
      
      shieldEffect.style.opacity = '0';
      shieldEffect.style.transform = 'scale(0)';
      shieldEffect.style.transition = 'all 0.3s ease-out';
      
      await this.delay(100);
      
      shieldEffect.style.opacity = '1';
      shieldEffect.style.transform = 'scale(1)';
      
      await this.delay(400);
      
      // Return to normal
      characterCard.style.transform = 'scale(1)';
      shieldEffect.style.opacity = '0';
      
      await this.delay(200);
      
      // Cleanup
      characterCard.classList.remove('defending');
      characterCard.style.transition = '';
      characterCard.style.transform = '';
      shieldEffect.remove();
      
    } finally {
      this.activeAnimations.delete(animationId);
    }
  }

  /**
   * Play generic action animation
   * @param {HTMLElement} characterCard - Character card element
   */
  async playGenericActionAnimation(characterCard) {
    const animationId = `generic-${Date.now()}`;
    this.activeAnimations.set(animationId, true);
    
    try {
      characterCard.style.transition = 'transform 0.2s ease-out';
      characterCard.style.transform = 'scale(1.1)';
      
      await this.delay(200);
      
      characterCard.style.transform = 'scale(1)';
      
      await this.delay(200);
      
      characterCard.style.transition = '';
      characterCard.style.transform = '';
      
    } finally {
      this.activeAnimations.delete(animationId);
    }
  }

  /**
   * Play failed action animation
   * @param {Object} character - Character data
   */
  async playFailedActionAnimation(character) {
    const characterCard = this.getCharacterCard(character.id);
    if (!characterCard) return;
    
    characterCard.classList.add('action-failed');
    
    await this.delay(500);
    
    characterCard.classList.remove('action-failed');
  }

  /**
   * Play hit effect on target
   * @param {Object} target - Target data
   */
  playHitEffect(target) {
    const targetCard = this.getCharacterCard(target.id);
    if (!targetCard) return;
    
    // Flash effect
    targetCard.classList.add('hit-flash');
    
    // Screen shake for heavy attacks
    if (target.damage && target.damage > 20) {
      this.playScreenShake();
    }
    
    setTimeout(() => {
      targetCard.classList.remove('hit-flash');
    }, this.settings.hitFlashDuration);
  }

  /**
   * Play skill hit effect with elemental styling
   * @param {Object} target - Target data
   * @param {string} element - Skill element type
   */
  playSkillHitEffect(target, element = 'neutral') {
    const targetCard = this.getCharacterCard(target.id);
    if (!targetCard) return;
    
    // Add elemental hit effect
    targetCard.classList.add('skill-hit', `${element}-hit`);
    
    setTimeout(() => {
      targetCard.classList.remove('skill-hit', `${element}-hit`);
    }, this.settings.hitFlashDuration * 1.5);
  }

  /**
   * Play healing effect
   * @param {Object} target - Target data
   */
  playHealingEffect(target) {
    const targetCard = this.getCharacterCard(target.id);
    if (!targetCard) return;
    
    targetCard.classList.add('healing-glow');
    
    setTimeout(() => {
      targetCard.classList.remove('healing-glow');
    }, 800);
  }

  /**
   * Show floating damage number
   * @param {Object} damageData - Damage data
   */
  showDamageNumber(damageData) {
    const { target, damage, isCritical, damageType } = damageData;
    
    const targetCard = this.getCharacterCard(target.id);
    if (!targetCard) return;
    
    const damageNumber = this.getDamageNumberFromPool();
    if (!damageNumber) return;
    
    // Setup damage number
    damageNumber.textContent = damage.toString();
    damageNumber.className = 'damage-number';
    
    if (isCritical) {
      damageNumber.classList.add('critical');
    }
    
    if (damageType) {
      damageNumber.classList.add(`${damageType}-damage`);
    }
    
    // Position relative to target card
    const rect = targetCard.getBoundingClientRect();
    damageNumber.style.left = `${rect.left + rect.width / 2}px`;
    damageNumber.style.top = `${rect.top}px`;
    damageNumber.style.display = 'block';
    
    // Animate
    this.animateDamageNumber(damageNumber);
  }

  /**
   * Show floating healing number
   * @param {Object} healData - Healing data
   */
  showHealingNumber(healData) {
    const { target, healing } = healData;
    
    const targetCard = this.getCharacterCard(target.id);
    if (!targetCard) return;
    
    const healingNumber = this.getDamageNumberFromPool();
    if (!healingNumber) return;
    
    // Setup healing number
    healingNumber.textContent = `+${healing}`;
    healingNumber.className = 'damage-number healing';
    
    // Position relative to target card
    const rect = targetCard.getBoundingClientRect();
    healingNumber.style.left = `${rect.left + rect.width / 2}px`;
    healingNumber.style.top = `${rect.top}px`;
    healingNumber.style.display = 'block';
    
    // Animate
    this.animateDamageNumber(healingNumber);
  }

  /**
   * Animate damage/healing number
   * @param {HTMLElement} numberElement - Number element to animate
   */
  animateDamageNumber(numberElement) {
    // Reset animation state
    numberElement.style.transform = 'translateY(0) scale(1)';
    numberElement.style.opacity = '1';
    
    // Animate upward with fade
    numberElement.style.transition = 'all 1.2s ease-out';
    numberElement.style.transform = 'translateY(-60px) scale(1.2)';
    numberElement.style.opacity = '0';
    
    // Return to pool after animation
    setTimeout(() => {
      this.returnDamageNumberToPool(numberElement);
    }, this.settings.damageDuration);
  }

  /**
   * Play death animation
   * @param {Object} character - Character data
   */
  async playDeathAnimation(character) {
    const characterCard = this.getCharacterCard(character.id);
    if (!characterCard) return;
    
    const animationId = `death-${Date.now()}`;
    this.activeAnimations.set(animationId, true);
    
    try {
      // Death effect
      characterCard.classList.add('dying');
      characterCard.style.transition = 'all 1s ease-out';
      characterCard.style.transform = 'scale(0.8) rotate(-10deg)';
      characterCard.style.opacity = '0.3';
      
      // Create death particles
      this.createDeathParticles(characterCard);
      
      await this.delay(1000);
      
      // Mark as dead
      characterCard.classList.remove('dying');
      characterCard.classList.add('dead');
      characterCard.style.transition = '';
      
    } finally {
      this.activeAnimations.delete(animationId);
    }
  }

  /**
   * Create death particle effects
   * @param {HTMLElement} characterCard - Character card element
   */
  createDeathParticles(characterCard) {
    const rect = characterCard.getBoundingClientRect();
    
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      particle.className = 'death-particle';
      particle.setAttribute('data-ui-component', 'death-particle');
      particle.setAttribute('data-ui-name', `death-particle-${i}`);
      
      particle.style.left = `${rect.left + rect.width / 2}px`;
      particle.style.top = `${rect.top + rect.height / 2}px`;
      
      document.body.appendChild(particle);
      
      // Random direction and distance
      const angle = (i / 8) * Math.PI * 2;
      const distance = 50 + Math.random() * 30;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      particle.style.transition = 'all 1s ease-out';
      particle.style.transform = `translate(${x}px, ${y}px) scale(0)`;
      particle.style.opacity = '0';
      
      // Remove after animation
      setTimeout(() => {
        particle.remove();
      }, 1000);
    }
  }

  /**
   * Play screen shake effect
   */
  playScreenShake() {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;
    
    gameContainer.classList.add('screen-shake');
    
    setTimeout(() => {
      gameContainer.classList.remove('screen-shake');
    }, this.settings.shakeDuration);
  }

  /**
   * Play combat start animation
   */
  async playCombatStartAnimation() {
    const combatContainer = document.getElementById('combat-container');
    if (!combatContainer) return;
    
    combatContainer.style.opacity = '0';
    combatContainer.style.transform = 'scale(0.9)';
    
    await this.delay(100);
    
    combatContainer.style.transition = 'all 0.5s ease-out';
    combatContainer.style.opacity = '1';
    combatContainer.style.transform = 'scale(1)';
    
    await this.delay(500);
    
    combatContainer.style.transition = '';
  }

  /**
   * Play combat end animation
   * @param {Object} endData - Combat end data
   */
  async playCombatEndAnimation(endData) {
    const combatContainer = document.getElementById('combat-container');
    if (!combatContainer) return;
    
    // Victory/defeat effect
    if (endData.result === 'victory') {
      combatContainer.classList.add('victory-glow');
    } else {
      combatContainer.classList.add('defeat-fade');
    }
    
    await this.delay(2000);
    
    // Fade out
    combatContainer.style.transition = 'all 0.5s ease-in';
    combatContainer.style.opacity = '0';
    combatContainer.style.transform = 'scale(0.9)';
    
    await this.delay(500);
    
    // Cleanup
    combatContainer.classList.remove('victory-glow', 'defeat-fade');
    combatContainer.style.transition = '';
    combatContainer.style.opacity = '';
    combatContainer.style.transform = '';
  }

  /**
   * Get character card element by ID
   * @param {string} characterId - Character ID
   * @returns {HTMLElement|null} Character card element
   */
  getCharacterCard(characterId) {
    return document.querySelector(`[data-combatant-id="${characterId}"]`);
  }

  /**
   * Get damage number from pool
   * @returns {HTMLElement|null} Damage number element
   */
  getDamageNumberFromPool() {
    const available = this.damageNumberPool.find(el => el.style.display === 'none');
    return available || null;
  }

  /**
   * Return damage number to pool
   * @param {HTMLElement} numberElement - Number element to return
   */
  returnDamageNumberToPool(numberElement) {
    numberElement.style.display = 'none';
    numberElement.style.transition = '';
    numberElement.style.transform = '';
    numberElement.style.opacity = '';
    numberElement.className = 'damage-number';
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if any animations are active
   * @returns {boolean} True if animations are active
   */
  hasActiveAnimations() {
    return this.activeAnimations.size > 0;
  }

  /**
   * Get animation status
   * @returns {Object} Animation status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      activeAnimations: this.activeAnimations.size,
      pooledElements: this.damageNumberPool.length
    };
  }

  /**
   * Dispose of animation system
   */
  dispose() {
    // Clear active animations
    this.activeAnimations.clear();
    
    // Remove pooled elements
    this.damageNumberPool.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    this.damageNumberPool = [];
    
    this.isInitialized = false;
    
    console.log('CombatAnimations disposed');
  }
}