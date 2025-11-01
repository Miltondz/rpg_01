/**
 * Shop UI - User interface for buying and selling items
 * Provides tabbed interface with item browsing and transaction handling
 */

import { shopSystem } from '../shop/ShopSystem.js';
import { ItemTypes, ItemRarity } from '../inventory/Item.js';

export class ShopUI {
    constructor(inventorySystem, partyManager) {
        this.inventorySystem = inventorySystem;
        this.partyManager = partyManager;
        this.isVisible = false;
        this.currentTab = 'buy'; // 'buy' or 'sell'
        this.selectedCategory = 'all';
        
        this.container = null;
        this.buyTab = null;
        this.sellTab = null;
        this.goldDisplay = null;
        
        this._createUI();
        console.log('ShopUI initialized');
    }

    /**
     * Show the shop interface
     * @param {number} partyLevel - Current party level for shop refresh
     */
    show(partyLevel) {
        if (!this.container) {
            this._createUI();
        }

        // Refresh shop inventory based on party level
        shopSystem.refreshShop(partyLevel);
        
        this.isVisible = true;
        this.container.style.display = 'flex';
        
        // Update displays
        this._updateGoldDisplay();
        this._refreshCurrentTab();
        
        console.log('Shop UI opened');
    }

    /**
     * Hide the shop interface
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
        this.isVisible = false;
        console.log('Shop UI closed');
    }

    /**
     * Toggle shop visibility
     * @param {number} partyLevel - Current party level
     */
    toggle(partyLevel) {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show(partyLevel);
        }
    }

    /**
     * Switch between buy and sell tabs
     * @param {string} tab - 'buy' or 'sell'
     */
    switchTab(tab) {
        if (tab === this.currentTab) return;
        
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.shop-tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Show/hide tab content
        this.buyTab.style.display = tab === 'buy' ? 'block' : 'none';
        this.sellTab.style.display = tab === 'sell' ? 'block' : 'none';
        
        this._refreshCurrentTab();
    }

    /**
     * Filter items by category
     * @param {string} category - Item category to filter by
     */
    filterByCategory(category) {
        this.selectedCategory = category;
        
        // Update button styles
        document.querySelectorAll('.category-filter-btn').forEach(btn => {
            const btnCategory = btn.getAttribute('data-category');
            if (btnCategory === category) {
                btn.style.background = '#8b4513';
                btn.style.color = '#ffd700';
            } else {
                btn.style.background = '#654321';
                btn.style.color = '#cccccc';
            }
        });
        
        this._refreshCurrentTab();
    }

    // Private methods

    _createUI() {
        // Main container
        this.container = document.createElement('div');
        this.container.className = 'shop-ui';
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 800px;
            height: 600px;
            background: linear-gradient(135deg, #2c1810, #1a0f08);
            border: 3px solid #8b4513;
            border-radius: 10px;
            display: none;
            flex-direction: column;
            z-index: 1000;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
        `;

        // Header
        const header = document.createElement('div');
        header.className = 'shop-header';
        header.style.cssText = `
            padding: 15px 20px;
            background: linear-gradient(90deg, #8b4513, #a0522d);
            border-bottom: 2px solid #654321;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Merchant Shop';
        title.style.cssText = `
            color: #ffd700;
            margin: 0;
            font-size: 24px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        `;

        this.goldDisplay = document.createElement('div');
        this.goldDisplay.className = 'gold-display';
        this.goldDisplay.style.cssText = `
            color: #ffd700;
            font-size: 18px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        `;

        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            background: #8b0000;
            color: white;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            font-weight: bold;
        `;
        closeButton.onclick = () => this.hide();

        header.appendChild(title);
        header.appendChild(this.goldDisplay);
        header.appendChild(closeButton);

        // Tab buttons
        const tabContainer = document.createElement('div');
        tabContainer.className = 'shop-tabs';
        tabContainer.style.cssText = `
            display: flex;
            background: #3c2415;
            border-bottom: 2px solid #654321;
        `;

        const buyTabButton = this._createTabButton('Buy', 'buy', true);
        const sellTabButton = this._createTabButton('Sell', 'sell', false);

        tabContainer.appendChild(buyTabButton);
        tabContainer.appendChild(sellTabButton);

        // Content area
        const content = document.createElement('div');
        content.className = 'shop-content';
        content.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        // Buy tab content
        this.buyTab = this._createBuyTab();
        
        // Sell tab content
        this.sellTab = this._createSellTab();

        content.appendChild(this.buyTab);
        content.appendChild(this.sellTab);

        // Assemble UI
        this.container.appendChild(header);
        this.container.appendChild(tabContainer);
        this.container.appendChild(content);

        document.body.appendChild(this.container);
    }

    _createTabButton(text, tabName, active) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'shop-tab-button';
        button.setAttribute('data-tab', tabName);
        button.style.cssText = `
            flex: 1;
            padding: 12px;
            background: ${active ? '#654321' : '#3c2415'};
            color: ${active ? '#ffd700' : '#cccccc'};
            border: none;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: all 0.3s ease;
        `;

        if (active) {
            button.classList.add('active');
        }

        button.onclick = () => this.switchTab(tabName);
        
        return button;
    }

    _createBuyTab() {
        const tab = document.createElement('div');
        tab.className = 'buy-tab';
        tab.style.cssText = `
            display: block;
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        `;

        // Category filters
        const filterContainer = document.createElement('div');
        filterContainer.className = 'category-filters';
        filterContainer.style.cssText = `
            margin-bottom: 15px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            padding: 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
        `;

        const categories = [
            { key: 'all', label: 'All Items' },
            { key: ItemTypes.WEAPON, label: 'Weapons' },
            { key: ItemTypes.ARMOR, label: 'Armor' },
            { key: ItemTypes.ACCESSORY, label: 'Accessories' },
            { key: ItemTypes.CONSUMABLE, label: 'Consumables' },
            { key: ItemTypes.MATERIAL, label: 'Materials' }
        ];

        categories.forEach(category => {
            const button = document.createElement('button');
            button.textContent = category.label;
            button.className = 'category-filter-btn';
            button.setAttribute('data-category', category.key);
            button.style.cssText = `
                padding: 8px 12px;
                background: ${category.key === 'all' ? '#8b4513' : '#654321'};
                color: ${category.key === 'all' ? '#ffd700' : '#cccccc'};
                border: 1px solid #8b4513;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s ease;
            `;
            
            button.onmouseover = () => {
                if (category.key !== this.selectedCategory) {
                    button.style.background = '#8b4513';
                    button.style.color = '#ffd700';
                }
            };
            
            button.onmouseout = () => {
                if (category.key !== this.selectedCategory) {
                    button.style.background = '#654321';
                    button.style.color = '#cccccc';
                }
            };
            
            button.onclick = () => this.filterByCategory(category.key);
            filterContainer.appendChild(button);
        });

        // Items grid
        const itemsGrid = document.createElement('div');
        itemsGrid.className = 'shop-items-grid';
        itemsGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            max-height: 400px;
            overflow-y: auto;
        `;

        tab.appendChild(filterContainer);
        tab.appendChild(itemsGrid);

        return tab;
    }

    _createSellTab() {
        const tab = document.createElement('div');
        tab.className = 'sell-tab';
        tab.style.cssText = `
            display: none;
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        `;

        // Inventory items grid
        const itemsGrid = document.createElement('div');
        itemsGrid.className = 'sell-items-grid';
        itemsGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            max-height: 500px;
            overflow-y: auto;
        `;

        tab.appendChild(itemsGrid);

        return tab;
    }

    _refreshCurrentTab() {
        if (this.currentTab === 'buy') {
            this._refreshBuyTab();
        } else {
            this._refreshSellTab();
        }
    }

    _refreshBuyTab() {
        const grid = this.buyTab.querySelector('.shop-items-grid');
        grid.innerHTML = '';

        const shopItems = shopSystem.getShopInventory();
        const filteredItems = this.selectedCategory === 'all' 
            ? shopItems 
            : shopItems.filter(item => item.type === this.selectedCategory);

        filteredItems.forEach(shopItem => {
            const itemElement = this._createShopItemElement(shopItem, 'buy');
            grid.appendChild(itemElement);
        });
    }

    _refreshSellTab() {
        const grid = this.sellTab.querySelector('.sell-items-grid');
        grid.innerHTML = '';

        // Get sellable items from inventory
        const inventoryItems = this.inventorySystem.getAllItems();
        const sellableItems = inventoryItems.filter(item => 
            item.type !== ItemTypes.KEY_ITEM
        );

        sellableItems.forEach(item => {
            const itemElement = this._createInventoryItemElement(item, 'sell');
            grid.appendChild(itemElement);
        });
    }

    _createShopItemElement(shopItem, mode) {
        const element = document.createElement('div');
        element.className = 'shop-item';
        element.style.cssText = `
            background: linear-gradient(135deg, #2a1f1a, #1f1611);
            border: 2px solid ${this._getRarityColor(shopItem.rarity)};
            border-radius: 8px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
        `;

        // Add hover effect
        element.onmouseover = () => {
            element.style.transform = 'translateY(-2px)';
            element.style.boxShadow = `0 4px 12px ${this._getRarityColor(shopItem.rarity)}40`;
        };
        
        element.onmouseout = () => {
            element.style.transform = 'translateY(0)';
            element.style.boxShadow = 'none';
        };

        // Stock indicator
        const stockIndicator = shopItem.stock <= 3 ? 
            `<span style="color: #ff6666; font-weight: bold;">Low Stock!</span>` : 
            `<span style="color: #cccccc;">Stock: ${shopItem.stock}</span>`;

        element.innerHTML = `
            <div class="item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="item-name" style="color: ${this._getRarityColor(shopItem.rarity)}; font-weight: bold; font-size: 14px;">${shopItem.name}</span>
                <span class="item-level" style="color: #cccccc; font-size: 12px;">Lv.${shopItem.level}</span>
            </div>
            <div class="item-type" style="color: #999999; font-size: 11px; margin-bottom: 8px;">${this._formatItemType(shopItem.type)}</div>
            <div class="item-description" style="color: #aaaaaa; font-size: 10px; margin-bottom: 8px; font-style: italic;">
                ${shopItem.description || 'No description available'}
            </div>
            <div class="item-stats" style="margin-bottom: 10px;">
                ${this._formatItemStats(shopItem.stats)}
            </div>
            <div class="item-footer" style="display: flex; justify-content: space-between; align-items: center;">
                <span class="item-price" style="color: #ffd700; font-weight: bold; font-size: 16px;">${shopItem.price}g</span>
                <span class="item-stock" style="font-size: 12px;">${stockIndicator}</span>
            </div>
        `;

        element.onclick = () => this._handleItemClick(shopItem, mode);

        return element;
    }

    _createInventoryItemElement(item, mode) {
        const element = document.createElement('div');
        element.className = 'inventory-item';
        element.style.cssText = `
            background: linear-gradient(135deg, #2a1f1a, #1f1611);
            border: 2px solid ${item.getColor()};
            border-radius: 8px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
        `;

        // Add hover effect
        element.onmouseover = () => {
            element.style.transform = 'translateY(-2px)';
            element.style.boxShadow = `0 4px 12px ${item.getColor()}40`;
        };
        
        element.onmouseout = () => {
            element.style.transform = 'translateY(0)';
            element.style.boxShadow = 'none';
        };

        const sellPrice = shopSystem.getSellPrice(item);
        const buyPrice = shopSystem.getBuyPrice(item);

        // Show value comparison
        const valueComparison = sellPrice < buyPrice ? 
            `<span style="color: #ff9999; font-size: 10px;">(${Math.floor((sellPrice/buyPrice)*100)}% of buy price)</span>` : '';

        element.innerHTML = `
            <div class="item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="item-name" style="color: ${item.getColor()}; font-weight: bold; font-size: 14px;">${item.name}</span>
                <span class="item-level" style="color: #cccccc; font-size: 12px;">Lv.${item.level}</span>
            </div>
            <div class="item-type" style="color: #999999; font-size: 11px; margin-bottom: 8px;">${this._formatItemType(item.type)}</div>
            <div class="item-description" style="color: #aaaaaa; font-size: 10px; margin-bottom: 8px; font-style: italic;">
                ${item.description || 'No description available'}
            </div>
            <div class="item-stats" style="margin-bottom: 10px;">
                ${this._formatItemStats(item.getFinalStats())}
            </div>
            <div class="item-footer">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span class="sell-price" style="color: #ffd700; font-weight: bold; font-size: 16px;">Sell: ${sellPrice}g</span>
                    ${valueComparison}
                </div>
            </div>
        `;

        element.onclick = () => this._handleItemClick(item, mode);

        return element;
    }

    _handleItemClick(item, mode) {
        if (mode === 'buy') {
            this._buyItem(item);
        } else {
            this._sellItem(item);
        }
    }

    _buyItem(shopItem) {
        const playerGold = this.partyManager.getGold();
        const result = shopSystem.buyItem(
            shopItem.id, 
            1, 
            this.inventorySystem, 
            playerGold
        );

        if (result.success) {
            // Add item to inventory
            result.items.forEach(item => {
                this.inventorySystem.addItem(item);
            });
            
            // Deduct gold
            this.partyManager.spendGold(result.cost);
            
            // Update displays
            this._updateGoldDisplay();
            this._refreshBuyTab();
            
            this._showMessage(`Purchased ${shopItem.name} for ${result.cost}g`, 'success');
        } else {
            this._showMessage(result.message, 'error');
        }
    }

    _sellItem(item) {
        const result = shopSystem.sellItem(item, 1, this.inventorySystem);
        
        if (result.success) {
            // Remove item from inventory
            this.inventorySystem.removeItemById(item.id, 1);
            
            // Add gold
            this.partyManager.addGold(result.value);
            
            // Update displays
            this._updateGoldDisplay();
            this._refreshSellTab();
            
            this._showMessage(`Sold ${item.name} for ${result.value}g`, 'success');
        } else {
            this._showMessage(result.message, 'error');
        }
    }

    _updateGoldDisplay() {
        if (this.goldDisplay) {
            const gold = this.partyManager.getGold();
            this.goldDisplay.textContent = `Gold: ${gold}`;
        }
    }

    _getRarityColor(rarity) {
        const colors = {
            'common': '#FFFFFF',
            'uncommon': '#00FF00',
            'rare': '#0080FF',
            'epic': '#8000FF'
        };
        return colors[rarity] || colors.common;
    }

    _formatItemType(type) {
        const typeNames = {
            [ItemTypes.WEAPON]: 'Weapon',
            [ItemTypes.ARMOR]: 'Armor',
            [ItemTypes.ACCESSORY]: 'Accessory',
            [ItemTypes.CONSUMABLE]: 'Consumable',
            [ItemTypes.MATERIAL]: 'Material',
            [ItemTypes.KEY_ITEM]: 'Key Item'
        };
        return typeNames[type] || 'Unknown';
    }

    _formatItemStats(stats) {
        if (!stats || Object.keys(stats).length === 0) {
            return '<span style="color: #666; font-size: 11px;">No stat bonuses</span>';
        }

        const statStrings = Object.entries(stats).map(([stat, value]) => {
            const color = value > 0 ? '#00ff00' : '#ff6666';
            const prefix = value > 0 ? '+' : '';
            return `<span style="color: ${color}; font-size: 11px;">${stat}: ${prefix}${value}</span>`;
        });

        return statStrings.join('<br>');
    }

    _showMessage(message, type) {
        // Create temporary message element
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#2d5a2d' : '#5a2d2d'};
            color: white;
            border-radius: 5px;
            z-index: 2000;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        `;
        messageEl.textContent = message;

        document.body.appendChild(messageEl);

        // Remove after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }
}