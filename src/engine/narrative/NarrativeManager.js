/**
 * NarrativeManager - inkjs bridge for Ink narrative scripts
 * Loads compiled .ink JSON, manages story state, binds game variables, processes tags.
 * Requires inkjs loaded via CDN (window.inkjs.Story).
 */

import { EventBus, EventTypes } from '../core/EventBus.js';
import { Logger } from '../utils/Logger.js';

const log = Logger.tag('Narrative');

export class NarrativeManager {
  constructor(campaignManager, party, inventorySystem) {
    this.campaignManager = campaignManager;
    this.party = party;
    this.inventorySystem = inventorySystem;

    this.story = null;
    this.currentStoryId = null;
    this.currentKnot = null;
    this.bindings = [];
    this.isNarrativeActive = false;
    this._themeId = null;

    this._tagHandlers = this._buildTagHandlers();
    this._bindEvents();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Load a compiled Ink JSON story.
   * @param {string} storyId - filename without extension (e.g. "intro")
   * @param {string|null} startingKnot
   */
  async loadStory(storyId, startingKnot = null) {
    if (!this._inkAvailable()) {
      log.warn('inkjs not loaded — narrative unavailable');
      return;
    }
    try {
      const storyPath = `narratives/${this._themeId ?? 'crypt-of-shadows'}/${storyId}.json`;
      const response = await fetch(storyPath, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Story file not found: ${storyPath}`);
      const storyJson = await response.json();

      this.story = new window.inkjs.Story(storyJson);
      this.currentStoryId = storyId;
      this.currentKnot = startingKnot;

      if (startingKnot) {
        this.story.ChoosePathString(startingKnot);
      }

      await this._loadBindings();
      this._syncGameStateToInk();

      this.isNarrativeActive = true;
      EventBus.emit(EventTypes.NARRATIVE_STORY_LOADED, { storyId, startingKnot });
      log.info('story loaded', { storyId, startingKnot });
    } catch (err) {
      log.warn('loadStory failed', { storyId, err: err.message });
    }
  }

  /**
   * Advance story one step. Returns line object or null if nothing more to show.
   * Call repeatedly until hasChoices or text is null.
   */
  continue() {
    if (!this.story) return null;

    if (this.story.canContinue) {
      const text = this.story.Continue();
      const tags = this.story.currentTags ?? [];
      this._processTags(tags);

      // Tag-only lines (empty text) are inkjs tag containers — skip to next line
      if (text.trim() === '' && this.story.canContinue) {
        return this.continue();
      }

      const lineResult = {
        text: text.trim(),
        tags,
        hasChoices: false,
        choices: []
      };

      EventBus.emit(EventTypes.NARRATIVE_LINE_READY, lineResult);
      return lineResult;
    }

    if (this.story.currentChoices.length > 0) {
      const choiceResult = {
        text: null,
        tags: [],
        hasChoices: true,
        choices: this.story.currentChoices.map(c => ({ text: c.text, index: c.index }))
      };
      EventBus.emit(EventTypes.NARRATIVE_CHOICES_READY, choiceResult);
      return choiceResult;
    }

    // Story exhausted
    this._onStoryComplete();
    return null;
  }

  chooseChoice(choiceIndex) {
    if (!this.story) return null;
    if (choiceIndex < 0 || choiceIndex >= this.story.currentChoices.length) {
      throw new Error(`chooseChoice: index ${choiceIndex} out of bounds`);
    }
    const choiceText = this.story.currentChoices[choiceIndex].text;
    this.story.ChooseChoiceIndex(choiceIndex);
    this._syncInkToGameState();
    EventBus.emit(EventTypes.NARRATIVE_CHOICE_MADE, { choiceIndex, choiceText });
    return this.continue();
  }

  jumpToKnot(knotName) {
    if (!this.story) return;
    this.story.ChoosePathString(knotName);
    this.currentKnot = knotName;
    EventBus.emit(EventTypes.NARRATIVE_KNOT_CHANGED, { knotName });
  }

  getVariable(inkVarName) {
    return this.story?.variablesState?.[inkVarName];
  }

  setVariable(inkVarName, value) {
    if (!this.story) return;
    this.story.variablesState[inkVarName] = value;
    EventBus.emit(EventTypes.NARRATIVE_VARIABLE_SET, { inkVarName, value });
  }

  isStoryComplete() {
    if (!this.story) return true;
    return !this.story.canContinue && this.story.currentChoices.length === 0;
  }

  skip() {
    if (!this.story) return;
    // Fast-forward: advance until next choice point or story end
    while (this.story.canContinue) {
      const result = this.continue();
      if (result?.hasChoices || !result) break;
    }
  }

  setTheme(themeId) {
    this._themeId = themeId;
  }

  getSaveData() {
    return {
      currentStoryId: this.currentStoryId,
      currentKnot: this.currentKnot
    };
  }

  async loadSaveData(data) {
    if (!data?.currentStoryId) return;
    await this.loadStory(data.currentStoryId, data.currentKnot ?? null);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _inkAvailable() {
    return typeof window !== 'undefined' && window.inkjs && window.inkjs.Story;
  }

  _bindEvents() {
    EventBus.on(EventTypes.CAMPAIGN_PHASE_CHANGED, e => this._onPhaseChanged(e.detail));
    EventBus.on(EventTypes.NPC_DIALOGUE_STARTED, e => this._onDialogueStarted(e.detail));
  }

  async _loadBindings() {
    try {
      const bindingsPath = `narratives/${this._themeId ?? 'crypt-of-shadows'}/bindings.json`;
      const response = await fetch(bindingsPath, { cache: 'no-cache' });
      if (!response.ok) { this.bindings = []; return; }
      const data = await response.json();
      this.bindings = data.bindings ?? [];
    } catch {
      this.bindings = [];
    }
  }

  _syncGameStateToInk() {
    if (!this.story) return;
    for (const binding of this.bindings) {
      try {
        const value = this._resolveBinding(binding);
        if (value !== undefined) {
          this.story.variablesState[binding.inkVar] = value;
        }
      } catch (err) {
        log.warn('binding sync failed', { inkVar: binding.inkVar, err: err.message });
      }
    }
  }

  _syncInkToGameState() {
    if (!this.story) return;
    for (const binding of this.bindings) {
      if (binding.type !== 'campaignVariable' && binding.type !== 'campaignFlag') continue;
      try {
        const value = this.story.variablesState[binding.inkVar];
        if (value === undefined) continue;
        if (binding.type === 'campaignVariable') {
          this.campaignManager?.setCampaignVariable(binding.key, value);
        } else if (binding.type === 'campaignFlag') {
          this.campaignManager?.setWorldFlag(binding.flag, !!value);
        }
      } catch (err) {
        log.warn('reverse binding failed', { inkVar: binding.inkVar, err: err.message });
      }
    }
  }

  _resolveBinding(binding) {
    switch (binding.type) {
      case 'character': {
        const parts = binding.path.split('.');
        let obj = this.party;
        for (const part of parts) { if (obj == null) return undefined; obj = obj[part]; }
        return obj;
      }
      case 'inventory':
        return this.inventorySystem?.hasItem?.(binding.itemId) ?? false;
      case 'campaignFlag':
        return this.campaignManager?.getWorldFlag(binding.flag) ?? false;
      case 'campaignVariable':
        return this.campaignManager?.getCampaignVariable(binding.key);
      default:
        return undefined;
    }
  }

  _processTags(tags) {
    for (const tag of tags) {
      const colonIdx = tag.indexOf(':');
      const prefix = colonIdx >= 0 ? tag.slice(0, colonIdx) : tag;
      const payload = colonIdx >= 0 ? tag.slice(colonIdx + 1) : '';
      const handler = this._tagHandlers[prefix];
      if (handler) {
        handler(payload);
      } else {
        log.warn('unknown tag', { tag });
      }
    }
  }

  _buildTagHandlers() {
    return {
      give_item: payload => {
        const [itemId, qty] = payload.split(':');
        this.inventorySystem?.addItem?.(itemId, parseInt(qty ?? '1', 10));
      },
      remove_item: payload => {
        const [itemId, qty] = payload.split(':');
        this.inventorySystem?.removeItem?.(itemId, parseInt(qty ?? '1', 10));
      },
      give_xp: payload => {
        const amount = parseInt(payload, 10);
        const leader = this._getLeader();
        if (leader && !isNaN(amount)) leader.addExperience?.(amount);
      },
      set_flag: payload => {
        this.campaignManager?.setWorldFlag(payload, true);
      },
      clear_flag: payload => {
        this.campaignManager?.setWorldFlag(payload, false);
      },
      set_variable: payload => {
        const [key, value] = payload.split(':');
        // Try to parse numeric/bool values
        let parsed = value;
        if (value === 'true') parsed = true;
        else if (value === 'false') parsed = false;
        else if (!isNaN(Number(value))) parsed = Number(value);
        this.campaignManager?.setCampaignVariable(key, parsed);
      },
      start_quest: payload => {
        this.campaignManager?.startQuest(payload).catch(err => log.warn('start_quest tag failed', { err: err.message }));
      },
      advance_quest: payload => {
        const [questId, nodeId] = payload.split(':');
        this.campaignManager?.advanceQuestObjective(questId, nodeId);
      },
      complete_quest: payload => {
        this.campaignManager?.completeQuest(payload);
      },
      spawn_npc: payload => {
        EventBus.emit(EventTypes.NPC_SPAWN_REQUEST, { npcId: payload });
      },
      despawn_npc: payload => {
        EventBus.emit(EventTypes.NPC_DESPAWN_REQUEST, { npcId: payload });
      },
      play_music: payload => {
        EventBus.emit(EventTypes.AUDIO_PLAY_MUSIC, { trackId: payload });
      },
      play_sfx: payload => {
        EventBus.emit(EventTypes.AUDIO_PLAY_SFX, { sfxId: payload });
      },
      knot_reached: payload => {
        this.currentKnot = payload;
        EventBus.emit(EventTypes.NARRATIVE_KNOT_REACHED, { knot: payload });
      },
      end: () => {
        this._onStoryComplete();
      }
    };
  }

  _onStoryComplete() {
    this.isNarrativeActive = false;
    EventBus.emit(EventTypes.NARRATIVE_STORY_COMPLETE, { storyId: this.currentStoryId });
    EventBus.emit(EventTypes.NARRATIVE_DIALOGUE_COMPLETE, { storyId: this.currentStoryId });
    log.info('story complete', { storyId: this.currentStoryId });
  }

  _onPhaseChanged({ actId, phaseId }) {
    const phase = this.campaignManager?.getCurrentPhase();
    if (!phase?.autoPlayStory && !phase?.autoPlayKnot) return;
    const storyId = phase.autoPlayStory ?? this.currentStoryId;
    if (storyId) {
      this.loadStory(storyId, phase.autoPlayKnot);
    }
  }

  _onDialogueStarted({ npcId, dialogueKnot, dialogueStory }) {
    const storyId = dialogueStory ?? npcId;
    this.loadStory(storyId, dialogueKnot).then(() => {
      EventBus.emit(EventTypes.NARRATIVE_DIALOGUE_READY, { npcId, dialogueKnot });
    });
  }

  _getLeader() {
    return this.party?.getLeader?.() ?? this.party?.getAliveMembers?.()[0] ?? null;
  }
}
