import firebaseConfig from './firebase-config.js';

// Firebase services
let db = null;
let app = null;
let auth = null;
let currentUser = null;

// Initialize Firebase
export async function initFirebase() {
    try {
        if (window.firebase) {
            app = window.firebase.initializeApp(firebaseConfig);
            db = window.firebase.getFirestore(app);
            auth = window.firebase.getAuth(app);
            
            // Set up auth state listener
            setupAuthStateListener();
            
            // Enable offline persistence
            if (window.firebase.enableNetwork) {
                await window.firebase.enableNetwork(db);
            }
            
            updateSyncStatus('online', 'Connected');
            return true;
        }
        throw new Error('Firebase SDK not loaded');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        updateSyncStatus('error', 'Connection failed');
        return false;
    }
}

// Firestore operations
export async function saveWeekData(weekKey, plannerData) {
    if (!db) {
        console.warn('Firebase not initialized, falling back to localStorage');
        localStorage.setItem(`weeklyPlanner-${weekKey}`, JSON.stringify(plannerData));
        return;
    }

    if (!currentUser) {
        console.warn('User not authenticated, falling back to localStorage');
        localStorage.setItem(`weeklyPlanner-${weekKey}`, JSON.stringify(plannerData));
        return;
    }

    try {
        updateSyncStatus('syncing', 'Saving...');
        
        // Import required Firestore functions
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Use user-specific path: users/{userId}/weekly-plans/{weekKey}
        const docRef = doc(db, 'users', currentUser.uid, 'weekly-plans', weekKey);
        await setDoc(docRef, {
            ...plannerData,
            lastModified: new Date(),
            version: '1.0'
        });
        
        updateSyncStatus('online', 'Saved');
        
        // Also save to localStorage as backup
        localStorage.setItem(`weeklyPlanner-${weekKey}`, JSON.stringify(plannerData));
        
        setTimeout(() => {
            updateSyncStatus('online', 'Connected');
        }, 2000);
        
    } catch (error) {
        console.error('Error saving to Firestore:', error);
        updateSyncStatus('error', 'Save failed');
        
        // Fallback to localStorage
        localStorage.setItem(`weeklyPlanner-${weekKey}`, JSON.stringify(plannerData));
    }
}

export async function loadWeekData(weekKey) {
    if (!db) {
        console.warn('Firebase not initialized, using localStorage');
        const saved = localStorage.getItem(`weeklyPlanner-${weekKey}`);
        return saved ? JSON.parse(saved) : null;
    }

    if (!currentUser) {
        console.warn('User not authenticated, using localStorage');
        const saved = localStorage.getItem(`weeklyPlanner-${weekKey}`);
        return saved ? JSON.parse(saved) : null;
    }

    try {
        updateSyncStatus('syncing', 'Loading...');
        
        // Import required Firestore functions
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Use user-specific path: users/{userId}/weekly-plans/{weekKey}
        const docRef = doc(db, 'users', currentUser.uid, 'weekly-plans', weekKey);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            updateSyncStatus('online', 'Loaded');
            
            // Also save to localStorage for offline access
            localStorage.setItem(`weeklyPlanner-${weekKey}`, JSON.stringify(data));
            
            setTimeout(() => {
                updateSyncStatus('online', 'Connected');
            }, 1000);
            
            return data;
        } else {
            // Try localStorage as fallback
            const saved = localStorage.getItem(`weeklyPlanner-${weekKey}`);
            updateSyncStatus('online', 'Connected');
            return saved ? JSON.parse(saved) : null;
        }
        
    } catch (error) {
        console.error('Error loading from Firestore:', error);
        updateSyncStatus('error', 'Load failed');
        
        // Fallback to localStorage
        const saved = localStorage.getItem(`weeklyPlanner-${weekKey}`);
        return saved ? JSON.parse(saved) : null;
    }
}

export async function saveStructureTemplate(structureData) {
    if (!db || !currentUser) {
        localStorage.setItem('weeklyPlanner-structure', JSON.stringify(structureData));
        return;
    }

    try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Use user-specific path: users/{userId}/templates/default-structure
        const docRef = doc(db, 'users', currentUser.uid, 'templates', 'default-structure');
        await setDoc(docRef, {
            ...structureData,
            lastModified: new Date()
        });
        
        // Also save to localStorage
        localStorage.setItem('weeklyPlanner-structure', JSON.stringify(structureData));
        
    } catch (error) {
        console.error('Error saving structure template:', error);
        localStorage.setItem('weeklyPlanner-structure', JSON.stringify(structureData));
    }
}

export async function loadStructureTemplate() {
    if (!db || !currentUser) {
        const saved = localStorage.getItem('weeklyPlanner-structure');
        return saved ? JSON.parse(saved) : null;
    }

    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Use user-specific path: users/{userId}/templates/default-structure
        const docRef = doc(db, 'users', currentUser.uid, 'templates', 'default-structure');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem('weeklyPlanner-structure', JSON.stringify(data));
            return data;
        } else {
            const saved = localStorage.getItem('weeklyPlanner-structure');
            return saved ? JSON.parse(saved) : null;
        }
        
    } catch (error) {
        console.error('Error loading structure template:', error);
        const saved = localStorage.getItem('weeklyPlanner-structure');
        return saved ? JSON.parse(saved) : null;
    }
}

// Real-time listener for week data changes
export function listenToWeekChanges(weekKey, callback) {
    if (!db || !currentUser) return null;

    try {
        const { doc, onSnapshot } = window.firebase;
        // Use user-specific path: users/{userId}/weekly-plans/{weekKey}
        const docRef = doc(db, 'users', currentUser.uid, 'weekly-plans', weekKey);
        
        return onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                localStorage.setItem(`weeklyPlanner-${weekKey}`, JSON.stringify(data));
                callback(data);
            }
        }, (error) => {
            console.error('Error listening to week changes:', error);
        });
        
    } catch (error) {
        console.error('Error setting up listener:', error);
        return null;
    }
}

// Sync status management
function updateSyncStatus(status, message) {
    const indicator = document.getElementById('syncIndicator');
    const text = document.getElementById('syncText');
    
    if (indicator && text) {
        indicator.className = `sync-indicator ${status}`;
        text.textContent = message;
    }
}

// Delete all Firebase data (for testing/reset purposes)
export async function deleteAllFirebaseData() {
    if (!db || !currentUser) {
        console.warn('Firebase not initialized or user not authenticated');
        return false;
    }

    try {
        // Import required Firestore functions
        const { collection, getDocs, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        console.log('🗑️ Starting Firebase data deletion for user:', currentUser.email);
        
        // Delete all weekly plans for this user
        const weeklyPlansRef = collection(db, 'users', currentUser.uid, 'weekly-plans');
        const weeklyPlansSnapshot = await getDocs(weeklyPlansRef);
        
        console.log(`Found ${weeklyPlansSnapshot.docs.length} weekly plans to delete`);
        
        for (const docSnapshot of weeklyPlansSnapshot.docs) {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'weekly-plans', docSnapshot.id));
            console.log(`✅ Deleted weekly plan: ${docSnapshot.id}`);
        }
        
        // Delete structure template for this user
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'templates', 'default-structure'));
            console.log('✅ Deleted structure template');
        } catch (error) {
            console.log('ℹ️ No structure template to delete');
        }
        
        // Delete all weekly reviews for this user
        const reviewsRef = collection(db, 'users', currentUser.uid, 'weekly-reviews');
        const reviewsSnapshot = await getDocs(reviewsRef);
        
        console.log(`Found ${reviewsSnapshot.docs.length} weekly reviews to delete`);
        
        for (const docSnapshot of reviewsSnapshot.docs) {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'weekly-reviews', docSnapshot.id));
            console.log(`✅ Deleted weekly review: ${docSnapshot.id}`);
        }
        
        console.log('🎉 Firebase data deletion complete!');
        updateSyncStatus('online', 'Reset complete');
        return true;
        
    } catch (error) {
        console.error('❌ Error deleting Firebase data:', error);
        updateSyncStatus('error', 'Reset failed');
        return false;
    }
}

// Save weekly review results
export async function saveWeeklyReview(weekKey, reviewData) {
    if (!db || !currentUser) {
        console.warn('Firebase not initialized or user not authenticated, saving review to localStorage');
        localStorage.setItem(`weeklyReview-${weekKey}`, JSON.stringify(reviewData));
        return;
    }

    try {
        updateSyncStatus('syncing', 'Saving review...');
        
        // Import required Firestore functions
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Use user-specific path: users/{userId}/weekly-reviews/{weekKey}
        const docRef = doc(db, 'users', currentUser.uid, 'weekly-reviews', weekKey);
        await setDoc(docRef, {
            ...reviewData,
            savedAt: new Date(),
            version: '1.0'
        });
        
        updateSyncStatus('online', 'Review saved');
        
        // Also save to localStorage as backup
        localStorage.setItem(`weeklyReview-${weekKey}`, JSON.stringify(reviewData));
        
        setTimeout(() => {
            updateSyncStatus('online', 'Connected');
        }, 2000);
        
        console.log('✅ Weekly review saved to Firebase:', weekKey);
        return true;
        
    } catch (error) {
        console.error('Error saving weekly review to Firebase:', error);
        updateSyncStatus('error', 'Review save failed');
        
        // Fallback to localStorage
        localStorage.setItem(`weeklyReview-${weekKey}`, JSON.stringify(reviewData));
        return false;
    }
}

// Load weekly review results
export async function loadWeeklyReview(weekKey) {
    if (!db || !currentUser) {
        console.warn('Firebase not initialized or user not authenticated, loading review from localStorage');
        const saved = localStorage.getItem(`weeklyReview-${weekKey}`);
        return saved ? JSON.parse(saved) : null;
    }

    try {
        updateSyncStatus('syncing', 'Loading review...');
        
        // Import required Firestore functions
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Use user-specific path: users/{userId}/weekly-reviews/{weekKey}
        const docRef = doc(db, 'users', currentUser.uid, 'weekly-reviews', weekKey);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            updateSyncStatus('online', 'Review loaded');
            
            // Also save to localStorage for offline access
            localStorage.setItem(`weeklyReview-${weekKey}`, JSON.stringify(data));
            
            setTimeout(() => {
                updateSyncStatus('online', 'Connected');
            }, 1000);
            
            console.log('✅ Weekly review loaded from Firebase:', weekKey);
            return data;
        } else {
            // Try localStorage as fallback
            const saved = localStorage.getItem(`weeklyReview-${weekKey}`);
            updateSyncStatus('online', 'Connected');
            console.log('📦 Weekly review loaded from localStorage:', weekKey);
            return saved ? JSON.parse(saved) : null;
        }
        
    } catch (error) {
        console.error('Error loading weekly review from Firebase:', error);
        updateSyncStatus('error', 'Review load failed');
        
        // Fallback to localStorage
        const saved = localStorage.getItem(`weeklyReview-${weekKey}`);
        return saved ? JSON.parse(saved) : null;
    }
}

// Get all weekly reviews for historical analysis
export async function getAllWeeklyReviews() {
    if (!db || !currentUser) {
        console.warn('Firebase not initialized or user not authenticated, loading reviews from localStorage');
        const reviews = [];
        const keys = Object.keys(localStorage);
        const reviewKeys = keys.filter(key => key.startsWith('weeklyReview-'));
        
        reviewKeys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                reviews.push(JSON.parse(data));
            }
        });
        
        return reviews.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
    }

    try {
        updateSyncStatus('syncing', 'Loading reviews...');
        
        // Import required Firestore functions
        const { collection, getDocs, orderBy, query } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Use user-specific path: users/{userId}/weekly-reviews
        const reviewsRef = collection(db, 'users', currentUser.uid, 'weekly-reviews');
        const q = query(reviewsRef, orderBy('weekStart', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const reviews = [];
        querySnapshot.forEach((doc) => {
            reviews.push({ id: doc.id, ...doc.data() });
        });
        
        updateSyncStatus('online', 'Reviews loaded');
        setTimeout(() => {
            updateSyncStatus('online', 'Connected');
        }, 1000);
        
        console.log(`✅ Loaded ${reviews.length} weekly reviews from Firebase`);
        return reviews;
        
    } catch (error) {
        console.error('Error loading weekly reviews from Firebase:', error);
        updateSyncStatus('error', 'Reviews load failed');
        
        // Fallback to localStorage
        const reviews = [];
        const keys = Object.keys(localStorage);
        const reviewKeys = keys.filter(key => key.startsWith('weeklyReview-'));
        
        reviewKeys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                reviews.push(JSON.parse(data));
            }
        });
        
        return reviews.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
    }
}


// Authentication functions
function setupAuthStateListener() {
    if (!auth) return;
    
    // Import onAuthStateChanged dynamically
    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')
        .then(({ onAuthStateChanged }) => {
            onAuthStateChanged(auth, (user) => {
                currentUser = user;
                updateAuthUI(user);
                
                if (user) {
                    console.log('✅ User signed in:', user.email);
                    updateSyncStatus('online', `Signed in as ${user.email}`);
                    // Initialize localStorage with user's Firebase data
                    initializeUserDataOnLogin();
                } else {
                    console.log('❌ User signed out');
                    updateSyncStatus('offline', 'Sign in required');
                    clearLocalStorageOnSignOut();
                    showSignInUI();
                }
            });
        });
}

export async function signInWithGoogle() {
    if (!auth) {
        console.error('Firebase Auth not initialized');
        return false;
    }
    
    try {
        const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        console.log('✅ Google sign-in successful:', result.user.email);
        return true;
    } catch (error) {
        console.error('❌ Google sign-in failed:', error);
        updateSyncStatus('error', 'Sign-in failed');
        return false;
    }
}

export async function signInWithEmailPassword(email, password) {
    if (!auth) {
        console.error('Firebase Auth not initialized');
        return false;
    }
    
    try {
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const result = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Email sign-in successful:', result.user.email);
        return true;
    } catch (error) {
        console.error('❌ Email sign-in failed:', error);
        updateSyncStatus('error', 'Sign-in failed');
        return false;
    }
}

export async function signOut() {
    if (!auth) {
        console.error('Firebase Auth not initialized');
        return false;
    }
    
    try {
        const { signOut: firebaseSignOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        await firebaseSignOut(auth);
        console.log('✅ Sign-out successful');
        return true;
    } catch (error) {
        console.error('❌ Sign-out failed:', error);
        return false;
    }
}

export function getCurrentUser() {
    return currentUser;
}

export function isUserSignedIn() {
    return currentUser !== null;
}

// Update UI based on auth state
function updateAuthUI(user) {
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;
    
    if (user) {
        authContainer.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="hidden sm:flex items-center gap-2">
                    <div class="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        ${user.email.charAt(0).toUpperCase()}
                    </div>
                    <span class="text-sm text-gray-700">${user.email}</span>
                </div>
                <button id="signOutBtn" class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
                    Sign Out
                </button>
            </div>
        `;
        
        // Add sign out event listener
        document.getElementById('signOutBtn').addEventListener('click', signOut);
    } else {
        showSignInUI();
    }
}

function showSignInUI() {
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;
    
    authContainer.innerHTML = `
        <button id="signInBtn" class="inline-flex items-center px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
            Sign In
        </button>
    `;
    
    // Add sign in event listener
    document.getElementById('signInBtn').addEventListener('click', () => {
        showSignInModal();
    });
}

function showSignInModal() {
    // Create and show sign-in modal
    const modal = document.createElement('div');
    modal.id = 'signInModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Sign In to Weekly Planner</h2>
            <p class="text-gray-600 mb-6">Sign in to save your plans across devices and access them anywhere.</p>
            
            <div class="space-y-4">
                <button id="googleSignIn" class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors">
                    <svg class="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                </button>
                
                <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-gray-300"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="px-2 bg-white text-gray-500">or</span>
                    </div>
                </div>
                
                <form id="emailSignInForm" class="space-y-3">
                    <input type="email" id="emailInput" required placeholder="Email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <input type="password" id="passwordInput" required placeholder="Password" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <button type="submit" class="w-full bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors">
                        Sign In with Email
                    </button>
                </form>
            </div>
            
            <div class="mt-6 flex justify-between items-center">
                <p class="text-xs text-gray-500">Your data will be securely stored</p>
                <button id="closeSignInModal" class="text-gray-400 hover:text-gray-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('googleSignIn').addEventListener('click', async () => {
        const success = await signInWithGoogle();
        if (success) {
            document.body.removeChild(modal);
        }
    });
    
    document.getElementById('emailSignInForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        const success = await signInWithEmailPassword(email, password);
        if (success) {
            document.body.removeChild(modal);
        }
    });
    
    document.getElementById('closeSignInModal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Initialize localStorage with user's Firebase data on login
async function initializeUserDataOnLogin() {
    if (!currentUser || !db) return;
    
    console.log('🔄 Initializing localStorage with user Firebase data...');
    updateSyncStatus('syncing', 'Syncing your data...');
    
    try {
        // Load and sync structure template
        const structureData = await loadStructureTemplate();
        if (structureData) {
            localStorage.setItem('weeklyPlanner-structure', JSON.stringify(structureData));
            console.log('✅ Structure template synced to localStorage');
        }
        
        // Load current week data
        if (window.currentWeekStart) {
            const weekKey = getWeekKey(window.currentWeekStart);
            const weekData = await loadWeekData(weekKey);
            if (weekData) {
                localStorage.setItem(`weeklyPlanner-${weekKey}`, JSON.stringify(weekData));
                console.log('✅ Current week data synced to localStorage');
            }
        }
        
        // Load recent weeks data (last 4 weeks)
        const today = new Date();
        for (let i = 0; i < 4; i++) {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - (today.getDay()) - (i * 7));
            const weekKey = getWeekKey(weekStart);
            
            try {
                const weekData = await loadWeekData(weekKey);
                if (weekData) {
                    localStorage.setItem(`weeklyPlanner-${weekKey}`, JSON.stringify(weekData));
                    console.log(`✅ Week ${weekKey} synced to localStorage`);
                }
            } catch (error) {
                // Week doesn't exist, skip
            }
        }
        
        updateSyncStatus('online', `Signed in as ${currentUser.email}`);
        console.log('🎉 localStorage initialization complete');
        
        // Reload current week to display the synced data
        if (window.loadFromLocalStorage) {
            window.loadFromLocalStorage();
        }
        
    } catch (error) {
        console.error('❌ Error initializing localStorage:', error);
        updateSyncStatus('error', 'Sync failed');
    }
}

// Clear localStorage when user signs out
function clearLocalStorageOnSignOut() {
    console.log('🧹 Clearing localStorage on sign out...');
    
    // Clear all weekly planner data
    const keys = Object.keys(localStorage);
    const plannerKeys = keys.filter(key => 
        key.startsWith('weeklyPlanner-') || 
        key.startsWith('weeklyReview-')
    );
    
    plannerKeys.forEach(key => {
        localStorage.removeItem(key);
    });
    
    console.log(`🗑️ Cleared ${plannerKeys.length} items from localStorage`);
    
    // Reload the page to show clean state
    if (window.loadFromLocalStorage) {
        window.loadFromLocalStorage();
    }
}

// Helper function to get week key (should match the one in script.js)
function getWeekKey(weekStart) {
    const year = weekStart.getFullYear();
    const month = String(weekStart.getMonth() + 1).padStart(2, '0');
    const day = String(weekStart.getDate()).padStart(2, '0');
    return `week-${year}-${month}-${day}`;
}

// Export for global access
window.FirebaseService = {
    initFirebase,
    saveWeekData,
    loadWeekData,
    saveStructureTemplate,
    loadStructureTemplate,
    listenToWeekChanges,
    deleteAllFirebaseData,
    saveWeeklyReview,
    loadWeeklyReview,
    getAllWeeklyReviews,
    signInWithGoogle,
    signInWithEmailPassword,
    signOut,
    getCurrentUser,
    isUserSignedIn
};