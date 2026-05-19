/**
 * EventBus — wrapper over window.dispatchEvent / addEventListener.
 *
 * - Canonical EventTypes constants (no more typo-driven orphans).
 * - Listener count tracking (warn on emit-with-no-listeners).
 * - Auto-log every emit via Logger (tag "Event:<name>").
 * - Backward compatible: events still dispatch on window, so existing
 *   window.addEventListener(...) handlers in untouched modules keep working.
 */

import { Logger } from '../utils/Logger.js';

export const EventTypes = Object.freeze({
  // Movement & exploration
  MOVEMENT_BLOCKED: 'movementBlocked',
  MOVEMENT_COMPLETED: 'movementCompleted',
  DOOR_OPENED: 'doorOpened',
  LEVEL_TRANSITION: 'levelTransition',
  TRANSITION_ERROR: 'transitionError',

  // Combat
  COMBAT_START: 'combatStart',
  COMBAT_EVENT: 'combatEvent',
  COMBAT_VICTORY: 'combatVictory',
  COMBAT_DEFEAT: 'combatDefeat',
  COMBAT_UI_ACTION: 'combatUIAction',
  COMBAT_UI_REQUEST: 'combatUIRequest',
  COMBAT_RESULTS_ACTION: 'combatResultsAction',
  COMBAT_RESULTS_REQUEST: 'combatResultsRequest',

  // Encounters / scaling
  ENCOUNTER_EVENT: 'encounterEvent',
  SAFE_ZONE_EVENT: 'safeZoneEvent',
  DIFFICULTY_SCALING_EVENT: 'difficultyScalingEvent',

  // Character
  CHARACTER_LEVEL_UP: 'characterLevelUp',
  PARTY_CHANGE: 'partyChange',
  GOLD_CHANGE: 'goldChange',

  // Equipment / Items
  ITEM_EQUIPPED: 'itemEquipped',
  ITEM_UNEQUIPPED: 'itemUnequipped',
  ITEM_PICKUP: 'itemPickup',
  EQUIPMENT_CHANGE: 'equipmentChange',
  OPEN_EQUIPMENT_SELECTION: 'openEquipmentSelection',

  // UI / Game state
  MODAL_OPEN: 'modalOpen',
  MODAL_CLOSE: 'modalClose',
  GAME_STATE_CHANGE: 'gameStateChange',
  GAME_START: 'gameStart',
  GAME_LOAD_REQUESTED: 'gameLoadRequested',
  NOTIFICATION: 'notification',

  // Performance / system
  PERFORMANCE_OPTIMIZATION: 'performanceOptimization',
  MEMORY_EVENT: 'memoryEvent',
  PERFORMANCE_TEST: 'performanceTest',
  GAME_LOOP_EVENT: 'gameLoopEvent',
});

class _EventBus {
  constructor() {
    this.listenerCounts = new Map();
    this.knownTypes = new Set(Object.values(EventTypes));
    this.warnUnknown = true;
    this.warnOrphan = true;
  }

  /** Emit a canonical event. `type` is the string value (or use EventTypes.X). */
  emit(type, detail = {}) {
    if (this.warnUnknown && !this.knownTypes.has(type)) {
      Logger.tag('EventBus').warn(`Unknown event type "${type}" — add to EventTypes`);
    }
    const count = this.listenerCounts.get(type) || 0;
    Logger.tag(`Event:${type}`).debug(`emit listeners=${count}`, detail);
    if (this.warnOrphan && count === 0) {
      Logger.tag('EventBus').warn(`Event "${type}" emitted with no registered listeners`);
    }
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent(type, { detail }));
    }
  }

  on(type, handler) {
    if (typeof window === 'undefined') return () => {};
    this.listenerCounts.set(type, (this.listenerCounts.get(type) || 0) + 1);
    window.addEventListener(type, handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    if (typeof window === 'undefined') return;
    window.removeEventListener(type, handler);
    const n = (this.listenerCounts.get(type) || 1) - 1;
    this.listenerCounts.set(type, Math.max(0, n));
  }

  stats() {
    const out = {};
    for (const [k, v] of this.listenerCounts.entries()) out[k] = v;
    return out;
  }

  registerExternalListener(type) {
    this.listenerCounts.set(type, (this.listenerCounts.get(type) || 0) + 1);
  }
}

export const EventBus = new _EventBus();

if (typeof window !== 'undefined') {
  window.EventBus = EventBus;
  window.EventTypes = EventTypes;
}
