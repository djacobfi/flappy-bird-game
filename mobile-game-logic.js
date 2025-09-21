/**
 * Mobile-Optimized Game Logic
 * Performance-optimized game engine for mobile devices
 */

class MobileGameEngine {
    constructor(deviceDetector, mobileUI) {
        this.device = deviceDetector;
        this.mobileUI = mobileUI;
        this.optimizations = deviceDetector.optimizations;
        
        // Game state
        this.gameState = 'menu';
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('flappyBestScore')) || 0;
        
        // Performance tracking
        this.performance = {
            frameCount: 0,
            lastFPSUpdate: Date.now(),
            currentFPS: 0,
            frameTime: 0,
            droppedFrames: 0,
            adaptiveQuality: this.optimizations.adaptiveQuality
        };
        
        // Mobile-specific game settings
        this.settings = {
            gravity: this.optimizations.gravity,
            jumpPower: this.optimizations.jumpPower,
            birdSpeed: this.optimizations.birdSpeed,
            pipeSpeed: this.optimizations.pipeSpeed,
            pipeGap: this.optimizations.pipeGap,
            pipeWidth: 50,
            maxPipes: this.optimizations.maxPipes
        };
        
        // Game objects with mobile optimizations
        this.bird = {
            x: 100,
            y: 300,
            width: 30,
            height: 25,
            velocity: 0,
            rotation: 0,
            sprite: null,
            trail: [] // Reduced trail for mobile
        };
        
        this.pipes = [];
        this.particles = [];
        this.powerUps = [];
        
        // Touch input state
        this.touchInput = {
            isPressed: false,
            pressStartTime: 0,
            pressDuration: 0,
            lastJumpTime: 0,
            jumpCooldown: 100 // Prevent rapid tapping
        };
        
        // Rendering optimization
        this.renderState = {
            lastRenderTime: 0,
            skipFrame: false,
            qualityLevel: 1, // 1 = high, 2 = medium, 3 = low
            enableParticles: this.optimizations.enableParticles,
            enableShadows: this.optimizations.enableShadows,
            enableSmoothing: this.optimizations.enableSmoothing
        };
        
        // Background and camera
        this.background = {
            layers: [],
            parallaxSpeed: 0.5,
            currentTheme: 'green'
        };
        
        this.camera = { x: 0, y: 0 };
        
        // Audio with mobile optimizations
        this.audio = {
            enabled: true,
            volumes: {
                master: parseFloat(localStorage.getItem('flappyMasterVolume')) || 100,
                music: parseFloat(localStorage.getItem('flappyMusicVolume')) || 30,
                tap: parseFloat(localStorage.getItem('flappyTapVolume')) || 70,
                crash: parseFloat(localStorage.getItem('flappyCrashVolume')) || 80
            },
            sounds: {
                tap: null,
                crash: null,
                bgMusic: null
            },
            quality: this.optimizations.audioQuality
        };
        
        // Initialize canvas
        this.initializeCanvas();
        this.setupEventListeners();
        this.loadAssets();
        
        // Prevent conflicts with desktop version
        this.preventDesktopGameInitialization();
        
        // Start the mobile game immediately
        this.startMobileGame();
    }

    /**
     * Initialize canvas with mobile optimizations
     */
    initializeCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size based on device
        const canvasSettings = this.device.getCanvasSettings();
        this.canvas.width = canvasSettings.width;
        this.canvas.height = canvasSettings.height;
        
        // Apply rendering optimizations
        this.ctx.imageSmoothingEnabled = this.renderState.enableSmoothing;
        this.ctx.imageSmoothingQuality = this.renderState.enableSmoothing ? 'high' : 'low';
        
        // Set pixel ratio for high DPI displays
        if (this.device.capabilities.highDPI) {
            const ratio = Math.min(window.devicePixelRatio, 2);
            this.canvas.style.width = canvasSettings.width + 'px';
            this.canvas.style.height = canvasSettings.height + 'px';
            this.canvas.width = canvasSettings.width * ratio;
            this.canvas.height = canvasSettings.height * ratio;
            this.ctx.scale(ratio, ratio);
        }
    }

    /**
     * Setup mobile-specific event listeners
     */
    setupEventListeners() {
        // Touch events for jump button
        const jumpButton = this.mobileUI.components.jumpButton;
        if (jumpButton) {
            jumpButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleJumpStart();
            });
            
            jumpButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleJumpEnd();
            });
        }
        
        // Touch events for canvas (backup jump)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleJumpStart();
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleJumpEnd();
        });
        
        // Keyboard events for desktop compatibility
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.handleJumpStart();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.handleJumpEnd();
            }
        });
        
        // Mouse events for desktop
        this.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.handleJumpStart();
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.handleJumpEnd();
        });
        
        // Pause on visibility change (mobile optimization)
        if (this.optimizations.pauseOnBlur) {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && this.gameState === 'playing') {
                    this.pauseGame();
                }
            });
        }
        
        // Orientation change handling
        if (this.device.capabilities.orientation) {
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    this.handleOrientationChange();
                }, 100);
            });
        }
    }

    /**
     * Handle jump start (touch/mouse/keyboard)
     */
    handleJumpStart() {
        const now = Date.now();
        
        if (now - this.touchInput.lastJumpTime < this.touchInput.jumpCooldown) {
            return; // Prevent rapid tapping
        }
        
        this.touchInput.isPressed = true;
        this.touchInput.pressStartTime = now;
        
        if (this.gameState === 'menu') {
            this.startGame();
        } else if (this.gameState === 'playing') {
            this.executeJump();
        } else if (this.gameState === 'gameOver') {
            this.restartGame();
        }
    }

    /**
     * Handle jump end
     */
    handleJumpEnd() {
        if (this.touchInput.isPressed) {
            this.touchInput.isPressed = false;
            this.touchInput.pressDuration = Date.now() - this.touchInput.pressStartTime;
        }
    }

    /**
     * Execute jump with variable power based on hold duration
     */
    executeJump() {
        const holdDuration = this.touchInput.pressDuration;
        const maxHold = this.optimizations.longPressThreshold;
        const powerMultiplier = Math.min(1 + (holdDuration / maxHold) * 0.5, 1.5);
        
        this.bird.velocity = this.settings.jumpPower.min * powerMultiplier;
        
        // Play jump sound
        this.playSound('tap');
        
        // Haptic feedback
        if (this.device.supportsFeature('vibration')) {
            navigator.vibrate(20);
        }
        
        // Update last jump time
        this.touchInput.lastJumpTime = Date.now();
    }

    /**
     * Start the mobile game (initial setup)
     */
    startMobileGame() {
        this.gameState = 'menu';
        this.score = 0;
        this.bird.y = this.canvas.height / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipes = [];
        this.particles = [];
        this.camera.x = 0;
        
        // Reset performance tracking
        this.performance.frameCount = 0;
        this.performance.lastFPSUpdate = Date.now();
        this.performance.droppedFrames = 0;
        
        // Update UI
        this.mobileUI.updateUI('menu');
        this.mobileUI.updateScore(0);
        
        // Start initial render loop
        this.initialRender();
    }

    /**
     * Start the game
     */
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.bird.y = this.canvas.height / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipes = [];
        this.particles = [];
        this.camera.x = 0;
        
        // Reset performance tracking
        this.performance.frameCount = 0;
        this.performance.lastFPSUpdate = Date.now();
        this.performance.droppedFrames = 0;
        
        // Update UI
        this.mobileUI.updateUI('playing');
        this.mobileUI.updateScore(0);
        
        // Start game loop
        this.gameLoop();
    }

    /**
     * Initial render loop for menu state
     */
    initialRender() {
        this.render();
        
        if (this.gameState === 'menu') {
            requestAnimationFrame(() => this.initialRender());
        }
    }

    /**
     * Pause the game
     */
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.mobileUI.updateUI('paused');
        }
    }

    /**
     * Resume the game
     */
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.mobileUI.updateUI('playing');
        }
    }

    /**
     * Game over
     */
    gameOver() {
        this.gameState = 'gameOver';
        
        // Update best score
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('flappyBestScore', this.bestScore.toString());
        }
        
        // Play crash sound
        this.playSound('crash');
        
        // Haptic feedback
        if (this.device.supportsFeature('vibration')) {
            navigator.vibrate([100, 50, 100]);
        }
        
        // Update UI
        this.mobileUI.updateUI('gameOver');
        
        // Update final scores in mobile UI
        const finalScoreElement = document.getElementById('mobileFinalScore');
        const bestScoreElement = document.getElementById('mobileBestScore');
        
        if (finalScoreElement) finalScoreElement.textContent = this.score;
        if (bestScoreElement) bestScoreElement.textContent = this.bestScore;
        
        // Submit score to leaderboard if available
        if (window.leaderboard && typeof window.leaderboard.submitScore === 'function') {
            const playerName = document.getElementById('mobilePlayerNameInput')?.value || 'Anonymous';
            window.leaderboard.submitScore(playerName, this.score);
        }
    }

    /**
     * Restart the game
     */
    restartGame() {
        this.startGame();
    }

    /**
     * Main game loop with mobile optimizations
     */
    gameLoop() {
        const now = performance.now();
        const deltaTime = now - this.renderState.lastRenderTime;
        
        // Adaptive frame rate based on performance
        const targetFrameTime = 1000 / this.optimizations.targetFPS;
        
        if (deltaTime >= targetFrameTime || this.performance.adaptiveQuality) {
            this.update(deltaTime);
            this.render();
            
            this.renderState.lastRenderTime = now;
            this.performance.frameCount++;
            
            // Update FPS counter
            if (now - this.performance.lastFPSUpdate >= 1000) {
                this.performance.currentFPS = this.performance.frameCount;
                this.performance.frameCount = 0;
                this.performance.lastFPSUpdate = now;
                
                // Adaptive quality adjustment
                if (this.performance.adaptiveQuality) {
                    this.adjustQualityBasedOnPerformance();
                }
            }
        }
        
        if (this.gameState === 'playing' || this.gameState === 'paused') {
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    /**
     * Update game state
     */
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Update bird physics
        this.updateBird(deltaTime);
        
        // Update pipes
        this.updatePipes(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update camera
        this.updateCamera(deltaTime);
        
        // Check collisions
        this.checkCollisions();
        
        // Spawn new pipes
        this.spawnPipes();
    }

    /**
     * Update bird physics
     */
    updateBird(deltaTime) {
        // Apply gravity
        this.bird.velocity += this.settings.gravity * (deltaTime / 16.67); // Normalize to 60fps
        
        // Update position
        this.bird.y += this.bird.velocity * (deltaTime / 16.67);
        
        // Update rotation based on velocity
        this.bird.rotation = Math.max(-0.5, Math.min(0.5, this.bird.velocity * 0.1));
        
        // Keep bird on screen
        if (this.bird.y < 0) {
            this.bird.y = 0;
            this.bird.velocity = 0;
        }
        
        if (this.bird.y > this.canvas.height - this.bird.height) {
            this.bird.y = this.canvas.height - this.bird.height;
            this.bird.velocity = 0;
            this.gameOver();
        }
    }

    /**
     * Update pipes
     */
    updatePipes(deltaTime) {
        this.pipes.forEach((pipe, index) => {
            pipe.x -= this.settings.pipeSpeed * (deltaTime / 16.67);
            
            // Remove off-screen pipes
            if (pipe.x + pipe.width < 0) {
                this.pipes.splice(index, 1);
                this.score++;
                this.mobileUI.updateScore(this.score);
            }
        });
    }

    /**
     * Update particles with mobile optimization
     */
    updateParticles(deltaTime) {
        if (!this.renderState.enableParticles) return;
        
        this.particles.forEach((particle, index) => {
            particle.x += particle.vx * (deltaTime / 16.67);
            particle.y += particle.vy * (deltaTime / 16.67);
            particle.life -= deltaTime;
            
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
    }

    /**
     * Update camera position
     */
    updateCamera(deltaTime) {
        // Simple camera following
        const targetX = this.bird.x - 100;
        this.camera.x += (targetX - this.camera.x) * 0.1;
    }

    /**
     * Check collisions
     */
    checkCollisions() {
        this.pipes.forEach(pipe => {
            if (this.bird.x < pipe.x + pipe.width &&
                this.bird.x + this.bird.width > pipe.x) {
                
                if (this.bird.y < pipe.topHeight ||
                    this.bird.y + this.bird.height > pipe.topHeight + pipe.gap) {
                    this.gameOver();
                }
            }
        });
    }

    /**
     * Spawn new pipes
     */
    spawnPipes() {
        const lastPipe = this.pipes[this.pipes.length - 1];
        const spawnDistance = 300;
        
        if (!lastPipe || lastPipe.x < this.canvas.width - spawnDistance) {
            if (this.pipes.length < this.settings.maxPipes) {
                this.createPipe();
            }
        }
    }

    /**
     * Create a new pipe
     */
    createPipe() {
        const gap = this.settings.pipeGap;
        const topHeight = Math.random() * (this.canvas.height - gap - 100) + 50;
        
        this.pipes.push({
            x: this.canvas.width,
            width: this.settings.pipeWidth,
            topHeight: topHeight,
            gap: gap,
            passed: false
        });
    }

    /**
     * Render game with mobile optimizations
     */
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set rendering quality based on performance
        this.ctx.imageSmoothingEnabled = this.renderState.enableSmoothing && this.renderState.qualityLevel <= 2;
        
        // Render background
        this.renderBackground();
        
        // Render pipes
        this.renderPipes();
        
        // Render bird
        this.renderBird();
        
        // Render particles (if enabled and performance allows)
        if (this.renderState.enableParticles && this.particles.length < this.optimizations.particleCount) {
            this.renderParticles();
        }
    }

    /**
     * Render background
     */
    renderBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render pipes
     */
    renderPipes() {
        this.ctx.fillStyle = '#228B22';
        
        this.pipes.forEach(pipe => {
            // Top pipe
            this.ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
            
            // Bottom pipe
            const bottomY = pipe.topHeight + pipe.gap;
            this.ctx.fillRect(pipe.x, bottomY, pipe.width, this.canvas.height - bottomY);
        });
    }

    /**
     * Render bird
     */
    renderBird() {
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2);
        this.ctx.rotate(this.bird.rotation);
        
        // Simple bird shape for mobile optimization
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(-this.bird.width / 2, -this.bird.height / 2, this.bird.width, this.bird.height);
        
        // Bird eye
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(this.bird.width / 4, -this.bird.height / 4, 4, 4);
        
        this.ctx.restore();
    }

    /**
     * Render particles
     */
    renderParticles() {
        this.ctx.fillStyle = '#FFFFFF';
        
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillRect(particle.x, particle.y, 2, 2);
        });
        
        this.ctx.globalAlpha = 1;
    }

    /**
     * Adjust quality based on performance
     */
    adjustQualityBasedOnPerformance() {
        if (this.performance.currentFPS < this.optimizations.targetFPS * 0.8) {
            // Performance is poor, reduce quality
            if (this.renderState.qualityLevel < 3) {
                this.renderState.qualityLevel++;
                this.renderState.enableParticles = this.renderState.qualityLevel < 3;
                this.renderState.enableShadows = this.renderState.qualityLevel === 1;
            }
        } else if (this.performance.currentFPS >= this.optimizations.targetFPS * 0.95) {
            // Performance is good, increase quality
            if (this.renderState.qualityLevel > 1) {
                this.renderState.qualityLevel--;
                this.renderState.enableParticles = true;
                this.renderState.enableShadows = this.renderState.qualityLevel === 1;
            }
        }
    }

    /**
     * Handle orientation change
     */
    handleOrientationChange() {
        // Reinitialize canvas for new orientation
        this.initializeCanvas();
        
        // Adjust bird position if needed
        if (this.bird.y > this.canvas.height - this.bird.height) {
            this.bird.y = this.canvas.height - this.bird.height;
        }
        
        // Reposition pipes if needed
        this.pipes.forEach(pipe => {
            if (pipe.x > this.canvas.width) {
                pipe.x = this.canvas.width;
            }
        });
    }

    /**
     * Load game assets with mobile optimization
     */
    loadAssets() {
        // For mobile, we'll use simple shapes instead of loading images
        // This reduces memory usage and loading time
        console.log('Mobile game engine initialized with optimized assets');
    }

    /**
     * Play sound with mobile optimization
     */
    playSound(soundType) {
        if (!this.audio.enabled || this.audio.quality === 'low') return;
        
        // Simple beep sounds for mobile optimization
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        let frequency = 440; // Default frequency
        
        switch (soundType) {
            case 'tap':
                frequency = 800;
                break;
            case 'crash':
                frequency = 200;
                break;
        }
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(this.audio.volumes.master / 100 * 0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            fps: this.performance.currentFPS,
            qualityLevel: this.renderState.qualityLevel,
            particlesEnabled: this.renderState.enableParticles,
            shadowsEnabled: this.renderState.enableShadows,
            adaptiveQuality: this.performance.adaptiveQuality
        };
    }

    /**
     * Prevent desktop game initialization conflicts
     */
    preventDesktopGameInitialization() {
        // Clear any existing game instances
        if (window.game) {
            window.game = null;
        }
        
        // Prevent the original game from auto-starting
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.style.display = 'none';
        }
        
        // Hide desktop UI elements
        const desktopElements = ['startScreen', 'gameOverScreen', 'gameHUD'];
        desktopElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.gameState = 'menu';
        this.pipes = [];
        this.particles = [];
        this.bird.trail = [];
    }
}

// Export for use in other modules
window.MobileGameEngine = MobileGameEngine;
