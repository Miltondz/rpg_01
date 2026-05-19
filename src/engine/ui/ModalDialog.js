import { Logger } from '../utils/Logger.js';

const log = Logger.tag('UI:Modal');

export class ModalDialog {
  constructor() {
    this._el = null;
    this._keyHandler = null;
    this._onConfirm = null;
    this._onCancel = null;
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.id = 'modal-dialog';
    this._el.className = 'modal-overlay hidden';
    this._el.innerHTML = `
      <div class="modal-box">
        <p class="modal-message"></p>
        <div class="modal-buttons">
          <button class="modal-btn modal-confirm">CONFIRM [Enter]</button>
          <button class="modal-btn modal-cancel">CANCEL [Esc]</button>
        </div>
      </div>
    `;
    document.body.appendChild(this._el);

    this._el.querySelector('.modal-confirm').addEventListener('click', () => this._confirm());
    this._el.querySelector('.modal-cancel').addEventListener('click', () => this._cancel());
    // Click outside box cancels
    this._el.addEventListener('click', (e) => { if (e.target === this._el) this._cancel(); });
  }

  show(message, onConfirm, onCancel) {
    this._onConfirm = onConfirm ?? null;
    this._onCancel  = onCancel  ?? null;
    this._el.querySelector('.modal-message').textContent = message;
    this._el.classList.remove('hidden');

    this._keyHandler = (e) => {
      if (e.code === 'Enter')  { e.preventDefault(); e.stopPropagation(); this._confirm(); }
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); this._cancel(); }
    };
    document.addEventListener('keydown', this._keyHandler, true); // capture phase so it fires first
    log.info('Modal shown');
  }

  hide() {
    this._el.classList.add('hidden');
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler, true);
      this._keyHandler = null;
    }
  }

  isVisible() {
    return !this._el.classList.contains('hidden');
  }

  _confirm() {
    this.hide();
    this._onConfirm?.();
  }

  _cancel() {
    this.hide();
    this._onCancel?.();
  }
}
