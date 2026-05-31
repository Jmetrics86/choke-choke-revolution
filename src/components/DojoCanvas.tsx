import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { SongBlueprint, FighterStyle, MatchState, DDRDirection } from '../types/game';
import { audio } from '../utils/AudioEngine';

interface DojoCanvasProps {
  song: SongBlueprint | null;
  fighter: FighterStyle;
  matchState: MatchState;
  onNoteHit: (direction: DDRDirection, scoreAdd: number, result: 'perfect' | 'great' | 'ok') => void;
  onNoteMiss: () => void;
  onTriggerMobileTouch: (direction: DDRDirection) => void;
}

export interface DojoCanvasRef {
  handleHitAttempt: (direction: DDRDirection) => void;
}

interface FloatingText {
  text: string;
  color: string;
  x: number;
  y: number;
  opacity: number;
  scale: number;
}

export const DojoCanvas = forwardRef<DojoCanvasRef, DojoCanvasProps>(({
  song,
  fighter,
  matchState,
  onNoteHit,
  onNoteMiss,
  onTriggerMobileTouch,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 600 });
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // Expose the handleHitAttempt function so that parent screens can trigger it from mobile buttons
  useImperativeHandle(ref, () => ({
    handleHitAttempt(direction: DDRDirection) {
      handleHitAttempt(direction);
    }
  }));

  // Keep latest state in ref to avoid re-binding event listeners
  const matchStateRef = useRef<MatchState>(matchState);
  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);

  // Handle resizing dynamically
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Keyboard controls listener (Desktop support)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (matchStateRef.current.gameStatus !== 'playing' || !song) return;

      let direction: DDRDirection | null = null;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') direction = 'left';
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') direction = 'down';
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') direction = 'up';
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') direction = 'right';

      if (direction) {
        e.preventDefault();
        onTriggerMobileTouch(direction); // Reuse same processing path
        handleHitAttempt(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [song]);

  // Attempt to hit scrolling note on keyboard press or mobile tap
  const handleHitAttempt = (direction: DDRDirection) => {
    if (!song) return;
    const songTime = audio.getCurrentTime(matchStateRef.current.calibrationOffset);

    // Find the earliest unhit note in the correct direction
    const note = song.notes.find((n) => !n.hit && n.direction === direction && Math.abs(n.time - songTime) < 0.20);

    if (note) {
      const diff = Math.abs(note.time - songTime);
      note.hit = true;

      let result: 'perfect' | 'great' | 'ok' = 'ok';
      let scoreAdd = 50;
      let color = '#39ff14'; // neon green

      if (diff <= 0.045) {
        result = 'perfect';
        scoreAdd = 200;
        color = 'var(--neon-cyan)';
      } else if (diff <= 0.09) {
        result = 'great';
        scoreAdd = 100;
        color = 'var(--neon-yellow)';
      } else {
        result = 'ok';
        scoreAdd = 50;
        color = '#a855f7'; // neon purple
      }

      note.hitResult = result;
      onNoteHit(direction, scoreAdd, result);

      // Trigger visual hit spark text
      const laneIndex = ['left', 'down', 'up', 'right'].indexOf(direction);
      const laneWidth = dimensions.width / 4;
      const x = laneIndex * laneWidth + laneWidth / 2;
      const targetY = dimensions.height - 130;

      floatingTextsRef.current.push({
        text: result.toUpperCase(),
        color,
        x,
        y: targetY - 20,
        opacity: 1,
        scale: 1.2,
      });
    } else {
      // Ghost tap / Miss
      onNoteMiss();
    }
  };

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI retina screen support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    let animationFrameId: number;

    const draw = () => {
      const state = matchStateRef.current;
      const songTime = song ? audio.getCurrentTime(state.calibrationOffset) : 0;

      // Clear canvas
      ctx.fillStyle = '#07080b';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // --- 1. Draw Tatami Mat & Grappling Fighters (Animation Panel) ---
      // Draw background cybergrid dojo
      drawDojoGrid(ctx, songTime);

      // Draw the BJJ Grapplers in action
      drawBJJGrapplers(ctx, songTime, state);

      // --- 2. Draw Scrolling Lanes (Rhythm Highway) ---
      drawRhythmHighway(ctx, songTime);

      // --- 3. Draw Floating Score Text Sparks ---
      drawFloatingTexts(ctx);

      // --- 4. Process Automatic Note Misses ---
      if (song && state.gameStatus === 'playing') {
        song.notes.forEach((note) => {
          // If note is past the hit window and hasn't been hit, register as Miss
          if (!note.hit && songTime > note.time + 0.16) {
            note.hit = true;
            note.hitResult = 'miss';
            onNoteMiss();

            // Trigger floaty MISS text
            const laneIndex = ['left', 'down', 'up', 'right'].indexOf(note.direction);
            const laneWidth = dimensions.width / 4;
            const x = laneIndex * laneWidth + laneWidth / 2;
            const targetY = dimensions.height - 130;

            floatingTextsRef.current.push({
              text: 'MISS',
              color: 'var(--neon-pink)',
              x,
              y: targetY - 20,
              opacity: 1,
              scale: 1.0,
            });
          }
        });
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [dimensions, song]);

  // Draw cyber-grids on Tatami Mat
  const drawDojoGrid = (ctx: CanvasRenderingContext2D, songTime: number) => {
    const startY = 80;
    const endY = dimensions.height - 230;
    
    if (endY <= startY) return;

    ctx.save();
    
    // Background glow
    const grad = ctx.createLinearGradient(0, startY, 0, endY);
    grad.addColorStop(0, '#090a0f');
    grad.addColorStop(1, '#13141f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, startY, dimensions.width, endY - startY);

    // Neon horizon line
    ctx.strokeStyle = 'rgba(114, 9, 183, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, startY);
    ctx.lineTo(dimensions.width, startY);
    ctx.stroke();

    // Rhythmic pulse grid
    const pulse = Math.sin(songTime * Math.PI * 2) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(0, 245, 212, ${0.1 + pulse * 0.08})`;
    ctx.lineWidth = 1;

    // Perspective lines radiating outward
    const lineCount = 10;
    for (let i = 0; i <= lineCount; i++) {
      const xRatio = i / lineCount;
      const startX = dimensions.width * xRatio;
      const endX = (startX - dimensions.width / 2) * 2 + dimensions.width / 2;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Horizontal lines spacing closer together near horizon
    const horizLines = 6;
    for (let i = 0; i < horizLines; i++) {
      const yRatio = Math.pow(i / horizLines, 2); // perspective compression
      const y = startY + (endY - startY) * yRatio;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dimensions.width, y);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Procedurally draw Custom Fighter + Opponent scrambling
  const drawBJJGrapplers = (ctx: CanvasRenderingContext2D, songTime: number, state: MatchState) => {
    const centerY = (dimensions.height - 230 + 80) / 2 + 10;
    const centerX = dimensions.width / 2;

    ctx.save();

    // Sound beat bounce calculation (smooth bounce)
    const beatPhase = (songTime * (song ? song.bpm : 120) / 60) % 1;
    const bounceY = Math.sin(beatPhase * Math.PI) * 4;

    // Extreme shake jitter for submission locks
    let shakeX = 0;
    let shakeY = 0;
    if (state.submission !== 'none') {
      const severity = state.isPlayerAttacking ? (state.chokeMeter / 100) : ((100 - state.chokeMeter) / 100);
      const intensity = 3 + severity * 6;
      shakeX = (Math.random() - 0.5) * intensity;
      shakeY = (Math.random() - 0.5) * intensity;
    }

    ctx.translate(centerX + shakeX, centerY + bounceY + shakeY);

    // Draw grappling shadow/mat footprint
    const shadowGrad = ctx.createRadialGradient(0, 45, 1, 0, 45, 55);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 45, 55, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Map fighter belt colors to draw code
    const getBeltHex = (color: FighterStyle['beltColor']): string => {
      switch (color) {
        case 'white': return '#ffffff';
        case 'blue': return '#00b4d8';
        case 'purple': return '#8a2be2';
        case 'brown': return '#a0522d';
        case 'black': return '#1a1a1a';
      }
    };

    const playerBelt = getBeltHex(fighter.beltColor);
    const opponentBelt = '#1a1a1a'; // Opponent is usually styled with Black/Master belt

    // ─── PROCEDURAL DRAW ENGINE FOR GRAAPLING POSITIONS ───
    if (state.submission !== 'none') {
      // 1. SUBMISSION STATES
      if (state.submission === 'triangle_attempt') {
        // Player is locking Triangle from Guard
        // Bottom player (Horizontal body), Top player (Angled flat)
        drawFighterSkeletal(ctx, -20, 25, 'horizontal', fighter, playerBelt);
        drawFighterSkeletal(ctx, 10, 5, 'triangle_trapped', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
      } else if (state.submission === 'rnc_attempt') {
        // Player taking opponent's back and choking
        drawFighterSkeletal(ctx, -5, 15, 'back_seated', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
        drawFighterSkeletal(ctx, -12, 5, 'choking_back', fighter, playerBelt);
      } else if (state.submission === 'guillotine_attempt') {
        // Front headlock snapped down
        drawFighterSkeletal(ctx, -15, 10, 'standing_choke', fighter, playerBelt);
        drawFighterSkeletal(ctx, 15, 20, 'bent_neck', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
      } else {
        // Ezekiel choking from mount
        drawFighterSkeletal(ctx, 0, 30, 'horizontal', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
        drawFighterSkeletal(ctx, -5, 5, 'mount_choke', fighter, playerBelt);
      }
    } else {
      // 2. STABLE NEUTRAL GRAPPLING POSITIONS
      if (state.position === 'guard') {
        // Closed Guard
        drawFighterSkeletal(ctx, -20, 25, 'horizontal', fighter, playerBelt);
        drawFighterSkeletal(ctx, 10, 10, 'guard_top', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
      } else if (state.position === 'side_control') {
        // Side Control
        drawFighterSkeletal(ctx, 0, 25, 'horizontal', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
        drawFighterSkeletal(ctx, -5, 10, 'side_top', fighter, playerBelt);
      } else if (state.position === 'mount') {
        // Full Mount
        drawFighterSkeletal(ctx, 0, 25, 'horizontal', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
        drawFighterSkeletal(ctx, -2, -5, 'mount_top', fighter, playerBelt);
      } else {
        // Back Control (Neutral seatbelt hooks)
        drawFighterSkeletal(ctx, 5, 20, 'seated', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
        drawFighterSkeletal(ctx, -10, 15, 'back_hooks', fighter, playerBelt);
      }
    }

    ctx.restore();
  };

  // Helper to draw realistic stick-vector joints
  const drawFighterSkeletal = (
    ctx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    pose: string,
    style: FighterStyle,
    beltColorHex: string
  ) => {
    ctx.save();
    ctx.translate(dx, dy);

    // Gender adjustments
    const torsoWidth = style.gender === 'male' ? 14 : style.gender === 'female' ? 10 : 12;

    // Draw Gi jacket body
    ctx.fillStyle = style.skinColor === '#9d4edd' ? '#21132f' : '#ffffff'; // White gi for player, dark gi for opponent
    ctx.strokeStyle = style.skinColor === '#9d4edd' ? '#9d4edd' : '#cbd5e1';
    ctx.lineWidth = 1.5;

    // Heads and Joints positions mapping
    let headX = 0, headY = -35;
    let spineX = 0, spineY = 0;
    let armLX = -18, armLY = -15;
    let armRX = 18, armRY = -15;
    let legLX = -12, legLY = 25;
    let legRX = 12, legRY = 25;

    if (pose === 'horizontal') {
      headX = -45; headY = 22;
      spineX = 0; spineY = 25;
      armLX = -30; armLY = 10;
      armRX = -10; armRY = 10;
      legLX = 25; legLY = 15;
      legRX = 25; legRY = 32;
    } else if (pose === 'guard_top') {
      headX = -12; headY = -22;
      spineX = 10; spineY = 15;
      armLX = -18; armLY = 12;
      armRX = -5; armRY = 14;
      legLX = 15; legLY = 32;
      legRX = 5; legRY = 35;
    } else if (pose === 'side_top') {
      headX = -15; headY = 5;
      spineX = 15; spineY = 10;
      armLX = -15; armLY = 20;
      armRX = 5; armRY = -5;
    } else if (pose === 'mount_top') {
      headX = -2; headY = -35;
      spineX = 0; spineY = -10;
      armLX = -15; armLY = 5;
      armRX = 15; armRY = 5;
      legLX = -15; legLY = 20;
      legRX = 15; legRY = 20;
    } else if (pose === 'seated') {
      headX = 5; headY = -30;
      spineX = 0; spineY = 10;
      armLX = -12; armLY = -10;
      armRX = 12; armRY = -10;
    } else if (pose === 'back_hooks') {
      headX = -5; headY = -32;
      spineX = -10; spineY = 5;
      armLX = 10; armLY = -12;
      armRX = -10; armRY = -5;
      legLX = 8; legLY = 15;
      legRX = 8; legRY = 25;
    } else if (pose === 'triangle_trapped') {
      headX = -15; headY = 12;
      spineX = 10; spineY = 15;
      armLX = -12; armLY = 22;
      armRX = 5; armRY = 5;
    } else if (pose === 'choking_back') {
      headX = -2; headY = -35;
      spineX = -8; spineY = 8;
      armLX = 15; armLY = -25; // choking wraps!
      armRX = 2; armRY = -25;
    }

    // Draw Head
    ctx.fillStyle = style.skinColor;
    ctx.beginPath();
    ctx.arc(headX, headY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw Hair Style dynamically!
    ctx.fillStyle = style.hairColor;
    if (style.hairStyle === 'spiky') {
      ctx.beginPath();
      ctx.moveTo(headX - 8, headY - 4);
      ctx.lineTo(headX - 12, headY - 14);
      ctx.lineTo(headX - 4, headY - 8);
      ctx.lineTo(headX, headY - 16);
      ctx.lineTo(headX + 4, headY - 8);
      ctx.lineTo(headX + 12, headY - 14);
      ctx.lineTo(headX + 8, headY - 4);
      ctx.fill();
    } else if (style.hairStyle === 'mohawk') {
      ctx.beginPath();
      ctx.moveTo(headX - 2, headY - 8);
      ctx.lineTo(headX - 4, headY - 16);
      ctx.lineTo(headX, headY - 18);
      ctx.lineTo(headX + 4, headY - 16);
      ctx.lineTo(headX + 2, headY - 8);
      ctx.fill();
    } else if (style.hairStyle === 'afro') {
      ctx.beginPath();
      ctx.arc(headX, headY - 6, 8, 0, Math.PI * 2);
      ctx.arc(headX - 6, headY - 3, 6, 0, Math.PI * 2);
      ctx.arc(headX + 6, headY - 3, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (style.hairStyle === 'short') {
      ctx.beginPath();
      ctx.arc(headX, headY - 3, 9, Math.PI, 0);
      ctx.fill();
    } else if (style.hairStyle === 'long') {
      ctx.beginPath();
      ctx.arc(headX, headY - 3, 9, Math.PI, 0);
      ctx.fill();
      // Flowing tail
      ctx.beginPath();
      ctx.moveTo(headX - 8, headY - 2);
      ctx.quadraticCurveTo(headX - 12, headY + 12, headX - 6, headY + 16);
      ctx.quadraticCurveTo(headX - 6, headY + 10, headX - 8, headY - 2);
      ctx.fill();
    } else if (style.hairStyle === 'buns') {
      ctx.beginPath();
      ctx.arc(headX - 8, headY - 8, 4, 0, Math.PI * 2);
      ctx.arc(headX + 8, headY - 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Torso Gi
    ctx.strokeStyle = style.skinColor === '#9d4edd' ? '#7209b7' : '#e2e8f0';
    ctx.fillStyle = style.skinColor === '#9d4edd' ? '#140c1e' : '#ffffff';
    ctx.beginPath();
    if (pose === 'horizontal') {
      ctx.ellipse(spineX - 10, spineY, 20, torsoWidth, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(spineX, spineY - 10, torsoWidth, 18, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();

    // Draw the BJJ Belt Rank
    ctx.strokeStyle = beltColorHex;
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (pose === 'horizontal') {
      ctx.moveTo(spineX - 5, spineY - 8);
      ctx.lineTo(spineX - 5, spineY + 8);
    } else {
      ctx.moveTo(spineX - torsoWidth, spineY - 2);
      ctx.lineTo(spineX + torsoWidth, spineY - 2);
    }
    ctx.stroke();

    // Tiny belt knot decoration
    ctx.fillStyle = beltColorHex;
    ctx.beginPath();
    if (pose === 'horizontal') {
      ctx.arc(spineX - 5, spineY, 4, 0, Math.PI*2);
    } else {
      ctx.arc(spineX, spineY - 2, 4, 0, Math.PI*2);
    }
    ctx.fill();

    // Draw Limbs (Hands/Feet)
    ctx.strokeStyle = style.skinColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    // Draw Left Arm (from shoulder to armLX, armLY)
    ctx.moveTo(spineX - torsoWidth + 2, spineY - 10);
    ctx.lineTo(armLX, armLY);
    
    // Draw Right Arm (from shoulder to armRX, armRY)
    ctx.moveTo(spineX + torsoWidth - 2, spineY - 10);
    ctx.lineTo(armRX, armRY);

    // Only draw legs if they are horizontal or we are drawing them
    // Draw Left Leg (from hip to legLX, legLY)
    ctx.moveTo(spineX - 6, spineY + 8);
    ctx.lineTo(legLX, legLY);

    // Draw Right Leg (from hip to legRX, legRY)
    ctx.moveTo(spineX + 6, spineY + 8);
    ctx.lineTo(legRX, legRY);

    ctx.stroke();

    ctx.restore();
  };

  // Draw the DDR scrolling highway
  const drawRhythmHighway = (ctx: CanvasRenderingContext2D, songTime: number) => {
    const laneWidth = dimensions.width / 4;
    const targetY = dimensions.height - 130;
    const directions: DDRDirection[] = ['left', 'down', 'up', 'right'];
    const colors = ['var(--neon-pink)', 'var(--neon-cyan)', 'var(--neon-green)', 'var(--neon-yellow)'];
    const icons = ['←', '↓', '↑', '→'];
    const actions = ['SHRIMP', 'SPRAWL', 'POSTURE', 'SWEEP'];

    ctx.save();

    // Draw Lane Dividers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 120); // starts below grappling panel
      ctx.lineTo(i * laneWidth, dimensions.height);
      ctx.stroke();
    }

    // Draw Static Targets (Bottom arrows recepticle)
    directions.forEach((_, i) => {
      const x = i * laneWidth + laneWidth / 2;

      // Draw glowing background target rings
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, targetY, 20, 0, Math.PI * 2);
      ctx.stroke();

      // Inside Target arrow representation
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icons[i], x, targetY);

      // Label BJJ Actions
      ctx.fillStyle = '#64748b';
      ctx.font = '8px monospace';
      ctx.fillText(actions[i], x, targetY + 30);
    });

    // Draw SCROLLING NOTES
    if (song && matchStateRef.current.gameStatus === 'playing') {
      const scrollSpeed = 330; // pixels per second scrolling speed

      song.notes.forEach((note) => {
        if (note.hit) return; // skip hit notes

        const laneIndex = directions.indexOf(note.direction);
        const x = laneIndex * laneWidth + laneWidth / 2;
        
        // Calculate dynamic scroll placement
        const timeDiff = note.time - songTime;
        const y = targetY - timeDiff * scrollSpeed;

        // Skip rendering notes that are way off the top screen
        if (y < 120 || y > dimensions.height) return;

        // Draw the scrolling beat arrow
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = colors[laneIndex];

        // Draw note circle wrapper
        ctx.fillStyle = colors[laneIndex];
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();

        // Draw icon overlay
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icons[laneIndex], x, y);

        ctx.restore();
      });
    }

    ctx.restore();
  };

  // Draw fading, floaty text sparks (Perfect, Great, Ok, Miss)
  const drawFloatingTexts = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    floatingTextsRef.current.forEach((item) => {
      ctx.fillStyle = item.color;
      ctx.font = `bold ${Math.floor(13 * item.scale)}px monospace`;
      ctx.textAlign = 'center';
      
      // Add neon overlay glow
      ctx.shadowBlur = 5;
      ctx.shadowColor = item.color;
      
      ctx.globalAlpha = item.opacity;
      ctx.fillText(item.text, item.x, item.y);

      // float upwards and fade
      item.y -= 1.2;
      item.opacity -= 0.035;
    });

    // Remove dead animations
    floatingTextsRef.current = floatingTextsRef.current.filter((item) => item.opacity > 0);
    ctx.restore();
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  );
});
