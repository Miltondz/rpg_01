/**
 * Combat Results UI System for Dungeon Crawler Game
 * Handles victory/defeat screens, XP distribution, loot display, and level-up celebrations
 */

import { lootSystem } from '../loot/LootSystem.js';

export class CombatResultsUI {
  constructor() {
    // UI Elements
    this.elements = {
      resultsContainer: null,
      resultsContent: null,
      titleSection: null,
      rewardsSection: null,
      actionsSection: null
    };
    
    // State
    this.isActive = false;
    this.currentResults = null;
    
    // Animation settings
    this.animationSettings = {
      fadeInDuration: 500,
      rewardDelay: 200,
      levelUpDelay: 1000
    };
    
    this.isInitialized = false;
  }

  /**
   * Initialize the combat results UI system
   */
  initialize() {
    try {
      this.createResultsContainer();
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('CombatResultsUI initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize CombatResultsUI:', error);
      return false;
    }
  }

  /**
   * Create main results container
   */
  createResultsContainer() {
    this.elements.resultsContainer = document.createElement('div');
    this.elements.resultsContainer.id = 'combat-results-container';
    this.elements.resultsContainer.className = 'combat-results-container hidden';
    this.elements.resultsContainer.setAttribute('data-ui-component', 'combat-results');
    this.elements.resultsContainer.setAttribute('data-ui-name', 'combat-results-screen');
    
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'results-backdrop';
    backdrop.setAttribute('data-ui-component', 'results-backdrop');
    backdrop.setAttribute('data-ui-name', 'results-background');
    
    // Create content container
    this.elements.resultsContent = document.createElement('div');
    this.elements.resultsContent.className = 'results-content';
    this.elements.resultsContent.setAttribute('data-ui-component', 'results-content');
    this.elements.resultsContent.setAttribute('data-ui-name', 'results-main-content');
    
    this.elements.resultsContainer.appendChild(backdrop);
    this.elements.resultsContainer.appendChild(this.elements.resultsContent);
    document.body.appendChild(this.elements.resultsContainer);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for combat end events
    window.addEventListener('combatEvent', (event) => {
      if (event.detail.type === 'combatEnded') {
        this.handleCombatEnd(event.detail.data);
      }
    });
    
    // Handle action buttons
    this.elements.resultsContainer.addEventListener('click', (event) => {
      if (event.target.classList.contains('results-action-btn')) {
        const action = event.target.getAttribute('data-action');
        this.handleActionClick(action);
      }
    });
    
    // Handle keyboard input
    document.addEventListener('keydown', (event) => {
      if (this.isActive) {
        this.handleKeyInput(event);
      }
    });
  }

  /**
   * Handle combat end and show results
   * @param {Object} resultsData - Combat results data
   */
  async handleCombatEnd(resultsData) {
    if (!this.isInitialized) {
      console.error('CombatResultsUI not initialized');
      return;
    }
    
    this.currentResults = resultsData;
    this.isActive = true;
    
    // Show results screen
    await this.showResults(resultsData);
  }

  /**
   * Show combat results screen
   * @param {Object} resultsData - Combat results data
   */
  async showResults(resultsData) {
    // Clear previous content
    this.elements.resultsContent.innerHTML = '';
    
    // Create sections
    this.createTitleSection(resultsData.result);
    this.createRewardsSection(resultsData);
    this.createActionsSection(resultsData.result);
    
    // Show container with fade-in
    this.elements.resultsContainer.classList.remove('hidden');
    this.elements.resultsContainer.style.opacity = '0';
    
    await this.delay(100);
    
    this.elements.resultsContainer.style.transition = `opacity ${this.animationSettings.fadeInDuration}ms ease-out`;
    this.elements.resultsContainer.style.opacity = '1';
    
    await this.delay(this.animationSettings.fadeInDuration);
    
    // Animate rewards if victory
    if (resultsData.result === 'victory') {
      await this.animateRewards(resultsData.rewards);
    }
  }

  /**
   * Create title section
   * @param {string} result - Combat result ('victory' or 'defeat')
   */
  createTitleSection(result) {
    this.elements.titleSection = document.createElement('div');
    this.elements.titleSection.className = `results-title ${result}`;
    this.elements.titleSection.setAttribute('data-ui-component', 'results-title');
    this.elements.titleSection.setAttribute('data-ui-name', `${result}-title`);
    
    const titleText = document.createElement('h1');
    titleText.className = 'title-text';
    
    if (result === 'victory') {
      titleText.textContent = 'VICTORY!';
      titleText.style.color = '#00ff00';
    } else {
      titleText.textContent = 'DEFEAT';
      titleText.style.color = '#ff0000';
    }
    
    const subtitle = document.createElement('div');
    subtitle.className = 'title-subtitle';
    
    if (result === 'victory') {
      subtitle.textContent = 'The enemies have been vanquished!';
      subtitle.style.color = '#00aa00';
    } else {
      subtitle.textContent = 'Your party has fallen...';
      subtitle.style.color = '#aa0000';
    }
    
    this.elements.titleSection.appendChild(titleText);
    this.elements.titleSection.appendChild(subtitle);
    this.elements.resultsContent.appendChild(this.elements.titleSection);
  }

  /**
   * Create rewards section
   * @param {Object} resultsData - Combat results data
   */
  createRewardsSection(resultsData) {
    if (resultsData.result !== 'victory' || !resultsData.rewards) {
      return;
    }
    
    this.elements.rewardsSection = document.createElement('div');
    this.elements.rewardsSection.className = 'results-rewards';
    this.elements.rewardsSection.setAttribute('data-ui-component', 'results-rewards');
    this.elements.rewardsSection.setAttribute('data-ui-name', 'victory-rewards');
    
    const rewardsTitle = document.createElement('h2');
    rewardsTitle.textContent = 'Rewards';
    rewardsTitle.className = 'rewards-title';
    this.elements.rewardsSection.appendChild(rewardsTitle);
    
    // Experience section
    if (resultsData.rewards.experience) {
      this.createExperienceReward(resultsData.rewards.experience);
    }
    
    // Gold section
    if (resultsData.rewards.gold) {
      this.createGoldReward(resultsData.rewards.gold);
    }
    
    // Loot section
    if (resultsData.rewards.loot && resultsData.rewards.loot.length > 0) {
      this.createLootReward(resultsData.rewards.loot);
    }
    
    this.elements.resultsContent.appendChild(this.elements.rewardsSection);
  }

  /**
   * Create experience reward display
   * @param {number} experience - Experience points gained
   */
  createExperienceReward(experience) {
    const expContainer = document.createElement('div');
    expContainer.className = 'reward-item experience-reward';
    expContainer.setAttribute('data-ui-component', 'experience-reward');
    expContainer.setAttribute('data-ui-name', 'exp-gained');
    
    const expIcon = document.createElement('div');
    expIcon.className = 'reward-icon';
    expIcon.textContent = '⭐';
    
    const expText = document.createElement('div');
    expText.className = 'reward-text';
    expText.innerHTML = `
      <div class="reward-label">Experience Gained</div>
      <div class="reward-value">${experience} XP</div>
    `;
    
    expContainer.appendChild(expIcon);
    expContainer.appendChild(expText);
    this.elements.rewardsSection.appendChild(expContainer);
  }

  /**
   * Create gold reward display
   * @param {number} gold - Gold gained
   */
  createGoldReward(gold) {
    const goldContainer = document.createElement('div');
    goldContainer.className = 'reward-item gold-reward';
    goldContainer.setAttribute('data-ui-component', 'gold-reward');
    goldContainer.setAttribute('data-ui-name', 'gold-gained');
    
    const goldIcon = document.createElement('div');
    goldIcon.className = 'reward-icon';
    goldIcon.textContent = '💰';
    
    const goldText = document.createElement('div');
    goldText.className = 'reward-text';
    goldText.innerHTML = `
      <div class="reward-label">Gold Earned</div>
      <div class="reward-value">${gold} G</div>
    `;
    
    goldContainer.appendChild(goldIcon);
    goldContainer.appendChild(goldText);
    this.elements.rewardsSection.appendChild(goldContainer);
  }

  /**
   * Create loot reward display
   * @param {Array} loot - Loot items gained
   */
  createLootReward(loot) {
    const lootContainer = document.createElement('div');
    lootContainer.className = 'reward-item loot-reward';
    lootContainer.setAttribute('data-ui-component', 'loot-reward');
    lootContainer.setAttribute('data-ui-name', 'loot-gained');
    
    const lootTitle = document.createElement('div');
    lootTitle.className = 'loot-title';
    lootTitle.textContent = 'Items Found';
    
    const lootList = document.createElement('div');
    lootList.className = 'loot-list';
    
    loot.forEach((item, index) => {
      const lootItem = document.createElement('div');
      lootItem.className = `loot-item ${item.rarity || 'common'}`;
      lootItem.setAttribute('data-ui-component', 'loot-item');
      lootItem.setAttribute('data-ui-name', `loot-item-${index}`);
      
      // Get rarity color for item name
      const rarityColor = this.getRarityColor(item.rarity || 'common');
      
      lootItem.innerHTML = `
        <span class="loot-icon">${this.getItemIcon(item.type)}</span>
        <span class="loot-name" style="color: ${rarityColor};">${item.name}</span>
        ${item.quantity > 1 ? `<span class="loot-quantity">x${item.quantity}</span>` : ''}
        ${item.level ? `<span class="loot-level">(Lv.${item.level})</span>` : ''}
      `;
      
      // Add click handler for item details
      lootItem.addEventListener('click', () => {
        this.showItemTooltip(item, lootItem);
      });
      
      lootList.appendChild(lootItem);
    });
    
    lootContainer.appendChild(lootTitle);
    lootContainer.appendChild(lootList);
    this.elements.rewardsSection.appendChild(lootContainer);
  }

  /**
   * Get rarity color for items
   * @param {string} rarity - Item rarity
   * @returns {string} Color code
   */
  getRarityColor(rarity) {
    const colors = {
      'common': '#FFFFFF',
      'uncommon': '#00FF00',
      'rare': '#0080FF',
      'epic': '#8000FF'
    };
    return colors[rarity] || colors.common;
  }

  /**
   * Show item tooltip with details
   * @param {Object} item - Item data
   * @param {HTMLElement} element - Element to position tooltip near
   */
  showItemTooltip(item, element) {
    // Remove existing tooltip
    const existingTooltip = document.querySelector('.loot-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'loot-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: linear-gradient(135deg, #2c1810, #1a0f08);
      border: 2px solid ${this.getRarityColor(item.rarity)};
      border-radius: 8px;
      padding: 12px;
      color: white;
      font-size: 12px;
      z-index: 2000;
      max-width: 250px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
    `;

    // Build tooltip content
    let tooltipContent = `
      <div style="color: ${this.getRarityColor(item.rarity)}; font-weight: bold; margin-bottom: 5px;">
        ${item.name} ${item.level ? `(Level ${item.level})` : ''}
      </div>
      <div style="color: #cccccc; font-size: 11px; margin-bottom: 8px;">
        ${this.formatItemType(item.type)} - ${item.rarity || 'Common'}
      </div>
    `;

    if (item.description) {
      tooltipContent += `<div style="color: #aaaaaa; margin-bottom: 8px; font-style: italic;">${item.description}</div>`;
    }

    if (item.stats && Object.keys(item.stats).length > 0) {
      tooltipContent += '<div style="margin-bottom: 5px; color: #00ff00;">Stats:</div>';
      Object.entries(item.stats).forEach(([stat, value]) => {
        tooltipContent += `<div style="color: #cccccc; font-size: 11px;">+${value} ${stat}</div>`;
      });
    }

    if (item.effects && item.effects.length > 0) {
      tooltipContent += '<div style="margin-top: 8px; margin-bottom: 5px; color: #ffaa00;">Effects:</div>';
      item.effects.forEach(effect => {
        tooltipContent += `<div style="color: #cccccc; font-size: 11px;">${this.formatEffect(effect)}</div>`;
      });
    }

    if (item.value) {
      tooltipContent += `<div style="margin-top: 8px; color: #ffd700; font-size: 11px;">Value: ${item.value} gold</div>`;
    }

    tooltip.innerHTML = tooltipContent;

    // Position tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.right + 10}px`;
    tooltip.style.top = `${rect.top}px`;

    document.body.appendChild(tooltip);

    // Remove tooltip after delay or on click
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 5000);

    tooltip.addEventListener('click', () => tooltip.remove());
  }

  /**
   * Format item type for display
   * @param {string} type - Item type
   * @returns {string} Formatted type
   */
  formatItemType(type) {
    const typeNames = {
      'weapon': 'Weapon',
      'armor': 'Armor',
      'accessory': 'Accessory',
      'consumable': 'Consumable',
      'material': 'Material',
      'key_item': 'Key Item'
    };
    return typeNames[type] || 'Unknown';
  }

  /**
   * Format effect for display
   * @param {Object} effect - Effect data
   * @returns {string} Formatted effect
   */
  formatEffect(effect) {
    switch (effect.type) {
      case 'heal':
        return `Restores ${effect.value} HP`;
      case 'buff':
        return `+${effect.value} ${effect.stat} for ${effect.duration} turns`;
      case 'cure':
        return `Cures ${effect.conditions.join(', ')}`;
      case 'restore_ap':
        return `Restores ${effect.value} AP`;
      default:
        return `${effect.type}: ${effect.value}`;
    }
  }

  /**
   * Get icon for item type
   * @param {string} itemType - Item type
   * @returns {string} Icon character
   */
  getItemIcon(itemType) {
    const icons = {
      weapon: '⚔️',
      armor: '🛡️',
      accessory: '💍',
      consumable: '🧪',
      material: '🔧',
      key: '🗝️'
    };
    
    return icons[itemType] || '📦';
  }

  /**
   * Create actions section
   * @param {string} result - Combat result
   */
  createActionsSection(result) {
    this.elements.actionsSection = document.createElement('div');
    this.elements.actionsSection.className = 'results-actions';
    this.elements.actionsSection.setAttribute('data-ui-component', 'results-actions');
    this.elements.actionsSection.setAttribute('data-ui-name', 'result-actions');
    
    if (result === 'victory') {
      this.createVictoryActions();
    } else {
      this.createDefeatActions();
    }
    
    this.elements.resultsContent.appendChild(this.elements.actionsSection);
  }

  /**
   * Create victory action buttons
   */
  createVictoryActions() {
    const continueBtn = document.createElement('button');
    continueBtn.className = 'results-action-btn primary';
    continueBtn.setAttribute('data-action', 'continue');
    continueBtn.setAttribute('data-ui-component', 'continue-button');
    continueBtn.setAttribute('data-ui-name', 'continue-exploration');
    continueBtn.textContent = 'Continue Exploring';
    
    const menuBtn = document.createElement('button');
    menuBtn.className = 'results-action-btn secondary';
    menuBtn.setAttribute('data-action', 'menu');
    menuBtn.setAttribute('data-ui-component', 'menu-button');
    menuBtn.setAttribute('data-ui-name', 'return-to-menu');
    menuBtn.textContent = 'Return to Menu';
    
    this.elements.actionsSection.appendChild(continueBtn);
    this.elements.actionsSection.appendChild(menuBtn);
  }

  /**
   * Create defeat action buttons
   */
  createDefeatActions() {
    const retryBtn = document.createElement('button');
    retryBtn.className = 'results-action-btn primary';
    retryBtn.setAttribute('data-action', 'retry');
    retryBtn.setAttribute('data-ui-component', 'retry-button');
    retryBtn.setAttribute('data-ui-name', 'retry-combat');
    retryBtn.textContent = 'Retry Combat';
    
    const loadBtn = document.createElement('button');
    loadBtn.className = 'results-action-btn secondary';
    loadBtn.setAttribute('data-action', 'load');
    loadBtn.setAttribute('data-ui-component', 'load-button');
    loadBtn.setAttribute('data-ui-name', 'load-save');
    loadBtn.textContent = 'Load Save';
    
    const menuBtn = document.createElement('button');
    menuBtn.className = 'results-action-btn secondary';
    menuBtn.setAttribute('data-action', 'menu');
    menuBtn.setAttribute('data-ui-component', 'menu-button');
    menuBtn.setAttribute('data-ui-name', 'return-to-menu');
    menuBtn.textContent = 'Main Menu';
    
    this.elements.actionsSection.appendChild(retryBtn);
    this.elements.actionsSection.appendChild(loadBtn);
    this.elements.actionsSection.appendChild(menuBtn);
  }

  /**
   * Animate rewards display
   * @param {Object} rewards - Rewards data
   */
  async animateRewards(rewards) {
    const rewardItems = this.elements.rewardsSection.querySelectorAll('.reward-item');
    
    // Hide all rewards initially
    rewardItems.forEach(item => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';
    });
    
    // Animate each reward in sequence
    for (let i = 0; i < rewardItems.length; i++) {
      await this.delay(this.animationSettings.rewardDelay);
      
      const item = rewardItems[i];
      item.style.transition = 'all 0.5s ease-out';
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
      
      // Add special effect for experience
      if (item.classList.contains('experience-reward')) {
        this.playExperienceEffect(item);
      }
    }
    
    // Check for level ups after rewards animation
    await this.delay(500);
    await this.checkAndShowLevelUps();
  }

  /**
   * Play experience gain effect
   * @param {HTMLElement} expElement - Experience reward element
   */
  playExperienceEffect(expElement) {
    expElement.classList.add('exp-glow');
    
    setTimeout(() => {
      expElement.classList.remove('exp-glow');
    }, 1000);
  }

  /**
   * Check for level ups and show celebrations
   */
  async checkAndShowLevelUps() {
    // This would integrate with the character system to check for level ups
    // For now, we'll emit an event requesting level up data
    const event = new CustomEvent('combatResultsRequest', {
      detail: { type: 'checkLevelUps' }
    });
    window.dispatchEvent(event);
  }

  /**
   * Show level up celebration
   * @param {Object} levelUpData - Level up information
   */
  async showLevelUpCelebration(levelUpData) {
    const { character, newLevel, statsGained, skillsUnlocked } = levelUpData;
    
    // Create level up overlay
    const levelUpOverlay = document.createElement('div');
    levelUpOverlay.className = 'level-up-overlay';
    levelUpOverlay.setAttribute('data-ui-component', 'level-up-overlay');
    levelUpOverlay.setAttribute('data-ui-name', `level-up-${character.id}`);
    
    levelUpOverlay.innerHTML = `
      <div class="level-up-content">
        <div class="level-up-title">LEVEL UP!</div>
        <div class="level-up-character">${character.name}</div>
        <div class="level-up-level">Level ${newLevel}</div>
        
        <div class="level-up-stats">
          <h3>Stats Increased</h3>
          ${Object.entries(statsGained).map(([stat, value]) => 
            `<div class="stat-gain">
              <span class="stat-name">${stat.toUpperCase()}</span>
              <span class="stat-value">+${value}</span>
            </div>`
          ).join('')}
        </div>
        
        ${skillsUnlocked.length > 0 ? `
          <div class="level-up-skills">
            <h3>Skills Unlocked</h3>
            ${skillsUnlocked.map(skill => 
              `<div class="skill-unlocked">${skill.name}</div>`
            ).join('')}
          </div>
        ` : ''}
        
        <button class="level-up-continue" onclick="this.parentElement.parentElement.remove()">
          Continue
        </button>
      </div>
    `;
    
    document.body.appendChild(levelUpOverlay);
    
    // Animate in
    levelUpOverlay.style.opacity = '0';
    await this.delay(100);
    
    levelUpOverlay.style.transition = 'opacity 0.5s ease-out';
    levelUpOverlay.style.opacity = '1';
    
    // Play celebration effect
    this.playLevelUpEffect();
  }

  /**
   * Play level up celebration effect
   */
  playLevelUpEffect() {
    // Create celebration particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'level-up-particle';
      particle.setAttribute('data-ui-component', 'level-up-particle');
      particle.setAttribute('data-ui-name', `level-particle-${i}`);
      
      particle.style.left = '50%';
      particle.style.top = '50%';
      particle.style.position = 'fixed';
      particle.style.width = '6px';
      particle.style.height = '6px';
      particle.style.background = '#ffff00';
      particle.style.borderRadius = '50%';
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '2000';
      
      document.body.appendChild(particle);
      
      // Random direction and distance
      const angle = (i / 20) * Math.PI * 2;
      const distance = 100 + Math.random() * 100;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      particle.style.transition = 'all 1.5s ease-out';
      particle.style.transform = `translate(${x}px, ${y}px) scale(0)`;
      particle.style.opacity = '0';
      
      // Remove after animation
      setTimeout(() => {
        particle.remove();
      }, 1500);
    }
  }

  /**
   * Handle action button clicks
   * @param {string} action - Action type
   */
  handleActionClick(action) {
    const event = new CustomEvent('combatResultsAction', {
      detail: { 
        action: action,
        results: this.currentResults
      }
    });
    window.dispatchEvent(event);
    
    // Hide results screen
    this.hideResults();
  }

  /**
   * Handle keyboard input
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyInput(event) {
    switch (event.code) {
      case 'Enter':
      case 'Space':
        // Default action (continue or retry)
        const primaryBtn = this.elements.actionsSection.querySelector('.primary');
        if (primaryBtn) {
          primaryBtn.click();
        }
        break;
      case 'Escape':
        // Secondary action (menu)
        const menuBtn = this.elements.actionsSection.querySelector('[data-action="menu"]');
        if (menuBtn) {
          menuBtn.click();
        }
        break;
    }
  }

  /**
   * Hide results screen
   */
  async hideResults() {
    if (!this.isActive) return;
    
    this.elements.resultsContainer.style.transition = 'opacity 0.3s ease-in';
    this.elements.resultsContainer.style.opacity = '0';
    
    await this.delay(300);
    
    this.elements.resultsContainer.classList.add('hidden');
    this.elements.resultsContainer.style.transition = '';
    this.elements.resultsContainer.style.opacity = '';
    
    this.isActive = false;
    this.currentResults = null;
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
   * Get results UI status
   * @returns {Object} UI status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isActive: this.isActive,
      hasResults: !!this.currentResults
    };
  }

  /**
   * Dispose of results UI
   */
  dispose() {
    if (this.elements.resultsContainer && this.elements.resultsContainer.parentNode) {
      this.elements.resultsContainer.parentNode.removeChild(this.elements.resultsContainer);
    }
    
    this.elements = {};
    this.isInitialized = false;
    this.isActive = false;
    this.currentResults = null;
    
    console.log('CombatResultsUI disposed');
  }
}