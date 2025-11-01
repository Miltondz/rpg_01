/**
 * Inventory UI Manager
 * Handles the visual interface for inventory management with drag-and-drop
 */

// ItemTypes imported but not used in this file - available via item.type

export class InventoryUI {
    constructor(inventorySystem) {
        this.inventorySystem = inventorySystem;
        this.container = null;
        this.gridContainer = null;
        this.slotElements = [];
        this.isVisible = false;
        this.currentFilter = 'all';
        this.draggedSlot = null;
        this.tooltipElement = null;
        
        // Bind methods
        this.handleSlotClick = this.handleSlotClick.bind(this);
        this.handleSlotDragStart = this.handleSlotDragStart.bind(this);
        this.handleSlotDragOver = this.handleSlotDragOver.bind(this);
        this.handleSlotDrop = this.handleSlotDrop.bind(this);
        this.handleSlotMouseEnter = this.handleSlotMouseEnter.bind(this);
        this.handleSlotMouseLeave = this.handleSlotMouseLeave.bind(this);
        this.handleInventoryChange = this.handleInventoryChange.bind(this);
        
        this.createUI();
        this.inventorySystem.addChangeListener(this.handleInventoryChange);
    }

    createUI() {
        // Main container
        this.container = document.createElement('div');
        this.container.className = 'inventory-ui';
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            height: 500px;
            background: rgba(20, 20, 30, 0.95);
            border: 2px solid #444;
            border-radius: 8px;
            padding: 20px;
            z-index: 1000;
            display: none;
            font-family: 'Courier New', monospace;
            color: white;
        `;

        // Header
        const header = document.createElement('div');
        header.className = 'inventory-header';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #555;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Inventory';
        title.style.cssText = `
            margin: 0;
            color: #fff;
            font-size: 18px;
        `;

        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            background: #666;
            border: none;
            color: white;
            font-size: 20px;
            width: 30px;
            height: 30px;
            border-radius: 4px;
            cursor: pointer;
        `;
        closeButton.addEventListener('click', () => this.hide());

        header.appendChild(title);
        header.appendChild(closeButton);

        // Controls section
        const controls = this.createControls();
        
        // Stats section
        const stats = this.createStatsSection();

        // Grid container
        this.gridContainer = document.createElement('div');
        this.gridContainer.className = 'inventory-grid';
        this.gridContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            grid-template-rows: repeat(5, 1fr);
            gap: 2px;
            width: 100%;
            height: 300px;
            margin: 15px 0;
            padding: 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 4px;
        `;

        // Create slot elements
        this.createSlots();

        // Tooltip
        this.createTooltip();

        // Assemble UI
        this.container.appendChild(header);
        this.container.appendChild(controls);
        this.container.appendChild(stats);
        this.container.appendChild(this.gridContainer);
        
        document.body.appendChild(this.container);
    }

    createControls() {
        const controls = document.createElement('div');
        controls.className = 'inventory-controls';
        controls.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            align-items: center;
        `;

        // Filter buttons
        const filterLabel = document.createElement('span');
        filterLabel.textContent = 'Filter:';
        filterLabel.style.marginRight = '5px';

        const filters = [
            { key: 'all', label: 'All' },
            { key: 'equipment', label: 'Equipment' },
            { key: 'consumable', label: 'Consumables' },
            { key: 'material', label: 'Materials' },
            { key: 'key_item', label: 'Quest' }
        ];

        controls.appendChild(filterLabel);

        filters.forEach(filter => {
            const button = document.createElement('button');
            button.textContent = filter.label;
            button.className = `filter-btn ${filter.key === 'all' ? 'active' : ''}`;
            button.style.cssText = `
                background: ${filter.key === 'all' ? '#4a90e2' : '#666'};
                border: none;
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            `;
            
            button.addEventListener('click', () => this.setFilter(filter.key));
            controls.appendChild(button);
        });

        // Sort button
        const sortButton = document.createElement('button');
        sortButton.textContent = 'Sort';
        sortButton.style.cssText = `
            background: #28a745;
            border: none;
            color: white;
            padding: 5px 15px;
            border-radius: 4px;
            cursor: pointer;
            margin-left: auto;
        `;
        sortButton.addEventListener('click', () => this.sortInventory());
        controls.appendChild(sortButton);

        return controls;
    }

    createStatsSection() {
        const stats = document.createElement('div');
        stats.className = 'inventory-stats';
        stats.style.cssText = `
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            font-size: 14px;
        `;

        this.slotsDisplay = document.createElement('span');
        this.itemsDisplay = document.createElement('span');
        this.goldDisplay = document.createElement('span');

        stats.appendChild(this.slotsDisplay);
        stats.appendChild(this.itemsDisplay);
        stats.appendChild(this.goldDisplay);

        return stats;
    }

    createSlots() {
        this.slotElements = [];
        
        for (let i = 0; i < 40; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.slotIndex = i;
            slot.style.cssText = `
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid #555;
                border-radius: 4px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                position: relative;
                min-height: 50px;
            `;

            // Make slots draggable
            slot.draggable = true;
            slot.addEventListener('dragstart', this.handleSlotDragStart);
            slot.addEventListener('dragover', this.handleSlotDragOver);
            slot.addEventListener('drop', this.handleSlotDrop);
            slot.addEventListener('click', this.handleSlotClick);
            slot.addEventListener('mouseenter', this.handleSlotMouseEnter);
            slot.addEventListener('mouseleave', this.handleSlotMouseLeave);

            this.slotElements.push(slot);
            this.gridContainer.appendChild(slot);
        }
    }

    createTooltip() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'inventory-tooltip';
        this.tooltipElement.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid #666;
            border-radius: 4px;
            padding: 10px;
            color: white;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
            display: none;
            max-width: 250px;
            line-height: 1.4;
        `;
        document.body.appendChild(this.tooltipElement);
    }

    updateSlotDisplay(slotIndex) {
        const slot = this.slotElements[slotIndex];
        const slotData = this.inventorySystem.getSlot(slotIndex);
        
        // Clear slot
        slot.innerHTML = '';
        slot.style.background = 'rgba(255, 255, 255, 0.1)';
        
        if (slotData) {
            const item = slotData.item;
            
            // Set background color based on rarity
            slot.style.background = `linear-gradient(135deg, ${item.getColor()}22, rgba(255, 255, 255, 0.1))`;
            slot.style.borderColor = item.getColor();
            
            // Item icon (placeholder)
            const icon = document.createElement('div');
            icon.style.cssText = `
                width: 24px;
                height: 24px;
                background: ${item.getColor()};
                border-radius: 2px;
                margin-bottom: 2px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: black;
                font-weight: bold;
            `;
            icon.textContent = item.name.charAt(0).toUpperCase();
            
            // Quantity display for stackable items
            if (item.stackable && slotData.quantity > 1) {
                const quantity = document.createElement('div');
                quantity.style.cssText = `
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    font-size: 10px;
                    padding: 1px 3px;
                    border-radius: 2px;
                    min-width: 12px;
                    text-align: center;
                `;
                quantity.textContent = slotData.quantity;
                slot.appendChild(quantity);
            }
            
            slot.appendChild(icon);
        }
        
        // Apply filter visibility
        this.applyFilter();
    }

    updateAllSlots() {
        for (let i = 0; i < 40; i++) {
            this.updateSlotDisplay(i);
        }
        this.updateStats();
    }

    updateStats() {
        const stats = this.inventorySystem.getStats();
        this.slotsDisplay.textContent = `Slots: ${stats.usedSlots}/${stats.totalSlots}`;
        this.itemsDisplay.textContent = `Items: ${stats.itemCount}`;
        this.goldDisplay.textContent = `Gold: ${stats.gold}`;
    }

    setFilter(filterType) {
        this.currentFilter = filterType;
        
        // Update button states
        const buttons = this.container.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = '#666';
        });
        
        const activeButton = Array.from(buttons).find(btn => {
            const btnText = btn.textContent.toLowerCase();
            if (filterType === 'all' && btnText === 'all') return true;
            if (filterType === 'equipment' && btnText === 'equipment') return true;
            if (filterType === 'consumable' && btnText === 'consumables') return true;
            if (filterType === 'material' && btnText === 'materials') return true;
            if (filterType === 'key_item' && btnText === 'quest') return true;
            return false;
        });
        
        if (activeButton) {
            activeButton.classList.add('active');
            activeButton.style.background = '#4a90e2';
        }
        
        this.applyFilter();
    }

    applyFilter() {
        this.slotElements.forEach((slot, index) => {
            const slotData = this.inventorySystem.getSlot(index);
            let visible = true;
            
            if (this.currentFilter !== 'all' && slotData) {
                if (this.currentFilter === 'equipment') {
                    // Equipment filter includes weapons, armor, and accessories
                    visible = ['weapon', 'armor', 'accessory'].includes(slotData.item.type);
                } else {
                    visible = slotData.item.type === this.currentFilter;
                }
            }
            
            slot.style.display = visible ? 'flex' : 'none';
        });
    }

    sortInventory() {
        this.inventorySystem.sortInventory();
    }

    show() {
        this.isVisible = true;
        this.container.style.display = 'block';
        this.updateAllSlots();
    }

    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
        this.hideTooltip();
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    // Event handlers

    handleSlotClick(event) {
        const slotIndex = parseInt(event.currentTarget.dataset.slotIndex);
        const slotData = this.inventorySystem.getSlot(slotIndex);
        
        if (slotData) {
            console.log(`Clicked item: ${slotData.item.name} (x${slotData.quantity})`);
            // Could trigger item use, equipment, etc.
        }
    }

    handleSlotDragStart(event) {
        const slotIndex = parseInt(event.currentTarget.dataset.slotIndex);
        const slotData = this.inventorySystem.getSlot(slotIndex);
        
        if (slotData) {
            this.draggedSlot = slotIndex;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', slotIndex.toString());
            event.currentTarget.style.opacity = '0.5';
        } else {
            event.preventDefault();
        }
    }

    handleSlotDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        event.currentTarget.style.background = 'rgba(74, 144, 226, 0.3)';
    }

    handleSlotDrop(event) {
        event.preventDefault();
        event.currentTarget.style.background = '';
        
        const fromSlot = parseInt(event.dataTransfer.getData('text/plain'));
        const toSlot = parseInt(event.currentTarget.dataset.slotIndex);
        
        if (fromSlot !== toSlot) {
            const success = this.inventorySystem.moveItem(fromSlot, toSlot);
            if (!success) {
                console.log('Failed to move item');
            }
        }
        
        // Reset drag state
        if (this.draggedSlot !== null) {
            this.slotElements[this.draggedSlot].style.opacity = '1';
            this.draggedSlot = null;
        }
    }

    handleSlotMouseEnter(event) {
        const slotIndex = parseInt(event.currentTarget.dataset.slotIndex);
        const slotData = this.inventorySystem.getSlot(slotIndex);
        
        if (slotData) {
            this.showTooltip(slotData.item, event.pageX, event.pageY);
        }
    }

    handleSlotMouseLeave(event) {
        this.hideTooltip();
        // Reset drag over styling
        event.currentTarget.style.background = '';
    }

    handleInventoryChange() {
        if (this.isVisible) {
            this.updateAllSlots();
        }
    }

    showTooltip(item, x, y) {
        const tooltip = item.getTooltip();
        
        let content = `<div style="color: ${item.getColor()}; font-weight: bold; margin-bottom: 5px;">
            ${tooltip.name}
        </div>`;
        
        content += `<div style="color: #ccc; font-size: 11px; margin-bottom: 5px;">
            ${tooltip.type.charAt(0).toUpperCase() + tooltip.type.slice(1)} • 
            ${tooltip.rarity.charAt(0).toUpperCase() + tooltip.rarity.slice(1)} • 
            Level ${tooltip.level}
        </div>`;
        
        if (tooltip.description) {
            content += `<div style="margin-bottom: 8px; font-style: italic;">
                ${tooltip.description}
            </div>`;
        }
        
        // Stats
        if (Object.keys(tooltip.stats).length > 0) {
            content += '<div style="margin-bottom: 5px;"><strong>Stats:</strong></div>';
            Object.entries(tooltip.stats).forEach(([stat, value]) => {
                content += `<div style="margin-left: 10px; color: #4a90e2;">
                    ${stat}: +${value}
                </div>`;
            });
        }
        
        // Requirements
        if (tooltip.requirements.level || tooltip.requirements.class) {
            content += '<div style="margin-top: 8px; margin-bottom: 5px;"><strong>Requirements:</strong></div>';
            if (tooltip.requirements.level) {
                content += `<div style="margin-left: 10px; color: #ffa500;">
                    Level ${tooltip.requirements.level}
                </div>`;
            }
            if (tooltip.requirements.class) {
                content += `<div style="margin-left: 10px; color: #ffa500;">
                    Class: ${tooltip.requirements.class.join(', ')}
                </div>`;
            }
        }
        
        // Effects (for consumables)
        if (tooltip.effects.length > 0) {
            content += '<div style="margin-top: 8px; margin-bottom: 5px;"><strong>Effects:</strong></div>';
            tooltip.effects.forEach(effect => {
                content += `<div style="margin-left: 10px; color: #28a745;">
                    ${effect.type}: ${effect.value}${effect.duration ? ` (${effect.duration} turns)` : ''}
                </div>`;
            });
        }
        
        content += `<div style="margin-top: 8px; color: #ffd700;">
            Value: ${tooltip.value} gold
        </div>`;
        
        this.tooltipElement.innerHTML = content;
        this.tooltipElement.style.display = 'block';
        this.tooltipElement.style.left = (x + 10) + 'px';
        this.tooltipElement.style.top = (y - 10) + 'px';
        
        // Adjust position if tooltip goes off screen
        const rect = this.tooltipElement.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.tooltipElement.style.left = (x - rect.width - 10) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            this.tooltipElement.style.top = (y - rect.height - 10) + 'px';
        }
    }

    hideTooltip() {
        this.tooltipElement.style.display = 'none';
    }

    destroy() {
        this.inventorySystem.removeChangeListener(this.handleInventoryChange);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        if (this.tooltipElement && this.tooltipElement.parentNode) {
            this.tooltipElement.parentNode.removeChild(this.tooltipElement);
        }
    }
}