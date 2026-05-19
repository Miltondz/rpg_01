/**
 * NPC - Entity class for non-player characters
 * Holds identity, position, dialogue config, and behavior state.
 */

import { EventBus, EventTypes } from '../core/EventBus.js';
import { NPCBehavior, NPCState } from './NPCBehavior.js';

export class NPC {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type ?? 'npc';
    this.faction = data.faction ?? null;
    this.isShopkeeper = data.isShopkeeper ?? false;
    this.portrait = data.portrait ?? null;

    // Grid position
    this.position = { x: data.position?.x ?? 0, z: data.position?.z ?? 0 };
    this.dungeonId = data.dungeonId ?? null;
    this.isAlive = true;

    // Dialogue config
    this.dialogueStory = data.dialogueStory ?? this.id;
    this.dialogueKnot = data.dialogueKnot ?? null;
    this.dialogueConditions = data.dialogueConditions ?? { knotOverrides: [] };

    // Behavior state machine
    this.behavior = new NPCBehavior(this);

    // Shop inventory (if shopkeeper)
    this.shopInventory = data.shopInventory ?? null;
  }

  /**
   * Resolve correct dialogue knot based on campaign flag conditions.
   * knotOverrides are checked in order; first match wins.
   */
  resolveDialogueKnot(campaignManager) {
    for (const override of this.dialogueConditions.knotOverrides ?? []) {
      if (this._checkCondition(override.condition, campaignManager)) {
        return override.knot;
      }
    }
    return this.dialogueKnot;
  }

  startDialogue(resolvedKnot) {
    if (!this.behavior.canInteract()) return false;
    this.behavior.transition(NPCState.INTERACTING);
    EventBus.emit(EventTypes.NPC_DIALOGUE_STARTED, {
      npcId: this.id,
      npcName: this.name,
      dialogueKnot: resolvedKnot,
      dialogueStory: this.dialogueStory
    });
    return true;
  }

  endDialogue() {
    if (this.behavior.isInteracting()) {
      this.behavior.transition(NPCState.IDLE);
    }
  }

  openShop() {
    if (!this.isShopkeeper || !this.behavior.canInteract()) return false;
    this.behavior.transition(NPCState.SHOP);
    EventBus.emit(EventTypes.NPC_SHOP_OPENED, {
      npcId: this.id,
      inventory: this.shopInventory
    });
    return true;
  }

  getSaveData() {
    return {
      id: this.id,
      gridPosition: { dungeonId: this.dungeonId, x: this.position.x, z: this.position.z },
      isAlive: this.isAlive,
      behaviorState: this.behavior.state
    };
  }

  _checkCondition(condition, campaignManager) {
    if (!campaignManager || !condition) return false;
    if (condition.flag) return campaignManager.getWorldFlag(condition.flag);
    if (condition.variable) {
      const val = campaignManager.getCampaignVariable(condition.variable.key);
      return val === condition.variable.value;
    }
    return false;
  }
}
