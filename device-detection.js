/**
 * Device Detection and Mobile Optimization Utilities
 * Automatically detects device type and provides optimized configurations
 */

class DeviceDetector {
    constructor() {
        this.deviceType = this.detectDeviceType();
        this.capabilities = this.detectCapabilities();
        this.optimizations = this.getOptimizations();
    }

    /**
     * Detect if the device is mobile, tablet, or desktop
     */
    detectDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Screen size detection
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const isSmallScreen = screenWidth < 768 || screenHeight < 500;
        
        if (isMobile || (isTouch && isSmallScreen)) {
            return 'mobile';
        } else if (isTablet || (isTouch && !isSmallScreen && screenWidth < 1024)) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }

    /**
     * Detect device capabilities for optimization
     */
    detectCapabilities() {
        return {
            touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            orientation: 'orientation' in screen,
            vibration: 'vibrate' in navigator,
            fullscreen: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled),
            webGL: this.detectWebGL(),
            highDPI: window.devicePixelRatio > 1,
            memory: navigator.deviceMemory || 4, // Default to 4GB if not available
            cores: navigator.hardwareConcurrency || 4,
            connection: navigator.connection || { effectiveType: '4g' }
        };
    }

    /**
     * Detect WebGL support
     */
    detectWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    /**
     * Get device-specific optimizations
     */
    getOptimizations() {
        const device = this.deviceType;
        const caps = this.capabilities;
        
        const optimizations = {
            mobile: {
                // Performance optimizations for mobile
                targetFPS: caps.cores < 4 ? 30 : 60,
                particleCount: 20,
                maxPipes: 4,
                enableShadows: false,
                enableParticles: true,
                enableSmoothing: false,
                audioQuality: 'low',
                preloadAssets: false,
                
                // UI optimizations
                buttonSize: 'large',
                touchTargetSize: 44, // iOS minimum touch target
                fontSize: 'large',
                spacing: 'comfortable',
                showTouchHints: true,
                
                // Game mechanics
                gravity: 0.35,
                jumpPower: { min: -7, max: -12 },
                birdSpeed: 3.5,
                pipeSpeed: 1.2,
                pipeGap: 260,
                
                // Input handling
                touchSensitivity: 0.8,
                doubleTapThreshold: 300,
                longPressThreshold: 500,
                swipeThreshold: 50,
                
                // Battery optimization
                reduceAnimations: false,
                adaptiveQuality: true,
                pauseOnBlur: true
            },
            
            tablet: {
                // Balanced performance for tablets
                targetFPS: 60,
                particleCount: 40,
                maxPipes: 6,
                enableShadows: caps.memory >= 4,
                enableParticles: true,
                enableSmoothing: true,
                audioQuality: 'medium',
                preloadAssets: true,
                
                // UI optimizations
                buttonSize: 'medium',
                touchTargetSize: 40,
                fontSize: 'medium',
                spacing: 'normal',
                showTouchHints: false,
                
                // Game mechanics
                gravity: 0.4,
                jumpPower: { min: -8, max: -14 },
                birdSpeed: 4,
                pipeSpeed: 1.5,
                pipeGap: 270,
                
                // Input handling
                touchSensitivity: 1.0,
                doubleTapThreshold: 300,
                longPressThreshold: 500,
                swipeThreshold: 50,
                
                // Battery optimization
                reduceAnimations: false,
                adaptiveQuality: true,
                pauseOnBlur: true
            },
            
            desktop: {
                // Full quality for desktop
                targetFPS: 60,
                particleCount: 60,
                maxPipes: 8,
                enableShadows: true,
                enableParticles: true,
                enableSmoothing: true,
                audioQuality: 'high',
                preloadAssets: true,
                
                // UI optimizations
                buttonSize: 'normal',
                touchTargetSize: 32,
                fontSize: 'normal',
                spacing: 'compact',
                showTouchHints: false,
                
                // Game mechanics
                gravity: 0.4,
                jumpPower: { min: -8, max: -15 },
                birdSpeed: 4,
                pipeSpeed: 1.5,
                pipeGap: 280,
                
                // Input handling
                touchSensitivity: 1.0,
                doubleTapThreshold: 300,
                longPressThreshold: 500,
                swipeThreshold: 50,
                
                // Battery optimization
                reduceAnimations: false,
                adaptiveQuality: false,
                pauseOnBlur: false
            }
        };

        return optimizations[device];
    }

    /**
     * Get optimized canvas settings
     */
    getCanvasSettings() {
        const opt = this.optimizations;
        const caps = this.capabilities;
        
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            pixelRatio: caps.highDPI ? Math.min(window.devicePixelRatio, 2) : 1,
            antialias: opt.enableSmoothing,
            alpha: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: false,
            powerPreference: caps.memory >= 4 ? 'high-performance' : 'default'
        };
    }

    /**
     * Check if device supports specific feature
     */
    supportsFeature(feature) {
        const features = {
            vibration: this.capabilities.vibration,
            fullscreen: this.capabilities.fullscreen,
            webGL: this.capabilities.webGL,
            touch: this.capabilities.touch,
            orientation: this.capabilities.orientation,
            highDPI: this.capabilities.highDPI
        };
        
        return features[feature] || false;
    }

    /**
     * Get device-specific CSS classes
     */
    getCSSClasses() {
        const classes = [`device-${this.deviceType}`];
        
        if (this.capabilities.touch) classes.push('touch-device');
        if (this.capabilities.highDPI) classes.push('high-dpi');
        if (this.capabilities.orientation) classes.push('orientation-support');
        if (this.capabilities.vibration) classes.push('vibration-support');
        
        // Performance classes
        if (this.capabilities.cores < 4) classes.push('low-performance');
        if (this.capabilities.memory < 4) classes.push('low-memory');
        
        return classes;
    }

    /**
     * Apply device-specific optimizations to document
     */
    applyOptimizations() {
        // Add CSS classes to body
        document.body.classList.add(...this.getCSSClasses());
        
        // Set viewport meta tag for mobile
        if (this.deviceType === 'mobile') {
            let viewport = document.querySelector('meta[name="viewport"]');
            if (!viewport) {
                viewport = document.createElement('meta');
                viewport.name = 'viewport';
                document.head.appendChild(viewport);
            }
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        }
        
        // Disable context menu on mobile
        if (this.deviceType === 'mobile') {
            document.addEventListener('contextmenu', (e) => e.preventDefault());
        }
        
        // Add touch-action CSS
        const style = document.createElement('style');
        style.textContent = `
            .touch-device * {
                touch-action: manipulation;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -webkit-tap-highlight-color: transparent;
            }
            
            .device-mobile {
                --button-size: 48px;
                --font-size-large: 1.4rem;
                --font-size-medium: 1.2rem;
                --spacing-comfortable: 1.5rem;
                --touch-target: 44px;
            }
            
            .device-tablet {
                --button-size: 40px;
                --font-size-large: 1.2rem;
                --font-size-medium: 1rem;
                --spacing-comfortable: 1.2rem;
                --touch-target: 40px;
            }
            
            .device-desktop {
                --button-size: 32px;
                --font-size-large: 1rem;
                --font-size-medium: 0.9rem;
                --spacing-comfortable: 1rem;
                --touch-target: 32px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Get performance monitoring data
     */
    getPerformanceData() {
        return {
            deviceType: this.deviceType,
            capabilities: this.capabilities,
            optimizations: this.optimizations,
            screenSize: {
                width: window.innerWidth,
                height: window.innerHeight,
                ratio: window.innerWidth / window.innerHeight
            },
            timestamp: Date.now()
        };
    }
}

// Export for use in other modules
window.DeviceDetector = DeviceDetector;
