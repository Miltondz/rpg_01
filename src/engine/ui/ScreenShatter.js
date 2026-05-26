import { Logger } from '../utils/Logger.js';

const log = Logger.tag('ScreenShatter');

/**
 * ScreenShatter — CSS Grid tile break-apart transition for combat enter/exit.
 *
 * Creates an NxM grid of divs that capture a screenshot-like snapshot
 * (via background-image: element()) or a solid colour approximation, then
 * animates each tile flying outward with staggered timing.
 *
 * Because element() is non-standard, we use a colour-slice approach:
 * each tile gets a background gradient slice tinted to a colour palette,
 * achieving a stylised (not photorealistic) shatter look.
 */
export class ScreenShatter {
  static COLS     = 8;
  static ROWS     = 6;
  static DURATION = 520;  // ms for each tile animation
  static STAGGER  = 18;   // ms additional delay per tile (spiral order)

  constructor() {
    this._container = null;
    this._tiles     = [];
    this._active    = false;
  }

  initialize() {
    if (this._container) return;
    this._createContainer();
    log.info('initialized');
  }

  /**
   * Play shatter-in (combat start): tiles fly in from edges, revealing the 3D scene.
   * @param {string} palette - 'dark'|'fire'|'ice'|'forest' etc.
   * @returns {Promise} resolves when animation completes
   */
  shatterIn(palette = 'dark') {
    if (this._active) return Promise.resolve();
    return this._play('in', palette);
  }

  /**
   * Play shatter-out (combat end): tiles fly out, restoring exploration view.
   * @param {string} palette
   * @returns {Promise}
   */
  shatterOut(palette = 'dark') {
    if (this._active) return Promise.resolve();
    return this._play('out', palette);
  }

  dispose() {
    this._container?.remove();
    this._container = null;
    this._tiles = [];
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _createContainer() {
    let el = document.getElementById('screen-shatter');
    if (!el) {
      el = document.createElement('div');
      el.id = 'screen-shatter';
      document.body.appendChild(el);
    }
    el.style.cssText = [
      'position:fixed', 'inset:0',
      'display:grid',
      `grid-template-columns:repeat(${ScreenShatter.COLS},1fr)`,
      `grid-template-rows:repeat(${ScreenShatter.ROWS},1fr)`,
      'pointer-events:none',
      'z-index:10000',
      'opacity:0',
    ].join(';');
    this._container = el;

    // Build tiles
    for (let r = 0; r < ScreenShatter.ROWS; r++) {
      for (let c = 0; c < ScreenShatter.COLS; c++) {
        const tile = document.createElement('div');
        tile.style.cssText = 'will-change:transform,opacity;';
        el.appendChild(tile);
        this._tiles.push({ el: tile, col: c, row: r });
      }
    }
  }

  _play(direction, palette) {
    return new Promise(resolve => {
      this._active = true;
      const colors = this._paletteColors(palette);

      // Colour each tile based on position
      this._tiles.forEach(({ el, col, row }) => {
        const t   = row / (ScreenShatter.ROWS - 1);
        const idx = Math.floor(t * (colors.length - 1));
        el.style.background = colors[idx];
      });

      // Spiral order for stagger (tiles near centre go first)
      const cx = (ScreenShatter.COLS - 1) / 2;
      const cy = (ScreenShatter.ROWS - 1) / 2;
      const sorted = [...this._tiles].sort((a, b) => {
        const da = Math.hypot(a.col - cx, a.row - cy);
        const db = Math.hypot(b.col - cx, b.row - cy);
        return direction === 'in' ? db - da : da - db;
      });

      // Show container
      this._container.style.opacity = '1';

      const totalTiles = sorted.length;
      let completed = 0;

      sorted.forEach((tile, i) => {
        const delay = i * ScreenShatter.STAGGER;
        const tx = (tile.col - cx) / cx;
        const ty = (tile.row - cy) / cy;

        setTimeout(() => {
          const el = tile.el;
          if (direction === 'in') {
            // Start off-screen, fly to position
            const ox = tx * window.innerWidth * 0.6;
            const oy = ty * window.innerHeight * 0.6;
            el.style.transform  = `translate(${ox}px,${oy}px) scale(0.3)`;
            el.style.opacity    = '0';
            el.style.transition = 'none';
            // Kick transition on next frame
            requestAnimationFrame(() => {
              el.style.transition = `transform ${ScreenShatter.DURATION}ms cubic-bezier(.22,1,.36,1), opacity ${ScreenShatter.DURATION * 0.4}ms ease`;
              el.style.transform  = 'translate(0,0) scale(1)';
              el.style.opacity    = '1';
            });
          } else {
            // Fly outward from position
            const ox = tx * window.innerWidth * 0.7;
            const oy = ty * window.innerHeight * 0.7;
            el.style.transform  = 'translate(0,0) scale(1)';
            el.style.opacity    = '1';
            el.style.transition = `transform ${ScreenShatter.DURATION}ms cubic-bezier(.55,0,1,.45), opacity ${ScreenShatter.DURATION * 0.5}ms ${ScreenShatter.DURATION * 0.5}ms ease`;
            requestAnimationFrame(() => {
              el.style.transform = `translate(${ox}px,${oy}px) scale(0.2)`;
              el.style.opacity   = '0';
            });
          }

          completed++;
          if (completed === totalTiles) {
            const settle = ScreenShatter.DURATION + 80;
            setTimeout(() => {
              // Smooth fade-out instead of instant cut — reveals combat UI cleanly
              this._container.style.transition = 'opacity 0.35s ease';
              this._container.style.opacity = '0';
              setTimeout(() => {
                this._container.style.transition = 'none';
                this._tiles.forEach(t => {
                  t.el.style.transition = 'none';
                  t.el.style.transform  = '';
                  t.el.style.opacity    = '';
                });
                this._active = false;
                resolve();
              }, 360);
            }, settle);
          }
        }, delay);
      });
    });
  }

  _paletteColors(palette) {
    const p = {
      dark:   ['#06030f', '#0d0520', '#150830', '#1e0a40'],
      fire:   ['#1a0200', '#2d0800', '#3d0e00', '#4a1400'],
      ice:    ['#010a18', '#021428', '#03203c', '#042a50'],
      forest: ['#010a03', '#021506', '#032008', '#042e0a'],
      cave:   ['#0a0805', '#15100a', '#201810', '#2a2015'],
    };
    return p[palette] ?? p.dark;
  }
}

export const screenShatter = new ScreenShatter();
