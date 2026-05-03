import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import admin from 'firebase-admin';
import { createRequire } from 'module';
import { randomUUID } from 'crypto';

// ===========================
// Firebase init
// ===========================

const projectId = process.env.FIREBASE_PROJECT_ID;
const userId    = process.env.TASK_USER_ID;

if (!projectId) throw new Error('FIREBASE_PROJECT_ID env var is required');
if (!userId)    throw new Error('TASK_USER_ID env var is required');

admin.initializeApp({ projectId });
const db = admin.firestore();

const VALID_QUADRANTS = new Set(['Q1', 'Q2', 'Q3', 'Q4']);
const ALLOWED_UPDATE_FIELDS = new Set([
    'name', 'description', 'role', 'quadrant',
    'due_date', 'goal', 'depends_on', 'completed'
]);

// ===========================
// Helpers
// ===========================

function tasksRef() {
    return db.collection('users').doc(userId).collection('tasks');
}

function serializeDoc(doc) {
    const data = doc.data();
    // Convert Firestore Timestamps to ISO strings for readable output
    if (data.createdAt && data.createdAt.toDate) data.createdAt = data.createdAt.toDate().toISOString();
    if (data.lastModified && data.lastModified.toDate) data.lastModified = data.lastModified.toDate().toISOString();
    return { id: doc.id, ...data };
}

// ===========================
// MCP Server
// ===========================

const server = new Server(
    { name: 'weekly-planner', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'create_task',
            description: 'Create a new task in the weekly planner',
            inputSchema: {
                type: 'object',
                properties: {
                    name:        { type: 'string', description: 'Short task name (required)' },
                    description: { type: 'string', description: 'Task details' },
                    role:        { type: 'string', description: 'Life role this belongs to (e.g. Individual, Father, Engineering Manager)' },
                    quadrant:    { type: 'string', enum: ['Q1','Q2','Q3','Q4'], description: 'Eisenhower quadrant: Q1=Urgent+Important, Q2=Not Urgent+Important, Q3=Urgent+Not Important, Q4=Not Urgent+Not Important' },
                    due_date:    { type: 'string', description: 'Due date in YYYY-MM-DD format (optional)' },
                    goal:        { type: 'string', description: 'Longer-term goal this task supports (optional)' },
                    depends_on:  { type: 'string', description: 'Person or thing this task depends on (optional)' },
                },
                required: ['name'],
            },
        },
        {
            name: 'list_tasks',
            description: 'List tasks, optionally filtered by quadrant or completion status',
            inputSchema: {
                type: 'object',
                properties: {
                    quadrant:  { type: 'string', enum: ['Q1','Q2','Q3','Q4'], description: 'Filter by quadrant (optional)' },
                    completed: { type: 'boolean', description: 'Filter by completion status (optional)' },
                },
            },
        },
        {
            name: 'update_task',
            description: 'Update fields on an existing task',
            inputSchema: {
                type: 'object',
                properties: {
                    id:          { type: 'string', description: 'Task ID to update (required)' },
                    name:        { type: 'string' },
                    description: { type: 'string' },
                    role:        { type: 'string' },
                    quadrant:    { type: 'string', enum: ['Q1','Q2','Q3','Q4'] },
                    due_date:    { type: 'string', description: 'YYYY-MM-DD or empty string to clear' },
                    goal:        { type: 'string' },
                    depends_on:  { type: 'string' },
                    completed:   { type: 'boolean' },
                },
                required: ['id'],
            },
        },
        {
            name: 'delete_task',
            description: 'Delete a task by ID',
            inputSchema: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'Task ID to delete (required)' },
                },
                required: ['id'],
            },
        },
    ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {

            case 'create_task': {
                const { name: taskName, description, role, quadrant, due_date, goal, depends_on } = args;

                if (!taskName || !taskName.trim()) {
                    return { content: [{ type: 'text', text: 'Error: task name is required' }], isError: true };
                }
                if (quadrant && !VALID_QUADRANTS.has(quadrant)) {
                    return { content: [{ type: 'text', text: 'Error: quadrant must be Q1, Q2, Q3, or Q4' }], isError: true };
                }

                const now    = admin.firestore.FieldValue.serverTimestamp();
                const taskId = `task-${randomUUID()}`;

                const taskData = {
                    name:         taskName.trim(),
                    description:  (description || '').trim(),
                    role:         role       || null,
                    quadrant:     quadrant   || 'Q1',
                    due_date:     due_date   || null,
                    goal:         goal       || null,
                    depends_on:   depends_on || null,
                    completed:    false,
                    createdAt:    now,
                    lastModified: now,
                };

                await tasksRef().doc(taskId).set(taskData);

                return {
                    content: [{
                        type: 'text',
                        text: `Task created.\nID: ${taskId}\nName: ${taskData.name}\nQuadrant: ${taskData.quadrant}${taskData.role ? `\nRole: ${taskData.role}` : ''}${taskData.due_date ? `\nDue: ${taskData.due_date}` : ''}`,
                    }],
                };
            }

            case 'list_tasks': {
                const { quadrant, completed } = args;

                let query = tasksRef();

                if (quadrant) {
                    if (!VALID_QUADRANTS.has(quadrant)) {
                        return { content: [{ type: 'text', text: 'Error: invalid quadrant value' }], isError: true };
                    }
                    query = query.where('quadrant', '==', quadrant);
                }
                if (completed !== undefined) {
                    query = query.where('completed', '==', completed);
                }

                const snapshot = await query.get();

                if (snapshot.empty) {
                    return { content: [{ type: 'text', text: 'No tasks found.' }] };
                }

                const tasks = snapshot.docs.map(serializeDoc);
                const lines = tasks.map(t =>
                    `[${t.id}] ${t.completed ? '✓' : '○'} ${t.name} (${t.quadrant})${t.role ? ` — ${t.role}` : ''}${t.due_date ? ` — due ${t.due_date}` : ''}${t.depends_on ? ` — needs: ${t.depends_on}` : ''}`
                );

                return {
                    content: [{
                        type: 'text',
                        text: `${tasks.length} task(s):\n\n${lines.join('\n')}`,
                    }],
                };
            }

            case 'update_task': {
                const { id, ...rest } = args;
                if (!id) {
                    return { content: [{ type: 'text', text: 'Error: id is required' }], isError: true };
                }

                const updates = {};
                for (const [key, value] of Object.entries(rest)) {
                    if (ALLOWED_UPDATE_FIELDS.has(key)) updates[key] = value;
                }

                if (Object.keys(updates).length === 0) {
                    return { content: [{ type: 'text', text: 'Error: no valid fields to update' }], isError: true };
                }
                if (updates.quadrant && !VALID_QUADRANTS.has(updates.quadrant)) {
                    return { content: [{ type: 'text', text: 'Error: invalid quadrant value' }], isError: true };
                }

                updates.lastModified = admin.firestore.FieldValue.serverTimestamp();

                const docRef  = tasksRef().doc(id);
                const existing = await docRef.get();
                if (!existing.exists) {
                    return { content: [{ type: 'text', text: `Error: task ${id} not found` }], isError: true };
                }

                await docRef.update(updates);
                const updated = serializeDoc(await docRef.get());

                return {
                    content: [{
                        type: 'text',
                        text: `Task updated.\nID: ${updated.id}\nName: ${updated.name}\nQuadrant: ${updated.quadrant}\nCompleted: ${updated.completed}`,
                    }],
                };
            }

            case 'delete_task': {
                const { id } = args;
                if (!id) {
                    return { content: [{ type: 'text', text: 'Error: id is required' }], isError: true };
                }

                const docRef   = tasksRef().doc(id);
                const existing = await docRef.get();
                if (!existing.exists) {
                    return { content: [{ type: 'text', text: `Error: task ${id} not found` }], isError: true };
                }

                const taskName = existing.data().name;
                await docRef.delete();

                return {
                    content: [{
                        type: 'text',
                        text: `Task deleted: "${taskName}" (${id})`,
                    }],
                };
            }

            default:
                return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
        }
    } catch (err) {
        return {
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            isError: true,
        };
    }
});

// ===========================
// Start
// ===========================

const transport = new StdioServerTransport();
await server.connect(transport);
