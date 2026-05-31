import { SongBlueprint, BeatNote, DDRDirection } from '../types/game';

// Generates precise beatmaps based on BPM and track style
export function generateBeatmap(bpm: number, duration: number, style: string): BeatNote[] {
  const notes: BeatNote[] = [];
  const secondsPerBeat = 60 / bpm;
  const totalBeats = Math.floor(duration / secondsPerBeat);

  const directions: DDRDirection[] = ['left', 'down', 'up', 'right'];
  const actions: Array<'shrimp' | 'sprawl' | 'posture' | 'sweep'> = ['shrimp', 'sprawl', 'posture', 'sweep'];

  for (let beat = 4; beat < totalBeats - 4; beat++) {
    const time = beat * secondsPerBeat;
    
    // Skip occasional beats to give breathing room
    if (beat % 8 === 0 && style !== 'speedcore') continue;

    if (style === 'techno') {
      // Techno has driving, steady 4-on-the-floor kick beat note alignment
      // Strong focus on sprawl (Down) and posture (Up)
      if (beat % 2 === 0) {
        const dirIndex = beat % 4 === 0 ? 1 : 2; // alternates Down/Up
        const isHold = beat % 6 === 0;
        notes.push({
          id: `note-${beat}-1`,
          time: Number(time.toFixed(3)),
          direction: directions[dirIndex],
          action: actions[dirIndex],
          hit: false,
          hitResult: null,
          isHold,
          holdDuration: isHold ? Number((secondsPerBeat * 1.5).toFixed(3)) : undefined,
        });
      } else if (beat % 3 === 0) {
        // Occasionally add side transitions (Left/Right)
        const dirIndex = beat % 6 === 0 ? 0 : 3;
        notes.push({
          id: `note-${beat}-2`,
          time: Number(time.toFixed(3)),
          direction: directions[dirIndex],
          action: actions[dirIndex],
          hit: false,
          hitResult: null,
        });
      }
    } else if (style === 'funk') {
      // Funk is highly syncopated! Notes occur on half-beats (eighth notes) and off-beats
      if (beat % 4 === 0) {
        // First beat is always on
        const isHold = beat % 8 === 0;
        notes.push({
          id: `note-${beat}-f1`,
          time: Number(time.toFixed(3)),
          direction: 'down', // Sprawl on the heavy beat
          action: 'sprawl',
          hit: false,
          hitResult: null,
          isHold,
          holdDuration: isHold ? Number((secondsPerBeat * 1.25).toFixed(3)) : undefined,
        });
      } else if (beat % 4 === 1.5 || beat % 4 === 1) {
        // Syncopated swing notes
        const offTime = time + (beat % 4 === 1 ? 0 : secondsPerBeat * 0.5);
        notes.push({
          id: `note-${beat}-f2`,
          time: Number(offTime.toFixed(3)),
          direction: 'left', // Shrimp on the groove
          action: 'shrimp',
          hit: false,
          hitResult: null,
        });
      } else if (beat % 4 === 2.5 || beat % 4 === 3) {
        const offTime = time;
        notes.push({
          id: `note-${beat}-f3`,
          time: Number(offTime.toFixed(3)),
          direction: 'right', // Sweep on the upbeat
          action: 'sweep',
          hit: false,
          hitResult: null,
        });
      }
    } else if (style === 'synthwave') {
      // Synthwave has smooth, flowing arpeggio streams (running patterns of Arrows)
      const streamIndex = beat % 4;
      const isHold = beat % 8 === 0;
      notes.push({
        id: `note-${beat}-sw`,
        time: Number(time.toFixed(3)),
        direction: directions[streamIndex],
        action: actions[streamIndex],
        hit: false,
        hitResult: null,
        isHold,
        holdDuration: isHold ? Number((secondsPerBeat * 1.75).toFixed(3)) : undefined,
      });

      // Add double notes on purple/higher-end difficulties for rhythmic tension
      if (beat % 12 === 0) {
        const oppIndex = (streamIndex + 2) % 4;
        notes.push({
          id: `note-${beat}-sw-double`,
          time: Number(time.toFixed(3)),
          direction: directions[oppIndex],
          action: actions[oppIndex],
          hit: false,
          hitResult: null,
        });
      }
    } else if (style === 'speedcore') {
      // Extremely fast, double-taps and intense streams!
      const step = beat % 4;
      notes.push({
        id: `note-${beat}-sc1`,
        time: Number(time.toFixed(3)),
        direction: directions[step],
        action: actions[step],
        hit: false,
        hitResult: null,
      });

      // Rapid alternating streams on 8th notes (half-beats)
      if (beat % 2 === 0) {
        const nextTime = time + secondsPerBeat * 0.5;
        const nextStep = (step + 1) % 4;
        notes.push({
          id: `note-${beat}-sc2`,
          time: Number(nextTime.toFixed(3)),
          direction: directions[nextStep],
          action: actions[nextStep],
          hit: false,
          hitResult: null,
        });
      }
    }
  }

  // Sort notes chronologically
  return notes.sort((a, b) => a.time - b.time);
}

// Procedurally generates an SVG string featuring our mascot: Gemini Nano Banana in hilarious BJJ scenarios!
export function generateBananaCoverArt(songId: string, title: string): string {
  let innerArt = '';
  
  if (songId === 'guard-passer') {
    // A banana flying through the air to pass guard
    innerArt = `
      <!-- Background Dojo Lines -->
      <path d="M10 100 L190 100 M10 140 L190 140 M10 60 L190 60" stroke="#ff007f" stroke-width="0.5" opacity="0.3" />
      
      <!-- Tatami Ground -->
      <polygon points="10,130 190,130 170,180 30,180" fill="#1b1c23" stroke="#ff0055" stroke-width="1" />
      
      <!-- Defending Fighter (Silhouetted Gorilla/Monster Guard) -->
      <rect x="110" y="110" width="40" height="40" rx="10" fill="#301537" stroke="#9d4edd" stroke-width="2" transform="rotate(-15 130 130)"/>
      <line x1="120" y1="110" x2="100" y2="90" stroke="#9d4edd" stroke-width="3" stroke-linecap="round" />
      <line x1="140" y1="110" x2="155" y2="85" stroke="#9d4edd" stroke-width="3" stroke-linecap="round" />
      
      <!-- Flying Banana! -->
      <!-- Body curve -->
      <path d="M50,90 Q70,40 110,65 Q85,85 50,90" fill="#ffea00" stroke="#ffd60a" stroke-width="2" />
      <!-- Banana Tip -->
      <path d="M110,65 Q115,62 118,66 Q112,71 110,65" fill="#3a2305" />
      <path d="M50,90 Q45,92 42,88 Q48,84 50,90" fill="#3a2305" />
      <!-- Banana Gi (White jacket with belt) -->
      <rect x="65" y="55" width="25" height="22" rx="3" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" transform="rotate(25 77 66)" />
      <line x1="70" y1="65" x2="84" y2="72" stroke="#00b4d8" stroke-width="3" /> <!-- Blue belt for Guard Passer! -->
      <line x1="73" y1="60" x2="87" y2="67" stroke="#000" stroke-width="1.5" /> <!-- Belt knot -->
      
      <!-- Tiny Sweat Drops / Speed Lines -->
      <line x1="40" y1="50" x2="55" y2="55" stroke="#00f5d4" stroke-width="1.5" />
      <line x1="45" y1="70" x2="58" y2="72" stroke="#00f5d4" stroke-width="1.5" />
    `;
  } else if (songId === 'banana-footlock') {
    // A banana slipping and locking an ankle
    innerArt = `
      <!-- Background grid -->
      <circle cx="100" cy="100" r="70" fill="none" stroke="#00f5d4" stroke-width="1" stroke-dasharray="3,3" opacity="0.4" />
      
      <!-- Opponent Foot trapped -->
      <rect x="50" y="110" width="15" height="40" rx="3" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" transform="rotate(45 57 130)" />
      <path d="M70,120 L80,125" stroke="#ef4444" stroke-width="3" stroke-linecap="round" /> <!-- Pain lines -->

      <!-- Slipping Banana doing Ankle Lock -->
      <!-- Banana Body -->
      <path d="M110,120 Q80,110 75,70 Q95,85 110,120" fill="#ffea00" stroke="#ffd60a" stroke-width="2" />
      <!-- Banana tip -->
      <path d="M75,70 Q73,65 77,63 Q80,68 75,70" fill="#3a2305" />
      <!-- Banana Gi -->
      <rect x="85" y="85" width="22" height="22" rx="4" fill="#ffffff" stroke="#94a3b8" stroke-width="1" transform="rotate(-15 96 96)" />
      <!-- Purple Belt representing standard intermediate difficulty -->
      <line x1="83" y1="96" x2="105" y2="91" stroke="#8a2be2" stroke-width="3.5" />
      <circle cx="94" cy="93" r="2" fill="#000" />
      
      <!-- Exclamation Mark -->
      <text x="135" y="70" fill="#ff007f" font-weight="bold" font-size="28" font-family="Impact">TAP!</text>
    `;
  } else if (songId === 'berimbolo-samba') {
    // Inverted banana spinning
    innerArt = `
      <!-- Spinning neon vortex -->
      <circle cx="100" cy="100" r="80" fill="none" stroke="#7209b7" stroke-width="2" stroke-dasharray="10,5" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="#f72585" stroke-width="1.5" stroke-dasharray="5,2" />
      
      <!-- Inverted Banana (spinning upside down) -->
      <path d="M110,70 Q100,120 70,110 Q95,95 110,70" fill="#ffea00" stroke="#ffd60a" stroke-width="2" transform="rotate(180 100 100)" />
      <path d="M70,110 Q65,112 63,107 Q68,105 70,110" fill="#3a2305" transform="rotate(180 100 100)" />
      
      <!-- Brown Belt gi -->
      <rect x="85" y="85" width="24" height="24" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" /> <!-- Black/dark Gi -->
      <line x1="85" y1="97" x2="109" y2="97" stroke="#a0522d" stroke-width="3" /> <!-- Brown belt! -->
      
      <!-- Neon Swirls -->
      <path d="M60,60 Q100,20 140,60" fill="none" stroke="#00f5d4" stroke-width="2" stroke-linecap="round"/>
      <path d="M140,140 Q100,180 60,140" fill="none" stroke="#00f5d4" stroke-width="2" stroke-linecap="round"/>
    `;
  } else {
    // Tap-out Speedcore - Frantic tapping and sweaty banana
    innerArt = `
      <!-- Red Speedcore Sunburst -->
      <polygon points="100,100 10,20 30,10" fill="#ef4444" opacity="0.15" />
      <polygon points="100,100 180,20 160,10" fill="#ef4444" opacity="0.15" />
      <polygon points="100,100 190,120 190,140" fill="#ef4444" opacity="0.15" />
      <polygon points="100,100 10,120 10,140" fill="#ef4444" opacity="0.15" />
      <polygon points="100,100 100,190 120,190" fill="#ef4444" opacity="0.15" />
      
      <!-- Frantic Tapping Hand (or Banana tip) -->
      <path d="M70,80 Q90,130 130,120 Q110,90 70,80" fill="#ffea00" stroke="#ffd60a" stroke-width="2" />
      <!-- Black Belt -->
      <rect x="85" y="90" width="22" height="22" rx="3" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" />
      <line x1="85" y1="101" x2="107" y2="101" stroke="#000000" stroke-width="3.5" /> <!-- Black belt! -->
      <line x1="100" y1="98" x2="100" y2="104" stroke="#ef4444" stroke-width="2" /> <!-- Red stripe on black belt -->

      <!-- Tap Sparks -->
      <path d="M125,125 L140,140 M130,115 L150,115 M115,130 L125,150" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
      
      <!-- Pain/Frustration face lines -->
      <path d="M78,82 Q81,85 84,82" stroke="#000" stroke-width="1.5" fill="none" />
      <path d="M74,86 Q77,89 80,86" stroke="#000" stroke-width="1.5" fill="none" />
    `;
  }

  // Entire SVG with beautiful glowing frames and text overlays
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
      <!-- Frame outer border -->
      <rect x="2" y="2" width="196" height="196" rx="10" fill="#12131a" stroke="#1f2937" stroke-width="4" />
      
      <!-- Inner Artwork Clipping Area -->
      <g>
        ${innerArt}
      </g>
      
      <!-- Song Text Frame banner -->
      <rect x="10" y="155" width="180" height="35" rx="5" fill="#0d0e12" stroke="#1f2937" stroke-width="1" />
      <text x="100" y="170" fill="#ffffff" font-size="10" font-family="monospace" font-weight="bold" text-anchor="middle">${title}</text>
      <text x="100" y="183" fill="#94a3b8" font-size="7" font-family="monospace" text-anchor="middle">COMPOSER: GNB NANO</text>
    </svg>
  `;
}

// Compiles and returns all 4 tracks with complete schemas, synthesized waveforms & custom beatmaps
export function getGNBSongLibrary(): SongBlueprint[] {
  return [
    {
      id: 'guard-passer',
      title: "Guard Passer's Nightmare",
      genre: 'Tatami Techno',
      bpm: 135,
      duration: 120, // 2 minutes
      coverArt: generateBananaCoverArt('guard-passer', "Guard Passer's Nightmare"),
      // Sequenced notes for the synthesizer to read (e.g. C2, Eb2, F2, G2)
      bassNotes: ['C2', 'C2', 'Eb2', 'Eb2', 'F2', 'F2', 'G2', 'Bb2'],
      leadNotes: ['C4', 'Eb4', 'F4', 'G4', 'Bb4', 'C5', 'Bb4', 'G4'],
      notes: generateBeatmap(135, 120, 'techno'),
    },
    {
      id: 'banana-footlock',
      title: 'Slippery Banana Footlock',
      genre: 'BJJ Funk',
      bpm: 112,
      duration: 120,
      coverArt: generateBananaCoverArt('banana-footlock', 'Slippery Banana Footlock'),
      bassNotes: ['F2', 'F2', 'Ab2', 'Bb2', 'C3', 'C3', 'Eb3', 'F2'],
      leadNotes: ['F4', 'Ab4', 'Bb4', 'C5', 'Eb5', 'C5', 'Bb4', 'Ab4'],
      notes: generateBeatmap(112, 120, 'funk'),
    },
    {
      id: 'berimbolo-samba',
      title: 'Berimbolo Samba',
      genre: 'Jiujitsu Synthwave',
      bpm: 142,
      duration: 120,
      coverArt: generateBananaCoverArt('berimbolo-samba', 'Berimbolo Samba'),
      bassNotes: ['A2', 'A2', 'C3', 'D3', 'E3', 'E3', 'G3', 'A2'],
      leadNotes: ['A4', 'C5', 'D5', 'E5', 'G5', 'E5', 'D5', 'C5'],
      notes: generateBeatmap(142, 120, 'synthwave'),
    },
    {
      id: 'tap-out-speedcore',
      title: 'Tap-Out Speedcore',
      genre: 'Tap-Out Speedcore',
      bpm: 172,
      duration: 120,
      coverArt: generateBananaCoverArt('tap-out-speedcore', 'Tap-Out Speedcore'),
      bassNotes: ['E2', 'E2', 'G2', 'A2', 'B2', 'B2', 'D3', 'E2'],
      leadNotes: ['E4', 'G4', 'A4', 'B4', 'D5', 'B4', 'A4', 'G4'],
      notes: generateBeatmap(172, 120, 'speedcore'),
    },
  ];
}
