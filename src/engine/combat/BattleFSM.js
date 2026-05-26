import { Logger } from '../utils/Logger.js';

const log = Logger.tag('BattleFSM');

export const BattleState = Object.freeze({
  IDLE:                   'IDLE',
  BATTLE_INIT:            'BATTLE_INIT',
  TURN_START:             'TURN_START',
  PLAYER_INPUT_ACTION:    'PLAYER_INPUT_ACTION',
  PLAYER_INPUT_TARGETING: 'PLAYER_INPUT_TARGETING',
  ACTION_RESOLUTION:      'ACTION_RESOLUTION',
  TURN_END:               'TURN_END',
  VICTORY:                'VICTORY',
  DEFEAT:                 'DEFEAT',
});

const VALID_TRANSITIONS = {
  IDLE:                   ['BATTLE_INIT'],
  BATTLE_INIT:            ['TURN_START'],
  TURN_START:             ['PLAYER_INPUT_ACTION', 'ACTION_RESOLUTION'],
  PLAYER_INPUT_ACTION:    ['PLAYER_INPUT_TARGETING', 'ACTION_RESOLUTION', 'TURN_END', 'TURN_START'],
  PLAYER_INPUT_TARGETING: ['PLAYER_INPUT_ACTION', 'ACTION_RESOLUTION'],
  ACTION_RESOLUTION:      ['TURN_END', 'VICTORY', 'DEFEAT'],
  TURN_END:               ['TURN_START', 'VICTORY', 'DEFEAT', 'IDLE'],
  VICTORY:                ['IDLE'],
  DEFEAT:                 ['IDLE'],
};

// These states block all player input
const INPUT_BLOCKING_STATES = new Set([
  'BATTLE_INIT',
  'ACTION_RESOLUTION',
  'TURN_END',
  'VICTORY',
  'DEFEAT',
]);

export class BattleFSM {
  constructor() {
    this.currentState = BattleState.IDLE;
    this._previousState = null;
  }

  get isInputBlocked() {
    return INPUT_BLOCKING_STATES.has(this.currentState);
  }

  /** Transition to newState. Returns false if transition is invalid. */
  transition(newState, payload = {}) {
    const valid = VALID_TRANSITIONS[this.currentState];
    if (!valid?.includes(newState)) {
      log.warn('invalid transition', { from: this.currentState, to: newState, valid });
      return false;
    }

    this._previousState = this.currentState;
    this.currentState = newState;

    log.info('→', { from: this._previousState, to: newState });

    window.dispatchEvent(new CustomEvent('battleStateChange', {
      detail: { state: newState, prevState: this._previousState, payload }
    }));

    if (INPUT_BLOCKING_STATES.has(newState)) {
      window.dispatchEvent(new CustomEvent('battleInputBlock', { detail: { state: newState } }));
    } else {
      window.dispatchEvent(new CustomEvent('battleInputUnblock', { detail: { state: newState } }));
    }

    return true;
  }

  is(state) {
    return this.currentState === state;
  }

  isOneOf(...states) {
    return states.includes(this.currentState);
  }

  reset() {
    this._previousState = this.currentState;
    this.currentState = BattleState.IDLE;
  }
}
