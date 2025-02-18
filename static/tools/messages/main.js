let currentUser = null;
let isEditing = false;

document.addEventListener('DOMContentLoaded', async () => {
    await fetchCurrentUser();
    loadMessages();

    const eventSource = new EventSource('/api/updates');
    eventSource.onmessage = () => loadMessages();

    if (currentUser === 'guest') {
        document.getElementById('send').disabled = true;
        document.getElementById('messageInput').disabled = true;
    }
    document.getElementById('messageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isEditing) return;

        const input = document.getElementById('messageInput');
        await sendMessage(input.value);
        input.value = '';
    });
});

async function fetchCurrentUser() {
    try {
        const response = await fetch('/api/get-user', {
            method: 'POST'
        });
        if (response.ok) currentUser = await response.json(); currentUser = currentUser['user']
    } catch (error) {
        console.error('Error fetching user:', error);
    }
}

async function loadMessages() {
    try {
        const response = await fetch('/api/get-messages', {
            method: 'POST'
        });
        const messagesObject = await response.json();
        const messages = Object.values(messagesObject);
        displayMessages(messages);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayMessages(messages) {
    const chatBox = document.getElementById('chatBox');
    const wasScrolledBottom = isScrolledBottom(chatBox);

    chatBox.innerHTML = messages.map(message => `
        <div class="message ${message.user === currentUser ? 'own' : ''}" data-id="${message.id}">
            <div class="message-header">
                <span class="message-user">${message.user}</span>
                <span class="message-time">
                    ${(d=new Date(message.timestamp),n=new Date(),y=new Date(n.setDate(n.getDate()-1)),d.toDateString()==n.toDateString()?"Today":d.toDateString()==y.toDateString()?"Yesterday":`${d.toLocaleString('en-US',{month:'short'})} ${d.getDate()}${d.getFullYear()!==n.getFullYear()?`, ${d.getFullYear()}`:''}`)} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    ${message.edited ? '<span class="message-edited">(edited)</span>' : ''}
                </span>
                ${message.user === currentUser ? `
                    <div class="message-actions">
                        <button class="action-button" onclick="startEdit('${message.id}')">Edit</button>
                        <button class="action-button" onclick="deleteMessage('${message.id}')">Delete</button>
                    </div>
                ` : ''}
            </div>
            <div class="message-content">${message.content}</div>
        </div>
    `).join('');

    if (wasScrolledBottom) chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage(content) {
    try {
        await fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        loadMessages();
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

function startEdit(messageId) {
    isEditing = true;
    const messageDiv = document.querySelector(`[data-id="${messageId}"]`);
    const contentDiv = messageDiv.querySelector('.message-content');
    const originalContent = contentDiv.textContent;

    const input = document.createElement('input');
    input.value = originalContent;
    input.className = 'edit-input';

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.className = 'action-button';
    saveButton.onclick = async () => {
        if (input.value.trim() && input.value !== originalContent) {
            await editMessage(messageId, input.value.trim());
        }
        cancelEdit(messageDiv, contentDiv);
    };

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'action-button';
    cancelButton.onclick = () => cancelEdit(messageDiv, contentDiv);

    contentDiv.replaceWith(input);
    messageDiv.querySelector('.message-actions').append(saveButton, cancelButton);
    input.focus();
}

function cancelEdit(messageDiv, contentDiv) {
    messageDiv.querySelector('input').replaceWith(contentDiv);
    messageDiv.querySelectorAll('.action-button').forEach(b => b.remove());
    isEditing = false;
}

async function editMessage(messageId, newContent) {
    try {
        await fetch('/api/edit-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: messageId,
                content: newContent
            })
        });
        loadMessages();
    } catch (error) {
        console.error('Error editing message:', error);
    } finally {
        isEditing = false;
    }
}

async function deleteMessage(messageId) {
    if (!confirm('Delete this message permanently?')) return;
    try {
        await fetch('/api/delete-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: messageId
            })
        });
        loadMessages();
    } catch (error) {
        console.error('Error deleting message:', error);
    }
}

function isScrolledBottom(element) {
    return element.scrollHeight - element.scrollTop === element.clientHeight;
}