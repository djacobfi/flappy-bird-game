/**
 * Mobile-Optimized UI Components
 * Touch-friendly controls and mobile-specific UI elements
 */

class MobileUIComponents {
    constructor(deviceDetector) {
        this.device = deviceDetector;
        this.components = {};
        this.touchState = {
            activeTouches: new Map(),
            lastTapTime: 0,
            tapCount: 0,
            swipeStart: null,
            longPressTimer: null
        };
    }

    /**
     * Create mobile-optimized button
     */
    createMobileButton(id, text, className = '', onClick = null) {
        const button = document.createElement('button');
        button.id = id;
        button.textContent = text;
        button.className = `mobile-btn ${className}`;
        
        // Apply device-specific styling
        const deviceClass = this.device.deviceType;
        button.classList.add(`device-${deviceClass}`);
        
        // Touch-friendly sizing
        const opt = this.device.optimizations;
        button.style.minHeight = `${opt.touchTargetSize}px`;
        button.style.minWidth = `${opt.touchTargetSize}px`;
        button.style.fontSize = opt.fontSize === 'large' ? '1.2rem' : '1rem';
        
        // Add touch event handlers
        if (onClick) {
            this.addTouchHandlers(button, onClick);
        }
        
        return button;
    }

    /**
     * Create mobile-optimized input field
     */
    createMobileInput(id, type = 'text', placeholder = '', className = '') {
        const input = document.createElement('input');
        input.id = id;
        input.type = type;
        input.placeholder = placeholder;
        input.className = `mobile-input ${className}`;
        
        // Mobile-specific attributes
        if (type === 'text') {
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('spellcheck', 'false');
        }
        
        // Touch-friendly sizing
        const opt = this.device.optimizations;
        input.style.minHeight = `${opt.touchTargetSize}px`;
        input.style.fontSize = opt.fontSize === 'large' ? '1.1rem' : '1rem';
        
        return input;
    }

    /**
     * Create mobile-optimized slider
     */
    createMobileSlider(id, min = 0, max = 100, value = 50, className = '') {
        const container = document.createElement('div');
        container.className = `mobile-slider-container ${className}`;
        
        const slider = document.createElement('input');
        slider.id = id;
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.value = value;
        slider.className = 'mobile-slider';
        
        // Mobile-optimized slider styling
        const opt = this.device.optimizations;
        slider.style.height = `${Math.max(opt.touchTargetSize, 20)}px`;
        
        container.appendChild(slider);
        return container;
    }

    /**
     * Create touch-friendly game control overlay
     */
    createTouchControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'touchControls';
        controlsContainer.className = 'touch-controls-overlay';
        
        // Jump button (main control)
        const jumpButton = this.createMobileButton('jumpButton', '🐦', 'jump-btn primary');
        jumpButton.innerHTML = '🐦<br><span class="tap-hint">TAP TO FLY</span>';
        jumpButton.style.position = 'absolute';
        jumpButton.style.right = '20px';
        jumpButton.style.bottom = '100px';
        jumpButton.style.width = '80px';
        jumpButton.style.height = '80px';
        jumpButton.style.borderRadius = '50%';
        jumpButton.style.fontSize = '1.5rem';
        jumpButton.style.zIndex = '100';
        
        // Pause button
        const pauseButton = this.createMobileButton('pauseButton', '⏸️', 'pause-btn secondary');
        pauseButton.style.position = 'absolute';
        pauseButton.style.left = '20px';
        pauseButton.style.top = '20px';
        pauseButton.style.width = '50px';
        pauseButton.style.height = '50px';
        pauseButton.style.borderRadius = '50%';
        pauseButton.style.zIndex = '100';
        
        // Score display (mobile-optimized)
        const scoreDisplay = document.createElement('div');
        scoreDisplay.id = 'mobileScore';
        scoreDisplay.className = 'mobile-score-display';
        scoreDisplay.style.position = 'absolute';
        scoreDisplay.style.top = '20px';
        scoreDisplay.style.left = '50%';
        scoreDisplay.style.transform = 'translateX(-50%)';
        scoreDisplay.style.fontSize = this.device.optimizations.fontSize === 'large' ? '2.5rem' : '2rem';
        scoreDisplay.style.color = 'white';
        scoreDisplay.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
        scoreDisplay.style.zIndex = '100';
        scoreDisplay.style.fontWeight = 'bold';
        
        controlsContainer.appendChild(jumpButton);
        controlsContainer.appendChild(pauseButton);
        controlsContainer.appendChild(scoreDisplay);
        
        return controlsContainer;
    }

    /**
     * Create mobile-optimized settings panel
     */
    createMobileSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 'mobileSettingsPanel';
        panel.className = 'mobile-settings-panel hidden';
        
        const header = document.createElement('div');
        header.className = 'mobile-panel-header';
        header.innerHTML = `
            <h3>🎮 Settings</h3>
            <button id="closeMobileSettings" class="mobile-close-btn">×</button>
        `;
        
        const content = document.createElement('div');
        content.className = 'mobile-panel-content';
        
        // Audio settings
        const audioSection = document.createElement('div');
        audioSection.className = 'mobile-setting-section';
        audioSection.innerHTML = `
            <h4>🔊 Audio</h4>
            <div class="mobile-volume-control">
                <label>Master Volume: <span id="mobileMasterVolumeDisplay">100%</span></label>
                <input type="range" id="mobileMasterVolumeSlider" min="0" max="100" value="100" class="mobile-slider">
            </div>
            <div class="mobile-volume-control">
                <label>Music: <span id="mobileMusicVolumeDisplay">30%</span></label>
                <input type="range" id="mobileMusicVolumeSlider" min="0" max="100" value="30" class="mobile-slider">
            </div>
            <div class="mobile-volume-control">
                <label>Sounds: <span id="mobileSoundVolumeDisplay">70%</span></label>
                <input type="range" id="mobileSoundVolumeSlider" min="0" max="100" value="70" class="mobile-slider">
            </div>
        `;
        
        // Game settings
        const gameSection = document.createElement('div');
        gameSection.className = 'mobile-setting-section';
        gameSection.innerHTML = `
            <h4>🎮 Game</h4>
            <div class="mobile-setting-item">
                <label>
                    <input type="checkbox" id="mobileVibrationToggle" checked>
                    Haptic Feedback
                </label>
            </div>
            <div class="mobile-setting-item">
                <label>
                    <input type="checkbox" id="mobileFullscreenToggle">
                    Fullscreen Mode
                </label>
            </div>
            <div class="mobile-setting-item">
                <label>
                    <input type="checkbox" id="mobileAutoPauseToggle" checked>
                    Auto-pause on Background
                </label>
            </div>
        `;
        
        content.appendChild(audioSection);
        content.appendChild(gameSection);
        
        panel.appendChild(header);
        panel.appendChild(content);
        
        return panel;
    }

    /**
     * Create mobile-optimized game over screen
     */
    createMobileGameOverScreen() {
        const screen = document.createElement('div');
        screen.id = 'mobileGameOverScreen';
        screen.className = 'mobile-game-over-screen hidden';
        
        const content = document.createElement('div');
        content.className = 'mobile-game-over-content';
        
        content.innerHTML = `
            <h2>🏁 Game Over!</h2>
            <div class="mobile-score-display">
                <div class="score-item">
                    <span class="score-label">Score:</span>
                    <span id="mobileFinalScore" class="score-value">0</span>
                </div>
                <div class="score-item">
                    <span class="score-label">Best:</span>
                    <span id="mobileBestScore" class="score-value">0</span>
                </div>
            </div>
            
            <div class="mobile-player-name">
                <input type="text" id="mobilePlayerNameInput" placeholder="Enter your name" maxlength="15">
                <button id="mobileSaveNameBtn" class="mobile-btn secondary">💾</button>
            </div>
            
            <div class="mobile-leaderboard">
                <h4>🏆 Top Scores</h4>
                <div id="mobileLeaderboardList" class="mobile-leaderboard-list">
                    Loading...
                </div>
            </div>
            
            <div class="mobile-game-over-buttons">
                <button id="mobileRestartBtn" class="mobile-btn primary large">🔄 Play Again</button>
                <button id="mobileShareBtn" class="mobile-btn secondary">📤 Share Score</button>
            </div>
        `;
        
        screen.appendChild(content);
        return screen;
    }

    /**
     * Add touch event handlers to elements
     */
    addTouchHandlers(element, onClick) {
        // Prevent default touch behaviors
        element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTouchStart(e, element, onClick);
        }, { passive: false });
        
        element.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleTouchEnd(e, element, onClick);
        }, { passive: false });
        
        element.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Add click handler for desktop compatibility
        element.addEventListener('click', onClick);
        
        // Add visual feedback
        element.addEventListener('touchstart', () => {
            element.style.opacity = '0.7';
            element.style.transform = 'scale(0.95)';
        });
        
        element.addEventListener('touchend', () => {
            element.style.opacity = '1';
            element.style.transform = 'scale(1)';
        });
    }

    /**
     * Handle touch start events
     */
    handleTouchStart(event, element, onClick) {
        const touch = event.touches[0];
        const touchId = touch.identifier;
        
        this.touchState.activeTouches.set(touchId, {
            element: element,
            startTime: Date.now(),
            startX: touch.clientX,
            startY: touch.clientY,
            onClick: onClick
        });
        
        // Haptic feedback if supported
        if (this.device.supportsFeature('vibration')) {
            navigator.vibrate(10);
        }
        
        // Start long press timer
        this.touchState.longPressTimer = setTimeout(() => {
            this.handleLongPress(touchId);
        }, this.device.optimizations.longPressThreshold);
    }

    /**
     * Handle touch end events
     */
    handleTouchEnd(event, element, onClick) {
        const touch = event.changedTouches[0];
        const touchId = touch.identifier;
        const touchData = this.touchState.activeTouches.get(touchId);
        
        if (!touchData) return;
        
        // Clear long press timer
        if (this.touchState.longPressTimer) {
            clearTimeout(this.touchState.longPressTimer);
            this.touchState.longPressTimer = null;
        }
        
        const duration = Date.now() - touchData.startTime;
        const distance = Math.sqrt(
            Math.pow(touch.clientX - touchData.startX, 2) + 
            Math.pow(touch.clientY - touchData.startY, 2)
        );
        
        // Determine gesture type
        if (duration < this.device.optimizations.longPressThreshold && 
            distance < this.device.optimizations.swipeThreshold) {
            // Tap gesture
            this.handleTap(touchData.onClick);
        } else if (distance >= this.device.optimizations.swipeThreshold) {
            // Swipe gesture
            this.handleSwipe(touchData, touch);
        }
        
        this.touchState.activeTouches.delete(touchId);
    }

    /**
     * Handle tap gestures
     */
    handleTap(onClick) {
        const now = Date.now();
        const timeSinceLastTap = now - this.touchState.lastTapTime;
        
        if (timeSinceLastTap < this.device.optimizations.doubleTapThreshold) {
            this.touchState.tapCount++;
        } else {
            this.touchState.tapCount = 1;
        }
        
        this.touchState.lastTapTime = now;
        
        // Execute click handler
        if (onClick) {
            onClick();
        }
        
        // Haptic feedback for tap
        if (this.device.supportsFeature('vibration')) {
            navigator.vibrate(this.touchState.tapCount > 1 ? [10, 50, 10] : 10);
        }
    }

    /**
     * Handle swipe gestures
     */
    handleSwipe(touchData, endTouch) {
        const deltaX = endTouch.clientX - touchData.startX;
        const deltaY = endTouch.clientY - touchData.startY;
        
        // Determine swipe direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (deltaX > 0) {
                console.log('Swipe right');
            } else {
                console.log('Swipe left');
            }
        } else {
            // Vertical swipe
            if (deltaY > 0) {
                console.log('Swipe down');
            } else {
                console.log('Swipe up');
            }
        }
    }

    /**
     * Handle long press gestures
     */
    handleLongPress(touchId) {
        const touchData = this.touchState.activeTouches.get(touchId);
        if (touchData) {
            console.log('Long press detected');
            
            // Haptic feedback for long press
            if (this.device.supportsFeature('vibration')) {
                navigator.vibrate([50, 50, 50]);
            }
        }
    }

    /**
     * Show mobile-specific hints and tips
     */
    showMobileHints() {
        if (!this.device.optimizations.showTouchHints) return;
        
        const hints = document.createElement('div');
        hints.id = 'mobileHints';
        hints.className = 'mobile-hints';
        hints.innerHTML = `
            <div class="hint-item">
                <span class="hint-icon">👆</span>
                <span class="hint-text">Tap to fly</span>
            </div>
            <div class="hint-item">
                <span class="hint-icon">📱</span>
                <span class="hint-text">Hold for longer jumps</span>
            </div>
            <div class="hint-item">
                <span class="hint-icon">⚙️</span>
                <span class="hint-text">Tap settings for options</span>
            </div>
        `;
        
        document.body.appendChild(hints);
        
        // Auto-hide hints after 5 seconds
        setTimeout(() => {
            if (hints.parentNode) {
                hints.parentNode.removeChild(hints);
            }
        }, 5000);
    }

    /**
     * Initialize all mobile components
     */
    initialize() {
        // Create touch controls
        const touchControls = this.createTouchControls();
        document.body.appendChild(touchControls);
        
        // Create mobile settings panel
        const settingsPanel = this.createMobileSettingsPanel();
        document.body.appendChild(settingsPanel);
        
        // Create mobile game over screen
        const gameOverScreen = this.createMobileGameOverScreen();
        document.body.appendChild(gameOverScreen);
        
        // Show mobile hints
        this.showMobileHints();
        
        // Store component references
        this.components = {
            touchControls,
            settingsPanel,
            gameOverScreen,
            jumpButton: document.getElementById('jumpButton'),
            pauseButton: document.getElementById('pauseButton'),
            scoreDisplay: document.getElementById('mobileScore')
        };
        
        return this.components;
    }

    /**
     * Update mobile UI based on game state
     */
    updateUI(gameState) {
        const { touchControls, settingsPanel, gameOverScreen } = this.components;
        
        // Show/hide appropriate screens
        if (gameState === 'playing') {
            touchControls.classList.remove('hidden');
            settingsPanel.classList.add('hidden');
            gameOverScreen.classList.add('hidden');
        } else if (gameState === 'gameOver') {
            touchControls.classList.add('hidden');
            settingsPanel.classList.add('hidden');
            gameOverScreen.classList.remove('hidden');
        } else if (gameState === 'menu') {
            touchControls.classList.add('hidden');
            settingsPanel.classList.add('hidden');
            gameOverScreen.classList.add('hidden');
        }
    }

    /**
     * Update score display
     */
    updateScore(score) {
        const scoreDisplay = this.components.scoreDisplay;
        if (scoreDisplay) {
            scoreDisplay.textContent = score;
        }
    }

    /**
     * Cleanup mobile components
     */
    cleanup() {
        Object.values(this.components).forEach(component => {
            if (component && component.parentNode) {
                component.parentNode.removeChild(component);
            }
        });
        this.components = {};
    }
}

// Export for use in other modules
window.MobileUIComponents = MobileUIComponents;
