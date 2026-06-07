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
  handleTouchStart: (direction: DDRDirection) => void;
  handleTouchEnd: (direction: DDRDirection) => void;
}

interface FloatingText {
  text: string;
  color: string;
  x: number;
  y: number;
  opacity: number;
  scale: number;
}

interface HitParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  opacity: number;
}

const getTargetY = (h: number) => h > 350 ? h - 110 : h - 75;

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

  // Active inputs tracker (Keyboard and Touch presses)
  const activeKeysRef = useRef<Record<DDRDirection, boolean>>({
    left: false,
    down: false,
    up: false,
    right: false,
  });

  // Particle list reference for visual spark explosions
  const particlesRef = useRef<HitParticle[]>([]);

  // Keep latest state in ref to avoid re-binding loops
  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);

  // Expose the input triggers to the parent screen (mobile buttons use these)
  useImperativeHandle(ref, () => ({
    handleHitAttempt(direction: DDRDirection) {
      handleHitAttempt(direction);
    },
    handleTouchStart(direction: DDRDirection) {
      activeKeysRef.current[direction] = true;
    },
    handleTouchEnd(direction: DDRDirection) {
      activeKeysRef.current[direction] = false;
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
        
        // Prevent keyboard auto-repeat from triggering multiple ghost taps
        if (!activeKeysRef.current[direction]) {
          activeKeysRef.current[direction] = true;
          handleHitAttempt(direction);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      let direction: DDRDirection | null = null;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') direction = 'left';
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') direction = 'down';
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') direction = 'up';
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') direction = 'right';

      if (direction) {
        activeKeysRef.current[direction] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [song, rhythmDim]);

  // Spawn visual particle explosions on successful hits
  const spawnHitExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 4.0;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 4,
        opacity: 1.0,
      });
    }
  };

  // Spawn continuous minor sparks for hold notes
  const spawnHoldSpark = (x: number, y: number, color: string) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.6 + Math.random() * 1.8;
    particlesRef.current.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 1.5 + Math.random() * 2.2,
      opacity: 0.8,
    });
  };

  // Attempt to hit scrolling note on keyboard press or mobile tap
  const handleHitAttempt = (direction: DDRDirection) => {
    if (!song) return;
    const songTime = audio.getCurrentTime(matchStateRef.current.calibrationOffset);
    const targetY = getTargetY(rhythmDim.height);

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

      // Trigger visual hit spark text and neon explosion!
      const laneIndex = ['left', 'down', 'up', 'right'].indexOf(direction);
      const laneWidth = rhythmDim.width / 4;
      const x = laneIndex * laneWidth + laneWidth / 2;

      spawnHitExplosion(x, targetY, ['var(--neon-pink)', 'var(--neon-cyan)', 'var(--neon-green)', 'var(--neon-yellow)'][laneIndex]);

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

  // Continuous hold notes evaluation & progress check
  const processHoldNotes = (songTime: number) => {
    if (!song) return;
    const targetY = getTargetY(rhythmDim.height);
    const directions: DDRDirection[] = ['left', 'down', 'up', 'right'];
    const colors = ['var(--neon-pink)', 'var(--neon-cyan)', 'var(--neon-green)', 'var(--neon-yellow)'];

    song.notes.forEach((note) => {
      // Check for hold notes currently being held down by the user
      if (note.isHold && note.hit && note.hitResult !== 'miss' && !note.holdScoreCollected) {
        const holdEnd = note.time + (note.holdDuration || 0);

        if (songTime >= note.time && songTime <= holdEnd) {
          // Player must actively keep the key pressed!
          const isHolding = activeKeysRef.current[note.direction];
          if (isHolding && !note.holdReleasedEarly) {
            // Success holding! Spawn electrical sparks!
            const laneIndex = directions.indexOf(note.direction);
            const laneWidth = rhythmDim.width / 4;
            const x = laneIndex * laneWidth + laneWidth / 2;
            
            spawnHoldSpark(x, targetY, colors[laneIndex]);
          } else {
            // Player let go too early
            if (!note.holdReleasedEarly) {
              note.holdReleasedEarly = true;
            }
          }
        } else if (songTime > holdEnd) {
          // Hold note just completed! Assess success
          note.holdScoreCollected = true;
          
          const isHoldingAtEnd = activeKeysRef.current[note.direction];
          const success = !note.holdReleasedEarly && isHoldingAtEnd;

          // Award final big holding bonus on success!
          const result = success ? 'oss' : 'meh';
          const scoreAdd = success ? 250 : 0;
          const color = success ? 'var(--neon-green)' : 'var(--neon-pink)';

          onNoteHit(note.direction, scoreAdd, result);

          // Spawn a massive final explosion!
          const laneIndex = directions.indexOf(note.direction);
          const laneWidth = rhythmDim.width / 4;
          const x = laneIndex * laneWidth + laneWidth / 2;

          if (success) {
            spawnHitExplosion(x, targetY, colors[laneIndex]);
            audio.playSFX('oss');
          }

          floatingTextsRef.current.push({
            text: success ? 'HOLD OSS!' : 'RELEASED EARLY',
            color,
            x,
            y: targetY - 30,
            opacity: 1,
            scale: success ? 1.5 : 0.9,
          });
        }
      }
    });
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
      updateAndDrawParticles(rCtx);
      drawFloatingTexts(rCtx);

      // Process Hold Notes hold-state scoring
      if (song && state.gameStatus === 'playing') {
        processHoldNotes(songTime);
      }

      // ─── 3. Process Automatic Note Misses ───
      if (song && state.gameStatus === 'playing') {
        const targetY = getTargetY(rhythmDim.height);
        song.notes.forEach((note) => {
          // If normal note or hold head passes without tapping, register miss
          const gracePeriod = note.isHold ? 0.18 : 0.16;
          if (!note.hit && songTime > note.time + gracePeriod) {
            note.hit = true;
            note.hitResult = 'miss';
            onNoteMiss();

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

  // Update physics and draw spark particles
  const updateAndDrawParticles = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    particlesRef.current.forEach((p) => {
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Physics update
      p.x += p.vx;
      p.y += p.vy;
      p.opacity -= 0.04;
      p.size *= 0.95;
    });

    // Clean dead particles
    particlesRef.current = particlesRef.current.filter((p) => p.opacity > 0 && p.size > 0.1);
    ctx.restore();
  };

  // Draw full-canvas cyber dojo grid
  const drawDojoGrid = (ctx: CanvasRenderingContext2D, songTime: number, width: number, height: number) => {
    ctx.save();
    
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#090a0f');
    grad.addColorStop(1, '#12131c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const pulse = Math.sin(songTime * Math.PI * 2) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(114, 9, 183, ${0.12 + pulse * 0.08})`;
    ctx.lineWidth = 1;

    const lineCount = 10;
    const startY = height * 0.25;
    for (let i = 0; i <= lineCount; i++) {
      const xRatio = i / lineCount;
      const startX = width * xRatio;
      const endX = (startX - width / 2) * 2.2 + width / 2;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, height);
      ctx.stroke();
    }

    const horizLines = 7;
    for (let i = 0; i < horizLines; i++) {
      const yRatio = Math.pow(i / horizLines, 2);
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

    const beatPhase = (songTime * (song ? song.bpm : 120) / 60) % 1;
    const bounceY = Math.sin(beatPhase * Math.PI) * 4;

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

    // Dynamic blocky tatami ground shadow (composed of rectangles)
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(-35, 36, 70, 6);

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
    const opponentBelt = '#1a1a1a';

    if (state.submission !== 'none') {
      if (state.submission === 'triangle_attempt') {
        drawFighterSkeletal(ctx, -20, 25, 'horizontal', fighter, playerBelt, songTime, true);
        drawFighterSkeletal(ctx, 10, 5, 'triangle_trapped', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt, songTime, false);
      } else if (state.submission === 'rnc_attempt') {
        drawFighterSkeletal(ctx, -5, 15, 'back_seated', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt, songTime, false);
        drawFighterSkeletal(ctx, -12, 5, 'choking_back', fighter, playerBelt, songTime, true);
      } else if (state.submission === 'guillotine_attempt') {
        drawFighterSkeletal(ctx, -15, 10, 'standing_choke', fighter, playerBelt, songTime, true);
        drawFighterSkeletal(ctx, 15, 20, 'bent_neck', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt, songTime, false);
      } else {
        drawFighterSkeletal(ctx, 0, 30, 'horizontal', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt, songTime, false);
        drawFighterSkeletal(ctx, -5, 5, 'mount_choke', fighter, playerBelt, songTime, true);
      }
    } else {
      if (state.position === 'guard') {
        drawFighterSkeletal(ctx, -20, 25, 'horizontal', fighter, playerBelt, songTime, true);
        drawFighterSkeletal(ctx, 10, 10, 'guard_top', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt, songTime, false);
      } else if (state.position === 'side_control') {
        drawFighterSkeletal(ctx, 0, 25, 'horizontal', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt, songTime, false);
        drawFighterSkeletal(ctx, -5, 10, 'side_top', fighter, playerBelt, songTime, true);
      } else if (state.position === 'mount') {
        drawFighterSkeletal(ctx, 0, 25, 'horizontal', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt, songTime, false);
        drawFighterSkeletal(ctx, -2, -5, 'mount_top', fighter, playerBelt, songTime, true);
      } else {
        drawFighterSkeletal(ctx, 5, 20, 'seated', { gender: 'male', hairStyle: 'bald', hairColor: '#000', skinColor: '#9d4edd', beltColor: 'black' }, opponentBelt, songTime, false);
        drawFighterSkeletal(ctx, -10, 15, 'back_hooks', fighter, playerBelt, songTime, true);
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
    beltColorHex: string,
    songTime: number,
    isPlayer = false
  ) => {
    ctx.save();
    ctx.translate(dx, dy);

    const torsoWidth = style.gender === 'male' ? 14 : style.gender === 'female' ? 10 : 12;

    ctx.fillStyle = style.skinColor === '#9d4edd' ? '#21132f' : '#ffffff';
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
      legLX = 30; legLY = 18;
      legRX = 25; legRY = 30;
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
      legLX = -14; legLY = 28;
      legRX = 14; legRY = 28;
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
      legLX = 22; legLY = 28;
      legRX = 18; legRY = 34;
    } else if (pose === 'choking_back') {
      headX = -2; headY = -35;
      spineX = -8; spineY = 8;
      armLX = 15; armLY = -25;
      armRX = 2; armRY = -25;
      legLX = -14; legLY = 25;
      legRX = 14; legRY = 25;
    } else if (pose === 'back_seated') {
      headX = 4; headY = -28;
      spineX = 0; spineY = 12;
      armLX = -10; armLY = 5;
      armRX = 10; armRY = 5;
      legLX = -15; legLY = 20;
      legRX = 15; legRY = 20;
    } else if (pose === 'standing_choke') {
      headX = -10; headY = -30;
      spineX = 5; spineY = -2;
      armLX = -15; armLY = -15;
      armRX = -5; armRY = -15;
      legLX = -10; legLY = 28;
      legRX = 10; legRY = 28;
    } else if (pose === 'bent_neck') {
      headX = -18; headY = -12;
      spineX = 8; spineY = 10;
      armLX = -10; armLY = 20;
      armRX = 12; armRY = 18;
      legLX = 5; legLY = 32;
      legRX = 15; legRY = 32;
    } else if (pose === 'mount_choke') {
      headX = -2; headY = -28;
      spineX = 0; spineY = -5;
      armLX = -8; armLY = 5;
      armRX = 8; armRY = 5;
      legLX = -18; legLY = 18;
      legRX = 18; legRY = 18;
    }

    // Breathing/idle dynamics based on song bpm
    const bpm = song ? song.bpm : 120;
    const idleCycle = songTime * (bpm / 60) * Math.PI * 2;
    const isChoking = matchStateRef.current.submission !== 'none';

    // 1. Organic swaying (Idle breathing)
    // Shift heads, spines, and arms slightly on the beat
    const breathFactor = isChoking ? 0.2 : 1.0;
    const headSway = Math.sin(idleCycle) * 1.5 * breathFactor;
    const spineStretch = Math.cos(idleCycle) * 0.8 * breathFactor;
    
    headX += headSway;
    headY += spineStretch;
    spineY += spineStretch;
    armLY += spineStretch * 0.5;
    armRY += spineStretch * 0.5;

    // 2. Submission Tension / Jitter
    if (isChoking) {
      // Create rapid adrenaline shakes in both characters when a choke is happening
      const jitterX = (Math.random() - 0.5) * 2.5;
      const jitterY = (Math.random() - 0.5) * 2.5;
      headX += jitterX;
      headY += jitterY;
      armLX += jitterX;
      armLY += jitterY;
      armRX += jitterX;
      armRY += jitterY;
      legLX += jitterX;
      legLY += jitterY;
      legRX += jitterX;
      legRY += jitterY;
    }

    // 3. Player Arrow Controls Interaction (Shrimp, Sprawl, Posture, Sweep)
    if (isPlayer) {
      const keys = activeKeysRef.current;
      
      if (keys.left) {
        // SHRIMP escape animation: retract legs & push out arms to frame, torso slides back
        spineX -= 6;
        headX -= 4;
        armLX -= 10; armLY -= 2;
        armRX -= 8; armRY -= 2;
        legLX += 8; legLY -= 6;
        legRX += 8; legRY -= 8;
      }
      if (keys.down) {
        // SPRAWL defense animation: drop torso low, extend legs straight and wide
        spineY += 6;
        headY += 4;
        armLX -= 4; armLY += 2;
        armRX += 4; armRY += 2;
        legLX -= 12; legLY += 10;
        legRX += 12; legRY += 10;
      }
      if (keys.up) {
        // POSTURE control animation: sit upright, push hands down onto opponent
        spineY -= 6;
        headY -= 10;
        armLX = spineX - 10; armLY = spineY + 12;
        armRX = spineX + 10; armRY = spineY + 12;
      }
      if (keys.right) {
        // SWEEP attack animation: rotating/swinging sweep legs, hands raised high in triumph
        armLY -= 12; armRY -= 12;
        const sweepPhase = Math.sin(songTime * 24);
        legLX += sweepPhase * 14;
        legRX += sweepPhase * 14;
      }
    }

    // ─── Draw Character Sprite (Strictly squares and rectangles, no circles/curves) ───

    // Head - perfect square
    ctx.fillStyle = style.skinColor;
    ctx.fillRect(headX - 8, headY - 8, 16, 16);

    // Hair - pure blocky hairstyles (no circles/curves)
    ctx.fillStyle = style.hairColor;
    if (style.hairStyle === 'spiky') {
      ctx.fillRect(headX - 9, headY - 12, 3, 4);
      ctx.fillRect(headX - 5, headY - 15, 3, 7);
      ctx.fillRect(headX - 1, headY - 17, 3, 9);
      ctx.fillRect(headX + 3, headY - 15, 3, 7);
      ctx.fillRect(headX + 6, headY - 12, 3, 4);
    } else if (style.hairStyle === 'mohawk') {
      ctx.fillRect(headX - 2, headY - 18, 4, 11);
      ctx.fillRect(headX - 1, headY - 20, 2, 2);
    } else if (style.hairStyle === 'afro') {
      ctx.fillRect(headX - 11, headY - 12, 22, 10); // center block
      ctx.fillRect(headX - 8, headY - 15, 16, 3);   // top block
      ctx.fillRect(headX - 11, headY - 7, 22, 7);   // side flare
    } else if (style.hairStyle === 'short') {
      ctx.fillRect(headX - 9, headY - 11, 18, 4); // top cap
      ctx.fillRect(headX - 9, headY - 11, 3, 9);  // left sideburn
      ctx.fillRect(headX + 6, headY - 11, 3, 9);  // right sideburn
    } else if (style.hairStyle === 'long') {
      ctx.fillRect(headX - 9, headY - 11, 18, 4); // top cap
      ctx.fillRect(headX - 10, headY - 11, 3, 20); // left lock
      ctx.fillRect(headX + 7, headY - 11, 3, 20);  // right lock
    } else if (style.hairStyle === 'buns') {
      ctx.fillRect(headX - 9, headY - 11, 18, 4);  // top cap
      ctx.fillRect(headX - 11, headY - 15, 4, 4);  // left bun
      ctx.fillRect(headX + 7, headY - 15, 4, 4);   // right bun
    }

    // Torso - Blocky rectangle
    ctx.strokeStyle = style.skinColor === '#9d4edd' ? '#7209b7' : '#e2e8f0';
    ctx.fillStyle = style.skinColor === '#9d4edd' ? '#140c1e' : '#ffffff';
    ctx.lineWidth = 1.5;
    if (pose === 'horizontal') {
      ctx.fillRect(spineX - 20, spineY - torsoWidth, 40, torsoWidth * 2);
      ctx.strokeRect(spineX - 20, spineY - torsoWidth, 40, torsoWidth * 2);
    } else {
      ctx.fillRect(spineX - torsoWidth, spineY - 19, torsoWidth * 2, 32);
      ctx.strokeRect(spineX - torsoWidth, spineY - 19, torsoWidth * 2, 32);
    }

    // Belt - thick line
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

    // Belt Knot - blocky knots
    ctx.fillStyle = beltColorHex;
    if (pose === 'horizontal') {
      ctx.fillRect(spineX - 8, spineY - 3, 6, 6);
      // Ribbon ties
      ctx.fillRect(spineX - 12, spineY - 5, 4, 4);
      ctx.fillRect(spineX - 12, spineY + 1, 4, 4);
    } else {
      ctx.fillRect(spineX - 3, spineY - 5, 6, 6);
      // Ribbon ties
      ctx.fillRect(spineX - 6, spineY - 2, 3, 8);
      ctx.fillRect(spineX + 3, spineY - 2, 3, 8);
    }

    // Limbs - blocky rectangular limbs
    ctx.strokeStyle = style.skinColor;
    ctx.lineWidth = 5.5; // Thicker, blockier limb joints
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    
    ctx.moveTo(spineX - torsoWidth + 2, spineY - 10);
    ctx.lineTo(armLX, armLY);
    
    ctx.moveTo(spineX + torsoWidth - 2, spineY - 10);
    ctx.lineTo(armRX, armRY);

    ctx.moveTo(spineX - 6, spineY + 8);
    ctx.lineTo(legLX, legLY);

    ctx.moveTo(spineX + 6, spineY + 8);
    ctx.lineTo(legRX, legRY);

    ctx.stroke();

    ctx.restore();
  };

  // Draw the compact, centered rhythm highway lanes
  const drawRhythmHighway = (ctx: CanvasRenderingContext2D, songTime: number, width: number, height: number) => {
    const laneWidth = width / 4;
    const targetY = getTargetY(height);
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

    // Draw SCROLLING NOTES (tails first so they render under the arrow heads!)
    if (song && matchStateRef.current.gameStatus === 'playing') {
      const scrollSpeed = 330; // pixels per second

      song.notes.forEach((note) => {
        const laneIndex = directions.indexOf(note.direction);
        const x = laneIndex * laneWidth + laneWidth / 2;

        if (note.isHold) {
          const holdEnd = note.time + (note.holdDuration || 0);

          if (songTime < holdEnd) {
            // Draw the hold tail body stretching upwards!
            const headY = targetY - (note.time - songTime) * scrollSpeed;
            const tailY = targetY - (holdEnd - songTime) * scrollSpeed;

            // Pin tail start to targets if actively held, otherwise float on the head
            const startY = note.hit ? targetY : headY;

            if (startY > tailY) {
              ctx.save();
              ctx.shadowBlur = 10;
              ctx.shadowColor = colors[laneIndex];

              // Glowing semi-transparent thick body
              ctx.strokeStyle = colors[laneIndex];
              ctx.lineWidth = 15;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(x, startY);
              ctx.lineTo(x, tailY);
              ctx.stroke();

              // Electrical solid white lightning core
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.moveTo(x, startY);
              ctx.lineTo(x, tailY);
              ctx.stroke();

              ctx.restore();
            }
          }
        }

        // Normal note head - skip if already successfully hit
        if (note.hit) return;

        const timeDiff = note.time - songTime;
        const y = targetY - timeDiff * scrollSpeed;

        if (y < -30 || y > height) return;

        ctx.save();
        ctx.shadowBlur = 9;
        ctx.shadowColor = colors[laneIndex];

        // Draw note square wrapper (Blocky aesthetic)
        ctx.fillStyle = colors[laneIndex];
        ctx.strokeStyle = '#ffffff'; // Added white border for high contrast
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.fillRect(x - 18, y - 18, 36, 36);
        ctx.strokeRect(x - 18, y - 18, 36, 36);
        ctx.fill();

        // Draw icon overlay (Brighter contrast)
        ctx.fillStyle = '#ffffff'; // White for better visibility against neon background
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icons[laneIndex], x, y);

        ctx.restore();
      });
    }

    // Draw Static Targets (Bottom arrows receptors)
    directions.forEach((dir, i) => {
      const x = i * laneWidth + laneWidth / 2;
      const isPressed = activeKeysRef.current[dir];
      const color = colors[i];

      ctx.save();
      
      if (isPressed) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
        
        // Glowing background fill
        ctx.fillStyle = color + '22';
        ctx.beginPath();
        ctx.arc(x, targetY, 23, 0, Math.PI * 2);
        ctx.fill();

        // Thickened active ring
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(x, targetY, 23, 0, Math.PI * 2);
        ctx.stroke();

        // Fully solid glowing arrow symbol
        ctx.fillStyle = color;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icons[i], x, targetY);
      } else {
        // Subtle column color indicator permanently active (No more boring gray!)
        ctx.strokeStyle = color + '55'; // 33% opacity ring
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(x, targetY, 20, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = color + '80'; // 50% opacity arrow symbol
        ctx.font = 'bold 21px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icons[i], x, targetY);
      }

      // Label BJJ Actions (glowing on active)
      ctx.fillStyle = isPressed ? '#ffffff' : '#475569';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(actions[i], x, targetY + (height > 350 ? 32 : 20));

      ctx.restore();
    });

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
