# Combat System Audit & Correction Plan

**Date:** 2026-05-19
**Scope:** `src/engine/combat/*`, `src/engine/ui/Combat*`, `src/engine/systems/EncounterSystem.js`
**Status:** Combat loop runs end-to-end but ~30 defects across logic, integration, balance, and UX layers.

---

## Module Map

| Module | Responsibility | LOC |
|---|---|---|
| `CombatSystem.js` | Turn loop, AP, win/lose detection, AI orchestration | ~710 |
| `ActionSystem.js` | Action definitions, damage calc, skill execution | ~724 |
| `ActionResolver.js` | Validates + executes actions, fakes animations | ~456 |
| `TargetingSystem.js` | Target lists per `targetType` | ~470 |
| `AIActionValidator.js` | Validates AI decisions, fallback action | ~500 |
| `EnemyAI.js` | Action selection per archetype | ~700 |
| `Enemy.js` | Enemy class with stats/AI/loot | ~480 |
| `EncounterSystem.js` | Random/scripted encounter trigger | ~647 |
| `CombatSystem` ↔ UI: `CombatUIManager` (router), `CombatUI` (DOM), `CombatAnimations`, `CombatResultsUI` |

---

## Issues — Severity-Ranked

### 🔴 CRITICAL (combat-breaking or rewards-broken)

#### C1 — Rewards calculated but never applied
**File:** `CombatSystem.js:298-320, 423-440`
`calculateRewards()` returns `{experience, gold, loot}`. `endCombat()` stores in `combatResults` and emits event. **No code calls `character.addExperience()`, `partyManager.addGold()`, or `inventory.addItem()`.** Victory yields nothing.
**Fix:** Add `distributeRewards()` method invoked from `endCombat()` on victory. Distribute XP per `alivePartyMembers`, gold to party, loot to shared inventory.

#### C2 — Item action is a stub
**File:** `ActionSystem.js:429-433`
```js
executeItem(action, user, targets, result) {
  result.messages.push(`${user.name} uses an item`);
  return result;
}
```
No item consumed, no effect applied, no inventory checked. Players can spam "Item" infinitely with no consequence.
**Fix:** Wire to `InventorySystem`. Action data must carry `itemId`. Pull `ConsumableSystem.consume(itemId, target)`.

#### C3 — Status effects never expire
**File:** `ActionSystem.js:444-449, 367-372, 405-410`
Buffs pushed to `target.statusEffects` with `duration: N`. **No tick anywhere.** No `processTurnEnd` decrements duration. Defend's "1 turn" defense lasts forever.
**Fix:** Add `tickStatusEffects(character)` called per-turn in `CombatSystem.nextTurn()`. Decrement duration, splice expired effects.

#### C4 — Status effects mostly do nothing
**File:** `ActionSystem.js:565-583` (only handler)
`applyStatusEffectModifiers` reads only `defense_boost` and `attack_boost`. The codebase produces: `stat_boost`, `evasion_boost`, `magic_shield`, `immunity`, `poison`, `taunt`. **None implemented.** Mage's "iron_will" / "divine_shield" / "mana_shield" are placebos.
**Fix:** Expand `applyStatusEffectModifiers` to handle all effect types. Add evasion check (skip damage), immunity (zero damage), poison (DoT per turn).

#### C5 — Dead characters take turns
**File:** `CombatSystem.js:183-229, 234-252`
`updateTurnOrder()` filters dead chars only at end-of-round (when `currentTurnIndex` wraps). A character dying on action 1 still gets called as `currentCharacter` on action 2.
**Fix:** Call `updateTurnOrder()` after every action (in `processAction` post-damage). Also skip dead chars in `nextTurn()`.

#### C6 — Combat results UI never shown
**File:** `CombatUIManager.js:124-134`, `CombatResultsUI.js`
`handleCombatEnded` just hides combat UI after 2s. `CombatResultsUI` IS initialized inside `CombatUIManager.initialize()` but its own listener for `combatEnded` exists separately — it adds DOM to `document.body` directly (not via UIRouter), so the screen may appear but is decoupled from menu flow.
**Fix:** Register `combat-results` with UIRouter. Explicitly push it from `handleCombatEnded`. Wire continue/retry/menu buttons to UIRouter actions, not raw events.

#### C7 — No XP distribution → no level-ups → broken progression
Direct consequence of C1. `ExperienceSystem` exists but combat never feeds it.
**Fix:** Part of C1 fix. After XP applied, iterate party for `character.checkLevelUp()`, emit `levelUpEvent`, `CombatResultsUI.showLevelUpCelebration` (already exists, never called).

#### C8 — Skill cooldowns: half-implemented
**File:** `ActionResolver.js:158-161`, `ActionSystem.js:34-40`
Validator checks `skill.currentCooldown > 0`. **Nothing sets or decrements `currentCooldown`.** `getAvailableActions` only filters by AP. Skills usable every turn.
**Fix:** On skill use, set `skill.currentCooldown = skill.cooldown`. Tick in `nextTurn` per-character. Filter in `getAvailableActions`.

---

### 🟠 HIGH (gameplay-significant)

#### H1 — Defend AP cost cancels out
**File:** `ActionSystem.js:452`, `CombatSystem.js:352-358`
`executeDefend` does `currentAP += 1`. Then `processAction` does `useAP(apCost=1)`. Net: 0 AP spent. Defend is free. Unclear if intended.
**Fix:** Decide design intent. If "defend grants 1 AP for next turn" → don't modify currentAP during execute; queue an effect that adds AP on next `resetAP`. If "defend is free + gains stance" → set `apCost: 0` in action def.

#### H2 — `result.success` always true even when nothing happened
**File:** `ActionSystem.js:146, 192-194`
`executeAttack` loops targets; if all are dead/null, no damage dealt — but result.success stays true. Action consumes AP, character loses turn, zero effect.
**Fix:** Set `result.success = result.damage.length > 0 || result.healing.length > 0 || result.statusEffects.length > 0` at end of execute methods.

#### H3 — `executeSkill` silent fallback to damage skill
**File:** `ActionSystem.js:259-262`
```js
default:
  return this.executeSkillAttack(skill, ...)
```
Unknown skill types get treated as attacks. A misconfigured "buff" skill secretly damages targets.
**Fix:** Log warning + `result.success = false` for unknown types.

#### H4 — Animation delays block combat (~7s per action)
**File:** `ActionResolver.js:204-352`
Each action awaits `delay(300)` + `delay(200)` per target + `delay(500)` for skills. 4-vs-2 fight = ~30s of fake delays for nonexistent animations.
**Fix:** Either (a) wire `ActionResolver` → `CombatAnimations` for real DOM animations, or (b) gate delays behind `if (this.animationsEnabled)` flag, off by default.

#### H5 — Reward distribution: gold only to "party", not allocated to inventory
**File:** Combat → loot system path missing.
`lootSystem.generateCombatLoot` returns items array. No code adds items to inventory.
**Fix:** In `distributeRewards()`, loop loot items and call `inventorySystem.addItem(itemId, qty)`.

#### H6 — No turn-end / round-end events emitted
`CombatSystem` emits `turnStarted`, `actionExecuted`, `combatEnded` but never `turnEnded` or `roundStarted`. UI can't sync status-effect tick animations or per-round logic.
**Fix:** Emit `turnEnded(character)` and `roundStarted(round)` events.

#### H7 — Combat doesn't tick statusEffects' `duration` per-turn
Already noted as C3. Listing separately because UI also has no concept of "turns remaining" display.

#### H8 — Boss phase transitions silent
**File:** `Enemy.js:232-273`, `ActionSystem.js:204-210, 289-294`
`checkPhaseTransition` triggers but only pushes a log message. No `phaseChanged` combat event. UI doesn't know to display anything.
**Fix:** Emit `bossPhaseChanged` event with phase data. CombatUI: show banner / play sound / change card style.

#### H9 — Pre-validation in `processAction` duplicates `validateAction` in ActionResolver
**File:** `CombatSystem.js:329-345`, `ActionResolver.js:89-130`
processAction checks `character !== currentCharacter` and `hasAP(apCost)` before calling resolveAction, which does its own AP check. Result: two error formats (`{error}` vs `{errors:[]}`) — already patched in UI layer but cleaner to consolidate.
**Fix:** Strip pre-validation from `processAction`; rely on `resolveAction.validateAction`. Normalize all errors as array `result.errors`.

#### H10 — No "wait" / "delay turn" action — only "skip" wastes full turn
`skipTurn()` sets `currentAP = 0`. Player wanting to save AP for next turn cannot.
**Fix:** Add "End Turn" (saves remaining AP for next turn — i.e., next-turn AP starts at `currentAP + maxAP`, capped). Or accept current "skip = waste".

#### H11 — Character damage from enemy doesn't refresh exploration HUD
Outside combat scope but related: party HP bars in exploration HUD only update via the per-frame `updateExplorationHUD()`. If combat damages a member, HUD shows correct HP after combat ends. Fine for now.

---

### 🟡 MEDIUM (balance / clarity)

#### M1 — Damage formula bypasses balance config
**File:** `ActionSystem.js:488-531`
`baseDamage = ATK - floor(DEF/2)`. Hard-coded. `combatBalanceConfig` imported but only consulted for AP costs. Variance ±10%, crit ×2, elemental from local chart.
**Fix:** Route all magic numbers through `combatBalanceConfig` so designers can tune without code changes.

#### M2 — Local elemental chart in ActionSystem duplicates EnemyDatabase resistances
**File:** `ActionSystem.js:11-15` vs `Enemy.js:178-194`
Two parallel elemental systems. `calculateDamage` uses ActionSystem chart; `Enemy.takeDamageWithElement` uses its own resistances. Currently `takeDamage` (no element) used in `executeAttack`, so resistances never apply.
**Fix:** Either always call `takeDamageWithElement(damage, action.element)`, or drop the local chart and route everything through Enemy resistances.

#### M3 — Crit chance can exceed display 100%
**File:** `ActionSystem.js:538-542` — already known per `docs/known-issues.md`.
Calc is `0.05 + SPD/30`, clamped at 0.5 internally. Display layer is the bug.
**Fix:** Cap displayed value at 50%.

#### M4 — `selectActionByArchetype` ignores score for AGGRESSIVE/DEFENSIVE if filter matches early action
**File:** `EnemyAI.js:316-359`
`selectAggressiveAction` takes first attack action via `reduce` — fine. `selectDefensiveAction` returns first heal action `healActions[0]` without comparing scores. Picks alphabetically/insertion-order best, not score-best.
**Fix:** `healActions.reduce((best, cur) => cur.score > best.score ? cur : best)`.

#### M5 — `executeFlee` doesn't actually end combat on success
**File:** `ActionSystem.js:465-479`
Pushes `flee_success` effect to result; nothing reads it. Combat continues normally.
**Fix:** In `CombatSystem.processAction`, after resolution check `if (resolution.executionResult?.effects?.some(e=>e.type==='flee_success'))` → call `endCombat('fled', null)`.

#### M6 — `front_row_enemies` / `back_row_enemies` rely on formation that may not exist
**File:** `TargetingSystem.js:125-149`
References `playerParty.formation.frontRow` and `playerParty.formation.backRow`. Need to confirm `PartyManager` always builds formation.

#### M7 — Encounter cooldown counter increments inside the "won't trigger" branch
**File:** `EncounterSystem.js:235-249`
Reads ok but logic mixed — `movesSinceEncounter++` happens in two branches. Refactor for clarity.

#### M8 — `endCombat` doesn't clear party statusEffects
After combat: character.statusEffects still has stale entries (taunt, defense_boost from defend, etc.). Next combat inherits them.
**Fix:** On `endCombat`, iterate party + enemies, `statusEffects = []`.

#### M9 — `AIActionValidator.validateAllEnemiesTarget` only warns, doesn't fail on invalid
**File:** `AIActionValidator.js:272-292`
For AoE targets: array length mismatch → warning, not fail. Invalid alive check → break with warning, still returns true.
**Fix:** Decide if these should fail; currently they slip through.

#### M10 — Enemy ID regenerated twice
**File:** `Enemy.js:18` then `EncounterSystem.js:437`. Cosmetic.

#### M11 — `getAvailableActions` always offers 'flee' for player but flee has cost 2 — visible even if AP insufficient
UI shows greyed-out button (good), but design intent of 2 AP for flee unclear. CombatBalanceConfig says... look it up.

#### M12 — `defaultActions` in `CombatUI.js` hardcoded with different IDs than `ActionSystem`
**File:** `CombatUI.js` `createDefaultActionButtons` uses `id: 'attack'` whereas real action is `basic_attack`. Only shown when `getAvailableActions` returns empty (rare path), but a click on that disabled fallback button would try to look up `id: 'attack'` and fail silently. Cosmetic risk.

---

### 🟢 LOW (polish / consistency)

#### L1 — Console-log spam: every action, AI decision, damage applied
Production code should gate via Logger.tag.
**Fix:** Replace `console.log` with `Logger.tag('Combat')`.

#### L2 — `ActionResolver.processAnimations` logs but does nothing useful
Either implement via `CombatAnimations` or remove.

#### L3 — `delay()` helper duplicated in CombatSystem and ActionResolver
Inline or shared utility.

#### L4 — `checkForLevelUps` in `CombatUIManager.js:341-356` returns hard-coded test data
```js
const levelUpData = { character: {...'Test Warrior'}, ...};
```
Dead code.

#### L5 — Combat log "Combat begins!" emitted by manager AFTER showCombat; relies on init order
Already cleaned up in last session but fragile.

#### L6 — `getEnemySummary` exposes `aiType` but UI doesn't use it. Could remove from summary.

#### L7 — `EncounterSystem.scaleEnemies` uses `Math.random() * 4 - 2` for ±2 level scaling — magic numbers.

---

## Architectural Concerns

### A1 — Three target-validation paths exist
1. `TargetingSystem.validateTargets` (called from `ActionResolver.validateAction`)
2. `AIActionValidator.validateTarget` (used only for enemy AI decisions)
3. Pre-checks scattered in `processAction`, `executeAttack`, etc.

Player and AI actions take different validation paths. Bugs hide in the inconsistency.
**Fix:** Single source of truth. AIActionValidator should call TargetingSystem.

### A2 — Combat flow is event-driven AND callback-driven
`combatEvent` dispatched globally. `CombatUI`, `CombatUIManager`, `CombatResultsUI`, `EncounterSystem`, `main.js` all listen. Side-channel `combatUIAction` events. Hard to trace turn execution.
**Fix:** Single event bus. Document event contracts in `audit/04-events.md`.

### A3 — Animation system is split
`CombatAnimations` (DOM/JS) exists in UI. `ActionResolver` simulates animations with delays. They never integrate.
**Fix:** ActionResolver emits `combatAnimation` events. CombatAnimations subscribes and performs the visuals.

### A4 — No combat state machine
`combatState` is a string (`'PLAYER_TURN' | 'ENEMY_TURN' | 'VICTORY' | 'DEFEAT' | 'INACTIVE'`). Transitions implicit. No guard against double-action on same turn.
**Fix:** Explicit state machine with allowed transitions.

---

## Phased Correction Plan

### Phase 1 — Make Rewards Work (Day 1)
Goal: Victory yields XP, gold, items. Level-ups trigger.

- [ ] **C1** Implement `CombatSystem.distributeRewards(rewards, alivePartyMembers)`.
  - Call `character.addExperience(xpPerMember)` for each alive member.
  - Call `partyManager.addGold(totalGold)`.
  - Call `inventorySystem.addItem(itemId, qty)` for each loot item.
- [ ] **C7** After XP distribution, iterate party, check level-ups, emit `levelUpEvent`.
- [ ] **C6** Wire `CombatResultsUI` via UIRouter. Push `'combat-results'` from `CombatUIManager.handleCombatEnded` after 1s delay.
- [ ] **H5** Hook loot drops into inventory in `distributeRewards`.
- [ ] **M8** Clear `statusEffects` on `endCombat` for party + (dead) enemies.

### Phase 2 — Fix Action Correctness (Day 2)
Goal: Every action does what it claims.

- [ ] **C2** Implement `executeItem` properly: action must carry `itemId`; call `inventorySystem.consume` + `consumableSystem.apply(itemId, targets)`.
- [ ] **H2** Set `result.success` based on actual effects.
- [ ] **H3** Fail non-attack skills with unknown type instead of silently treating as attack.
- [ ] **H1** Decide & document defend semantics. If "free + bonus AP next turn", drop currentAP += 1; queue effect. If "free", set `apCost: 0`.
- [ ] **M5** Implement flee → `endCombat('fled')` on success.

### Phase 3 — Status Effects Real (Day 3)
Goal: Buffs/debuffs apply, tick, expire.

- [ ] **C3** Add `tickStatusEffects(character)` to `CombatSystem`. Call at turn-end for each character.
- [ ] **C4** Expand `applyStatusEffectModifiers` to support all effect types:
  - `defense_boost` ✓ (already there)
  - `attack_boost` ✓ 
  - `stat_boost` — multiply all stats by value
  - `evasion_boost` — `Math.random() < value` → no damage
  - `magic_shield` — for `action.type === 'skill'`, reduce by value
  - `immunity` — set damage to 0
  - `poison` — DoT applied in `tickStatusEffects` (lose `value` HP per turn)
  - `taunt` — AI selectTarget honors taunt source
- [ ] **C8** Implement skill cooldowns:
  - Add `currentCooldown: 0` to all skills.
  - On use (in `executeSkill`), set `skill.currentCooldown = skill.cooldown`.
  - In `tickStatusEffects` (or new `tickCooldowns`), decrement per character turn.
  - Filter cooldown > 0 in `getAvailableActions`.

### Phase 4 — Turn Order Hygiene (Day 4)
Goal: Dead characters don't take turns.

- [ ] **C5/C6** After every `processAction` that produces deaths, call `updateTurnOrder()`. Reconcile `currentTurnIndex` if current became invalid.
- [ ] **H6** Emit `turnEnded(character)` and `roundStarted(round)` events. UI uses these to tick status effect badges.

### Phase 5 — Visual Feedback (Day 5)
Goal: Player sees what's happening.

- [ ] **A3** Wire `ActionResolver` → `CombatAnimations`. Emit `combatAnimation` events with `{type, source, targets, value}`. CombatAnimations renders hit-flash, damage number, healing glow.
- [ ] **H4** Reduce/remove fake delays. Real animations should take 200-400ms total per action, not 700ms+.
- [ ] **H8** Emit `bossPhaseChanged` event. CombatUI shows banner.
- [ ] **L4** Remove `checkForLevelUps` test stub from CombatUIManager.

### Phase 6 — Balance & Polish (Day 6)
Goal: Damage formula configurable, AI smarter.

- [ ] **M1** Route damage formula through `combatBalanceConfig`. Replace magic numbers.
- [ ] **M2** Pick one elemental system. Suggest: drop ActionSystem chart, always use `Enemy.takeDamageWithElement`.
- [ ] **M3** Cap displayed crit chance at 50% in CharacterSheetUI.
- [ ] **M4** Score-rank all archetype filtered actions; don't take first.
- [ ] **A1** AIActionValidator delegates target check to TargetingSystem.
- [ ] **L1** Console.log → Logger.tag('Combat').

### Phase 7 — Hardening (Day 7)
- [ ] **A4** Combat state machine.
- [ ] **H9** Consolidate pre-validation; single error format.
- [ ] **A2** Document event flow in `audit/04-events.md`.

---

## Verification Checklist (per phase)

**Phase 1 done when:**
- Defeat a goblin (lvl 1) → character XP increases by ~25.
- Defeat enough enemies → character.level increments; level-up banner shows.
- Defeat enemies → inventory shows new items + gold increased.
- `combat-results` screen appears with continue/menu buttons working.

**Phase 2 done when:**
- "Item" action requires a real consumable in inventory; uses it; applies effect; inventory decrements.
- Skill labeled "buff" never deals damage.
- Attacking a dead enemy doesn't consume AP (failed action).
- "Defend" cost is consistent with design doc.
- Flee success ends combat.

**Phase 3 done when:**
- `Iron Will` applied at turn 1; visible icon on character card; expires after 4 turns; defense reduced.
- Poison enemy → takes damage at start of each turn; expires; can stack.
- Skill on cooldown shows greyed-out with "(N turns)" tooltip.

**Phase 4 done when:**
- Killed character cannot act in the same round.
- `turnEnded` and `roundStarted` events fire reliably.

**Phase 5 done when:**
- Hit animations visible (red flash, damage number floats up).
- Healing glow on heal.
- Combat finishes in ~half the current time with animations on.
- Boss HP cross threshold → banner.

**Phase 6 done when:**
- Editing `combatBalanceConfig.json` (or equivalent) actually changes in-game damage.
- One elemental code path.
- AI picks best-scored action consistently.

---

## Out of Scope for This Audit

- Equipment effects in combat (separate audit needed: `audit/10-equipment.md` TBD).
- Multi-target selection UI (currently auto-target; ticket exists).
- Combat camera / 3D combat visuals (engine emits sprites pre-combat only).
- Save/load mid-combat (currently combat state not serialized).
- Multi-phase boss scripting beyond HP thresholds.

---

## Quick-Win Order (if time-boxed)

If only a few hours available:
1. **C1 + C7 + H5** — rewards/XP/loot (~2h, unblocks progression).
2. **C6** — combat results UI (~1h, polish).
3. **C2** — item action (~1h, fixes obvious broken feature).
4. **C5** — dead-char turn skip (~30min, prevents weird states).

Everything else (status effects, cooldowns, animation, balance) can phase in after.
