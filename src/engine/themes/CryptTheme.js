/**
 * CryptTheme — default "Crypts of Shadows" theme.
 *
 * Hot-pink / neon-green dungeon crawler aesthetic.
 * Reference: dark stone dungeon crawler with CRT feel.
 *
 * To create a custom theme, copy this file and change values.
 * All sections are optional — ThemeManager applies only what is present.
 */

export const CryptTheme = {

  // ── Identity ──────────────────────────────────────────────────────────────
  meta: {
    id:         'crypt',
    name:       'Crypts of Shadows',
    fontFamily: "'Press Start 2P', 'Courier New', monospace",
    fontUrl:    'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
  },

  // ── CSS custom properties ─────────────────────────────────────────────────
  // All properties are set on :root via document.documentElement.style.setProperty.
  // CSS selectors use var(--name) so any theme can override by replacing values here.
  css: {
    // ── HUD (exploration) ────────────────────────────────────────────────
    '--hud-pink':       '#FF0055',
    '--hud-pink-lt':    '#FF3377',
    '--hud-green':      '#00FF44',
    '--hud-dim':        '#550022',
    '--hud-bg':         'rgba(0, 0, 0, 0.90)',
    '--hud-border':     '1px solid #FF0055',
    '--hud-font':       "'Press Start 2P', 'Courier New', monospace",

    // ── Minimap ──────────────────────────────────────────────────────────
    '--map-bg':         '#0d0008',
    '--map-border':     '#1a0010',
    '--map-wall':       '#FF0055',
    '--map-wall-border':'#CC0044',
    '--map-floor':      '#220011',
    '--map-player':     '#00FF44',
    '--map-player-glow':'#00FF44',
    '--map-door':       '#FF9900',
    '--map-visited':    '#330018',
    '--map-transition': '#FF9900',

    // ── Combat ───────────────────────────────────────────────────────────
    '--combat-bg':          'rgba(0, 0, 0, 0.95)',
    '--combat-border':      '#FF0055',
    '--combat-border-dim':  '#550022',
    '--combat-accent':      '#FF3377',
    '--combat-hp-color':    '#FF0055',
    '--combat-hp-low':      '#FF0000',
    '--combat-hp-mid':      '#FF5500',
    '--combat-ap-color':    '#0088FF',
    '--combat-enemy-color': '#FF0055',
    '--combat-player-color':'#00FF44',
    '--combat-text-dmg':    '#ffffff',
    '--combat-text-crit':   '#ffd700',
    '--combat-text-heal':   '#60ff80',
    '--combat-text-miss':   '#888888',
    '--combat-targeting':   'rgba(255, 200, 60, 0.6)',
    '--combat-targeting-hover': 'rgba(255, 240, 80, 1)',

    // ── Inventory / Equipment ────────────────────────────────────────────
    '--inv-bg':         'rgba(0, 0, 0, 0.92)',
    '--inv-border':     '#FF0055',
    '--inv-text':       '#FF3377',
    '--inv-accent':     '#00FF44',
    '--inv-dim':        '#550022',
    '--inv-slot-bg':    '#0a0008',
    '--inv-slot-hover': '#1a0015',
    '--inv-rarity-c':   '#aaaaaa',  // common
    '--inv-rarity-u':   '#00ff88',  // uncommon
    '--inv-rarity-r':   '#4488ff',  // rare
    '--inv-rarity-e':   '#ff8800',  // epic
    '--inv-rarity-l':   '#ff0055',  // legendary

    // ── Shop ─────────────────────────────────────────────────────────────
    '--shop-bg':        'rgba(0, 0, 0, 0.93)',
    '--shop-border':    '#FF0055',
    '--shop-text':      '#FF3377',
    '--shop-gold':      '#FFD700',
    '--shop-available': '#00FF44',
    '--shop-expensive': '#FF5500',

    // ── Menus (main menu, pause, options) ────────────────────────────────
    '--menu-bg':        'rgba(0, 0, 0, 0.97)',
    '--menu-border':    '#FF0055',
    '--menu-title':     '#FF0055',
    '--menu-text':      '#FF3377',
    '--menu-text-dim':  '#550022',
    '--menu-hover':     '#00FF44',
    '--menu-selected':  '#FF0055',
    '--menu-glow':      '0 0 12px rgba(255, 0, 85, 0.6)',

    // ── Splash / loading screen ──────────────────────────────────────────
    '--splash-bg':      '#000000',
    '--splash-title':   '#FF0055',
    '--splash-sub':     '#FF3377',
    '--splash-bar':     '#FF0055',
    '--splash-bar-bg':  '#220011',

    // ── General UI (shared panels, dialogs, tooltips) ────────────────────
    '--ui-bg':          'rgba(0, 0, 0, 0.90)',
    '--ui-border':      '#FF0055',
    '--ui-text':        '#FF3377',
    '--ui-accent':      '#00FF44',
    '--ui-dim':         '#550022',
    '--ui-font':        "'Press Start 2P', 'Courier New', monospace",
    '--ui-glow-pink':   '0 0 8px rgba(255, 0, 85, 0.5)',
    '--ui-glow-green':  '0 0 8px rgba(0, 255, 68, 0.5)',

    // ── Body / global ────────────────────────────────────────────────────
    '--body-bg':        '#000000',
    '--body-text':      '#00ff00',
    '--body-font':      "'Courier New', monospace",

    // ── Event log type colors ────────────────────────────────────────────
    '--log-system':     '#FF3377',
    '--log-loot':       '#00FF44',
    '--log-danger':     '#FF0000',
    '--log-ambient':    '#550022',
  },

  // ── Three.js renderer settings ────────────────────────────────────────────
  renderer: {
    clearColor:       0x000000,

    // Fog — dark almost-black blue so distant tiles carry slight hue
    fogColor:         0x05050e,
    fogDensity:       0.055,      // FogExp2 density

    // Hemisphere light
    hemiSkyColor:     0x1c1c2e,
    hemiGroundColor:  0x05050a,
    hemiIntensity:    0.65,

    // Ambient fill
    ambientColor:     0x252538,
    ambientIntensity: 0.50,

    // Torch / point light on camera
    torchColor:       0xeef0cc,
    torchIntensity:   0.9,

    // Rim (electric cyan behind camera — digital corruption accent)
    rimColor:         0x00ffee,
    rimIntensity:     0.30,

    // Accent (neon magenta deep-shadow tint)
    accentColor:      0xff00cc,
    accentIntensity:  0.12,

    // NavigationLight (hand-held lantern, warm)
    navLightColor:    0xffd4a0,
  },

  // ── Hotbar slot definitions ───────────────────────────────────────────────
  // Replace to repurpose slots for a different game context.
  hotbar: [
    { key: '1', label: 'ATK',  sym: '⚔' },
    { key: '2', label: 'DEF',  sym: '🛡' },
    { key: '3', label: 'POT',  sym: '⚗' },
    { key: '4', label: 'JRN',  sym: '📜' },
    { key: '5', label: 'STS',  sym: '✦' },
    { key: '6', label: 'INV',  sym: '⊞' },
    { key: '7', label: 'BES',  sym: '⊠' },
    { key: '8', label: 'MNU',  sym: '≡' },
  ],

  // ── Canvas icon colors (used by ExplorationHUD for 2D-rendered elements) ─
  canvas: {
    iconFg:   '#FF3377',
    iconBg:   '#000000',
    barHp:    '#FF0055',
    barHpLow: '#FF0000',
    barHpMid: '#FF5500',
    barAp:    '#0088FF',
    portrait: null,     // null = use CharacterPortrait defaults
  },
};
