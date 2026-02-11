/**
 * Millie Dashboard - Chat Interface with Voice
 */

const CHAT_STORAGE_KEY = 'millie_dashboard_chat';
const TELEGRAM_BOT_LINK = 'https://t.me/YourBotName'; // Will be configured

// Chat state
let chatState = {
  messages: [],
  isListening: false,
  isSpeaking: false
};

// Speech recognition
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
}

// Speech synthesis
const synth = window.speechSynthesis;

/**
 * Initialize chat
 */
function initChat() {
  loadChatState();
  renderChat();
  setupChatListeners();
}

/**
 * Load chat state from localStorage
 */
function loadChatState() {
  try {
    const data = localStorage.getItem(CHAT_STORAGE_KEY);
    if (data) {
      chatState = JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load chat state:', e);
  }
}

/**
 * Save chat state
 */
function saveChatState() {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatState));
  } catch (e) {
    console.error('Failed to save chat state:', e);
  }
}

/**
 * Add message to chat
 */
function addMessage(role, text, options = {}) {
  const message = {
    id: 'msg_' + Date.now(),
    role, // 'user' or 'millie'
    text,
    timestamp: new Date().toISOString(),
    hasAudio: options.hasAudio || false,
    isTask: options.isTask || false
  };
  
  chatState.messages.push(message);
  saveChatState();
  renderChat();
  
  // Scroll to bottom
  const container = document.getElementById('chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
  
  return message;
}

/**
 * Send message from user
 */
function sendMessage(text) {
  if (!text.trim()) return;
  
  console.log('Sending message:', text);
  
  // Add user message
  addMessage('user', text);
  
  // Clear input
  const input = document.getElementById('chat-input');
  if (input) input.value = '';
  
  // Check if it's a task
  const taskTitle = detectTask(text);
  console.log('Detected task:', taskTitle);
  
  if (taskTitle) {
    // Create task and respond
    try {
      if (window.MillieDashboard?.createTask) {
        window.MillieDashboard.createTask({ title: taskTitle, column: 'todo' });
      }
    } catch (e) {
      console.error('Error creating task:', e);
    }
    
    setTimeout(() => {
      const response = `Got it! I've added "${taskTitle}" to your To Do list.`;
      addMessage('millie', response);
      speakText(response);
    }, 500);
  } else {
    // Queue for Millie to respond (will check on heartbeat)
    // For now, acknowledge receipt
    setTimeout(() => {
      const response = "Message received! I'll respond shortly — or you can reach me on Telegram for instant replies. 💬";
      addMessage('millie', response);
      speakText(response);
    }, 500);
  }
  
  // Log action
  try {
    window.MillieDashboard?.logAction(`Chat: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
  } catch (e) {
    console.error('Error logging action:', e);
  }
}

/**
 * Detect if message is a task request
 */
function detectTask(text) {
  const lowerText = text.toLowerCase().trim();
  
  const taskPatterns = [
    /^add task[:\s]+(.+)/i,
    /^create task[:\s]+(.+)/i,
    /^todo[:\s]+(.+)/i,
    /^remind me to\s+(.+)/i,
    /^need to\s+(.+)/i,
    /^add[:\s]+["'](.+)["']/i,
    /^task[:\s]+(.+)/i
  ];
  
  for (const pattern of taskPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Also check for simple "add: something" or starts with "add "
  if (lowerText.startsWith('add ') || lowerText.startsWith('add:')) {
    return text.substring(4).trim();
  }
  
  return null;
}

/**
 * Start voice input
 */
function startListening() {
  if (!recognition) {
    alert('Speech recognition not supported in this browser. Try Chrome.');
    return;
  }
  
  chatState.isListening = true;
  updateMicButton();
  
  recognition.start();
  
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');
    
    const input = document.getElementById('chat-input');
    if (input) input.value = transcript;
    
    // If final result, send it
    if (event.results[event.results.length - 1].isFinal) {
      stopListening();
      if (transcript.trim()) {
        sendMessage(transcript);
      }
    }
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    stopListening();
  };
  
  recognition.onend = () => {
    stopListening();
  };
}

/**
 * Stop voice input
 */
function stopListening() {
  chatState.isListening = false;
  updateMicButton();
  
  if (recognition) {
    recognition.stop();
  }
}

/**
 * Update mic button state
 */
function updateMicButton() {
  const btn = document.getElementById('mic-btn');
  if (btn) {
    btn.classList.toggle('listening', chatState.isListening);
    btn.innerHTML = chatState.isListening ? '🔴' : '🎤';
    btn.title = chatState.isListening ? 'Listening...' : 'Voice input';
  }
}

/**
 * Speak text using speech synthesis
 */
function speakText(text) {
  if (!synth) return;
  
  // Cancel any ongoing speech
  synth.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  // Try to find a good female voice
  const voices = synth.getVoices();
  const femaleVoice = voices.find(v => 
    v.name.includes('Samantha') || 
    v.name.includes('Victoria') || 
    v.name.includes('Female') ||
    v.name.includes('Google US English')
  );
  if (femaleVoice) {
    utterance.voice = femaleVoice;
  }
  
  chatState.isSpeaking = true;
  utterance.onend = () => {
    chatState.isSpeaking = false;
  };
  
  synth.speak(utterance);
}

/**
 * Render chat interface
 */
function renderChat() {
  const container = document.getElementById('chat-container');
  if (!container) return;
  
  const messagesHtml = chatState.messages.map(msg => {
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isUser = msg.role === 'user';
    
    return `
      <div class="chat-message ${isUser ? 'chat-message--user' : 'chat-message--millie'}">
        <div class="chat-message__avatar">${isUser ? '👤' : '🔷'}</div>
        <div class="chat-message__content">
          <div class="chat-message__text">${escapeHtml(msg.text)}</div>
          <div class="chat-message__time">${time}</div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = `
    <div class="chat-messages" id="chat-messages">
      ${messagesHtml || '<div class="chat-empty">Start a conversation with Millie</div>'}
    </div>
    <div class="chat-input-area">
      <button class="chat-mic-btn" id="mic-btn" title="Voice input">🎤</button>
      <input type="text" class="chat-input" id="chat-input" placeholder="Message Millie..." />
      <button class="chat-send-btn" id="send-btn" title="Send">➤</button>
    </div>
    <div class="chat-hint">
      💡 Say "add task: [description]" to create a task, or just chat!
    </div>
  `;
  
  // Scroll to bottom
  const messagesContainer = document.getElementById('chat-messages');
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

/**
 * Setup chat event listeners
 */
function setupChatListeners() {
  document.addEventListener('click', (e) => {
    // Mic button
    if (e.target.closest('#mic-btn')) {
      if (chatState.isListening) {
        stopListening();
      } else {
        startListening();
      }
      return;
    }
    
    // Send button
    if (e.target.closest('#send-btn')) {
      const input = document.getElementById('chat-input');
      if (input) sendMessage(input.value);
      return;
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e.target.value);
    }
  });
  
  // Load voices when available
  if (synth) {
    synth.onvoiceschanged = () => synth.getVoices();
  }
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get pending messages for Millie to respond to
 */
function getPendingMessages() {
  return chatState.messages.filter(m => 
    m.role === 'user' && 
    !chatState.messages.some(r => r.role === 'millie' && r.timestamp > m.timestamp)
  );
}

/**
 * Add Millie's response
 */
function addMillieResponse(text, speak = true) {
  addMessage('millie', text);
  if (speak) speakText(text);
}

// Export
window.MillieChat = {
  init: initChat,
  sendMessage,
  addMessage,
  addMillieResponse,
  getPendingMessages,
  speakText
};

// Auto-init when DOM ready - wait a bit for app.js to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initChat, 100);
  });
} else {
  setTimeout(initChat, 100);
}
