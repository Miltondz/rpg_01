/**
 * EquipmentUI - User interface for equipment selection and management
 * Integrates with inventory system to show equippable items
 */

export class EquipmentUI {
    constructor(characterSystem, inventorySystem) {
        this.characterSystem = characterSystem;
        this.inventorySystem = inventorySystem;
        this.container = null;
        this.isVisible = false;
        this.currentCharacter = null;
        this.currentSlot = null;
        
        console.log('EquipmentUI initialized');
    }

    /**
     * Show equipment selection for a character and slot
     * @param {Object} character - Character to equip items for
     * @param {string} slot - Equipment slot (weapon, armor, accessory)
     */
    show(character, slot) {
        this.currentCharacter = character;
        this.currentSlot = slot;
        
        if (!this.isVisible) {
            this.createUI();
            this.isVisible = true;
            document.body.appendChild(this.container);
            this.setupEventListeners();
        }
        
        this.updateDisplay();
        console.log(`Equipment selection shown for ${character.name} - ${slot} slot`);
    }

    /**
     * Hide the equipment selection UI
     */
    hide() {
        if (!this.isVisible) return;
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        this.isVisible = false;
        this.currentCharacter = null;
        this.currentSlot = null;
        console.log('Equipment selection hidden');
    }

    /**
     * Create the main UI structure
     */
    createUI() {
        this.container = document.createElement('div');
        this.container.className = 'equipment-selection-overlay';
        
        this.container.innerHTML = `
            <div class="equipment-selection-modal">
                <div class="modal-header">
                    <h2 id="equipment-title">Select Equipment</h2>
                    <button class="close-btn" id="close-equipment-selection">×</button>
                </div>
                
                <div class="modal-content">
                    <div class="current-equipment">
                        <h4>Currently Equipped</h4>
                        <div class="current-item-display" id="current-item">
                            <!-- Current item will be displayed here -->
                        </div>
                    </div>
                    
                    <div class="available-equipment">
                        <h4>Available Items</h4>
                        <div class="equipment-filters">
                            <button class="filter-btn active" data-filter="all">All</button>
                            <button class="filter-btn" data-filter="common">Common</button>
                            <button class="filter-btn" data-filter="uncommon">Uncommon</button>
                            <button class="filter-btn" data-filter="rare">Rare</button>
                            <button class="filter-btn" data-filter="epic">Epic</button>
                        </div>
                        <div class="equipment-list" id="equipment-list">
                            <!-- Available equipment will be listed here -->
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn secondary" id="cancel-selection">Cancel</button>
                </div>
            </div>
        `;
        
        this.addStyles();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close buttons
        const closeBtn = this.container.querySelector('#close-equipment-selection');
        const cancelBtn = this.container.querySelector('#cancel-selection');
        
        closeBtn.addEventListener('click', () => this.hide());
        cancelBtn.addEventListener('click', () => this.hide());
        
        // Filter buttons
        const filterBtns = this.container.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateEquipmentList(e.target.dataset.filter);
            });
        });
        
        // Click outside to close
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) {
                this.hide();
            }
        });
    }

    /**
     * Update the display with current data
     */
    updateDisplay() {
        if (!this.currentCharacter || !this.currentSlot) return;
        
        // Update title
        const title = this.container.querySelector('#equipment-title');
        title.textContent = `Select ${this.currentSlot.charAt(0).toUpperCase() + this.currentSlot.slice(1)} for ${this.currentCharacter.name}`;
        
        // Update current equipment display
        this.updateCurrentEquipment();
        
        // Update available equipment list
        this.updateEquipmentList('all');
    }

    /**
     * Update current equipment display
     */
    updateCurrentEquipment() {
        const currentItemContainer = this.container.querySelector('#current-item');
        const currentItem = this.currentCharacter.equipment[this.currentSlot];
        
        if (currentItem) {
            const finalStats = this._getFinalItemStats(currentItem);
            const rarityColor = this._getItemRarityColor(currentItem.rarity);
            
            currentItemContainer.innerHTML = `
                <div class="current-equipment-item" style="border-left: 3px solid ${rarityColor}">
                    <h5 style="color: ${rarityColor}">${currentItem.name}</h5>
                    <p class="item-level">Level ${currentItem.level}</p>
                    <p class="item-stats">
                        ${Object.entries(finalStats)
                            .filter(([stat, value]) => value > 0)
                            .map(([stat, value]) => `${stat}: +${value}`)
                            .join(', ')}
                    </p>
                    <button class="unequip-current-btn">Unequip Current</button>
                </div>
            `;
            
            // Add unequip handler
            const unequipBtn = currentItemContainer.querySelector('.unequip-current-btn');
            unequipBtn.addEventListener('click', () => {
                this.unequipCurrent();
            });
        } else {
            currentItemContainer.innerHTML = `
                <div class="no-current-item">
                    <p>No ${this.currentSlot} currently equipped</p>
                </div>
            `;
        }
    }

    /**
     * Update available equipment list
     * @param {string} filter - Rarity filter
     */
    updateEquipmentList(filter) {
        const listContainer = this.container.querySelector('#equipment-list');
        
        // Get compatible items from inventory
        const compatibleItems = this.getCompatibleItems(filter);
        
        if (compatibleItems.length === 0) {
            listContainer.innerHTML = `
                <div class="no-items">
                    <p>No compatible ${filter === 'all' ? '' : filter} items available</p>
                </div>
            `;
            return;
        }
        
        listContainer.innerHTML = compatibleItems.map((slotData, index) => {
            const item = slotData.item;
            const finalStats = this._getFinalItemStats(item);
            const rarityColor = this._getItemRarityColor(item.rarity);
            const canEquip = this.characterSystem.canEquipItem(this.currentCharacter.id, item);
            const comparison = this.characterSystem.getEquipmentComparison(
                this.currentCharacter.id, 
                item, 
                this.currentSlot
            );
            
            return `
                <div class="equipment-item ${!canEquip.success ? 'cannot-equip' : ''}" 
                     data-slot-index="${slotData.slotIndex}" 
                     style="border-left: 3px solid ${rarityColor}">
                    <div class="item-info">
                        <h6 style="color: ${rarityColor}">${item.name}</h6>
                        <p class="item-details">Level ${item.level} • Qty: ${slotData.quantity}</p>
                        <p class="item-stats">
                            ${Object.entries(finalStats)
                                .filter(([stat, value]) => value > 0)
                                .map(([stat, value]) => `${stat}: +${value}`)
                                .join(', ')}
                        </p>
                        ${!canEquip.success ? `
                            <p class="requirement-error">${canEquip.reason}</p>
                        ` : ''}
                    </div>
                    
                    ${Object.keys(comparison).length > 0 ? `
                        <div class="stat-comparison-preview">
                            ${Object.entries(comparison).slice(0, 3).map(([stat, data]) => `
                                <span class="stat-diff ${data.isUpgrade ? 'positive' : 'negative'}">
                                    ${stat}: ${data.current} → ${data.new} (${data.difference > 0 ? '+' : ''}${data.difference})
                                </span>
                            `).join('')}
                            <div class="overall-change ${this._getOverallChangeClass(comparison)}">
                                ${this._getOverallChangeText(comparison)}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="item-actions">
                        ${canEquip.success ? `
                            <button class="equip-item-btn" data-slot-index="${slotData.slotIndex}">
                                Equip
                            </button>
                        ` : ''}
                        <button class="compare-item-btn" data-slot-index="${slotData.slotIndex}">
                            Compare
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners for item actions
        this.setupItemActionListeners();
    }

    /**
     * Setup event listeners for item actions
     */
    setupItemActionListeners() {
        // Equip buttons
        const equipBtns = this.container.querySelectorAll('.equip-item-btn');
        equipBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const slotIndex = parseInt(e.target.dataset.slotIndex);
                this.equipItem(slotIndex);
            });
        });
        
        // Compare buttons
        const compareBtns = this.container.querySelectorAll('.compare-item-btn');
        compareBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const slotIndex = parseInt(e.target.dataset.slotIndex);
                this.showDetailedComparison(slotIndex);
            });
        });
    }

    /**
     * Get compatible items from inventory
     * @param {string} filter - Rarity filter
     * @returns {Array} Compatible items
     */
    getCompatibleItems(filter) {
        const slotTypeMapping = {
            'weapon': 'weapon',
            'armor': 'armor',
            'accessory': 'accessory'
        };
        
        const requiredType = slotTypeMapping[this.currentSlot];
        if (!requiredType) return [];
        
        // Get items of the correct type from inventory
        const typeItems = this.inventorySystem.getItemsByType(requiredType);
        
        // Filter by rarity if specified
        let filteredItems = typeItems;
        if (filter !== 'all') {
            filteredItems = typeItems.filter(slotData => 
                slotData.item.rarity === filter
            );
        }
        
        // Sort by level and rarity
        filteredItems.sort((a, b) => {
            const rarityOrder = { 'epic': 0, 'rare': 1, 'uncommon': 2, 'common': 3 };
            const rarityA = rarityOrder[a.item.rarity] || 999;
            const rarityB = rarityOrder[b.item.rarity] || 999;
            
            if (rarityA !== rarityB) return rarityA - rarityB;
            return b.item.level - a.item.level;
        });
        
        return filteredItems;
    }

    /**
     * Equip an item from inventory
     * @param {number} slotIndex - Inventory slot index
     */
    equipItem(slotIndex) {
        const inventorySlot = this.inventorySystem.getSlot(slotIndex);
        if (!inventorySlot) {
            console.error('Invalid inventory slot');
            return;
        }
        
        const item = inventorySlot.item;
        
        // Attempt to equip the item
        const result = this.characterSystem.equipItem(
            this.currentCharacter.id, 
            item, 
            this.currentSlot
        );
        
        if (result.success) {
            // Remove item from inventory
            this.inventorySystem.removeItem(slotIndex, 1);
            
            // If there was a previous item, add it back to inventory
            if (result.previousItem) {
                this.inventorySystem.addItem(result.previousItem, 1);
            }
            
            console.log(`Equipped ${item.name} to ${this.currentCharacter.name}`);
            
            // Update display and close
            this.updateDisplay();
            
            // Emit equipment change event
            const event = new CustomEvent('itemEquipped', {
                detail: {
                    character: this.currentCharacter,
                    item: item,
                    slot: this.currentSlot,
                    previousItem: result.previousItem
                }
            });
            window.dispatchEvent(event);
            
            // Auto-close after successful equip
            setTimeout(() => this.hide(), 500);
        } else {
            console.error('Failed to equip item:', result.message);
            alert(`Cannot equip item: ${result.message}`);
        }
    }

    /**
     * Unequip current item
     */
    unequipCurrent() {
        const result = this.characterSystem.unequipItem(
            this.currentCharacter.id, 
            this.currentSlot
        );
        
        if (result.success) {
            // Add unequipped item back to inventory
            const addResult = this.inventorySystem.addItem(result.item, 1);
            
            if (!addResult.success) {
                console.warn('Inventory full, item may be lost');
                alert('Inventory is full! Item may be lost.');
            }
            
            console.log(`Unequipped ${result.item.name} from ${this.currentCharacter.name}`);
            this.updateDisplay();
            
            // Emit unequip event
            const event = new CustomEvent('itemUnequipped', {
                detail: {
                    character: this.currentCharacter,
                    item: result.item,
                    slot: this.currentSlot
                }
            });
            window.dispatchEvent(event);
        } else {
            console.error('Failed to unequip item:', result.message);
        }
    }

    /**
     * Show detailed comparison tooltip
     * @param {number} slotIndex - Inventory slot index
     */
    showDetailedComparison(slotIndex) {
        const inventorySlot = this.inventorySystem.getSlot(slotIndex);
        if (!inventorySlot) return;
        
        const item = inventorySlot.item;
        const comparison = this.characterSystem.getEquipmentComparison(
            this.currentCharacter.id, 
            item, 
            this.currentSlot
        );
        
        // Create and show detailed comparison modal
        // This would be similar to the tooltip but as a modal
        console.log('Detailed comparison for:', item.name, comparison);
    }

    // Helper methods (same as CharacterSheetUI)
    _getFinalItemStats(item) {
        if (!item || !item.stats) return {};
        
        if (typeof item.getFinalStats === 'function') {
            return item.getFinalStats();
        }
        
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
     * Get overall change class for comparison
     * @param {Object} comparison - Comparison data
     * @returns {string} CSS class
     */
    _getOverallChangeClass(comparison) {
        const upgrades = Object.values(comparison).filter(stat => stat.isUpgrade).length;
        const downgrades = Object.values(comparison).filter(stat => !stat.isUpgrade).length;
        
        if (upgrades > downgrades) return 'upgrade';
        if (downgrades > upgrades) return 'downgrade';
        return 'mixed';
    }

    /**
     * Get overall change text for comparison
     * @param {Object} comparison - Comparison data
     * @returns {string} Change description
     */
    _getOverallChangeText(comparison) {
        const upgrades = Object.values(comparison).filter(stat => stat.isUpgrade).length;
        const downgrades = Object.values(comparison).filter(stat => !stat.isUpgrade).length;
        
        if (upgrades > downgrades) return `↑ ${upgrades} stat${upgrades > 1 ? 's' : ''} improved`;
        if (downgrades > upgrades) return `↓ ${downgrades} stat${downgrades > 1 ? 's' : ''} decreased`;
        return '± Mixed changes';
    }

    /**
     * Add CSS styles for equipment selection UI
     */
    addStyles() {
        if (document.getElementById('equipment-selection-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'equipment-selection-styles';
        style.textContent = `
            .equipment-selection-overlay {
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
            
            .equipment-selection-modal {
                background: #1a1a1a;
                border: 2px solid #00ff00;
                border-radius: 10px;
                width: 90%;
                max-width: 800px;
                max-height: 90%;
                overflow-y: auto;
                color: #00ff00;
            }
            
            .modal-content {
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 20px;
                padding: 20px;
            }
            
            .current-equipment h4,
            .available-equipment h4 {
                margin: 0 0 15px 0;
                color: #00ff00;
                border-bottom: 1px solid #333;
                padding-bottom: 5px;
            }
            
            .current-equipment-item {
                background: #0a0a0a;
                border: 1px solid #333;
                border-radius: 5px;
                padding: 15px;
            }
            
            .current-equipment-item h5 {
                margin: 0 0 5px 0;
                font-size: 16px;
            }
            
            .no-current-item {
                background: #0a0a0a;
                border: 1px solid #333;
                border-radius: 5px;
                padding: 15px;
                text-align: center;
                color: #666;
                font-style: italic;
            }
            
            .equipment-filters {
                display: flex;
                gap: 5px;
                margin-bottom: 15px;
                flex-wrap: wrap;
            }
            
            .filter-btn {
                background: #333;
                border: 1px solid #00aa00;
                color: #00aa00;
                padding: 5px 10px;
                border-radius: 3px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .filter-btn.active,
            .filter-btn:hover {
                background: #00aa00;
                color: #000;
            }
            
            .equipment-list {
                max-height: 400px;
                overflow-y: auto;
            }
            
            .equipment-item {
                background: #0a0a0a;
                border: 1px solid #333;
                border-radius: 5px;
                padding: 15px;
                margin-bottom: 10px;
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 15px;
                align-items: center;
            }
            
            .equipment-item.cannot-equip {
                opacity: 0.6;
                background: #1a0a0a;
            }
            
            .item-info h6 {
                margin: 0 0 5px 0;
                font-size: 14px;
            }
            
            .item-details {
                margin: 0 0 5px 0;
                color: #666;
                font-size: 11px;
            }
            
            .item-stats {
                margin: 0 0 5px 0;
                color: #00aa00;
                font-size: 11px;
            }
            
            .requirement-error {
                margin: 0;
                color: #ff4444;
                font-size: 10px;
            }
            
            .stat-comparison-preview {
                display: flex;
                flex-direction: column;
                gap: 2px;
                font-size: 10px;
                margin-top: 8px;
                padding: 6px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 3px;
                border: 1px solid #333;
            }
            
            .stat-diff.positive {
                color: #00ff00;
                font-weight: bold;
            }
            
            .stat-diff.negative {
                color: #ff4444;
                font-weight: bold;
            }
            
            .overall-change {
                margin-top: 4px;
                padding: 3px 6px;
                border-radius: 2px;
                text-align: center;
                font-size: 9px;
                font-weight: bold;
                text-transform: uppercase;
            }
            
            .overall-change.upgrade {
                background: rgba(0, 255, 0, 0.2);
                color: #00ff00;
                border: 1px solid #00ff00;
            }
            
            .overall-change.downgrade {
                background: rgba(255, 68, 68, 0.2);
                color: #ff4444;
                border: 1px solid #ff4444;
            }
            
            .overall-change.mixed {
                background: rgba(255, 170, 0, 0.2);
                color: #ffaa00;
                border: 1px solid #ffaa00;
            }
            
            .item-actions {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .equip-item-btn,
            .compare-item-btn,
            .unequip-current-btn {
                background: #333;
                border: 1px solid #00aa00;
                color: #00aa00;
                padding: 5px 10px;
                border-radius: 3px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .equip-item-btn:hover,
            .compare-item-btn:hover,
            .unequip-current-btn:hover {
                background: #00aa00;
                color: #000;
            }
            
            .no-items {
                text-align: center;
                color: #666;
                font-style: italic;
                padding: 40px 20px;
            }
            
            @media (max-width: 768px) {
                .modal-content {
                    grid-template-columns: 1fr;
                }
                
                .equipment-item {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}