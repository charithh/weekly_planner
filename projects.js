let isFirebaseReady = false;
let projectsData = {};
// Cached roles from localStorage structure template
let cachedRoles = [];

const activeFilters = {
    search: '',
    status: 'all'
};

document.addEventListener('DOMContentLoaded', async function() {
    await initializeFirebase();
    setupProjectEventListeners();
    await initializeProjects();
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
        console.warn('Firebase init failed on projects page:', e);
    }
}

// ===========================
// Projects initialization
// ===========================

async function initializeProjects() {
    if (isFirebaseReady && window.FirebaseService) {
        try {
            // Load roles from Firebase structure template
            const structure = await window.FirebaseService.loadStructureTemplate();
            if (structure && structure.roles && structure.roles.length > 0) {
                cachedRoles = structure.roles;
            } else {
                loadCachedRoles();
            }
            projectsData = await window.FirebaseService.loadAllProjects();
        } catch (e) {
            console.warn('Projects load from Firebase failed, using localStorage:', e);
            loadCachedRoles();
            projectsData = getLocalProjects();
        }
    } else {
        loadCachedRoles();
        projectsData = getLocalProjects();
    }
    renderProjectsTable();
    populateRoleCheckboxes();
}

// Expose so firebase-service.js can call it after sign-in
window.initializeProjects = initializeProjects;

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

function setupProjectEventListeners() {
    document.getElementById('addProjectBtn').addEventListener('click', () => openProjectModal());
    document.getElementById('emptyAddProject').addEventListener('click', () => openProjectModal());
    document.getElementById('closeProjectModal').addEventListener('click', closeProjectModal);
    document.getElementById('cancelProjectBtn').addEventListener('click', closeProjectModal);
    document.getElementById('deleteProjectBtn').addEventListener('click', deleteProjectFromModal);
    
    document.getElementById('projectModal').addEventListener('click', function(e) {
        if (e.target.id === 'projectModal') closeProjectModal();
    });

    document.getElementById('projectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProjectFromModal();
    });

    document.getElementById('showCompletedProjects').addEventListener('change', renderProjectsTable);

    // Search — debounced
    let searchTimer;
    document.getElementById('filterSearch').addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            activeFilters.search = this.value.trim();
            updateClearButton();
            renderProjectsTable();
        }, 200);
    });

    // Status filter
    document.getElementById('filterStatus').addEventListener('change', function() {
        activeFilters.status = this.value;
        updateClearButton();
        renderProjectsTable();
    });

    // Clear filters
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        activeFilters.search = '';
        activeFilters.status = 'all';
        document.getElementById('filterSearch').value = '';
        document.getElementById('filterStatus').value = 'all';
        updateClearButton();
        renderProjectsTable();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeProjectModal();
    });
}

// ===========================
// Modal
// ===========================

async function openProjectModal(projectId = null) {
    const modal = document.getElementById('projectModal');
    const titleEl = document.getElementById('projectModalTitle');
    const idField = document.getElementById('projectModalId');
    const nameField = document.getElementById('projectModalName');
    const descField = document.getElementById('projectModalDescription');
    const dateField = document.getElementById('projectModalTargetDate');
    const statusRadios = document.querySelectorAll('input[name="projectStatus"]');
    const deleteBtn = document.getElementById('deleteProjectBtn');

    // Refresh roles
    if (isFirebaseReady && window.FirebaseService && window.FirebaseService.isUserSignedIn()) {
        try {
            const structure = await window.FirebaseService.loadStructureTemplate();
            if (structure && structure.roles && structure.roles.length > 0) {
                cachedRoles = structure.roles;
            } else {
                loadCachedRoles();
            }
        } catch (e) {
            loadCachedRoles();
        }
    } else {
        loadCachedRoles();
    }
    populateRoleCheckboxes();

    if (projectId && projectsData[projectId]) {
        const project = projectsData[projectId];
        titleEl.textContent = 'Edit Project';
        idField.value = projectId;
        nameField.value = project.name || '';
        descField.value = project.description || '';
        dateField.value = project.targetCompletionDate || '';
        
        // Set status
        const statusValue = project.status || 'active';
        statusRadios.forEach(radio => {
            radio.checked = radio.value === statusValue;
        });

        // Check related roles
        document.querySelectorAll('input[name="projectRoles"]').forEach(checkbox => {
            checkbox.checked = (project.roles || []).includes(checkbox.value);
        });

        deleteBtn.classList.remove('hidden');
    } else {
        titleEl.textContent = 'Add Project';
        idField.value = '';
        nameField.value = '';
        descField.value = '';
        dateField.value = '';
        statusRadios.forEach(radio => {
            radio.checked = radio.value === 'active';
        });
        document.querySelectorAll('input[name="projectRoles"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        deleteBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    nameField.focus();
}

function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    if (modal) modal.classList.add('hidden');
}

function populateRoleCheckboxes() {
    const container = document.getElementById('projectRolesContainer');
    container.innerHTML = '';
    
    cachedRoles.forEach(role => {
        if (!role.name) return;
        
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 cursor-pointer';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'projectRoles';
        checkbox.value = role.name;
        checkbox.className = 'rounded border-gray-300';
        
        const text = document.createElement('span');
        text.className = 'text-sm text-gray-700';
        text.textContent = role.name;
        
        label.appendChild(checkbox);
        label.appendChild(text);
        container.appendChild(label);
    });

    if (cachedRoles.length === 0) {
        const noRoles = document.createElement('p');
        noRoles.className = 'text-sm text-gray-500 italic';
        noRoles.textContent = 'No roles defined. Create roles in the planner first.';
        container.appendChild(noRoles);
    }
}

async function saveProjectFromModal() {
    const nameField = document.getElementById('projectModalName');
    const descField = document.getElementById('projectModalDescription');
    const dateField = document.getElementById('projectModalTargetDate');
    const name = nameField.value.trim();
    const description = descField.value.trim();
    const targetDate = dateField.value;

    if (!name) {
        showInPageNotification('Missing Field', 'Project name is required.', 'warning');
        nameField.focus();
        return;
    }
    if (!description) {
        showInPageNotification('Missing Field', 'Project description is required.', 'warning');
        descField.focus();
        return;
    }
    if (!targetDate) {
        showInPageNotification('Missing Field', 'Target completion date is required.', 'warning');
        dateField.focus();
        return;
    }

    const selectedRoles = Array.from(document.querySelectorAll('input[name="projectRoles"]:checked'))
        .map(checkbox => checkbox.value);
    
    if (selectedRoles.length === 0) {
        showInPageNotification('Missing Field', 'Select at least one role.', 'warning');
        return;
    }

    const existingId = document.getElementById('projectModalId').value;
    const projectId = existingId || generateProjectId();
    const statusValue = document.querySelector('input[name="projectStatus"]:checked').value;

    const projectData = {
        name,
        description,
        targetCompletionDate: targetDate,
        roles: selectedRoles,
        status: statusValue,
        createdAt: (projectsData[projectId] && projectsData[projectId].createdAt) 
            ? projectsData[projectId].createdAt 
            : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Add completedAt if status is completed
    if (statusValue === 'completed' && !projectData.completedAt) {
        projectData.completedAt = new Date().toISOString();
    }

    projectsData[projectId] = projectData;
    localStorage.setItem('projects-global', JSON.stringify(projectsData));

    if (isFirebaseReady && window.FirebaseService) {
        try {
            await window.FirebaseService.saveProject(projectId, projectData);
        } catch (e) {
            console.warn('Project Firebase save failed, localStorage used:', e);
        }
    }

    closeProjectModal();
    renderProjectsTable();
    showInPageNotification(existingId ? 'Project Updated' : 'Project Added', existingId ? `"${name}" updated.` : `"${name}" added.`, 'success');
}

async function deleteProjectFromModal() {
    const projectId = document.getElementById('projectModalId').value;
    if (!projectId) return;
    const projectName = projectsData[projectId] ? projectsData[projectId].name : 'this project';
    if (!confirm(`Delete "${projectName}"? This cannot be undone.`)) return;

    delete projectsData[projectId];
    localStorage.setItem('projects-global', JSON.stringify(projectsData));

    if (isFirebaseReady && window.FirebaseService) {
        try {
            await window.FirebaseService.deleteProject(projectId);
        } catch (e) {
            console.warn('Project Firebase delete failed, localStorage used:', e);
        }
    }

    closeProjectModal();
    renderProjectsTable();
    showInPageNotification('Project Deleted', `"${projectName}" deleted.`, 'success');
}

// ===========================
// Rendering
// ===========================

function renderProjectsTable() {
    const tbody = document.getElementById('projectsTableBody');
    const emptyState = document.getElementById('emptyState');
    const showCompleted = document.getElementById('showCompletedProjects').checked;

    // Filter projects
    let filtered = Object.entries(projectsData).filter(([id, project]) => {
        // Filter by completion
        if (!showCompleted && project.status === 'completed') return false;

        // Filter by status
        if (activeFilters.status !== 'all' && project.status !== activeFilters.status) return false;

        // Filter by search
        if (activeFilters.search) {
            const searchLower = activeFilters.search.toLowerCase();
            return project.name.toLowerCase().includes(searchLower) ||
                   (project.description && project.description.toLowerCase().includes(searchLower));
        }

        return true;
    });

    tbody.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    // Sort by target date
    filtered.sort((a, b) => {
        const dateA = new Date(a[1].targetCompletionDate);
        const dateB = new Date(b[1].targetCompletionDate);
        return dateA - dateB;
    });

    filtered.forEach(([projectId, project]) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';

        const nameCell = document.createElement('td');
        nameCell.className = 'px-6 py-4 text-sm font-medium text-gray-900';
        nameCell.textContent = project.name;

        const descCell = document.createElement('td');
        descCell.className = 'px-6 py-4 text-sm text-gray-600 max-w-xs truncate';
        descCell.textContent = project.description || '';

        const dateCell = document.createElement('td');
        dateCell.className = 'px-6 py-4 text-sm text-gray-600';
        const targetDate = new Date(project.targetCompletionDate);
        const daysRemaining = Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24));
        let dateText = targetDate.toLocaleDateString();
        if (daysRemaining < 0 && project.status === 'active') {
            dateText += ` (${Math.abs(daysRemaining)} days overdue)`;
            dateCell.className += ' text-red-600 font-medium';
        } else if (daysRemaining <= 7 && project.status === 'active') {
            dateText += ` (${daysRemaining} days left)`;
            dateCell.className += ' text-orange-600';
        }
        dateCell.textContent = dateText;

        const rolesCell = document.createElement('td');
        rolesCell.className = 'px-6 py-4 text-sm';
        rolesCell.innerHTML = (project.roles || []).map(roleName => {
            const role = cachedRoles.find(r => r.name === roleName);
            const bgColor = role && role.color ? role.color : '#e5e7eb';
            return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-gray-800 mr-1" style="background-color: ${bgColor}20; border: 1px solid ${bgColor}40;">${roleName}</span>`;
        }).join('');

        const statusCell = document.createElement('td');
        statusCell.className = 'px-6 py-4 text-sm';
        const statusBadge = document.createElement('span');
        statusBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
        if (project.status === 'completed') {
            statusBadge.className += ' bg-green-100 text-green-800';
            statusBadge.textContent = 'Completed';
        } else {
            statusBadge.className += ' bg-blue-100 text-blue-800';
            statusBadge.textContent = 'Active';
        }
        statusCell.appendChild(statusBadge);

        const actionsCell = document.createElement('td');
        actionsCell.className = 'px-6 py-4 text-sm space-x-2 flex gap-2';
        
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'text-blue-600 hover:text-blue-900 font-medium';
        editBtn.addEventListener('click', () => openProjectModal(projectId));

        actionsCell.appendChild(editBtn);

        row.appendChild(nameCell);
        row.appendChild(descCell);
        row.appendChild(dateCell);
        row.appendChild(rolesCell);
        row.appendChild(statusCell);
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
}

function updateClearButton() {
    const hasFilters = activeFilters.search || activeFilters.status !== 'all';
    const clearBtn = document.getElementById('clearFiltersBtn');
    clearBtn.classList.toggle('hidden', !hasFilters);
}

// ===========================
// Utilities
// ===========================

function generateProjectId() {
    return 'project-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function showInPageNotification(title, message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    
    const notification = document.createElement('div');
    notification.className = 'p-4 rounded-lg shadow-lg animate-slide-in';
    
    if (type === 'success') {
        notification.className += ' bg-green-50 border border-green-200';
    } else if (type === 'warning') {
        notification.className += ' bg-yellow-50 border border-yellow-200';
    } else {
        notification.className += ' bg-blue-50 border border-blue-200';
    }
    
    const titleEl = document.createElement('div');
    titleEl.className = type === 'success' ? 'font-semibold text-green-900' : 
                        type === 'warning' ? 'font-semibold text-yellow-900' :
                        'font-semibold text-blue-900';
    titleEl.textContent = title;
    
    const messageEl = document.createElement('div');
    messageEl.className = type === 'success' ? 'text-sm text-green-800 mt-1' : 
                          type === 'warning' ? 'text-sm text-yellow-800 mt-1' :
                          'text-sm text-blue-800 mt-1';
    messageEl.textContent = message;
    
    notification.appendChild(titleEl);
    notification.appendChild(messageEl);
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}
