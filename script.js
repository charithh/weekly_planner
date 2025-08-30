document.addEventListener('DOMContentLoaded', function() {
    // Initialize the planner
    initializePlanner();
    
    // Set up event listeners
    setupEventListeners();
    
    // Update week header with current date
    updateWeekHeader();
});

function initializePlanner() {
    // Auto-save functionality
    const goalCells = document.querySelectorAll('.goal-cell');
    goalCells.forEach(cell => {
        cell.addEventListener('input', saveToLocalStorage);
        cell.addEventListener('blur', saveToLocalStorage);
    });
    
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
    newRow.appendChild(roleCell);
    
    // Create goal cells
    for (let i = 0; i < goalColumnsCount; i++) {
        const goalCell = document.createElement('td');
        goalCell.className = 'goal-cell';
        goalCell.contentEditable = true;
        goalCell.addEventListener('input', saveToLocalStorage);
        goalCell.addEventListener('blur', saveToLocalStorage);
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
        newCell.addEventListener('input', saveToLocalStorage);
        newCell.addEventListener('blur', saveToLocalStorage);
        row.appendChild(newCell);
    });
    
    // Update sharpen section
    const sharpenRow = document.querySelector('.sharpen-section tbody tr');
    if (sharpenRow) {
        const sharpenCell = document.createElement('td');
        sharpenCell.className = 'goal-cell';
        sharpenCell.contentEditable = true;
        sharpenCell.addEventListener('input', saveToLocalStorage);
        sharpenCell.addEventListener('blur', saveToLocalStorage);
        sharpenRow.appendChild(sharpenCell);
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

function updateWeekHeader() {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    
    const options = { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    const sundayFormatted = sunday.toLocaleDateString('en-US', options);
    const headerText = `WEEK OF: ${sundayFormatted}`;
    
    document.getElementById('weekHeader').textContent = headerText;
}

function saveToLocalStorage() {
    const plannerData = {
        roles: [],
        sharpenData: [],
        goalColumnsCount: document.querySelector('thead tr').children.length - 1
    };
    
    // Save main planner data
    const rows = document.querySelectorAll('#plannerBody .role-row');
    rows.forEach(row => {
        const roleCell = row.querySelector('.role-cell');
        const goalCells = row.querySelectorAll('.goal-cell');
        
        const roleData = {
            name: roleCell.textContent.trim(),
            color: roleCell.style.backgroundColor || '',
            goals: Array.from(goalCells).map(cell => cell.textContent.trim())
        };
        
        plannerData.roles.push(roleData);
    });
    
    // Save sharpen the saw data
    const sharpenRow = document.querySelector('.sharpen-section tbody tr');
    if (sharpenRow) {
        const sharpenCells = sharpenRow.querySelectorAll('.goal-cell');
        plannerData.sharpenData = Array.from(sharpenCells).map(cell => cell.textContent.trim());
    }
    
    localStorage.setItem('weeklyPlanner', JSON.stringify(plannerData));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('weeklyPlanner');
    if (!saved) return;
    
    try {
        const plannerData = JSON.parse(saved);
        
        // Load goals for existing roles
        const rows = document.querySelectorAll('#plannerBody .role-row');
        rows.forEach((row, index) => {
            if (plannerData.roles[index]) {
                const goalCells = row.querySelectorAll('.goal-cell');
                goalCells.forEach((cell, goalIndex) => {
                    if (plannerData.roles[index].goals[goalIndex]) {
                        cell.textContent = plannerData.roles[index].goals[goalIndex];
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
                    cell.textContent = plannerData.sharpenData[index];
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading saved data:', error);
    }
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
});