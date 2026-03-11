// script.js - Calculator logic and UI interaction

// Calculator class definition
class Calculator {
  constructor() {
    this.currentValue = '0'; // Displayed value as string
    this.previousValue = '';
    this.operation = null; // '+', '-', '*', '/' or null
    this.overwrite = false; // Flag to indicate next input should overwrite currentValue
  }

  // Append a digit or decimal point to the current value
  appendNumber(num) {
    if (this.overwrite) {
      // Start fresh after an operation/result
      this.currentValue = num === '.' ? '0.' : num;
      this.overwrite = false;
      return;
    }
    // Prevent multiple leading zeros
    if (this.currentValue === '0' && num !== '.') {
      this.currentValue = num;
      return;
    }
    // Prevent multiple decimal points
    if (num === '.' && this.currentValue.includes('.')) {
      return;
    }
    this.currentValue += num;
  }

  // Choose an operation (+, -, *, /)
  chooseOperation(op) {
    // If we already have a pending operation, compute it first
    if (this.operation !== null) {
      this.compute();
    }
    this.operation = op;
    this.previousValue = this.currentValue;
    this.overwrite = true; // Next number entry should start a new value
  }

  // Perform the calculation based on the stored operation
  compute() {
    const prev = parseFloat(this.previousValue);
    const current = parseFloat(this.currentValue);
    if (isNaN(prev) || isNaN(current)) {
      return;
    }
    let result;
    switch (this.operation) {
      case '+':
        result = prev + current;
        break;
      case '-':
        result = prev - current;
        break;
      case '*':
        result = prev * current;
        break;
      case '/':
        if (current === 0) {
          this.currentValue = 'Error';
          this.operation = null;
          this.previousValue = '';
          this.overwrite = true;
          return;
        }
        result = prev / current;
        break;
      default:
        return;
    }
    // Trim unnecessary decimal zeros
    this.currentValue = Number.isInteger(result) ? result.toString() : result.toString();
    this.operation = null;
    this.previousValue = '';
    this.overwrite = true;
  }

  // Delete the last character (Backspace behavior)
  clear() {
    if (this.overwrite) {
      // If we are in overwrite mode, treat clear as resetting the current entry
      this.currentValue = '0';
      this.overwrite = false;
      return;
    }
    if (this.currentValue.length <= 1) {
      this.currentValue = '0';
    } else {
      this.currentValue = this.currentValue.slice(0, -1);
    }
  }

  // Reset the entire calculator state (All Clear)
  allClear() {
    this.currentValue = '0';
    this.previousValue = '';
    this.operation = null;
    this.overwrite = false;
  }

  // Update the display element with the current value
  updateDisplay() {
    if (typeof display !== 'undefined') {
      display.value = this.currentValue;
    }
  }
}

// Export a singleton instance
const calculator = new Calculator();

// DOM elements for calculator
const display = document.getElementById('display');
const buttons = document.querySelectorAll('.calc-btn');

// Helper to map button actions to calculator methods
function handleButtonAction(button) {
  const action = button.dataset.action;
  switch (action) {
    case 'digit':
      calculator.appendNumber(button.dataset.value);
      break;
    case 'decimal':
      calculator.appendNumber('.');
      break;
    case 'add':
      calculator.chooseOperation('+');
      break;
    case 'subtract':
      calculator.chooseOperation('-');
      break;
    case 'multiply':
      calculator.chooseOperation('*');
      break;
    case 'divide':
      calculator.chooseOperation('/');
      break;
    case 'equals':
      calculator.compute();
      break;
    case 'clear':
      calculator.clear();
      break;
    case 'allClear':
      calculator.allClear();
      break;
    default:
      // No action needed
      break;
  }
  calculator.updateDisplay();
}

// Attach click listeners to each calculator button
buttons.forEach(button => {
  button.addEventListener('click', () => handleButtonAction(button));
});

// Keyboard support
document.addEventListener('keydown', (e) => {
  const key = e.key;
  if (key >= '0' && key <= '9') {
    calculator.appendNumber(key);
    calculator.updateDisplay();
    return;
  }
  if (key === '.') {
    calculator.appendNumber('.');
    calculator.updateDisplay();
    return;
  }
  if (key === '+' || key === '-' || key === '*' || key === '/' || key === 'x') {
    // 'x' is often used for multiplication on keyboards
    const opMap = { '+': '+', '-': '-', '*': '*', '/': '/', 'x': '*' };
    calculator.chooseOperation(opMap[key]);
    calculator.updateDisplay();
    return;
  }
  if (key === 'Enter' || key === '=') {
    calculator.compute();
    calculator.updateDisplay();
    return;
  }
  if (key === 'Backspace') {
    calculator.clear();
    calculator.updateDisplay();
    return;
  }
  if (key === 'Escape') {
    calculator.allClear();
    calculator.updateDisplay();
    return;
  }
});

// Initial display update
calculator.updateDisplay();

/* ---------------------------------------------------------------
   Pomodoro Timer Core State and Control Functions
--------------------------------------------------------------- */

// Constants
const DEFAULT_STUDY_MIN = 25;
const DEFAULT_BREAK_MIN = 5;
const TICK_INTERVAL = 1000; // ms

// Global timer state
const state = {
  mode: 'study', // 'study' | 'break'
  remainingSeconds: DEFAULT_STUDY_MIN * 60,
  timerId: null,
  studyDuration: DEFAULT_STUDY_MIN, // in minutes
  breakDuration: DEFAULT_BREAK_MIN, // in minutes
  soundEnabled: true,
};

/**
 * Format seconds into MM:SS string.
 * @param {number} secs
 * @returns {string}
 */
function formatTime(secs) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Update the timer display element if present. */
function updateTimerDisplay() {
  const el = document.getElementById('timer-display');
  if (el) {
    el.textContent = formatTime(state.remainingSeconds);
  }
}

/** Load saved settings from localStorage or fall back to defaults. */
function initializeState() {
  const storedStudy = parseInt(localStorage.getItem('studyDuration'), 10);
  const storedBreak = parseInt(localStorage.getItem('breakDuration'), 10);
  const storedSound = localStorage.getItem('soundEnabled');
  const storedMode = localStorage.getItem('mode');

  state.studyDuration = Number.isNaN(storedStudy) ? DEFAULT_STUDY_MIN : storedStudy;
  state.breakDuration = Number.isNaN(storedBreak) ? DEFAULT_BREAK_MIN : storedBreak;
  state.soundEnabled = storedSound === null ? true : storedSound === 'true';
  state.mode = storedMode === 'break' ? 'break' : 'study';

  state.remainingSeconds =
    (state.mode === 'study' ? state.studyDuration : state.breakDuration) * 60;

  // Update UI elements that reflect settings if they exist
  const studyInput = document.getElementById('study-duration');
  const breakInput = document.getElementById('break-duration');
  const soundCheckbox = document.getElementById('sound-enabled');
  if (studyInput) studyInput.value = state.studyDuration;
  if (breakInput) breakInput.value = state.breakDuration;
  if (soundCheckbox) soundCheckbox.checked = state.soundEnabled;

  updateTimerDisplay();
}

/** Core tick function called every second. */
function tick() {
  if (state.remainingSeconds > 0) {
    state.remainingSeconds -= 1;
    updateTimerDisplay();
  } else {
    // Switch mode when time runs out
    state.mode = state.mode === 'study' ? 'break' : 'study';
    // Persist mode change
    localStorage.setItem('mode', state.mode);
    state.remainingSeconds =
      (state.mode === 'study' ? state.studyDuration : state.breakDuration) * 60;
    // Optionally play a sound if enabled
    if (state.soundEnabled) {
      // Simple beep using the Web Audio API
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
      oscillator.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
    }
    updateTimerDisplay();
  }
}

/** Start the timer. */
function startTimer() {
  // Clear any existing interval
  if (state.timerId !== null) {
    clearInterval(state.timerId);
  }
  state.timerId = setInterval(tick, TICK_INTERVAL);

  // UI button states
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resetBtn = document.getElementById('reset-btn');
  if (startBtn) startBtn.disabled = true;
  if (pauseBtn) pauseBtn.disabled = false;
  if (resetBtn) resetBtn.disabled = false;
}

/** Pause the timer. */
function pauseTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }

  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  if (startBtn) startBtn.disabled = false;
  if (pauseBtn) pauseBtn.disabled = true;
}

/** Reset the timer to the full length of the current mode. */
function resetTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  state.remainingSeconds =
    (state.mode === 'study' ? state.studyDuration : state.breakDuration) * 60;
  updateTimerDisplay();

  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resetBtn = document.getElementById('reset-btn');
  if (startBtn) startBtn.disabled = false;
  if (pauseBtn) pauseBtn.disabled = true;
  if (resetBtn) resetBtn.disabled = true;
}

// Export functions globally for later tasks
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.resetTimer = resetTimer;
window.initializeState = initializeState;

// Ensure state is initialized after DOM is ready
document.addEventListener('DOMContentLoaded', initializeState);
