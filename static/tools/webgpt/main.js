let currentMode = 'answer';
let coinBalance = 0;
let uploadedFiles = [];
let currentUser = null;
let messageIdCounter = 0;

// Multi-chat state
let chats = {};
let activeChatId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await fetchCurrentUser();

    // Load saved settings
    loadSettings();

    // Check if user is guest and show popup
    if (currentUser === 'guest') {
        document.getElementById('send-btn').disabled = true;
        document.getElementById('user-input').disabled = true;
        document.getElementById('guestPopup').style.display = '';
        document.getElementById('guestPopup').addEventListener('click', () => {
            document.getElementById('guestPopup').style.display = 'none';
        });

        // Also disable all mode buttons, file uploads, and settings
        document.querySelectorAll('.mode-btn').forEach(btn => btn.disabled = true);
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.disabled = true;
        document.getElementById('personality-select').disabled = true;
        document.getElementById('length-select').disabled = true;
    } else {
        loadCoinBalance();
        setupEventListeners();
        // Load all chats for non-guest users
        loadAllChats();
    }
});

// ===== UTILITY FUNCTIONS =====

// UUID generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Auto-generate chat name from first message (max 30 chars)
function generateChatName(firstMessage) {
    if (!firstMessage || typeof firstMessage !== 'string') {
        return 'New Chat';
    }

    // Clean and truncate
    let name = firstMessage
        .trim()
        .replace(/\s+/g, ' ') // Collapse whitespace
        .slice(0, 30);

    // Add ellipsis if truncated
    if (firstMessage.length > 30) {
        name += '...';
    }

    return name || 'New Chat';
}

// Format relative time (e.g., "2 hours ago")
function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
        return new Date(timestamp).toLocaleDateString();
    } else if (days > 0) {
        return `${days}d ago`;
    } else if (hours > 0) {
        return `${hours}h ago`;
    } else if (minutes > 0) {
        return `${minutes}m ago`;
    } else {
        return 'Just now';
    }
}

// HTML escape helper
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function loadSettings() {
    // Load mode
    const savedMode = localStorage.getItem('webgpt-mode');
    if (savedMode) {
        currentMode = savedMode;
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === savedMode) {
                btn.classList.add('active');
            }
        });

        // Show/hide study form based on saved mode
        const studyForm = document.getElementById('study-mode-form');
        if (savedMode === 'study') {
            studyForm.classList.remove('hidden');
        }
    }

    // Load personality
    const savedPersonality = localStorage.getItem('webgpt-personality');
    if (savedPersonality) {
        document.getElementById('personality-select').value = savedPersonality;
    }

    // Load length
    const savedLength = localStorage.getItem('webgpt-length');
    if (savedLength) {
        document.getElementById('length-select').value = savedLength;
    }
}

function saveSettings() {
    localStorage.setItem('webgpt-mode', currentMode);
    localStorage.setItem('webgpt-personality', document.getElementById('personality-select').value);
    localStorage.setItem('webgpt-length', document.getElementById('length-select').value);
}

// ===== CHAT MANAGEMENT FUNCTIONS =====

// Load all chats from localStorage
function loadAllChats() {
    try {
        const chatsData = localStorage.getItem('webgpt-chats');
        const activeChatData = localStorage.getItem('webgpt-active-chat');

        if (chatsData) {
            chats = JSON.parse(chatsData);
        } else {
            chats = {};
        }

        // Set active chat or create new one if none exists
        if (activeChatData && chats[activeChatData]) {
            activeChatId = activeChatData;
        } else if (Object.keys(chats).length > 0) {
            // Default to first chat if active chat is invalid
            activeChatId = Object.keys(chats)[0];
        } else {
            // No chats exist - create first chat
            createNewChat();
            return;
        }

        // Load active chat
        renderChatList();
        switchToChat(activeChatId);

    } catch (error) {
        console.error('Error loading chats:', error);
        // Create fresh chat on error
        chats = {};
        createNewChat();
    }
}

// Save chats to localStorage
function saveChats() {
    try {
        // Check storage size before saving
        const chatsStr = JSON.stringify(chats);
        const sizeKB = new Blob([chatsStr]).size / 1024;

        if (sizeKB > 4096) { // ~4MB warning threshold
            console.warn(`Chat storage is large: ${sizeKB.toFixed(1)}KB. Consider deleting old chats.`);
        }

        localStorage.setItem('webgpt-chats', chatsStr);
        localStorage.setItem('webgpt-active-chat', activeChatId);
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            alert('Chat storage is full! Please delete some old chats to continue.');
            console.error('localStorage quota exceeded:', error);
        } else {
            console.error('Error saving chats:', error);
        }
    }
}

// Create new chat
function createNewChat() {
    const chatId = generateUUID();
    const timestamp = Date.now();

    const newChat = {
        id: chatId,
        name: 'New Chat',
        created: timestamp,
        lastModified: timestamp,
        messages: []
    };

    chats[chatId] = newChat;
    activeChatId = chatId;

    saveChats();
    renderChatList();
    switchToChat(chatId);
}

// Switch to a different chat
function switchToChat(chatId) {
    if (!chats[chatId]) {
        console.error('Chat not found:', chatId);
        return;
    }

    activeChatId = chatId;
    localStorage.setItem('webgpt-active-chat', chatId);

    // Clear current chat display
    const container = document.getElementById('chat-container');
    container.innerHTML = '';

    // Load messages from chat
    const chat = chats[chatId];
    chat.messages.forEach(msg => {
        renderMessage(msg);
    });

    // Update UI
    document.getElementById('chat-title').textContent = chat.name;
    renderChatList(); // Re-render to update active state
    container.scrollTop = container.scrollHeight;
}

// Render a single message to the DOM
function renderMessage(msg) {
    const container = document.getElementById('chat-container');
    const messageDiv = document.createElement('div');
    messageDiv.id = msg.id;
    messageDiv.className = `message ${msg.type}`;

    if (msg.type === 'info') {
        messageDiv.style.whiteSpace = 'pre-line';
    }

    messageDiv.textContent = msg.content;
    container.appendChild(messageDiv);
}

// Delete a chat
function deleteChat(chatId) {
    if (!chats[chatId]) return;

    const chatName = chats[chatId].name;

    if (!confirm(`Delete chat "${chatName}"? This cannot be undone.`)) {
        return;
    }

    delete chats[chatId];

    // If deleting active chat, switch to another or create new
    if (chatId === activeChatId) {
        const remainingChats = Object.keys(chats);
        if (remainingChats.length > 0) {
            switchToChat(remainingChats[0]);
        } else {
            createNewChat();
            return;
        }
    }

    saveChats();
    renderChatList();
}

// Rename chat
function renameChat(chatId, newName) {
    if (!chats[chatId]) return;

    const trimmedName = newName.trim();
    if (!trimmedName) {
        alert('Chat name cannot be empty');
        return;
    }

    chats[chatId].name = trimmedName;
    chats[chatId].lastModified = Date.now();

    if (chatId === activeChatId) {
        document.getElementById('chat-title').textContent = trimmedName;
    }

    saveChats();
    renderChatList();
}

// Render the chat list in sidebar
function renderChatList() {
    const chatListDiv = document.getElementById('chat-list');

    const chatArray = Object.values(chats).sort((a, b) =>
        b.lastModified - a.lastModified // Most recent first
    );

    if (chatArray.length === 0) {
        chatListDiv.innerHTML = `
            <div class="chat-list-empty">
                No chats yet.<br>Click + to create one!
            </div>
        `;
        return;
    }

    chatListDiv.innerHTML = '';

    chatArray.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        if (chat.id === activeChatId) {
            chatItem.classList.add('active');
        }

        // Get last message preview
        const lastMsg = chat.messages[chat.messages.length - 1];
        const preview = lastMsg
            ? `${lastMsg.type === 'user' ? 'You: ' : ''}${lastMsg.content.slice(0, 40)}${lastMsg.content.length > 40 ? '...' : ''}`
            : 'No messages yet';

        // Format time
        const timeStr = formatRelativeTime(chat.lastModified);

        chatItem.innerHTML = `
            <div class="chat-item-name">${escapeHtml(chat.name)}</div>
            <div class="chat-item-preview">${escapeHtml(preview)}</div>
            <div class="chat-item-time">${timeStr}</div>
        `;

        chatItem.addEventListener('click', () => {
            switchToChat(chat.id);
            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });

        chatListDiv.appendChild(chatItem);
    });
}

function closeSidebar() {
    document.getElementById('chat-sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

function setupEventListeners() {
    // NEW: New chat button
    document.getElementById('new-chat-btn').addEventListener('click', () => {
        createNewChat();
    });

    // NEW: Delete chat button
    document.getElementById('delete-chat-btn').addEventListener('click', () => {
        if (activeChatId) {
            deleteChat(activeChatId);
        }
    });

    // NEW: Rename chat button
    document.getElementById('rename-chat-btn').addEventListener('click', () => {
        if (!activeChatId) return;

        const currentName = chats[activeChatId].name;
        const newName = prompt('Enter new chat name:', currentName);

        if (newName !== null) {
            renameChat(activeChatId, newName);
        }
    });

    // NEW: Sidebar toggle (mobile)
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('chat-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        closeSidebar();
    });

    // NEW: Cross-tab sync
    window.addEventListener('storage', (e) => {
        if (e.key === 'webgpt-chats' || e.key === 'webgpt-active-chat') {
            console.log('Chats updated in another tab, reloading...');
            loadAllChats();
        }
    });

    // Mode switching
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;

            // Show/hide study form
            const studyForm = document.getElementById('study-mode-form');
            if (currentMode === 'study') {
                studyForm.classList.remove('hidden');
            } else {
                studyForm.classList.add('hidden');
                // Clear files when leaving study mode
                uploadedFiles = [];
                updateFileList();
            }

            // Save settings
            saveSettings();
        });
    });

    // Save settings when personality or length changes
    document.getElementById('personality-select').addEventListener('change', saveSettings);
    document.getElementById('length-select').addEventListener('change', saveSettings);

    // File upload handling
    const fileInput = document.getElementById('file-input');
    const fileLabel = document.querySelector('.file-upload-label');

    fileLabel.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFileSelection(e.target.files);
        // Reset input so same file can be selected again if removed
        e.target.value = '';
    });

    // Send button
    document.getElementById('send-btn').addEventListener('click', sendMessage);

    // Enter key to send
    document.getElementById('user-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

function handleFileSelection(files) {
    const maxFiles = 10;
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];

    for (const file of files) {
        // Check file count
        if (uploadedFiles.length >= maxFiles) {
            addMessageToChat('error', `Maximum ${maxFiles} files allowed`);
            break;
        }

        // Check file size
        if (file.size > maxFileSize) {
            addMessageToChat('error', `File "${file.name}" exceeds 5MB limit`);
            continue;
        }

        // Check file type
        if (!allowedTypes.includes(file.type)) {
            addMessageToChat('error', `File "${file.name}" has invalid type. Only PDF and images allowed.`);
            continue;
        }

        // Add to uploaded files
        uploadedFiles.push(file);
    }

    updateFileList();
}

function updateFileList() {
    const fileListDiv = document.getElementById('file-list');
    fileListDiv.innerHTML = '';

    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';

        const fileName = document.createElement('span');
        fileName.className = 'file-item-name';
        fileName.textContent = file.name;

        const fileSize = document.createElement('span');
        fileSize.className = 'file-item-size';
        fileSize.textContent = formatFileSize(file.size);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'file-item-remove';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            uploadedFiles.splice(index, 1);
            updateFileList();
        });

        fileItem.appendChild(fileName);
        fileItem.appendChild(fileSize);
        fileItem.appendChild(removeBtn);
        fileListDiv.appendChild(fileItem);
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function loadCoinBalance() {
    try {
        const response = await fetch('/api/get-coins');
        if (!response.ok) throw new Error('Failed to load coins');

        const data = await response.json();
        coinBalance = data.balance;
        document.getElementById('coin-balance').textContent = coinBalance.toFixed(2);
    } catch (error) {
        console.error('Error loading coins:', error);
        document.getElementById('coin-balance').textContent = 'Error';
    }
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();

    if (!message) return;

    // Get personality and length settings
    const personality = document.getElementById('personality-select').value;
    const length = document.getElementById('length-select').value;

    // Build request based on mode
    let requestData;
    let isFormData = false;

    if (currentMode === 'study') {
        // Study mode with potential files
        const subject = document.getElementById('subject').value;
        const questioningStyle = document.getElementById('questioning-style').value;

        if (uploadedFiles.length > 0) {
            // Use FormData for file upload
            isFormData = true;
            requestData = new FormData();
            requestData.append('mode', currentMode);
            requestData.append('message', message);
            requestData.append('personality', personality);
            requestData.append('length', length);
            requestData.append('context', JSON.stringify({
                subject: subject,
                questioningStyle: questioningStyle
            }));

            // Append files
            uploadedFiles.forEach(file => {
                requestData.append('files', file);
            });
        } else {
            // No files, use JSON
            requestData = {
                mode: currentMode,
                message: message,
                personality: personality,
                length: length,
                context: {
                    subject: subject,
                    questioningStyle: questioningStyle
                }
            };
        }
    } else {
        // Other modes - simple JSON
        requestData = {
            mode: currentMode,
            message: message,
            personality: personality,
            length: length
        };
    }

    // Display user message
    addMessageToChat('user', message);
    input.value = '';

    // Show loading
    const loadingId = addMessageToChat('assistant', 'Thinking...');

    try {
        const fetchOptions = {
            method: 'POST',
            body: isFormData ? requestData : JSON.stringify(requestData)
        };

        if (!isFormData) {
            fetchOptions.headers = { 'Content-Type': 'application/json' };
        }

        const response = await fetch('/api/webgpt', fetchOptions);
        const data = await response.json();

        // Remove loading message
        document.getElementById(loadingId).remove();

        if (!response.ok) {
            addMessageToChat('error', data.error || 'Request failed');
            return;
        }

        // Display AI response
        addMessageToChat('assistant', data.response);

        // Update coin display
        coinBalance = data.remainingCoins;
        document.getElementById('coin-balance').textContent = coinBalance.toFixed(2);

        // Show detailed billing info only if toggle is checked
        const showBilling = document.getElementById('show-billing-toggle').checked;
        if (showBilling) {
            const billing = data.billing;
            let billingMsg = `Tokens: ${billing.inputTokens} in / ${billing.outputTokens} out = ${billing.totalTokens} total\n` +
                             `Cost: $${billing.totalCostUSD} USD (${billing.coinCost} coins)\n` +
                             `Remaining: ${data.remainingCoins.toFixed(2)} coins`;

            if (data.filesProcessed > 0) {
                billingMsg += `\nFiles processed: ${data.filesProcessed}`;
            }

            addMessageToChat('info', billingMsg);
        }

        // Clear files after successful study mode request
        if (currentMode === 'study') {
            uploadedFiles = [];
            updateFileList();
        }

    } catch (error) {
        document.getElementById(loadingId).remove();
        addMessageToChat('error', 'Network error. Please try again.');
        console.error('Error:', error);
    }
}

function addMessageToChat(type, content) {
    const timestamp = Date.now();
    const messageId = generateUUID();

    const message = {
        id: messageId,
        type: type,
        content: content,
        timestamp: timestamp
    };

    // Add to current chat
    if (activeChatId && chats[activeChatId]) {
        chats[activeChatId].messages.push(message);
        chats[activeChatId].lastModified = timestamp;

        // Auto-name chat from first user message
        if (type === 'user' && chats[activeChatId].name === 'New Chat') {
            chats[activeChatId].name = generateChatName(content);
            document.getElementById('chat-title').textContent = chats[activeChatId].name;
        }

        // Limit messages per chat (keep last 100)
        if (chats[activeChatId].messages.length > 100) {
            chats[activeChatId].messages = chats[activeChatId].messages.slice(-100);
        }

        saveChats();
        renderChatList(); // Update sidebar preview
    }

    // Render to DOM
    renderMessage(message);

    const container = document.getElementById('chat-container');
    container.scrollTop = container.scrollHeight;

    return messageId;
}

async function fetchCurrentUser() {
    try {
        const response = await fetch('/api/get-user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
        }
    } catch (error) {
        console.error('Error fetching user:', error);
    }
}
