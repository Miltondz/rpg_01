/**
 * ExperienceSystem - Manages experience points, leveling, and progression
 * Handles XP calculations, level-up process, and party XP distribution
 */

export class ExperienceSystem {
  constructor() {
    // XP distribution settings
    this.baseXPFormula = 50; // Base multiplier for XP formula
    this.maxLevel = 20;
    this.partyXPBonus = 0.1; // 10% bonus XP when in party
    
    // Level-up animation queue
    this.levelUpQueue = [];
    this.isProcessingLevelUp = false;
    
    console.log('ExperienceSystem initialized');
  }

  /**
   * Calculate experience needed for a specific level
   * Formula: XP_needed = 50 × Level²
   * @param {number} level - Target level
   * @returns {number} Experience needed for that level
   */
  getExperienceForLevel(level) {
    if (level <= 1) return 0;
    return this.baseXPFormula * (level * level);
  }

  /**
   * Get total experience needed from level 1 to target level
   * @param {number} level - Target level
   * @returns {number} Total experience needed
   */
  getTotalExperienceForLevel(level) {
    let total = 0;
    for (let i = 2; i <= level; i++) {
      total += this.getExperienceForLevel(i);
    }
    return total;
  }

  /**
   * Calculate experience needed for next level
   * @param {Object} character - Character object
   * @returns {number} Experience needed to level up
   */
  getExperienceToNextLevel(character) {
    if (character.level >= this.maxLevel) return 0;
    
    const nextLevelXP = this.getExperienceForLevel(character.level + 1);
    const currentLevelXP = this.getTotalExperienceForLevel(character.level);
    const neededForNext = currentLevelXP + nextLevelXP;
    
    return Math.max(0, neededForNext - character.experience);
  }

  /**
   * Get experience progress percentage to next level
   * @param {Object} character - Character object
   * @returns {number} Progress percentage (0-1)
   */
  getExperienceProgress(character) {
    if (character.level >= this.maxLevel) return 1;
    
    const currentLevelXP = this.getTotalExperienceForLevel(character.level);
    const nextLevelXP = this.getTotalExperienceForLevel(character.level + 1);
    const progressXP = character.experience - currentLevelXP;
    const neededXP = nextLevelXP - currentLevelXP;
    
    return Math.max(0, Math.min(1, progressXP / neededXP));
  }

  /**
   * Distribute experience to party members
   * @param {Array} party - Array of character objects
   * @param {number} totalXP - Total XP to distribute
   * @param {Object} options - Distribution options
   * @returns {Object} Distribution results
   */
  distributeExperience(party, totalXP, options = {}) {
    const {
      equalShare = true,
      aliveOnly = true,
      bonusXP = 0
    } = options;

    // Filter party members
    let eligibleMembers = party;
    if (aliveOnly) {
      eligibleMembers = party.filter(char => char.isAlive());
    }

    if (eligibleMembers.length === 0) {
      return { distributed: 0, levelUps: [] };
    }

    // Calculate base XP per member
    let xpPerMember = totalXP;
    if (equalShare) {
      xpPerMember = Math.floor(totalXP / eligibleMembers.length);
    }

    // Apply party bonus
    if (eligibleMembers.length > 1) {
      xpPerMember = Math.floor(xpPerMember * (1 + this.partyXPBonus));
    }

    // Add bonus XP
    xpPerMember += bonusXP;

    // Distribute XP and track level-ups
    const results = {
      distributed: 0,
      levelUps: [],
      xpPerMember: xpPerMember
    };

    for (const character of eligibleMembers) {
      const leveledUp = this.addExperience(character, xpPerMember);
      results.distributed += xpPerMember;
      
      if (leveledUp) {
        results.levelUps.push({
          character: character,
          newLevel: character.level,
          oldLevel: character.level - 1
        });
      }
    }

    return results;
  }

  /**
   * Add experience to a character
   * @param {Object} character - Character object
   * @param {number} xp - Experience points to add
   * @returns {boolean} True if character leveled up
   */
  addExperience(character, xp) {
    if (character.level >= this.maxLevel) {
      return false;
    }

    const oldLevel = character.level;
    character.experience += xp;

    // Check for level ups
    let leveledUp = false;
    while (character.level < this.maxLevel) {
      const nextLevelXP = this.getTotalExperienceForLevel(character.level + 1);
      
      if (character.experience >= nextLevelXP) {
        this.levelUpCharacter(character);
        leveledUp = true;
      } else {
        break;
      }
    }

    if (leveledUp) {
      this.queueLevelUpAnimation(character, oldLevel, character.level);
    }

    return leveledUp;
  }

  /**
   * Level up a character
   * @param {Object} character - Character to level up
   */
  levelUpCharacter(character) {
    const oldLevel = character.level;
    character.level++;

    // Get class growth data
    const classData = character.getClassData(character.class);
    const growth = classData.growth;

    // Increase base stats
    character.baseStats.HP += growth.HP;
    character.baseStats.ATK += growth.ATK;
    character.baseStats.DEF += growth.DEF;
    character.baseStats.SPD += growth.SPD;

    // Recalculate current stats
    character.recalculateStats();

    // Restore HP to full on level up
    character.currentHP = character.maxHP;

    // Check for new skill unlocks
    character.checkSkillUnlocks();

    console.log(`${character.name} leveled up! ${oldLevel} → ${character.level}`);
    console.log(`Stats gained: HP+${growth.HP}, ATK+${growth.ATK}, DEF+${growth.DEF}, SPD+${growth.SPD}`);

    // Emit level up event
    this.emitLevelUpEvent(character, oldLevel, character.level, growth);
  }

  /**
   * Queue level-up animation
   * @param {Object} character - Character that leveled up
   * @param {number} oldLevel - Previous level
   * @param {number} newLevel - New level
   */
  queueLevelUpAnimation(character, oldLevel, newLevel) {
    this.levelUpQueue.push({
      character: character,
      oldLevel: oldLevel,
      newLevel: newLevel,
      timestamp: Date.now()
    });

    // Process queue if not already processing
    if (!this.isProcessingLevelUp) {
      this.processLevelUpQueue();
    }
  }

  /**
   * Process level-up animation queue
   */
  async processLevelUpQueue() {
    if (this.levelUpQueue.length === 0) {
      this.isProcessingLevelUp = false;
      return;
    }

    this.isProcessingLevelUp = true;
    const levelUp = this.levelUpQueue.shift();

    // Create level-up notification
    await this.showLevelUpNotification(levelUp);

    // Continue processing queue
    setTimeout(() => {
      this.processLevelUpQueue();
    }, 1000); // 1 second delay between level-up notifications
  }

  /**
   * Show level-up notification
   * @param {Object} levelUpData - Level-up information
   * @returns {Promise} Promise that resolves when animation completes
   */
  async showLevelUpNotification(levelUpData) {
    return new Promise((resolve) => {
      const { character, oldLevel, newLevel } = levelUpData;

      // Create notification element
      const notification = document.createElement('div');
      notification.className = 'level-up-notification';
      notification.innerHTML = `
        <div class="level-up-content">
          <div class="level-up-title">LEVEL UP!</div>
          <div class="level-up-character">${character.name}</div>
          <div class="level-up-levels">${oldLevel} → ${newLevel}</div>
          <div class="level-up-stats">
            <div>HP: ${character.maxHP}</div>
            <div>ATK: ${character.stats.ATK}</div>
            <div>DEF: ${character.stats.DEF}</div>
            <div>SPD: ${character.stats.SPD}</div>
          </div>
        </div>
      `;

      // Add styles
      notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ffd700, #ffed4e);
        border: 3px solid #b8860b;
        border-radius: 15px;
        padding: 20px;
        text-align: center;
        font-family: Arial, sans-serif;
        font-weight: bold;
        color: #8b4513;
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
        z-index: 10000;
        animation: levelUpPulse 2s ease-in-out;
      `;

      // Add CSS animation
      if (!document.getElementById('level-up-styles')) {
        const style = document.createElement('style');
        style.id = 'level-up-styles';
        style.textContent = `
          @keyframes levelUpPulse {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
            20% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
            40% { transform: translate(-50%, -50%) scale(1); }
            80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          }
          .level-up-title { font-size: 24px; margin-bottom: 10px; }
          .level-up-character { font-size: 18px; margin-bottom: 5px; }
          .level-up-levels { font-size: 20px; margin-bottom: 10px; }
          .level-up-stats { font-size: 14px; }
          .level-up-stats div { margin: 2px 0; }
        `;
        document.head.appendChild(style);
      }

      // Add to DOM
      document.body.appendChild(notification);

      // Remove after animation
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        resolve();
      }, 2000);

      // Play level-up sound effect (if available)
      this.playLevelUpSound();
    });
  }

  /**
   * Play level-up sound effect
   */
  playLevelUpSound() {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5 note
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5 note
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5 note

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      // Silently fail if Web Audio API is not available
      console.log('Level-up sound not available');
    }
  }

  /**
   * Emit level-up event
   * @param {Object} character - Character that leveled up
   * @param {number} oldLevel - Previous level
   * @param {number} newLevel - New level
   * @param {Object} statsGained - Stats gained from level up
   */
  emitLevelUpEvent(character, oldLevel, newLevel, statsGained) {
    const event = new CustomEvent('characterLevelUp', {
      detail: {
        character: character,
        oldLevel: oldLevel,
        newLevel: newLevel,
        statsGained: statsGained,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Calculate XP reward for defeating an enemy
   * @param {Object} enemy - Enemy that was defeated
   * @param {Array} party - Party that defeated the enemy
   * @returns {number} XP reward
   */
  calculateEnemyXP(enemy, party) {
    // Base XP based on enemy level and difficulty
    let baseXP = enemy.level * 25;
    
    // Bonus for boss enemies
    if (enemy.type === 'boss') {
      baseXP *= 3;
    } else if (enemy.type === 'elite') {
      baseXP *= 1.5;
    }
    
    // Level difference modifier
    const averagePartyLevel = party.reduce((sum, char) => sum + char.level, 0) / party.length;
    const levelDifference = enemy.level - averagePartyLevel;
    
    if (levelDifference > 0) {
      // Bonus for fighting higher level enemies
      baseXP *= (1 + (levelDifference * 0.1));
    } else if (levelDifference < -3) {
      // Reduced XP for fighting much lower level enemies
      baseXP *= Math.max(0.1, 1 + (levelDifference * 0.1));
    }
    
    return Math.floor(baseXP);
  }

  /**
   * Get level progression information
   * @param {Object} character - Character object
   * @returns {Object} Level progression data
   */
  getLevelProgressionInfo(character) {
    return {
      currentLevel: character.level,
      currentXP: character.experience,
      xpToNext: this.getExperienceToNextLevel(character),
      xpForCurrentLevel: this.getTotalExperienceForLevel(character.level),
      xpForNextLevel: this.getTotalExperienceForLevel(character.level + 1),
      progress: this.getExperienceProgress(character),
      maxLevel: this.maxLevel,
      isMaxLevel: character.level >= this.maxLevel
    };
  }

  /**
   * Simulate level progression for testing
   * @param {Object} character - Character to simulate
   * @param {number} targetLevel - Target level to reach
   * @returns {Object} Simulation results
   */
  simulateLevelProgression(character, targetLevel) {
    const originalLevel = character.level;
    const originalXP = character.experience;
    const originalStats = { ...character.baseStats };
    
    // Calculate XP needed
    const targetXP = this.getTotalExperienceForLevel(targetLevel);
    const xpNeeded = targetXP - character.experience;
    
    // Simulate adding XP
    this.addExperience(character, xpNeeded);
    
    const results = {
      originalLevel: originalLevel,
      targetLevel: targetLevel,
      actualLevel: character.level,
      xpAdded: xpNeeded,
      statsGained: {
        HP: character.baseStats.HP - originalStats.HP,
        ATK: character.baseStats.ATK - originalStats.ATK,
        DEF: character.baseStats.DEF - originalStats.DEF,
        SPD: character.baseStats.SPD - originalStats.SPD
      },
      skillsUnlocked: character.unlockedSkills.length
    };
    
    // Restore original state
    character.level = originalLevel;
    character.experience = originalXP;
    character.baseStats = originalStats;
    character.recalculateStats();
    
    return results;
  }
}