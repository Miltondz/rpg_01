/**
 * SafeZoneSystem - Manages safe zones for healing, saving, and shopping
 * Handles altars, camps, towns, and rest mechanics
 */

export class SafeZoneSystem {
  constructor(saveSystem, shopSystem, partyManager) {
    this.saveSystem = saveSystem;
    this.shopSystem = shopSystem;
    this.partyManager = partyManager;
    
    // Safe zone definitions
    this.safeZones = new Map();
    this.safeZoneTypes = {
      ALTAR: 'altar',
      CAMP: 'camp', 
      TOWN: 'town',
      SHRINE: 'shrine'
    };
    
    // Rest mechanics
    this.restCosts = {
      altar: 0,      // Free healing at altars
      camp: 10,      // Small gold cost for camps
      town: 25,      // Higher cost but full services
      shrine: 5      // Minimal cost, partial healing
    };
    
    // Current safe zone state
    this.currentSafeZone = null;
    this.isInSafeZone = false;
    
    this.initializeDefaultSafeZones();
    
    console.log('SafeZoneSystem initialized');
  }

  /**
   * Initialize default safe zone configurations
   */
  initializeDefaultSafeZones() {
    // Define safe zone templates
    this.safeZoneTemplates = {
      altar: {
        name: 'Ancient Altar',
        type: this.safeZoneTypes.ALTAR,
        services: ['heal', 'save'],
        healingAmount: 1.0, // Full healing
        apRestoration: 1.0, // Full AP restoration
        shopInventory: null,
        description: 'A mystical altar radiating healing energy. You feel safe here.',
        restMessage: 'The altar\'s divine energy fully restores your party.'
      },
      
      camp: {
        name: 'Adventurer\'s Camp',
        type: this.safeZoneTypes.CAMP,
        services: ['heal', 'save', 'basic_shop'],
        healingAmount: 0.75, // 75% healing
        apRestoration: 1.0,  // Full AP restoration
        shopInventory: 'basic',
        description: 'A small camp with supplies and a place to rest.',
        restMessage: 'You rest at the camp and tend to your wounds.'
      },
      
      town: {
        name: 'Underground Town',
        type: this.safeZoneTypes.TOWN,
        services: ['heal', 'save', 'shop', 'inn'],
        healingAmount: 1.0, // Full healing
        apRestoration: 1.0, // Full AP restoration
        shopInventory: 'full',
        description: 'A bustling underground settlement with all amenities.',
        restMessage: 'You rest comfortably at the inn and feel fully refreshed.'
      },
      
      shrine: {
        name: 'Healing Shrine',
        type: this.safeZoneTypes.SHRINE,
        services: ['heal'],
        healingAmount: 0.5, // 50% healing
        apRestoration: 0.5, // 50% AP restoration
        shopInventory: null,
        description: 'A small shrine with limited healing power.',
        restMessage: 'The shrine provides some relief from your injuries.'
      }
    };
    
    console.log('Safe zone templates initialized');
  }

  /**
   * Register a safe zone at a specific position
   * @param {number} x - Grid X position
   * @param {number} z - Grid Z position
   * @param {string} templateType - Type of safe zone template
   * @param {Object} customConfig - Custom configuration overrides
   */
  registerSafeZone(x, z, templateType, customConfig = {}) {
    const template = this.safeZoneTemplates[templateType];
    if (!template) {
      console.error('Unknown safe zone template:', templateType);
      return false;
    }

    const positionKey = `${x},${z}`;
    const safeZone = {
      ...template,
      ...customConfig,
      position: { x, z },
      id: `${templateType}_${x}_${z}`,
      discovered: false,
      lastUsed: null
    };

    this.safeZones.set(positionKey, safeZone);
    
    console.log(`Registered ${templateType} safe zone at (${x}, ${z})`);
    return true;
  }

  /**
   * Check if player is entering a safe zone
   * @param {Object} position - Player position {x, z}
   * @returns {Object|null} Safe zone data or null
   */
  checkSafeZoneEntry(position) {
    const positionKey = `${position.x},${position.z}`;
    const safeZone = this.safeZones.get(positionKey);
    
    if (safeZone) {
      // Mark as discovered
      if (!safeZone.discovered) {
        safeZone.discovered = true;
        this.emitSafeZoneEvent('safeZoneDiscovered', safeZone);
      }
      
      // Set current safe zone
      this.currentSafeZone = safeZone;
      this.isInSafeZone = true;
      
      this.emitSafeZoneEvent('safeZoneEntered', safeZone);
      
      return safeZone;
    }
    
    // Check if leaving safe zone
    if (this.isInSafeZone) {
      this.leaveSafeZone();
    }
    
    return null;
  }

  /**
   * Leave current safe zone
   */
  leaveSafeZone() {
    if (this.currentSafeZone) {
      this.emitSafeZoneEvent('safeZoneLeft', this.currentSafeZone);
      this.currentSafeZone = null;
    }
    
    this.isInSafeZone = false;
  }

  /**
   * Use rest services at current safe zone
   * @param {string} serviceType - Type of service ('heal', 'save', 'shop')
   * @returns {Promise<Object>} Service result
   */
  async useService(serviceType) {
    if (!this.isInSafeZone || !this.currentSafeZone) {
      return {
        success: false,
        error: 'Not in a safe zone'
      };
    }

    const safeZone = this.currentSafeZone;
    
    // Check if service is available
    if (!safeZone.services.includes(serviceType)) {
      return {
        success: false,
        error: `${serviceType} service not available at this location`
      };
    }

    switch (serviceType) {
      case 'heal':
        return await this.performHealing(safeZone);
      
      case 'save':
        return await this.performSave(safeZone);
      
      case 'shop':
      case 'basic_shop':
        return await this.openShop(safeZone);
      
      case 'inn':
        return await this.useInn(safeZone);
      
      default:
        return {
          success: false,
          error: `Unknown service: ${serviceType}`
        };
    }
  }

  /**
   * Perform healing at safe zone
   * @param {Object} safeZone - Safe zone configuration
   * @returns {Promise<Object>} Healing result
   */
  async performHealing(safeZone) {
    const cost = this.restCosts[safeZone.type] || 0;
    const party = this.partyManager;
    
    // Check if party can afford healing
    if (cost > 0 && party.getGold() < cost) {
      return {
        success: false,
        error: `Insufficient gold. Healing costs ${cost} gold.`
      };
    }

    // Calculate healing amounts
    const healingResults = [];
    const aliveMembers = party.getAliveMembers();
    
    for (const member of aliveMembers) {
      const maxHP = member.stats.HP.max;
      const currentHP = member.stats.HP.current;
      const healAmount = Math.floor((maxHP - currentHP) * safeZone.healingAmount);
      
      if (healAmount > 0) {
        member.heal(healAmount);
        healingResults.push({
          character: member.name,
          healAmount: healAmount,
          newHP: member.stats.HP.current
        });
      }

      // Restore AP
      const apRestoreAmount = Math.floor(member.maxAP * safeZone.apRestoration);
      if (member.currentAP < member.maxAP) {
        member.currentAP = Math.min(member.maxAP, member.currentAP + apRestoreAmount);
      }
    }

    // Deduct cost
    if (cost > 0) {
      party.spendGold(cost);
    }

    // Update last used timestamp
    safeZone.lastUsed = Date.now();

    // Emit healing event
    this.emitSafeZoneEvent('healingPerformed', {
      safeZone: safeZone,
      cost: cost,
      results: healingResults
    });

    return {
      success: true,
      message: safeZone.restMessage,
      cost: cost,
      healingResults: healingResults
    };
  }

  /**
   * Perform save at safe zone
   * @param {Object} safeZone - Safe zone configuration
   * @returns {Promise<Object>} Save result
   */
  async performSave(safeZone) {
    try {
      // Create save data with safe zone information
      const saveData = {
        safeZone: {
          id: safeZone.id,
          name: safeZone.name,
          position: safeZone.position
        },
        timestamp: Date.now()
      };

      // Perform save operation
      const saveResult = await this.saveSystem.saveGame(1, saveData); // Use slot 1 for safe zone saves
      
      if (saveResult.success) {
        safeZone.lastUsed = Date.now();
        
        this.emitSafeZoneEvent('savePerformed', {
          safeZone: safeZone,
          saveSlot: 1
        });
        
        return {
          success: true,
          message: 'Game saved successfully at ' + safeZone.name
        };
      } else {
        return {
          success: false,
          error: 'Failed to save game: ' + saveResult.error
        };
      }
    } catch (error) {
      console.error('Save error at safe zone:', error);
      return {
        success: false,
        error: 'Save operation failed'
      };
    }
  }

  /**
   * Open shop at safe zone
   * @param {Object} safeZone - Safe zone configuration
   * @returns {Promise<Object>} Shop result
   */
  async openShop(safeZone) {
    if (!safeZone.shopInventory) {
      return {
        success: false,
        error: 'No shop available at this location'
      };
    }

    try {
      // Initialize shop with appropriate inventory
      const shopConfig = this.getShopConfig(safeZone);
      const shopResult = await this.shopSystem.openShop(shopConfig);
      
      if (shopResult.success) {
        this.emitSafeZoneEvent('shopOpened', {
          safeZone: safeZone,
          shopConfig: shopConfig
        });
      }
      
      return shopResult;
    } catch (error) {
      console.error('Shop error at safe zone:', error);
      return {
        success: false,
        error: 'Failed to open shop'
      };
    }
  }

  /**
   * Use inn services (full rest with cost)
   * @param {Object} safeZone - Safe zone configuration
   * @returns {Promise<Object>} Inn result
   */
  async useInn(safeZone) {
    const innCost = this.restCosts[safeZone.type] * 2; // Inn costs more than basic rest
    const party = this.partyManager;
    
    if (party.getGold() < innCost) {
      return {
        success: false,
        error: `Insufficient gold. Inn costs ${innCost} gold.`
      };
    }

    // Full healing and restoration
    const aliveMembers = party.getAliveMembers();
    const healingResults = [];
    
    for (const member of aliveMembers) {
      // Full heal
      const maxHP = member.stats.HP.max;
      const healAmount = maxHP - member.stats.HP.current;
      
      if (healAmount > 0) {
        member.heal(healAmount);
        healingResults.push({
          character: member.name,
          healAmount: healAmount,
          newHP: member.stats.HP.current
        });
      }

      // Full AP restoration
      member.currentAP = member.maxAP;
      
      // Remove negative status effects (if implemented)
      if (member.clearNegativeEffects) {
        member.clearNegativeEffects();
      }
    }

    // Deduct cost
    party.spendGold(innCost);
    
    // Update last used timestamp
    safeZone.lastUsed = Date.now();

    this.emitSafeZoneEvent('innUsed', {
      safeZone: safeZone,
      cost: innCost,
      results: healingResults
    });

    return {
      success: true,
      message: 'You rest at the inn and feel completely refreshed.',
      cost: innCost,
      healingResults: healingResults
    };
  }

  /**
   * Get shop configuration for safe zone
   * @param {Object} safeZone - Safe zone configuration
   * @returns {Object} Shop configuration
   */
  getShopConfig(safeZone) {
    const baseConfig = {
      name: `${safeZone.name} Shop`,
      location: safeZone.name,
      buyPriceMultiplier: 1.0,
      sellPriceMultiplier: 0.5
    };

    switch (safeZone.shopInventory) {
      case 'basic':
        return {
          ...baseConfig,
          inventory: [
            'health_potion_small',
            'health_potion_medium', 
            'ap_potion',
            'basic_sword',
            'basic_armor'
          ],
          maxItems: 8
        };
      
      case 'full':
        return {
          ...baseConfig,
          inventory: [
            'health_potion_small',
            'health_potion_medium',
            'health_potion_large',
            'ap_potion',
            'strength_potion',
            'defense_potion',
            'speed_potion',
            'iron_sword',
            'steel_sword',
            'leather_armor',
            'chain_armor',
            'magic_ring',
            'protection_amulet'
          ],
          maxItems: 15
        };
      
      default:
        return {
          ...baseConfig,
          inventory: [],
          maxItems: 0
        };
    }
  }

  /**
   * Get available services at current safe zone
   * @returns {Array} Array of available service names
   */
  getAvailableServices() {
    if (!this.isInSafeZone || !this.currentSafeZone) {
      return [];
    }
    
    return [...this.currentSafeZone.services];
  }

  /**
   * Get service cost
   * @param {string} serviceType - Type of service
   * @returns {number} Cost in gold
   */
  getServiceCost(serviceType) {
    if (!this.isInSafeZone || !this.currentSafeZone) {
      return 0;
    }

    const safeZone = this.currentSafeZone;
    
    switch (serviceType) {
      case 'heal':
        return this.restCosts[safeZone.type] || 0;
      
      case 'inn':
        return (this.restCosts[safeZone.type] || 0) * 2;
      
      case 'save':
        return 0; // Saving is always free
      
      case 'shop':
      case 'basic_shop':
        return 0; // Shop access is free, items have individual costs
      
      default:
        return 0;
    }
  }

  /**
   * Get current safe zone information
   * @returns {Object|null} Current safe zone data or null
   */
  getCurrentSafeZone() {
    return this.currentSafeZone ? {
      ...this.currentSafeZone,
      availableServices: this.getAvailableServices(),
      serviceCosts: this.currentSafeZone.services.reduce((costs, service) => {
        costs[service] = this.getServiceCost(service);
        return costs;
      }, {})
    } : null;
  }

  /**
   * Get all discovered safe zones
   * @returns {Array} Array of discovered safe zones
   */
  getDiscoveredSafeZones() {
    const discovered = [];
    
    for (const safeZone of this.safeZones.values()) {
      if (safeZone.discovered) {
        discovered.push({
          id: safeZone.id,
          name: safeZone.name,
          type: safeZone.type,
          position: safeZone.position,
          services: safeZone.services,
          lastUsed: safeZone.lastUsed
        });
      }
    }
    
    return discovered;
  }

  /**
   * Check if position is a safe zone
   * @param {Object} position - Position to check {x, z}
   * @returns {boolean} True if position is a safe zone
   */
  isSafeZone(position) {
    const positionKey = `${position.x},${position.z}`;
    return this.safeZones.has(positionKey);
  }

  /**
   * Get safe zone at position
   * @param {Object} position - Position to check {x, z}
   * @returns {Object|null} Safe zone data or null
   */
  getSafeZoneAt(position) {
    const positionKey = `${position.x},${position.z}`;
    return this.safeZones.get(positionKey) || null;
  }

  /**
   * Emit safe zone event
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  emitSafeZoneEvent(eventType, data) {
    const event = new CustomEvent('safeZoneEvent', {
      detail: {
        type: eventType,
        data: data,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Reset safe zone system
   */
  reset() {
    this.currentSafeZone = null;
    this.isInSafeZone = false;
    
    // Reset discovery status for all safe zones
    for (const safeZone of this.safeZones.values()) {
      safeZone.discovered = false;
      safeZone.lastUsed = null;
    }
    
    console.log('SafeZoneSystem reset');
  }
}