/**
 * Smart Device Detection and Configuration System
 * Automatically detects device type and applies optimized settings
 */

class DeviceConfig {
    constructor() {
        this.deviceInfo = this.detectDevice();
        this.config = this.getOptimizedConfig();
        
        console.log('📱 Device detected:', this.deviceInfo.type, this.deviceInfo);
        console.log('⚙️ Applied config:', this.config);
    }
    
    detectDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const pixelRatio = window.devicePixelRatio || 1;
        const isPortrait = screenHeight > screenWidth;
        
        // Device type detection
        const isMobile = screenWidth <= 768 || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        const isTablet = screenWidth > 768 && screenWidth <= 1024 && /ipad|tablet/i.test(userAgent);
        const isDesktop = !isMobile && !isTablet;
        
        // Mobile sub-categories
        const isPhone = isMobile && screenWidth <= 480;
        const isLargeMobile = isMobile && screenWidth > 480;
        
        // Touch capability
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Performance estimation
        const isLowEnd = pixelRatio < 2 && (screenWidth * screenHeight) < (1280 * 720);
        const isHighEnd = pixelRatio >= 3 && (screenWidth * screenHeight) >= (1920 * 1080);
        
        // Screen categories
        const isSmallScreen = screenWidth < 375;
        const isMediumScreen = screenWidth >= 375 && screenWidth <= 768;
        const isLargeScreen = screenWidth > 768;
        
        return {
            type: isPhone ? 'phone' : isTablet ? 'tablet' : 'desktop',
            isMobile,
            isTablet,
            isDesktop,
            isPhone,
            isLargeMobile,
            isPortrait,
            hasTouch,
            isLowEnd,
            isHighEnd,
            isSmallScreen,
            isMediumScreen,
            isLargeScreen,
            screenWidth,
            screenHeight,
            pixelRatio,
            aspectRatio: screenWidth / screenHeight
        };
    }
    
    getOptimizedConfig() {
        const device = this.deviceInfo;
        
        if (device.isPhone) {
            return this.getMobileConfig();
        } else if (device.isTablet) {
            return this.getTabletConfig();
        } else {
            return this.getDesktopConfig();
        }
    }
    
    getMobileConfig() {
        const device = this.deviceInfo;
        
        return {
            // Game scaling for mobile
            gameScale: device.isSmallScreen ? 1.8 : device.isPortrait ? 1.6 : 1.4,
            
            // Bird settings
            bird: {
                width: device.isSmallScreen ? 70 : 60,
                height: device.isSmallScreen ? 56 : 48,
                speed: 3 // Slightly slower for mobile precision
            },
            
            // Pipe settings
            pipes: {
                width: device.isSmallScreen ? 80 : 70,
                gap: device.isSmallScreen ? 320 : 280,
                speed: 1.2 // Slower pipes for mobile
            },
            
            // UI settings
            ui: {
                fontSize: {
                    small: device.isSmallScreen ? 18 : 16,
                    medium: device.isSmallScreen ? 24 : 20,
                    large: device.isSmallScreen ? 32 : 28,
                    xlarge: device.isSmallScreen ? 42 : 36
                },
                buttonSize: device.isSmallScreen ? 60 : 50,
                padding: device.isSmallScreen ? 25 : 20
            },
            
            // Performance settings
            performance: {
                targetFPS: device.isLowEnd ? 45 : 60,
                simplifyBackground: device.isLowEnd,
                reduceEffects: device.isLowEnd
            },
            
            // Touch settings
            touch: {
                preventZoom: true,
                preventScroll: true,
                tapDelay: 50 // Slight delay for better touch response
            }
        };
    }
    
    getTabletConfig() {
        const device = this.deviceInfo;
        
        return {
            // Game scaling for tablet
            gameScale: device.isPortrait ? 1.3 : 1.1,
            
            // Bird settings
            bird: {
                width: 55,
                height: 44,
                speed: 3.5
            },
            
            // Pipe settings
            pipes: {
                width: 65,
                gap: 260,
                speed: 1.3
            },
            
            // UI settings
            ui: {
                fontSize: {
                    small: 15,
                    medium: 19,
                    large: 26,
                    xlarge: 34
                },
                buttonSize: 55,
                padding: 22
            },
            
            // Performance settings
            performance: {
                targetFPS: 60,
                simplifyBackground: false,
                reduceEffects: device.isLowEnd
            },
            
            // Touch settings
            touch: {
                preventZoom: true,
                preventScroll: false,
                tapDelay: 30
            }
        };
    }
    
    getDesktopConfig() {
        return {
            // Game scaling for desktop
            gameScale: 1.0,
            
            // Bird settings
            bird: {
                width: 50,
                height: 40,
                speed: 4
            },
            
            // Pipe settings
            pipes: {
                width: 60,
                gap: 250,
                speed: 1.5
            },
            
            // UI settings
            ui: {
                fontSize: {
                    small: 14,
                    medium: 18,
                    large: 24,
                    xlarge: 32
                },
                buttonSize: 50,
                padding: 20
            },
            
            // Performance settings
            performance: {
                targetFPS: 60,
                simplifyBackground: false,
                reduceEffects: false
            },
            
            // Touch settings
            touch: {
                preventZoom: false,
                preventScroll: false,
                tapDelay: 0
            }
        };
    }
    
    // Apply configuration to game elements
    applyToCanvas(canvas) {
        if (this.deviceInfo.isMobile) {
            canvas.style.touchAction = 'manipulation';
            
            if (this.config.touch.preventScroll) {
                canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
            }
        }
    }
    
    applyToGame(game) {
        // Apply bird size
        if (game.bird) {
            const scale = this.config.gameScale;
            game.bird.width = this.config.bird.width * scale;
            game.bird.height = this.config.bird.height * scale;
        }
        
        // Apply pipe settings
        if (game.settings) {
            game.settings.pipeWidth = this.config.pipes.width * this.config.gameScale;
            game.settings.pipeGap = this.config.pipes.gap * this.config.gameScale;
            game.settings.birdSpeed = this.config.bird.speed;
            game.settings.pipeSpeed = this.config.pipes.speed;
        }
        
        // Apply performance settings
        if (game.deviceOptimization) {
            game.deviceOptimization.targetFPS = this.config.performance.targetFPS;
            game.deviceOptimization.simplifyBackground = this.config.performance.simplifyBackground;
            game.deviceOptimization.reduceEffects = this.config.performance.reduceEffects;
        }
    }
    
    // Get CSS media queries for responsive design
    getMediaQueries() {
        return {
            mobile: '@media (max-width: 768px)',
            tablet: '@media (min-width: 769px) and (max-width: 1024px)',
            desktop: '@media (min-width: 1025px)',
            portrait: '@media (orientation: portrait)',
            landscape: '@media (orientation: landscape)',
            highDPI: '@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)'
        };
    }
}

// Export for use in main game
window.DeviceConfig = DeviceConfig;
