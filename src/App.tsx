import React, { useState, useEffect } from 'react';
import { SongBlueprint, FighterStyle } from './types/game';
import { CharacterCustomizer } from './components/CharacterCustomizer';
import { SongSelector } from './components/SongSelector';
import { GameScreen } from './components/GameScreen';
import { Calibration } from './components/Calibration';
import { audio } from './utils/AudioEngine';
import './styles/dojo.css';

const DEFAULT_FIGHTER: FighterStyle = {
  gender: 'female',
  hairStyle: 'spiky',
  hairColor: '#ff0055', // neon pink
  skinColor: '#fcd34d', // golden/yellow
  beltColor: 'white',
};

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'menu' | 'customizing' | 'song-select' | 'playing' | 'calibration'>('menu');
  const [fighter, setFighter] = useState<FighterStyle>(DEFAULT_FIGHTER);
  const [selectedSong, setSelectedSong] = useState<SongBlueprint | null>(null);
  const [calibrationOffset, setCalibrationOffset] = useState<number>(0);

  // Load saved settings from LocalStorage (Ruflo Dojo Memory)
  useEffect(() => {
    const savedFighter = localStorage.getItem('cc_fighter_style');
    if (savedFighter) {
      try {
        setFighter(JSON.parse(savedFighter));
      } catch (e) {
        console.error("Failed to parse saved fighter", e);
      }
    }

    const savedOffset = localStorage.getItem('cc_calibration_offset');
    if (savedOffset) {
      setCalibrationOffset(parseInt(savedOffset, 10));
    }
  }, []);

  // Save fighter customizer settings
  const handleSaveFighter = (updated: FighterStyle) => {
    setFighter(updated);
    localStorage.setItem('cc_fighter_style', JSON.stringify(updated));
    setScreen('menu');
  };

  // Save calibration settings
  const handleSaveOffset = (offset: number) => {
    setCalibrationOffset(offset);
    localStorage.setItem('cc_calibration_offset', offset.toString());
    setScreen('menu');
  };

  const handleSelectSong = (song: SongBlueprint, difficultyBelt: FighterStyle['beltColor']) => {
    setSelectedSong(song);
    setFighter(prev => ({ ...prev, beltColor: difficultyBelt }));
    setScreen('playing');
  };

  // Trigger sound engine unlock on first interaction
  const unlockAudio = async () => {
    await audio.init();
    audio.playSFX('perfect');
  };

  return (
    <div className="app-container">
      
      {/* HEADER HUD BAR */}
      {screen === 'menu' && (
        <div className="dojo-header">
          <h1 className="logo-text">
            CHOKE CHOKE <span>REVOLUTION</span> 🥋
          </h1>
          <div className="coach-box">
            Sensei: "Respect the tap. Breathe. Practice posture."
          </div>
        </div>
      )}

      {/* SCREEN INTERACTION ROUTING */}
      <div className="screen-wrapper">
        
        {/* MAIN MENU */}
        {screen === 'menu' && (
          <div className="menu-screen">
            <h1 className="menu-title">CHOKE CHOKE <span>REVOLUTION</span></h1>
            <p className="menu-subtitle">
              Welcome to the digital cyber dojo! Timed rhythm notes activate hip escapes, heavy sprawls, frames, and devastating choke submission holds. 
              <br /><br />
              Tap your keyboard arrows or on-screen mobile tap pads in sync with Gemini Nano Banana’s procedural synth tracks.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '350px' }}>
              <button 
                className="arc-btn cyan-btn" 
                onClick={() => { unlockAudio(); setScreen('song-select'); }}
              >
                SELECT TRACK 🥋
              </button>
              <button 
                className="arc-btn" 
                onClick={() => { unlockAudio(); setScreen('customizing'); }}
              >
                CUSTOMIZE FIGHTER
              </button>
              <button 
                className="option-btn" 
                onClick={() => { unlockAudio(); setScreen('calibration'); }}
                style={{ height: '42px', border: '1px solid #4a5568' }}
              >
                LATENCY CALIBRATION
              </button>
            </div>
            
            <div style={{ marginTop: '25px', fontSize: '10px', color: 'var(--text-muted)' }}>
              Controls: W/A/S/D or Arrow Keys (Desktop) | Virtual Buttons (Mobile)
            </div>
          </div>
        )}

        {/* CHARACTER CUSTOMIZER */}
        {screen === 'customizing' && (
          <CharacterCustomizer
            fighter={fighter}
            onChangeFighter={setFighter}
            onSave={() => handleSaveFighter(fighter)}
          />
        )}

        {/* SONG SELECTOR */}
        {screen === 'song-select' && (
          <SongSelector
            onSelectSong={handleSelectSong}
            onBack={() => setScreen('menu')}
          />
        )}

        {/* ACTIVE GAME PLAY LOOP */}
        {screen === 'playing' && selectedSong && (
          <GameScreen
            song={selectedSong}
            fighter={fighter}
            calibrationOffset={calibrationOffset}
            onExit={() => {
              audio.stop();
              setScreen('song-select');
            }}
          />
        )}

        {/* CALIBRATION OFFSET SCREEN */}
        {screen === 'calibration' && (
          <Calibration
            currentOffset={calibrationOffset}
            onSaveOffset={handleSaveOffset}
            onBack={() => setScreen('menu')}
          />
        )}

      </div>
    </div>
  );
};

export default App;
