# MyReps — Build Plan for Claude Code

## Overview
**MyReps** — a mobile-friendly web app for creating and running timed workout sessions. Built with React + Vite, deployed to GitHub Pages.

## Tech Stack
- React (Vite, JavaScript/JSX — no TypeScript)
- Inline styles (no CSS framework)
- localStorage for persistence
- GitHub Actions for deployment to GitHub Pages
- Google Fonts: Archivo Black + DM Sans

## Design
- Dark theme with deep navy/black gradients
- Accent color: red (#e63946) for buttons and branding
- Work phase: green (#4ade80), Rest phase: blue (#60a5fa)
- Mobile-first, max-width 480px centered layout
- Large touch-friendly buttons (minimum 48px tap targets)
- SVG icons throughout (no icon library)

## Data Model

```javascript
// Exercise within a session
{
  id: string,        // random uid
  name: string,      // e.g. "Push-ups"
  sets: number,      // e.g. 3
  workDuration: number,  // seconds, e.g. 30
  restDuration: number   // seconds between sets, e.g. 15
}

// A saved workout session
{
  id: string,
  name: string,      // e.g. "Morning Strength"
  exercises: Exercise[]
}
```

Storage: `localStorage.setItem("workout-sessions-v1", JSON.stringify(sessions))`

## App Structure

Single file `src/App.jsx` with these components:

### 1. HomeScreen
- Shows app logo (dumbbell SVG icon) and title "MYREPS" with subtitle "Training Timer"
- Lists saved sessions as cards showing: name, exercise count, total estimated time, exercise name tags
- Each card has: Edit button, Delete button, "Start Workout" button (red gradient)
- "New Session" button at bottom (dashed red border)
- Empty state message when no sessions exist

### 2. BuilderScreen (create/edit sessions)
- Back button to return home
- Title: "New Session" or "Edit Session"
- Input: Session name
- List of added exercises (each showing name, sets, work/rest durations, with delete button)
- "Add Exercise" button that expands an inline form with fields:
  - Exercise name (text input)
  - Sets (number input, default 3)
  - Work duration in seconds (number input, default 30)
  - Rest duration in seconds (number input, default 15)
  - Add / Cancel buttons
- Save Session button (disabled until name + at least 1 exercise)

### 3. PlayerScreen (the workout timer)
- **Top bar**: Quit button (back arrow + "Quit"), progress percentage
- **Progress bar**: thin colored bar under the top bar
- **Phase label**: "GET READY" / "WORK" / "REST" (uppercase, colored, letter-spaced)
- **Exercise name**: large bold text, centered
- **Set counter**: "Set 2 of 4 · Exercise 1/3"
- **Timer ring**: SVG circle (240x240) with animated stroke-dashoffset countdown, large time display in center (MM:SS format)
- **Controls** (centered row of circular buttons):
  - Previous exercise (⏮) — disabled on first exercise
  - Restart current exercise (🔄) — orange color, resets to set 1 work phase
  - Play/Pause (⏯) — larger center button (64px)
  - Skip to next exercise (⏭)
- **Exercise strip**: horizontal scrollable list at bottom showing all exercises, current one highlighted

#### Timer Flow
1. Start with 3-second "GET READY" countdown
2. → WORK phase (green background tint, green accent): counts down workDuration
3. → REST phase (blue accent): counts down restDuration
4. → Next set (repeat WORK → REST)
5. → After last set of exercise, REST then next exercise
6. → After last set of last exercise → DONE screen

#### Done Screen
- 💪 emoji
- "WORKOUT COMPLETE!" in green
- Session name, total sets/exercises summary
- "Done" button returns to home

#### Audio
- Use Web Audio API (AudioContext + OscillatorNode)
- Beep at 3 seconds remaining (warning)
- Double beep on phase transitions (work→rest, rest→work)
- Triple beep on workout complete
- Keep volume at 0.3, sine wave oscillator

#### Screen Wake Lock
- Request `navigator.wakeLock` on mount to prevent screen dimming
- Release on unmount

### 4. Main App component
- State: screen ("home"/"build"/"play"), sessions array, editSession, playSession
- Load Google Fonts via dynamically created link element
- Load sessions from localStorage on mount
- Save sessions to localStorage on change
- Route between screens based on state

## Vite Config
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: Change '/myreps/' to match the actual GitHub repo name
export default defineConfig({
  plugins: [react()],
  base: '/myreps/',
})
```

## GitHub Actions Deployment
Create `.github/workflows/deploy.yml`:
- Trigger on push to main branch
- Node 20, npm ci, npm run build
- Upload `./dist` as pages artifact
- Deploy to GitHub Pages

## Entry Point (src/main.jsx)
- Import and render App
- Add global style reset: `* { margin: 0; padding: 0; box-sizing: border-box; }` and `body { background: #0f0f0f; }`

## After Setup
In GitHub repo Settings → Pages → Source → select "GitHub Actions"
App will be available at: https://USERNAME.github.io/myreps/
