import React, { useState, useEffect } from 'react';
import { SongBlueprint, FighterStyle } from '../types/game';
import { getGNBSongLibrary } from '../utils/GeminiNanoBanana';

interface SongSelectorProps {
  onSelectSong: (song: SongBlueprint, belt: FighterStyle['beltColor']) => void;
  onBack: () => void;
}

export const SongSelector: React.FC<SongSelectorProps> = ({ onSelectSong, onBack }) => {
  const defaultSongs = getGNBSongLibrary();
  const [customSongs, setCustomSongs] = useState<SongBlueprint[]>([]);

  // Load custom songs from local storage
  useEffect(() => {
    const saved = localStorage.getItem('cc_custom_songs');
    if (saved) {
      try {
        setCustomSongs(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse custom songs", e);
      }
    }
  }, []);

  const songs = [...defaultSongs, ...customSongs];

  // Helper to determine belt color representation based on song difficulty
  const getBeltForSong = (song: SongBlueprint): FighterStyle['beltColor'] => {
    if ((song as any).isCustom && (song as any).beltColor) {
      return (song as any).beltColor;
    }
    switch (song.id) {
      case 'guard-passer': return 'white';
      case 'berimbolo-samba': return 'blue';
      case 'banana-footlock': return 'purple';
      case 'tap-out-speedcore': return 'black';
      default: return 'white';
    }
  };

  const handleDeleteCustomSong = (songId: string) => {
    if (confirm("Are you sure you want to delete this custom Tatami level?")) {
      const updated = customSongs.filter(s => s.id !== songId);
      setCustomSongs(updated);
      localStorage.setItem('cc_custom_songs', JSON.stringify(updated));
    }
  };

  return (
    <div className="song-selector-screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="customizer-title" style={{ color: 'var(--ui-neon-pink)', border: 'none', padding: 0 }}>
          SELECT YOUR TATAMI CHALLENGE
        </h2>
        <button className="option-btn" onClick={onBack} style={{ borderColor: 'var(--ui-neon-pink)', padding: '6px 15px' }}>
          Back to Dojo
        </button>
      </div>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '0 0 10px 0' }}>
        Each song advances your belt. Play Purple, Brown or Black belt songs to unlock elite submission scrambles!
      </p>

      <div className="song-list-container">
        {songs.map((song) => {
          const songBelt = getBeltForSong(song);
          const beltClass = `belt-${songBelt}`;

          return (
            <div 
              key={song.id} 
              className="song-card"
              onClick={() => onSelectSong(song, songBelt)}
              style={{ position: 'relative' }}
            >
              {/* Delete button for custom songs */}
              {(song as any).isCustom && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Avoid selecting the song card
                    handleDeleteCustomSong(song.id);
                  }}
                  className="option-btn"
                  style={{ 
                    position: 'absolute', 
                    top: '5px', 
                    right: '5px', 
                    fontSize: '8px', 
                    padding: '2px 6px',
                    borderColor: 'var(--ui-neon-pink)',
                    background: 'rgba(255,0,85,0.15)',
                    color: 'var(--ui-neon-pink)',
                    zIndex: 10
                  }}
                >
                  Delete 🗑️
                </button>
              )}

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
                  <span style={{ color: 'var(--ui-neon-cyan)' }}>{song.bpm} BPM</span>
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
