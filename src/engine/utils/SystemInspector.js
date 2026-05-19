/**
 * SystemInspector — live snapshot of every subsystem in the engine.
 *
 * Browser console usage:
 *   inspect()                       // full report (console.table) + returns obj
 *   inspectSystem('combatSystem')   // raw subsystem ref
 *   inspectEvents()                 // listener counts by event
 *   inspectLog({tag:'Movement'})    // text dump
 */

import { Logger } from './Logger.js';
import { EventBus } from '../core/EventBus.js';

export class SystemInspector {
  constructor(engine) {
    this.engine = engine;

    if (typeof window !== 'undefined') {
      window.inspect = () => this.report();
      window.inspectSystem = (name) => this.system(name);
      window.inspectEvents = () => EventBus.stats();
      window.inspectLog = (filter) => Logger.asText(filter);
    }
  }

  report() {
    const e = this.engine;
    const r = {
      boot: this._boot(),
      level: this._level(),
      player: this._player(),
      party: this._party(),
      inventory: this._inventory(),
      ui: this._ui(),
      perf: this._perf(),
      logs: { buffered: Logger.buffer.length, stats: Logger.stats() },
    };
    try {
      console.table(this._flatten(r));
    } catch {
      console.log(r);
    }
    return r;
  }

  _boot() {
    const e = this.engine;
    return {
      initialized: !!e.isInitialized,
      running: !!e.isRunning,
      frameCount: e.frameCount,
      fps: e.fps ? Math.round(e.fps) : 0,
    };
  }

  _level() {
    const dl = this.engine.dungeonLoader;
    const lvl = dl && dl.getCurrentLevel ? dl.getCurrentLevel() : null;
    if (!lvl) return { loaded: false };
    return {
      loaded: true,
      id: lvl.id,
      w: lvl.width,
      h: lvl.height,
      doors: (lvl.doors || []).length,
      transitions: (lvl.transitions || []).length,
    };
  }

  _player() {
    const mc = this.engine.movementController;
    if (!mc) return { ready: false };
    const pos = mc.getPosition();
    return {
      ready: true,
      x: pos.x,
      z: pos.z,
      dir: mc.getDirection(),
      animating: mc.getIsAnimating ? mc.getIsAnimating() : !!mc.isAnimating,
    };
  }

  _party() {
    const pm = this.engine.partyManager;
    if (!pm) return { ready: false };
    let size = 0;
    if (Array.isArray(pm.party)) size = pm.party.length;
    else if (typeof pm.getCharacters === 'function') size = (pm.getCharacters() || []).length;
    else if (typeof pm.getPartySize === 'function') size = pm.getPartySize();
    const gold = (typeof pm.getGold === 'function') ? pm.getGold() : (pm.gold || 0);
    return { ready: true, size, gold };
  }

  _inventory() {
    const inv = this.engine.inventorySystem;
    if (!inv) return { ready: false };
    const slots = inv.capacity || inv.size || (Array.isArray(inv.items) ? inv.items.length : 0);
    const used = Array.isArray(inv.items) ? inv.items.filter(Boolean).length : 0;
    return { ready: true, slots, used };
  }

  _ui() {
    const e = this.engine;
    return {
      debugUI:           !!e.debugUI,
      combatUI:          !!e.combatUI,
      combatUIManager:   !!e.combatUIManager,
      inventoryUI:       !!e.inventoryUI,
      equipmentUI:       !!e.equipmentUI,
      characterSheetUI:  !!e.characterSheetUI,
      shopUI:            !!e.shopUI,
      saveLoadUI:        !!e.saveLoadUI,
      partyCreationUI:   !!e.partyCreationUI,
    };
  }

  _perf() {
    const pm = this.engine.performanceManager;
    if (!pm || !pm.getPerformanceMetrics) return { ready: false };
    const m = pm.getPerformanceMetrics();
    return {
      ready: true,
      fps: m.fps != null ? Number(m.fps.toFixed(1)) : null,
      frameTimeMs: m.frameTime != null ? Number(m.frameTime.toFixed(2)) : null,
      memoryMB: m.memoryUsage != null ? Number(m.memoryUsage.toFixed(1)) : null,
    };
  }

  _flatten(obj, prefix = '') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        Object.assign(out, this._flatten(v, key));
      } else {
        out[key] = Array.isArray(v) ? v.join(',') : v;
      }
    }
    return out;
  }

  system(name) {
    return this.engine ? this.engine[name] : undefined;
  }
}
