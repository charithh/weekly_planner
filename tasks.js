let isFirebaseReady = false;
let tasksData = {};
// Cached roles from localStorage structure template, used for the role dropdown and color lookup
let cachedRoles = [];
// Cached projects
let cachedProjects = {};

const activeFilters = {
    roles: new Set(),
    quadrants: new Set(),
    dueDate: 'all',
    search: ''
};

document.addEventListener('DOMContentLoaded', async function() {
    await initializeFirebase();
    setupTaskEventListeners();
    await initializeTasks();
});

// ===========================
// Firebase init
// ===========================

async function initializeFirebase() {
    let retries = 0;
    while (!window.FirebaseService && retries < 20) {
        await new Promise(r => setTimeout(r, 100));
        retries++;
    }
    if (!window.FirebaseService) return;

    try {
        const success = await window.FirebaseService.initFirebase();
        isFirebaseReady = success;
    } catch (e) {
        console.warn('Firebase init failed on tasks page:', e);
    }
}

// ===========================
// Tasks
// ===========================

async function initializeTasks() {
    if (isFirebaseReady && window.FirebaseService) {
        try {
            // Load roles from centralized Firebase location
            cachedRoles = await window.FirebaseService.loadRoles();
            tasksData = await window.FirebaseService.loadAllTasks();
            cachedProjects = await window.FirebaseService.loadAllProjects();
        } catch (e) {
            console.warn('Tasks load from Firebase failed, using localStorage:', e);
            loadCachedRoles();
            tasksData = getLocalTasks();
            cachedProjects = getLocalProjects();
        }
    } else {
        loadCachedRoles();
        tasksData = getLocalTasks();
        cachedProjects = getLocalProjects();
    }
    renderTaskMatrix();
    updateRoleFilterPills();
}

// Expose so firebase-service.js can call it after sign-in
window.initializeTasks = initializeTasks;

function getLocalTasks() {
    const saved = localStorage.getItem('tasks-global');
    return saved ? JSON.parse(saved) : {};
}

function getLocalProjects() {
    const saved = localStorage.getItem('projects-global');
    return saved ? JSON.parse(saved) : {};
}

function loadCachedRoles() {
    const structure = localStorage.getItem('weeklyPlanner-structure');
    if (structure) {
        try {
            cachedRoles = JSON.parse(structure).roles || [];
            return;
        } catch (e) { /* fall through */ }
    }
    // Fall back to the most recent week's data
    const keys = Object.keys(localStorage)
        .filter(k => k.startsWith('weeklyPlanner-week-'))
        .sort()
        .reverse();
    if (keys.length > 0) {
        try {
            const week = JSON.parse(localStorage.getItem(keys[0]));
            cachedRoles = (week && week.roles) ? week.roles : [];
        } catch (e) { cachedRoles = []; }
    }
}

// ===========================
// Event listeners
// ===========================

function setupTaskEventListeners() {
    document.getElementById('addTaskBtn').addEventListener('click', () => openTaskModal());
    document.getElementById('closeTaskModal').addEventListener('click', closeTaskModal);
    document.getElementById('cancelTaskBtn').addEventListener('click', closeTaskModal);
    document.getElementById('saveTaskBtn').addEventListener('click', saveTaskFromModal);
    document.getElementById('deleteTaskBtn').addEventListener('click', deleteTaskFromModal);

    document.getElementById('taskModal').addEventListener('click', function(e) {
        if (e.target.id === 'taskModal') closeTaskModal();
    });

    document.getElementById('showCompletedTasks').addEventListener('change', renderTaskMatrix);

    // Quadrant toggles
    document.querySelectorAll('.filter-quadrant-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const q = btn.dataset.quadrant;
            const nowActive = !activeFilters.quadrants.has(q);
            if (nowActive) activeFilters.quadrants.add(q);
            else activeFilters.quadrants.delete(q);
            btn.classList.toggle('active', nowActive);
            updateClearButton();
            updateQuadrantVisibility();
        });
    });

    // Search — debounced
    let searchTimer;
    document.getElementById('filterSearch').addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            activeFilters.search = this.value.trim();
            updateClearButton();
            renderTaskMatrix();
        }, 200);
    });

    // Due date dropdown
    document.getElementById('filterDueDate').addEventListener('change', function() {
        activeFilters.dueDate = this.value;
        updateClearButton();
        renderTaskMatrix();
    });

    // Clear all filters
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        activeFilters.roles.clear();
        activeFilters.quadrants.clear();
        activeFilters.dueDate = 'all';
        activeFilters.search = '';
        document.getElementById('filterSearch').value = '';
        document.getElementById('filterDueDate').value = 'all';
        document.querySelectorAll('.filter-role-pill').forEach(btn => setPillActive(btn, false));
        document.querySelectorAll('.filter-quadrant-pill').forEach(btn => btn.classList.remove('active'));
        updateClearButton();
        updateQuadrantVisibility();
        renderTaskMatrix();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeTaskModal();
    });
}

// ===========================
// Modal
// ===========================

async function openTaskModal(taskId = null) {
    const modal = document.getElementById('taskModal');
    const titleEl = document.getElementById('taskModalTitle');
    const idField = document.getElementById('taskModalId');
    const nameField = document.getElementById('taskModalName');
    const descField = document.getElementById('taskModalDescription');
    const roleSelect = document.getElementById('taskModalRole');
    const projectSelect = document.getElementById('taskModalProject');
    const quadrantSelect = document.getElementById('taskModalQuadrant');
    const dueDateField = document.getElementById('taskModalDueDate');
    const goalField = document.getElementById('taskModalGoal');
    const dependsField = document.getElementById('taskModalDependsOn');
    const deleteBtn = document.getElementById('deleteTaskBtn');

    // Always refresh roles and projects — by click time auth is resolved so Firebase works
    if (isFirebaseReady && window.FirebaseService && window.FirebaseService.isUserSignedIn()) {
        try {
            const structure = await window.FirebaseService.loadStructureTemplate();
            if (structure && structure.roles && structure.roles.length > 0) {
                cachedRoles = structure.roles;
            } else {
                loadCachedRoles();
            }
            cachedProjects = await window.FirebaseService.loadAllProjects();
        } catch (e) {
            loadCachedRoles();
            cachedProjects = getLocalProjects();
        }
    } else {
        loadCachedRoles();
        cachedProjects = getLocalProjects();
    }
    populateRoleDropdown(roleSelect);
    populateProjectDropdown(projectSelect);

    if (taskId && tasksData[taskId]) {
        const task = tasksData[taskId];
        titleEl.textContent = 'Edit Task';
        idField.value = taskId;
        nameField.value = task.name || '';
        descField.value = task.description || '';
        roleSelect.value = task.role || '';
        projectSelect.value = task.projectId || '';
        quadrantSelect.value = task.quadrant || 'Q1';
        dueDateField.value = task.due_date || '';
        goalField.value = task.goal || '';
        dependsField.value = task.depends_on || '';
        deleteBtn.classList.remove('hidden');
    } else {
        titleEl.textContent = 'Add Task';
        idField.value = '';
        nameField.value = '';
        descField.value = '';
        roleSelect.selectedIndex = 0;
        projectSelect.value = '';
        quadrantSelect.value = 'Q1';
        dueDateField.value = '';
        goalField.value = '';
        dependsField.value = '';
        deleteBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    nameField.focus();
}

function populateRoleDropdown(selectEl) {
    const currentVal = selectEl.value;
    selectEl.innerHTML = '';
    cachedRoles.forEach(role => {
        if (!role.name) return;
        const opt = document.createElement('option');
        opt.value = role.name;
        opt.textContent = role.name;
        selectEl.appendChild(opt);
    });
    if (currentVal) selectEl.value = currentVal;
}

function populateProjectDropdown(selectEl) {
    const currentVal = selectEl.value;
    selectEl.innerHTML = '';
    
    // Add "No project" option
    const noProjectOpt = document.createElement('option');
    noProjectOpt.value = '';
    noProjectOpt.textContent = 'No project';
    selectEl.appendChild(noProjectOpt);
    
    // Add active projects only
    Object.entries(cachedProjects).forEach(([projectId, project]) => {
        if (project.status === 'active') {
            const opt = document.createElement('option');
            opt.value = projectId;
            opt.textContent = project.name;
            selectEl.appendChild(opt);
        }
    });
    
    if (currentVal) selectEl.value = currentVal;
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.classList.add('hidden');
}

async function saveTaskFromModal() {
    const nameField = document.getElementById('taskModalName');
    const descField = document.getElementById('taskModalDescription');
    const name = nameField.value.trim();
    const description = descField.value.trim();

    if (!name) {
        showInPageNotification('Missing Field', 'Task name is required.', 'warning');
        nameField.focus();
        return;
    }
    if (!description) {
        showInPageNotification('Missing Field', 'Task description is required.', 'warning');
        descField.focus();
        return;
    }

    const existingId = document.getElementById('taskModalId').value;
    const taskId = existingId || generateTaskId();

    const taskData = {
        name,
        description,
        role: document.getElementById('taskModalRole').value,
        projectId: document.getElementById('taskModalProject').value || null,
        quadrant: document.getElementById('taskModalQuadrant').value,
        due_date: document.getElementById('taskModalDueDate').value || null,
        goal: document.getElementById('taskModalGoal').value.trim() || null,
        depends_on: document.getElementById('taskModalDependsOn').value.trim() || null,
        completed: (tasksData[taskId] && tasksData[taskId].completed) ? true : false,
        createdAt: (tasksData[taskId] && tasksData[taskId].createdAt) ? tasksData[taskId].createdAt : new Date().toISOString()
    };

    tasksData[taskId] = taskData;
    localStorage.setItem('tasks-global', JSON.stringify(tasksData));

    if (isFirebaseReady && window.FirebaseService) {
        try {
            await window.FirebaseService.saveTask(taskId, taskData);
        } catch (e) {
            console.warn('Task Firebase save failed, localStorage used:', e);
        }
    }

    closeTaskModal();
    renderTaskMatrix();
    showInPageNotification(existingId ? 'Task Updated' : 'Task Added', existingId ? `"${name}" updated.` : `"${name}" added.`, 'success');
}

async function deleteTaskFromModal() {
    const taskId = document.getElementById('taskModalId').value;
    if (!taskId) return;
    const taskName = tasksData[taskId] ? tasksData[taskId].name : 'this task';
    if (!confirm(`Delete "${taskName}"? This cannot be undone.`)) return;

    delete tasksData[taskId];
    localStorage.setItem('tasks-global', JSON.stringify(tasksData));

    if (isFirebaseReady && window.FirebaseService) {
        try {
            await window.FirebaseService.deleteTask(taskId);
        } catch (e) {
            console.warn('Task Firebase delete failed, localStorage used:', e);
        }
    }

    closeTaskModal();
    renderTaskMatrix();
    showInPageNotification('Task Deleted', `"${taskName}" removed.`, 'warning');
}

async function toggleTaskComplete(taskId) {
    if (!tasksData[taskId]) return;
    tasksData[taskId].completed = !tasksData[taskId].completed;
    localStorage.setItem('tasks-global', JSON.stringify(tasksData));

    if (isFirebaseReady && window.FirebaseService) {
        try {
            await window.FirebaseService.updateTask(taskId, { completed: tasksData[taskId].completed });
        } catch (e) {
            console.warn('Task completion sync failed:', e);
        }
    }
    renderTaskMatrix();
}

// ===========================
// Render
// ===========================

function renderTaskMatrix() {
    const showCompleted = document.getElementById('showCompletedTasks').checked;
    const today = new Date().toISOString().split('T')[0];

    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
        const listEl = document.getElementById(`taskList${q}`);
        if (!listEl) return;
        listEl.innerHTML = '';

        const tasks = applyFilters(
            Object.entries(tasksData)
                .filter(([, t]) => t.quadrant === q)
                .filter(([, t]) => showCompleted || !t.completed)
        ).sort((a, b) => {
            if (a[1].completed !== b[1].completed) return a[1].completed ? 1 : -1;
            if (a[1].due_date && b[1].due_date) return a[1].due_date.localeCompare(b[1].due_date);
            if (a[1].due_date) return -1;
            if (b[1].due_date) return 1;
            return (a[1].name || '').localeCompare(b[1].name || '');
        });

        if (tasks.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'task-list-empty';
            empty.textContent = 'No tasks';
            listEl.appendChild(empty);
            return;
        }

        tasks.forEach(([taskId, task]) => {
            listEl.appendChild(buildTaskCard(taskId, task, today));
        });
    });
}

function buildTaskCard(taskId, task, today) {
    const card = document.createElement('div');
    card.className = 'task-card' + (task.completed ? ' completed' : '');

    const isOverdue = task.due_date && task.due_date < today && !task.completed;
    const roleColor = getTaskRoleColor(task.role);

    const roleHtml = task.role
        ? `<span class="task-card-role" style="background:${roleColor}22;color:${roleColor}">${escapeHtml(task.role)}</span>`
        : '';
    const dueHtml = task.due_date
        ? `<span class="task-card-due${isOverdue ? ' overdue' : ''}">${isOverdue ? 'Overdue: ' : ''}${formatDate(task.due_date)}</span>`
        : '';
    const dependsHtml = task.depends_on
        ? `<span class="task-card-depends">Needs: ${escapeHtml(task.depends_on)}</span>`
        : '';

    card.innerHTML = `
        <div class="task-card-checkbox"></div>
        <div class="task-card-body">
            <div class="task-card-name">${escapeHtml(task.name)}</div>
            <div class="task-card-meta">${roleHtml}${dueHtml}${dependsHtml}</div>
        </div>
    `;

    card.querySelector('.task-card-checkbox').addEventListener('click', function(e) {
        e.stopPropagation();
        toggleTaskComplete(taskId);
    });

    card.addEventListener('click', function(e) {
        if (e.target.classList.contains('task-card-checkbox')) return;
        openTaskModal(taskId);
    });

    return card;
}

// ===========================
// Filtering
// ===========================

function applyFilters(entries) {
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = (() => {
        const d = new Date();
        d.setDate(d.getDate() + (7 - d.getDay()));
        return d.toISOString().split('T')[0];
    })();

    return entries.filter(([, t]) => {
        if (activeFilters.roles.size > 0 && !activeFilters.roles.has(t.role)) return false;

        if (activeFilters.search) {
            const s = activeFilters.search.toLowerCase();
            if (!(t.name || '').toLowerCase().includes(s) &&
                !(t.description || '').toLowerCase().includes(s)) return false;
        }

        switch (activeFilters.dueDate) {
            case 'overdue':
                if (!t.due_date || t.due_date >= today) return false;
                break;
            case 'today':
                if (t.due_date !== today) return false;
                break;
            case 'this-week':
                if (!t.due_date || t.due_date > weekEnd || t.due_date < today) return false;
                break;
            case 'no-date':
                if (t.due_date) return false;
                break;
        }

        return true;
    });
}

function updateQuadrantVisibility() {
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
        const box = document.getElementById(`quadrant${q}`);
        if (!box) return;
        const show = activeFilters.quadrants.size === 0 || activeFilters.quadrants.has(q);
        box.style.display = show ? '' : 'none';
    });
}

function updateRoleFilterPills() {
    const container = document.getElementById('filterRoles');
    if (!container) return;

    // Use only roles from cachedRoles (centralized list), not from task data
    // This ensures only valid, current roles are shown as filter options
    const roles = cachedRoles.filter(r => r && r.name);

    if (roles.length === 0) return;

    container.innerHTML = '';
    roles.forEach(role => {
        const btn = document.createElement('button');
        btn.dataset.role = role.name;
        btn.textContent = role.name;
        btn.className = 'filter-role-pill';
        setPillActive(btn, activeFilters.roles.has(role.name));
        btn.addEventListener('click', () => {
            const nowActive = !activeFilters.roles.has(role.name);
            if (nowActive) activeFilters.roles.add(role.name);
            else activeFilters.roles.delete(role.name);
            setPillActive(btn, nowActive);
            updateClearButton();
            renderTaskMatrix();
        });
        container.appendChild(btn);
    });
}

function setPillActive(btn, active) {
    const color = getTaskRoleColor(btn.dataset.role);
    if (active) {
        btn.style.background = color;
        btn.style.color = '#fff';
        btn.style.borderColor = color;
    } else {
        btn.style.background = '';
        btn.style.color = '#374151';
        btn.style.borderColor = '#d1d5db';
    }
}

function updateClearButton() {
    const btn = document.getElementById('clearFiltersBtn');
    if (!btn) return;
    const hasFilters = activeFilters.roles.size > 0 ||
                       activeFilters.quadrants.size > 0 ||
                       activeFilters.dueDate !== 'all' ||
                       activeFilters.search !== '';
    btn.classList.toggle('hidden', !hasFilters);
}

// ===========================
// Helpers
// ===========================

function generateTaskId() {
    return 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function getTaskRoleColor(roleName) {
    if (!roleName) return '#64748b';
    const role = cachedRoles.find(r => r.name === roleName);
    if (role && role.color) return rgbToHex(role.color) || role.color;
    return '#0ea5e9';
}

function rgbToHex(rgb) {
    if (!rgb) return null;
    if (rgb.startsWith('#')) return rgb;
    const result = rgb.match(/\d+/g);
    if (!result) return null;
    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function showInPageNotification(title, body, type = 'info') {
    const container = document.getElementById('inPageNotifications');
    const notification = document.createElement('div');
    notification.className = `in-page-notification ${type}`;
    notification.innerHTML = `
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        <div class="notification-title">${title}</div>
        <div class="notification-body">${body}</div>
    `;
    container.appendChild(notification);
    notification.addEventListener('click', function(e) {
        if (e.target.classList.contains('notification-close')) return;
        notification.remove();
    });
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideInNotification 0.3s ease-in reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}
