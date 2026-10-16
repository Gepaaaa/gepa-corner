import React from 'react';

interface HobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HobbyModal: React.FC<HobbyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" id="hobbyModalOverlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="support-modal modal-content" role="dialog" aria-modal="true" style={{ maxWidth: 480, textAlign: 'left' }}>
        <button className="modal-close" type="button" onClick={onClose}>×</button>
        <div className="modal-icon">♡</div>
        <p className="section-kicker">what i like</p>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 12 }}>Interests & Favorites</h2>
        
        <div style={{ display: 'grid', gap: 12, fontSize: '0.88rem', color: 'var(--text-soft)', lineHeight: 1.5 }}>
          <div style={{ background: 'var(--sage-50)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
            <strong style={{ color: 'var(--sage-800)', display: 'block', marginBottom: 4 }}>🎮 Gaming</strong>
            Suka game adventure, open world, dan game dengan visual estetik atau cerita mendalam.
          </div>
          <div style={{ background: 'var(--sage-50)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
            <strong style={{ color: 'var(--sage-800)', display: 'block', marginBottom: 4 }}>🎬 Movies & Series</strong>
            Suka film sci-fi, psychological thriller, dan animasi dengan storytelling yang kuat.
          </div>
          <div style={{ background: 'var(--sage-50)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
            <strong style={{ color: 'var(--sage-800)', display: 'block', marginBottom: 4 }}>💻 Technology & Web</strong>
            Tertarik dengan web development, software engineering, AI, dan gadget terbaru.
          </div>
          <div style={{ background: 'var(--sage-50)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
            <strong style={{ color: 'var(--sage-800)', display: 'block', marginBottom: 4 }}>🎧 Music & Lo-Fi</strong>
            Musik indie Indonesia, pop-rock era 2000-an, dan lofi chill beats buat teman produktif.
          </div>
        </div>

        <button
          className="modal-support-button"
          type="button"
          onClick={onClose}
          style={{ background: 'var(--sage-700)', marginTop: 20 }}
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
