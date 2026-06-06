import React, { useRef, useEffect } from 'react';
import { FighterStyle } from '../types/game';

interface CharacterCustomizerProps {
  fighter: FighterStyle;
  onChangeFighter: (fighter: FighterStyle) => void;
  onSave: () => void;
}

export const CharacterCustomizer: React.FC<CharacterCustomizerProps> = ({
  fighter,
  onChangeFighter,
  onSave,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Available custom colors & styles
  const hairStyles: FighterStyle['hairStyle'][] = ['bald', 'short', 'long', 'mohawk', 'afro', 'buns', 'spiky'];
  
  const hairColors = [
    '#ff0055', // Neon Pink
    '#00f5d4', // Neon Cyan
    '#ffea00', // Neon Yellow
    '#39ff14', // Neon Green
    '#a855f7', // Neon Purple
    '#ffffff', // Retro White
    '#0b0c10', // Dark Ninja Black
    '#e28743', // Fire Orange
  ];

  const skinColors = [
    '#fbcfe8', // Fair/Pink
    '#fcd34d', // Golden/Yellow
    '#f59e0b', // Olive/Tan
    '#b45309', // Caramel
    '#78350f', // Dark Cocoa
    '#9d4edd', // Neon purple skin (Alien Jiu-Jitsu)
  ];

  const genders: FighterStyle['gender'][] = ['male', 'female', 'nonbinary'];

  // Animate character preview inside small canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const drawPreview = () => {
      frame++;
      
      // Clear
      ctx.fillStyle = '#0d0e12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Tatami Ring shadow
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 + 10;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(centerX - 35, centerY + 28, 70, 6);

      // Bouncing beat simulation
      const bounceY = Math.sin(frame * 0.1) * 3;

      ctx.save();
      ctx.translate(centerX, centerY + bounceY);

      // Gender widths
      const torsoWidth = fighter.gender === 'male' ? 12 : fighter.gender === 'female' ? 9 : 11;
      
      // 1. Draw head (Blocky)
      ctx.fillStyle = fighter.skinColor;
      ctx.fillRect(-9, -29, 18, 18);

      // 2. Draw hair style (Blocky)
      ctx.fillStyle = fighter.hairColor;
      if (fighter.hairStyle === 'spiky') {
        ctx.fillRect(-10, -34, 3, 5);
        ctx.fillRect(-6, -37, 3, 8);
        ctx.fillRect(-2, -39, 4, 10);
        ctx.fillRect(3, -37, 3, 8);
        ctx.fillRect(7, -34, 3, 5);
      } else if (fighter.hairStyle === 'mohawk') {
        ctx.fillRect(-2, -41, 4, 12);
        ctx.fillRect(-1, -43, 2, 2);
      } else if (fighter.hairStyle === 'afro') {
        ctx.fillRect(-13, -34, 26, 12); // center block
        ctx.fillRect(-10, -38, 20, 4);  // top block
        ctx.fillRect(-13, -28, 26, 8);  // side flare
      } else if (fighter.hairStyle === 'short') {
        ctx.fillRect(-10, -32, 20, 5); // top cap
        ctx.fillRect(-10, -32, 3, 11); // left sideburn
        ctx.fillRect(7, -32, 3, 11);  // right sideburn
      } else if (fighter.hairStyle === 'long') {
        ctx.fillRect(-10, -32, 20, 5); // top cap
        ctx.fillRect(-11, -32, 3, 24); // left lock
        ctx.fillRect(8, -32, 3, 24);  // right lock
      } else if (fighter.hairStyle === 'buns') {
        ctx.fillRect(-10, -32, 20, 5); // top cap
        ctx.fillRect(-12, -37, 5, 5);  // left bun
        ctx.fillRect(7, -37, 5, 5);   // right bun
      }

      // 3. Draw Gi body (White jacket - Blocky)
      ctx.strokeStyle = '#cbd5e1';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-torsoWidth, -11, torsoWidth * 2, 30);
      ctx.strokeRect(-torsoWidth, -11, torsoWidth * 2, 30);

      // 4. Draw Belt (White belt as base preview)
      ctx.strokeStyle = '#7f8c8d'; // neutral White belt
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-torsoWidth, 10);
      ctx.lineTo(torsoWidth, 10);
      ctx.stroke();

      // Knot (Blocky)
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(-3, 7, 6, 6); // Knot core
      ctx.fillRect(-6, 10, 3, 8); // left tie
      ctx.fillRect(3, 10, 3, 8);  // right tie

      // Draw limbs (Waving arm - Blocky style line settings)
      ctx.strokeStyle = fighter.skinColor;
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      // Left arm resting
      ctx.moveTo(-torsoWidth + 2, 0);
      ctx.lineTo(-18, 12);
      // Right arm waving
      const waveAngle = Math.sin(frame * 0.15) * 5;
      ctx.moveTo(torsoWidth - 2, 0);
      ctx.lineTo(16 + waveAngle, -8 + waveAngle * 0.5);
      // Legs
      ctx.moveTo(-6, 19);
      ctx.lineTo(-10, 38);
      ctx.moveTo(6, 19);
      ctx.lineTo(10, 38);
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(drawPreview);
    };

    drawPreview();
    return () => cancelAnimationFrame(animId);
  }, [fighter]);

  return (
    <div className="customizer-screen">
      
      {/* LEFT CONTROLS PANEL */}
      <div className="customizer-controls">
        <h2 className="customizer-title">CUSTOMIZE GRAPPLER</h2>
        
        {/* Gender Selection */}
        <div className="control-group">
          <span className="control-label">SILHOUETTE</span>
          <div className="option-grid">
            {genders.map((g) => (
              <button
                key={g}
                className={`option-btn ${fighter.gender === g ? 'active' : ''}`}
                onClick={() => onChangeFighter({ ...fighter, gender: g })}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Hair Styles */}
        <div className="control-group">
          <span className="control-label">HAIR STYLE</span>
          <div className="option-grid">
            {hairStyles.map((styleName) => (
              <button
                key={styleName}
                className={`option-btn ${fighter.hairStyle === styleName ? 'active' : ''}`}
                onClick={() => onChangeFighter({ ...fighter, hairStyle: styleName })}
              >
                {styleName}
              </button>
            ))}
          </div>
        </div>

        {/* Hair Color Palette */}
        <div className="control-group">
          <span className="control-label">HAIR COLOR</span>
          <div className="color-palette">
            {hairColors.map((color) => (
              <div
                key={color}
                className={`color-swatch ${fighter.hairColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onChangeFighter({ ...fighter, hairColor: color })}
              />
            ))}
          </div>
        </div>

        {/* Skin Tone Palette */}
        <div className="control-group">
          <span className="control-label">SKIN TONE</span>
          <div className="color-palette">
            {skinColors.map((color) => (
              <div
                key={color}
                className={`color-swatch ${fighter.skinColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onChangeFighter({ ...fighter, skinColor: color })}
              />
            ))}
          </div>
        </div>

        <button 
          className="arc-btn cyan-btn" 
          onClick={onSave} 
          style={{ marginTop: 'auto', height: '48px', fontSize: '15px' }}
        >
          ENTER THE DOJO 🥋
        </button>
      </div>

      {/* RIGHT PREVIEW PANEL */}
      <div className="customizer-preview">
        <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}>
          LIVE FIGHTER PREVIEW
        </div>
        <div className="preview-canvas-container">
          <canvas ref={previewCanvasRef} width={250} height={250} style={{ width: '100%', height: '100%' }} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '9px', textAlign: 'center', marginTop: '15px', maxWidth: '80%' }}>
          Your character wears their designated track difficulty belt automatically during matches!
        </p>
      </div>

    </div>
  );
};
