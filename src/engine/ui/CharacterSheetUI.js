/**
 * CharacterSheetUI - User interface for displaying detailed character information
 * Shows stats, equipment, skills, and level progression
 */

export class CharacterSheetUI {
  constructor(characterSystem, inventorySystem = null) {
    this.characterSystem = characterSystem;
    this.inventorySystem = inventorySystem;
    this.container = null;
    this.isVisible = false;
    this.currentCharacter = null;
    this.equipmentUI = null;
    
    // Initialize equipment UI if inventory system is provided
    if (this.inventorySystem) {
      import('./EquipmentUI.js').then(module => {
        this.equipmentUI = new module.EquipmentUI(this.characterSystem, this.inventorySystem);
      });
    }
    
    console.log('CharacterSheetUI initialized');
  }

  /**
   * Show character sheet for a specific character
   * @param {string} characterId - Character ID to display
   */
  show(characterId) {
    const character = this.characterSystem.getCharacter(characterId);
    if (!character) {
      console.error('Character not found:', characterId);
      return;
    }
    
    this.currentCharacter = character;
    
    if (!this.isVisible) {
      this.createUI();
      this.isVisible = true;
      document.body.appendChild(this.container);
      this.setupEventListeners();
    }
    
    this.updateDisplay();
    console.log('Character sheet shown for:', character.name);
  }

  /**
   * Hide the character sheet
   */
  hide() {
    if (!this.isVisible) return;
    
    // Clean up any open modals or tooltips
    this.hideEquipmentTooltip();
    this._hideComparisonModal();
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    this.isVisible = false;
    this.currentCharacter = null;
    console.log('Character sheet hidden');
  }

  /**
   * Create the main UI structure
   */
  createUI() {
    this.container = document.createElement('div');
    this.container.className = 'character-sheet-overlay';
    
    this.container.innerHTML = `
      <div class="character-sheet-modal">
        <div class="modal-header">
          <h2 id="character-name">Character Sheet</h2>
          <button class="close-btn" id="close-character-sheet">×</button>
        </div>
        
        <div class="modal-content">
          <div class="character-info-section">
            <div class="character-portrait">
              <div class="portrait-placeholder" id="character-portrait">
                <span id="character-class-icon">⚔</span>
              </div>
              <div class="character-basic-info">
                <h3 id="character-display-name">Character Name</h3>
                <p id="character-class-name">Class</p>
                <p id="character-level-info">Level 1</p>
              </div>
            </div>
            
            <div class="experience-section">
              <h4>Experience Progress</h4>
              <div class="xp-bar-container">
                <div class="xp-bar">
                  <div class="xp-fill" id="xp-fill"></div>
                  <span class="xp-text" id="xp-text">0 / 100 XP</span>
                </div>
                <div class="xp-info">
                  <span id="xp-to-next">50 XP to next level</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="stats-section">
            <h4>Character Stats</h4>
            <div class="stats-grid">
              <div class="stat-block">
                <div class="stat-header">
                  <span class="stat-icon">❤</span>
                  <span class="stat-name">Health Points</span>
                </div>
                <div class="stat-values">
                  <span class="current-stat" id="hp-current">60</span>
                  <span class="stat-separator">/</span>
                  <span class="max-stat" id="hp-max">60</span>
                </div>
                <div class="stat-bar">
                  <div class="stat-fill hp-fill" id="hp-bar"></div>
                </div>
              </div>
              
              <div class="stat-block">
                <div class="stat-header">
                  <span class="stat-icon">⚔</span>
                  <span class="stat-name">Attack Power</span>
                </div>
                <div class="stat-values">
                  <span class="base-stat" id="atk-base">12</span>
                  <span class="bonus-stat" id="atk-bonus">+0</span>
                </div>
                <div class="stat-total" id="atk-total">12</div>
              </div>
              
              <div class="stat-block">
                <div class="stat-header">
                  <span class="stat-icon">🛡</span>
                  <span class="stat-name">Defense</span>
                </div>
                <div class="stat-values">
                  <span class="base-stat" id="def-base">10</span>
                  <span class="bonus-stat" id="def-bonus">+0</span>
                </div>
                <div class="stat-total" id="def-total">10</div>
              </div>
              
              <div class="stat-block">
                <div class="stat-header">
                  <span class="stat-icon">⚡</span>
                  <span class="stat-name">Speed</span>
                </div>
                <div class="stat-values">
                  <span class="base-stat" id="spd-base">5</span>
                  <span class="bonus-stat" id="spd-bonus">+0</span>
                </div>
                <div class="stat-total" id="spd-total">5</div>
              </div>
            </div>
            
            <div class="formation-effects" id="formation-effects">
              <h5>Formation Effects</h5>
              <p id="formation-description">No formation effects</p>
            </div>
          </div>
          
          <div class="skills-section">
            <h4>Skills & Abilities</h4>
            <div class="skills-container">
              <div class="unlocked-skills">
                <h5>Unlocked Skills</h5>
                <div class="skills-list" id="unlocked-skills">
                  <!-- Skills will be populated here -->
                </div>
              </div>
              
              <div class="skill-progression">
                <h5>Skill Tree</h5>
                <div class="skill-tree" id="skill-tree">
                  <!-- Skill progression will be populated here -->
                </div>
              </div>
            </div>
          </div>
          
          <div class="equipment-section">
            <h4>Equipment</h4>
            <div class="equipment-slots">
              <div class="equipment-slot" data-slot="weapon">
                <div class="slot-icon">⚔</div>
                <div class="slot-label">Weapon</div>
                <div class="slot-content" id="weapon-slot">
                  <div class="empty-slot">No weapon equipped</div>
                </div>
              </div>
              
              <div class="equipment-slot" data-slot="armor">
                <div class="slot-icon">🛡</div>
                <div class="slot-label">Armor</div>
                <div class="slot-content" id="armor-slot">
                  <div class="empty-slot">No armor equipped</div>
                </div>
              </div>
              
              <div class="equipment-slot" data-slot="accessory">
                <div class="slot-icon">💍</div>
                <div class="slot-label">Accessory</div>
                <div class="slot-content" id="accessory-slot">
                  <div class="empty-slot">No accessory equipped</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <div class="character-actions">
            <button class="btn secondary" id="level-up-btn" disabled>Level Up</button>
            <button class="btn secondary" id="heal-character-btn">Heal Character</button>
            <button class="btn primary" id="close-sheet-btn">Close</button>
          </div>
        </div>
      </div>
    `;
    
    // Add CSS styles
    this.addStyles();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close buttons
    const closeBtn = this.container.querySelector('#close-character-sheet');
    const closeSheetBtn = this.container.querySelector('#close-sheet-btn');
    
    closeBtn.addEventListener('click', () => this.hide());
    closeSheetBtn.addEventListener('click', () => this.hide());
    
    // Action buttons
    const levelUpBtn = this.container.querySelector('#level-up-btn');
    const healBtn = this.container.querySelector('#heal-character-btn');
    
    levelUpBtn.addEventListener('click', () => this.levelUpCharacter());
    healBtn.addEventListener('click', () => this.healCharacter());
    
    // Listen for character updates
    window.addEventListener('levelUp', (e) => {
      if (this.currentCharacter && e.detail.character.id === this.currentCharacter.id) {
        this.currentCharacter = e.detail.character;
        this.updateDisplay();
      }
    });
    
    // Listen for party changes to update formation effects
    window.addEventListener('partyChange', (e) => {
      if (this.currentCharacter) {
        this.updateFormationEffects();
      }
    });
    
    // Listen for equipment changes from other sources
    window.addEventListener('itemEquipped', (e) => {
      if (this.currentCharacter && e.detail.character.id === this.currentCharacter.id) {
        this.currentCharacter = e.detail.character;
        this.updateDisplay();
      }
    });
    
    window.addEventListener('itemUnequipped', (e) => {
      if (this.currentCharacter && e.detail.character.id === this.currentCharacter.id) {
        this.currentCharacter = e.detail.character;
        this.updateDisplay();
      }
    });
    
    // Close any open modals when character sheet is hidden
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hideEquipmentTooltip();
        this._hideComparisonModal();
      }
    });
  }

  /**
   * Update the display with current character data
   */
  updateDisplay() {
    if (!this.currentCharacter) return;
    
    const char = this.currentCharacter;
    
    // Update basic info
    this.container.querySelector('#character-name').textContent = `${char.name} - Character Sheet`;
    this.container.querySelector('#character-display-name').textContent = char.name;
    this.container.querySelector('#character-class-name').textContent = 
      char.class.charAt(0).toUpperCase() + char.class.slice(1);
    this.container.querySelector('#character-level-info').textContent = `Level ${char.level}`;
    
    // Update class icon
    const classIcons = {
      warrior: '⚔',
      rogue: '🗡',
      mage: '🔮',
      cleric: '✨'
    };
    this.container.querySelector('#character-class-icon').textContent = 
      classIcons[char.class] || '⚔';
    
    // Update experience
    this.updateExperienceDisplay();
    
    // Update stats
    this.updateStatsDisplay();
    
    // Update skills
    this.updateSkillsDisplay();
    
    // Update equipment
    this.updateEquipmentDisplay();
    
    // Update formation effects
    this.updateFormationEffects();
    
    // Update action buttons
    this.updateActionButtons();
  }

  /**
   * Update experience display
   */
  updateExperienceDisplay() {
    const char = this.currentCharacter;
    const xpForCurrentLevel = this.characterSystem.experienceSystem.getExperienceForLevel(char.level);
    const xpForNextLevel = this.characterSystem.experienceSystem.getExperienceForLevel(char.level + 1);
    const currentLevelXP = char.experience - xpForCurrentLevel;
    const neededXP = xpForNextLevel - xpForCurrentLevel;
    const xpToNext = xpForNextLevel - char.experience;
    
    const xpPercent = (currentLevelXP / neededXP) * 100;
    
    this.container.querySelector('#xp-fill').style.width = `${xpPercent}%`;
    this.container.querySelector('#xp-text').textContent = `${currentLevelXP} / ${neededXP} XP`;
    this.container.querySelector('#xp-to-next').textContent = `${xpToNext} XP to next level`;
  }

  /**
   * Update stats display
   */
  updateStatsDisplay() {
    const char = this.currentCharacter;
    
    // HP
    const hpPercent = (char.currentHP / char.maxHP) * 100;
    this.container.querySelector('#hp-current').textContent = char.currentHP;
    this.container.querySelector('#hp-max').textContent = char.maxHP;
    this.container.querySelector('#hp-bar').style.width = `${hpPercent}%`;
    
    // ATK, DEF, SPD (base + equipment bonuses)
    const baseStats = char.getBaseStats();
    const totalStats = char.stats;
    
    this.container.querySelector('#atk-base').textContent = baseStats.ATK;
    this.container.querySelector('#atk-bonus').textContent = 
      totalStats.ATK > baseStats.ATK ? `+${totalStats.ATK - baseStats.ATK}` : '';
    this.container.querySelector('#atk-total').textContent = totalStats.ATK;
    
    this.container.querySelector('#def-base').textContent = baseStats.DEF;
    this.container.querySelector('#def-bonus').textContent = 
      totalStats.DEF > baseStats.DEF ? `+${totalStats.DEF - baseStats.DEF}` : '';
    this.container.querySelector('#def-total').textContent = totalStats.DEF;
    
    this.container.querySelector('#spd-base').textContent = baseStats.SPD;
    this.container.querySelector('#spd-bonus').textContent = 
      totalStats.SPD > baseStats.SPD ? `+${totalStats.SPD - baseStats.SPD}` : '';
    this.container.querySelector('#spd-total').textContent = totalStats.SPD;
  }

  /**
   * Update skills display
   */
  updateSkillsDisplay() {
    const char = this.currentCharacter;
    const unlockedSkillsContainer = this.container.querySelector('#unlocked-skills');
    const skillTreeContainer = this.container.querySelector('#skill-tree');
    
    // Get skill progression for this class
    const skillProgression = this.characterSystem.skillSystem.getSkillProgression(char.class);
    
    // Unlocked skills
    const unlockedSkills = char.skills;
    if (unlockedSkills.length === 0) {
      unlockedSkillsContainer.innerHTML = '<p class="no-skills">No skills unlocked yet</p>';
    } else {
      unlockedSkillsContainer.innerHTML = unlockedSkills.map(skill => `
        <div class="skill-item unlocked">
          <div class="skill-icon">${this.getSkillIcon(skill.id)}</div>
          <div class="skill-info">
            <h6>${skill.name}</h6>
            <p class="skill-description">${skill.description}</p>
            <div class="skill-stats">
              <span>AP Cost: ${skill.apCost}</span>
              ${skill.cooldown > 0 ? `<span>Cooldown: ${skill.cooldown}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('');
    }
    
    // Skill tree progression
    skillTreeContainer.innerHTML = skillProgression.map(skillInfo => {
      const isUnlocked = char.level >= skillInfo.level;
      const hasSkill = char.skills.some(s => s.id === skillInfo.skillId);
      
      return `
        <div class="skill-tree-item ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="skill-level">Lv.${skillInfo.level}</div>
          <div class="skill-name">${skillInfo.name}</div>
          <div class="skill-status">
            ${hasSkill ? '✓ Learned' : isUnlocked ? '○ Available' : '✗ Locked'}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Update equipment display
   */
  updateEquipmentDisplay() {
    const char = this.currentCharacter;
    const equipment = char.equipment;
    
    // Update each equipment slot
    ['weapon', 'armor', 'accessory'].forEach(slot => {
      const slotContainer = this.container.querySelector(`#${slot}-slot`);
      const slotElement = this.container.querySelector(`[data-slot="${slot}"]`);
      const item = equipment[slot];
      
      if (item) {
        // Get final stats with rarity bonuses
        const finalStats = this._getFinalItemStats(item);
        const rarityColor = this._getItemRarityColor(item.rarity);
        
        slotContainer.innerHTML = `
          <div class="equipped-item" style="border-left: 3px solid ${rarityColor}">
            <div class="item-header">
              <h6 style="color: ${rarityColor}">${item.name}</h6>
              <div class="item-level">Level ${item.level}</div>
              <div class="item-rarity" style="color: ${rarityColor}">${item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}</div>
            </div>
            <div class="item-stats">
              ${Object.entries(finalStats)
                .filter(([stat, value]) => value > 0)
                .map(([stat, value]) => `<span class="stat-bonus">${stat}: +${value}</span>`)
                .join('')}
            </div>
            <div class="item-actions">
              <button class="unequip-btn" data-slot="${slot}" title="Remove this item">Unequip</button>
              <button class="compare-btn" data-slot="${slot}" title="Compare with inventory items">Compare</button>
            </div>
          </div>
        `;
        
        // Add click handlers
        const unequipBtn = slotContainer.querySelector('.unequip-btn');
        const compareBtn = slotContainer.querySelector('.compare-btn');
        
        unequipBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.unequipItem(slot);
        });
        
        compareBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showEquipmentComparison(item, slot, e.target);
        });
        
        // Add hover tooltip for equipped item
        slotContainer.addEventListener('mouseenter', (e) => {
          this._showEquipmentTooltip(item, e.target, true);
        });
        
        slotContainer.addEventListener('mouseleave', () => {
          this.hideEquipmentTooltip();
        });
        
        slotElement.classList.add('has-item');
        
        // Add visual indicator for equipped item quality with enhanced effects
        slotElement.classList.remove('common', 'uncommon', 'rare', 'epic');
        slotElement.classList.add(item.rarity);
        
        // Add stat change indicators if this is an upgrade/downgrade
        this._addStatChangeIndicators(slotElement, item, slot);
        
        // Add rarity glow effect for higher tier items
        if (item.rarity === 'epic') {
          slotElement.classList.add('epic-glow');
        } else if (item.rarity === 'rare') {
          slotElement.classList.add('rare-glow');
        }
      } else {
        slotContainer.innerHTML = `
          <div class="empty-slot">
            <div class="empty-message">
              <p>No ${slot} equipped</p>
              <div class="slot-hint">Click to equip from inventory</div>
            </div>
            <button class="equip-btn" data-slot="${slot}" title="Select item from inventory">Equip Item</button>
          </div>
        `;
        
        // Add click handler for equip button
        const equipBtn = slotContainer.querySelector('.equip-btn');
        equipBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openEquipmentSelection(slot);
        });
        
        slotElement.classList.remove('has-item', 'common', 'uncommon', 'rare', 'epic');
      }
      
      // Add enhanced hover effects for better visual feedback
      slotElement.addEventListener('mouseenter', () => {
        if (item) {
          slotElement.classList.add('hover-equipped');
          // Show quick stats preview
          this._showQuickStatsPreview(slotElement, item);
          // Show enhanced tooltip on hover
          this._showEquipmentTooltip(item, slotElement, true);
        } else {
          slotElement.classList.add('hover-empty');
          // Show available items count
          this._showAvailableItemsHint(slotElement, slot);
        }
      });
      
      slotElement.addEventListener('mouseleave', () => {
        slotElement.classList.remove('hover-equipped', 'hover-empty');
        this._hideQuickPreview(slotElement);
        // Hide tooltip when mouse leaves
        this.hideEquipmentTooltip();
      });
    });
  }

  /**
   * Update formation effects display
   */
  updateFormationEffects() {
    const char = this.currentCharacter;
    const formationEffects = this.characterSystem.partyManager.getFormationEffects(char);
    
    this.container.querySelector('#formation-description').textContent = formationEffects.description;
  }

  /**
   * Update action buttons
   */
  updateActionButtons() {
    const char = this.currentCharacter;
    const levelUpBtn = this.container.querySelector('#level-up-btn');
    const healBtn = this.container.querySelector('#heal-character-btn');
    
    // Level up button (for testing - normally would be automatic)
    const xpForNextLevel = this.characterSystem.experienceSystem.getExperienceForLevel(char.level + 1);
    levelUpBtn.disabled = char.experience < xpForNextLevel;
    
    // Heal button
    healBtn.disabled = char.currentHP >= char.maxHP;
  }

  /**
   * Get skill icon for display
   * @param {string} skillId - Skill ID
   * @returns {string} Icon character
   */
  getSkillIcon(skillId) {
    const icons = {
      power_strike: '💥',
      taunt: '🛡',
      cleave: '⚔',
      iron_will: '💪',
      execute: '💀',
      backstab: '🗡',
      poison_blade: '☠',
      evasion: '💨',
      multi_strike: '⚡',
      assassinate: '🎯',
      fireball: '🔥',
      ice_shard: '❄',
      lightning_storm: '⚡',
      mana_shield: '🔮',
      meteor: '☄',
      heal: '💚',
      bless: '✨',
      mass_heal: '💖',
      resurrect: '👼',
      divine_shield: '🛡'
    };
    
    return icons[skillId] || '⭐';
  }

  /**
   * Level up character (for testing)
   */
  levelUpCharacter() {
    if (!this.currentCharacter) return;
    
    const xpNeeded = this.characterSystem.experienceSystem.getExperienceForLevel(this.currentCharacter.level + 1);
    const xpToAdd = xpNeeded - this.currentCharacter.experience;
    
    this.characterSystem.experienceSystem.addExperience(this.currentCharacter, xpToAdd);
    this.updateDisplay();
  }

  /**
   * Heal character to full HP
   */
  healCharacter() {
    if (!this.currentCharacter) return;
    
    this.currentCharacter.fullHeal();
    this.updateDisplay();
  }

  /**
   * Unequip an item from a slot
   * @param {string} slot - Equipment slot to unequip
   */
  unequipItem(slot) {
    if (!this.currentCharacter || !this.characterSystem) return;
    
    const result = this.characterSystem.unequipItem(this.currentCharacter.id, slot);
    
    if (result.success) {
      console.log(`Unequipped ${result.item.name} from ${slot}`);
      this.updateDisplay();
      
      // Emit event for other systems (like inventory) to handle the unequipped item
      const event = new CustomEvent('itemUnequipped', {
        detail: {
          character: this.currentCharacter,
          item: result.item,
          slot: slot
        }
      });
      window.dispatchEvent(event);
      
      // Add visual feedback for unequipping
      this._showEquipmentChangeAnimation(slot, 'unequipped');
    } else {
      console.error('Failed to unequip item:', result.message);
    }
  }

  /**
   * Open equipment selection
   * @param {string} slot - Equipment slot to equip to
   */
  openEquipmentSelection(slot) {
    console.log(`Opening equipment selection for ${slot} slot`);
    
    if (this.equipmentUI && this.currentCharacter) {
      // Use the dedicated EquipmentUI for full functionality
      this.equipmentUI.show(this.currentCharacter, slot);
    } else if (this.inventorySystem && this.currentCharacter) {
      // Fallback: show comparison modal with available items
      const slotTypeMapping = {
        'weapon': 'weapon',
        'armor': 'armor', 
        'accessory': 'accessory'
      };
      
      const itemType = slotTypeMapping[slot];
      if (itemType) {
        const compatibleItems = this.inventorySystem.getItemsByType(itemType);
        
        if (compatibleItems.length > 0) {
          this._showEquipmentComparisonModal(null, slot, compatibleItems);
        } else {
          alert(`No ${itemType} items available in inventory.`);
        }
      }
    } else {
      // Final fallback - emit event for other systems to handle
      const event = new CustomEvent('openEquipmentSelection', {
        detail: {
          character: this.currentCharacter,
          slot: slot
        }
      });
      window.dispatchEvent(event);
      
      console.log('No inventory system available. Equipment selection event emitted.');
    }
  }

  /**
   * Show equipment comparison tooltip
   * @param {Object} item - Item to compare
   * @param {string} slot - Equipment slot
   * @param {HTMLElement} element - Element to attach tooltip to
   */
  showEquipmentComparison(item, slot, element) {
    if (!this.currentCharacter || !this.characterSystem || !this.inventorySystem) {
      console.log('Opening basic item comparison (no inventory system available)');
      this._showBasicItemTooltip(item, element);
      return;
    }
    
    // Get compatible items from inventory for comparison
    const compatibleItems = this.inventorySystem.getItemsByType(slot === 'weapon' ? 'weapon' : 
                                                               slot === 'armor' ? 'armor' : 'accessory');
    
    if (compatibleItems.length === 0) {
      console.log('No compatible items in inventory to compare');
      this._showBasicItemTooltip(item, element);
      return;
    }
    
    // Create comparison modal
    this._showEquipmentComparisonModal(item, slot, compatibleItems);
  }

  /**
   * Show basic item tooltip without comparison
   * @param {Object} item - Item to show
   * @param {HTMLElement} element - Element to attach tooltip to
   */
  _showBasicItemTooltip(item, element) {
    const tooltip = document.createElement('div');
    tooltip.className = 'equipment-tooltip';
    
    const finalStats = this._getFinalItemStats(item);
    const rarityColor = this._getItemRarityColor(item.rarity);
    
    tooltip.innerHTML = `
      <div class="tooltip-header">
        <h6 style="color: ${rarityColor}">${item.name}</h6>
        <p class="item-type">${item.type} - Level ${item.level}</p>
        <p class="item-rarity" style="color: ${rarityColor}">${item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}</p>
      </div>
      
      <div class="tooltip-stats">
        <h6>Stats:</h6>
        ${Object.entries(finalStats)
          .filter(([stat, value]) => value > 0)
          .map(([stat, value]) => `
            <div class="stat-line">
              <span class="stat-name">${stat}:</span>
              <span class="stat-value">+${value}</span>
            </div>
          `).join('')}
      </div>
      
      ${item.description ? `
        <div class="tooltip-description">
          <p>${item.description}</p>
        </div>
      ` : ''}
    `;
    
    document.body.appendChild(tooltip);
    this._positionTooltip(tooltip, element);
    this._currentTooltip = tooltip;
    
    setTimeout(() => {
      if (this._currentTooltip === tooltip) {
        this.hideEquipmentTooltip();
      }
    }, 3000);
  }

  /**
   * Show equipment comparison modal with inventory items
   * @param {Object} currentItem - Currently equipped item
   * @param {string} slot - Equipment slot
   * @param {Array} compatibleItems - Compatible items from inventory
   */
  _showEquipmentComparisonModal(currentItem, slot, compatibleItems) {
    // Hide any existing tooltip
    this.hideEquipmentTooltip();
    
    const modal = document.createElement('div');
    modal.className = 'equipment-comparison-modal';
    
    modal.innerHTML = `
      <div class="comparison-content">
        <div class="modal-header">
          <h3>Equipment Comparison - ${slot.charAt(0).toUpperCase() + slot.slice(1)}</h3>
          <button class="close-comparison">×</button>
        </div>
        
        <div class="comparison-grid">
          <div class="current-item-section">
            <h4>Currently Equipped</h4>
            <div class="item-comparison-card">
              ${currentItem ? 
                this._renderItemComparisonCard(currentItem, null, true) :
                `<div class="empty-equipment-slot">
                  <p>No ${slot} currently equipped</p>
                  <div class="empty-stats">All stats: +0</div>
                </div>`
              }
            </div>
          </div>
          
          <div class="inventory-items-section">
            <h4>Available in Inventory</h4>
            <div class="inventory-items-list">
              ${compatibleItems.map(itemData => {
                const comparison = this.characterSystem.getEquipmentComparison(
                  this.currentCharacter.id, 
                  itemData.item, 
                  slot
                );
                return `
                  <div class="item-comparison-card" data-slot-index="${itemData.slotIndex}">
                    ${this._renderItemComparisonCard(itemData.item, comparison, false)}
                    <div class="comparison-actions">
                      <button class="equip-from-comparison" data-slot-index="${itemData.slotIndex}">
                        Equip This Item
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add styles and show modal
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1001;
      font-family: 'Courier New', monospace;
    `;
    
    document.body.appendChild(modal);
    this._currentComparisonModal = modal;
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close-comparison');
    closeBtn.addEventListener('click', () => this._hideComparisonModal());
    
    const equipBtns = modal.querySelectorAll('.equip-from-comparison');
    equipBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slotIndex = parseInt(e.target.dataset.slotIndex);
        this._equipItemFromComparison(slotIndex, slot);
      });
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this._hideComparisonModal();
      }
    });
  }

  /**
   * Render item comparison card
   * @param {Object} item - Item to render
   * @param {Object} comparison - Comparison data (null for current item)
   * @param {boolean} isCurrent - Whether this is the currently equipped item
   * @returns {string} HTML string
   */
  _renderItemComparisonCard(item, comparison, isCurrent) {
    const finalStats = this._getFinalItemStats(item);
    const rarityColor = this._getItemRarityColor(item.rarity);
    
    return `
      <div class="item-card-header" style="border-left: 3px solid ${rarityColor}">
        <h5 style="color: ${rarityColor}">${item.name}</h5>
        <div class="item-meta">
          <span class="item-level">Level ${item.level}</span>
          <span class="item-rarity" style="color: ${rarityColor}">${item.rarity}</span>
        </div>
      </div>
      
      <div class="item-stats-section">
        ${Object.entries(finalStats)
          .filter(([stat, value]) => value > 0)
          .map(([stat, value]) => {
            let statDisplay = `<span class="stat-name">${stat}:</span> <span class="stat-value">+${value}</span>`;
            
            if (comparison && comparison[stat]) {
              const diff = comparison[stat].difference;
              const isUpgrade = comparison[stat].isUpgrade;
              statDisplay += ` <span class="stat-change ${isUpgrade ? 'positive' : 'negative'}">
                (${diff > 0 ? '+' : ''}${diff})
              </span>`;
            }
            
            return `<div class="stat-line">${statDisplay}</div>`;
          }).join('')}
      </div>
      
      ${comparison ? `
        <div class="comparison-summary">
          <div class="upgrade-indicator ${this._getOverallUpgradeStatus(comparison)}">
            ${this._getUpgradeSummaryText(comparison)}
          </div>
        </div>
      ` : ''}
    `;
  }

  /**
   * Get overall upgrade status from comparison
   * @param {Object} comparison - Comparison data
   * @returns {string} CSS class for upgrade status
   */
  _getOverallUpgradeStatus(comparison) {
    const upgrades = Object.values(comparison).filter(stat => stat.isUpgrade).length;
    const downgrades = Object.values(comparison).filter(stat => !stat.isUpgrade).length;
    
    if (upgrades > downgrades) return 'overall-upgrade';
    if (downgrades > upgrades) return 'overall-downgrade';
    return 'overall-mixed';
  }

  /**
   * Get upgrade summary text
   * @param {Object} comparison - Comparison data
   * @returns {string} Summary text
   */
  _getUpgradeSummaryText(comparison) {
    const upgrades = Object.values(comparison).filter(stat => stat.isUpgrade).length;
    const downgrades = Object.values(comparison).filter(stat => !stat.isUpgrade).length;
    
    if (upgrades > downgrades) return `↑ ${upgrades} stats improved`;
    if (downgrades > upgrades) return `↓ ${downgrades} stats decreased`;
    return `± Mixed changes`;
  }

  /**
   * Equip item from comparison modal
   * @param {number} slotIndex - Inventory slot index
   * @param {string} equipSlot - Equipment slot to equip to
   */
  _equipItemFromComparison(slotIndex, equipSlot) {
    if (!this.inventorySystem || !this.characterSystem) return;
    
    const inventorySlot = this.inventorySystem.getSlot(slotIndex);
    if (!inventorySlot) {
      console.error('Invalid inventory slot');
      return;
    }
    
    const item = inventorySlot.item;
    
    // Check if character can equip the item
    const canEquip = this.characterSystem.canEquipItem(this.currentCharacter.id, item);
    if (!canEquip.success) {
      alert(`Cannot equip item: ${canEquip.reason}`);
      return;
    }
    
    // Equip the item
    const result = this.characterSystem.equipItem(this.currentCharacter.id, item, equipSlot);
    
    if (result.success) {
      // Remove item from inventory
      this.inventorySystem.removeItem(slotIndex, 1);
      
      // If there was a previous item, add it back to inventory
      if (result.previousItem) {
        this.inventorySystem.addItem(result.previousItem, 1);
      }
      
      console.log(`Equipped ${item.name} to ${this.currentCharacter.name}`);
      
      // Update displays
      this.updateDisplay();
      this._hideComparisonModal();
      
      // Emit equipment change event
      const event = new CustomEvent('itemEquipped', {
        detail: {
          character: this.currentCharacter,
          item: item,
          slot: equipSlot,
          previousItem: result.previousItem
        }
      });
      window.dispatchEvent(event);
      
      // Add visual feedback for successful equipment
      this._showEquipmentChangeAnimation(equipSlot, 'equipped');
    } else {
      console.error('Failed to equip item:', result.message);
      alert(`Failed to equip item: ${result.message}`);
    }
  }

  /**
   * Hide comparison modal
   */
  _hideComparisonModal() {
    if (this._currentComparisonModal) {
      this._currentComparisonModal.remove();
      this._currentComparisonModal = null;
    }
  }

  /**
   * Hide equipment comparison tooltip
   */
  hideEquipmentTooltip() {
    if (this._currentTooltip) {
      this._currentTooltip.remove();
      this._currentTooltip = null;
    }
  }

  /**
   * Show enhanced equipment tooltip with comparison data
   * @param {Object} item - Item to show tooltip for
   * @param {HTMLElement} element - Element to attach tooltip to
   * @param {boolean} isEquipped - Whether this item is currently equipped
   */
  _showEquipmentTooltip(item, element, isEquipped = false) {
    this.hideEquipmentTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'equipment-tooltip enhanced';
    
    const finalStats = this._getFinalItemStats(item);
    const rarityColor = this._getItemRarityColor(item.rarity);
    
    // Get comparison data if inventory system is available
    let comparisonData = null;
    if (this.inventorySystem && this.characterSystem && !isEquipped) {
      const slot = this._getItemSlot(item);
      if (slot) {
        comparisonData = this.characterSystem.getEquipmentComparison(
          this.currentCharacter.id, 
          item, 
          slot
        );
      }
    }
    
    tooltip.innerHTML = `
      <div class="tooltip-header">
        <h6 style="color: ${rarityColor}">${item.name}</h6>
        <div class="item-meta">
          <span class="item-type">${item.type} - Level ${item.level}</span>
          <span class="item-rarity" style="color: ${rarityColor}">${item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}</span>
        </div>
      </div>
      
      <div class="tooltip-stats">
        <h6>Stats:</h6>
        ${Object.entries(finalStats)
          .filter(([stat, value]) => value > 0)
          .map(([stat, value]) => {
            let statDisplay = `
              <div class="stat-comparison">
                <span class="stat-name">${stat}:</span>
                <span class="stat-value">+${value}</span>
            `;
            
            if (comparisonData && comparisonData[stat]) {
              const diff = comparisonData[stat].difference;
              const isUpgrade = comparisonData[stat].isUpgrade;
              const changePercent = Math.round((Math.abs(diff) / comparisonData[stat].current) * 100);
              
              statDisplay += `
                <span class="stat-arrow">→</span>
                <span class="stat-new ${isUpgrade ? 'better' : 'worse'}">+${comparisonData[stat].new}</span>
                <span class="stat-diff ${isUpgrade ? 'positive' : 'negative'}">(${diff > 0 ? '+' : ''}${diff})</span>
                <span class="stat-percent ${isUpgrade ? 'positive' : 'negative'}">[${changePercent}%]</span>
              `;
            }
            
            statDisplay += '</div>';
            return statDisplay;
          }).join('')}
      </div>
      
      ${item.requirements && (item.requirements.level || item.requirements.class) ? `
        <div class="tooltip-requirements">
          <h6>Requirements:</h6>
          ${item.requirements.level ? `<div>Level ${item.requirements.level}</div>` : ''}
          ${item.requirements.class ? `<div>Class: ${Array.isArray(item.requirements.class) ? item.requirements.class.join(', ') : item.requirements.class}</div>` : ''}
        </div>
      ` : ''}
      
      ${item.description ? `
        <div class="tooltip-description">
          <p>${item.description}</p>
        </div>
      ` : ''}
      
      ${comparisonData && Object.keys(comparisonData).length > 0 ? `
        <div class="comparison-summary">
          <div class="upgrade-indicator ${this._getOverallUpgradeStatus(comparisonData)}">
            ${this._getUpgradeSummaryText(comparisonData)}
          </div>
          <div class="detailed-comparison">
            <small>Click "Compare" for detailed analysis</small>
          </div>
        </div>
      ` : ''}
      
      ${isEquipped ? `
        <div class="equipped-indicator">
          <span style="color: #00ff00;">✓ Currently Equipped</span>
        </div>
      ` : ''}
    `;
    
    document.body.appendChild(tooltip);
    this._positionTooltip(tooltip, element);
    this._currentTooltip = tooltip;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (this._currentTooltip === tooltip) {
        this.hideEquipmentTooltip();
      }
    }, 5000);
  }

  /**
   * Add stat change indicators to equipment slot
   * @param {HTMLElement} slotElement - Equipment slot element
   * @param {Object} item - Equipped item
   * @param {string} slot - Equipment slot name
   */
  _addStatChangeIndicators(slotElement, item, slot) {
    // Remove existing indicators
    const existingIndicators = slotElement.querySelectorAll('.stat-indicator');
    existingIndicators.forEach(indicator => indicator.remove());
    
    if (!this.inventorySystem || !this.characterSystem) return;
    
    // Find better items in inventory
    const compatibleItems = this.inventorySystem.getItemsByType(item.type);
    let hasBetterItem = false;
    let upgradeCount = 0;
    let bestUpgradeItem = null;
    
    for (const itemData of compatibleItems) {
      const comparison = this.characterSystem.getEquipmentComparison(
        this.currentCharacter.id, 
        itemData.item, 
        slot
      );
      
      const upgrades = Object.values(comparison).filter(stat => stat.isUpgrade).length;
      if (upgrades > 0) {
        hasBetterItem = true;
        if (upgrades > upgradeCount) {
          upgradeCount = upgrades;
          bestUpgradeItem = itemData.item;
        }
      }
    }
    
    if (hasBetterItem) {
      const indicator = document.createElement('div');
      indicator.className = 'stat-indicator upgrade-available';
      indicator.innerHTML = '↑';
      indicator.title = `Better items available in inventory (${upgradeCount} stat${upgradeCount > 1 ? 's' : ''} improved)`;
      
      // Add upgrade count badge for multiple upgrades
      if (upgradeCount > 1) {
        const badge = document.createElement('span');
        badge.className = 'upgrade-count-badge';
        badge.textContent = upgradeCount;
        indicator.appendChild(badge);
      }
      
      slotElement.appendChild(indicator);
    }
  }

  /**
   * Show quick stats preview on hover
   * @param {HTMLElement} slotElement - Equipment slot element
   * @param {Object} item - Item to preview
   */
  _showQuickStatsPreview(slotElement, item) {
    const preview = document.createElement('div');
    preview.className = 'quick-stats-preview';
    
    const finalStats = this._getFinalItemStats(item);
    const statEntries = Object.entries(finalStats).filter(([stat, value]) => value > 0);
    
    if (statEntries.length > 0) {
      preview.innerHTML = statEntries
        .slice(0, 3) // Show max 3 stats
        .map(([stat, value]) => `<span>${stat}: +${value}</span>`)
        .join(' | ');
      
      slotElement.appendChild(preview);
    }
  }

  /**
   * Show available items hint for empty slots
   * @param {HTMLElement} slotElement - Equipment slot element
   * @param {string} slot - Equipment slot name
   */
  _showAvailableItemsHint(slotElement, slot) {
    if (!this.inventorySystem) return;
    
    const slotTypeMapping = {
      'weapon': 'weapon',
      'armor': 'armor',
      'accessory': 'accessory'
    };
    
    const itemType = slotTypeMapping[slot];
    if (!itemType) return;
    
    const compatibleItems = this.inventorySystem.getItemsByType(itemType);
    
    if (compatibleItems.length > 0) {
      const hint = document.createElement('div');
      hint.className = 'available-items-hint';
      hint.innerHTML = `${compatibleItems.length} item${compatibleItems.length > 1 ? 's' : ''} available`;
      slotElement.appendChild(hint);
    }
  }

  /**
   * Hide quick preview elements
   * @param {HTMLElement} slotElement - Equipment slot element
   */
  _hideQuickPreview(slotElement) {
    const preview = slotElement.querySelector('.quick-stats-preview');
    const hint = slotElement.querySelector('.available-items-hint');
    
    if (preview) preview.remove();
    if (hint) hint.remove();
  }

  /**
   * Get equipment slot for an item type
   * @param {Object} item - Item to get slot for
   * @returns {string|null} Equipment slot name
   */
  _getItemSlot(item) {
    const typeToSlot = {
      'weapon': 'weapon',
      'armor': 'armor',
      'accessory': 'accessory'
    };
    
    return typeToSlot[item.type] || null;
  }

  /**
   * Get final item stats with rarity bonuses
   * @param {Object} item - Item to get stats for
   * @returns {Object} Final stats
   */
  _getFinalItemStats(item) {
    if (!item || !item.stats) return {};
    
    // If item has getFinalStats method, use it
    if (typeof item.getFinalStats === 'function') {
      return item.getFinalStats();
    }
    
    // Otherwise calculate manually
    const rarity = item.rarity || 'common';
    const rarityBonuses = {
      'common': 1.0,
      'uncommon': 1.1,
      'rare': 1.2,
      'epic': 1.35
    };
    
    const bonus = rarityBonuses[rarity] || 1.0;
    const finalStats = {};
    
    Object.entries(item.stats).forEach(([stat, value]) => {
      finalStats[stat] = Math.floor(value * bonus);
    });
    
    return finalStats;
  }

  /**
   * Get item rarity color
   * @param {string} rarity - Item rarity
   * @returns {string} Color code
   */
  _getItemRarityColor(rarity) {
    const colors = {
      'common': '#FFFFFF',
      'uncommon': '#00FF00',
      'rare': '#0080FF',
      'epic': '#8000FF'
    };
    
    return colors[rarity] || colors.common;
  }

  /**
   * Show equipment change animation
   * @param {string} slot - Equipment slot that changed
   * @param {string} action - 'equipped' or 'unequipped'
   */
  _showEquipmentChangeAnimation(slot, action) {
    if (!this.isVisible) return;
    
    const slotElement = this.container.querySelector(`[data-slot="${slot}"]`);
    if (!slotElement) return;
    
    // Add animation class
    const animationClass = action === 'equipped' ? 'equipment-equipped' : 'equipment-unequipped';
    slotElement.classList.add(animationClass);
    
    // Remove animation class after animation completes
    setTimeout(() => {
      slotElement.classList.remove(animationClass);
    }, 600);
  }

  /**
   * Position tooltip relative to element
   * @param {HTMLElement} tooltip - Tooltip element
   * @param {HTMLElement} target - Target element
   */
  _positionTooltip(tooltip, target) {
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let left = targetRect.right + 10;
    let top = targetRect.top;
    
    // Adjust if tooltip would go off screen
    if (left + tooltipRect.width > window.innerWidth) {
      left = targetRect.left - tooltipRect.width - 10;
    }
    
    if (top + tooltipRect.height > window.innerHeight) {
      top = window.innerHeight - tooltipRect.height - 10;
    }
    
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.zIndex = '1001';
  }

  /**
   * Add CSS styles for the character sheet UI
   */
  addStyles() {
    if (document.getElementById('character-sheet-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'character-sheet-styles';
    style.textContent = `
      .character-sheet-overlay {
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
      
      .character-sheet-modal {
        background: #1a1a1a;
        border: 2px solid #00ff00;
        border-radius: 10px;
        width: 90%;
        max-width: 1000px;
        max-height: 90%;
        overflow-y: auto;
        color: #00ff00;
      }
      
      .character-info-section {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .character-portrait {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      
      .portrait-placeholder {
        width: 80px;
        height: 80px;
        border: 2px solid #00ff00;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        margin-bottom: 15px;
        background: #0a0a0a;
      }
      
      .character-basic-info h3 {
        margin: 0 0 5px 0;
        color: #00ff00;
      }
      
      .character-basic-info p {
        margin: 2px 0;
        color: #00aa00;
        font-size: 14px;
      }
      
      .experience-section h4 {
        margin: 0 0 10px 0;
        color: #00ff00;
      }
      
      .xp-bar-container {
        width: 100%;
      }
      
      .xp-bar {
        position: relative;
        height: 20px;
        background: #333;
        border: 1px solid #00ff00;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 5px;
      }
      
      .xp-fill {
        height: 100%;
        background: linear-gradient(90deg, #0066ff, #00aaff, #00ffff);
        transition: width 0.5s ease;
      }
      
      .xp-text {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: #fff;
        text-shadow: 1px 1px 1px #000;
      }
      
      .xp-info {
        text-align: center;
        font-size: 12px;
        color: #00aa00;
      }
      
      .stats-section {
        margin-bottom: 20px;
      }
      
      .stats-section h4 {
        margin: 0 0 15px 0;
        color: #00ff00;
        border-bottom: 1px solid #333;
        padding-bottom: 5px;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-bottom: 15px;
      }
      
      .stat-block {
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 5px;
        padding: 15px;
      }
      
      .stat-header {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .stat-icon {
        font-size: 18px;
        margin-right: 8px;
      }
      
      .stat-name {
        color: #00aa00;
        font-size: 14px;
      }
      
      .stat-values {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
      }
      
      .current-stat, .base-stat {
        color: #00ff00;
        font-size: 18px;
        font-weight: bold;
      }
      
      .max-stat {
        color: #00aa00;
        font-size: 18px;
      }
      
      .stat-separator {
        color: #666;
        margin: 0 5px;
        font-size: 18px;
      }
      
      .bonus-stat {
        color: #ffff00;
        font-size: 14px;
        margin-left: 5px;
      }
      
      .stat-total {
        color: #00ff00;
        font-size: 18px;
        font-weight: bold;
        text-align: right;
      }
      
      .stat-bar {
        height: 8px;
        background: #333;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .stat-fill {
        height: 100%;
        transition: width 0.3s ease;
      }
      
      .hp-fill {
        background: linear-gradient(90deg, #ff4444, #ffaa44, #44ff44);
      }
      
      .formation-effects {
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 5px;
        padding: 10px;
      }
      
      .formation-effects h5 {
        margin: 0 0 5px 0;
        color: #00ff00;
        font-size: 14px;
      }
      
      .formation-effects p {
        margin: 0;
        color: #00aa00;
        font-size: 12px;
        font-style: italic;
      }
      
      .skills-section {
        margin-bottom: 20px;
      }
      
      .skills-section h4 {
        margin: 0 0 15px 0;
        color: #00ff00;
        border-bottom: 1px solid #333;
        padding-bottom: 5px;
      }
      
      .skills-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      
      .unlocked-skills h5, .skill-progression h5 {
        margin: 0 0 10px 0;
        color: #00aa00;
        font-size: 14px;
      }
      
      .skills-list {
        max-height: 200px;
        overflow-y: auto;
      }
      
      .skill-item {
        display: flex;
        align-items: flex-start;
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 5px;
        padding: 10px;
        margin-bottom: 10px;
      }
      
      .skill-icon {
        font-size: 20px;
        margin-right: 10px;
        flex-shrink: 0;
      }
      
      .skill-info h6 {
        margin: 0 0 5px 0;
        color: #00ff00;
        font-size: 14px;
      }
      
      .skill-description {
        margin: 0 0 5px 0;
        color: #00aa00;
        font-size: 12px;
      }
      
      .skill-stats {
        display: flex;
        gap: 10px;
        font-size: 10px;
        color: #666;
      }
      
      .no-skills {
        text-align: center;
        color: #666;
        font-style: italic;
        margin: 20px 0;
      }
      
      .skill-tree {
        max-height: 200px;
        overflow-y: auto;
      }
      
      .skill-tree-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 3px;
        padding: 8px;
        margin-bottom: 5px;
        font-size: 12px;
      }
      
      .skill-tree-item.unlocked {
        border-color: #00aa00;
      }
      
      .skill-tree-item.locked {
        opacity: 0.5;
      }
      
      .skill-level {
        color: #00aa00;
        font-weight: bold;
        min-width: 40px;
      }
      
      .skill-name {
        color: #00ff00;
        flex-grow: 1;
        margin: 0 10px;
      }
      
      .skill-status {
        color: #666;
        font-size: 10px;
      }
      
      .skill-tree-item.unlocked .skill-status {
        color: #00aa00;
      }
      
      .equipment-section {
        margin-bottom: 20px;
      }
      
      .equipment-section h4 {
        margin: 0 0 15px 0;
        color: #00ff00;
        border-bottom: 1px solid #333;
        padding-bottom: 5px;
      }
      
      .equipment-slots {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
      }
      
      .equipment-slot {
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 5px;
        padding: 15px;
        text-align: center;
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
      }
      
      .equipment-slot:hover {
        border-color: #00aa00;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 170, 0, 0.2);
      }
      
      .equipment-slot.has-item {
        border-color: #00ff00;
      }
      
      .equipment-slot.hover-equipped {
        border-color: #00ff00;
        background: #0f1f0f;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 255, 0, 0.3);
      }
      
      .equipment-slot.hover-empty {
        border-color: #666;
        background: #1a1a1a;
        transform: translateY(-1px);
      }
      
      /* Rarity-based visual indicators */
      .equipment-slot.common {
        border-left: 4px solid #FFFFFF;
      }
      
      .equipment-slot.uncommon {
        border-left: 4px solid #00FF00;
        box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.1);
      }
      
      .equipment-slot.rare {
        border-left: 4px solid #0080FF;
        box-shadow: inset 0 0 10px rgba(0, 128, 255, 0.1);
      }
      
      .equipment-slot.epic {
        border-left: 4px solid #8000FF;
        box-shadow: inset 0 0 10px rgba(128, 0, 255, 0.1);
        animation: epic-glow 2s ease-in-out infinite alternate;
      }
      
      @keyframes epic-glow {
        from { box-shadow: inset 0 0 10px rgba(128, 0, 255, 0.1); }
        to { box-shadow: inset 0 0 20px rgba(128, 0, 255, 0.3); }
      }
      
      .equipment-slot.epic-glow {
        animation: epic-glow 2s ease-in-out infinite alternate;
        border: 2px solid #8000FF;
      }
      
      .equipment-slot.rare-glow {
        box-shadow: inset 0 0 15px rgba(0, 128, 255, 0.2);
        border: 2px solid #0080FF;
      }
      
      .slot-icon {
        font-size: 24px;
        margin-bottom: 5px;
      }
      
      .slot-label {
        color: #00aa00;
        font-size: 12px;
        margin-bottom: 10px;
      }
      
      .equipped-item {
        position: relative;
        padding: 12px;
        border-radius: 5px;
        background: linear-gradient(135deg, #111, #1a1a1a);
        border: 1px solid #333;
      }
      
      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
      }
      
      .equipped-item h6 {
        margin: 0;
        color: #00ff00;
        font-size: 14px;
        font-weight: bold;
      }
      
      .item-level {
        color: #666;
        font-size: 10px;
        text-align: right;
      }
      
      .item-stats {
        margin-bottom: 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .stat-bonus {
        color: #00aa00;
        font-size: 11px;
        display: block;
      }
      
      .item-actions {
        display: flex;
        gap: 5px;
        justify-content: space-between;
      }
      
      .unequip-btn, .equip-btn, .compare-btn {
        background: #333;
        border: 1px solid #00aa00;
        color: #00aa00;
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
        flex: 1;
      }
      
      .compare-btn {
        border-color: #0080ff;
        color: #0080ff;
      }
      
      .unequip-btn:hover, .equip-btn:hover {
        background: #00aa00;
        color: #000;
        transform: translateY(-1px);
      }
      
      .compare-btn:hover {
        background: #0080ff;
        color: #000;
        transform: translateY(-1px);
      }
      
      .empty-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 80px;
      }
      
      .empty-message {
        text-align: center;
        margin-bottom: 10px;
      }
      
      .empty-message p {
        margin: 0 0 5px 0;
        color: #666;
        font-size: 12px;
        font-style: italic;
      }
      
      .slot-hint {
        color: #444;
        font-size: 10px;
        font-style: italic;
      }
      
      /* Equipment Tooltip Styles */
      .equipment-tooltip {
        background: #1a1a1a;
        border: 2px solid #00ff00;
        border-radius: 5px;
        padding: 15px;
        max-width: 300px;
        color: #00ff00;
        font-family: 'Courier New', monospace;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
        z-index: 1002;
      }
      
      .equipment-tooltip.enhanced {
        max-width: 350px;
        background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
        border: 2px solid #00ff00;
        box-shadow: 0 8px 16px rgba(0, 255, 0, 0.2);
      }
      
      .tooltip-header h6 {
        margin: 0 0 5px 0;
        font-size: 16px;
      }
      
      .tooltip-header .item-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .item-type {
        color: #00aa00;
        font-size: 12px;
        text-transform: capitalize;
      }
      
      .item-rarity {
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
      }
      
      .tooltip-stats {
        margin-bottom: 10px;
        border-top: 1px solid #333;
        padding-top: 10px;
      }
      
      .stat-comparison {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
        font-size: 12px;
      }
      
      .stat-name {
        min-width: 40px;
        color: #00aa00;
      }
      
      .stat-current {
        color: #fff;
        margin: 0 5px;
      }
      
      .stat-arrow {
        color: #666;
        margin: 0 5px;
      }
      
      .stat-new.better {
        color: #00ff00;
      }
      
      .stat-new.worse {
        color: #ff4444;
      }
      
      .stat-diff.positive {
        color: #00ff00;
        margin-left: 5px;
      }
      
      .stat-diff.negative {
        color: #ff4444;
        margin-left: 5px;
      }
      
      .stat-percent {
        font-size: 10px;
        margin-left: 5px;
        font-weight: bold;
      }
      
      .stat-percent.positive {
        color: #00ff00;
      }
      
      .stat-percent.negative {
        color: #ff4444;
      }
      
      .tooltip-requirements {
        margin-bottom: 10px;
        padding: 5px;
        background: #330000;
        border: 1px solid #ff4444;
        border-radius: 3px;
      }
      
      .requirement-error {
        margin: 0;
        color: #ff4444;
        font-size: 11px;
      }
      
      .tooltip-description {
        border-top: 1px solid #333;
        padding-top: 10px;
      }
      
      .tooltip-description p {
        margin: 0;
        color: #00aa00;
        font-size: 11px;
        font-style: italic;
      }
      
      /* Enhanced Equipment Slot Indicators */
      .stat-indicator {
        position: absolute;
        top: 5px;
        right: 5px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        z-index: 10;
      }
      
      .stat-indicator.upgrade-available {
        background: #00ff00;
        color: #000;
        animation: pulse-upgrade 2s ease-in-out infinite;
        position: relative;
      }
      
      .upgrade-count-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ff6600;
        color: #fff;
        border-radius: 50%;
        width: 12px;
        height: 12px;
        font-size: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
      
      @keyframes pulse-upgrade {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 1; }
      }
      
      .equipment-slot.equipment-equipped {
        animation: equipment-equipped 0.6s ease-out;
      }
      
      .equipment-slot.equipment-unequipped {
        animation: equipment-unequipped 0.6s ease-out;
      }
      
      @keyframes equipment-equipped {
        0% { transform: scale(1); }
        25% { transform: scale(1.1); box-shadow: 0 0 20px rgba(0, 255, 0, 0.6); }
        50% { transform: scale(1.05); box-shadow: 0 0 15px rgba(0, 255, 0, 0.4); }
        100% { transform: scale(1); box-shadow: none; }
      }
      
      @keyframes equipment-unequipped {
        0% { transform: scale(1); }
        25% { transform: scale(0.9); box-shadow: 0 0 20px rgba(255, 68, 68, 0.6); }
        50% { transform: scale(0.95); box-shadow: 0 0 15px rgba(255, 68, 68, 0.4); }
        100% { transform: scale(1); box-shadow: none; }
      }
      
      .quick-stats-preview {
        position: absolute;
        bottom: -25px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid #00aa00;
        border-radius: 3px;
        padding: 4px 8px;
        font-size: 10px;
        color: #00aa00;
        white-space: nowrap;
        z-index: 5;
        pointer-events: none;
      }
      
      .available-items-hint {
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 170, 0, 0.2);
        border: 1px solid #00aa00;
        border-radius: 3px;
        padding: 2px 6px;
        font-size: 9px;
        color: #00aa00;
        white-space: nowrap;
        z-index: 5;
        pointer-events: none;
      }
      
      .equipped-indicator {
        margin-top: 10px;
        padding: 5px;
        background: rgba(0, 255, 0, 0.1);
        border: 1px solid #00ff00;
        border-radius: 3px;
        text-align: center;
        font-size: 11px;
      }
      
      .comparison-summary {
        margin-top: 10px;
        padding: 8px;
        border-radius: 3px;
        text-align: center;
        font-size: 11px;
        font-weight: bold;
      }
      
      .upgrade-indicator.overall-upgrade {
        background: rgba(0, 255, 0, 0.1);
        border: 1px solid #00ff00;
        color: #00ff00;
      }
      
      .upgrade-indicator.overall-downgrade {
        background: rgba(255, 68, 68, 0.1);
        border: 1px solid #ff4444;
        color: #ff4444;
      }
      
      .upgrade-indicator.overall-mixed {
        background: rgba(255, 170, 0, 0.1);
        border: 1px solid #ffaa00;
        color: #ffaa00;
      }
      
      .character-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      
      /* Equipment Comparison Modal Styles */
      .equipment-comparison-modal {
        font-family: 'Courier New', monospace;
      }
      
      .comparison-content {
        background: #1a1a1a;
        border: 2px solid #00ff00;
        border-radius: 10px;
        width: 90%;
        max-width: 900px;
        max-height: 80%;
        overflow-y: auto;
        color: #00ff00;
      }
      
      .comparison-content .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid #333;
      }
      
      .comparison-content h3 {
        margin: 0;
        color: #00ff00;
        font-size: 18px;
      }
      
      .close-comparison {
        background: #666;
        border: none;
        color: white;
        font-size: 20px;
        width: 30px;
        height: 30px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.3s ease;
      }
      
      .close-comparison:hover {
        background: #ff4444;
      }
      
      .comparison-grid {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 20px;
        padding: 20px;
      }
      
      .current-item-section h4,
      .inventory-items-section h4 {
        margin: 0 0 15px 0;
        color: #00ff00;
        border-bottom: 1px solid #333;
        padding-bottom: 5px;
      }
      
      .item-comparison-card {
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 5px;
        padding: 15px;
        margin-bottom: 15px;
      }
      
      .item-card-header {
        padding: 10px;
        border-radius: 3px;
        margin-bottom: 10px;
        background: #111;
      }
      
      .item-card-header h5 {
        margin: 0 0 5px 0;
        font-size: 16px;
      }
      
      .item-meta {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #666;
      }
      
      .item-stats-section {
        margin-bottom: 10px;
      }
      
      .stat-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 3px;
        font-size: 12px;
      }
      
      .stat-name {
        color: #00aa00;
        min-width: 40px;
      }
      
      .stat-value {
        color: #00ff00;
        font-weight: bold;
      }
      
      .stat-change.positive {
        color: #00ff00;
        font-weight: bold;
      }
      
      .stat-change.negative {
        color: #ff4444;
        font-weight: bold;
      }
      
      .comparison-summary {
        margin-top: 10px;
        padding: 8px;
        border-radius: 3px;
        text-align: center;
        font-size: 11px;
        font-weight: bold;
      }
      
      .upgrade-indicator.overall-upgrade {
        background: rgba(0, 255, 0, 0.1);
        border: 1px solid #00ff00;
        color: #00ff00;
      }
      
      .upgrade-indicator.overall-downgrade {
        background: rgba(255, 68, 68, 0.1);
        border: 1px solid #ff4444;
        color: #ff4444;
      }
      
      .upgrade-indicator.overall-mixed {
        background: rgba(255, 170, 0, 0.1);
        border: 1px solid #ffaa00;
        color: #ffaa00;
      }
      
      .comparison-actions {
        margin-top: 10px;
        text-align: center;
      }
      
      .equip-from-comparison {
        background: #333;
        border: 1px solid #00aa00;
        color: #00aa00;
        padding: 8px 15px;
        border-radius: 3px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        width: 100%;
      }
      
      .equip-from-comparison:hover {
        background: #00aa00;
        color: #000;
        transform: translateY(-1px);
      }
      
      .inventory-items-list {
        max-height: 400px;
        overflow-y: auto;
      }
      
      .empty-equipment-slot {
        text-align: center;
        padding: 20px;
        color: #666;
        font-style: italic;
      }
      
      .empty-equipment-slot p {
        margin: 0 0 10px 0;
        font-size: 14px;
      }
      
      .empty-stats {
        font-size: 12px;
        color: #444;
      }
      
      @media (max-width: 768px) {
        .character-info-section,
        .skills-container,
        .stats-grid,
        .equipment-slots {
          grid-template-columns: 1fr;
        }
        
        .comparison-grid {
          grid-template-columns: 1fr;
        }
        
        .comparison-content {
          width: 95%;
          max-height: 90%;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
}