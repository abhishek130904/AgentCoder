# Project Overview

A simple web-based interactive application that demonstrates click and keyboard controls for moving a square within a canvas. The project consists of an `index.html` file, a CSS stylesheet, and a JavaScript file that handles the rendering and user interactions.

---

## Features

- **Click Interaction**: Click anywhere on the canvas to move the square to that position.
- **Keyboard Controls**: Use the arrow keys to move the square incrementally.
- **Responsive Canvas**: The canvas adjusts to the size of the window.
- **Modular Code**: Separate HTML, CSS, and JavaScript files for easy maintenance.

---

## Tech Stack

- **HTML5** – Structure of the page and canvas element.
- **CSS3** – Styling for the page and canvas.
- **JavaScript (ES6)** – Core logic for rendering, animation, and user input handling.

---

## Installation

1. Clone the repository or download the source files.
2. Open the `index.html` file in any modern web browser (Chrome, Firefox, Edge, Safari).
   ```
   # Example (Linux/macOS)
   open index.html
   # Example (Windows)
   start index.html
   ```
3. No additional server or build steps are required.

---

## Usage

- **Click Controls**: Click anywhere on the canvas. The square will smoothly move to the clicked location.
- **Keyboard Controls**: Use the arrow keys (↑ ↓ ← →) to move the square up, down, left, or right.
- **Resize**: The canvas automatically resizes with the browser window, keeping the square within bounds.

---

## Development

### Modifying Styles

- Edit the `styles.css` file to change the appearance of the page, canvas background, or square color.
- The CSS is linked directly in `index.html`, so changes are reflected immediately upon refresh.

### Modifying Logic

- The main interactive logic resides in `script.js`.
- Functions of interest:
  - `init()` – Sets up the canvas and event listeners.
  - `draw()` – Handles rendering of the square each animation frame.
  - `handleClick(event)` – Moves the square to the click location.
  - `handleKey(event)` – Processes arrow‑key movements.
- After editing, simply reload `index.html` to see changes.

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## Screenshot

![Application Screenshot](./screenshot.png)

*Replace `screenshot.png` with an actual screenshot of the running application.*
