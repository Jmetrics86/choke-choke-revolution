export type DDRDirection = 'left' | 'down' | 'up' | 'right';

export type GrapplingPosition = 'guard' | 'side_control' | 'mount' | 'back_control';

export type SubmissionState = 
  | 'none' 
  | 'triangle_attempt' 
  | 'rnc_attempt' 
  | 'guillotine_attempt' 
  | 'ezekiel_attempt';

export interface FighterStyle {
  gender: 'male' | 'female' | 'nonbinary';
  hairStyle: 'bald' | 'short' | 'long' | 'mohawk' | 'afro' | 'buns' | 'spiky';
  hairColor: string; // Hex color string
  skinColor: string; // Hex color string
  beltColor: 'white' | 'blue' | 'purple' | 'brown' | 'black';
}

export interface BeatNote {
  id: string;
  time: number; // Time in seconds when this note should be hit
  direction: DDRDirection;
  action: 'shrimp' | 'sprawl' | 'posture' | 'sweep';
  hit: boolean;
  hitResult: 'oss' | 'good' | 'meh' | 'miss' | null;
  // Hold Note properties
  isHold?: boolean;
  holdDuration?: number; // in seconds, represents how long to hold the key
  holdReleasedEarly?: boolean;
  holdScoreCollected?: boolean;
}

export interface SongBlueprint {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  duration: number; // in seconds
  coverArt: string; // SVG string representing the banana artwork
  bassNotes: string[]; // Notes for synthesis like C2, E2, G2
  leadNotes: string[]; // Notes for melody like C4, D4, E4
  notes: BeatNote[];
  audioUrl?: string; // Optional path to MP3 file, e.g. "/tracks/rock.mp3"
}

export interface MatchState {
  position: GrapplingPosition;
  submission: SubmissionState;
  isPlayerAttacking: boolean; // Is player attempting submission, or defending one
  chokeMeter: number; // 0 to 100. If 100, player taps out (GameOver). If 0 (when attacking), opponent taps out (Victory).
  comboCount: number;
  maxCombo: number;
  score: number;
  currentNoteIndex: number;
  gameStatus: 'menu' | 'customizing' | 'playing' | 'gameover' | 'victory' | 'calibration';
  selectedSongId: string | null;
  calibrationOffset: number; // in milliseconds (lag adjustment)
}
