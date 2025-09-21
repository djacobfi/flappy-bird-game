/**
 * Adaptive Game Loader
 * Automatically detects device type and loads the appropriate game version
 */

class AdaptiveGameLoader {
    constructor() {
        this.deviceDetector = null;
        this.mobileUI = null;
        this.mobileGame = null;
        this.desktopGame = null;
        this.currentVersion = null;
        this.isInitialized = false;
        
        // Performance monitoring
        this.performanceMonitor = {
            loadStartTime: 0,
            loadEndTime: 0,
            memoryUsage: 0,
            renderTime: 0
        };
        
        // Initialize the adaptive system
        this.initialize();
    }

    /**
     * Initialize the adaptive game system
     */
    async initialize() {
        try {
            this.performanceMonitor.loadStartTime = performance.now();
            
            // Initialize device detection
            this.deviceDetector = new DeviceDetector();
            this.deviceDetector.applyOptimizations();
            
            // Log device information for debugging
            console.log('Device detected:', this.deviceDetector.deviceType);
            console.log('Device capabilities:', this.deviceDetector.capabilities);
            console.log('Optimizations:', this.deviceDetector.optimizations);
            
            // Load appropriate game version
            await this.loadGameVersion();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize performance monitoring
            this.startPerformanceMonitoring();
            
            this.isInitialized = true;
            this.performanceMonitor.loadEndTime = performance.now();
            
            console.log(`Game loaded in ${(this.performanceMonitor.loadEndTime - this.performanceMonitor.loadStartTime).toFixed(2)}ms`);
            
        } catch (error) {
            console.error('Failed to initialize adaptive game loader:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Load the appropriate game version based on device type
     */
    async loadGameVersion() {
        const deviceType = this.deviceDetector.deviceType;
        
        if (deviceType === 'mobile') {
            await this.loadMobileVersion();
        } else if (deviceType === 'tablet') {
            // Tablets can use either version, but we'll default to mobile for better touch experience
            await this.loadMobileVersion();
        } else {
            await this.loadDesktopVersion();
        }
    }

    /**
     * Load mobile-optimized version
     */
    async loadMobileVersion() {
        console.log('Loading mobile version...');
        
        // Load mobile styles
        this.loadStylesheet('/Users/damienjacob/Flappy/mobile-styles.css');
        
        // Initialize mobile UI components
        this.mobileUI = new MobileUIComponents(this.deviceDetector);
        const mobileComponents = this.mobileUI.initialize();
        
        // Initialize mobile game engine
        this.mobileGame = new MobileGameEngine(this.deviceDetector, this.mobileUI);
        
        // Setup mobile-specific event handlers
        this.setupMobileEventHandlers(mobileComponents);
        
        this.currentVersion = 'mobile';
        
        // Show mobile-specific UI elements
        this.showMobileUI();
        
        console.log('Mobile version loaded successfully');
    }

    /**
     * Load desktop version
     */
    async loadDesktopVersion() {
        console.log('Loading desktop version...');
        
        // Load original styles (already loaded in HTML)
        // The original flappy-bird.js should handle desktop version
        
        // Initialize desktop game if the original game class exists
        if (window.FlappyBirdGame) {
            // Wait for DOM to be fully ready
            await new Promise(resolve => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', resolve);
                } else {
                    resolve();
                }
            });
            
            this.desktopGame = new FlappyBirdGame();
        } else {
            // Fallback to mobile version if desktop version not available
            console.warn('Desktop version not found, falling back to mobile version');
            await this.loadMobileVersion();
            return;
        }
        
        this.currentVersion = 'desktop';
        
        // Show desktop-specific UI elements
        this.showDesktopUI();
        
        console.log('Desktop version loaded successfully');
    }

    /**
     * Setup mobile-specific event handlers
     */
    setupMobileEventHandlers(mobileComponents) {
        // Jump button
        const jumpButton = mobileComponents.jumpButton;
        if (jumpButton) {
            jumpButton.addEventListener('click', () => {
                this.mobileGame.handleJumpStart();
            });
        }
        
        // Pause button
        const pauseButton = mobileComponents.pauseButton;
        if (pauseButton) {
            pauseButton.addEventListener('click', () => {
                if (this.mobileGame.gameState === 'playing') {
                    this.mobileGame.pauseGame();
                } else if (this.mobileGame.gameState === 'paused') {
                    this.mobileGame.resumeGame();
                }
            });
        }
        
        // Settings button (if exists)
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.toggleMobileSettings();
            });
        }
        
        // Mobile settings panel handlers
        this.setupMobileSettingsHandlers();
        
        // Mobile game over screen handlers
        this.setupMobileGameOverHandlers();
        
        // Volume controls
        this.setupMobileVolumeControls();
    }

    /**
     * Setup mobile settings panel event handlers
     */
    setupMobileSettingsHandlers() {
        const settingsPanel = this.mobileUI.components.settingsPanel;
        const closeBtn = document.getElementById('closeMobileSettings');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeMobileSettings();
            });
        }
        
        // Click outside to close
        if (settingsPanel) {
            settingsPanel.addEventListener('click', (e) => {
                if (e.target === settingsPanel) {
                    this.closeMobileSettings();
                }
            });
        }
    }

    /**
     * Setup mobile game over screen event handlers
     */
    setupMobileGameOverHandlers() {
        const restartBtn = document.getElementById('mobileRestartBtn');
        const shareBtn = document.getElementById('mobileShareBtn');
        const saveNameBtn = document.getElementById('mobileSaveNameBtn');
        
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.mobileGame.restartGame();
            });
        }
        
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareScore();
            });
        }
        
        if (saveNameBtn) {
            saveNameBtn.addEventListener('click', () => {
                this.savePlayerName();
            });
        }
    }

    /**
     * Setup mobile volume controls
     */
    setupMobileVolumeControls() {
        const masterSlider = document.getElementById('mobileMasterVolumeSlider');
        const musicSlider = document.getElementById('mobileMusicVolumeSlider');
        const soundSlider = document.getElementById('mobileSoundVolumeSlider');
        
        if (masterSlider) {
            masterSlider.addEventListener('input', (e) => {
                const volume = e.target.value;
                this.mobileGame.audio.volumes.master = volume;
                document.getElementById('mobileMasterVolumeDisplay').textContent = volume + '%';
                localStorage.setItem('flappyMasterVolume', volume);
            });
        }
        
        if (musicSlider) {
            musicSlider.addEventListener('input', (e) => {
                const volume = e.target.value;
                this.mobileGame.audio.volumes.music = volume;
                document.getElementById('mobileMusicVolumeDisplay').textContent = volume + '%';
                localStorage.setItem('flappyMusicVolume', volume);
            });
        }
        
        if (soundSlider) {
            soundSlider.addEventListener('input', (e) => {
                const volume = e.target.value;
                this.mobileGame.audio.volumes.tap = volume;
                this.mobileGame.audio.volumes.crash = volume;
                document.getElementById('mobileSoundVolumeDisplay').textContent = volume + '%';
                localStorage.setItem('flappyTapVolume', volume);
                localStorage.setItem('flappyCrashVolume', volume);
            });
        }
    }

    /**
     * Setup general event listeners
     */
    setupEventListeners() {
        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Orientation change handler
        if (this.deviceDetector.capabilities.orientation) {
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    this.handleOrientationChange();
                }, 100);
            });
        }
        
        // Visibility change handler
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
        
        // Error handling
        window.addEventListener('error', (e) => {
            this.handleError(e);
        });
        
        // Unhandled promise rejection handling
        window.addEventListener('unhandledrejection', (e) => {
            this.handleError(e);
        });
    }

    /**
     * Show mobile UI elements
     */
    showMobileUI() {
        // Hide desktop-specific elements
        const desktopElements = [
            'startScreen',
            'gameOverScreen', 
            'gameHUD',
            'settingsPanel'
        ];
        
        desktopElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Show mobile elements
        const mobileElements = [
            'touchControls',
            'mobileSettingsPanel',
            'mobileGameOverScreen'
        ];
        
        mobileElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'block';
            }
        });
    }

    /**
     * Show desktop UI elements
     */
    showDesktopUI() {
        // Hide mobile-specific elements
        const mobileElements = [
            'touchControls',
            'mobileSettingsPanel',
            'mobileGameOverScreen'
        ];
        
        mobileElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Show desktop elements
        const desktopElements = [
            'startScreen',
            'gameHUD'
        ];
        
        desktopElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'block';
            }
        });
    }

    /**
     * Toggle mobile settings panel
     */
    toggleMobileSettings() {
        const settingsPanel = this.mobileUI.components.settingsPanel;
        if (settingsPanel) {
            settingsPanel.classList.toggle('hidden');
        }
    }

    /**
     * Close mobile settings panel
     */
    closeMobileSettings() {
        const settingsPanel = this.mobileUI.components.settingsPanel;
        if (settingsPanel) {
            settingsPanel.classList.add('hidden');
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.currentVersion === 'mobile' && this.mobileGame) {
            this.mobileGame.handleOrientationChange();
        }
    }

    /**
     * Handle orientation change
     */
    handleOrientationChange() {
        if (this.currentVersion === 'mobile' && this.mobileGame) {
            this.mobileGame.handleOrientationChange();
        }
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        if (this.currentVersion === 'mobile' && this.mobileGame) {
            if (document.hidden) {
                this.mobileGame.pauseGame();
            } else {
                this.mobileGame.resumeGame();
            }
        }
    }

    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        console.error('Game initialization failed:', error);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 2rem;
            border-radius: 10px;
            text-align: center;
            z-index: 1000;
            max-width: 400px;
            width: 90%;
        `;
        errorDiv.innerHTML = `
            <h3>🚫 Game Load Error</h3>
            <p>Sorry, there was an error loading the game.</p>
            <p>Please refresh the page and try again.</p>
            <button onclick="window.location.reload()" style="
                background: #3498db;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 1rem;
            ">Refresh Page</button>
        `;
        
        document.body.appendChild(errorDiv);
    }

    /**
     * Handle runtime errors
     */
    handleError(error) {
        console.error('Runtime error:', error);
        
        // In production, you might want to send this to an error tracking service
        // For now, just log it
    }

    /**
     * Load external stylesheet
     */
    loadStylesheet(href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onerror = () => {
            console.warn(`Failed to load stylesheet: ${href}`);
        };
        document.head.appendChild(link);
    }

    /**
     * Share score functionality
     */
    shareScore() {
        if (this.mobileGame && this.mobileGame.score > 0) {
            const shareText = `I scored ${this.mobileGame.score} points in Flappy Bird! Can you beat my score?`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'Flappy Bird Score',
                    text: shareText,
                    url: window.location.href
                }).catch(err => console.log('Share failed:', err));
            } else {
                // Fallback to copying to clipboard
                navigator.clipboard.writeText(shareText).then(() => {
                    alert('Score copied to clipboard!');
                }).catch(() => {
                    // Final fallback
                    const textArea = document.createElement('textarea');
                    textArea.value = shareText;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    alert('Score copied to clipboard!');
                });
            }
        }
    }

    /**
     * Save player name
     */
    savePlayerName() {
        const nameInput = document.getElementById('mobilePlayerNameInput');
        if (nameInput && nameInput.value.trim()) {
            localStorage.setItem('flappyPlayerName', nameInput.value.trim());
            
            // Submit score with name if leaderboard is available
            if (window.leaderboard && typeof window.leaderboard.submitScore === 'function') {
                window.leaderboard.submitScore(nameInput.value.trim(), this.mobileGame.score);
            }
            
            // Show confirmation
            nameInput.style.background = 'rgba(39, 174, 96, 0.3)';
            setTimeout(() => {
                nameInput.style.background = '';
            }, 1000);
        }
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        if (this.deviceDetector.optimizations.adaptiveQuality) {
            setInterval(() => {
                this.monitorPerformance();
            }, 5000); // Check every 5 seconds
        }
    }

    /**
     * Monitor performance and adjust quality if needed
     */
    monitorPerformance() {
        if (this.currentVersion === 'mobile' && this.mobileGame) {
            const stats = this.mobileGame.getPerformanceStats();
            
            // Log performance stats for debugging
            if (performance.memory) {
                this.performanceMonitor.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
            }
            
            console.log('Performance stats:', stats);
        }
    }

    /**
     * Get current game instance
     */
    getCurrentGame() {
        return this.currentVersion === 'mobile' ? this.mobileGame : this.desktopGame;
    }

    /**
     * Get device information
     */
    getDeviceInfo() {
        return this.deviceDetector ? this.deviceDetector.getPerformanceData() : null;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.mobileGame) {
            this.mobileGame.cleanup();
        }
        
        if (this.mobileUI) {
            this.mobileUI.cleanup();
        }
        
        this.isInitialized = false;
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
        window.adaptiveGameLoader = new AdaptiveGameLoader();
    }, 100);
});

// Export for manual initialization if needed
window.AdaptiveGameLoader = AdaptiveGameLoader;
