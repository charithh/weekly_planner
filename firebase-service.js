import firebaseConfig from './firebase-config.js';

// Firebase services
let db = null;
let app = null;

// Initialize Firebase
export async function initFirebase() {
    try {
        if (window.firebase) {
            app = window.firebase.initializeApp(firebaseConfig);
            db = window.firebase.getFirestore(app);
            
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

    try {
        updateSyncStatus('syncing', 'Saving...');
        
        // Import required Firestore functions
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const docRef = doc(db, 'weekly-plans', weekKey);
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

    try {
        updateSyncStatus('syncing', 'Loading...');
        
        // Import required Firestore functions
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const docRef = doc(db, 'weekly-plans', weekKey);
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
    if (!db) {
        localStorage.setItem('weeklyPlanner-structure', JSON.stringify(structureData));
        return;
    }

    try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const docRef = doc(db, 'templates', 'default-structure');
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
    if (!db) {
        const saved = localStorage.getItem('weeklyPlanner-structure');
        return saved ? JSON.parse(saved) : null;
    }

    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const docRef = doc(db, 'templates', 'default-structure');
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
    if (!db) return null;

    try {
        const { doc, onSnapshot } = window.firebase;
        const docRef = doc(db, 'weekly-plans', weekKey);
        
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
    if (!db) {
        console.warn('Firebase not initialized');
        return false;
    }

    try {
        // Import required Firestore functions
        const { collection, getDocs, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        console.log('🗑️ Starting Firebase data deletion...');
        
        // Delete all weekly plans
        const weeklyPlansRef = collection(db, 'weekly-plans');
        const weeklyPlansSnapshot = await getDocs(weeklyPlansRef);
        
        console.log(`Found ${weeklyPlansSnapshot.docs.length} weekly plans to delete`);
        
        for (const docSnapshot of weeklyPlansSnapshot.docs) {
            await deleteDoc(doc(db, 'weekly-plans', docSnapshot.id));
            console.log(`✅ Deleted weekly plan: ${docSnapshot.id}`);
        }
        
        // Delete structure template
        try {
            await deleteDoc(doc(db, 'templates', 'default-structure'));
            console.log('✅ Deleted structure template');
        } catch (error) {
            console.log('ℹ️ No structure template to delete');
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

// Export for global access
window.FirebaseService = {
    initFirebase,
    saveWeekData,
    loadWeekData,
    saveStructureTemplate,
    loadStructureTemplate,
    listenToWeekChanges,
    deleteAllFirebaseData
};