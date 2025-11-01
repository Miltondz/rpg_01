/**
 * Inventory System Module Exports
 * Provides access to all inventory-related classes and utilities
 */

export { InventorySystem } from './InventorySystem.js';
export { Item, ItemTypes, ItemRarity, ItemFactory } from './Item.js';
export { InventoryUI } from '../ui/InventoryUI.js';

// Re-export for convenience
export const Inventory = {
    System: InventorySystem,
    Item: Item,
    Types: ItemTypes,
    Rarity: ItemRarity,
    Factory: ItemFactory,
    UI: InventoryUI
};