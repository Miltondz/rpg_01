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
    // Default to first alive party member when no ID given
    if (!characterId) {
      const party = this.characterSystem.partyManager?.party ?? [];
      const first = party.find(Boolean);
      characterId = first?.id ?? null;
    }
    const character = this.characterSystem.getCharacter(characterId);
    if (!character) {
      console.error('CharacterSheetUI: no character to show (party may be empty)');
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
      <div class="cs-modal">

        <!-- Header: party tabs + close -->
        <div class="cs-header">
          <div class="cs-party-tabs" id="cs-party-tabs"></div>
          <span id="character-name" class="cs-char-title">CHARACTER</span>
          <button class="cs-close" id="close-character-sheet">âœ•</button>
        </div>

        <!-- Three-column body -->
        <div class="cs-body">

          <!-- LEFT: portrait + stats -->
          <div class="cs-left">
            <div class="cs-portrait" id="character-portrait">
              <span class="cs-portrait-icon" id="character-class-icon">âš”</span>
            </div>
            <div class="cs-identity">
              <div class="cs-char-name" id="character-display-name">â€”</div>
              <div class="cs-char-meta">
                <span id="character-class-name">â€”</span>
                &nbsp;Â·&nbsp;
                <span id="character-level-info">Lv.1</span>
              </div>
            </div>

            <div class="cs-divider"></div>

            <!-- Stat rows -->
            <div class="cs-stat-row">
              <span class="cs-stat-lbl">HP</span>
              <div class="cs-bar-wrap">
                <div class="cs-bar cs-bar-hp" id="hp-bar"></div>
              </div>
              <span class="cs-stat-val"><span id="hp-current">0</span>/<span id="hp-max">0</span></span>
            </div>
            <div class="cs-stat-row">
              <span class="cs-stat-lbl">ATK</span>
              <div class="cs-bar-wrap">
                <div class="cs-bar cs-bar-atk" id="atk-bar-visual"></div>
              </div>
              <span class="cs-stat-val"><span id="atk-total">0</span><small id="atk-bonus" class="cs-bonus"></small></span>
            </div>
            <div class="cs-stat-row">
              <span class="cs-stat-lbl">DEF</span>
              <div class="cs-bar-wrap">
                <div class="cs-bar cs-bar-def" id="def-bar-visual"></div>
              </div>
              <span class="cs-stat-val"><span id="def-total">0</span><small id="def-bonus" class="cs-bonus"></small></span>
            </div>
            <div class="cs-stat-row">
              <span class="cs-stat-lbl">SPD</span>
              <div class="cs-bar-wrap">
                <div class="cs-bar cs-bar-spd" id="spd-bar-visual"></div>
              </div>
              <span class="cs-stat-val"><span id="spd-total">0</span><small id="spd-bonus" class="cs-bonus"></small></span>
            </div>

            <!-- Hidden compat spans (updateStatsDisplay reads these) -->
            <span id="atk-base" style="display:none">0</span>
            <span id="def-base" style="display:none">0</span>
            <span id="spd-base" style="display:none">0</span>

            <div class="cs-divider"></div>

            <!-- XP bar -->
            <div class="cs-xp-label">
              <span>XP</span>
              <span id="xp-to-next" class="cs-xp-hint"></span>
            </div>
            <div class="cs-xp-track">
              <div class="cs-xp-fill" id="xp-fill"></div>
              <span class="cs-xp-text" id="xp-text"></span>
            </div>

            <div class="cs-divider"></div>
            <div class="cs-formation-row" id="formation-effects">
              <span class="cs-sect-lbl">FORMATION</span>
              <span id="formation-description" class="cs-formation-val">â€”</span>
            </div>
          </div><!-- /cs-left -->

          <!-- CENTER: paper-doll equipment -->
          <div class="cs-center">
            <div class="cs-sect-lbl" style="text-align:center;margin-bottom:8px">EQUIPMENT</div>
            <div class="cs-paperdoll">
              <!-- Top: head slot -->
              <div class="cs-doll-slot cs-doll-head" data-slot="weapon">
                <div class="cs-doll-label">WEAPON</div>
                <div class="cs-doll-icon">âš”</div>
                <div class="cs-slot-content" id="weapon-slot"><span class="cs-empty-slot">â€”</span></div>
              </div>

              <!-- Silhouette -->
              <div class="cs-doll-body">
                <svg viewBox="0 0 60 120" class="cs-silhouette" xmlns="http://www.w3.org/2000/svg">
                  <!-- head -->
                  <circle cx="30" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
                  <!-- body -->
                  <rect x="18" y="24" width="24" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
                  <!-- left arm -->
                  <rect x="4" y="24" width="12" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
                  <!-- right arm -->
                  <rect x="44" y="24" width="12" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
                  <!-- legs -->
                  <rect x="18" y="62" width="10" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
                  <rect x="32" y="62" width="10" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>

              <!-- Armor slot -->
              <div class="cs-doll-slot cs-doll-armor" data-slot="armor">
                <div class="cs-doll-label">ARMOR</div>
                <div class="cs-doll-icon">ðŸ›¡</div>
                <div class="cs-slot-content" id="armor-slot"><span class="cs-empty-slot">â€”</span></div>
              </div>

              <!-- Accessory slot below -->
              <div class="cs-doll-slot cs-doll-acc" data-slot="accessory">
                <div class="cs-doll-label">ACCESSORY</div>
                <div class="cs-doll-icon">ðŸ’</div>
                <div class="cs-slot-content" id="accessory-slot"><span class="cs-empty-slot">â€”</span></div>
              </div>
            </div>
          </div><!-- /cs-center -->

          <!-- RIGHT: skills -->
          <div class="cs-right">
            <div class="cs-sect-lbl">ABILITIES</div>
            <div class="cs-skills-list" id="unlocked-skills"></div>
            <div class="cs-divider" style="margin:10px 0"></div>
            <div class="cs-sect-lbl">UPCOMING</div>
            <div class="cs-skill-tree" id="skill-tree"></div>
          </div><!-- /cs-right -->

        </div><!-- /cs-body -->

        <!-- Footer -->
        <div class="cs-footer">
          <button class="cs-btn cs-btn-lvl" id="level-up-btn" disabled>â–² LEVEL UP</button>
          <button class="cs-btn cs-btn-heal" id="heal-character-btn">âœš HEAL</button>
          <button class="cs-btn cs-btn-close" id="close-sheet-btn">âœ• CLOSE</button>
        </div>

      </div>
    `;

    this.addStyles();
  }

  _buildPartyTabs() {
    const tabsEl = this.container?.querySelector('#cs-party-tabs');
    if (!tabsEl) return;
    const party = this.characterSystem.partyManager?.party?.filter(Boolean) ?? [];
    tabsEl.innerHTML = '';
    for (const member of party) {
      const btn = document.createElement('button');
      btn.className = 'cs-party-tab' + (member.id === this.currentCharacter?.id ? ' cs-tab-active' : '');
      btn.textContent = member.name.toUpperCase();
      btn.addEventListener('click', () => {
        this.currentCharacter = member;
        this.updateDisplay();
        this._buildPartyTabs();
      });
      tabsEl.appendChild(btn);
    }
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

    // Rebuild party tabs
    this._buildPartyTabs();

    // Update basic info
    this.container.querySelector('#character-name').textContent = char.name.toUpperCase();
    this.container.querySelector('#character-display-name').textContent = char.name;
    this.container.querySelector('#character-class-name').textContent = 
      char.class.charAt(0).toUpperCase() + char.class.slice(1);
    this.container.querySelector('#character-level-info').textContent = `Level ${char.level}`;
    
    // Update class icon
    const classIcons = {
      warrior: 'âš”',
      rogue: 'ðŸ—¡',
      mage: 'ðŸ”®',
      cleric: 'âœ¨'
    };
    this.container.querySelector('#character-class-icon').textContent = 
      classIcons[char.class] || 'âš”';
    
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

    // Visual stat bars (Daggerfall style) â€” scale ATK/DEF/SPD bars against 30 max
    const pct = (v, max) => Math.min(100, Math.round(v / max * 100)) + '%';
    const atkBar = this.container.querySelector('#atk-bar-visual');
    const defBar = this.container.querySelector('#def-bar-visual');
    const spdBar = this.container.querySelector('#spd-bar-visual');
    if (atkBar) atkBar.style.width = pct(totalStats.ATK, 30);
    if (defBar) defBar.style.width = pct(totalStats.DEF, 30);
    if (spdBar) spdBar.style.width = pct(totalStats.SPD, 20);
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
            ${hasSkill ? 'âœ“ Learned' : isUnlocked ? 'â—‹ Available' : 'âœ— Locked'}
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
      power_strike: 'ðŸ’¥',
      taunt: 'ðŸ›¡',
      cleave: 'âš”',
      iron_will: 'ðŸ’ª',
      execute: 'ðŸ’€',
      backstab: 'ðŸ—¡',
      poison_blade: 'â˜ ',
      evasion: 'ðŸ’¨',
      multi_strike: 'âš¡',
      assassinate: 'ðŸŽ¯',
      fireball: 'ðŸ”¥',
      ice_shard: 'â„',
      lightning_storm: 'âš¡',
      mana_shield: 'ðŸ”®',
      meteor: 'â˜„',
      heal: 'ðŸ’š',
      bless: 'âœ¨',
      mass_heal: 'ðŸ’–',
      resurrect: 'ðŸ‘¼',
      divine_shield: 'ðŸ›¡'
    };
    
    return icons[skillId] || 'â­';
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
          <button class="close-comparison">Ã—</button>
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
    
    if (upgrades > downgrades) return `â†‘ ${upgrades} stats improved`;
    if (downgrades > upgrades) return `â†“ ${downgrades} stats decreased`;
    return `Â± Mixed changes`;
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
                <span class="stat-arrow">â†’</span>
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
          <span style="color: #00ff00;">âœ“ Currently Equipped</span>
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
      indicator.innerHTML = 'â†‘';
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
      /* â”€â”€ Daggerfall-style Character Sheet â”€â”€ */
      .character-sheet-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.88);
        display: flex; align-items: center; justify-content: center;
        z-index: 2500;
        font-family: 'Press Start 2P', 'Courier New', monospace;
      }
      /* â”€â”€ Modal shell â”€â”€ */
      .cs-modal {
        background: #0a0a0a;
        border: 1px solid #8B6914;
        width: min(98vw,1020px); max-height: 92vh;
        display: flex; flex-direction: column;
        box-shadow: 0 0 40px rgba(139,105,20,0.25), inset 0 0 40px rgba(0,0,0,0.5);
        color: #C8A84B;
      }
      /* â”€â”€ Header â”€â”€ */
      .cs-header {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 12px;
        border-bottom: 1px solid #3D2E0A;
        background: #111007;
        flex-shrink: 0;
      }
      .cs-char-title {
        font-size: 9px; letter-spacing: 3px; color: #8B6914; flex: 1; text-align: center;
      }
      .cs-close {
        background: none; border: 1px solid #3D2E0A; color: #5a4510;
        width: 26px; height: 26px; cursor: pointer; font-size: 12px;
        flex-shrink: 0;
      }
      .cs-close:hover { border-color: #C8A84B; color: #C8A84B; }
      /* Party tabs */
      .cs-party-tabs { display: flex; gap: 4px; flex-shrink: 0; }
      .cs-party-tab {
        background: none; border: 1px solid #3D2E0A; color: #5a4510;
        padding: 4px 10px; cursor: pointer; font-family: inherit; font-size: 7px;
        letter-spacing: 1px; transition: all 0.1s;
      }
      .cs-party-tab:hover { border-color: #8B6914; color: #C8A84B; }
      .cs-tab-active { border-color: #C8A84B !important; color: #FFD700 !important; background: #1a1400 !important; }
      /* â”€â”€ Three-column body â”€â”€ */
      .cs-body {
        display: grid; grid-template-columns: 220px 1fr 220px;
        flex: 1; overflow: hidden; min-height: 0;
      }
      .cs-left, .cs-right {
        overflow-y: auto; padding: 14px 12px;
      }
      .cs-left { border-right: 1px solid #2a1f05; }
      .cs-right { border-left: 1px solid #2a1f05; }
      .cs-center { overflow-y: auto; padding: 14px; display: flex; flex-direction: column; align-items: center; }
      /* Divider */
      .cs-divider { border: none; border-top: 1px solid #2a1f05; margin: 10px 0; }
      /* Portrait */
      .cs-portrait {
        width: 64px; height: 80px; border: 1px solid #8B6914; background: #0d0d0a;
        display: flex; align-items: center; justify-content: center;
        font-size: 28px; margin: 0 auto 8px;
      }
      .cs-identity { text-align: center; margin-bottom: 10px; }
      .cs-char-name { font-size: 9px; color: #FFD700; letter-spacing: 1px; margin-bottom: 4px; }
      .cs-char-meta { font-size: 7px; color: #8B6914; letter-spacing: 1px; }
      /* Stat rows */
      .cs-sect-lbl { font-size: 7px; color: #5a4510; letter-spacing: 2px; display: block; margin-bottom: 4px; }
      .cs-stat-row {
        display: grid; grid-template-columns: 28px 1fr 56px;
        align-items: center; gap: 6px; margin-bottom: 6px;
      }
      .cs-stat-lbl { font-size: 7px; color: #8B6914; }
      .cs-bar-wrap { background: #1a1200; border: 1px solid #2a1f05; height: 8px; position: relative; }
      .cs-bar { height: 100%; transition: width 0.3s; }
      .cs-bar-hp  { background: linear-gradient(90deg, #8B0000, #CC2222); }
      .cs-bar-atk { background: linear-gradient(90deg, #8B4500, #CC6622); }
      .cs-bar-def { background: linear-gradient(90deg, #1a4a1a, #2a8B2a); }
      .cs-bar-spd { background: linear-gradient(90deg, #1a2a8B, #2255CC); }
      .cs-stat-val { font-size: 8px; color: #C8A84B; text-align: right; }
      .cs-bonus { font-size: 6px; color: #4a8B4a; }
      /* XP bar */
      .cs-xp-label { display: flex; justify-content: space-between; margin-bottom: 4px; }
      .cs-xp-label span { font-size: 7px; color: #8B6914; }
      .cs-xp-hint { font-size: 6px; color: #5a4510; }
      .cs-xp-track { position: relative; background: #1a1200; border: 1px solid #2a1f05; height: 10px; overflow: hidden; }
      .cs-xp-fill { height: 100%; background: linear-gradient(90deg, #2244AA, #4488FF); transition: width 0.4s; }
      .cs-xp-text {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        font-size: 6px; color: #C8A84B;
      }
      /* Formation */
      .cs-formation-row { margin-top: 8px; }
      .cs-formation-val { font-size: 7px; color: #8B6914; display: block; margin-top: 4px; line-height: 1.6; }
      /* â”€â”€ Paper-doll â”€â”€ */
      .cs-paperdoll {
        display: grid; grid-template-columns: 1fr auto 1fr;
        grid-template-rows: 1fr auto 1fr;
        gap: 8px; width: 100%; max-width: 380px;
        align-items: center;
      }
      .cs-doll-body {
        grid-column: 2; grid-row: 1 / 4;
        display: flex; align-items: center; justify-content: center;
      }
      .cs-silhouette {
        width: 80px; height: 160px; color: #3D2E0A;
      }
      .cs-doll-slot {
        background: #0d0d0a; border: 1px solid #3D2E0A;
        padding: 8px; text-align: center; cursor: pointer;
        transition: border-color 0.15s;
        min-width: 100px;
      }
      .cs-doll-slot:hover { border-color: #8B6914; }
      .cs-doll-head { grid-column: 1; grid-row: 1; }
      .cs-doll-armor { grid-column: 3; grid-row: 1; }
      .cs-doll-acc { grid-column: 1 / 4; grid-row: 3; justify-self: center; min-width: 180px; }
      .cs-doll-label { font-size: 6px; color: #5a4510; letter-spacing: 1px; margin-bottom: 4px; }
      .cs-doll-icon { font-size: 18px; margin-bottom: 4px; }
      .cs-slot-content { font-size: 7px; color: #C8A84B; min-height: 14px; }
      .cs-empty-slot { color: #2a1f05; }
      /* Existing equipment-slot class compat */
      .equipment-slot { } /* neutralize old styles */
      /* â”€â”€ Skills â”€â”€ */
      .cs-skills-list, .cs-skill-tree { display: flex; flex-direction: column; gap: 6px; }
      /* skill-item from old code */
      .skill-item { background: #0d0d0a; border: 1px solid #2a1f05; padding: 8px; border-left: 3px solid #5a4510; }
      .skill-item.unlocked { border-left-color: #C8A84B; }
      .skill-item h6 { margin: 0 0 2px; font-size: 8px; color: #FFD700; }
      .skill-item .skill-description { font-size: 7px; color: #8B6914; margin: 0 0 4px; line-height: 1.5; }
      .skill-item .skill-stats { font-size: 6px; color: #5a4510; display: flex; gap: 8px; }
      .skill-icon { font-size: 14px; margin-bottom: 2px; }
      /* skill tree items */
      .skill-tree-item { display: flex; gap: 8px; align-items: center; padding: 4px 6px; border-left: 2px solid #2a1f05; }
      .skill-tree-item.unlocked { border-left-color: #8B6914; }
      .skill-tree-item.locked { opacity: 0.4; }
      .skill-level { font-size: 7px; color: #5a4510; flex-shrink: 0; }
      .skill-name { font-size: 7px; color: #C8A84B; flex: 1; }
      .skill-status { font-size: 6px; color: #5a4510; }
      /* â”€â”€ Footer â”€â”€ */
      .cs-footer {
        display: flex; gap: 8px; padding: 10px 14px;
        border-top: 1px solid #3D2E0A; background: #111007;
        flex-shrink: 0;
      }
      .cs-btn {
        cursor: pointer; font-family: inherit; font-size: 7px; letter-spacing: 1px;
        padding: 8px 14px; border: 1px solid; background: none; transition: all 0.1s;
      }
      .cs-btn-lvl { border-color: #4a3a0a; color: #8B6914; }
      .cs-btn-lvl:not(:disabled):hover { background: #1a1400; border-color: #C8A84B; color: #FFD700; }
      .cs-btn-lvl:disabled { opacity: 0.3; cursor: not-allowed; }
      .cs-btn-heal { border-color: #1a3a1a; color: #2a8B2a; }
      .cs-btn-heal:hover { background: #0d1a0d; border-color: #4aCC4a; color: #4aCC4a; }
      .cs-btn-close { border-color: #3D2E0A; color: #5a4510; margin-left: auto; }
      .cs-btn-close:hover { border-color: #C8A84B; color: #C8A84B; }
      /* Scrollbars */
      .cs-left::-webkit-scrollbar, .cs-right::-webkit-scrollbar, .cs-center::-webkit-scrollbar { width: 4px; }
      .cs-left::-webkit-scrollbar-track, .cs-right::-webkit-scrollbar-track, .cs-center::-webkit-scrollbar-track { background: #0a0a0a; }
      .cs-left::-webkit-scrollbar-thumb, .cs-right::-webkit-scrollbar-thumb, .cs-center::-webkit-scrollbar-thumb { background: #3D2E0A; }
      /* Comparison modal still needed */
      .comparison-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:3000;display:flex;align-items:center;justify-content:center; }
      .comparison-content { background:#0a0a0a;border:1px solid #8B6914;padding:20px;min-width:300px;max-width:90vw;color:#C8A84B; }
      .comparison-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:12px; }
      .comparison-title { font-family:inherit;font-size:9px;letter-spacing:2px; }
      .comparison-close { background:none;border:1px solid #3D2E0A;color:#5a4510;cursor:pointer;font-size:12px;padding:2px 6px; }
      .comparison-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
      .comparison-item-name { font-size:8px;color:#FFD700;margin-bottom:6px; }
      .comparison-stat { font-size:7px;color:#C8A84B;margin:3px 0; }
      .comparison-better { color:#4aCC4a; }
      .comparison-worse  { color:#CC4a4a; }
      /* compat â€“ old slot tooltip */
      .equipment-tooltip { display:none; }
      @media (max-width:700px) {
        .cs-body { grid-template-columns: 1fr; }
        .cs-left, .cs-right { border: none; border-bottom: 1px solid #2a1f05; }
        .cs-paperdoll { grid-template-columns: 1fr; }
        .cs-doll-body { grid-column:1; }
      }
    `;
    document.head.appendChild(style);
  }
}
