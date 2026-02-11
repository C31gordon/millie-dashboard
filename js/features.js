/**
 * Millie Dashboard - Extended Features
 * Goals, Projects, To-Dos, Weekly Summary, Recurring Tasks
 */

const FEATURES_STORAGE_KEY = 'millie_dashboard_features';

// Project definitions
const PROJECTS = [
  { id: 'rise', name: 'RISE', color: '#db6d28', icon: '🏢' },
  { id: 'rentwise', name: 'RentWise', color: '#3fb950', icon: '🏠' },
  { id: 'ai-factory', name: 'AI Product Factory', color: '#a371f7', icon: '🤖' },
  { id: 'scorecard', name: 'Portfolio Scorecard', color: '#58a6ff', icon: '📊' },
  { id: 'ardexa', name: 'Ardexa', color: '#d29922', icon: '⚡' }
];

// Features state
let featuresState = {
  goals: [],
  todos: [],
  recurringTasks: [],
  projectProgress: {}
};

/**
 * Initialize features
 */
function initFeatures() {
  loadFeaturesState();
  renderFeatures();
  setupFeaturesListeners();
  checkRecurringTasks();
}

/**
 * Load state
 */
function loadFeaturesState() {
  try {
    const data = localStorage.getItem(FEATURES_STORAGE_KEY);
    if (data) {
      featuresState = { ...featuresState, ...JSON.parse(data) };
    }
    
    // Initialize project progress if empty
    if (Object.keys(featuresState.projectProgress).length === 0) {
      PROJECTS.forEach(p => {
        featuresState.projectProgress[p.id] = { 
          progress: Math.floor(Math.random() * 60) + 10, // Mock data
          status: 'active'
        };
      });
    }
    
    // Add sample goals if empty
    if (featuresState.goals.length === 0) {
      featuresState.goals = [
        { id: 'g1', title: 'Launch RentWise MVP', target: '2026-03-01', progress: 35, project: 'rentwise' },
        { id: 'g2', title: 'AI Factory: First Product', target: '2026-04-15', progress: 15, project: 'ai-factory' },
        { id: 'g3', title: '$15M ARR (36 months)', target: '2029-02-01', progress: 2, project: 'ai-factory' }
      ];
    }
    
    // Add sample recurring tasks if empty
    if (featuresState.recurringTasks.length === 0) {
      featuresState.recurringTasks = [
        { id: 'r1', title: 'Weekly team sync', frequency: 'weekly', day: 'Monday', lastRun: null },
        { id: 'r2', title: 'Review financials', frequency: 'monthly', day: '1', lastRun: null },
        { id: 'r3', title: 'Check ARK trades', frequency: 'daily', lastRun: null }
      ];
    }
    
  } catch (e) {
    console.error('Failed to load features state:', e);
  }
}

/**
 * Save state
 */
function saveFeaturesState() {
  try {
    localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(featuresState));
  } catch (e) {
    console.error('Failed to save features state:', e);
  }
}

/**
 * Add a To-Do (quick capture, different from tasks)
 */
function addTodo(text, source = 'manual') {
  const todo = {
    id: 'todo_' + Date.now(),
    text,
    source, // 'manual', 'email', 'calendar'
    completed: false,
    createdAt: new Date().toISOString()
  };
  featuresState.todos.unshift(todo);
  saveFeaturesState();
  renderTodos();
  return todo;
}

/**
 * Toggle To-Do completion
 */
function toggleTodo(id) {
  const todo = featuresState.todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveFeaturesState();
    renderTodos();
  }
}

/**
 * Convert To-Do to Task
 */
function convertTodoToTask(id) {
  const todo = featuresState.todos.find(t => t.id === id);
  if (todo && window.MillieDashboard) {
    window.MillieDashboard.createTask({ title: todo.text, column: 'todo' });
    featuresState.todos = featuresState.todos.filter(t => t.id !== id);
    saveFeaturesState();
    renderTodos();
  }
}

/**
 * Delete To-Do
 */
function deleteTodo(id) {
  featuresState.todos = featuresState.todos.filter(t => t.id !== id);
  saveFeaturesState();
  renderTodos();
}

/**
 * Update project progress
 */
function updateProjectProgress(projectId, progress) {
  if (!featuresState.projectProgress[projectId]) {
    featuresState.projectProgress[projectId] = { progress: 0, status: 'active' };
  }
  featuresState.projectProgress[projectId].progress = Math.min(100, Math.max(0, progress));
  saveFeaturesState();
  renderProjects();
}

/**
 * Check and create recurring tasks
 */
function checkRecurringTasks() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  featuresState.recurringTasks.forEach(rt => {
    const shouldRun = shouldRecurringTaskRun(rt, now);
    if (shouldRun && rt.lastRun !== today) {
      // Create the task
      if (window.MillieDashboard) {
        window.MillieDashboard.createTask({ 
          title: rt.title, 
          column: 'todo',
          priority: 'medium'
        });
      }
      rt.lastRun = today;
    }
  });
  
  saveFeaturesState();
}

/**
 * Check if recurring task should run
 */
function shouldRecurringTaskRun(rt, now) {
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dayOfMonth = now.getDate().toString();
  
  switch (rt.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return dayOfWeek === rt.day;
    case 'monthly':
      return dayOfMonth === rt.day;
    default:
      return false;
  }
}

/**
 * Get weekly summary
 */
function getWeeklySummary() {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  
  const state = window.MillieDashboard?.getState?.() || { tasks: [] };
  const tasks = state.tasks || [];
  
  const completed = tasks.filter(t => 
    t.column === 'done' && 
    t.completedAt && 
    new Date(t.completedAt) > weekAgo
  );
  
  const inProgress = tasks.filter(t => t.column === 'progress');
  const overdue = tasks.filter(t => 
    t.dueDate && 
    new Date(t.dueDate) < now && 
    t.column !== 'done' && 
    t.column !== 'archived'
  );
  
  return {
    completed: completed.length,
    completedTasks: completed,
    inProgress: inProgress.length,
    overdue: overdue.length,
    overdueTasks: overdue
  };
}

/**
 * Render all features
 */
function renderFeatures() {
  renderProjects();
  renderGoals();
  renderTodos();
  renderWeeklySummary();
}

/**
 * Render projects section
 */
function renderProjects() {
  const container = document.getElementById('projects-section');
  if (!container) return;
  
  container.innerHTML = `
    <h3 class="section-title">📈 Projects</h3>
    <div class="projects-grid">
      ${PROJECTS.map(p => {
        const progress = featuresState.projectProgress[p.id]?.progress || 0;
        return `
          <div class="project-card" data-project="${p.id}">
            <div class="project-card__header">
              <span class="project-card__icon">${p.icon}</span>
              <span class="project-card__name">${p.name}</span>
            </div>
            <div class="project-card__progress">
              <div class="progress-bar">
                <div class="progress-bar__fill" style="width: ${progress}%; background: ${p.color}"></div>
              </div>
              <span class="progress-bar__text">${progress}%</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Render goals section
 */
function renderGoals() {
  const container = document.getElementById('goals-section');
  if (!container) return;
  
  container.innerHTML = `
    <h3 class="section-title">🎯 Goals</h3>
    <div class="goals-list">
      ${featuresState.goals.map(g => {
        const project = PROJECTS.find(p => p.id === g.project);
        const daysLeft = Math.ceil((new Date(g.target) - new Date()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysLeft < 0;
        
        return `
          <div class="goal-card">
            <div class="goal-card__header">
              <span class="goal-card__title">${g.title}</span>
              ${project ? `<span class="goal-card__project" style="color: ${project.color}">${project.icon} ${project.name}</span>` : ''}
            </div>
            <div class="goal-card__progress">
              <div class="progress-bar progress-bar--sm">
                <div class="progress-bar__fill" style="width: ${g.progress}%"></div>
              </div>
              <span class="progress-bar__text">${g.progress}%</span>
            </div>
            <div class="goal-card__meta">
              <span class="${isOverdue ? 'text-danger' : ''}">${isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}</span>
              <span>Target: ${new Date(g.target).toLocaleDateString()}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Render To-Dos section
 */
function renderTodos() {
  const container = document.getElementById('todos-section');
  if (!container) return;
  
  const pending = featuresState.todos.filter(t => !t.completed);
  const completed = featuresState.todos.filter(t => t.completed);
  
  const sourceIcon = (source) => {
    switch(source) {
      case 'email': return '📧';
      case 'calendar': return '📅';
      default: return '📝';
    }
  };
  
  container.innerHTML = `
    <h3 class="section-title">✅ To-Do Inbox <span class="badge">${pending.length}</span></h3>
    <div class="todo-input-row">
      <input type="text" class="todo-input" id="todo-input" placeholder="Quick capture...">
      <button class="todo-add-btn" id="add-todo-btn">+</button>
    </div>
    <div class="todos-list">
      ${pending.length === 0 ? '<div class="todos-empty">No pending to-dos 🎉</div>' : ''}
      ${pending.map(t => `
        <div class="todo-item" data-todo-id="${t.id}">
          <button class="todo-check" data-action="toggle-todo">○</button>
          <span class="todo-text">${escapeHtml(t.text)}</span>
          <span class="todo-source">${sourceIcon(t.source)}</span>
          <div class="todo-actions">
            <button class="todo-btn" data-action="convert-todo" title="Convert to Task">📋</button>
            <button class="todo-btn todo-btn--delete" data-action="delete-todo" title="Delete">🗑️</button>
          </div>
        </div>
      `).join('')}
      ${completed.length > 0 ? `
        <div class="todos-completed-header">Completed (${completed.length})</div>
        ${completed.slice(0, 5).map(t => `
          <div class="todo-item todo-item--completed" data-todo-id="${t.id}">
            <button class="todo-check todo-check--done" data-action="toggle-todo">✓</button>
            <span class="todo-text">${escapeHtml(t.text)}</span>
          </div>
        `).join('')}
      ` : ''}
    </div>
  `;
}

/**
 * Render weekly summary
 */
function renderWeeklySummary() {
  const container = document.getElementById('summary-section');
  if (!container) return;
  
  const summary = getWeeklySummary();
  
  container.innerHTML = `
    <h3 class="section-title">📊 This Week</h3>
    <div class="summary-stats">
      <div class="summary-stat summary-stat--done">
        <span class="summary-stat__value">${summary.completed}</span>
        <span class="summary-stat__label">Completed</span>
      </div>
      <div class="summary-stat summary-stat--progress">
        <span class="summary-stat__value">${summary.inProgress}</span>
        <span class="summary-stat__label">In Progress</span>
      </div>
      <div class="summary-stat summary-stat--overdue">
        <span class="summary-stat__value">${summary.overdue}</span>
        <span class="summary-stat__label">Overdue</span>
      </div>
    </div>
    ${summary.overdue > 0 ? `
      <div class="summary-alert">
        ⚠️ ${summary.overdue} overdue task${summary.overdue > 1 ? 's' : ''} need attention
      </div>
    ` : ''}
  `;
}

/**
 * Setup event listeners
 */
function setupFeaturesListeners() {
  document.addEventListener('click', (e) => {
    // Add To-Do
    if (e.target.closest('#add-todo-btn')) {
      const input = document.getElementById('todo-input');
      if (input && input.value.trim()) {
        addTodo(input.value.trim());
        input.value = '';
      }
      return;
    }
    
    // Toggle To-Do
    if (e.target.closest('[data-action="toggle-todo"]')) {
      const item = e.target.closest('.todo-item');
      if (item) toggleTodo(item.dataset.todoId);
      return;
    }
    
    // Convert To-Do to Task
    if (e.target.closest('[data-action="convert-todo"]')) {
      const item = e.target.closest('.todo-item');
      if (item) convertTodoToTask(item.dataset.todoId);
      return;
    }
    
    // Delete To-Do
    if (e.target.closest('[data-action="delete-todo"]')) {
      const item = e.target.closest('.todo-item');
      if (item) deleteTodo(item.dataset.todoId);
      return;
    }
  });
  
  // Enter key for To-Do input
  document.addEventListener('keydown', (e) => {
    if (e.target.id === 'todo-input' && e.key === 'Enter') {
      document.getElementById('add-todo-btn')?.click();
    }
  });
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
 * Fetch To-Dos from email (placeholder - needs Google OAuth)
 */
async function fetchEmailTodos() {
  // TODO: Implement when Google OAuth is working
  console.log('Email sync not yet configured');
  return [];
}

/**
 * Fetch To-Dos from calendar (placeholder - needs Google OAuth)
 */
async function fetchCalendarTodos() {
  // TODO: Implement when Google OAuth is working
  console.log('Calendar sync not yet configured');
  return [];
}

// Export
window.MillieFeatures = {
  init: initFeatures,
  addTodo,
  toggleTodo,
  convertTodoToTask,
  deleteTodo,
  updateProjectProgress,
  getWeeklySummary,
  render: renderFeatures,
  fetchEmailTodos,
  fetchCalendarTodos
};

// Auto-init
setTimeout(initFeatures, 300);
