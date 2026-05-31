# 🥋 Choke Choke Revolution (CCR) — AI Agents & Ruflo Harness

Choke Choke Revolution leverages **Ruflo MCP Tools** alongside our custom agent, **Gemini Nano Banana (GNB)**, to deliver an intelligent, procedurally generated, and fully customized software harness and gameplay experience.

---

## 1. The Agent Ecosystem

```
             ┌─────────────────────────────────────────┐
             │       User & Developer Workspace        │
             └────────────────────┬────────────────────┘
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
   ┌───────────────────────────┐     ┌───────────────────────────┐
   │    Gemini Nano Banana     │     │     Ruflo Sensei Swarm    │
   │  - Synthesizer Composer   │     │  - Matchmaking Evaluator │
   │  - Dynamic SVG Illustrator│     │  - Dojo Vocal Coach       │
   └───────────────────────────┘     └───────────────────────────┘
```

---

## 2. Gemini Nano Banana (GNB)

**Gemini Nano Banana (GNB)** acts as the lead procedural graphic designer, rhythm-mapper, and audio synthesizer engineer. 

### Core Responsibilities:
1.  **Synth Track Composition (`src/utils/GeminiNanoBanana.ts`):** 
    *   Generates custom basslines, melodic arpeggios, and step-sequencing timing patterns.
    *   Outputs modular song arrays configured dynamically relative to the desired BPM.
2.  **Procedural Vector Illustration (`generateBananaCoverArt`):**
    *   Draws highly detailed, responsive, neon-themed SVG vector art representing wacky BJJ scenarios (e.g., a banana slipping into an ankle lock, or flying over a guard).
    *   Inserts custom artwork dynamically into the song selector, bypassing any heavy image loads or external CDN dependencies.
3.  **Beatmap Synchronization:**
    *   Compiles beat sequences that align strictly with synthesizers, arranging note structures (Techno, Funk syncopation, Synthwave streams, or Speedcore runs) corresponding to BJJ positional transitions.

---

## 3. The Ruflo Dojo Sensei Swarm

The **Ruflo Dojo Sensei Swarm** operates through standard MCP tool structures (`agent_spawn`, `swarm_init`, `memory_store`) to act as the player's personal grappling instructor and dojo referee.

### Core Capabilities:
1.  **Dynamic Match Commentary (Web Speech API Integration):**
    *   Triggers real-time vocal feedback based on hit results and submission thresholds.
    *   *Examples:*
        *   Securing a Triangle: *"Triangle lock secured! Stack and squeeze his neck!"*
        *   Getting Choked: *"He's on your back! Fight the hands! Protect your neck!"*
        *   Escaping: *"Great escape! Now posture up and frame!"*
2.  **Persistent Dojo Memory (`memory_store` & `memory_search`):**
    *   Stores custom fighter styles, preferred color palettes, and latency calibration offsets across sessions.
    *   Maintains track records and belt progression statistics (White Belt $\rightarrow$ Black Belt), adapting opponent grappling AI strategies over time.

---

## 4. Ruflo Harness Integration Commands

Developers can use the following Ruflo MCP triggers inside the workspace to expand CCR or compile fresh track packs:

*   **Initialize Swarm:**
    `ruflo swarm_init --role "Dojo Matchmaker"`
    Sets up an evaluator to monitor player tapping speeds and adjust the default note scrolling velocities.
*   **Generate Custom Beatmap:**
    `ruflo agent_spawn --prompt "Generate a 125 BPM BJJ Funk beatmap focusing on heavy sprawls (Down arrows) for a 90 second track"`
    Spawns a specialized Ruflo agent to generate JSON-formatted timing nodes for a brand new track, feeding it directly into `getGNBSongLibrary()`.
*   **Latency Memory Fetch:**
    `ruflo memory_search --query "device calibration offset"`
    Pulls local hardware audio delay profiles from the persistent memory store to suggest ideal calibration.
