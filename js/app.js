/**
 * Millie Dashboard - Task Management
 */

const STORAGE_KEY = 'millie_dashboard_data';

// Project colors
const PROJECT_COLORS = {
  'rentwise': '#3fb950',
  'ai-factory': '#a371f7',
  'scorecard': '#58a6ff',
  'rise': '#db6d28',
  'ardexa': '#d29922',
  'shopify': '#f85149',
  'other': '#8b949e'
};

// Default deliverables
const DEFAULT_DELIVERABLES = [
  { id: 'daily-brief', name: 'Daily Brief', icon: '☀️', frequency: 'Daily', time: '7:00 AM' },
  { id: 'ark-tracking', name: 'ARK Tracking', icon: '📈', frequency: 'Daily', time: '7:00 AM' },
  { id: 'weekly-report', name: 'Weekly Report', icon: '📊', frequency: 'Weekly', time: 'Friday' },
  { id: 'security-audit', name: 'Security Audit', icon: '🔒', frequency: 'Monthly', time: '1st' }
];

// State
let state = {
  tasks: [],
  actionLog: [],
  deliverables: DEFAULT_DELIVERABLES
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  render();
  setupEventListeners();
  updateSyncTime();
});

/**
 * Load state from localStorage
 */
function loadState() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      state.tasks = parsed.tasks || [];
      state.actionLog = parsed.actionLog || [];
      state.deliverables = parsed.deliverables || DEFAULT_DELIVERABLES;
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
}

/**
 * Save state to localStorage
 */
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateSyncTime();
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

/**
 * Update last sync time
 */
function updateSyncTime() {
  const el = document.getElementById('last-sync');
  if (el) {
    const now = new Date();
    el.textContent = `Last sync: ${now.toLocaleTimeString()}`;
  }
}

/**
 * Add to action log
 */
function logAction(text) {
  const entry = {
    time: new Date().toISOString(),
    text
  };
  state.actionLog.unshift(entry);
  // Keep last 50 entries
  state.actionLog = state.actionLog.slice(0, 50);
  saveState();
  renderActionLog();
}

/**
 * Generate unique ID
 */
function generateId() {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Create a new task
 */
function createTask(data) {
  const task = {
    id: generateId(),
    title: data.title,
    description: data.description || '',
    project: data.project || '',
    priority: data.priority || 'medium',
    dueDate: data.dueDate || null,
    column: data.column || 'todo',
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  
  state.tasks.push(task);
  saveState();
  logAction(`Created task: ${task.title}`);
  render();
  return task;
}

/**
 * Update a task
 */
function updateTask(id, updates) {
  const index = state.tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  const task = state.tasks[index];
  
  // Track column changes
  if (updates.column && updates.column !== task.column) {
    if (updates.column === 'done' && task.column !== 'done') {
      updates.completedAt = new Date().toISOString();
      logAction(`Completed: ${task.title}`);
    } else if (updates.column === 'archived') {
      logAction(`Archived: ${task.title}`);
    } else {
      logAction(`Moved "${task.title}" to ${updates.column}`);
    }
  }
  
  state.tasks[index] = { ...task, ...updates };
  saveState();
  render();
  return state.tasks[index];
}

/**
 * Delete a task
 */
function deleteTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    logAction(`Deleted: ${task.title}`);
  }
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  render();
}

/**
 * Move task to column
 */
function moveTask(taskId, toColumn) {
  updateTask(taskId, { column: toColumn });
}

/**
 * Render everything
 */
function render() {
  renderColumns();
  renderStats();
  renderDeliverables();
  renderActionLog();
}

/**
 * Render task columns
 */
function renderColumns() {
  const columns = ['todo', 'progress', 'done', 'archived'];
  
  columns.forEach(column => {
    const tasks = state.tasks.filter(t => t.column === column);
    const container = document.getElementById(`cards-${column}`);
    const countEl = document.getElementById(`count-${column}`);
    
    if (countEl) {
      countEl.textContent = tasks.length;
    }
    
    if (container) {
      container.innerHTML = tasks.map(task => renderCard(task)).join('');
      setupDragDrop(container, column);
    }
  });
}

/**
 * Render a task card
 */
function renderCard(task) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.column !== 'done' && task.column !== 'archived';
  
  let dateDisplay = '';
  if (task.dueDate) {
    const date = new Date(task.dueDate);
    dateDisplay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (task.createdAt) {
    const date = new Date(task.createdAt);
    dateDisplay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  return `
    <div class="card card--${task.priority}" data-task-id="${task.id}" draggable="true">
      <div class="card__title">${escapeHtml(task.title)}</div>
      <div class="card__meta">
        ${task.project ? `<span class="card__project">${task.project}</span>` : ''}
        <span class="card__date ${isOverdue ? 'card__date--overdue' : ''}">${dateDisplay}</span>
      </div>
      <div class="card__actions">
        <button class="card__btn" data-action="edit" data-task="${task.id}">Edit</button>
        ${task.column !== 'done' && task.column !== 'archived' ? `
          <button class="card__btn" data-action="complete" data-task="${task.id}">✓ Done</button>
        ` : ''}
        ${task.column === 'done' ? `
          <button class="card__btn" data-action="archive" data-task="${task.id}">Archive</button>
        ` : ''}
        <button class="card__btn card__btn--delete" data-action="delete" data-task="${task.id}">🗑️</button>
      </div>
    </div>
  `;
}

/**
 * Render stats
 */
function renderStats() {
  const todo = state.tasks.filter(t => t.column === 'todo').length;
  const progress = state.tasks.filter(t => t.column === 'progress').length;
  const done = state.tasks.filter(t => t.column === 'done').length;
  
  document.getElementById('stat-todo').textContent = todo;
  document.getElementById('stat-progress').textContent = progress;
  document.getElementById('stat-done').textContent = done;
}

/**
 * Render deliverables
 */
function renderDeliverables() {
  const container = document.getElementById('deliverables-grid');
  if (!container) return;
  
  container.innerHTML = state.deliverables.map(d => `
    <div class="deliverable">
      <span class="deliverable__icon">${d.icon}</span>
      <div class="deliverable__info">
        <div class="deliverable__name">${d.name}</div>
        <div class="deliverable__date">${d.frequency} @ ${d.time}</div>
      </div>
      <span class="deliverable__badge">${d.frequency}</span>
    </div>
  `).join('');
}

/**
 * Render action log
 */
function renderActionLog() {
  const container = document.getElementById('action-log');
  if (!container) return;
  
  if (state.actionLog.length === 0) {
    container.innerHTML = '<div class="log-entry"><span class="log-entry__text">No actions yet</span></div>';
    return;
  }
  
  container.innerHTML = state.actionLog.slice(0, 10).map(entry => {
    const date = new Date(entry.time);
    const timeStr = date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    return `
      <div class="log-entry">
        <span class="log-entry__time">${timeStr}</span>
        <span class="log-entry__text">${escapeHtml(entry.text)}</span>
      </div>
    `;
  }).join('');
}

/**
 * Setup drag and drop
 */
function setupDragDrop(container, column) {
  const cards = container.querySelectorAll('.card');
  
  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.dataset.taskId);
      card.classList.add('dragging');
    });
    
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  });
  
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    container.classList.add('drag-over');
  });
  
  container.addEventListener('dragleave', () => {
    container.classList.remove('drag-over');
  });
  
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    container.classList.remove('drag-over');
    
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      moveTask(taskId, column);
    }
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Add task buttons
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-action="add-task"]');
    if (addBtn) {
      openModal('add', addBtn.dataset.column);
    }
  });
  
  // Card actions
  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit"]');
    if (editBtn) {
      openModal('edit', null, editBtn.dataset.task);
      return;
    }
    
    const completeBtn = e.target.closest('[data-action="complete"]');
    if (completeBtn) {
      moveTask(completeBtn.dataset.task, 'done');
      return;
    }
    
    const archiveBtn = e.target.closest('[data-action="archive"]');
    if (archiveBtn) {
      moveTask(archiveBtn.dataset.task, 'archived');
      return;
    }
    
    const deleteBtn = e.target.closest('[data-action="delete"]');
    if (deleteBtn) {
      if (confirm('Delete this task?')) {
        deleteTask(deleteBtn.dataset.task);
      }
      return;
    }
  });
  
  // Modal close
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="close-modal"]') || e.target.classList.contains('modal')) {
      closeModal();
    }
  });
  
  // Form submit
  document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const taskId = document.getElementById('task-id').value;
    const data = {
      title: document.getElementById('task-title').value,
      description: document.getElementById('task-description').value,
      project: document.getElementById('task-project').value,
      priority: document.getElementById('task-priority').value,
      dueDate: document.getElementById('task-due').value || null,
      column: document.getElementById('task-column').value || 'todo'
    };
    
    if (taskId) {
      updateTask(taskId, data);
    } else {
      createTask(data);
    }
    
    closeModal();
  });
  
  // Notes panel
  document.querySelector('[data-action="add-from-notes"]')?.addEventListener('click', () => {
    const input = document.getElementById('notes-input');
    const text = input.value.trim();
    
    if (text) {
      createTask({ title: text, column: 'todo' });
      input.value = '';
    }
  });
  
  // Enter key in notes
  document.getElementById('notes-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.querySelector('[data-action="add-from-notes"]')?.click();
    }
  });
}

/**
 * Open modal
 */
function openModal(mode, column, taskId = null) {
  const modal = document.getElementById('task-modal');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('task-form');
  
  // Reset form
  form.reset();
  document.getElementById('task-id').value = '';
  document.getElementById('task-column').value = column || 'todo';
  
  if (mode === 'edit' && taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      title.textContent = 'Edit Task';
      document.getElementById('task-id').value = task.id;
      document.getElementById('task-title').value = task.title;
      document.getElementById('task-description').value = task.description || '';
      document.getElementById('task-project').value = task.project || '';
      document.getElementById('task-priority').value = task.priority || 'medium';
      document.getElementById('task-due').value = task.dueDate || '';
      document.getElementById('task-column').value = task.column;
    }
  } else {
    title.textContent = 'Add Task';
  }
  
  modal.classList.add('active');
  document.getElementById('task-title').focus();
}

/**
 * Close modal
 */
function closeModal() {
  const modal = document.getElementById('task-modal');
  modal.classList.remove('active');
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export for potential external use
window.MillieDashboard = {
  createTask,
  updateTask,
  deleteTask,
  moveTask,
  getState: () => state,
  logAction
};
