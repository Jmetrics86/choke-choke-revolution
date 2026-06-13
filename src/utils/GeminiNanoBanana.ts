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
  
  if (songId === 'banana-footlock') {
    // Classic Rock: A banana rocking out on a guitar while passing guard
    innerArt = `
      <!-- Background Dojo Lines -->
      <path d="M10 100 L190 100 M10 140 L190 140 M10 60 L190 60" stroke="#f72585" stroke-width="0.5" opacity="0.3" />
      
      <!-- Tatami Ground -->
      <polygon points="10,130 190,130 170,180 30,180" fill="#1b1c23" stroke="#f72585" stroke-width="1" />
      
      <!-- Defending Fighter (Silhouetted Monster) -->
      <rect x="110" y="110" width="40" height="40" rx="10" fill="#301537" stroke="#9d4edd" stroke-width="2" transform="rotate(-15 130 130)"/>
      <line x1="120" y1="110" x2="100" y2="90" stroke="#9d4edd" stroke-width="3" stroke-linecap="round" />
      
      <!-- Flying Rocker Banana! -->
      <path d="M50,90 Q70,40 110,65 Q85,85 50,90" fill="#ffea00" stroke="#ffd60a" stroke-width="2" />
      <rect x="65" y="55" width="25" height="22" rx="3" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" transform="rotate(25 77 66)" />
      <!-- Blue belt -->
      <line x1="70" y1="65" x2="84" y2="72" stroke="#00b4d8" stroke-width="3" />
      
      <!-- Red Gibson Guitar -->
      <line x1="42" y1="92" x2="108" y2="52" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round" />
      <line x1="108" y1="52" x2="122" y2="44" stroke="#e2e8f0" stroke-width="2.5" /> <!-- Neck -->
      <polygon points="42,92 38,98 48,96" fill="#ef4444" /> <!-- Body fins -->
      
      <!-- Rock sparks -->
      <line x1="40" y1="50" x2="55" y2="55" stroke="#00f5d4" stroke-width="1.5" />
      <line x1="45" y1="70" x2="58" y2="72" stroke="#00f5d4" stroke-width="1.5" />
    `;
  } else if (songId === 'guard-passer') {
    // Country: A banana wearing a cowboy hat applying a footlock
    innerArt = `
      <!-- Background Country/Western Grid -->
      <circle cx="100" cy="100" r="70" fill="none" stroke="#e9c46a" stroke-width="1" stroke-dasharray="3,3" opacity="0.4" />
      
      <!-- Opponent Foot trapped -->
      <rect x="50" y="110" width="15" height="40" rx="3" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" transform="rotate(45 57 130)" />
      <path d="M70,120 L80,125" stroke="#ef4444" stroke-width="3" stroke-linecap="round" /> 

      <!-- Ankle Locking Banana -->
      <path d="M110,120 Q80,110 75,70 Q95,85 110,120" fill="#ffea00" stroke="#ffd60a" stroke-width="2" />
      <!-- Brown cowboy hat -->
      <path d="M60,65 Q75,38 95,60" fill="#b17a30" stroke="#8c5b1b" stroke-width="1.5" />
      <path d="M55,68 Q75,60 95,68" fill="#b17a30" stroke="#8c5b1b" stroke-width="1.5" />
      
      <!-- Gi -->
      <rect x="85" y="85" width="22" height="22" rx="4" fill="#ffffff" stroke="#94a3b8" stroke-width="1" transform="rotate(-15 96 96)" />
      <!-- Purple Belt -->
      <line x1="83" y1="96" x2="105" y2="91" stroke="#8a2be2" stroke-width="3.5" />
      
      <!-- Text spark -->
      <text x="135" y="70" fill="#f4a261" font-weight="bold" font-size="22" font-family="Impact">YEEHAW!</text>
    `;
  } else if (songId === 'berimbolo-samba') {
    // Rap: Banana with shades, sideways cap, gold chain in closed guard
    innerArt = `
      <!-- Hip Hop Vortex -->
      <circle cx="100" cy="100" r="80" fill="none" stroke="#7209b7" stroke-width="2" stroke-dasharray="10,5" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="#f72585" stroke-width="1.5" stroke-dasharray="5,2" />
      
      <!-- Banana sitting in Guard -->
      <path d="M110,70 Q100,120 70,110 Q95,95 110,70" fill="#ffea00" stroke="#ffd60a" stroke-width="2" transform="rotate(180 100 100)" />
      
      <!-- Sideways Cap -->
      <path d="M96,118 L118,108" stroke="#ef4444" stroke-width="6" stroke-linecap="round" />
      <rect x="110" y="105" width="18" height="6" rx="2" fill="#ef4444" transform="rotate(20 120 110)" />
      
      <!-- Cool Sunglasses -->
      <rect x="88" y="112" width="24" height="6" rx="1" fill="#000000" />
      
      <!-- Gold Chain -->
      <ellipse cx="94" cy="98" rx="8" ry="6" fill="none" stroke="#ffd60a" stroke-width="2.5" />
      
      <!-- Gi + Brown Belt -->
      <rect x="85" y="85" width="24" height="24" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
      <line x1="85" y1="97" x2="109" y2="97" stroke="#a0522d" stroke-width="3.5" />
      
      <!-- Mic symbol -->
      <circle cx="62" cy="74" r="4" fill="#94a3b8" />
      <line x1="62" y1="74" x2="58" y2="82" stroke="#475569" stroke-width="2" />
    `;
  } else {
    // Death Metal: Sweaty long haired headbanging banana
    innerArt = `
      <!-- Thrash Sunburst -->
      <polygon points="100,100 10,20 30,10" fill="#ef4444" opacity="0.25" />
      <polygon points="100,100 180,20 160,10" fill="#ef4444" opacity="0.25" />
      <polygon points="100,100 190,120 190,140" fill="#ef4444" opacity="0.25" />
      <polygon points="100,100 10,120 10,140" fill="#ef4444" opacity="0.25" />
      
      <!-- Death Metal Headbanger -->
      <path d="M70,80 Q90,130 130,120 Q110,90 70,80" fill="#ffea00" stroke="#ffd60a" stroke-width="2" />
      <!-- Black metal hair -->
      <path d="M55,75 L62,112 M58,70 L68,118 M64,68 L72,120" stroke="#111111" stroke-width="2.5" />
      
      <!-- Black Gi -->
      <rect x="85" y="90" width="22" height="22" rx="3" fill="#18181b" stroke="#27272a" stroke-width="1.5" />
      <!-- Black Belt with Red Stripe -->
      <line x1="85" y1="101" x2="107" y2="101" stroke="#000000" stroke-width="3.5" /> 
      <line x1="100" y1="98" x2="100" y2="104" stroke="#ef4444" stroke-width="2.2" /> 

      <!-- Blast sparks -->
      <path d="M125,125 L140,140 M130,115 L150,115" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
      <text x="135" y="70" fill="#ef4444" font-weight="bold" font-size="20" font-family="Impact">SLAY!</text>
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
      title: 'The Ballad of the Blue Belt',
      genre: 'Country & Tatami',
      bpm: 100,
      duration: 157,
      coverArt: generateBananaCoverArt('guard-passer', 'The Ballad of the Blue Belt'),
      bassNotes: ["G2","D2","G2","D2","C2","G2","C2","G2","G2","D2","G2","D2","D2","A2","D2","A2","G2","D2","G2","D2","C2","G2","C2","G2","G2","D2","G2","D2","D2","D2","G2","D2","C2","G2","C2","G2","G2","D2","G2","D2","D2","A2","D2","A2","G2","D2","G2","D2","C2","G2","C2","G2","G2","D2","G2","D2","D2","A2","D2","A2","G2","D2","G2","G2","G2","D2","G2","D2","C2","G2","C2","G2","G2","D2","G2","D2","D2","A2","D2","A2","G2","D2","G2","D2","C2","G2","C2","G2","G2","D2","G2","D2","D2","D2","G2","D2","C2","G2","C2","G2","G2","D2","G2","D2","D2","A2","D2","A2","G2","D2","G2","D2","C2","G2","C2","G2","G2","D2","G2","D2","D2","A2","D2","A2","G2","D2","G2","G2"],
      leadNotes: ["B3","D4","G4","B4","C4","E4","G4","C5","B3","D4","G4","B4","A3","C#4","E4","A4","B3","D4","G4","B4","C4","E4","G4","C5","B3","D4","G4","B4","A3","C4","F#4","D4","C4","E4","G4","C5","B3","D4","G4","B4","A3","C#4","E4","A4","B3","D4","G4","B4","C4","E4","G4","C5","B3","D4","G4","B4","A3","C4","F#4","D4","G3","B3","D4","G4","B3","D4","G4","B4","C4","E4","G4","C5","B3","D4","G4","B4","A3","C#4","E4","A4","B3","D4","G4","B4","C4","E4","G4","C5","B3","D4","G4","B4","A3","C4","F#4","D4","C4","E4","G4","C5","B3","D4","G4","B4","A3","C#4","E4","A4","B3","D4","G4","B4","C4","E4","G4","C5","B3","D4","G4","B4","A3","C4","F#4","D4","G3","B3","D4","G4"],
      notes: generateBeatmap(100, 157, 'techno'),
      audioUrl: 'tracks/country.mp3',
    },
    {
      id: 'banana-footlock',
      title: "Guard Passer's Anthem",
      genre: 'Grappling Rock',
      bpm: 172,
      duration: 178,
      coverArt: generateBananaCoverArt('banana-footlock', "Guard Passer's Anthem"),
      bassNotes: ["A2","A2","G2","G2","D2","D2","A2","A2","A2","A2","G2","G2","D2","D2","E2","E2","A2","A2","G2","G2","D2","D2","A2","A2","A2","A2","G2","G2","D2","D2","A2","A2","F2","F2","G2","G2","A2","A2","A2","A2","F2","F2","G2","G2","A2","A2","E2","E2","F2","F2","G2","G2","A2","A2","A2","A2","F2","F2","G2","G2","E2","E2","E2","E2","A2","A2","G2","G2","D2","D2","A2","A2","A2","A2","G2","G2","D2","D2","E2","E2","A2","A2","G2","G2","D2","D2","A2","A2","A2","A2","G2","G2","D2","D2","A2","A2","F2","F2","G2","G2","A2","A2","A2","A2","F2","F2","G2","G2","A2","A2","E2","E2","F2","F2","G2","G2","A2","A2","A2","A2","F2","F2","G2","G2","E2","E2","E2","E2"],
      leadNotes: ["A4","C5","D5","A4","G4","Bb4","C5","G4","D4","F4","G4","D4","A4","C5","D5","E5","A4","C5","D5","A4","G4","Bb4","C5","G4","D4","F4","G4","D4","A4","E4","G4","A4","F4","A4","C5","F5","G4","B4","D5","G5","A4","C5","E5","A5","A4","G4","E4","D4","F4","A4","C5","F5","G4","B4","D5","G5","E4","G4","B4","E5","E5","D5","B4","G4","A4","C5","D5","A4","G4","Bb4","C5","G4","D4","F4","G4","D4","A4","C5","D5","E5","A4","C5","D5","A4","G4","Bb4","C5","G4","D4","F4","G4","D4","A4","E4","G4","A4","F4","A4","C5","F5","G4","B4","D5","G5","A4","C5","E5","A5","A4","G4","E4","D4","F4","A4","C5","F5","G4","B4","D5","G5","E4","G4","B4","E5","E5","D5","B4","G4"],
      notes: generateBeatmap(172, 178, 'synthwave'),
      audioUrl: 'tracks/rock.mp3',
    },
    {
      id: 'berimbolo-samba',
      title: 'Straight Outta Guard',
      genre: 'Boom-Bap Hip Hop',
      bpm: 150,
      duration: 157,
      coverArt: generateBananaCoverArt('berimbolo-samba', 'Straight Outta Guard'),
      bassNotes: ["C2","C2","Eb2","Eb2","C2","C2","Bb1","Bb1","C2","C2","Eb2","Eb2","F2","F2","G2","G2","C2","C2","Eb2","Eb2","C2","C2","Bb1","Bb1","C2","C2","Eb2","Eb2","F2","F2","C2","C2","Ab2","Ab2","Bb2","Bb2","C2","C2","C2","C2","Ab2","Ab2","Bb2","Bb2","Eb2","Eb2","G2","G2","Ab2","Ab2","Bb2","Bb2","C2","C2","C2","C2","Ab2","Ab2","Bb2","Bb2","G2","G2","C2","C2","C2","C2","Eb2","Eb2","C2","C2","Bb1","Bb1","C2","C2","Eb2","Eb2","F2","F2","G2","G2","C2","C2","Eb2","Eb2","C2","C2","Bb1","Bb1","C2","C2","Eb2","Eb2","F2","F2","C2","C2","Ab2","Ab2","Bb2","Bb2","C2","C2","C2","C2","Ab2","Ab2","Bb2","Bb2","Eb2","Eb2","G2","G2","Ab2","Ab2","Bb2","Bb2","C2","C2","C2","C2","Ab2","Ab2","Bb2","Bb2","G2","G2","C2","C2"],
      leadNotes: ["C4","C4","Eb4","G4","C4","C4","Bb3","D4","C4","C4","Eb4","G4","F4","F4","G4","Bb4","C4","C4","Eb4","G4","C4","C4","Bb3","D4","C4","C4","Eb4","G4","F4","G4","C4","Eb4","Ab4","C5","Eb5","Ab5","Bb4","D5","F5","Bb5","C4","Eb4","G4","C5","C5","Bb4","G4","Eb4","Ab4","C5","Eb5","Ab5","Bb4","D5","F5","Bb5","G4","B4","D5","G5","C4","Eb4","G4","C5","C4","C4","Eb4","G4","C4","C4","Bb3","D4","C4","C4","Eb4","G4","F4","F4","G4","Bb4","C4","C4","Eb4","G4","C4","C4","Bb3","D4","C4","C4","Eb4","G4","F4","G4","C4","Eb4","Ab4","C5","Eb5","Ab5","Bb4","D5","F5","Bb5","C4","Eb4","G4","C5","C5","Bb4","G4","Eb4","Ab4","C5","Eb5","Ab5","Bb4","D5","F5","Bb5","G4","B4","D5","G5","C4","Eb4","G4","C5"],
      notes: generateBeatmap(150, 157, 'funk'),
      audioUrl: 'tracks/rap.mp3',
    },
    {
      id: 'tap-out-speedcore',
      title: 'Chokehold Carnage',
      genre: 'Death Metal Grind',
      bpm: 150,
      duration: 174,
      coverArt: generateBananaCoverArt('tap-out-speedcore', 'Chokehold Carnage'),
      bassNotes: ["E2","F2","E2","G2","E2","Bb2","A2","G#2","E2","F2","E2","G2","E2","Bb2","C3","B2","E2","F2","E2","G2","E2","Bb2","A2","G#2","E2","F2","E2","G2","F2","G2","E2","E2","E2","E2","E2","E2","G2","G2","G2","G2","C2","C2","C2","C2","B1","B1","B1","B1","E2","E2","E2","E2","G2","G2","G2","G2","C2","C2","C2","C2","Bb1","Bb1","B1","B1","E2","F2","E2","G2","E2","Bb2","A2","G#2","E2","F2","E2","G2","E2","Bb2","C3","B2","E2","F2","E2","G2","E2","Bb2","A2","G#2","E2","F2","E2","G2","F2","G2","E2","E2","E2","E2","E2","E2","G2","G2","G2","G2","C2","C2","C2","C2","B1","B1","B1","B1","E2","E2","E2","E2","G2","G2","G2","G2","C2","C2","C2","C2","Bb1","Bb1","B1","B1"],
      leadNotes: ["E4","F4","E4","G4","Bb4","A4","G#4","E4","E4","F4","E4","G4","Bb4","C5","B4","G4","E4","F4","E4","G4","Bb4","A4","G#4","E4","E4","F4","E4","G4","F4","G4","E4","F4","E4","G4","B4","E5","G4","B4","D5","G5","C4","E4","G4","C5","B3","D4","F#4","B4","E4","G4","B4","E5","G4","B4","D5","G5","C4","E4","G4","C5","Bb3","D4","F4","Bb4","E4","F4","E4","G4","Bb4","A4","G#4","E4","E4","F4","E4","G4","Bb4","C5","B4","G4","E4","F4","E4","G4","Bb4","A4","G#4","E4","E4","F4","E4","G4","F4","G4","E4","F4","E4","G4","B4","E5","G4","B4","D5","G5","C4","E4","G4","C5","B3","D4","F#4","B4","E4","G4","B4","E5","G4","B4","D5","G5","C4","E4","G4","C5","Bb3","D4","F4","Bb4"],
      notes: generateBeatmap(150, 174, 'speedcore'),
      audioUrl: 'tracks/metal.mp3',
    },
  ];
}
