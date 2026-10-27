import React, { useState } from 'react';

interface HobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HobbyModal: React.FC<HobbyModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'gaming' | 'movies'>('gaming');

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay active"
      id="hobbyModalOverlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="support-modal modal-content hobby-modal-container"
        role="dialog"
        aria-modal="true"
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Tutup">
          ×
        </button>
        <div className="modal-icon">♡</div>
        <p className="section-kicker">what i enjoy</p>
        <h2 className="hobby-modal-title">Gaming & Cinema Realm</h2>
        <p className="hobby-modal-desc">
          Kombinasi dunia kompetitif malam hari dan karya sinematik yang bermakna.
        </p>

        {/* Hobby Segmented Tabs */}
        <div className="hobby-tabs" role="tablist">
          <button
            className={`hobby-tab-btn ${activeTab === 'gaming' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('gaming')}
          >
            🎮 Mobile Legends
          </button>
          <button
            className={`hobby-tab-btn ${activeTab === 'movies' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('movies')}
          >
            🎬 Film Elitis (Cinephile)
          </button>
        </div>

        {/* Tab 1: Gaming (Mobile Legends) */}
        {activeTab === 'gaming' && (
          <div className="hobby-tab-pane active" id="hobbyPaneGaming">
            <div className="mlbb-showcase-card">
              <div className="mlbb-header">
                <div className="mlbb-badge-icon">⚔️</div>
                <div className="mlbb-title-meta">
                  <h4>Mobile Legends: Bang Bang</h4>
                  <span className="mlbb-tag">Competitive & Mabar Companion</span>
                </div>
              </div>
              <p className="mlbb-desc">
                Game utama buat seru-seruan bareng teman atau nge-push rank waktu santai malam hari. Paling menikmati gameplay yang butuh kalkulasi positioning, timing skill, dan rotasi objektif makro yang rapi.
              </p>
              <div className="mlbb-stats-grid">
                <div className="mlbb-stat-item">
                  <span className="mlbb-stat-label">Role Favorit</span>
                  <strong className="mlbb-stat-value">Mid Lane / Roam</strong>
                </div>
                <div className="mlbb-stat-item">
                  <span className="mlbb-stat-label">Playstyle</span>
                  <strong className="mlbb-stat-value">Vision & Macro Objective</strong>
                </div>
                <div className="mlbb-stat-item">
                  <span className="mlbb-stat-label">Vibe Main</span>
                  <strong className="mlbb-stat-value">Santai tapi Gak Mau Kalah ✌</strong>
                </div>
                <div className="mlbb-stat-item">
                  <span className="mlbb-stat-label">Status Mabar</span>
                  <strong className="mlbb-stat-value" style={{ color: 'var(--sage-700)' }}>Open for Mabar</strong>
                </div>
              </div>
              <div className="mlbb-footer-note">
                <span>💡 Mau mabar bareng? Boleh banget chat atau ajak pas lagi online!</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Movies (Elitis FilmTok & Letterboxd Picks) */}
        {activeTab === 'movies' && (
          <div className="hobby-tab-pane active" id="hobbyPaneMovies">
            <div className="elitis-intro-box">
              <span className="letterboxd-badge">★ LETTERBOXD ESSENTIALS</span>
              <p>
                Kurasi karya sinema legendaris dengan storytelling mendalam, sinematografi atmosferik, dan tensi psikologis yang jadi favorit anak film & elitis FilmTok.
              </p>
            </div>

            <div className="elitis-movies-grid">
              <div className="elitis-movie-card">
                <div className="movie-rank-tag">01</div>
                <div className="movie-meta">
                  <div className="movie-title-row">
                    <h5>Fight Club</h5>
                    <span className="movie-year">1999 • David Fincher</span>
                  </div>
                  <p className="movie-quote">
                    "It's only after we've lost everything that we're free to do anything."
                  </p>
                  <div className="movie-tags">
                    <span>Psychological</span>
                    <span>Cult Classic</span>
                    <span>Satire</span>
                  </div>
                </div>
              </div>

              <div className="elitis-movie-card">
                <div className="movie-rank-tag">02</div>
                <div className="movie-meta">
                  <div className="movie-title-row">
                    <h5>Blade Runner 2049</h5>
                    <span className="movie-year">2017 • Denis Villeneuve</span>
                  </div>
                  <p className="movie-quote">
                    "All the best memories are hers." Visual neo-noir cyberpunk paling atmosferik.
                  </p>
                  <div className="movie-tags">
                    <span>Neo-Noir</span>
                    <span>Atmospheric</span>
                    <span>Sci-Fi</span>
                  </div>
                </div>
              </div>

              <div className="elitis-movie-card">
                <div className="movie-rank-tag">03</div>
                <div className="movie-meta">
                  <div className="movie-title-row">
                    <h5>Interstellar</h5>
                    <span className="movie-year">2014 • Christopher Nolan</span>
                  </div>
                  <p className="movie-quote">
                    "Love is the one thing that transcends dimensions of time and space." Score Hans Zimmer tiada tanding.
                  </p>
                  <div className="movie-tags">
                    <span>Existential</span>
                    <span>Space Epic</span>
                    <span>Hans Zimmer</span>
                  </div>
                </div>
              </div>

              <div className="elitis-movie-card">
                <div className="movie-rank-tag">04</div>
                <div className="movie-meta">
                  <div className="movie-title-row">
                    <h5>Whiplash</h5>
                    <span className="movie-year">2014 • Damien Chazelle</span>
                  </div>
                  <p className="movie-quote">
                    "There are no two words in the English language more harmful than 'good job'." Tensi tiada henti.
                  </p>
                  <div className="movie-tags">
                    <span>Obsession</span>
                    <span>Jazz Thriller</span>
                    <span>Pacing 10/10</span>
                  </div>
                </div>
              </div>

              <div className="elitis-movie-card">
                <div className="movie-rank-tag">05</div>
                <div className="movie-meta">
                  <div className="movie-title-row">
                    <h5>La La Land</h5>
                    <span className="movie-year">2016 • Damien Chazelle</span>
                  </div>
                  <p className="movie-quote">
                    Romansa realis tentang mimpi, kompromi hidup, dan sequence tatapan mata di ending paling puitis.
                  </p>
                  <div className="movie-tags">
                    <span>Bittersweet</span>
                    <span>Melancholy</span>
                    <span>Romance</span>
                  </div>
                </div>
              </div>

              <div className="elitis-movie-card">
                <div className="movie-rank-tag">06</div>
                <div className="movie-meta">
                  <div className="movie-title-row">
                    <h5>Parasite</h5>
                    <span className="movie-year">2019 • Bong Joon-ho</span>
                  </div>
                  <p className="movie-quote">
                    Satire sosial paling tajam dan rapi dari Korea Selatan yang memenangkan Palme d'Or & Oscar.
                  </p>
                  <div className="movie-tags">
                    <span>Social Satire</span>
                    <span>Black Comedy</span>
                    <span>Masterpiece</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="hobby-modal-actions">
          <button className="modal-support-button" type="button" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default HobbyModal;
