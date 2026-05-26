import { Logger } from '../utils/Logger.js';

const log = Logger.tag('Interaction');

/**
 * InteractionSystem — THREE.Raycaster prop interaction on Interact key (Space / E).
 *
 * When the player presses the interact key, casts a ray from camera centre
 * forward. If it hits a mesh with userData.interactive = true within MAX_DIST,
 * dispatches 'propInteract' CustomEvent with { mesh, propType, distance }.
 *
 * Usage:
 *   new InteractionSystem(camera, scene).initialize()
 *   → listens for 'interactKey' CustomEvent (dispatched by InputManager)
 *   → dispatches 'propInteract' on hit
 */
export class InteractionSystem {
  static MAX_DIST = 3.0;  // world units — max interaction range

  constructor(camera, scene) {
    this._camera  = camera;
    this._scene   = scene;
    this._ray     = null;
    this._handler = null;
  }

  initialize() {
    this._ray = new THREE.Raycaster();
    this._ray.far = InteractionSystem.MAX_DIST;

    this._handler = () => this._cast();
    window.addEventListener('interactKey', this._handler);
    log.info('initialized');
  }

  dispose() {
    if (this._handler) window.removeEventListener('interactKey', this._handler);
    this._handler = null;
    this._ray     = null;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _cast() {
    if (!this._camera || !this._scene || !this._ray) return;

    // Ray from camera centre looking forward (NDC 0,0 = screen centre)
    this._ray.setFromCamera(new THREE.Vector2(0, 0), this._camera);

    const hits = this._ray.intersectObjects(this._scene.children, true);

    for (const hit of hits) {
      if (hit.object?.userData?.interactive) {
        const mesh     = hit.object;
        const propType = mesh.userData.propType ?? 'unknown';
        log.debug('hit', { propType, dist: hit.distance.toFixed(2) });
        window.dispatchEvent(new CustomEvent('propInteract', {
          detail: { mesh, propType, distance: hit.distance }
        }));
        return; // first interactive object only
      }
    }
  }
}
