/**
 * Structured logger with tags, levels, and in-memory buffer.
 *
 * Usage:
 *   import { Logger, LogLevel } from './utils/Logger.js';
 *   const log = Logger.tag('Movement');
 *   log.debug('forward', { from, to });
 *
 * Runtime control (browser console):
 *   Logger.setLevel(LogLevel.DEBUG)
 *   Logger.enable('Input', 'Movement')           // whitelist
 *   Logger.setTagLevel('Combat', LogLevel.WARN)  // per-tag threshold
 *   copy(Logger.asText({ tag: 'Movement' }))     // dump filtered to clipboard
 */

export const LogLevel = Object.freeze({
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 99,
});

const LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

class _Logger {
  constructor() {
    this.globalLevel = LogLevel.INFO;
    this.tagLevels = new Map();
    this.enabledTags = null;
    this.buffer = [];
    this.bufferMax = 2000;
    this.sinkConsole = true;
    this._tagCache = new Map();
  }

  setLevel(level) { this.globalLevel = level; }
  setTagLevel(tag, level) { this.tagLevels.set(tag, level); }
  enable(...tags) { this.enabledTags = new Set(tags); }
  enableAll() { this.enabledTags = null; }
  silence(tag) { this.tagLevels.set(tag, LogLevel.SILENT); }
  setConsoleSink(on) { this.sinkConsole = !!on; }
  setBufferMax(n) { this.bufferMax = n; }

  tag(tagName) {
    let api = this._tagCache.get(tagName);
    if (api) return api;
    api = {
      debug: (...a) => this._log(LogLevel.DEBUG, tagName, a),
      info:  (...a) => this._log(LogLevel.INFO,  tagName, a),
      warn:  (...a) => this._log(LogLevel.WARN,  tagName, a),
      error: (...a) => this._log(LogLevel.ERROR, tagName, a),
    };
    this._tagCache.set(tagName, api);
    return api;
  }

  _log(level, tag, args) {
    const threshold = this.tagLevels.has(tag) ? this.tagLevels.get(tag) : this.globalLevel;
    if (level < threshold) return;
    if (this.enabledTags && !this.enabledTags.has(tag)) return;

    const entry = { t: performance.now(), level, tag, args };
    this.buffer.push(entry);
    if (this.buffer.length > this.bufferMax) this.buffer.shift();

    if (this.sinkConsole) {
      const prefix = `[${tag}]`;
      const fn = level === LogLevel.ERROR ? console.error
               : level === LogLevel.WARN  ? console.warn
               : level === LogLevel.DEBUG ? console.debug
               : console.log;
      fn(prefix, ...args);
    }
  }

  dump(filter = {}) {
    let out = this.buffer;
    if (filter.tag) out = out.filter(e => e.tag === filter.tag);
    if (filter.minLevel !== undefined) out = out.filter(e => e.level >= filter.minLevel);
    if (filter.sinceMs !== undefined) {
      const cutoff = performance.now() - filter.sinceMs;
      out = out.filter(e => e.t >= cutoff);
    }
    return out;
  }

  clear() { this.buffer = []; }

  asText(filter) {
    return this.dump(filter).map(e => {
      const lvl = LEVEL_NAMES[e.level] || 'LOG';
      const body = e.args.map(a => {
        if (a == null) return String(a);
        if (typeof a === 'object') {
          try { return JSON.stringify(a); }
          catch { return '[unserializable]'; }
        }
        return String(a);
      }).join(' ');
      return `[${e.t.toFixed(0)}ms] [${lvl}] [${e.tag}] ${body}`;
    }).join('\n');
  }

  stats() {
    const byTag = {};
    const byLevel = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0 };
    for (const e of this.buffer) {
      byTag[e.tag] = (byTag[e.tag] || 0) + 1;
      byLevel[LEVEL_NAMES[e.level]]++;
    }
    return { total: this.buffer.length, byTag, byLevel };
  }
}

export const Logger = new _Logger();

if (typeof window !== 'undefined') {
  window.Logger = Logger;
  window.LogLevel = LogLevel;
}
