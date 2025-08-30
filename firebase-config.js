// Firebase configuration
// Replace with your actual Firebase config from the Firebase Console
const firebaseConfig = {
  // IMPORTANT: Replace these placeholder values with your actual Firebase config
  apiKey: "your-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

// Instructions to get your Firebase config:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project or select existing one
// 3. Click "Add app" and select "Web" (</> icon)
// 4. Register your app with a nickname (e.g., "Weekly Planner")
// 5. Copy the config object and replace the placeholder above
// 6. Enable Firestore Database in the Firebase console:
//    - Go to Firestore Database
//    - Click "Create database"
//    - Start in "test mode" for now (you can add security rules later)
//    - Choose a location close to your users

export default firebaseConfig;