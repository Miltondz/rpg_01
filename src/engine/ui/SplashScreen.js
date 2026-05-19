import { Logger } from '../utils/Logger.js';

const log = Logger.tag('UI:Splash');

export class SplashScreen {
  constructor() {
    this._el = null;
    this._canvas = null;
    this._ctx = null;
    this._animFrame = null;
    this._autoTimer = null;
    this._keyHandler = null;
    this._t = 0;
    this._done = false;
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.id = 'splash-screen';
    this._el.className = 'splash-screen hidden';

    this._canvas = document.createElement('canvas');
    this._canvas.className = 'splash-canvas';
    this._el.appendChild(this._canvas);
    document.body.appendChild(this._el);

    this._canvas.addEventListener('click', () => this._complete());
  }

  show() {
    this._done = false;
    this._t = 0;
    this._el.classList.remove('hidden');

    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
    this._ctx = this._canvas.getContext('2d');

    this._autoTimer = setTimeout(() => this._complete(), 5000);

    this._keyHandler = (e) => { e.preventDefault(); this._complete(); };
    document.addEventListener('keydown', this._keyHandler, { once: true });

    this._loop();
    log.info('Splash shown');
  }

  hide() {
    this._el.classList.add('hidden');
    this._stopLoop();
    if (this._autoTimer) { clearTimeout(this._autoTimer); this._autoTimer = null; }
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  }

  _complete() {
    if (this._done) return;
    this._done = true;
    this.hide();
    window.dispatchEvent(new CustomEvent('splashComplete'));
    log.info('Splash complete');
  }

  _stopLoop() {
    if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
  }

  _loop() {
    this._animFrame = requestAnimationFrame(() => this._loop());
    this._t += 0.016;
    this._draw();
  }

  _draw() {
    const ctx = this._ctx;
    const w   = this._canvas.width;
    const h   = this._canvas.height;
    const t   = this._t;

    // Black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Warm torch glow behind title
    const glowR = 0.28 + Math.sin(t * 2.9) * 0.06 + Math.sin(t * 7.1) * 0.03;
    const glow  = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.55);
    glow.addColorStop(0, `rgba(160,65,0,${glowR})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Vignette
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    vig.addColorStop(0.3, 'rgba(0,0,0,0)');
    vig.addColorStop(1,   'rgba(0,0,0,0.88)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    // Title — fade in first second
    const titleAlpha = Math.min(1, t / 1.0);
    const titleSize  = Math.max(28, Math.min(72, Math.floor(w / 14)));
    ctx.save();
    ctx.globalAlpha = titleAlpha;
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(210,110,0,0.9)';
    ctx.shadowBlur  = 18 + Math.sin(t * 1.8) * 6;
    ctx.font        = `bold ${titleSize}px 'Courier New', monospace`;
    ctx.fillStyle   = '#e8c060';
    ctx.fillText('CRYPT OF SHADOWS', w * 0.5, h * 0.38);

    // Subtitle
    ctx.shadowBlur  = 6;
    ctx.font        = `${Math.floor(titleSize * 0.32)}px 'Courier New', monospace`;
    ctx.fillStyle   = '#906035';
    ctx.fillText('A Dungeon Crawler', w * 0.5, h * 0.38 + titleSize * 0.95);
    ctx.restore();

    // Decorative separator line — draws in from center after 0.6s
    if (t > 0.6) {
      const lineAlpha   = Math.min(1, (t - 0.6) / 0.6);
      const lineHalfW   = Math.min(w * 0.4, 380) * Math.min(1, (t - 0.6) / 0.9);
      ctx.save();
      ctx.globalAlpha   = lineAlpha * 0.55;
      ctx.strokeStyle   = '#906035';
      ctx.lineWidth     = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - lineHalfW, h * 0.44);
      ctx.lineTo(w * 0.5 + lineHalfW, h * 0.44);
      ctx.stroke();
      ctx.restore();
    }

    // "PRESS ANY KEY" — appears at 1.8s, blinks
    if (t > 1.8) {
      const blinkA   = (Math.sin((t - 1.8) * 2.6) + 1) * 0.5;
      const fadeInA  = Math.min(1, (t - 1.8) / 0.6);
      ctx.save();
      ctx.globalAlpha = blinkA * fadeInA;
      ctx.textAlign   = 'center';
      ctx.shadowColor = 'rgba(0,200,0,0.6)';
      ctx.shadowBlur  = 8;
      ctx.font        = `${Math.floor(titleSize * 0.26)}px 'Courier New', monospace`;
      ctx.fillStyle   = '#00dd00';
      ctx.fillText('PRESS ANY KEY TO CONTINUE', w * 0.5, h * 0.62);
      ctx.restore();
    }

    // Version / copyright footer
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.textAlign   = 'center';
    ctx.font        = `${Math.floor(titleSize * 0.18)}px 'Courier New', monospace`;
    ctx.fillStyle   = '#505050';
    ctx.fillText('v0.1  —  © 2024', w * 0.5, h * 0.95);
    ctx.restore();
  }
}
