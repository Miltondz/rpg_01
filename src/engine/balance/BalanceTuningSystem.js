/**
 * BalanceTuningSystem - Real-time balance adjustment and monitoring
 * Tracks combat metrics and adjusts balance parameters to meet targets
 */

import { combatBalanceConfig } from './CombatBalanceConfig.js';

export class BalanceTuningSystem {
  constructor() {
    this.balanceConfig = combatBalanceConfig;
    
    // Combat metrics tracking
    this.combatMetrics = {
      totalCombats: 0,
      combatDurations: [],
      averageCombatDuration: 0,
      potionUsage: {
        health: 0,
        ap: 0,
        buff: 0
      },
      xpGainRate: 0,
      levelProgression: [],
      encounterBalance: []
    };
    
    // Tuning parameters
    this.tuningParameters = {
      // Auto-adjustment thresholds
      combatDurationTolerance: 0.2,    // ±20% of target duration
      xpRateTolerance: 0.15,           // ±15% of target XP rate
      potionUsageTolerance: 0.25,      // ±25% of target usage
      
      // Adjustment rates (how much to change per iteration)
      hpAdjustmentRate: 0.1,           // ±10% HP adjustment
      atkAdjustmentRate: 0.05,         // ±5% ATK adjustment
      xpAdjustmentRate: 0.1,           // ±10% XP adjustment
      dropRateAdjustmentRate: 0.02     // ±2% drop rate adjustment
    };
    
    // Auto-tuning enabled flag
    this.autoTuningEnabled = false;
    
    console.log('BalanceTuningSystem initialized');
  }

  /**
   * Record combat completion metrics
   * @param {Object} combatData - Combat completion data
   */
  recordCombatMetrics(combatData) {
    this.combatMetrics.totalCombats++;
    
    // Record combat duration
    if (combatData.duration) {
      this.combatMetrics.combatDurations.push({
        duration: combatData.duration,
        encounterType: combatData.encounterType,
        enemyCount: combatData.enemyCount,
        partyLevel: combatData.partyLevel,
        timestamp: Date.now()
      });
      
      // Update average duration
      this.updateAverageCombatDuration();
    }
    
    // Record potion usage
    if (combatData.potionsUsed) {
      this.combatMetrics.potionUsage.health += combatData.potionsUsed.health || 0;
      this.combatMetrics.potionUsage.ap += combatData.potionsUsed.ap || 0;
      this.combatMetrics.potionUsage.buff += combatData.potionsUsed.buff || 0;
    }
    
    // Record XP gain
    if (combatData.xpGained && combatData.duration) {
      const xpPerMinute = combatData.xpGained / (combatData.duration / 60);
      this.combatMetrics.xpGainRate = this.calculateMovingAverage(
        this.combatMetrics.xpGainRate, 
        xpPerMinute, 
        Math.min(this.combatMetrics.totalCombats, 10)
      );
    }
    
    // Record encounter balance
    if (combatData.balanceRating) {
      this.combatMetrics.encounterBalance.push({
        rating: combatData.balanceRating,
        powerRatio: combatData.powerRatio,
        encounterType: combatData.encounterType,
        timestamp: Date.now()
      });
    }
    
    // Perform auto-tuning if enabled
    if (this.autoTuningEnabled) {
      this.performAutoTuning();
    }
    
    console.log('Combat metrics recorded:', {
      totalCombats: this.combatMetrics.totalCombats,
      avgDuration: this.combatMetrics.averageCombatDuration,
      xpRate: this.combatMetrics.xpGainRate
    });
  }

  /**
   * Update average combat duration
   */
  updateAverageCombatDuration() {
    const recentCombats = this.combatMetrics.combatDurations.slice(-20); // Last 20 combats
    const totalDuration = recentCombats.reduce((sum, combat) => sum + combat.duration, 0);
    this.combatMetrics.averageCombatDuration = totalDuration / recentCombats.length;
  }

  /**
   * Calculate moving average
   * @param {number} currentAverage - Current average value
   * @param {number} newValue - New value to incorporate
   * @param {number} sampleSize - Sample size for moving average
   * @returns {number} Updated moving average
   */
  calculateMovingAverage(currentAverage, newValue, sampleSize) {
    const weight = 1 / sampleSize;
    return currentAverage * (1 - weight) + newValue * weight;
  }

  /**
   * Analyze combat duration balance
   * @param {string} encounterType - Type of encounter to analyze
   * @returns {Object} Duration analysis
   */
  analyzeCombatDuration(encounterType = 'random') {
    const targetDuration = this.balanceConfig.getCombatDurationTarget(encounterType);
    const targetAverage = (targetDuration.min + targetDuration.max) / 2;
    
    const relevantCombats = this.combatMetrics.combatDurations
      .filter(combat => combat.encounterType === encounterType)
      .slice(-10); // Last 10 combats of this type
    
    if (relevantCombats.length === 0) {
      return {
        status: 'insufficient_data',
        recommendation: 'Need more combat data for analysis'
      };
    }
    
    const averageDuration = relevantCombats.reduce((sum, combat) => sum + combat.duration, 0) / relevantCombats.length;
    const deviation = (averageDuration - targetAverage) / targetAverage;
    
    let status = 'balanced';
    let recommendation = 'Combat duration is within target range';
    
    if (Math.abs(deviation) > this.tuningParameters.combatDurationTolerance) {
      if (deviation > 0) {
        status = 'too_long';
        recommendation = `Combats are ${Math.round(Math.abs(deviation) * 100)}% longer than target. Consider reducing enemy HP or increasing party damage.`;
      } else {
        status = 'too_short';
        recommendation = `Combats are ${Math.round(Math.abs(deviation) * 100)}% shorter than target. Consider increasing enemy HP or reducing party damage.`;
      }
    }
    
    return {
      status,
      averageDuration,
      targetDuration: targetAverage,
      deviation,
      recommendation,
      sampleSize: relevantCombats.length
    };
  }

  /**
   * Analyze XP progression rate
   * @returns {Object} XP progression analysis
   */
  analyzeXPProgression() {
    const targetXPRate = this.balanceConfig.progressionPacing.levelProgressionTargets.xpPerMinute;
    const currentRate = this.combatMetrics.xpGainRate;
    
    if (currentRate === 0) {
      return {
        status: 'insufficient_data',
        recommendation: 'Need more combat data for XP analysis'
      };
    }
    
    const deviation = (currentRate - targetXPRate) / targetXPRate;
    
    let status = 'balanced';
    let recommendation = 'XP progression rate is optimal';
    
    if (Math.abs(deviation) > this.tuningParameters.xpRateTolerance) {
      if (deviation > 0) {
        status = 'too_fast';
        recommendation = `XP gain is ${Math.round(Math.abs(deviation) * 100)}% higher than target. Consider reducing XP rewards.`;
      } else {
        status = 'too_slow';
        recommendation = `XP gain is ${Math.round(Math.abs(deviation) * 100)}% lower than target. Consider increasing XP rewards.`;
      }
    }
    
    return {
      status,
      currentRate,
      targetRate: targetXPRate,
      deviation,
      recommendation
    };
  }

  /**
   * Analyze potion usage economy
   * @returns {Object} Potion usage analysis
   */
  analyzePotionUsage() {
    const totalCombats = this.combatMetrics.totalCombats;
    
    if (totalCombats === 0) {
      return {
        status: 'insufficient_data',
        recommendation: 'Need combat data for potion analysis'
      };
    }
    
    const usage = {
      health: this.combatMetrics.potionUsage.health / totalCombats,
      ap: this.combatMetrics.potionUsage.ap / totalCombats,
      buff: this.combatMetrics.potionUsage.buff / totalCombats
    };
    
    const targets = this.balanceConfig.resourceEconomy.potionUsageTargets;
    
    const analysis = {
      health: this.analyzePotionType(usage.health, targets.healthPotions),
      ap: this.analyzePotionType(usage.ap, targets.apPotions),
      buff: this.analyzePotionType(usage.buff, targets.buffPotions)
    };
    
    return {
      usage,
      targets,
      analysis,
      overallStatus: this.getOverallPotionStatus(analysis)
    };
  }

  /**
   * Analyze individual potion type usage
   * @param {number} currentUsage - Current usage rate
   * @param {Object} target - Target usage range
   * @returns {Object} Analysis for potion type
   */
  analyzePotionType(currentUsage, target) {
    const targetAverage = (target.min + target.max) / 2;
    const deviation = (currentUsage - targetAverage) / targetAverage;
    
    let status = 'balanced';
    let recommendation = 'Usage is within target range';
    
    if (currentUsage < target.min) {
      status = 'underused';
      recommendation = 'Consider increasing drop rates or reducing shop prices';
    } else if (currentUsage > target.max) {
      status = 'overused';
      recommendation = 'Consider reducing drop rates or increasing difficulty';
    }
    
    return {
      status,
      currentUsage,
      targetRange: target,
      deviation,
      recommendation
    };
  }

  /**
   * Get overall potion economy status
   * @param {Object} analysis - Individual potion analyses
   * @returns {string} Overall status
   */
  getOverallPotionStatus(analysis) {
    const statuses = Object.values(analysis).map(a => a.status);
    
    if (statuses.every(s => s === 'balanced')) {
      return 'balanced';
    } else if (statuses.some(s => s === 'overused')) {
      return 'economy_inflated';
    } else if (statuses.some(s => s === 'underused')) {
      return 'economy_deflated';
    } else {
      return 'mixed';
    }
  }

  /**
   * Perform automatic balance tuning
   */
  performAutoTuning() {
    const durationAnalysis = this.analyzeCombatDuration();
    const xpAnalysis = this.analyzeXPProgression();
    const potionAnalysis = this.analyzePotionUsage();
    
    let adjustmentsMade = [];
    
    // Adjust combat duration
    if (durationAnalysis.status === 'too_long') {
      this.adjustEnemyHP(-this.tuningParameters.hpAdjustmentRate);
      adjustmentsMade.push('Reduced enemy HP');
    } else if (durationAnalysis.status === 'too_short') {
      this.adjustEnemyHP(this.tuningParameters.hpAdjustmentRate);
      adjustmentsMade.push('Increased enemy HP');
    }
    
    // Adjust XP progression
    if (xpAnalysis.status === 'too_fast') {
      this.adjustXPRewards(-this.tuningParameters.xpAdjustmentRate);
      adjustmentsMade.push('Reduced XP rewards');
    } else if (xpAnalysis.status === 'too_slow') {
      this.adjustXPRewards(this.tuningParameters.xpAdjustmentRate);
      adjustmentsMade.push('Increased XP rewards');
    }
    
    // Adjust potion drop rates
    if (potionAnalysis.overallStatus === 'economy_deflated') {
      this.adjustPotionDropRates(this.tuningParameters.dropRateAdjustmentRate);
      adjustmentsMade.push('Increased potion drop rates');
    } else if (potionAnalysis.overallStatus === 'economy_inflated') {
      this.adjustPotionDropRates(-this.tuningParameters.dropRateAdjustmentRate);
      adjustmentsMade.push('Reduced potion drop rates');
    }
    
    if (adjustmentsMade.length > 0) {
      console.log('Auto-tuning adjustments made:', adjustmentsMade);
    }
  }

  /**
   * Adjust enemy HP multipliers
   * @param {number} adjustment - Adjustment factor (-1 to 1)
   */
  adjustEnemyHP(adjustment) {
    const multipliers = this.balanceConfig.balanceParameters.enemyHPMultipliers;
    
    for (const [type, multiplier] of Object.entries(multipliers)) {
      multipliers[type] = Math.max(0.5, Math.min(3.0, multiplier * (1 + adjustment)));
    }
    
    console.log('Enemy HP multipliers adjusted by', adjustment);
  }

  /**
   * Adjust XP reward rates
   * @param {number} adjustment - Adjustment factor (-1 to 1)
   */
  adjustXPRewards(adjustment) {
    const xpConfig = this.balanceConfig.progressionPacing.xpRewards;
    xpConfig.baseXPPerLevel = Math.max(10, Math.min(50, xpConfig.baseXPPerLevel * (1 + adjustment)));
    
    console.log('XP rewards adjusted by', adjustment);
  }

  /**
   * Adjust potion drop rates
   * @param {number} adjustment - Adjustment factor (-1 to 1)
   */
  adjustPotionDropRates(adjustment) {
    const dropRates = this.balanceConfig.resourceEconomy.potionDropRates;
    
    for (const [potion, rate] of Object.entries(dropRates)) {
      dropRates[potion] = Math.max(0.01, Math.min(0.5, rate * (1 + adjustment)));
    }
    
    console.log('Potion drop rates adjusted by', adjustment);
  }

  /**
   * Generate comprehensive balance report
   * @returns {Object} Complete balance analysis
   */
  generateBalanceReport() {
    return {
      combatDuration: {
        random: this.analyzeCombatDuration('random'),
        mini_boss: this.analyzeCombatDuration('mini_boss'),
        boss: this.analyzeCombatDuration('boss')
      },
      xpProgression: this.analyzeXPProgression(),
      potionEconomy: this.analyzePotionUsage(),
      metrics: {
        totalCombats: this.combatMetrics.totalCombats,
        averageDuration: this.combatMetrics.averageCombatDuration,
        xpRate: this.combatMetrics.xpGainRate
      },
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate balance recommendations
   * @returns {Array} Array of recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    const durationAnalysis = this.analyzeCombatDuration();
    const xpAnalysis = this.analyzeXPProgression();
    const potionAnalysis = this.analyzePotionUsage();
    
    if (durationAnalysis.status !== 'balanced' && durationAnalysis.status !== 'insufficient_data') {
      recommendations.push({
        category: 'combat_duration',
        priority: 'high',
        issue: durationAnalysis.status,
        recommendation: durationAnalysis.recommendation
      });
    }
    
    if (xpAnalysis.status !== 'balanced' && xpAnalysis.status !== 'insufficient_data') {
      recommendations.push({
        category: 'xp_progression',
        priority: 'medium',
        issue: xpAnalysis.status,
        recommendation: xpAnalysis.recommendation
      });
    }
    
    if (potionAnalysis.overallStatus !== 'balanced') {
      recommendations.push({
        category: 'resource_economy',
        priority: 'medium',
        issue: potionAnalysis.overallStatus,
        recommendation: 'Adjust potion drop rates and pricing'
      });
    }
    
    return recommendations;
  }

  /**
   * Enable or disable auto-tuning
   * @param {boolean} enabled - Whether to enable auto-tuning
   */
  setAutoTuning(enabled) {
    this.autoTuningEnabled = enabled;
    console.log('Auto-tuning', enabled ? 'enabled' : 'disabled');
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.combatMetrics = {
      totalCombats: 0,
      combatDurations: [],
      averageCombatDuration: 0,
      potionUsage: { health: 0, ap: 0, buff: 0 },
      xpGainRate: 0,
      levelProgression: [],
      encounterBalance: []
    };
    
    console.log('Balance metrics reset');
  }

  /**
   * Export metrics data
   * @returns {Object} Metrics data for analysis
   */
  exportMetrics() {
    return {
      metrics: this.combatMetrics,
      tuningParameters: this.tuningParameters,
      autoTuningEnabled: this.autoTuningEnabled,
      timestamp: Date.now()
    };
  }
}

// Export singleton instance
export const balanceTuningSystem = new BalanceTuningSystem();