import React, { useState, useRef, useEffect } from 'react';

const PHOTOS = [
  '/assets/foto-1.jpg',
  '/assets/foto-6.jpg',
  '/assets/foto-2.jpg'
];

export const Hero: React.FC = () => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const prevPhoto = () => {
    setPhotoIndex(prev => (prev === 0 ? PHOTOS.length - 1 : prev - 1));
  };

  const nextPhoto = () => {
    setPhotoIndex(prev => (prev === PHOTOS.length - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchEndX.current - touchStartX.current;
    if (Math.abs(diff) > 40) {
      if (diff < 0) nextPhoto();
      else prevPhoto();
    }
  };

  return (
    <>
      <div className="page-decoration decoration-one" aria-hidden="true">✦</div>
      <div className="page-decoration decoration-two" aria-hidden="true">♡</div>

      <section className="hero section" id="home">
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="tiny-label">
              <span className="status-dot"></span>
              welcome to my little corner
            </div>
            <p className="eyebrow">Hi, I'm Gepa ✌</p>
            <h1>Just a regular guy with <span>big dreams,</span> trying to be a better version of myself.</h1>
            <p className="hero-description">
              A small corner of the internet where I keep my interests, links, little moments, and a few pieces of my journey.
            </p>
            <div className="hero-actions">
              <a href="#about" className="button button-primary">
                Get to know me <span>↓</span>
              </a>
              <a href="#links" className="button button-secondary">
                Find me around
              </a>
            </div>
            <div className="social-row" aria-label="Social media links">
              <a
                href="#"
                className="social-icon"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5"></rect>
                  <circle cx="12" cy="12" r="4"></circle>
                  <circle cx="17.3" cy="6.7" r="1"></circle>
                </svg>
              </a>
              <a
                href="#"
                className="social-icon"
                aria-label="WhatsApp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.5 11.7a8.5 8.5 0 0 1-12.5 7.5L3 20.5l1.3-4.8A8.5 8.5 0 1 1 20.5 11.7Z"></path>
                  <path d="M8.4 8.1c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.3.1.5-.1.7l-.5.6c-.1.2-.2.3 0 .6.3.6 1.2 1.9 2.7 2.6.3.2.5.1.7-.1l.7-.8c.2-.2.4-.2.7-.1l1.5.7c.3.1.4.3.4.5 0 .4-.2 1.2-.6 1.4-.4.3-1 .5-1.7.4-1.1-.2-2.4-.8-3.7-2-1.2-1.1-2-2.3-2.5-3.2-.5-.9-.6-1.6-.4-2.5.1-.4.3-.8.4-1Z"></path>
                </svg>
              </a>
              <a
                href="#"
                className="social-icon"
                aria-label="TikTok"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 4c.2 2.2 1.5 3.7 3.7 3.9v3c-1.4 0-2.7-.4-3.7-1.1v5.7a5.5 5.5 0 1 1-4.7-5.4v3.1a2.5 2.5 0 1 0 1.7 2.4V4h3z"></path>
                </svg>
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="doodle doodle-star" aria-hidden="true">✦</div>
            <div className="doodle doodle-spark" aria-hidden="true">✧</div>

            <div className="profile-card">
              <div className="tape tape-top"></div>
              <div
                className="photo-carousel"
                id="photoCarousel"
                aria-label="Photo gallery"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  className="photo-track"
                  id="photoTrack"
                  style={{
                    display: 'flex',
                    transform: `translate3d(-${photoIndex * 100}%, 0, 0)`,
                    transition: 'transform 420ms cubic-bezier(.22,.61,.36,1)'
                  }}
                >
                  {PHOTOS.map((src, idx) => (
                    <div className="photo-slide" key={idx} style={{ minWidth: '100%', position: 'relative' }}>
                      <img
                        src={src}
                        alt={`Gepa portrait ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span className="photo-caption">that's me :)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="carousel-controls">
                <button
                  type="button"
                  className="carousel-button"
                  id="prevPhoto"
                  aria-label="Previous photo"
                  onClick={prevPhoto}
                >
                  ←
                </button>
                <div className="carousel-dots" id="carouselDots" aria-label="Photo indicators">
                  {PHOTOS.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`carousel-dot ${idx === photoIndex ? 'active' : ''}`}
                      onClick={() => setPhotoIndex(idx)}
                      aria-label={`Go to photo ${idx + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="carousel-button"
                  id="nextPhoto"
                  aria-label="Next photo"
                  onClick={nextPhoto}
                >
                  →
                </button>
              </div>

              <div className="profile-note">
                <span>currently</span>
                <strong>figuring things out...</strong>
              </div>
              <div className="profile-line"></div>
              <div className="profile-mini">
                <span>♡</span>
                <span>dream big, stay kind</span>
              </div>
            </div>
            <div className="good-things-note">Good things take time. <span>☆</span></div>
          </div>
        </div>
      </section>
    </>
  );
};
