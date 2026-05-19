/**
 * NPCBehavior - State machine for NPC behavior
 * States: Idle, Interacting, Shop, Hostile, Dead
 */

import { EventBus, EventTypes } from '../core/EventBus.js';

export const NPCState = Object.freeze({
  IDLE: 'Idle',
  INTERACTING: 'Interacting',
  SHOP: 'Shop',
  HOSTILE: 'Hostile',
  DEAD: 'Dead'
});

export class NPCBehavior {
  constructor(npc) {
    this.npc = npc;
    this.state = NPCState.IDLE;
    this._validTransitions = {
      [NPCState.IDLE]:        [NPCState.INTERACTING, NPCState.SHOP, NPCState.HOSTILE, NPCState.DEAD],
      [NPCState.INTERACTING]: [NPCState.IDLE, NPCState.SHOP, NPCState.DEAD],
      [NPCState.SHOP]:        [NPCState.IDLE, NPCState.DEAD],
      [NPCState.HOSTILE]:     [NPCState.IDLE, NPCState.DEAD],
      [NPCState.DEAD]:        []
    };
  }

  transition(newState) {
    if (!this._validTransitions[this.state]?.includes(newState)) return false;
    const from = this.state;
    this.state = newState;
    EventBus.emit(EventTypes.NPC_STATE_CHANGED, { npcId: this.npc.id, from, to: newState });
    return true;
  }

  canInteract() { return this.state === NPCState.IDLE; }
  isInteracting() { return this.state === NPCState.INTERACTING; }
  isDead() { return this.state === NPCState.DEAD; }
}
