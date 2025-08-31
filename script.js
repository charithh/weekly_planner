// Global variable to track current week
let currentWeekStart = null;
let isFirebaseReady = false;

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize current week to today's week
    currentWeekStart = getWeekStart(new Date());
    
    // Initialize Firebase
    await initializeFirebase();
    
    // Initialize the planner
    initializePlanner();
    
    // Set up event listeners
    setupEventListeners();
    
    // Setup mobile navigation
    setupMobileNavigation();
    
    // Initialize controls as hidden
    initializeControls();
    
    // Update week header with current date
    updateWeekHeader();
});

async function initializeFirebase() {
    try {
        // Wait for Firebase service to be available
        let retries = 0;
        while (!window.FirebaseService && retries < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (window.FirebaseService) {
            isFirebaseReady = await window.FirebaseService.initFirebase();
            if (isFirebaseReady) {
                console.log('Firebase initialized successfully');
            } else {
                console.warn('Firebase initialization failed, using localStorage');
            }
        } else {
            console.warn('Firebase service not available, using localStorage');
        }
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        isFirebaseReady = false;
    }
}

function initializePlanner() {
    // Auto-save functionality
    const goalCells = document.querySelectorAll('.goal-cell');
    goalCells.forEach(cell => {
        setupGoalCellListeners(cell);
    });
    
    // Setup role editing functionality
    setupRoleEditingListeners();
    
    // Load saved data
    loadFromLocalStorage();
}

function setupEventListeners() {
    // Add role button
    document.getElementById('addRole').addEventListener('click', function() {
        addRole();
    });
    
    // Add goal column button
    document.getElementById('addGoal').addEventListener('click', function() {
        addGoalColumn();
    });
    
    // Remove role button
    document.getElementById('removeRole').addEventListener('click', function() {
        removeRole();
    });
    
    // Remove goal column button
    document.getElementById('removeGoal').addEventListener('click', function() {
        removeGoalColumn();
    });
    
    // Week navigation buttons
    document.getElementById('prevWeek').addEventListener('click', function() {
        navigateWeek(-1);
    });
    
    document.getElementById('nextWeek').addEventListener('click', function() {
        navigateWeek(1);
    });
    
    // Today button
    document.getElementById('todayButton').addEventListener('click', function() {
        currentWeekStart = getWeekStart(new Date());
        updateWeekHeader();
        loadWeekData();
    });
    
    // Week header click for date picker
    document.getElementById('weekHeader').addEventListener('click', function() {
        showDatePicker();
    });
    
    // Date picker change
    document.getElementById('datePicker').addEventListener('change', function() {
        const selectedDate = new Date(this.value);
        currentWeekStart = getWeekStart(selectedDate);
        updateWeekHeader();
        loadWeekData();
        this.style.display = 'none';
        document.getElementById('weekHeader').style.display = 'block';
    });
    
    // Controls toggle functionality
    document.getElementById('toggleControls').addEventListener('click', function() {
        toggleControls(true);
    });
    
    document.getElementById('hideControls').addEventListener('click', function() {
        toggleControls(false);
    });
    
    // Hide context menu on click outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.context-menu')) {
            hideContextMenu();
        }
        // Hide date picker if clicking outside
        if (!e.target.closest('.week-picker') && !e.target.closest('#datePicker')) {
            const datePicker = document.getElementById('datePicker');
            if (datePicker.style.display !== 'none') {
                datePicker.style.display = 'none';
                document.getElementById('weekHeader').style.display = 'block';
            }
        }
    });
}

function addRole() {
    const tbody = document.getElementById('plannerBody');
    const goalColumnsCount = document.querySelector('thead tr').children.length - 1;
    
    const newRole = prompt('Enter role name:');
    if (!newRole) return;
    
    const newRow = document.createElement('tr');
    newRow.className = 'role-row';
    newRow.setAttribute('data-role', newRole.toLowerCase().replace(/\s+/g, '-'));
    
    // Create role cell
    const roleCell = document.createElement('td');
    roleCell.className = 'role-cell custom-role';
    roleCell.textContent = newRole;
    roleCell.style.backgroundColor = getRandomColor();
    setupRoleEditingForCell(roleCell);
    newRow.appendChild(roleCell);
    
    // Create goal cells
    for (let i = 0; i < goalColumnsCount; i++) {
        const goalCell = document.createElement('td');
        goalCell.className = 'goal-cell';
        goalCell.contentEditable = true;
        setupGoalCellListeners(goalCell);
        newRow.appendChild(goalCell);
    }
    
    tbody.appendChild(newRow);
    saveToLocalStorage();
}

function removeRole() {
    const tbody = document.getElementById('plannerBody');
    const rows = tbody.querySelectorAll('.role-row');
    
    if (rows.length > 1) {
        const lastRow = rows[rows.length - 1];
        if (confirm('Remove the last role: "' + lastRow.querySelector('.role-cell').textContent.trim() + '"?')) {
            lastRow.remove();
            saveToLocalStorage();
        }
    } else {
        alert('Cannot remove the last role.');
    }
}

function addGoalColumn() {
    const table = document.getElementById('plannerTable');
    const headerRow = table.querySelector('thead tr');
    const bodyRows = table.querySelectorAll('tbody tr');
    
    // Add header
    const newHeader = document.createElement('th');
    newHeader.className = 'goal-header';
    newHeader.textContent = 'GOAL';
    headerRow.appendChild(newHeader);
    
    // Add cells to each row
    bodyRows.forEach(row => {
        const newCell = document.createElement('td');
        newCell.className = 'goal-cell';
        newCell.contentEditable = true;
        setupGoalCellListeners(newCell);
        row.appendChild(newCell);
    });
    
    // Update sharpen section
    const sharpenRow = document.querySelector('.sharpen-section tbody tr');
    if (sharpenRow) {
        const sharpenCell = document.createElement('td');
        sharpenCell.className = 'goal-cell';
        sharpenCell.contentEditable = true;
        setupGoalCellListeners(sharpenCell);
        sharpenRow.appendChild(sharpenCell);
        
        // Ensure sharpen role cell maintains editing functionality
        const sharpenRoleCell = sharpenRow.querySelector('.role-cell.sharpen-saw');
        if (sharpenRoleCell) {
            setupRoleEditingForCell(sharpenRoleCell);
        }
    }
    
    saveToLocalStorage();
}

function removeGoalColumn() {
    const table = document.getElementById('plannerTable');
    const headerRow = table.querySelector('thead tr');
    const bodyRows = table.querySelectorAll('tbody tr');
    const goalHeaders = headerRow.querySelectorAll('.goal-header');
    
    if (goalHeaders.length > 1) {
        if (confirm('Remove the last goal column?')) {
            // Remove header
            headerRow.removeChild(headerRow.lastElementChild);
            
            // Remove cells from each row
            bodyRows.forEach(row => {
                row.removeChild(row.lastElementChild);
            });
            
            // Update sharpen section
            const sharpenRow = document.querySelector('.sharpen-section tbody tr');
            if (sharpenRow && sharpenRow.children.length > 2) {
                sharpenRow.removeChild(sharpenRow.lastElementChild);
                
                // Ensure sharpen role cell maintains editing functionality
                const sharpenRoleCell = sharpenRow.querySelector('.role-cell.sharpen-saw');
                if (sharpenRoleCell) {
                    setupRoleEditingForCell(sharpenRoleCell);
                }
            }
            
            saveToLocalStorage();
        }
    } else {
        alert('Cannot remove the last goal column.');
    }
}

function getRandomColor() {
    const colors = [
        '#a8c8ec', '#b8d4b8', '#c8a8d8', '#f4d1a4', 
        '#d8c8e8', '#f4a4a4', '#e8d4b8', '#d4e8b8', 
        '#e8b8d4', '#b8e8d4'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function getWeekStart(date) {
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - date.getDay());
    sunday.setHours(0, 0, 0, 0);
    return sunday;
}

function navigateWeek(direction) {
    currentWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    updateWeekHeader();
    loadWeekData();
}

function showDatePicker() {
    const datePicker = document.getElementById('datePicker');
    const weekHeader = document.getElementById('weekHeader');
    
    // Set date picker to current week's Sunday
    const dateString = currentWeekStart.toISOString().split('T')[0];
    datePicker.value = dateString;
    
    // Show date picker, hide header
    weekHeader.style.display = 'none';
    datePicker.style.display = 'block';
    datePicker.focus();
}

function updateWeekHeader() {
    const options = { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    const sundayFormatted = currentWeekStart.toLocaleDateString('en-US', options);
    const headerText = `WEEK OF: ${sundayFormatted}`;
    
    document.getElementById('weekHeader').textContent = headerText;
    
    // Update page title
    document.title = `Weekly Planner - ${sundayFormatted}`;
}

function getWeekKey(weekStart) {
    return `week-${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
}

async function saveToFirestore() {
    const plannerData = {
        roles: [],
        sharpenData: [],
        goalColumnsCount: document.querySelector('thead tr').children.length - 1,
        weekStart: currentWeekStart.toISOString()
    };
    
    // Save main planner data
    const rows = document.querySelectorAll('#plannerBody .role-row');
    rows.forEach(row => {
        const roleCell = row.querySelector('.role-cell');
        const goalCells = row.querySelectorAll('.goal-cell');
        
        const roleData = {
            name: roleCell.textContent.trim(),
            color: roleCell.style.backgroundColor || '',
            goals: Array.from(goalCells).map(cell => ({
                text: cell.textContent.trim(),
                completed: cell.classList.contains('completed')
            }))
        };
        
        plannerData.roles.push(roleData);
    });
    
    // Save sharpen the saw data
    const sharpenRow = document.querySelector('.sharpen-section tbody tr');
    if (sharpenRow) {
        const sharpenCells = sharpenRow.querySelectorAll('.goal-cell');
        plannerData.sharpenData = Array.from(sharpenCells).map(cell => ({
            text: cell.textContent.trim(),
            completed: cell.classList.contains('completed')
        }));
    }
    
    // Save data for current week
    const weekKey = getWeekKey(currentWeekStart);
    
    if (isFirebaseReady && window.FirebaseService) {
        await window.FirebaseService.saveWeekData(weekKey, plannerData);
    } else {
        // Fallback to localStorage
        localStorage.setItem(`weeklyPlanner-${weekKey}`, JSON.stringify(plannerData));
    }
    
    // Also save general planner structure (roles without goals) for new weeks
    const structureData = {
        roles: plannerData.roles.map(role => ({
            name: role.name,
            color: role.color,
            goals: [] // Empty goals for structure template
        })),
        goalColumnsCount: plannerData.goalColumnsCount
    };
    
    if (isFirebaseReady && window.FirebaseService) {
        await window.FirebaseService.saveStructureTemplate(structureData);
    } else {
        localStorage.setItem('weeklyPlanner-structure', JSON.stringify(structureData));
    }
}

// Keep the old function name for compatibility
function saveToLocalStorage() {
    saveToFirestore();
}

async function loadWeekData() {
    const weekKey = getWeekKey(currentWeekStart);
    
    // Clear current data first
    clearCurrentWeekData();
    
    let weekData = null;
    
    if (isFirebaseReady && window.FirebaseService) {
        weekData = await window.FirebaseService.loadWeekData(weekKey);
    } else {
        // Fallback to localStorage
        const saved = localStorage.getItem(`weeklyPlanner-${weekKey}`);
        weekData = saved ? JSON.parse(saved) : null;
    }
    
    if (weekData) {
        // Load data for this specific week
        loadPlannerData(weekData);
    } else {
        // No data for this week, check if we have a structure template
        let structureData = null;
        
        if (isFirebaseReady && window.FirebaseService) {
            structureData = await window.FirebaseService.loadStructureTemplate();
        } else {
            const saved = localStorage.getItem('weeklyPlanner-structure');
            structureData = saved ? JSON.parse(saved) : null;
        }
        
        if (structureData) {
            // Load structure with empty goals
            loadPlannerData(structureData);
        }
    }
}

function clearCurrentWeekData() {
    // Clear all goal cells
    const goalCells = document.querySelectorAll('.goal-cell');
    goalCells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('completed');
    });
}

function loadPlannerData(plannerData) {
    try {
        // Load goals for existing roles
        const rows = document.querySelectorAll('#plannerBody .role-row');
        rows.forEach((row, index) => {
            if (plannerData.roles[index]) {
                const goalCells = row.querySelectorAll('.goal-cell');
                goalCells.forEach((cell, goalIndex) => {
                    if (plannerData.roles[index].goals[goalIndex]) {
                        const goalData = plannerData.roles[index].goals[goalIndex];
                        if (typeof goalData === 'string') {
                            // Legacy format support
                            cell.textContent = goalData;
                        } else {
                            // New format with completion status
                            cell.textContent = goalData.text;
                            if (goalData.completed) {
                                cell.classList.add('completed');
                            }
                        }
                    }
                });
            }
        });
        
        // Load sharpen the saw data
        const sharpenRow = document.querySelector('.sharpen-section tbody tr');
        if (sharpenRow && plannerData.sharpenData) {
            const sharpenCells = sharpenRow.querySelectorAll('.goal-cell');
            sharpenCells.forEach((cell, index) => {
                if (plannerData.sharpenData[index]) {
                    const goalData = plannerData.sharpenData[index];
                    if (typeof goalData === 'string') {
                        // Legacy format support
                        cell.textContent = goalData;
                    } else {
                        // New format with completion status
                        cell.textContent = goalData.text;
                        if (goalData.completed) {
                            cell.classList.add('completed');
                        }
                    }
                }
            });
        }
        
        // Re-setup role editing listeners after loading data
        setupRoleEditingListeners();
        
    } catch (error) {
        console.error('Error loading planner data:', error);
    }
}

function loadFromLocalStorage() {
    // This function is now just a wrapper for loadWeekData
    loadWeekData();
}

// Export functionality
function exportToPDF() {
    window.print();
}

// Add export button functionality if needed
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        exportToPDF();
    }
});

// Clear all data function
function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        localStorage.removeItem('weeklyPlanner');
        
        // Clear all goal cells
        const goalCells = document.querySelectorAll('.goal-cell');
        goalCells.forEach(cell => {
            cell.textContent = '';
        });
    }
}

function setupRoleEditingListeners() {
    const roleCells = document.querySelectorAll('.role-cell');
    roleCells.forEach(cell => {
        setupRoleEditingForCell(cell);
    });
    
    // Explicitly setup SHARPEN THE SAW cell
    const sharpenCell = document.querySelector('.role-cell.sharpen-saw');
    if (sharpenCell) {
        setupRoleEditingForCell(sharpenCell);
    }
}

function setupRoleEditingForCell(roleCell) {
    // Double-click to edit role name
    roleCell.addEventListener('dblclick', function(e) {
        e.preventDefault();
        editRoleName(roleCell);
    });
    
    // Right-click for context menu
    roleCell.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showContextMenu(e, roleCell);
    });
}

function editRoleName(roleCell) {
    const currentName = roleCell.textContent.trim();
    const newName = prompt('Edit role name:', currentName);
    
    if (newName && newName.trim() !== '' && newName !== currentName) {
        // Handle sub-roles for Engineering Manager
        if (roleCell.querySelector('.sub-roles')) {
            const subRolesList = roleCell.querySelector('.sub-roles');
            roleCell.innerHTML = newName;
            roleCell.appendChild(subRolesList);
        } else {
            roleCell.textContent = newName;
        }
        
        // Update data-role attribute
        const parentRow = roleCell.closest('.role-row');
        parentRow.setAttribute('data-role', newName.toLowerCase().replace(/\s+/g, '-'));
        
        saveToLocalStorage();
    }
}

function showContextMenu(event, roleCell) {
    hideContextMenu();
    
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item" onclick="editRoleName(arguments[0])" data-role-cell="true">✏️ Edit Name</div>
        <div class="context-menu-item" onclick="changeRoleColor(arguments[0])" data-role-cell="true">🎨 Change Color</div>
        <div class="context-menu-item" onclick="duplicateRole(arguments[0])" data-role-cell="true">📋 Duplicate Role</div>
        <hr class="context-menu-divider">
        <div class="context-menu-item danger" onclick="deleteRole(arguments[0])" data-role-cell="true">🗑️ Delete Role</div>
    `;
    
    // Position the menu
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
    
    document.body.appendChild(contextMenu);
    
    // Add click handlers with proper context
    const menuItems = contextMenu.querySelectorAll('.context-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = item.getAttribute('onclick').split('(')[0];
            
            switch(action) {
                case 'editRoleName':
                    editRoleName(roleCell);
                    break;
                case 'changeRoleColor':
                    changeRoleColor(roleCell);
                    break;
                case 'duplicateRole':
                    duplicateRole(roleCell);
                    break;
                case 'deleteRole':
                    deleteRole(roleCell);
                    break;
            }
            
            hideContextMenu();
        });
    });
}

function hideContextMenu() {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
}

function changeRoleColor(roleCell) {
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = rgbToHex(roleCell.style.backgroundColor) || '#a8c8ec';
    
    colorPicker.addEventListener('change', function() {
        roleCell.style.backgroundColor = colorPicker.value;
        saveToLocalStorage();
    });
    
    colorPicker.click();
}

function duplicateRole(roleCell) {
    const parentRow = roleCell.closest('.role-row');
    const tbody = document.getElementById('plannerBody');
    const goalColumnsCount = document.querySelector('thead tr').children.length - 1;
    
    const roleName = roleCell.textContent.trim();
    const newRoleName = prompt('Enter name for duplicated role:', roleName + ' Copy');
    
    if (!newRoleName) return;
    
    const newRow = document.createElement('tr');
    newRow.className = 'role-row';
    newRow.setAttribute('data-role', newRoleName.toLowerCase().replace(/\s+/g, '-'));
    
    // Create role cell with same color
    const newRoleCell = document.createElement('td');
    newRoleCell.className = roleCell.className;
    newRoleCell.textContent = newRoleName;
    newRoleCell.style.backgroundColor = roleCell.style.backgroundColor;
    setupRoleEditingForCell(newRoleCell);
    newRow.appendChild(newRoleCell);
    
    // Copy goal cells content
    const originalGoalCells = parentRow.querySelectorAll('.goal-cell');
    for (let i = 0; i < goalColumnsCount; i++) {
        const goalCell = document.createElement('td');
        goalCell.className = 'goal-cell';
        goalCell.contentEditable = true;
        setupGoalCellListeners(goalCell);
        
        // Copy content from original if it exists
        if (originalGoalCells[i]) {
            goalCell.textContent = originalGoalCells[i].textContent;
            // Copy completion status
            if (originalGoalCells[i].classList.contains('completed')) {
                goalCell.classList.add('completed');
            }
        }
        
        newRow.appendChild(goalCell);
    }
    
    // Insert after the original row
    parentRow.insertAdjacentElement('afterend', newRow);
    saveToLocalStorage();
}

function deleteRole(roleCell) {
    const parentRow = roleCell.closest('.role-row');
    const roleName = roleCell.textContent.trim();
    
    if (confirm(`Delete role "${roleName}"? This will remove all associated goals.`)) {
        parentRow.remove();
        saveToLocalStorage();
    }
}

function setupGoalCellListeners(goalCell) {
    goalCell.addEventListener('input', debounce(saveToLocalStorage, 1000));
    goalCell.addEventListener('blur', saveToLocalStorage);
    
    // Enhanced touch and click support for checkbox
    let touchStartX = null;
    let touchStartTime = null;
    
    // Touch start - record position and time
    goalCell.addEventListener('touchstart', function(e) {
        const touch = e.touches[0];
        const rect = goalCell.getBoundingClientRect();
        touchStartX = touch.clientX - rect.left;
        touchStartTime = Date.now();
    }, { passive: true });
    
    // Touch end - handle checkbox toggle
    goalCell.addEventListener('touchend', function(e) {
        if (touchStartX !== null && touchStartTime !== null) {
            const touchDuration = Date.now() - touchStartTime;
            
            // Quick tap on checkbox area (< 300ms, left 30px)
            if (touchDuration < 300 && touchStartX <= 30) {
                e.preventDefault();
                toggleGoalCompletion(goalCell);
            }
            
            touchStartX = null;
            touchStartTime = null;
        }
    });
    
    // Mouse click handler for desktop
    goalCell.addEventListener('click', function(e) {
        // Skip if this was triggered by touch
        if (e.detail === 0) return;
        
        // Check if clicked on the checkbox area (left 30px of cell)
        const rect = goalCell.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        
        if (clickX <= 30) {
            e.preventDefault();
            toggleGoalCompletion(goalCell);
        }
    });
    
    // Prevent editing when touching/clicking checkbox area
    goalCell.addEventListener('mousedown', function(e) {
        const rect = goalCell.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        
        if (clickX <= 30) {
            e.preventDefault();
        }
    });
    
    // Mobile-specific improvements
    if (isMobile()) {
        // Prevent accidental zoom on double-tap
        goalCell.addEventListener('touchstart', function(e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        });
        
        // Better focus handling for mobile keyboards
        goalCell.addEventListener('focus', function() {
            // Small delay to ensure keyboard is shown before scrolling
            setTimeout(() => {
                const container = document.querySelector('.planner-container');
                const rect = goalCell.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                
                // Scroll the container to bring the element into view
                if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
                    goalCell.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'nearest',
                        inline: 'nearest'
                    });
                }
            }, 300);
        });
    }
}

function toggleGoalCompletion(goalCell) {
    goalCell.classList.toggle('completed');
    saveToLocalStorage();
}

// Debounce function to avoid too many saves while typing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Mobile detection function
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
           window.matchMedia('(max-width: 768px)').matches;
}

// Enhanced mobile navigation
function setupMobileNavigation() {
    if (isMobile()) {
        // Add swipe navigation for weeks
        let startX = null;
        let startY = null;
        
        document.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        document.addEventListener('touchmove', function(e) {
            if (!startX || !startY) return;
            
            const diffX = e.touches[0].clientX - startX;
            const diffY = e.touches[0].clientY - startY;
            
            // Prevent default if this is a horizontal swipe
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.addEventListener('touchend', function(e) {
            if (!startX || !startY) return;
            
            const diffX = e.changedTouches[0].clientX - startX;
            const diffY = e.changedTouches[0].clientY - startY;
            
            // Horizontal swipe detection (min 50px, max 30° angle)
            if (Math.abs(diffX) > 50 && Math.abs(diffY) < Math.abs(diffX) * 0.5) {
                if (diffX > 0) {
                    // Swipe right - previous week
                    navigateWeek(-1);
                } else {
                    // Swipe left - next week
                    navigateWeek(1);
                }
            }
            
            startX = null;
            startY = null;
        });
        
        // Add mobile-friendly context menu positioning
        const originalShowContextMenu = showContextMenu;
        window.showContextMenu = function(event, roleCell) {
            // For mobile, center the context menu
            const rect = roleCell.getBoundingClientRect();
            const fakeEvent = {
                pageX: rect.left + rect.width / 2,
                pageY: rect.top + rect.height / 2
            };
            originalShowContextMenu.call(this, fakeEvent, roleCell);
        };
        
        // Better mobile keyboard handling
        let initialViewportHeight = window.innerHeight;
        
        window.addEventListener('resize', function() {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;
            
            // Keyboard is likely open if height decreased by more than 150px
            if (heightDifference > 150) {
                document.body.classList.add('keyboard-open');
            } else {
                document.body.classList.remove('keyboard-open');
                initialViewportHeight = currentHeight;
            }
        });
    }
}

function rgbToHex(rgb) {
    if (!rgb) return null;
    
    const result = rgb.match(/\d+/g);
    if (!result) return null;
    
    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);
    
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey) {
        switch(e.key) {
            case 's':
                e.preventDefault();
                saveToLocalStorage();
                break;
            case 'Delete':
                e.preventDefault();
                clearAllData();
                break;
        }
    }
    
    // Hide context menu on Escape
    if (e.key === 'Escape') {
        hideContextMenu();
    }
});

// Controls management functions
function initializeControls() {
    const controlsPanel = document.getElementById('controlsPanel');
    controlsPanel.classList.add('hidden');
}

function toggleControls(show) {
    const controlsPanel = document.getElementById('controlsPanel');
    const toggleButton = document.getElementById('toggleControls');
    const toggleIcon = toggleButton.querySelector('.toggle-icon');
    const toggleText = toggleButton.querySelector('.toggle-text');
    
    if (show) {
        controlsPanel.classList.remove('hidden');
        toggleIcon.textContent = '⚙️';
        toggleText.textContent = 'Controls';
        
        // Auto-hide after 10 seconds if not interacted with
        setTimeout(() => {
            if (!controlsPanel.matches(':hover')) {
                toggleControls(false);
            }
        }, 10000);
        
    } else {
        controlsPanel.classList.add('hidden');
        toggleIcon.textContent = '⚙️';
        toggleText.textContent = 'Controls';
    }
}

// Auto-hide controls when clicking outside
document.addEventListener('click', function(e) {
    const controlsPanel = document.getElementById('controlsPanel');
    const toggleButton = document.getElementById('toggleControls');
    
    if (!controlsPanel.contains(e.target) && !toggleButton.contains(e.target)) {
        if (!controlsPanel.classList.contains('hidden')) {
            toggleControls(false);
        }
    }
});