import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenAccount: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onOpenAccount }) => {
  const { user } = useAuth();
  const { isPlaying, restoreWidget } = useMusic();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('gepa-theme') === 'dark';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('gepa-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const sections = ['home', 'about', 'links', 'support'];
      const scrollPos = window.scrollY + 120;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <nav className="navbar container" aria-label="Main navigation">
        <div className="brand-group">
          <a href="#home" className="brand" aria-label="Gepa Home" onClick={closeMobileMenu}>
            <span className="brand-dot"></span>
            Gepa
          </a>
          <button
            className={`header-music-toggle ${isPlaying ? 'playing' : ''}`}
            id="headerMusicToggle"
            type="button"
            aria-label="Pemutar Musik Online"
            title="Buka Pemutar Musik (Lagu background)"
            onClick={() => restoreWidget()}
          >
            <span className="header-music-icon" id="headerMusicIcon">🎵</span>
            <span className="header-music-eq" id="headerMusicEq" aria-hidden="true">
              <span className="eq-bar bar1"></span>
              <span className="eq-bar bar2"></span>
              <span className="eq-bar bar3"></span>
            </span>
            <span className="header-music-text">Musik</span>
          </button>
        </div>

        <button
          className="mobile-menu-button"
          id="mobileMenuButton"
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="navMenu"
          onClick={() => setMobileMenuOpen(prev => !prev)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`} id="navMenu">
          <a
            href="#home"
            className={`nav-link ${activeSection === 'home' ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            Home
          </a>
          <a
            href="#about"
            className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            About
          </a>
          <a
            href="#links"
            className={`nav-link ${activeSection === 'links' ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            Links
          </a>
          <a
            href="#support"
            className={`nav-link ${activeSection === 'support' ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            Support
          </a>

          <button
            className="theme-toggle"
            id="themeToggle"
            type="button"
            aria-label="Toggle dark mode"
            title="Toggle theme"
            onClick={toggleTheme}
          >
            <span id="themeIcon">{isDarkMode ? '☼' : '☾'}</span>
          </button>

          {user ? (
            <button
              className="auth-nav-btn"
              type="button"
              title={`Akun: @${user.username}`}
              onClick={() => {
                closeMobileMenu();
                onOpenAccount();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '12px',
                background: 'var(--sage-100)',
                color: 'var(--sage-900)',
                border: '1px solid var(--border)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <span className="auth-nav-avatar" style={{ display: 'inline-flex', alignItems: 'center' }}>
                {user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:image')) ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '0.95rem' }}>{user.avatar || '👤'}</span>
                )}
              </span>
              <span>@{user.username}</span>
            </button>
          ) : (
            <button
              className="button button-primary"
              id="openAuthModalBtn"
              type="button"
              style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '12px', marginLeft: '6px' }}
              onClick={() => {
                closeMobileMenu();
                onOpenAuth();
              }}
            >
              ✨ Masuk
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};
