/**
 * Flappy Bird Adventure - Mobile Optimized Version
 * Optimized specifically for mobile devices with touch controls
 */

class MobileFlappyBird {
    constructor() {
        this.selectedPlatform = null;
        this.gameInitialized = false;
        
        // Initialize platform selection
        this.initializePlatformSelection();
    }
    
    initializePlatformSelection() {
        // Detect device type
        const isMobile = this.detectMobile();
        const detectedElement = document.getElementById('detectedPlatform');
        
        if (isMobile) {
            detectedElement.textContent = '📱 Mobile Device';
            detectedElement.style.color = '#e74c3c';
        } else {
            detectedElement.textContent = '🖥️ Desktop Device';
            detectedElement.style.color = '#3498db';
        }
        
        // Platform selection event listeners
        document.getElementById('selectMobile').addEventListener('click', () => {
            this.selectPlatform('mobile');
        });
        
        document.getElementById('selectDesktop').addEventListener('click', () => {
            this.selectPlatform('desktop');
        });
        
        document.getElementById('autoSelect').addEventListener('click', () => {
            this.selectPlatform(isMobile ? 'mobile' : 'desktop');
        });
    }
    
    detectMobile() {
        const userAgent = navigator.userAgent.toLowerCase();
        const screenWidth = window.innerWidth;
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        return screenWidth <= 768 || hasTouch || 
               /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    }
    
    selectPlatform(platform) {
        this.selectedPlatform = platform;
        
        if (platform === 'desktop') {
            // Redirect to desktop version
            window.location.href = 'index.html';
        } else {
            // Initialize mobile game
            this.initializeMobileGame();
        }
    }
    
    initializeMobileGame() {
        // Hide platform selection and show mobile game
        document.getElementById('platformSelection').classList.add('hidden');
        document.getElementById('mobileGame').classList.remove('hidden');
        
        // Initialize the mobile-optimized game
        this.game = new MobileGame();
    }
}

class MobileGame {
    constructor() {
        // Core game elements
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.canvas || !this.ctx) {
            console.error('Canvas initialization failed');
            return;
        }
        
        // Game state
        this.gameState = 'menu'; // 'menu', 'playing', 'gameOver', 'paused'
        this.lastGameState = null;
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('flappyBestScore')) || 0;
        
        // Mobile-optimized game settings (using physics from main game)
        this.settings = {
            gravity: 0.4,
            jumpPower: { min: -8, max: -15 },
            birdSpeed: 4, // Same as main game
            pipeSpeed: 1.5,
            pipeGap: 280, // Slightly larger for mobile
            pipeWidth: 60 // Slightly wider for mobile
        };
        
        // Progressive difficulty
        this.difficulty = {
            baseGravity: 0.3,
            basePipeSpeed: 1,
            basePipeGap: 300 // More forgiving on mobile
        };
        
        // Game objects
        this.bird = { x: 0, y: 0, width: 50, height: 40, velocity: 0, rotation: 0 };
        this.pipes = [];
        this.camera = { x: 0, y: 0 };
        
        // Mobile-specific touch controls
        this.touchState = {
            isPressed: false,
            pressTime: 0,
            maxHoldTime: 300,
            lastTap: 0
        };
        
        // Audio system (simplified for mobile)
        this.audio = {
            enabled: true,
            volume: 70, // Default mobile volume
            sounds: { tap: null, crash: null, bgMusic: null }
        };
        
        // Score submission tracking
        this.currentGameSubmitted = false;
        
        // Easter egg system
        this.easterEggs = [];
        this.easterEggSpawnChance = 0.15; // Slightly higher for mobile
        
        // Power-up system
        this.powerUp = {
            active: false,
            startTime: 0,
            duration: 6000, // Shorter for mobile (6 seconds)
            speedMultiplier: 4, // Less extreme for mobile
            canPhaseThrough: true,
            currentSpeedMultiplier: 1
        };
        
        // Global leaderboard
        this.leaderboard = new GlobalLeaderboard();
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.createMobileAssets();
        this.setupMobileEventListeners();
        this.initializeMobileUI();
        this.optimizeForMobile();
        this.startGameLoop();
    }
    
    setupCanvas() {
        // Mobile-optimized canvas setup
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Position bird for mobile
        this.bird.x = this.canvas.width * 0.2; // Slightly more to the right
        this.bird.y = this.canvas.height / 2;
        
        // Mobile-optimized scaling
        const scale = Math.min(this.canvas.width / 600, this.canvas.height / 800);
        this.bird.width = 50 * Math.max(scale, 0.8);
        this.bird.height = 40 * Math.max(scale, 0.8);
        
        // Adjust pipe settings for mobile
        this.settings.pipeWidth = Math.max(60 * scale, 50);
        this.settings.pipeGap = Math.max(280 * scale, 220);
        
        // Mobile canvas optimizations
        this.canvas.style.touchAction = 'none';
        this.canvas.style.userSelect = 'none';
        
        window.addEventListener('resize', () => this.handleMobileResize());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleMobileResize(), 100);
        });
    }
    
    handleMobileResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Reposition bird
        this.bird.x = this.canvas.width * 0.2;
        if (this.gameState === 'menu') {
            this.bird.y = this.canvas.height / 2;
        }
        
        // Update camera
        this.camera.x = this.bird.x - this.canvas.width * 0.3;
    }
    
    createMobileAssets() {
        // Create mobile-optimized bird sprite (same as main game but smaller)
        this.birdFrames = [];
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameDelay = 8;
        
        // Create 3 frames for wing flapping
        for (let frame = 0; frame < 3; frame++) {
            const birdCanvas = document.createElement('canvas');
            birdCanvas.width = 45; // Slightly smaller for mobile
            birdCanvas.height = 36;
            const ctx = birdCanvas.getContext('2d');
            
            this.drawMobileBird(ctx, frame);
            this.birdFrames.push(birdCanvas);
        }
        
        this.defaultBirdImage = this.birdFrames[0];
        
        // Create mobile-optimized sounds
        this.createMobileSounds();
    }
    
    drawMobileBird(ctx, frame) {
        ctx.clearRect(0, 0, 45, 36);
        
        // Simplified funny bird for mobile (same design, optimized rendering)
        // Hot pink body
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.ellipse(22, 22, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Cyan head
        ctx.fillStyle = '#00FFFF';
        ctx.beginPath();
        ctx.arc(32, 16, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Orange beak
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.moveTo(39, 16);
        ctx.lineTo(45, 14);
        ctx.lineTo(45, 18);
        ctx.closePath();
        ctx.fill();
        
        // Googly eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(29, 13, 3, 0, Math.PI * 2);
        ctx.arc(35, 13, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils based on frame
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        if (frame === 0) {
            ctx.arc(31, 13, 1.5, 0, Math.PI * 2);
            ctx.arc(33, 13, 1.5, 0, Math.PI * 2);
        } else if (frame === 1) {
            ctx.arc(29, 13, 1.5, 0, Math.PI * 2);
            ctx.arc(35, 13, 1.5, 0, Math.PI * 2);
        } else {
            ctx.arc(27, 14, 1.5, 0, Math.PI * 2);
            ctx.arc(37, 12, 1.5, 0, Math.PI * 2);
        }
        ctx.fill();
        
        // Wings (simplified for mobile)
        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        if (frame === 0) {
            ctx.ellipse(16, 16, 8, 4, -0.5, 0, Math.PI * 2);
        } else if (frame === 1) {
            ctx.ellipse(18, 22, 8, 3, 0, 0, Math.PI * 2);
        } else {
            ctx.ellipse(16, 28, 8, 4, 0.5, 0, Math.PI * 2);
        }
        ctx.fill();
    }
    
    createMobileSounds() {
        // Simplified audio context for mobile
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Mobile audio unlock
            const unlockAudio = () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            };
            
            document.addEventListener('touchstart', unlockAudio, { once: true });
            document.addEventListener('click', unlockAudio, { once: true });
            
            // Create mobile-optimized sounds
            this.audio.sounds.tap = this.createMobileTapSound();
            this.audio.sounds.crash = this.createMobileCrashSound();
            this.audio.sounds.bgMusic = this.createMobileBgMusic();
            
        } catch (error) {
            console.warn('Audio context not available on this mobile device');
            this.audioContext = null;
        }
    }
    
    createMobileTapSound() {
        return () => {
            if (!this.audioContext || !this.audio.enabled) return;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.frequency.value = 800;
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(this.audio.volume / 100 * 0.3, this.audioContext.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
            
            osc.start(this.audioContext.currentTime);
            osc.stop(this.audioContext.currentTime + 0.15);
        };
    }
    
    createMobileCrashSound() {
        return () => {
            if (!this.audioContext || !this.audio.enabled) return;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.5);
            osc.type = 'sawtooth';
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(this.audio.volume / 100 * 0.2, this.audioContext.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
            
            osc.start(this.audioContext.currentTime);
            osc.stop(this.audioContext.currentTime + 0.8);
        };
    }
    
    createMobileBgMusic() {
        // Simplified background music for mobile
        let musicInterval;
        
        return {
            start: () => {
                if (!this.audioContext || !this.audio.enabled) return;
                
                const notes = [523.25, 587.33, 659.25, 698.46]; // C-D-E-F
                let noteIndex = 0;
                
                musicInterval = setInterval(() => {
                    if (this.audio.enabled) {
                        const osc = this.audioContext.createOscillator();
                        const gain = this.audioContext.createGain();
                        
                        osc.frequency.value = notes[noteIndex];
                        osc.type = 'triangle';
                        osc.connect(gain);
                        gain.connect(this.audioContext.destination);
                        
                        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                        gain.gain.linearRampToValueAtTime(this.audio.volume / 100 * 0.1, this.audioContext.currentTime + 0.1);
                        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
                        
                        osc.start(this.audioContext.currentTime);
                        osc.stop(this.audioContext.currentTime + 0.8);
                        
                        noteIndex = (noteIndex + 1) % notes.length;
                    }
                }, 1000);
            },
            stop: () => {
                if (musicInterval) {
                    clearInterval(musicInterval);
                }
            }
        };
    }
    
    setupMobileEventListeners() {
        // Mobile touch controls
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTouchStart();
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleTouchEnd();
        }, { passive: false });
        
        // Prevent scrolling and zooming
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Mobile UI event listeners
        const elements = {
            startBtn: () => this.startGame(),
            restartBtn: () => this.handleRestart(),
            toggleMusic: () => this.toggleMusic(),
            mobileSettingsBtn: () => this.toggleSettings(),
            closeSettingsBtn: () => this.hideSettings(),
            saveNameBtn: () => this.savePlayerName(),
            pauseBtn: () => this.togglePause(),
            backToPlatform: () => this.backToPlatformSelection()
        };
        
        Object.entries(elements).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
                element.addEventListener('touchstart', handler, { passive: true });
            }
        });
        
        // Volume slider
        const volumeSlider = document.getElementById('mobileVolumeSlider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.updateVolume(parseInt(e.target.value));
            });
        }
    }
    
    handleTouchStart() {
        if (this.gameState === 'menu') {
            this.startGame();
        } else if (this.gameState === 'playing') {
            this.jump();
        } else if (this.gameState === 'gameOver') {
            const now = Date.now();
            if (now - this.gameOverTime > 1000) { // 1 second delay
                this.handleRestart();
            }
        }
        
        this.touchState.isPressed = true;
        this.touchState.pressTime = Date.now();
    }
    
    handleTouchEnd() {
        this.touchState.isPressed = false;
    }
    
    jump() {
        let jumpPower = this.settings.jumpPower.min;
        
        if (this.touchState.isPressed) {
            const holdTime = Date.now() - this.touchState.pressTime;
            const holdRatio = Math.min(holdTime / this.touchState.maxHoldTime, 1);
            jumpPower = this.settings.jumpPower.min + 
                       (this.settings.jumpPower.max - this.settings.jumpPower.min) * holdRatio;
        }
        
        this.bird.velocity = jumpPower;
        this.playSound('tap');
        
        // Hide touch instructions after first tap
        const instructions = document.getElementById('touchInstructions');
        if (instructions) {
            instructions.style.display = 'none';
        }
    }
    
    // Game loop and physics (same as main game)
    update() {
        if (this.gameState !== 'playing') return;
        
        // Progressive difficulty
        this.settings.gravity = this.difficulty.baseGravity + (this.score * 0.008); // Slightly easier progression
        this.settings.pipeSpeed = this.difficulty.basePipeSpeed + (this.score * 0.04);
        this.settings.pipeGap = Math.max(this.difficulty.basePipeGap - (this.score * 1.5), 180);
        
        // Bird physics (same as main game)
        this.bird.velocity += this.settings.gravity;
        
        // Continuous jump boost while held
        if (this.touchState.isPressed) {
            const holdTime = Date.now() - this.touchState.pressTime;
            if (holdTime < this.touchState.maxHoldTime) {
                this.bird.velocity -= 0.25; // Slightly less powerful for mobile
            }
        }
        
        this.bird.y += this.bird.velocity;
        
        // Horizontal movement
        const currentBirdSpeed = this.powerUp.active ? 
            this.settings.birdSpeed * this.powerUp.speedMultiplier : 
            this.settings.birdSpeed;
        
        this.bird.x += currentBirdSpeed;
        
        // Bird rotation (same vertical falling logic)
        if (this.bird.velocity > 0) {
            this.bird.rotation = Math.min(this.bird.velocity * 0.02, 0.15);
        } else {
            this.bird.rotation = Math.max(this.bird.velocity * 0.03, -0.3);
        }
        
        // Update camera
        this.camera.x = this.bird.x - this.canvas.width * 0.3;
        
        // Generate pipes (simplified for mobile)
        this.updatePipes();
        
        // Check collisions
        this.checkCollisions();
    }
    
    updatePipes() {
        // Remove off-screen pipes
        this.pipes = this.pipes.filter(pipe => pipe.x + this.settings.pipeWidth > this.camera.x - 100);
        
        // Generate new pipes
        const pipeSpacing = this.canvas.width * 0.8;
        if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < this.bird.x + this.canvas.width) {
            this.createMobilePipe();
        }
        
        // Move pipes
        for (const pipe of this.pipes) {
            pipe.x -= this.settings.pipeSpeed;
            
            // Score when passing pipe
            if (!pipe.scored && pipe.x + this.settings.pipeWidth < this.bird.x) {
                pipe.scored = true;
                this.score++;
                this.updateScore();
            }
        }
    }
    
    createMobilePipe() {
        const minHeight = 80; // More forgiving for mobile
        const maxHeight = this.canvas.height - this.settings.pipeGap - minHeight;
        const topHeight = minHeight + Math.random() * (maxHeight - minHeight);
        
        const pipeX = this.pipes.length === 0 ? 
            this.bird.x + this.canvas.width : 
            this.pipes[this.pipes.length - 1].x + this.canvas.width * 0.8;
        
        this.pipes.push({
            x: pipeX,
            topHeight: topHeight,
            bottomY: topHeight + this.settings.pipeGap,
            scored: false,
            type: 'full' // Mobile uses only full pipes for simplicity
        });
        
        // Spawn easter egg occasionally
        if (Math.random() < this.easterEggSpawnChance && !this.powerUp.active) {
            this.spawnEasterEgg(pipeX + this.settings.pipeWidth + 80);
        }
    }
    
    spawnEasterEgg(x) {
        this.easterEggs.push({
            x: x,
            y: this.canvas.height / 2 + (Math.random() - 0.5) * 150,
            width: 25,
            height: 25,
            rotation: 0
        });
    }
    
    checkCollisions() {
        // Simplified collision detection for mobile (more forgiving)
        const birdMargin = 6; // More forgiving than desktop
        const pipeMargin = 5;
        
        const birdLeft = this.bird.x + birdMargin;
        const birdRight = this.bird.x + this.bird.width - birdMargin;
        const birdTop = this.bird.y + birdMargin;
        const birdBottom = this.bird.y + this.bird.height - birdMargin;
        
        // Ground and ceiling collision
        if (!this.powerUp.active && (birdTop <= 0 || birdBottom >= this.canvas.height)) {
            this.gameOver();
            return;
        }
        
        // Pipe collision (skip during power-up)
        if (!this.powerUp.active) {
            for (const pipe of this.pipes) {
                const pipeLeft = pipe.x + pipeMargin;
                const pipeRight = pipe.x + this.settings.pipeWidth - pipeMargin;
                const topPipeBottom = pipe.topHeight - pipeMargin;
                const bottomPipeTop = pipe.bottomY + pipeMargin;
                
                if (birdRight > pipeLeft && birdLeft < pipeRight) {
                    if (birdTop < topPipeBottom || birdBottom > bottomPipeTop) {
                        this.gameOver();
                        return;
                    }
                }
            }
        }
        
        // Easter egg collection
        for (let i = this.easterEggs.length - 1; i >= 0; i--) {
            const egg = this.easterEggs[i];
            if (birdRight > egg.x && birdLeft < egg.x + egg.width &&
                birdBottom > egg.y && birdTop < egg.y + egg.height) {
                this.easterEggs.splice(i, 1);
                this.activatePowerUp();
            }
        }
    }
    
    activatePowerUp() {
        this.powerUp.active = true;
        this.powerUp.startTime = Date.now();
        console.log('🚀 Mobile power-up activated!');
        
        // Visual feedback for mobile
        navigator.vibrate && navigator.vibrate([100, 50, 100]);
        
        setTimeout(() => {
            if (this.powerUp.active) {
                this.deactivatePowerUp();
            }
        }, this.powerUp.duration);
    }
    
    deactivatePowerUp() {
        this.powerUp.active = false;
        console.log('🛡️ Mobile power-up ended');
    }
    
    // Rendering system (simplified for mobile)
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Simple mobile background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#4682B4');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'playing' || this.gameState === 'gameOver') {
            this.ctx.save();
            this.ctx.translate(-this.camera.x, 0);
            
            this.drawPipes();
            this.drawEasterEggs();
            this.drawBird();
            
            this.ctx.restore();
            
            // Power-up effects
            if (this.powerUp.active) {
                this.drawMobilePowerUpEffects();
            }
        }
    }
    
    drawBird() {
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2);
        this.ctx.rotate(this.bird.rotation);
        
        const birdImage = this.birdFrames[this.currentFrame];
        this.ctx.drawImage(
            birdImage,
            -this.bird.width / 2,
            -this.bird.height / 2,
            this.bird.width,
            this.bird.height
        );
        
        this.ctx.restore();
    }
    
    drawPipes() {
        for (const pipe of this.pipes) {
            if (pipe.x + this.settings.pipeWidth >= this.camera.x && pipe.x <= this.camera.x + this.canvas.width) {
                // Simple mobile pipe rendering
                this.ctx.fillStyle = '#5FAD56';
                
                // Top pipe
                this.ctx.fillRect(pipe.x, 0, this.settings.pipeWidth, pipe.topHeight);
                
                // Bottom pipe
                this.ctx.fillRect(pipe.x, pipe.bottomY, this.settings.pipeWidth, this.canvas.height - pipe.bottomY);
                
                // Pipe caps (simplified)
                this.ctx.fillStyle = '#4A7C59';
                this.ctx.fillRect(pipe.x - 4, pipe.topHeight - 20, this.settings.pipeWidth + 8, 20);
                this.ctx.fillRect(pipe.x - 4, pipe.bottomY, this.settings.pipeWidth + 8, 20);
            }
        }
    }
    
    drawEasterEggs() {
        for (const egg of this.easterEggs) {
            if (egg.x + egg.width >= this.camera.x && egg.x <= this.camera.x + this.canvas.width) {
                this.ctx.save();
                this.ctx.translate(egg.x + egg.width / 2, egg.y + egg.height / 2);
                this.ctx.rotate(Date.now() * 0.005);
                
                // Simple glowing egg for mobile
                this.ctx.fillStyle = '#FFD700';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, egg.width / 2, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.restore();
            }
        }
    }
    
    drawMobilePowerUpEffects() {
        // Simplified power-up effects for mobile performance
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = 1.0;
        
        // Simple speed lines
        this.ctx.strokeStyle = '#FFFF00';
        this.ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
            const y = (Date.now() * 0.1 + i * 100) % this.canvas.height;
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width, y);
            this.ctx.lineTo(this.canvas.width - 100, y);
            this.ctx.stroke();
        }
    }
    
    // Game state methods
    startGame() {
        this.gameState = 'playing';
        this.resetGame();
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('gameHUD').style.display = 'block';
        
        if (this.audio.enabled) {
            this.audio.sounds.bgMusic.start();
        }
    }
    
    resetGame() {
        this.currentGameSubmitted = false;
        
        this.bird = {
            x: this.canvas.width * 0.2,
            y: this.canvas.height / 2,
            width: this.bird.width,
            height: this.bird.height,
            velocity: 0,
            rotation: 0
        };
        
        this.pipes = [];
        this.easterEggs = [];
        this.score = 0;
        this.camera = { x: 0, y: 0 };
        
        this.powerUp.active = false;
        
        this.updateScore();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.gameOverTime = Date.now();
        this.playSound('crash');
        
        // Vibration feedback for mobile
        navigator.vibrate && navigator.vibrate([200, 100, 200]);
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('flappyBestScore', this.bestScore);
        }
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('bestScore').textContent = this.bestScore;
        document.getElementById('gameOverScreen').classList.remove('hidden');
        document.getElementById('gameHUD').style.display = 'none';
        
        // Auto-submit score
        this.submitScoreToLeaderboard();
        this.refreshLeaderboard();
    }
    
    // UI methods
    updateScore() {
        document.getElementById('score').textContent = this.score;
        
        // Update difficulty display
        const difficultyText = this.score < 5 ? 'Easy' : 
                             this.score < 15 ? 'Medium' : 
                             this.score < 30 ? 'Hard' : 'Expert';
        document.getElementById('difficulty').textContent = difficultyText;
    }
    
    toggleMusic() {
        this.audio.enabled = !this.audio.enabled;
        const btn = document.getElementById('toggleMusic');
        btn.textContent = this.audio.enabled ? '🔊 Music' : '🔇 Music';
        
        if (this.audio.enabled && this.gameState === 'playing') {
            this.audio.sounds.bgMusic.start();
        } else {
            this.audio.sounds.bgMusic.stop();
        }
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseBtn').textContent = '▶️';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseBtn').textContent = '⏸️';
        }
    }
    
    toggleSettings() {
        const panel = document.getElementById('settingsPanel');
        panel.classList.toggle('hidden');
    }
    
    hideSettings() {
        document.getElementById('settingsPanel').classList.add('hidden');
    }
    
    updateVolume(volume) {
        this.audio.volume = volume;
        document.getElementById('volumeDisplay').textContent = `${volume}%`;
        localStorage.setItem('flappyMobileVolume', volume);
    }
    
    backToPlatformSelection() {
        document.getElementById('mobileGame').classList.add('hidden');
        document.getElementById('platformSelection').classList.remove('hidden');
    }
    
    handleRestart() {
        this.resetGame();
        this.startGame();
    }
    
    playSound(type) {
        if (this.audio.enabled && this.audio.sounds[type]) {
            this.audio.sounds[type]();
        }
    }
    
    // Leaderboard methods (simplified for mobile)
    async savePlayerName() {
        const nameInput = document.getElementById('playerNameInput');
        const name = nameInput.value.trim();
        
        if (name.length < 2) {
            alert('Please enter a name with at least 2 characters');
            return;
        }
        
        this.leaderboard.setPlayerName(name);
        nameInput.style.background = 'rgba(39, 174, 96, 0.3)';
        
        if (this.gameState === 'gameOver' && this.score > 0 && !this.currentGameSubmitted) {
            await this.submitScoreToLeaderboard();
        }
        
        setTimeout(() => {
            nameInput.style.background = '';
        }, 2000);
    }
    
    async submitScoreToLeaderboard() {
        if (this.score > 0 && !this.currentGameSubmitted) {
            this.currentGameSubmitted = true;
            await this.leaderboard.submitScore(this.score);
            this.refreshLeaderboard();
        }
    }
    
    async refreshLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        const statusElement = document.getElementById('leaderboardStatus');
        
        try {
            const scores = await this.leaderboard.getGlobalLeaderboard(5); // Show top 5 for mobile
            
            leaderboardList.innerHTML = '';
            
            if (scores.length === 0) {
                leaderboardList.innerHTML = '<li><span>No scores yet</span><span>Play!</span></li>';
            } else {
                scores.forEach((entry, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${index + 1}. ${entry.name}</span>
                        <span>${entry.score}</span>
                    `;
                    leaderboardList.appendChild(li);
                });
            }
            
            statusElement.textContent = '📱 Mobile Leaderboard';
        } catch (error) {
            statusElement.textContent = '💾 Local Scores';
        }
    }
    
    initializeMobileUI() {
        // Set initial values
        const nameInput = document.getElementById('playerNameInput');
        nameInput.value = this.leaderboard.getPlayerName();
        
        const volumeSlider = document.getElementById('mobileVolumeSlider');
        volumeSlider.value = this.audio.volume;
        
        document.getElementById('gameHUD').style.display = 'none';
        
        this.updateScore();
        this.refreshLeaderboard();
    }
    
    optimizeForMobile() {
        // Mobile-specific optimizations
        this.targetFPS = 50; // Slightly lower FPS for better battery life
        this.frameInterval = 1000 / this.targetFPS;
        this.lastFrameTime = 0;
        
        console.log('📱 Mobile optimizations applied');
    }
    
    gameLoop() {
        const currentTime = performance.now();
        
        if (currentTime - this.lastFrameTime >= this.frameInterval) {
            this.update();
            this.render();
            this.lastFrameTime = currentTime;
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    startGameLoop() {
        this.gameLoop();
    }
}

// Initialize the mobile app
document.addEventListener('DOMContentLoaded', () => {
    new MobileFlappyBird();
});
