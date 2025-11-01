/**
 * ResourceEconomySystem - Manages and optimizes resource economy balance
 * Handles potion drop rates, shop pricing, and progression pacing
 */

import { combatBalanceConfig } from './CombatBalanceConfig.js';

export class ResourceEconomySystem {
  constructor() {
    this.balanceConfig = combatBalanceConfig;
    
    // Economy tracking
    this.economyMetrics = {
      potionDrops: {
        health_small: 0,
        health_medium: 0,
        health_large: 0,
        ap_potion: 0,
        buff_potion: 0
      },
      potionUsage: {
        health_small: 0,
        health_medium: 0,
        health_large: 0,
        ap_potion: 0,
        buff_potion: 0
      },
      goldFlow: {
        earned: 0,
        spent: 0,
        balance: 0
      },
      shopTransactions: {
        purchases: 0,
        sales: 0,
        totalValue: 0
      },
      progressionMetrics: {
        levelsGained: 0,
        timeSpent: 0,
        combatsCompleted: 0
      }
    };
    
    // Dynamic pricing system
    this.dynamicPricing = {
      enabled: false,
      priceAdjustments: new Map(),
      demandTracking: new Map(),
      supplyTracking: new Map()
    };
    
    console.log('ResourceEconomySystem initialized');
  }

  /**
   * Record potion drop event
   * @param {string} potionType - Type of potion dropped
   * @param {number} quantity - Quantity dropped
   */
  recordPotionDrop(potionType, quantity = 1) {
    if (this.economyMetrics.potionDrops[potionType] !== undefined) {
      this.economyMetrics.potionDrops[potionType] += quantity;
    }
    
    // Update supply tracking for dynamic pricing
    if (this.dynamicPricing.enabled) {
      const currentSupply = this.dynamicPricing.supplyTracking.get(potionType) || 0;
      this.dynamicPricing.supplyTracking.set(potionType, currentSupply + quantity);
    }
  }

  /**
   * Record potion usage event
   * @param {string} potionType - Type of potion used
   * @param {number} quantity - Quantity used
   */
  recordPotionUsage(potionType, quantity = 1) {
    if (this.economyMetrics.potionUsage[potionType] !== undefined) {
      this.economyMetrics.potionUsage[potionType] += quantity;
    }
    
    // Update demand tracking for dynamic pricing
    if (this.dynamicPricing.enabled) {
      const currentDemand = this.dynamicPricing.demandTracking.get(potionType) || 0;
      this.dynamicPricing.demandTracking.set(potionType, currentDemand + quantity);
    }
  }

  /**
   * Record gold transaction
   * @param {number} amount - Amount of gold (positive for earned, negative for spent)
   * @param {string} source - Source of transaction
   */
  recordGoldTransaction(amount, source) {
    if (amount > 0) {
      this.economyMetrics.goldFlow.earned += amount;
    } else {
      this.economyMetrics.goldFlow.spent += Math.abs(amount);
    }
    
    this.economyMetrics.goldFlow.balance += amount;
  }

  /**
   * Record shop transaction
   * @param {string} type - 'purchase' or 'sale'
   * @param {number} value - Transaction value
   * @param {string} itemType - Type of item
   */
  recordShopTransaction(type, value, itemType) {
    if (type === 'purchase') {
      this.economyMetrics.shopTransactions.purchases++;
      this.recordGoldTransaction(-value, 'shop_purchase');
    } else if (type === 'sale') {
      this.economyMetrics.shopTransactions.sales++;
      this.recordGoldTransaction(value, 'shop_sale');
    }
    
    this.economyMetrics.shopTransactions.totalValue += value;
  }

  /**
   * Record progression event
   * @param {string} eventType - Type of progression event
   * @param {Object} data - Event data
   */
  recordProgressionEvent(eventType, data) {
    switch (eventType) {
      case 'level_up':
        this.economyMetrics.progressionMetrics.levelsGained++;
        break;
      case 'combat_completed':
        this.economyMetrics.progressionMetrics.combatsCompleted++;
        break;
      case 'time_update':
        this.economyMetrics.progressionMetrics.timeSpent = data.totalTime;
        break;
    }
  }

  /**
   * Calculate optimal potion drop rates
   * @param {number} floorLevel - Current dungeon floor
   * @param {number} partyLevel - Average party level
   * @returns {Object} Optimized drop rates
   */
  calculateOptimalDropRates(floorLevel, partyLevel) {
    const baseRates = this.balanceConfig.resourceEconomy.potionDropRates;
    const targets = this.balanceConfig.resourceEconomy.potionUsageTargets;
    
    // Calculate current usage vs drop ratio
    const usageRatios = {};
    for (const [potionType, baseRate] of Object.entries(baseRates)) {
      const dropped = this.economyMetrics.potionDrops[potionType] || 0;
      const used = this.economyMetrics.potionUsage[potionType] || 0;
      
      if (dropped > 0) {
        usageRatios[potionType] = used / dropped;
      } else {
        usageRatios[potionType] = 0;
      }
    }
    
    // Adjust drop rates based on usage patterns
    const optimizedRates = {};
    for (const [potionType, baseRate] of Object.entries(baseRates)) {
      let adjustedRate = baseRate;
      
      // If usage ratio is too high (running out of potions), increase drop rate
      if (usageRatios[potionType] > 0.8) {
        adjustedRate *= 1.2; // 20% increase
      } else if (usageRatios[potionType] < 0.3) {
        adjustedRate *= 0.9; // 10% decrease
      }
      
      // Floor-based scaling
      const floorMultiplier = 1 + (floorLevel - 1) * 0.1; // 10% increase per floor
      adjustedRate *= floorMultiplier;
      
      // Ensure rates stay within reasonable bounds
      optimizedRates[potionType] = Math.max(0.05, Math.min(0.5, adjustedRate));
    }
    
    return optimizedRates;
  }

  /**
   * Calculate dynamic shop prices
   * @param {string} itemType - Type of item
   * @param {number} basePrice - Base price of item
   * @returns {number} Dynamic price
   */
  calculateDynamicPrice(itemType, basePrice) {
    if (!this.dynamicPricing.enabled) {
      return this.balanceConfig.getShopPrice(itemType, basePrice);
    }
    
    const supply = this.dynamicPricing.supplyTracking.get(itemType) || 0;
    const demand = this.dynamicPricing.demandTracking.get(itemType) || 0;
    
    let priceMultiplier = 1.0;
    
    // Supply and demand adjustment
    if (supply > 0 && demand > 0) {
      const supplyDemandRatio = supply / demand;
      
      if (supplyDemandRatio < 0.5) {
        // High demand, low supply - increase price
        priceMultiplier = 1.3;
      } else if (supplyDemandRatio > 2.0) {
        // Low demand, high supply - decrease price
        priceMultiplier = 0.8;
      }
    }
    
    // Apply existing price adjustments
    const existingAdjustment = this.dynamicPricing.priceAdjustments.get(itemType) || 1.0;
    priceMultiplier *= existingAdjustment;
    
    const finalPrice = Math.floor(basePrice * priceMultiplier);
    return Math.max(1, finalPrice); // Minimum price of 1 gold
  }

  /**
   * Analyze resource economy balance
   * @returns {Object} Economy analysis
   */
  analyzeEconomyBalance() {
    const analysis = {
      potionEconomy: this.analyzePotionEconomy(),
      goldEconomy: this.analyzeGoldEconomy(),
      progressionPacing: this.analyzeProgressionPacing(),
      recommendations: []
    };
    
    // Generate recommendations based on analysis
    analysis.recommendations = this.generateEconomyRecommendations(analysis);
    
    return analysis;
  }

  /**
   * Analyze potion economy balance
   * @returns {Object} Potion economy analysis
   */
  analyzePotionEconomy() {
    const analysis = {
      dropToUsageRatios: {},
      sustainability: {},
      overallStatus: 'balanced'
    };
    
    let imbalanceCount = 0;
    
    for (const potionType of Object.keys(this.economyMetrics.potionDrops)) {
      const dropped = this.economyMetrics.potionDrops[potionType];
      const used = this.economyMetrics.potionUsage[potionType];
      
      if (dropped === 0 && used === 0) {
        analysis.dropToUsageRatios[potionType] = 0;
        analysis.sustainability[potionType] = 'no_data';
        continue;
      }
      
      const ratio = dropped > 0 ? used / dropped : (used > 0 ? Infinity : 0);
      analysis.dropToUsageRatios[potionType] = ratio;
      
      // Determine sustainability
      if (ratio > 1.2) {
        analysis.sustainability[potionType] = 'unsustainable'; // Using more than dropping
        imbalanceCount++;
      } else if (ratio < 0.3) {
        analysis.sustainability[potionType] = 'oversupplied'; // Dropping much more than using
        imbalanceCount++;
      } else {
        analysis.sustainability[potionType] = 'balanced';
      }
    }
    
    // Overall status
    if (imbalanceCount > 2) {
      analysis.overallStatus = 'imbalanced';
    } else if (imbalanceCount > 0) {
      analysis.overallStatus = 'minor_issues';
    }
    
    return analysis;
  }

  /**
   * Analyze gold economy balance
   * @returns {Object} Gold economy analysis
   */
  analyzeGoldEconomy() {
    const goldFlow = this.economyMetrics.goldFlow;
    const shopTransactions = this.economyMetrics.shopTransactions;
    
    const analysis = {
      totalEarned: goldFlow.earned,
      totalSpent: goldFlow.spent,
      currentBalance: goldFlow.balance,
      spendingRatio: goldFlow.earned > 0 ? goldFlow.spent / goldFlow.earned : 0,
      shopActivity: {
        purchases: shopTransactions.purchases,
        sales: shopTransactions.sales,
        averageTransactionValue: shopTransactions.purchases > 0 ? 
          shopTransactions.totalValue / shopTransactions.purchases : 0
      }
    };
    
    // Determine gold economy status
    if (analysis.spendingRatio > 0.9) {
      analysis.status = 'tight'; // Spending most of what's earned
    } else if (analysis.spendingRatio < 0.3) {
      analysis.status = 'hoarding'; // Not spending enough
    } else {
      analysis.status = 'balanced';
    }
    
    return analysis;
  }

  /**
   * Analyze progression pacing
   * @returns {Object} Progression analysis
   */
  analyzeProgressionPacing() {
    const metrics = this.economyMetrics.progressionMetrics;
    const targets = this.balanceConfig.progressionPacing.levelProgressionTargets;
    
    const analysis = {
      levelsGained: metrics.levelsGained,
      timeSpent: metrics.timeSpent,
      combatsCompleted: metrics.combatsCompleted
    };
    
    if (metrics.timeSpent > 0 && metrics.levelsGained > 0) {
      const timePerLevel = metrics.timeSpent / metrics.levelsGained / 60; // Convert to minutes
      const targetTimePerLevel = (targets.timePerLevel.min + targets.timePerLevel.max) / 2;
      
      analysis.timePerLevel = timePerLevel;
      analysis.targetTimePerLevel = targetTimePerLevel;
      analysis.pacingDeviation = (timePerLevel - targetTimePerLevel) / targetTimePerLevel;
      
      // Determine pacing status
      if (Math.abs(analysis.pacingDeviation) < 0.2) {
        analysis.pacingStatus = 'optimal';
      } else if (analysis.pacingDeviation > 0) {
        analysis.pacingStatus = 'too_slow';
      } else {
        analysis.pacingStatus = 'too_fast';
      }
    } else {
      analysis.pacingStatus = 'insufficient_data';
    }
    
    if (metrics.combatsCompleted > 0 && metrics.levelsGained > 0) {
      analysis.combatsPerLevel = metrics.combatsCompleted / metrics.levelsGained;
      const targetCombatsPerLevel = (targets.combatsPerLevel.min + targets.combatsPerLevel.max) / 2;
      analysis.targetCombatsPerLevel = targetCombatsPerLevel;
    }
    
    return analysis;
  }

  /**
   * Generate economy recommendations
   * @param {Object} analysis - Economy analysis results
   * @returns {Array} Array of recommendations
   */
  generateEconomyRecommendations(analysis) {
    const recommendations = [];
    
    // Potion economy recommendations
    if (analysis.potionEconomy.overallStatus !== 'balanced') {
      for (const [potionType, sustainability] of Object.entries(analysis.potionEconomy.sustainability)) {
        if (sustainability === 'unsustainable') {
          recommendations.push({
            category: 'potion_economy',
            priority: 'high',
            issue: `${potionType} usage exceeds drops`,
            recommendation: `Increase ${potionType} drop rate by 20-30%`
          });
        } else if (sustainability === 'oversupplied') {
          recommendations.push({
            category: 'potion_economy',
            priority: 'low',
            issue: `${potionType} drops exceed usage`,
            recommendation: `Consider reducing ${potionType} drop rate by 10-15%`
          });
        }
      }
    }
    
    // Gold economy recommendations
    if (analysis.goldEconomy.status === 'tight') {
      recommendations.push({
        category: 'gold_economy',
        priority: 'medium',
        issue: 'Players spending too much gold',
        recommendation: 'Increase gold rewards or reduce shop prices by 10-15%'
      });
    } else if (analysis.goldEconomy.status === 'hoarding') {
      recommendations.push({
        category: 'gold_economy',
        priority: 'medium',
        issue: 'Players not spending enough gold',
        recommendation: 'Add more valuable items to shop or increase prices slightly'
      });
    }
    
    // Progression pacing recommendations
    if (analysis.progressionPacing.pacingStatus === 'too_slow') {
      recommendations.push({
        category: 'progression_pacing',
        priority: 'high',
        issue: 'Level progression is too slow',
        recommendation: 'Increase XP rewards by 15-20% or reduce XP requirements'
      });
    } else if (analysis.progressionPacing.pacingStatus === 'too_fast') {
      recommendations.push({
        category: 'progression_pacing',
        priority: 'medium',
        issue: 'Level progression is too fast',
        recommendation: 'Reduce XP rewards by 10-15% or increase XP requirements'
      });
    }
    
    return recommendations;
  }

  /**
   * Apply economy optimizations
   * @param {Array} recommendations - Recommendations to apply
   */
  applyEconomyOptimizations(recommendations) {
    for (const rec of recommendations) {
      switch (rec.category) {
        case 'potion_economy':
          this.adjustPotionDropRates(rec);
          break;
        case 'gold_economy':
          this.adjustGoldEconomy(rec);
          break;
        case 'progression_pacing':
          this.adjustProgressionPacing(rec);
          break;
      }
    }
    
    console.log('Applied economy optimizations:', recommendations.length);
  }

  /**
   * Adjust potion drop rates based on recommendation
   * @param {Object} recommendation - Recommendation object
   */
  adjustPotionDropRates(recommendation) {
    // Extract potion type from recommendation
    const potionTypes = Object.keys(this.balanceConfig.resourceEconomy.potionDropRates);
    const potionType = potionTypes.find(type => recommendation.issue.includes(type));
    
    if (potionType) {
      const currentRate = this.balanceConfig.resourceEconomy.potionDropRates[potionType];
      let adjustment = 0;
      
      if (recommendation.issue.includes('exceeds drops')) {
        adjustment = 0.25; // 25% increase
      } else if (recommendation.issue.includes('drops exceed')) {
        adjustment = -0.15; // 15% decrease
      }
      
      const newRate = Math.max(0.01, Math.min(0.5, currentRate * (1 + adjustment)));
      this.balanceConfig.resourceEconomy.potionDropRates[potionType] = newRate;
      
      console.log(`Adjusted ${potionType} drop rate from ${currentRate.toFixed(3)} to ${newRate.toFixed(3)}`);
    }
  }

  /**
   * Adjust gold economy based on recommendation
   * @param {Object} recommendation - Recommendation object
   */
  adjustGoldEconomy(recommendation) {
    const goldEconomy = this.balanceConfig.resourceEconomy.goldEconomy;
    
    if (recommendation.issue.includes('spending too much')) {
      // Increase gold rewards
      goldEconomy.enemyGoldBase *= 1.15;
      goldEconomy.bossGoldMultiplier *= 1.1;
    } else if (recommendation.issue.includes('not spending enough')) {
      // Reduce gold rewards slightly
      goldEconomy.enemyGoldBase *= 0.95;
    }
    
    console.log('Adjusted gold economy parameters');
  }

  /**
   * Adjust progression pacing based on recommendation
   * @param {Object} recommendation - Recommendation object
   */
  adjustProgressionPacing(recommendation) {
    const xpRewards = this.balanceConfig.progressionPacing.xpRewards;
    
    if (recommendation.issue.includes('too slow')) {
      xpRewards.baseXPPerLevel *= 1.2; // 20% increase
    } else if (recommendation.issue.includes('too fast')) {
      xpRewards.baseXPPerLevel *= 0.85; // 15% decrease
    }
    
    console.log('Adjusted progression pacing parameters');
  }

  /**
   * Enable dynamic pricing system
   * @param {boolean} enabled - Whether to enable dynamic pricing
   */
  setDynamicPricing(enabled) {
    this.dynamicPricing.enabled = enabled;
    
    if (enabled) {
      console.log('Dynamic pricing system enabled');
    } else {
      console.log('Dynamic pricing system disabled');
      this.dynamicPricing.priceAdjustments.clear();
      this.dynamicPricing.demandTracking.clear();
      this.dynamicPricing.supplyTracking.clear();
    }
  }

  /**
   * Reset economy metrics
   */
  resetEconomyMetrics() {
    this.economyMetrics = {
      potionDrops: {
        health_small: 0,
        health_medium: 0,
        health_large: 0,
        ap_potion: 0,
        buff_potion: 0
      },
      potionUsage: {
        health_small: 0,
        health_medium: 0,
        health_large: 0,
        ap_potion: 0,
        buff_potion: 0
      },
      goldFlow: {
        earned: 0,
        spent: 0,
        balance: 0
      },
      shopTransactions: {
        purchases: 0,
        sales: 0,
        totalValue: 0
      },
      progressionMetrics: {
        levelsGained: 0,
        timeSpent: 0,
        combatsCompleted: 0
      }
    };
    
    console.log('Economy metrics reset');
  }

  /**
   * Export economy data
   * @returns {Object} Economy data for analysis
   */
  exportEconomyData() {
    return {
      metrics: this.economyMetrics,
      dynamicPricing: {
        enabled: this.dynamicPricing.enabled,
        priceAdjustments: Object.fromEntries(this.dynamicPricing.priceAdjustments),
        demandTracking: Object.fromEntries(this.dynamicPricing.demandTracking),
        supplyTracking: Object.fromEntries(this.dynamicPricing.supplyTracking)
      },
      timestamp: Date.now()
    };
  }
}

// Export singleton instance
export const resourceEconomySystem = new ResourceEconomySystem();