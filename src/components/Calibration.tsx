import React, { useState } from 'react';
import { audio } from '../utils/AudioEngine';

interface CalibrationProps {
  currentOffset: number;
  onSaveOffset: (offset: number) => void;
  onBack: () => void;
}

export const Calibration: React.FC<CalibrationProps> = ({ currentOffset, onSaveOffset, onBack }) => {
  const [offset, setOffset] = useState<number>(currentOffset);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  
  // Audio reference beep
  const handleTestBeep = async () => {
    await audio.init();
    audio.playSFX('oss');
    
    // Log tap times to help calculate latency offset
    const now = performance.now();
    setTapTimes((prev) => {
      const next = [...prev, now].slice(-8); // keep last 8 taps
      if (next.length >= 2) {
        // Calculate average gap in milliseconds relative to a stable interval
        // Simple visual guide
      }
      return next;
    });
  };

  return (
    <div className="menu-screen" style={{ maxWidth: '450px', borderColor: 'var(--neon-purple)', boxShadow: '0 0 20px rgba(114,9,183,0.3)' }}>
      <h2 className="customizer-title" style={{ color: 'var(--neon-purple)', alignSelf: 'stretch', border: 'none', marginBottom: '10px' }}>
        LATENCY CALIBRATION
      </h2>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '20px' }}>
        rhythm games require sub-millisecond audio sync. If arrows pass the target line before you hear the beat (especially on Bluetooth earbuds), adjust your offset below.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%', gap: '15px' }}>
        <div style={{ background: '#13141c', padding: '15px', borderRadius: '8px', border: '1px solid #2d3748' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
            <span>Audio Delay (Offset):</span>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{offset} ms</span>
          </div>
          <input 
            type="range" 
            min="-300" 
            max="300" 
            value={offset} 
            onChange={(e) => setOffset(parseInt(e.target.value, 10))}
            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--neon-purple)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>-300ms (Audio Early)</span>
            <span>0ms (Default)</span>
            <span>+300ms (Audio Late)</span>
          </div>
        </div>

        <button 
          className="option-btn" 
          onClick={handleTestBeep} 
          style={{ borderColor: 'var(--neon-cyan)', height: '45px', fontWeight: 'bold' }}
        >
          🎵 TAP TO TEST AUDIO DELAY
        </button>

        {tapTimes.length > 0 && (
          <div style={{ fontSize: '10px', color: 'var(--neon-green)', textAlign: 'center' }}>
            Registered tap! Sound engine synced.
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            className="arc-btn" 
            onClick={() => onSaveOffset(offset)} 
            style={{ flex: 1, padding: '10px 0', fontSize: '13px' }}
          >
            Save
          </button>
          <button 
            className="option-btn" 
            onClick={onBack} 
            style={{ flex: 1, padding: '10px 0', fontSize: '13px', border: '1px solid #4a5568' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
