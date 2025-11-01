/**
 * Audio Placeholder System for Dungeon Crawler Game
 * Provides audio feedback placeholders for UI interactions and combat events
 */

export class AudioPlaceholderSystem {
  constructor() {
    // Audio context for web audio API
    this.audioContext = null;
    this.masterGain = null;
    
    // Audio settings
    this.settings = {
      masterVolume: 0.7,
      sfxVolume: 0.8,
      uiVolume: 0.6,
      musicVolume: 0.5,
      enabled: true
    };
    
    // Sound definitions with synthesized audio parameters
    this.soundLibrary = {
      // UI Sounds
      buttonHover: { type: 'tone', frequency: 800, duration: 0.1, volume: 0.3 },
      buttonClick: { type: 'click', frequency: 1200, duration: 0.15, volume: 0.5 },
      buttonDisabled: { type: 'tone', frequency: 300, duration: 0.2, volume: 0.2 },
      modalOpen: { type: 'sweep', startFreq: 400, endFreq: 800, duration: 0.3, volume: 0.4 },
      modalClose: { type: 'sweep', startFreq: 800, endFreq: 400, duration: 0.3, volume: 0.4 },
      notification: { type: 'chord', frequencies: [523, 659, 784], duration: 0.5, volume: 0.4 },
      error: { type: 'buzz', frequency: 200, duration: 0.4, volume: 0.5 },
      success: { type: 'chord', frequencies: [523, 659, 784, 1047], duration: 0.6, volume: 0.5 },
      
      // Combat Sounds
      attack: { type: 'impact', frequency: 150, duration: 0.2, volume: 0.6 },
      criticalHit: { type: 'impact', frequency: 200, duration: 0.3, volume: 0.8 },
      block: { type: 'clang', frequency: 800, duration: 0.15, volume: 0.5 },
      dodge: { type: 'whoosh', frequency: 600, duration: 0.2, volume: 0.4 },
      
      // Magic Sounds
      fireball: { type: 'crackle', frequency: 300, duration: 0.4, volume: 0.6 },
      iceShard: { type: 'crystal', frequency: 1200, duration: 0.3, volume: 0.5 },
      lightning: { type: 'zap', frequency: 2000, duration: 0.2, volume: 0.7 },
      heal: { type: 'sparkle', frequency: 800, duration: 0.5, volume: 0.5 },
      
      // Character Sounds
      levelUp: { type: 'fanfare', frequencies: [523, 659, 784, 1047, 1319], duration: 1.0, volume: 0.6 },
      death: { type: 'descend', startFreq: 400, endFreq: 100, duration: 1.5, volume: 0.5 },
      
      // Item Sounds
      itemPickup: { type: 'pickup', frequency: 1000, duration: 0.2, volume: 0.4 },
      itemEquip: { type: 'equip', frequency: 600, duration: 0.3, volume: 0.5 },
      goldGain: { type: 'coins', frequency: 800, duration: 0.4, volume: 0.5 },
      
      // Ambient Sounds
      footstep: { type: 'step', frequency: 200, duration: 0.1, volume: 0.3 },
      doorOpen: { type: 'creak', frequency: 300, duration: 0.6, volume: 0.4 },
      doorClose: { type: 'thud', frequency: 150, duration: 0.4, volume: 0.4 }
    };
    
    // Currently playing sounds
    this.activeSounds = new Map();
    
    this.isInitialized = false;
  }

  /**
   * Initialize the audio system
   */
  async initialize() {
    try {
      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create master gain node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.settings.masterVolume;
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('AudioPlaceholderSystem initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize AudioPlaceholderSystem:', error);
      console.log('Audio will be disabled - this is normal in some browsers');
      return false;
    }
  }

  /**
   * Setup event listeners for game events
   */
  setupEventListeners() {
    // UI Events
    document.addEventListener('click', (event) => {
      if (event.target.matches('button, .btn, .action-btn')) {
        if (event.target.disabled || event.target.classList.contains('disabled')) {
          this.playSound('buttonDisabled');
        } else {
          this.playSound('buttonClick');
        }
      }
    });
    
    document.addEventListener('mouseover', (event) => {
      if (event.target.matches('button:not(:disabled), .btn:not(.disabled), .action-btn:not(.disabled)')) {
        this.playSound('buttonHover');
      }
    });
    
    // Combat Events
    window.addEventListener('combatEvent', (event) => {
      this.handleCombatEvent(event.detail);
    });
    
    // Character Events
    window.addEventListener('levelUp', () => {
      this.playSound('levelUp');
    });
    
    // Item Events
    window.addEventListener('itemEquipped', () => {
      this.playSound('itemEquip');
    });
    
    window.addEventListener('itemPickup', () => {
      this.playSound('itemPickup');
    });
    
    // Modal Events
    window.addEventListener('modalOpen', () => {
      this.playSound('modalOpen');
    });
    
    window.addEventListener('modalClose', () => {
      this.playSound('modalClose');
    });
    
    // Notification Events
    window.addEventListener('notification', (event) => {
      const type = event.detail?.type || 'notification';
      if (type === 'success') {
        this.playSound('success');
      } else if (type === 'error') {
        this.playSound('error');
      } else {
        this.playSound('notification');
      }
    });
  }

  /**
   * Handle combat events and play appropriate sounds
   * @param {Object} eventData - Combat event data
   */
  handleCombatEvent(eventData) {
    switch (eventData.type) {
      case 'actionExecuted':
        this.handleActionSound(eventData.data);
        break;
      case 'damageDealt':
        this.handleDamageSound(eventData.data);
        break;
      case 'healingApplied':
        this.playSound('heal');
        break;
      case 'characterDied':
        this.playSound('death');
        break;
      case 'combatStarted':
        this.playSound('notification');
        break;
      case 'combatEnded':
        if (eventData.data.result === 'victory') {
          this.playSound('success');
        }
        break;
    }
  }

  /**
   * Handle action-specific sounds
   * @param {Object} actionData - Action data
   */
  handleActionSound(actionData) {
    const { action, result } = actionData;
    
    if (!result.success) {
      this.playSound('error');
      return;
    }
    
    switch (action.type) {
      case 'attack':
        this.playSound('attack');
        break;
      case 'skill':
        this.handleSkillSound(action);
        break;
      case 'item':
        this.playSound('itemPickup');
        break;
      case 'defend':
        this.playSound('block');
        break;
      default:
        this.playSound('buttonClick');
    }
  }

  /**
   * Handle skill-specific sounds
   * @param {Object} skill - Skill data
   */
  handleSkillSound(skill) {
    switch (skill.element) {
      case 'fire':
        this.playSound('fireball');
        break;
      case 'ice':
        this.playSound('iceShard');
        break;
      case 'lightning':
        this.playSound('lightning');
        break;
      case 'healing':
        this.playSound('heal');
        break;
      default:
        this.playSound('attack');
    }
  }

  /**
   * Handle damage-specific sounds
   * @param {Object} damageData - Damage data
   */
  handleDamageSound(damageData) {
    const { isCritical, isBlocked, isDodged } = damageData;
    
    if (isDodged) {
      this.playSound('dodge');
    } else if (isBlocked) {
      this.playSound('block');
    } else if (isCritical) {
      this.playSound('criticalHit');
    } else {
      this.playSound('attack');
    }
  }

  /**
   * Play a sound by name
   * @param {string} soundName - Name of sound to play
   * @param {Object} options - Optional parameters
   */
  playSound(soundName, options = {}) {
    if (!this.isInitialized || !this.settings.enabled) {
      console.log(`[Audio] ${soundName}`); // Console placeholder
      return;
    }
    
    const soundDef = this.soundLibrary[soundName];
    if (!soundDef) {
      console.warn(`Sound not found: ${soundName}`);
      return;
    }
    
    try {
      // Resume audio context if suspended (browser policy)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      const sound = this.createSound(soundDef, options);
      if (sound) {
        this.activeSounds.set(soundName + Date.now(), sound);
      }
    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error);
      console.log(`[Audio] ${soundName}`); // Fallback to console
    }
  }

  /**
   * Create synthesized sound based on definition
   * @param {Object} soundDef - Sound definition
   * @param {Object} options - Optional parameters
   * @returns {Object} Sound object with stop method
   */
  createSound(soundDef, options = {}) {
    const volume = (options.volume || soundDef.volume || 0.5) * this.settings.sfxVolume;
    const duration = options.duration || soundDef.duration || 0.3;
    
    switch (soundDef.type) {
      case 'tone':
        return this.createTone(soundDef.frequency, duration, volume);
      case 'click':
        return this.createClick(soundDef.frequency, duration, volume);
      case 'sweep':
        return this.createSweep(soundDef.startFreq, soundDef.endFreq, duration, volume);
      case 'chord':
        return this.createChord(soundDef.frequencies, duration, volume);
      case 'buzz':
        return this.createBuzz(soundDef.frequency, duration, volume);
      case 'impact':
        return this.createImpact(soundDef.frequency, duration, volume);
      case 'clang':
        return this.createClang(soundDef.frequency, duration, volume);
      case 'whoosh':
        return this.createWhoosh(soundDef.frequency, duration, volume);
      case 'crackle':
        return this.createCrackle(soundDef.frequency, duration, volume);
      case 'crystal':
        return this.createCrystal(soundDef.frequency, duration, volume);
      case 'zap':
        return this.createZap(soundDef.frequency, duration, volume);
      case 'sparkle':
        return this.createSparkle(soundDef.frequency, duration, volume);
      case 'fanfare':
        return this.createFanfare(soundDef.frequencies, duration, volume);
      case 'descend':
        return this.createDescend(soundDef.startFreq, soundDef.endFreq, duration, volume);
      case 'pickup':
        return this.createPickup(soundDef.frequency, duration, volume);
      case 'equip':
        return this.createEquip(soundDef.frequency, duration, volume);
      case 'coins':
        return this.createCoins(soundDef.frequency, duration, volume);
      case 'step':
        return this.createStep(soundDef.frequency, duration, volume);
      case 'creak':
        return this.createCreak(soundDef.frequency, duration, volume);
      case 'thud':
        return this.createThud(soundDef.frequency, duration, volume);
      default:
        return this.createTone(440, duration, volume);
    }
  }

  /**
   * Create simple tone
   */
  createTone(frequency, duration, volume) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
    
    return { stop: () => oscillator.stop() };
  }

  /**
   * Create click sound
   */
  createClick(frequency, duration, volume) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
    
    return { stop: () => oscillator.stop() };
  }

  /**
   * Create frequency sweep
   */
  createSweep(startFreq, endFreq, duration, volume) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(endFreq, this.audioContext.currentTime + duration);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
    
    return { stop: () => oscillator.stop() };
  }

  /**
   * Create chord (multiple frequencies)
   */
  createChord(frequencies, duration, volume) {
    const oscillators = [];
    const chordVolume = volume / frequencies.length;
    
    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const delay = index * 0.05; // Slight delay for arpeggio effect
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + delay);
      gainNode.gain.linearRampToValueAtTime(chordVolume, this.audioContext.currentTime + delay + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime + delay);
      oscillator.stop(this.audioContext.currentTime + duration);
      
      oscillators.push(oscillator);
    });
    
    return { stop: () => oscillators.forEach(osc => osc.stop()) };
  }

  /**
   * Create buzz sound (for errors)
   */
  createBuzz(frequency, duration, volume) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sawtooth';
    
    // Tremolo effect for buzz
    const tremolo = this.audioContext.createOscillator();
    const tremoloGain = this.audioContext.createGain();
    
    tremolo.frequency.value = 10;
    tremolo.connect(tremoloGain);
    tremoloGain.gain.value = volume * 0.3;
    tremoloGain.connect(gainNode.gain);
    
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    tremolo.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
    tremolo.stop(this.audioContext.currentTime + duration);
    
    return { stop: () => { oscillator.stop(); tremolo.stop(); } };
  }

  /**
   * Create impact sound
   */
  createImpact(frequency, duration, volume) {
    // Create noise for impact
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    source.start(this.audioContext.currentTime);
    
    return { stop: () => source.stop() };
  }

  /**
   * Create clang sound (metallic)
   */
  createClang(frequency, duration, volume) {
    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator1.frequency.value = frequency;
    oscillator2.frequency.value = frequency * 1.5;
    oscillator1.type = 'triangle';
    oscillator2.type = 'square';
    
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    oscillator1.start(this.audioContext.currentTime);
    oscillator2.start(this.audioContext.currentTime);
    oscillator1.stop(this.audioContext.currentTime + duration);
    oscillator2.stop(this.audioContext.currentTime + duration);
    
    return { stop: () => { oscillator1.stop(); oscillator2.stop(); } };
  }

  /**
   * Create whoosh sound
   */
  createWhoosh(frequency, duration, volume) {
    return this.createSweep(frequency * 2, frequency * 0.5, duration, volume);
  }

  /**
   * Create crackle sound (fire)
   */
  createCrackle(frequency, duration, volume) {
    const oscillators = [];
    
    for (let i = 0; i < 5; i++) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.frequency.value = frequency + Math.random() * 200;
      oscillator.type = 'sawtooth';
      
      const startTime = this.audioContext.currentTime + Math.random() * duration * 0.5;
      const endTime = startTime + duration * 0.3;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.2, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
      
      oscillator.start(startTime);
      oscillator.stop(endTime);
      
      oscillators.push(oscillator);
    }
    
    return { stop: () => oscillators.forEach(osc => osc.stop()) };
  }

  /**
   * Create crystal sound (ice)
   */
  createCrystal(frequency, duration, volume) {
    return this.createChord([frequency, frequency * 1.25, frequency * 1.5, frequency * 2], duration, volume);
  }

  /**
   * Create zap sound (lightning)
   */
  createZap(frequency, duration, volume) {
    // Create noise burst
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.05));
    }
    
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    filter.type = 'highpass';
    filter.frequency.value = frequency;
    
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    source.start(this.audioContext.currentTime);
    
    return { stop: () => source.stop() };
  }

  /**
   * Create sparkle sound (healing)
   */
  createSparkle(frequency, duration, volume) {
    const oscillators = [];
    
    for (let i = 0; i < 8; i++) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.frequency.value = frequency * (1 + i * 0.2);
      oscillator.type = 'sine';
      
      const startTime = this.audioContext.currentTime + i * 0.05;
      const endTime = startTime + 0.2;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.15, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
      
      oscillator.start(startTime);
      oscillator.stop(endTime);
      
      oscillators.push(oscillator);
    }
    
    return { stop: () => oscillators.forEach(osc => osc.stop()) };
  }

  /**
   * Create fanfare sound (level up)
   */
  createFanfare(frequencies, duration, volume) {
    return this.createChord(frequencies, duration, volume);
  }

  /**
   * Create descending sound (death)
   */
  createDescend(startFreq, endFreq, duration, volume) {
    return this.createSweep(startFreq, endFreq, duration, volume);
  }

  /**
   * Create pickup sound
   */
  createPickup(frequency, duration, volume) {
    return this.createSweep(frequency, frequency * 1.5, duration, volume);
  }

  /**
   * Create equip sound
   */
  createEquip(frequency, duration, volume) {
    return this.createChord([frequency, frequency * 1.25], duration, volume);
  }

  /**
   * Create coins sound
   */
  createCoins(frequency, duration, volume) {
    const oscillators = [];
    
    for (let i = 0; i < 3; i++) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.frequency.value = frequency + i * 100;
      oscillator.type = 'triangle';
      
      const startTime = this.audioContext.currentTime + i * 0.1;
      const endTime = startTime + 0.15;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.4, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
      
      oscillator.start(startTime);
      oscillator.stop(endTime);
      
      oscillators.push(oscillator);
    }
    
    return { stop: () => oscillators.forEach(osc => osc.stop()) };
  }

  /**
   * Create step sound
   */
  createStep(frequency, duration, volume) {
    return this.createImpact(frequency, duration, volume * 0.5);
  }

  /**
   * Create creak sound
   */
  createCreak(frequency, duration, volume) {
    return this.createSweep(frequency, frequency * 0.8, duration, volume);
  }

  /**
   * Create thud sound
   */
  createThud(frequency, duration, volume) {
    return this.createImpact(frequency * 0.5, duration, volume);
  }

  /**
   * Set master volume
   * @param {number} volume - Volume level (0-1)
   */
  setMasterVolume(volume) {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.masterVolume;
    }
  }

  /**
   * Set SFX volume
   * @param {number} volume - Volume level (0-1)
   */
  setSFXVolume(volume) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set UI volume
   * @param {number} volume - Volume level (0-1)
   */
  setUIVolume(volume) {
    this.settings.uiVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Enable or disable audio
   * @param {boolean} enabled - Whether audio is enabled
   */
  setEnabled(enabled) {
    this.settings.enabled = enabled;
  }

  /**
   * Stop all currently playing sounds
   */
  stopAllSounds() {
    this.activeSounds.forEach(sound => {
      try {
        sound.stop();
      } catch (error) {
        // Sound may have already stopped
      }
    });
    this.activeSounds.clear();
  }

  /**
   * Get audio system status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      enabled: this.settings.enabled,
      activeSounds: this.activeSounds.size,
      audioContextState: this.audioContext?.state || 'not initialized',
      volumes: {
        master: this.settings.masterVolume,
        sfx: this.settings.sfxVolume,
        ui: this.settings.uiVolume,
        music: this.settings.musicVolume
      }
    };
  }

  /**
   * Dispose of audio system
   */
  dispose() {
    this.stopAllSounds();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.masterGain = null;
    this.isInitialized = false;
    
    console.log('AudioPlaceholderSystem disposed');
  }
}