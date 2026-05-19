// UIRouter - centralized screen stack manager.
// Screens are overlays; exploration is the implicit base (empty stack = movement enabled).
// Pushing a screen hides the previous one; popping resumes it.
import { Logger } from '../utils/Logger.js';

const log = Logger.tag('UI:Router');

export class UIRouter {
  constructor() {
    this.screens = new Map(); // name → { show, hide }
    this._stack = [];
  }

  get current() {
    return this._stack.length > 0 ? this._stack[this._stack.length - 1] : null;
  }

  // Register a named screen with show/hide callbacks.
  register(name, { show, hide }) {
    this.screens.set(name, { show, hide });
  }

  // Push a new screen on top. Hides the previous top.
  push(name) {
    if (this.current === name) return;
    const prev = this.screens.get(this.current);
    if (prev) prev.hide();
    this._stack.push(name);
    const next = this.screens.get(name);
    if (next) next.show();
    log.info(`push → ${name}`);
    this._dispatch(name, 'show');
  }

  // Close and remove the top screen. Resumes the one below.
  pop() {
    if (this._stack.length === 0) return;
    const leaving = this._stack.pop();
    const leaver = this.screens.get(leaving);
    if (leaver) leaver.hide();
    const prev = this.current;
    if (prev) {
      const resume = this.screens.get(prev);
      if (resume) resume.show();
    }
    log.info(`pop ← ${leaving} → ${prev ?? 'exploration'}`);
    this._dispatch(leaving, 'hide');
  }

  // Replace top without keeping it in the back-stack.
  replace(name) {
    if (this._stack.length > 0) {
      const leaving = this._stack.pop();
      const leaver = this.screens.get(leaving);
      if (leaver) leaver.hide();
    }
    this._stack.push(name);
    const next = this.screens.get(name);
    if (next) next.show();
    log.info(`replace → ${name}`);
  }

  // Toggle: push if not current, pop if current.
  toggle(name) {
    if (this.current === name) this.pop();
    else this.push(name);
  }

  // Close all open screens (return to exploration).
  // Hides each screen without re-showing intermediates — avoids flash during boot transitions.
  closeAll() {
    while (this._stack.length > 0) {
      const leaving = this._stack.pop();
      const leaver  = this.screens.get(leaving);
      if (leaver) leaver.hide();
    }
    log.info('closeAll → exploration');
  }

  isActive(name) { return this.current === name; }
  isOpen(name)   { return name ? this._stack.includes(name) : this._stack.length > 0; }

  // Pop a specific named screen regardless of stack position (removes first match from top).
  popNamed(name) {
    const idx = this._stack.lastIndexOf(name);
    if (idx < 0) return;
    this._stack.splice(idx, 1);
    const screen = this.screens.get(name);
    if (screen) screen.hide();
    // If removed from top, resume new top
    if (idx === this._stack.length && this.current) {
      const resume = this.screens.get(this.current);
      if (resume) resume.show();
    }
    log.info(`popNamed ← ${name}`);
    this._dispatch(name, 'hide');
  }

  _dispatch(name, action) {
    window.dispatchEvent(new CustomEvent('uiRouterChange', {
      detail: { screen: name, action, stack: [...this._stack] }
    }));
  }
}
