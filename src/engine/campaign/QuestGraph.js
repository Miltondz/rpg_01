/**
 * QuestGraph - Directed acyclic graph of quest objectives
 * CampaignManager owns lifecycle; QuestGraph owns objective progression.
 */

import { EventBus, EventTypes } from '../core/EventBus.js';

export class QuestGraph {
  constructor(questData) {
    this.questId = questData.id;
    this.title = questData.title;
    this.description = questData.description ?? '';
    this.nodes = new Map(); // nodeId -> node object
    this.currentNodeId = questData.startNode ?? null;
    this.completedNodes = new Set();
    this.isComplete = false;

    for (const node of questData.nodes ?? []) {
      this.nodes.set(node.id, node);
    }
  }

  getCurrentNode() {
    return this.nodes.get(this.currentNodeId) ?? null;
  }

  canAdvanceTo(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    const current = this.getCurrentNode();
    if (!current) return false;
    return (current.nextNodes ?? []).includes(nodeId);
  }

  advance(nodeId) {
    if (!this.canAdvanceTo(nodeId)) {
      console.warn(`QuestGraph: cannot advance to ${nodeId} from ${this.currentNodeId}`);
      return false;
    }
    this.completedNodes.add(this.currentNodeId);
    this.currentNodeId = nodeId;
    EventBus.emit(EventTypes.QUEST_OBJECTIVE_COMPLETED, {
      questId: this.questId,
      objectiveNodeId: nodeId
    });
    const node = this.getCurrentNode();
    if (!node || (node.nextNodes ?? []).length === 0) {
      this.isComplete = true;
    }
    return true;
  }

  getSaveData() {
    return {
      questId: this.questId,
      currentNodeId: this.currentNodeId,
      completedNodes: [...this.completedNodes]
    };
  }

  restoreFromSave(data) {
    this.currentNodeId = data.currentNodeId;
    this.completedNodes = new Set(data.completedNodes ?? []);
  }

  static async loadFromFile(campaignId, questId) {
    const response = await fetch(`campaigns/${campaignId}/quests/${questId}.json`);
    if (!response.ok) throw new Error(`Quest file not found: ${questId}`);
    const data = await response.json();
    return new QuestGraph(data);
  }
}
