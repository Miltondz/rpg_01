/**
 * Visual Effects System for Dungeon Crawler Game
 * Handles particle effects, screen effects, status indicators, and visual feedback
 */

export class VisualEffectsSystem {
  constructor() {
    // Particle system
    this.particlePool = [];
    this.activeParticles = [];
    this.maxParticles = 100;
    
    // Screen effects
    this.screenEffects = new Map();
    
    // Status indicators
    this.statusIndicators = new Map();
    
    // Effect settings
    this.settings = {
      particleLifetime: 2000,
      screenEffectDuration: 500,
      statusIndicatorDuration: 3000,
      particleGravity: 0.5,
      particleSpeed: 2
    };
    
    this.isInitialized = false;
  }

  /**
   * Initialize the visual effects system
   */
  initialize() {
    try {
      this.addEffectStyles();
      this.createParticlePool();
      this.setupEventListeners();
      this.startAnimationLoop();
      
      this.isInitialized = true;
      console.log('VisualEffectsSystem initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize VisualEffectsSystem:', error);
      return false;
    }
  }

  /**
   * Add CSS styles for visual effects
   */
  addEffectStyles() {
    if (document.getElementById('visual-effects-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'visual-effects-styles';
    style.textContent = `
      /* Particle effects */
      .particle {
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        border-radius: 50%;
        will-change: transform, opacity;
      }
      
      .particle.fire {
        background: radial-gradient(circle, #ff6600, #ff0000);
        box-shadow: 0 0 10px #ff6600;
      }
      
      .particle.ice {
        background: radial-gradient(circle, #00aaff, #0066cc);
        box-shadow: 0 0 10px #00aaff;
      }
      
      .particle.lightning {
        background: radial-gradient(circle, #ffff00, #ffaa00);
        box-shadow: 0 0 15px #ffff00;
      }
      
      .particle.healing {
        background: radial-gradient(circle, #00ff00, #00aa00);
        box-shadow: 0 0 12px #00ff00;
      }
      
      .particle.magic {
        background: radial-gradient(circle, #8800ff, #4400aa);
        box-shadow: 0 0 10px #8800ff;
      }
      
      .particle.gold {
        background: radial-gradient(circle, #ffd700, #ffaa00);
        box-shadow: 0 0 8px #ffd700;
      }
      
      .particle.experience {
        background: radial-gradient(circle, #00ffff, #0088aa);
        box-shadow: 0 0 10px #00ffff;
      }
      
      /* Screen effects */
      .screen-effect {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 9998;
      }
      
      .screen-flash {
        background: rgba(255, 255, 255, 0.8);
        animation: flashEffect 0.2s ease-out;
      }
      
      .screen-fade {
        background: rgba(0, 0, 0, 0.8);
        animation: fadeEffect 1s ease-in-out;
      }
      
      .screen-shake {
        animation: shakeEffect 0.5s ease-in-out;
      }
      
      .screen-blur {
        backdrop-filter: blur(5px);
        animation: blurEffect 0.8s ease-in-out;
      }
      
      @keyframes flashEffect {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
      }
      
      @keyframes fadeEffect {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
      }
      
      @keyframes shakeEffect {
        0%, 100% { transform: translateX(0); }
        10% { transform: translateX(-10px); }
        20% { transform: translateX(10px); }
        30% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        50% { transform: translateX(-6px); }
        60% { transform: translateX(6px); }
        70% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
        90% { transform: translateX(-2px); }
      }
      
      @keyframes blurEffect {
        0%, 100% { backdrop-filter: blur(0px); }
        50% { backdrop-filter: blur(5px); }
      }
      
      /* Status effect indicators */
      .status-indicator {
        position: absolute;
        top: -10px;
        right: -10px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        z-index: 10;
        animation: statusPulse 2s ease-in-out infinite;
      }
      
      .status-indicator.poison {
        background: #8800aa;
        color: white;
        box-shadow: 0 0 8px #8800aa;
      }
      
      .status-indicator.burn {
        background: #ff4400;
        color: white;
        box-shadow: 0 0 8px #ff4400;
      }
      
      .status-indicator.freeze {
        background: #0088ff;
        color: white;
        box-shadow: 0 0 8px #0088ff;
      }
      
      .status-indicator.buff {
        background: #00ff00;
        color: black;
        box-shadow: 0 0 8px #00ff00;
      }
      
      .status-indicator.debuff {
        background: #ff0000;
        color: white;
        box-shadow: 0 0 8px #ff0000;
      }
      
      @keyframes statusPulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.2); opacity: 1; }
      }
      
      /* Level up effects */
      .level-up-burst {
        position: fixed;
        pointer-events: none;
        z-index: 9999;
      }
      
      .level-up-ray {
        position: absolute;
        background: linear-gradient(90deg, transparent, #ffff00, transparent);
        transform-origin: left center;
        animation: levelUpRay 1.5s ease-out;
      }
      
      @keyframes levelUpRay {
        0% {
          transform: scaleX(0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: scaleX(1) rotate(360deg);
          opacity: 0;
        }
      }
      
      /* Combat hit effects */
      .hit-spark {
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        width: 4px;
        height: 4px;
        background: #ffff00;
        border-radius: 50%;
        box-shadow: 0 0 6px #ffff00;
      }
      
      /* Damage type effects */
      .damage-effect {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        border-radius: inherit;
      }
      
      .damage-effect.physical {
        background: radial-gradient(circle, rgba(255, 255, 255, 0.3), transparent);
        animation: physicalHit 0.3s ease-out;
      }
      
      .damage-effect.fire {
        background: radial-gradient(circle, rgba(255, 100, 0, 0.5), transparent);
        animation: fireHit 0.5s ease-out;
      }
      
      .damage-effect.ice {
        background: radial-gradient(circle, rgba(0, 170, 255, 0.5), transparent);
        animation: iceHit 0.4s ease-out;
      }
      
      .damage-effect.lightning {
        background: radial-gradient(circle, rgba(255, 255, 0, 0.6), transparent);
        animation: lightningHit 0.2s ease-out;
      }
      
      @keyframes physicalHit {
        0%, 100% { opacity: 0; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.1); }
      }
      
      @keyframes fireHit {
        0% { opacity: 0; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.2); }
        100% { opacity: 0; transform: scale(1.5); }
      }
      
      @keyframes iceHit {
        0% { opacity: 0; transform: scale(1) rotate(0deg); }
        50% { opacity: 1; transform: scale(1.1) rotate(5deg); }
        100% { opacity: 0; transform: scale(1) rotate(0deg); }
      }
      
      @keyframes lightningHit {
        0%, 100% { opacity: 0; }
        25%, 75% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      /* Buff/Debuff auras */
      .aura-effect {
        position: absolute;
        top: -5px;
        left: -5px;
        right: -5px;
        bottom: -5px;
        pointer-events: none;
        border-radius: inherit;
        z-index: -1;
      }
      
      .aura-effect.strength {
        box-shadow: 0 0 15px rgba(255, 0, 0, 0.5);
        animation: strengthAura 2s ease-in-out infinite;
      }
      
      .aura-effect.defense {
        box-shadow: 0 0 15px rgba(0, 0, 255, 0.5);
        animation: defenseAura 2s ease-in-out infinite;
      }
      
      .aura-effect.speed {
        box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
        animation: speedAura 1s ease-in-out infinite;
      }
      
      @keyframes strengthAura {
        0%, 100% { box-shadow: 0 0 15px rgba(255, 0, 0, 0.3); }
        50% { box-shadow: 0 0 25px rgba(255, 0, 0, 0.7); }
      }
      
      @keyframes defenseAura {
        0%, 100% { box-shadow: 0 0 15px rgba(0, 0, 255, 0.3); }
        50% { box-shadow: 0 0 25px rgba(0, 0, 255, 0.7); }
      }
      
      @keyframes speedAura {
        0%, 100% { box-shadow: 0 0 15px rgba(0, 255, 0, 0.3); }
        50% { box-shadow: 0 0 25px rgba(0, 255, 0, 0.7); }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Create particle pool for performance
   */
  createParticlePool() {
    for (let i = 0; i < this.maxParticles; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.display = 'none';
      document.body.appendChild(particle);
      
      this.particlePool.push({
        element: particle,
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        size: 0,
        type: 'default'
      });
    }
  }

  /**
   * Setup event listeners for combat and game events
   */
  setupEventListeners() {
    // Combat events
    window.addEventListener('combatEvent', (event) => {
      this.handleCombatEvent(event.detail);
    });
    
    // Character events
    window.addEventListener('levelUp', (event) => {
      this.playLevelUpEffect(event.detail);
    });
    
    // Item events
    window.addEventListener('itemEquipped', (event) => {
      this.playEquipmentEffect(event.detail);
    });
    
    // Loot events
    window.addEventListener('lootGained', (event) => {
      this.playLootEffect(event.detail);
    });
  }

  /**
   * Handle combat events and trigger appropriate effects
   * @param {Object} eventData - Combat event data
   */
  handleCombatEvent(eventData) {
    switch (eventData.type) {
      case 'damageDealt':
        this.playDamageEffect(eventData.data);
        break;
      case 'healingApplied':
        this.playHealingEffect(eventData.data);
        break;
      case 'skillUsed':
        this.playSkillEffect(eventData.data);
        break;
      case 'statusApplied':
        this.showStatusIndicator(eventData.data);
        break;
      case 'criticalHit':
        this.playCriticalHitEffect(eventData.data);
        break;
      case 'combatStarted':
        this.playScreenEffect('fade');
        break;
      case 'combatEnded':
        this.playVictoryEffect(eventData.data);
        break;
    }
  }

  /**
   * Play damage effect with particles and screen shake
   * @param {Object} damageData - Damage event data
   */
  playDamageEffect(damageData) {
    const { target, damage, damageType, isCritical } = damageData;
    
    // Get target element
    const targetElement = this.getTargetElement(target.id);
    if (!targetElement) return;
    
    // Create damage particles
    this.createDamageParticles(targetElement, damageType, damage);
    
    // Add damage effect overlay
    this.addDamageOverlay(targetElement, damageType);
    
    // Screen shake for heavy damage
    if (damage > 20 || isCritical) {
      this.playScreenEffect('shake');
    }
    
    // Hit sparks for critical hits
    if (isCritical) {
      this.createHitSparks(targetElement);
    }
  }

  /**
   * Play healing effect with green particles
   * @param {Object} healData - Healing event data
   */
  playHealingEffect(healData) {
    const { target, healing } = healData;
    
    const targetElement = this.getTargetElement(target.id);
    if (!targetElement) return;
    
    // Create healing particles
    this.createHealingParticles(targetElement, healing);
    
    // Add healing glow
    this.addHealingGlow(targetElement);
  }

  /**
   * Play skill effect based on skill type
   * @param {Object} skillData - Skill event data
   */
  playSkillEffect(skillData) {
    const { caster, skill, targets } = skillData;
    
    const casterElement = this.getTargetElement(caster.id);
    if (!casterElement) return;
    
    // Create skill-specific effects
    switch (skill.element) {
      case 'fire':
        this.createFireEffect(casterElement, targets);
        break;
      case 'ice':
        this.createIceEffect(casterElement, targets);
        break;
      case 'lightning':
        this.createLightningEffect(casterElement, targets);
        break;
      case 'healing':
        this.createMassHealingEffect(targets);
        break;
      default:
        this.createMagicEffect(casterElement, targets);
    }
  }

  /**
   * Show status effect indicator
   * @param {Object} statusData - Status effect data
   */
  showStatusIndicator(statusData) {
    const { target, effect } = statusData;
    
    const targetElement = this.getTargetElement(target.id);
    if (!targetElement) return;
    
    // Remove existing status indicator of same type
    const existingIndicator = targetElement.querySelector(`.status-indicator.${effect.type}`);
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Create new status indicator
    const indicator = document.createElement('div');
    indicator.className = `status-indicator ${effect.type}`;
    indicator.textContent = this.getStatusIcon(effect.type);
    indicator.title = `${effect.name} (${effect.duration} turns)`;
    
    targetElement.appendChild(indicator);
    
    // Add aura effect for buffs/debuffs
    if (effect.category === 'buff' || effect.category === 'debuff') {
      this.addAuraEffect(targetElement, effect.type);
    }
    
    // Auto-remove after duration
    setTimeout(() => {
      indicator.remove();
      this.removeAuraEffect(targetElement, effect.type);
    }, effect.duration * 1000);
  }

  /**
   * Play critical hit effect
   * @param {Object} critData - Critical hit data
   */
  playCriticalHitEffect(critData) {
    const { target } = critData;
    
    const targetElement = this.getTargetElement(target.id);
    if (!targetElement) return;
    
    // Screen flash
    this.playScreenEffect('flash');
    
    // Extra hit sparks
    this.createHitSparks(targetElement, 15);
    
    // Screen shake
    this.playScreenEffect('shake');
  }

  /**
   * Play level up effect
   * @param {Object} levelUpData - Level up data
   */
  playLevelUpEffect(levelUpData) {
    const { character } = levelUpData;
    
    const characterElement = this.getTargetElement(character.id);
    if (!characterElement) return;
    
    // Create level up burst
    this.createLevelUpBurst(characterElement);
    
    // Experience particles
    this.createExperienceParticles(characterElement);
    
    // Screen flash
    this.playScreenEffect('flash');
  }

  /**
   * Play equipment effect
   * @param {Object} equipData - Equipment data
   */
  playEquipmentEffect(equipData) {
    const { character, item } = equipData;
    
    const characterElement = this.getTargetElement(character.id);
    if (!characterElement) return;
    
    // Create equipment sparkles
    this.createEquipmentSparkles(characterElement, item.rarity);
  }

  /**
   * Play loot effect
   * @param {Object} lootData - Loot data
   */
  playLootEffect(lootData) {
    const { items, position } = lootData;
    
    // Create gold particles for valuable items
    items.forEach(item => {
      if (item.value > 50) {
        this.createGoldParticles(position, item.value);
      }
    });
  }

  /**
   * Play victory effect
   * @param {Object} victoryData - Victory data
   */
  playVictoryEffect(victoryData) {
    if (victoryData.result === 'victory') {
      // Victory particles across screen
      this.createVictoryParticles();
      
      // Screen flash
      this.playScreenEffect('flash');
    }
  }

  /**
   * Create damage particles
   * @param {HTMLElement} targetElement - Target element
   * @param {string} damageType - Type of damage
   * @param {number} damage - Damage amount
   */
  createDamageParticles(targetElement, damageType = 'physical', damage = 10) {
    const rect = targetElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const particleCount = Math.min(Math.floor(damage / 5) + 3, 12);
    
    for (let i = 0; i < particleCount; i++) {
      const particle = this.getParticleFromPool();
      if (!particle) break;
      
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      
      particle.x = centerX;
      particle.y = centerY;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 1; // Slight upward bias
      particle.life = 0;
      particle.maxLife = 800 + Math.random() * 400;
      particle.size = 3 + Math.random() * 4;
      particle.type = damageType;
      particle.active = true;
      
      particle.element.className = `particle ${damageType}`;
      particle.element.style.width = particle.size + 'px';
      particle.element.style.height = particle.size + 'px';
      particle.element.style.display = 'block';
      
      this.activeParticles.push(particle);
    }
  }

  /**
   * Create healing particles
   * @param {HTMLElement} targetElement - Target element
   * @param {number} healing - Healing amount
   */
  createHealingParticles(targetElement, healing = 10) {
    const rect = targetElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const particleCount = Math.min(Math.floor(healing / 3) + 5, 15);
    
    for (let i = 0; i < particleCount; i++) {
      const particle = this.getParticleFromPool();
      if (!particle) break;
      
      particle.x = centerX + (Math.random() - 0.5) * rect.width;
      particle.y = centerY + rect.height / 2;
      particle.vx = (Math.random() - 0.5) * 2;
      particle.vy = -2 - Math.random() * 2; // Upward movement
      particle.life = 0;
      particle.maxLife = 1200 + Math.random() * 600;
      particle.size = 4 + Math.random() * 3;
      particle.type = 'healing';
      particle.active = true;
      
      particle.element.className = 'particle healing';
      particle.element.style.width = particle.size + 'px';
      particle.element.style.height = particle.size + 'px';
      particle.element.style.display = 'block';
      
      this.activeParticles.push(particle);
    }
  }

  /**
   * Create fire effect
   * @param {HTMLElement} casterElement - Caster element
   * @param {Array} targets - Target elements
   */
  createFireEffect(casterElement, targets) {
    targets.forEach(target => {
      const targetElement = this.getTargetElement(target.id);
      if (!targetElement) return;
      
      // Fire particles
      this.createDamageParticles(targetElement, 'fire', 15);
      
      // Fire overlay
      this.addDamageOverlay(targetElement, 'fire');
    });
  }

  /**
   * Create ice effect
   * @param {HTMLElement} casterElement - Caster element
   * @param {Array} targets - Target elements
   */
  createIceEffect(casterElement, targets) {
    targets.forEach(target => {
      const targetElement = this.getTargetElement(target.id);
      if (!targetElement) return;
      
      // Ice particles
      this.createDamageParticles(targetElement, 'ice', 12);
      
      // Ice overlay
      this.addDamageOverlay(targetElement, 'ice');
    });
  }

  /**
   * Create lightning effect
   * @param {HTMLElement} casterElement - Caster element
   * @param {Array} targets - Target elements
   */
  createLightningEffect(casterElement, targets) {
    // Screen flash for lightning
    this.playScreenEffect('flash');
    
    targets.forEach(target => {
      const targetElement = this.getTargetElement(target.id);
      if (!targetElement) return;
      
      // Lightning particles
      this.createDamageParticles(targetElement, 'lightning', 18);
      
      // Lightning overlay
      this.addDamageOverlay(targetElement, 'lightning');
    });
  }

  /**
   * Create magic effect
   * @param {HTMLElement} casterElement - Caster element
   * @param {Array} targets - Target elements
   */
  createMagicEffect(casterElement, targets) {
    targets.forEach(target => {
      const targetElement = this.getTargetElement(target.id);
      if (!targetElement) return;
      
      // Magic particles
      this.createDamageParticles(targetElement, 'magic', 10);
    });
  }

  /**
   * Create mass healing effect
   * @param {Array} targets - Target elements
   */
  createMassHealingEffect(targets) {
    targets.forEach(target => {
      const targetElement = this.getTargetElement(target.id);
      if (!targetElement) return;
      
      this.createHealingParticles(targetElement, 20);
      this.addHealingGlow(targetElement);
    });
  }

  /**
   * Create hit sparks
   * @param {HTMLElement} targetElement - Target element
   * @param {number} count - Number of sparks
   */
  createHitSparks(targetElement, count = 8) {
    const rect = targetElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      spark.className = 'hit-spark';
      spark.style.left = centerX + 'px';
      spark.style.top = centerY + 'px';
      
      document.body.appendChild(spark);
      
      const angle = (i / count) * Math.PI * 2;
      const distance = 20 + Math.random() * 30;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      spark.style.transition = 'all 0.3s ease-out';
      spark.style.transform = `translate(${x}px, ${y}px) scale(0)`;
      spark.style.opacity = '0';
      
      setTimeout(() => {
        spark.remove();
      }, 300);
    }
  }

  /**
   * Create level up burst effect
   * @param {HTMLElement} characterElement - Character element
   */
  createLevelUpBurst(characterElement) {
    const rect = characterElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const burst = document.createElement('div');
    burst.className = 'level-up-burst';
    burst.style.left = centerX + 'px';
    burst.style.top = centerY + 'px';
    
    // Create rays
    for (let i = 0; i < 8; i++) {
      const ray = document.createElement('div');
      ray.className = 'level-up-ray';
      ray.style.width = '100px';
      ray.style.height = '2px';
      ray.style.transform = `rotate(${i * 45}deg)`;
      ray.style.animationDelay = `${i * 0.1}s`;
      
      burst.appendChild(ray);
    }
    
    document.body.appendChild(burst);
    
    setTimeout(() => {
      burst.remove();
    }, 1500);
  }

  /**
   * Create experience particles
   * @param {HTMLElement} characterElement - Character element
   */
  createExperienceParticles(characterElement) {
    const rect = characterElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < 20; i++) {
      const particle = this.getParticleFromPool();
      if (!particle) break;
      
      particle.x = centerX;
      particle.y = centerY;
      particle.vx = (Math.random() - 0.5) * 4;
      particle.vy = -3 - Math.random() * 3;
      particle.life = 0;
      particle.maxLife = 1500 + Math.random() * 500;
      particle.size = 3 + Math.random() * 3;
      particle.type = 'experience';
      particle.active = true;
      
      particle.element.className = 'particle experience';
      particle.element.style.width = particle.size + 'px';
      particle.element.style.height = particle.size + 'px';
      particle.element.style.display = 'block';
      
      this.activeParticles.push(particle);
    }
  }

  /**
   * Create equipment sparkles
   * @param {HTMLElement} characterElement - Character element
   * @param {string} rarity - Item rarity
   */
  createEquipmentSparkles(characterElement, rarity = 'common') {
    const rect = characterElement.getBoundingClientRect();
    
    const sparkleCount = rarity === 'epic' ? 15 : rarity === 'rare' ? 10 : 5;
    
    for (let i = 0; i < sparkleCount; i++) {
      const particle = this.getParticleFromPool();
      if (!particle) break;
      
      particle.x = rect.left + Math.random() * rect.width;
      particle.y = rect.top + Math.random() * rect.height;
      particle.vx = (Math.random() - 0.5) * 2;
      particle.vy = -1 - Math.random();
      particle.life = 0;
      particle.maxLife = 1000 + Math.random() * 500;
      particle.size = 2 + Math.random() * 2;
      particle.type = 'gold';
      particle.active = true;
      
      particle.element.className = 'particle gold';
      particle.element.style.width = particle.size + 'px';
      particle.element.style.height = particle.size + 'px';
      particle.element.style.display = 'block';
      
      this.activeParticles.push(particle);
    }
  }

  /**
   * Create gold particles
   * @param {Object} position - Position {x, y}
   * @param {number} value - Gold value
   */
  createGoldParticles(position, value) {
    const particleCount = Math.min(Math.floor(value / 10) + 3, 20);
    
    for (let i = 0; i < particleCount; i++) {
      const particle = this.getParticleFromPool();
      if (!particle) break;
      
      particle.x = position.x;
      particle.y = position.y;
      particle.vx = (Math.random() - 0.5) * 3;
      particle.vy = -2 - Math.random() * 2;
      particle.life = 0;
      particle.maxLife = 1200 + Math.random() * 800;
      particle.size = 3 + Math.random() * 3;
      particle.type = 'gold';
      particle.active = true;
      
      particle.element.className = 'particle gold';
      particle.element.style.width = particle.size + 'px';
      particle.element.style.height = particle.size + 'px';
      particle.element.style.display = 'block';
      
      this.activeParticles.push(particle);
    }
  }

  /**
   * Create victory particles
   */
  createVictoryParticles() {
    for (let i = 0; i < 50; i++) {
      const particle = this.getParticleFromPool();
      if (!particle) break;
      
      particle.x = Math.random() * window.innerWidth;
      particle.y = window.innerHeight + 50;
      particle.vx = (Math.random() - 0.5) * 2;
      particle.vy = -3 - Math.random() * 3;
      particle.life = 0;
      particle.maxLife = 3000 + Math.random() * 2000;
      particle.size = 4 + Math.random() * 4;
      particle.type = Math.random() > 0.5 ? 'gold' : 'experience';
      particle.active = true;
      
      particle.element.className = `particle ${particle.type}`;
      particle.element.style.width = particle.size + 'px';
      particle.element.style.height = particle.size + 'px';
      particle.element.style.display = 'block';
      
      this.activeParticles.push(particle);
    }
  }

  /**
   * Add damage overlay effect
   * @param {HTMLElement} targetElement - Target element
   * @param {string} damageType - Type of damage
   */
  addDamageOverlay(targetElement, damageType) {
    const overlay = document.createElement('div');
    overlay.className = `damage-effect ${damageType}`;
    
    targetElement.appendChild(overlay);
    
    setTimeout(() => {
      overlay.remove();
    }, 500);
  }

  /**
   * Add healing glow effect
   * @param {HTMLElement} targetElement - Target element
   */
  addHealingGlow(targetElement) {
    targetElement.classList.add('healing-glow');
    
    setTimeout(() => {
      targetElement.classList.remove('healing-glow');
    }, 800);
  }

  /**
   * Add aura effect
   * @param {HTMLElement} targetElement - Target element
   * @param {string} effectType - Effect type
   */
  addAuraEffect(targetElement, effectType) {
    const aura = document.createElement('div');
    aura.className = `aura-effect ${effectType}`;
    aura.dataset.effectType = effectType;
    
    targetElement.appendChild(aura);
  }

  /**
   * Remove aura effect
   * @param {HTMLElement} targetElement - Target element
   * @param {string} effectType - Effect type
   */
  removeAuraEffect(targetElement, effectType) {
    const aura = targetElement.querySelector(`[data-effect-type="${effectType}"]`);
    if (aura) {
      aura.remove();
    }
  }

  /**
   * Play screen effect
   * @param {string} effectType - Type of screen effect
   */
  playScreenEffect(effectType) {
    if (this.screenEffects.has(effectType)) return; // Prevent duplicate effects
    
    const effect = document.createElement('div');
    effect.className = `screen-effect screen-${effectType}`;
    
    document.body.appendChild(effect);
    this.screenEffects.set(effectType, effect);
    
    const duration = this.settings.screenEffectDuration;
    
    setTimeout(() => {
      effect.remove();
      this.screenEffects.delete(effectType);
    }, duration);
  }

  /**
   * Get status icon for effect type
   * @param {string} effectType - Effect type
   * @returns {string} Icon character
   */
  getStatusIcon(effectType) {
    const icons = {
      poison: '☠',
      burn: '🔥',
      freeze: '❄',
      buff: '↑',
      debuff: '↓',
      strength: '💪',
      defense: '🛡',
      speed: '⚡'
    };
    
    return icons[effectType] || '●';
  }

  /**
   * Get target element by ID
   * @param {string} targetId - Target ID
   * @returns {HTMLElement|null} Target element
   */
  getTargetElement(targetId) {
    return document.querySelector(`[data-combatant-id="${targetId}"]`) ||
           document.querySelector(`[data-character-id="${targetId}"]`);
  }

  /**
   * Get particle from pool
   * @returns {Object|null} Particle object
   */
  getParticleFromPool() {
    return this.particlePool.find(particle => !particle.active) || null;
  }

  /**
   * Return particle to pool
   * @param {Object} particle - Particle object
   */
  returnParticleToPool(particle) {
    particle.active = false;
    particle.element.style.display = 'none';
    particle.element.style.transform = '';
    particle.element.style.opacity = '';
  }

  /**
   * Start animation loop
   */
  startAnimationLoop() {
    const animate = () => {
      this.updateParticles();
      requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * Update all active particles
   */
  updateParticles() {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      
      // Update particle physics
      particle.life += 16; // Assume 60fps
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += this.settings.particleGravity; // Gravity
      
      // Update visual properties
      const lifeRatio = particle.life / particle.maxLife;
      const opacity = Math.max(0, 1 - lifeRatio);
      const scale = 1 - lifeRatio * 0.5;
      
      particle.element.style.left = particle.x + 'px';
      particle.element.style.top = particle.y + 'px';
      particle.element.style.opacity = opacity;
      particle.element.style.transform = `scale(${scale})`;
      
      // Remove expired particles
      if (particle.life >= particle.maxLife) {
        this.returnParticleToPool(particle);
        this.activeParticles.splice(i, 1);
      }
    }
  }

  /**
   * Get visual effects status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      activeParticles: this.activeParticles.length,
      pooledParticles: this.particlePool.length,
      screenEffects: this.screenEffects.size,
      statusIndicators: this.statusIndicators.size
    };
  }

  /**
   * Dispose of visual effects system
   */
  dispose() {
    // Clear particles
    this.activeParticles.forEach(particle => {
      this.returnParticleToPool(particle);
    });
    this.activeParticles = [];
    
    // Remove pooled particles
    this.particlePool.forEach(particle => {
      if (particle.element.parentNode) {
        particle.element.parentNode.removeChild(particle.element);
      }
    });
    this.particlePool = [];
    
    // Clear screen effects
    this.screenEffects.forEach(effect => {
      if (effect.parentNode) {
        effect.parentNode.removeChild(effect);
      }
    });
    this.screenEffects.clear();
    
    // Clear status indicators
    this.statusIndicators.clear();
    
    // Remove styles
    const styles = document.getElementById('visual-effects-styles');
    if (styles) {
      styles.remove();
    }
    
    this.isInitialized = false;
    
    console.log('VisualEffectsSystem disposed');
  }
}