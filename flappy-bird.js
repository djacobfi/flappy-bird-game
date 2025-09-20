/**
 * Flappy Bird Adventure Game
 * Features: Dynamic backgrounds, holiday themes, customizable assets, variable jump mechanics
 */

class FlappyBirdGame {
    constructor() {
        // Core game elements
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.canvas || !this.ctx) {
            console.error('Canvas initialization failed');
            return;
        }
        
        // Game state
        this.gameState = 'menu'; // 'menu', 'playing', 'gameOver'
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('flappyBestScore')) || 0;
        
        // Game settings
        this.settings = {
            gravity: 0.4,
            jumpPower: { min: -8, max: -15 },
            birdSpeed: 2,
            pipeSpeed: 1.5,
            pipeGap: 250,
            pipeWidth: 50
        };
        
        // Progressive difficulty
        this.difficulty = {
            baseGravity: 0.3,
            basePipeSpeed: 1,
            basePipeGap: 280
        };
        
        // Game objects
        this.bird = { x: 0, y: 0, width: 40, height: 30, velocity: 0, rotation: 0 };
        this.pipes = [];
        this.camera = { x: 0, y: 0 };
        
        // Jump mechanics
        this.jumpState = {
            isPressed: false,
            pressTime: 0,
            maxHoldTime: 300
        };
        
        // Audio system
        this.audio = {
            enabled: true,
            volume: parseFloat(localStorage.getItem('flappyMusicVolume')) || 30,
            playing: false,
            sounds: { tap: null, crash: null, bgMusic: null },
            custom: { birdImage: null, tapSound: null, crashSound: null, bgMusic: null },
            state: { 
                tapLastPlayed: 0, 
                crashLastPlayed: 0,
                currentTapAudio: null,
                currentCrashAudio: null
            }
        };
        
        // Holiday/Season system
        this.world = {
            totalPipesPassed: 0,
            currentSeason: 0,
            currentTimeOfDay: 0,
            pipesToNextSeasonChange: this.getRandomInterval(),
            pipesToNextTimeChange: this.getRandomInterval(),
            themes: ['green', 'snow', 'desert', 'christmas', 'halloween', 'usa', 'valentines', 'easter', 'spring', 'autumn']
        };
        
        // Game over delay
        this.gameOverTime = 0;
        this.gameOverDelay = 1000; // 1 second
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.createDefaultAssets();
        this.setupEventListeners();
        this.initializeUI();
        this.startGameLoop();
        this.startBackgroundMusic();
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Position bird
        this.bird.x = this.canvas.width * 0.15;
        this.bird.y = this.canvas.height / 2;
        
        // Scale for different screen sizes
        const scale = Math.max(Math.min(this.canvas.width / 800, this.canvas.height / 600), 0.5);
        this.bird.width = 40 * scale;
        this.bird.height = 30 * scale;
        this.settings.pipeWidth = Math.max(60 * scale, 40);
        this.settings.pipeGap = Math.max(250 * scale, 180);
        
        window.addEventListener('resize', () => this.setupCanvas());
    }
    
    createDefaultAssets() {
        // Create default bird sprite
        const birdCanvas = document.createElement('canvas');
        birdCanvas.width = 40;
        birdCanvas.height = 30;
        const ctx = birdCanvas.getContext('2d');
        
        // Bird body
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(20, 15, 18, 12, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Wing
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.ellipse(25, 15, 8, 6, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(28, 12, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // Beak
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.moveTo(35, 15);
        ctx.lineTo(40, 13);
        ctx.lineTo(35, 17);
        ctx.closePath();
        ctx.fill();
        
        this.defaultBirdImage = birdCanvas;
        
        // Create default sounds
        this.createDefaultSounds();
    }
    
    createDefaultSounds() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Default tap sound (3 seconds) - same as previous version
        this.audio.sounds.tap = this.createBeepSound(800, 3.0);
        
        // Default crash sound (3 seconds) - same as previous version
        this.audio.sounds.crash = this.createNoiseSound(3.0);
        
        // Default background music - full melody
        this.audio.sounds.bgMusic = this.createMelodySound();
    }
    
    createBeepSound(frequency, duration) {
        return () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Create a more musical tap sound with harmonics
            const fundamentalOsc = this.audioContext.createOscillator();
            const harmonicOsc = this.audioContext.createOscillator();
            const subOsc = this.audioContext.createOscillator();
            
            const gainNode = this.audioContext.createGain();
            const harmonicGain = this.audioContext.createGain();
            const subGain = this.audioContext.createGain();
            const masterGain = this.audioContext.createGain();
            
            // Add reverb-like effect with delay
            const delayNode = this.audioContext.createDelay();
            const delayGain = this.audioContext.createGain();
            
            delayNode.delayTime.setValueAtTime(0.1, this.audioContext.currentTime);
            delayGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            
            // Fundamental frequency (main note)
            fundamentalOsc.frequency.value = frequency;
            fundamentalOsc.type = 'sine';
            fundamentalOsc.connect(gainNode);
            
            // Harmonic (octave up for brightness)
            harmonicOsc.frequency.value = frequency * 2;
            harmonicOsc.type = 'triangle';
            harmonicOsc.connect(harmonicGain);
            
            // Sub harmonic (fifth down for richness)
            subOsc.frequency.value = frequency * 0.75;
            subOsc.type = 'sawtooth';
            subOsc.connect(subGain);
            
            // Mix the oscillators
            gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
            harmonicGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
            subGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            
            // Connect to master gain with delay
            gainNode.connect(masterGain);
            harmonicGain.connect(masterGain);
            subGain.connect(masterGain);
            
            gainNode.connect(delayNode);
            delayNode.connect(delayGain);
            delayGain.connect(masterGain);
            
            masterGain.connect(this.audioContext.destination);
            
            // Musical envelope - quick attack, sustain, gentle release
            masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            masterGain.gain.linearRampToValueAtTime(0.6, this.audioContext.currentTime + 0.02); // Quick attack
            masterGain.gain.exponentialRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1); // Sustain
            masterGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration); // Release
            
            // Start all oscillators
            const startTime = this.audioContext.currentTime;
            fundamentalOsc.start(startTime);
            harmonicOsc.start(startTime);
            subOsc.start(startTime);
            
            fundamentalOsc.stop(startTime + duration);
            harmonicOsc.stop(startTime + duration);
            subOsc.stop(startTime + duration);
        };
    }
    
    createNoiseSound(duration) {
        return () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Create a musical crash sound with descending tones
            const crashOsc1 = this.audioContext.createOscillator();
            const crashOsc2 = this.audioContext.createOscillator();
            const crashOsc3 = this.audioContext.createOscillator();
            
            const gain1 = this.audioContext.createGain();
            const gain2 = this.audioContext.createGain();
            const gain3 = this.audioContext.createGain();
            const masterGain = this.audioContext.createGain();
            
            // Add some filtered noise for texture
            const bufferSize = this.audioContext.sampleRate * 0.3; // Short burst
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * 0.2;
                if (i > 0) {
                    output[i] = output[i] * 0.8 + output[i - 1] * 0.2;
                }
            }
            
            const noiseSource = this.audioContext.createBufferSource();
            const noiseGain = this.audioContext.createGain();
            const noiseFilter = this.audioContext.createBiquadFilter();
            
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(400, this.audioContext.currentTime);
            
            noiseSource.buffer = buffer;
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(masterGain);
            
            // Descending tones for dramatic effect
            crashOsc1.frequency.setValueAtTime(220, this.audioContext.currentTime); // A3
            crashOsc1.frequency.exponentialRampToValueAtTime(110, this.audioContext.currentTime + duration); // A2
            crashOsc1.type = 'sawtooth';
            crashOsc1.connect(gain1);
            
            crashOsc2.frequency.setValueAtTime(165, this.audioContext.currentTime); // E3
            crashOsc2.frequency.exponentialRampToValueAtTime(82.5, this.audioContext.currentTime + duration); // E2
            crashOsc2.type = 'square';
            crashOsc2.connect(gain2);
            
            crashOsc3.frequency.setValueAtTime(130, this.audioContext.currentTime); // C3
            crashOsc3.frequency.exponentialRampToValueAtTime(65, this.audioContext.currentTime + duration); // C2
            crashOsc3.type = 'triangle';
            crashOsc3.connect(gain3);
            
            // Mix the oscillators
            gain1.gain.setValueAtTime(0.15, this.audioContext.currentTime);
            gain2.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gain3.gain.setValueAtTime(0.08, this.audioContext.currentTime);
            noiseGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            
            gain1.connect(masterGain);
            gain2.connect(masterGain);
            gain3.connect(masterGain);
            
            masterGain.connect(this.audioContext.destination);
            
            // Dramatic envelope - quick spike then fade
            masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            masterGain.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + 0.05); // Quick spike
            masterGain.gain.exponentialRampToValueAtTime(0.2, this.audioContext.currentTime + 0.3); // Drop
            masterGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration); // Fade out
            
            // Start all sounds
            const startTime = this.audioContext.currentTime;
            crashOsc1.start(startTime);
            crashOsc2.start(startTime);
            crashOsc3.start(startTime);
            noiseSource.start(startTime);
            
            crashOsc1.stop(startTime + duration);
            crashOsc2.stop(startTime + duration);
            crashOsc3.stop(startTime + duration);
        };
    }
    
    createMelodySound() {
        // Enhanced melody with chord progressions
        const melody = [
            { note: 523.25, chord: [523.25, 659.25, 783.99] }, // C major
            { note: 587.33, chord: [587.33, 698.46, 880.00] }, // D minor
            { note: 659.25, chord: [659.25, 783.99, 987.77] }, // E minor
            { note: 523.25, chord: [523.25, 659.25, 783.99] }, // C major
            { note: 698.46, chord: [698.46, 880.00, 1046.50] }, // F major
            { note: 659.25, chord: [659.25, 783.99, 987.77] }, // E minor
            { note: 587.33, chord: [587.33, 698.46, 880.00] }, // D minor
            { note: 523.25, chord: [523.25, 659.25, 783.99] }  // C major
        ];
        
        let currentChord = 0;
        let melodyInterval;
        let bassInterval;
        
        return {
            start: () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                // Main melody line
                melodyInterval = setInterval(() => {
                    if (this.audio.enabled && this.audio.volume > 0) {
                        const chordData = melody[currentChord];
                        const volume = this.audio.volume / 100 * 0.08;
                        
                        // Play melody note
                        const melodyOsc = this.audioContext.createOscillator();
                        const melodyGain = this.audioContext.createGain();
                        const melodyFilter = this.audioContext.createBiquadFilter();
                        
                        melodyFilter.type = 'lowpass';
                        melodyFilter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
                        
                        melodyOsc.frequency.value = chordData.note;
                        melodyOsc.type = 'triangle';
                        melodyOsc.connect(melodyFilter);
                        melodyFilter.connect(melodyGain);
                        melodyGain.connect(this.audioContext.destination);
                        
                        melodyGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                        melodyGain.gain.linearRampToValueAtTime(volume * 1.5, this.audioContext.currentTime + 0.02);
                        melodyGain.gain.exponentialRampToValueAtTime(volume, this.audioContext.currentTime + 0.1);
                        melodyGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
                        
                        melodyOsc.start(this.audioContext.currentTime);
                        melodyOsc.stop(this.audioContext.currentTime + 0.8);
                        
                        // Play harmony (every other beat)
                        if (currentChord % 2 === 0) {
                            chordData.chord.forEach((freq, index) => {
                                if (index > 0) { // Skip root note (already playing)
                                    setTimeout(() => {
                                        const harmonyOsc = this.audioContext.createOscillator();
                                        const harmonyGain = this.audioContext.createGain();
                                        
                                        harmonyOsc.frequency.value = freq;
                                        harmonyOsc.type = 'sine';
                                        harmonyOsc.connect(harmonyGain);
                                        harmonyGain.connect(this.audioContext.destination);
                                        
                                        harmonyGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                                        harmonyGain.gain.linearRampToValueAtTime(volume * 0.3, this.audioContext.currentTime + 0.05);
                                        harmonyGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);
                                        
                                        harmonyOsc.start(this.audioContext.currentTime);
                                        harmonyOsc.stop(this.audioContext.currentTime + 0.6);
                                    }, index * 50); // Slight delay for arpeggio effect
                                }
                            });
                        }
                        
                        currentChord = (currentChord + 1) % melody.length;
                    }
                }, 600);
                
                // Bass line (slower rhythm)
                bassInterval = setInterval(() => {
                    if (this.audio.enabled && this.audio.volume > 0) {
                        const bassNote = melody[Math.floor(currentChord / 2) % melody.length].chord[0] / 2; // Octave down
                        const volume = this.audio.volume / 100 * 0.06;
                        
                        const bassOsc = this.audioContext.createOscillator();
                        const bassGain = this.audioContext.createGain();
                        
                        bassOsc.frequency.value = bassNote;
                        bassOsc.type = 'sawtooth';
                        bassOsc.connect(bassGain);
                        bassGain.connect(this.audioContext.destination);
                        
                        bassGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                        bassGain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.05);
                        bassGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.0);
                        
                        bassOsc.start(this.audioContext.currentTime);
                        bassOsc.stop(this.audioContext.currentTime + 1.0);
                    }
                }, 1200); // Half the speed of melody
            },
            stop: () => {
                if (melodyInterval) {
                    clearInterval(melodyInterval);
                }
                if (bassInterval) {
                    clearInterval(bassInterval);
                }
            }
        };
    }
    
    
    setupEventListeners() {
        // Game controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleJumpStart();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleJumpEnd();
            }
        });
        
        this.canvas.addEventListener('mousedown', () => this.handleJumpStart());
        this.canvas.addEventListener('mouseup', () => this.handleJumpEnd());
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleJumpStart();
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleJumpEnd();
        });
        
        // UI buttons
        this.setupUIEventListeners();
        
        // File uploads
        this.setupFileUploadListeners();
    }
    
    setupUIEventListeners() {
        const elements = {
            startBtn: () => this.startGame(),
            restartBtn: () => this.handleRestart(),
            toggleMusic: () => this.toggleMusic(),
            settingsBtn: () => this.toggleSettings(),
            closeSettingsBtn: () => this.hideSettings(),
            volumeSlider: (e) => this.updateVolume(parseInt(e.target.value))
        };
        
        Object.entries(elements).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'volumeSlider') {
                    element.addEventListener('input', handler);
                } else {
                    element.addEventListener('click', handler);
                }
            }
        });
    }
    
    setupFileUploadListeners() {
        const uploads = {
            birdUpload: (file) => this.handleBirdUpload(file),
            tapSoundUpload: (file) => this.handleSoundUpload(file, 'tap'),
            crashSoundUpload: (file) => this.handleSoundUpload(file, 'crash'),
            bgMusicUpload: (file) => this.handleSoundUpload(file, 'bgMusic')
        };
        
        Object.entries(uploads).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    if (e.target.files[0]) {
                        handler(e.target.files[0]);
                    }
                });
            }
        });
    }
    
    initializeUI() {
        // Set initial button states
        document.getElementById('volumeSlider').value = this.audio.volume;
        document.getElementById('volumeDisplay').textContent = `${this.audio.volume}%`;
        document.getElementById('bestScore').textContent = this.bestScore;
        document.getElementById('toggleMusic').textContent = this.audio.enabled ? '🔊 Music' : '🔇 Music';
        
        this.updateScore();
        this.updateDifficulty();
    }
    
    // Game Control Methods
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
        if (this.gameState === 'playing') {
            this.jumpState.isPressed = false;
        }
    }
    
    handleRestart() {
        if (this.gameState !== 'gameOver' || Date.now() - this.gameOverTime >= this.gameOverDelay) {
            this.resetGame();
            this.startGame();
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        
        if (!this.audio.playing) {
            this.startBackgroundMusic();
        }
    }
    
    resetGame() {
        const scale = Math.max(Math.min(this.canvas.width / 800, this.canvas.height / 600), 0.5);
        
        this.bird = {
            x: this.canvas.width * 0.15,
            y: this.canvas.height / 2,
            width: 40 * scale,
            height: 30 * scale,
            velocity: 0,
            rotation: 0
        };
        
        this.pipes = [];
        this.score = 0;
        this.camera = { x: 0, y: 0 };
        
        // Reset world state
        this.world.totalPipesPassed = 0;
        this.world.currentSeason = Math.floor(Math.random() * this.world.themes.length);
        this.world.currentTimeOfDay = 0;
        this.world.pipesToNextSeasonChange = this.getRandomInterval();
        this.world.pipesToNextTimeChange = this.getRandomInterval();
        
        this.gameOverTime = 0;
        this.updateScore();
        this.updateDifficulty();
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
    
    // Game Loop
    startGameLoop() {
        this.gameLoop();
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Progressive difficulty
        this.settings.gravity = this.difficulty.baseGravity + (this.score * 0.01);
        this.settings.pipeSpeed = this.difficulty.basePipeSpeed + (this.score * 0.05);
        this.settings.pipeGap = Math.max(this.difficulty.basePipeGap - (this.score * 2), 120);
        
        // Update bird physics
        this.bird.velocity += this.settings.gravity;
        
        // Continuous jump boost while held
        if (this.jumpState.isPressed) {
            const holdTime = Date.now() - this.jumpState.pressTime;
            if (holdTime < this.jumpState.maxHoldTime) {
                this.bird.velocity -= 0.3;
            }
        }
        
        this.bird.y += this.bird.velocity;
        this.bird.x += this.settings.birdSpeed;
        this.bird.rotation = Math.min(Math.max(this.bird.velocity * 0.05, -0.5), 0.5);
        
        // Update camera
        this.camera.x = this.bird.x - this.canvas.width * 0.3;
        
        // Generate pipes
        const pipeSpacing = Math.max(this.canvas.width * 0.5, 400);
        if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < this.bird.x + this.canvas.width) {
            this.createPipe();
        }
        
        // Update pipes
        this.updatePipes();
        
        // Check collisions
        this.checkCollisions();
    }
    
    updatePipes() {
        // Calculate dynamic pipe speed based on difficulty (with maximum cap)
        const speedIncrease = this.score * 0.08;
        const maxSpeedIncrease = this.settings.pipeSpeed * 2; // Cap at 3x original speed
        const dynamicPipeSpeed = this.settings.pipeSpeed + Math.min(speedIncrease, maxSpeedIncrease);
        
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= dynamicPipeSpeed;
            
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
                this.checkSeasonChanges();
            }
        }
    }
    
    createPipe() {
        const minHeight = 50;
        const maxHeight = this.canvas.height - this.settings.pipeGap - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        const pipeX = this.pipes.length === 0 ? 
            this.bird.x + this.canvas.width * 0.8 : 
            this.pipes[this.pipes.length - 1].x + Math.max(this.canvas.width * 0.5, 400);
        
        this.pipes.push({
            x: pipeX,
            topHeight: topHeight,
            bottomY: topHeight + this.settings.pipeGap,
            scored: false
        });
    }
    
    checkCollisions() {
        const birdMargin = 4;
        const pipeMargin = 3;
        const cornerSafeZone = 12;
        
        const birdLeft = this.bird.x + birdMargin;
        const birdRight = this.bird.x + this.bird.width - birdMargin;
        const birdTop = this.bird.y + birdMargin;
        const birdBottom = this.bird.y + this.bird.height - birdMargin;
        const birdCenterX = this.bird.x + this.bird.width / 2;
        const birdCenterY = this.bird.y + this.bird.height / 2;
        
        // Ground and ceiling collision
        if (birdTop <= pipeMargin || birdBottom >= this.canvas.height - pipeMargin) {
            this.gameOver();
            return;
        }
        
        // Pipe collision with safe corners
        for (const pipe of this.pipes) {
            const pipeLeft = pipe.x + pipeMargin;
            const pipeRight = pipe.x + this.settings.pipeWidth - pipeMargin;
            const topPipeBottom = pipe.topHeight - pipeMargin;
            const bottomPipeTop = pipe.bottomY + pipeMargin;
            
            if (birdRight > pipeLeft && birdLeft < pipeRight) {
                // Check safe corner zones
                const inTopSafeZone = this.isInSafeZone(birdCenterX, birdCenterY, pipe.x, pipe.topHeight, cornerSafeZone, 'top');
                const inBottomSafeZone = this.isInSafeZone(birdCenterX, birdCenterY, pipe.x, pipe.bottomY, cornerSafeZone, 'bottom');
                
                if (!inTopSafeZone && !inBottomSafeZone) {
                    if (birdTop < topPipeBottom || birdBottom > bottomPipeTop) {
                        this.gameOver();
                        return;
                    }
                }
            }
        }
    }
    
    isInSafeZone(birdX, birdY, pipeX, pipeY, safeZone, pipeType) {
        const leftCorner = pipeX;
        const rightCorner = pipeX + this.settings.pipeWidth;
        
        const distToLeft = Math.sqrt((birdX - leftCorner) ** 2 + (birdY - pipeY) ** 2);
        const distToRight = Math.sqrt((birdX - rightCorner) ** 2 + (birdY - pipeY) ** 2);
        
        return distToLeft < safeZone || distToRight < safeZone;
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.gameOverTime = Date.now();
        this.playSound('crash');
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('flappyBestScore', this.bestScore);
        }
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('bestScore').textContent = this.bestScore;
        document.getElementById('gameOverScreen').classList.remove('hidden');
        
        this.updateGameOverCountdown();
    }
    
    updateGameOverCountdown() {
        if (this.gameState !== 'gameOver') return;
        
        const timeElapsed = Date.now() - this.gameOverTime;
        const timeRemaining = this.gameOverDelay - timeElapsed;
        const restartBtn = document.getElementById('restartBtn');
        
        if (restartBtn) {
            if (timeRemaining > 0) {
                const secondsLeft = Math.ceil(timeRemaining / 1000);
                restartBtn.textContent = `🔄 New Adventure (${secondsLeft})`;
                restartBtn.style.opacity = '0.6';
                setTimeout(() => this.updateGameOverCountdown(), 100);
            } else {
                restartBtn.textContent = '🔄 New Adventure';
                restartBtn.style.opacity = '1';
            }
        }
    }
    
    // Audio System
    playSound(soundType) {
        const now = Date.now();
        
        if (soundType === 'tap') {
            // Spam-tap: restart sound from beginning
            if (this.audio.custom.tapSound) {
                if (this.audio.state.currentTapAudio) {
                    this.audio.state.currentTapAudio.pause();
                    this.audio.state.currentTapAudio.currentTime = 0;
                }
                
                const tapAudio = this.audio.custom.tapSound.cloneNode();
                tapAudio.volume = 0.5;
                tapAudio.play();
                
                this.audio.state.currentTapAudio = tapAudio;
                
                setTimeout(() => {
                    if (this.audio.state.currentTapAudio === tapAudio) {
                        tapAudio.pause();
                        this.audio.state.currentTapAudio = null;
                    }
                }, 3000);
            } else if (this.audio.sounds.tap) {
                this.audio.sounds.tap();
            }
        } else if (soundType === 'crash') {
            // Crash: prevent overlaps
            if (now - this.audio.state.crashLastPlayed < 3000) return;
            this.audio.state.crashLastPlayed = now;
            
            if (this.audio.custom.crashSound) {
                this.audio.custom.crashSound.currentTime = 0;
                this.audio.custom.crashSound.play();
                
                setTimeout(() => {
                    this.audio.custom.crashSound.pause();
                    this.audio.custom.crashSound.currentTime = 0;
                }, 3000);
            } else if (this.audio.sounds.crash) {
                this.audio.sounds.crash();
            }
        }
    }
    
    startBackgroundMusic() {
        if (this.audio.custom.bgMusic) {
            this.audio.custom.bgMusic.volume = this.audio.enabled ? this.audio.volume / 100 : 0;
            this.audio.custom.bgMusic.play();
        } else if (!this.audio.custom.bgMusic) {
            this.audio.sounds.bgMusic.start();
        }
        this.audio.playing = true;
    }
    
    toggleMusic() {
        this.audio.enabled = !this.audio.enabled;
        const btn = document.getElementById('toggleMusic');
        btn.textContent = this.audio.enabled ? '🔊 Music' : '🔇 Music';
        
        if (this.audio.custom.bgMusic) {
            this.audio.custom.bgMusic.volume = this.audio.enabled ? this.audio.volume / 100 : 0;
        }
        
        if (!this.audio.enabled && !this.audio.custom.bgMusic) {
            this.audio.sounds.bgMusic.stop();
            this.audio.playing = false;
        } else if (this.audio.enabled && !this.audio.playing) {
            this.startBackgroundMusic();
        }
    }
    
    updateVolume(volume) {
        this.audio.volume = volume;
        document.getElementById('volumeDisplay').textContent = `${volume}%`;
        
        if (this.audio.custom.bgMusic) {
            this.audio.custom.bgMusic.volume = this.audio.enabled ? volume / 100 : 0;
        }
        
        localStorage.setItem('flappyMusicVolume', volume);
    }
    
    // File Upload Handlers
    handleBirdUpload(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.audio.custom.birdImage = img;
                    this.updateButtonText('birdUpload', file.name);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
    
    handleSoundUpload(file, soundType) {
        if (file && file.type.startsWith('audio/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const audio = new Audio();
                audio.src = e.target.result;
                
                if (soundType === 'bgMusic') {
                    if (this.audio.custom.bgMusic) {
                        this.audio.custom.bgMusic.pause();
                    }
                    
                    audio.loop = true;
                    audio.volume = this.audio.enabled ? this.audio.volume / 100 : 0;
                    this.audio.custom.bgMusic = audio;
                    
                    if (this.audio.playing) {
                        this.audio.sounds.bgMusic.stop();
                        audio.play();
                    }
                } else {
                    audio.volume = 0.5;
                    this.audio.custom[soundType + 'Sound'] = audio;
                }
                
                this.updateButtonText(soundType === 'bgMusic' ? 'bgMusicUpload' : soundType + 'SoundUpload', file.name);
            };
            reader.readAsDataURL(file);
        }
    }
    
    updateButtonText(uploadId, fileName) {
        const label = document.querySelector(`label[for="${uploadId}"]`);
        if (label) {
            const displayName = fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName;
            
            const icons = {
                birdUpload: '🐦',
                tapSoundUpload: '🔊',
                crashSoundUpload: '💥',
                bgMusicUpload: '🎵'
            };
            
            label.textContent = `${icons[uploadId]} ${displayName}`;
            label.style.background = 'linear-gradient(45deg, #27ae60, #2ecc71)';
            label.title = `Current: ${fileName}\nRight-click to reset to default`;
            
            label.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.resetToDefault(uploadId);
            });
        }
    }
    
    resetToDefault(uploadId) {
        const defaults = {
            birdUpload: { text: 'Upload Bird Sprite', asset: 'birdImage' },
            tapSoundUpload: { text: '🔊 Tap Sound', asset: 'tapSound' },
            crashSoundUpload: { text: '💥 Crash Sound', asset: 'crashSound' },
            bgMusicUpload: { text: '🎵 Background Music', asset: 'bgMusic' }
        };
        
        const config = defaults[uploadId];
        if (config) {
            const label = document.querySelector(`label[for="${uploadId}"]`);
            if (label) {
                label.textContent = config.text;
                label.style.background = 'linear-gradient(45deg, #3498db, #2980b9)';
                label.title = 'Click to upload custom file';
            }
            
            if (config.asset === 'bgMusic' && this.audio.custom.bgMusic) {
                this.audio.custom.bgMusic.pause();
                this.audio.custom.bgMusic = null;
                if (this.audio.playing && this.audio.enabled) {
                    this.startBackgroundMusic();
                }
            } else {
                this.audio.custom[config.asset] = null;
            }
            
            const fileInput = document.getElementById(uploadId);
            if (fileInput) fileInput.value = '';
        }
    }
    
    // UI Methods
    toggleSettings() {
        const panel = document.getElementById('settingsPanel');
        panel.classList.toggle('hidden');
    }
    
    hideSettings() {
        document.getElementById('settingsPanel').classList.add('hidden');
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    updateDifficulty() {
        const element = document.getElementById('difficulty');
        const speedIncrease = this.score * 0.08;
        const maxSpeedIncrease = this.settings.pipeSpeed * 2;
        const currentPipeSpeed = this.settings.pipeSpeed + Math.min(speedIncrease, maxSpeedIncrease);
        const speedMultiplier = Math.round((currentPipeSpeed / this.settings.pipeSpeed) * 100);
        
        const levels = [
            { max: 5, text: `Easy Mode (${speedMultiplier}%)`, color: '#27ae60' },
            { max: 10, text: `Getting Harder... (${speedMultiplier}%)`, color: '#f39c12' },
            { max: 20, text: `Medium Mode (${speedMultiplier}%)`, color: '#e67e22' },
            { max: 30, text: `Hard Mode (${speedMultiplier}%)`, color: '#e74c3c' },
            { max: Infinity, text: `Expert Mode (${speedMultiplier}%)`, color: '#8e44ad' }
        ];
        
        const level = levels.find(l => this.score < l.max);
        element.textContent = level.text;
        element.style.color = level.color;
    }
    
    // Season/Holiday System
    getRandomInterval() {
        const intervals = [9, 11, 13, 15];
        return intervals[Math.floor(Math.random() * intervals.length)];
    }
    
    checkSeasonChanges() {
        if (this.world.totalPipesPassed >= this.world.pipesToNextSeasonChange) {
            this.world.currentSeason = Math.floor(Math.random() * this.world.themes.length);
            this.world.pipesToNextSeasonChange = this.world.totalPipesPassed + this.getRandomInterval();
        }
        
        if (this.world.totalPipesPassed >= this.world.pipesToNextTimeChange) {
            this.world.currentTimeOfDay = (this.world.currentTimeOfDay + 1) % 4;
            this.world.pipesToNextTimeChange = this.world.totalPipesPassed + this.getRandomInterval();
        }
    }
    
    // Rendering System
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawBackground();
        
        if (this.gameState === 'playing' || this.gameState === 'gameOver') {
            this.ctx.save();
            this.ctx.translate(-this.camera.x, -this.camera.y);
            
            this.drawPipes();
            this.drawBird();
            
            this.ctx.restore();
        }
    }
    
    drawBackground() {
        // Dynamic sky based on current time of day
        const skyColors = ['#4EC0CA', '#FF6B6B', '#2C3E50', '#FFB74D'];
        const holidayTheme = this.world.themes[this.world.currentSeason];
        
        let skyColor = skyColors[this.world.currentTimeOfDay];
        
        // Holiday sky overrides
        const holidaySkyColors = {
            christmas: '#e8f5e8',
            halloween: '#ff6f00',
            usa: '#2196f3',
            valentines: '#f8bbd9',
            easter: '#e1bee7',
            spring: '#c8e6c9',
            autumn: '#ffcc80'
        };
        
        if (holidaySkyColors[holidayTheme]) {
            skyColor = holidaySkyColors[holidayTheme];
        }
        
        // Sky gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height * 0.8);
        gradient.addColorStop(0, skyColor);
        gradient.addColorStop(1, this.adjustColor(skyColor, -20));
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw parallax layers
        this.drawParallaxLayers();
        
        // Draw holiday decorations
        this.drawHolidayDecorations(holidayTheme);
    }
    
    drawParallaxLayers() {
        const groundHeight = 120;
        
        // Mountains (slowest)
        this.drawMountains(-this.camera.x * 0.1);
        
        // Hills (medium)
        this.drawHills(-this.camera.x * 0.3);
        
        // Vegetation (fast)
        this.drawVegetation(-this.camera.x * 0.7);
        
        // Ground (full speed)
        this.drawGround(-this.camera.x, groundHeight);
    }
    
    drawMountains(offsetX) {
        const holidayTheme = this.world.themes[this.world.currentSeason];
        const mountainColors = {
            green: '#8B9DC3', snow: '#B0C4DE', desert: '#D2B48C',
            christmas: '#E8F5E8', halloween: '#4A148C', usa: '#6495ED',
            valentines: '#FFB6C1', easter: '#DDA0DD', spring: '#98FB98', autumn: '#CD853F'
        };
        
        this.ctx.fillStyle = mountainColors[holidayTheme] || '#8B9DC3';
        
        const mountainWidth = 200;
        const mountainHeight = this.canvas.height * 0.4;
        const baseY = this.canvas.height * 0.6;
        
        for (let x = offsetX - mountainWidth; x < this.canvas.width + mountainWidth; x += mountainWidth) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, baseY);
            this.ctx.lineTo(x + mountainWidth * 0.3, baseY - mountainHeight * 0.6);
            this.ctx.lineTo(x + mountainWidth * 0.5, baseY - mountainHeight);
            this.ctx.lineTo(x + mountainWidth * 0.7, baseY - mountainHeight * 0.8);
            this.ctx.lineTo(x + mountainWidth, baseY - mountainHeight * 0.4);
            this.ctx.lineTo(x + mountainWidth, baseY);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Snow caps for winter themes
            if (holidayTheme === 'snow' || holidayTheme === 'christmas') {
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.beginPath();
                this.ctx.moveTo(x + mountainWidth * 0.45, baseY - mountainHeight * 0.95);
                this.ctx.lineTo(x + mountainWidth * 0.5, baseY - mountainHeight);
                this.ctx.lineTo(x + mountainWidth * 0.55, baseY - mountainHeight * 0.95);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.fillStyle = mountainColors[holidayTheme] || '#8B9DC3';
            }
        }
    }
    
    drawHills(offsetX) {
        const holidayTheme = this.world.themes[this.world.currentSeason];
        const hillColors = {
            green: '#9ACD32', snow: '#F0F8FF', desert: '#DEB887',
            christmas: '#90EE90', halloween: '#8B4513', usa: '#87CEEB',
            valentines: '#FFC0CB', easter: '#E6E6FA', spring: '#98FB98', autumn: '#DEB887'
        };
        
        this.ctx.fillStyle = hillColors[holidayTheme] || '#9ACD32';
        
        const hillWidth = 150;
        const hillHeight = this.canvas.height * 0.3;
        const baseY = this.canvas.height * 0.75;
        
        for (let x = offsetX - hillWidth; x < this.canvas.width + hillWidth; x += hillWidth * 0.7) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, baseY);
            this.ctx.quadraticCurveTo(x + hillWidth * 0.5, baseY - hillHeight, x + hillWidth, baseY);
            this.ctx.lineTo(x + hillWidth, this.canvas.height);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }
    
    drawVegetation(offsetX) {
        const baseY = this.canvas.height - 120;
        const holidayTheme = this.world.themes[this.world.currentSeason];
        
        const foliageColors = {
            green: '#228B22', snow: '#F0F8FF', desert: '#8FBC8F',
            christmas: '#228B22', halloween: '#8B4513', usa: '#228B22',
            valentines: '#FF69B4', easter: '#90EE90', spring: '#32CD32', autumn: '#FF8C00'
        };
        
        const foliageColor = foliageColors[holidayTheme] || '#228B22';
        
        // Trees
        this.ctx.fillStyle = '#8B4513';
        for (let x = offsetX - 50; x < this.canvas.width + 50; x += 80) {
            const treeIndex = Math.floor(x / 80);
            const treeHeight = 80 + ((treeIndex * 23) % 60);
            
            this.ctx.fillRect(x + 20, baseY - 30, 8, 30);
            
            this.ctx.fillStyle = foliageColor;
            this.ctx.beginPath();
            this.ctx.arc(x + 24, baseY - 35, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#8B4513';
        }
    }
    
    drawGround(offsetX, groundHeight) {
        const baseY = this.canvas.height - groundHeight;
        
        // Main ground
        this.ctx.fillStyle = '#DED895';
        this.ctx.fillRect(0, baseY, this.canvas.width, groundHeight);
        
        // Moving ground texture
        this.ctx.fillStyle = '#D4C27A';
        for (let x = (offsetX % 40) - 40; x < this.canvas.width; x += 20) {
            this.ctx.fillRect(x, baseY + 10, 10, 3);
            this.ctx.fillRect(x + 5, baseY + 25, 8, 2);
            this.ctx.fillRect(x + 2, baseY + 40, 12, 2);
        }
        
        // Grass details
        this.ctx.fillStyle = '#9ACD32';
        for (let x = (offsetX % 30) - 30; x < this.canvas.width; x += 15) {
            this.ctx.fillRect(x, baseY - 2, 2, 8);
            this.ctx.fillRect(x + 3, baseY - 3, 2, 10);
            this.ctx.fillRect(x + 6, baseY - 1, 2, 6);
        }
    }
    
    drawHolidayDecorations(theme) {
        const decorationOffset = -this.camera.x * 0.15;
        
        switch(theme) {
            case 'christmas':
                this.drawSnowflakes(decorationOffset);
                break;
            case 'halloween':
                this.drawBats(decorationOffset);
                break;
            case 'usa':
                this.drawStars(decorationOffset);
                break;
            case 'valentines':
                this.drawHearts(decorationOffset);
                break;
            case 'easter':
                this.drawEasterEggs(decorationOffset);
                break;
            case 'spring':
                this.drawFlowerPetals(decorationOffset);
                break;
            case 'autumn':
                this.drawFallingLeaves(decorationOffset);
                break;
        }
    }
    
    drawSnowflakes(offsetX) {
        this.ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 20; i++) {
            const x = (offsetX + i * 100) % (this.canvas.width + 200) - 100;
            const y = (i * 47 + Date.now() * 0.03) % this.canvas.height;
            
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(Date.now() * 0.001 + i);
            
            for (let j = 0; j < 6; j++) {
                this.ctx.save();
                this.ctx.rotate((j * Math.PI) / 3);
                this.ctx.fillRect(-1, -6, 2, 12);
                this.ctx.fillRect(-3, -1, 6, 2);
                this.ctx.restore();
            }
            this.ctx.restore();
        }
    }
    
    drawBats(offsetX) {
        this.ctx.fillStyle = '#2E2E2E';
        for (let i = 0; i < 6; i++) {
            const x = (offsetX + i * 200) % (this.canvas.width + 400) - 200;
            const y = this.canvas.height * 0.3 + Math.sin(Date.now() * 0.002 + i) * 40;
            
            this.ctx.save();
            this.ctx.translate(x, y);
            
            // Bat body
            this.ctx.fillRect(-2, -1, 4, 8);
            
            // Animated wings
            const wingFlap = Math.sin(Date.now() * 0.01) * 0.3;
            this.ctx.save();
            this.ctx.rotate(-wingFlap);
            this.ctx.beginPath();
            this.ctx.ellipse(-6, 0, 4, 3, 0, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.restore();
            
            this.ctx.save();
            this.ctx.rotate(wingFlap);
            this.ctx.beginPath();
            this.ctx.ellipse(6, 0, 4, 3, 0, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.restore();
            
            this.ctx.restore();
        }
    }
    
    drawStars(offsetX) {
        this.ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 15; i++) {
            const x = (offsetX * 0.3 + i * 80) % (this.canvas.width + 160) - 80;
            const y = this.canvas.height * 0.2 + Math.sin(i * 0.5) * 30;
            this.drawStar(x, y, 6, 5);
        }
    }
    
    drawHearts(offsetX) {
        this.ctx.fillStyle = '#FF1493';
        for (let i = 0; i < 10; i++) {
            const x = (offsetX + i * 120) % (this.canvas.width + 240) - 120;
            const y = this.canvas.height * 0.3 + Math.sin(Date.now() * 0.001 + i) * 60;
            this.drawHeart(x, y, 10);
        }
    }
    
    drawEasterEggs(offsetX) {
        const colors = ['#FF69B4', '#00CED1', '#FFD700', '#32CD32', '#FF6347'];
        for (let i = 0; i < 6; i++) {
            const x = (offsetX + i * 180) % (this.canvas.width + 360) - 180;
            const y = this.canvas.height * 0.25 + Math.sin(Date.now() * 0.001 + i) * 40;
            
            this.ctx.fillStyle = colors[i % colors.length];
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 8, 12, 0, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }
    
    drawFlowerPetals(offsetX) {
        const colors = ['#FFB6C1', '#FFFF00', '#FF69B4', '#00FF7F'];
        for (let i = 0; i < 15; i++) {
            const x = (offsetX + i * 80) % (this.canvas.width + 160) - 80;
            const y = this.canvas.height * 0.6 + Math.sin(Date.now() * 0.002 + i) * 100;
            
            this.ctx.fillStyle = colors[i % colors.length];
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(Date.now() * 0.003 + i);
            this.ctx.beginPath();
            this.ctx.ellipse(0, -6, 4, 8, 0, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.restore();
        }
    }
    
    drawFallingLeaves(offsetX) {
        const colors = ['#FF4500', '#FFD700', '#8B4513', '#FF6347'];
        for (let i = 0; i < 12; i++) {
            const x = (offsetX + i * 100) % (this.canvas.width + 200) - 100;
            const y = (Date.now() * 0.03 + i * 50) % (this.canvas.height + 100);
            
            this.ctx.fillStyle = colors[i % colors.length];
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(Date.now() * 0.002 + i);
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, 6, 10, 0, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.restore();
        }
    }
    
    drawPipes() {
        for (const pipe of this.pipes) {
            if (pipe.x + this.settings.pipeWidth >= this.camera.x && pipe.x <= this.camera.x + this.canvas.width) {
                this.drawPipe(pipe);
            }
        }
    }
    
    drawPipe(pipe) {
        const colors = {
            body: '#5FAD56',
            dark: '#4A7C59',
            light: '#7DC46A'
        };
        
        const capHeight = 24;
        const capOverhang = 4;
        
        // Top pipe
        this.ctx.fillStyle = colors.body;
        this.ctx.fillRect(pipe.x, 0, this.settings.pipeWidth, pipe.topHeight - capHeight);
        
        // Top pipe highlights
        this.ctx.fillStyle = colors.light;
        this.ctx.fillRect(pipe.x, 0, 4, pipe.topHeight - capHeight);
        this.ctx.fillStyle = colors.dark;
        this.ctx.fillRect(pipe.x + this.settings.pipeWidth - 4, 0, 4, pipe.topHeight - capHeight);
        
        // Top pipe cap
        this.ctx.fillStyle = colors.body;
        this.ctx.fillRect(pipe.x - capOverhang, pipe.topHeight - capHeight, this.settings.pipeWidth + (capOverhang * 2), capHeight);
        
        // Bottom pipe
        this.ctx.fillStyle = colors.body;
        this.ctx.fillRect(pipe.x, pipe.bottomY + capHeight, this.settings.pipeWidth, this.canvas.height - pipe.bottomY - capHeight);
        
        // Bottom pipe highlights
        this.ctx.fillStyle = colors.light;
        this.ctx.fillRect(pipe.x, pipe.bottomY + capHeight, 4, this.canvas.height - pipe.bottomY - capHeight);
        this.ctx.fillStyle = colors.dark;
        this.ctx.fillRect(pipe.x + this.settings.pipeWidth - 4, pipe.bottomY + capHeight, 4, this.canvas.height - pipe.bottomY - capHeight);
        
        // Bottom pipe cap
        this.ctx.fillStyle = colors.body;
        this.ctx.fillRect(pipe.x - capOverhang, pipe.bottomY, this.settings.pipeWidth + (capOverhang * 2), capHeight);
    }
    
    drawBird() {
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2);
        this.ctx.rotate(this.bird.rotation);
        
        const birdImage = this.audio.custom.birdImage || this.defaultBirdImage;
        this.ctx.drawImage(
            birdImage,
            -this.bird.width / 2,
            -this.bird.height / 2,
            this.bird.width,
            this.bird.height
        );
        
        this.ctx.restore();
    }
    
    // Helper drawing methods
    drawStar(x, y, radius, points) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.beginPath();
        
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points;
            const r = i % 2 === 0 ? radius : radius * 0.5;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }
    
    drawHeart(x, y, size) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(size / 10, size / 10);
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, 3);
        this.ctx.bezierCurveTo(-5, -2, -10, 1, 0, 10);
        this.ctx.bezierCurveTo(10, 1, 5, -2, 0, 3);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new FlappyBirdGame();
});
