/**
 * PartyCreationUI - User interface for creating and managing party composition
 * Handles character creation, party formation, and drag-and-drop positioning
 */

import { CharacterClasses } from '../character/CharacterClasses.js';

export class PartyCreationUI {
  constructor(characterSystem) {
    this.characterSystem = characterSystem;
    this.container = null;
    this.isVisible = false;
    this.draggedCharacter = null;
    this.draggedElement = null;
    
    // UI state
    this.selectedClass = 'warrior';
    this.characterName = '';
    
    console.log('PartyCreationUI initialized');
  }

  /**
   * Create and show the party creation interface
   */
  show() {
    if (this.isVisible) return;
    
    this.createUI();
    this.isVisible = true;
    
    // Add to DOM
    document.body.appendChild(this.container);
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('Party creation UI shown');
  }

  /**
   * Hide the party creation interface
   */
  hide() {
    if (!this.isVisible) return;
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    this.isVisible = false;
    console.log('Party creation UI hidden');
  }

  /**
   * Create the main UI structure
   */
  createUI() {
    this.container = document.createElement('div');
    this.container.className = 'party-creation-overlay';
    
    this.container.innerHTML = `
      <div class="party-creation-modal">
        <div class="modal-header">
          <h2>Create Your Party</h2>
          <button class="close-btn" id="close-party-ui">×</button>
        </div>
        
        <div class="modal-content">
          <div class="creation-section">
            <h3>Create New Character</h3>
            
            <div class="character-form">
              <div class="form-group">
                <label for="character-name">Character Name:</label>
                <input type="text" id="character-name" placeholder="Enter character name" maxlength="20">
              </div>
              
              <div class="form-group">
                <label for="character-class">Class:</label>
                <select id="character-class">
                  <option value="warrior">Warrior - Tank/Melee DPS</option>
                  <option value="rogue">Rogue - DPS/Critical</option>
                  <option value="mage">Mage - AoE/Elemental</option>
                  <option value="cleric">Cleric - Healer/Support</option>
                </select>
              </div>
              
              <div class="class-preview" id="class-preview">
                ${this.createClassPreview('warrior')}
              </div>
              
              <button class="create-character-btn" id="create-character">Create Character</button>
            </div>
          </div>
          
          <div class="party-section">
            <h3>Party Formation</h3>
            <div class="formation-info">
              <p><strong>Front Row:</strong> +10% damage dealt, -10% defense</p>
              <p><strong>Back Row:</strong> +10% evasion, +10% defense</p>
            </div>
            
            <div class="party-formation" id="party-formation">
              <div class="formation-row front-row">
                <h4>Front Row</h4>
                <div class="party-slots">
                  <div class="party-slot" data-position="0" data-row="front">
                    <div class="slot-label">Position 1</div>
                    <div class="slot-content" id="slot-0"></div>
                  </div>
                  <div class="party-slot" data-position="1" data-row="front">
                    <div class="slot-label">Position 2</div>
                    <div class="slot-content" id="slot-1"></div>
                  </div>
                </div>
              </div>
              
              <div class="formation-row back-row">
                <h4>Back Row</h4>
                <div class="party-slots">
                  <div class="party-slot" data-position="2" data-row="back">
                    <div class="slot-label">Position 3</div>
                    <div class="slot-content" id="slot-2"></div>
                  </div>
                  <div class="party-slot" data-position="3" data-row="back">
                    <div class="slot-label">Position 4</div>
                    <div class="slot-content" id="slot-3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="available-characters" id="available-characters">
            <h3>Available Characters</h3>
            <div class="character-list" id="character-list">
              <p class="no-characters">No characters created yet</p>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <div class="party-validation" id="party-validation"></div>
          <div class="modal-actions">
            <button class="btn secondary" id="create-test-party">Create Test Party</button>
            <button class="btn primary" id="start-game" disabled>Start Game</button>
          </div>
        </div>
      </div>
    `;
    
    // Add CSS styles
    this.addStyles();
  }

  /**
   * Create class preview HTML
   * @param {string} className - Class name to preview
   * @returns {string} HTML for class preview
   */
  createClassPreview(className) {
    const classData = CharacterClasses.getClassDefinition(className);
    if (!classData) return '';
    
    return `
      <div class="class-info">
        <h4>${classData.name}</h4>
        <p class="class-description">${classData.description}</p>
        
        <div class="class-stats">
          <h5>Base Stats:</h5>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">HP:</span>
              <span class="stat-value">${classData.baseStats.HP}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">ATK:</span>
              <span class="stat-value">${classData.baseStats.ATK}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">DEF:</span>
              <span class="stat-value">${classData.baseStats.DEF}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">SPD:</span>
              <span class="stat-value">${classData.baseStats.SPD}</span>
            </div>
          </div>
        </div>
        
        <div class="class-growth">
          <h5>Growth per Level:</h5>
          <div class="growth-grid">
            <div class="growth-item">HP: +${classData.growth.HP}</div>
            <div class="growth-item">ATK: +${classData.growth.ATK}</div>
            <div class="growth-item">DEF: +${classData.growth.DEF}</div>
            <div class="growth-item">SPD: +${classData.growth.SPD}</div>
          </div>
        </div>
        
        <div class="class-skills">
          <h5>Starting Skills:</h5>
          <ul>
            ${classData.skillProgression.slice(0, 3).map(skill => 
              `<li>Level ${skill.level}: ${skill.name}</li>`
            ).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Create character card HTML
   * @param {Object} character - Character data
   * @param {boolean} draggable - Whether the card should be draggable
   * @returns {string} HTML for character card
   */
  createCharacterCard(character, draggable = true) {
    const hpPercent = (character.currentHP / character.maxHP) * 100;
    const formationEffects = this.characterSystem.partyManager.getFormationEffects(character);
    
    return `
      <div class="character-card ${character.class}" 
           data-character-id="${character.id}" 
           ${draggable ? 'draggable="true"' : ''}>
        <div class="character-header">
          <h4>${character.name}</h4>
          <span class="character-level">Lv.${character.level}</span>
        </div>
        
        <div class="character-class">${character.class.charAt(0).toUpperCase() + character.class.slice(1)}</div>
        
        <div class="hp-bar">
          <div class="hp-fill" style="width: ${hpPercent}%"></div>
          <span class="hp-text">${character.currentHP}/${character.maxHP}</span>
        </div>
        
        <div class="character-stats">
          <div class="stat">ATK: ${character.stats.ATK}</div>
          <div class="stat">DEF: ${character.stats.DEF}</div>
          <div class="stat">SPD: ${character.stats.SPD}</div>
        </div>
        
        <div class="formation-effects">
          ${formationEffects.description}
        </div>
        
        ${draggable ? '<div class="drag-handle">⋮⋮</div>' : ''}
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close button
    const closeBtn = this.container.querySelector('#close-party-ui');
    closeBtn.addEventListener('click', () => this.hide());
    
    // Character class selection
    const classSelect = this.container.querySelector('#character-class');
    classSelect.addEventListener('change', (e) => {
      this.selectedClass = e.target.value;
      this.updateClassPreview();
    });
    
    // Character name input
    const nameInput = this.container.querySelector('#character-name');
    nameInput.addEventListener('input', (e) => {
      this.characterName = e.target.value;
    });
    
    // Create character button
    const createBtn = this.container.querySelector('#create-character');
    createBtn.addEventListener('click', () => this.createCharacter());
    
    // Create test party button
    const testPartyBtn = this.container.querySelector('#create-test-party');
    testPartyBtn.addEventListener('click', () => this.createTestParty());
    
    // Start game button
    const startBtn = this.container.querySelector('#start-game');
    startBtn.addEventListener('click', () => this.startGame());
    
    // Drag and drop for party slots
    this.setupDragAndDrop();
    
    // Listen for party changes
    window.addEventListener('partyChange', () => this.updatePartyDisplay());
    
    // Listen for game start events
    window.addEventListener('gameStart', (e) => {
      console.log('Game started with party:', e.detail.party);
    });
    
    // Initial updates
    this.updateClassPreview();
    this.updateAvailableCharacters();
    this.updatePartyDisplay();
    this.updateValidation();
  }

  /**
   * Setup drag and drop functionality
   */
  setupDragAndDrop() {
    const container = this.container;
    
    // Handle drag start on character cards
    container.addEventListener('dragstart', (e) => {
      if (e.target.closest('.character-card')) {
        const card = e.target.closest('.character-card');
        this.draggedCharacter = card.dataset.characterId;
        this.draggedElement = card;
        card.classList.add('dragging');
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.draggedCharacter);
      }
    });
    
    // Handle drag end
    container.addEventListener('dragend', (e) => {
      if (e.target.closest('.character-card')) {
        e.target.closest('.character-card').classList.remove('dragging');
        this.draggedCharacter = null;
        this.draggedElement = null;
      }
    });
    
    // Handle drag over party slots
    container.addEventListener('dragover', (e) => {
      const slot = e.target.closest('.party-slot');
      if (slot && this.draggedCharacter) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        slot.classList.add('drag-over');
      }
    });
    
    // Handle drag leave
    container.addEventListener('dragleave', (e) => {
      const slot = e.target.closest('.party-slot');
      if (slot) {
        slot.classList.remove('drag-over');
      }
    });
    
    // Handle drop on party slots
    container.addEventListener('drop', (e) => {
      const slot = e.target.closest('.party-slot');
      if (slot && this.draggedCharacter) {
        e.preventDefault();
        slot.classList.remove('drag-over');
        
        const position = parseInt(slot.dataset.position);
        this.addCharacterToParty(this.draggedCharacter, position);
      }
    });
    
    // Handle double-click on character cards to show character sheet
    container.addEventListener('dblclick', (e) => {
      const card = e.target.closest('.character-card');
      if (card && card.dataset.characterId) {
        this.showCharacterSheet(card.dataset.characterId);
      }
    });
  }

  /**
   * Update class preview
   */
  updateClassPreview() {
    const preview = this.container.querySelector('#class-preview');
    preview.innerHTML = this.createClassPreview(this.selectedClass);
  }

  /**
   * Create a new character
   */
  createCharacter() {
    const name = this.characterName.trim() || null;
    
    try {
      const character = this.characterSystem.createCharacter(this.selectedClass, name);
      
      // Clear form
      this.container.querySelector('#character-name').value = '';
      this.characterName = '';
      
      // Update displays
      this.updateAvailableCharacters();
      this.updateValidation();
      
      console.log(`Created character: ${character.name}`);
    } catch (error) {
      console.error('Failed to create character:', error);
      alert('Failed to create character: ' + error.message);
    }
  }

  /**
   * Create a test party
   */
  createTestParty() {
    const party = this.characterSystem.createTestParty('balanced');
    this.updateAvailableCharacters();
    this.updatePartyDisplay();
    this.updateValidation();
    
    console.log('Created test party');
  }

  /**
   * Add character to party at specific position
   * @param {string} characterId - Character ID
   * @param {number} position - Party position (0-3)
   */
  addCharacterToParty(characterId, position) {
    // Check if position is occupied
    const currentParty = this.characterSystem.partyManager.party;
    if (currentParty[position]) {
      // Swap if both positions have characters
      const existingCharacter = currentParty[position];
      const movingCharacter = this.characterSystem.getCharacter(characterId);
      
      if (this.characterSystem.partyManager.hasCharacter(characterId)) {
        // Swap positions
        this.characterSystem.partyManager.swapCharacters(characterId, existingCharacter.id);
      } else {
        // Remove existing character and add new one
        this.characterSystem.removeFromParty(existingCharacter.id);
        this.characterSystem.partyManager.addCharacter(movingCharacter, position);
      }
    } else {
      // Add to empty position
      const character = this.characterSystem.getCharacter(characterId);
      if (this.characterSystem.partyManager.hasCharacter(characterId)) {
        // Move within party
        this.characterSystem.partyManager.moveCharacter(characterId, position);
      } else {
        // Add from available characters
        this.characterSystem.partyManager.addCharacter(character, position);
      }
    }
    
    this.updateAvailableCharacters();
    this.updatePartyDisplay();
    this.updateValidation();
  }

  /**
   * Update available characters display
   */
  updateAvailableCharacters() {
    const characterList = this.container.querySelector('#character-list');
    const allCharacters = this.characterSystem.getAllCharacters();
    const availableCharacters = allCharacters.filter(char => 
      !this.characterSystem.partyManager.hasCharacter(char.id)
    );
    
    if (availableCharacters.length === 0) {
      characterList.innerHTML = '<p class="no-characters">No available characters</p>';
      return;
    }
    
    characterList.innerHTML = availableCharacters
      .map(char => this.createCharacterCard(char, true))
      .join('');
  }

  /**
   * Update party formation display
   */
  updatePartyDisplay() {
    const party = this.characterSystem.partyManager.party;
    
    // Update each slot
    for (let i = 0; i < 4; i++) {
      const slot = this.container.querySelector(`#slot-${i}`);
      const character = party[i];
      
      if (character) {
        slot.innerHTML = this.createCharacterCard(character, true);
      } else {
        slot.innerHTML = '<div class="empty-slot">Drop character here</div>';
      }
    }
  }

  /**
   * Update party validation and start button
   */
  updateValidation() {
    const validation = this.characterSystem.validateParty();
    const validationDiv = this.container.querySelector('#party-validation');
    const startBtn = this.container.querySelector('#start-game');
    
    let html = '';
    
    if (validation.warnings.length > 0) {
      html += '<div class="validation-warnings">';
      html += '<h4>Warnings:</h4>';
      html += '<ul>';
      validation.warnings.forEach(warning => {
        html += `<li class="warning">${warning}</li>`;
      });
      html += '</ul></div>';
    }
    
    if (validation.suggestions.length > 0) {
      html += '<div class="validation-suggestions">';
      html += '<h4>Suggestions:</h4>';
      html += '<ul>';
      validation.suggestions.forEach(suggestion => {
        html += `<li class="suggestion">${suggestion}</li>`;
      });
      html += '</ul></div>';
    }
    
    if (validation.isValid && this.characterSystem.partyManager.getPartySize() > 0) {
      html += '<div class="validation-success">Party is ready to start!</div>';
      startBtn.disabled = false;
    } else {
      startBtn.disabled = true;
    }
    
    validationDiv.innerHTML = html;
  }

  /**
   * Start the game with current party
   */
  startGame() {
    const partySize = this.characterSystem.partyManager.getPartySize();
    if (partySize === 0) {
      alert('You need at least one character to start the game!');
      return;
    }
    
    // Emit game start event
    const event = new CustomEvent('gameStart', {
      detail: {
        party: this.characterSystem.getParty(),
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
    
    // Hide the UI
    this.hide();
    
    console.log('Game started with party of', partySize, 'characters');
  }

  /**
   * Show character sheet for a character
   * @param {string} characterId - Character ID
   */
  showCharacterSheet(characterId) {
    // Import and use CharacterSheetUI
    import('./CharacterSheetUI.js').then(module => {
      const CharacterSheetUI = module.CharacterSheetUI;
      const characterSheetUI = new CharacterSheetUI(this.characterSystem);
      characterSheetUI.show(characterId);
    });
  }

  /**
   * Add CSS styles for the party creation UI
   */
  addStyles() {
    if (document.getElementById('party-creation-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'party-creation-styles';
    style.textContent = `
      .party-creation-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: 'Courier New', monospace;
      }
      
      .party-creation-modal {
        background: #1a1a1a;
        border: 2px solid #00ff00;
        border-radius: 10px;
        width: 90%;
        max-width: 1200px;
        max-height: 90%;
        overflow-y: auto;
        color: #00ff00;
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #00ff00;
      }
      
      .modal-header h2 {
        margin: 0;
        color: #00ff00;
      }
      
      .close-btn {
        background: none;
        border: 1px solid #00ff00;
        color: #00ff00;
        font-size: 24px;
        width: 40px;
        height: 40px;
        cursor: pointer;
        border-radius: 5px;
      }
      
      .close-btn:hover {
        background: #00ff00;
        color: #000;
      }
      
      .modal-content {
        display: grid;
        grid-template-columns: 1fr 2fr 1fr;
        gap: 20px;
        padding: 20px;
      }
      
      .creation-section, .party-section, .available-characters {
        border: 1px solid #333;
        border-radius: 5px;
        padding: 15px;
      }
      
      .creation-section h3, .party-section h3, .available-characters h3 {
        margin: 0 0 15px 0;
        color: #00ff00;
        border-bottom: 1px solid #333;
        padding-bottom: 5px;
      }
      
      .form-group {
        margin-bottom: 15px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 5px;
        color: #00aa00;
      }
      
      .form-group input, .form-group select {
        width: 100%;
        padding: 8px;
        background: #000;
        border: 1px solid #00ff00;
        color: #00ff00;
        border-radius: 3px;
        font-family: inherit;
      }
      
      .class-preview {
        margin: 15px 0;
        padding: 15px;
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 5px;
      }
      
      .class-info h4 {
        color: #00ff00;
        margin: 0 0 10px 0;
      }
      
      .class-description {
        color: #00aa00;
        margin-bottom: 15px;
        font-size: 14px;
      }
      
      .stats-grid, .growth-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 5px;
        margin-bottom: 10px;
      }
      
      .stat-item {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
      }
      
      .stat-label {
        color: #00aa00;
      }
      
      .stat-value {
        color: #00ff00;
        font-weight: bold;
      }
      
      .growth-item {
        font-size: 12px;
        color: #00aa00;
      }
      
      .class-skills ul {
        margin: 0;
        padding-left: 20px;
        font-size: 12px;
        color: #00aa00;
      }
      
      .create-character-btn {
        width: 100%;
        padding: 10px;
        background: #003300;
        border: 1px solid #00ff00;
        color: #00ff00;
        cursor: pointer;
        border-radius: 5px;
        font-family: inherit;
      }
      
      .create-character-btn:hover {
        background: #00ff00;
        color: #000;
      }
      
      .formation-info {
        margin-bottom: 15px;
        padding: 10px;
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 3px;
        font-size: 12px;
      }
      
      .formation-info p {
        margin: 5px 0;
        color: #00aa00;
      }
      
      .formation-row {
        margin-bottom: 20px;
      }
      
      .formation-row h4 {
        margin: 0 0 10px 0;
        color: #00ff00;
        text-align: center;
      }
      
      .party-slots {
        display: flex;
        gap: 10px;
        justify-content: center;
      }
      
      .party-slot {
        width: 200px;
        min-height: 150px;
        border: 2px dashed #333;
        border-radius: 5px;
        position: relative;
        transition: border-color 0.3s;
      }
      
      .party-slot.drag-over {
        border-color: #00ff00;
        background: rgba(0, 255, 0, 0.1);
      }
      
      .slot-label {
        position: absolute;
        top: 5px;
        left: 5px;
        font-size: 10px;
        color: #666;
      }
      
      .slot-content {
        padding: 20px 10px 10px 10px;
        height: 100%;
      }
      
      .empty-slot {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #666;
        font-size: 12px;
        text-align: center;
      }
      
      .character-card {
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 5px;
        padding: 10px;
        margin-bottom: 10px;
        cursor: move;
        position: relative;
        transition: all 0.3s;
      }
      
      .character-card:hover {
        border-color: #00ff00;
        transform: translateY(-2px);
      }
      
      .character-card.dragging {
        opacity: 0.5;
        transform: rotate(5deg);
      }
      
      .character-card.warrior { border-left: 4px solid #8B4513; }
      .character-card.rogue { border-left: 4px solid #228B22; }
      .character-card.mage { border-left: 4px solid #4169E1; }
      .character-card.cleric { border-left: 4px solid #FFD700; }
      
      .character-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
      }
      
      .character-header h4 {
        margin: 0;
        color: #00ff00;
        font-size: 14px;
      }
      
      .character-level {
        color: #00aa00;
        font-size: 12px;
      }
      
      .character-class {
        color: #00aa00;
        font-size: 12px;
        margin-bottom: 8px;
      }
      
      .hp-bar {
        position: relative;
        height: 16px;
        background: #333;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      
      .hp-fill {
        height: 100%;
        background: linear-gradient(90deg, #ff4444, #ffaa44, #44ff44);
        transition: width 0.3s;
      }
      
      .hp-text {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: #fff;
        text-shadow: 1px 1px 1px #000;
      }
      
      .character-stats {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 5px;
        margin-bottom: 8px;
      }
      
      .stat {
        font-size: 10px;
        color: #00aa00;
        text-align: center;
      }
      
      .formation-effects {
        font-size: 10px;
        color: #666;
        text-align: center;
        font-style: italic;
      }
      
      .drag-handle {
        position: absolute;
        top: 5px;
        right: 5px;
        color: #666;
        font-size: 12px;
        cursor: move;
      }
      
      .character-list {
        max-height: 400px;
        overflow-y: auto;
      }
      
      .no-characters {
        text-align: center;
        color: #666;
        font-style: italic;
        margin: 20px 0;
      }
      
      .modal-footer {
        padding: 20px;
        border-top: 1px solid #333;
      }
      
      .party-validation {
        margin-bottom: 15px;
      }
      
      .validation-warnings, .validation-suggestions {
        margin-bottom: 10px;
      }
      
      .validation-warnings h4, .validation-suggestions h4 {
        margin: 0 0 5px 0;
        font-size: 14px;
      }
      
      .validation-warnings h4 {
        color: #ff8800;
      }
      
      .validation-suggestions h4 {
        color: #00aaff;
      }
      
      .validation-warnings ul, .validation-suggestions ul {
        margin: 0;
        padding-left: 20px;
      }
      
      .warning {
        color: #ff8800;
        font-size: 12px;
      }
      
      .suggestion {
        color: #00aaff;
        font-size: 12px;
      }
      
      .validation-success {
        color: #00ff00;
        font-weight: bold;
        text-align: center;
        padding: 10px;
        background: rgba(0, 255, 0, 0.1);
        border: 1px solid #00ff00;
        border-radius: 5px;
      }
      
      .modal-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      
      .btn {
        padding: 10px 20px;
        border: 1px solid;
        border-radius: 5px;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
      }
      
      .btn.primary {
        background: #003300;
        border-color: #00ff00;
        color: #00ff00;
      }
      
      .btn.primary:hover:not(:disabled) {
        background: #00ff00;
        color: #000;
      }
      
      .btn.primary:disabled {
        background: #333;
        border-color: #666;
        color: #666;
        cursor: not-allowed;
      }
      
      .btn.secondary {
        background: #330033;
        border-color: #ff00ff;
        color: #ff00ff;
      }
      
      .btn.secondary:hover {
        background: #ff00ff;
        color: #000;
      }
      
      @media (max-width: 1024px) {
        .modal-content {
          grid-template-columns: 1fr;
          grid-template-rows: auto auto auto;
        }
        
        .party-slots {
          flex-wrap: wrap;
        }
        
        .party-slot {
          width: 180px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
}