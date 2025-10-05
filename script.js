// Global variable to track current week
let currentWeekStart = null;
let isFirebaseReady = false;
let notificationPermission = false;
let reminderIntervals = [];

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
    
    // Initialize notifications
    await initializeNotifications();
    
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
    console.log('=== INITIALIZING PLANNER ===');
    
    // Set up sharpen listeners first for existing HTML cells
    setupSharpenListeners();
    
    // Load saved data first - this will rebuild the entire structure dynamically
    console.log('Loading saved data...');
    loadFromLocalStorage();
    
    // Note: Goal cell listeners and role editing listeners are now set up
    // during the dynamic role creation in loadPlannerData()
    
    console.log('=== PLANNER INITIALIZATION COMPLETE ===');
}

function setupSharpenListeners() {
    const sharpenRow = document.querySelector('.sharpen-section tbody tr');
    if (sharpenRow) {
        const sharpenCells = sharpenRow.querySelectorAll('.goal-cell');
        sharpenCells.forEach(cell => {
            setupGoalCellListeners(cell);
        });
    }
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
    
    // Reminder settings button
    document.getElementById('reminderSettings').addEventListener('click', function() {
        openReminderModal();
    });
    
    // Review week button
    document.getElementById('reviewWeek').addEventListener('click', function() {
        openReviewModal();
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
    console.log('➕ Added new role:', newRole, '- will be available for future weeks');
    saveToLocalStorage();
}

function removeRole() {
    const tbody = document.getElementById('plannerBody');
    const rows = tbody.querySelectorAll('.role-row');
    
    if (rows.length > 1) {
        const lastRow = rows[rows.length - 1];
        const roleName = lastRow.querySelector('.role-cell').textContent.trim();
        
        if (confirm('Remove the last role: "' + roleName + '"?')) {
            lastRow.remove();
            saveToLocalStorage();
        }
    } else {
        alert('Cannot remove the last role.');
    }
}

function addGoalColumn() {
    addGoalColumnToStructure();
    saveToLocalStorage();
}

function removeGoalColumn() {
    const headerRow = document.querySelector('thead tr');
    
    if (!headerRow) {
        alert('Error: Could not find table header');
        return;
    }
    
    const allHeaders = headerRow.querySelectorAll('th');
    const goalHeaders = Array.from(allHeaders).slice(1); // Skip the first column (ROLE column)
    
    if (goalHeaders.length > 1) {
        if (confirm('Remove the last goal column for this week?')) {
            removeGoalColumnFromStructure();
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
    const year = weekStart.getFullYear();
    const month = String(weekStart.getMonth() + 1).padStart(2, '0'); // Add 1 since getMonth() is 0-indexed
    const day = String(weekStart.getDate()).padStart(2, '0');
    const key = `week-${year}-${month}-${day}`;
    console.log('📅 Generated week key:', key, 'for date:', weekStart.toDateString());
    return key;
}

async function saveToFirestore() {
    console.log('Saving data - Firebase ready:', isFirebaseReady);
    
    const plannerData = {
        roles: [],
        sharpenData: [],
        goalColumnsCount: document.querySelector('thead tr').children.length - 1,
        weekStart: currentWeekStart.toISOString()
    };
    
    // Save main planner data
    const rows = document.querySelectorAll('#plannerBody .role-row');
    console.log('Found rows to save:', rows.length);
    
    rows.forEach((row, index) => {
        const roleCell = row.querySelector('.role-cell');
        const goalCells = row.querySelectorAll('.goal-cell');
        const roleName = roleCell.textContent.trim();
        
        console.log(`Saving role ${index + 1}:`, roleName);
        
        const roleData = {
            name: roleName,
            color: roleCell.style.backgroundColor || '',
            goals: Array.from(goalCells).map(cell => ({
                text: cell.textContent.trim(),
                completed: cell.classList.contains('completed')
            }))
        };
        
        plannerData.roles.push(roleData);
    });
    
    console.log('Total roles being saved:', plannerData.roles.length);
    console.log('Role names being saved:', plannerData.roles.map(r => r.name));
    
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
    
    // Always save to localStorage first as backup
    localStorage.setItem(`weeklyPlanner-${weekKey}`, JSON.stringify(plannerData));
    console.log('✅ Saved to localStorage:', weekKey);
    console.log('📦 localStorage week data:', JSON.stringify(plannerData, null, 2));
    
    // Try Firebase if available
    if (isFirebaseReady && window.FirebaseService) {
        try {
            await window.FirebaseService.saveWeekData(weekKey, plannerData);
            console.log('✅ Saved to Firebase:', weekKey);
            console.log('🔥 Firebase week data:', JSON.stringify(plannerData, null, 2));
        } catch (error) {
            console.warn('❌ Firebase save failed, localStorage backup used:', error);
            showNotification('⚠️ Offline Mode', 'Changes saved locally only. Firebase connection blocked.', 'warning');
        }
    } else {
        console.log('ℹ️ Using localStorage only (Firebase not ready)');
    }
    
    // Save structure template
    const newStructureData = {
        roles: plannerData.roles.map(role => ({
            name: role.name,
            color: role.color,
            goals: [] // Empty goals for structure template
        })),
        goalColumnsCount: plannerData.goalColumnsCount // Use current week's goal column count for new weeks
    };
    
    // Save structure to localStorage
    localStorage.setItem('weeklyPlanner-structure', JSON.stringify(newStructureData));
    console.log('📋 Updated structure template with current roles and goal columns');
    console.log('📋 Template roles being saved:', newStructureData.roles.map(r => r.name));
    console.log('📋 Template goal columns being saved:', newStructureData.goalColumnsCount);
    console.log('📦 Full template saved to localStorage:', JSON.stringify(newStructureData, null, 2));
    
    // Try Firebase for structure
    if (isFirebaseReady && window.FirebaseService) {
        try {
            await window.FirebaseService.saveStructureTemplate(newStructureData);
            console.log('🔥 Firebase structure template:', JSON.stringify(newStructureData, null, 2));
        } catch (error) {
            console.warn('❌ Firebase structure save failed, localStorage used:', error);
        }
    }
}

function saveToLocalStorage() {
    saveToFirestore();
}

async function loadWeekData() {
    const weekKey = getWeekKey(currentWeekStart);
    console.log('Loading week data for:', weekKey);
    
    // Clear current data first
    clearCurrentWeekData();
    
    let weekData = null;
    
    // Try Firebase first, then localStorage fallback
    if (isFirebaseReady && window.FirebaseService) {
        try {
            console.log('🔥 Loading from Firebase:', weekKey);
            weekData = await window.FirebaseService.loadWeekData(weekKey);
            if (weekData) {
                console.log('✅ Loaded from Firebase:', weekKey);
                console.log('🔥 Firebase loaded data:', JSON.stringify(weekData, null, 2));
            } else {
                console.log('❌ No Firebase data found for:', weekKey);
            }
        } catch (error) {
            console.warn('❌ Firebase load failed:', error);
        }
    } else {
        console.log('❌ Firebase not ready');
    }
    
    // Fallback to localStorage if Firebase didn't work
    if (!weekData) {
        console.log('📝 Fallback to localStorage');
        const savedWeekData = localStorage.getItem(`weeklyPlanner-${weekKey}`);
        if (savedWeekData) {
            weekData = JSON.parse(savedWeekData);
            console.log('📦 Loaded from localStorage:', weekKey);
            console.log('📦 localStorage loaded data:', JSON.stringify(weekData, null, 2));
        } else {
            console.log('❌ No localStorage data found for:', weekKey);
        }
    }
    
    if (weekData) {
        // Load data for this specific week
        loadPlannerData(weekData);
    } else {
        console.log('No week data found, loading structure template...');
        // No data for this week, check if we have a structure template
        let structureData = null;
        
        // Try localStorage first for structure
        const savedStructure = localStorage.getItem('weeklyPlanner-structure');
        if (savedStructure) {
            structureData = JSON.parse(savedStructure);
            console.log('✅ Loaded structure from localStorage');
            console.log('📦 localStorage structure loaded:', JSON.stringify(structureData, null, 2));
        } else if (isFirebaseReady && window.FirebaseService) {
            try {
                structureData = await window.FirebaseService.loadStructureTemplate();
                console.log('✅ Loaded structure from Firebase');
                console.log('🔥 Firebase structure loaded:', JSON.stringify(structureData, null, 2));
            } catch (error) {
                console.warn('❌ Firebase structure load failed:', error);
            }
        }
        
        if (structureData) {
            // Load structure with empty goals
            console.log('📋 Loading structure template for new week');
            console.log('📋 Template roles:', structureData.roles.map(r => r.name));
            console.log('📋 Template goal columns:', structureData.goalColumnsCount);
            loadPlannerData(structureData);
        } else {
            console.log('No structure template found, using defaults');
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

function adjustTableStructure(targetGoalCount) {
    const currentGoalCount = document.querySelector('thead tr').children.length - 1;
    const difference = targetGoalCount - currentGoalCount;
    
    if (difference > 0) {
        // Add columns
        for (let i = 0; i < difference; i++) {
            addGoalColumnToStructure();
        }
    } else if (difference < 0) {
        // Remove columns
        for (let i = 0; i < Math.abs(difference); i++) {
            removeGoalColumnFromStructure();
        }
    }
}

function addGoalColumnToStructure() {
    const table = document.getElementById('plannerTable');
    const headerRow = table.querySelector('thead tr');
    const bodyRows = table.querySelectorAll('tbody tr');
    
    // Add header
    const newHeader = document.createElement('th');
    // Check if this will be the last column to determine border styling
    const isLastColumn = headerRow.children.length === headerRow.querySelectorAll('th').length;
    if (isLastColumn) {
        newHeader.className = 'px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider';
    } else {
        newHeader.className = 'px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200';
    }
    newHeader.textContent = 'GOAL';
    
    // Update the previous last column to have border if it exists
    const currentLastHeader = headerRow.children[headerRow.children.length - 1];
    if (currentLastHeader && !currentLastHeader.classList.contains('border-r')) {
        currentLastHeader.classList.add('border-r', 'border-gray-200');
    }
    
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
}

function removeGoalColumnFromStructure() {
    const table = document.getElementById('plannerTable');
    const headerRow = table.querySelector('thead tr');
    const bodyRows = table.querySelectorAll('tbody tr');
    const allHeaders = headerRow.querySelectorAll('th');
    const goalHeaders = Array.from(allHeaders).slice(1); // Skip the first column (ROLE column)
    
    if (goalHeaders.length > 1) {
        // Remove header
        headerRow.removeChild(headerRow.lastElementChild);
        
        // Update the new last column to remove border
        const newLastHeader = headerRow.children[headerRow.children.length - 1];
        if (newLastHeader) {
            newLastHeader.classList.remove('border-r', 'border-gray-200');
        }
        
        // Remove cells from each row
        bodyRows.forEach(row => {
            if (row.children.length > 2) {
                row.removeChild(row.lastElementChild);
            }
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
    }
}

function loadPlannerData(plannerData) {
    console.log('🔄 Loading planner data:', JSON.stringify(plannerData, null, 2));
    try {
        // First, adjust the table structure if goal column count differs
        const currentGoalCount = document.querySelector('thead tr').children.length - 1;
        const savedGoalCount = plannerData.goalColumnsCount || currentGoalCount;
        
        if (savedGoalCount !== currentGoalCount) {
            adjustTableStructure(savedGoalCount);
        }
        
        // COMPLETELY REBUILD ROLE STRUCTURE FROM SAVED DATA
        const tbody = document.getElementById('plannerBody');
        
        // Clear existing roles (but preserve structure)
        tbody.innerHTML = '';
        
        if (plannerData.roles && plannerData.roles.length > 0) {
            console.log(`🔄 Rebuilding ${plannerData.roles.length} roles from saved data`);
            
            // Recreate each role row from saved data
            plannerData.roles.forEach((roleData, index) => {
                console.log(`Creating role ${index + 1}:`, roleData.name);
                
                const newRow = document.createElement('tr');
                newRow.className = 'role-row';
                newRow.setAttribute('data-role', roleData.name.toLowerCase().replace(/\s+/g, '-'));
                
                // Create role cell
                const roleCell = document.createElement('td');
                roleCell.className = 'role-cell';
                roleCell.textContent = roleData.name;
                if (roleData.color) {
                    roleCell.style.backgroundColor = roleData.color;
                }
                
                // Setup role editing for this cell
                setupRoleEditingForCell(roleCell);
                newRow.appendChild(roleCell);
                
                // Create goal cells
                for (let goalIndex = 0; goalIndex < savedGoalCount; goalIndex++) {
                    const goalCell = document.createElement('td');
                    goalCell.className = 'goal-cell';
                    goalCell.contentEditable = true;
                    goalCell.title = 'Click checkbox to mark complete';
                    
                    // Load goal data if it exists
                    if (roleData.goals && roleData.goals[goalIndex]) {
                        const goalData = roleData.goals[goalIndex];
                        if (typeof goalData === 'string') {
                            // Legacy format support
                            goalCell.textContent = goalData;
                        } else {
                            // New format with completion status
                            goalCell.textContent = goalData.text;
                            if (goalData.completed) {
                                goalCell.classList.add('completed');
                            }
                        }
                    }
                    
                    // Setup goal cell listeners
                    setupGoalCellListeners(goalCell);
                    newRow.appendChild(goalCell);
                }
                
                tbody.appendChild(newRow);
            });
            
        } else {
            console.log('⚠️ No roles found in saved data, using default structure');
            // If no saved roles, create a basic default structure
            createDefaultRoleStructure(savedGoalCount);
        }
        
        // Load sharpen the saw data
        const sharpenRow = document.querySelector('.sharpen-section tbody tr');
        if (sharpenRow) {
            const sharpenCells = sharpenRow.querySelectorAll('.goal-cell');
            
            // Set up event listeners for all sharpen cells (existing and newly created)
            sharpenCells.forEach(cell => {
                setupGoalCellListeners(cell);
            });
            
            // Load saved data if available
            if (plannerData.sharpenData) {
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
        }
        
        console.log('✅ Role structure completely rebuilt from saved data');
        
    } catch (error) {
        console.error('Error loading planner data:', error);
    }
}

function createDefaultRoleStructure(goalColumnsCount) {
    console.log('🔄 Creating default role structure with', goalColumnsCount, 'goal columns');
    
    const defaultRoles = [
        { name: 'Individual', color: '#a8c8ec' },
        { name: 'Husband', color: '#b8d4b8' },
        { name: 'Father', color: '#c8a8d8' },
        { name: 'Engineering Manager', color: '#f4d1a4' }
    ];
    
    const tbody = document.getElementById('plannerBody');
    
    defaultRoles.forEach(roleData => {
        const newRow = document.createElement('tr');
        newRow.className = 'role-row';
        newRow.setAttribute('data-role', roleData.name.toLowerCase().replace(/\s+/g, '-'));
        
        // Create role cell
        const roleCell = document.createElement('td');
        roleCell.className = 'role-cell';
        roleCell.textContent = roleData.name;
        roleCell.style.backgroundColor = roleData.color;
        setupRoleEditingForCell(roleCell);
        newRow.appendChild(roleCell);
        
        // Create empty goal cells
        for (let i = 0; i < goalColumnsCount; i++) {
            const goalCell = document.createElement('td');
            goalCell.className = 'goal-cell';
            goalCell.contentEditable = true;
            goalCell.title = 'Click checkbox to mark complete';
            setupGoalCellListeners(goalCell);
            newRow.appendChild(goalCell);
        }
        
        tbody.appendChild(newRow);
    });
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

// Reset all data (localStorage + Firebase)
async function resetAllData() {
    if (!confirm('🚨 RESET ALL DATA? This will delete everything from both localStorage and Firebase. This cannot be undone!')) {
        return;
    }
    
    console.log('🗑️ Starting complete data reset...');
    
    // Clear localStorage
    console.log('Clearing localStorage...');
    const keys = Object.keys(localStorage);
    const weeklyPlannerKeys = keys.filter(key => key.startsWith('weeklyPlanner'));
    
    weeklyPlannerKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`✅ Removed localStorage key: ${key}`);
    });
    
    // Also clear review data
    const reviewKeys = keys.filter(key => key.startsWith('weeklyReview-'));
    reviewKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`✅ Removed review key: ${key}`);
    });
    
    // Clear Firebase
    if (isFirebaseReady && window.FirebaseService) {
        console.log('Clearing Firebase...');
        const success = await window.FirebaseService.deleteAllFirebaseData();
        if (success) {
            console.log('✅ Firebase data cleared');
        } else {
            console.warn('❌ Firebase clear failed');
        }
    }
    
    // Clear UI
    const goalCells = document.querySelectorAll('.goal-cell');
    goalCells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('completed');
    });
    
    console.log('🎉 Complete data reset finished!');
    showNotification('🗑️ Data Reset', 'All data cleared from localStorage and Firebase', 'success');
}

// Make it globally accessible for console use
window.resetAllData = resetAllData;

function setupRoleEditingListeners() {
    console.log('=== SETTING UP ROLE EDITING LISTENERS ===');
    const roleCells = document.querySelectorAll('.role-cell');
    console.log('Found role cells:', roleCells.length);
    
    roleCells.forEach((cell, index) => {
        console.log(`Setting up role cell ${index + 1}:`, cell.textContent.trim());
        setupRoleEditingForCell(cell);
    });
    
    // Explicitly setup SHARPEN THE SAW cell
    const sharpenCell = document.querySelector('.role-cell.sharpen-saw');
    if (sharpenCell) {
        console.log('Setting up SHARPEN THE SAW cell specifically');
        setupRoleEditingForCell(sharpenCell);
    } else {
        console.log('SHARPEN THE SAW cell not found');
    }
    
    console.log('=== ROLE EDITING SETUP COMPLETE ===');
}

function setupRoleEditingForCell(roleCell) {
    console.log('Setting up role editing for cell:', roleCell.textContent.trim());
    console.log('Role cell element:', roleCell);
    console.log('Role cell classes:', roleCell.className);
    
    // Remove any existing listeners first to avoid duplicates
    roleCell.removeEventListener('dblclick', roleCell._dblClickHandler);
    roleCell.removeEventListener('contextmenu', roleCell._contextMenuHandler);
    
    // Double-click to edit role name
    roleCell._dblClickHandler = function(e) {
        console.log('🖱️ DOUBLE-CLICK EVENT FIRED on role:', roleCell.textContent.trim());
        console.log('Event details:', e);
        e.preventDefault();
        e.stopPropagation();
        editRoleName(roleCell);
    };
    
    // Right-click for context menu
    roleCell._contextMenuHandler = function(e) {
        console.log('🖱️ RIGHT-CLICK EVENT FIRED on role:', roleCell.textContent.trim());
        console.log('Event details:', e);
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e, roleCell);
    };
    
    roleCell.addEventListener('dblclick', roleCell._dblClickHandler);
    roleCell.addEventListener('contextmenu', roleCell._contextMenuHandler);
    
    console.log('✅ Event listeners attached to:', roleCell.textContent.trim());
    
    // Add a test click listener to verify events are working
    roleCell.addEventListener('click', function(e) {
        console.log('👆 CLICK EVENT on role:', roleCell.textContent.trim());
    });
}

function editRoleName(roleCell) {
    console.log('editRoleName called for:', roleCell.textContent.trim()); // Debug log
    
    const currentName = roleCell.textContent.trim();
    const newName = prompt('Edit role name:', currentName);
    
    console.log('User entered new name:', newName); // Debug log
    
    if (newName && newName.trim() !== '' && newName !== currentName) {
        console.log('Updating role name from', currentName, 'to', newName); // Debug log
        
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
        showNotification('✅ Role Updated', `Role renamed to "${newName}"`, 'success');
    } else {
        console.log('Role name not changed or invalid'); // Debug log
    }
}

function showContextMenu(event, roleCell) {
    hideContextMenu();
    
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item" data-action="editRoleName">✏️ Edit Name</div>
        <div class="context-menu-item" data-action="changeRoleColor">🎨 Change Color</div>
        <div class="context-menu-item" data-action="duplicateRole">📋 Duplicate Role</div>
        <hr class="context-menu-divider">
        <div class="context-menu-item danger" data-action="deleteRole">🗑️ Delete Role</div>
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
            const action = item.getAttribute('data-action');
            
            console.log('Context menu action clicked:', action); // Debug log
            
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
    console.log('deleteRole called for:', roleCell.textContent.trim()); // Debug log
    
    const parentRow = roleCell.closest('.role-row');
    const roleName = roleCell.textContent.trim();
    
    console.log('Attempting to delete role:', roleName); // Debug log
    console.log('Parent row found:', parentRow); // Debug log
    
    if (confirm(`Delete role "${roleName}"? This will remove all associated goals.`)) {
        console.log('User confirmed deletion, removing row'); // Debug log
        parentRow.remove();
        
        // Add a small delay to ensure DOM is updated before saving
        setTimeout(() => {
            console.log('Saving after role deletion with delay...');
            saveToLocalStorage();
        }, 100);
        
        showNotification('🗑️ Role Deleted', `Role "${roleName}" has been removed`, 'warning');
    } else {
        console.log('User cancelled deletion'); // Debug log
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
    const toggleIcon = toggleButton.children[0]; // First span element (icon)
    const toggleText = toggleButton.children[1]; // Second span element (text)
    
    if (show) {
        controlsPanel.classList.remove('hidden');
        if (toggleIcon) toggleIcon.textContent = '⚙️';
        if (toggleText) toggleText.textContent = 'Controls';
        
        // Auto-hide after 10 seconds if not interacted with
        setTimeout(() => {
            if (!controlsPanel.matches(':hover')) {
                toggleControls(false);
            }
        }, 10000);
        
    } else {
        controlsPanel.classList.add('hidden');
        if (toggleIcon) toggleIcon.textContent = '⚙️';
        if (toggleText) toggleText.textContent = 'Controls';
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

// Notification Functions
async function initializeNotifications() {
    console.log('Initializing notifications...');
    
    if ('Notification' in window) {
        console.log('Initial notification permission:', Notification.permission);
        notificationPermission = Notification.permission === 'granted';
        console.log('notificationPermission initialized to:', notificationPermission);
        
        await loadReminderSettings();
        setupModalEventListeners();
    } else {
        console.log('Notifications not supported');
    }
}

function setupModalEventListeners() {
    // Close reminder modal
    document.getElementById('closeModal').addEventListener('click', closeReminderModal);
    document.getElementById('reminderModal').addEventListener('click', function(e) {
        if (e.target.id === 'reminderModal') {
            closeReminderModal();
        }
    });
    
    // Close review modal
    document.getElementById('closeReviewModal').addEventListener('click', closeReviewModal);
    document.getElementById('reviewModal').addEventListener('click', function(e) {
        if (e.target.id === 'reviewModal') {
            closeReviewModal();
        }
    });
    
    // Enable notifications button
    document.getElementById('enableNotifications').addEventListener('click', async function() {
        await requestNotificationPermission();
    });
    
    // Save settings button
    document.getElementById('saveReminders').addEventListener('click', function() {
        saveReminderSettings();
    });
    
    // Test notification button
    document.getElementById('testNotification').addEventListener('click', function() {
        showTestNotification();
    });
    
    // Save review button
    document.getElementById('saveReview').addEventListener('click', function() {
        saveCurrentReview();
    });
    
    // View history button
    document.getElementById('viewHistory').addEventListener('click', function() {
        showReviewHistory();
    });
}

async function requestNotificationPermission() {
    console.log('Requesting notification permission...');
    console.log('Notification support:', 'Notification' in window);
    console.log('Current permission:', Notification.permission);
    
    if ('Notification' in window) {
        try {
            const permission = await Notification.requestPermission();
            console.log('Permission result:', permission);
            notificationPermission = permission === 'granted';
            console.log('notificationPermission set to:', notificationPermission);
            
            updateNotificationStatus();
            
            if (notificationPermission) {
                scheduleReminders();
                // Test notification immediately after granting permission
                setTimeout(() => {
                    showNotification('🎉 Notifications Enabled!', 'You will now receive daily goal reminders.', 'success');
                }, 500);
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    } else {
        console.log('Notifications not supported in this browser');
        alert('Notifications are not supported in this browser.');
    }
}

function updateNotificationStatus() {
    const statusDiv = document.getElementById('notificationStatus');
    const settingsDiv = document.getElementById('reminderSettingsPanel');
    
    if (notificationPermission) {
        statusDiv.style.display = 'none';
        settingsDiv.style.display = 'block';
    } else {
        statusDiv.style.display = 'block';
        settingsDiv.style.display = 'none';
        
        const statusText = statusDiv.querySelector('p');
        if (Notification.permission === 'denied') {
            statusText.textContent = '🚫 Notifications are blocked. Please enable them in your browser settings.';
            statusDiv.querySelector('button').style.display = 'none';
        } else {
            statusText.textContent = '🔕 Notifications are disabled';
            statusDiv.querySelector('button').style.display = 'block';
        }
    }
}

function openReminderModal() {
    updateNotificationStatus();
    document.getElementById('reminderModal').style.display = 'block';
}

function closeReminderModal() {
    document.getElementById('reminderModal').style.display = 'none';
}

async function loadReminderSettings() {
    let settings = null;
    
    if (isFirebaseReady && window.FirebaseService) {
        // Try to load from Firebase (future enhancement)
        settings = null;
    } else {
        const saved = localStorage.getItem('reminderSettings');
        settings = saved ? JSON.parse(saved) : null;
    }
    
    if (settings) {
        document.getElementById('reminderTime').value = settings.time || '09:00';
        document.getElementById('enableReminders').checked = settings.enabled !== false;
        
        // Set day checkboxes
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        days.forEach(day => {
            const checkbox = document.getElementById(day);
            checkbox.checked = settings.days ? settings.days[day] : (day !== 'sat' && day !== 'sun');
        });
    }
    
    if (notificationPermission) {
        scheduleReminders();
    }
}

function saveReminderSettings() {
    console.log('Saving reminder settings...'); // Debug log
    
    try {
        const settings = {
            time: document.getElementById('reminderTime').value,
            enabled: document.getElementById('enableReminders').checked,
            days: {
                mon: document.getElementById('mon').checked,
                tue: document.getElementById('tue').checked,
                wed: document.getElementById('wed').checked,
                thu: document.getElementById('thu').checked,
                fri: document.getElementById('fri').checked,
                sat: document.getElementById('sat').checked,
                sun: document.getElementById('sun').checked
            }
        };
        
        console.log('Settings to save:', settings); // Debug log
        
        // Save to localStorage for now
        localStorage.setItem('reminderSettings', JSON.stringify(settings));
        
        // Reschedule reminders
        if (notificationPermission) {
            scheduleReminders();
        }
        
        closeReminderModal();
        
        // Show confirmation
        showNotification('✅ Reminder Settings Saved', 'Your daily goal reminders have been updated!', 'success');
        
    } catch (error) {
        console.error('Error saving reminder settings:', error);
        alert('Error saving settings. Please try again.');
    }
}

function scheduleReminders() {
    // Clear existing intervals
    reminderIntervals.forEach(interval => clearInterval(interval));
    reminderIntervals = [];
    
    const settings = JSON.parse(localStorage.getItem('reminderSettings') || '{}');
    
    if (!settings.enabled || !notificationPermission) return;
    
    const reminderTime = settings.time || '09:00';
    const [hours, minutes] = reminderTime.split(':').map(Number);
    
    // Schedule daily check
    const checkInterval = setInterval(() => {
        const now = new Date();
        const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
        
        if (settings.days && settings.days[currentDay] && 
            now.getHours() === hours && 
            now.getMinutes() === minutes) {
            showDailyReminder();
        }
    }, 60000); // Check every minute
    
    reminderIntervals.push(checkInterval);
}

function showDailyReminder() {
    const incompleteTasks = getIncompleteTasks();
    const taskCount = incompleteTasks.length;
    
    let message = '';
    if (taskCount === 0) {
        message = '🎉 Great job! All your goals for this week are complete!';
    } else {
        message = `📋 You have ${taskCount} incomplete goal${taskCount > 1 ? 's' : ''} for this week.`;
    }
    
    showNotification('🎯 Daily Goal Reminder', message);
}

function getIncompleteTasks() {
    const incompleteTasks = [];
    
    // Check main planner goals
    const goalCells = document.querySelectorAll('.goal-cell');
    goalCells.forEach(cell => {
        if (cell.textContent.trim() && !cell.classList.contains('completed')) {
            incompleteTasks.push(cell.textContent.trim());
        }
    });
    
    return incompleteTasks;
}

function showNotification(title, body, type = 'info') {
    console.log('showNotification called:', { title, body, permission: notificationPermission }); // Debug log
    
    // Always show in-page notification as primary method
    showInPageNotification(title, body, type);
    
    // Try browser notification as backup (if permission granted)
    if (notificationPermission) {
        try {
            const notification = new Notification(title, {
                body: body,
                tag: 'weekly-planner-reminder',
                requireInteraction: false
            });
            
            notification.onclick = function() {
                window.focus();
                notification.close();
            };
            
            // Auto-close after 5 seconds
            setTimeout(() => notification.close(), 5000);
            
            console.log('Browser notification created successfully');
        } catch (error) {
            console.error('Error creating browser notification:', error);
        }
    }
}

function showInPageNotification(title, body, type = 'info') {
    const container = document.getElementById('inPageNotifications');
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `in-page-notification ${type}`;
    notification.innerHTML = `
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        <div class="notification-title">${title}</div>
        <div class="notification-body">${body}</div>
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Click to dismiss
    notification.addEventListener('click', function(e) {
        if (e.target.classList.contains('notification-close')) return;
        notification.remove();
        window.focus();
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideInNotification 0.3s ease-in reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
    
    console.log('In-page notification created:', title);
}

function showTestNotification() {
    console.log('=== TEST NOTIFICATION CLICKED ===');
    console.log('notificationPermission variable:', notificationPermission);
    console.log('Notification.permission:', Notification.permission);
    console.log('Notification support:', 'Notification' in window);
    
    // Double-check permission state
    const actualPermission = Notification.permission === 'granted';
    console.log('Actual permission granted:', actualPermission);
    
    // Update our variable if it's out of sync
    if (actualPermission !== notificationPermission) {
        console.log('Permission state was out of sync, updating...');
        notificationPermission = actualPermission;
        updateNotificationStatus();
    }
    
    if (!actualPermission) {
        alert('⚠️ Notifications are not enabled. Please click "Enable Notifications" first and allow when prompted.');
        return;
    }
    
    console.log('Creating test notification...');
    showNotification('🔔 Test Notification', 'This is how your daily goal reminders will look!');
}

// Review Week Functions
function openReviewModal() {
    console.log('📊 Opening Review Week modal');
    generateWeekReview();
    document.getElementById('reviewModal').classList.remove('hidden');
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.add('hidden');
}

// This function has been moved below with enhanced functionality

function analyzeWeekData() {
    const analysis = {
        totalGoals: 0,
        completedGoals: 0,
        inProgressGoals: 0,
        roles: [],
        insights: []
    };
    
    // Analyze main roles
    const roleRows = document.querySelectorAll('#plannerBody .role-row');
    
    roleRows.forEach(row => {
        const roleCell = row.querySelector('.role-cell');
        const goalCells = row.querySelectorAll('.goal-cell');
        
        const roleData = {
            name: roleCell.textContent.trim(),
            color: roleCell.style.backgroundColor || '#f0f0f0',
            totalGoals: 0,
            completedGoals: 0,
            goals: []
        };
        
        goalCells.forEach(cell => {
            const goalText = cell.textContent.trim();
            if (goalText) {
                const isCompleted = cell.classList.contains('completed');
                roleData.totalGoals++;
                analysis.totalGoals++;
                
                if (isCompleted) {
                    roleData.completedGoals++;
                    analysis.completedGoals++;
                } else {
                    analysis.inProgressGoals++;
                }
                
                roleData.goals.push({
                    text: goalText,
                    completed: isCompleted
                });
            }
        });
        
        // Calculate completion rate for this role
        roleData.completionRate = roleData.totalGoals > 0 ? 
            Math.round((roleData.completedGoals / roleData.totalGoals) * 100) : 0;
        
        if (roleData.totalGoals > 0) {
            analysis.roles.push(roleData);
        }
    });
    
    // Analyze Sharpen the Saw
    const sharpenRow = document.querySelector('.sharpen-section tbody tr');
    if (sharpenRow) {
        const sharpenCells = sharpenRow.querySelectorAll('.goal-cell');
        let sharpenGoals = 0;
        let sharpenCompleted = 0;
        
        sharpenCells.forEach(cell => {
            const goalText = cell.textContent.trim();
            if (goalText) {
                sharpenGoals++;
                analysis.totalGoals++;
                
                if (cell.classList.contains('completed')) {
                    sharpenCompleted++;
                    analysis.completedGoals++;
                } else {
                    analysis.inProgressGoals++;
                }
            }
        });
        
        if (sharpenGoals > 0) {
            analysis.roles.push({
                name: 'Sharpen the Saw',
                color: '#e8d4b8',
                totalGoals: sharpenGoals,
                completedGoals: sharpenCompleted,
                completionRate: Math.round((sharpenCompleted / sharpenGoals) * 100),
                goals: []
            });
        }
    }
    
    // Generate insights
    analysis.insights = generateInsights(analysis);
    
    console.log('📊 Week analysis complete:', analysis);
    return analysis;
}

function generateInsights(analysis) {
    const insights = [];
    
    if (analysis.totalGoals === 0) {
        insights.push({
            type: 'info',
            icon: '📝',
            message: 'No goals have been set for this week yet. Consider adding some goals to track your progress!'
        });
        return insights;
    }
    
    const overallRate = Math.round((analysis.completedGoals / analysis.totalGoals) * 100);
    
    // Overall performance insights
    if (overallRate >= 80) {
        insights.push({
            type: 'success',
            icon: '🎉',
            message: `Excellent week! You've completed ${overallRate}% of your goals. Keep up the great work!`
        });
    } else if (overallRate >= 60) {
        insights.push({
            type: 'good',
            icon: '👍',
            message: `Good progress! You've completed ${overallRate}% of your goals. A few more goals to finish strong.`
        });
    } else if (overallRate >= 40) {
        insights.push({
            type: 'warning',
            icon: '⚡',
            message: `You're halfway there with ${overallRate}% completion. Focus on the remaining goals to finish the week strong.`
        });
    } else {
        insights.push({
            type: 'alert',
            icon: '🚨',
            message: `Only ${overallRate}% of goals completed. Consider prioritizing your most important tasks.`
        });
    }
    
    // Role-specific insights
    const sortedRoles = [...analysis.roles].sort((a, b) => b.completionRate - a.completionRate);
    
    if (sortedRoles.length > 0) {
        const bestRole = sortedRoles[0];
        const worstRole = sortedRoles[sortedRoles.length - 1];
        
        if (bestRole.completionRate >= 80) {
            insights.push({
                type: 'success',
                icon: '🏆',
                message: `${bestRole.name} is your top performer with ${bestRole.completionRate}% completion rate!`
            });
        }
        
        if (worstRole.completionRate < 50 && worstRole.totalGoals > 0) {
            insights.push({
                type: 'attention',
                icon: '🎯',
                message: `${worstRole.name} needs attention with only ${worstRole.completionRate}% completion rate.`
            });
        }
    }
    
    // Goal distribution insights
    const rolesWithGoals = analysis.roles.filter(role => role.totalGoals > 0);
    if (rolesWithGoals.length > 0) {
        const avgGoalsPerRole = Math.round(analysis.totalGoals / rolesWithGoals.length);
        const roleWithMostGoals = rolesWithGoals.reduce((max, role) => 
            role.totalGoals > max.totalGoals ? role : max);
        
        if (roleWithMostGoals.totalGoals > avgGoalsPerRole * 1.5) {
            insights.push({
                type: 'info',
                icon: '⚖️',
                message: `${roleWithMostGoals.name} has the most goals (${roleWithMostGoals.totalGoals}). Consider balancing workload across roles.`
            });
        }
    }
    
    return insights;
}

function updateReviewUI(analytics) {
    const overallRate = analytics.totalGoals > 0 ? 
        Math.round((analytics.completedGoals / analytics.totalGoals) * 100) : 0;
    
    // Update overall stats
    document.getElementById('overallPercentage').textContent = `${overallRate}%`;
    document.getElementById('overallStats').textContent = 
        `${analytics.completedGoals} of ${analytics.totalGoals} goals completed`;
    
    // Update breakdown
    document.getElementById('completedCount').textContent = analytics.completedGoals;
    document.getElementById('inProgressCount').textContent = analytics.inProgressGoals;
    document.getElementById('totalGoalsCount').textContent = analytics.totalGoals;
    
    // Update progress circle color based on completion rate
    const progressCircle = document.querySelector('.progress-circle');
    progressCircle.className = 'progress-circle';
    if (overallRate >= 80) progressCircle.classList.add('excellent');
    else if (overallRate >= 60) progressCircle.classList.add('good');
    else if (overallRate >= 40) progressCircle.classList.add('average');
    else progressCircle.classList.add('needs-attention');
    
    // Update role performance list
    const rolePerformanceList = document.getElementById('rolePerformanceList');
    rolePerformanceList.innerHTML = '';
    
    const sortedRoles = [...analytics.roles].sort((a, b) => b.completionRate - a.completionRate);
    
    sortedRoles.forEach(role => {
        const roleItem = document.createElement('div');
        roleItem.className = 'role-performance-item';
        
        let statusIcon = '';
        let statusClass = '';
        if (role.completionRate >= 80) {
            statusIcon = '🏆';
            statusClass = 'excellent';
        } else if (role.completionRate >= 60) {
            statusIcon = '👍';
            statusClass = 'good';
        } else if (role.completionRate >= 40) {
            statusIcon = '⚡';
            statusClass = 'average';
        } else {
            statusIcon = '🎯';
            statusClass = 'needs-attention';
        }
        
        roleItem.innerHTML = `
            <div class="role-header">
                <span class="role-name" style="background-color: ${role.color}">${role.name}</span>
                <span class="role-status ${statusClass}">${statusIcon} ${role.completionRate}%</span>
            </div>
            <div class="role-details">
                <div class="progress-bar">
                    <div class="progress-fill ${statusClass}" style="width: ${role.completionRate}%"></div>
                </div>
                <span class="goal-count">${role.completedGoals}/${role.totalGoals} goals</span>
            </div>
        `;
        
        rolePerformanceList.appendChild(roleItem);
    });
    
    // Update insights
    const insightsList = document.getElementById('insightsList');
    insightsList.innerHTML = '';
    
    analytics.insights.forEach(insight => {
        const insightItem = document.createElement('div');
        insightItem.className = `insight-item ${insight.type}`;
        insightItem.innerHTML = `
            <span class="insight-icon">${insight.icon}</span>
            <span class="insight-message">${insight.message}</span>
        `;
        insightsList.appendChild(insightItem);
    });
}

// Global variable to store current review data
let currentReviewData = null;

function generateWeekReview() {
    console.log('🔍 Analyzing week data for review');
    
    const analytics = analyzeWeekData();
    updateReviewUI(analytics);
    
    // Store the review data globally so it can be saved
    currentReviewData = {
        weekKey: getWeekKey(currentWeekStart),
        weekStart: currentWeekStart.toISOString(),
        timestamp: new Date().toISOString(),
        analytics: {
            totalGoals: analytics.totalGoals,
            completedGoals: analytics.completedGoals,
            inProgressGoals: analytics.inProgressGoals,
            completionRate: analytics.totalGoals > 0 ? Math.round((analytics.completedGoals / analytics.totalGoals) * 100) : 0,
            rolePerformance: analytics.roles.map(role => ({
                name: role.name,
                color: role.color,
                totalGoals: role.totalGoals,
                completedGoals: role.completedGoals,
                completionRate: role.completionRate,
                status: getPerformanceStatus(role.completionRate)
            })),
            insights: analytics.insights
        }
    };
    
    // Check if review already exists
    checkExistingReview();
}

function getPerformanceStatus(completionRate) {
    if (completionRate >= 80) return 'excellent';
    if (completionRate >= 60) return 'good';
    if (completionRate >= 40) return 'average';
    return 'needs-attention';
}

async function checkExistingReview() {
    if (!currentReviewData) return;
    
    const statusDiv = document.getElementById('reviewStatus');
    statusDiv.innerHTML = '<span class="checking">🔍 Checking for existing review...</span>';
    
    try {
        if (isFirebaseReady && window.FirebaseService) {
            const existingReview = await window.FirebaseService.loadWeeklyReview(currentReviewData.weekKey);
            if (existingReview) {
                statusDiv.innerHTML = `
                    <span class="exists">📝 Review saved on ${new Date(existingReview.timestamp).toLocaleDateString()}</span>
                `;
                document.getElementById('saveReview').textContent = '🔄 Update Review';
            } else {
                statusDiv.innerHTML = '<span class="new">✨ New review ready to save</span>';
                document.getElementById('saveReview').textContent = '💾 Save Review';
            }
        } else {
            // Check localStorage
            const saved = localStorage.getItem(`weeklyReview-${currentReviewData.weekKey}`);
            if (saved) {
                const existingReview = JSON.parse(saved);
                statusDiv.innerHTML = `
                    <span class="exists">📝 Review saved locally on ${new Date(existingReview.timestamp).toLocaleDateString()}</span>
                `;
                document.getElementById('saveReview').textContent = '🔄 Update Review';
            } else {
                statusDiv.innerHTML = '<span class="new">✨ New review ready to save</span>';
                document.getElementById('saveReview').textContent = '💾 Save Review';
            }
        }
    } catch (error) {
        console.error('Error checking existing review:', error);
        statusDiv.innerHTML = '<span class="error">⚠️ Could not check existing review</span>';
    }
}

async function saveCurrentReview() {
    if (!currentReviewData) {
        showNotification('⚠️ No Review Data', 'Please generate a review first', 'warning');
        return;
    }
    
    const saveButton = document.getElementById('saveReview');
    const statusDiv = document.getElementById('reviewStatus');
    
    // Update UI to show saving state
    saveButton.disabled = true;
    saveButton.textContent = '💾 Saving...';
    statusDiv.innerHTML = '<span class="saving">💾 Saving review...</span>';
    
    try {
        let success = false;
        
        if (isFirebaseReady && window.FirebaseService) {
            success = await window.FirebaseService.saveWeeklyReview(currentReviewData.weekKey, currentReviewData);
            if (success) {
                statusDiv.innerHTML = `
                    <span class="success">✅ Review saved to Firebase at ${new Date().toLocaleTimeString()}</span>
                `;
                showNotification('✅ Review Saved', 'Your weekly review has been saved to Firebase', 'success');
            } else {
                statusDiv.innerHTML = `
                    <span class="fallback">📦 Review saved locally (Firebase unavailable)</span>
                `;
                showNotification('📦 Review Saved Locally', 'Saved to local storage - will sync when online', 'info');
            }
        } else {
            // Save to localStorage only
            localStorage.setItem(`weeklyReview-${currentReviewData.weekKey}`, JSON.stringify(currentReviewData));
            statusDiv.innerHTML = `
                <span class="local">📦 Review saved locally at ${new Date().toLocaleTimeString()}</span>
            `;
            showNotification('📦 Review Saved', 'Your weekly review has been saved locally', 'success');
            success = true;
        }
        
        if (success) {
            saveButton.textContent = '✅ Saved';
            setTimeout(() => {
                saveButton.textContent = '🔄 Update Review';
                saveButton.disabled = false;
            }, 2000);
        }
        
    } catch (error) {
        console.error('Error saving review:', error);
        statusDiv.innerHTML = '<span class="error">❌ Failed to save review</span>';
        showNotification('❌ Save Failed', 'Could not save review. Please try again.', 'error');
        
        saveButton.textContent = '💾 Save Review';
        saveButton.disabled = false;
    }
}

async function showReviewHistory() {
    const statusDiv = document.getElementById('reviewStatus');
    statusDiv.innerHTML = '<span class="loading">📚 Loading review history...</span>';
    
    try {
        let reviews = [];
        
        if (isFirebaseReady && window.FirebaseService) {
            reviews = await window.FirebaseService.getAllWeeklyReviews();
        } else {
            // Load from localStorage
            const keys = Object.keys(localStorage);
            const reviewKeys = keys.filter(key => key.startsWith('weeklyReview-'));
            
            reviewKeys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    reviews.push(JSON.parse(data));
                }
            });
            
            reviews.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
        }
        
        if (reviews.length === 0) {
            statusDiv.innerHTML = '<span class="empty">📝 No saved reviews found</span>';
            showNotification('📝 No History', 'No saved reviews found. Save this review to start building your history!', 'info');
            return;
        }
        
        // Display history summary
        const avgCompletion = Math.round(reviews.reduce((sum, review) => 
            sum + review.analytics.completionRate, 0) / reviews.length);
        
        statusDiv.innerHTML = `
            <div class="history-summary">
                <span class="history-stats">📚 ${reviews.length} saved reviews</span>
                <span class="avg-completion">📈 ${avgCompletion}% average completion</span>
            </div>
        `;
        
        // Show detailed history in notification
        const historyText = reviews.slice(0, 5).map(review => {
            const date = new Date(review.weekStart).toLocaleDateString();
            return `${date}: ${review.analytics.completionRate}%`;
        }).join('\n');
        
        showNotification('📚 Review History', 
            `Recent reviews:\n${historyText}${reviews.length > 5 ? '\n...and more' : ''}`, 'info');
        
    } catch (error) {
        console.error('Error loading review history:', error);
        statusDiv.innerHTML = '<span class="error">❌ Failed to load history</span>';
        showNotification('❌ Load Failed', 'Could not load review history', 'error');
    }
}