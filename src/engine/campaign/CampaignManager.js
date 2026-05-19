/**
 * CampaignManager - Macro-level campaign state machine
 * Tracks acts, phases, world flags, variables, and quest lifecycle.
 * Pure event-driven — subscribes to EventBus, never polls.
 */

import { EventBus, EventTypes } from '../core/EventBus.js';
import { QuestGraph } from './QuestGraph.js';
import { Logger } from '../utils/Logger.js';

const log = Logger.tag('Campaign');

export class CampaignManager {
  constructor() {
    this.campaignData = null;
    this.campaignId = null;
    this.currentActIndex = 0;
    this.currentPhaseIndex = 0;
    this.worldFlags = new Set();
    this.campaignVariables = {};
    this.activeQuests = new Map();    // questId -> QuestGraph
    this.completedQuests = new Set();
    this.availableContent = {
      dungeons: new Set(),
      quests: new Set(),
      npcs: new Set(),
      narrativeKnots: new Set()
    };

    this._lastEventPayload = null;
    this._checkScheduled = false;

    this._bindEvents();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async loadCampaign(campaignId) {
    try {
      const response = await fetch(`campaigns/${campaignId}/campaign.json`, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Campaign not found: ${campaignId}`);
      this.campaignData = await response.json();
      this.campaignId = campaignId;
      this.currentActIndex = 0;
      this.currentPhaseIndex = 0;
      this.worldFlags.clear();
      this.campaignVariables = { ...(this.campaignData.variables ?? {}) };
      this.activeQuests.clear();
      this.completedQuests.clear();
      for (const key of Object.keys(this.availableContent)) {
        this.availableContent[key].clear();
      }
      this._activatePhase(0, 0);
      EventBus.emit(EventTypes.CAMPAIGN_LOADED, {
        campaignId,
        actId: this._currentAct()?.id,
        phaseId: this.getCurrentPhase()?.id
      });
      log.info('loaded', { campaignId });
    } catch (err) {
      log.warn('loadCampaign failed', { campaignId, err: err.message });
    }
  }

  getCurrentPhase() {
    return this._currentAct()?.phases?.[this.currentPhaseIndex] ?? null;
  }

  isContentAvailable(contentType, contentId) {
    return this.availableContent[contentType]?.has(contentId) ?? false;
  }

  getWorldFlag(flag) {
    return this.worldFlags.has(flag);
  }

  setWorldFlag(flag, value = true) {
    if (value) {
      this.worldFlags.add(flag);
    } else {
      this.worldFlags.delete(flag);
    }
    EventBus.emit(EventTypes.CAMPAIGN_FLAG_CHANGED, { flag, value });
    if (value) this._scheduleExitCheck();
  }

  setCampaignVariable(key, value) {
    this.campaignVariables[key] = value;
    EventBus.emit(EventTypes.CAMPAIGN_VARIABLE_CHANGED, { key, value });
  }

  getCampaignVariable(key) {
    return this.campaignVariables[key];
  }

  async startQuest(questId) {
    if (!this.availableContent.quests.has(questId)) {
      throw new Error(`Quest not available: ${questId}`);
    }
    if (this.activeQuests.has(questId) || this.completedQuests.has(questId)) return;
    const graph = await QuestGraph.loadFromFile(this.campaignId, questId);
    this.activeQuests.set(questId, graph);
    EventBus.emit(EventTypes.QUEST_STARTED, { questId, title: graph.title });
    log.info('quest started', { questId });
  }

  advanceQuestObjective(questId, objectiveNodeId) {
    const graph = this.activeQuests.get(questId);
    if (!graph) { log.warn('advanceQuestObjective: quest not active', { questId }); return; }
    graph.advance(objectiveNodeId);
    EventBus.emit(EventTypes.QUEST_ADVANCED, { questId, objectiveNodeId });
    this._scheduleExitCheck();
  }

  completeQuest(questId) {
    this.activeQuests.delete(questId);
    this.completedQuests.add(questId);
    EventBus.emit(EventTypes.QUEST_COMPLETED, { questId });
    this._scheduleExitCheck();
  }

  getSaveData() {
    return {
      campaignId: this.campaignId,
      currentActIndex: this.currentActIndex,
      currentPhaseIndex: this.currentPhaseIndex,
      worldFlags: [...this.worldFlags],
      campaignVariables: { ...this.campaignVariables },
      activeQuests: [...this.activeQuests.values()].map(q => q.getSaveData()),
      completedQuests: [...this.completedQuests]
    };
  }

  loadSaveData(data) {
    if (!data || !this.campaignData) return;
    this.currentActIndex = data.currentActIndex ?? 0;
    this.currentPhaseIndex = data.currentPhaseIndex ?? 0;
    this.worldFlags = new Set(data.worldFlags ?? []);
    this.campaignVariables = { ...(data.campaignVariables ?? {}) };
    this.completedQuests = new Set(data.completedQuests ?? []);

    // Replay content gates up to current phase
    for (const key of Object.keys(this.availableContent)) {
      this.availableContent[key].clear();
    }
    for (let a = 0; a <= this.currentActIndex; a++) {
      const act = this.campaignData.acts?.[a];
      if (!act) break;
      const maxPhase = (a === this.currentActIndex) ? this.currentPhaseIndex : (act.phases.length - 1);
      for (let p = 0; p <= maxPhase; p++) {
        this._mergeContentGates(act.phases[p]);
      }
    }

    // Restore active quests (lazy — create graphs from save data)
    this.activeQuests.clear();
    for (const qSave of data.activeQuests ?? []) {
      QuestGraph.loadFromFile(this.campaignId, qSave.questId)
        .then(graph => {
          graph.restoreFromSave(qSave);
          this.activeQuests.set(qSave.questId, graph);
        })
        .catch(err => log.warn('quest restore failed', { questId: qSave.questId, err: err.message }));
    }

    EventBus.emit(EventTypes.CAMPAIGN_RESTORED, {
      campaignId: this.campaignId,
      actId: this._currentAct()?.id,
      phaseId: this.getCurrentPhase()?.id
    });
    log.info('save data restored', { act: this.currentActIndex, phase: this.currentPhaseIndex });
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _currentAct() {
    return this.campaignData?.acts?.[this.currentActIndex] ?? null;
  }

  _bindEvents() {
    EventBus.on(EventTypes.COMBAT_ENCOUNTER_COMPLETE, e => this._onEncounterComplete(e.detail));
    EventBus.on(EventTypes.PLAYER_FLOOR_CLEARED, e => this._onFloorCleared(e.detail));
    EventBus.on(EventTypes.QUEST_OBJECTIVE_COMPLETED, e => this._onObjectiveCompleted(e.detail));
    EventBus.on(EventTypes.NARRATIVE_KNOT_REACHED, e => {
      this._lastEventPayload = { eventName: EventTypes.NARRATIVE_KNOT_REACHED, ...e.detail };
      this._scheduleExitCheck();
    });
  }

  _activatePhase(actIndex, phaseIndex) {
    // Only a genuine phase change has exit flags — skip on first activation (same indices)
    const isTransition = actIndex !== this.currentActIndex || phaseIndex !== this.currentPhaseIndex;
    const previousPhase = isTransition ? this.getCurrentPhase() : null;

    if (previousPhase) {
      for (const flag of previousPhase.worldFlags?.setOnExit ?? []) {
        this.worldFlags.add(flag);
      }
    }

    this.currentActIndex = actIndex;
    this.currentPhaseIndex = phaseIndex;
    const phase = this.getCurrentPhase();
    if (!phase) {
      log.warn('_activatePhase: phase not found', { actIndex, phaseIndex });
      return;
    }

    // Apply entry flags
    for (const flag of phase.worldFlags?.setOnEntry ?? []) {
      this.worldFlags.add(flag);
    }

    this._mergeContentGates(phase);

    EventBus.emit(EventTypes.CAMPAIGN_PHASE_CHANGED, {
      actId: this._currentAct()?.id,
      phaseId: phase.id,
      previousPhaseId: previousPhase?.id ?? null
    });
    log.info('phase activated', { actIndex, phaseIndex, phaseId: phase.id });
  }

  _mergeContentGates(phase) {
    if (!phase?.contentGates) return;
    for (const [type, ids] of Object.entries(phase.contentGates)) {
      if (this.availableContent[type]) {
        for (const id of ids) this.availableContent[type].add(id);
      }
    }
  }

  _scheduleExitCheck() {
    if (this._checkScheduled) return;
    this._checkScheduled = true;
    // Defer to next microtask to batch multiple simultaneous triggers
    Promise.resolve().then(() => {
      this._checkScheduled = false;
      this._checkPhaseExitConditions();
    });
  }

  _checkPhaseExitConditions() {
    const phase = this.getCurrentPhase();
    if (!phase) return;
    for (const trigger of phase.exitTriggers ?? []) {
      if (this._evaluateTrigger(trigger)) {
        this._advancePhase();
        return;
      }
    }
  }

  _advancePhase() {
    const act = this._currentAct();
    if (!act) return;
    if (this.currentPhaseIndex + 1 < act.phases.length) {
      this._activatePhase(this.currentActIndex, this.currentPhaseIndex + 1);
    } else if (this.currentActIndex + 1 < (this.campaignData?.acts?.length ?? 0)) {
      this._activatePhase(this.currentActIndex + 1, 0);
    } else {
      EventBus.emit(EventTypes.CAMPAIGN_COMPLETE, { campaignId: this.campaignId });
      log.info('campaign complete', { campaignId: this.campaignId });
    }
  }

  _evaluateTrigger(trigger) {
    switch (trigger.type) {
      case 'event': {
        if (!this._lastEventPayload) return false;
        if (this._lastEventPayload.eventName !== trigger.eventName) return false;
        for (const [k, v] of Object.entries(trigger.eventPayload ?? {})) {
          if (this._lastEventPayload[k] !== v) return false;
        }
        return true;
      }
      case 'flag':
        return this.worldFlags.has(trigger.flag);
      case 'variable': {
        const val = this.campaignVariables[trigger.key];
        switch (trigger.operator ?? 'eq') {
          case 'eq':  return val === trigger.value;
          case 'neq': return val !== trigger.value;
          case 'gt':  return val > trigger.value;
          case 'gte': return val >= trigger.value;
          case 'lt':  return val < trigger.value;
          case 'lte': return val <= trigger.value;
        }
        return false;
      }
      case 'quest_complete':
        return this.completedQuests.has(trigger.questId);
      default:
        log.warn('unknown trigger type', { type: trigger.type });
        return false;
    }
  }

  _onEncounterComplete(payload) {
    this._lastEventPayload = { eventName: EventTypes.COMBAT_ENCOUNTER_COMPLETE, ...payload };
    this._scheduleExitCheck();
  }

  _onFloorCleared(payload) {
    this._lastEventPayload = { eventName: EventTypes.PLAYER_FLOOR_CLEARED, ...payload };
    this._scheduleExitCheck();
  }

  _onObjectiveCompleted(payload) {
    const { questId } = payload;
    const graph = this.activeQuests.get(questId);
    if (graph?.isComplete) this.completeQuest(questId);
    this._scheduleExitCheck();
  }
}
