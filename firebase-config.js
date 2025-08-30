// Firebase configuration
// Replace with your actual Firebase config from the Firebase Console
const firebaseConfig = {
  // IMPORTANT: Replace these placeholder values with your actual Firebase config
   apiKey: "AIzaSyCokkrPJGKee5QaE1YuzK-3o65Lp0Tl2TE",
    authDomain: "weeklyplan-a2a37.firebaseapp.com",
    projectId: "weeklyplan-a2a37",
    storageBucket: "weeklyplan-a2a37.firebasestorage.app",
    messagingSenderId: "744253869764",
    appId: "1:744253869764:web:c090a315f23be1561f0391",
    measurementId: "G-3Y5VH06GZF"
};

// Instructions to get your Firebase config:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project or select existing one
// 3. Click "Add app" and select "Web" (</> ißcon)
// 4. Register your app with a nickname (e.g., "Weekly Planner")
// 5. Copy the config object and replace the placeholder above
// 6. Enable Firestore Database in the Firebase console:
//    - Go to Firestore Database
//    - Click "Create database"
//    - Start in "test mode" for now (you can add security rules later)
//    - Choose a location close to your users
/*<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCokkrPJGKee5QaE1YuzK-3o65Lp0Tl2TE",
    authDomain: "weeklyplan-a2a37.firebaseapp.com",
    projectId: "weeklyplan-a2a37",
    storageBucket: "weeklyplan-a2a37.firebasestorage.app",
    messagingSenderId: "744253869764",
    appId: "1:744253869764:web:c090a315f23be1561f0391",
    measurementId: "G-3Y5VH06GZF"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>*/

export default firebaseConfig;