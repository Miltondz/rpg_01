/**
 * ResolutionManager — fixed canvas resolution with preset picker.
 *
 * Sets canvas CSS size + Three.js renderer buffer size together.
 * Persists choice to localStorage. Default: 1024×768.
 *
 * Usage:
 *   const rm = new ResolutionManager(renderer);
 *   rm.initialize();                        // apply saved/default resolution
 *   rm.apply(1280, 720);                    // change resolution
 *   rm.getPresets()                         // [{label, w, h}, ...]
 *   rm.getCurrent()                         // {label, w, h}
 */

import { Logger } from '../utils/Logger.js';

const log = Logger.tag('Resolution');

export class ResolutionManager {
  static PRESETS = [
    { label: '1280×720',  w: 1280, h: 720  },
    { label: '1366×768',  w: 1366, h: 768  },
    { label: '1600×900',  w: 1600, h: 900  },
    { label: '1920×1080', w: 1920, h: 1080 },
    { label: '1024×768',  w: 1024, h: 768  },
    { label: '800×600',   w: 800,  h: 600  },
  ];
  static DEFAULT_LABEL = '1280×720';
  static STORAGE_KEY   = 'darkbit_resolution_v2';

  constructor(renderer) {
    this._renderer = renderer;
    this._current  = null;
  }

  initialize() {
    const saved = this._load();
    this.apply(saved.w, saved.h, false); // false = don't re-save (already loaded)
    log.info(`initialized ${saved.w}×${saved.h}`);
  }

  /** Apply a resolution. Updates CSS + Three.js buffer + camera aspect. */
  apply(w, h, persist = true) {
    this._current = this._matchPreset(w, h) ?? { label: `${w}×${h}`, w, h };

    // Update game-container CSS size
    const container = document.getElementById('game-container');
    if (container) {
      container.style.width  = `${w}px`;
      container.style.height = `${h}px`;
    }

    // Update canvas CSS size (canvas fills container via 100%)
    const canvas = this._renderer.canvas;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;

    // Update Three.js render buffer
    this._renderer.renderer.setSize(w, h);
    this._renderer.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Update camera aspect ratio
    const cam = this._renderer.camera;
    if (cam) {
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }

    if (persist) {
      try { localStorage.setItem(ResolutionManager.STORAGE_KEY, `${w}x${h}`); } catch { /**/ }
    }

    window.dispatchEvent(new CustomEvent('resolutionChanged', { detail: { w, h } }));
    log.info(`applied ${w}×${h}`);
  }

  getCurrent() { return { ...this._current }; }
  getPresets() { return ResolutionManager.PRESETS; }

  // ── Private ──────────────────────────────────────────────────────────────

  _load() {
    try {
      const str = localStorage.getItem(ResolutionManager.STORAGE_KEY);
      if (str) {
        const [w, h] = str.split('x').map(Number);
        if (w > 0 && h > 0) return { w, h };
      }
    } catch { /**/ }
    return ResolutionManager.PRESETS.find(p => p.label === ResolutionManager.DEFAULT_LABEL)
        ?? ResolutionManager.PRESETS[1];
  }

  _matchPreset(w, h) {
    return ResolutionManager.PRESETS.find(p => p.w === w && p.h === h) ?? null;
  }
}
