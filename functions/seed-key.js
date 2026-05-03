'use strict';
/**
 * One-time script to create an API key.
 *
 * Usage:
 *   1. Download a service account JSON from Firebase Console →
 *      Project Settings → Service Accounts → Generate new private key
 *   2. Set the path below (or use GOOGLE_APPLICATION_CREDENTIALS env var)
 *   3. Set USER_ID to your Firebase Auth UID (Firebase Console → Authentication → Users)
 *   4. Optionally set LABEL to describe the key
 *   5. Run:  node functions/seed-key.js
 *   6. Save the printed key securely — it is never stored and cannot be recovered.
 *
 * To add more keys later, just run this script again with a different LABEL.
 */

const admin  = require('firebase-admin');
const crypto = require('crypto');

// ---- Configure these before running ----
const USER_ID = 'YOUR_FIREBASE_AUTH_UID';  // e.g. 'abc123XYZdef'
const LABEL   = 'primary';
// const SERVICE_ACCOUNT = require('./service-account.json'); // optional explicit path
// ----------------------------------------

if (USER_ID === 'YOUR_FIREBASE_AUTH_UID') {
    console.error('Error: Set USER_ID to your Firebase Auth UID before running.');
    process.exit(1);
}

admin.initializeApp({
    // credential: admin.credential.cert(SERVICE_ACCOUNT),
    projectId: 'weeklyplan-a2a37'
});

const db = admin.firestore();

(async () => {
    const plainKey = crypto.randomUUID();
    const hash     = crypto.createHash('sha256').update(plainKey).digest('hex');

    await db.collection('_api').doc(hash).set({
        userId:    USER_ID,
        label:     LABEL,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('\n✅ API key created.\n');
    console.log('Plain-text key (save this NOW — it cannot be recovered):');
    console.log('');
    console.log('  x-api-key:', plainKey);
    console.log('');
    console.log('Firestore document: _api/' + hash);
    console.log('');

    process.exit(0);
})().catch(err => {
    console.error('Failed to create key:', err.message);
    process.exit(1);
});
