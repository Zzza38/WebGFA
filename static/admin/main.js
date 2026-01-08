// Global variables
let currentUser = null;
let allUsers = [];
let allMessages = [];
let filteredUsers = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await init();
});

async function init() {
    // Fetch current user for display
    currentUser = await fetchCurrentUser();

    // Show username
    document.getElementById('admin-username').textContent = `Logged in as: ${currentUser || 'Unknown'}`;

    // Setup event listeners
    setupTabs();
    setupModals();
    setupUserManagement();
    setupMessageModeration();
    setupSystem();

    // Load initial data
    await loadUsers();
}

// Fetch current user
async function fetchCurrentUser() {
    try {
        const response = await fetch('/api/get-user');
        if (!response.ok) return null;

        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

// Tab switching
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tabName) {
    // Hide all panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected panel
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Activate selected button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Load data for the tab
    if (tabName === 'messages') loadMessages();
    if (tabName === 'stats') loadGameStats();
}

// Modal management
function setupModals() {
    // Close modal when clicking outside or on cancel button
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            closeModal(modal.id);
        });
    });

    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ===== USER MANAGEMENT =====

function setupUserManagement() {
    // Search functionality
    document.getElementById('user-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filteredUsers = allUsers.filter(u =>
            u.username.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query) ||
            u.permissions.toLowerCase().includes(query)
        );
        renderUsersTable(filteredUsers);
    });

    // Create user button
    document.getElementById('create-user-btn').addEventListener('click', () => {
        document.getElementById('create-user-form').reset();
        openModal('create-user-modal');
    });

    // Create user form submit
    document.getElementById('create-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createUser();
    });

    // Edit user form submit
    document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateUser();
    });

    // Manage coins form submit
    document.getElementById('manage-coins-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateCoins();
    });
}

async function loadUsers() {
    try {
        const response = await fetch('/api/admin-get-users');
        if (!response.ok) throw new Error('Failed to load users');

        const data = await response.json();
        allUsers = data.users;
        filteredUsers = allUsers;
        renderUsersTable(filteredUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users');
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-tbody');

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${escapeHtml(user.username)}</strong></td>
            <td>
                <div class="password-container">
                    <span class="password-text" data-password="${escapeHtml(user.password)}">••••••••</span>
                    <button class="password-toggle" title="Show/Hide Password">
                        <svg class="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </div>
            </td>
            <td>${renderPermissionBadge(user.permissions)}</td>
            <td>${user.coins}</td>
            <td>${escapeHtml(user.email) || '<span style="color: #666;">N/A</span>'}</td>
            <td>${user.creationDate ? formatDate(user.creationDate) : 'N/A'}</td>
            <td>
                <button class="small-btn edit-user-btn" data-username="${escapeHtml(user.username)}">Edit</button>
                <button class="small-btn coins-btn" data-username="${escapeHtml(user.username)}">Coins</button>
                <button class="danger-btn delete-user-btn" data-username="${escapeHtml(user.username)}">Delete</button>
            </td>
        </tr>
    `).join('');

    // Event delegation - attach listeners after rendering
    attachUserTableListeners();
}

function attachUserTableListeners() {
    const tbody = document.getElementById('users-tbody');

    // Remove old listeners by cloning and replacing (simple approach)
    const newTbody = tbody.cloneNode(true);
    tbody.parentNode.replaceChild(newTbody, tbody);

    // Attach new listeners with event delegation
    newTbody.addEventListener('click', (e) => {
        const target = e.target;
        const username = target.dataset.username;

        // Handle password toggle
        if (target.classList.contains('password-toggle') || target.closest('.password-toggle')) {
            const button = target.closest('.password-toggle') || target;
            const container = button.closest('.password-container');
            const passwordText = container.querySelector('.password-text');
            const actualPassword = passwordText.dataset.password;

            if (passwordText.textContent === '••••••••') {
                passwordText.textContent = actualPassword;
            } else {
                passwordText.textContent = '••••••••';
            }
            return;
        }

        if (!username) return;

        if (target.classList.contains('edit-user-btn')) {
            openEditUserModal(username);
        } else if (target.classList.contains('coins-btn')) {
            openCoinsModal(username);
        } else if (target.classList.contains('delete-user-btn')) {
            deleteUser(username);
        }
    });
}

function renderPermissionBadge(permissions) {
    if (!permissions) return '<span class="badge badge-regular">Regular</span>';

    const badges = [];
    if (permissions.includes('admin')) badges.push('<span class="badge badge-admin">Admin</span>');
    if (permissions.includes('prem')) badges.push('<span class="badge badge-prem">Premium</span>');

    return badges.length > 0 ? badges.join(' ') : '<span class="badge badge-regular">Regular</span>';
}

async function createUser() {
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value;
    const email = document.getElementById('new-email').value.trim();
    const permissions = document.getElementById('new-permissions').value;
    const coins = parseInt(document.getElementById('new-coins').value) || 100;

    try {
        const response = await fetch('/api/admin-create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email, permissions, coins })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create user');
        }

        closeModal('create-user-modal');
        await loadUsers();
        showSuccess(`User "${username}" created successfully!`);
    } catch (error) {
        console.error('Error creating user:', error);
        showError(error.message);
    }
}

function openEditUserModal(username) {
    const user = allUsers.find(u => u.username === username);
    if (!user) return;

    document.getElementById('edit-username').value = username;
    document.getElementById('edit-username-display').textContent = username;
    document.getElementById('edit-permissions').value = user.permissions;
    document.getElementById('edit-password').value = '';
    document.getElementById('current-coins-display').textContent = user.coins;

    openModal('edit-user-modal');
}

async function updateUser() {
    const username = document.getElementById('edit-username').value;
    const permissions = document.getElementById('edit-permissions').value;
    const newPassword = document.getElementById('edit-password').value;

    try {
        // Update permissions
        await fetch('/api/admin-update-permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, permissions })
        });

        // Update password if provided
        if (newPassword) {
            await fetch('/api/admin-reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, newPassword })
            });
        }

        closeModal('edit-user-modal');
        await loadUsers();
        showSuccess(`User "${username}" updated successfully!`);
    } catch (error) {
        console.error('Error updating user:', error);
        showError('Failed to update user');
    }
}

function openCoinsModal(username) {
    const user = allUsers.find(u => u.username === username);
    if (!user) return;

    document.getElementById('coins-username').value = username;
    document.getElementById('coins-username-display').textContent = username;
    document.getElementById('coins-balance-display').textContent = user.coins;
    document.getElementById('coins-amount').value = '';
    document.getElementById('coins-reason').value = '';

    openModal('manage-coins-modal');
}

async function updateCoins() {
    const targetUser = document.getElementById('coins-username').value;
    const amount = parseInt(document.getElementById('coins-amount').value);
    const reason = document.getElementById('coins-reason').value || 'Admin adjustment';

    try {
        const response = await fetch('/api/add-coins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUser, amount, reason })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update coins');
        }

        closeModal('manage-coins-modal');
        await loadUsers();
        showSuccess(`Coins updated for "${targetUser}"!`);
    } catch (error) {
        console.error('Error updating coins:', error);
        showError(error.message);
    }
}

async function deleteUser(username) {
    if (username === currentUser) {
        showError('You cannot delete yourself!');
        return;
    }

    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch('/api/admin-delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete user');
        }

        await loadUsers();
        showSuccess(`User "${username}" deleted successfully!`);
    } catch (error) {
        console.error('Error deleting user:', error);
        showError(error.message);
    }
}

// ===== MESSAGE MODERATION =====

function setupMessageModeration() {
    document.getElementById('refresh-messages-btn').addEventListener('click', loadMessages);

    document.getElementById('edit-message-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEditedMessage();
    });
}

async function loadMessages() {
    try {
        const response = await fetch('/api/admin-get-all-messages');
        if (!response.ok) throw new Error('Failed to load messages');

        const data = await response.json();
        allMessages = data.messages;
        renderMessages(allMessages);
    } catch (error) {
        console.error('Error loading messages:', error);
        showError('Failed to load messages');
    }
}

function renderMessages(messages) {
    const container = document.getElementById('messages-container');

    if (messages.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #888;">No messages found</p>';
        return;
    }

    container.innerHTML = messages.map(msg => `
        <div class="message-card">
            <div class="message-header">
                <strong>${escapeHtml(msg.user)}</strong>
                <span class="message-time">${formatDate(msg.timestamp)}</span>
                ${msg.edited ? '<span class="badge badge-prem">Edited</span>' : ''}
            </div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
            <div class="message-actions">
                <button class="small-btn" onclick="openEditMessageModal(${msg.id})">Edit</button>
                <button class="danger-btn" onclick="deleteMessage(${msg.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function openEditMessageModal(messageId) {
    const message = allMessages.find(m => m.id === messageId);
    if (!message) return;

    document.getElementById('edit-message-id').value = messageId;
    document.getElementById('edit-message-content').value = message.content;

    openModal('edit-message-modal');
}

async function saveEditedMessage() {
    const id = parseInt(document.getElementById('edit-message-id').value);
    const content = document.getElementById('edit-message-content').value;

    try {
        const response = await fetch('/api/admin-edit-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, content })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to edit message');
        }

        closeModal('edit-message-modal');
        await loadMessages();
        showSuccess('Message updated successfully!');
    } catch (error) {
        console.error('Error editing message:', error);
        showError(error.message);
    }
}

async function deleteMessage(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) {
        return;
    }

    try {
        const response = await fetch('/api/admin-delete-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: messageId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete message');
        }

        await loadMessages();
        showSuccess('Message deleted successfully!');
    } catch (error) {
        console.error('Error deleting message:', error);
        showError(error.message);
    }
}

// ===== GAME STATS =====

async function loadGameStats() {
    try {
        const response = await fetch('/api/admin-get-game-stats');
        if (!response.ok) throw new Error('Failed to load stats');

        const data = await response.json();
        renderGameStats(data.stats, data.lastUpdated);
    } catch (error) {
        console.error('Error loading stats:', error);
        showError('Failed to load game statistics');
    }
}

function renderGameStats(stats, lastUpdated) {
    const tbody = document.getElementById('stats-tbody');

    const statsList = Object.entries(stats)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.allTime - a.allTime);

    if (statsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No statistics available</td></tr>';
        return;
    }

    tbody.innerHTML = statsList.map(game => `
        <tr>
            <td><strong>${escapeHtml(game.name)}</strong></td>
            <td>${game.allTime || 0}</td>
            <td>${game.monthly || 0}</td>
            <td>${game.weekly || 0}</td>
            <td>${game.premium ? '<span class="badge badge-prem">Premium</span>' : '<span class="badge badge-regular">Free</span>'}</td>
        </tr>
    `).join('');
}

// ===== SYSTEM TOOLS =====

function setupSystem() {
    document.getElementById('export-db-btn').addEventListener('click', exportDatabase);
    document.getElementById('download-logs-btn').addEventListener('click', downloadLogs);
}

async function exportDatabase() {
    try {
        const response = await fetch('/api/admin-export-database');
        if (!response.ok) throw new Error('Failed to export database');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showSuccess('Database exported successfully!');
    } catch (error) {
        console.error('Error exporting database:', error);
        showError('Failed to export database');
    }
}

function downloadLogs() {
    window.location.href = '/api/getCSV';
}

// ===== UTILITY FUNCTIONS =====

function formatDate(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function showSuccess(message) {
    alert(message); // Simple alert for now - can be replaced with toast notifications
}

function showError(message) {
    alert('Error: ' + message);
}
