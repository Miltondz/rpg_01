/**
 * SaveLoadUI - User interface for save/load operations
 * Handles 3 manual slots + 1 auto-save with previews and confirmations
 */

export class SaveLoadUI {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this.container = null;
    this.isVisible = false;
    this.mode = 'save'; // 'save' or 'load'
    this.selectedSlot = null;
    
    // UI elements
    this.elements = {
      overlay: null,
      modal: null,
      header: null,
      slotContainer: null,
      confirmDialog: null
    };
    
    // Event handlers
    this.handlers = {
      keydown: this._handleKeydown.bind(this),
      click: this._handleOverlayClick.bind(this)
    };
    
    this._createUI();
    this._bindEvents();
    
    console.log('SaveLoadUI initialized');
  }

  /**
   * Show save/load interface
   * @param {string} mode - 'save' or 'load'
   */
  show(mode = 'save') {
    this.mode = mode;
    this.selectedSlot = null;
    
    this._updateHeader();
    this._refreshSlots();
    
    this.container.style.display = 'flex';
    this.isVisible = true;
    
    // Add event listeners
    document.addEventListener('keydown', this.handlers.keydown);
    
    console.log(`SaveLoadUI opened in ${mode} mode`);
  }

  /**
   * Hide save/load interface
   */
  hide() {
    this.container.style.display = 'none';
    this.isVisible = false;
    this.selectedSlot = null;
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handlers.keydown);
    
    // Hide any open dialogs
    this._hideConfirmDialog();
    
    console.log('SaveLoadUI closed');
  }

  /**
   * Toggle save/load interface
   * @param {string} mode - 'save' or 'load'
   */
  toggle(mode = 'save') {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show(mode);
    }
  }

  /**
   * Refresh slot display with current save data
   */
  refresh() {
    if (this.isVisible) {
      this._refreshSlots();
    }
  }

  // Private methods

  /**
   * Create UI elements
   * @private
   */
  _createUI() {
    // Main container (overlay)
    this.container = document.createElement('div');
    this.container.className = 'save-load-overlay';
    this.container.style.display = 'none';
    
    // Modal container
    const modal = document.createElement('div');
    modal.className = 'save-load-modal';
    
    // Header
    const header = document.createElement('div');
    header.className = 'save-load-header';
    
    const title = document.createElement('h2');
    title.className = 'save-load-title';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'save-load-close';
    closeButton.innerHTML = '×';
    closeButton.onclick = () => this.hide();
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // Slot container
    const slotContainer = document.createElement('div');
    slotContainer.className = 'save-load-slots';
    
    // Auto-save section
    const autoSaveSection = document.createElement('div');
    autoSaveSection.className = 'save-load-section';
    
    const autoSaveLabel = document.createElement('h3');
    autoSaveLabel.textContent = 'Auto-Save';
    autoSaveLabel.className = 'save-load-section-title';
    
    const autoSaveSlot = this._createSlotElement('auto');
    
    autoSaveSection.appendChild(autoSaveLabel);
    autoSaveSection.appendChild(autoSaveSlot);
    
    // Manual saves section
    const manualSection = document.createElement('div');
    manualSection.className = 'save-load-section';
    
    const manualLabel = document.createElement('h3');
    manualLabel.textContent = 'Manual Saves';
    manualLabel.className = 'save-load-section-title';
    
    manualSection.appendChild(manualLabel);
    
    // Create manual save slots
    for (let i = 1; i <= 3; i++) {
      const slot = this._createSlotElement(i);
      manualSection.appendChild(slot);
    }
    
    slotContainer.appendChild(autoSaveSection);
    slotContainer.appendChild(manualSection);
    
    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(slotContainer);
    
    this.container.appendChild(modal);
    
    // Store references
    this.elements.overlay = this.container;
    this.elements.modal = modal;
    this.elements.header = header;
    this.elements.title = title;
    this.elements.slotContainer = slotContainer;
    
    // Add to document
    document.body.appendChild(this.container);
    
    // Add CSS styles
    this._addStyles();
  }

  /**
   * Create a save slot element
   * @param {number|string} slotId - Slot ID
   * @returns {HTMLElement} Slot element
   * @private
   */
  _createSlotElement(slotId) {
    const slot = document.createElement('div');
    slot.className = 'save-slot';
    slot.dataset.slotId = slotId;
    
    // Screenshot area
    const screenshot = document.createElement('div');
    screenshot.className = 'save-slot-screenshot';
    
    const screenshotImg = document.createElement('img');
    screenshotImg.className = 'save-slot-image';
    screenshot.appendChild(screenshotImg);
    
    // Info area
    const info = document.createElement('div');
    info.className = 'save-slot-info';
    
    const slotNumber = document.createElement('div');
    slotNumber.className = 'save-slot-number';
    slotNumber.textContent = slotId === 'auto' ? 'AUTO' : `SLOT ${slotId}`;
    
    const metadata = document.createElement('div');
    metadata.className = 'save-slot-metadata';
    
    const location = document.createElement('div');
    location.className = 'save-slot-location';
    
    const details = document.createElement('div');
    details.className = 'save-slot-details';
    
    const timestamp = document.createElement('div');
    timestamp.className = 'save-slot-timestamp';
    
    metadata.appendChild(location);
    metadata.appendChild(details);
    metadata.appendChild(timestamp);
    
    info.appendChild(slotNumber);
    info.appendChild(metadata);
    
    // Actions area
    const actions = document.createElement('div');
    actions.className = 'save-slot-actions';
    
    const primaryButton = document.createElement('button');
    primaryButton.className = 'save-slot-primary-btn';
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'save-slot-delete-btn';
    deleteButton.textContent = 'Delete';
    deleteButton.style.display = 'none'; // Hidden by default
    
    actions.appendChild(primaryButton);
    actions.appendChild(deleteButton);
    
    // Assemble slot
    slot.appendChild(screenshot);
    slot.appendChild(info);
    slot.appendChild(actions);
    
    // Add click handlers
    slot.onclick = (e) => this._handleSlotClick(slotId, e);
    deleteButton.onclick = (e) => {
      e.stopPropagation();
      this._handleDeleteClick(slotId);
    };
    
    return slot;
  }

  /**
   * Update header based on current mode
   * @private
   */
  _updateHeader() {
    const title = this.elements.title;
    
    if (this.mode === 'save') {
      title.textContent = 'Save Game';
    } else {
      title.textContent = 'Load Game';
    }
  }

  /**
   * Refresh all save slots with current data
   * @private
   */
  _refreshSlots() {
    const metadata = this.saveSystem.getAllSaveMetadata();
    
    // Update auto-save slot
    this._updateSlotDisplay('auto', metadata.auto);
    
    // Update manual slots
    for (let i = 1; i <= 3; i++) {
      this._updateSlotDisplay(i, metadata.manual[i]);
    }
  }

  /**
   * Update display for a specific slot
   * @param {number|string} slotId - Slot ID
   * @param {Object|null} metadata - Save metadata or null if empty
   * @private
   */
  _updateSlotDisplay(slotId, metadata) {
    const slot = this.container.querySelector(`[data-slot-id="${slotId}"]`);
    if (!slot) return;
    
    const screenshot = slot.querySelector('.save-slot-image');
    const location = slot.querySelector('.save-slot-location');
    const details = slot.querySelector('.save-slot-details');
    const timestamp = slot.querySelector('.save-slot-timestamp');
    const primaryButton = slot.querySelector('.save-slot-primary-btn');
    const deleteButton = slot.querySelector('.save-slot-delete-btn');
    
    if (metadata && !metadata.corrupted) {
      // Slot has valid save data
      slot.classList.remove('empty', 'corrupted');
      slot.classList.add('occupied');
      
      // Update screenshot
      if (metadata.screenshot) {
        screenshot.src = metadata.screenshot;
        screenshot.style.display = 'block';
      } else {
        screenshot.style.display = 'none';
      }
      
      // Update metadata
      location.textContent = metadata.location || 'Unknown Location';
      details.textContent = `Level ${metadata.partyLevel} • ${metadata.partySize} characters • ${metadata.gold} gold`;
      timestamp.textContent = this._formatTimestamp(metadata.timestamp);
      
      // Update buttons
      if (this.mode === 'save') {
        primaryButton.textContent = 'Overwrite';
        deleteButton.style.display = 'inline-block';
      } else {
        primaryButton.textContent = 'Load';
        deleteButton.style.display = 'inline-block';
      }
      
    } else if (metadata && metadata.corrupted) {
      // Slot has corrupted data
      slot.classList.remove('empty', 'occupied');
      slot.classList.add('corrupted');
      
      screenshot.style.display = 'none';
      location.textContent = 'Corrupted Save';
      details.textContent = metadata.error || 'Save data is corrupted';
      timestamp.textContent = '';
      
      primaryButton.textContent = this.mode === 'save' ? 'Save' : 'Cannot Load';
      primaryButton.disabled = this.mode === 'load';
      deleteButton.style.display = 'inline-block';
      
    } else {
      // Empty slot
      slot.classList.remove('occupied', 'corrupted');
      slot.classList.add('empty');
      
      screenshot.style.display = 'none';
      location.textContent = 'Empty Slot';
      details.textContent = 'No save data';
      timestamp.textContent = '';
      
      primaryButton.textContent = this.mode === 'save' ? 'Save' : 'Empty';
      primaryButton.disabled = this.mode === 'load';
      deleteButton.style.display = 'none';
    }
    
    // Auto-save slot cannot be manually saved to
    if (slotId === 'auto' && this.mode === 'save') {
      primaryButton.disabled = true;
      primaryButton.textContent = 'Auto-Save Only';
    }
  }

  /**
   * Handle slot click
   * @param {number|string} slotId - Clicked slot ID
   * @param {Event} event - Click event
   * @private
   */
  _handleSlotClick(slotId, event) {
    // Don't allow manual saving to auto-save slot
    if (slotId === 'auto' && this.mode === 'save') {
      return;
    }
    
    const slot = event.currentTarget;
    const isEmpty = slot.classList.contains('empty');
    const isCorrupted = slot.classList.contains('corrupted');
    
    if (this.mode === 'load' && (isEmpty || isCorrupted)) {
      return; // Cannot load from empty or corrupted slot
    }
    
    this.selectedSlot = slotId;
    
    if (this.mode === 'save') {
      if (isEmpty) {
        // Direct save to empty slot
        this._performSave(slotId);
      } else {
        // Confirm overwrite
        this._showOverwriteConfirmation(slotId);
      }
    } else {
      // Load game
      this._performLoad(slotId);
    }
  }

  /**
   * Handle delete button click
   * @param {number|string} slotId - Slot to delete
   * @private
   */
  _handleDeleteClick(slotId) {
    this._showDeleteConfirmation(slotId);
  }

  /**
   * Show overwrite confirmation dialog
   * @param {number|string} slotId - Slot to overwrite
   * @private
   */
  _showOverwriteConfirmation(slotId) {
    const slotName = slotId === 'auto' ? 'Auto-Save' : `Slot ${slotId}`;
    
    this._showConfirmDialog(
      'Overwrite Save',
      `Are you sure you want to overwrite ${slotName}?`,
      'Overwrite',
      () => this._performSave(slotId)
    );
  }

  /**
   * Show delete confirmation dialog
   * @param {number|string} slotId - Slot to delete
   * @private
   */
  _showDeleteConfirmation(slotId) {
    const slotName = slotId === 'auto' ? 'Auto-Save' : `Slot ${slotId}`;
    
    this._showConfirmDialog(
      'Delete Save',
      `Are you sure you want to delete ${slotName}? This action cannot be undone.`,
      'Delete',
      () => this._performDelete(slotId),
      'danger'
    );
  }

  /**
   * Show confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {string} confirmText - Confirm button text
   * @param {Function} onConfirm - Confirm callback
   * @param {string} type - Dialog type ('normal' or 'danger')
   * @private
   */
  _showConfirmDialog(title, message, confirmText, onConfirm, type = 'normal') {
    // Create dialog if it doesn't exist
    if (!this.elements.confirmDialog) {
      this._createConfirmDialog();
    }
    
    const dialog = this.elements.confirmDialog;
    const titleEl = dialog.querySelector('.confirm-dialog-title');
    const messageEl = dialog.querySelector('.confirm-dialog-message');
    const confirmBtn = dialog.querySelector('.confirm-dialog-confirm');
    const cancelBtn = dialog.querySelector('.confirm-dialog-cancel');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmBtn.textContent = confirmText;
    
    // Set button style based on type
    confirmBtn.className = `confirm-dialog-confirm ${type === 'danger' ? 'danger' : 'primary'}`;
    
    // Set up event handlers
    confirmBtn.onclick = () => {
      this._hideConfirmDialog();
      onConfirm();
    };
    
    cancelBtn.onclick = () => {
      this._hideConfirmDialog();
    };
    
    dialog.style.display = 'flex';
  }

  /**
   * Create confirmation dialog
   * @private
   */
  _createConfirmDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog-overlay';
    dialog.style.display = 'none';
    
    const modal = document.createElement('div');
    modal.className = 'confirm-dialog-modal';
    
    const title = document.createElement('h3');
    title.className = 'confirm-dialog-title';
    
    const message = document.createElement('p');
    message.className = 'confirm-dialog-message';
    
    const buttons = document.createElement('div');
    buttons.className = 'confirm-dialog-buttons';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'confirm-dialog-confirm primary';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'confirm-dialog-cancel';
    cancelBtn.textContent = 'Cancel';
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(confirmBtn);
    
    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(buttons);
    
    dialog.appendChild(modal);
    this.container.appendChild(dialog);
    
    this.elements.confirmDialog = dialog;
  }

  /**
   * Hide confirmation dialog
   * @private
   */
  _hideConfirmDialog() {
    if (this.elements.confirmDialog) {
      this.elements.confirmDialog.style.display = 'none';
    }
  }

  /**
   * Perform save operation
   * @param {number|string} slotId - Slot to save to
   * @private
   */
  async _performSave(slotId) {
    try {
      // Show loading state
      this._setLoadingState(true);
      
      const result = await this.saveSystem.saveGame(slotId, {
        includeScreenshot: true
      });
      
      if (result.success) {
        console.log(`Game saved to slot ${slotId}`);
        this._refreshSlots();
        
        // Show success message briefly
        this._showMessage('Game saved successfully!', 'success');
        
        // Auto-close after save
        setTimeout(() => {
          if (this.isVisible) {
            this.hide();
          }
        }, 1500);
        
      } else {
        console.error('Save failed:', result.error);
        this._showMessage(`Save failed: ${result.error}`, 'error');
      }
      
    } catch (error) {
      console.error('Save error:', error);
      this._showMessage(`Save error: ${error.message}`, 'error');
    } finally {
      this._setLoadingState(false);
    }
  }

  /**
   * Perform load operation
   * @param {number|string} slotId - Slot to load from
   * @private
   */
  async _performLoad(slotId) {
    try {
      // Show loading state
      this._setLoadingState(true);
      
      const result = await this.saveSystem.loadGame(slotId);
      
      if (result.success) {
        console.log(`Game loaded from slot ${slotId}`);
        
        // Emit load event for game to handle
        const event = new CustomEvent('gameLoadRequested', {
          detail: {
            slotId,
            saveData: result.saveData
          }
        });
        window.dispatchEvent(event);
        
        this.hide();
        
      } else {
        console.error('Load failed:', result.error);
        this._showMessage(`Load failed: ${result.error}`, 'error');
      }
      
    } catch (error) {
      console.error('Load error:', error);
      this._showMessage(`Load error: ${error.message}`, 'error');
    } finally {
      this._setLoadingState(false);
    }
  }

  /**
   * Perform delete operation
   * @param {number|string} slotId - Slot to delete
   * @private
   */
  _performDelete(slotId) {
    const success = this.saveSystem.deleteSave(slotId);
    
    if (success) {
      console.log(`Save deleted from slot ${slotId}`);
      this._refreshSlots();
      this._showMessage('Save deleted', 'success');
    } else {
      this._showMessage('Failed to delete save', 'error');
    }
  }

  /**
   * Set loading state for UI
   * @param {boolean} loading - Loading state
   * @private
   */
  _setLoadingState(loading) {
    const buttons = this.container.querySelectorAll('button');
    buttons.forEach(button => {
      button.disabled = loading;
    });
    
    if (loading) {
      this.container.classList.add('loading');
    } else {
      this.container.classList.remove('loading');
    }
  }

  /**
   * Show temporary message
   * @param {string} text - Message text
   * @param {string} type - Message type ('success', 'error', 'info')
   * @private
   */
  _showMessage(text, type = 'info') {
    // Remove existing message
    const existing = this.container.querySelector('.save-load-message');
    if (existing) {
      existing.remove();
    }
    
    const message = document.createElement('div');
    message.className = `save-load-message ${type}`;
    message.textContent = text;
    
    this.elements.modal.appendChild(message);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 3000);
  }

  /**
   * Format timestamp for display
   * @param {number} timestamp - Timestamp in milliseconds
   * @returns {string} Formatted timestamp
   * @private
   */
  _formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today - show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Handle keyboard input
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  _handleKeydown(event) {
    if (!this.isVisible) return;
    
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.hide();
        break;
        
      case '1':
      case '2':
      case '3':
        if (!event.ctrlKey && !event.altKey) {
          event.preventDefault();
          const slotId = parseInt(event.key);
          this._handleSlotClick(slotId, { currentTarget: this.container.querySelector(`[data-slot-id="${slotId}"]`) });
        }
        break;
    }
  }

  /**
   * Handle overlay click (close on outside click)
   * @param {MouseEvent} event - Click event
   * @private
   */
  _handleOverlayClick(event) {
    if (event.target === this.container) {
      this.hide();
    }
  }

  /**
   * Bind event handlers
   * @private
   */
  _bindEvents() {
    this.container.addEventListener('click', this.handlers.click);
  }

  /**
   * Add CSS styles
   * @private
   */
  _addStyles() {
    if (document.getElementById('save-load-ui-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'save-load-ui-styles';
    style.textContent = `
      .save-load-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }

      .save-load-modal {
        background: #2a2a2a;
        border-radius: 8px;
        width: 90%;
        max-width: 800px;
        max-height: 90%;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      }

      .save-load-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #444;
      }

      .save-load-title {
        color: #fff;
        margin: 0;
        font-size: 24px;
      }

      .save-load-close {
        background: none;
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .save-load-close:hover {
        background: #444;
        border-radius: 4px;
      }

      .save-load-slots {
        padding: 20px;
      }

      .save-load-section {
        margin-bottom: 30px;
      }

      .save-load-section-title {
        color: #fff;
        margin: 0 0 15px 0;
        font-size: 18px;
        border-bottom: 1px solid #444;
        padding-bottom: 5px;
      }

      .save-slot {
        display: flex;
        background: #333;
        border-radius: 6px;
        margin-bottom: 10px;
        overflow: hidden;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .save-slot:hover {
        background: #3a3a3a;
      }

      .save-slot.empty {
        opacity: 0.7;
      }

      .save-slot.corrupted {
        background: #4a2a2a;
        border: 1px solid #aa4444;
      }

      .save-slot-screenshot {
        width: 120px;
        height: 68px;
        background: #222;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .save-slot-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: cover;
      }

      .save-slot-info {
        flex: 1;
        padding: 15px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .save-slot-number {
        color: #fff;
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 5px;
      }

      .save-slot-location {
        color: #fff;
        font-size: 16px;
        margin-bottom: 5px;
      }

      .save-slot-details {
        color: #aaa;
        font-size: 12px;
        margin-bottom: 5px;
      }

      .save-slot-timestamp {
        color: #888;
        font-size: 11px;
      }

      .save-slot-actions {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 15px;
        gap: 8px;
      }

      .save-slot-primary-btn,
      .save-slot-delete-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s;
      }

      .save-slot-primary-btn {
        background: #4a90e2;
        color: white;
      }

      .save-slot-primary-btn:hover:not(:disabled) {
        background: #357abd;
      }

      .save-slot-primary-btn:disabled {
        background: #666;
        cursor: not-allowed;
      }

      .save-slot-delete-btn {
        background: #d32f2f;
        color: white;
      }

      .save-slot-delete-btn:hover {
        background: #b71c1c;
      }

      .confirm-dialog-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .confirm-dialog-modal {
        background: #2a2a2a;
        border-radius: 6px;
        padding: 20px;
        min-width: 300px;
        max-width: 400px;
      }

      .confirm-dialog-title {
        color: #fff;
        margin: 0 0 10px 0;
        font-size: 18px;
      }

      .confirm-dialog-message {
        color: #ccc;
        margin: 0 0 20px 0;
        line-height: 1.4;
      }

      .confirm-dialog-buttons {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }

      .confirm-dialog-confirm,
      .confirm-dialog-cancel {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }

      .confirm-dialog-confirm.primary {
        background: #4a90e2;
        color: white;
      }

      .confirm-dialog-confirm.danger {
        background: #d32f2f;
        color: white;
      }

      .confirm-dialog-cancel {
        background: #666;
        color: white;
      }

      .save-load-message {
        position: absolute;
        top: 20px;
        right: 20px;
        padding: 10px 15px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        z-index: 10;
      }

      .save-load-message.success {
        background: #4caf50;
      }

      .save-load-message.error {
        background: #f44336;
      }

      .save-load-message.info {
        background: #2196f3;
      }

      .save-load-overlay.loading {
        pointer-events: none;
      }

      .save-load-overlay.loading .save-load-modal {
        opacity: 0.7;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Destroy UI and cleanup
   */
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handlers.keydown);
    
    console.log('SaveLoadUI destroyed');
  }
}