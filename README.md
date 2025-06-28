# HuntTheWumpus

## Project Description

Hunt the Wumpus is a classic logic adventure game implemented as a web application using React (TypeScript) for the frontend and a Python agent for reference logic. The game features a 20x20 grid-based cave filled with hazards and treasures. The player (agent) explores the cave, aiming to find the gold or kill the Wumpus while avoiding pits and bats.

## How It Was Made

- **Frontend:** Built with React and TypeScript, providing a modern, interactive UI for visualizing the cave, agent, and hazards. The game logic, agent movement, and auto-play are implemented in TypeScript.
- **Assets:** Custom icons for the agent, Wumpus, bats, pits, and gold are used for clear visualization.
- **Agent Logic:** The agent uses a depth-first search (DFS) algorithm to explore the cave, avoid dangers, and attempt to win by either finding the gold or killing the Wumpus. The agent's logic is inspired by the classic rules and a Python reference implementation.
- **Auto Play:** The game runs in automatic mode, with the agent making decisions and moving step by step. Manual mode has been removed for simplicity.

---

## Project Structure Overview

- `hunt-the-wumpus-react/` — Main React app (TypeScript)
  - `src/`
    - `App.tsx` — Main app component, manages game state and UI
    - `components/` — UI components (Board, Controls, Stats, etc.)
    - `utils/`
      - `gameLogic.ts` — Core game and agent logic
      - `gameTypes.ts` — TypeScript types for game entities
    - `assets/` — Game icons
  - `public/` — Static files (e.g., `index.html`)
- `Hunt_the_Wumpus_Agente.py` — Python reference agent (not used in frontend)

---

## How the App Works (Step by Step)

1. **Game Initialization**
   - When the app loads or the user clicks **New Game**, a new board is generated in `gameLogic.ts`.
   - Hazards (Wumpus, pits, bats, gold) are randomly placed on the board.
   - The agent is placed in a random empty cell.

2. **Rendering the Board**
   - The `Board` component (`Board.tsx`) displays the grid, agent, and hazards (with icons from `assets/`).
   - The `Stats` and `Controls` components show the agent's status and allow the user to start/step the game.

3. **Agent Turn (Auto Play)**
   - On each step (auto or manual), the agent's next move is determined by the DFS-based algorithm in `gameLogic.ts`.
   - The agent checks its current cell for hazards (gold, pit, Wumpus, bat) and logs the outcome.
   - If alive, the agent explores adjacent cells, marks visited cells, and backtracks if needed.
   - If adjacent to a Wumpus, the agent may shoot an arrow (one per move, 1/8 chance to hit).
   - If the agent enters a bat cell, it is teleported and its exploration history resets.
   - The action log records each decision and outcome.

4. **Game End**
   - The game ends if the agent finds gold (win), falls into a pit, is eaten by the Wumpus, or runs out of moves.
   - The UI updates to reflect the outcome and disables further moves.

---

## Agent Logic: Technical Details & Algorithm

The agent is fully autonomous and uses a depth-first search (DFS) strategy to explore the cave. Here’s how it works:

1. **State Tracking**
   - The agent maintains a stack of cells to visit, a set of visited cells, and a record of hazards detected.
   - It tracks its current position, remaining arrows, and whether it just shot an arrow (to enforce one shot per move).

2. **Perception**
   - On each move, the agent checks the current cell:
     - **Gold:** Wins immediately.
     - **Pit/Wumpus:** Loses immediately.
     - **Bat:** Teleported to a random empty cell, stack and visited set reset.
   - If adjacent to hazards, the agent logs sensory messages (breeze, smell, flapping).

3. **Decision Making**
   - The agent explores unvisited, safe-looking adjacent cells first (DFS order: up, right, down, left).
   - If adjacent to the Wumpus and has arrows, it will shoot (one arrow per move, 1/8 chance to hit).
   - If no safe moves are available, the agent backtracks.
   - If all options are exhausted, the agent logs a loss (ran out of moves).

4. **Algorithm Pseudocode**

```typescript
while (game not over) {
  check current cell for hazards;
  if (hazard) handle outcome;
  else {
    for (each adjacent cell) {
      if (unvisited and not known hazard) {
        move to cell;
        mark as visited;
        break;
      }
    }
    if (adjacent to Wumpus and has arrows and not justShot) {
      shoot arrow (1/8 chance to win);
    }
    if (no moves left) backtrack or end game;
  }
}
```

5. **Hazard Handling**
   - **Gold:** Win and stop.
   - **Pit/Wumpus:** Lose and stop.
   - **Bat:** Teleport and reset exploration.
   - **Wumpus (adjacent):** Shoot if possible, else avoid.
   - **Pit (adjacent):** Avoid and backtrack.
   - **Bat (adjacent):** May risk once, else avoid.

6. **Differences from Python Agent**
   - The TypeScript agent closely follows the Python reference but is adapted for React state management and UI updates.
   - All agent actions and outcomes are logged for transparency and debugging.

---

## How to Play

- Click **New Game** to start a new cave.
- Click **Auto Play** to let the agent play automatically, or **Next Step** to advance one move at a time.
- The action log on the right shows the agent's decisions and outcomes.

---

## Game Rules

- **Gold (x1):** If the agent enters the gold cell, it immediately wins the game. There is no notification in adjacent rooms.
- **Wumpus (x1):** If the agent enters the Wumpus cell, it immediately loses. If adjacent, the agent receives the message "You smell something terrible" and can shoot an arrow (if available). If the shot hits (1/8 chance), the agent wins. If it misses or has no arrows left, the agent must continue exploring. The agent starts with 3 arrows and can only shoot once per move.
- **Pit (x4):** If the agent enters a pit cell, it immediately loses. If adjacent, the agent receives the message "You feel a breeze" and will backtrack to avoid the pit.
- **Bat (x8):** If the agent enters a bat cell, it is teleported to a random empty cell, and its exploration history is reset. If adjacent, the agent receives the message "You hear flapping" and may risk entering the cell once.
- **Exploration:** The agent explores the cave using DFS, marking explored cells and backtracking when necessary. If there are no more cells to explore, the agent loses.

## Technologies Used

- React
- TypeScript
- Custom CSS

## Credits

- Game logic and UI: [Your Name]
- Python agent reference: Eduardo Pivaral Leal

Enjoy playing Hunt the Wumpus!