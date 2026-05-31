import React from 'react';
import { SongBlueprint, FighterStyle } from '../types/game';
import { getGNBSongLibrary } from '../utils/GeminiNanoBanana';

interface SongSelectorProps {
  onSelectSong: (song: SongBlueprint, belt: FighterStyle['beltColor']) => void;
  onBack: () => void;
}

export const SongSelector: React.FC<SongSelectorProps> = ({ onSelectSong, onBack }) => {
  const songs = getGNBSongLibrary();

  // Helper to determine belt color representation based on song difficulty
  const getBeltForSong = (songId: string): FighterStyle['beltColor'] => {
    switch (songId) {
      case 'guard-passer': return 'blue';
      case 'banana-footlock': return 'purple';
      case 'berimbolo-samba': return 'brown';
      case 'tap-out-speedcore': return 'black';
      default: return 'white';
    }
  };

  return (
    <div className="song-selector-screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="customizer-title" style={{ color: 'var(--neon-pink)', border: 'none', padding: 0 }}>
          SELECT YOUR TATAMI CHALLENGE
        </h2>
        <button className="option-btn" onClick={onBack} style={{ borderColor: 'var(--neon-pink)', padding: '6px 15px' }}>
          Back to Dojo
        </button>
      </div>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '0 0 10px 0' }}>
        Each song advances your belt. Play Purple, Brown or Black belt songs to unlock elite submission scrambles!
      </p>

      <div className="song-list-container">
        {songs.map((song) => {
          const songBelt = getBeltForSong(song.id);
          const beltClass = `belt-${songBelt}`;

          return (
            <div 
              key={song.id} 
              className="song-card"
              onClick={() => onSelectSong(song, songBelt)}
            >
              <div className={`song-difficulty-badge ${beltClass}`}>
                {songBelt} Belt
              </div>
              
              {/* Insert GNB's Procedural SVG Cover Art */}
              <div 
                className="song-card-cover" 
                dangerouslySetInnerHTML={{ __html: song.coverArt }} 
              />
              
              <div style={{ marginTop: '5px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {song.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span>{song.genre}</span>
                  <span style={{ color: 'var(--neon-cyan)' }}>{song.bpm} BPM</span>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Notes: {song.notes.length}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
