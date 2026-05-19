/**
 * NPCEngine - Manager for all NPC instances in the current dungeon
 * Handles: load, spawn/despawn, player proximity hints, interaction routing.
 */

import { EventBus, EventTypes } from '../core/EventBus.js';
import { NPC } from './NPC.js';
import { NPCRelationshipSystem } from './NPCRelationshipSystem.js';
import { Logger } from '../utils/Logger.js';

const log = Logger.tag('NPC');

export class NPCEngine {
  constructor(campaignManager, narrativeManager) {
    this.campaignManager = campaignManager;
    this.narrativeManager = narrativeManager;
    this.relationshipSystem = new NPCRelationshipSystem();

    this.npcs = new Map();           // npcId -> NPC
    this.positionIndex = new Map();  // "x,z" -> npcId
    this.currentDungeonId = null;

    this._bindEvents();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Load and spawn NPCs for a dungeon floor.
   * Fetches `npcs/<dungeonId>/npcs.json`, spawns NPCs whose campaignManager
   * content gate allows them.
   */
  async loadForDungeon(dungeonId) {
    this.currentDungeonId = dungeonId;
    this._despawnAll();

    try {
      const response = await fetch(`npcs/${dungeonId}/npcs.json`, { cache: 'no-cache' });
      if (!response.ok) {
        log.debug('no NPC file for dungeon', { dungeonId });
        return;
      }
      const data = await response.json();
      for (const npcData of data.npcs ?? []) {
        // Respect campaign content gates if defined
        const gated = this.campaignManager?.isContentAvailable('npcs', npcData.id) ?? true;
        // If campaign is not loaded yet, spawn all NPCs (fallback for test mode)
        const campaignLoaded = this.campaignManager?.campaignData !== null;
        if (!campaignLoaded || gated) {
          this._spawn({ ...npcData, dungeonId });
        }
      }
      log.info('NPCs loaded', { dungeonId, count: this.npcs.size });
    } catch (err) {
      log.warn('loadForDungeon failed', { dungeonId, err: err.message });
    }
  }

  /**
   * Returns NPC at exact grid position, or null.
   */
  getNPCAtPosition(x, z) {
    const id = this.positionIndex.get(`${x},${z}`);
    return id ? this.npcs.get(id) ?? null : null;
  }

  /**
   * Returns NPC adjacent (1 tile) to given position in given direction, or null.
   * dir: { x, z } offset (from Dir.forward())
   */
  getNPCFacing(playerX, playerZ, dirOffset) {
    return this.getNPCAtPosition(playerX + dirOffset.x, playerZ + dirOffset.z);
  }

  /**
   * Trigger interaction with NPC facing the player.
   * Returns true if interaction started, false if nothing happened.
   */
  interactWith(npc) {
    if (!npc || !npc.behavior.canInteract()) return false;

    if (npc.isShopkeeper) {
      return npc.openShop();
    }

    const knot = npc.resolveDialogueKnot(this.campaignManager);
    return npc.startDialogue(knot);
  }

  /**
   * Called when player moves — checks for adjacent NPCs and shows hint toast.
   */
  checkProximity(playerX, playerZ, debugUI = null) {
    // Check all 4 adjacent tiles
    const offsets = [{ x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }];
    for (const off of offsets) {
      const npc = this.getNPCAtPosition(playerX + off.x, playerZ + off.z);
      if (npc && npc.behavior.canInteract()) {
        debugUI?.showToast(`Press Space to speak with ${npc.name}`, 'info');
        return npc;
      }
    }
    return null;
  }

  getSaveData() {
    return {
      spawnedNpcs: [...this.npcs.values()].map(n => n.getSaveData()),
      relationshipSystem: this.relationshipSystem.getSaveData()
    };
  }

  loadSaveData(data) {
    if (data?.relationshipSystem) {
      this.relationshipSystem.loadSaveData(data.relationshipSystem);
    }
    // spawnedNpcs positions are restored when loadForDungeon is called
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _spawn(npcData) {
    const npc = new NPC(npcData);
    this.npcs.set(npc.id, npc);
    this.positionIndex.set(`${npc.position.x},${npc.position.z}`, npc.id);
    EventBus.emit(EventTypes.NPC_SPAWNED, {
      npcId: npc.id,
      dungeonId: this.currentDungeonId,
      position: { x: npc.position.x, z: npc.position.z }
    });
    log.debug('spawned', { npcId: npc.id, pos: npc.position });
  }

  _despawn(npcId) {
    const npc = this.npcs.get(npcId);
    if (!npc) return;
    this.positionIndex.delete(`${npc.position.x},${npc.position.z}`);
    this.npcs.delete(npcId);
    EventBus.emit(EventTypes.NPC_DESPAWNED, { npcId });
  }

  _despawnAll() {
    for (const id of [...this.npcs.keys()]) this._despawn(id);
  }

  _bindEvents() {
    // NarrativeManager tag #spawn_npc / #despawn_npc
    EventBus.on(EventTypes.NPC_SPAWN_REQUEST, e => {
      const { npcId } = e.detail;
      if (!this.npcs.has(npcId)) {
        log.warn('spawn_request: NPC not in roster', { npcId });
      }
      // Re-enable visibility (already spawned via loadForDungeon; tag just unhides)
    });
    EventBus.on(EventTypes.NPC_DESPAWN_REQUEST, e => {
      this._despawn(e.detail.npcId);
    });

    // Reset NPC to Idle when dialogue ends
    EventBus.on(EventTypes.NARRATIVE_DIALOGUE_COMPLETE, () => {
      for (const npc of this.npcs.values()) {
        if (npc.behavior.isInteracting()) npc.endDialogue();
      }
    });
    EventBus.on(EventTypes.NARRATIVE_STORY_COMPLETE, () => {
      for (const npc of this.npcs.values()) {
        if (npc.behavior.isInteracting()) npc.endDialogue();
      }
    });
  }
}
