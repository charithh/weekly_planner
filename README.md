# Weekly Planner

A role-based weekly planner with Firebase Firestore integration for real-time sync across devices.

## Features

- **Role-based Planning**: Organize goals by different life roles (Individual, Husband, Father, etc.)
- **Multi-week Support**: Navigate between different weeks with date picker
- **Goal Completion**: Check off goals with visual feedback
- **Role Editing**: Double-click to edit roles, right-click for context menu
- **Real-time Sync**: Data syncs across devices using Firebase Firestore
- **Offline Support**: Works offline with automatic sync when connection is restored
- **Visual Feedback**: Sync status indicator shows connection status

## Firebase Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

### 2. Enable Firestore Database

1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for now)
4. Select a location close to your users

### 3. Get Your Firebase Configuration

1. In Firebase Console, click the gear icon (⚙️) > "Project settings"
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Register your app with a name (e.g., "Weekly Planner")
5. Copy the Firebase configuration object

### 4. Update Configuration File

1. Open `firebase-config.js`
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:your-actual-app-id"
};
```

### 5. Configure Security Rules (Optional)

For production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to weekly plans
    match /weekly-plans/{document} {
      allow read, write: if true; // Customize based on your needs
    }
    
    // Allow read/write access to templates
    match /templates/{document} {
      allow read, write: if true; // Customize based on your needs
    }
  }
}
```

## Data Structure

### Weekly Plans Collection (`weekly-plans`)
- **Document ID**: `week-YYYY-M-D` (e.g., `week-2024-0-15`)
- **Fields**:
  - `roles`: Array of role objects with goals and completion status
  - `sharpenData`: Goals for the "Sharpen the Saw" section
  - `goalColumnsCount`: Number of goal columns
  - `weekStart`: ISO string of week start date
  - `lastModified`: Timestamp
  - `version`: Schema version

### Templates Collection (`templates`)
- **Document ID**: `default-structure`
- **Fields**:
  - `roles`: Array of role templates (without goals)
  - `goalColumnsCount`: Number of goal columns
  - `lastModified`: Timestamp

## Local Development

1. Clone the repository
2. Set up Firebase configuration (see above)
3. Serve the files using a local web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
4. Open `http://localhost:8000` in your browser

## Deployment

The app is a static web application that can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting
- Any static hosting service

For Firebase Hosting:
```bash
npm install -g firebase-tools
firebase init hosting
firebase deploy
```

## Sync Status Indicators

- 🟢 **Green**: Connected and synced
- 🔵 **Blue** (pulsing): Syncing data
- 🔴 **Red**: Connection error
- ⚫ **Gray**: Offline mode

## Browser Compatibility

Works in all modern browsers that support:
- ES6 modules
- Firebase v9 SDK
- CSS Grid and Flexbox

## License

MIT License - feel free to use and modify as needed!