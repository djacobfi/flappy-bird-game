/**
 * Global Leaderboard System for Flappy Bird
 * Uses Firebase Realtime Database for global score storage
 */

class GlobalLeaderboard {
    constructor() {
        // Firebase configuration (you'll need to replace with your own)
        this.firebaseConfig = {
            apiKey: "your-api-key-here",
            authDomain: "flappy-bird-leaderboard.firebaseapp.com",
            databaseURL: "https://flappy-bird-leaderboard-default-rtdb.firebaseio.com",
            projectId: "flappy-bird-leaderboard",
            storageBucket: "flappy-bird-leaderboard.appspot.com",
            messagingSenderId: "123456789",
            appId: "your-app-id-here"
        };
        
        this.db = null;
        this.isConnected = false;
        this.playerName = localStorage.getItem('flappyPlayerName') || this.generateRandomName();
        
        // Local leaderboard fallback
        this.localScores = JSON.parse(localStorage.getItem('flappyLocalLeaderboard')) || [];
        
        // Check for backup scores first
        this.checkForBackupScores();
        
        // Clean up any duplicate scores
        this.removeDuplicateScores();
        
        // Add demo scores only if truly no scores exist (first time users)
        if (this.localScores.length === 0 && !localStorage.getItem('flappyBestScore')) {
            console.log('🎮 First time player detected, adding demo scores');
            this.localScores = [
                { name: 'FlappyMaster', score: 42, timestamp: Date.now() - 86400000 },
                { name: 'SkyDancer', score: 38, timestamp: Date.now() - 172800000 },
                { name: 'WingCommander', score: 35, timestamp: Date.now() - 259200000 },
                { name: 'AirAce', score: 31, timestamp: Date.now() - 345600000 },
                { name: 'BirdBrain', score: 28, timestamp: Date.now() - 432000000 }
            ];
            localStorage.setItem('flappyLocalLeaderboard', JSON.stringify(this.localScores));
        }
        
        this.initializeFirebase();
    }
    
    generateRandomName() {
        const adjectives = ['Flying', 'Soaring', 'Swift', 'Mighty', 'Epic', 'Super', 'Crazy', 'Amazing', 'Brave', 'Cool'];
        const nouns = ['Bird', 'Eagle', 'Falcon', 'Hawk', 'Phoenix', 'Flyer', 'Ace', 'Hero', 'Star', 'Champion'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNum = Math.floor(Math.random() * 999) + 1;
        return `${randomAdj}${randomNoun}${randomNum}`;
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
                
                // Try to initialize Firebase with timeout
                const initPromise = new Promise((resolve, reject) => {
                    try {
                        firebase.initializeApp(this.firebaseConfig);
                        this.db = firebase.database();
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
                
                // 3-second timeout for Firebase initialization
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Firebase initialization timeout')), 3000);
                });
                
                await Promise.race([initPromise, timeoutPromise]);
                
                this.isConnected = true;
                console.log('✅ Firebase connected successfully!');
                
                // Test connection with timeout
                await this.testConnection();
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
            // Add timeout to Firebase query
            const queryPromise = this.db.ref('leaderboard')
                .orderByChild('score')
                .limitToLast(limit)
                .once('value');
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Firebase query timeout')), 5000);
            });
            
            const snapshot = await Promise.race([queryPromise, timeoutPromise]);
            
            const scores = [];
            snapshot.forEach(child => {
                scores.push(child.val());
            });
            
            console.log(`✅ Loaded ${scores.length} scores from Firebase`);
            return scores.sort((a, b) => b.score - a.score);
            
        } catch (error) {
            console.error('❌ Failed to fetch global leaderboard:', error);
            console.log('💾 Falling back to local leaderboard');
            this.isConnected = false; // Mark as disconnected for future calls
            return this.getLocalLeaderboard(limit);
        }
    }
    
    getLocalLeaderboard(limit = 10) {
        return this.localScores.slice(0, limit);
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
        if (!this.isConnected) {
            return this.localScores.length;
        }
        
        try {
            const snapshot = await this.db.ref('leaderboard').once('value');
            return snapshot.numChildren();
        } catch (error) {
            console.error('❌ Failed to get total players:', error);
            return this.localScores.length;
        }
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
