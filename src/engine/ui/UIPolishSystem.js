/**
 * UI Polish System for Dungeon Crawler Game
 * Handles smooth animations, transitions, hover effects, and visual feedback
 */

export class UIPolishSystem {
  constructor() {
    // Animation settings
    this.settings = {
      transitionDuration: 300,
      hoverDelay: 100,
      buttonAnimationDuration: 200,
      loadingAnimationDuration: 1000,
      confirmationDelay: 2000
    };
    
    // State tracking
    this.activeAnimations = new Set();
    this.hoverTimeouts = new Map();
    this.loadingIndicators = new Map();
    
    this.isInitialized = false;
  }

  /**
   * Initialize the UI polish system
   */
  initialize() {
    try {
      this.addPolishStyles();
      this.setupGlobalEventListeners();
      this.enhanceExistingElements();
      
      this.isInitialized = true;
      console.log('UIPolishSystem initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize UIPolishSystem:', error);
      return false;
    }
  }

  /**
   * Add CSS styles for UI polish effects
   */
  addPolishStyles() {
    if (document.getElementById('ui-polish-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ui-polish-styles';
    style.textContent = `
      /* Global smooth transitions */
      * {
        transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, 
                   box-shadow 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
      }
      
      /* Enhanced button animations */
      button, .btn, .action-btn {
        position: relative;
        overflow: hidden;
        transform-origin: center;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      button:hover:not(:disabled), .btn:hover:not(.disabled), .action-btn:hover:not(.disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      button:active:not(:disabled), .btn:active:not(.disabled), .action-btn:active:not(.disabled) {
        transform: translateY(0);
        transition-duration: 0.1s;
      }
      
      /* Ripple effect for buttons */
      .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      }
      
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      /* Enhanced hover effects */
      .hover-glow:hover {
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.4);
        border-color: #00ff00;
      }
      
      .hover-lift:hover {
        transform: translateY(-3px) scale(1.02);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
      }
      
      .hover-pulse:hover {
        animation: pulse-glow 1.5s ease-in-out infinite;
      }
      
      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 5px rgba(0, 255, 0, 0.3); }
        50% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.6); }
      }
      
      /* Loading indicators */
      .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid rgba(0, 255, 0, 0.3);
        border-radius: 50%;
        border-top-color: #00ff00;
        animation: spin 1s ease-in-out infinite;
      }
      
      .loading-dots::after {
        content: '';
        animation: loading-dots 1.5s steps(4, end) infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      @keyframes loading-dots {
        0%, 20% { content: ''; }
        40% { content: '.'; }
        60% { content: '..'; }
        80%, 100% { content: '...'; }
      }
      
      /* Progress bars */
      .progress-bar {
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #00ff00, #00aa00);
        border-radius: 4px;
        transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
      }
      
      .progress-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        animation: progress-shine 2s ease-in-out infinite;
      }
      
      @keyframes progress-shine {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      /* Smooth modal transitions */
      .modal-overlay {
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }
      
      .modal-overlay.show {
        opacity: 1;
        visibility: visible;
      }
      
      .modal-content {
        transform: scale(0.9) translateY(-20px);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .modal-overlay.show .modal-content {
        transform: scale(1) translateY(0);
      }
      
      /* Enhanced form elements */
      input, select, textarea {
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
      }
      
      input:focus, select:focus, textarea:focus {
        outline: none;
        border-color: #00ff00;
        box-shadow: 0 0 0 2px rgba(0, 255, 0, 0.2);
        background-color: rgba(0, 255, 0, 0.05);
      }
      
      /* Notification animations */
      .notification {
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .notification.show {
        transform: translateX(0);
      }
      
      .notification.hide {
        transform: translateX(100%);
      }
      
      /* Confirmation dialog animations */
      .confirmation-dialog {
        transform: scale(0.8);
        opacity: 0;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .confirmation-dialog.show {
        transform: scale(1);
        opacity: 1;
      }
      
      /* Tooltip enhancements */
      .tooltip {
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        pointer-events: none;
      }
      
      .tooltip.show {
        opacity: 1;
        transform: translateY(0);
      }
      
      /* Card hover effects */
      .card, .combatant-card, .equipment-slot, .inventory-slot {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .card:hover, .combatant-card:hover, .equipment-slot:hover, .inventory-slot:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      /* Smooth scrolling */
      * {
        scroll-behavior: smooth;
      }
      
      /* Custom scrollbar */
      ::-webkit-scrollbar {
        width: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb {
        background: rgba(0, 255, 0, 0.3);
        border-radius: 4px;
        transition: background 0.2s ease;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 255, 0, 0.5);
      }
      
      /* Disabled state animations */
      .disabled, :disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }
      
      /* Focus indicators */
      .focus-visible {
        outline: 2px solid #00ff00;
        outline-offset: 2px;
      }
      
      /* Smooth state transitions */
      .state-transition {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      /* Enhanced list animations */
      .list-item {
        opacity: 0;
        transform: translateX(-20px);
        animation: slideInLeft 0.3s ease forwards;
      }
      
      .list-item:nth-child(1) { animation-delay: 0.1s; }
      .list-item:nth-child(2) { animation-delay: 0.2s; }
      .list-item:nth-child(3) { animation-delay: 0.3s; }
      .list-item:nth-child(4) { animation-delay: 0.4s; }
      .list-item:nth-child(5) { animation-delay: 0.5s; }
      
      @keyframes slideInLeft {
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      /* Success/Error state animations */
      .success-flash {
        animation: successFlash 0.6s ease;
      }
      
      .error-shake {
        animation: errorShake 0.5s ease;
      }
      
      @keyframes successFlash {
        0%, 100% { background-color: transparent; }
        50% { background-color: rgba(0, 255, 0, 0.2); }
      }
      
      @keyframes errorShake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup global event listeners for UI enhancements
   */
  setupGlobalEventListeners() {
    // Add ripple effect to buttons
    document.addEventListener('click', (event) => {
      if (event.target.matches('button, .btn, .action-btn')) {
        this.createRippleEffect(event);
      }
    });
    
    // Enhanced focus management
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });
    
    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });
    
    // Auto-enhance new elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.enhanceElement(node);
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Enhance existing elements with polish effects
   */
  enhanceExistingElements() {
    // Enhance buttons
    const buttons = document.querySelectorAll('button, .btn, .action-btn');
    buttons.forEach(button => this.enhanceButton(button));
    
    // Enhance cards
    const cards = document.querySelectorAll('.combatant-card, .equipment-slot, .inventory-slot');
    cards.forEach(card => this.enhanceCard(card));
    
    // Enhance modals
    const modals = document.querySelectorAll('.modal, .character-sheet-overlay, .combat-results-container');
    modals.forEach(modal => this.enhanceModal(modal));
    
    // Enhance form elements
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => this.enhanceInput(input));
  }

  /**
   * Enhance a single element
   * @param {HTMLElement} element - Element to enhance
   */
  enhanceElement(element) {
    if (element.matches('button, .btn, .action-btn')) {
      this.enhanceButton(element);
    } else if (element.matches('.combatant-card, .equipment-slot, .inventory-slot')) {
      this.enhanceCard(element);
    } else if (element.matches('.modal, .character-sheet-overlay, .combat-results-container')) {
      this.enhanceModal(element);
    } else if (element.matches('input, select, textarea')) {
      this.enhanceInput(element);
    }
    
    // Enhance child elements
    const childButtons = element.querySelectorAll('button, .btn, .action-btn');
    childButtons.forEach(button => this.enhanceButton(button));
    
    const childCards = element.querySelectorAll('.combatant-card, .equipment-slot, .inventory-slot');
    childCards.forEach(card => this.enhanceCard(card));
    
    const childInputs = element.querySelectorAll('input, select, textarea');
    childInputs.forEach(input => this.enhanceInput(input));
  }

  /**
   * Enhance button with hover and click effects
   * @param {HTMLElement} button - Button element
   */
  enhanceButton(button) {
    if (button.dataset.enhanced) return;
    
    // Add hover glow effect
    button.classList.add('hover-glow');
    
    // Add loading state capability
    button.addEventListener('click', () => {
      if (button.dataset.loading === 'true') return;
      
      // Add subtle click feedback
      button.style.transform = 'scale(0.98)';
      setTimeout(() => {
        button.style.transform = '';
      }, 100);
    });
    
    button.dataset.enhanced = 'true';
  }

  /**
   * Enhance card with hover effects
   * @param {HTMLElement} card - Card element
   */
  enhanceCard(card) {
    if (card.dataset.enhanced) return;
    
    card.classList.add('hover-lift');
    
    // Add subtle hover delay for better UX
    let hoverTimeout;
    card.addEventListener('mouseenter', () => {
      hoverTimeout = setTimeout(() => {
        card.classList.add('hover-active');
      }, this.settings.hoverDelay);
    });
    
    card.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
      card.classList.remove('hover-active');
    });
    
    card.dataset.enhanced = 'true';
  }

  /**
   * Enhance modal with smooth transitions
   * @param {HTMLElement} modal - Modal element
   */
  enhanceModal(modal) {
    if (modal.dataset.enhanced) return;
    
    modal.classList.add('modal-overlay');
    
    // Find or create content wrapper
    let content = modal.querySelector('.modal-content, .character-sheet-modal, .results-content');
    if (content) {
      content.classList.add('modal-content');
    }
    
    modal.dataset.enhanced = 'true';
  }

  /**
   * Enhance input with focus effects
   * @param {HTMLElement} input - Input element
   */
  enhanceInput(input) {
    if (input.dataset.enhanced) return;
    
    // Add focus enhancement
    input.addEventListener('focus', () => {
      input.classList.add('focus-active');
    });
    
    input.addEventListener('blur', () => {
      input.classList.remove('focus-active');
    });
    
    input.dataset.enhanced = 'true';
  }

  /**
   * Create ripple effect on button click
   * @param {Event} event - Click event
   */
  createRippleEffect(event) {
    const button = event.target;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  /**
   * Show loading indicator on element
   * @param {HTMLElement} element - Element to show loading on
   * @param {string} text - Loading text (optional)
   */
  showLoading(element, text = 'Loading') {
    if (this.loadingIndicators.has(element)) return;
    
    const originalContent = element.innerHTML;
    const originalDisabled = element.disabled;
    
    element.disabled = true;
    element.dataset.loading = 'true';
    
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    
    const loadingText = document.createElement('span');
    loadingText.className = 'loading-dots';
    loadingText.textContent = text;
    
    element.innerHTML = '';
    element.appendChild(spinner);
    element.appendChild(loadingText);
    
    this.loadingIndicators.set(element, {
      originalContent,
      originalDisabled
    });
  }

  /**
   * Hide loading indicator
   * @param {HTMLElement} element - Element to hide loading from
   */
  hideLoading(element) {
    const loadingData = this.loadingIndicators.get(element);
    if (!loadingData) return;
    
    element.innerHTML = loadingData.originalContent;
    element.disabled = loadingData.originalDisabled;
    element.dataset.loading = 'false';
    
    this.loadingIndicators.delete(element);
  }

  /**
   * Show progress bar
   * @param {HTMLElement} container - Container for progress bar
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} label - Progress label (optional)
   */
  showProgress(container, progress = 0, label = '') {
    let progressBar = container.querySelector('.progress-bar');
    
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.innerHTML = `
        <div class="progress-fill"></div>
        <div class="progress-label">${label}</div>
      `;
      container.appendChild(progressBar);
    }
    
    const fill = progressBar.querySelector('.progress-fill');
    const labelEl = progressBar.querySelector('.progress-label');
    
    fill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    if (labelEl && label) {
      labelEl.textContent = label;
    }
  }

  /**
   * Hide progress bar
   * @param {HTMLElement} container - Container with progress bar
   */
  hideProgress(container) {
    const progressBar = container.querySelector('.progress-bar');
    if (progressBar) {
      progressBar.remove();
    }
  }

  /**
   * Show confirmation dialog
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Callback for confirmation
   * @param {Function} onCancel - Callback for cancellation (optional)
   */
  showConfirmation(message, onConfirm, onCancel = null) {
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #00ff00;
      border-radius: 8px;
      padding: 30px;
      max-width: 400px;
      text-align: center;
      color: #00ff00;
      font-family: 'Courier New', monospace;
    `;
    
    dialog.innerHTML = `
      <div class="confirmation-message" style="margin-bottom: 20px; font-size: 16px;">
        ${message}
      </div>
      <div class="confirmation-actions" style="display: flex; gap: 15px; justify-content: center;">
        <button class="confirm-btn" style="background: #00aa00; border: none; color: white; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
          Confirm
        </button>
        <button class="cancel-btn" style="background: #666; border: none; color: white; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
          Cancel
        </button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Animate in
    setTimeout(() => {
      dialog.classList.add('show');
    }, 10);
    
    // Event handlers
    const confirmBtn = dialog.querySelector('.confirm-btn');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    
    confirmBtn.addEventListener('click', () => {
      onConfirm();
      this.hideConfirmation(overlay);
    });
    
    cancelBtn.addEventListener('click', () => {
      if (onCancel) onCancel();
      this.hideConfirmation(overlay);
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        if (onCancel) onCancel();
        this.hideConfirmation(overlay);
      }
    });
    
    // Close on Escape key
    const escapeHandler = (event) => {
      if (event.key === 'Escape') {
        if (onCancel) onCancel();
        this.hideConfirmation(overlay);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Hide confirmation dialog
   * @param {HTMLElement} overlay - Confirmation overlay element
   */
  hideConfirmation(overlay) {
    const dialog = overlay.querySelector('.confirmation-dialog');
    dialog.classList.remove('show');
    
    setTimeout(() => {
      overlay.remove();
    }, 200);
  }

  /**
   * Show success feedback
   * @param {HTMLElement} element - Element to show success on
   * @param {string} message - Success message (optional)
   */
  showSuccess(element, message = '') {
    element.classList.add('success-flash');
    
    if (message) {
      this.showNotification(message, 'success');
    }
    
    setTimeout(() => {
      element.classList.remove('success-flash');
    }, 600);
  }

  /**
   * Show error feedback
   * @param {HTMLElement} element - Element to show error on
   * @param {string} message - Error message (optional)
   */
  showError(element, message = '') {
    element.classList.add('error-shake');
    
    if (message) {
      this.showNotification(message, 'error');
    }
    
    setTimeout(() => {
      element.classList.remove('error-shake');
    }, 500);
  }

  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('success', 'error', 'warning', 'info')
   * @param {number} duration - Duration in milliseconds
   */
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${this.getNotificationColor(type)};
      color: white;
      padding: 15px 20px;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      max-width: 300px;
      font-family: 'Courier New', monospace;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Auto-hide
    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, duration);
  }

  /**
   * Get notification color based on type
   * @param {string} type - Notification type
   * @returns {string} Color value
   */
  getNotificationColor(type) {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    return colors[type] || colors.info;
  }

  /**
   * Animate list items in sequence
   * @param {HTMLElement} container - Container with list items
   * @param {string} selector - Selector for list items
   */
  animateListItems(container, selector = '.list-item') {
    const items = container.querySelectorAll(selector);
    items.forEach((item, index) => {
      item.classList.add('list-item');
      item.style.animationDelay = `${index * 0.1}s`;
    });
  }

  /**
   * Get UI polish status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      activeAnimations: this.activeAnimations.size,
      loadingIndicators: this.loadingIndicators.size,
      hoverTimeouts: this.hoverTimeouts.size
    };
  }

  /**
   * Dispose of UI polish system
   */
  dispose() {
    // Clear timeouts
    this.hoverTimeouts.forEach(timeout => clearTimeout(timeout));
    this.hoverTimeouts.clear();
    
    // Clear loading indicators
    this.loadingIndicators.forEach((data, element) => {
      this.hideLoading(element);
    });
    
    // Clear active animations
    this.activeAnimations.clear();
    
    // Remove styles
    const styles = document.getElementById('ui-polish-styles');
    if (styles) {
      styles.remove();
    }
    
    this.isInitialized = false;
    
    console.log('UIPolishSystem disposed');
  }
}