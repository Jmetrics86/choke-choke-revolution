# 🥋 Choke Choke Revolution (CCR) 🍌

**Choke Choke Revolution (CCR)** is a high-octane, rhythm-driven, Brazilian Jiu-Jitsu themed Dance Dance Revolution clone designed to work flawlessly on both **mobile** and **desktop** browsers. 

Instead of general dance steps, inputs translate directly to tactical BJJ grappling maneuvers. Hit sequences perfectly to sweep, posture, escape, or sink excruciating, fight-ending choke submissions!

---

## 🎮 How to Play (The Rules of the Dojo)

Arrows scrolling down the rhythm highway map directly to four core Jiu-Jitsu concepts:

| Input Lane | Direction | BJJ Concept | Actions Triggered |
| :--- | :---: | :--- | :--- |
| **Left Lane** | `←` / `A` | **Shrimp / Escape** | Hip escaping out of mount, framing, guard recovery |
| **Down Lane** | `↓` / `S` | **Sprawl / Base** | Defending double-leg takedowns, maintaining heavy hips |
| **Up Lane** | `↑` / `W` | **Posture / Frame** | Posturing up in closed guard, breaking grips, framing |
| **Right Lane** | `→` / `D` | **Sweep / Submission** | Sweeping, setting up triangles, armbars, or back takes |

### 🤼 The Grappling State Machine & Positions
You and your opponent scramble dynamically across four classic BJJ positions:
1.  **Closed Guard (Neutral starting stalemate)**
2.  **Side Control (Advantage position)**
3.  **Full Mount (Dominant position)**
4.  **Back Control (Summit position)**

Hit consecutive strings of notes to sweep and advance your position. Get sloppy or miss notes, and your opponent will sweep you backward or latch onto a submission threat!

### 💀 Active Choke Submissions (Combos)
While in specific positions, hitting a secret key sequence activates an **Active Choke Submission hold** on your opponent:
*   **Triangle Choke** (`↓` $\rightarrow$ `←` $\rightarrow$ `→` from Guard)
*   **Guillotine Choke** (`↓` $\rightarrow$ `↑` $\rightarrow$ `↓` from Side Control)
*   **Ezekiel Choke** (`↑` $\rightarrow$ `→` $\rightarrow$ `←` from Mount)
*   **Rear Naked Choke (RNC)** (`←` $\rightarrow$ `↑` $\rightarrow$ `→` from Back Control)

Once triggered, the match enters **"Squeeze Mode"**! Mash the incoming notes perfectly to drive the glowing **Choke-o-Meter** to zero and force a tap out (Victory!). 

If your opponent catches *you* in a choke, you must hit your notes to fight the hands, post up, and slide your head out to escape back to Closed Guard before the choke meter hits 100% and you **Tap Out** (Game Over).

---

## ✨ Features

*   **🎹 Procedural Sound Synthesizer:** Written entirely via the **Web Audio API** to generate nostalgic, low-latency chiptunes, bouncy basslines, and retro combat sound effects. No massive MP3 audio files are downloaded.
*   **🎨 Dynamic SVG Artwork:** **Gemini Nano Banana (GNB)** acts as the lead graphic designer, drawing highly stylized, vibrant vector covers live inside the browser.
*   **✂️ Multi-Platform Native Response:** Play on desktop with arrow keys/WASD, or on your phone using the ergonomically positioned **Mobile Touch Pad Overlay**. Touch events are bound to `onTouchStart` to eliminate mobile tap latency.
*   **💇 Character Customizer:** Choose your gender, skin tone, hair styles (including mohawks, afros, buns, or spiky hair), and neon hair colors. Your custom grappler is animated in real-time on the tatami mat canvas.
*   **📊 Dynamic Latency Calibration:** Adjust and test audio/video delays (offset sliders) to accommodate wireless Bluetooth earbuds or different browser delays.
*   **🗣️ Speech Synthesis Dojo Coach:** Uses the **Web Speech API** to have your AI Sensei shout real-time technical advice and motivational feedback as you scramble.

---

## 🛠️ Technical Architecture

*   **Vite + React + TypeScript:** For lightweight compilation, blazing-fast hot reloads, and component safety.
*   **Double HTML5 Canvas Loop:** Coordinates targets, scrolling arrows, glowing grids, and the physics of the grappling fighters under a single locked 60FPS render tree.
*   **Lookahead Audio Scheduler:** The industry-standard Web Audio scheduler queue schedules music notes 100ms in advance of execution. This keeps audio perfectly timing-sturdy even if the main thread gets busy.

---

## 🚀 Getting Started

### 1. Installation
Clone the repository and install dependencies:
```powershell
npm install
```

### 2. Run the Development Server
Execute Vite's local dev build:
```powershell
npm run dev
```
Open `http://localhost:3000` in your web browser.

*   *Mobile Testing:* Vite is configured to host on your local network. Connect your phone to the same Wi-Fi network and type the network IP address (displayed on your terminal) into your mobile browser (e.g. `http://192.168.1.15:3000`).

### 3. Compile Production Bundle
Test strict compilation, lints, and build static, minified assets into `/dist`:
```powershell
npm run build
```
The output compiles cleanly with **zero warnings and zero errors**.
