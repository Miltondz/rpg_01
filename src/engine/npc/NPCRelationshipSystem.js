/**
 * NPCRelationshipSystem - Affinity and faction standing tracker
 * Affinity range: -100 (hostile) to 100 (devoted). Default: 0 (neutral).
 * Faction standings work the same way, keyed by faction name.
 */

import { EventBus, EventTypes } from '../core/EventBus.js';

export class NPCRelationshipSystem {
  constructor() {
    this.npcAffinities = new Map();    // npcId -> number
    this.factionStandings = new Map(); // faction -> number
    this.reputationLog = [];
  }

  getAffinity(npcId) {
    return this.npcAffinities.get(npcId) ?? 0;
  }

  changeAffinity(npcId, delta) {
    const current = this.getAffinity(npcId);
    const next = Math.max(-100, Math.min(100, current + delta));
    this.npcAffinities.set(npcId, next);
    this.reputationLog.push({ npcId, delta, timestamp: Date.now() });
    EventBus.emit(EventTypes.NPC_AFFINITY_CHANGED, { npcId, affinity: next, delta });
    return next;
  }

  getFactionStanding(faction) {
    return this.factionStandings.get(faction) ?? 0;
  }

  changeFactionStanding(faction, delta) {
    const current = this.getFactionStanding(faction);
    const next = Math.max(-100, Math.min(100, current + delta));
    this.factionStandings.set(faction, next);
    return next;
  }

  isHostile(npcId, faction = null) {
    if (this.getAffinity(npcId) <= -50) return true;
    if (faction && this.getFactionStanding(faction) <= -50) return true;
    return false;
  }

  isFriendly(npcId, faction = null) {
    if (this.getAffinity(npcId) >= 25) return true;
    if (faction && this.getFactionStanding(faction) >= 25) return true;
    return false;
  }

  getSaveData() {
    return {
      npcAffinities: Object.fromEntries(this.npcAffinities),
      factionStandings: Object.fromEntries(this.factionStandings),
      reputationLog: this.reputationLog.slice(-100) // keep last 100 entries
    };
  }

  loadSaveData(data) {
    this.npcAffinities = new Map(Object.entries(data.npcAffinities ?? {}));
    this.factionStandings = new Map(Object.entries(data.factionStandings ?? {}));
    this.reputationLog = data.reputationLog ?? [];
  }
}
