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
        this.lastGameState = null; // For render optimization
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
                powerup: parseFloat(localStorage.getItem('flappyPowerupVolume')) || 60
            },
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
            invincibilityPipesTotal: 2 // 2 pipes of extended invincibility
        };
        
        this.easterEggs = [];
        this.easterEggSpawnChance = 0.12; // 12% chance per pipe
        
        // Sonic power-up music
        this.sonicMusic = null;
        this.loadSonicMusic();
        
        // Volume preview system
        this.volumePreviewTimeout = null;
        this.volumePreviewAudio = null;
        
        this.init();
    }
    
    loadSonicMusic() {
        // Load the Sonic "Gotta Go Fast" music
        this.sonicMusic = new Audio('Gotta Go Fast (Sonic Theme) - MLG Sound Effect (HD) ( 160kbps ).mp3');
        this.sonicMusic.volume = 0.7;
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
        
        // Store optimization flags for later use
        this.deviceOptimization = {
            isMobile,
            isLowEnd,
            reduceDetails: isLowEnd,
            simplifyBackground: isLowEnd && pixelRatio < 1.5
        };
        
        console.log(`🎮 Device optimized: Mobile=${isMobile}, LowEnd=${isLowEnd}, FPS=${this.targetFPS}`);
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Position bird
        this.bird.x = this.canvas.width * 0.15;
        this.bird.y = this.canvas.height / 2;
        
        // Scale for different screen sizes
        const scale = Math.max(Math.min(this.canvas.width / 800, this.canvas.height / 600), 0.5);
        this.bird.width = 50 * scale; // Updated to match new sprite
        this.bird.height = 40 * scale; // Updated to match new sprite
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
                console.log('🔊 Audio context suspended, will resume on user interaction');
            }
            
            // Ensure audio context works on mobile
            const resumeAudioContext = () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume().then(() => {
                        console.log('✅ Audio context resumed for mobile');
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
        
        // Default background music - full melody (ensure it works on mobile)
        this.audio.sounds.bgMusic = this.createMelodySound();
    }
    
    loadMarioTapSound() {
        // Load Super Mario laugh sound with mobile-specific handling
        const marioLaugh = new Audio('Super mario laugh Sound Effects.mp3');
        marioLaugh.volume = 0.6; // Pleasant volume
        
        // Mobile-specific audio settings
        marioLaugh.preload = 'auto'; // Ensure it preloads on mobile
        marioLaugh.crossOrigin = 'anonymous'; // Handle CORS issues
        
        // Track loading state for mobile debugging
        let isLoaded = false;
        let loadAttempts = 0;
        const maxLoadAttempts = 3;
        
        // Set up the Mario laugh as tap sound with better mobile support
        this.audio.sounds.tap = () => {
            if (isLoaded && marioLaugh.readyState >= 2) { // Audio is fully loaded
                marioLaugh.volume = this.getEffectiveVolume('tap');
                marioLaugh.currentTime = 0;
                
                // Clone the audio for mobile compatibility (prevents conflicts)
                const marioClone = marioLaugh.cloneNode();
                marioClone.volume = this.getEffectiveVolume('tap');
                marioClone.play().catch(error => {
                    console.log('Mario laugh clone failed, trying original:', error);
                    marioLaugh.play().catch(error2 => {
                        console.log('Mario laugh original failed, using fallback:', error2);
                        this.createBeepSound(800, 3.0)();
                    });
                });
            } else if (loadAttempts < maxLoadAttempts) {
                // Try to reload the audio
                loadAttempts++;
                console.log(`🔄 Attempting to reload Mario laugh (attempt ${loadAttempts})`);
                marioLaugh.load();
                // Use fallback for this tap
                this.createBeepSound(800, 3.0)();
            } else {
                // Fallback if loading keeps failing
                console.log('⚠️ Mario laugh loading failed, using synthesized sound');
                this.createBeepSound(800, 3.0)();
            }
        };
        
        // Enhanced error handling for mobile
        marioLaugh.addEventListener('error', (e) => {
            console.error('❌ Mario laugh failed to load:', e);
            isLoaded = false;
            // Don't immediately fallback - let the retry logic handle it
        });
        
        marioLaugh.addEventListener('canplaythrough', () => {
            console.log('✅ Mario laugh loaded successfully on this platform!');
            isLoaded = true;
            loadAttempts = 0; // Reset attempts on successful load
        });
        
        marioLaugh.addEventListener('loadeddata', () => {
            console.log('📁 Mario laugh data loaded');
            isLoaded = true;
        });
        
        // Force load attempt
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
            
            // Pleasant envelope for musical feedback
            masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            masterGain.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.02); // Gentler attack
            masterGain.gain.exponentialRampToValueAtTime(0.25, this.audioContext.currentTime + 0.08); // Moderate sustain
            masterGain.gain.exponentialRampToValueAtTime(0.15, this.audioContext.currentTime + 0.3); // Maintain presence
            masterGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration); // Smooth fade
            
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
            
            // CATASTROPHIC envelope - INSTANT DOOM!
            masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            masterGain.gain.linearRampToValueAtTime(1.2, this.audioContext.currentTime + 0.02); // MASSIVE IMPACT!
            masterGain.gain.exponentialRampToValueAtTime(0.4, this.audioContext.currentTime + 0.1); // Sustain the doom
            masterGain.gain.exponentialRampToValueAtTime(0.1, this.audioContext.currentTime + 0.8); // Slow fade of despair
            masterGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration); // Final silence
            
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
                        this.startMelodyIntervals();
                    }).catch(e => {
                        console.error('❌ Failed to resume audio context for melody:', e);
                    });
                    return;
                }
                
                this.startMelodyIntervals();
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
        
        // Define the melody intervals method within the closure
        this.startMelodyIntervals = () => {
                
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
            removeTapSound: () => this.removeCustomSound('tap'),
            removeCrashSound: () => this.removeCustomSound('crash'),
            removeBgMusic: () => this.removeCustomSound('bgMusic')
        };
        
        // Setup volume sliders
        const volumeSliders = {
            masterVolumeSlider: (e) => this.updateVolume('master', parseInt(e.target.value)),
            musicVolumeSlider: (e) => this.updateVolume('music', parseInt(e.target.value)),
            tapVolumeSlider: (e) => this.updateVolume('tap', parseInt(e.target.value)),
            crashVolumeSlider: (e) => this.updateVolume('crash', parseInt(e.target.value)),
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
        
        this.bird = {
            x: this.canvas.width * 0.15,
            y: this.canvas.height / 2,
            width: 50 * scale, // Updated to match new sprite
            height: 40 * scale, // Updated to match new sprite
            velocity: 0,
            rotation: 0
        };
        
        this.pipes = [];
        this.easterEggs = [];
        this.score = 0;
        this.camera = { x: 0, y: 0 };
        
        // Reset power-up
        if (this.powerUp.active) {
            this.deactivatePowerUp();
        }
        this.powerUp.gracePipeAllowed = false;
        this.powerUp.gracePipeUsed = false;
        this.powerUp.slowdownActive = false;
        this.powerUp.currentSpeedMultiplier = 1;
        this.powerUp.extendedInvincibility = false;
        this.powerUp.invincibilityPipesLeft = 0;
        
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
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Progressive difficulty
        this.settings.gravity = this.difficulty.baseGravity + (this.score * 0.01);
        this.settings.pipeSpeed = this.difficulty.basePipeSpeed + (this.score * 0.05);
        this.settings.pipeGap = Math.max(this.difficulty.basePipeGap - (this.score * 2), 120);
        
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
        this.bird.rotation = Math.min(Math.max(this.bird.velocity * 0.05, -0.5), 0.5);
        
        // Update wing flapping animation
        this.updateBirdAnimation();
        
        // Update camera
        this.camera.x = this.bird.x - this.canvas.width * 0.3;
        
        // Generate pipes
        const pipeSpacing = Math.max(this.canvas.width * 0.5, 400);
        if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < this.bird.x + this.canvas.width) {
            this.createPipe();
        }
        
        // Update pipes
        this.updatePipes();
        
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
                
                // Decrement extended invincibility pipe counter
                if (this.powerUp.extendedInvincibility && this.powerUp.invincibilityPipesLeft > 0) {
                    this.powerUp.invincibilityPipesLeft--;
                    console.log(`🛡️ Extended invincibility: ${this.powerUp.invincibilityPipesLeft} pipes remaining`);
                    
                    if (this.powerUp.invincibilityPipesLeft <= 0) {
                        this.powerUp.extendedInvincibility = false;
                        console.log('🛡️ Extended invincibility ended - bird is now vulnerable');
                    }
                }
            }
        }
    }
    
    createPipe() {
        const minHeight = 50;
        const maxHeight = this.canvas.height - this.settings.pipeGap - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        // Random pipe spacing for varied gameplay
        const baseSpacing = Math.max(this.canvas.width * 0.5, 400);
        const spacingVariation = baseSpacing * 0.4; // 40% variation
        const randomSpacing = baseSpacing + (Math.random() - 0.5) * spacingVariation;
        
        const pipeX = this.pipes.length === 0 ? 
            this.bird.x + this.canvas.width * 0.8 : 
            this.pipes[this.pipes.length - 1].x + randomSpacing;
        
        this.pipes.push({
            x: pipeX,
            topHeight: topHeight,
            bottomY: topHeight + this.settings.pipeGap,
            scored: false
        });
        
        // Spawn easter egg with chance (only if power-up not active)
        if (Math.random() < this.easterEggSpawnChance && !this.powerUp.active) {
            this.spawnEasterEgg(pipeX + this.settings.pipeWidth + 100);
        }
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
        for (let i = this.easterEggs.length - 1; i >= 0; i--) {
            const egg = this.easterEggs[i];
            
            // Animate the easter egg
            egg.rotation += 0.1;
            egg.pulseScale = 1 + Math.sin(Date.now() * 0.01 + i) * 0.2;
            
            // Remove off-screen eggs
            if (egg.x + egg.width < this.camera.x - 100) {
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
    
    collectEasterEgg(index) {
        this.easterEggs.splice(index, 1);
        this.activatePowerUp();
    }
    
    activatePowerUp() {
        this.powerUp.active = true;
        this.powerUp.startTime = Date.now();
        this.powerUp.gracePipeAllowed = false; // Reset grace pipe for new power-up
        this.powerUp.gracePipeUsed = false;
        
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
                    setTimeout(() => {
                        const osc = this.audioContext.createOscillator();
                        const gain = this.audioContext.createGain();
                        
                        osc.frequency.value = freq;
                        osc.type = 'sawtooth';
                        osc.connect(gain);
                        gain.connect(this.audioContext.destination);
                        
                        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                        gain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
                        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                        
                        osc.start(this.audioContext.currentTime);
                        osc.stop(this.audioContext.currentTime + 0.2);
                    }, index * 50);
                });
            } else {
                clearInterval(powerUpInterval);
            }
        }, 200); // Fast, energetic rhythm
    }
    
    deactivatePowerUp() {
        this.powerUp.active = false;
        this.powerUp.gracePipeAllowed = true; // Enable grace pipe
        this.powerUp.gracePipeUsed = false; // Reset grace pipe usage
        
        // Start gradual slowdown
        this.powerUp.slowdownActive = true;
        this.powerUp.slowdownStartTime = Date.now();
        
        // Start extended invincibility for 2 more pipes
        this.powerUp.extendedInvincibility = true;
        this.powerUp.invincibilityPipesLeft = this.powerUp.invincibilityPipesTotal;
        
        console.log(`🛡️ Power-up ended - Starting gradual slowdown, grace pipe, and extended invincibility for ${this.powerUp.invincibilityPipesTotal} pipes!`);
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
        const cornerSafeZone = 12;
        
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
        
        // Debug logging for invincibility states (only when bird is near pipes)
        if (this.powerUp.extendedInvincibility && this.pipes.length > 0) {
            const nearPipe = this.pipes.some(pipe => 
                Math.abs(this.bird.x - pipe.x) < 100
            );
            if (nearPipe) {
                console.log(`🛡️ Extended invincibility: ${this.powerUp.invincibilityPipesLeft} pipes left, phasing: ${canPhaseThrough}`);
            }
        }
        
        if (!canPhaseThrough) {
            for (const pipe of this.pipes) {
                const pipeLeft = pipe.x + pipeMargin;
                const pipeRight = pipe.x + this.settings.pipeWidth - pipeMargin;
                const topPipeBottom = pipe.topHeight - pipeMargin;
                const bottomPipeTop = pipe.bottomY + pipeMargin;
                
                if (birdRight > pipeLeft && birdLeft < pipeRight) {
                    // Check if this is the grace pipe (first pipe after power-up)
                    if (this.powerUp.gracePipeAllowed && !this.powerUp.gracePipeUsed) {
                        // Mark grace pipe as used and allow passage
                        this.powerUp.gracePipeUsed = true;
                        this.powerUp.gracePipeAllowed = false;
                        console.log('🛡️ Grace pipe used - safe passage granted!');
                        continue; // Skip collision for this pipe
                    }
                    
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
        
        // Hide the in-game HUD to prevent overlap
        document.getElementById('gameHUD').style.display = 'none';
        
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
        }
    }
    
    startBackgroundMusic() {
        console.log('🎵 Starting background music...', {
            customMusic: !!this.audio.custom.bgMusic,
            defaultMusic: !!this.audio.sounds.bgMusic,
            enabled: this.audio.enabled,
            volume: this.getEffectiveVolume('music')
        });
        
        if (this.audio.custom.bgMusic) {
            this.audio.custom.bgMusic.volume = this.getEffectiveVolume('music');
            this.audio.custom.bgMusic.play().catch(e => {
                console.log('Custom music failed to play:', e);
            });
        } else if (this.audio.sounds.bgMusic) {
            try {
                // Ensure audio context is resumed (critical for mobile)
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    console.log('🔊 Resuming audio context for background music...');
                    this.audioContext.resume().then(() => {
                        console.log('✅ Audio context resumed, starting background music');
                        this.audio.sounds.bgMusic.start();
                    }).catch(e => {
                        console.error('❌ Failed to resume audio context:', e);
                    });
                } else if (this.audioContext) {
                    console.log('🎵 Starting background music (audio context ready)');
                    this.audio.sounds.bgMusic.start();
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
        const masterMultiplier = this.audio.volumes.master / 100;
        
        // Update background music volume
        if (this.audio.custom.bgMusic) {
            this.audio.custom.bgMusic.volume = this.audio.enabled ? 
                (this.audio.volumes.music / 100) * masterMultiplier : 0;
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
                                 soundType === 'bgMusic' ? this.audio.custom.bgMusic : false;
            
            button.disabled = !hasCustomSound;
            button.style.opacity = hasCustomSound ? '0.7' : '0.3';
        }
    }
    
    updateAllRemoveButtonStates() {
        this.updateRemoveButtonState('tap');
        this.updateRemoveButtonState('crash');
        this.updateRemoveButtonState('bgMusic');
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
                    audio.volume = 0.5;
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
                birdUpload: '🐦 Upload Bird Sprite',
                tapSoundUpload: '🔊 Upload Tap Sound',
                crashSoundUpload: '💥 Upload Crash Sound',
                bgMusicUpload: '🎵 Upload Background Music'
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
        
        if (this.gameState === 'playing' || this.gameState === 'gameOver') {
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
            }
        }
        
        this.lastGameState = this.gameState;
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
        
        // Frame rate limiting for performance (but smoother)
        if (currentTime - this.lastFrameTime >= this.frameInterval) {
            this.update();
            this.render();
            this.lastFrameTime = currentTime;
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new FlappyBirdGame();
});
