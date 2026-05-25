/**
 * Inventory UI Manager
 * Handles the visual interface for inventory management with drag-and-drop
 */

// ItemTypes imported but not used in this file - available via item.type

export class InventoryUI {
    constructor(inventorySystem) {
        this.inventorySystem = inventorySystem;
        this.partyManager = null;
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
        window.addEventListener('partyDataChanged', () => { if (this.isVisible) this.updateAllSlots(); });
    }

    createUI() {
        this._injectStyles();

        // Full-screen overlay (hidden until show())
        this.container = document.createElement('div');
        this.container.className = 'inv-overlay';

        // Inner modal
        const modal = document.createElement('div');
        modal.className = 'inv-modal';

        // ── Header ──
        const header = document.createElement('div');
        header.className = 'inv-header';
        header.innerHTML = `<span class="inv-title">── INVENTORY ──</span>`;
        const closeBtn = document.createElement('button');
        closeBtn.className = 'inv-close';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', () => this.hide());
        header.appendChild(closeBtn);

        // ── Filter bar ──
        const filterBar = this.createControls();

        // ── Two-column body ──
        const body = document.createElement('div');
        body.className = 'inv-body';

        // Left: grid + stats
        const leftPane = document.createElement('div');
        leftPane.className = 'inv-left';

        this.gridContainer = document.createElement('div');
        this.gridContainer.className = 'inventory-grid';

        // Stats row
        const statsRow = this.createStatsSection();

        leftPane.appendChild(this.gridContainer);
        leftPane.appendChild(statsRow);

        // Right: item detail panel
        this.detailPanel = document.createElement('div');
        this.detailPanel.className = 'inv-detail';
        this.detailPanel.innerHTML = `<p class="inv-detail-empty">Select an item<br>to view details</p>`;

        body.appendChild(leftPane);
        body.appendChild(this.detailPanel);

        // Assemble
        modal.appendChild(header);
        modal.appendChild(filterBar);
        modal.appendChild(body);
        this.container.appendChild(modal);

        // Create slot elements (appends to gridContainer)
        this.createSlots();

        // Tooltip
        this.createTooltip();

        // Not appended to body here — deferred to show() so it only enters DOM when opened.
    }

    createControls() {
        const bar = document.createElement('div');
        bar.className = 'inv-filter-bar';
        this._filterBtns = {};

        const filters = [
            { key: 'all',       label: 'ALL' },
            { key: 'equipment', label: 'EQUIPMENT' },
            { key: 'consumable',label: 'POTIONS' },
            { key: 'material',  label: 'MATERIALS' },
            { key: 'key_item',  label: 'QUEST' }
        ];

        filters.forEach(f => {
            const btn = document.createElement('button');
            btn.textContent = f.label;
            btn.className = 'inv-filter-btn' + (f.key === 'all' ? ' inv-filter-active' : '');
            btn.addEventListener('click', () => this.setFilter(f.key));
            this._filterBtns[f.key] = btn;
            bar.appendChild(btn);
        });

        const sortBtn = document.createElement('button');
        sortBtn.textContent = 'SORT';
        sortBtn.className = 'inv-sort-btn';
        sortBtn.addEventListener('click', () => this.sortInventory());
        bar.appendChild(sortBtn);

        return bar;
    }

    createStatsSection() {
        const row = document.createElement('div');
        row.className = 'inv-stats-row';

        this.slotsDisplay = document.createElement('span');
        this.itemsDisplay = document.createElement('span');
        this.goldDisplay  = document.createElement('span');
        this.goldDisplay.className = 'inv-gold';

        row.appendChild(this.slotsDisplay);
        row.appendChild(this.itemsDisplay);
        row.appendChild(this.goldDisplay);

        return row;
    }

    _injectStyles() {
        if (document.getElementById('inv-bg-styles')) return;
        const s = document.createElement('style');
        s.id = 'inv-bg-styles';
        s.textContent = `
          /* ── Baldur's Gate style Inventory ── */
          .inv-overlay {
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.85);
            display: none; align-items: center; justify-content: center;
            z-index: 2400;
            font-family: 'Press Start 2P', 'Courier New', monospace;
          }
          .inv-modal {
            background: #090909;
            border: 1px solid #5C3D00;
            width: min(98vw, 880px); max-height: 92vh;
            display: flex; flex-direction: column;
            box-shadow: 0 0 40px rgba(92,61,0,0.3);
            color: #C8A84B;
          }
          /* Header */
          .inv-header {
            display: flex; align-items: center;
            padding: 8px 14px;
            border-bottom: 1px solid #2a1800;
            background: #100c00;
            flex-shrink: 0;
          }
          .inv-title { font-size: 9px; letter-spacing: 3px; color: #5C3D00; flex: 1; text-align: center; }
          .inv-close {
            background: none; border: 1px solid #2a1800; color: #5C3D00;
            width: 26px; height: 26px; cursor: pointer; font-size: 11px; flex-shrink: 0;
          }
          .inv-close:hover { border-color: #C8A84B; color: #C8A84B; }
          /* Filter bar */
          .inv-filter-bar {
            display: flex; gap: 4px; padding: 8px 14px;
            border-bottom: 1px solid #1a1200;
            background: #0d0900; flex-shrink: 0; flex-wrap: wrap;
          }
          .inv-filter-btn {
            background: none; border: 1px solid #2a1800; color: #5C3D00;
            padding: 5px 10px; cursor: pointer; font-family: inherit; font-size: 7px;
            transition: all 0.1s; letter-spacing: 1px;
          }
          .inv-filter-btn:hover { border-color: #8B6914; color: #C8A84B; }
          .inv-filter-active { border-color: #C8A84B !important; color: #FFD700 !important; background: #1a1000 !important; }
          .inv-sort-btn {
            background: none; border: 1px solid #1a3a1a; color: #2a7a2a;
            padding: 5px 12px; cursor: pointer; font-family: inherit; font-size: 7px;
            margin-left: auto; transition: all 0.1s;
          }
          .inv-sort-btn:hover { border-color: #4aCC4a; color: #4aCC4a; }
          /* Body */
          .inv-body {
            display: grid; grid-template-columns: 1fr 220px;
            flex: 1; overflow: hidden; min-height: 0;
          }
          .inv-left { display: flex; flex-direction: column; padding: 12px; border-right: 1px solid #1a1200; }
          /* Grid */
          .inventory-grid {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 3px; flex: 1;
          }
          .inventory-slot {
            background: #0d0a00;
            border: 1px solid #2a1800;
            aspect-ratio: 1;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            cursor: pointer; position: relative;
            transition: border-color 0.1s;
            min-height: 44px;
          }
          .inventory-slot:hover { border-color: #8B6914; background: #1a1200; }
          .inv-slot-selected { border-color: #FFD700 !important; background: #1a1400 !important; }
          /* Stats row */
          .inv-stats-row {
            display: flex; gap: 12px; padding: 6px 0;
            font-size: 7px; color: #5C3D00;
            border-top: 1px solid #1a1200; margin-top: 6px; flex-shrink: 0;
          }
          .inv-gold { color: #FFD700; margin-left: auto; }
          /* Detail panel */
          .inv-detail {
            padding: 14px 12px; overflow-y: auto;
            display: flex; flex-direction: column; gap: 8px;
          }
          .inv-detail-empty { font-size: 7px; color: #2a1800; text-align: center; margin: auto; line-height: 2; }
          .inv-detail-icon { font-size: 32px; text-align: center; }
          .inv-detail-name { font-size: 8px; font-weight: bold; text-align: center; line-height: 1.6; }
          .inv-detail-meta { font-size: 6px; color: #5C3D00; text-align: center; letter-spacing: 1px; }
          .inv-detail-desc { font-size: 7px; color: #8B6914; line-height: 1.7; padding: 6px 0; border-top: 1px solid #1a1200; }
          .inv-detail-stats { border-top: 1px solid #1a1200; padding-top: 6px; }
          .inv-detail-stat { display: flex; justify-content: space-between; font-size: 7px; color: #C8A84B; margin-bottom: 4px; }
          .inv-stat-pos { color: #4aCC4a; }
          .inv-detail-value { font-size: 7px; color: #5C3D00; border-top: 1px solid #1a1200; padding-top: 6px; }
          .inv-detail-actions { display: flex; gap: 6px; flex-wrap: wrap; border-top: 1px solid #1a1200; padding-top: 8px; margin-top: auto; }
          .inv-action-btn {
            background: none; border: 1px solid #5C3D00; color: #C8A84B;
            padding: 5px 10px; cursor: pointer; font-family: inherit; font-size: 7px;
            transition: all 0.1s;
          }
          .inv-action-btn:hover { border-color: #C8A84B; color: #FFD700; background: #1a1000; }
          .inv-action-drop { border-color: #3a0000; color: #883333; }
          .inv-action-drop:hover { border-color: #CC3333; color: #CC3333; }
          /* Tooltip (reused from old code but restyled) */
          .inventory-tooltip {
            position: fixed; background: #0a0800; border: 1px solid #5C3D00;
            padding: 10px; color: #C8A84B; font-family: inherit;
            font-size: 7px; z-index: 10000; pointer-events: none;
            display: none; max-width: 200px; line-height: 1.8;
          }
          /* Scrollbar */
          .inv-detail::-webkit-scrollbar { width: 4px; }
          .inv-detail::-webkit-scrollbar-track { background: #090909; }
          .inv-detail::-webkit-scrollbar-thumb { background: #2a1800; }
          @media (max-width: 600px) {
            .inv-body { grid-template-columns: 1fr; }
            .inventory-grid { grid-template-columns: repeat(5, 1fr); }
          }
        `;
        document.head.appendChild(s);
    }

    createSlots() {
        this.slotElements = [];
        for (let i = 0; i < 40; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.slotIndex = i;
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
        // Appended lazily in show() alongside the main container.
    }

    /** Returns an emoji icon based on item type/subtype. */
    _itemIcon(item) {
        const type    = (item?.type    ?? '').toLowerCase();
        const subtype = (item?.subtype ?? '').toLowerCase();
        const name    = (item?.name    ?? '').toLowerCase();

        if (type === 'weapon' || subtype === 'weapon') {
            if (name.includes('bow') || name.includes('arrow'))   return '🏹';
            if (name.includes('staff') || name.includes('wand'))  return '🪄';
            if (name.includes('dagger') || name.includes('knife')) return '🗡️';
            return '⚔️';
        }
        if (type === 'armor' || subtype === 'armor') {
            if (name.includes('helmet') || name.includes('helm')) return '⛑️';
            if (name.includes('boot'))                            return '🥾';
            if (name.includes('glove'))                           return '🧤';
            return '🛡️';
        }
        if (type === 'accessory' || subtype === 'accessory')  return '💍';
        if (type === 'potion' || name.includes('potion'))     return '🧪';
        if (type === 'scroll' || name.includes('scroll'))     return '📜';
        if (type === 'key'    || name.includes('key'))        return '🗝️';
        if (type === 'food'   || name.includes('bread') || name.includes('meat')) return '🍖';
        if (name.includes('crystal') || name.includes('gem') || name.includes('jewel')) return '💎';
        if (name.includes('gold') || name.includes('coin'))   return '🪙';
        if (name.includes('bone') || name.includes('skull'))  return '💀';
        if (type === 'consumable')                            return '⚗️';
        if (type === 'material' || type === 'crafting')       return '🔩';
        if (type === 'quest')                                 return '⭐';
        return '📦';
    }

    /** Returns rarity colour for both Item instances and plain objects. */
    _itemColor(item) {
        if (typeof item?.getColor === 'function') return item.getColor();
        const MAP = { common: '#FFFFFF', uncommon: '#00FF00', rare: '#0080FF', epic: '#8000FF' };
        return MAP[(item?.rarity ?? 'common').toLowerCase()] ?? '#FFFFFF';
    }

    /** Returns tooltip-shaped data for both Item instances and plain objects. */
    _itemTooltip(item) {
        if (typeof item?.getTooltip === 'function') return item.getTooltip();
        return {
            name:         item?.name        ?? 'Unknown Item',
            type:         item?.type        ?? 'item',
            rarity:       item?.rarity      ?? 'common',
            level:        item?.level       ?? 1,
            description:  item?.description ?? '',
            value:        item?.value       ?? 0,
            stats:        item?.stats       ?? {},
            requirements: item?.requirements ?? {},
            effects:      item?.effects     ?? []
        };
    }

    updateSlotDisplay(slotIndex) {
        const slot = this.slotElements[slotIndex];
        const slotData = this.inventorySystem.getSlot(slotIndex);

        // Clear slot
        slot.innerHTML = '';
        slot.style.background = '';
        slot.style.borderColor = '';

        if (slotData) {
            const item = slotData.item;
            const color = this._itemColor(item);

            // Set background color based on rarity
            slot.style.background = `${color}11`;
            slot.style.borderColor = color;

            // Item icon — emoji based on type/subtype
            const icon = document.createElement('div');
            icon.style.cssText = `
                width: 28px;
                height: 28px;
                background: ${color}33;
                border: 1px solid ${color}88;
                border-radius: 4px;
                margin-bottom: 2px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                line-height: 1;
            `;
            icon.textContent = this._itemIcon(item);
            
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

    setPartyManager(pm) {
        this.partyManager = pm;
    }

    updateStats() {
        const stats = this.inventorySystem.getStats();
        const gold = this.partyManager?.gold ?? 0;
        this.slotsDisplay.textContent = `Slots: ${stats.usedSlots}/${stats.totalSlots}`;
        this.itemsDisplay.textContent = `Items: ${stats.itemCount}`;
        this.goldDisplay.textContent = `Gold: ${gold}`;
    }

    setFilter(filterType) {
        this.currentFilter = filterType;
        // Update button states using the new class-based approach
        Object.entries(this._filterBtns ?? {}).forEach(([key, btn]) => {
            btn.classList.toggle('inv-filter-active', key === filterType);
        });
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
        if (!this.container.parentNode) {
            document.body.appendChild(this.container);
            if (this.tooltipElement && !this.tooltipElement.parentNode) {
                document.body.appendChild(this.tooltipElement);
            }
        }
        this.isVisible = true;
        this.container.style.display = 'flex';
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

        // Highlight selected slot
        this.slotElements.forEach(s => s.classList.remove('inv-slot-selected'));
        event.currentTarget.classList.add('inv-slot-selected');

        this._updateDetailPanel(slotData);
    }

    _updateDetailPanel(slotData) {
        if (!this.detailPanel) return;
        if (!slotData) {
            this.detailPanel.innerHTML = `<p class="inv-detail-empty">Select an item<br>to view details</p>`;
            return;
        }
        const item    = slotData.item;
        const tooltip = this._itemTooltip(item);
        const color   = this._itemColor(item);
        const icon    = this._itemIcon(item);
        const stats   = tooltip.stats ?? {};
        const statsHtml = Object.entries(stats)
            .map(([k, v]) => `<div class="inv-detail-stat"><span>${k.toUpperCase()}</span><span class="${v > 0 ? 'inv-stat-pos' : ''}">${v > 0 ? '+' : ''}${v}</span></div>`)
            .join('');
        const qty = slotData.quantity > 1 ? ` ×${slotData.quantity}` : '';

        this.detailPanel.innerHTML = `
          <div class="inv-detail-icon" style="color:${color}">${icon}</div>
          <div class="inv-detail-name" style="color:${color}">${tooltip.name}${qty}</div>
          <div class="inv-detail-meta">${tooltip.type.toUpperCase()} &nbsp;·&nbsp; ${(tooltip.rarity || 'COMMON').toUpperCase()}</div>
          ${tooltip.description ? `<div class="inv-detail-desc">${tooltip.description}</div>` : ''}
          ${statsHtml ? `<div class="inv-detail-stats">${statsHtml}</div>` : ''}
          <div class="inv-detail-value">💰 Value: ${tooltip.value ?? 0}</div>
          <div class="inv-detail-actions">
            ${item.type === 'consumable' || item.type === 'potion' ? '<button class="inv-action-btn" onclick="this.closest(\'.inv-overlay\').__invUI.useSelected()">USE</button>' : ''}
            ${item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory' ? '<button class="inv-action-btn">EQUIP</button>' : ''}
            <button class="inv-action-btn inv-action-drop">DROP</button>
          </div>
        `;
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
        const tooltip = this._itemTooltip(item);
        const color   = this._itemColor(item);

        let content = `<div style="color: ${color}; font-weight: bold; margin-bottom: 5px;">
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