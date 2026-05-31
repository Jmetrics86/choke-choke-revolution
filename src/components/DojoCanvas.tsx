import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { SongBlueprint, FighterStyle, MatchState, DDRDirection } from '../types/game';
import { audio } from '../utils/AudioEngine';

interface DojoCanvasProps {
  song: SongBlueprint | null;
  fighter: FighterStyle;
  matchState: MatchState;
  onNoteHit: (direction: DDRDirection, scoreAdd: number, result: 'oss' | 'good' | 'meh') => void;
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
  const fighterCanvasRef = useRef<HTMLCanvasElement>(null);
  const rhythmCanvasRef = useRef<HTMLCanvasElement>(null);

  const [fighterDim, setFighterDim] = useState({ width: 400, height: 250 });
  const [rhythmDim, setRhythmDim] = useState({ width: 380, height: 500 });
  
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const matchStateRef = useRef<MatchState>(matchState);

  // Keep latest state in ref to avoid re-binding loops
  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);

  // Expose the handleHitAttempt function so parent screen can call it via ref
  useImperativeHandle(ref, () => ({
    handleHitAttempt(direction: DDRDirection) {
      handleHitAttempt(direction);
    }
  }));

  // Resize handler to individually scale both canvases based on their parents
  useEffect(() => {
    if (!containerRef.current || !fighterCanvasRef.current || !rhythmCanvasRef.current) return;

    const measureAndResize = () => {
      if (fighterCanvasRef.current && rhythmCanvasRef.current) {
        const fRect = fighterCanvasRef.current.parentElement?.getBoundingClientRect();
        const rRect = rhythmCanvasRef.current.parentElement?.getBoundingClientRect();
        if (fRect) {
          setFighterDim({ width: fRect.width, height: fRect.height });
        }
        if (rRect) {
          setRhythmDim({ width: rRect.width, height: rRect.height });
        }
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      measureAndResize();
    });

    resizeObserver.observe(containerRef.current);
    
    // Initial measure trigger with slight delay to ensure browser layout is stable
    const timer = setTimeout(measureAndResize, 150);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
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
        onTriggerMobileTouch(direction); // Flashes virtual buttons
        handleHitAttempt(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [song, rhythmDim]);

  // Attempt to hit scrolling note on keyboard press or mobile tap
  const handleHitAttempt = (direction: DDRDirection) => {
    if (!song) return;
    const songTime = audio.getCurrentTime(matchStateRef.current.calibrationOffset);
    const targetY = rhythmDim.height - 110;

    // Find the earliest unhit note in the correct direction
    const note = song.notes.find(
      (n) => !n.hit && n.direction === direction && Math.abs(n.time - songTime) < 0.20
    );

    if (note) {
      const diff = Math.abs(note.time - songTime);
      note.hit = true;

      let result: 'oss' | 'good' | 'meh' = 'meh';
      let scoreAdd = 50;
      let color = 'var(--neon-pink)';

      if (diff <= 0.045) {
        result = 'oss';
        scoreAdd = 200;
        color = 'var(--neon-green)';
        
        // Rhythmic "OSS!" shoutout chance!
        if (Math.random() < 0.4) {
          audio.speakCoach("OSS!");
        }
      } else if (diff <= 0.09) {
        result = 'good';
        scoreAdd = 100;
        color = 'var(--neon-cyan)';
      } else {
        result = 'meh';
        scoreAdd = 50;
        color = 'var(--neon-pink)';
      }

      note.hitResult = result;
      onNoteHit(direction, scoreAdd, result);

      // Trigger visual hit spark text
      const laneIndex = ['left', 'down', 'up', 'right'].indexOf(direction);
      const laneWidth = rhythmDim.width / 4;
      const x = laneIndex * laneWidth + laneWidth / 2;

      floatingTextsRef.current.push({
        text: result === 'oss' ? 'OSS!' : result.toUpperCase(),
        color,
        x,
        y: targetY - 20,
        opacity: 1,
        scale: result === 'oss' ? 1.5 : 1.1,
      });
    } else {
      // Ghost tap / Miss
      onNoteMiss();
    }
  };

  // Main Canvas Rendering Loop
  useEffect(() => {
    const fCanvas = fighterCanvasRef.current;
    const rCanvas = rhythmCanvasRef.current;
    if (!fCanvas || !rCanvas) return;

    const fCtx = fCanvas.getContext('2d');
    const rCtx = rCanvas.getContext('2d');
    if (!fCtx || !rCtx) return;

    // Handle high DPI retina screens
    const dpr = window.devicePixelRatio || 1;
    
    fCanvas.width = fighterDim.width * dpr;
    fCanvas.height = fighterDim.height * dpr;
    fCtx.scale(dpr, dpr);

    rCanvas.width = rhythmDim.width * dpr;
    rCanvas.height = rhythmDim.height * dpr;
    rCtx.scale(dpr, dpr);

    let animationFrameId: number;

    const draw = () => {
      const state = matchStateRef.current;
      const songTime = song ? audio.getCurrentTime(state.calibrationOffset) : 0;

      // ─── 1. Draw Fighter Canvas ───
      fCtx.fillStyle = '#0e0f14';
      fCtx.fillRect(0, 0, fighterDim.width, fighterDim.height);
      drawDojoGrid(fCtx, songTime, fighterDim.width, fighterDim.height);
      drawBJJGrapplers(fCtx, songTime, state, fighterDim.width, fighterDim.height);

      // ─── 2. Draw Rhythm Canvas ───
      rCtx.fillStyle = '#07080b';
      rCtx.fillRect(0, 0, rhythmDim.width, rhythmDim.height);
      drawRhythmHighway(rCtx, songTime, rhythmDim.width, rhythmDim.height);
      drawFloatingTexts(rCtx);

      // ─── 3. Process Automatic Note Misses ───
      if (song && state.gameStatus === 'playing') {
        const targetY = rhythmDim.height - 110;
        song.notes.forEach((note) => {
          if (!note.hit && songTime > note.time + 0.16) {
            note.hit = true;
            note.hitResult = 'miss';
            onNoteMiss();

            // Trigger floaty MISS text
            const laneIndex = ['left', 'down', 'up', 'right'].indexOf(note.direction);
            const laneWidth = rhythmDim.width / 4;
            const x = laneIndex * laneWidth + laneWidth / 2;

            floatingTextsRef.current.push({
              text: 'MEH...',
              color: 'var(--neon-pink)',
              x,
              y: targetY - 20,
              opacity: 1,
              scale: 0.9,
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
  }, [fighterDim, rhythmDim, song]);

  // Draw full-canvas cyber dojo grid
  const drawDojoGrid = (ctx: CanvasRenderingContext2D, songTime: number, width: number, height: number) => {
    ctx.save();
    
    // Background glow
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#090a0f');
    grad.addColorStop(1, '#12131c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Rhythmic pulse grid
    const pulse = Math.sin(songTime * Math.PI * 2) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(114, 9, 183, ${0.12 + pulse * 0.08})`;
    ctx.lineWidth = 1;

    // Perspective lines radiating outward
    const lineCount = 10;
    const startY = height * 0.25; // Horizon line at 25% height
    for (let i = 0; i <= lineCount; i++) {
      const xRatio = i / lineCount;
      const startX = width * xRatio;
      const endX = (startX - width / 2) * 2.2 + width / 2;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, height);
      ctx.stroke();
    }

    // Horizontal lines spacing closer together near horizon
    const horizLines = 7;
    for (let i = 0; i < horizLines; i++) {
      const yRatio = Math.pow(i / horizLines, 2); // perspective compression
      const y = startY + (height - startY) * yRatio;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Draw Custom Fighter + Opponent with dynamic coordinates
  const drawBJJGrapplers = (
    ctx: CanvasRenderingContext2D,
    songTime: number,
    state: MatchState,
    width: number,
    height: number
  ) => {
    const centerY = height / 2 + 15;
    const centerX = width / 2;

    ctx.save();

    // Beat bounce calculation
    const beatPhase = (songTime * (song ? song.bpm : 120) / 60) % 1;
    const bounceY = Math.sin(beatPhase * Math.PI) * 4;

    // Extreme shake jitter for submission locks
    let shakeX = 0;
    let shakeY = 0;
    if (state.submission !== 'none') {
      const severity = state.isPlayerAttacking ? (state.chokeMeter / 100) : ((100 - state.chokeMeter) / 100);
      const intensity = 3 + severity * 7;
      shakeX = (Math.random() - 0.5) * intensity;
      shakeY = (Math.random() - 0.5) * intensity;
    }

    // Translate to center first, then apply dynamic scale factor based on screen height
    ctx.translate(centerX + shakeX, centerY + bounceY + shakeY);
    const scaleFactor = Math.max(1.0, Math.min(width, height) / 170);
    ctx.scale(scaleFactor, scaleFactor);

    // Dynamic tatami ground shadow
    const shadowGrad = ctx.createRadialGradient(0, 40, 1, 0, 40, 60);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 40, 60, 12, 0, 0, Math.PI * 2);
    ctx.fill();

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
    const opponentBelt = '#1a1a1a'; // Black belt opponent

    // Draw skeletal positions
    if (state.submission !== 'none') {
      if (state.submission === 'triangle_attempt') {
        drawFighterSkeletal(ctx, -20, 25, 'horizontal', fighter, playerBelt);
        drawFighterSkeletal(ctx, 10, 5, 'triangle_trapped', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
      } else if (state.submission === 'rnc_attempt') {
        drawFighterSkeletal(ctx, -5, 15, 'back_seated', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
        drawFighterSkeletal(ctx, -12, 5, 'choking_back', fighter, playerBelt);
      } else if (state.submission === 'guillotine_attempt') {
        drawFighterSkeletal(ctx, -15, 10, 'standing_choke', fighter, playerBelt);
        drawFighterSkeletal(ctx, 15, 20, 'bent_neck', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
      } else {
        drawFighterSkeletal(ctx, 0, 30, 'horizontal', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
        drawFighterSkeletal(ctx, -5, 5, 'mount_choke', fighter, playerBelt);
      }
    } else {
      if (state.position === 'guard') {
        drawFighterSkeletal(ctx, -20, 25, 'horizontal', fighter, playerBelt);
        drawFighterSkeletal(ctx, 10, 10, 'guard_top', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
      } else if (state.position === 'side_control') {
        drawFighterSkeletal(ctx, 0, 25, 'horizontal', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
        drawFighterSkeletal(ctx, -5, 10, 'side_top', fighter, playerBelt);
      } else if (state.position === 'mount') {
        drawFighterSkeletal(ctx, 0, 25, 'horizontal', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
        drawFighterSkeletal(ctx, -2, -5, 'mount_top', fighter, playerBelt);
      } else {
        drawFighterSkeletal(ctx, 5, 20, 'seated', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt);
        drawFighterSkeletal(ctx, -10, 15, 'back_hooks', fighter, playerBelt);
      }
    }

    ctx.restore();
  };

  // Draw beautiful BJJ joint sticks
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

    const torsoWidth = style.gender === 'male' ? 14 : style.gender === 'female' ? 10 : 12;

    ctx.fillStyle = style.skinColor === '#9d4edd' ? '#21132f' : '#ffffff'; // White gi vs Dark gi
    ctx.strokeStyle = style.skinColor === '#9d4edd' ? '#9d4edd' : '#cbd5e1';
    ctx.lineWidth = 1.5;

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
      armLX = 15; armLY = -25;
      armRX = 2; armRY = -25;
    }

    // Draw Head
    ctx.fillStyle = style.skinColor;
    ctx.beginPath();
    ctx.arc(headX, headY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw Hair Style dynamically
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
      ctx.arc(spineX - 5, spineY, 4, 0, Math.PI * 2);
    } else {
      ctx.arc(spineX, spineY - 2, 4, 0, Math.PI * 2);
    }
    ctx.fill();

    // Draw Limbs
    ctx.strokeStyle = style.skinColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    // Left Arm
    ctx.moveTo(spineX - torsoWidth + 2, spineY - 10);
    ctx.lineTo(armLX, armLY);
    
    // Right Arm
    ctx.moveTo(spineX + torsoWidth - 2, spineY - 10);
    ctx.lineTo(armRX, armRY);

    // Left Leg
    ctx.moveTo(spineX - 6, spineY + 8);
    ctx.lineTo(legLX, legLY);

    // Right Leg
    ctx.moveTo(spineX + 6, spineY + 8);
    ctx.lineTo(legRX, legRY);

    ctx.stroke();

    ctx.restore();
  };

  // Draw the compact, centered rhythm highway lanes
  const drawRhythmHighway = (ctx: CanvasRenderingContext2D, songTime: number, width: number, height: number) => {
    const laneWidth = width / 4;
    const targetY = height - 110;
    const directions: DDRDirection[] = ['left', 'down', 'up', 'right'];
    const colors = ['var(--neon-pink)', 'var(--neon-cyan)', 'var(--neon-green)', 'var(--neon-yellow)'];
    const icons = ['←', '↓', '↑', '→'];
    const actions = ['SHRIMP', 'SPRAWL', 'POSTURE', 'SWEEP'];

    ctx.save();

    // Draw Lane Dividers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, height);
      ctx.stroke();
    }

    // Draw Static Targets (Bottom arrows receptors)
    directions.forEach((_, i) => {
      const x = i * laneWidth + laneWidth / 2;

      // Draw glowing background target rings in lane neon colors
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, targetY, 20, 0, Math.PI * 2);
      ctx.stroke();

      // Inside Target arrow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icons[i], x, targetY);

      // Label BJJ Actions
      ctx.fillStyle = '#475569';
      ctx.font = '9px monospace';
      ctx.fillText(actions[i], x, targetY + 32);
    });

    // Draw SCROLLING NOTES
    if (song && matchStateRef.current.gameStatus === 'playing') {
      const scrollSpeed = 330; // pixels per second

      song.notes.forEach((note) => {
        if (note.hit) return;

        const laneIndex = directions.indexOf(note.direction);
        const x = laneIndex * laneWidth + laneWidth / 2;
        
        const timeDiff = note.time - songTime;
        const y = targetY - timeDiff * scrollSpeed;

        if (y < -30 || y > height) return;

        ctx.save();
        ctx.shadowBlur = 9;
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

  // Draw fading, floaty text sparks
  const drawFloatingTexts = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    floatingTextsRef.current.forEach((item) => {
      ctx.fillStyle = item.color;
      ctx.font = `bold ${Math.floor(14 * item.scale)}px monospace`;
      ctx.textAlign = 'center';
      
      ctx.shadowBlur = 6;
      ctx.shadowColor = item.color;
      
      ctx.globalAlpha = item.opacity;
      ctx.fillText(item.text, item.x, item.y);

      item.y -= 1.3;
      item.opacity -= 0.032;
    });

    // Filter alive texts
    floatingTextsRef.current = floatingTextsRef.current.filter((item) => item.opacity > 0);
    ctx.restore();
  };

  // Convert position IDs to pretty labels
  const getPositionLabel = (pos: string) => {
    switch (pos) {
      case 'guard': return '🥋 Closed Guard';
      case 'side_control': return '🤼 Side Control';
      case 'mount': return '🌋 Full Mount';
      case 'back_control': return '🎒 Back Control';
      default: return '';
    }
  };

  return (
    <div ref={containerRef} className="gameplay-layout">
      
      {/* 1. Fighter/Dojo Animation Panel */}
      <div className="animation-panel">
        <canvas ref={fighterCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        
        {/* Stat panel overlay inside canvas */}
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          background: 'rgba(11, 12, 16, 0.85)',
          padding: '10px',
          borderRadius: '6px',
          border: '1px solid #1e2937',
          fontSize: '11px',
          pointerEvents: 'none',
          zIndex: 5
        }}>
          <div style={{ color: 'var(--text-muted)' }}>POSITION: <span style={{ color: '#fff', fontWeight: 'bold' }}>{getPositionLabel(matchState.position)}</span></div>
          <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>SCORE: <span style={{ color: 'var(--neon-yellow)', fontWeight: 'bold' }}>{matchState.score}</span></div>
          <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>COMBO: <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{matchState.comboCount}</span></div>
        </div>
      </div>

      {/* 2. Centered Rhythm Highway Panel */}
      <div className="rhythm-panel">
        <div className="rhythm-highway-container">
          <canvas ref={rhythmCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
      </div>

    </div>
  );
});
