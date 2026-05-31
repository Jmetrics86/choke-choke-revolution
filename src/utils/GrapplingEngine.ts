import { GrapplingPosition, SubmissionState, MatchState, DDRDirection } from '../types/game';
import { audio } from './AudioEngine';

// Interfaces for submission combo definitions
export interface ComboDefinition {
  sequence: DDRDirection[];
  positionRequired: GrapplingPosition;
  stateToTrigger: SubmissionState;
  name: string;
  shout: string;
}

// BJJ Choke Combo Book
export const BJJ_COMBOS: ComboDefinition[] = [
  {
    sequence: ['down', 'left', 'right'],
    positionRequired: 'guard',
    stateToTrigger: 'triangle_attempt',
    name: 'Triangle Choke',
    shout: "TRIANGLE LOCK SECURED! Stack and squeeze his neck!",
  },
  {
    sequence: ['left', 'up', 'right'],
    positionRequired: 'back_control',
    stateToTrigger: 'rnc_attempt',
    name: 'Rear Naked Choke',
    shout: "REAR NAKED CHOKE! Sink the arm and get the TAP OUT!",
  },
  {
    sequence: ['down', 'up', 'down'],
    positionRequired: 'side_control',
    stateToTrigger: 'guillotine_attempt',
    name: 'Guillotine Choke',
    shout: "GUILLOTINE CHOKE! Snap his posture and lock the neck!",
  },
  {
    sequence: ['up', 'right', 'left'],
    positionRequired: 'mount',
    stateToTrigger: 'ezekiel_attempt',
    name: 'Ezekiel Choke',
    shout: "EZEKIEL COPTIC! Squeeze the sleeves from mount!",
  },
];

export class GrapplingEngine {
  // Keeps track of the last 5 successful arrow hits
  private inputBuffer: DDRDirection[] = [];

  constructor() {}

  // Appends a new hit to our rolling buffer and checks for combos
  public registerHit(
    direction: DDRDirection,
    currentState: MatchState
  ): { nextState: MatchState; message: string | null } {
    const nextState = { ...currentState };
    let message: string | null = null;

    // Push direction to buffer and maintain max length of 5
    this.inputBuffer.push(direction);
    if (this.inputBuffer.length > 5) {
      this.inputBuffer.shift();
    }

    // 1. If currently in an ACTIVE submission attempt (Attacking or Defending)
    if (nextState.submission !== 'none') {
      if (nextState.isPlayerAttacking) {
        // Player is squeezing! Squeezing notes pulls chokeMeter closer to 0 (Opponent taps)
        nextState.chokeMeter = Math.max(0, nextState.chokeMeter - 6);
        audio.playSFX('strain');

        if (nextState.chokeMeter === 0) {
          nextState.gameStatus = 'victory';
          nextState.submission = 'none';
          message = "OPPONENT TAPPED! FLawless submission! 🏆 Victory!";
          audio.playSFX('tap');
          audio.speakCoach("He tapped! Beautiful submission! You are a master!");
        }
      } else {
        // Player is defending a choke! Hitting notes pushes chokeMeter closer to 50 (Escape back to neutral)
        nextState.chokeMeter = Math.max(50, nextState.chokeMeter - 5);
        audio.playSFX('strain');

        if (nextState.chokeMeter === 50) {
          nextState.submission = 'none';
          nextState.position = 'guard'; // escapes back to closed guard guard safety
          message = "ESCAPE SUCCESSFUL! Back to Closed Guard!";
          audio.playSFX('sweep');
          audio.speakCoach("Great escape! Now posture up and frame!");
        }
      }

      return { nextState, message };
    }

    // 2. Check if a Submission Combo sequence was hit in the appropriate position
    for (const combo of BJJ_COMBOS) {
      if (
        combo.positionRequired === nextState.position &&
        this.isComboInHistory(combo.sequence)
      ) {
        // Trigger offensive Submission hold!
        nextState.submission = combo.stateToTrigger;
        nextState.isPlayerAttacking = true;
        // Move choke meter to 60 (player wants to push it to 0 to secure the tap out)
        nextState.chokeMeter = 60; 
        message = combo.shout;
        audio.speakCoach(combo.shout);
        audio.playSFX('sweep');
        this.clearBuffer();
        return { nextState, message };
      }
    }

    // 3. Normal Position Progression: Accumulate score to advance positions
    // Advance position every 10 hit-combos (or on a sweep direction)
    if (nextState.comboCount > 0 && nextState.comboCount % 12 === 0 && direction === 'right') {
      const positions: GrapplingPosition[] = ['guard', 'side_control', 'mount', 'back_control'];
      const currentIndex = positions.indexOf(nextState.position);
      if (currentIndex < positions.length - 1) {
        nextState.position = positions[currentIndex + 1];
        audio.playSFX('sweep');
        const posNames = {
          'side_control': 'Side Control',
          'mount': 'Full Mount',
          'back_control': 'Back Control (Take the Back!)'
        };
        const posText = posNames[nextState.position as keyof typeof posNames];
        message = `POSITION ADVANCE: You moved to ${posText}!`;
        audio.speakCoach(`Advance position to ${posText}! Looking good!`);
      }
    }

    // Keep Choke Meter normalized to center (50) in neutral grappling
    if (nextState.chokeMeter > 50) {
      nextState.chokeMeter = Math.max(50, nextState.chokeMeter - 1);
    } else if (nextState.chokeMeter < 50) {
      nextState.chokeMeter = Math.min(50, nextState.chokeMeter + 1);
    }

    return { nextState, message };
  }

  // Handles Note MISSES (Moves chokeMeter towards 100 / triggers Opponent attacks)
  public registerMiss(currentState: MatchState): { nextState: MatchState; message: string | null } {
    const nextState = { ...currentState };
    let message: string | null = null;

    // A miss always pushes the Choke Meter closer to 100 (Defeat)
    nextState.chokeMeter = Math.min(100, nextState.chokeMeter + 8);
    audio.playSFX('miss');

    // Reset combos
    nextState.comboCount = 0;

    // 1. If currently inside an active choke defense, missing notes speeds up tapping out!
    if (nextState.submission !== 'none' && !nextState.isPlayerAttacking) {
      if (nextState.chokeMeter >= 100) {
        nextState.gameStatus = 'gameover';
        message = "TAP OUT! The choke was locked in deep. Practice your escapes!";
        audio.playSFX('tap');
        audio.speakCoach("You tapped out! Keep your hands up and defend next time!");
      }
      return { nextState, message };
    }

    // 2. If player misses in normal play and choke meter gets high, opponent locks a choke!
    if (nextState.submission === 'none' && nextState.chokeMeter >= 75) {
      // Opponent launches submission based on current position
      nextState.isPlayerAttacking = false;
      
      if (nextState.position === 'guard') {
        nextState.submission = 'triangle_attempt';
        message = "OPPONENT LOCKED TRIANGLE! Hit notes and frame to post up!";
        audio.speakCoach("Triangle warning! Watch your arms! Posture up!");
      } else if (nextState.position === 'side_control') {
        nextState.submission = 'guillotine_attempt';
        message = "OPPONENT LOCKED GUILLOTINE! Hit notes to pop your head out!";
        audio.speakCoach("Guillotine alert! Sprawl and defend your neck!");
      } else if (nextState.position === 'mount') {
        nextState.submission = 'ezekiel_attempt';
        message = "OPPONENT ATTEMPTING EZEKIEL! Fight the collar grip!";
        audio.speakCoach("Ezekiel lock! Fight the sleeves!");
      } else {
        nextState.submission = 'rnc_attempt';
        message = "OPPONENT SINKING REAR NAKED CHOKE! Protect your neck!";
        audio.speakCoach("He's on your back! Fight the hands! Protect your neck!");
      }
    }

    // 3. Demote position on continuous misses (if not in submission threat)
    if (nextState.chokeMeter >= 65 && nextState.submission === 'none') {
      const positions: GrapplingPosition[] = ['guard', 'side_control', 'mount', 'back_control'];
      const currentIndex = positions.indexOf(nextState.position);
      if (currentIndex > 0) {
        nextState.position = positions[currentIndex - 1];
        audio.playSFX('miss');
        const posNames = {
          'guard': 'Closed Guard',
          'side_control': 'Side Control (Demoted)',
          'mount': 'Full Mount (Demoted)'
        };
        const posText = posNames[nextState.position as keyof typeof posNames];
        message = `POSITION LOST: Opponent swept you to ${posText}!`;
        audio.speakCoach(`Swept! Recovering to ${posText}. Stay active!`);
        // Reset meter slightly to give them a fighting chance
        nextState.chokeMeter = 55;
      }
    }

    // Check tap out in normal state (if meter maxed out)
    if (nextState.chokeMeter >= 100) {
      nextState.gameStatus = 'gameover';
      message = "TAP OUT! You got choked out. Train harder at the dojo!";
      audio.playSFX('tap');
      audio.speakCoach("Tap out! Always defend the neck! Try again.");
    }

    return { nextState, message };
  }

  // Clear input buffer
  public clearBuffer() {
    this.inputBuffer = [];
  }

  // Check if target sequence ends the input buffer
  private isComboInHistory(sequence: DDRDirection[]): boolean {
    if (this.inputBuffer.length < sequence.length) return false;
    
    const slice = this.inputBuffer.slice(-sequence.length);
    for (let i = 0; i < sequence.length; i++) {
      if (slice[i] !== sequence[i]) return false;
    }
    return true;
  }
}
export const grappling = new GrapplingEngine();
