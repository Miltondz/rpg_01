/**
 * NarrativeUI - DOM dialogue box for Ink narrative lines and choices
 * Consumes EventBus events from NarrativeManager; calls back via narrativeManager methods.
 */

import { EventBus, EventTypes } from '../core/EventBus.js';
import { Logger } from '../utils/Logger.js';

const log = Logger.tag('UI:Narrative');

export class NarrativeUI {
  constructor(narrativeManager) {
    this.narrativeManager = narrativeManager;
    this.isVisible = false;
    this._panel = null;
    this._textEl = null;
    this._choicesEl = null;
    this._continueBtn = null;
    this._speakerEl = null;
    this._autoAdvanceTimer = null;

    this._createDOM();
    this._bindEvents();
  }

  show(speakerName = null) {
    if (this._speakerEl) {
      this._speakerEl.textContent = speakerName ?? '';
      this._speakerEl.style.display = speakerName ? 'block' : 'none';
    }
    this._panel.style.display = 'flex';
    this.isVisible = true;
  }

  hide() {
    this._panel.style.display = 'none';
    this.isVisible = false;
    this._clearChoices();
    clearTimeout(this._autoAdvanceTimer);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _createDOM() {
    this._panel = document.createElement('div');
    this._panel.id = 'narrative-panel';
    this._panel.className = 'narrative-panel';
    this._panel.style.display = 'none';
    this._panel.setAttribute('data-ui-component', 'narrative-panel');
    this._panel.setAttribute('data-ui-name', 'narrative-dialogue');

    this._panel.innerHTML = `
      <div class="narrative-speaker" id="narrative-speaker" style="display:none;"></div>
      <div class="narrative-text" id="narrative-text"></div>
      <div class="narrative-choices" id="narrative-choices"></div>
      <button class="narrative-continue-btn" id="narrative-continue">▶ Continue</button>
    `;

    document.getElementById('game-container')?.appendChild(this._panel);

    this._speakerEl   = document.getElementById('narrative-speaker');
    this._textEl      = document.getElementById('narrative-text');
    this._choicesEl   = document.getElementById('narrative-choices');
    this._continueBtn = document.getElementById('narrative-continue');

    this._continueBtn.addEventListener('click', () => this._onContinue());

    // Space bar to continue
    document.addEventListener('keydown', e => {
      if (!this.isVisible) return;
      if (e.code === 'Space' && !e.target.closest('button')) {
        e.preventDefault();
        this._onContinue();
      }
    });
  }

  _bindEvents() {
    // NARRATIVE_STORY_LOADED and NARRATIVE_DIALOGUE_READY → show() is called by
    // UIRouter via main.js listener so input gets blocked correctly.
    // NarrativeUI only handles content updates and hides itself on completion.
    EventBus.on(EventTypes.NARRATIVE_LINE_READY, e => {
      const { text } = e.detail;
      if (text) this._displayText(text);
    });
    EventBus.on(EventTypes.NARRATIVE_CHOICES_READY, e => {
      this._displayChoices(e.detail.choices);
    });
    EventBus.on(EventTypes.NARRATIVE_DIALOGUE_COMPLETE, () => {
      this.hide();
    });
    EventBus.on(EventTypes.NARRATIVE_STORY_COMPLETE, () => {
      this.hide();
    });
  }

  _displayText(text) {
    this._clearChoices();
    this._textEl.textContent = text;
    this._continueBtn.style.display = 'block';
  }

  _displayChoices(choices) {
    this._continueBtn.style.display = 'none';
    this._clearChoices();
    for (const choice of choices) {
      const btn = document.createElement('button');
      btn.className = 'narrative-choice-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => {
        const result = this.narrativeManager.chooseChoice(choice.index);
        if (result) this._handleResult(result);
      });
      this._choicesEl.appendChild(btn);
    }
  }

  _clearChoices() {
    if (this._choicesEl) this._choicesEl.innerHTML = '';
  }

  _onContinue() {
    if (!this.narrativeManager) return;
    const result = this.narrativeManager.continue();
    if (result) this._handleResult(result);
  }

  _handleResult(result) {
    if (!result) {
      this.hide();
      return;
    }
    if (result.hasChoices) {
      this._displayChoices(result.choices);
    } else if (result.text) {
      this._displayText(result.text);
    } else {
      this.hide();
    }
  }
}
