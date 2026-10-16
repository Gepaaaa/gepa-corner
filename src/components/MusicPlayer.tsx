import React, { useState, useRef, useEffect } from 'react';
import { useMusic } from '../context/MusicContext';
import { Track } from '../types';

export const MusicPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isWidgetVisible,
    isModalOpen,
    activeTab,
    currentTime,
    duration,
    volume,
    isMuted,
    isLooping,
    searchResults,
    isSearching,
    searchQuery,
    curatedTracks,
    upcomingTrack,
    playTrack,
    togglePlay,
    playNext,
    playPrev,
    seekTo,
    setVolume,
    toggleMute,
    toggleLoop,
    openModal,
    closeModal,
    closeAndStopWidget,
    setActiveTab,
    searchSongs,
    setSearchQuery,
    widgetPosition,
    setWidgetPosition
  } = useMusic();

  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialWidgetPos = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // If clicked on buttons inside the floating widget, don't drag
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    const widget = document.getElementById('floatingMusicWidget');
    if (widget) {
      const rect = widget.getBoundingClientRect();
      initialWidgetPos.current = { x: rect.left, y: rect.top };
    }
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMovedRef.current = true;
      }

      const newX = Math.max(10, Math.min(window.innerWidth - 270, initialWidgetPos.current.x + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 70, initialWidgetPos.current.y + dy));

      setWidgetPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (widgetPosition) {
          try {
            localStorage.setItem('music_widget_pos', JSON.stringify(widgetPosition));
          } catch (e) {}
        }
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, widgetPosition, setWidgetPosition]);

  const handleWidgetBodyClick = () => {
    if (!hasMovedRef.current) {
      openModal();
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Filter curated songs by category
  const indoHits = curatedTracks.filter(t => t.category?.includes('Indo') || t.category === 'Hits Indo');
  const lofiHits = curatedTracks.filter(t => t.category?.includes('Lo-Fi') || t.category?.includes('Lofi'));
  const globalHits = curatedTracks.filter(t => t.category?.includes('Global') || t.category === 'Akustik');

  const keywordChips = [
    'Bernadya',
    'Sal Priadi',
    'Sheila On 7',
    'Nadin Amizah',
    'Tulus',
    'Coldplay',
    'Bruno Mars',
    'Hindia',
    'Pamungkas',
    'Dewa 19',
    'Lofi Girl Beats'
  ];

  return (
    <>
      {/* Floating Music Widget */}
      {isWidgetVisible && (
        <div
          id="floatingMusicWidget"
          className={`floating-music-widget ${isPlaying ? 'playing' : ''}`}
          aria-label="Floating Music Widget"
          role="region"
          style={
            widgetPosition
              ? { left: `${widgetPosition.x}px`, top: `${widgetPosition.y}px`, right: 'auto', bottom: 'auto' }
              : undefined
          }
          onPointerDown={handlePointerDown}
        >
          <button
            id="floatingMusicCloseBtn"
            className="floating-music-close-btn"
            type="button"
            title="Matikan musik dan tutup widget"
            aria-label="Tutup dan hentikan musik"
            onClick={(e) => {
              e.stopPropagation();
              closeAndStopWidget();
            }}
          >
            ✕
          </button>

          <div
            id="floatingMusicBody"
            className="floating-music-body"
            title="Tarik untuk memindahkan, klik untuk membuka pemutar musik"
            onClick={handleWidgetBodyClick}
          >
            <div className="floating-drag-indicator" title="Geser posisi">
              <span></span><span></span><span></span>
            </div>

            <div className="vinyl-disc-wrap">
              <div id="vinylDisc" className="vinyl-disc">
                <img
                  id="vinylCover"
                  src={currentTrack.thumbnail || 'https://i.ytimg.com/vi/dGcGbF4ex5o/hqdefault.jpg'}
                  alt="Cover lagu"
                  className="vinyl-cover"
                />
                <div className="vinyl-center-dot"></div>
              </div>
            </div>

            <div className="floating-music-info">
              <div className="floating-title-row">
                <div id="floatingTrackTitle" className="floating-track-title">
                  {currentTrack.title || 'Dan...'}
                </div>
                <div
                  className="floating-mini-eq"
                  id="floatingMiniEq"
                  aria-hidden="true"
                  style={{ display: isPlaying ? 'inline-flex' : 'none' }}
                >
                  <span></span><span></span><span></span>
                </div>
              </div>
              <div id="floatingTrackArtist" className="floating-track-artist">
                {currentTrack.artist || 'Sheila On 7'}
              </div>
            </div>

            <div className="floating-actions">
              <button
                id="floatingQuickPlayBtn"
                className="floating-play-btn"
                type="button"
                aria-label="Putar / Jeda"
                title="Putar / Jeda"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
              >
                <span id="floatingPlayIcon">{isPlaying ? '⏸' : '▶'}</span>
              </button>
              <button
                id="floatingQuickNextBtn"
                className="floating-next-btn"
                type="button"
                aria-label="Lagu berikutnya"
                title="Lagu berikutnya"
                onClick={(e) => {
                  e.stopPropagation();
                  playNext();
                }}
              >
                <span>⏭</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Music Modal */}
      {isModalOpen && (
        <div
          id="musicModalOverlay"
          className="music-modal-overlay active"
          aria-hidden={!isModalOpen}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="music-modal-container" role="dialog" aria-modal="true" aria-labelledby="musicModalTitle">
            <div className="music-modal-header">
              <div className="music-modal-brand">
                <div className="music-modal-icon-wrap">
                  <span className="music-modal-logo">🎧</span>
                </div>
                <div>
                  <div className="music-modal-title-row">
                    <h3 id="musicModalTitle" className="music-modal-title">Pemutar Musik Online</h3>
                    <span className="music-live-tag">Online & Background</span>
                  </div>
                  <p className="music-modal-subtitle">Putar jutaan lagu tanpa jeda saat menjelajahi website</p>
                </div>
              </div>
              <div className="music-modal-header-actions">
                <button
                  id="musicModalMinimizeBtn"
                  className="music-modal-action-btn minimize-btn"
                  type="button"
                  title="Kecilkan ke widget mengambang (musik tetap berputar)"
                  aria-label="Kecilkan"
                  onClick={closeModal}
                >
                  <span>—</span>
                </button>
                <button
                  id="musicModalCloseAndStopBtn"
                  className="music-modal-action-btn stop-close-btn"
                  type="button"
                  title="Matikan musik & sembunyikan widget"
                  aria-label="Tutup dan matikan musik"
                  onClick={closeAndStopWidget}
                >
                  <span>✕</span>
                </button>
              </div>
            </div>

            {/* Music Navigation Tabs */}
            <div className="music-tabs" role="tablist">
              <button
                className={`music-tab-btn ${activeTab === 'nowPlayingTab' ? 'active' : ''}`}
                onClick={() => setActiveTab('nowPlayingTab')}
                role="tab"
                aria-selected={activeTab === 'nowPlayingTab'}
              >
                <span className="tab-icon">💿</span> Sedang Diputar
              </button>
              <button
                className={`music-tab-btn ${activeTab === 'searchTab' ? 'active' : ''}`}
                onClick={() => setActiveTab('searchTab')}
                role="tab"
                aria-selected={activeTab === 'searchTab'}
              >
                <span className="tab-icon">🔍</span> Cari Lagu
              </button>
              <button
                className={`music-tab-btn ${activeTab === 'curatedTab' ? 'active' : ''}`}
                onClick={() => setActiveTab('curatedTab')}
                role="tab"
                aria-selected={activeTab === 'curatedTab'}
              >
                <span className="tab-icon">✨</span> Pilihan Populer
              </button>
            </div>

            <div className="music-modal-body">
              {/* TAB 1: Now Playing */}
              {activeTab === 'nowPlayingTab' && (
                <div id="nowPlayingTab" className="music-tab-content active" role="tabpanel">
                  <div className={`player-hero-card ${isPlaying ? 'playing' : ''}`}>
                    <div className="player-cover-container">
                      <img
                        id="playerAlbumArt"
                        src={currentTrack.thumbnail || 'https://i.ytimg.com/vi/dGcGbF4ex5o/hqdefault.jpg'}
                        alt="Album Cover"
                        className="player-album-art"
                      />
                      <div id="playerWaveOverlay" className="player-wave-overlay">
                        <span></span><span></span><span></span><span></span><span></span>
                      </div>
                    </div>
                    <div className="player-meta">
                      <h4 id="playerTrackTitle" className="player-track-title">{currentTrack.title}</h4>
                      <p id="playerArtistName" className="player-artist-name">{currentTrack.artist}</p>
                      <span id="playerSourceBadge" className="player-source-badge">
                        {currentTrack.category ? `${currentTrack.category} • Online` : 'YouTube Audio Stream'}
                      </span>
                    </div>

                    {/* Seek Bar */}
                    <div className="player-progress-area">
                      <div className="progress-bar-wrapper" id="progressBarWrapper">
                        <div className="progress-bar-rail"></div>
                        <div
                          id="progressBarFill"
                          className="progress-bar-fill"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                        <input
                          type="range"
                          id="playerSeekSlider"
                          className="player-seek-slider"
                          min="0"
                          max="100"
                          value={progressPercent}
                          step="0.1"
                          aria-label="Durasi lagu"
                          onChange={(e) => seekTo(parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="player-time-row">
                        <span id="playerCurrentTime" className="time-text">{formatDuration(currentTime)}</span>
                        <span id="playerTotalDuration" className="time-text">{currentTrack.duration || formatDuration(duration)}</span>
                      </div>
                    </div>

                    {/* Main Controls */}
                    <div className="player-controls-row">
                      <button
                        id="playerLoopBtn"
                        className={`control-btn secondary-btn ${isLooping ? 'active' : ''}`}
                        type="button"
                        title={isLooping ? 'Ulang lagu aktif' : 'Ulang lagu mati'}
                        onClick={toggleLoop}
                      >
                        🔁
                      </button>
                      <button
                        id="playerPrevBtn"
                        className="control-btn secondary-btn"
                        type="button"
                        title="Lagu sebelumnya"
                        onClick={playPrev}
                      >
                        ⏮
                      </button>
                      <button
                        id="playerPlayPauseBtn"
                        className="control-btn play-main-btn"
                        type="button"
                        title="Putar / Jeda"
                        onClick={togglePlay}
                      >
                        <span>{isPlaying ? '⏸' : '▶'}</span>
                      </button>
                      <button
                        id="playerNextBtn"
                        className="control-btn secondary-btn"
                        type="button"
                        title="Lagu berikutnya"
                        onClick={playNext}
                      >
                        ⏭
                      </button>
                      <button
                        id="playerMuteBtn"
                        className="control-btn secondary-btn"
                        type="button"
                        title={isMuted ? 'Batal bisu' : 'Bisu'}
                        onClick={toggleMute}
                      >
                        {isMuted ? '🔇' : '🔊'}
                      </button>
                    </div>

                    {/* Volume Bar */}
                    <div className="player-volume-row">
                      <span className="vol-icon" id="volIndicatorIcon">
                        {isMuted || volume === 0 ? '🔇' : volume < 50 ? '🔈' : '🔉'}
                      </span>
                      <input
                        type="range"
                        id="playerVolumeSlider"
                        className="player-volume-slider"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        aria-label="Volume musik"
                        onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                      />
                      <span id="volumePercent" className="vol-label">{isMuted ? '0%' : `${volume}%`}</span>
                    </div>

                    {/* Quick Queue Preview */}
                    <div className="player-queue-preview">
                      <div className="queue-header">
                        <span className="queue-title">Antrean Berikutnya:</span>
                        <span id="queueCount" className="queue-count">
                          {upcomingTrack ? '1 lagu' : 'Antrean siap'}
                        </span>
                      </div>
                      <div id="playerUpcomingTrack" className="upcoming-track-pill">
                        <span className="upcoming-icon">🎵</span>
                        <span id="upcomingTrackText" className="upcoming-text">
                          {upcomingTrack
                            ? `${upcomingTrack.title} — ${upcomingTrack.artist}`
                            : 'Pilih lagu untuk menambahkan ke antrean'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Online Search */}
              {activeTab === 'searchTab' && (
                <div id="searchTab" className="music-tab-content active" role="tabpanel">
                  <div className="music-search-section">
                    <div className="music-search-box">
                      <div className="music-search-input-wrap">
                        <span className="search-icon-symbol" aria-hidden="true">🔍</span>
                        <input
                          type="text"
                          id="musicSearchInput"
                          className="music-search-input"
                          placeholder="Ketik judul lagu atau nama penyanyi..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchSongs(searchQuery)}
                          autoComplete="off"
                        />
                        {searchQuery && (
                          <button
                            id="musicSearchClearBtn"
                            className="search-clear-btn"
                            type="button"
                            title="Hapus pencarian"
                            onClick={() => {
                              setSearchQuery('');
                              searchSongs('');
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <button
                        id="musicSearchSubmitBtn"
                        className="music-search-go-btn"
                        type="button"
                        onClick={() => searchSongs(searchQuery)}
                      >
                        <span>Cari</span>
                      </button>
                    </div>
                  </div>

                  {/* Keywords Chips */}
                  <div className="search-keywords-wrapper">
                    <div className="search-keywords-header">
                      <span className="search-keywords-label">Pilihan Kata Kunci Populer</span>
                      <span className="search-keywords-sub">Klik untuk putar cepat</span>
                    </div>
                    <div className="search-keywords-list">
                      {keywordChips.map((chip, i) => (
                        <button
                          key={i}
                          type="button"
                          className="search-chip"
                          onClick={() => {
                            setSearchQuery(chip);
                            searchSongs(chip);
                          }}
                        >
                          {chip === 'Lofi Girl Beats' ? '☕ Lo-Fi' : chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isSearching && (
                    <div id="musicSearchLoading" className="music-search-loading">
                      <div className="loading-spinner-music"></div>
                      <p id="searchLoadingText">Mencari lagu di katalog musik online...</p>
                    </div>
                  )}

                  <div id="musicSearchResultsList" className="music-results-list">
                    {searchResults.map((track) => {
                      const isCurrent = track.id === currentTrack.id;
                      return (
                        <div
                          key={track.id}
                          className={`music-result-item ${isCurrent ? 'active' : ''}`}
                          onClick={() => playTrack(track)}
                        >
                          <img
                            src={track.thumbnail || 'https://i.ytimg.com/vi/dGcGbF4ex5o/hqdefault.jpg'}
                            alt={track.title}
                            className="result-thumb"
                          />
                          <div className="result-info">
                            <span className="result-title">{track.title}</span>
                            <span className="result-artist">{track.artist}</span>
                          </div>
                          <span className="result-duration">{track.duration}</span>
                          <button
                            type="button"
                            className="result-play-btn"
                            title="Putar lagu ini"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isCurrent) togglePlay();
                              else playTrack(track);
                            }}
                          >
                            {isCurrent && isPlaying ? '⏸' : '▶'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: Curated Quick Play */}
              {activeTab === 'curatedTab' && (
                <div id="curatedTab" className="music-tab-content active" role="tabpanel">
                  <div className="curated-categories">
                    <div className="curated-section">
                      <h5 className="curated-header">🇮🇩 Hits Populer Indonesia</h5>
                      <div className="curated-tracks-grid">
                        {indoHits.map(track => {
                          const isCurrent = track.id === currentTrack.id;
                          return (
                            <div
                              key={track.id}
                              className={`music-result-item ${isCurrent ? 'active' : ''}`}
                              onClick={() => playTrack(track)}
                            >
                              <img
                                src={track.thumbnail}
                                alt={track.title}
                                className="result-thumb"
                              />
                              <div className="result-info">
                                <span className="result-title">{track.title}</span>
                                <span className="result-artist">{track.artist}</span>
                              </div>
                              <button
                                type="button"
                                className="result-play-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isCurrent) togglePlay();
                                  else playTrack(track);
                                }}
                              >
                                {isCurrent && isPlaying ? '⏸' : '▶'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="curated-section">
                      <h5 className="curated-header">☕ Lo-Fi & Santai</h5>
                      <div className="curated-tracks-grid">
                        {lofiHits.map(track => {
                          const isCurrent = track.id === currentTrack.id;
                          return (
                            <div
                              key={track.id}
                              className={`music-result-item ${isCurrent ? 'active' : ''}`}
                              onClick={() => playTrack(track)}
                            >
                              <img
                                src={track.thumbnail}
                                alt={track.title}
                                className="result-thumb"
                              />
                              <div className="result-info">
                                <span className="result-title">{track.title}</span>
                                <span className="result-artist">{track.artist}</span>
                              </div>
                              <button
                                type="button"
                                className="result-play-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isCurrent) togglePlay();
                                  else playTrack(track);
                                }}
                              >
                                {isCurrent && isPlaying ? '⏸' : '▶'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="curated-section">
                      <h5 className="curated-header">🌎 Top Global Hits</h5>
                      <div className="curated-tracks-grid">
                        {globalHits.map(track => {
                          const isCurrent = track.id === currentTrack.id;
                          return (
                            <div
                              key={track.id}
                              className={`music-result-item ${isCurrent ? 'active' : ''}`}
                              onClick={() => playTrack(track)}
                            >
                              <img
                                src={track.thumbnail}
                                alt={track.title}
                                className="result-thumb"
                              />
                              <div className="result-info">
                                <span className="result-title">{track.title}</span>
                                <span className="result-artist">{track.artist}</span>
                              </div>
                              <button
                                type="button"
                                className="result-play-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isCurrent) togglePlay();
                                  else playTrack(track);
                                }}
                              >
                                {isCurrent && isPlaying ? '⏸' : '▶'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="music-modal-footer">
              <span className="music-footer-tip">
                💡 Musik tetap berputar di latar belakang saat Anda berpindah halaman sampai tombol 'X' ditekan.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
