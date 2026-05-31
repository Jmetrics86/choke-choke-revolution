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
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 30, 40, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bouncing beat simulation
      const bounceY = Math.sin(frame * 0.1) * 3;

      ctx.save();
      ctx.translate(centerX, centerY + bounceY);

      // Gender widths
      const torsoWidth = fighter.gender === 'male' ? 12 : fighter.gender === 'female' ? 9 : 11;
      
      // 1. Draw head
      ctx.fillStyle = fighter.skinColor;
      ctx.beginPath();
      ctx.arc(0, -20, 10, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw hair style
      ctx.fillStyle = fighter.hairColor;
      if (fighter.hairStyle === 'spiky') {
        ctx.beginPath();
        ctx.moveTo(-10, -22);
        ctx.lineTo(-14, -32);
        ctx.lineTo(-4, -26);
        ctx.lineTo(0, -36);
        ctx.lineTo(4, -26);
        ctx.lineTo(14, -32);
        ctx.lineTo(10, -22);
        ctx.fill();
      } else if (fighter.hairStyle === 'mohawk') {
        ctx.beginPath();
        ctx.moveTo(-2, -30);
        ctx.lineTo(-4, -38);
        ctx.lineTo(0, -41);
        ctx.lineTo(4, -38);
        ctx.lineTo(2, -30);
        ctx.fill();
      } else if (fighter.hairStyle === 'afro') {
        ctx.beginPath();
        ctx.arc(0, -26, 9, 0, Math.PI * 2);
        ctx.arc(-8, -22, 7, 0, Math.PI * 2);
        ctx.arc(8, -22, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (fighter.hairStyle === 'short') {
        ctx.beginPath();
        ctx.arc(0, -22, 11, Math.PI, 0);
        ctx.fill();
      } else if (fighter.hairStyle === 'long') {
        ctx.beginPath();
        ctx.arc(0, -22, 11, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-10, -20);
        ctx.quadraticCurveTo(-14, 0, -6, 4);
        ctx.quadraticCurveTo(-6, -4, -10, -20);
        ctx.fill();
      } else if (fighter.hairStyle === 'buns') {
        ctx.beginPath();
        ctx.arc(-10, -26, 5, 0, Math.PI * 2);
        ctx.arc(10, -26, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Draw Gi body (White jacket)
      ctx.strokeStyle = '#cbd5e1';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 5, torsoWidth, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4. Draw Belt (White belt as base preview)
      ctx.strokeStyle = '#7f8c8d'; // neutral White belt
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-torsoWidth, 10);
      ctx.lineTo(torsoWidth, 10);
      ctx.stroke();

      // Knot
      ctx.fillStyle = '#7f8c8d';
      ctx.beginPath();
      ctx.arc(0, 10, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw limbs (Waving arm)
      ctx.strokeStyle = fighter.skinColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Left arm resting
      ctx.moveTo(-torsoWidth + 2, 0);
      ctx.lineTo(-18, 12);
      // Right arm waving
      const waveAngle = Math.sin(frame * 0.15) * 5;
      ctx.moveTo(torsoWidth - 2, 0);
      ctx.lineTo(16 + waveAngle, -8 + waveAngle * 0.5);
      // Legs
      ctx.moveTo(-6, 20);
      ctx.lineTo(-10, 38);
      ctx.moveTo(6, 20);
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
