/**
 * ViewFieldSystem — 5×5 cone-of-vision for targeting and item visibility.
 * Ported from darkmoor ViewField.java (16 visible positions).
 *
 * Layout (player at centre-bottom, facing North):
 *
 *      col:  0   1   2   3   4
 *  row 0:   [A] [B] [C] [D] [E]   far
 *  row 1:   [F] [G] [H] [I] [J]
 *  row 2:   [ ] [K] [L] [M] [ ]
 *  row 3:   [ ] [ ] [P] [ ] [ ]   near (player position)
 *
 *  16 named positions: A-M plus P (player tile).
 *  Positions off the view cone are not included.
 *
 * The grid is recalculated every time the player moves/turns.
 */
export class ViewFieldSystem {
  // Relative (dx, dz) offsets for each ViewField slot, indexed 0–15.
  // Orientation: player faces North (z decreases).
  // [slot_index] -> { dx, dz, label }
  static SLOTS = [
    // Row 3 (near) — 1 visible tile directly ahead
    { dx:  0, dz: -1, label: 'P1' },  // 0: directly ahead
    // Row 2 — 3 tiles
    { dx: -1, dz: -2, label: 'K'  },  // 1
    { dx:  0, dz: -2, label: 'L'  },  // 2
    { dx:  1, dz: -2, label: 'M'  },  // 3
    // Row 1 — 5 tiles
    { dx: -2, dz: -3, label: 'F'  },  // 4
    { dx: -1, dz: -3, label: 'G'  },  // 5
    { dx:  0, dz: -3, label: 'H'  },  // 6
    { dx:  1, dz: -3, label: 'I'  },  // 7
    { dx:  2, dz: -3, label: 'J'  },  // 8
    // Row 0 (far) — 5 tiles
    { dx: -2, dz: -4, label: 'A'  },  // 9
    { dx: -1, dz: -4, label: 'B'  },  // 10
    { dx:  0, dz: -4, label: 'C'  },  // 11
    { dx:  1, dz: -4, label: 'D'  },  // 12
    { dx:  2, dz: -4, label: 'E'  },  // 13
    // Player's own tile
    { dx:  0, dz:  0, label: 'SELF' }, // 14
  ];

  constructor(gridSystem) {
    this._grid = gridSystem;
    this._visible = []; // cached list of { x, z, slot, tile }
  }

  /**
   * Recompute visible tiles based on player position and direction.
   * @param {number} px - Player grid X
   * @param {number} pz - Player grid Z
   * @param {number} dir - Facing direction 0=N 1=E 2=S 3=W
   */
  update(px, pz, dir) {
    this._visible = [];
    const rot = dir; // 0=N: dz offset as-is; rotate for other directions

    for (const slot of ViewFieldSystem.SLOTS) {
      const { dx, dz } = this._rotate(slot.dx, slot.dz, rot);
      const wx = px + dx;
      const wz = pz + dz;
      const tile = this._grid?.getTile(wx, wz);
      if (!tile) continue;
      this._visible.push({ x: wx, z: wz, slot: slot.label, tile });
    }
  }

  /** Returns all currently visible tiles. */
  getVisible() { return this._visible; }

  /** Returns visible tiles that have ground items. */
  getVisibleGroundItems() {
    return this._visible.filter(v => v.tile.groundItems?.some(Boolean));
  }

  /** Returns the depth row (0=far, 3=near) of a tile at (x,z), or -1 if not visible. */
  getDepth(x, z) {
    const entry = this._visible.find(v => v.x === x && v.z === z);
    if (!entry) return -1;
    const label = entry.slot;
    if (['A','B','C','D','E'].includes(label)) return 0;
    if (['F','G','H','I','J'].includes(label)) return 1;
    if (['K','L','M'].includes(label))          return 2;
    return 3; // near / SELF
  }

  /** Check if a grid position is within the current view cone. */
  isVisible(x, z) {
    return this._visible.some(v => v.x === x && v.z === z);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _rotate(dx, dz, dir) {
    switch (dir) {
      case 0: return { dx,       dz       }; // North: identity
      case 1: return { dx: -dz,  dz:  dx  }; // East:  90° CW
      case 2: return { dx: -dx,  dz: -dz  }; // South: 180°
      case 3: return { dx:  dz,  dz: -dx  }; // West:  90° CCW
      default: return { dx, dz };
    }
  }
}
