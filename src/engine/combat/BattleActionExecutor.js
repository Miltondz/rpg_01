import { Logger } from '../utils/Logger.js';

const log = Logger.tag('BattleActionExecutor');

/**
 * BattleActionExecutor — sequences visual + logical steps for a single combat action.
 *
 * Calling sequence (spec §1.2):
 *   attacker.stepForward()
 *   → triggerProjectileEffect()
 *   → for each target: Promise.all([hitEffects, combatText, screenShake])
 *   → attacker.stepBack()
 *
 * Visual systems (hitFlash, combatText, screenShake) are injected via setVisualSystems().
 * Until Phase 5/6/7 wires them, all visual calls are no-ops.
 */
export class BattleActionExecutor {
  constructor(actionResolver) {
    this.actionResolver = actionResolver;

    // Visual systems — injected later by main.js / CombatUIManager
    this.hitFlashSystem  = null;  // Phase 5
    this.combatText      = null;  // Phase 6
    this.screenShake     = null;  // Phase 5
    this.entityRegistry  = null;  // Map<id, CombatantEntity> — Phase 3

    // Hit stop duration in ms (spec: 60–100ms)
    this.hitStopDuration = 80;
  }

  /**
   * Inject visual systems once they exist.
   * @param {{ hitFlash, combatText, screenShake, entityRegistry }} systems
   */
  setVisualSystems({ hitFlash, combatText, screenShake, entityRegistry } = {}) {
    if (hitFlash)       this.hitFlashSystem = hitFlash;
    if (combatText)     this.combatText     = combatText;
    if (screenShake)    this.screenShake    = screenShake;
    if (entityRegistry) this.entityRegistry = entityRegistry;
  }

  /**
   * Execute a full action with sequential visual steps.
   * @param {Object}       action    - The action being performed
   * @param {Object}       attacker  - Character or Enemy performing the action
   * @param {Object|Array} targets   - Target(s)
   * @param {Object}       playerParty
   * @param {Array}        enemies
   * @returns {Promise<Object>} ActionResolver resolution result
   */
  async execute(action, attacker, targets, playerParty, enemies) {
    const attackerEntity = this._getEntity(attacker);

    // 1 ── Attacker steps forward toward arena centre
    await attackerEntity.stepForward();

    // 2 ── Projectile / line effect (stub — Phase 8 will add Bezier arc)
    await this._triggerProjectileEffect(action, attackerEntity, targets);

    // 3 ── Resolve logic (damage, heals, effects)
    const resolution = await this.actionResolver.resolveAction(
      action, attacker, targets, playerParty, enemies
    );

    // 4 ── Per-target hit feedback
    if (resolution.success) {
      const targetList = Array.isArray(targets) ? targets : [targets];
      for (const target of targetList) {
        if (!target) continue;
        const result      = resolution.executionResult;
        // result.damage is an array of {target, damage, isCritical}; find entry for this target
        const damageEntries = Array.isArray(result?.damage) ? result.damage : [];
        const entry         = damageEntries.find(d => d.target?.id === target.id);
        const healEntries   = Array.isArray(result?.healing) ? result.healing : [];
        const healEntry     = healEntries.find(h => h.target?.id === target.id);
        const damage        = result?.totalDamage ?? entry?.damage ?? healEntry?.amount ?? 0;
        const isCritical    = result?.isCritical ?? entry?.isCritical ?? false;
        const damageType    = action.element ?? action.type ?? 'physical';
        const targetEntity = this._getEntity(target);

        await Promise.all([
          this._triggerHitEffects(targetEntity, damageType, isCritical),
          this._spawnCombatText(damage, targetEntity, isCritical),
          this._triggerScreenShake(isCritical),
        ]);
      }

      // 5 ── Hit stop (freeze visual delta briefly)
      await this._hitStop();
    }

    // 6 ── Attacker steps back to home position
    await attackerEntity.stepBack();

    return resolution;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  _getEntity(combatant) {
    if (this.entityRegistry?.has(combatant.id)) {
      return this.entityRegistry.get(combatant.id);
    }
    // Fallback: combatant itself (if it has the interface) or a null-safe stub
    return combatant._combatEntity ?? this._nullEntity();
  }

  _nullEntity() {
    return {
      stepForward:       () => Promise.resolve(),
      stepBack:          () => Promise.resolve(),
      playAttackAnimation: () => Promise.resolve(),
      playHitAnimation:  () => Promise.resolve(),
      getScreenPosition: () => null,
    };
  }

  async _triggerProjectileEffect(action, attackerEntity, targets) {
    // Phase 8: arc/line visual from attacker toward target
    return Promise.resolve();
  }

  async _triggerHitEffects(targetEntity, damageType, isCritical) {
    if (this.hitFlashSystem) {
      await this.hitFlashSystem.flash(targetEntity.mesh, damageType, isCritical);
    }
    await targetEntity.playHitAnimation();
  }

  _spawnCombatText(damage, targetEntity, isCritical) {
    if (!this.combatText || damage <= 0) return Promise.resolve();

    // Prefer DOM card position — always accurate regardless of camera
    let screenPos = null;
    const card = document.querySelector(`[data-combatant-id="${targetEntity.id}"]`);
    if (card) {
      const rect = card.getBoundingClientRect();
      screenPos = { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.25 };
    }
    if (!screenPos) return Promise.resolve();
    this.combatText.spawnText(damage, screenPos, isCritical);
    return Promise.resolve();
  }

  _triggerScreenShake(isCritical) {
    if (this.screenShake) {
      this.screenShake.trigger(isCritical ? 1.2 : 0.3);
    }
    return Promise.resolve();
  }

  _hitStop() {
    return new Promise(resolve => setTimeout(resolve, this.hitStopDuration));
  }
}
