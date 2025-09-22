/**
 * Flappy X Adventure Game
 * Features: Dynamic backgrounds, holiday themes, customizable assets, variable jump mechanics
 */

class FlappyBirdGame {
    constructor() {
        // Force cache refresh on mobile browsers
        this.forceCacheRefresh();
        
        // Initialize version management
        this.initializeVersion();
        
        // Core game elements
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.canvas || !this.ctx) {
            console.error('Canvas initialization failed');
            return;
        }
        
        // Game state
        this.gameState = 'menu'; // 'menu', 'playing', 'gameOver', 'paused'
        this.lastGameState = null; // For render optimization
        this.isPaused = false;
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('flappyBestScore')) || 0;
        
        // Game settings
        this.settings = {
            gravity: 0.4,
            jumpPower: { min: -8, max: -15 },
            birdSpeed: 4, // Increased from 2 for better responsiveness
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
        
        // Audio system with individual volume controls
        this.audio = {
            enabled: true,
            volumes: {
                master: parseFloat(localStorage.getItem('flappyMasterVolume')) || 100,
                music: parseFloat(localStorage.getItem('flappyMusicVolume')) || 30,
                tap: parseFloat(localStorage.getItem('flappyTapVolume')) || 70,
                crash: parseFloat(localStorage.getItem('flappyCrashVolume')) || 80,
                point: parseFloat(localStorage.getItem('flappyPointVolume')) || 60,
                powerup: parseFloat(localStorage.getItem('flappyPowerupVolume')) || 60
            },
            playing: false,
            sounds: { tap: null, crash: null, point: null, bgMusic: null },
            custom: { birdImage: null, tapSound: null, crashSound: null, pointSound: null, bgMusic: null },
            state: { 
                tapLastPlayed: 0, 
                crashLastPlayed: 0,
                pointLastPlayed: 0,
                currentTapAudio: null,
                currentCrashAudio: null,
                currentPointAudio: null
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
        
        // Score submission tracking
        this.currentGameSubmitted = false;
        
        // Pipe variation pattern control to avoid repetitive heights
        this.pipePattern = {
            lastBand: null,        // 'low' | 'mid' | 'high'
            consecutive: 0,        // how many consecutive in the same band
            zigzagActive: false,   // alternate high/low when active
            zigzagNextHigh: Math.random() < 0.5,
            lastPipeHeight: null,  // track last pipe height for immediate next pipe avoidance
            pipeCount: 0           // track total pipes created
        };
        
        // Easter egg power-up system
        this.powerUp = {
            active: false,
            startTime: 0,
            duration: 8000, // 8 seconds of EPIC power
            speedMultiplier: 6,
            canPhaseThrough: true,
            gracePipeAllowed: false, // Allow passing through first pipe after power-up ends
            gracePipeUsed: false,
            // Gradual slowdown system
            slowdownActive: false,
            slowdownStartTime: 0,
            slowdownDuration: 3000, // 3 seconds to return to normal speed
            currentSpeedMultiplier: 1,
            // Extended invincibility system
            extendedInvincibility: false,
            invincibilityPipesLeft: 0,
            invincibilityPipesTotal: 3, // 3 pipes of extended invincibility (increased for mobile)
            // Safe zone system for post-power-up
            safeZoneActive: false,
            safeZoneStartTime: 0,
            safeZoneDuration: 3000, // 3 seconds of no new pipes after power-up
            // Performance tracking for cleanup
            activeIntervals: [],
            activeTimeouts: [],
            activeOscillators: []
        };
        
        this.easterEggs = [];
        this.easterEggSpawnChance = 0.02; // Make easter egg rare: ~2% chance per eligible group
        this.lastEasterEggSpawnTime = 0; // cooldown timer to prevent frequent spawns
        
        // Moving pipe system
        this.movingPipes = [];
        this.movingPipeSpawnChance = 0.15; // 15% chance per regular pipe
        this.movingPipeSpeed = 1.5; // Vertical movement speed
        
        // Sonic power-up music
        this.sonicMusic = null;
        this.loadSonicMusic();
        
        // Volume preview system
        this.volumePreviewTimeout = null;
        this.volumePreviewAudio = null;
        
        // Global leaderboard system
        this.leaderboard = new GlobalLeaderboard();
        
        // Analytics tracking
        this.analytics = this.leaderboard.analytics;
        
        this.init();
    }
    
    loadSonicMusic() {
        // Load the Sonic "Gotta Go Fast" music
        this.sonicMusic = new Audio('Gotta Go Fast (Sonic Theme) - MLG Sound Effect (HD) ( 160kbps ).mp3');
        this.sonicMusic.volume = this.getEffectiveVolume('powerup');
        this.sonicMusic.loop = false; // Play once during power-up
        
        // Add comprehensive error handling and debugging
        this.sonicMusic.addEventListener('error', (e) => {
            console.error('❌ Sonic music failed to load:', e);
            console.log('Trying to load from:', this.sonicMusic.src);
            this.sonicMusic = null;
        });
        
        this.sonicMusic.addEventListener('canplaythrough', () => {
            console.log('✅ Sonic music loaded successfully!');
        });
        
        this.sonicMusic.addEventListener('loadstart', () => {
            console.log('🔄 Started loading Sonic music...');
        });
        
        this.sonicMusic.addEventListener('loadeddata', () => {
            console.log('📁 Sonic music data loaded');
        });
    }
    
    init() {
        this.setupCanvas();
        this.createDefaultAssets();
        this.setupEventListeners();
        this.initializeUI();
        this.initializeLeaderboard();
        this.optimizeForDevice();
        this.startGameLoop();
        this.startBackgroundMusic();
    }
    
    optimizeForDevice() {
        // Detect device performance and optimize accordingly
        const screenWidth = window.innerWidth;
        const pixelRatio = window.devicePixelRatio || 1;
        const isMobile = screenWidth <= 768 || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
        const isLowEnd = pixelRatio < 2 && (screenWidth * window.innerHeight) < (1280 * 720);
        
        // Performance optimizations for different devices
        if (isMobile) {
            // Mobile optimizations
            this.canvas.style.touchAction = 'manipulation';
            
            if (isLowEnd) {
                // Low-end device optimizations
                this.canvas.style.imageRendering = 'pixelated';
                this.settings.gravity *= 0.9; // Slightly easier physics
                this.settings.pipeSpeed *= 0.9; // Slightly slower pipes
            }
        }
        
        // Reduce frame rate for very low-end devices (but not too much)
        if (isLowEnd && pixelRatio < 1.5) {
            this.targetFPS = 50; // Increased from 45 for smoother movement
        } else {
            this.targetFPS = 60;
        }
        
        // Set up frame rate limiting
        this.frameInterval = 1000 / this.targetFPS;
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        
        // Performance monitoring for automatic quality adjustment
        this.performanceMonitor = {
            frameCount: 0,
            lagFrames: 0,
            lastPerformanceCheck: Date.now(),
            performanceCheckInterval: 5000, // Check every 5 seconds
            maxLagFrames: 50, // If more than 50 lag frames in 5 seconds, reduce quality
            qualityReduced: false
        };
        
        // Store optimization flags for later use
        this.deviceOptimization = {
            isMobile,
            isLowEnd,
            reduceDetails: isLowEnd,
            simplifyBackground: isLowEnd && pixelRatio < 1.5
        };
        
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Position bird
        this.bird.x = this.canvas.width * 0.15;
        this.bird.y = this.canvas.height / 2;
        
        // Scale for different screen sizes with mobile-specific bird scaling
        const scale = Math.max(Math.min(this.canvas.width / 800, this.canvas.height / 600), 0.5);
        
        // Mobile gets 2x bigger bird for better visibility and touch control
        const isMobile = window.innerWidth <= 768;
        const birdScale = isMobile ? scale * 2 : scale;
        
        this.bird.width = 50 * birdScale; // 2x bigger on mobile
        this.bird.height = 40 * birdScale; // 2x bigger on mobile
        
        this.settings.pipeWidth = Math.max(60 * scale, 40);
        this.settings.pipeGap = Math.max(250 * scale, 180);
        
        window.addEventListener('resize', () => this.setupCanvas());
    }
    
    createDefaultAssets() {
        // Create realistic bird sprite with animation frames
        this.birdFrames = [];
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameDelay = 8; // Change frame every 8 game loops
        
        // Create 3 frames for wing flapping animation
        for (let frame = 0; frame < 3; frame++) {
            const birdCanvas = document.createElement('canvas');
            birdCanvas.width = 50;
            birdCanvas.height = 40;
            const ctx = birdCanvas.getContext('2d');
            
            this.drawFunnyBird(ctx, frame);
            this.birdFrames.push(birdCanvas);
        }
        
        // Set default to first frame
        this.defaultBirdImage = this.birdFrames[0];
        
        // Create default sounds
        this.createDefaultSounds();
    }
    
    drawFunnyBird(ctx, frame) {
        ctx.clearRect(0, 0, 50, 40);
        
        // Funny bird body (chubby oval with bright colors)
        ctx.fillStyle = '#FF69B4'; // Hot pink body!
        ctx.beginPath();
        ctx.ellipse(25, 25, 14, 10, 0, 0, Math.PI * 2); // Chubby!
        ctx.fill();
        
        // Body stripes (silly pattern)
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(25, 22, 8, 0, Math.PI);
        ctx.arc(25, 26, 6, 0, Math.PI);
        ctx.stroke();
        
        // Giant comedic head
        ctx.fillStyle = '#00FFFF'; // Cyan head!
        ctx.beginPath();
        ctx.arc(35, 18, 10, 0, Math.PI * 2); // Bigger head
        ctx.fill();
        
        // Ridiculous oversized beak
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.moveTo(44, 18);
        ctx.lineTo(52, 15); // Extra long beak
        ctx.lineTo(52, 21);
        ctx.lineTo(44, 22);
        ctx.closePath();
        ctx.fill();
        
        // Beak highlight (shiny)
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.moveTo(46, 17);
        ctx.lineTo(49, 16);
        ctx.lineTo(49, 18);
        ctx.closePath();
        ctx.fill();
        
        // HUGE googly eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(32, 15, 4, 0, Math.PI * 2); // Left eye
        ctx.arc(38, 15, 4, 0, Math.PI * 2); // Right eye
        ctx.fill();
        
        // Crazy pupils that change with animation frame
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        if (frame === 0) {
            // Cross-eyed look
            ctx.arc(34, 15, 2, 0, Math.PI * 2); // Left pupil right
            ctx.arc(36, 15, 2, 0, Math.PI * 2); // Right pupil left
        } else if (frame === 1) {
            // Normal look
            ctx.arc(32, 15, 2, 0, Math.PI * 2);
            ctx.arc(38, 15, 2, 0, Math.PI * 2);
        } else {
            // Derp look
            ctx.arc(30, 16, 2, 0, Math.PI * 2); // Left pupil down-left
            ctx.arc(40, 14, 2, 0, Math.PI * 2); // Right pupil up-right
        }
        ctx.fill();
        
        // Silly eyebrows
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(28, 11);
        ctx.lineTo(36, 9); // Angry eyebrow
        ctx.moveTo(34, 9);
        ctx.lineTo(42, 11); // Other eyebrow
        ctx.stroke();
        
        // Ridiculous wing animation
        if (frame === 0) {
            // Wings way up (excited)
            ctx.fillStyle = '#32CD32'; // Lime green wings
            ctx.beginPath();
            ctx.ellipse(18, 18, 10, 5, -0.8, 0, Math.PI * 2);
            ctx.fill();
            
            // Wing spots
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(15, 17, 2, 0, Math.PI * 2);
            ctx.arc(19, 20, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (frame === 1) {
            // Wings middle (normal-ish)
            ctx.fillStyle = '#32CD32';
            ctx.beginPath();
            ctx.ellipse(20, 25, 9, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Wing spots
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(17, 24, 2, 0, Math.PI * 2);
            ctx.arc(21, 26, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Wings way down (dramatic)
            ctx.fillStyle = '#32CD32';
            ctx.beginPath();
            ctx.ellipse(18, 32, 10, 5, 0.8, 0, Math.PI * 2);
            ctx.fill();
            
            // Wing spots
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(15, 33, 2, 0, Math.PI * 2);
            ctx.arc(19, 30, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Crazy tail feathers (rainbow!)
        const tailColors = ['#FF0000', '#FFA500', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'];
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = tailColors[i];
            ctx.beginPath();
            ctx.ellipse(8 + i, 25 + Math.sin(frame + i) * 2, 3, 1.5, 0.3 + i * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Belly button (why not?)
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.arc(25, 28, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Ridiculous chicken feet
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Left foot
        ctx.moveTo(22, 35);
        ctx.lineTo(18, 39);
        ctx.moveTo(22, 35);
        ctx.lineTo(22, 39);
        ctx.moveTo(22, 35);
        ctx.lineTo(26, 39);
        // Right foot
        ctx.moveTo(28, 35);
        ctx.lineTo(24, 39);
        ctx.moveTo(28, 35);
        ctx.lineTo(28, 39);
        ctx.moveTo(28, 35);
        ctx.lineTo(32, 39);
        ctx.stroke();
        
        // Silly hat (frame-dependent)
        if (frame === 0) {
            // Party hat
            ctx.fillStyle = '#FF1493';
            ctx.beginPath();
            ctx.moveTo(35, 8);
            ctx.lineTo(30, 2);
            ctx.lineTo(40, 2);
            ctx.closePath();
            ctx.fill();
            
            // Pom pom
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.arc(35, 2, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (frame === 1) {
            // Top hat
            ctx.fillStyle = '#000000';
            ctx.fillRect(32, 3, 6, 8);
            ctx.fillRect(30, 10, 10, 2);
        } else {
            // Propeller hat
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(33, 6, 4, 3);
            
            // Spinning propeller
            ctx.strokeStyle = '#C0C0C0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(25, 7.5);
            ctx.lineTo(45, 7.5);
            ctx.stroke();
        }
    }
    
    createDefaultSounds() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Mobile-specific audio context handling
            if (this.audioContext.state === 'suspended') {
            }
            
            // Ensure audio context works on mobile
            const resumeAudioContext = () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume().then(() => {
                    });
                }
            };
            
            // Resume audio context on first user interaction (mobile requirement)
            document.addEventListener('touchstart', resumeAudioContext, { once: true });
            document.addEventListener('click', resumeAudioContext, { once: true });
            
        } catch (error) {
            console.error('❌ Failed to create audio context:', error);
            this.audioContext = null;
        }
        
        // Load Super Mario laugh as default tap sound
        this.loadMarioTapSound();
        
        // Default crash sound (3 seconds) - same as previous version
        this.audio.sounds.crash = this.createNoiseSound(3.0);
        
        // Default point sound - cheerful beep
        this.audio.sounds.point = this.createPointSound();
        
        // Default background music - full melody (ensure it works on mobile)
        if (this.audioContext) {
            this.audio.sounds.bgMusic = this.createMelodySound();
        } else {
            console.warn('⚠️ Cannot create background music - no audio context');
            this.audio.sounds.bgMusic = null;
        }
    }
    
    loadMarioTapSound() {
        // Load Super Mario laugh sound with comprehensive fallback system
        
        // Try the simple filename first (no spaces)
        const marioLaugh = new Audio('mario-laugh.mp3');
        marioLaugh.volume = this.getEffectiveVolume('tap');
        marioLaugh.preload = 'auto';
        
        let isLoaded = false;
        
        // Set up the tap sound function
        this.audio.sounds.tap = () => {
            if (isLoaded && marioLaugh.readyState >= 2) {
                const marioClone = marioLaugh.cloneNode();
                marioClone.volume = this.getEffectiveVolume('tap');
                marioClone.currentTime = 0;
                marioClone.play().catch(error => {
                    console.log('Mario laugh failed, using fallback beep');
                    this.createBeepSound(800, 3.0)();
                });
            } else {
                console.log('Mario laugh not ready, using fallback beep');
                this.createBeepSound(800, 3.0)();
            }
        };
        
        // Success handler
        marioLaugh.addEventListener('canplaythrough', () => {
            console.log('✅ Mario laugh loaded successfully!');
            isLoaded = true;
        });
        
        marioLaugh.addEventListener('loadeddata', () => {
            console.log('📁 Mario laugh data loaded');
            isLoaded = true;
        });
        
        // Error handler - try original filename with spaces
        marioLaugh.addEventListener('error', (e) => {
            console.warn('⚠️ Simple filename failed, trying original filename...');
            
            const marioLaughOriginal = new Audio('Super mario laugh Sound Effects.mp3');
            marioLaughOriginal.volume = this.getEffectiveVolume('tap');
            marioLaughOriginal.preload = 'auto';
            
            marioLaughOriginal.addEventListener('canplaythrough', () => {
                console.log('✅ Mario laugh loaded with original filename!');
                isLoaded = true;
                
                // Update the tap sound to use the working audio
                this.audio.sounds.tap = () => {
                    if (marioLaughOriginal.readyState >= 2) {
                        const clone = marioLaughOriginal.cloneNode();
                        clone.volume = this.getEffectiveVolume('tap');
                        clone.currentTime = 0;
                        clone.play().catch(() => {
                            this.createBeepSound(800, 3.0)();
                        });
                    } else {
                        this.createBeepSound(800, 3.0)();
                    }
                };
            });
            
            marioLaughOriginal.addEventListener('error', (e2) => {
                console.error('❌ Both Mario laugh filenames failed:', e2);
                console.log('🔊 Using synthesized beep as permanent fallback');
                this.audio.sounds.tap = this.createBeepSound(800, 3.0);
            });
            
            marioLaughOriginal.load();
        });
        
        // Start loading
        marioLaugh.load();
    }
    
    createBeepSound(frequency, duration) {
        return () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Create an EPIC, adrenaline-pumping tap sound!
            const osc1 = this.audioContext.createOscillator(); // Power chord root
            const osc2 = this.audioContext.createOscillator(); // Perfect fifth
            const osc3 = this.audioContext.createOscillator(); // Octave
            const osc4 = this.audioContext.createOscillator(); // Sub bass for punch
            
            const gain1 = this.audioContext.createGain();
            const gain2 = this.audioContext.createGain();
            const gain3 = this.audioContext.createGain();
            const gain4 = this.audioContext.createGain();
            const masterGain = this.audioContext.createGain();
            
            // Add multiple delay nodes for epic reverb
            const delay1 = this.audioContext.createDelay();
            const delay2 = this.audioContext.createDelay();
            const delayGain1 = this.audioContext.createGain();
            const delayGain2 = this.audioContext.createGain();
            
            delay1.delayTime.setValueAtTime(0.08, this.audioContext.currentTime);
            delay2.delayTime.setValueAtTime(0.15, this.audioContext.currentTime);
            delayGain1.gain.setValueAtTime(0.4, this.audioContext.currentTime);
            delayGain2.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            
            // Epic power chord frequencies
            osc1.frequency.value = frequency; // Root note
            osc2.frequency.value = frequency * 1.5; // Perfect fifth (power chord!)
            osc3.frequency.value = frequency * 2; // Octave for brightness
            osc4.frequency.value = frequency * 0.5; // Sub bass for PUNCH
            
            // Wave types for maximum impact
            osc1.type = 'sawtooth'; // Aggressive main tone
            osc2.type = 'square'; // Punchy fifth
            osc3.type = 'triangle'; // Bright octave
            osc4.type = 'sine'; // Deep sub bass
            
            // Connect oscillators
            osc1.connect(gain1);
            osc2.connect(gain2);
            osc3.connect(gain3);
            osc4.connect(gain4);
            
            // Mix for pleasant impact (reduced volume)
            gain1.gain.setValueAtTime(0.2, this.audioContext.currentTime); // Reduced root
            gain2.gain.setValueAtTime(0.12, this.audioContext.currentTime); // Reduced fifth
            gain3.gain.setValueAtTime(0.08, this.audioContext.currentTime); // Reduced top
            gain4.gain.setValueAtTime(0.15, this.audioContext.currentTime); // Reduced bass
            
            // Connect to master with epic reverb
            gain1.connect(masterGain);
            gain2.connect(masterGain);
            gain3.connect(masterGain);
            gain4.connect(masterGain);
            
            // Epic reverb chain
            gain1.connect(delay1);
            delay1.connect(delayGain1);
            delayGain1.connect(delay2);
            delay2.connect(delayGain2);
            delayGain2.connect(masterGain);
            
            masterGain.connect(this.audioContext.destination);
            
            // Pleasant envelope for musical feedback with volume control
            const effectiveVolume = this.getEffectiveVolume('tap');
            masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            masterGain.gain.linearRampToValueAtTime(0.4 * effectiveVolume, this.audioContext.currentTime + 0.02); // Gentler attack
            masterGain.gain.exponentialRampToValueAtTime(0.25 * effectiveVolume, this.audioContext.currentTime + 0.08); // Moderate sustain
            masterGain.gain.exponentialRampToValueAtTime(0.15 * effectiveVolume, this.audioContext.currentTime + 0.3); // Maintain presence
            masterGain.gain.exponentialRampToValueAtTime(0.01 * effectiveVolume, this.audioContext.currentTime + duration); // Smooth fade
            
            // Launch all oscillators for MAXIMUM IMPACT!
            const startTime = this.audioContext.currentTime;
            osc1.start(startTime);
            osc2.start(startTime);
            osc3.start(startTime);
            osc4.start(startTime);
            
            osc1.stop(startTime + duration);
            osc2.stop(startTime + duration);
            osc3.stop(startTime + duration);
            osc4.stop(startTime + duration);
        };
    }
    
    createNoiseSound(duration) {
        return () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Create an EPIC CRASH sound that gives MAXIMUM adrenaline rush!
            const crashOsc1 = this.audioContext.createOscillator(); // Deep doom note
            const crashOsc2 = this.audioContext.createOscillator(); // Dissonant clash
            const crashOsc3 = this.audioContext.createOscillator(); // High tension
            const crashOsc4 = this.audioContext.createOscillator(); // Ultra sub bass
            
            const gain1 = this.audioContext.createGain();
            const gain2 = this.audioContext.createGain();
            const gain3 = this.audioContext.createGain();
            const gain4 = this.audioContext.createGain();
            const masterGain = this.audioContext.createGain();
            
            // Create EXPLOSIVE noise burst
            const bufferSize = this.audioContext.sampleRate * 0.5;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                // Chaotic noise with impact
                output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // Fade noise over time
            }
            
            const noiseSource = this.audioContext.createBufferSource();
            const noiseGain = this.audioContext.createGain();
            const distortion = this.audioContext.createWaveShaper();
            
            // Add distortion for EPIC crash effect
            const samples = 44100;
            const curve = new Float32Array(samples);
            for (let i = 0; i < samples; i++) {
                const x = (i * 2) / samples - 1;
                curve[i] = ((3 + 20) * x * 20 * Math.PI / 180) / (Math.PI + 20 * Math.abs(x));
            }
            distortion.curve = curve;
            
            noiseSource.buffer = buffer;
            noiseSource.connect(distortion);
            distortion.connect(noiseGain);
            noiseGain.connect(masterGain);
            
            // DRAMATIC descending chord of DOOM!
            crashOsc1.frequency.setValueAtTime(110, this.audioContext.currentTime); // Low A
            crashOsc1.frequency.exponentialRampToValueAtTime(55, this.audioContext.currentTime + duration); // Drop an octave!
            crashOsc1.type = 'sawtooth';
            crashOsc1.connect(gain1);
            
            crashOsc2.frequency.setValueAtTime(146.83, this.audioContext.currentTime); // Dissonant D
            crashOsc2.frequency.exponentialRampToValueAtTime(73.42, this.audioContext.currentTime + duration); // Doom descent
            crashOsc2.type = 'square';
            crashOsc2.connect(gain2);
            
            crashOsc3.frequency.setValueAtTime(220, this.audioContext.currentTime); // High tension A
            crashOsc3.frequency.exponentialRampToValueAtTime(110, this.audioContext.currentTime + duration); // Fall to doom
            crashOsc3.type = 'triangle';
            crashOsc3.connect(gain3);
            
            crashOsc4.frequency.setValueAtTime(55, this.audioContext.currentTime); // ULTRA SUB BASS
            crashOsc4.frequency.exponentialRampToValueAtTime(27.5, this.audioContext.currentTime + duration); // Earthquake low
            crashOsc4.type = 'sine';
            crashOsc4.connect(gain4);
            
            // Mix for CATASTROPHIC impact
            gain1.gain.setValueAtTime(0.25, this.audioContext.currentTime);
            gain2.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gain3.gain.setValueAtTime(0.15, this.audioContext.currentTime);
            gain4.gain.setValueAtTime(0.3, this.audioContext.currentTime); // MASSIVE sub bass
            noiseGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            
            gain1.connect(masterGain);
            gain2.connect(masterGain);
            gain3.connect(masterGain);
            gain4.connect(masterGain);
            
            masterGain.connect(this.audioContext.destination);
            
            // CATASTROPHIC envelope with volume control - INSTANT DOOM!
            const effectiveVolume = this.getEffectiveVolume('crash');
            masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            masterGain.gain.linearRampToValueAtTime(1.2 * effectiveVolume, this.audioContext.currentTime + 0.02); // MASSIVE IMPACT!
            masterGain.gain.exponentialRampToValueAtTime(0.4 * effectiveVolume, this.audioContext.currentTime + 0.1); // Sustain the doom
            masterGain.gain.exponentialRampToValueAtTime(0.1 * effectiveVolume, this.audioContext.currentTime + 0.8); // Slow fade of despair
            masterGain.gain.exponentialRampToValueAtTime(0.01 * effectiveVolume, this.audioContext.currentTime + duration); // Final silence
            
            // UNLEASH THE CHAOS!
            const startTime = this.audioContext.currentTime;
            crashOsc1.start(startTime);
            crashOsc2.start(startTime);
            crashOsc3.start(startTime);
            crashOsc4.start(startTime);
            noiseSource.start(startTime);
            
            crashOsc1.stop(startTime + duration);
            crashOsc2.stop(startTime + duration);
            crashOsc3.stop(startTime + duration);
            crashOsc4.stop(startTime + duration);
        };
    }
    
    createPointSound() {
        return () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Create a cheerful, satisfying point sound
            const osc1 = this.audioContext.createOscillator(); // Main melody
            const osc2 = this.audioContext.createOscillator(); // Harmony
            const osc3 = this.audioContext.createOscillator(); // Sparkle
            
            const gain1 = this.audioContext.createGain();
            const gain2 = this.audioContext.createGain();
            const gain3 = this.audioContext.createGain();
            const masterGain = this.audioContext.createGain();
            
            // Connect oscillators
            osc1.connect(gain1);
            osc2.connect(gain2);
            osc3.connect(gain3);
            gain1.connect(masterGain);
            gain2.connect(masterGain);
            gain3.connect(masterGain);
            masterGain.connect(this.audioContext.destination);
            
            // Cheerful ascending melody
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
            osc1.frequency.setValueAtTime(659.25, this.audioContext.currentTime + 0.1); // E5
            osc1.frequency.setValueAtTime(783.99, this.audioContext.currentTime + 0.2); // G5
            
            // Harmony note
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(392.00, this.audioContext.currentTime); // G4
            osc2.frequency.setValueAtTime(523.25, this.audioContext.currentTime + 0.1); // C5
            osc2.frequency.setValueAtTime(659.25, this.audioContext.currentTime + 0.2); // E5
            
            // Sparkle effect
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(1046.50, this.audioContext.currentTime); // C6
            osc3.frequency.setValueAtTime(1318.51, this.audioContext.currentTime + 0.15); // E6
            
            // Volume envelopes for smooth sound (10x louder)
            const effectiveVolume = this.getEffectiveVolume('point');
            gain1.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain1.gain.linearRampToValueAtTime(3.0 * effectiveVolume, this.audioContext.currentTime + 0.05);
            gain1.gain.exponentialRampToValueAtTime(1.0 * effectiveVolume, this.audioContext.currentTime + 0.3);
            gain1.gain.exponentialRampToValueAtTime(0.1 * effectiveVolume, this.audioContext.currentTime + 1.0);
            
            gain2.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain2.gain.linearRampToValueAtTime(2.0 * effectiveVolume, this.audioContext.currentTime + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.5 * effectiveVolume, this.audioContext.currentTime + 0.3);
            gain2.gain.exponentialRampToValueAtTime(0.1 * effectiveVolume, this.audioContext.currentTime + 1.0);
            
            gain3.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain3.gain.linearRampToValueAtTime(1.5 * effectiveVolume, this.audioContext.currentTime + 0.1);
            gain3.gain.exponentialRampToValueAtTime(0.1 * effectiveVolume, this.audioContext.currentTime + 0.25);
            gain3.gain.exponentialRampToValueAtTime(0.01 * effectiveVolume, this.audioContext.currentTime + 1.0);
            
            masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            masterGain.gain.linearRampToValueAtTime(10.0 * effectiveVolume, this.audioContext.currentTime + 0.02);
            masterGain.gain.exponentialRampToValueAtTime(0.1 * effectiveVolume, this.audioContext.currentTime + 1.0);
            
            // Play the sound
            const startTime = this.audioContext.currentTime;
            osc1.start(startTime);
            osc2.start(startTime);
            osc3.start(startTime);
            
            osc1.stop(startTime + 1.0);
            osc2.stop(startTime + 1.0);
            osc3.stop(startTime + 1.0);
        };
    }
    
    createMelodySound() {
        // EPIC ADVENTURE MUSIC for maximum adrenaline!
        const epicMelody = [
            { note: 659.25, chord: [659.25, 783.99, 987.77, 1318.51] }, // E major - HEROIC!
            { note: 698.46, chord: [698.46, 880.00, 1046.50, 1396.91] }, // F major - RISING!
            { note: 783.99, chord: [783.99, 987.77, 1174.66, 1567.98] }, // G major - EPIC!
            { note: 659.25, chord: [659.25, 783.99, 987.77, 1318.51] }, // E major - RETURN!
            { note: 880.00, chord: [880.00, 1046.50, 1318.51, 1760.00] }, // A major - CLIMAX!
            { note: 783.99, chord: [783.99, 987.77, 1174.66, 1567.98] }, // G major - POWER!
            { note: 698.46, chord: [698.46, 880.00, 1046.50, 1396.91] }, // F major - BUILDING!
            { note: 659.25, chord: [659.25, 783.99, 987.77, 1318.51] }  // E major - VICTORY!
        ];
        
        let currentChord = 0;
        let melodyInterval;
        let bassInterval;
        let percussionInterval;

        // Start all melody/bass/percussion intervals (closure-local to keep references)
        const startMelodyIntervals = () => {
                
                // EPIC melody line with POWER!
                melodyInterval = setInterval(() => {
                    if (this.audio.enabled && this.getEffectiveVolume('music') > 0) {
                        const chordData = epicMelody[currentChord];
                        const volume = this.getEffectiveVolume('music') * 0.12; // Louder for EPIC feel!
                        
                        // Play POWERFUL melody note
                        const melodyOsc = this.audioContext.createOscillator();
                        const melodyGain = this.audioContext.createGain();
                        const melodyFilter = this.audioContext.createBiquadFilter();
                        const melodyDistortion = this.audioContext.createWaveShaper();
                        
                        // Add slight distortion for EPIC sound
                        const curve = new Float32Array(256);
                        for (let i = 0; i < 256; i++) {
                            const x = (i - 128) / 128;
                            curve[i] = Math.tanh(x * 2); // Soft distortion
                        }
                        melodyDistortion.curve = curve;
                        
                        melodyFilter.type = 'bandpass';
                        melodyFilter.frequency.setValueAtTime(chordData.note * 2, this.audioContext.currentTime);
                        melodyFilter.Q.setValueAtTime(3, this.audioContext.currentTime);
                        
                        melodyOsc.frequency.value = chordData.note;
                        melodyOsc.type = 'sawtooth'; // More aggressive for EPIC feel
                        melodyOsc.connect(melodyDistortion);
                        melodyDistortion.connect(melodyFilter);
                        melodyFilter.connect(melodyGain);
                        melodyGain.connect(this.audioContext.destination);
                        
                        melodyGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                        melodyGain.gain.linearRampToValueAtTime(volume * 2, this.audioContext.currentTime + 0.01); // EXPLOSIVE attack!
                        melodyGain.gain.exponentialRampToValueAtTime(volume, this.audioContext.currentTime + 0.05);
                        melodyGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
                        
                        melodyOsc.start(this.audioContext.currentTime);
                        melodyOsc.stop(this.audioContext.currentTime + 0.4);
                        
                        // EPIC harmony chord burst!
                        chordData.chord.forEach((freq, index) => {
                            if (index > 0) {
                                setTimeout(() => {
                                    const harmonyOsc = this.audioContext.createOscillator();
                                    const harmonyGain = this.audioContext.createGain();
                                    
                                    harmonyOsc.frequency.value = freq;
                                    harmonyOsc.type = 'triangle';
                                    harmonyOsc.connect(harmonyGain);
                                    harmonyGain.connect(this.audioContext.destination);
                                    
                                    harmonyGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                                    harmonyGain.gain.linearRampToValueAtTime(volume * 0.4, this.audioContext.currentTime + 0.02);
                                    harmonyGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                                    
                                    harmonyOsc.start(this.audioContext.currentTime);
                                    harmonyOsc.stop(this.audioContext.currentTime + 0.3);
                                }, index * 20); // Rapid arpeggio for EPIC effect!
                            }
                        });
                        
                        currentChord = (currentChord + 1) % epicMelody.length;
                    }
                }, 400); // Faster tempo for ADRENALINE!
                
                // POWERFUL bass line for EPIC foundation
                bassInterval = setInterval(() => {
                    if (this.audio.enabled && this.getEffectiveVolume('music') > 0) {
                        const bassNote = epicMelody[Math.floor(currentChord / 2) % epicMelody.length].chord[0] / 4; // Two octaves down for POWER
                        const volume = this.getEffectiveVolume('music') * 0.1; // Strong bass
                        
                        const bassOsc = this.audioContext.createOscillator();
                        const bassGain = this.audioContext.createGain();
                        const bassFilter = this.audioContext.createBiquadFilter();
                        
                        bassFilter.type = 'lowpass';
                        bassFilter.frequency.setValueAtTime(200, this.audioContext.currentTime); // Deep bass only
                        
                        bassOsc.frequency.value = bassNote;
                        bassOsc.type = 'sawtooth'; // Aggressive bass
                        bassOsc.connect(bassFilter);
                        bassFilter.connect(bassGain);
                        bassGain.connect(this.audioContext.destination);
                        
                        bassGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                        bassGain.gain.linearRampToValueAtTime(volume * 1.5, this.audioContext.currentTime + 0.02); // PUNCHY attack
                        bassGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
                        
                        bassOsc.start(this.audioContext.currentTime);
                        bassOsc.stop(this.audioContext.currentTime + 0.8);
                    }
                }, 800); // Driving rhythm for EPIC adventure!
                
                // Add EPIC percussion for adrenaline rush!
                percussionInterval = setInterval(() => {
                    if (this.audio.enabled && this.getEffectiveVolume('music') > 0) {
                        const volume = this.getEffectiveVolume('music') * 0.06;
                        
                        // Create kick drum effect
                        const kickOsc = this.audioContext.createOscillator();
                        const kickGain = this.audioContext.createGain();
                        
                        kickOsc.frequency.setValueAtTime(60, this.audioContext.currentTime); // Deep kick
                        kickOsc.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.1);
                        kickOsc.type = 'sine';
                        kickOsc.connect(kickGain);
                        kickGain.connect(this.audioContext.destination);
                        
                        kickGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                        kickGain.gain.linearRampToValueAtTime(volume * 2, this.audioContext.currentTime + 0.01); // PUNCH!
                        kickGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
                        
                        kickOsc.start(this.audioContext.currentTime);
                        kickOsc.stop(this.audioContext.currentTime + 0.15);
                    }
                }, 400); // Fast percussion for ADRENALINE!
        };

        return {
            start: () => {
                // Ensure audio context is ready (critical for mobile/PWA)
                if (!this.audioContext) {
                    console.warn('⚠️ No audio context available for background music');
                    return;
                }
                
                if (this.audioContext.state === 'suspended') {
                    console.log('🔊 Resuming audio context for melody...');
                    this.audioContext.resume().then(() => {
                        console.log('✅ Audio context resumed, starting melody');
                        startMelodyIntervals();
                    }).catch(e => {
                        console.error('❌ Failed to resume audio context for melody:', e);
                    });
                    return;
                }
                
                startMelodyIntervals();
            },
            stop: () => {
                if (melodyInterval) {
                    clearInterval(melodyInterval);
                }
                if (bassInterval) {
                    clearInterval(bassInterval);
                }
                if (percussionInterval) {
                    clearInterval(percussionInterval);
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
        
        // Add touch events to the entire document for start screen
        document.addEventListener('touchstart', (e) => {
            if (this.gameState === 'menu') {
                e.preventDefault();
                this.handleJumpStart();
            }
        });
        document.addEventListener('touchend', (e) => {
            if (this.gameState === 'menu') {
                e.preventDefault();
                this.handleJumpEnd();
            }
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
            pauseBtn: () => this.togglePause(),
            removeTapSound: () => this.removeCustomSound('tap'),
            removeCrashSound: () => this.removeCustomSound('crash'),
            removePointSound: () => this.removeCustomSound('point'),
            removeBgMusic: () => this.removeCustomSound('bgMusic'),
            saveNameBtn: () => this.savePlayerName(),
            refreshLeaderboard: () => this.refreshLeaderboard(),
        };
        
        // Setup volume sliders
        const volumeSliders = {
            masterVolumeSlider: (e) => this.updateVolume('master', parseInt(e.target.value)),
            musicVolumeSlider: (e) => this.updateVolume('music', parseInt(e.target.value)),
            tapVolumeSlider: (e) => this.updateVolume('tap', parseInt(e.target.value)),
            crashVolumeSlider: (e) => this.updateVolume('crash', parseInt(e.target.value)),
            pointVolumeSlider: (e) => this.updateVolume('point', parseInt(e.target.value)),
            powerupVolumeSlider: (e) => this.updateVolume('powerup', parseInt(e.target.value))
        };
        
        // Add click event listeners
        Object.entries(elements).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
            }
        });
        
        // Add volume slider event listeners with audio preview
        Object.entries(volumeSliders).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', (e) => {
                    handler(e);
                    // Play audio preview after volume change
                    this.playVolumePreview(id, parseInt(e.target.value));
                });
            }
        });
    }
    
    setupFileUploadListeners() {
        const uploads = {
            birdUpload: (file) => this.handleBirdUpload(file),
            tapSoundUpload: (file) => this.handleSoundUpload(file, 'tap'),
            crashSoundUpload: (file) => this.handleSoundUpload(file, 'crash'),
            pointSoundUpload: (file) => this.handleSoundUpload(file, 'point'),
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
        // Set initial volume slider values and displays
        Object.keys(this.audio.volumes).forEach(type => {
            const sliderId = `${type}VolumeSlider`;
            const displayId = `${type}VolumeDisplay`;
            
            const slider = document.getElementById(sliderId);
            const display = document.getElementById(displayId);
            
            if (slider) {
                slider.value = this.audio.volumes[type];
            }
            if (display) {
                display.textContent = `${this.audio.volumes[type]}%`;
            }
        });
        
        // Set other UI elements
        document.getElementById('bestScore').textContent = this.bestScore;
        document.getElementById('toggleMusic').textContent = this.audio.enabled ? '🔊 Music' : '🔇 Music';
        
        // Hide HUD initially (show only during gameplay)
        document.getElementById('gameHUD').style.display = 'none';
        
        // Initialize remove button states
        this.updateAllRemoveButtonStates();
        
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
        // Do nothing when paused - prevent jumping while paused
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
    
    togglePause() {
        if (this.gameState === 'playing' || this.gameState === 'paused') {
            this.isPaused = !this.isPaused;
            this.gameState = this.isPaused ? 'paused' : 'playing';
            
            const pauseBtn = document.getElementById('pauseBtn');
            if (pauseBtn) {
                pauseBtn.textContent = this.isPaused ? '▶️' : '⏸️';
                pauseBtn.title = this.isPaused ? 'Resume Game' : 'Pause Game';
            }
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.isPaused = false;
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        
        // Track game start
        if (this.analytics) {
            this.analytics.logEvent('game_started');
        }
        
        // Also track with Mixpanel
        if (typeof mixpanel !== 'undefined' && mixpanel.track) {
            mixpanel.track('game_started', {
                category: 'Game',
                label: 'Game Start',
                user_id: this.leaderboard.userId
            });
        }
        
        // Auto-close settings when game starts
        this.hideSettings();
        
        // Show pause button
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.classList.add('playing');
        }
        
        // Show the in-game HUD
        document.getElementById('gameHUD').style.display = 'block';
        
        // Ensure audio context is ready for mobile/PWA before starting music
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('✅ Audio context resumed for game start');
                if (!this.audio.playing) {
                    this.startBackgroundMusic();
                }
            });
        } else if (!this.audio.playing) {
            this.startBackgroundMusic();
        }
    }
    
    resetGame() {
        const scale = Math.max(Math.min(this.canvas.width / 800, this.canvas.height / 600), 0.5);
        
        // Mobile gets 2x bigger bird for better visibility and touch control
        const isMobile = window.innerWidth <= 768;
        const birdScale = isMobile ? scale * 2 : scale;
        
        // Reset score submission tracking for new game
        this.currentGameSubmitted = false;
        
        this.bird = {
            x: this.canvas.width * 0.15,
            y: this.canvas.height / 2,
            width: 50 * birdScale, // 2x bigger on mobile
            height: 40 * birdScale, // 2x bigger on mobile
            velocity: 0,
            rotation: 0
        };
        
        this.pipes = [];
        this.easterEggs = [];
        this.movingPipes = []; // New: moving single pipes
        this.score = 0;
        this.camera = { x: 0, y: 0 };
        
        // Reset pipe variation pattern control
        this.pipePattern = {
            lastBand: null,        // 'low' | 'mid' | 'high'
            consecutive: 0,        // how many consecutive in the same band
            zigzagActive: false,   // alternate high/low when active
            zigzagNextHigh: Math.random() < 0.5,
            lastPipeHeight: null,  // track last pipe height for immediate next pipe avoidance
            pipeCount: 0           // track total pipes created
        };
        
        // Reset power-up and clean up any remaining resources
        if (this.powerUp.active) {
            this.deactivatePowerUp();
        }
        
        // Force cleanup of any remaining power-up resources (safety net)
        this.powerUp.activeIntervals.forEach(interval => clearInterval(interval));
        this.powerUp.activeTimeouts.forEach(timeout => clearTimeout(timeout));
        this.powerUp.activeOscillators.forEach(osc => {
            try { osc.stop(); } catch (e) {}
        });
        this.powerUp.activeIntervals = [];
        this.powerUp.activeTimeouts = [];
        this.powerUp.activeOscillators = [];
        
        this.powerUp.gracePipeAllowed = false;
        this.powerUp.gracePipeUsed = false;
        this.powerUp.slowdownActive = false;
        this.powerUp.currentSpeedMultiplier = 1;
        this.powerUp.extendedInvincibility = false;
        this.powerUp.invincibilityPipesLeft = 0;
        this.powerUp.safeZoneActive = false;
        
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
    
    updateBirdAnimation() {
        // Animate wing flapping for default funny bird only
        if (!this.audio.custom.birdImage && this.birdFrames) {
            this.frameTimer++;
            
            // Funny bird has different expressions based on state
            let animationSpeed = this.frameDelay;
            
            if (this.bird.velocity < -5) {
                // Super excited jumping - very fast animation
                animationSpeed = 3;
            } else if (this.bird.velocity < -2) {
                // Normal jumping - fast animation  
                animationSpeed = Math.max(4, this.frameDelay - 2);
            } else if (this.bird.velocity > 5) {
                // Panic falling - frantic animation
                animationSpeed = 2;
            } else if (this.bird.velocity > 2) {
                // Normal falling - slower animation
                animationSpeed = this.frameDelay + 3;
            } else {
                // Cruising - normal speed
                animationSpeed = this.frameDelay;
            }
            
            if (this.frameTimer >= animationSpeed) {
                this.currentFrame = (this.currentFrame + 1) % this.birdFrames.length;
                this.frameTimer = 0;
                
                // Add random silly expressions occasionally
                if (Math.random() < 0.1) {
                    // 10% chance to show a random expression
                    this.currentFrame = Math.floor(Math.random() * this.birdFrames.length);
                }
            }
        }
    }
    
    updatePowerUpSpeed() {
        const now = Date.now();
        
        if (this.powerUp.active) {
            // During power-up: full speed
            this.powerUp.currentSpeedMultiplier = this.powerUp.speedMultiplier;
        } else if (this.powerUp.slowdownActive) {
            // During slowdown: gradually reduce speed
            const slowdownElapsed = now - this.powerUp.slowdownStartTime;
            const slowdownProgress = Math.min(slowdownElapsed / this.powerUp.slowdownDuration, 1);
            
            // Smooth easing function for natural deceleration
            const easeOut = 1 - Math.pow(1 - slowdownProgress, 3);
            
            // Interpolate from max speed to normal speed
            this.powerUp.currentSpeedMultiplier = this.powerUp.speedMultiplier - 
                (this.powerUp.speedMultiplier - 1) * easeOut;
            
            // End slowdown when we reach normal speed
            if (slowdownProgress >= 1) {
                this.powerUp.slowdownActive = false;
                this.powerUp.currentSpeedMultiplier = 1;
                console.log('🐦 Bird returned to normal speed');
            }
        } else {
            // Normal state: standard speed
            this.powerUp.currentSpeedMultiplier = 1;
        }
    }
    
    updateSafeZone() {
        // Check if safe zone should end
        if (this.powerUp.safeZoneActive) {
            const safeZoneElapsed = Date.now() - this.powerUp.safeZoneStartTime;
            
            if (safeZoneElapsed >= this.powerUp.safeZoneDuration) {
                this.powerUp.safeZoneActive = false;
                console.log('🛡️ Safe zone ended - pipe generation resumed');
            }
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Progressive difficulty (gravity stays constant for consistent controls)
        this.settings.gravity = this.difficulty.baseGravity; // Keep gravity constant
        this.settings.pipeSpeed = this.difficulty.basePipeSpeed + (this.score * 0.05);
        this.settings.pipeGap = Math.max(this.difficulty.basePipeGap - (this.score * 2), 220);
        
        // Update bird physics with delta time
        const smoothDelta = Math.max(0.5, Math.min(2.0, this.deltaTime || 1)); // Clamp delta
        this.bird.velocity += this.settings.gravity * smoothDelta;
        
        // Continuous jump boost while held
        if (this.jumpState.isPressed) {
            const holdTime = Date.now() - this.jumpState.pressTime;
            if (holdTime < this.jumpState.maxHoldTime) {
                this.bird.velocity -= 0.3 * smoothDelta;
            }
        }
        
        this.bird.y += this.bird.velocity * smoothDelta;
        
        // Apply power-up speed multiplier with gradual slowdown
        this.updatePowerUpSpeed();
        const currentBirdSpeed = this.settings.birdSpeed * this.powerUp.currentSpeedMultiplier;
        
        this.bird.x += currentBirdSpeed * smoothDelta;
        // Bird rotation - less tilting when falling for more vertical descent
        if (this.bird.velocity > 0) {
            // When falling, minimal rotation for straighter fall
            this.bird.rotation = Math.min(this.bird.velocity * 0.02, 0.15); // Much less rotation when falling
        } else {
            // When jumping, allow some upward tilt
            this.bird.rotation = Math.max(this.bird.velocity * 0.03, -0.3); // Slight upward tilt when jumping
        }
        
        // Update wing flapping animation
        this.updateBirdAnimation();
        
        // Update camera
        this.camera.x = this.bird.x - this.canvas.width * 0.3;
        
        // Generate pipes (respect safe zone after power-up)
        this.updateSafeZone();
        
        const pipeSpacing = Math.max(this.canvas.width * 0.5, 400);
        const shouldCreatePipe = this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < this.bird.x + this.canvas.width;
        
        if (shouldCreatePipe && !this.powerUp.safeZoneActive) {
            this.createPipe();
            
            // Occasionally create a moving pipe instead of regular pipes
            if (Math.random() < this.movingPipeSpawnChance) {
                this.createMovingPipe();
            }
        } else if (shouldCreatePipe && this.powerUp.safeZoneActive) {
            console.log('🛡️ Safe zone active - skipping pipe generation');
        }
        
        // Update pipes
        this.updatePipes();
        
        // Update moving pipes
        this.updateMovingPipes();
        
        // Update easter eggs
        this.updateEasterEggs();
        
        // Check power-up expiration (only end when safe)
        if (this.powerUp.active && Date.now() - this.powerUp.startTime > this.powerUp.duration) {
            if (this.isBirdInSafeArea()) {
                this.deactivatePowerUp();
            }
            // If not safe, power-up continues until bird reaches safe area
        }
        
        // Check collisions (skip pipe collision if phasing through)
        this.checkCollisions();
    }
    
    updatePipes() {
        // Calculate dynamic pipe speed based on difficulty (with maximum cap)
        const speedIncrease = this.score * 0.08;
        const maxSpeedIncrease = this.settings.pipeSpeed * 2; // Cap at 3x original speed
        const dynamicPipeSpeed = this.settings.pipeSpeed + Math.min(speedIncrease, maxSpeedIncrease);
        
        // Performance optimization: Hard limit on pipe count to prevent memory issues
        const MAX_PIPES = 15; // Reasonable limit for high scores
        if (this.pipes.length > MAX_PIPES) {
            console.log(`⚡ Performance: Limiting pipes to ${MAX_PIPES} (was ${this.pipes.length})`);
            this.pipes = this.pipes.slice(-MAX_PIPES);
        }
        
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= dynamicPipeSpeed;
            
            // Remove off-screen pipes
            // Remove pipes that are off-screen (more aggressive cleanup for performance)
            if (pipe.x + this.settings.pipeWidth < this.camera.x - 50) {
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
                this.playSound('point');
                this.checkSeasonChanges();
                
                // Decrement extended invincibility pipe counter
                if (this.powerUp.extendedInvincibility && this.powerUp.invincibilityPipesLeft > 0) {
                    this.powerUp.invincibilityPipesLeft--;
                    console.log(`🛡️ Extended invincibility: ${this.powerUp.invincibilityPipesLeft} pipes remaining (pipe #${this.score} passed)`);
                    
                    if (this.powerUp.invincibilityPipesLeft <= 0) {
                        this.powerUp.extendedInvincibility = false;
                        console.log('🛡️ Extended invincibility ended - bird is now vulnerable');
                        
                        // Add a brief warning period
                        setTimeout(() => {
                            console.log('⚠️ WARNING: Bird is now vulnerable to collisions!');
                        }, 1000);
                    }
                }
            }
        }
    }
    
    createPipe() {
        // More random pipe group sizes with varied probabilities
        const groupRandom = Math.random();
        let pipeGroupSize;
        
        if (groupRandom < 0.5) {
            pipeGroupSize = 1; // 50% chance for single pipe
        } else if (groupRandom < 0.75) {
            pipeGroupSize = 2; // 25% chance for double pipe
        } else if (groupRandom < 0.9) {
            pipeGroupSize = 3; // 15% chance for triple pipe
        } else {
            pipeGroupSize = Math.random() < 0.5 ? 4 : 5; // 10% chance for 4-5 pipes (rare)
        }
        
        for (let i = 0; i < pipeGroupSize; i++) {
            this.createSinglePipe(i, pipeGroupSize);
        }
        
        // Random chance to create a moving pipe instead of regular pipes
        if (Math.random() < 0.08) { // 8% chance for moving pipe
            this.createRandomMovingPipe();
        }
    }
    
    createSinglePipe(pipeIndex, groupSize) {
        const minHeight = 50;
        const maxHeight = this.canvas.height - this.settings.pipeGap - minHeight;
        
        // Smart pipe spacing - more generous after power-ups
        let baseSpacing = Math.max(this.canvas.width * 0.5, 400);
        
        // Increase spacing significantly if we just had a power-up recently
        const timeSinceLastPowerUp = Date.now() - (this.powerUp.slowdownStartTime || 0);
        if (timeSinceLastPowerUp < 10000) { // Within 10 seconds of power-up end
            baseSpacing *= 1.8; // 80% more space for recovery
            console.log('🛡️ Post-power-up spacing - extra room for control recovery');
        }
        
        // Mobile-friendly spacing adjustments
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            baseSpacing *= 1.3; // 30% more space on mobile for easier control
        }
        
        const spacingVariation = baseSpacing * 0.3; // Reduced variation for more predictable spacing
        const randomSpacing = baseSpacing + (Math.random() - 0.5) * spacingVariation;
        
        // For grouped pipes, space them more generously
        const groupSpacing = groupSize > 1 ? baseSpacing * 0.8 : randomSpacing; // Increased from 0.6
        const pipeSpacing = pipeIndex === 0 ? randomSpacing : groupSpacing;
        
        const pipeX = this.pipes.length === 0 ? 
            this.bird.x + this.canvas.width * 0.8 : 
            this.pipes[this.pipes.length - 1].x + pipeSpacing;
        
        // Determine pipe type for variety with better balance for playability
        const pipeTypeRandom = Math.random();
        let pipeType;
        
        // Consider previous pipe type for smoother transitions
        const lastPipeType = this.pipes.length > 0 ? this.pipes[this.pipes.length - 1].type : 'full';
        
        // Early game: mostly traditional pipes for easier learning
        if (this.score < 5) {
            pipeType = 'full'; // Only traditional pipes for first 5 points
        } else if (this.score < 15) {
            // Gradual introduction of variety
            if (pipeTypeRandom < 0.8) {
                pipeType = 'full'; // 80% chance - traditional full pipe
            } else if (pipeTypeRandom < 0.9) {
                pipeType = 'topOnly'; // 10% chance - only top pipe (fly under)
            } else {
                pipeType = 'bottomOnly'; // 10% chance - only bottom pipe (fly over)
            }
        } else {
            // Full variety but still balanced for playability
            if (pipeTypeRandom < 0.7) {
                pipeType = 'full'; // 70% chance - traditional full pipe (increased for stability)
            } else if (pipeTypeRandom < 0.85) {
                pipeType = 'topOnly'; // 15% chance - only top pipe (fly under)
            } else {
                pipeType = 'bottomOnly'; // 15% chance - only bottom pipe (fly over)
            }
            
            // Avoid consecutive special pipe types for better flow
            if (lastPipeType !== 'full' && pipeType !== 'full' && Math.random() < 0.6) {
                pipeType = 'full'; // 60% chance to return to normal pipe after special pipe
            }
        }
        
        // Create pipe based on type
        let pipe;
        
        if (pipeType === 'full') {
            // Traditional pipe with gap - Smooth, playable pipe positioning with gradual transitions
            let topHeight;
            
            if (this.pipes.length === 0) {
                // First pipe - start in middle area for easier entry
                const centerY = (minHeight + maxHeight) / 2;
                const centerRange = (maxHeight - minHeight) * 0.4;
                topHeight = centerY - centerRange/2 + Math.random() * centerRange;
            } else {
                // Subsequent pipes - create smooth, playable transitions
                const lastPipe = this.pipes[this.pipes.length - 1];
                const lastHeight = lastPipe.topHeight;
                
                // Calculate maximum safe movement based on bird flight capability
                const birdJumpHeight = this.settings.jumpPower.max * 8; // Approximate bird jump reach
                const maxSafeMovement = Math.min(birdJumpHeight * 0.6, 120); // Conservative safe movement
                
                // Difficulty scaling - more challenging but still playable
                const difficultyFactor = Math.min(this.score / 30, 0.8); // Cap at 80% difficulty
                const currentMaxMovement = maxSafeMovement * (0.5 + difficultyFactor * 0.5); // 50% to 100% of safe movement
                
                // Generate smooth transition with controlled randomness
                const direction = (Math.random() - 0.5) * 2; // -1 to 1
                const movement = direction * Math.random() * currentMaxMovement;
                
                topHeight = lastHeight + movement;
                
                // Early-game vertical lane snapping for variety without spikes
                if (this.score < 10) {
                    const lanes = 5; // number of discrete vertical lanes
                    const laneHeight = (maxHeight - minHeight) / (lanes + 1);
                    // 40% chance to snap to a nearby lane to create distinct openings
                    if (Math.random() < 0.4) {
                        const laneIndex = Math.max(1, Math.min(lanes, Math.round((topHeight - minHeight) / laneHeight)));
                        const snapped = minHeight + laneIndex * laneHeight;
                        // Blend toward the lane to keep motion smooth
                        topHeight = topHeight * 0.6 + snapped * 0.4;
                    }
                } else if (this.score < 25) {
                    // Mid-game occasional lane influence, lighter touch
                    if (Math.random() < 0.2) {
                        const lanes = 6;
                        const laneHeight = (maxHeight - minHeight) / (lanes + 1);
                        const laneIndex = Math.max(1, Math.min(lanes, Math.round((topHeight - minHeight) / laneHeight)));
                        const snapped = minHeight + laneIndex * laneHeight;
                        topHeight = topHeight * 0.8 + snapped * 0.2;
                    }
                }

                // Apply band logic to avoid repeating the same vertical level
                (function enforceBands(self) {
                    const range = maxHeight - minHeight;
                    const lowThreshold = minHeight + range * 0.33;
                    const highThreshold = minHeight + range * 0.66;
                    const classify = (y) => (y < lowThreshold ? 'low' : (y < highThreshold ? 'mid' : 'high'));
                    let band = classify(topHeight);
                    
                    // CRITICAL: Ensure the very next pipe is NEVER at the same level
                    if (self.pipePattern.lastPipeHeight !== null) {
                        const heightDifference = Math.abs(topHeight - self.pipePattern.lastPipeHeight);
                        const minDifference = range * 0.15; // Minimum 15% of range difference
                        
                        if (heightDifference < minDifference) {
                            // Force a different height - choose opposite or middle
                            const lastBand = classify(self.pipePattern.lastPipeHeight);
                            let targetY;
                            
                            if (lastBand === 'high') {
                                // Last was high, go low or mid
                                targetY = Math.random() < 0.6 ? (minHeight + range * 0.2) : (minHeight + range * 0.5);
                            } else if (lastBand === 'low') {
                                // Last was low, go high or mid
                                targetY = Math.random() < 0.6 ? (minHeight + range * 0.8) : (minHeight + range * 0.5);
                            } else {
                                // Last was mid, go high or low
                                targetY = Math.random() < 0.5 ? (minHeight + range * 0.2) : (minHeight + range * 0.8);
                            }
                            
                            // Blend toward target
                            topHeight = topHeight * 0.4 + targetY * 0.6;
                            band = classify(topHeight);
                        }
                    }
                    
                    // Optionally enable brief zig-zag sequences for variety (but keep playable)
                    if (!self.pipePattern.zigzagActive && Math.random() < 0.12 && self.score >= 3) {
                        self.pipePattern.zigzagActive = true;
                        self.pipePattern.zigzagNextHigh = Math.random() < 0.5;
                    } else if (self.pipePattern.zigzagActive && Math.random() < 0.08) {
                        self.pipePattern.zigzagActive = false; // randomly end sequence
                    }
                    
                    if (self.pipePattern.zigzagActive) {
                        const targetBand = self.pipePattern.zigzagNextHigh ? 'high' : 'low';
                        if (band !== targetBand) {
                            const targetY = targetBand === 'high' ? minHeight + range * 0.8 : minHeight + range * 0.2;
                            // Blend toward target gently
                            topHeight = topHeight * 0.7 + targetY * 0.3;
                            band = classify(topHeight);
                        }
                        // Flip for next time
                        self.pipePattern.zigzagNextHigh = !self.pipePattern.zigzagNextHigh;
                    }
                    
                    // Prevent too many in the same band in a row (but allow 3rd, 4th, etc.)
                    if (self.pipePattern.lastBand === band) {
                        self.pipePattern.consecutive += 1;
                        if (self.pipePattern.consecutive >= 3) { // Increased from 2 to 3
                            // Nudge toward a different band; prefer mid as safe
                            const targetBand = band === 'mid' ? (Math.random() < 0.5 ? 'high' : 'low') : (Math.random() < 0.7 ? 'mid' : (band === 'high' ? 'low' : 'high'));
                            const targetY = targetBand === 'high' ? (minHeight + range * 0.78)
                                            : targetBand === 'mid' ? (minHeight + range * 0.5)
                                            : (minHeight + range * 0.22);
                            topHeight = topHeight * 0.65 + targetY * 0.35;
                            band = classify(topHeight);
                            self.pipePattern.consecutive = 0; // reset streak after adjustment
                        }
                    } else {
                        self.pipePattern.lastBand = band;
                        self.pipePattern.consecutive = 0;
                    }
                    
                    // Update tracking for next pipe
                    self.pipePattern.lastPipeHeight = topHeight;
                    self.pipePattern.pipeCount++;
                })(this);

                // Gentle drift toward center to prevent getting stuck at extremes
                const centerY = (minHeight + maxHeight) / 2;
                const distanceFromCenter = Math.abs(topHeight - centerY);
                const maxDistanceFromCenter = (maxHeight - minHeight) * 0.4;
                
                if (distanceFromCenter > maxDistanceFromCenter) {
                    // Gently pull back toward center
                    const pullStrength = 0.3;
                    const pullDirection = topHeight > centerY ? -1 : 1;
                    topHeight += pullDirection * currentMaxMovement * pullStrength;
                }
                
                // Ensure we stay within playable bounds (with margin)
                const safeMargin = 40;
                topHeight = Math.max(minHeight + safeMargin, Math.min(maxHeight - safeMargin, topHeight));
            }
            
            pipe = {
                x: pipeX,
                topHeight: topHeight,
                bottomY: topHeight + this.settings.pipeGap,
                scored: false,
                type: 'full'
            };
            
        } else if (pipeType === 'topOnly') {
            // Only top pipe - fly underneath with smooth transitions
            let topHeight;
            
            if (this.pipes.length === 0) {
                // First pipe - reasonable starting position
                topHeight = this.canvas.height * 0.4 + Math.random() * (this.canvas.height * 0.2);
            } else {
                // Smooth transition from previous pipe
                const lastPipe = this.pipes[this.pipes.length - 1];
                const lastHeight = lastPipe.type === 'topOnly' ? lastPipe.topHeight : 
                                lastPipe.type === 'bottomOnly' ? this.canvas.height * 0.5 :
                                lastPipe.topHeight;
                
                const maxMovement = 80; // Conservative movement for playability
                const movement = (Math.random() - 0.5) * maxMovement;
                topHeight = lastHeight + movement;
                
                // Keep within reasonable bounds for topOnly pipes
                topHeight = Math.max(this.canvas.height * 0.2, Math.min(this.canvas.height * 0.6, topHeight));
            }
            
            pipe = {
                x: pipeX,
                topHeight: topHeight,
                bottomY: this.canvas.height + 100, // No bottom pipe (way off screen)
                scored: false,
                type: 'topOnly'
            };
            
        } else { // bottomOnly
            // Only bottom pipe - fly overhead with smooth transitions
            let bottomHeight;
            
            if (this.pipes.length === 0) {
                // First pipe - reasonable starting position
                bottomHeight = this.canvas.height * 0.6 + Math.random() * (this.canvas.height * 0.2);
            } else {
                // Smooth transition from previous pipe
                const lastPipe = this.pipes[this.pipes.length - 1];
                const lastHeight = lastPipe.type === 'bottomOnly' ? lastPipe.bottomY :
                                lastPipe.type === 'topOnly' ? this.canvas.height * 0.6 :
                                lastPipe.bottomY;
                
                const maxMovement = 80; // Conservative movement for playability
                const movement = (Math.random() - 0.5) * maxMovement;
                bottomHeight = lastHeight + movement;
                
                // Keep within reasonable bounds for bottomOnly pipes
                bottomHeight = Math.max(this.canvas.height * 0.4, Math.min(this.canvas.height * 0.8, bottomHeight));
            }
            
            pipe = {
                x: pipeX,
                topHeight: -100, // No top pipe (way off screen)
                bottomY: bottomHeight,
                scored: false,
                type: 'bottomOnly'
            };
        }
        
        this.pipes.push(pipe);
        
        // Spawn easter egg with chance (only if power-up not active and it's the last pipe in group)
        if (
            pipeIndex === groupSize - 1 &&
            !this.powerUp.active &&
            Math.random() < this.easterEggSpawnChance &&
            (Date.now() - this.lastEasterEggSpawnTime) > 30000 // 30s cooldown
        ) {
            this.spawnEasterEgg(pipeX + this.settings.pipeWidth + 100);
            this.lastEasterEggSpawnTime = Date.now();
        }
    }
    
    createMovingPipe() {
        // Backwards compatibility: keep as vertical mover
        const pipeX = this.bird.x + this.canvas.width * 0.8;
        const pipeWidth = this.settings.pipeWidth;
        const pipeHeight = 200;
        const gapSize = 120;
        const startY = this.canvas.height * 0.3 + Math.random() * (this.canvas.height * 0.4);
        const movingPipe = {
            x: pipeX,
            y: startY,
            width: pipeWidth,
            height: pipeHeight,
            gapSize,
            scored: false,
            type: 'moving',
            direction: Math.random() < 0.5 ? 1 : -1,
            speed: this.movingPipeSpeed,
            minY: 50,
            maxY: this.canvas.height - pipeHeight - 50
        };
        this.movingPipes.push(movingPipe);
    }

    createRandomMovingPipe() {
        // Very random, but safe, single moving pipe (either top-only or bottom-only visual)
        const isVertical = Math.random() < 0.7; // prefer vertical motion
        const isTopOnly = Math.random() < 0.5;  // choose top/bottom look
        const pipeX = this.bird.x + this.canvas.width * (0.9 + Math.random() * 0.3);
        const pipeWidth = this.settings.pipeWidth;
        const pipeHeight = 180 + Math.random() * 80;
        const speed = this.movingPipeSpeed * (0.8 + Math.random() * 0.6);

        // Start position
        const startY = isTopOnly
            ? Math.random() * (this.canvas.height * 0.4)
            : this.canvas.height * 0.6 + Math.random() * (this.canvas.height * 0.35 - pipeHeight);

        const movingPipe = {
            x: pipeX,
            y: startY,
            width: pipeWidth,
            height: pipeHeight,
            scored: false,
            type: 'moving',
            isTopOnly,
            isVertical,
            direction: Math.random() < 0.5 ? 1 : -1,
            speed,
            minY: 30,
            maxY: this.canvas.height - pipeHeight - 30
        };
        this.movingPipes.push(movingPipe);
    }
    
    spawnEasterEgg(x) {
        this.easterEggs.push({
            x: x,
            y: this.canvas.height / 2 + (Math.random() - 0.5) * 200,
            width: 30,
            height: 30,
            collected: false,
            rotation: 0,
            pulseScale: 1
        });
    }
    
    isBirdInSafeArea() {
        // Check if bird is safely away from all pipes
        const birdLeft = this.bird.x;
        const birdRight = this.bird.x + this.bird.width;
        const birdTop = this.bird.y;
        const birdBottom = this.bird.y + this.bird.height;
        
        const safeMargin = 20; // Extra safety margin
        
        for (const pipe of this.pipes) {
            const pipeLeft = pipe.x - safeMargin;
            const pipeRight = pipe.x + this.settings.pipeWidth + safeMargin;
            const topPipeBottom = pipe.topHeight + safeMargin;
            const bottomPipeTop = pipe.bottomY - safeMargin;
            
            // Check if bird overlaps with pipe area (including safety margin)
            if (birdRight > pipeLeft && birdLeft < pipeRight) {
                // Check if bird is in the danger zones
                if (birdTop < topPipeBottom || birdBottom > bottomPipeTop) {
                    return false; // Not safe - bird is near/in pipe area
                }
            }
        }
        
        return true; // Safe - bird is clear of all pipes
    }
    
    updateEasterEggs() {
        // Performance optimization: Limit easter eggs count
        const MAX_EASTER_EGGS = 5;
        if (this.easterEggs.length > MAX_EASTER_EGGS) {
            console.log(`⚡ Performance: Limiting easter eggs to ${MAX_EASTER_EGGS} (was ${this.easterEggs.length})`);
            this.easterEggs = this.easterEggs.slice(-MAX_EASTER_EGGS);
        }
        
        for (let i = this.easterEggs.length - 1; i >= 0; i--) {
            const egg = this.easterEggs[i];
            
            // Animate the easter egg
            egg.rotation += 0.1;
            egg.pulseScale = 1 + Math.sin(Date.now() * 0.01 + i) * 0.2;
            
            // Remove off-screen eggs (more aggressive cleanup)
            if (egg.x + egg.width < this.camera.x - 50) {
                this.easterEggs.splice(i, 1);
                continue;
            }
            
            // Check collection
            if (!egg.collected && 
                this.bird.x < egg.x + egg.width &&
                this.bird.x + this.bird.width > egg.x &&
                this.bird.y < egg.y + egg.height &&
                this.bird.y + this.bird.height > egg.y) {
                
                this.collectEasterEgg(i);
            }
        }
    }
    
    updateMovingPipes() {
        // Performance optimization: Limit moving pipes count
        const MAX_MOVING_PIPES = 3;
        if (this.movingPipes.length > MAX_MOVING_PIPES) {
            console.log(`⚡ Performance: Limiting moving pipes to ${MAX_MOVING_PIPES} (was ${this.movingPipes.length})`);
            this.movingPipes = this.movingPipes.slice(-MAX_MOVING_PIPES);
        }
        
        for (let i = this.movingPipes.length - 1; i >= 0; i--) {
            const pipe = this.movingPipes[i];
            
            // Move pipe horizontally (same as regular pipes)
            const speedIncrease = this.score * 0.08;
            const maxSpeedIncrease = this.settings.pipeSpeed * 2;
            const dynamicPipeSpeed = this.settings.pipeSpeed + Math.min(speedIncrease, maxSpeedIncrease);
            pipe.x -= dynamicPipeSpeed;
            
            // Move pipe vertically
            pipe.y += pipe.direction * pipe.speed;
            
            // Bounce off top and bottom boundaries
            if (pipe.y <= pipe.minY) {
                pipe.y = pipe.minY;
                pipe.direction = 1; // Change to moving down
            } else if (pipe.y >= pipe.maxY) {
                pipe.y = pipe.maxY;
                pipe.direction = -1; // Change to moving up
            }
            
            // Remove off-screen moving pipes
            if (pipe.x + pipe.width < this.camera.x - 50) {
                this.movingPipes.splice(i, 1);
                continue;
            }
            
            // Score when passing moving pipe
            if (!pipe.scored && pipe.x + pipe.width < this.bird.x) {
                pipe.scored = true;
                this.score++;
                this.world.totalPipesPassed++;
                this.updateScore();
                this.playSound('point');
                this.updateDifficulty();
                this.checkSeasonChanges();
                console.log('🎯 Passed moving pipe! Score:', this.score);
            }
        }
    }
    
    collectEasterEgg(index) {
        this.easterEggs.splice(index, 1);
        this.activatePowerUp();
    }
    
    activatePowerUp() {
        this.powerUp.active = true;
        this.powerUp.startTime = Date.now();
        this.powerUp.gracePipeAllowed = false; // Reset grace pipe for new power-up
        this.powerUp.gracePipeUsed = false;
        
        // Track power-up activation
        if (this.analytics) {
            this.analytics.logEvent('power_up_activated', {
                score: this.score,
                power_up_type: 'speed_boost'
            });
        }
        
        // Also track with Mixpanel
        if (typeof mixpanel !== 'undefined' && mixpanel.track) {
            mixpanel.track('power_up_activated', {
                category: 'Power Up',
                label: 'Speed Boost',
                score: this.score,
                user_id: this.leaderboard.userId
            });
        }
        
        console.log('🚀 POWER-UP ACTIVATED! GOTTA GO FAST!');
        
        // Stop background music and play Sonic theme
        if (this.audio.custom.bgMusic) {
            this.audio.custom.bgMusic.pause();
        } else {
            this.audio.sounds.bgMusic.stop();
        }
        
        // Play Sonic music with enhanced error handling
        if (this.sonicMusic && this.audio.enabled) {
            try {
                this.sonicMusic.currentTime = 0;
                this.sonicMusic.volume = this.getEffectiveVolume('powerup');
                
                // Ensure audio context is active
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                console.log('🎵 Attempting to play Sonic music...');
                const playPromise = this.sonicMusic.play();
                
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('✅ SONIC MUSIC PLAYING! GOTTA GO FAST!');
                    }).catch((error) => {
                        console.error('❌ Sonic music play failed:', error);
                        this.playEpicPowerUpSound();
                    });
                } else {
                    console.log('🎵 Sonic music playing (no promise)');
                }
            } catch (error) {
                console.error('❌ Error playing Sonic music:', error);
                this.playEpicPowerUpSound();
            }
        } else {
            console.log('🔄 Using fallback epic power-up sound');
            this.playEpicPowerUpSound();
        }
        
        // Auto-deactivate after duration
        setTimeout(() => {
            this.deactivatePowerUp();
        }, this.powerUp.duration);
    }
    
    playEpicPowerUpSound() {
        // Fallback epic power-up sound if Sonic music fails
        console.log('🎵 Playing fallback epic power-up sound!');
        
        const powerUpInterval = setInterval(() => {
            if (this.powerUp.active && this.audio.enabled) {
                // Create rapid-fire epic notes
                const frequencies = [880, 1046.5, 1318.5, 1760]; // A-C-E-A progression
                frequencies.forEach((freq, index) => {
                    const timeout = setTimeout(() => {
                        const osc = this.audioContext.createOscillator();
                        const gain = this.audioContext.createGain();
                        
                        osc.frequency.value = freq;
                        osc.type = 'sawtooth';
                        osc.connect(gain);
                        gain.connect(this.audioContext.destination);
                        
                        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                        gain.gain.linearRampToValueAtTime(0.3 * this.getEffectiveVolume('powerup'), this.audioContext.currentTime + 0.01);
                        gain.gain.exponentialRampToValueAtTime(0.01 * this.getEffectiveVolume('powerup'), this.audioContext.currentTime + 0.2);
                        
                        osc.start(this.audioContext.currentTime);
                        osc.stop(this.audioContext.currentTime + 0.2);
                        
                        // Track oscillator for cleanup
                        this.powerUp.activeOscillators.push(osc);
                        
                        // Clean up oscillator reference after it stops
                        setTimeout(() => {
                            const index = this.powerUp.activeOscillators.indexOf(osc);
                            if (index > -1) {
                                this.powerUp.activeOscillators.splice(index, 1);
                            }
                        }, 250);
                    }, index * 50);
                    
                    // Track timeout for cleanup
                    this.powerUp.activeTimeouts.push(timeout);
                });
            } else {
                clearInterval(powerUpInterval);
            }
        }, 200); // Fast, energetic rhythm
        
        // Track interval for cleanup
        this.powerUp.activeIntervals.push(powerUpInterval);
    }
    
    deactivatePowerUp() {
        this.powerUp.active = false;
        this.powerUp.gracePipeAllowed = true; // Enable grace pipe
        this.powerUp.gracePipeUsed = false; // Reset grace pipe usage
        
        // CRITICAL: Clean up all power-up intervals, timeouts, and oscillators to prevent memory leaks
        console.log(`🧹 Cleaning up ${this.powerUp.activeIntervals.length} intervals, ${this.powerUp.activeTimeouts.length} timeouts, ${this.powerUp.activeOscillators.length} oscillators`);
        
        // Clear all intervals
        this.powerUp.activeIntervals.forEach(interval => {
            clearInterval(interval);
        });
        this.powerUp.activeIntervals = [];
        
        // Clear all timeouts
        this.powerUp.activeTimeouts.forEach(timeout => {
            clearTimeout(timeout);
        });
        this.powerUp.activeTimeouts = [];
        
        // Stop all oscillators
        this.powerUp.activeOscillators.forEach(osc => {
            try {
                osc.stop();
            } catch (e) {
                // Oscillator might already be stopped
            }
        });
        this.powerUp.activeOscillators = [];
        
        // Start gradual slowdown
        this.powerUp.slowdownActive = true;
        this.powerUp.slowdownStartTime = Date.now();
        
        // Start extended invincibility for 2 more pipes
        this.powerUp.extendedInvincibility = true;
        this.powerUp.invincibilityPipesLeft = this.powerUp.invincibilityPipesTotal;
        
        // Start safe zone - no new pipes for 3 seconds
        this.powerUp.safeZoneActive = true;
        this.powerUp.safeZoneStartTime = Date.now();
        
        console.log(`🛡️ Power-up ended - Starting gradual slowdown, grace pipe, extended invincibility for ${this.powerUp.invincibilityPipesTotal} pipes, and 3-second safe zone!`);
        console.log(`🛡️ Extended invincibility state: active=${this.powerUp.extendedInvincibility}, pipesLeft=${this.powerUp.invincibilityPipesLeft}`);
        
        // Stop Sonic music and resume background music
        if (this.sonicMusic) {
            this.sonicMusic.pause();
        }
        
        if (this.audio.enabled) {
            this.startBackgroundMusic();
        }
    }
    
    checkCollisions() {
        const birdMargin = 4;
        const pipeMargin = 3;
        const cornerSafeZone = 18; // Increased from 12 for more forgiving collisions
        
        const birdLeft = this.bird.x + birdMargin;
        const birdRight = this.bird.x + this.bird.width - birdMargin;
        const birdTop = this.bird.y + birdMargin;
        const birdBottom = this.bird.y + this.bird.height - birdMargin;
        const birdCenterX = this.bird.x + this.bird.width / 2;
        const birdCenterY = this.bird.y + this.bird.height / 2;
        
        // Ground and ceiling collision (skip during power-up and extended invincibility)
        const isInvincible = this.powerUp.active || this.powerUp.extendedInvincibility;
        if (!isInvincible && (birdTop <= pipeMargin || birdBottom >= this.canvas.height - pipeMargin)) {
            this.gameOver();
            return;
        }
        
        // Pipe collision with safe corners - skip if any invincibility is active
        const canPhaseThrough = (this.powerUp.active && this.powerUp.canPhaseThrough) || this.powerUp.extendedInvincibility;
        
        // Enhanced debug logging for collision states
        if ((this.powerUp.extendedInvincibility || this.powerUp.active) && this.pipes.length > 0) {
            const nearestPipe = this.pipes.find(pipe => 
                Math.abs(this.bird.x - pipe.x) < 150
            );
            if (nearestPipe) {
                console.log(`🛡️ Collision Debug:`, {
                    powerUpActive: this.powerUp.active,
                    extendedInvincibility: this.powerUp.extendedInvincibility,
                    pipesLeft: this.powerUp.invincibilityPipesLeft,
                    canPhaseThrough: canPhaseThrough,
                    birdX: Math.round(this.bird.x),
                    pipeX: Math.round(nearestPipe.x),
                    pipeType: nearestPipe.type
                });
            }
        }
        
        if (!canPhaseThrough) {
            for (const pipe of this.pipes) {
                const pipeLeft = pipe.x + pipeMargin;
                const pipeRight = pipe.x + this.settings.pipeWidth - pipeMargin;
                // Extra margin for top pipe to reduce sensitivity
                const topPipeBottom = pipe.topHeight - (pipeMargin + 5); // Extra 5 pixels margin
                const bottomPipeTop = pipe.bottomY + pipeMargin;
                
                if (birdRight > pipeLeft && birdLeft < pipeRight) {
                    // Check if this is the grace pipe (first pipe after power-up) OR extended invincibility
                    if ((this.powerUp.gracePipeAllowed && !this.powerUp.gracePipeUsed) || this.powerUp.extendedInvincibility) {
                        if (this.powerUp.gracePipeAllowed && !this.powerUp.gracePipeUsed) {
                            // Mark grace pipe as used and allow passage
                            this.powerUp.gracePipeUsed = true;
                            this.powerUp.gracePipeAllowed = false;
                            console.log('🛡️ Grace pipe used - safe passage granted!');
                        } else if (this.powerUp.extendedInvincibility) {
                            console.log(`🛡️ Extended invincibility active - safe passage (${this.powerUp.invincibilityPipesLeft} pipes left)`);
                        }
                        continue; // Skip collision for this pipe
                    }
                    
                    // Check safe corner zones
                    const inTopSafeZone = this.isInSafeZone(birdCenterX, birdCenterY, pipe.x, pipe.topHeight, cornerSafeZone, 'top');
                    const inBottomSafeZone = this.isInSafeZone(birdCenterX, birdCenterY, pipe.x, pipe.bottomY, cornerSafeZone, 'bottom');
                    
                    if (!inTopSafeZone && !inBottomSafeZone) {
                        // Extra check for top pipe right corner (most sensitive area)
                        const isNearTopRightCorner = (birdCenterX > pipe.x + this.settings.pipeWidth * 0.7) && 
                                                   (birdCenterY < pipe.topHeight + 20);
                        
                        if (isNearTopRightCorner) {
                            // More forgiving collision for top right corner
                            const extraMargin = 8; // Additional 8 pixels of forgiveness
                            if (birdTop < topPipeBottom - extraMargin || birdBottom > bottomPipeTop) {
                                this.gameOver();
                                return;
                            }
                        } else {
                            // Normal collision detection for other areas
                            if (birdTop < topPipeBottom || birdBottom > bottomPipeTop) {
                                this.gameOver();
                                return;
                            }
                        }
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
        
        // Make top pipe right corner extra forgiving (most problematic area)
        let effectiveSafeZone = safeZone;
        if (pipeType === 'top' && distToRight < distToLeft) {
            // Bird is near the top pipe's right corner - increase safe zone
            effectiveSafeZone = safeZone * 1.5; // 50% larger safe zone
        }
        
        return distToLeft < effectiveSafeZone || distToRight < effectiveSafeZone;
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.isPaused = false;
        this.gameOverTime = Date.now();
        
        // Track game over with score
        if (this.analytics) {
            this.analytics.logEvent('game_over', {
                score: this.score,
                final_score: this.score
            });
        }
        
        // Also track with Mixpanel
        if (typeof mixpanel !== 'undefined' && mixpanel.track) {
            mixpanel.track('game_over', {
                category: 'Game',
                label: 'Game Over',
                score: this.score,
                user_id: this.leaderboard.userId
            });
        }
        
        // Hide pause button
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.classList.remove('playing');
            pauseBtn.textContent = '⏸️';
        }
        
        // Only play crash sound if volume is not zero
        if (this.getEffectiveVolume('crash') > 0) {
            this.playSound('crash');
        }
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('flappyBestScore', this.bestScore);
        }
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('bestScore').textContent = this.bestScore;
        document.getElementById('gameOverScreen').classList.remove('hidden');
        
        // Hide the in-game HUD to prevent overlap
        document.getElementById('gameHUD').style.display = 'none';
        
        // Submit score to leaderboard and refresh display
        this.submitScoreToLeaderboard();
        this.refreshLeaderboard();
        
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
                restartBtn.textContent = `🔄 Replay (${secondsLeft})`;
                restartBtn.style.opacity = '0.6';
                setTimeout(() => this.updateGameOverCountdown(), 100);
            } else {
                restartBtn.textContent = '🔄 Replay';
                restartBtn.style.opacity = '1';
            }
        }
    }
    
    // Audio System
    playSound(soundType) {
        const now = Date.now();
        
        // Skip playing sounds if volume is zero to prevent issues
        if (this.getEffectiveVolume(soundType) <= 0) {
            return;
        }
        
        if (soundType === 'tap') {
            // Spam-tap: restart sound from beginning
            if (this.audio.custom.tapSound) {
                // Handle custom uploaded tap sounds
                if (this.audio.state.currentTapAudio) {
                    this.audio.state.currentTapAudio.pause();
                    this.audio.state.currentTapAudio.currentTime = 0;
                }
                
                const tapAudio = this.audio.custom.tapSound.cloneNode();
                tapAudio.volume = this.getEffectiveVolume('tap');
                tapAudio.play();
                
                this.audio.state.currentTapAudio = tapAudio;
                
                setTimeout(() => {
                    if (this.audio.state.currentTapAudio === tapAudio) {
                        tapAudio.pause();
                        this.audio.state.currentTapAudio = null;
                    }
                }, 3000);
            } else if (this.audio.sounds.tap) {
                // Handle default Mario laugh sound (supports spam-tap naturally)
                this.audio.sounds.tap();
            }
        } else if (soundType === 'crash') {
            // Crash: prevent overlaps
            if (now - this.audio.state.crashLastPlayed < 3000) return;
            this.audio.state.crashLastPlayed = now;
            
            if (this.audio.custom.crashSound) {
                this.audio.custom.crashSound.volume = this.getEffectiveVolume('crash');
                this.audio.custom.crashSound.currentTime = 0;
                this.audio.custom.crashSound.play();
                
                setTimeout(() => {
                    this.audio.custom.crashSound.pause();
                    this.audio.custom.crashSound.currentTime = 0;
                }, 3000);
            } else if (this.audio.sounds.crash) {
                this.audio.sounds.crash();
            }
        } else if (soundType === 'point') {
            // Point: prevent overlaps
            if (now - this.audio.state.pointLastPlayed < 200) return;
            this.audio.state.pointLastPlayed = now;
            
            if (this.audio.custom.pointSound) {
                this.audio.custom.pointSound.volume = this.getEffectiveVolume('point');
                this.audio.custom.pointSound.currentTime = 0;
                this.audio.custom.pointSound.play();
                
                setTimeout(() => {
                    this.audio.custom.pointSound.pause();
                    this.audio.custom.pointSound.currentTime = 0;
                }, 1000);
            } else if (this.audio.sounds.point) {
                this.audio.sounds.point();
            }
        }
    }
    
    startBackgroundMusic() {
        console.log('🎵 Starting background music...', {
            customMusic: !!this.audio.custom.bgMusic,
            defaultMusic: !!this.audio.sounds.bgMusic,
            enabled: this.audio.enabled,
            volume: this.getEffectiveVolume('music')
        });
        
        // Skip starting music if volume is zero
        if (this.getEffectiveVolume('music') <= 0) {
            console.log('🎵 Skipping background music - volume is zero');
            return;
        }
        
        if (this.audio.custom.bgMusic) {
            this.audio.custom.bgMusic.volume = this.getEffectiveVolume('music');
            this.audio.custom.bgMusic.play().catch(e => {
                console.log('Custom music failed to play:', e);
            });
        } else if (this.audio.sounds.bgMusic) {
            try {
                console.log('🎵 Attempting to start default background music...');
                console.log('Audio context state:', this.audioContext ? this.audioContext.state : 'null');
                console.log('Background music object:', !!this.audio.sounds.bgMusic);
                
                // Ensure audio context is resumed (critical for mobile)
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    console.log('🔊 Resuming audio context for background music...');
                    this.audioContext.resume().then(() => {
                        console.log('✅ Audio context resumed, starting background music');
                        try {
                            this.audio.sounds.bgMusic.start();
                            console.log('✅ Background music started successfully');
                        } catch (startError) {
                            console.error('❌ Failed to start background music after resume:', startError);
                        }
                    }).catch(e => {
                        console.error('❌ Failed to resume audio context:', e);
                    });
                } else if (this.audioContext) {
                    console.log('🎵 Starting background music (audio context ready)');
                    try {
                        this.audio.sounds.bgMusic.start();
                        console.log('✅ Background music started successfully');
                    } catch (startError) {
                        console.error('❌ Failed to start background music:', startError);
                    }
                } else {
                    console.warn('⚠️ No audio context available for background music');
                }
            } catch (e) {
                console.error('❌ Default music failed to start:', e);
            }
        } else {
            console.warn('No background music available (neither custom nor default)');
        }
        this.audio.playing = true;
    }
    
    toggleMusic() {
        this.audio.enabled = !this.audio.enabled;
        const btn = document.getElementById('toggleMusic');
        btn.textContent = this.audio.enabled ? '🔊 Music' : '🔇 Music';
        
        if (this.audio.custom.bgMusic) {
            this.audio.custom.bgMusic.volume = this.getEffectiveVolume('music');
        }
        
        if (!this.audio.enabled && !this.audio.custom.bgMusic) {
            this.audio.sounds.bgMusic.stop();
            this.audio.playing = false;
        } else if (this.audio.enabled && !this.audio.playing) {
            this.startBackgroundMusic();
        }
    }
    
    updateVolume(type, volume) {
        this.audio.volumes[type] = volume;
        
        // Update display
        const displayId = `${type}VolumeDisplay`;
        const displayElement = document.getElementById(displayId);
        if (displayElement) {
            displayElement.textContent = `${volume}%`;
        }
        
        // Save to localStorage
        localStorage.setItem(`flappy${type.charAt(0).toUpperCase() + type.slice(1)}Volume`, volume);
        
        // Apply volume changes immediately
        this.applyVolumeSettings();
        
        // Special handling for master volume - update all other volumes
        if (type === 'master') {
            this.updateAllVolumeDisplays();
        }
    }
    
    applyVolumeSettings() {
        // Update background music volume
        if (this.audio.custom.bgMusic) {
            this.audio.custom.bgMusic.volume = this.getEffectiveVolume('music');
        }
        
        // Update sonic music volume
        if (this.sonicMusic) {
            this.sonicMusic.volume = this.getEffectiveVolume('powerup');
        }
        
        // Note: Tap and crash sounds are applied when they play
    }
    
    getEffectiveVolume(type) {
        if (!this.audio.enabled) return 0;
        return (this.audio.volumes[type] / 100) * (this.audio.volumes.master / 100);
    }
    
    updateAllVolumeDisplays() {
        Object.keys(this.audio.volumes).forEach(type => {
            const displayId = `${type}VolumeDisplay`;
            const displayElement = document.getElementById(displayId);
            if (displayElement) {
                displayElement.textContent = `${this.audio.volumes[type]}%`;
            }
        });
    }
    
    playVolumePreview(sliderId, volume) {
        // Extract the audio type from slider ID (e.g., "tapVolumeSlider" -> "tap")
        const audioType = sliderId.replace('VolumeSlider', '').toLowerCase();
        
        // Don't preview master volume - it affects all others
        if (audioType === 'master') return;
        
        // Stop any existing preview
        if (this.volumePreviewTimeout) {
            clearTimeout(this.volumePreviewTimeout);
        }
        
        if (this.volumePreviewAudio) {
            this.volumePreviewAudio.pause();
            this.volumePreviewAudio = null;
        }
        
        // Don't play preview if volume is 0
        if (volume === 0) return;
        
        switch (audioType) {
            case 'tap':
                this.playTapPreview();
                break;
            case 'crash':
                this.playCrashPreview();
                break;
            case 'music':
                this.playMusicPreview();
                break;
            case 'powerup':
                this.playPowerupPreview();
                break;
        }
    }
    
    playTapPreview() {
        if (this.audio.custom.tapSound) {
            // Use custom tap sound
            const previewAudio = this.audio.custom.tapSound.cloneNode();
            previewAudio.volume = this.getEffectiveVolume('tap');
            previewAudio.play().catch(e => console.log('Tap preview failed:', e));
            
            this.volumePreviewAudio = previewAudio;
            this.volumePreviewTimeout = setTimeout(() => {
                previewAudio.pause();
                this.volumePreviewAudio = null;
            }, 1500);
        } else if (this.audio.sounds.tap) {
            // Use default Mario laugh - it handles its own timing
            this.audio.sounds.tap();
        }
    }
    
    playCrashPreview() {
        if (this.audio.custom.crashSound) {
            // Use custom crash sound
            const previewAudio = this.audio.custom.crashSound.cloneNode();
            previewAudio.volume = this.getEffectiveVolume('crash');
            previewAudio.currentTime = 0;
            previewAudio.play().catch(e => console.log('Crash preview failed:', e));
            
            this.volumePreviewAudio = previewAudio;
            this.volumePreviewTimeout = setTimeout(() => {
                previewAudio.pause();
                this.volumePreviewAudio = null;
            }, 1500);
        } else if (this.audio.sounds.crash) {
            // Use default crash sound - synthesized, so create a preview version
            this.playDefaultCrashPreview();
        }
    }
    
    playDefaultCrashPreview() {
        // Create a shorter version of the crash sound for preview
        const audioContext = this.audioContext;
        if (!audioContext) return;
        
        const duration = 1.5; // 1.5 seconds
        const sampleRate = audioContext.sampleRate;
        const frameCount = sampleRate * duration;
        
        const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
        const channelData = buffer.getChannelData(0);
        
        // Generate epic crash sound preview
        for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            const decay = Math.exp(-t * 3); // Faster decay for preview
            
            // Multiple oscillators for epic sound
            const freq1 = 100 * Math.exp(-t * 2);
            const freq2 = 200 * Math.exp(-t * 1.5);
            const freq3 = 50 * Math.exp(-t * 1);
            
            let sample = 0;
            sample += Math.sin(2 * Math.PI * freq1 * t) * 0.3;
            sample += Math.sin(2 * Math.PI * freq2 * t) * 0.2;
            sample += Math.sin(2 * Math.PI * freq3 * t) * 0.4;
            
            // Add noise burst
            const noiseBurst = (Math.random() * 2 - 1) * Math.exp(-t * 8) * 0.3;
            sample += noiseBurst;
            
            channelData[i] = sample * decay * this.getEffectiveVolume('crash');
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
        
        this.volumePreviewTimeout = setTimeout(() => {
            source.stop();
        }, 1500);
    }
    
    playMusicPreview() {
        if (this.audio.custom.bgMusic) {
            // Use custom background music
            const previewAudio = this.audio.custom.bgMusic.cloneNode();
            previewAudio.volume = this.getEffectiveVolume('music');
            previewAudio.currentTime = 0;
            previewAudio.play().catch(e => console.log('Music preview failed:', e));
            
            this.volumePreviewAudio = previewAudio;
            this.volumePreviewTimeout = setTimeout(() => {
                previewAudio.pause();
                this.volumePreviewAudio = null;
            }, 1500);
        } else if (this.audio.sounds.bgMusic) {
            // Use default background music - create a preview version
            this.playDefaultMusicPreview();
        }
    }
    
    playDefaultMusicPreview() {
        // Create a 1.5-second preview of the epic adventure music
        const audioContext = this.audioContext;
        if (!audioContext) return;
        
        const duration = 1.5;
        const sampleRate = audioContext.sampleRate;
        const frameCount = sampleRate * duration;
        
        const buffer = audioContext.createBuffer(2, frameCount, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = buffer.getChannelData(channel);
            
            for (let i = 0; i < frameCount; i++) {
                const t = i / sampleRate;
                
                // Epic chord progression preview
                const chord1 = [261.63, 329.63, 392.00]; // C major
                const chord2 = [293.66, 369.99, 440.00]; // D major
                
                let sample = 0;
                const currentChord = (Math.floor(t * 2) % 2 === 0) ? chord1 : chord2;
                
                currentChord.forEach((freq, idx) => {
                    sample += Math.sin(2 * Math.PI * freq * t) * 0.15;
                    // Add harmony
                    sample += Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.1;
                });
                
                // Add bass line
                const bassFreq = currentChord[0] * 0.5;
                sample += Math.sin(2 * Math.PI * bassFreq * t) * 0.2;
                
                // Gentle envelope
                const envelope = Math.sin(Math.PI * t / duration) * 0.8;
                
                channelData[i] = sample * envelope * this.getEffectiveVolume('music');
            }
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
        
        this.volumePreviewTimeout = setTimeout(() => {
            source.stop();
        }, 1500);
    }
    
    playPowerupPreview() {
        if (this.sonicMusic && this.sonicMusic.readyState >= 2) {
            // Use Sonic "Gotta Go Fast" music
            const previewAudio = this.sonicMusic.cloneNode();
            previewAudio.volume = this.getEffectiveVolume('powerup');
            previewAudio.currentTime = 0;
            previewAudio.play().catch(e => console.log('Powerup preview failed:', e));
            
            this.volumePreviewAudio = previewAudio;
            this.volumePreviewTimeout = setTimeout(() => {
                previewAudio.pause();
                this.volumePreviewAudio = null;
            }, 1500);
        } else {
            // Fallback to epic power-up sound
            this.playDefaultPowerupPreview();
        }
    }
    
    playDefaultPowerupPreview() {
        // Create an epic power-up sound preview
        const audioContext = this.audioContext;
        if (!audioContext) return;
        
        const duration = 1.5;
        const sampleRate = audioContext.sampleRate;
        const frameCount = sampleRate * duration;
        
        const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
        const channelData = buffer.getChannelData(0);
        
        for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            
            // Rapid-fire epic notes
            const noteFreq = 440 + Math.sin(t * 20) * 200; // Varying frequency
            const powerChord = Math.sin(2 * Math.PI * noteFreq * t);
            const harmonics = Math.sin(2 * Math.PI * noteFreq * 2 * t) * 0.3;
            const bass = Math.sin(2 * Math.PI * noteFreq * 0.5 * t) * 0.4;
            
            // Epic envelope with rapid attack
            const envelope = Math.exp(-t * 0.5) * Math.sin(Math.PI * t / duration);
            
            let sample = (powerChord + harmonics + bass) * envelope;
            
            // Add excitement with tremolo
            sample *= (1 + Math.sin(t * 15) * 0.3);
            
            channelData[i] = sample * this.getEffectiveVolume('powerup');
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
        
        this.volumePreviewTimeout = setTimeout(() => {
            source.stop();
        }, 1500);
    }
    
    removeCustomSound(soundType) {
        // Clear the custom sound
        if (soundType === 'tap') {
            this.audio.custom.tapSound = null;
            this.updateButtonText('tapSoundUpload', null);
            // Clear file input
            const fileInput = document.getElementById('tapSoundUpload');
            if (fileInput) fileInput.value = '';
        } else if (soundType === 'crash') {
            this.audio.custom.crashSound = null;
            this.updateButtonText('crashSoundUpload', null);
            // Clear file input
            const fileInput = document.getElementById('crashSoundUpload');
            if (fileInput) fileInput.value = '';
        } else if (soundType === 'point') {
            this.audio.custom.pointSound = null;
            this.updateButtonText('pointSoundUpload', null);
            // Clear file input
            const fileInput = document.getElementById('pointSoundUpload');
            if (fileInput) fileInput.value = '';
        } else if (soundType === 'bgMusic') {
            // Stop current background music if it's playing
            if (this.audio.custom.bgMusic) {
                this.audio.custom.bgMusic.pause();
                this.audio.custom.bgMusic = null;
            }
            this.updateButtonText('bgMusicUpload', null);
            // Clear file input
            const fileInput = document.getElementById('bgMusicUpload');
            if (fileInput) fileInput.value = '';
            
            // Restart default background music if audio is enabled
            if (this.audio.enabled) {
                console.log('🎵 Restarting default background music...');
                // Small delay to ensure cleanup is complete
                setTimeout(() => {
                    this.startBackgroundMusic();
                }, 100);
            }
        }
        
        // Update remove button state
        this.updateRemoveButtonState(soundType);
        
        console.log(`✅ Removed custom ${soundType} sound, restored to default`);
    }
    
    updateRemoveButtonState(soundType) {
        const buttonId = soundType === 'bgMusic' ? 'removeBgMusic' : `remove${soundType.charAt(0).toUpperCase() + soundType.slice(1)}Sound`;
        const button = document.getElementById(buttonId);
        
        if (button) {
            const hasCustomSound = soundType === 'tap' ? this.audio.custom.tapSound :
                                 soundType === 'crash' ? this.audio.custom.crashSound :
                                 soundType === 'point' ? this.audio.custom.pointSound :
                                 soundType === 'bgMusic' ? this.audio.custom.bgMusic : false;
            
            button.disabled = !hasCustomSound;
            button.style.opacity = hasCustomSound ? '0.7' : '0.3';
        }
    }
    
    updateAllRemoveButtonStates() {
        this.updateRemoveButtonState('tap');
        this.updateRemoveButtonState('crash');
        this.updateRemoveButtonState('point');
        this.updateRemoveButtonState('bgMusic');
    }
    
    
    // Leaderboard Methods
    async savePlayerName() {
        const nameInput = document.getElementById('playerNameInput');
        const name = nameInput.value.trim();
        
        if (name.length < 2) {
            alert('Please enter a name with at least 2 characters');
            return;
        }
        
        this.leaderboard.setPlayerName(name);
        nameInput.style.background = 'rgba(39, 174, 96, 0.2)';
        
        // Submit current score if game just ended and not already submitted
        if (this.gameState === 'gameOver' && this.score > 0 && !this.currentGameSubmitted) {
            await this.submitScoreToLeaderboard();
        } else if (this.currentGameSubmitted) {
            console.log('ℹ️ Score already submitted for this game');
            document.getElementById('leaderboardStatus').textContent = '✅ Already submitted';
        }
        
        setTimeout(() => {
            nameInput.style.background = '';
        }, 2000);
    }
    
    async submitScoreToLeaderboard() {
        if (this.score > 0 && !this.currentGameSubmitted) {
            this.currentGameSubmitted = true; // Mark as submitted to prevent duplicates
            
            const submitted = await this.leaderboard.submitScore(this.score);
            
            if (submitted) {
                document.getElementById('leaderboardStatus').textContent = '🏆 Score submitted!';
                await this.refreshLeaderboard();
                await this.updatePlayerRank();
            } else {
                document.getElementById('leaderboardStatus').textContent = '💾 Saved locally';
            }
        } else if (this.currentGameSubmitted) {
            console.log('ℹ️ Score already submitted for this game session');
            document.getElementById('leaderboardStatus').textContent = '✅ Already submitted';
        }
    }
    
    async refreshLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        const statusElement = document.getElementById('leaderboardStatus');
        
        try {
            statusElement.textContent = '🔄 Loading...';
            leaderboardList.innerHTML = '<li>Loading scores...</li>';
            
            // Add timeout to prevent hanging
            const loadPromise = this.leaderboard.getGlobalLeaderboard(10);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Leaderboard load timeout')), 8000);
            });
            
            const scores = await Promise.race([loadPromise, timeoutPromise]);
            
            leaderboardList.innerHTML = '';
            
            if (scores.length === 0) {
                leaderboardList.innerHTML = '<li><span class="player-name">No scores yet</span><span class="player-score">Be the first!</span></li>';
            } else {
                scores.forEach((entry, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span class="player-name">${index + 1}. ${entry.name || 'Anonymous'}</span>
                        <span class="player-score">${entry.score || 0}</span>
                    `;
                    leaderboardList.appendChild(li);
                });
            }
            
            // Update status and player count
            try {
                const totalPlayers = await this.leaderboard.getTotalPlayers();
                document.getElementById('playerCount').textContent = totalPlayers;
                document.getElementById('totalPlayers').style.display = 'inline';
            } catch (e) {
                console.log('Could not get total players:', e);
                document.getElementById('totalPlayers').style.display = 'none';
            }
            
            statusElement.textContent = this.leaderboard.isConnected ? 
                '🌐 Global Leaderboard' : '💾 Local Leaderboard';
                
        } catch (error) {
            console.error('Failed to refresh leaderboard:', error);
            statusElement.textContent = '❌ Using local scores';
            
            // Show local scores as fallback
            const localScores = this.leaderboard.getLocalLeaderboard(10);
            leaderboardList.innerHTML = '';
            
            if (localScores.length === 0) {
                leaderboardList.innerHTML = '<li><span class="player-name">No local scores</span><span class="player-score">Play to add!</span></li>';
            } else {
                localScores.forEach((entry, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span class="player-name">${index + 1}. ${entry.name}</span>
                        <span class="player-score">${entry.score}</span>
                    `;
                    leaderboardList.appendChild(li);
                });
            }
        }
    }
    
    async updatePlayerRank() {
        if (this.score > 0) {
            try {
                const rank = await this.leaderboard.getPlayerRank(this.score);
                if (rank) {
                    document.getElementById('rankNumber').textContent = rank;
                    document.getElementById('globalRank').style.display = 'block';
                }
            } catch (error) {
                console.error('Failed to get player rank:', error);
            }
        }
    }
    
    initializeLeaderboard() {
        // Set initial player name
        const nameInput = document.getElementById('playerNameInput');
        nameInput.value = this.leaderboard.getPlayerName();
        
        // Check if we need to recover the user's best score
        if (this.bestScore > 0) {
            const hasScoreInLeaderboard = this.leaderboard.localScores.some(entry => entry.score === this.bestScore);
            if (!hasScoreInLeaderboard) {
                console.log(`🔄 Recovering your best score: ${this.bestScore}`);
                this.leaderboard.addManualScore(this.leaderboard.getPlayerName(), this.bestScore);
            }
        }
        
        // Load initial leaderboard
        this.refreshLeaderboard();
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
                    audio.volume = this.getEffectiveVolume('music');
                    this.audio.custom.bgMusic = audio;
                    
                    if (this.audio.playing) {
                        this.audio.sounds.bgMusic.stop();
                        audio.play();
                    }
                } else {
                    // Set appropriate volume based on sound type
                    if (soundType === 'tap') {
                        audio.volume = this.getEffectiveVolume('tap');
                    } else if (soundType === 'crash') {
                        audio.volume = this.getEffectiveVolume('crash');
                    } else if (soundType === 'point') {
                        audio.volume = this.getEffectiveVolume('point');
                    }
                    this.audio.custom[soundType + 'Sound'] = audio;
                }
                
                this.updateButtonText(soundType === 'bgMusic' ? 'bgMusicUpload' : soundType + 'SoundUpload', file.name);
                
                // Enable the remove button for this sound type
                this.updateRemoveButtonState(soundType);
            };
            reader.readAsDataURL(file);
        }
    }
    
    updateButtonText(uploadId, fileName) {
        const label = document.querySelector(`label[for="${uploadId}"]`);
        if (label) {
            if (fileName) {
                // Show uploaded file name
                const displayName = fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName;
                
                const icons = {
                    birdUpload: '🐦',
                    tapSoundUpload: '🔊',
                    crashSoundUpload: '💥',
                    pointSoundUpload: '🎯',
                    bgMusicUpload: '🎵'
                };
                
                label.textContent = `${icons[uploadId]} ${displayName}`;
                label.style.background = 'linear-gradient(45deg, #27ae60, #2ecc71)';
                label.title = `Current: ${fileName}\nRight-click to reset to default`;
                
                label.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.resetToDefault(uploadId);
                });
            } else {
                // Reset to default appearance
                this.resetButtonToDefault(uploadId);
            }
        }
    }
    
    resetButtonToDefault(uploadId) {
        const label = document.querySelector(`label[for="${uploadId}"]`);
        if (label) {
            const defaults = {
                birdUpload: '🐦 Bird Sprite',
                tapSoundUpload: '🔊 Tap Sound',
                crashSoundUpload: '💥 Upload Crash Sound',
                pointSoundUpload: '🎯 Point Sound',
                bgMusicUpload: '🎵 Background Music'
            };
            
            label.textContent = defaults[uploadId];
            label.style.background = '';
            label.title = '';
            
            // Remove any existing contextmenu listeners
            const newLabel = label.cloneNode(true);
            label.parentNode.replaceChild(newLabel, label);
        }
    }
    
    resetToDefault(uploadId) {
        const defaults = {
            birdUpload: { text: 'Upload Bird Sprite', asset: 'birdImage' },
            tapSoundUpload: { text: '🔊 Tap Sound', asset: 'tapSound' },
            crashSoundUpload: { text: '💥 Crash Sound', asset: 'crashSound' },
            pointSoundUpload: { text: '🎯 Point Sound', asset: 'pointSound' },
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
        
        const levels = [
            { max: 5, text: 'Easy Mode', color: '#27ae60' },
            { max: 10, text: 'Getting Harder...', color: '#f39c12' },
            { max: 20, text: 'Medium Mode', color: '#e67e22' },
            { max: 30, text: 'Hard Mode', color: '#e74c3c' },
            { max: Infinity, text: 'Expert Mode', color: '#8e44ad' }
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
        // Only clear and redraw if game is active (performance optimization)
        if (this.gameState === 'menu' && this.lastGameState === 'menu') {
            return; // Skip rendering if menu hasn't changed
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawBackground();
        
        if (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'gameOver') {
            this.ctx.save();
            this.ctx.translate(-this.camera.x, -this.camera.y);
            
            this.drawPipes();
            this.drawEasterEggs();
            this.drawBird();
            
            this.ctx.restore();
            
            // Draw power-up effects overlay
            if (this.powerUp.active) {
                this.drawFunnyPowerUpEffects();
            } else if (this.powerUp.slowdownActive) {
                this.drawSlowdownEffects();
            } else if (this.powerUp.extendedInvincibility) {
                this.drawExtendedInvincibilityEffects();
            } else if (this.powerUp.safeZoneActive) {
                this.drawSafeZoneEffects();
            }
            
            // Draw pause overlay
            if (this.gameState === 'paused') {
                this.drawPauseOverlay();
            }
        }
        
        this.lastGameState = this.gameState;
    }
    
    drawPauseOverlay() {
        // Draw semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw pause text
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Main pause text
        this.ctx.fillText('⏸️ PAUSED', centerX, centerY - 30);
        
        // Instructions
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillText('Press ▶️ to resume', centerX, centerY + 30);
        
        // Reset text alignment for other elements
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
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
        
        // Draw parallax layers (simplified for low-end devices)
        if (this.deviceOptimization && this.deviceOptimization.simplifyBackground) {
            // Simple background for performance
            this.drawSimpleBackground();
        } else {
            this.drawParallaxLayers();
        }
        
        // Draw holiday decorations (reduced on low-end devices)
        if (!this.deviceOptimization || !this.deviceOptimization.reduceDetails) {
            this.drawHolidayDecorations(holidayTheme);
        }
    }
    
    drawSimpleBackground() {
        // Simplified background for low-end devices
        const groundHeight = 120;
        
        // Simple ground
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.canvas.height - groundHeight, this.canvas.width, groundHeight);
        
        // Simple grass line
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(0, this.canvas.height - groundHeight, this.canvas.width, 20);
    }
    
    drawParallaxLayers() {
        const groundHeight = 120;
        
        // Mountains (slowest)
        this.drawMountains(-this.camera.x * 0.2); // Increased from 0.1
        
        // Hills (medium-fast for more noticeable movement)
        this.drawHills(-this.camera.x * 0.5); // Increased from 0.3
        
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
                
                // Highlight the grace pipe if available
                if (this.powerUp.gracePipeAllowed && !this.powerUp.gracePipeUsed) {
                    // Check if this is the first pipe the bird will encounter
                    if (pipe.x > this.bird.x) {
                        this.drawGracePipeIndicator(pipe);
                        break; // Only highlight the first upcoming pipe
                    }
                }
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
        
        // Draw top pipe (if it should be visible)
        if (pipe.type !== 'bottomOnly' && pipe.topHeight > 0) {
            // Top pipe body
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
        }
        
        // Draw bottom pipe (if it should be visible)
        if (pipe.type !== 'topOnly' && pipe.bottomY < this.canvas.height) {
            // Bottom pipe body
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
    }
    
    drawGracePipeIndicator(pipe) {
        // Draw glowing outline around the grace pipe
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 4;
        this.ctx.globalAlpha = 0.8;
        
        // Animate the glow
        const glowIntensity = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
        this.ctx.globalAlpha = glowIntensity;
        
        // Top pipe outline
        this.ctx.strokeRect(pipe.x - 2, 0, this.settings.pipeWidth + 4, pipe.topHeight);
        
        // Bottom pipe outline
        this.ctx.strokeRect(pipe.x - 2, pipe.bottomY, this.settings.pipeWidth + 4, this.canvas.height - pipe.bottomY);
        
       
        
        this.ctx.globalAlpha = 1.0; // Reset alpha
    }
    
    drawFunnyPowerUpEffects() {
        const timeLeft = this.powerUp.duration - (Date.now() - this.powerUp.startTime);
        const intensity = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
        
        // Rainbow screen flash
        this.ctx.globalAlpha = 0.1 + intensity * 0.1;
        const colors = ['#FF0000', '#FFA500', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'];
        const colorIndex = Math.floor(Date.now() * 0.01) % colors.length;
        this.ctx.fillStyle = colors[colorIndex];
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Crazy speed lines everywhere
        this.ctx.globalAlpha = 0.8;
        this.ctx.strokeStyle = '#FFFF00';
        this.ctx.lineWidth = 3;
        
        for (let i = 0; i < 20; i++) {
            const y = (Date.now() * 0.1 + i * 30) % this.canvas.height;
            const length = 50 + Math.sin(Date.now() * 0.005 + i) * 30;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width, y);
            this.ctx.lineTo(this.canvas.width - length, y);
            this.ctx.stroke();
        }
        
        // Spinning stars around the bird
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillStyle = '#FFD700';
        
        for (let i = 0; i < 8; i++) {
            const angle = (Date.now() * 0.01 + i * Math.PI / 4) % (Math.PI * 2);
            const radius = 80 + Math.sin(Date.now() * 0.005 + i) * 20;
            const x = this.canvas.width * 0.15 + Math.cos(angle) * radius;
            const y = this.canvas.height / 2 + Math.sin(angle) * radius;
            
            this.drawFunnyStar(x, y, 8);
        }
        
        // Hilarious text effects
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        
        const funnyTexts = [
            '🚀 ZOOM ZOOM! 🚀',
            '💨 SUPER SPEEDY! 💨',
            '⚡ LIGHTNING BIRD! ⚡',
            '🎉 PARTY TIME! 🎉',
            '🔥 ON FIRE! 🔥',
            '🌟 AMAZING! 🌟'
        ];
        
        const textIndex = Math.floor(Date.now() * 0.003) % funnyTexts.length;
        const textY = 100 + Math.sin(Date.now() * 0.01) * 20;
        
        // Text outline
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 4;
        this.ctx.strokeText(funnyTexts[textIndex], this.canvas.width / 2, textY);
        
        // Text fill
        this.ctx.fillStyle = colors[(colorIndex + 2) % colors.length];
        this.ctx.fillText(funnyTexts[textIndex], this.canvas.width / 2, textY);
        
        // Timer countdown with silly face
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        
        const seconds = Math.ceil(timeLeft / 1000);
        const timerText = `${seconds}s left! 😵‍💫`;
        
        this.ctx.strokeText(timerText, this.canvas.width / 2, this.canvas.height - 50);
        this.ctx.fillText(timerText, this.canvas.width / 2, this.canvas.height - 50);
        
        // Confetti particles
        for (let i = 0; i < 15; i++) {
            const x = (Date.now() * 0.1 + i * 50) % this.canvas.width;
            const y = 50 + Math.sin(Date.now() * 0.008 + i) * 100;
            const size = 3 + Math.sin(Date.now() * 0.01 + i) * 2;
            
            this.ctx.fillStyle = colors[i % colors.length];
            this.ctx.fillRect(x, y, size, size);
        }
        
        this.ctx.globalAlpha = 1.0;
        this.ctx.textAlign = 'left';
    }
    
    drawFunnyStar(x, y, size) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(Date.now() * 0.01);
        
        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            const x1 = Math.cos(angle) * size;
            const y1 = Math.sin(angle) * size;
            const x2 = Math.cos(angle + Math.PI / 5) * size * 0.5;
            const y2 = Math.sin(angle + Math.PI / 5) * size * 0.5;
            
            if (i === 0) {
                this.ctx.moveTo(x1, y1);
            } else {
                this.ctx.lineTo(x1, y1);
            }
            this.ctx.lineTo(x2, y2);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }
    
    drawSlowdownEffects() {
        const slowdownProgress = Math.min((Date.now() - this.powerUp.slowdownStartTime) / this.powerUp.slowdownDuration, 1);
        const intensity = 1 - slowdownProgress; // Fade out as we slow down
        
        // Fading speed lines to show deceleration
        this.ctx.globalAlpha = intensity * 0.6;
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < 10; i++) {
            const y = (Date.now() * 0.05 + i * 50) % this.canvas.height;
            const length = 30 * intensity + Math.sin(Date.now() * 0.003 + i) * 10;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width, y);
            this.ctx.lineTo(this.canvas.width - length, y);
            this.ctx.stroke();
        }
        
        // Speed indicator text
        this.ctx.globalAlpha = intensity * 0.8;
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        
        const speedPercent = Math.round(this.powerUp.currentSpeedMultiplier * 100);
        const slowdownText = `⚡ ${speedPercent}% Speed`;
        
        // Text outline
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(slowdownText, this.canvas.width / 2, 80);
        
        // Text fill with color based on speed
        const speedColor = speedPercent > 300 ? '#FF0000' : 
                          speedPercent > 200 ? '#FFA500' : 
                          speedPercent > 150 ? '#FFFF00' : '#00FF00';
        this.ctx.fillStyle = speedColor;
        this.ctx.fillText(slowdownText, this.canvas.width / 2, 80);
        
        // Invincibility indicator (fading during slowdown, persistent during extended invincibility)
        if (intensity > 0.5 || this.powerUp.extendedInvincibility) {
            if (this.powerUp.extendedInvincibility) {
                // Show pipe counter during extended invincibility
                this.ctx.globalAlpha = 0.9;
                this.ctx.fillStyle = '#00FFFF';
                this.ctx.fillText(`🛡️ INVINCIBLE (${this.powerUp.invincibilityPipesLeft} pipes)`, this.canvas.width / 2, 120);
            } else {
                // Fading invincibility during slowdown
                this.ctx.globalAlpha = (intensity - 0.5) * 2 * 0.7;
                this.ctx.fillStyle = '#00FFFF';
                this.ctx.fillText('🛡️ INVINCIBLE', this.canvas.width / 2, 120);
            }
        }
        
        this.ctx.globalAlpha = 1.0;
        this.ctx.textAlign = 'left';
    }
    
    drawExtendedInvincibilityEffects() {
        // Subtle effects for extended invincibility period
        this.ctx.globalAlpha = 0.8;
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        
        // Pipe counter with pulsing effect
        const pulseIntensity = Math.sin(Date.now() * 0.008) * 0.3 + 0.7;
        this.ctx.globalAlpha = pulseIntensity;
        
        // Text outline
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(`🛡️ INVINCIBLE (${this.powerUp.invincibilityPipesLeft} pipes left)`, this.canvas.width / 2, 100);
        
        // Text fill
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillText(`🛡️ INVINCIBLE (${this.powerUp.invincibilityPipesLeft} pipes left)`, this.canvas.width / 2, 100);
        
        // Subtle shield effect around the bird
        this.ctx.globalAlpha = 0.3 * pulseIntensity;
        this.ctx.strokeStyle = '#00FFFF';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width * 0.15, this.canvas.height / 2, 40, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.globalAlpha = 1.0;
        this.ctx.textAlign = 'left';
    }
    
    drawSafeZoneEffects() {
        const safeZoneElapsed = Date.now() - this.powerUp.safeZoneStartTime;
        const safeZoneProgress = Math.min(safeZoneElapsed / this.powerUp.safeZoneDuration, 1);
        const timeLeft = Math.ceil((this.powerUp.safeZoneDuration - safeZoneElapsed) / 1000);
        
        // Gentle pulsing background to indicate safe zone
        this.ctx.globalAlpha = 0.1 + Math.sin(Date.now() * 0.01) * 0.05;
        this.ctx.fillStyle = '#00FF88';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Safe zone indicator text
        this.ctx.globalAlpha = 0.9;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        
        // Text outline
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 4;
        this.ctx.strokeText('🛡️ SAFE ZONE', this.canvas.width / 2, 100);
        
        // Text fill
        this.ctx.fillStyle = '#00FF88';
        this.ctx.fillText('🛡️ SAFE ZONE', this.canvas.width / 2, 100);
        
        // Countdown timer
        this.ctx.font = 'bold 18px Arial';
        this.ctx.strokeText(`${timeLeft}s until pipes resume`, this.canvas.width / 2, 130);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(`${timeLeft}s until pipes resume`, this.canvas.width / 2, 130);
        
        // Mobile-specific control reminder
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            this.ctx.font = 'bold 16px Arial';
            this.ctx.strokeText('📱 Get ready to control!', this.canvas.width / 2, 160);
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillText('📱 Get ready to control!', this.canvas.width / 2, 160);
        }
        
        // Progress bar
        const barWidth = this.canvas.width * 0.6;
        const barHeight = 8;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = 180;
        
        // Background bar
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Progress bar
        this.ctx.globalAlpha = 0.8;
        this.ctx.fillStyle = '#00FF88';
        this.ctx.fillRect(barX, barY, barWidth * (1 - safeZoneProgress), barHeight);
        
        this.ctx.globalAlpha = 1.0;
        this.ctx.textAlign = 'left';
    }
    
    drawBird() {
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2);
        this.ctx.rotate(this.bird.rotation);
        
        // Apply flickering effect during extended invincibility
        if (this.powerUp.extendedInvincibility) {
            // Fast flickering effect - visible/invisible every 100ms
            const flickerRate = 100; // milliseconds
            const isVisible = Math.floor(Date.now() / flickerRate) % 2 === 0;
            
            if (!isVisible) {
                this.ctx.globalAlpha = 0.3; // Semi-transparent when "invisible"
            } else {
                this.ctx.globalAlpha = 0.8; // Slightly transparent when "visible"
            }
        } else if (this.powerUp.active) {
            // Slight glow effect during power-up
            this.ctx.globalAlpha = 1.0;
            this.ctx.shadowColor = '#FFD700';
            this.ctx.shadowBlur = 10;
        } else {
            // Normal visibility
            this.ctx.globalAlpha = 1.0;
        }
        
        // Use custom image or animated default bird
        let birdImage;
        if (this.audio.custom.birdImage) {
            birdImage = this.audio.custom.birdImage;
        } else {
            // Use animated frame for default bird
            birdImage = this.birdFrames[this.currentFrame];
        }
        
        this.ctx.drawImage(
            birdImage,
            -this.bird.width / 2,
            -this.bird.height / 2,
            this.bird.width,
            this.bird.height
        );
        
        this.ctx.restore();
    }
    
    drawEasterEggs() {
        for (const egg of this.easterEggs) {
            if (egg.x + egg.width >= this.camera.x && egg.x <= this.camera.x + this.canvas.width) {
                this.ctx.save();
                this.ctx.translate(egg.x + egg.width / 2, egg.y + egg.height / 2);
                this.ctx.rotate(egg.rotation);
                this.ctx.scale(egg.pulseScale, egg.pulseScale);
                
                // Draw glowing easter egg
                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
                gradient.addColorStop(0, '#FFD700');
                gradient.addColorStop(0.7, '#FFA500');
                gradient.addColorStop(1, 'rgba(255, 165, 0, 0.3)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, 15, 18, 0, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Add sparkle effect
                this.ctx.fillStyle = '#FFFFFF';
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3 + egg.rotation;
                    const x = Math.cos(angle) * 8;
                    const y = Math.sin(angle) * 8;
                    this.ctx.fillRect(x - 1, y - 1, 2, 2);
                }
                
                this.ctx.restore();
            }
        }
    }
    
    drawPowerUpEffects() {
        // Speed lines effect
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.lineWidth = 3;
        
        for (let i = 0; i < 20; i++) {
            const x = (this.camera.x + i * 50) % this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const length = 40 + Math.random() * 60;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x - length, y);
            this.ctx.stroke();
        }
        
        // Screen flash effect
        const timeInPowerUp = Date.now() - this.powerUp.startTime;
        const flashIntensity = Math.sin(timeInPowerUp * 0.02) * 0.1 + 0.05;
        
        this.ctx.fillStyle = `rgba(255, 255, 0, ${flashIntensity})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Power-up timer display with safety indicator
        const timeRemaining = this.powerUp.duration - timeInPowerUp;
        const secondsLeft = Math.ceil(timeRemaining / 1000);
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        
        if (timeRemaining <= 0) {
            // Power-up time expired but waiting for safe area
            if (!this.isBirdInSafeArea()) {
                this.ctx.fillStyle = '#FF6B6B';
                this.ctx.fillText('GOTTA GO FAST! (Finding safe exit...)', this.canvas.width / 2, 100);
            } else {
                this.ctx.fillText(`GOTTA GO FAST! ${secondsLeft}s`, this.canvas.width / 2, 100);
            }
        } else {
            this.ctx.fillText(`GOTTA GO FAST! ${secondsLeft}s`, this.canvas.width / 2, 100);
        }
        
        this.ctx.textAlign = 'left';
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
        const currentTime = performance.now();
        
        // Calculate delta time for smooth movement
        this.deltaTime = (currentTime - this.lastFrameTime) / 16.67; // Normalize to 60fps
        
        // Performance monitoring
        this.performanceMonitor.frameCount++;
        if (this.deltaTime > 2) { // Frame took more than 2x expected time
            this.performanceMonitor.lagFrames++;
        }
        
        // Check performance every 5 seconds and adjust if needed
        if (currentTime - this.performanceMonitor.lastPerformanceCheck > this.performanceMonitor.performanceCheckInterval) {
            if (this.performanceMonitor.lagFrames > this.performanceMonitor.maxLagFrames && !this.performanceMonitor.qualityReduced) {
                console.log(`⚡ Performance issue detected: ${this.performanceMonitor.lagFrames} lag frames in 5s. Reducing quality.`);
                this.frameInterval = 1000 / 45; // Reduce to 45 FPS
                this.performanceMonitor.qualityReduced = true;
            }
            
            // Reset counters
            this.performanceMonitor.frameCount = 0;
            this.performanceMonitor.lagFrames = 0;
            this.performanceMonitor.lastPerformanceCheck = currentTime;
        }
        
        // Frame rate limiting for performance (but smoother)
        if (currentTime - this.lastFrameTime >= this.frameInterval) {
            // Only update game state if not paused
            if (this.gameState !== 'paused') {
                this.update();
            }
            this.render();
            this.lastFrameTime = currentTime;
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    // Mobile Cache Management
    forceCacheRefresh() {
        // Check if we're on mobile
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
        
        if (isMobile) {
            console.log('📱 Mobile detected - implementing cache refresh strategies');
            
            // Force reload if localStorage indicates stale cache
            const currentVersion = this.currentVersion || '3.2.0';
            const storedVersion = localStorage.getItem('flappyGameVersion');
            
            if (storedVersion !== currentVersion) {
                console.log(`🔄 Version change detected: ${storedVersion} → ${currentVersion}`);
                localStorage.setItem('flappyGameVersion', currentVersion);
                
                // Clear any cached audio or image objects
                this.clearCachedAssets();
                
                // Force browser to bypass cache on next resource loads
                this.addCacheBustingToImages();
            }
            
        // Add mobile-specific performance optimizations
        this.optimizeForMobile();
        
        // Set up mobile app lifecycle detection
        this.setupMobileLifecycleHandlers();
        }
    }
    
    initializeVersion() {
        // Generate version number based on current date and time
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        
        // Create version in format: YYYY.MM.DD.HHMM
        const autoVersion = `${year}.${month}.${day}.${hour}${minute}`;
        
        // Store the auto-generated version
        this.currentVersion = autoVersion;
        
        // Update version display if it exists
        this.updateVersionDisplay();
        
        // Update cache-busting parameters
        this.updateCacheBustingParameters();
    }
    
    updateVersionDisplay() {
        const versionElement = document.querySelector('.version-number');
        if (versionElement) {
            versionElement.textContent = `v${this.currentVersion}`;
        }
    }
    
    updateCacheBustingParameters() {
        // Update all cache-busting parameters in the document
        const scripts = document.querySelectorAll('script[src*="?v="]');
        const links = document.querySelectorAll('link[href*="?v="]');
        
        [...scripts, ...links].forEach(element => {
            const src = element.src || element.href;
            if (src) {
                const newSrc = src.replace(/\?v=[\d.]+/, `?v=${this.currentVersion}`);
                if (element.src) {
                    element.src = newSrc;
                } else {
                    element.href = newSrc;
                }
            }
        });
    }
    
    clearCachedAssets() {
        // Clear any cached audio references
        if (typeof(Storage) !== "undefined") {
            // Clear audio-related cache keys
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('audio') || key.includes('sound') || key.includes('music'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => {
                console.log(`🧹 Clearing cached asset: ${key}`);
                localStorage.removeItem(key);
            });
        }
    }
    
    addCacheBustingToImages() {
        // Add timestamp to any dynamically loaded images
        this.cacheBustParam = `?cb=${Date.now()}`;
        console.log('🔄 Cache busting parameter added:', this.cacheBustParam);
    }
    
    optimizeForMobile() {
        // Mobile-specific optimizations
        if (window.navigator && window.navigator.serviceWorker) {
            // Register service worker for better cache control
            window.navigator.serviceWorker.register('/sw.js').then(() => {
                console.log('📱 Service worker registered for cache control');
            }).catch(err => {
                console.log('📱 Service worker registration failed (normal if not available):', err.message);
            });
        }
        
        // Prevent mobile zoom and improve touch response
        document.addEventListener('touchstart', function(e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
        
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(e) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }
    
    setupMobileLifecycleHandlers() {
        // Handle mobile app lifecycle events
        let appHidden = false;
        let appHiddenTime = 0;
        
        // Page visibility API for mobile app switching
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                appHidden = true;
                appHiddenTime = Date.now();
                console.log('📱 App hidden - pausing game');
                
                // Pause game if playing
                if (this.gameState === 'playing') {
                    this.gameState = 'paused';
                }
            } else {
                console.log('📱 App visible - checking for updates');
                
                if (appHidden) {
                    const hiddenDuration = Date.now() - appHiddenTime;
                    
                    // If app was hidden for more than 30 seconds, check for cache issues
                    if (hiddenDuration > 30000) {
                        console.log('📱 App was hidden for', hiddenDuration, 'ms - checking cache');
                        this.checkForCacheIssues();
                    }
                    
                    // Resume game if it was playing
                    if (this.gameState === 'paused') {
                        this.gameState = 'playing';
                    }
                }
                
                appHidden = false;
            }
        });
        
        // Handle mobile browser refresh/reload
        window.addEventListener('beforeunload', () => {
            console.log('📱 Page unloading - saving state');
            localStorage.setItem('flappyLastSession', Date.now().toString());
        });
        
        // Check for stale sessions on load
        const lastSession = localStorage.getItem('flappyLastSession');
        if (lastSession) {
            const sessionAge = Date.now() - parseInt(lastSession);
            if (sessionAge > 300000) { // 5 minutes
                console.log('📱 Stale session detected - clearing cache');
                this.clearCachedAssets();
            }
        }
    }
    
    checkForCacheIssues() {
        // Check if the game is running an old version
        const currentVersion = '3.2.0';
        const storedVersion = localStorage.getItem('flappyGameVersion');
        
        if (!storedVersion || storedVersion !== currentVersion) {
            console.log('📱 Version mismatch detected - refreshing');
            localStorage.setItem('flappyGameVersion', currentVersion);
            
            // Gentle refresh without losing game state
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new FlappyBirdGame();
});
