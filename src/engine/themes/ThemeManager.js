/**
 * ThemeManager — runtime theme system.
 *
 * Applies a theme object to:
 *   1. CSS custom properties on :root  (all --hud-*, --map-*, --combat-*, --ui-*, --body-*)
 *   2. Three.js scene lighting + fog   (via applyToRenderer)
 *   3. NavigationLight color           (via applyToNavLight)
 *
 * Usage:
 *   import { ThemeManager } from './engine/themes/ThemeManager.js';
 *   import { CryptTheme }   from './engine/themes/CryptTheme.js';
 *   ThemeManager.apply(CryptTheme);
 *   ThemeManager.applyToRenderer(rendererInstance);
 */

class ThemeManagerClass {
  constructor() {
    this._current    = null;
    this._fontLink   = null;
    this._listeners  = [];         // callbacks: fn(theme)
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Apply a theme object.  Idempotent — safe to call multiple times.
   * @param {object} theme  A theme definition (see CryptTheme.js for shape)
   */
  apply(theme) {
    this._current = theme;
    this._applyCSSVars(theme.css ?? {});
    if (theme.meta?.fontUrl) this._loadFont(theme.meta.fontUrl);
    this._notify(theme);
    return this;
  }

  /**
   * Apply renderer-specific settings (fog, lights).
   * Call after Renderer.initialize().
   * @param {object} rendererInstance   Renderer instance from src/engine/core/Renderer.js
   */
  applyToRenderer(rendererInstance) {
    if (!this._current?.renderer) return;
    const t = this._current.renderer;
    const r = rendererInstance;
    if (!r?.scene) return;

    // Fog
    if (r.scene.fog && t.fogColor !== undefined) {
      r.scene.fog.color.setHex(t.fogColor);
    }
    if (r.scene.fog?.density !== undefined && t.fogDensity !== undefined) {
      r.scene.fog.density = t.fogDensity;
    }

    // Ambient
    if (r.ambientLight && t.ambientColor !== undefined) {
      r.ambientLight.color.setHex(t.ambientColor);
    }
    if (r.ambientLight && t.ambientIntensity !== undefined) {
      r.ambientLight.intensity = t.ambientIntensity;
    }

    // Hemisphere
    if (r.hemisphereLight && t.hemiSkyColor !== undefined) {
      r.hemisphereLight.color.setHex(t.hemiSkyColor);
    }
    if (r.hemisphereLight && t.hemiGroundColor !== undefined) {
      r.hemisphereLight.groundColor.setHex(t.hemiGroundColor);
    }

    // Torch / point light
    if (r.pointLight && t.torchColor !== undefined) {
      r.pointLight.color.setHex(t.torchColor);
    }

    // Rim light
    if (r.rimLight && t.rimColor !== undefined) {
      r.rimLight.color.setHex(t.rimColor);
      if (t.rimIntensity !== undefined) r.rimLight.intensity = t.rimIntensity;
    }

    // Accent light
    if (r.accentLight && t.accentColor !== undefined) {
      r.accentLight.color.setHex(t.accentColor);
      if (t.accentIntensity !== undefined) r.accentLight.intensity = t.accentIntensity;
    }

    // WebGL clear color
    if (r.renderer && t.clearColor !== undefined) {
      r.renderer.setClearColor(t.clearColor, 1);
    }
  }

  /**
   * Apply torch color to a NavigationLight instance.
   * @param {NavigationLight} navLight
   */
  applyToNavLight(navLight) {
    if (!this._current?.renderer?.navLightColor) return;
    if (navLight?._light) {
      navLight._light.color.setHex(this._current.renderer.navLightColor);
    }
  }

  /**
   * Register a callback that fires whenever a theme is applied.
   * Used by UI classes that need to re-render canvas elements on theme change.
   */
  onChange(fn) {
    this._listeners.push(fn);
  }

  /** Currently active theme object, or null. */
  get current() { return this._current; }

  /**
   * Convenience: get a CSS var value from the current theme.
   * @param {string} varName  e.g. '--hud-pink'
   * @returns {string|undefined}
   */
  getVar(varName) {
    return this._current?.css?.[varName];
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _applyCSSVars(vars) {
    const root = document.documentElement;
    for (const [key, val] of Object.entries(vars)) {
      root.style.setProperty(key, val);
    }
  }

  _loadFont(url) {
    // Don't inject the same URL twice
    if (this._fontLink?.href === url) return;
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
    this._fontLink = link;
  }

  _notify(theme) {
    for (const fn of this._listeners) {
      try { fn(theme); } catch (e) { /* don't let listener crash theme apply */ }
    }
  }
}

export const ThemeManager = new ThemeManagerClass();
