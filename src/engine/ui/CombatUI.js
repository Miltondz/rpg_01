/**
 * Combat UI System for Dungeon Crawler Game
 * Handles combat interface, HP/AP displays, action menus, and turn indicators
 */

export class CombatUI {
  constructor() {
    // UI Elements
    this.elements = {
      combatContainer: null,
      partyHUD: null,
      enemyHUD: null,
      actionMenu: null,
      turnIndicator: null,
      combatLog: null
    };
    
    // Combat state
    this.isActive = false;
    this.currentCharacter = null;
    this.availableActions = [];
    
    // Event handlers
    this.actionHandlers = new Map();
    
    this.isInitialized = false;
  }

  /**
   * Initialize the combat UI system
   */
  initialize() {
    try {
      this.createCombatContainer();
      this.createPartyHUD();
      this.createEnemyHUD();
      this.createActionMenu();
      this.createTurnIndicator();
      this.createCombatLog();
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('CombatUI initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize CombatUI:', error);
      return false;
    }
  }

  /**
   * Create main combat container
   */
  createCombatContainer() {
    this.elements.combatContainer = document.createElement('div');
    this.elements.combatContainer.id = 'combat-container';
    this.elements.combatContainer.className = 'combat-container hidden';
    this.elements.combatContainer.setAttribute('data-ui-component', 'combat-container');
    this.elements.combatContainer.setAttribute('data-ui-name', 'main-combat-interface');
    
    document.body.appendChild(this.elements.combatContainer);
  }

  /**
   * Create party HUD with HP/AP bars
   */
  createPartyHUD() {
    const partySection = document.createElement('div');
    partySection.className = 'combat-section party-section';
    partySection.setAttribute('data-ui-component', 'party-hud');
    partySection.setAttribute('data-ui-name', 'player-party-display');
    
    const title = document.createElement('h3');
    title.textContent = 'Party';
    title.className = 'section-title';
    partySection.appendChild(title);
    
    this.elements.partyHUD = document.createElement('div');
    this.elements.partyHUD.className = 'combatants-grid';
    this.elements.partyHUD.setAttribute('data-ui-component', 'party-grid');
    this.elements.partyHUD.setAttribute('data-ui-name', 'party-combatants');
    
    partySection.appendChild(this.elements.partyHUD);
    this.elements.combatContainer.appendChild(partySection);
  }

  /**
   * Create enemy HUD with HP/AP bars
   */
  createEnemyHUD() {
    const enemySection = document.createElement('div');
    enemySection.className = 'combat-section enemy-section';
    enemySection.setAttribute('data-ui-component', 'enemy-hud');
    enemySection.setAttribute('data-ui-name', 'enemy-display');
    
    const title = document.createElement('h3');
    title.textContent = 'Enemies';
    title.className = 'section-title';
    enemySection.appendChild(title);
    
    this.elements.enemyHUD = document.createElement('div');
    this.elements.enemyHUD.className = 'combatants-grid';
    this.elements.enemyHUD.setAttribute('data-ui-component', 'enemy-grid');
    this.elements.enemyHUD.setAttribute('data-ui-name', 'enemy-combatants');
    
    enemySection.appendChild(this.elements.enemyHUD);
    this.elements.combatContainer.appendChild(enemySection);
  }

  /**
   * Create action menu with buttons
   */
  createActionMenu() {
    const actionSection = document.createElement('div');
    actionSection.className = 'combat-section action-section';
    actionSection.setAttribute('data-ui-component', 'action-menu');
    actionSection.setAttribute('data-ui-name', 'combat-actions');
    
    const title = document.createElement('h3');
    title.textContent = 'Actions';
    title.className = 'section-title';
    actionSection.appendChild(title);
    
    this.elements.actionMenu = document.createElement('div');
    this.elements.actionMenu.className = 'action-menu';
    this.elements.actionMenu.setAttribute('data-ui-component', 'action-buttons');
    this.elements.actionMenu.setAttribute('data-ui-name', 'available-actions');
    
    // Create default action buttons (Attack, Skill, Item, Defend, Flee)
    this.createDefaultActionButtons();
    
    actionSection.appendChild(this.elements.actionMenu);
    this.elements.combatContainer.appendChild(actionSection);
  }

  /**
   * Create default action buttons for combat
   */
  createDefaultActionButtons() {
    const defaultActions = [
      { id: 'attack', name: 'Attack', apCost: 1, description: 'Basic physical attack' },
      { id: 'skill', name: 'Skill', apCost: 2, description: 'Use character skill' },
      { id: 'item', name: 'Item', apCost: 1, description: 'Use inventory item' },
      { id: 'defend', name: 'Defend', apCost: 1, description: 'Reduce incoming damage' },
      { id: 'flee', name: 'Flee', apCost: 0, description: 'Attempt to escape combat' }
    ];

    defaultActions.forEach(action => {
      const button = document.createElement('button');
      button.className = 'action-btn';
      button.setAttribute('data-action-id', action.id);
      button.setAttribute('data-ui-component', 'action-button');
      button.setAttribute('data-ui-name', `action-${action.id}`);
      button.title = action.description;
      
      button.innerHTML = `
        <div class="action-name">${action.name}</div>
        <div class="action-cost">${action.apCost} AP</div>
      `;
      
      this.elements.actionMenu.appendChild(button);
    });
  }

  /**
   * Create turn indicator
   */
  createTurnIndicator() {
    this.elements.turnIndicator = document.createElement('div');
    this.elements.turnIndicator.className = 'turn-indicator';
    this.elements.turnIndicator.setAttribute('data-ui-component', 'turn-indicator');
    this.elements.turnIndicator.setAttribute('data-ui-name', 'current-turn-display');
    
    const turnText = document.createElement('div');
    turnText.className = 'turn-text';
    turnText.textContent = 'Turn 1';
    
    const characterText = document.createElement('div');
    characterText.className = 'character-text';
    characterText.textContent = 'Waiting...';
    
    this.elements.turnIndicator.appendChild(turnText);
    this.elements.turnIndicator.appendChild(characterText);
    this.elements.combatContainer.appendChild(this.elements.turnIndicator);
  }

  /**
   * Create combat log
   */
  createCombatLog() {
    const logSection = document.createElement('div');
    logSection.className = 'combat-section log-section';
    logSection.setAttribute('data-ui-component', 'combat-log');
    logSection.setAttribute('data-ui-name', 'combat-log-display');
    
    const title = document.createElement('h3');
    title.textContent = 'Combat Log';
    title.className = 'section-title';
    logSection.appendChild(title);
    
    this.elements.combatLog = document.createElement('div');
    this.elements.combatLog.className = 'combat-log-content';
    this.elements.combatLog.setAttribute('data-ui-component', 'log-content');
    this.elements.combatLog.setAttribute('data-ui-name', 'combat-messages');
    
    logSection.appendChild(this.elements.combatLog);
    this.elements.combatContainer.appendChild(logSection);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for combat events
    window.addEventListener('combatEvent', (event) => {
      this.handleCombatEvent(event.detail);
    });
    
    // Action button clicks
    this.elements.actionMenu.addEventListener('click', (event) => {
      if (event.target.classList.contains('action-btn')) {
        const actionId = event.target.getAttribute('data-action-id');
        this.handleActionClick(actionId);
      }
    });
  }

  /**
   * Show combat interface
   * @param {Object} combatData - Initial combat data
   */
  showCombat(combatData) {
    if (!this.isInitialized) {
      console.error('CombatUI not initialized');
      return;
    }
    
    this.isActive = true;
    this.elements.combatContainer.classList.remove('hidden');
    
    // Clear previous log
    this.clearCombatLog();
    
    // Update initial display
    this.updatePartyDisplay(combatData.playerParty);
    this.updateEnemyDisplay(combatData.enemies);
    this.updateTurnDisplay(combatData.turnOrder);
    
    // Add initial log message
    setTimeout(() => {
      this.addLogMessage('Combat begins!', 'system');
      this.addLogMessage('Choose your action...', 'system');
    }, 100);
  }

  /**
   * Hide combat interface
   */
  hideCombat() {
    this.isActive = false;
    this.elements.combatContainer.classList.add('hidden');
    this.clearCombatLog();
  }

  /**
   * Update party display with HP/AP bars
   * @param {Array} partyMembers - Party member data
   */
  updatePartyDisplay(partyMembers) {
    this.elements.partyHUD.innerHTML = '';
    
    partyMembers.forEach((member, index) => {
      const memberCard = this.createCombatantCard(member, 'party', index);
      this.elements.partyHUD.appendChild(memberCard);
    });
  }

  /**
   * Update enemy display with HP/AP bars
   * @param {Array} enemies - Enemy data
   */
  updateEnemyDisplay(enemies) {
    this.elements.enemyHUD.innerHTML = '';
    
    enemies.forEach((enemy, index) => {
      const enemyCard = this.createCombatantCard(enemy, 'enemy', index);
      this.elements.enemyHUD.appendChild(enemyCard);
    });
  }

  /**
   * Create combatant card with HP/AP bars
   * @param {Object} combatant - Combatant data
   * @param {string} type - 'party' or 'enemy'
   * @param {number} index - Position index
   * @returns {HTMLElement} Combatant card element
   */
  createCombatantCard(combatant, type, index) {
    const card = document.createElement('div');
    card.className = `combatant-card ${type}-card`;
    card.setAttribute('data-ui-component', 'combatant-card');
    card.setAttribute('data-ui-name', `${type}-${combatant.id || index}`);
    card.setAttribute('data-combatant-id', combatant.id || `${type}-${index}`);
    
    // Name and level
    const nameDiv = document.createElement('div');
    nameDiv.className = 'combatant-name';
    nameDiv.textContent = `${combatant.name} (Lv.${combatant.level || 1})`;
    card.appendChild(nameDiv);
    
    // HP Bar with enhanced color coding
    const hpContainer = document.createElement('div');
    hpContainer.className = 'stat-container hp-container';
    
    const hpLabel = document.createElement('div');
    hpLabel.className = 'stat-label';
    hpLabel.textContent = 'HP';
    
    const hpBar = document.createElement('div');
    hpBar.className = 'stat-bar hp-bar';
    hpBar.setAttribute('data-ui-component', 'hp-bar');
    hpBar.setAttribute('data-ui-name', `${type}-${combatant.id || index}-hp`);
    
    const hpFill = document.createElement('div');
    hpFill.className = 'stat-fill hp-fill';
    const hpPercent = Math.max(0, (combatant.currentHP / combatant.maxHP) * 100);
    hpFill.style.width = `${hpPercent}%`;
    
    // Enhanced color coding based on HP percentage with smooth transitions
    if (hpPercent === 0) {
      hpFill.style.background = '#333333'; // Dead - Dark Gray
      card.classList.add('dead');
    } else if (hpPercent <= 15) {
      hpFill.style.background = '#ff0000'; // Critical - Bright Red
      hpFill.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.6)';
    } else if (hpPercent <= 35) {
      hpFill.style.background = '#ff4400'; // Very Low - Red-Orange
    } else if (hpPercent <= 50) {
      hpFill.style.background = '#ff8800'; // Low - Orange
    } else if (hpPercent <= 75) {
      hpFill.style.background = '#ffaa00'; // Medium - Yellow-Orange
    } else if (hpPercent <= 90) {
      hpFill.style.background = '#ccff00'; // Good - Yellow-Green
    } else {
      hpFill.style.background = '#00ff00'; // Full - Bright Green
    }
    
    const hpText = document.createElement('div');
    hpText.className = 'stat-text';
    hpText.textContent = `${combatant.currentHP}/${combatant.maxHP}`;
    
    hpBar.appendChild(hpFill);
    hpBar.appendChild(hpText);
    hpContainer.appendChild(hpLabel);
    hpContainer.appendChild(hpBar);
    card.appendChild(hpContainer);
    
    // AP Bar with enhanced color coding
    const apContainer = document.createElement('div');
    apContainer.className = 'stat-container ap-container';
    
    const apLabel = document.createElement('div');
    apLabel.className = 'stat-label';
    apLabel.textContent = 'AP';
    
    const apBar = document.createElement('div');
    apBar.className = 'stat-bar ap-bar';
    apBar.setAttribute('data-ui-component', 'ap-bar');
    apBar.setAttribute('data-ui-name', `${type}-${combatant.id || index}-ap`);
    
    const apFill = document.createElement('div');
    apFill.className = 'stat-fill ap-fill';
    const maxAP = combatant.maxAP || 3;
    const currentAP = Math.max(0, combatant.currentAP || 0);
    const apPercent = (currentAP / maxAP) * 100;
    apFill.style.width = `${apPercent}%`;
    
    // Enhanced color coding based on AP percentage
    if (apPercent === 0) {
      apFill.style.background = '#444444'; // Empty - Dark Gray
    } else if (apPercent <= 25) {
      apFill.style.background = '#ff6600'; // Very Low - Orange-Red
    } else if (apPercent <= 50) {
      apFill.style.background = '#ffaa00'; // Low - Orange
    } else if (apPercent <= 75) {
      apFill.style.background = '#00aaff'; // Medium - Light Blue
    } else {
      apFill.style.background = '#0088ff'; // Full - Bright Blue
      apFill.style.boxShadow = '0 0 6px rgba(0, 136, 255, 0.4)';
    }
    
    const apText = document.createElement('div');
    apText.className = 'stat-text';
    apText.textContent = `${currentAP}/${maxAP}`;
    
    apBar.appendChild(apFill);
    apBar.appendChild(apText);
    apContainer.appendChild(apLabel);
    apContainer.appendChild(apBar);
    card.appendChild(apContainer);
    
    // Mark as dead if HP is 0
    if (combatant.currentHP <= 0) {
      card.classList.add('dead');
    }
    
    return card;
  }

  /**
   * Update turn indicator with enhanced information
   * @param {Object} turnData - Turn information
   */
  updateTurnDisplay(turnData) {
    if (!turnData || !this.elements.turnIndicator) return;
    
    const turnText = this.elements.turnIndicator.querySelector('.turn-text');
    const characterText = this.elements.turnIndicator.querySelector('.character-text');
    
    if (turnText) {
      turnText.textContent = `Turn ${turnData.turnNumber || 1}`;
    }
    
    if (characterText && turnData.currentCharacter) {
      const char = turnData.currentCharacter;
      const typeText = char.type === 'player' ? 'Party' : 'Enemy';
      const apInfo = char.currentAP !== undefined ? ` (${char.currentAP}/${char.maxAP || 3} AP)` : '';
      
      characterText.textContent = `${char.name} - ${typeText}${apInfo}`;
      
      // Update turn indicator styling based on character type
      this.elements.turnIndicator.className = 'turn-indicator';
      if (char.type === 'player') {
        this.elements.turnIndicator.classList.add('player-turn');
      } else {
        this.elements.turnIndicator.classList.add('enemy-turn');
      }
      
      // Update current character highlighting
      this.highlightCurrentCharacter(char.id, char.type);
    }
  }

  /**
   * Highlight current character's card
   * @param {string} characterId - Character ID
   * @param {string} type - 'player' or 'enemy'
   */
  highlightCurrentCharacter(characterId, type) {
    // Remove previous highlights
    const allCards = this.elements.combatContainer.querySelectorAll('.combatant-card');
    allCards.forEach(card => card.classList.remove('current-turn'));
    
    // Add highlight to current character
    const currentCard = this.elements.combatContainer.querySelector(
      `[data-combatant-id="${characterId}"]`
    );
    if (currentCard) {
      currentCard.classList.add('current-turn');
    }
  }

  /**
   * Update available actions with enhanced feedback
   * @param {Array} actions - Available actions
   * @param {Object} character - Current character
   */
  updateActions(actions, character) {
    this.availableActions = actions;
    this.currentCharacter = character;
    
    this.elements.actionMenu.innerHTML = '';
    
    // If no character provided, show disabled default actions
    if (!character) {
      this.createDefaultActionButtons();
      // Disable all buttons
      const buttons = this.elements.actionMenu.querySelectorAll('.action-btn');
      buttons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled');
      });
      return;
    }
    
    // Create action buttons based on available actions or defaults
    const actionsToShow = actions && actions.length > 0 ? actions : this.getDefaultActions();
    
    actionsToShow.forEach(action => {
      const button = document.createElement('button');
      button.className = 'action-btn';
      button.setAttribute('data-action-id', action.id);
      button.setAttribute('data-ui-component', 'action-button');
      button.setAttribute('data-ui-name', `action-${action.id}`);
      
      // Check if character has enough AP
      const apCost = action.apCost || 1;
      const hasEnoughAP = character.currentAP >= apCost;
      
      if (!hasEnoughAP) {
        button.disabled = true;
        button.classList.add('disabled');
        button.title = `Not enough AP (need ${apCost}, have ${character.currentAP})`;
      } else {
        button.title = action.description || `${action.name} - Costs ${apCost} AP`;
      }
      
      // Add special styling for different action types
      if (action.id === 'flee') {
        button.classList.add('flee-btn');
      } else if (action.id === 'defend') {
        button.classList.add('defend-btn');
      } else if (action.id === 'skill') {
        button.classList.add('skill-btn');
      } else if (action.id === 'item') {
        button.classList.add('item-btn');
      }
      
      // Enhanced button content with better visual feedback
      const apCostClass = hasEnoughAP ? 'ap-available' : 'ap-insufficient';
      button.innerHTML = `
        <div class="action-name">${action.name}</div>
        <div class="action-cost ${apCostClass}">${apCost} AP</div>
      `;
      
      this.elements.actionMenu.appendChild(button);
    });
    
    // Add skip turn button (always available)
    const skipButton = document.createElement('button');
    skipButton.className = 'action-btn skip-btn';
    skipButton.setAttribute('data-action-id', 'skip');
    skipButton.setAttribute('data-ui-component', 'skip-button');
    skipButton.setAttribute('data-ui-name', 'skip-turn-action');
    skipButton.title = 'End current turn without taking any actions';
    skipButton.innerHTML = `
      <div class="action-name">Skip Turn</div>
      <div class="action-cost">End Turn</div>
    `;
    
    this.elements.actionMenu.appendChild(skipButton);
  }

  /**
   * Get default actions for combat
   * @returns {Array} Default action set
   */
  getDefaultActions() {
    return [
      { id: 'attack', name: 'Attack', apCost: 1, description: 'Basic physical attack' },
      { id: 'skill', name: 'Skill', apCost: 2, description: 'Use character skill' },
      { id: 'item', name: 'Item', apCost: 1, description: 'Use inventory item' },
      { id: 'defend', name: 'Defend', apCost: 1, description: 'Reduce incoming damage' },
      { id: 'flee', name: 'Flee', apCost: 0, description: 'Attempt to escape combat' }
    ];
  }

  /**
   * Handle action button click
   * @param {string} actionId - Action ID
   */
  handleActionClick(actionId) {
    if (!this.isActive) return;
    
    if (actionId === 'skip') {
      this.emitActionEvent('skip', null);
      return;
    }
    
    const action = this.availableActions.find(a => a.id === actionId);
    if (!action) {
      console.warn('Action not found:', actionId);
      return;
    }
    
    // Check AP cost
    if (this.currentCharacter.currentAP < (action.apCost || 1)) {
      this.addLogMessage('Not enough AP for this action!', 'warning');
      return;
    }
    
    this.emitActionEvent('action', { action, character: this.currentCharacter });
  }

  /**
   * Emit action event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  emitActionEvent(type, data) {
    const event = new CustomEvent('combatUIAction', {
      detail: { type, data }
    });
    window.dispatchEvent(event);
  }

  /**
   * Handle combat events
   * @param {Object} eventData - Combat event data
   */
  handleCombatEvent(eventData) {
    switch (eventData.type) {
      case 'combatStarted':
        this.showCombat(eventData.data);
        break;
      case 'combatEnded':
        this.handleCombatEnd(eventData.data);
        break;
      case 'turnStarted':
        this.handleTurnStart(eventData.data);
        break;
      case 'actionExecuted':
        this.handleActionExecuted(eventData.data);
        break;
      case 'damageDealt':
        this.handleDamageDealt(eventData.data);
        break;
      case 'healingApplied':
        this.handleHealingApplied(eventData.data);
        break;
    }
  }

  /**
   * Handle combat end
   * @param {Object} endData - Combat end data
   */
  handleCombatEnd(endData) {
    this.addLogMessage(`Combat ended: ${endData.result}`, 'system');
    
    // Show results after a delay
    setTimeout(() => {
      this.hideCombat();
    }, 3000);
  }

  /**
   * Handle turn start
   * @param {Object} turnData - Turn data
   */
  handleTurnStart(turnData) {
    this.updateTurnDisplay(turnData);
    
    if (turnData.currentCharacter) {
      const char = turnData.currentCharacter;
      this.addLogMessage(`${char.name}'s turn begins`, 'system');
    }
  }

  /**
   * Handle action executed
   * @param {Object} actionData - Action execution data
   */
  handleActionExecuted(actionData) {
    const { character, action, result } = actionData;
    
    if (result.success) {
      this.addLogMessage(`${character.name} uses ${action.name}`, 'action');
    } else {
      this.addLogMessage(`${character.name}'s ${action.name} failed!`, 'error');
    }
    
    // Update character displays
    this.updateCombatantStats();
  }

  /**
   * Handle damage dealt
   * @param {Object} damageData - Damage data
   */
  handleDamageDealt(damageData) {
    const { target, damage, isCritical } = damageData;
    const critText = isCritical ? ' (CRITICAL!)' : '';
    this.addLogMessage(`${target.name} takes ${damage} damage${critText}`, 'damage');
    
    this.updateCombatantStats();
  }

  /**
   * Handle healing applied
   * @param {Object} healData - Healing data
   */
  handleHealingApplied(healData) {
    const { target, healing } = healData;
    this.addLogMessage(`${target.name} heals ${healing} HP`, 'healing');
    
    this.updateCombatantStats();
  }

  /**
   * Update all combatant stats displays
   */
  updateCombatantStats() {
    // This would be called with updated combatant data
    // For now, we'll emit an event requesting updated data
    const event = new CustomEvent('combatUIRequest', {
      detail: { type: 'updateStats' }
    });
    window.dispatchEvent(event);
  }

  /**
   * Add message to combat log
   * @param {string} message - Log message
   * @param {string} type - Message type (system, action, damage, healing, error, warning)
   */
  addLogMessage(message, type = 'system') {
    if (!this.elements.combatLog) {
      console.warn('Combat log element not found');
      return;
    }
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.setAttribute('data-ui-component', 'log-entry');
    logEntry.setAttribute('data-ui-name', `log-${type}-${Date.now()}`);
    
    const timestamp = new Date().toLocaleTimeString();
    logEntry.innerHTML = `
      <span class="log-time">[${timestamp}]</span>
      <span class="log-message">${message}</span>
    `;
    
    this.elements.combatLog.appendChild(logEntry);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      this.elements.combatLog.scrollTop = this.elements.combatLog.scrollHeight;
    }, 10);
    
    // Keep only last 50 entries
    const entries = this.elements.combatLog.querySelectorAll('.log-entry');
    if (entries.length > 50) {
      entries[0].remove();
    }
    
    console.log(`Combat log: [${type}] ${message}`); // Debug output
  }

  /**
   * Clear combat log
   */
  clearCombatLog() {
    if (this.elements.combatLog) {
      this.elements.combatLog.innerHTML = '';
      console.log('Combat log cleared');
    } else {
      console.warn('Combat log element not found for clearing');
    }
  }

  /**
   * Register action handler
   * @param {string} actionId - Action ID
   * @param {Function} handler - Handler function
   */
  registerActionHandler(actionId, handler) {
    this.actionHandlers.set(actionId, handler);
  }

  /**
   * Unregister action handler
   * @param {string} actionId - Action ID
   */
  unregisterActionHandler(actionId) {
    this.actionHandlers.delete(actionId);
  }

  /**
   * Get combat UI status
   * @returns {Object} UI status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isActive: this.isActive,
      currentCharacter: this.currentCharacter,
      availableActions: this.availableActions.length
    };
  }

  /**
   * Dispose of combat UI
   */
  dispose() {
    if (this.elements.combatContainer && this.elements.combatContainer.parentNode) {
      this.elements.combatContainer.parentNode.removeChild(this.elements.combatContainer);
    }
    
    this.actionHandlers.clear();
    this.elements = {};
    this.isInitialized = false;
    this.isActive = false;
    
    console.log('CombatUI disposed');
  }
}