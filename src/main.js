/**
 * Main entry point for the Dungeon Crawler Engine
 * Sets up the core systems and initializes the game
 */

// Import core engine components
import { GridSystem } from './engine/core/GridSystem.js';
import { Renderer } from './engine/core/Renderer.js';
import { InputManager } from './engine/managers/InputManager.js';
import { MovementController } from './engine/managers/MovementController.js';
import { GameLoopManager } from './engine/managers/GameLoopManager.js';
import { CollisionSystem } from './engine/systems/CollisionSystem.js';
import { DoorSystem } from './engine/systems/DoorSystem.js';
import { TransitionSystem } from './engine/systems/TransitionSystem.js';
import { DungeonLoader } from './engine/loaders/DungeonLoader.js';
import { GeometryFactory } from './engine/utils/GeometryFactory.js';
import { DebugUI } from './engine/ui/DebugUI.js';
import { PerformanceManager } from './engine/performance/PerformanceManager.js';

// Diagnostic infrastructure
import { Logger, LogLevel } from './engine/utils/Logger.js';
import { SystemInspector } from './engine/utils/SystemInspector.js';
import { EventBus, EventTypes } from './engine/core/EventBus.js';
import { Dir } from './engine/core/Direction.js';

// Import performance systems
import { PerformanceOptimizer } from './engine/performance/PerformanceOptimizer.js';
import { MemoryManager } from './engine/performance/MemoryManager.js';
import { PerformanceTester } from './engine/performance/PerformanceTester.js';

// Import game systems
import { CombatSystem } from './engine/combat/CombatSystem.js';
import { PartyManager } from './engine/character/PartyManager.js';
import { CharacterSystem } from './engine/character/CharacterSystem.js';
import { SaveSystem } from './engine/save/SaveSystem.js';
import { AutoSaveManager } from './engine/save/AutoSaveManager.js';
import { shopSystem } from './engine/shop/ShopSystem.js';
import { lootSystem } from './engine/loot/LootSystem.js';
import { InventorySystem } from './engine/inventory/InventorySystem.js';
import { itemDatabase } from './engine/inventory/ItemDatabase.js';
import { enemyDatabase } from './engine/data/EnemyDatabase.js';
import { EncounterSystem } from './engine/systems/EncounterSystem.js';
import { HitFlashSystem } from './engine/combat/HitFlashSystem.js';
import { ScreenShake } from './engine/core/ScreenShake.js';
import { combatTextManager } from './engine/ui/CombatTextManager.js';
import { TargetingOverlay } from './engine/ui/TargetingOverlay.js';
import { BattleBackgroundManager } from './engine/ui/BattleBackgroundManager.js';
import { screenShatter } from './engine/ui/ScreenShatter.js';
import { PropSystem } from './engine/systems/PropSystem.js';
import { SpriteManager } from './engine/ui/SpriteManager.js';
import { NavigationLight } from './engine/core/NavigationLight.js';
import { ZoneTriggerSystem } from './engine/systems/ZoneTriggerSystem.js';
import { InteractionSystem } from './engine/systems/InteractionSystem.js';
import { TouchControls } from './engine/ui/TouchControls.js';
import { ResolutionManager } from './engine/core/ResolutionManager.js';

// Campaign & narrative systems
import { CampaignManager } from './engine/campaign/CampaignManager.js';
import { NarrativeManager } from './engine/narrative/NarrativeManager.js';
import { NarrativeUI } from './engine/ui/NarrativeUI.js';
import { NPCEngine } from './engine/npc/NPCEngine.js';

// Import UI systems
import { UIRouter } from './engine/ui/UIRouter.js';
import { CombatUIManager } from './engine/ui/CombatUIManager.js';
import { InventoryUI } from './engine/ui/InventoryUI.js';
import { CharacterSheetUI } from './engine/ui/CharacterSheetUI.js';
import { EquipmentUI } from './engine/ui/EquipmentUI.js';
import { ShopUI } from './engine/ui/ShopUI.js';
import { SaveLoadUI } from './engine/ui/SaveLoadUI.js';
import { PartyCreationUI } from './engine/ui/PartyCreationUI.js';
import { CharacterPortrait } from './engine/ui/CharacterPortrait.js';
import { ModalDialog } from './engine/ui/ModalDialog.js';
import { SplashScreen } from './engine/ui/SplashScreen.js';
import { MainMenuScreen } from './engine/ui/MainMenuScreen.js';
import { PauseMenuScreen } from './engine/ui/PauseMenuScreen.js';
import { OptionsScreen } from './engine/ui/OptionsScreen.js';
import { ExplorationHUD } from './engine/ui/ExplorationHUD.js';
import { HUDPanels }      from './engine/ui/HUDPanels.js';
import { ThemeManager }   from './engine/themes/ThemeManager.js';
import { CryptTheme }     from './engine/themes/CryptTheme.js';

/**
 * Main Game Engine Class
 */
class DungeonCrawlerEngine {
  constructor() {
    // Core systems
    this.gridSystem = null;
    this.renderer = null;
    this.inputManager = null;
    this.movementController = null;
    this.gameLoopManager = null;
    this.collisionSystem = null;
    this.doorSystem = null;
    this.transitionSystem = null;
    this.dungeonLoader = null;
    this.geometryFactory = null;
    this.debugUI = null;
    this.performanceManager = null;
    
    // Performance systems
    this.performanceOptimizer = null;
    this.memoryManager = null;
    this.performanceTester = null;
    
    // Game systems
    this.combatSystem = null;
    this.partyManager = null;
    this.characterSystem = null;
    this.saveSystem = null;
    this.autoSaveManager = null;
    this.shopSystem = shopSystem;
    this.lootSystem = lootSystem;
    this.inventorySystem = null;
    this.itemDatabase = itemDatabase;
    this.enemyDatabase = enemyDatabase;
    this.encounterSystem = null;
    this.currentLevelId = null;
    this._encounterBillboards = [];
    this._placedEnemyMarkers = []; // { sprite, light, key } — corridor enemy markers
    this._markerBobTime      = 0;
    this._splashHideTimer    = null;
    this.targetingOverlay   = null;
    this.battleBackground   = null;
    this.propSystem         = null;
    this.spriteManager      = null;
    this.navigationLight    = null;
    this.zoneTriggerSystem  = null;
    this.interactionSystem  = null;
    this.touchControls      = null;
    this.resolutionManager  = null;

    // Campaign & narrative
    this.campaignManager = null;
    this.narrativeManager = null;
    this.narrativeUI = null;
    this.npcEngine = null;

    // UI systems
    this.uiRouter = null;
    this.combatUIManager = null;
    this.inventoryUI = null;
    this.characterSheetUI = null;
    this.equipmentUI = null;
    this.shopUI = null;
    this.saveLoadUI = null;
    this.partyCreationUI = null;
    this.modalDialog     = null;
    this.splashScreen    = null;
    this.mainMenuScreen  = null;
    this.pauseMenuScreen = null;
    this.optionsScreen   = null;
    this.explorationHUD  = null;
    this.hudPanels       = null;

    // Game state
    this.isInitialized = false;
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.animationFrameId = null;
    
    // Performance tracking
    this.frameCount = 0;
    this.fps = 60;
    this.targetFPS = 60;
    this.frameTimeHistory = [];
    this.maxFrameTimeHistory = 60; // Keep last 60 frames for averaging
    this.performanceMetrics = {
      averageFPS: 60,
      minFPS: 60,
      maxFPS: 60,
      averageFrameTime: 16.67, // milliseconds
      maxFrameTime: 16.67,
      totalFrames: 0,
      droppedFrames: 0
    };
    
    // System status tracking
    this.systemStatus = {
      memoryUsage: 0,
      loadTime: 0,
      activeAnimations: 0,
      lastMemoryCheck: 0
    };
  }

  /**
   * Initialize the game engine
   */
  async initialize() {
    const bootLog = Logger.tag('Boot');
    const t0 = performance.now();
    try {
      bootLog.info('Engine initialize() start');

      // Apply theme — CSS vars first (instant), renderer after systems init
      ThemeManager.apply(CryptTheme);
      bootLog.info('Theme applied: ' + CryptTheme.meta.name);

      // Initialize core systems
      this.initializeSystems();
      bootLog.info(`Core systems ready (+${(performance.now() - t0).toFixed(0)}ms)`);

      // Apply renderer-specific theme settings (fog, lights)
      this.renderer.applyTheme(CryptTheme);
      
      // Initialize debug UI
      this.debugUI = new DebugUI();
      if (!this.debugUI.initialize()) {
        throw new Error('Failed to initialize debug UI');
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.inspector = new SystemInspector(this);
      bootLog.info('Engine initialized successfully');
      
      // Initialize performance manager
      await this.performanceManager.initialize({
        enableInstancing: true,
        enableMemoryManagement: true,
        enableBenchmarking: true,
        enableFrustumCulling: true,
        autoOptimize: true
      });
      
      // Initialize performance systems
      this.performanceOptimizer.startMonitoring();
      this.memoryManager.startMonitoring();
      await this.performanceTester.initialize();
      
      // Initialize UI layer
      await this.initializeUIs();
      bootLog.info(`UIs ready (+${(performance.now() - t0).toFixed(0)}ms)`);

      // Initialize game loop manager
      if (this.gameLoopManager) {
        await this.gameLoopManager.initialize();
      }

      // Wire game flow: party creation → campaign → encounters → autosave
      this.initializeGameFlow();
      bootLog.info(`Game flow ready (+${(performance.now() - t0).toFixed(0)}ms)`);

      // Dev shortcuts: Ctrl+<key> reserved for engine diagnostics so InputManager bindings
      // (I=inventory, C=character, P=party, etc.) stay reachable for the player.
      // Plain keys go through InputManager.keyMap; modifier+key stays here.
      window.addEventListener('keydown', (event) => {
        if (!event.ctrlKey) return;
        switch (event.code) {
          case 'KeyI': this.debugCurrentState(); break;
          case 'KeyM': this.testMinimap(); break;
          case 'KeyP': this.fullDiagnosis(); break;
          case 'KeyF': this.showPerformanceStats(); break;
          case 'KeyT': this.runExtendedSessionTest(); break;
          case 'KeyL': this.loadTestLevel(); break;
          case 'KeyC': this.runCombatPerformanceTest(); break;
          case 'KeyS': this.runSaveLoadPerformanceTest(); break;
          case 'KeyR': this.showPerformanceReport(); break;
          case 'KeyD': Logger.dump(); console.log(Logger.asText()); break;
          default: return;
        }
        event.preventDefault();
      });
      Logger.tag('Boot').info('Dev shortcuts now require Ctrl: Ctrl+I/M/P/F/T/L/C/S/R/D');
      
      // Show ready message
      this.debugUI.showSuccess('Engine Ready — Create your party to begin!');
      Logger.tag('Boot').info(`Engine fully ready (+${(performance.now() - t0).toFixed(0)}ms total)`);

    } catch (error) {
      Logger.tag('Boot').error('Failed to initialize engine:', error);
      if (this.debugUI) {
        this.debugUI.showError('Failed to initialize engine', { system: 'Engine' });
      }
    }
  }

  /**
   * Initialize core game systems
   */
  initializeSystems() {
    // Get canvas element
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    
    // Create core systems
    this.gridSystem = new GridSystem();
    this.renderer = new Renderer(canvas);

    // Apply saved/default resolution immediately after renderer exists
    this.resolutionManager = new ResolutionManager(this.renderer);
    this.resolutionManager.initialize();

    this.inputManager = new InputManager();
    this.geometryFactory = new GeometryFactory();
    this.doorSystem = new DoorSystem(this.gridSystem, this.renderer);
    this.collisionSystem = new CollisionSystem(this.gridSystem, this.doorSystem);
    this.movementController = new MovementController(this.gridSystem, this.collisionSystem, this.renderer);
    this.dungeonLoader = new DungeonLoader(this.gridSystem, this.doorSystem, this.renderer, this.geometryFactory);
    this.transitionSystem = new TransitionSystem(this.dungeonLoader, this.movementController, this.inputManager);
    
    // Initialize performance manager
    this.performanceManager = new PerformanceManager(this.renderer, this.renderer.getCamera());
    
    // Initialize performance systems
    this.performanceOptimizer = new PerformanceOptimizer();
    this.memoryManager = new MemoryManager();
    this.performanceTester = new PerformanceTester(this);
    
    // Initialize game systems
    this.combatSystem = new CombatSystem();
    this.combatSystem.setScene(this.renderer.getScene());

    // Hit feedback systems
    this.hitFlashSystem = new HitFlashSystem(this.renderer);
    this.screenShake    = new ScreenShake(this.renderer.getCamera());
    this.combatSystem.battleExecutor.setVisualSystems({
      hitFlash:    this.hitFlashSystem,
      screenShake: this.screenShake,
      combatText:  combatTextManager,
    });

    // Initialize combat text overlay
    combatTextManager.initialize();

    // Targeting overlay (Phase 8)
    this.targetingOverlay = new TargetingOverlay(this.renderer);
    this.targetingOverlay.initialize();

    // Battle background (Phase 9)
    this.battleBackground = new BattleBackgroundManager(this.renderer);
    this.battleBackground.initialize();

    // Screen shatter transition (Phase 10)
    screenShatter.initialize();

    // Phase 12 — props & environmental lights
    this.propSystem = new PropSystem(this.geometryFactory.tileSize);

    // Phase 13 — persistent enemy billboards in dungeon
    this.spriteManager = new SpriteManager(this.renderer.getScene());

    // Phase 14 — navigation lantern (attaches to camera after renderer ready)
    this.navigationLight = new NavigationLight();
    this.navigationLight.initialize(this.renderer.getCamera());

    // Phase 15 — zone triggers + typewriter text
    this.zoneTriggerSystem = new ZoneTriggerSystem(this.gridSystem);
    this.zoneTriggerSystem.initialize();

    // Phase 16 — raycaster prop interaction
    this.interactionSystem = new InteractionSystem(
      this.renderer.getCamera(),
      this.renderer.getScene()
    );
    this.interactionSystem.initialize();

    // Touch controls — auto-hidden on desktop via CSS media query
    this.touchControls = new TouchControls(this.inputManager);
    this.touchControls.initialize();

    this.characterSystem = new CharacterSystem();
    this.partyManager = this.characterSystem.partyManager; // single source of truth
    this.saveSystem = new SaveSystem();
    this.inventorySystem = new InventorySystem(40);
    
    // Campaign & narrative
    this.campaignManager = new CampaignManager();
    this.narrativeManager = new NarrativeManager(
      this.campaignManager,
      this.partyManager,
      this.inventorySystem
    );
    this.narrativeManager.setTheme('crypt-of-shadows');

    // NPC system
    this.npcEngine = new NPCEngine(this.campaignManager, this.narrativeManager);

    // Initialize game loop manager
    this.gameLoopManager = new GameLoopManager(this);
    
    // Initialize camera position based on movement controller
    const initialWorldPos = this.movementController.getCurrentWorldPosition();
    const initialRotation = this.movementController.getCurrentRotation();
    this.renderer.updateCameraPosition(initialWorldPos);
    this.renderer.updateCameraRotation(initialRotation);
    
    console.log('Core systems initialized');
  }

  /**
   * Initialize and register all UI screens with UIRouter.
   */
  async initializeUIs() {
    const log = Logger.tag('Boot');

    this.uiRouter = new UIRouter();

    // Pixel exploration HUD (party column, compass, quest, log, hotbar)
    this.explorationHUD = new ExplorationHUD();
    this.explorationHUD.initialize();

    // Overlay panels: Journal, Bestiary
    this.hudPanels = new HUDPanels();
    this.hudPanels.initialize();

    // Wire HUD hotbar click routing
    this.explorationHUD.onHotbarClick(idx => this._onHotbarClick(idx));

    // Forward all log messages to HUDPanels for full-history journal
    this.explorationHUD.onMessage(entry => this.hudPanels.appendLog(entry));

    // Narrative UI (creates its own DOM panel)
    this.narrativeUI = new NarrativeUI(this.narrativeManager);

    // Instantiate UIs — order matters: some create DOM in constructor
    this.inventoryUI     = new InventoryUI(this.inventorySystem);
    this.inventoryUI.setPartyManager(this.partyManager);
    this.characterSheetUI = new CharacterSheetUI(this.characterSystem, this.inventorySystem);
    this.equipmentUI     = new EquipmentUI(this.characterSystem, this.inventorySystem);
    this.shopUI          = new ShopUI(this.inventorySystem, this.partyManager);
    this.saveLoadUI      = new SaveLoadUI(this.saveSystem);
    this.partyCreationUI = new PartyCreationUI(this.characterSystem);
    this.combatUIManager = new CombatUIManager();
    await this.combatUIManager.initialize(this.combatSystem, this.partyManager, this.inventorySystem);
    this.combatUIManager.setTargetingOverlay(this.targetingOverlay);

    this.modalDialog     = new ModalDialog();
    this.splashScreen    = new SplashScreen();
    this.mainMenuScreen  = new MainMenuScreen(this.saveSystem);
    this.pauseMenuScreen = new PauseMenuScreen();
    this.optionsScreen   = new OptionsScreen(this.resolutionManager);

    const blockMove   = () => this.inputManager.blockInput();
    const unblockMove = () => this.inputManager.unblockInput();

    this.uiRouter.register('narrative', {
      show: () => { this.narrativeUI.show(); blockMove(); },
      hide: () => { this.narrativeUI.hide(); unblockMove(); },
    });

    this.uiRouter.register('inventory', {
      show: () => { this.inventoryUI.show();      blockMove(); },
      hide: () => { this.inventoryUI.hide();      unblockMove(); },
    });
    this.uiRouter.register('character-sheet', {
      show: () => { this.characterSheetUI.show(null); blockMove(); },
      hide: () => { this.characterSheetUI.hide();     unblockMove(); },
    });
    this._pendingEquipment = { character: null, slot: null };
    this.uiRouter.register('equipment', {
      show: () => {
        const { character, slot } = this._pendingEquipment;
        if (!character) { unblockMove(); return; } // guard: don't open without a character
        this.equipmentUI.show(character, slot);
        blockMove();
      },
      hide: () => { this.equipmentUI.hide(); unblockMove(); },
    });
    this.uiRouter.register('shop', {
      show: () => {
        const partyLevel = this.partyManager.getAverageLevel?.()
          ?? this.partyManager.getPartyLevel?.()
          ?? 1;
        this.shopUI.show(partyLevel);
        blockMove();
      },
      hide: () => { this.shopUI.hide(); unblockMove(); },
    });
    this.uiRouter.register('save', {
      show: () => { this.saveLoadUI.show('save'); blockMove(); },
      hide: () => { this.saveLoadUI.hide();       unblockMove(); },
    });
    this.uiRouter.register('load', {
      show: () => { this.saveLoadUI.show('load'); blockMove(); },
      hide: () => { this.saveLoadUI.hide();       unblockMove(); },
    });
    this.uiRouter.register('splash', {
      show: () => { this.splashScreen.show();    blockMove(); },
      hide: () => { this.splashScreen.hide();    unblockMove(); },
    });
    this.uiRouter.register('main-menu', {
      show: () => { this.mainMenuScreen.show();  blockMove(); },
      hide: () => { this.mainMenuScreen.hide();  unblockMove(); },
    });
    this.uiRouter.register('party-creation', {
      show: () => { this.partyCreationUI.show(); blockMove(); },
      hide: () => { this.partyCreationUI.hide(); unblockMove(); },
    });
    this.uiRouter.register('pause-menu', {
      show: () => { this.pauseMenuScreen.show(); blockMove(); },
      hide: () => { this.pauseMenuScreen.hide(); unblockMove(); },
    });
    this.uiRouter.register('options', {
      show: () => { this.optionsScreen.show();   blockMove(); },
      hide: () => { this.optionsScreen.hide();   unblockMove(); },
    });

    // Menu screen event routing
    window.addEventListener('splashComplete',    () => this.uiRouter.replace('main-menu'));
    window.addEventListener('mainMenuNewGame',   () => this.uiRouter.push('party-creation'));
    window.addEventListener('mainMenuContinue',  () => this.uiRouter.push('load'));
    window.addEventListener('mainMenuOptions',   () => this.uiRouter.push('options'));
    window.addEventListener('optionsBack',       () => this.uiRouter.pop());

    window.addEventListener('pauseAction', (e) => {
      const { action } = e.detail ?? {};
      switch (action) {
        case 'resume':
          this.uiRouter.pop();
          break;
        case 'options':
          this.uiRouter.push('options');
          break;
        case 'save':
          this.uiRouter.push('save');
          break;
        case 'load':
          this.uiRouter.push('load');
          break;
        case 'exit-to-menu':
          this.modalDialog.show(
            'Return to main menu? Unsaved progress will be lost.',
            () => {
              this.uiRouter.closeAll();
              this.uiRouter.push('main-menu');
            },
            null
          );
          break;
      }
    });

    // Close overlay screens when a UI dispatches a self-close event
    window.addEventListener('inventoryClose',     () => { if (this.uiRouter.isActive('inventory'))      this.uiRouter.pop(); });
    window.addEventListener('characterSheetClose',() => { if (this.uiRouter.isActive('character-sheet')) this.uiRouter.pop(); });
    window.addEventListener('equipmentClose',     () => { if (this.uiRouter.isActive('equipment'))      this.uiRouter.pop(); });
    window.addEventListener('shopClose',          () => {
      if (this.uiRouter.isActive('shop')) this.uiRouter.pop();
      // Reset any NPC that was in SHOP state back to Idle
      if (this.npcEngine) {
        for (const npc of this.npcEngine.npcs.values()) {
          if (npc.behavior.state === 'Shop') npc.behavior.transition('Idle');
        }
      }
    });
    window.addEventListener('saveLoadClose',      () => {
      if (this.uiRouter.isActive('save') || this.uiRouter.isActive('load')) this.uiRouter.pop();
    });

    log.info('UI Router + screens registered');
  }

  /**
   * Wire game flow: party creation → campaign load → encounters → autosave.
   */
  initializeGameFlow() {
    const log = Logger.tag('Boot');

    // Wire SaveSystem with full game state so saveGame() has access to all subsystems
    this.saveSystem.initialize({
      partyManager:       this.partyManager,
      movementController: this.movementController,
      dungeonLoader:      this.dungeonLoader,
      renderer:           this.renderer,
      inventorySystem:    this.inventorySystem,
    });

    // AutoSaveManager
    this.autoSaveManager = new AutoSaveManager(this.saveSystem);

    // EncounterSystem — uses shared partyManager (same ref as CharacterSystem.partyManager)
    this.encounterSystem = new EncounterSystem(this.combatSystem, this.partyManager);

    // movementCompleted → encounter check + NPC proximity + zone triggers + nav light
    window.addEventListener('movementCompleted', async (e) => {
      const pos = e.detail.newPosition;
      if (this.npcEngine && pos) {
        this.npcEngine.checkProximity(pos.x, pos.z, this.debugUI);
      }
      // Phase 14: navigation light step decay
      this.navigationLight?.step();
      // Phase 15: zone trigger check
      if (pos) this.zoneTriggerSystem?.checkTriggers(pos.x, pos.z);

      if (!this.encounterSystem || !this.currentLevelId) return;
      // EncounterSystem expects an object with .id, not a bare string
      await this.encounterSystem.checkForEncounter(
        pos, { id: this.currentLevelId }
      );
    });

    // encounterEvent → block/unblock movement; spawn/clear 3D enemy billboards
    window.addEventListener('encounterEvent', (e) => {
      if (e.detail.type === 'encounterTriggered') {
        this.inputManager.blockInput();
        this.explorationHUD?.addMessage('¡Encuentro enemigo!', 'danger');
        // Register encountered enemies in bestiary
        (e.detail.data?.enemies ?? []).forEach(en => this.hudPanels?.registerEncounter(en));
        // Remove the placed corridor marker that triggered this encounter
        const tPos = e.detail.data?.position;
        if (tPos) this._removePlacedEnemyMarkerAt(tPos.x, tPos.z);
        this._spawnEncounterBillboards(e.detail.data?.enemies ?? []);
        // Show encounter splash (below shatter tiles — visible in center while tiles assemble)
        this._showEncounterSplash(e.detail.data?.enemies ?? []);
        // Shatter in — screen fractures as combat begins
        const palKey = this._shatterPaletteForLevel(this.currentLevelId ?? '');
        screenShatter.shatterIn(palKey);
        Logger.tag('Event:encounterEvent').info('combat starting');
      } else if (e.detail.type === 'encounterEnded') {
        this.inputManager.unblockInput();
        this._clearEncounterBillboards();
        // Shatter out — screen reassembles as player returns to dungeon
        const palKey = this._shatterPaletteForLevel(this.currentLevelId ?? '');
        screenShatter.shatterOut(palKey);
        Logger.tag('Event:encounterEvent').info('combat ended');
      }
    });

    // battleInputBlock/Unblock → FSM-driven input gating during ACTION_RESOLUTION etc.
    window.addEventListener('battleInputBlock',   () => this.inputManager.blockInput());
    window.addEventListener('battleInputUnblock', () => this.inputManager.unblockInput());

    // Navigation light events
    window.addEventListener('navLightWarning',  () => {
      this.debugUI?.showWarning('Your light is fading...');
      this.explorationHUD?.addMessage('La luz se debilita...', 'danger');
    });
    window.addEventListener('navLightDepleted', () => {
      this.debugUI?.showError('Darkness falls — find a torch!', { system: 'NavLight' });
      this.explorationHUD?.addMessage('¡Oscuridad total!', 'danger');
    });
    window.addEventListener('navLightRestored', () => {
      this.debugUI?.showSuccess('Light restored.');
      this.explorationHUD?.addMessage('Luz restaurada.', 'system');
    });

    // Prop interaction feedback
    window.addEventListener('propInteract', (e) => {
      const { propType } = e.detail ?? {};
      if (propType === 'torch_wall' || propType === 'candle') {
        this.navigationLight?.restore(NavigationLight.MAX_STEPS);
        this.explorationHUD?.addMessage('Antorcha encendida.', 'loot');
      } else if (propType) {
        this.explorationHUD?.addMessage(`Interactuaste con ${propType}.`, 'system');
      }
      this.debugUI?.showSuccess(`Interacted with ${propType ?? 'object'}`);
    });

    // combatEvent → clear billboards on start; unblock movement + notify encounter system on end
    window.addEventListener('combatEvent', (e) => {
      const { type, data } = e.detail ?? {};
      if (type === 'combatStarted') {
        this._clearEncounterBillboards();
        this.battleBackground?.enter(this.currentLevelId ?? '');
      } else if (type === 'combatEnded') {
        this._clearEncounterBillboards();
        this.battleBackground?.exit();
        this.encounterSystem?.onCombatEnd(data?.result ?? 'unknown');
      }
    });

    // gameStateChange (emitted by CombatUIManager results buttons)
    window.addEventListener('gameStateChange', (e) => {
      const { type } = e.detail ?? {};
      if (type === 'returnToMenu') {
        this.uiRouter.closeAll();
        this.uiRouter.push('main-menu');
      } else if (type === 'loadSave') {
        this.uiRouter.push('load');
      } else if (type === 'retryCombat') {
        // Close any open UI panels, restore party to 50% HP, re-trigger last encounter
        this.uiRouter.closeAll();
        const party = this.partyManager?.party?.filter(Boolean) ?? [];
        party.forEach(c => {
          c.isDead = false;
          c.currentHP = Math.max(1, Math.floor(c.maxHP * 0.5));
          if (c.currentAP !== undefined) c.currentAP = c.maxAP ?? 3;
        });
        const enc = this.encounterSystem?.lastEncounterData;
        const pos = this.encounterSystem?.lastEncounterPosition ?? { x: 0, z: 0 };
        if (enc) this.encounterSystem.triggerEncounter(enc, pos);
      }
      // 'continueExploration': CombatResultsUI.hideResults() already closes overlay;
      // input is already unblocked via encounterEnded → unblockInput() chain
    });

    // gameStart (emitted by PartyCreationUI) → close all UI, load campaign floor 1
    window.addEventListener('gameStart', async (e) => {
      log.info('gameStart received — loading campaign');
      this.uiRouter.closeAll(); // hides party-creation and anything below it; unblocks input via hide callbacks

      try {
        const response = await fetch('levels/crypt-of-shadows-floor-1.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const levelData = await response.json();
        this.currentLevelId = levelData.id ?? 'crypt-of-shadows-floor-1';
        await this.dungeonLoader.loadLevel(levelData);
        this._onLevelLoaded(levelData);

        if (levelData.spawn) {
          this.movementController.setPosition(
            levelData.spawn.x, levelData.spawn.z,
            levelData.spawn.direction ?? 0
          );
        }
        const worldPos = this.movementController.getCurrentWorldPosition();
        const rotation  = this.movementController.getCurrentRotation();
        this.renderer.updateCameraPosition(worldPos);
        this.renderer.updateCameraRotation(rotation);

        this.autoSaveManager.initialize({ party: this.partyManager });

        // Load campaign state machine for new game
        if (this.campaignManager) {
          await this.campaignManager.loadCampaign('crypt-of-shadows');
        }

        // Spawn NPCs for floor 1
        if (this.npcEngine) {
          await this.npcEngine.loadForDungeon('crypt-of-shadows');
        }

        setTimeout(() => this.initializeMinimap(), 500);
        this.debugSurroundingTiles(
          this.movementController.getPosition().x,
          this.movementController.getPosition().z
        );
        this.debugUI.showSuccess('Crypt of Shadows — Floor 1. WASD to move, Space to interact.');
        log.info(`Campaign loaded: ${this.currentLevelId}`);
      } catch (err) {
        log.warn(`Campaign load failed (${err.message}), falling back to test level`);
        await this.loadInitialTestLevel();
        setTimeout(() => this.initializeMinimap(), 500);
      }
    });

    // gameLoadRequested (emitted by SaveLoadUI) → restore full game state
    window.addEventListener('gameLoadRequested', async (e) => {
      const { saveData } = e.detail ?? {};
      if (!saveData) return;

      const loadLog = Logger.tag('Save');
      loadLog.info('Restoring game state from save');

      try {
        // 1. Restore characters + party
        if (saveData.party && this.characterSystem) {
          // Build character map from party array so characterSystem.getCharacter() works
          const characters = {};
          for (const charData of saveData.party.party ?? []) {
            if (charData?.id) characters[charData.id] = charData;
          }
          this.characterSystem.deserialize({ characters, party: saveData.party });
          // Re-sync partyManager reference used by encounter/combat/UI systems
          this.partyManager = this.characterSystem.partyManager;
          if (this.encounterSystem) this.encounterSystem.partyManager = this.partyManager;
          if (this.combatSystem)    this.combatSystem.playerParty     = null; // reset stale ref
        }

        // 2. Load dungeon level
        const dungeon  = saveData.world?.currentDungeon ?? 'crypt-of-shadows';
        const floor    = saveData.world?.currentFloor   ?? 1;
        const levelFile = `levels/${dungeon}-floor-${floor}.json`;
        const resp = await fetch(levelFile);
        if (!resp.ok) throw new Error(`Level fetch failed: ${resp.status}`);
        const levelData = await resp.json();
        this.currentLevelId = levelData.id ?? `${dungeon}-floor-${floor}`;
        await this.dungeonLoader.loadLevel(levelData);
        this._onLevelLoaded(levelData);

        // 3. Restore player position
        const pos = saveData.world?.playerPosition ?? { x: 0, z: 0 };
        const dir = saveData.world?.playerDirection ?? 0;
        this.movementController.setPosition(pos.x, pos.z, dir);

        // 4. Sync camera
        const worldPos = this.movementController.getCurrentWorldPosition();
        this.renderer.updateCameraPosition(worldPos);
        this.renderer.updateCameraRotation(this.movementController.getCurrentRotation());

        // 5. Reinit minimap
        this.uiRouter.closeAll();
        setTimeout(() => this.initializeMinimap(), 500);

        // 6. Restore campaign state
        if (saveData.campaign && this.campaignManager) {
          await this.campaignManager.loadCampaign(saveData.campaign.campaignId ?? 'crypt-of-shadows');
          this.campaignManager.loadSaveData(saveData.campaign);
        }

        // 7. Restore NPCs for the loaded dungeon
        if (this.npcEngine) {
          await this.npcEngine.loadForDungeon(dungeon);
          if (saveData.npcs) {
            this.npcEngine.loadSaveData(saveData.npcs);
          }
        }

        this.debugUI.showSuccess(`Loaded — ${dungeon} Floor ${floor}`);
        loadLog.info(`Save restored: ${dungeon} floor ${floor}`);
      } catch (err) {
        loadLog.error('Restore failed:', err);
        this.debugUI.showError('Load failed: ' + err.message, { system: 'Save' });
      }
    });

    // NPC shop opened → open shop UI with NPC's inventory
    EventBus.registerExternalListener(EventTypes.NPC_SHOP_OPENED);
    window.addEventListener(EventTypes.NPC_SHOP_OPENED, (e) => {
      const { inventory } = e.detail ?? {};
      if (inventory && this.shopSystem) {
        this.shopSystem.generateInventoryFromList(inventory);
      }
      if (!this.uiRouter.isOpen('shop')) {
        this.uiRouter.push('shop');
      }
    });

    // Narrative open/close — route through UIRouter so input gets blocked
    // Register with EventBus so orphan warnings don't fire for these window listeners
    EventBus.registerExternalListener(EventTypes.NARRATIVE_STORY_LOADED);
    EventBus.registerExternalListener(EventTypes.NARRATIVE_DIALOGUE_READY);
    EventBus.registerExternalListener(EventTypes.NARRATIVE_DIALOGUE_COMPLETE);
    EventBus.registerExternalListener(EventTypes.NARRATIVE_STORY_COMPLETE);

    window.addEventListener(EventTypes.NARRATIVE_STORY_LOADED, () => {
      if (!this.uiRouter.isOpen('narrative')) {
        this.uiRouter.push('narrative');
        setTimeout(() => this.narrativeUI._onContinue(), 50);
      }
    });
    window.addEventListener(EventTypes.NARRATIVE_DIALOGUE_READY, (e) => {
      const { npcId } = e.detail ?? {};
      if (!this.uiRouter.isOpen('narrative')) {
        this.uiRouter.push('narrative');
        if (npcId) this.narrativeUI.show(npcId);
        setTimeout(() => this.narrativeUI._onContinue(), 50);
      }
    });
    window.addEventListener(EventTypes.NARRATIVE_DIALOGUE_COMPLETE, () => {
      this.uiRouter.popNamed('narrative');
    });
    window.addEventListener(EventTypes.NARRATIVE_STORY_COMPLETE, () => {
      this.uiRouter.popNamed('narrative');
    });

    // Boot into splash screen — blocks input until game starts
    this.uiRouter.push('splash');
    log.info('Game flow wired — splash screen shown');
  }

  /**
   * Spawn THREE.Sprite encounter cards in the dungeon scene — one per enemy.
   * Sprites always face the camera, so no rotation math needed.
   * Portrait canvas → THREE.CanvasTexture → SpriteMaterial.
   */
  _spawnEncounterBillboards(enemies) {
    this._clearEncounterBillboards();
    if (!this.renderer?.scene) return;

    const { x: px, z: pz } = this.movementController.getPosition();
    const dir   = this.movementController.getDirection();
    const fwd   = Dir.forward(dir);
    const right = Dir.right(dir);
    const T     = 2.0; // world units per tile

    enemies.forEach((e, i) => {
      const col = i - Math.floor(enemies.length / 2);
      const wx  = (px + fwd.x * 2 + right.x * col) * T;
      const wz  = (pz + fwd.z * 2 + right.z * col) * T;

      const canvas  = CharacterPortrait.createCanvas(e.type || 'unknown', 128, 160);
      const texture = new THREE.CanvasTexture(canvas);
      const mat     = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite  = new THREE.Sprite(mat);

      sprite.scale.set(0.85, 1.06, 1);   // keep card aspect ratio (128:160 ≈ 4:5)
      sprite.position.set(wx, 0.8, wz);

      this.renderer.scene.add(sprite);
      this._encounterBillboards.push(sprite);
    });
  }

  /** Called after every level load to rebuild environmental systems. */
  _onLevelLoaded(levelData) {
    const scene = this.renderer.getScene();

    // Update pixel HUD location panel
    const levelName  = levelData?.name ?? (this.currentLevelId ?? '').replace(/-/g, ' ');
    const questObj   = levelData?.quest?.objective ?? '';
    this.explorationHUD?.setLocation(levelName, questObj);
    this.explorationHUD?.addMessage(`Entrando: ${levelName}`, 'ambient');

    // Props + environmental lights
    this.propSystem?.clear();
    if (levelData && scene) this.propSystem?.buildForLevel(levelData, scene);

    // Clear encounter sprites — will be repopulated by EncounterSystem
    this.spriteManager?.clear();

    // Restore navigation light for new floor
    this.navigationLight?.restore();

    // Place visible enemy markers in corridors
    this._clearPlacedEnemyMarkers();
    if (this.encounterSystem && this.gridSystem && levelData) {
      const spawn = this.dungeonLoader?.getSpawnPoint?.() ?? { x: 0, z: 0 };
      this.encounterSystem.placeEncountersForLevel(
        this.gridSystem, levelData.id ?? this.currentLevelId ?? '',
        spawn.x, spawn.z
      );
      this._spawnPlacedEnemyMarkers();
    }
  }

  _shatterPaletteForLevel(levelId = '') {
    const id = levelId.toLowerCase();
    if (/crypt/.test(id))           return 'dark';
    if (/fire|volcano|lava/.test(id)) return 'fire';
    if (/ice|frost|snow/.test(id))  return 'ice';
    if (/forest/.test(id))          return 'forest';
    if (/cave/.test(id))            return 'cave';
    return 'dark';
  }

  _showEncounterSplash(enemies = []) {
    const el = document.getElementById('encounter-splash');
    if (!el) return;

    const names = enemies
      .map(en => `${en.name ?? 'Enemy'}${en.level ? ` Lv.${en.level}` : ''}`)
      .join('<br>');

    el.innerHTML = `
      <div class="encounter-splash-eyebrow">⚔ enemy encounter ⚔</div>
      <div class="encounter-splash-title">BATTLE!</div>
      <div class="encounter-splash-divider"></div>
      <div class="encounter-splash-enemies">${names}</div>
    `;
    el.classList.remove('hidden');
    // Trigger opacity transition on next paint
    requestAnimationFrame(() => el.classList.add('visible'));

    // Hide before shatter tiles fully reveal combat UI (~1200ms covers shatter assembly)
    if (this._splashHideTimer) clearTimeout(this._splashHideTimer);
    this._splashHideTimer = setTimeout(() => {
      el.classList.remove('visible');
      setTimeout(() => el.classList.add('hidden'), 150);
      this._splashHideTimer = null;
    }, 1200);
  }

  _clearEncounterBillboards() {
    if (!this.renderer?.scene) return;
    for (const sprite of this._encounterBillboards) {
      this.renderer.scene.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    this._encounterBillboards = [];
  }

  /**
   * Spawn persistent 3D billboard sprites for pre-placed enemy markers.
   * Each marker also gets a dim red PointLight for atmosphere.
   */
  _spawnPlacedEnemyMarkers() {
    if (!this.encounterSystem || !this.renderer?.scene) return;
    const scene = this.renderer.scene;
    const T = 2.0; // world units per tile

    for (const { x, z, enemies } of this.encounterSystem.getPlacedMarkers()) {
      const leader = enemies[0];
      const canvas  = CharacterPortrait.createCanvas(leader.type || 'goblin', 96, 120);
      const texture = new THREE.CanvasTexture(canvas);
      const mat     = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite  = new THREE.Sprite(mat);
      sprite.scale.set(0.75, 0.94, 1);
      const wx = x * T;
      const wz = z * T;
      sprite.position.set(wx, 0.9, wz);

      // Atmospheric red point light
      const light = new THREE.PointLight(0xff2200, 0.7, 4.0);
      light.position.set(wx, 1.2, wz);

      scene.add(sprite);
      scene.add(light);

      this._placedEnemyMarkers.push({
        sprite, light,
        key:   `${x},${z}`,
        phase: Math.random() * Math.PI * 2, // random phase for varied bobbing
      });
    }
  }

  /** Remove a single placed marker when its encounter triggers. */
  _removePlacedEnemyMarkerAt(x, z) {
    const key = `${Math.round(x)},${Math.round(z)}`;
    const idx = this._placedEnemyMarkers.findIndex(m => m.key === key);
    if (idx < 0) return;
    const { sprite, light } = this._placedEnemyMarkers.splice(idx, 1)[0];
    this.renderer?.scene?.remove(sprite);
    this.renderer?.scene?.remove(light);
    sprite.material.map?.dispose();
    sprite.material.dispose();
    this.encounterSystem?.removePlacedMarker(x, z);
  }

  /** Remove all placed enemy markers (called on level change). */
  _clearPlacedEnemyMarkers() {
    if (!this.renderer?.scene) { this._placedEnemyMarkers = []; return; }
    for (const { sprite, light } of this._placedEnemyMarkers) {
      this.renderer.scene.remove(sprite);
      this.renderer.scene.remove(light);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    this._placedEnemyMarkers = [];
  }

  /**
   * Track system memory usage and performance
   */
  updateSystemStatus() {
    const now = performance.now();
    
    // Check memory usage every 5 seconds
    if (now - this.systemStatus.lastMemoryCheck > 5000) {
      if (performance.memory) {
        this.systemStatus.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
      }
      this.systemStatus.lastMemoryCheck = now;
    }
    
    // Count active animations
    this.systemStatus.activeAnimations = 0;
    if (this.movementController && this.movementController.getIsAnimating()) {
      this.systemStatus.activeAnimations++;
    }
    if (this.doorSystem && this.doorSystem.hasActiveAnimations) {
      this.systemStatus.activeAnimations += this.doorSystem.getActiveAnimationCount();
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    
    // Handle visibility change (pause when tab not active)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
    
    // Movement and collision events
    window.addEventListener('movementBlocked', (event) => {
      this.handleMovementBlocked(event.detail);
    });
    
    window.addEventListener('doorOpened', (event) => {
      this.handleDoorOpened(event.detail);
      this.explorationHUD?.addMessage('La puerta cruje al abrirse.', 'system');
    });

    window.addEventListener('levelTransition', (event) => {
      this.explorationHUD?.addMessage('Cambiando de nivel...', 'ambient');
      this.handleLevelTransition(event.detail);
    });
    
    window.addEventListener('transitionError', (event) => {
      this.handleTransitionError(event.detail);
    });

    // openEquipmentSelection (emitted by CharacterSheetUI) → open equipment overlay
    window.addEventListener('openEquipmentSelection', (e) => {
      Logger.tag('Event:openEquipmentSelection').debug('received', e.detail);
      this._pendingEquipment = {
        character: e.detail?.character ?? null,
        slot: e.detail?.slot ?? null
      };
      this.uiRouter?.push('equipment');
    });
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Fixed resolution — ResolutionManager owns canvas/renderer sizing.
    // Reapply current preset so a window resize doesn't break the buffer dimensions.
    if (this.resolutionManager) {
      const cur = this.resolutionManager.getCurrent();
      if (cur) this.resolutionManager.apply(cur.w, cur.h, false);
    }
  }

  /**
   * Start the game loop with proper initialization
   */
  start() {
    if (!this.isInitialized) {
      console.error('Engine not initialized');
      return;
    }
    
    if (this.isRunning) {
      console.warn('Game loop already running');
      return;
    }
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    
    // Reset performance metrics
    this.resetPerformanceMetrics();
    
    // Start the game loop
    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
    
    console.log('Game loop started - targeting 60fps');
  }

  /**
   * Pause the game loop
   */
  pause() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Cancel the animation frame to stop the loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    console.log('Game loop paused');
  }

  /**
   * Resume the game loop
   */
  resume() {
    if (this.isInitialized && !this.isRunning) {
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
      console.log('Game loop resumed');
    }
  }
  
  /**
   * Stop the game loop completely
   */
  stop() {
    this.pause();
    this.isInitialized = false;
    console.log('Game loop stopped');
  }

  /**
   * Main game loop with enhanced performance tracking
   */
  gameLoop(currentTime) {
    if (!this.isRunning) return;
    
    // Calculate delta time in seconds for consistent timing
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;
    
    // Cap delta time to prevent large jumps (e.g., when tab becomes active)
    const cappedDeltaTime = Math.min(deltaTime, 1/30); // Max 30fps minimum
    
    // Performance tracking - start frame timing
    const frameStartTime = performance.now();
    
    // Update all game systems
    this.update(cappedDeltaTime);

    // Render the scene
    this.render(currentTime);
    
    // Performance tracking - end frame timing
    const frameEndTime = performance.now();
    const frameTime = frameEndTime - frameStartTime;
    
    // Update performance metrics
    this.updatePerformanceMetrics(deltaTime, frameTime);
    
    // Continue the game loop
    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  /**
   * Update all game systems with coordinated timing
   */
  update(deltaTime) {
    // Convert deltaTime to milliseconds for systems that expect it
    const deltaTimeMs = deltaTime * 1000;
    
    // Process input actions (non-blocking)
    this.processInput();
    
    // Update movement controller with animation interpolation
    if (this.movementController) {
      this.movementController.update(deltaTimeMs);
    }
    
    // Update door system animations
    if (this.doorSystem) {
      this.doorSystem.update(deltaTimeMs);
    }
    
    // Note: TransitionSystem doesn't need frame-by-frame updates
    // It uses promise-based async operations for transitions
    
    // Update performance manager
    if (this.performanceManager) {
      this.performanceManager.update(performance.now(), this.frameCount);
    }
    
    // Bob placed enemy markers
    if (this._placedEnemyMarkers.length && !this.combatSystem?.isActive) {
      this._markerBobTime += deltaTime;
      for (const m of this._placedEnemyMarkers) {
        m.sprite.position.y = 0.9 + Math.sin(this._markerBobTime * 2.2 + m.phase) * 0.14;
        if (m.light) m.light.intensity = 0.6 + Math.sin(this._markerBobTime * 3.1 + m.phase) * 0.25;
      }
    }

    // Update system status and debug UI
    this.updateSystemStatus();
    this.updateDebugUI();
  }

  /**
   * Process input actions from the input manager
   */
  processInput() {
    if (!this.inputManager || !this.movementController) return;
    
    // Skip input processing if movement is animating
    if (this.movementController.getIsAnimating()) {
      this.inputManager.blockInput();
      return;
    } else {
      this.inputManager.unblockInput();
    }
    
    // Get next action from input queue
    const action = this.inputManager.getNextAction();
    if (!action) return;
    
    // Process the action (don't await here to avoid blocking the game loop)
    this.handleInputAction(action).catch(error => {
      console.error('Error handling input action:', error);
    });
  }

  /**
   * Handle a specific input action
   * @param {InputAction} action - The action to handle
   */
  async handleInputAction(action) {
    if (!this.movementController) return;
    
    switch (action.type) {
      case 'forward':
        await this.movementController.moveForward();
        break;
      case 'backward':
        await this.movementController.moveBackward();
        break;
      case 'strafeLeft':
        await this.movementController.strafeLeft();
        break;
      case 'strafeRight':
        await this.movementController.strafeRight();
        break;
      case 'turnLeft':
        await this.movementController.turnLeft();
        break;
      case 'turnRight':
        await this.movementController.turnRight();
        break;
      case 'interact':
        this.performInteraction();
        break;
      case 'loadTest':
        await this.loadTestLevel();
        break;
      case 'openInventory':
        this.uiRouter?.toggle('inventory');
        break;
      case 'openCharacterSheet':
        this.uiRouter?.toggle('character-sheet');
        break;
      case 'openParty':
        this.uiRouter?.toggle('character-sheet');
        break;
      case 'openMap':
        // Minimap is always visible in HUD — M key toggles minimap panel visibility
        {
          const mm = document.getElementById('minimap');
          if (mm) mm.style.display = mm.style.display === 'none' ? '' : 'none';
        }
        break;
      case 'openMenu':
        // Escape during exploration → pause menu; Escape with overlay open → close it.
        // (Input is blocked when any menu is open, so this fires only during exploration normally.)
        if (this.uiRouter?.isOpen()) this.uiRouter.pop();
        else this.uiRouter?.push('pause-menu');
        break;
      case 'quickSave':
        this.uiRouter?.push('save');
        break;
      case 'quickLoad':
        this.uiRouter?.push('load');
        break;
      case 'combatAction1':
      case 'combatAction2':
      case 'combatAction3':
      case 'combatAction4':
      case 'combatAction5': {
        const slot = parseInt(action.type.replace('combatAction', ''));
        window.dispatchEvent(new CustomEvent('combatKeyAction', { detail: { slot } }));
        break;
      }
      default:
        Logger.tag('Input').warn(`Unknown action type: ${action.type}`);
    }
  }



  /**
   * Perform interaction (Space key) - Handle door interactions per requirement 4.4
   */
  async performInteraction() {
    if (!this.movementController || !this.doorSystem || !this.collisionSystem) {
      this.debugUI.showWarning('Systems not ready for interaction');
      return;
    }

    // Phase 16: fire interactKey so InteractionSystem can raytrace props
    window.dispatchEvent(new CustomEvent('interactKey'));

    const position = this.movementController.getPosition();
    const direction = this.movementController.getDirection();
    Logger.tag('Interact').debug(`player (${position.x},${position.z}) facing ${Dir.name(direction)}`);

    // Calculate the tile the player is facing — canonical Direction module
    const dir = Dir.forward(direction);
    const targetX = position.x + dir.x;
    const targetZ = position.z + dir.z;
    
    Logger.tag('Interact').debug(`target tile (${targetX},${targetZ})`);

    // Check for NPC facing the player first
    if (this.npcEngine) {
      const npc = this.npcEngine.getNPCFacing(position.x, position.z, dir);
      if (npc) {
        const handled = this.npcEngine.interactWith(npc);
        if (handled) return;
      }
    }

    // Check if there's a door at the target position
    const tile = this.gridSystem.getTile(targetX, targetZ);

    if (!tile || tile.type !== 'door') {
      Logger.tag('Interact').debug(`no door, tile=${tile ? tile.type : 'undefined'}`);
      this.debugUI.showToast('Nothing to interact with');
      return;
    }

    // Get player's keys (for now, simulate having no keys - this will be enhanced later)
    const playerKeys = this.collisionSystem.playerKeys || [];
    
    try {
      // Handle door interaction
      const result = await this.doorSystem.handleDoorInteraction(targetX, targetZ, playerKeys);
      
      if (result.success) {
        this.debugUI.showSuccess(result.message);
        
        // If door was unlocked with a key, could remove key from inventory here
        if (result.action === 'unlock_and_open' && result.keyUsed) {
          console.log(`Used ${result.keyUsed} key to unlock door`);
        }
      } else {
        this.debugUI.showWarning(result.message);
      }
      
    } catch (error) {
      console.error('Error during door interaction:', error);
      this.debugUI.showError('Failed to interact with door', { system: 'DoorSystem' });
    }
  }

  /**
   * Load initial test level - starts with 10x10 room
   */
  async loadInitialTestLevel() {
    try {
      console.log('Loading initial 10x10 test room...');
      
      // Load the new 10x10 test room by default
      await this.dungeonLoader.loadLevelFromFile('./levels/test-room-10x10.json');
      
      // Verify level was loaded
      if (!this.dungeonLoader.isLevelLoaded()) {
        throw new Error('Initial test level failed to load properly');
      }
      
      // Initialize performance optimizations for the level
      if (this.performanceManager) {
        this.performanceManager.initializeLevelOptimizations(this.dungeonLoader.getCurrentLevel());
      }
      
      // Set up player spawn position and camera
      this.dungeonLoader.setupPlayerSpawn(this.movementController);
      
      // Show level statistics
      const stats = this.dungeonLoader.getLevelStats();
      console.log('Initial test level loaded successfully:', stats);
      
      // Initialize test level index for cycling
      this.currentTestLevelIndex = 1; // Start at index 1 since we loaded index 0

      // Set currentLevelId so movementCompleted handler allows encounter checks
      this.currentLevelId = stats.id ?? 'test-room-10x10';
      this._onLevelLoaded(this.dungeonLoader.getCurrentLevel());

      // Ensure encounters can trigger: create a test party if none exists
      if (this.partyManager && !this.partyManager.getAliveMembers().length) {
        this.characterSystem.createTestParty('balanced');
        Logger.tag('Boot').info('Test party created for encounter testing');
      }

      this.debugUI.showSuccess(`Level "${stats.id}" loaded (${stats.dimensions}) - Press L to cycle levels`);
      
    } catch (error) {
      console.error('Failed to load initial test level:', error);
      this.debugUI.showError(`Failed to load initial test level: ${error.message}`, { system: 'DungeonLoader' });
    }
  }

  /**
   * Load test level for collision system verification
   */
  async loadTestLevel() {
    try {
      console.log('Loading test level...');
      
      // Cycle through different test levels for comprehensive testing
      const testLevels = [
        './levels/test-room-10x10.json',
        './levels/multi-room-20x20.json',
        './levels/test-collision.json',
        './levels/shattered-sanctum-floor-1.json',
        './levels/shattered-sanctum-floor-2.json',
        './levels/shattered-sanctum-floor-3.json'
      ];
      
      // Get current level index or start with first level
      if (this.currentTestLevelIndex === undefined) {
        this.currentTestLevelIndex = 0;
      }
      
      const levelPath = testLevels[this.currentTestLevelIndex];
      console.log(`Loading test level: ${levelPath}`);
      
      // Use the enhanced DungeonLoader to load from file
      await this.dungeonLoader.loadLevelFromFile(levelPath);
      
      // Verify level was loaded
      if (!this.dungeonLoader.isLevelLoaded()) {
        throw new Error('Test level failed to load properly');
      }
      
      // Initialize performance optimizations for the level
      if (this.performanceManager) {
        this.performanceManager.cleanupLevelOptimizations();
        this.performanceManager.initializeLevelOptimizations(this.dungeonLoader.getCurrentLevel());
      }
      
      // Set up player spawn position and camera
      this.dungeonLoader.setupPlayerSpawn(this.movementController);
      
      // Show level statistics
      const stats = this.dungeonLoader.getLevelStats();
      console.log('Test level loaded successfully:', stats);
      
      // Verify grid has tiles
      const playerPos = this.movementController.getPosition();
      const currentTile = this.gridSystem.getTile(playerPos.x, playerPos.z);
      console.log(`Player at (${playerPos.x}, ${playerPos.z}), tile:`, currentTile);
      
      // Test complete movement flow from input to rendering
      this.testMovementFlow();
      
      // Test edge cases
      this.testEdgeCases();
      
      // Set currentLevelId so movementCompleted handler allows encounter checks
      this.currentLevelId = stats.id ?? levelPath.replace(/.*\//, '').replace('.json', '');

      // Ensure encounters can trigger: create a test party if none exists
      if (this.partyManager && !this.partyManager.getAliveMembers().length) {
        this.characterSystem.createTestParty('balanced');
        Logger.tag('Boot').info('Test party created for encounter testing');
      }

      this.debugUI.showSuccess(`Level "${stats.id}" loaded (${stats.dimensions}) - Press L to cycle levels`);

      // Move to next level for next load
      this.currentTestLevelIndex = (this.currentTestLevelIndex + 1) % testLevels.length;
      
    } catch (error) {
      console.error('Failed to load test level:', error);
      this.debugUI.showError(`Failed to load test level: ${error.message}`, { system: 'DungeonLoader' });
    }
  }

  /**
   * Render the scene with Three.js integration
   */
  render(currentTime = 0) {
    if (!this.renderer) return;

    // Update camera
    if (this.combatSystem?.isActive) {
      // Fixed combat viewpoint: centered on battle arena, facing south (+Z)
      this.renderer.updateCameraPosition({ x: 0, z: -1 });
      this.renderer.updateCameraRotation(Math.PI);
      if (this.screenShake) this.screenShake.updateOrigin();
    } else if (this.movementController) {
      const worldPos = this.movementController.getCurrentWorldPosition();
      const rotation = this.movementController.getCurrentRotation();
      this.renderer.updateCameraPosition(worldPos);
      this.renderer.updateCameraRotation(rotation);
      // Keep shake origin in sync with intentional camera moves
      if (this.screenShake && !this.movementController.getIsAnimating()) {
        this.screenShake.updateOrigin();
      }
    }

    // Animate torch flicker
    this.renderer.updateTorchFlicker(currentTime);

    // Hit flash frame updates
    if (this.hitFlashSystem) this.hitFlashSystem.update();

    // Battle background UV-warp animation
    if (this.battleBackground) this.battleBackground.update(currentTime);

    // Phase 12: prop torch flicker
    if (this.propSystem) this.propSystem.update(currentTime);

    // Phase 14: navigation light dying flicker
    if (this.navigationLight) this.navigationLight.update(currentTime);

    // Battle entity idle animation
    if (this.combatSystem?.isActive && this.combatSystem.battleGrid) {
      const currentId = this.combatSystem.currentCharacter?.id;
      for (const [id, entity] of this.combatSystem.battleGrid.entities) {
        entity.updateIdleAnimation(currentTime, id === currentId);
      }
    }

    // Screen shake (must run before render, after camera position set)
    if (this.screenShake) this.screenShake.update();

    // Render the Three.js scene
    this.renderer.render();
  }

  /**
   * Update debug UI with current game state
   */
  updateDebugUI() {
    if (!this.debugUI || !this.movementController) return;
    
    const position = this.movementController.getPosition();
    const direction = this.movementController.getDirection();
    const rotation = this.movementController.getCurrentRotation();
    const currentTile = this.gridSystem ? this.gridSystem.getTile(position.x, position.z) : null;
    
    // Prepare game state for debug UI
    const gameState = {
      position: position,
      direction: direction,
      rotation: rotation,
      currentTile: currentTile
    };
    
    // Update debug UI
    this.debugUI.update(gameState);
    
    // Update minimap
    this.updateMinimap();

    // Update exploration party HUD
    this.updateExplorationHUD();
  }

  updateExplorationHUD() {
    if (!this.explorationHUD) return;
    const members = this.partyManager?.party?.filter(Boolean) ?? [];
    this.explorationHUD.updateParty(members);
    const dir = this.movementController?.currentDirection ?? 0;
    this.explorationHUD.setCompass(dir);
  }

  _onHotbarClick(index) {
    switch (index) {
      case 2: // POT — use first consumable on first living member
        this._useConsumableFromHotbar(); break;
      case 3: // JRN — journal (full event log)
        this.hudPanels?.toggle('journal'); break;
      case 4: // STS — character stats sheet
        this.uiRouter?.toggle('character-sheet'); break;
      case 5: // INV — inventory
        this.uiRouter?.toggle('inventory'); break;
      case 6: // BES — bestiary
        this.hudPanels?.toggle('bestiary'); break;
      case 7: // MNU — pause menu
        if (this.hudPanels?.isAnyOpen()) this.hudPanels.closeAll();
        else if (this.uiRouter?.isOpen()) this.uiRouter.pop();
        else this.uiRouter?.push('pause-menu');
        break;
    }
  }

  _useConsumableFromHotbar() {
    const party = this.partyManager?.party?.filter(Boolean) ?? [];
    const target = party.find(m => m.isAlive?.() !== false);
    if (!target) return;
    const inv = this.inventorySystem?.getInventory?.() ?? [];
    const potion = inv.find(item => item?.type === 'consumable' || item?.category === 'consumable');
    if (potion) {
      this.inventorySystem?.useItem?.(potion.id, target);
      this.explorationHUD?.addMessage(`Used ${potion.name}.`, 'loot');
    } else {
      this.explorationHUD?.addMessage('No consumables available.', 'system');
    }
  }

  /**
   * Initialize minimap
   */
  initializeMinimap() {
    console.log('Initializing minimap...');
    const minimapGrid = document.getElementById('minimap-grid');
    if (!minimapGrid) {
      console.error('Minimap grid element not found!');
      return;
    }
    
    console.log('Minimap grid found, creating cells...');
    
    // Clear existing grid
    minimapGrid.innerHTML = '';
    
    // Get current level dimensions
    const currentLevel = this.dungeonLoader ? this.dungeonLoader.getCurrentLevel() : null;
    const width = currentLevel ? currentLevel.width : 5;
    const height = currentLevel ? currentLevel.height : 5;
    
    console.log(`Creating ${width}x${height} minimap grid`);
    
    // Update CSS grid template
    minimapGrid.style.gridTemplateColumns = `repeat(${width}, 20px)`;
    minimapGrid.style.gridTemplateRows = `repeat(${height}, 20px)`;
    
    // Create grid based on actual level size
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const cell = document.createElement('div');
        cell.className = 'minimap-cell';
        cell.id = `minimap-${x}-${z}`;
        minimapGrid.appendChild(cell);
      }
    }
    
    console.log('Minimap cells created, updating tiles...');
    
    // Update minimap with level data
    this.updateMinimapTiles();
    
    console.log('Minimap initialization complete');
  }

  /**
   * Update minimap tiles based on level data
   */
  updateMinimapTiles() {
    if (!this.gridSystem) {
      console.log('No grid system available for minimap');
      return;
    }
    
    console.log('Updating minimap tiles...');
    
    // Get current level dimensions
    const currentLevel = this.dungeonLoader ? this.dungeonLoader.getCurrentLevel() : null;
    const width = currentLevel ? currentLevel.width : 5;
    const height = currentLevel ? currentLevel.height : 5;
    
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const cell = document.getElementById(`minimap-${x}-${z}`);
        if (!cell) {
          console.log(`Cell not found: minimap-${x}-${z}`);
          continue;
        }
        
        const tile = this.gridSystem.getTile(x, z);
        if (!tile) {
          console.log(`No tile data at (${x}, ${z})`);
          continue;
        }
        
        // Reset classes
        cell.className = 'minimap-cell';
        
        // Set tile type
        switch (tile.type) {
          case 'wall':
            cell.classList.add('wall');
            cell.textContent = '■';
            break;
          case 'floor':
            cell.classList.add('floor');
            cell.textContent = '·';
            break;
          case 'door':
            cell.classList.add('door');
            cell.textContent = 'D';
            break;
          case 'transition':
            cell.classList.add('floor');
            cell.textContent = 'T';
            break;
          default:
            cell.classList.add('wall');
            cell.textContent = '?';
        }
      }
    }
    
    console.log('Minimap tiles updated');
  }

  /**
   * Update minimap with player position and direction
   */
  updateMinimap() {
    if (!this.movementController) return;
    
    const position = this.movementController.getPosition();
    const direction = this.movementController.getDirection();
    const directionNames = ['north', 'east', 'south', 'west'];
    
    // Get current level dimensions
    const currentLevel = this.dungeonLoader ? this.dungeonLoader.getCurrentLevel() : null;
    const width = currentLevel ? currentLevel.width : 5;
    const height = currentLevel ? currentLevel.height : 5;
    
    // Clear all player markers
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const cell = document.getElementById(`minimap-${x}-${z}`);
        if (cell) {
          cell.classList.remove('player', 'north', 'east', 'south', 'west');
          // Restore original tile content
          const tile = this.gridSystem.getTile(x, z);
          if (tile) {
            switch (tile.type) {
              case 'wall': cell.textContent = '■'; break;
              case 'floor': cell.textContent = '·'; break;
              case 'door': cell.textContent = 'D'; break;
              case 'transition': cell.textContent = 'T'; break;
              default: cell.textContent = '?'; break;
            }
          }
        }
      }
    }
    
    // Set current player position with directional arrow
    const playerCell = document.getElementById(`minimap-${position.x}-${position.z}`);
    if (playerCell) {
      playerCell.classList.add('player', directionNames[direction]);
      
      // Use directional arrows instead of 'P'
      const arrows = ['↑', '→', '↓', '←']; // N, E, S, W
      playerCell.textContent = arrows[direction];
    }
  }

  /**
   * Update performance metrics and FPS tracking
   */
  updatePerformanceMetrics(deltaTime, frameTime) {
    this.frameCount++;
    this.performanceMetrics.totalFrames++;
    
    // Calculate current FPS
    const currentFPS = deltaTime > 0 ? 1 / deltaTime : 60;
    
    // Track frame time history for averaging
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.maxFrameTimeHistory) {
      this.frameTimeHistory.shift();
    }
    
    // Update performance metrics
    this.performanceMetrics.averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    this.performanceMetrics.maxFrameTime = Math.max(this.performanceMetrics.maxFrameTime, frameTime);
    
    // Update FPS metrics
    this.fps = this.fps * 0.9 + currentFPS * 0.1; // Smoothed FPS
    this.performanceMetrics.averageFPS = this.fps;
    this.performanceMetrics.minFPS = Math.min(this.performanceMetrics.minFPS, currentFPS);
    this.performanceMetrics.maxFPS = Math.max(this.performanceMetrics.maxFPS, currentFPS);
    
    // Track dropped frames (frames that took longer than target)
    const targetFrameTime = 1000 / this.targetFPS;
    if (frameTime > targetFrameTime * 1.5) {
      this.performanceMetrics.droppedFrames++;
    }
    
    // Update FPS display every 30 frames for smoother updates
    if (this.frameCount % 30 === 0) {
      this.updateFPSDisplay();
    }
  }
  
  /**
   * Update FPS display in debug UI
   */
  updateFPSDisplay() {
    if (this.debugUI) {
      const performanceData = {
        currentFPS: this.fps,
        averageFrameTime: this.performanceMetrics.averageFrameTime,
        ...this.performanceMetrics
      };
      
      this.debugUI.updatePerformance(performanceData);
    }
  }
  
  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics() {
    this.frameCount = 0;
    this.frameTimeHistory = [];
    this.performanceMetrics = {
      averageFPS: 60,
      minFPS: 60,
      maxFPS: 60,
      averageFrameTime: 16.67,
      maxFrameTime: 16.67,
      totalFrames: 0,
      droppedFrames: 0
    };
    console.log('Performance metrics reset');
  }
  
  /**
   * Get current performance statistics
   */
  getPerformanceStats() {
    return {
      ...this.performanceMetrics,
      currentFPS: Math.round(this.fps),
      frameTimeHistory: [...this.frameTimeHistory],
      isRunning: this.isRunning,
      targetFPS: this.targetFPS
    };
  }

  /**
   * Handle movement blocked events
   */
  handleMovementBlocked(detail) {
    const { reason, message } = detail;
    
    // Show appropriate feedback based on reason
    switch (reason) {
      case 'wall':
        this.debugUI.showWarning('Cannot walk through walls');
        break;
      case 'door_locked':
        this.debugUI.showWarning(message);
        break;
      case 'out_of_bounds':
        this.debugUI.showWarning('Cannot leave the dungeon');
        break;
      case 'corner_blocked_both':
      case 'corner_blocked_partial':
        this.debugUI.showWarning('Path is blocked');
        break;
      default:
        this.debugUI.showWarning(message || 'Movement blocked');
    }
  }

  /**
   * Handle door opened events
   */
  handleDoorOpened(detail) {
    this.debugUI.showSuccess('Door opened');
  }

  /**
   * Handle level transition events
   */
  async handleLevelTransition(detail) {
    const { transitionData } = detail;
    
    if (!transitionData || !transitionData.targetLevel) {
      this.debugUI.showWarning('Invalid transition data');
      return;
    }
    
    if (!this.transitionSystem) {
      this.debugUI.showError('Transition system not available');
      return;
    }
    
    try {
      this.debugUI.showToast(`Transitioning to ${transitionData.targetLevel}...`, 'info');
      
      // Start the transition with fade effects
      const success = await this.transitionSystem.startTransition(transitionData);
      
      if (success) {
        this.debugUI.showSuccess(`Level "${transitionData.targetLevel}" loaded`);

        // Notify campaign manager that a floor was cleared / entered
        if (this.campaignManager && this.dungeonLoader) {
          const dungeonId = this.dungeonLoader.currentDungeon;
          const floor = this.dungeonLoader.currentFloor;
          if (dungeonId) {
            EventBus.emit(EventTypes.PLAYER_FLOOR_CLEARED, { dungeonId, floor });
            // Reload NPCs for new dungeon/floor
            if (this.npcEngine) {
              await this.npcEngine.loadForDungeon(dungeonId);
            }
          }
        }

        // Reinitialize minimap for new level
        setTimeout(() => {
          this.initializeMinimap();
        }, 100);
      } else {
        this.debugUI.showError('Level transition failed');
      }
      
    } catch (error) {
      console.error('Level transition error:', error);
      this.debugUI.showError('Level transition failed', { system: 'TransitionSystem' });
    }
  }

  /**
   * Handle transition error events
   */
  handleTransitionError(detail) {
    const { message } = detail;
    this.debugUI.showError(`Transition Error: ${message}`, { system: 'TransitionSystem' });
  }

  /**
   * Debug function to show surrounding tiles
   */
  debugSurroundingTiles(centerX, centerZ) {
    console.log('=== Surrounding Tiles Debug ===');
    for (let z = centerZ - 1; z <= centerZ + 1; z++) {
      let row = '';
      for (let x = centerX - 1; x <= centerX + 1; x++) {
        const tile = this.gridSystem.getTile(x, z);
        if (x === centerX && z === centerZ) {
          row += '[P]'; // Player position
        } else if (tile) {
          row += `[${tile.type.charAt(0).toUpperCase()}]`; // First letter of tile type
        } else {
          row += '[?]'; // Unknown
        }
      }
      console.log(`z=${z}: ${row}`);
    }
    console.log('===============================');
  }

  /**
   * Debug current game state (press I key)
   */
  debugCurrentState() {
    if (!this.movementController) return;
    
    const pos = this.movementController.getPosition();
    const dir = this.movementController.getDirection();
    const dirNames = ['North', 'East', 'South', 'West'];
    const rotation = this.movementController.getCurrentRotation();
    
    console.log('=== CURRENT STATE DEBUG ===');
    console.log(`Player Position: (${pos.x}, ${pos.z})`);
    console.log(`Player Direction: ${dir} (${dirNames[dir]})`);
    console.log(`Camera Rotation: ${rotation} radians (${rotation * 180 / Math.PI} degrees)`);
    
    // Show what's in each direction from current position (uses canonical Direction)
    console.log('Tiles in each direction:');
    for (let i = 0; i < 4; i++) {
      const d = Dir.delta(i);
      const tile = this.gridSystem.getTile(pos.x + d.x, pos.z + d.z);
      console.log(`  ${Dir.name(i)}: ${tile ? tile.type : 'undefined'} at (${pos.x + d.x}, ${pos.z + d.z})`);
    }
    
    console.log('==========================');
  }

  /**
   * Test minimap functionality (press M key)
   */
  testMinimap() {
    console.log('=== MINIMAP TEST ===');
    
    const minimapElement = document.getElementById('minimap');
    const minimapGrid = document.getElementById('minimap-grid');
    
    console.log('Minimap element:', minimapElement);
    console.log('Minimap grid:', minimapGrid);
    
    if (minimapGrid) {
      console.log('Grid children count:', minimapGrid.children.length);
      
      // Force create a simple test grid
      minimapGrid.innerHTML = '';
      for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'minimap-cell wall';
        cell.textContent = '■';
        cell.style.width = '20px';
        cell.style.height = '20px';
        cell.style.display = 'inline-block';
        cell.style.border = '1px solid #00ff00';
        cell.style.backgroundColor = '#666';
        cell.style.color = '#fff';
        minimapGrid.appendChild(cell);
      }
      
      console.log('Test grid created with', minimapGrid.children.length, 'cells');
    }
    
    console.log('==================');
  }

  /**
   * Complete system diagnosis (press P key)
   */
  fullDiagnosis() {
    console.log('=== COMPLETE SYSTEM DIAGNOSIS ===');
    
    const pos = this.movementController.getPosition();
    const dir = this.movementController.getDirection();
    const rotation = this.movementController.getCurrentRotation();
    
    console.log(`Current Position: (${pos.x}, ${pos.z})`);
    console.log(`Current Direction: ${dir} (${['North', 'East', 'South', 'West'][dir]})`);
    console.log(`Camera Rotation: ${rotation} radians (${rotation * 180 / Math.PI}°)`);
    
    // Test all movement calculations
    console.log('\n--- MOVEMENT CALCULATIONS ---');
    const forward = this.movementController.calculateForwardPosition();
    const backward = this.movementController.calculateBackwardPosition();
    const strafeL = this.movementController.calculateStrafeLeftPosition();
    const strafeR = this.movementController.calculateStrafeRightPosition();
    
    console.log(`Forward would go to: (${forward.x}, ${forward.z})`);
    console.log(`Backward would go to: (${backward.x}, ${backward.z})`);
    console.log(`Strafe Left would go to: (${strafeL.x}, ${strafeL.z})`);
    console.log(`Strafe Right would go to: (${strafeR.x}, ${strafeR.z})`);
    
    // Show what tiles are in each direction
    console.log('\n--- TILES IN EACH DIRECTION ---');
    const tiles = {
      forward: this.gridSystem.getTile(forward.x, forward.z),
      backward: this.gridSystem.getTile(backward.x, backward.z),
      strafeLeft: this.gridSystem.getTile(strafeL.x, strafeL.z),
      strafeRight: this.gridSystem.getTile(strafeR.x, strafeR.z)
    };
    Logger.tag('Diag').info('forward', forward, 'backward', backward, 'sL', strafeL, 'sR', strafeR);
    
    console.log(`Forward tile: ${tiles.forward ? tiles.forward.type : 'undefined'}`);
    console.log(`Backward tile: ${tiles.backward ? tiles.backward.type : 'undefined'}`);
    console.log(`Strafe Left tile: ${tiles.strafeLeft ? tiles.strafeLeft.type : 'undefined'}`);
    console.log(`Strafe Right tile: ${tiles.strafeRight ? tiles.strafeRight.type : 'undefined'}`);
    
    console.log('================================');
  }
  
  /**
   * Show detailed performance statistics (press F key)
   */
  showPerformanceStats() {
    if (this.performanceManager) {
      const detailedReport = this.performanceManager.getDetailedReport();
      const metrics = this.performanceManager.getPerformanceMetrics();
      
      console.log('=== ENHANCED PERFORMANCE STATISTICS ===');
      console.log(`Current FPS: ${metrics.fps.toFixed(1)}`);
      console.log(`Frame Time: ${metrics.frameTime.toFixed(2)}ms`);
      console.log(`Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB`);
      console.log(`Render Calls: ${metrics.renderCalls}`);
      console.log(`Instanced Objects: ${metrics.instancedObjects}`);
      console.log(`Culled Objects: ${metrics.culledObjects}`);
      console.log(`Optimizations Applied: ${metrics.optimizationCount}`);
      console.log(`Performance Alerts: ${metrics.alerts}`);
      
      // Show benchmark details
      if (detailedReport.benchmark) {
        const bench = detailedReport.benchmark;
        console.log('\n--- Benchmark Details ---');
        console.log(`Average FPS: ${bench.fps.average.toFixed(1)}`);
        console.log(`Min FPS: ${bench.fps.min.toFixed(1)}`);
        console.log(`Max FPS: ${bench.fps.max.toFixed(1)}`);
        console.log(`Frame Time P95: ${bench.frameTime.p95.toFixed(2)}ms`);
        console.log(`Frame Time P99: ${bench.frameTime.p99.toFixed(2)}ms`);
      }
      
      // Show memory details
      if (detailedReport.memory) {
        const mem = detailedReport.memory;
        console.log('\n--- Memory Details ---');
        console.log(`Peak Memory: ${mem.peakMemoryUsage.toFixed(2)}MB`);
        console.log(`Undisposed Resources: ${mem.undisposedResources}`);
        console.log(`Queued for Disposal: ${mem.queuedForDisposal}`);
      }
      
      // Show culling details
      if (detailedReport.culling) {
        const cull = detailedReport.culling;
        console.log('\n--- Culling Details ---');
        console.log(`Total Objects: ${cull.totalObjects}`);
        console.log(`Visible Objects: ${cull.visibleObjects}`);
        console.log(`Culled Objects: ${cull.culledObjects}`);
        console.log(`Culling Ratio: ${(cull.cullingRatio * 100).toFixed(1)}%`);
        console.log(`Culling Time: ${cull.cullingTime.toFixed(2)}ms`);
      }
      
      console.log('=====================================');
      
      // Show in toast for user visibility
      this.debugUI.showToast(`FPS: ${metrics.fps.toFixed(1)} | Mem: ${metrics.memoryUsage.toFixed(1)}MB | Culled: ${metrics.culledObjects}`, 'info');
    } else {
      // Fallback to basic stats
      const stats = this.getPerformanceStats();
      console.log('=== BASIC PERFORMANCE STATISTICS ===');
      console.log(`Current FPS: ${stats.currentFPS}`);
      console.log(`Average FPS: ${stats.averageFPS.toFixed(1)}`);
      console.log(`Frame Time: ${stats.averageFrameTime.toFixed(2)}ms`);
      console.log('===================================');
      
      this.debugUI.showToast(`FPS: ${stats.currentFPS} | Frame: ${stats.averageFrameTime.toFixed(1)}ms`, 'info');
    }
  }

  /**
   * Run extended session test for memory leak detection (press T key)
   */
  async runExtendedSessionTest() {
    if (!this.performanceManager) {
      this.debugUI.showWarning('Performance manager not available');
      return;
    }
    
    this.debugUI.showToast('Starting extended session test (10 minutes)...', 'info');
    console.log('Starting extended session test...');
    
    try {
      const results = await this.performanceManager.runExtendedSessionTest(600000); // 10 minutes
      
      console.log('=== EXTENDED SESSION TEST RESULTS ===');
      console.log(`Duration: ${results.duration / 1000}s`);
      console.log(`Memory Snapshots: ${results.memorySnapshots.length}`);
      console.log(`Performance Snapshots: ${results.performanceSnapshots.length}`);
      console.log(`Leaks Detected: ${results.leaksDetected.length}`);
      console.log(`Recommendations: ${results.recommendations.length}`);
      
      if (results.recommendations.length > 0) {
        console.log('\n--- Recommendations ---');
        results.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.severity.toUpperCase()}] ${rec.message}`);
          if (rec.details) console.log(`   ${rec.details}`);
        });
      }
      
      console.log('====================================');
      
      // Show summary in UI
      const summary = `Test completed: ${results.leaksDetected.length} leaks, ${results.recommendations.length} recommendations`;
      this.debugUI.showSuccess(summary);
      
    } catch (error) {
      console.error('Extended session test failed:', error);
      this.debugUI.showError('Extended session test failed', { system: 'PerformanceManager' });
    }
  }

  /**
   * Test complete movement flow from input to rendering
   */
  testMovementFlow() {
    console.log('=== TESTING MOVEMENT FLOW ===');
    
    const position = this.movementController.getPosition();
    const direction = this.movementController.getDirection();
    
    console.log(`Starting position: (${position.x}, ${position.z}), direction: ${direction}`);
    
    // Test all movement calculations
    const movements = {
      forward: this.movementController.calculateForwardPosition(),
      backward: this.movementController.calculateBackwardPosition(),
      strafeLeft: this.movementController.calculateStrafeLeftPosition(),
      strafeRight: this.movementController.calculateStrafeRightPosition()
    };
    
    // Test collision detection for each movement
    Object.entries(movements).forEach(([movementType, targetPos]) => {
      const collision = this.collisionSystem.checkMovement(
        position.x, position.z, 
        targetPos.x, targetPos.z
      );
      
      const tile = this.gridSystem.getTile(targetPos.x, targetPos.z);
      console.log(`${movementType}: (${targetPos.x}, ${targetPos.z}) - ${tile ? tile.type : 'undefined'} - ${collision.blocked ? 'BLOCKED' : 'ALLOWED'}`);
      
      if (collision.blocked) {
        console.log(`  Reason: ${collision.reason}`);
      }
    });
    
    // Test door interactions
    this.testDoorInteractions();
    
    console.log('===========================');
  }

  /**
   * Test door interactions at current position
   */
  testDoorInteractions() {
    console.log('--- Testing Door Interactions ---');

    const position = this.movementController.getPosition();
    for (let i = 0; i < 4; i++) {
      const d = Dir.delta(i);
      const checkX = position.x + d.x;
      const checkZ = position.z + d.z;
      const tile = this.gridSystem.getTile(checkX, checkZ);

      if (tile && tile.type === 'door') {
        console.log(`Door found ${Dir.name(i)} at (${checkX}, ${checkZ})`);
        console.log(`  Locked: ${tile.locked}, Key: ${tile.keyType || 'none'}`);
        console.log(`  Orientation: ${tile.orientation}`);
        console.log(`  Walkable: ${tile.walkable}`);
      }
    }
  }

  /**
   * Test edge cases and boundary conditions
   */
  testEdgeCases() {
    console.log('=== TESTING EDGE CASES ===');
    
    const position = this.movementController.getPosition();
    const currentLevel = this.dungeonLoader.getCurrentLevel();
    
    if (!currentLevel) {
      console.log('No current level data available');
      return;
    }
    
    console.log(`Level dimensions: ${currentLevel.width}x${currentLevel.height}`);
    
    // Test boundary conditions
    const boundaries = [
      {name: 'Top-left corner', x: 0, z: 0},
      {name: 'Top-right corner', x: currentLevel.width - 1, z: 0},
      {name: 'Bottom-left corner', x: 0, z: currentLevel.height - 1},
      {name: 'Bottom-right corner', x: currentLevel.width - 1, z: currentLevel.height - 1},
      {name: 'Out of bounds (negative)', x: -1, z: -1},
      {name: 'Out of bounds (positive)', x: currentLevel.width, z: currentLevel.height}
    ];
    
    boundaries.forEach(({name, x, z}) => {
      const tile = this.gridSystem.getTile(x, z);
      const isValid = this.gridSystem.isValidPosition(x, z);
      console.log(`${name} (${x}, ${z}): ${tile ? tile.type : 'undefined'} - Valid: ${isValid}`);
    });
    
    // Test transition tiles
    console.log('--- Transition Tiles ---');
    if (currentLevel.transitions && currentLevel.transitions.length > 0) {
      currentLevel.transitions.forEach((transition, index) => {
        const tile = this.gridSystem.getTile(transition.x, transition.z);
        console.log(`Transition ${index + 1}: (${transition.x}, ${transition.z}) -> ${transition.target}`);
        console.log(`  Tile type: ${tile ? tile.type : 'undefined'}`);
        console.log(`  Target spawn: (${transition.spawn.x}, ${transition.spawn.z})`);
      });
    } else {
      console.log('No transitions in current level');
    }
    
    // Test door states
    console.log('--- Door States ---');
    if (currentLevel.doors && currentLevel.doors.length > 0) {
      currentLevel.doors.forEach((door, index) => {
        const tile = this.gridSystem.getTile(door.x, door.z);
        console.log(`Door ${index + 1}: (${door.x}, ${door.z})`);
        console.log(`  Locked: ${door.locked}, Key: ${door.keyType || 'none'}`);
        console.log(`  Orientation: ${door.orientation}`);
        console.log(`  Tile walkable: ${tile ? tile.walkable : 'undefined'}`);
      });
    } else {
      console.log('No doors in current level');
    }
    
    console.log('========================');
  }

  /**
   * Get debug UI instance for external access
   */
  getDebugUI() {
    return this.debugUI;
  }

  /**
   * Run combat performance test (press C key)
   */
  async runCombatPerformanceTest() {
    if (!this.performanceTester) {
      this.debugUI.showWarning('Performance tester not available');
      return;
    }
    
    this.debugUI.showToast('Starting combat performance test (100 combats)...', 'info');
    console.log('Starting combat performance test...');
    
    try {
      const results = await this.performanceTester.runCombatPerformanceTest({
        targetCount: 100,
        enemyCount: 6
      });
      
      console.log('=== COMBAT PERFORMANCE TEST RESULTS ===');
      console.log(`Combats completed: ${results.combats.length}`);
      console.log(`Average combat time: ${results.metrics.avgCombatTime.toFixed(0)}ms`);
      console.log(`Average FPS: ${results.metrics.avgFPS.toFixed(1)}`);
      console.log(`Min FPS: ${results.metrics.minFPS.toFixed(1)}`);
      console.log(`Memory increase: ${results.metrics.memoryIncrease.toFixed(1)}MB`);
      console.log(`Success rate: ${(results.metrics.successRate * 100).toFixed(1)}%`);
      console.log('======================================');
      
      // Show summary in UI
      const fpsStatus = results.metrics.avgFPS >= 55 ? '✅' : '❌';
      const summary = `Combat test: ${fpsStatus} ${results.metrics.avgFPS.toFixed(1)} FPS avg, ${results.metrics.avgCombatTime.toFixed(0)}ms avg time`;
      this.debugUI.showSuccess(summary);
      
    } catch (error) {
      console.error('Combat performance test failed:', error);
      this.debugUI.showError('Combat performance test failed', { system: 'PerformanceTester' });
    }
  }

  /**
   * Run save/load performance test (press S key)
   */
  async runSaveLoadPerformanceTest() {
    if (!this.performanceTester) {
      this.debugUI.showWarning('Performance tester not available');
      return;
    }
    
    this.debugUI.showToast('Starting save/load performance test (50 operations)...', 'info');
    console.log('Starting save/load performance test...');
    
    try {
      const results = await this.performanceTester.runSaveLoadPerformanceTest({
        targetCount: 50
      });
      
      console.log('=== SAVE/LOAD PERFORMANCE TEST RESULTS ===');
      console.log(`Operations completed: ${results.operations.length}`);
      console.log(`Average save time: ${results.metrics.avgSaveTime.toFixed(0)}ms`);
      console.log(`Average load time: ${results.metrics.avgLoadTime.toFixed(0)}ms`);
      console.log(`Max save time: ${results.metrics.maxSaveTime.toFixed(0)}ms`);
      console.log(`Max load time: ${results.metrics.maxLoadTime.toFixed(0)}ms`);
      console.log(`Success rate: ${(results.metrics.successRate * 100).toFixed(1)}%`);
      console.log(`Failure count: ${results.metrics.failureCount}`);
      console.log('=========================================');
      
      // Show summary in UI
      const saveStatus = results.metrics.avgSaveTime < 1000 ? '✅' : '❌';
      const loadStatus = results.metrics.avgLoadTime < 1000 ? '✅' : '❌';
      const summary = `Save/Load test: ${saveStatus} ${results.metrics.avgSaveTime.toFixed(0)}ms save, ${loadStatus} ${results.metrics.avgLoadTime.toFixed(0)}ms load`;
      this.debugUI.showSuccess(summary);
      
    } catch (error) {
      console.error('Save/load performance test failed:', error);
      this.debugUI.showError('Save/load performance test failed', { system: 'PerformanceTester' });
    }
  }

  /**
   * Show comprehensive performance report (press R key)
   */
  showPerformanceReport() {
    if (!this.performanceTester) {
      this.debugUI.showWarning('Performance tester not available');
      return;
    }
    
    const results = this.performanceTester.getTestResults();
    const optimizerMetrics = this.performanceOptimizer.getMetrics();
    const memoryStats = this.memoryManager.getMemoryStats();
    
    console.log('=== COMPREHENSIVE PERFORMANCE REPORT ===');
    
    // Current performance metrics
    console.log('\n--- Current Performance ---');
    console.log(`FPS: ${optimizerMetrics.avgFPS.toFixed(1)} (min: ${optimizerMetrics.minFPS.toFixed(1)}, max: ${optimizerMetrics.maxFPS.toFixed(1)})`);
    console.log(`Frame Time: ${optimizerMetrics.frameTime.toFixed(2)}ms`);
    console.log(`Memory Usage: ${optimizerMetrics.memoryUsage.toFixed(1)}MB (peak: ${optimizerMetrics.peakMemory.toFixed(1)}MB)`);
    
    // Optimization status
    console.log('\n--- Optimizations ---');
    console.log(`Object Pooling: ${optimizerMetrics.optimizations.objectPooling ? 'Enabled' : 'Disabled'}`);
    console.log(`Batch Rendering: ${optimizerMetrics.optimizations.batchRendering ? 'Enabled' : 'Disabled'}`);
    console.log(`Culling: ${optimizerMetrics.optimizations.culling ? 'Enabled' : 'Disabled'}`);
    console.log(`Particle Limit: ${optimizerMetrics.optimizations.particleLimit}`);
    console.log(`Effect Quality: ${optimizerMetrics.optimizations.effectQuality}`);
    
    // Memory analysis
    console.log('\n--- Memory Analysis ---');
    console.log(`Current Usage: ${memoryStats.current.toFixed(1)}MB`);
    console.log(`Peak Usage: ${memoryStats.peak.toFixed(1)}MB`);
    console.log(`Object Counts:`, memoryStats.objectCounts);
    
    // Test results summary
    if (results.summary) {
      const summary = results.summary;
      console.log('\n--- Test Results Summary ---');
      console.log(`Total Tests Run: ${summary.totalTests}`);
      
      if (summary.combat.testsRun > 0) {
        console.log(`Combat Tests: ${summary.combat.testsRun} (${(summary.combat.passRate * 100).toFixed(1)}% pass rate)`);
        console.log(`  Avg FPS: ${summary.combat.avgFPS.toFixed(1)}, Avg Time: ${summary.combat.avgCombatTime.toFixed(0)}ms`);
      }
      
      if (summary.saveLoad.testsRun > 0) {
        console.log(`Save/Load Tests: ${summary.saveLoad.testsRun} (${(summary.saveLoad.passRate * 100).toFixed(1)}% pass rate)`);
        console.log(`  Avg Save: ${summary.saveLoad.avgSaveTime.toFixed(0)}ms, Avg Load: ${summary.saveLoad.avgLoadTime.toFixed(0)}ms`);
      }
      
      if (summary.session.testsRun > 0) {
        console.log(`Session Tests: ${summary.session.testsRun}`);
        console.log(`  Duration: ${summary.session.duration.toFixed(1)}min, Memory Increase: ${summary.session.memoryIncrease.toFixed(1)}MB`);
        console.log(`  Min FPS: ${summary.session.minFPS.toFixed(1)}`);
      }
    }
    
    console.log('=======================================');
    
    // Show summary in UI
    const fpsStatus = optimizerMetrics.avgFPS >= 55 ? '✅' : '❌';
    const memoryStatus = optimizerMetrics.memoryUsage <= 400 ? '✅' : '❌';
    const uiSummary = `Performance: ${fpsStatus} ${optimizerMetrics.avgFPS.toFixed(1)} FPS, ${memoryStatus} ${optimizerMetrics.memoryUsage.toFixed(1)}MB`;
    this.debugUI.showToast(uiSummary, 'info');
  }

  /**
   * Dispose of engine resources
   */
  dispose() {
    console.log('Disposing DungeonCrawlerEngine...');
    
    // Stop game loop
    this.stop();
    
    // Dispose performance systems
    if (this.performanceTester) {
      this.performanceTester.destroy();
    }
    
    if (this.performanceOptimizer) {
      this.performanceOptimizer.destroy();
    }
    
    if (this.memoryManager) {
      this.memoryManager.destroy();
    }
    
    // Dispose performance manager
    if (this.performanceManager) {
      this.performanceManager.dispose();
    }
    
    // Dispose other systems
    if (this.dungeonLoader) {
      this.dungeonLoader.dispose();
    }
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    console.log('DungeonCrawlerEngine disposed');
  }
}

// Initialize and start the engine when page loads
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing engine...');
  
  const engine = new DungeonCrawlerEngine();
  
  try {
    await engine.initialize();
    engine.start();
    
    // Make engine globally accessible for debugging
    window.dungeonEngine = engine;
    // Theme switching from DevTools:
    //   import('/src/engine/themes/CryptTheme.js').then(m => ThemeManager.apply(m.CryptTheme))
    window.ThemeManager = ThemeManager;
    // Touch controls toggle from DevTools: dungeonEngine.touchControls.setEnabled(false)
    window.toggleTouch = (v) => engine.touchControls?.setEnabled(v ?? !engine.touchControls.isEnabled());
    
  } catch (error) {
    console.error('Failed to start engine:', error);
  }
});