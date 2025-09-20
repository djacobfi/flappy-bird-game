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
    
    async initializeFirebase() {
        try {
            // Check if Firebase is available (from CDN)
            if (typeof firebase !== 'undefined') {
                // Initialize Firebase
                firebase.initializeApp(this.firebaseConfig);
                this.db = firebase.database();
                this.isConnected = true;
                console.log('🔥 Firebase connected successfully!');
                
                // Test connection
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
        
        // Always save to local storage
        this.saveToLocalStorage(scoreEntry);
        
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
        this.localScores.push(scoreEntry);
        this.localScores.sort((a, b) => b.score - a.score);
        this.localScores = this.localScores.slice(0, 10); // Keep top 10
        localStorage.setItem('flappyLocalLeaderboard', JSON.stringify(this.localScores));
        console.log('💾 Score saved to local leaderboard');
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
        if (!this.isConnected) {
            return this.getLocalLeaderboard(limit);
        }
        
        try {
            const snapshot = await this.db.ref('leaderboard')
                .orderByChild('score')
                .limitToLast(limit)
                .once('value');
            
            const scores = [];
            snapshot.forEach(child => {
                scores.push(child.val());
            });
            
            return scores.sort((a, b) => b.score - a.score);
        } catch (error) {
            console.error('❌ Failed to fetch global leaderboard:', error);
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
}

// Export for use in main game
window.GlobalLeaderboard = GlobalLeaderboard;
