/**
 * InventorySystem - Basic inventory management for performance testing
 * Provides simple item storage and management functionality
 */

export class InventorySystem {
  constructor(maxSlots = 40) {
    this.maxSlots = maxSlots;
    this.slots = new Array(maxSlots).fill(null);
    this.changeListeners = new Set();
    
    console.log(`InventorySystem initialized with ${maxSlots} slots`);
  }

  /**
   * Add item to inventory
   * @param {Object} item - Item to add
   * @param {number} quantity - Quantity to add
   * @returns {Object} Add result
   */
  addItem(item, quantity = 1) {
    if (!item) {
      return { success: false, error: 'Invalid item' };
    }

    // Handle stackable items
    if (item.stackable) {
      return this.addStackableItem(item, quantity);
    } else {
      return this.addUniqueItem(item, quantity);
    }
  }

  /**
   * Add stackable item
   * @param {Object} item - Stackable item
   * @param {number} quantity - Quantity to add
   * @returns {Object} Add result
   */
  addStackableItem(item, quantity) {
    const maxStack = item.maxStack || 99;
    let remainingQuantity = quantity;

    // First, try to add to existing stacks
    for (let i = 0; i < this.maxSlots && remainingQuantity > 0; i++) {
      const slot = this.slots[i];
      if (slot && slot.item.id === item.id) {
        const canAdd = Math.min(remainingQuantity, maxStack - slot.quantity);
        if (canAdd > 0) {
          slot.quantity += canAdd;
          remainingQuantity -= canAdd;
        }
      }
    }

    // Then, create new stacks for remaining quantity
    while (remainingQuantity > 0) {
      const emptySlot = this.findEmptySlot();
      if (emptySlot === -1) {
        return { 
          success: false, 
          error: 'Inventory full',
          addedQuantity: quantity - remainingQuantity
        };
      }

      const stackSize = Math.min(remainingQuantity, maxStack);
      this.slots[emptySlot] = {
        item: { ...item },
        quantity: stackSize
      };
      remainingQuantity -= stackSize;
    }

    this.notifyChange();
    return { success: true, addedQuantity: quantity };
  }

  /**
   * Add unique (non-stackable) item
   * @param {Object} item - Unique item
   * @param {number} quantity - Quantity to add
   * @returns {Object} Add result
   */
  addUniqueItem(item, quantity) {
    let addedCount = 0;

    for (let i = 0; i < quantity; i++) {
      const emptySlot = this.findEmptySlot();
      if (emptySlot === -1) {
        return {
          success: addedCount > 0,
          error: addedCount === 0 ? 'Inventory full' : 'Inventory full, partial add',
          addedQuantity: addedCount
        };
      }

      this.slots[emptySlot] = {
        item: { ...item, instanceId: this.generateInstanceId() },
        quantity: 1
      };
      addedCount++;
    }

    this.notifyChange();
    return { success: true, addedQuantity: addedCount };
  }

  /**
   * Remove item from inventory
   * @param {number} slotIndex - Slot index
   * @param {number} quantity - Quantity to remove
   * @returns {Object} Remove result
   */
  removeItem(slotIndex, quantity = 1) {
    if (slotIndex < 0 || slotIndex >= this.maxSlots) {
      return { success: false, error: 'Invalid slot index' };
    }

    const slot = this.slots[slotIndex];
    if (!slot) {
      return { success: false, error: 'Slot is empty' };
    }

    if (quantity >= slot.quantity) {
      // Remove entire stack
      const removedItem = slot.item;
      const removedQuantity = slot.quantity;
      this.slots[slotIndex] = null;
      
      this.notifyChange();
      return { 
        success: true, 
        removedItem, 
        removedQuantity 
      };
    } else {
      // Remove partial quantity
      slot.quantity -= quantity;
      
      this.notifyChange();
      return { 
        success: true, 
        removedItem: slot.item, 
        removedQuantity: quantity 
      };
    }
  }

  /**
   * Remove item by ID
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity to remove
   * @returns {Object} Remove result
   */
  removeItemById(itemId, quantity = 1) {
    let remainingToRemove = quantity;
    const removedItems = [];

    for (let i = 0; i < this.maxSlots && remainingToRemove > 0; i++) {
      const slot = this.slots[i];
      if (slot && slot.item.id === itemId) {
        const toRemove = Math.min(remainingToRemove, slot.quantity);
        const result = this.removeItem(i, toRemove);
        
        if (result.success) {
          removedItems.push({
            item: result.removedItem,
            quantity: result.removedQuantity
          });
          remainingToRemove -= result.removedQuantity;
        }
      }
    }

    return {
      success: remainingToRemove < quantity,
      removedItems,
      removedQuantity: quantity - remainingToRemove
    };
  }

  /**
   * Move item between slots
   * @param {number} fromSlot - Source slot
   * @param {number} toSlot - Destination slot
   * @returns {boolean} Success status
   */
  moveItem(fromSlot, toSlot) {
    if (fromSlot === toSlot) return true;
    
    if (fromSlot < 0 || fromSlot >= this.maxSlots || 
        toSlot < 0 || toSlot >= this.maxSlots) {
      return false;
    }

    const sourceSlot = this.slots[fromSlot];
    if (!sourceSlot) return false;

    const targetSlot = this.slots[toSlot];

    if (!targetSlot) {
      // Simple move to empty slot
      this.slots[toSlot] = sourceSlot;
      this.slots[fromSlot] = null;
    } else {
      // Swap items
      this.slots[fromSlot] = targetSlot;
      this.slots[toSlot] = sourceSlot;
    }

    this.notifyChange();
    return true;
  }

  /**
   * Get slot data
   * @param {number} slotIndex - Slot index
   * @returns {Object|null} Slot data
   */
  getSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.maxSlots) {
      return null;
    }
    return this.slots[slotIndex];
  }

  /**
   * Get all items in inventory
   * @returns {Array} Array of items
   */
  getAllItems() {
    const items = [];
    for (const slot of this.slots) {
      if (slot) {
        items.push({
          ...slot.item,
          quantity: slot.quantity
        });
      }
    }
    return items;
  }

  /**
   * Get items by type
   * @param {string} type - Item type
   * @returns {Array} Items of specified type
   */
  getItemsByType(type) {
    const items = [];
    for (const slot of this.slots) {
      if (slot && slot.item.type === type) {
        items.push({
          ...slot.item,
          quantity: slot.quantity
        });
      }
    }
    return items;
  }

  /**
   * Find empty slot
   * @returns {number} Empty slot index or -1 if none
   */
  findEmptySlot() {
    for (let i = 0; i < this.maxSlots; i++) {
      if (!this.slots[i]) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Check if inventory has space
   * @param {number} slotsNeeded - Number of slots needed
   * @returns {boolean} True if has space
   */
  hasSpace(slotsNeeded = 1) {
    let emptySlots = 0;
    for (const slot of this.slots) {
      if (!slot) emptySlots++;
    }
    return emptySlots >= slotsNeeded;
  }

  /**
   * Sort inventory by type and rarity
   */
  sortInventory() {
    const items = [];
    
    // Collect all items
    for (let i = 0; i < this.maxSlots; i++) {
      if (this.slots[i]) {
        items.push({ ...this.slots[i], originalIndex: i });
        this.slots[i] = null;
      }
    }

    // Sort items
    items.sort((a, b) => {
      // First by type
      if (a.item.type !== b.item.type) {
        return a.item.type.localeCompare(b.item.type);
      }
      
      // Then by rarity
      const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3 };
      const rarityA = rarityOrder[a.item.rarity] || 0;
      const rarityB = rarityOrder[b.item.rarity] || 0;
      
      if (rarityA !== rarityB) {
        return rarityB - rarityA; // Higher rarity first
      }
      
      // Finally by name
      return a.item.name.localeCompare(b.item.name);
    });

    // Place sorted items back
    for (let i = 0; i < items.length; i++) {
      this.slots[i] = {
        item: items[i].item,
        quantity: items[i].quantity
      };
    }

    this.notifyChange();
  }

  /**
   * Get inventory statistics
   * @returns {Object} Inventory stats
   */
  getStats() {
    let usedSlots = 0;
    let itemCount = 0;
    const typeCount = {};

    for (const slot of this.slots) {
      if (slot) {
        usedSlots++;
        itemCount += slot.quantity;
        
        const type = slot.item.type;
        typeCount[type] = (typeCount[type] || 0) + slot.quantity;
      }
    }

    return {
      totalSlots: this.maxSlots,
      usedSlots,
      emptySlots: this.maxSlots - usedSlots,
      itemCount,
      typeCount
    };
  }

  /**
   * Add change listener
   * @param {Function} listener - Change listener function
   */
  addChangeListener(listener) {
    this.changeListeners.add(listener);
  }

  /**
   * Remove change listener
   * @param {Function} listener - Change listener function
   */
  removeChangeListener(listener) {
    this.changeListeners.delete(listener);
  }

  /**
   * Notify change listeners
   */
  notifyChange() {
    for (const listener of this.changeListeners) {
      try {
        listener();
      } catch (error) {
        console.error('Error in inventory change listener:', error);
      }
    }
  }

  /**
   * Generate unique instance ID
   * @returns {string} Instance ID
   */
  generateInstanceId() {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear inventory
   */
  clear() {
    this.slots.fill(null);
    this.notifyChange();
  }

  /**
   * Get inventory data for serialization
   * @returns {Object} Serializable inventory data
   */
  serialize() {
    return {
      maxSlots: this.maxSlots,
      slots: this.slots.map(slot => slot ? {
        item: slot.item,
        quantity: slot.quantity
      } : null)
    };
  }

  /**
   * Load inventory from serialized data
   * @param {Object} data - Serialized inventory data
   */
  deserialize(data) {
    if (data.maxSlots) {
      this.maxSlots = data.maxSlots;
      this.slots = new Array(this.maxSlots).fill(null);
    }

    if (data.slots) {
      for (let i = 0; i < Math.min(data.slots.length, this.maxSlots); i++) {
        this.slots[i] = data.slots[i];
      }
    }

    this.notifyChange();
  }
}