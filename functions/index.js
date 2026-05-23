'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const express   = require('express');
const cors      = require('cors');
const crypto    = require('crypto');

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ===========================
// Constants
// ===========================

const ALLOWED_FIELDS = new Set([
    'name', 'description', 'role', 'quadrant',
    'due_date', 'goal', 'depends_on', 'completed'
]);

const VALID_QUADRANTS = new Set(['Q1', 'Q2', 'Q3', 'Q4']);

const DEFAULT_ROLES = [
    { name: 'Individual', color: '#a8c8ec', description: 'Self — health, wealth, relationships, spiritual' },
    { name: 'Husband', color: '#b8d4b8', description: 'Partnership, shared life, attention' },
    { name: 'Father', color: '#c8a8d8', description: "Kids' wellbeing, relationship, presence" },
    { name: 'Engineering Leader', color: '#d4b8e8', description: 'Team health, delivery, strategic direction' },
    { name: 'Founder', color: '#e8d4b8', description: 'Long-term venture work' }
];

// ===========================
// Auth middleware
// ===========================

async function requireApiKey(req, res, next) {
    const rawKey = req.headers['x-api-key'];
    if (!rawKey) {
        return res.status(401).json({ error: 'Missing x-api-key header' });
    }

    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

    try {
        const snap = await db.collection('_api').doc(hash).get();
        if (!snap.exists) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        req.userId = snap.data().userId;
        next();
    } catch (err) {
        console.error('Key lookup error:', err);
        return res.status(500).json({ error: 'Internal error during auth' });
    }
}

app.use(requireApiKey);

// ===========================
// Routes
// ===========================

// POST /api/tasks — create
app.post('/api/tasks', async (req, res) => {
    const { name, description, role, quadrant, due_date, goal, depends_on, completed } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: '`name` is required' });
    }
    if (quadrant && !VALID_QUADRANTS.has(quadrant)) {
        return res.status(400).json({ error: '`quadrant` must be Q1, Q2, Q3, or Q4' });
    }

    const now    = admin.firestore.FieldValue.serverTimestamp();
    const taskId = crypto.randomUUID();

    const taskData = {
        name:         name.trim(),
        description:  (description || '').trim(),
        role:         role        || null,
        quadrant:     quadrant    || 'Q1',
        due_date:     due_date    || null,
        goal:         goal        || null,
        depends_on:   depends_on  || null,
        completed:    completed   === true,
        createdAt:    now,
        lastModified: now
    };

    try {
        await db
            .collection('users').doc(req.userId)
            .collection('tasks').doc(taskId)
            .set(taskData);

        return res.status(201).json({ id: taskId, ...taskData });
    } catch (err) {
        console.error('POST /api/tasks error:', err);
        return res.status(500).json({ error: 'Failed to create task' });
    }
});

// GET /api/tasks — list (optional ?quadrant= and ?completed= filters)
app.get('/api/tasks', async (req, res) => {
    const { quadrant, completed } = req.query;

    try {
        let query = db
            .collection('users').doc(req.userId)
            .collection('tasks');

        if (quadrant) {
            if (!VALID_QUADRANTS.has(quadrant)) {
                return res.status(400).json({ error: 'Invalid quadrant value' });
            }
            query = query.where('quadrant', '==', quadrant);
        }

        if (completed !== undefined) {
            query = query.where('completed', '==', completed === 'true');
        }

        const snapshot = await query.get();
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return res.status(200).json({ tasks });
    } catch (err) {
        console.error('GET /api/tasks error:', err);
        return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// PATCH /api/tasks/:id — partial update
app.patch('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const body   = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    const updates = {};
    for (const [key, value] of Object.entries(body)) {
        if (ALLOWED_FIELDS.has(key)) updates[key] = value;
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    if (updates.quadrant !== undefined && !VALID_QUADRANTS.has(updates.quadrant)) {
        return res.status(400).json({ error: 'Invalid quadrant value' });
    }

    updates.lastModified = admin.firestore.FieldValue.serverTimestamp();

    try {
        const docRef = db
            .collection('users').doc(req.userId)
            .collection('tasks').doc(id);

        const existing = await docRef.get();
        if (!existing.exists) {
            return res.status(404).json({ error: 'Task not found' });
        }

        await docRef.update(updates);
        const updated = await docRef.get();
        return res.status(200).json({ id, ...updated.data() });
    } catch (err) {
        console.error(`PATCH /api/tasks/${id} error:`, err);
        return res.status(500).json({ error: 'Failed to update task' });
    }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const docRef = db
            .collection('users').doc(req.userId)
            .collection('tasks').doc(id);

        const existing = await docRef.get();
        if (!existing.exists) {
            return res.status(404).json({ error: 'Task not found' });
        }

        await docRef.delete();
        return res.status(200).json({ deleted: true, id });
    } catch (err) {
        console.error(`DELETE /api/tasks/${id} error:`, err);
        return res.status(500).json({ error: 'Failed to delete task' });
    }
});

// POST /api/roles/init — initialize default roles for user
app.post('/api/roles/init', async (req, res) => {
    try {
        const rolesRef = db
            .collection('users').doc(req.userId)
            .collection('roles').doc('config');

        const existing = await rolesRef.get();
        if (existing.exists) {
            return res.status(200).json({ message: 'Roles already initialized', roles: existing.data().roles });
        }

        const now = admin.firestore.FieldValue.serverTimestamp();
        const rolesData = {
            roles: DEFAULT_ROLES,
            lastModified: now,
            version: '1.0'
        };

        await rolesRef.set(rolesData);
        return res.status(201).json({ message: 'Roles initialized', roles: DEFAULT_ROLES });
    } catch (err) {
        console.error('POST /api/roles/init error:', err);
        return res.status(500).json({ error: 'Failed to initialize roles' });
    }
});

// ===========================
// Export
// ===========================

exports.api = functions
    .region('us-central1')
    .runWith({ memory: '256MB' })
    .https.onRequest(app);
