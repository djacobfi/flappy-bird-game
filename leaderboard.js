/**
 * Global Leaderboard System for Flappy Bird
 * Uses Firebase Realtime Database for global score storage
 */

class GlobalLeaderboard {
    constructor() {
        // Firebase configuration (you'll need to replace with your own)
        this.firebaseConfig = {
            apiKey: "AIzaSyAtSBB3Ao22BMxLhKd6vdwyHsDStvYBb4I",
            authDomain: "flappy-x-bb3fd.firebaseapp.com",
            databaseURL: "https://flappy-x-bb3fd-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "flappy-x-bb3fd",
            storageBucket: "flappy-x-bb3fd.firebasestorage.app",
            messagingSenderId: "951359218855",
            appId: "1:951359218855:web:fa4c784ba02d7097a0a782",
            measurementId: "G-86QFLG37JW"
        };
        
        this.db = null;
        this.isConnected = false;
        this.playerName = localStorage.getItem('flappyPlayerName') || this.generateRandomName();
        
        // Local leaderboard fallback
        this.localScores = JSON.parse(localStorage.getItem('flappyLocalLeaderboard')) || [];
        
        console.log(`📊 Initial local scores loaded: ${this.localScores.length}`);
        console.log('📋 Local scores:', this.localScores.map(s => `${s.name}: ${s.score}`));
        
        // Check for backup scores first
        this.checkForBackupScores();
        
        // Clean up any duplicate scores
        this.removeDuplicateScores();
        
        console.log(`📊 Final local scores after processing: ${this.localScores.length}`);
        
        // Remove any demo/bot rows that may exist from older versions
        this.localScores = this.filterScores(this.localScores);
        localStorage.setItem('flappyLocalLeaderboard', JSON.stringify(this.localScores));
        
        this.initializeFirebase();
    }
    
    generateRandomName() {
        const adjectives = ['Flying', 'Soaring', 'Swift', 'Mighty', 'Epic', 'Super', 'Crazy', 'Amazing', 'Brave', 'Cool'];
        const nouns = ['Bird', 'Eagle', 'Falcon', 'Hawk', 'Phoenix', 'Flyer', 'Ace', 'Hero', 'Star', 'Champion'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        // Default names must not include numbers
        return `${randomAdj}${randomNoun}`;
    }

    // Remove demo/bot/invalid entries and normalize list
    filterScores(scores) {
        const blockedNames = new Set(['FlappyMaster','SkyDancer','WingCommander','AirAce','BirdBrain']);
        return (scores || [])
            .filter(s => s && typeof s.score === 'number' && s.name)
            .filter(s => !blockedNames.has(s.name))
            .filter(s => {
                const n = String(s.name).toLowerCase();
                return !n.includes('bot') && !n.includes('demo');
            })
            .sort((a, b) => b.score - a.score);
    }
    
    checkForBackupScores() {
        // Try to recover scores from different possible keys or backups
        const possibleKeys = [
            'flappyLocalLeaderboard',
            'flappyLocalLeaderboard_backup',
            'flappy-scores',
            'flappyBirdScores'
        ];
        
        let recoveredScores = [];
        
        for (const key of possibleKeys) {
            try {
                const scores = JSON.parse(localStorage.getItem(key));
                if (scores && Array.isArray(scores) && scores.length > 0) {
                    console.log(`🔄 Found backup scores in ${key}:`, scores.length);
                    recoveredScores = recoveredScores.concat(scores);
                }
            } catch (e) {
                // Ignore invalid JSON
            }
        }
        
        // Check if we have a best score but no leaderboard (data loss scenario)
        const bestScore = parseInt(localStorage.getItem('flappyBestScore'));
        const playerName = this.playerName;
        
        if (bestScore > 0 && this.localScores.length === 0 && recoveredScores.length === 0) {
            console.log(`🔄 Recovering lost score: ${playerName} - ${bestScore}`);
            recoveredScores.push({
                name: playerName,
                score: bestScore,
                timestamp: Date.now() - 3600000, // 1 hour ago
                recovered: true
            });
        }
        
        // Merge recovered scores with existing
        if (recoveredScores.length > 0) {
            this.localScores = this.localScores.concat(recoveredScores);
            this.localScores.sort((a, b) => b.score - a.score);
            this.localScores = this.localScores.slice(0, 20); // Keep top 20
            
            // Save the merged scores
            localStorage.setItem('flappyLocalLeaderboard', JSON.stringify(this.localScores));
            localStorage.setItem('flappyLocalLeaderboard_backup', JSON.stringify(this.localScores));
            
            console.log(`✅ Recovered ${recoveredScores.length} scores, total: ${this.localScores.length}`);
        }
    }
    
    async initializeFirebase() {
        try {
            // Check if Firebase is available (from CDN)
            if (typeof firebase !== 'undefined') {
                console.log('🔥 Firebase SDK detected, attempting connection...');
                
                // Check if Firebase app already exists (mobile issue)
                let app;
                try {
                    app = firebase.app();
                    console.log('📱 Using existing Firebase app (mobile compatibility)');
                } catch (e) {
                    // App doesn't exist, create it
                    app = firebase.initializeApp(this.firebaseConfig);
                    console.log('🔥 Firebase app initialized');
                }
                
                this.db = firebase.database();
                
                // Mobile-specific connection test with longer timeout
                const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
                const timeout = isMobile ? 8000 : 3000; // Longer timeout for mobile
                
                const testPromise = this.testConnection();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Firebase connection timeout')), timeout);
                });
                
                await Promise.race([testPromise, timeoutPromise]);
                
                this.isConnected = true;
                console.log('✅ Firebase connected successfully!');
                
            } else {
                console.warn('⚠️ Firebase not available, using local storage only');
                this.useLocalStorageOnly();
            }
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            this.useLocalStorageOnly();
        }
    }
    
    async testConnection() {
        try {
            await this.db.ref('.info/connected').once('value');
            console.log('✅ Firebase database connection verified');
        } catch (error) {
            console.error('❌ Firebase database connection failed:', error);
            this.isConnected = false;
            this.useLocalStorageOnly();
        }
    }
    
    useLocalStorageOnly() {
        this.isConnected = false;
        console.log('💾 Using local storage leaderboard only');
    }
    
    async submitScore(score) {
        const scoreEntry = {
            name: this.playerName,
            score: score,
            timestamp: Date.now(),
            date: new Date().toISOString()
        };
        
        // Always save to local storage first
        const localSaved = this.saveToLocalStorage(scoreEntry);
        
        if (!localSaved) {
            console.log('⚠️ Score not saved - duplicate detected');
            return false;
        }
        
        // Try to save to Firebase if connected
        if (this.isConnected) {
            try {
                await this.saveToFirebase(scoreEntry);
                console.log('🏆 Score submitted to global leaderboard!');
                return true;
            } catch (error) {
                console.error('❌ Failed to submit to global leaderboard:', error);
                return false;
            }
        }
        
        return false; // No global submission
    }
    
    saveToLocalStorage(scoreEntry) {
        // Check for duplicate scores from same player within last 10 minutes
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        const isDuplicate = this.localScores.some(existing => 
            existing.name === scoreEntry.name && 
            existing.score === scoreEntry.score &&
            existing.timestamp > tenMinutesAgo
        );
        
        if (isDuplicate) {
            console.log('⚠️ Duplicate score detected, not adding to leaderboard');
            return false;
        }
        
        this.localScores.push(scoreEntry);
        this.localScores.sort((a, b) => b.score - a.score);
        this.localScores = this.localScores.slice(0, 20); // Keep top 20 (increased from 10)
        
        // Save to primary and backup locations
        localStorage.setItem('flappyLocalLeaderboard', JSON.stringify(this.localScores));
        localStorage.setItem('flappyLocalLeaderboard_backup', JSON.stringify(this.localScores));
        
        // Also save timestamp of last save
        localStorage.setItem('flappyLeaderboardLastSave', Date.now().toString());
        
        console.log(`💾 Score saved to local leaderboard (${this.localScores.length} total scores)`);
        return true;
    }
    
    async saveToFirebase(scoreEntry) {
        if (!this.isConnected) throw new Error('Not connected to Firebase');
        
        // Save to global leaderboard
        const scoresRef = this.db.ref('leaderboard');
        await scoresRef.push(scoreEntry);
        
        // Clean up old scores (keep top 100 globally)
        const snapshot = await scoresRef.orderByChild('score').limitToLast(100).once('value');
        const allScores = [];
        snapshot.forEach(child => {
            allScores.push({ key: child.key, ...child.val() });
        });
        
        // Remove scores beyond top 100
        const sortedScores = allScores.sort((a, b) => b.score - a.score);
        if (sortedScores.length > 100) {
            const scoresToRemove = sortedScores.slice(100);
            for (const score of scoresToRemove) {
                await scoresRef.child(score.key).remove();
            }
        }
    }
    
    async getGlobalLeaderboard(limit = 10) {
        // Always return local leaderboard immediately if not connected
        if (!this.isConnected) {
            console.log('💾 Using local leaderboard (not connected to Firebase)');
            return this.getLocalLeaderboard(limit);
        }
        
        try {
            // Mobile-specific timeout and retry logic
            const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
            const timeout = isMobile ? 10000 : 5000; // Longer timeout for mobile
            
            // Add timeout to Firebase query
            const queryPromise = this.db.ref('leaderboard')
                .orderByChild('score')
                .limitToLast(limit)
                .once('value');
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Firebase query timeout')), timeout);
            });
            
            const snapshot = await Promise.race([queryPromise, timeoutPromise]);
            
            const scores = [];
            snapshot.forEach(child => {
                scores.push(child.val());
            });
            
            const filtered = this.filterScores(scores);
            console.log(`✅ Loaded ${scores.length} scores from Firebase (showing ${filtered.length} after filtering)`);
            return filtered;
            
        } catch (error) {
            console.error('❌ Failed to fetch global leaderboard:', error);
            console.log('💾 Falling back to local leaderboard');
            
            // Mobile-specific retry logic
            const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
            if (isMobile && error.message.includes('timeout')) {
                console.log('📱 Mobile timeout detected, attempting reconnection...');
                this.isConnected = false;
                // Try to reconnect after a delay
                setTimeout(() => {
                    this.initializeFirebase();
                }, 2000);
            } else {
                this.isConnected = false; // Mark as disconnected for future calls
            }
            
            return this.getLocalLeaderboard(limit);
        }
    }
    
    getLocalLeaderboard(limit = 10) {
        const filtered = this.filterScores(this.localScores);
        return filtered.slice(0, limit);
    }
    
    setPlayerName(name) {
        this.playerName = name;
        localStorage.setItem('flappyPlayerName', name);
        console.log(`👤 Player name set to: ${name}`);
    }
    
    getPlayerName() {
        return this.playerName;
    }
    
    async getPlayerRank(score) {
        if (!this.isConnected) {
            const localRank = this.localScores.findIndex(entry => entry.score < score) + 1;
            return localRank || this.localScores.length + 1;
        }
        
        try {
            const snapshot = await this.db.ref('leaderboard')
                .orderByChild('score')
                .startAt(score)
                .once('value');
            
            let rank = 0;
            snapshot.forEach(() => rank++);
            
            return rank + 1;
        } catch (error) {
            console.error('❌ Failed to get player rank:', error);
            return null;
        }
    }
    
    async getTotalPlayers() {
        console.log(`📊 Getting total players - Connected: ${this.isConnected}, Local scores: ${this.localScores.length}`);
        
        if (!this.isConnected) {
            console.log(`💾 Using local player count: ${this.localScores.length}`);
            return this.localScores.length;
        }
        
        try {
            const snapshot = await this.db.ref('leaderboard').once('value');
            const firebaseCount = snapshot.numChildren();
            console.log(`🔥 Firebase player count: ${firebaseCount}`);
            return firebaseCount;
        } catch (error) {
            console.error('❌ Failed to get total players:', error);
            console.log(`💾 Fallback to local player count: ${this.localScores.length}`);
            return this.localScores.length;
        }
    }
    
    // Debug methods
    debugLocalStorage() {
        console.log('🔍 LocalStorage Debug:');
        console.log('flappyLocalLeaderboard:', localStorage.getItem('flappyLocalLeaderboard'));
        console.log('flappyLocalLeaderboard_backup:', localStorage.getItem('flappyLocalLeaderboard_backup'));
        console.log('flappyBestScore:', localStorage.getItem('flappyBestScore'));
        console.log('flappyPlayerName:', localStorage.getItem('flappyPlayerName'));
        console.log('Current localScores array:', this.localScores);
        console.log('LocalScores count:', this.localScores.length);
        
        // Check for any other flappy-related keys
        const allKeys = Object.keys(localStorage);
        const flappyKeys = allKeys.filter(key => key.includes('flappy') || key.includes('Flappy'));
        console.log('All Flappy localStorage keys:', flappyKeys);
        
        return {
            localScores: this.localScores,
            count: this.localScores.length,
            allFlappyKeys: flappyKeys
        };
    }
    
    // Manual score recovery methods
    addManualScore(name, score) {
        const scoreEntry = {
            name: name,
            score: parseInt(score),
            timestamp: Date.now(),
            manual: true
        };
        
        this.saveToLocalStorage(scoreEntry);
        console.log(`✅ Manually added score: ${name} - ${score}`);
    }
    
    exportScores() {
        const exportData = {
            localScores: this.localScores,
            bestScore: localStorage.getItem('flappyBestScore'),
            playerName: this.playerName,
            exportDate: new Date().toISOString()
        };
        
        console.log('📤 Score export:', exportData);
        return JSON.stringify(exportData, null, 2);
    }
    
    importScores(importDataString) {
        try {
            const importData = JSON.parse(importDataString);
            
            if (importData.localScores && Array.isArray(importData.localScores)) {
                this.localScores = importData.localScores;
                localStorage.setItem('flappyLocalLeaderboard', JSON.stringify(this.localScores));
                localStorage.setItem('flappyLocalLeaderboard_backup', JSON.stringify(this.localScores));
                
                console.log(`✅ Imported ${this.localScores.length} scores`);
                return true;
            }
        } catch (error) {
            console.error('❌ Failed to import scores:', error);
        }
        
        return false;
    }
    
    clearAllScores() {
        this.localScores = [];
        localStorage.removeItem('flappyLocalLeaderboard');
        localStorage.removeItem('flappyLocalLeaderboard_backup');
        localStorage.removeItem('flappyLeaderboardLastSave');
        console.log('🗑️ All local scores cleared');
    }
    
    removeDuplicateScores() {
        const uniqueScores = [];
        const seen = new Set();
        
        for (const score of this.localScores) {
            const key = `${score.name}-${score.score}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueScores.push(score);
            } else {
                console.log(`🧹 Removing duplicate: ${score.name} - ${score.score}`);
            }
        }
        
        if (uniqueScores.length !== this.localScores.length) {
            this.localScores = uniqueScores;
            localStorage.setItem('flappyLocalLeaderboard', JSON.stringify(this.localScores));
            localStorage.setItem('flappyLocalLeaderboard_backup', JSON.stringify(this.localScores));
            console.log(`✅ Cleaned up duplicates, ${this.localScores.length} unique scores remain`);
        }
    }
}

// Export for use in main game
window.GlobalLeaderboard = GlobalLeaderboard;
