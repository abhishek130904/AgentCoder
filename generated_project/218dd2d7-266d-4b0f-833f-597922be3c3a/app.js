// app.js - Core functionality for Modern Todo App
// -------------------------------------------------
// Data model
class TodoItem {
  /**
   * @param {string} id - Unique identifier
   * @param {string} text - Todo description
   * @param {boolean} [completed=false] - Completion state
   */
  constructor(id, text, completed = false) {
    this.id = id;
    this.text = text;
    this.completed = completed;
  }
}

// Module‑level state
let todoList = [];
let currentFilter = 'all'; // 'all' | 'active' | 'completed'
const STORAGE_KEY = 'modern_todo_items';
const DARK_MODE_KEY = 'modern_todo_darkMode';

// -------------------------------------------------------------------
// Persistence layer
function loadTodos() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    todoList = [];
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    // Ensure we get an array of plain objects
    if (Array.isArray(parsed)) {
      todoList = parsed.map(obj => new TodoItem(obj.id, obj.text, obj.completed));
    } else {
      todoList = [];
    }
  } catch (e) {
    console.error('Failed to parse todos from localStorage', e);
    todoList = [];
  }
}

function saveTodos() {
  const data = JSON.stringify(todoList);
  localStorage.setItem(STORAGE_KEY, data);
}

// -------------------------------------------------------------------
// UI Rendering
function renderTodoList(filter = 'all') {
  const ul = document.getElementById('todo-list');
  if (!ul) return;
  // Clear existing items
  ul.innerHTML = '';

  const filtered = todoList.filter(item => {
    if (filter === 'active') return !item.completed;
    if (filter === 'completed') return item.completed;
    return true; // all
  });

  filtered.forEach(item => {
    const li = document.createElement('li');
    li.dataset.id = item.id;
    li.className = item.completed ? 'completed' : '';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'toggle';
    if (item.completed) checkbox.checked = true;

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = item.text;

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '✎';
    editBtn.setAttribute('aria-label', 'Edit todo');

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', 'Delete todo');

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    ul.appendChild(li);
  });

  // Update items‑left counter
  const itemsLeft = todoList.filter(item => !item.completed).length;
  const counterSpan = document.getElementById('items-left');
  if (counterSpan) {
    counterSpan.textContent = `${itemsLeft} item${itemsLeft !== 1 ? 's' : ''} left`;
  }

  // Highlight active filter button
  document.getElementById('filter-all').classList.toggle('active-filter', filter === 'all');
  document.getElementById('filter-active').classList.toggle('active-filter', filter === 'active');
  document.getElementById('filter-completed').classList.toggle('active-filter', filter === 'completed');
}

// -------------------------------------------------------------------
// Dark‑mode handling
function applyStoredDarkMode() {
  const stored = localStorage.getItem(DARK_MODE_KEY);
  if (stored === 'true') {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
}

function toggleDarkMode() {
  document.documentElement.classList.toggle('dark-mode');
  const isDark = document.documentElement.classList.contains('dark-mode');
  localStorage.setItem(DARK_MODE_KEY, isDark);
}

// -------------------------------------------------------------------
// CRUD helpers
function addTodo(text) {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
  const newItem = new TodoItem(id, text.trim(), false);
  todoList.push(newItem);
  saveTodos();
  renderTodoList(currentFilter);
}

function getTodoById(id) {
  return todoList.find(item => item.id === id);
}

function deleteTodo(id) {
  const index = todoList.findIndex(item => item.id === id);
  if (index !== -1) {
    todoList.splice(index, 1);
    saveTodos();
    renderTodoList(currentFilter);
  }
}

function toggleTodoCompleted(id, completed) {
  const item = getTodoById(id);
  if (item) {
    item.completed = completed;
    saveTodos();
    renderTodoList(currentFilter);
  }
}

function updateTodoText(id, newText) {
  const item = getTodoById(id);
  if (item) {
    item.text = newText.trim();
    saveTodos();
    renderTodoList(currentFilter);
  }
}

// -------------------------------------------------------------------
// Event registration
function registerEventListeners() {
  // Add button click
  const addBtn = document.getElementById('add-todo-btn');
  const inputField = document.getElementById('new-todo-input');

  if (addBtn && inputField) {
    addBtn.addEventListener('click', () => {
      const text = inputField.value;
      if (text.trim()) {
        addTodo(text);
        inputField.value = '';
        inputField.focus();
      }
    });

    // Enter key on input
    inputField.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBtn.click();
      }
    });
  }

  // Delegated events on todo list
  const ul = document.getElementById('todo-list');
  if (ul) {
    ul.addEventListener('change', e => {
      const target = e.target;
      if (target.matches('input.toggle')) {
        const li = target.closest('li');
        const id = li?.dataset.id;
        if (id) {
          toggleTodoCompleted(id, target.checked);
        }
      }
    });

    ul.addEventListener('click', e => {
      const target = e.target;
      const li = target.closest('li');
      if (!li) return;
      const id = li.dataset.id;
      if (!id) return;

      // Delete button
      if (target.matches('button.delete-btn')) {
        deleteTodo(id);
        return;
      }

      // Edit button
      if (target.matches('button.edit-btn')) {
        const span = li.querySelector('span.todo-text');
        if (!span) return;
        // Replace span with input
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'edit-input';
        editInput.value = span.textContent;
        li.replaceChild(editInput, span);
        editInput.focus();

        const finalizeEdit = () => {
          const newVal = editInput.value;
          if (newVal.trim()) {
            updateTodoText(id, newVal);
          } else {
            // If emptied, keep old text
            renderTodoList(currentFilter);
          }
        };

        editInput.addEventListener('keypress', ev => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            finalizeEdit();
          }
        });
        editInput.addEventListener('blur', finalizeEdit);
      }
    });
  }

  // Filter buttons
  const filterAll = document.getElementById('filter-all');
  const filterActive = document.getElementById('filter-active');
  const filterCompleted = document.getElementById('filter-completed');

  if (filterAll) {
    filterAll.addEventListener('click', () => {
      currentFilter = 'all';
      renderTodoList(currentFilter);
    });
  }
  if (filterActive) {
    filterActive.addEventListener('click', () => {
      currentFilter = 'active';
      renderTodoList(currentFilter);
    });
  }
  if (filterCompleted) {
    filterCompleted.addEventListener('click', () => {
      currentFilter = 'completed';
      renderTodoList(currentFilter);
    });
  }

  // Dark mode toggle
  const darkToggle = document.getElementById('dark-mode-toggle');
  if (darkToggle) {
    darkToggle.addEventListener('click', toggleDarkMode);
  }
}

// -------------------------------------------------------------------
// Initialization
function initApp() {
  loadTodos();
  applyStoredDarkMode();
  currentFilter = 'all';
  renderTodoList(currentFilter);
  registerEventListeners();
}

document.addEventListener('DOMContentLoaded', initApp);

// Expose globally for potential external use (e.g., testing)
window.TodoApp = {
  TodoItem,
  loadTodos,
  saveTodos,
  renderTodoList,
  toggleDarkMode,
  addTodo,
  deleteTodo,
  updateTodoText,
  toggleTodoCompleted,
};
