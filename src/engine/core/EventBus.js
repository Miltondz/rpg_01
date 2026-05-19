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

  // Campaign
  CAMPAIGN_LOADED: 'campaign:loaded',
  CAMPAIGN_PHASE_CHANGED: 'campaign:phase_changed',
  CAMPAIGN_FLAG_CHANGED: 'campaign:flag_changed',
  CAMPAIGN_VARIABLE_CHANGED: 'campaign:variable_changed',
  CAMPAIGN_COMPLETE: 'campaign:complete',
  CAMPAIGN_RESTORED: 'campaign:restored',
  COMBAT_ENCOUNTER_COMPLETE: 'combat:encounter_complete',
  PLAYER_FLOOR_CLEARED: 'player:floor_cleared',

  // Quests
  QUEST_STARTED: 'quest:started',
  QUEST_ADVANCED: 'quest:advanced',
  QUEST_COMPLETED: 'quest:completed',
  QUEST_OBJECTIVE_COMPLETED: 'quest:objective_completed',

  // Narrative
  NARRATIVE_STORY_LOADED: 'narrative:story_loaded',
  NARRATIVE_LINE_READY: 'narrative:line_ready',
  NARRATIVE_CHOICES_READY: 'narrative:choices_ready',
  NARRATIVE_CHOICE_MADE: 'narrative:choice_made',
  NARRATIVE_KNOT_REACHED: 'narrative:knot_reached',
  NARRATIVE_KNOT_CHANGED: 'narrative:knot_changed',
  NARRATIVE_DIALOGUE_COMPLETE: 'narrative:dialogue_complete',
  NARRATIVE_DIALOGUE_READY: 'narrative:dialogue_ready',
  NARRATIVE_STORY_COMPLETE: 'narrative:story_complete',
  NARRATIVE_VARIABLE_SET: 'narrative:variable_set',

  // NPC
  NPC_SPAWNED: 'npc:spawned',
  NPC_DESPAWNED: 'npc:despawned',
  NPC_DIALOGUE_STARTED: 'npc:dialogue_started',
  NPC_AFFINITY_CHANGED: 'npc:affinity_changed',
  NPC_STATE_CHANGED: 'npc:state_changed',
  NPC_SHOP_OPENED: 'npc:shop_opened',
  NPC_SPAWN_REQUEST: 'npc:spawn_request',
  NPC_DESPAWN_REQUEST: 'npc:despawn_request',

  // Audio
  AUDIO_PLAY_MUSIC: 'audio:play_music',
  AUDIO_PLAY_SFX: 'audio:play_sfx',
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
