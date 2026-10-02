# INSERT COFFEE — Agent Specification & Guidelines

## 🤖 Agent Profile
- **Name:** Insert Coffee AI Assistant
- **Role:** Full-Stack Frontend Architect & Experience Designer
- **Domain:** Coffee & Casual Gaming Web App (`INSERT COFFEE`)

## 🛠️ Tech Stack & Architecture
- **Structure:** Modular Web Architecture (Separation of Concerns)
  - `index.html`: Semantic markup, Single Page Application (SPA) view containers, modal templates, and navigation framework.
  - `assets/css/style.css`: Design tokens, layout primitives, responsive components, arcade cabinet styling, and custom theme variables.
  - `assets/js/app.js`: State management, SPA router, arcade minigame engines (Pixel Catcher, Coffee Clicker, Bean Stack, Trivia), menu customization, cart/checkout system, and sound synthesizers.
- **Styling:** Custom CSS variables (`:root`), Flexbox/Grid layouts, responsive design supporting mobile and desktop viewports.
- **Interactivity:** Vanilla JavaScript (ES6+), Web Audio API (for retro sound effects), LocalStorage persistence (for high scores and cart state).

## 📋 Code Conventions & Guidelines
1. **Modularity:** Never bundle CSS or JS inside HTML files. Maintain clean asset paths (`assets/css/`, `assets/js/`).
2. **Performance:** Keep DOM queries efficient, debounce resize/scroll listeners, and use lightweight canvas or DOM rendering for arcade games.
3. **Accessibility:** Use semantic elements (`<nav>`, `<main>`, `<section>`, `<footer>`), ARIA attributes where applicable, and keyboard-friendly navigation.
4. **Maintenance:** Document complex game loops and state mutations clearly inside the JS codebase.
