// Calculator logic and DOM interaction
// No external imports; works in browser environment

class Calculator {
  constructor() {
    this.currentOperand = '';
    this.previousOperand = '';
    this.operation = null; // '+', '-', '*', '/' or null
  }

  // Reset only the current entry (C) - per specification, clear resets all internal state
  clear() {
    this.currentOperand = '';
    this.previousOperand = '';
    this.operation = null;
    // Do not modify the display value here; UI may retain previous result until next input
  }

  // Reset everything (AC) and clear the display
  allClear() {
    this.clear(); // reset internal state
    const display = document.getElementById('display');
    if (display) display.value = '';
  }

  // Append a digit or decimal point to the current operand
  appendNumber(number) {
    if (number === '.' && this.currentOperand.includes('.')) return; // ignore multiple decimals
    // Prevent leading zeros like "00" unless after decimal point
    if (number !== '.' && this.currentOperand === '0') {
      this.currentOperand = number; // replace leading zero
    } else {
      this.currentOperand = this.currentOperand.toString() + number.toString();
    }
  }

  // Choose an operation (+, -, *, /)
  chooseOperation(op) {
    if (this.currentOperand === '' && this.previousOperand === '') return;
    if (this.currentOperand === '') {
      // Allow changing the operation before entering next number
      this.operation = op;
      return;
    }
    if (this.previousOperand !== '') {
      // If there is already a pending operation, compute it first
      this.compute();
    }
    this.operation = op;
    this.previousOperand = this.currentOperand;
    this.currentOperand = '';
  }

  // Perform the calculation
  compute() {
    const prev = parseFloat(this.previousOperand);
    const current = parseFloat(this.currentOperand);
    if (isNaN(prev) || isNaN(current)) return;
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
          this.currentOperand = 'Error';
          this.operation = null;
          this.previousOperand = '';
          return;
        }
        result = prev / current;
        break;
      default:
        return;
    }
    this.currentOperand = Number.isFinite(result) ? result.toString() : 'Error';
    this.operation = null;
    this.previousOperand = '';
  }

  // Private helper to format numbers with commas for readability
  _formatNumber(numStr) {
    if (!numStr) return '';
    const isNegative = numStr[0] === '-';
    const cleanStr = isNegative ? numStr.slice(1) : numStr;
    const [intPart, decPart] = cleanStr.split('.');
    const formattedInt = Number(intPart).toLocaleString('en-US');
    const result = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
    return isNegative ? `-${result}` : result;
  }

  // Update the calculator display
  updateDisplay() {
    const display = document.getElementById('display');
    if (!display) return;
    const toShow = this.currentOperand !== '' ? this.currentOperand : '';
    display.value = this._formatNumber(toShow);
  }
}

// Initialize after the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const calculator = new Calculator();
  // Expose for testing/debugging
  window.calculator = calculator;

  // Central input dispatcher
  function handleInput(key) {
    if (!key) return;
    if (key === 'AC') {
      calculator.allClear();
    } else if (key === 'C') {
      calculator.clear();
    } else if (key === '=' || key === 'Enter') {
      calculator.compute();
    } else if (['+', '-', '*', '/'].includes(key)) {
      calculator.chooseOperation(key);
    } else if (key === '.' || (key >= '0' && key <= '9')) {
      calculator.appendNumber(key);
    }
    // Percent button ("%") is present in the UI but not required for core logic.
  }

  // Click handling for all buttons
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', event => {
      const key = event.target.dataset.key;
      handleInput(key);
      calculator.updateDisplay();
    });
  });

  // Keyboard handling
  document.addEventListener('keydown', event => {
    const keyMap = {
      'Enter': '=',
      '=': '=',
      'Escape': 'AC',
      'Backspace': 'C',
      'Delete': 'C',
      '+': '+',
      '-': '-',
      '*': '*',
      '/': '/',
      '.': '.',
      ',': '.', // some keyboards use comma for decimal
    };
    // Digits 0-9 map to themselves
    if (event.key >= '0' && event.key <= '9') {
      handleInput(event.key);
      event.preventDefault();
      calculator.updateDisplay();
      return;
    }
    const mapped = keyMap[event.key];
    if (mapped) {
      handleInput(mapped);
      event.preventDefault();
      calculator.updateDisplay();
    }
  });
});
