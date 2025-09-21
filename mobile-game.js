/**
 * Mobile-Optimized Flappy Bird Adventure Game
 * Optimized for touch devices with simplified graphics and enhanced performance
 */

class MobileFlappyBirdGame {
    constructor() {
        // Core game elements
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.canvas || !this.ctx) {
            console.error('Canvas initialization failed');
            return;
        }
        
        // Mobile-specific optimizations
        this.isMobile = true;
        this.touchActive = false;
        this.lastTouchTime = 0;
        
        // Game state
        this.gameState = 'menu';
        this.lastGameState = null;
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('flappyBestScore')) || 0;
        this.currentGameSubmitted = false;
        
        // Mobile-optimized settings
        this.settings = {
            gravity: 0.35, // Slightly reduced for mobile
            jumpPower: { min: -7, max: -12 }, // Slightly reduced for mobile
            birdSpeed: 3.5, // Optimized for mobile
            pipeSpeed: 1.2, // Slightly slower for mobile
            pipeGap: 280, // Larger gap for mobile
            pipeWidth: 60 // Wider pipes for mobile
        };
        
        // Progressive difficulty (mobile-tuned)
        this.difficulty = {
            baseGravity: 0.25,
            basePipeSpeed: 0.8,
            basePipeGap: 300
        };
        
        // Game objects
        this.bird = { x: 0, y: 0, width: 45, height: 35, velocity: 0, rotation: 0 };
        this.pipes = [];
        this.camera = { x: 0, y: 0 };
        
        // Mobile-optimized jump mechanics
        this.jumpState = {
            isPressed: false,
            pressTime: 0,
            maxHoldTime: 250 // Shorter for mobile
        };
        
        // Simplified audio system for mobile
        this.audio = {
            enabled: true,
            volumes: {
                master: parseFloat(localStorage.getItem('flappyMasterVolume')) || 80, // Lower default for mobile
                music: parseFloat(localStorage.getItem('flappyMusicVolume')) || 20, // Much lower for mobile
                tap: parseFloat(localStorage.getItem('flappyTapVolume')) || 60,
                crash: parseFloat(localStorage.getItem('flappyCrashVolume')) || 70,
                powerup: parseFloat(localStorage.getItem('flappyPowerupVolume')) || 50
            },
            playing: false,
            sounds: { tap: null, crash: null, bgMusic: null },
            custom: { birdImage: null, tapSound: null, crashSound: null, bgMusic: null }
        };
        
        // Simplified world system for mobile
        this.world = {
            totalPipesPassed: 0,
            currentSeason: 0,
            currentTimeOfDay: 0,
            pipesToNextSeasonChange: this.getRandomInterval(),
            themes: ['green', 'snow', 'desert', 'christmas', 'halloween']
        };
        
        // Simplified power-up system for mobile
        this.powerUp = {
            active: false,
            startTime: 0,
            duration: 6000, // Shorter for mobile
            speedMultiplier: 4, // Reduced for mobile
            canPhaseThrough: true,
            currentSpeedMultiplier: 1
        };
        
        this.easterEggs = [];
        this.easterEggSpawnChance = 0.08; // Reduced for mobile
        
        // Mobile performance tracking
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.targetFPS = 45; // Lower FPS for mobile performance
        this.frameInterval = 1000 / this.targetFPS;
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        
        // Global leaderboard system
        this.leaderboard = new GlobalLeaderboard();
        
        this.init();
    }
    
    init() {
        this.setupMobileCanvas();
        this.createMobileAssets();
        this.setupMobileEventListeners();
        this.initializeMobileUI();
        this.initializeLeaderboard();
        this.startGameLoop();
        this.startBackgroundMusic();
    }
    
    setupMobileCanvas() {
        // Mobile-specific canvas setup
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Prevent mobile scrolling and zooming
        this.canvas.style.touchAction = 'none';
        this.canvas.style.userSelect = 'none';
        
        // Position bird for mobile
        this.bird.x = this.canvas.width * 0.2; // Slightly more left for mobile
        this.bird.y = this.canvas.height / 2;
        
        // Mobile-optimized scaling
        const scale = Math.min(this.canvas.width / 600, this.canvas.height / 400);
        this.bird.width = 45 * Math.max(scale, 0.8);
        this.bird.height = 35 * Math.max(scale, 0.8);
        this.settings.pipeWidth = Math.max(60 * scale, 50);
        this.settings.pipeGap = Math.max(280 * scale, 220);
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.setupMobileCanvas(), 100);
        });
        
        window.addEventListener('resize', () => this.setupMobileCanvas());
    }
    
    createMobileAssets() {
        // Simplified bird sprite for mobile performance
        this.birdFrames = [];
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameDelay = 10; // Slightly slower for mobile
        
        // Create 2 frames instead of 3 for mobile performance
        for (let frame = 0; frame < 2; frame++) {
            const birdCanvas = document.createElement('canvas');
            birdCanvas.width = 50;
            birdCanvas.height = 40;
            const ctx = birdCanvas.getContext('2d');
            
            this.drawMobileBird(ctx, frame);
            this.birdFrames.push(birdCanvas);
        }
        
        this.defaultBirdImage = this.birdFrames[0];
        
        // Simplified mobile audio
        this.createMobileAudio();
    }
    
    drawMobileBird(ctx, frame) {
        ctx.clearRect(0, 0, 50, 40);
        
        // Simplified funny bird for mobile (less complex, better performance)
        // Bright body
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.ellipse(25, 25, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Simple head
        ctx.fillStyle = '#00FFFF';
        ctx.beginPath();
        ctx.arc(35, 18, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Simple beak
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.moveTo(42, 18);
        ctx.lineTo(48, 16);
        ctx.lineTo(48, 20);
        ctx.closePath();
        ctx.fill();
        
        // Simple eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(32, 15, 3, 0, Math.PI * 2);
        ctx.arc(38, 15, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Simple pupils
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        if (frame === 0) {
            ctx.arc(32, 15, 1.5, 0, Math.PI * 2);
            ctx.arc(38, 15, 1.5, 0, Math.PI * 2);
        } else {
            ctx.arc(33, 15, 1.5, 0, Math.PI * 2);
            ctx.arc(37, 15, 1.5, 0, Math.PI * 2);
        }
        ctx.fill();
        
        // Simple wing
        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        if (frame === 0) {
            ctx.ellipse(20, 22, 8, 4, -0.3, 0, Math.PI * 2);
        } else {
            ctx.ellipse(20, 28, 8, 4, 0.3, 0, Math.PI * 2);
        }
        ctx.fill();
    }
    
    createMobileAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Mobile audio context handling
            const resumeAudio = () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            };
            
            document.addEventListener('touchstart', resumeAudio, { once: true });
            document.addEventListener('click', resumeAudio, { once: true });
            
        } catch (error) {
            console.warn('Audio context not available on this mobile device');
            this.audioContext = null;
        }
        
        // Load mobile-optimized Mario laugh
        this.loadMobileAudio();
        
        // Simplified mobile sounds
        this.audio.sounds.crash = this.createMobileCrashSound();
        this.audio.sounds.bgMusic = this.createMobileMusic();
    }
    
    loadMobileAudio() {
        // Try to load Mario laugh with mobile optimization
        const marioLaugh = new Audio('mario-laugh.mp3');
        marioLaugh.volume = 0.5; // Lower volume for mobile
        marioLaugh.preload = 'auto';
        
        let isLoaded = false;
        
        this.audio.sounds.tap = () => {
            if (isLoaded && marioLaugh.readyState >= 2) {
                const clone = marioLaugh.cloneNode();
                clone.volume = this.getEffectiveVolume('tap');
                clone.play().catch(() => {
                    // Simple fallback beep for mobile
                    this.playMobileBeep();
                });
            } else {
                this.playMobileBeep();
            }
        };
        
        marioLaugh.addEventListener('canplaythrough', () => {
            console.log('✅ Mobile Mario laugh loaded');
            isLoaded = true;
        });
        
        marioLaugh.addEventListener('error', () => {
            console.log('⚠️ Mario laugh failed on mobile, using beep');
            this.audio.sounds.tap = () => this.playMobileBeep();
        });
        
        marioLaugh.load();
    }
    
    playMobileBeep() {
        // Simple beep sound for mobile
        if (this.audioContext) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.frequency.value = 800;
            osc.type = 'square';
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(this.getEffectiveVolume('tap') * 0.3, this.audioContext.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            osc.start(this.audioContext.currentTime);
            osc.stop(this.audioContext.currentTime + 0.1);
        }
    }
    
    createMobileCrashSound() {
        return () => {
            if (this.audioContext) {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
                osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.5);
                osc.type = 'sawtooth';
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                gain.gain.linearRampToValueAtTime(this.getEffectiveVolume('crash') * 0.4, this.audioContext.currentTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                
                osc.start(this.audioContext.currentTime);
                osc.stop(this.audioContext.currentTime + 0.5);
            }
        };
    }
    
    createMobileMusic() {
        // Simplified background music for mobile
        return {
            start: () => {
                if (!this.audioContext || this.getEffectiveVolume('music') === 0) return;
                
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume().then(() => this.startMobileMelody());
                } else {
                    this.startMobileMelody();
                }
            },
            stop: () => {
                if (this.musicInterval) {
                    clearInterval(this.musicInterval);
                    this.musicInterval = null;
                }
            }
        };
    }
    
    startMobileMelody() {
        if (!this.audioContext) return;
        
        // Simple melody for mobile performance
        const notes = [440, 523, 659, 523]; // A, C, E, C
        let noteIndex = 0;
        
        this.musicInterval = setInterval(() => {
            if (this.audio.enabled && this.getEffectiveVolume('music') > 0 && this.audioContext) {
                try {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    
                    osc.frequency.value = notes[noteIndex];
                    osc.type = 'sine';
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    
                    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                    gain.gain.linearRampToValueAtTime(this.getEffectiveVolume('music') * 0.1, this.audioContext.currentTime + 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
                    
                    osc.start(this.audioContext.currentTime);
                    osc.stop(this.audioContext.currentTime + 0.8);
                    
                    noteIndex = (noteIndex + 1) % notes.length;
                } catch (error) {
                    console.log('Mobile music error:', error);
                }
            }
        }, 1000); // Slower tempo for mobile
    }
    
    setupMobileEventListeners() {
        // Mobile-optimized touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleMobileTouch(e);
            this.handleJumpStart();
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleJumpEnd();
        }, { passive: false });
        
        // Prevent mobile scrolling
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Mobile UI event listeners
        this.setupMobileUI();
    }
    
    handleMobileTouch(e) {
        const now = Date.now();
        
        // Prevent double-tap zoom
        if (now - this.lastTouchTime < 300) {
            e.preventDefault();
            return;
        }
        this.lastTouchTime = now;
        
        // Show touch indicator
        this.showTouchIndicator(e.touches[0]);
    }
    
    showTouchIndicator(touch) {
        const indicator = document.getElementById('touchIndicator');
        if (indicator) {
            indicator.style.left = touch.clientX + 'px';
            indicator.style.top = touch.clientY + 'px';
            indicator.classList.add('show');
            
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 600);
        }
    }
    
    setupMobileUI() {
        const elements = {
            startBtn: () => this.startGame(),
            restartBtn: () => this.handleRestart(),
            toggleMusic: () => this.toggleMusic(),
            settingsBtn: () => this.toggleMobileSettings(),
            closeSettingsBtn: () => this.hideMobileSettings(),
            saveNameBtn: () => this.savePlayerName()
        };
        
        Object.entries(elements).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
                // Add touch feedback
                element.addEventListener('touchstart', () => {
                    element.style.transform = 'scale(0.95)';
                });
                element.addEventListener('touchend', () => {
                    element.style.transform = 'scale(1)';
                });
            }
        });
        
        // Mobile volume sliders
        const volumeSliders = {
            masterVolumeSlider: (e) => this.updateVolume('master', parseInt(e.target.value)),
            musicVolumeSlider: (e) => this.updateVolume('music', parseInt(e.target.value)),
            tapVolumeSlider: (e) => this.updateVolume('tap', parseInt(e.target.value))
        };
        
        Object.entries(volumeSliders).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', handler);
            }
        });
    }
    
    handleJumpStart() {
        if (this.gameState === 'menu') {
            this.startGame();
        } else if (this.gameState === 'playing') {
            this.jumpState.isPressed = true;
            this.jumpState.pressTime = Date.now();
            this.jump();
        } else if (this.gameState === 'gameOver') {
            this.handleRestart();
        }
    }
    
    handleJumpEnd() {
        this.jumpState.isPressed = false;
    }
    
    jump() {
        let jumpPower = this.settings.jumpPower.min;
        
        if (this.jumpState.isPressed) {
            const holdTime = Date.now() - this.jumpState.pressTime;
            const holdRatio = Math.min(holdTime / this.jumpState.maxHoldTime, 1);
            jumpPower = this.settings.jumpPower.min + 
                       (this.settings.jumpPower.max - this.settings.jumpPower.min) * holdRatio;
        }
        
        this.bird.velocity = jumpPower;
        this.playSound('tap');
    }
    
    // Include essential methods from main game (simplified for mobile)
    getRandomInterval() {
        const intervals = [9, 11, 13, 15];
        return intervals[Math.floor(Math.random() * intervals.length)];
    }
    
    getEffectiveVolume(type) {
        if (!this.audio.enabled) return 0;
        return (this.audio.volumes[type] / 100) * (this.audio.volumes.master / 100);
    }
    
    updateVolume(type, volume) {
        this.audio.volumes[type] = volume;
        const displayId = `${type}VolumeDisplay`;
        const displayElement = document.getElementById(displayId);
        if (displayElement) {
            displayElement.textContent = `${volume}%`;
        }
        localStorage.setItem(`flappy${type.charAt(0).toUpperCase() + type.slice(1)}Volume`, volume);
    }
    
    playSound(soundType) {
        if (this.audio.sounds[soundType]) {
            this.audio.sounds[soundType]();
        }
    }
    
    startBackgroundMusic() {
        if (this.audio.enabled && this.audio.sounds.bgMusic) {
            this.audio.sounds.bgMusic.start();
            this.audio.playing = true;
        }
    }
    
    toggleMusic() {
        this.audio.enabled = !this.audio.enabled;
        const btn = document.getElementById('toggleMusic');
        if (btn) {
            btn.textContent = this.audio.enabled ? '🔊 Music' : '🔇 Music';
        }
        
        if (this.audio.enabled) {
            this.startBackgroundMusic();
        } else {
            this.audio.sounds.bgMusic.stop();
            this.audio.playing = false;
        }
    }
    
    toggleMobileSettings() {
        const panel = document.getElementById('settingsPanel');
        if (panel) {
            panel.classList.toggle('hidden');
        }
    }
    
    hideMobileSettings() {
        const panel = document.getElementById('settingsPanel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }
    
    initializeMobileUI() {
        // Set mobile volume sliders
        Object.keys(this.audio.volumes).forEach(type => {
            const sliderId = `${type}VolumeSlider`;
            const displayId = `${type}VolumeDisplay`;
            
            const slider = document.getElementById(sliderId);
            const display = document.getElementById(displayId);
            
            if (slider) slider.value = this.audio.volumes[type];
            if (display) display.textContent = `${this.audio.volumes[type]}%`;
        });
        
        // Set other UI elements
        document.getElementById('bestScore').textContent = this.bestScore;
        document.getElementById('toggleMusic').textContent = this.audio.enabled ? '🔊 Music' : '🔇 Music';
        
        // Hide HUD initially
        document.getElementById('gameHUD').style.display = 'none';
        
        this.updateScore();
        this.updateDifficulty();
    }
    
    // Leaderboard methods (same as desktop)
    async savePlayerName() {
        const nameInput = document.getElementById('playerNameInput');
        const name = nameInput.value.trim();
        
        if (name.length < 2) {
            alert('Please enter a name with at least 2 characters');
            return;
        }
        
        this.leaderboard.setPlayerName(name);
        nameInput.style.background = 'rgba(39, 174, 96, 0.2)';
        
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
            const submitted = await this.leaderboard.submitScore(this.score);
            
            const statusElement = document.getElementById('leaderboardStatus');
            if (statusElement) {
                statusElement.textContent = submitted ? '🏆 Submitted!' : '💾 Saved locally';
            }
            
            this.refreshLeaderboard();
        }
    }
    
    async refreshLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        const statusElement = document.getElementById('leaderboardStatus');
        
        if (!leaderboardList || !statusElement) return;
        
        try {
            statusElement.textContent = '🔄 Loading...';
            const scores = await this.leaderboard.getGlobalLeaderboard(5); // Show only top 5 on mobile
            
            leaderboardList.innerHTML = '';
            
            if (scores.length === 0) {
                leaderboardList.innerHTML = '<li>No scores yet!</li>';
            } else {
                scores.forEach((entry, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `${index + 1}. ${entry.name} - ${entry.score}`;
                    leaderboardList.appendChild(li);
                });
            }
            
            statusElement.textContent = this.leaderboard.isConnected ? '🌐 Global' : '💾 Local';
        } catch (error) {
            statusElement.textContent = '❌ Error';
        }
    }
    
    initializeLeaderboard() {
        const nameInput = document.getElementById('playerNameInput');
        if (nameInput) {
            nameInput.value = this.leaderboard.getPlayerName();
        }
        this.refreshLeaderboard();
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('gameHUD').style.display = 'block';
        
        this.resetGame();
        
        if (!this.audio.playing) {
            this.startBackgroundMusic();
        }
    }
    
    handleRestart() {
        if (this.gameState === 'gameOver') {
            this.resetGame();
            this.startGame();
        }
    }
    
    resetGame() {
        this.currentGameSubmitted = false;
        
        const scale = Math.min(this.canvas.width / 600, this.canvas.height / 400);
        this.bird = {
            x: this.canvas.width * 0.2,
            y: this.canvas.height / 2,
            width: 45 * Math.max(scale, 0.8),
            height: 35 * Math.max(scale, 0.8),
            velocity: 0,
            rotation: 0
        };
        
        this.pipes = [];
        this.easterEggs = [];
        this.score = 0;
        this.camera = { x: 0, y: 0 };
        
        // Reset power-up
        this.powerUp.active = false;
        this.powerUp.currentSpeedMultiplier = 1;
        
        // Reset world state
        this.world.totalPipesPassed = 0;
        this.world.currentSeason = Math.floor(Math.random() * this.world.themes.length);
        
        this.updateScore();
        this.updateDifficulty();
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Mobile-optimized physics
        this.settings.gravity = this.difficulty.baseGravity + (this.score * 0.008); // Slower progression
        this.settings.pipeSpeed = this.difficulty.basePipeSpeed + (this.score * 0.03); // Slower progression
        this.settings.pipeGap = Math.max(this.difficulty.basePipeGap - (this.score * 1.5), 180); // Larger minimum gap
        
        // Update bird physics
        const smoothDelta = Math.max(0.5, Math.min(2.0, this.deltaTime || 1));
        this.bird.velocity += this.settings.gravity * smoothDelta;
        
        // Continuous jump boost while held (mobile-optimized)
        if (this.jumpState.isPressed) {
            const holdTime = Date.now() - this.jumpState.pressTime;
            if (holdTime < this.jumpState.maxHoldTime) {
                this.bird.velocity -= 0.25 * smoothDelta; // Slightly less powerful for mobile
            }
        }
        
        this.bird.y += this.bird.velocity * smoothDelta;
        
        // Mobile-optimized movement
        const currentBirdSpeed = this.settings.birdSpeed * this.powerUp.currentSpeedMultiplier;
        this.bird.x += currentBirdSpeed * smoothDelta;
        
        // Simplified rotation for mobile
        if (this.bird.velocity > 0) {
            this.bird.rotation = Math.min(this.bird.velocity * 0.015, 0.1); // Less rotation
        } else {
            this.bird.rotation = Math.max(this.bird.velocity * 0.02, -0.2);
        }
        
        // Update animation
        this.updateMobileBirdAnimation();
        
        // Update camera
        this.camera.x = this.bird.x - this.canvas.width * 0.3;
        
        // Generate pipes (mobile-optimized spacing)
        const pipeSpacing = Math.max(this.canvas.width * 0.6, 350); // Wider spacing for mobile
        if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < this.bird.x + this.canvas.width) {
            this.createMobilePipe();
        }
        
        // Update pipes
        this.updateMobilePipes();
        
        // Update mobile-specific features
        this.updateMobileGame();
        
        // Check collisions (mobile-optimized)
        this.checkMobileCollisions();
    }
    
    updateMobileBirdAnimation() {
        if (this.birdFrames) {
            this.frameTimer++;
            
            // Simpler animation logic for mobile
            let animationSpeed = this.frameDelay;
            if (this.bird.velocity < -3) {
                animationSpeed = 6; // Faster when jumping
            } else if (this.bird.velocity > 3) {
                animationSpeed = 4; // Faster when falling
            }
            
            if (this.frameTimer >= animationSpeed) {
                this.currentFrame = (this.currentFrame + 1) % this.birdFrames.length;
                this.frameTimer = 0;
            }
        }
    }
    
    createMobilePipe() {
        // Simplified pipe creation for mobile
        const minHeight = 80; // Larger margins for mobile
        const maxHeight = this.canvas.height - this.settings.pipeGap - minHeight;
        
        // Simple random positioning for mobile
        const topHeight = minHeight + Math.random() * (maxHeight - minHeight);
        
        const pipeX = this.pipes.length === 0 ? 
            this.bird.x + this.canvas.width * 0.8 : 
            this.pipes[this.pipes.length - 1].x + Math.max(this.canvas.width * 0.6, 350);
        
        this.pipes.push({
            x: pipeX,
            topHeight: topHeight,
            bottomY: topHeight + this.settings.pipeGap,
            scored: false,
            type: 'full' // Only full pipes for mobile simplicity
        });
        
        // Simplified easter egg spawning for mobile
        if (Math.random() < this.easterEggSpawnChance && !this.powerUp.active) {
            this.spawnMobileEasterEgg(pipeX + this.settings.pipeWidth + 80);
        }
    }
    
    spawnMobileEasterEgg(x) {
        this.easterEggs.push({
            x: x,
            y: this.canvas.height / 2 + (Math.random() - 0.5) * 150,
            width: 25, // Smaller for mobile
            height: 25,
            rotation: 0,
            collected: false
        });
    }
    
    updateMobilePipes() {
        // Mobile-optimized pipe updates
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            
            // Remove off-screen pipes
            if (pipe.x + this.settings.pipeWidth < this.camera.x - 100) {
                this.pipes.splice(i, 1);
                continue;
            }
            
            // Score when passing pipe
            if (!pipe.scored && pipe.x + this.settings.pipeWidth < this.bird.x) {
                pipe.scored = true;
                this.score++;
                this.world.totalPipesPassed++;
                this.updateScore();
                this.updateDifficulty();
            }
        }
    }
    
    checkMobileCollisions() {
        // Mobile-optimized collision detection (more forgiving)
        const birdMargin = 6; // Larger margin for mobile
        const pipeMargin = 5; // Larger margin for mobile
        
        const birdLeft = this.bird.x + birdMargin;
        const birdRight = this.bird.x + this.bird.width - birdMargin;
        const birdTop = this.bird.y + birdMargin;
        const birdBottom = this.bird.y + this.bird.height - birdMargin;
        
        // Ground and ceiling collision
        if (birdTop <= pipeMargin || birdBottom >= this.canvas.height - pipeMargin) {
            this.gameOver();
            return;
        }
        
        // Simplified pipe collision for mobile
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
    
    gameOver() {
        this.gameState = 'gameOver';
        this.playSound('crash');
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('flappyBestScore', this.bestScore);
        }
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('bestScore').textContent = this.bestScore;
        document.getElementById('gameOverScreen').classList.remove('hidden');
        document.getElementById('gameHUD').style.display = 'none';
        
        // Submit score and refresh leaderboard
        this.submitScoreToLeaderboard();
        this.refreshLeaderboard();
    }
    
    updateScore() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
    }
    
    updateDifficulty() {
        const difficultyElement = document.getElementById('difficulty');
        if (difficultyElement) {
            if (this.score < 5) {
                difficultyElement.textContent = 'Easy';
            } else if (this.score < 15) {
                difficultyElement.textContent = 'Medium';
            } else {
                difficultyElement.textContent = 'Hard';
            }
        }
    }
    
    // Mobile-optimized rendering
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawMobileBackground();
        
        if (this.gameState === 'playing' || this.gameState === 'gameOver') {
            this.ctx.save();
            this.ctx.translate(-this.camera.x, -this.camera.y);
            
            this.drawMobilePipes();
            this.drawMobileEasterEggs();
            this.drawMobileBird();
            
            this.ctx.restore();
        }
    }
    
    drawMobileBackground() {
        // Simplified background for mobile performance
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#4EC0CA');
        gradient.addColorStop(1, '#44A08D');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Simple ground
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.canvas.height - 80, this.canvas.width, 80);
        
        // Simple grass
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(0, this.canvas.height - 80, this.canvas.width, 15);
    }
    
    drawMobilePipes() {
        for (const pipe of this.pipes) {
            if (pipe.x + this.settings.pipeWidth >= this.camera.x && pipe.x <= this.camera.x + this.canvas.width) {
                // Simplified pipe drawing for mobile
                this.ctx.fillStyle = '#5FAD56';
                
                // Top pipe
                if (pipe.topHeight > 0) {
                    this.ctx.fillRect(pipe.x, 0, this.settings.pipeWidth, pipe.topHeight);
                    // Simple cap
                    this.ctx.fillStyle = '#4A7C59';
                    this.ctx.fillRect(pipe.x - 4, pipe.topHeight - 15, this.settings.pipeWidth + 8, 15);
                    this.ctx.fillStyle = '#5FAD56';
                }
                
                // Bottom pipe
                if (pipe.bottomY < this.canvas.height) {
                    this.ctx.fillRect(pipe.x, pipe.bottomY, this.settings.pipeWidth, this.canvas.height - pipe.bottomY);
                    // Simple cap
                    this.ctx.fillStyle = '#4A7C59';
                    this.ctx.fillRect(pipe.x - 4, pipe.bottomY, this.settings.pipeWidth + 8, 15);
                }
            }
        }
    }
    
    drawMobileEasterEggs() {
        for (const egg of this.easterEggs) {
            if (egg.x + egg.width >= this.camera.x && egg.x <= this.camera.x + this.canvas.width) {
                // Simple easter egg for mobile
                this.ctx.fillStyle = '#FFD700';
                this.ctx.beginPath();
                this.ctx.arc(egg.x + egg.width/2, egg.y + egg.height/2, egg.width/2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Simple star pattern
                this.ctx.fillStyle = '#FFA500';
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('⭐', egg.x + egg.width/2, egg.y + egg.height/2 + 5);
                this.ctx.textAlign = 'left';
            }
        }
    }
    
    drawMobileBird() {
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2);
        this.ctx.rotate(this.bird.rotation);
        
        // Use animated frame
        const birdImage = this.audio.custom.birdImage || this.birdFrames[this.currentFrame];
        
        this.ctx.drawImage(
            birdImage,
            -this.bird.width / 2,
            -this.bird.height / 2,
            this.bird.width,
            this.bird.height
        );
        
        this.ctx.restore();
    }
    
    // Mobile-optimized game loop
    gameLoop() {
        const currentTime = performance.now();
        
        // Mobile frame rate limiting
        this.deltaTime = (currentTime - this.lastFrameTime) / 16.67;
        
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
    
    // Missing essential methods for mobile game
    updateMobileEasterEggs() {
        for (let i = this.easterEggs.length - 1; i >= 0; i--) {
            const egg = this.easterEggs[i];
            
            // Remove off-screen eggs
            if (egg.x + egg.width < this.camera.x - 100) {
                this.easterEggs.splice(i, 1);
                continue;
            }
            
            // Simple rotation animation
            egg.rotation += 0.1;
            
            // Check collection
            if (!egg.collected &&
                this.bird.x < egg.x + egg.width &&
                this.bird.x + this.bird.width > egg.x &&
                this.bird.y < egg.y + egg.height &&
                this.bird.y + this.bird.height > egg.y) {
                
                this.collectMobileEasterEgg(i);
            }
        }
    }
    
    collectMobileEasterEgg(index) {
        this.easterEggs.splice(index, 1);
        this.activateMobilePowerUp();
    }
    
    activateMobilePowerUp() {
        this.powerUp.active = true;
        this.powerUp.startTime = Date.now();
        this.powerUp.currentSpeedMultiplier = this.powerUp.speedMultiplier;
        
        console.log('🚀 Mobile power-up activated!');
        
        // Simple mobile power-up sound
        this.playMobilePowerUpSound();
    }
    
    playMobilePowerUpSound() {
        if (this.audioContext) {
            // Simple ascending tone for mobile
            const frequencies = [440, 554, 659, 880];
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    
                    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                    gain.gain.linearRampToValueAtTime(this.getEffectiveVolume('powerup') * 0.3, this.audioContext.currentTime + 0.01);
                    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                    
                    osc.start(this.audioContext.currentTime);
                    osc.stop(this.audioContext.currentTime + 0.3);
                }, index * 100);
            });
        }
    }
    
    updateMobilePowerUp() {
        if (this.powerUp.active && Date.now() - this.powerUp.startTime > this.powerUp.duration) {
            this.powerUp.active = false;
            this.powerUp.currentSpeedMultiplier = 1;
            console.log('🐦 Mobile power-up ended');
        }
    }
    
    // Add missing update calls
    updateMobileGame() {
        this.updateMobileEasterEggs();
        this.updateMobilePowerUp();
    }
}

// Initialize mobile game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 Starting Mobile Flappy Bird Adventure');
    new MobileFlappyBirdGame();
});
