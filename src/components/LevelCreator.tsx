import React, { useState, useEffect, useRef } from 'react';
import { SongBlueprint, FighterStyle } from '../types/game';
import { generateBeatmap, generateBananaCoverArt } from '../utils/GeminiNanoBanana';

interface LevelCreatorProps {
  onPlaySong: (song: SongBlueprint, belt: FighterStyle['beltColor']) => void;
  onBack: () => void;
}

export const LevelCreator: React.FC<LevelCreatorProps> = ({ onPlaySong, onBack }) => {
  const [mode, setMode] = useState<'upload' | 'gemini'>('upload');
  
  // Load saved API Key from localStorage or environment
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('cc_gemini_api_key') || 
           ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || '';
  });
  const [prompt, setPrompt] = useState<string>('');
  const [lyriaModel, setLyriaModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>('lyria-3-clip-preview');

  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [genre, setGenre] = useState<string>('Tatami Beats');
  const [bpm, setBpm] = useState<number>(120);
  const [style, setStyle] = useState<'techno' | 'funk' | 'synthwave' | 'speedcore'>('techno');
  const [beltColor, setBeltColor] = useState<FighterStyle['beltColor']>('blue');
  const [status, setStatus] = useState<string>('Select or drag an MP3 file to get started.');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [taps, setTaps] = useState<number[]>([]);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate preview song structure
  const [previewSong, setPreviewSong] = useState<SongBlueprint | null>(null);

  useEffect(() => {
    if (duration > 0 && title) {
      const songId = `custom-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
      const coverArt = generateBananaCoverArt('custom', title);
      const notes = generateBeatmap(bpm, duration, style);

      setPreviewSong({
        id: songId,
        title: title,
        genre: genre,
        bpm: bpm,
        duration: Math.round(duration),
        coverArt: coverArt,
        bassNotes: ["A2", "D2", "E2", "G2"], // Default loops for synth fallback
        leadNotes: ["A4", "C5", "D5", "E5"],
        notes: notes,
      });
    } else {
      setPreviewSong(null);
    }
  }, [file, duration, title, genre, bpm, style]);

  // Decode MP3 to find duration and auto-detect BPM
  const handleFileChange = async (selectedFile: File) => {
    setIsLoading(true);
    setStatus('Decoding audio track metadata...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      // Use Web Audio to decode
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      
      setStatus('Analyzing file duration...');
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const fileDuration = decodedBuffer.duration;
      setDuration(fileDuration);

      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      setStatus('Running tatami beat analysis...');
      
      // Attempt simple peak detection for BPM
      const detectedBpm = detectBpmFromBuffer(decodedBuffer);
      setBpm(detectedBpm);

      setStatus(`Ready! Decoded ${Math.round(fileDuration)} seconds. Detected BPM: ${detectedBpm}.`);
      audioCtx.close();
      setFile(selectedFile);
    } catch (error) {
      console.error(error);
      setStatus('⚠️ Error decoding audio. Fallback duration of 180s set.');
      setDuration(180);
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      setBpm(120);
      setFile(selectedFile);
    } finally {
      setIsLoading(false);
    }
  };

  // Simple pure JS beat detection
  const detectBpmFromBuffer = (buffer: AudioBuffer): number => {
    try {
      const data = buffer.getChannelData(0);
      const sampleRate = buffer.sampleRate;
      
      // Calculate energy in 50ms windows (0.05s)
      const windowSize = Math.floor(sampleRate * 0.05);
      const energies: number[] = [];
      
      for (let i = 0; i < Math.min(data.length, sampleRate * 120); i += windowSize) { // check first 2 mins
        let energy = 0;
        const end = Math.min(i + windowSize, data.length);
        for (let j = i; j < end; j++) {
          energy += data[j] * data[j];
        }
        energies.push(Math.sqrt(energy / windowSize));
      }
      
      const peaks: number[] = [];
      const C = 1.35; // threshold factor
      const windowRadius = 12; // surrounding window size
      
      for (let i = windowRadius; i < energies.length - windowRadius; i++) {
        let sum = 0;
        for (let j = i - windowRadius; j <= i + windowRadius; j++) {
          if (j !== i) sum += energies[j];
        }
        const localAverage = sum / (windowRadius * 2);
        if (energies[i] > localAverage * C && energies[i] > 0.04) {
          peaks.push(i);
        }
      }
      
      if (peaks.length < 5) return 120;
      
      // Diff distances
      const diffs: number[] = [];
      for (let i = 1; i < peaks.length; i++) {
        diffs.push(peaks[i] - peaks[i - 1]);
      }
      
      // Sort and grab median
      diffs.sort((a, b) => a - b);
      const medianDiff = diffs[Math.floor(diffs.length / 2)];
      const intervalSeconds = medianDiff * 0.05;
      
      let detectedBpm = 60 / intervalSeconds;
      
      // Normalize to 90 - 180 range
      while (detectedBpm < 90) detectedBpm *= 2;
      while (detectedBpm > 180) detectedBpm /= 2;
      
      return Math.round(detectedBpm);
    } catch (e) {
      return 120;
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Tap tempo utility
  const handleTapTempo = () => {
    const now = performance.now();
    const newTaps = [...taps, now].slice(-10); // Keep last 10
    setTaps(newTaps);
    
    if (newTaps.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const tappedBpm = Math.round(60000 / avgInterval);
      if (tappedBpm >= 60 && tappedBpm <= 240) {
        setBpm(tappedBpm);
      }
    }
  };

  const resetTapTempo = () => {
    setTaps([]);
  };

  // Generate Song via Gemini Lyria 3
  const handleGenerateAISong = async () => {
    if (!prompt.trim()) {
      setStatus('⚠️ Error: Please enter a prompt for the song.');
      return;
    }
    if (!apiKey.trim()) {
      setStatus('⚠️ Error: Please enter your Gemini API Key.');
      return;
    }

    // Save key
    localStorage.setItem('cc_gemini_api_key', apiKey.trim());
    setIsLoading(true);
    setStatus('Contacting Gemini Lyria 3 engine...');

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${lyriaModel}:generateContent?key=${apiKey.trim()}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt.trim()
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lyria API returned ${response.status}: ${errorText}`);
      }

      setStatus('Decoding generated audio stream...');
      const data = await response.json();
      
      const part = data.candidates?.[0]?.content?.parts?.[0];
      if (!part || !part.inlineData) {
        if (part?.text) {
          throw new Error(`Model returned text description: ${part.text}`);
        }
        throw new Error('No audio content returned from the Lyria model.');
      }

      const mimeType = part.inlineData.mimeType || 'audio/mp3';
      const base64Data = part.inlineData.data;

      setStatus('Assembling audio file buffer...');
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      const ext = mimeType.includes('wav') ? 'wav' : 'mp3';
      const generatedTitle = prompt.slice(0, 25).trim() || 'AI Tatami Track';
      const fileName = `${generatedTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${ext}`;
      const generatedFile = new File([blob], fileName, { type: mimeType });

      // Trigger standard decode
      await handleFileChange(generatedFile);
      
      // Auto-populate form metadata
      setTitle(generatedTitle);
      setGenre('Gemini AI Beats');
    } catch (error: any) {
      console.error(error);
      setStatus(`⚠️ Generation Error: ${error.message || 'Failed to compose AI song.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Play custom level now
  const handlePlayNow = () => {
    if (!previewSong || !file) return;

    // Create object URL for local playback
    const localAudioUrl = URL.createObjectURL(file);
    
    // Build full song data
    const activeSong: SongBlueprint = {
      ...previewSong,
      audioUrl: localAudioUrl,
    };

    // Store custom song definition in localStorage (without large blob URL, just metadata)
    const savedCustomSongs = localStorage.getItem('cc_custom_songs');
    let customSongsArray: any[] = [];
    if (savedCustomSongs) {
      try {
        customSongsArray = JSON.parse(savedCustomSongs);
      } catch (e) {}
    }
    
    // Remove duplicate ID if exists
    customSongsArray = customSongsArray.filter(s => s.title !== activeSong.title);
    
    // Save metadata + beltColor
    customSongsArray.push({
      ...previewSong,
      beltColor: beltColor,
      isCustom: true // Tag to identify as custom level
    });

    localStorage.setItem('cc_custom_songs', JSON.stringify(customSongsArray));

    // Play!
    onPlaySong(activeSong, beltColor);
  };

  // Export JSON file / Copy clipboard
  const handleExportJSON = () => {
    if (!previewSong) return;
    const exportData = {
      ...previewSong,
      beltColor: beltColor,
      isCustom: true,
      audioUrl: `/tracks/${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.mp3` // suggested placement
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Write to clipboard
    navigator.clipboard.writeText(jsonString)
      .then(() => {
        alert("Song blueprint JSON copied to clipboard! You can paste it into GeminiNanoBanana.ts getGNBSongLibrary() or save it as a file.");
      })
      .catch(err => {
        console.error(err);
        setShowExportModal(true);
      });
  };

  return (
    <div className="song-selector-screen" style={{ overflowY: 'auto', paddingBottom: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="customizer-title" style={{ color: 'var(--ui-neon-cyan)', border: 'none', padding: 0 }}>
          🥋 TATAMI LEVEL CREATOR
        </h2>
        <button className="option-btn" onClick={onBack} style={{ borderColor: 'var(--ui-neon-cyan)', padding: '6px 15px' }}>
          Back to Dojo
        </button>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '0 0 15px 0' }}>
        Upload an MP3 file or generate a brand new instrumental/vocal song using Gemini Lyria 3 AI music composition models.
      </p>

      <div className="creator-grid-container" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* LEFT COLUMN: UPLOAD & CONFIG */}
        <div style={{ flex: '1 1 350px', background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--accent-soft)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* TAB MODE SWITCHER */}
          <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '6px' }}>
            <button 
              className={`option-btn ${mode === 'upload' ? 'active' : ''}`}
              onClick={() => setMode('upload')}
              style={{ flex: 1, border: 'none', margin: 0, padding: '8px', fontSize: '11px' }}
            >
              Upload Local MP3
            </button>
            <button 
              className={`option-btn ${mode === 'gemini' ? 'active' : ''}`}
              onClick={() => setMode('gemini')}
              style={{ flex: 1, border: 'none', margin: 0, padding: '8px', fontSize: '11px', borderColor: 'var(--ui-neon-cyan)' }}
            >
              Gemini Lyria AI 🎵
            </button>
          </div>

          {/* DYNAMIC TAB BODY */}
          {mode === 'upload' ? (
            /* DROP ZONE */
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                border: '2px dashed var(--accent-soft)', 
                borderRadius: '8px', 
                padding: '25px 15px', 
                textAlign: 'center', 
                cursor: 'pointer',
                background: file ? 'rgba(0,245,212,0.05)' : 'transparent',
                borderColor: file ? 'var(--ui-neon-cyan)' : 'var(--accent-soft)',
                transition: 'all 0.2s ease'
              }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".mp3" 
                onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
              />
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎵</div>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                {file ? file.name : "DRAG & DROP MP3 FILE OR CLICK TO BROWSE"}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                MP3 format only • Max suggested 10MB
              </div>
            </div>
          ) : (
            /* GEMINI COMPOSER */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>GEMINI API KEY</label>
                <input 
                  type="password" 
                  value={apiKey} 
                  placeholder="Paste your GEMINI_API_KEY..."
                  onChange={(e) => setApiKey(e.target.value)} 
                  style={{ width: '100%', background: '#1c1d24', border: '1px solid var(--accent-soft)', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>LYRIA AI MODEL</label>
                  <select 
                    value={lyriaModel} 
                    onChange={(e: any) => setLyriaModel(e.target.value)}
                    style={{ width: '100%', background: '#1c1d24', border: '1px solid var(--accent-soft)', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '12px' }}
                  >
                    <option value="lyria-3-clip-preview">Lyria 3 Clip (30s Loop)</option>
                    <option value="lyria-3-pro-preview">Lyria 3 Pro (Full Length Song)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>AI MUSIC PROMPT</label>
                <textarea 
                  value={prompt} 
                  placeholder="Describe your song (e.g. 'A high-energy rock song with drum beats, heavy bass, electric guitar riffs, and vocals')"
                  onChange={(e) => setPrompt(e.target.value)} 
                  style={{ width: '100%', height: '65px', background: '#1c1d24', border: '1px solid var(--accent-soft)', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', resize: 'vertical' }}
                />
              </div>

              <button 
                onClick={handleGenerateAISong}
                disabled={isLoading}
                className="arc-btn cyan-btn"
                style={{ width: '100%', padding: '10px', fontSize: '11px' }}
              >
                {isLoading ? 'GENERATING BEATS...' : 'GENERATE AI TRACK 🎶'}
              </button>
            </div>
          )}

          <div style={{ fontSize: '11px', color: 'var(--ui-neon-cyan)', padding: '5px 10px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', fontFamily: 'monospace' }}>
            STATUS: {status}
          </div>

          {/* CONFIGURATION FIELDS */}
          {file && !isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '5px' }}>
              
              {/* TRACK TITLE */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>TRACK TITLE</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  style={{ width: '100%', background: '#1c1d24', border: '1px solid var(--accent-soft)', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}
                />
              </div>

              {/* GENRE */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>GENRE</label>
                <input 
                  type="text" 
                  value={genre} 
                  onChange={(e) => setGenre(e.target.value)} 
                  style={{ width: '100%', background: '#1c1d24', border: '1px solid var(--accent-soft)', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}
                />
              </div>

              {/* BPM PARAMETERS */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold' }}>TEMPO: {bpm} BPM</label>
                  <button className="option-btn" onClick={resetTapTempo} style={{ fontSize: '8px', padding: '2px 6px', border: 'none', background: 'transparent', color: 'var(--text-muted)' }}>
                    Reset Taps
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="range" 
                    min="60" 
                    max="220" 
                    value={bpm} 
                    onChange={(e) => setBpm(parseInt(e.target.value))} 
                    style={{ flex: 1, accentColor: 'var(--ui-neon-cyan)' }}
                  />
                  <button 
                    onClick={handleTapTempo}
                    className="option-btn"
                    style={{ 
                      borderColor: 'var(--ui-neon-cyan)', 
                      fontSize: '10px', 
                      padding: '8px 12px',
                      background: taps.length > 0 ? 'rgba(0,245,212,0.1)' : 'transparent',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    🥁 TAP TEMPO {taps.length > 0 && `(${taps.length})`}
                  </button>
                </div>
              </div>

              {/* DUAL SELECT: STYLE & DIFFICULTY */}
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>RHYTHM STYLE</label>
                  <select 
                    value={style} 
                    onChange={(e: any) => setStyle(e.target.value)}
                    style={{ width: '100%', background: '#1c1d24', border: '1px solid var(--accent-soft)', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '12px' }}
                  >
                    <option value="techno">Techno (Steady Up/Down)</option>
                    <option value="funk">Funk (Syncopated swing)</option>
                    <option value="synthwave">Synthwave (Arpeggio flows)</option>
                    <option value="speedcore">Speedcore (Double streams)</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>CHALLENGE BELT</label>
                  <select 
                    value={beltColor} 
                    onChange={(e: any) => setBeltColor(e.target.value)}
                    style={{ width: '100%', background: '#1c1d24', border: '1px solid var(--accent-soft)', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '12px' }}
                  >
                    <option value="white">White Belt (Intro)</option>
                    <option value="blue">Blue Belt (Intermediate)</option>
                    <option value="purple">Purple Belt (Advanced Scrambles)</option>
                    <option value="brown">Brown Belt (Elite Escapes)</option>
                    <option value="black">Black Belt (Submission Grind)</option>
                  </select>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: PREVIEW & ACTIONS */}
        <div style={{ flex: '1 1 250px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--accent-soft)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', minHeight: '300px' }}>
          {previewSong ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
              
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>LEVEL PREVIEW</div>

              {/* Cover Art Wrapper */}
              <div 
                style={{ width: '150px', height: '150px', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}
                dangerouslySetInnerHTML={{ __html: previewSong.coverArt }}
              />

              <div style={{ textAlign: 'center', width: '100%' }}>
                <h3 style={{ margin: '5px 0', fontSize: '15px' }}>{previewSong.title}</h3>
                <div style={{ color: 'var(--ui-neon-cyan)', fontSize: '11px', fontFamily: 'monospace' }}>
                  {previewSong.genre} • {previewSong.bpm} BPM
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '5px' }}>
                  Duration: {previewSong.duration} seconds • Notes Generated: {previewSong.notes.length}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <button 
                  onClick={handlePlayNow}
                  className="arc-btn cyan-btn"
                  style={{ width: '100%', padding: '12px' }}
                >
                  STEP ON THE MAT (PLAY LEVEL) 🥋
                </button>
                <button 
                  onClick={handleExportJSON}
                  className="option-btn"
                  style={{ width: '100%', padding: '10px', borderColor: 'var(--accent-soft)' }}
                >
                  EXPORT LEVEL JSON 📋
                </button>
              </div>

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', margin: 'auto 0', color: 'var(--text-muted)', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', opacity: 0.2, marginBottom: '15px' }}>🥋</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>AWAITING TATAMI COMPOSITION</div>
              <div style={{ fontSize: '9px', marginTop: '4px' }}>Load or generate an MP3 track to automatically synthesize BJJ transitions, arrows sequence, and custom cover art.</div>
            </div>
          )}
        </div>
      </div>

      {showExportModal && previewSong && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: '#1c1d24', padding: '20px', borderRadius: '10px', border: '2px solid var(--ui-neon-cyan)', width: '90%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ margin: 0, color: 'var(--ui-neon-cyan)' }}>Song Blueprint JSON</h3>
            <textarea 
              readOnly 
              value={JSON.stringify({...previewSong, beltColor: beltColor, isCustom: true}, null, 2)} 
              style={{ width: '100%', height: '250px', background: '#0d0e12', color: '#00f5d4', border: '1px solid var(--accent-soft)', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10px' }}
            />
            <button className="option-btn" onClick={() => setShowExportModal(false)} style={{ alignSelf: 'flex-end', borderColor: 'var(--ui-neon-cyan)' }}>
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
