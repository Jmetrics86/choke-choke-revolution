import React, { useEffect, useState, useRef } from 'react';
import { SongBlueprint, FighterStyle, MatchState, DDRDirection } from '../types/game';
import { DojoCanvas, DojoCanvasRef } from './DojoCanvas';
import { audio } from '../utils/AudioEngine';
import { grappling } from '../utils/GrapplingEngine';

interface GameScreenProps {
  song: SongBlueprint;
  fighter: FighterStyle;
  onExit: () => void;
  calibrationOffset: number;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  song,
  fighter,
  onExit,
  calibrationOffset,
}) => {
  const [matchState, setMatchState] = useState<MatchState>({
    position: 'guard',
    submission: 'none',
    isPlayerAttacking: true,
    chokeMeter: 50, // 50 is center stalemate
    comboCount: 0,
    maxCombo: 0,
    score: 0,
    currentNoteIndex: 0,
    gameStatus: 'playing',
    selectedSongId: song.id,
    calibrationOffset,
  });

  const [coachMsg, setCoachMsg] = useState<string>("Breathe. Frame. Watch his posture.");
  const [activeButton, setActiveButton] = useState<DDRDirection | null>(null);
  const canvasRef = useRef<DojoCanvasRef>(null);

  // Start synthesizing the song when screen loads
  useEffect(() => {
    // Clear BJJ combo input buffer
    grappling.clearBuffer();

    // Reset song notes hit status
    song.notes.forEach((n) => {
      n.hit = false;
      n.hitResult = null;
    });

    audio.init().then(() => {
      audio.play(song);
      audio.speakCoach(`Let's grapple! Respect the tap.`);
    });

    return () => {
      audio.stop();
    };
  }, [song]);

  // Handle a timed note Hit
  const handleNoteHit = (direction: DDRDirection, scoreAdd: number, result: 'oss' | 'good' | 'meh') => {
    audio.playSFX(result); // Play dynamic hits SFX!
    
    // Tactile Feedback for Mobile
    if (navigator.vibrate) {
      if (result === 'oss') navigator.vibrate(20);
      else if (result === 'good') navigator.vibrate(15);
      else navigator.vibrate(40); // Stronger vibrate for misses
    }

    setMatchState((prev) => {
      const nextCombo = prev.comboCount + 1;
      const nextMaxCombo = Math.max(prev.maxCombo, nextCombo);
      // Combo multiplier for score: +20% score for every 10 combo hits
      const comboMultiplier = 1 + Math.floor(nextCombo / 10) * 0.2;
      const nextScore = prev.score + Math.round(scoreAdd * comboMultiplier);

      // Register hit in BJJ state machine
      const { nextState, message } = grappling.registerHit(direction, {
        ...prev,
        comboCount: nextCombo,
        maxCombo: nextMaxCombo,
        score: nextScore,
      });

      if (message) {
        setCoachMsg(message);
      }

      return nextState;
    });
  };

  // Handle a Miss / Ghost tap
  const handleNoteMiss = () => {
    if (navigator.vibrate) navigator.vibrate(60);
    setMatchState((prev) => {
      // Register miss in BJJ state machine
      const { nextState, message } = grappling.registerMiss(prev);

      if (message) {
        setCoachMsg(message);
      }

      return nextState;
    });
  };

  // Virtual mobile touch pad triggers
  const handleMobileTouch = (direction: DDRDirection) => {
    setActiveButton(direction);
    setTimeout(() => setActiveButton(null), 100);
  };

  const restartMatch = () => {
    grappling.clearBuffer(); // Clear BJJ combo input buffer
    setMatchState({
      position: 'guard',
      submission: 'none',
      isPlayerAttacking: true,
      chokeMeter: 50,
      comboCount: 0,
      maxCombo: 0,
      score: 0,
      currentNoteIndex: 0,
      gameStatus: 'playing',
      selectedSongId: song.id,
      calibrationOffset,
    });
    setCoachMsg("Match restarted! Protect your neck.");
    song.notes.forEach((n) => {
      n.hit = false;
      n.hitResult = null;
    });
    audio.stop();
    audio.play(song);
  };

  return (
    <div className="game-screen-container" style={{ background: '#07080b' }}>
      
      {/* ─── HUD TOP BAR ─── */}
      <div className="dojo-header" style={{ borderBottomColor: 'var(--neon-pink)' }}>
        <h1 className="logo-text" style={{ fontSize: '15px' }}>
          CCR 🥋 <span>{song.title}</span>
        </h1>
        <div className="coach-box" style={{ maxWidth: '65%', fontSize: '10px' }}>
          Coach: {coachMsg}
        </div>
      </div>

      {/* ─── DYNAMIC CHOKE-O-METER ─── */}
      <div style={{ padding: '8px 15px', background: '#0e0f14', borderBottom: '1px solid #1e2937' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '4px', textTransform: 'uppercase' }}>
          <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>Opponent Squeezing (Tap Him!)</span>
          <span style={{ color: 'var(--neon-pink)', fontWeight: 'bold' }}>You Choked (Escape!)</span>
        </div>
        <div style={{ position: 'relative', height: '18px', background: '#1c1e29', borderRadius: '9px', overflow: 'hidden', border: '1px solid #2d3142' }}>
          {/* Squeeze Zone Gradient */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to right, var(--neon-cyan) 0%, var(--neon-purple) 50%, var(--neon-pink) 100%)',
            opacity: 0.25
          }} />
          
          {/* Neutral Marker Center */}
          <div style={{ position: 'absolute', left: '50%', top: 0, width: '2px', height: '100%', background: 'rgba(255,255,255,0.4)' }} />
          
          {/* Dynamic Slider Indicator */}
          <div style={{
            position: 'absolute',
            left: `${matchState.chokeMeter}%`,
            top: 0,
            width: '10px',
            height: '100%',
            background: matchState.chokeMeter > 55 ? 'var(--neon-pink)' : matchState.chokeMeter < 45 ? 'var(--neon-cyan)' : '#ffffff',
            borderRadius: '5px',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 8px #fff',
            transition: 'left 0.1s ease-out'
          }} />
        </div>
      </div>

      {/* ─── GAMEPLAY SECTION (ANIMATION + CANVAS) ─── */}
      <DojoCanvas
        ref={canvasRef}
        song={song}
        fighter={fighter}
        matchState={matchState}
        onNoteHit={handleNoteHit}
        onNoteMiss={handleNoteMiss}
        onTriggerMobileTouch={handleMobileTouch}
      />

      {/* ─── MOBILE FRIENDLY TOUCH BUTTONS OVERLAY ─── */}
      <div className="mobile-touchpad">
        <div 
          className="touch-btn left-btn" 
          onTouchStart={(e) => { e.preventDefault(); canvasRef.current?.handleTouchStart('left'); canvasRef.current?.handleHitAttempt('left'); }}
          onTouchEnd={() => canvasRef.current?.handleTouchEnd('left')}
          onMouseDown={() => { canvasRef.current?.handleTouchStart('left'); canvasRef.current?.handleHitAttempt('left'); }}
          onMouseUp={() => canvasRef.current?.handleTouchEnd('left')}
          onMouseLeave={() => canvasRef.current?.handleTouchEnd('left')}
          style={{ background: activeButton === 'left' ? 'rgba(255, 0, 85, 0.25)' : 'transparent' }}
        >
          <div className="touch-icon left-color">←</div>
          <div className="touch-label left-color">Shrimp</div>
        </div>
        <div 
          className="touch-btn down-btn" 
          onTouchStart={(e) => { e.preventDefault(); canvasRef.current?.handleTouchStart('down'); canvasRef.current?.handleHitAttempt('down'); }}
          onTouchEnd={() => canvasRef.current?.handleTouchEnd('down')}
          onMouseDown={() => { canvasRef.current?.handleTouchStart('down'); canvasRef.current?.handleHitAttempt('down'); }}
          onMouseUp={() => canvasRef.current?.handleTouchEnd('down')}
          onMouseLeave={() => canvasRef.current?.handleTouchEnd('down')}
          style={{ background: activeButton === 'down' ? 'rgba(0, 245, 212, 0.25)' : 'transparent' }}
        >
          <div className="touch-icon down-color">↓</div>
          <div className="touch-label down-color">Sprawl</div>
        </div>
        <div 
          className="touch-btn up-btn" 
          onTouchStart={(e) => { e.preventDefault(); canvasRef.current?.handleTouchStart('up'); canvasRef.current?.handleHitAttempt('up'); }}
          onTouchEnd={() => canvasRef.current?.handleTouchEnd('up')}
          onMouseDown={() => { canvasRef.current?.handleTouchStart('up'); canvasRef.current?.handleHitAttempt('up'); }}
          onMouseUp={() => canvasRef.current?.handleTouchEnd('up')}
          onMouseLeave={() => canvasRef.current?.handleTouchEnd('up')}
          style={{ background: activeButton === 'up' ? 'rgba(57, 255, 20, 0.25)' : 'transparent' }}
        >
          <div className="touch-icon up-color">↑</div>
          <div className="touch-label up-color">Posture</div>
        </div>
        <div 
          className="touch-btn right-btn" 
          onTouchStart={(e) => { e.preventDefault(); canvasRef.current?.handleTouchStart('right'); canvasRef.current?.handleHitAttempt('right'); }}
          onTouchEnd={() => canvasRef.current?.handleTouchEnd('right')}
          onMouseDown={() => { canvasRef.current?.handleTouchStart('right'); canvasRef.current?.handleHitAttempt('right'); }}
          onMouseUp={() => canvasRef.current?.handleTouchEnd('right')}
          onMouseLeave={() => canvasRef.current?.handleTouchEnd('right')}
          style={{ background: activeButton === 'right' ? 'rgba(255, 234, 0, 0.25)' : 'transparent' }}
        >
          <div className="touch-icon right-color">→</div>
          <div className="touch-label right-color">Sweep</div>
        </div>
      </div>

      {/* ─── VICTORY STATE MODAL OVERLAY ─── */}
      {matchState.gameStatus === 'victory' && (
        <div className="overlay-screen">
          <h2 className="overlay-title victory-title">OPPONENT TAPPED!</h2>
          <p style={{ color: 'var(--neon-green)', fontWeight: 'bold', fontSize: '14px', marginBottom: '20px' }}>
            Submission Secured. Excellent technique!
          </p>
          <div className="overlay-stat">Final Score: <span>{matchState.score}</span></div>
          <div className="overlay-stat">Max Combo: <span>{matchState.maxCombo}</span></div>
          <div className="overlay-buttons">
            <button className="arc-btn cyan-btn" onClick={restartMatch}>Grapple Again</button>
            <button className="option-btn" onClick={onExit} style={{ border: '1px solid #4a5568' }}>Return to Dojo</button>
          </div>
        </div>
      )}

      {/* ─── GAMEOVER STATE MODAL OVERLAY ─── */}
      {matchState.gameStatus === 'gameover' && (
        <div className="overlay-screen">
          <h2 className="overlay-title gameover-title">TAP OUT!</h2>
          <p style={{ color: 'var(--neon-pink)', fontWeight: 'bold', fontSize: '14px', marginBottom: '20px' }}>
            The choke was locked deep. Protect your neck!
          </p>
          <div className="overlay-stat">Final Score: <span>{matchState.score}</span></div>
          <div className="overlay-stat">Max Combo: <span>{matchState.maxCombo}</span></div>
          <div className="overlay-buttons">
            <button className="arc-btn" onClick={restartMatch}>Retry Match</button>
            <button className="option-btn" onClick={onExit} style={{ border: '1px solid #4a5568' }}>Return to Dojo</button>
          </div>
        </div>
      )}

    </div>
  );
};
