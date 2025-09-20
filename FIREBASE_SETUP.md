# Firebase Setup Guide for Flappy Bird Global Leaderboard

## 🔥 Quick Setup (5 minutes)

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it "flappy-bird-leaderboard" 
4. Disable Google Analytics (not needed)
5. Click "Create project"

### Step 2: Setup Realtime Database
1. In your Firebase project, go to "Realtime Database"
2. Click "Create Database"
3. Choose "Start in test mode" (for now)
4. Select your region (closest to your users)

### Step 3: Get Configuration
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Web" icon (</>)
4. Register app name: "Flappy Bird"
5. Copy the `firebaseConfig` object

### Step 4: Update Configuration
Replace the config in `leaderboard.js`:

```javascript
this.firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

### Step 5: Security Rules (Optional)
In Realtime Database Rules, you can use:

```json
{
  "rules": {
    "leaderboard": {
      ".read": true,
      ".write": true,
      "$scoreId": {
        ".validate": "newData.hasChildren(['name', 'score', 'timestamp'])"
      }
    }
  }
}
```

## 🚀 Alternative: Local-Only Mode

If you don't want to use Firebase, the system automatically falls back to localStorage-only mode. Just remove the Firebase scripts from `index.html`:

```html
<!-- Remove these lines for local-only -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
```

## 📊 Features

✅ **Global Leaderboard**: Top 10 players worldwide
✅ **Local Fallback**: Works without internet
✅ **Player Names**: Custom names with random generation
✅ **Real-time Updates**: Instant leaderboard updates
✅ **Rank Display**: Shows your global rank
✅ **Player Count**: Total number of players
✅ **Mobile Compatible**: Works on all devices
✅ **Free Tier**: Firebase free tier supports thousands of users

## 🎮 Usage

1. **Play Game**: Achieve a score
2. **Enter Name**: Set your player name
3. **Auto-Submit**: Score automatically submits
4. **View Rank**: See your global ranking
5. **Compete**: Try to reach the top 10!
