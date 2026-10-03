// ChatSphere Core Real-Time Chat Engine

document.addEventListener('DOMContentLoaded', () => {
  // Ensure user is logged in
  if (!window.CURRENT_USER) return;

  const currentUserId = window.CURRENT_USER._id;

  // DOM Elements
  const conversationsList = document.getElementById('conversationsList');
  const messagesContainer = document.getElementById('messagesContainer');
  const emptyChatPlaceholder = document.getElementById('emptyChatPlaceholder');
  const activeChatContainer = document.getElementById('activeChatContainer');
  const appContainer = document.querySelector('.app-container');

  // Header Elements
  const headerAvatar = document.getElementById('headerAvatar');
  const headerStatusDot = document.getElementById('headerStatusDot');
  const headerName = document.getElementById('headerName');
  const headerStatusText = document.getElementById('headerStatusText');
  const backToSidebarBtn = document.getElementById('backToSidebarBtn');

  // Input & Footer Elements
  const messageInput = document.getElementById('messageInput');
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  const attachmentBtn = document.getElementById('attachmentBtn');
  const attachmentInput = document.getElementById('attachmentInput');
  const attachmentPreviewBar = document.getElementById('attachmentPreviewBar');
  const previewFileName = document.getElementById('previewFileName');
  const cancelAttachmentBtn = document.getElementById('cancelAttachmentBtn');
  const emojiPickerBtn = document.getElementById('emojiPickerBtn');
  const emojiPickerDropdown = document.getElementById('emojiPickerDropdown');
  const typingIndicatorBar = document.getElementById('typingIndicatorBar');
  const typingText = document.getElementById('typingText');

  // Right Panel Elements
  const rightPanel = document.getElementById('rightPanel');
  const toggleRightPanelBtn = document.getElementById('toggleRightPanelBtn');
  const closeRightPanelBtn = document.getElementById('closeRightPanelBtn');
  const panelAvatar = document.getElementById('panelAvatar');
  const panelStatusDot = document.getElementById('panelStatusDot');
  const panelName = document.getElementById('panelName');
  const panelUsername = document.getElementById('panelUsername');
  const panelEmail = document.getElementById('panelEmail');
  const panelBio = document.getElementById('panelBio');
  const sharedMediaGrid = document.getElementById('sharedMediaGrid');
  const deleteConversationBtn = document.getElementById('deleteConversationBtn');

  // Search & Modals
  const userSearchInput = document.getElementById('userSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const newChatModalBtn = document.getElementById('newChatModalBtn');
  const startChatBtn = document.getElementById('startChatBtn');
  const newChatModal = document.getElementById('newChatModal');
  const closeNewChatModalBtn = document.getElementById('closeNewChatModalBtn');
  const modalUserSearch = document.getElementById('modalUserSearch');
  const modalUsersList = document.getElementById('modalUsersList');

  // Edit Message Modal
  const editMessageModal = document.getElementById('editMessageModal');
  const closeEditMessageModalBtn = document.getElementById('closeEditMessageModalBtn');
  const editMessageInput = document.getElementById('editMessageInput');
  const editMessageId = document.getElementById('editMessageId');
  const saveEditBtn = document.getElementById('saveEditBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  // Theme & Logout
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // State Variables
  let conversations = [];
  let activeConversation = null;
  let activeRecipient = null;
  let selectedAttachment = null; // { url, type, name }
  let typingTimeout = null;

  // Initialize Socket.IO connection
  const socket = window.socket || (typeof initSocketConnection === 'function' ? initSocketConnection() : null);

  // ==========================================================================
  // 1. THEME & INITIAL SETUP
  // ==========================================================================

  const savedTheme = localStorage.getItem('chatsphere_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('chatsphere_theme', next);
      updateThemeIcon(next);
    });
  }

  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    themeToggleBtn.querySelector('i').className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      } catch (err) {
        window.location.href = '/login';
      }
    });
  }

  // ==========================================================================
  // 2. CONVERSATIONS MANAGEMENT
  // ==========================================================================

  async function loadConversations() {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.success) {
        conversations = data.data;
        renderConversationsList(conversations);
        updateTotalUnreadBadge();
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      conversationsList.innerHTML = '<p class="empty-media">Failed to load conversations.</p>';
    }
  }

  function renderConversationsList(list) {
    if (!list || list.length === 0) {
      conversationsList.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px;">
          <p>No conversations yet.</p>
          <p style="margin-top: 6px;">Click <strong>+</strong> to start a chat.</p>
        </div>`;
      return;
    }

    conversationsList.innerHTML = list
      .map((conv) => {
        const recipient = conv.participants.find((p) => p._id !== currentUserId) || conv.participants[0];
        const isSelected = activeConversation && activeConversation._id === conv._id;
        const isOnline = recipient ? recipient.isOnline : false;
        
        let lastMsgText = 'No messages yet';
        let lastMsgTime = '';

        if (conv.lastMessage) {
          if (typeof conv.lastMessage === 'object') {
            if (conv.lastMessage.messageType === 'image') {
              lastMsgText = '📷 Photo';
            } else if (conv.lastMessage.messageType === 'file') {
              lastMsgText = '📎 File attachment';
            } else {
              lastMsgText = conv.lastMessage.content;
            }
            lastMsgTime = formatTime(conv.lastMessage.createdAt);
          }
        }

        return `
          <div class="conv-item ${isSelected ? 'active' : ''}" data-id="${conv._id}">
            <div class="avatar-wrapper">
              <img src="${recipient.profilePicture}" alt="${recipient.name}" class="user-avatar" onerror="this.src='/images/default-avatar.svg'">
              <span class="status-indicator ${isOnline ? 'online' : ''}" id="status-dot-${recipient._id}"></span>
            </div>
            <div class="conv-details">
              <div class="conv-top-row">
                <h4 class="conv-name">${escapeHTML(recipient.name)}</h4>
                <span class="conv-time">${lastMsgTime}</span>
              </div>
              <div class="conv-bottom-row">
                <span class="conv-last-msg">${escapeHTML(lastMsgText)}</span>
                ${conv.unreadCount > 0 ? `<span class="unread-badge">${conv.unreadCount}</span>` : ''}
              </div>
            </div>
          </div>`;
      })
      .join('');

    // Attach click listeners to conversation items
    document.querySelectorAll('.conv-item').forEach((item) => {
      item.addEventListener('click', () => {
        const convId = item.getAttribute('data-id');
        selectConversation(convId);
      });
    });
  }

  function updateTotalUnreadBadge() {
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    const badge = document.getElementById('totalUnreadBadge');
    if (badge) {
      if (totalUnread > 0) {
        badge.textContent = totalUnread;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // ==========================================================================
  // 3. ACTIVE CHAT & MESSAGES MANAGEMENT
  // ==========================================================================

  async function selectConversation(conversationId) {
    const conv = conversations.find((c) => c._id === conversationId);
    if (!conv) return;

    activeConversation = conv;
    activeRecipient = conv.participants.find((p) => p._id !== currentUserId) || conv.participants[0];

    // Reset unread count locally
    conv.unreadCount = 0;
    renderConversationsList(conversations);
    updateTotalUnreadBadge();

    // Show active chat view
    emptyChatPlaceholder.classList.add('hidden');
    activeChatContainer.classList.remove('hidden');
    appContainer.classList.add('mobile-chat-active');

    // Update Header UI
    headerAvatar.src = activeRecipient.profilePicture;
    headerName.textContent = activeRecipient.name;
    updateOnlineStatusUI(activeRecipient.isOnline, activeRecipient.lastSeen);

    // Update Right Panel UI
    updateRightPanelUI(activeRecipient);

    // Fetch Messages
    loadMessages(conversationId);

    // Emit message read event via socket
    if (socket) {
      socket.emit('message_read', { conversationId, senderId: activeRecipient._id });
    }
  }

  async function loadMessages(conversationId) {
    messagesContainer.innerHTML = `
      <div class="loading-spinner-container">
        <div class="spinner"></div>
      </div>`;

    try {
      const res = await fetch(`/api/messages/${conversationId}`);
      const data = await res.json();

      if (data.success) {
        renderMessages(data.data);
        updateSharedMedia(data.data);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      messagesContainer.innerHTML = '<p class="empty-media">Failed to load messages.</p>';
    }
  }

  function renderMessages(messages) {
    if (!messages || messages.length === 0) {
      messagesContainer.innerHTML = `
        <div style="text-align: center; margin: auto; color: var(--text-muted); font-size: 13px;">
          <i class="fa-regular fa-comments" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i>
          <p>This is the beginning of your conversation with <strong>${escapeHTML(activeRecipient.name)}</strong>.</p>
        </div>`;
      return;
    }

    messagesContainer.innerHTML = messages.map((msg) => renderSingleMessageHTML(msg)).join('');
    scrollToBottom();
  }

  function renderSingleMessageHTML(msg) {
    const isSent = (msg.sender._id || msg.sender) === currentUserId;
    const timeStr = formatTime(msg.createdAt);

    let contentHTML = '';
    if (msg.messageType === 'image') {
      contentHTML = `
        ${msg.content ? `<p>${escapeHTML(msg.content)}</p>` : ''}
        <a href="${msg.attachmentUrl}" target="_blank" rel="noopener noreferrer">
          <img src="${msg.attachmentUrl}" alt="Attachment" class="message-image-attachment">
        </a>`;
    } else if (msg.messageType === 'file') {
      const fileName = msg.attachmentUrl ? msg.attachmentUrl.split('-').pop() : 'Attachment';
      contentHTML = `
        ${msg.content ? `<p>${escapeHTML(msg.content)}</p>` : ''}
        <a href="${msg.attachmentUrl}" download class="message-file-attachment">
          <i class="fa-solid fa-file-arrow-down" style="font-size: 18px;"></i>
          <span>${escapeHTML(fileName)}</span>
        </a>`;
    } else {
      contentHTML = `<p>${escapeHTML(msg.content)}</p>`;
    }

    // Double Checkmarks Read Status
    let statusHTML = '';
    if (isSent) {
      if (msg.isRead) {
        statusHTML = '<i class="fa-solid fa-check-double read-status read" title="Read"></i>';
      } else if (msg.isDelivered) {
        statusHTML = '<i class="fa-solid fa-check-double read-status" title="Delivered"></i>';
      } else {
        statusHTML = '<i class="fa-solid fa-check read-status" title="Sent"></i>';
      }
    }

    return `
      <div class="message-wrapper ${isSent ? 'sent' : 'received'}" id="msg-${msg._id}">
        <div class="message-bubble">
          ${contentHTML}
          <div class="message-meta">
            ${msg.edited ? '<span class="edited-tag">(edited)</span>' : ''}
            <span>${timeStr}</span>
            ${statusHTML}
          </div>
        </div>

        ${
          isSent
            ? `
          <div class="message-actions-menu">
            <button class="action-icon-btn edit-msg-btn" onclick="openEditModal('${msg._id}', '${escapeJS(msg.content)}')">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="action-icon-btn delete-msg-btn" onclick="deleteMessage('${msg._id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>`
            : ''
        }
      </div>`;
  }

  function appendSingleMessage(msg) {
    const noMsgMsg = messagesContainer.querySelector('.empty-media');
    if (noMsgMsg) messagesContainer.innerHTML = '';

    const div = document.createElement('div');
    div.innerHTML = renderSingleMessageHTML(msg);
    messagesContainer.appendChild(div.firstElementChild);
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // ==========================================================================
  // 4. SENDING MESSAGES & ATTACHMENTS
  // ==========================================================================

  async function handleSendMessage() {
    if (!activeConversation || !activeRecipient) return;

    const content = messageInput.value.trim();

    if (!content && !selectedAttachment) return;

    const payload = {
      conversationId: activeConversation._id,
      receiverId: activeRecipient._id,
      content,
      messageType: selectedAttachment ? selectedAttachment.type : 'text',
      attachmentUrl: selectedAttachment ? selectedAttachment.url : null,
    };

    // Clear input fields immediately for snappy UI
    messageInput.value = '';
    messageInput.style.height = 'auto';
    clearAttachmentPreview();
    stopTypingEmitter();

    // Emit message through Socket.IO for instant delivery
    if (socket) {
      socket.emit('send_message', payload);
    } else {
      // Fallback via HTTP API
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          appendSingleMessage(data.data);
        }
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    }
  }

  sendMessageBtn.addEventListener('click', handleSendMessage);

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Typing Emitter Logic
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';

    if (!activeRecipient || !socket) return;

    socket.emit('typing', {
      conversationId: activeConversation._id,
      receiverId: activeRecipient._id,
    });

    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      stopTypingEmitter();
    }, 2000);
  });

  function stopTypingEmitter() {
    if (!activeRecipient || !socket) return;
    socket.emit('stop_typing', {
      conversationId: activeConversation._id,
      receiverId: activeRecipient._id,
    });
  }

  // File & Image Attachment Upload
  attachmentBtn.addEventListener('click', () => attachmentInput.click());

  attachmentInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      previewFileName.textContent = 'Uploading file...';
      attachmentPreviewBar.classList.remove('hidden');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        selectedAttachment = {
          url: data.url,
          type: data.fileType,
          name: data.fileName,
        };
        previewFileName.textContent = `${data.fileName} (${data.fileType})`;
      } else {
        showToast(data.message || 'Attachment upload failed', 'danger');
        clearAttachmentPreview();
      }
    } catch (err) {
      showToast('Error uploading attachment', 'danger');
      clearAttachmentPreview();
    }
  });

  cancelAttachmentBtn.addEventListener('click', clearAttachmentPreview);

  function clearAttachmentPreview() {
    selectedAttachment = null;
    attachmentInput.value = '';
    attachmentPreviewBar.classList.add('hidden');
  }

  // Emoji Picker Toggle & Click
  emojiPickerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPickerDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!emojiPickerDropdown.contains(e.target) && e.target !== emojiPickerBtn) {
      emojiPickerDropdown.classList.add('hidden');
    }
  });

  emojiPickerDropdown.addEventListener('click', (e) => {
    if (e.target.tagName === 'SPAN') {
      messageInput.value += e.target.textContent.trim();
      messageInput.focus();
    }
  });

  // ==========================================================================
  // 5. REAL-TIME SOCKET LISTENERS
  // ==========================================================================

  if (socket) {
    // Online / Offline Listeners
    socket.on('user_online', ({ userId }) => {
      updateUserOnlineState(userId, true, new Date());
    });

    socket.on('user_offline', ({ userId, lastSeen }) => {
      updateUserOnlineState(userId, false, lastSeen);
    });

    // Incoming Message Listener
    socket.on('receive_message', (message) => {
      if (activeConversation && activeConversation._id === message.conversationId) {
        appendSingleMessage(message);
        socket.emit('message_read', { messageId: message._id, senderId: message.sender._id });
      } else {
        // Increment unread count in conversations list
        const conv = conversations.find((c) => c._id === message.conversationId);
        if (conv) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
          conv.lastMessage = message;
          renderConversationsList(conversations);
          updateTotalUnreadBadge();
        } else {
          loadConversations();
        }
        showToast(`New message from ${message.sender.name}`, 'info');
      }
    });

    // Sent Message Acknowledgement
    socket.on('message_sent', (message) => {
      if (activeConversation && activeConversation._id === message.conversationId) {
        appendSingleMessage(message);
      }
      loadConversations();
    });

    // Typing Indicators
    socket.on('user_typing', ({ conversationId, username }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        typingText.textContent = `${username} is typing...`;
        typingIndicatorBar.classList.remove('hidden');
      }
    });

    socket.on('user_stop_typing', ({ conversationId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        typingIndicatorBar.classList.add('hidden');
      }
    });

    // Message Read Ack
    socket.on('message_read_ack', ({ conversationId, readerId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        document.querySelectorAll('.read-status').forEach((el) => {
          el.className = 'fa-solid fa-check-double read-status read';
          el.title = 'Read';
        });
      }
    });

    // Message Edited Event
    socket.on('message_edited', (updatedMsg) => {
      const msgNode = document.getElementById(`msg-${updatedMsg._id}`);
      if (msgNode) {
        const bubble = msgNode.querySelector('.message-bubble');
        if (bubble) {
          const p = bubble.querySelector('p');
          if (p) p.textContent = updatedMsg.content;
          let meta = bubble.querySelector('.message-meta');
          if (meta && !meta.querySelector('.edited-tag')) {
            meta.insertAdjacentHTML('afterbegin', '<span class="edited-tag">(edited)</span> ');
          }
        }
      }
    });

    // Message Deleted Event
    socket.on('message_deleted', ({ messageId }) => {
      const msgNode = document.getElementById(`msg-${messageId}`);
      if (msgNode) msgNode.remove();
    });
  }

  function updateUserOnlineState(userId, isOnline, lastSeen) {
    // Update indicator in conversation list
    const dot = document.getElementById(`status-dot-${userId}`);
    if (dot) {
      if (isOnline) dot.classList.add('online');
      else dot.classList.remove('online');
    }

    // Update conversation state in array
    conversations.forEach((conv) => {
      conv.participants.forEach((p) => {
        if (p._id === userId) {
          p.isOnline = isOnline;
          p.lastSeen = lastSeen;
        }
      });
    });

    // Update header & panel if active chat recipient
    if (activeRecipient && activeRecipient._id === userId) {
      activeRecipient.isOnline = isOnline;
      activeRecipient.lastSeen = lastSeen;
      updateOnlineStatusUI(isOnline, lastSeen);
    }
  }

  function updateOnlineStatusUI(isOnline, lastSeen) {
    if (isOnline) {
      headerStatusDot.className = 'status-indicator online';
      headerStatusText.className = 'status-text online-text';
      headerStatusText.textContent = '● Online';
      if (panelStatusDot) panelStatusDot.className = 'status-indicator online';
    } else {
      headerStatusDot.className = 'status-indicator';
      headerStatusText.className = 'status-text';
      headerStatusText.textContent = lastSeen ? `Last seen ${formatTime(lastSeen)}` : 'Offline';
      if (panelStatusDot) panelStatusDot.className = 'status-indicator';
    }
  }

  // ==========================================================================
  // 6. EDIT & DELETE MESSAGE MODAL HANDLERS
  // ==========================================================================

  window.openEditModal = (id, currentContent) => {
    editMessageId.value = id;
    editMessageInput.value = currentContent;
    editMessageModal.classList.remove('hidden');
  };

  closeEditMessageModalBtn.addEventListener('click', () => editMessageModal.classList.add('hidden'));
  cancelEditBtn.addEventListener('click', () => editMessageModal.classList.add('hidden'));

  saveEditBtn.addEventListener('click', async () => {
    const msgId = editMessageId.value;
    const newContent = editMessageInput.value.trim();

    if (!newContent) return;

    try {
      const res = await fetch(`/api/messages/${msgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
      const data = await res.json();

      if (data.success) {
        editMessageModal.classList.add('hidden');
        if (socket && activeRecipient) {
          socket.emit('edit_message', {
            messageId: msgId,
            conversationId: activeConversation._id,
            receiverId: activeRecipient._id,
            content: newContent,
          });
        }
      }
    } catch (err) {
      showToast('Error editing message', 'danger');
    }
  });

  window.deleteMessage = async (msgId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const res = await fetch(`/api/messages/${msgId}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        const msgNode = document.getElementById(`msg-${msgId}`);
        if (msgNode) msgNode.remove();

        if (socket && activeRecipient) {
          socket.emit('delete_message', {
            messageId: msgId,
            conversationId: activeConversation._id,
            receiverId: activeRecipient._id,
          });
        }
      }
    } catch (err) {
      showToast('Error deleting message', 'danger');
    }
  };

  // ==========================================================================
  // 7. USER SEARCH & NEW CHAT MODAL
  // ==========================================================================

  if (startChatBtn) {
    startChatBtn.addEventListener('click', () => openNewChatModal());
  }

  if (newChatModalBtn) {
    newChatModalBtn.addEventListener('click', () => openNewChatModal());
  }

  if (closeNewChatModalBtn) {
    closeNewChatModalBtn.addEventListener('click', () => newChatModal.classList.add('hidden'));
  }

  async function openNewChatModal() {
    newChatModal.classList.remove('hidden');
    modalUserSearch.value = '';
    searchUsersAndRender('');
  }

  modalUserSearch.addEventListener('input', (e) => {
    searchUsersAndRender(e.target.value.trim());
  });

  async function searchUsersAndRender(query) {
    modalUsersList.innerHTML = `<div class="loading-spinner-container"><div class="spinner"></div></div>`;
    try {
      const res = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.success && data.data.length > 0) {
        modalUsersList.innerHTML = data.data
          .map(
            (u) => `
          <div class="modal-user-item" onclick="startNewConversation('${u._id}')">
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${u.profilePicture}" class="user-avatar" alt="${u.name}" onerror="this.src='/images/default-avatar.svg'">
              <div>
                <h5 style="font-weight: 700;">${escapeHTML(u.name)}</h5>
                <span class="user-handle">@${escapeHTML(u.username)}</span>
              </div>
            </div>
            <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;">Chat</button>
          </div>`
          )
          .join('');
      } else {
        modalUsersList.innerHTML = `<p class="empty-media" style="padding: 20px; text-align: center;">No users found.</p>`;
      }
    } catch (err) {
      modalUsersList.innerHTML = `<p class="empty-media">Error searching users.</p>`;
    }
  }

  window.startNewConversation = async (recipientId) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();

      if (data.success) {
        newChatModal.classList.add('hidden');
        await loadConversations();
        selectConversation(data.data._id);
      }
    } catch (err) {
      showToast('Could not start conversation', 'danger');
    }
  };

  // Sidebar Filter Search
  userSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (q) {
      clearSearchBtn.classList.remove('hidden');
      const filtered = conversations.filter((c) => {
        const recipient = c.participants.find((p) => p._id !== currentUserId);
        return recipient && (recipient.name.toLowerCase().includes(q) || recipient.username.toLowerCase().includes(q));
      });
      renderConversationsList(filtered);
    } else {
      clearSearchBtn.classList.add('hidden');
      renderConversationsList(conversations);
    }
  });

  clearSearchBtn.addEventListener('click', () => {
    userSearchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    renderConversationsList(conversations);
  });

  // ==========================================================================
  // 8. RIGHT PANEL & MEDIA GALLERY
  // ==========================================================================

  function updateRightPanelUI(user) {
    if (!user) return;
    panelAvatar.src = user.profilePicture;
    panelName.textContent = user.name;
    panelUsername.textContent = `@${user.username}`;
    panelEmail.innerHTML = `<i class="fa-solid fa-envelope"></i> ${user.email}`;
    panelBio.textContent = user.bio || 'No bio provided.';
  }

  function updateSharedMedia(messages) {
    const imageMsgs = messages.filter((m) => m.messageType === 'image' && m.attachmentUrl);
    if (!sharedMediaGrid) return;

    if (imageMsgs.length > 0) {
      sharedMediaGrid.innerHTML = imageMsgs
        .slice(0, 9)
        .map((m) => `<a href="${m.attachmentUrl}" target="_blank"><img src="${m.attachmentUrl}" alt="Media"></a>`)
        .join('');
    } else {
      sharedMediaGrid.innerHTML = `<p class="empty-media">No media shared yet</p>`;
    }
  }

  toggleRightPanelBtn.addEventListener('click', () => rightPanel.classList.toggle('hidden'));
  closeRightPanelBtn.addEventListener('click', () => rightPanel.classList.add('hidden'));

  deleteConversationBtn.addEventListener('click', async () => {
    if (!activeConversation) return;
    if (!confirm('Delete entire conversation history? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/conversations/${activeConversation._id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        activeConversation = null;
        activeRecipient = null;
        activeChatContainer.classList.add('hidden');
        emptyChatPlaceholder.classList.remove('hidden');
        rightPanel.classList.add('hidden');
        loadConversations();
        showToast('Conversation deleted', 'info');
      }
    } catch (err) {
      showToast('Failed to delete conversation', 'danger');
    }
  });

  // Mobile Back Button
  backToSidebarBtn.addEventListener('click', () => {
    appContainer.classList.remove('mobile-chat-active');
  });

  // Helper Utilities
  function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeJS(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'danger' ? 'danger-toast' : ''}`;
    toast.innerHTML = `
      <i class="fa-solid ${type === 'danger' ? 'fa-triangle-exclamation' : 'fa-bell'}" style="color: var(--accent-primary);"></i>
      <span>${escapeHTML(msg)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Load conversations on page startup
  loadConversations();
});
