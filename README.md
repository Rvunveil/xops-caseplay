# X-OPS CASEPLAY: THE OBERMEYER GAMBIT

A multiplayer operations simulation game designed for the X-Ops Operations Club event at XIME Chennai.

Based on the classic Sport Obermeyer Harvard Business School case, this game turns a complex supply chain optimization problem into a fast, highly engaging, and competitive experience that can be completed in 40 minutes.

## Features

- **Real-Time Multiplayer**: Built with Node.js and WebSockets.
- **Server-Authoritative State**: Fully synchronized game engine ensures fairness and eliminates client-side cheating.
- **Session Persistence**: Team identities survive browser refreshes seamlessly.
- **Database Persistence**: Powered by Supabase to safely store game state, decisions, and outcomes.
  - **`games`**: Stores the high-level state, status, seed, and rounds.
  - **`teams`**: Stores team identities, scores, cash, and final profiles.
  - **`players`**: (Optional) For individual browser identities if needed.
  - **`rounds`**: Stores round progression and phase states.
  - **`decisions`**: Stores raw submissions from each team, per round.
  - **`results`**: Stores actual demand outcomes and P&L results.
  - **`game_events`**: An append-only audit log of major state changes.
  - **`sessions`**: Persists WebSocket session tokens so clients survive server restarts without losing identity.
- **Live Leaderboard**: Real-time ranking with dynamic animations.
- **Strategy Profiling**: Automatically classifies teams into strategies (e.g. "Risk Hunter", "Cost Maximizer", "Accurate Response") based on their actual behavior.
- **Admin Dashboard**: Event hosts have full control over pacing, timers, and phase transitions.

---

## 🚀 Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the template file to create your local `.env`:
```bash
cp .env.example .env
```
Open `.env` and configure your Supabase settings. 

> **🔒 SECURITY WARNING**: The `SUPABASE_SECRET_KEY` must be a server-side Service Role key. It is kept strictly on the server and is never sent to the browser. **Never commit the `.env` file.**

### 3. Database Migration
You must configure the Supabase schema before playing.
1. Open your Supabase Dashboard
2. Navigate to the **SQL Editor**
3. Open `supabase/migrations/001_initial_schema.sql` from this codebase
4. Paste the contents into the SQL Editor and click **Run**
5. Verify that the 7 tables (`games`, `teams`, `players`, `rounds`, `decisions`, `results`, `game_events`) have been created in the Table Editor.

### 4. Start the Server
```bash
npm start
```
The server will start on `http://localhost:3000`.

---

## 🎮 How to Run a Game Session

1. **Host Setup**: Open `http://localhost:3000/#admin` and enter the Admin PIN (default is `1234`). Click **Create Game**.
2. **Share Code**: Share the generated 6-character Game ID with the room.
3. **Teams Join**: Teams open `http://localhost:3000`, enter the Game ID, and pick a Team Name.
4. **Play**: The host uses the Admin Dashboard to advance through the rounds:
   - **Round 1**: Blind Bet (Mass Factory)
   - **Trade Show**: Signal Reveal
   - **Round 2**: Trade Show (Agile Factory)
   - **Round 3**: Market Shift (Agile Factory)
   - **Round 4**: Last Bet (Final Agile + Emergency)
   - **Demand Reveal**: Final P&L
   - **Debrief**: Case Reveal & Strategy Profiles

---

## Architecture

```
Browser (Team / Admin)
       │
       │ WebSocket (sessionToken)
       ▼
Node.js Express + ws Server (Authoritative Engine)
       │
       │ SUPABASE_SECRET_KEY
       ▼
Supabase PostgreSQL (Persistence)
```

**Identity Management:**
- When a team joins, the server generates a unique `sessionToken`.
- The token is passed to the browser and stored in `localStorage`.
- On any refresh, the browser sends a `RECONNECT` payload with the token.
- The server restores the team identity without requiring a re-login.

## Development

- **Server Logic**: `server.js` and `lib/`
- **Game Engine**: `public/game-engine.js` (Shared logic)
- **Frontend App**: `public/app.js` and `public/pages/`
- **Styles**: Vanilla CSS in `public/style.css`
