import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Track } from '../types';

interface MusicContextType {
  currentTrack: Track;
  isPlaying: boolean;
  isWidgetVisible: boolean;
  isModalOpen: boolean;
  activeTab: 'nowPlayingTab' | 'searchTab' | 'curatedTab';
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  searchResults: Track[];
  isSearching: boolean;
  searchQuery: string;
  curatedTracks: Track[];
  upcomingTrack: Track | null;
  queue: Track[];

  playTrack: (track: Track) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  seekTo: (percent: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  toggleLoop: () => void;
  openModal: (tab?: 'nowPlayingTab' | 'searchTab' | 'curatedTab') => void;
  closeModal: () => void;
  closeAndStopWidget: () => void;
  restoreWidget: () => void;
  setActiveTab: (tab: 'nowPlayingTab' | 'searchTab' | 'curatedTab') => void;
  searchSongs: (query: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  widgetPosition: { x: number; y: number } | null;
  setWidgetPosition: (pos: { x: number; y: number }) => void;
}

const DEFAULT_TRACK: Track = {
  id: 'dGcGbF4ex5o',
  title: 'Dan...',
  artist: 'Sheila On 7',
  category: 'Hits Indo',
  duration: '04:46',
  thumbnail: 'https://i.ytimg.com/vi/dGcGbF4ex5o/hqdefault.jpg',
  source: 'youtube'
};

const MusicContext = createContext<MusicContextType | undefined>(undefined);

// Extend Window interface for YouTube Iframe API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track>(() => {
    try {
      const saved = localStorage.getItem('gepa_last_track');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_TRACK;
  });

  const [queue, setQueue] = useState<Track[]>([DEFAULT_TRACK]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWidgetVisible, setIsWidgetVisible] = useState(() => {
    return localStorage.getItem('music_widget_hidden') !== 'true';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'nowPlayingTab' | 'searchTab' | 'curatedTab'>('nowPlayingTab');

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(286); // ~4:46
  const [volume, setVolumeState] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [curatedTracks, setCuratedTracks] = useState<Track[]>([]);

  const [widgetPosition, setWidgetPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('music_widget_pos');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const ytPlayerRef = useRef<any>(null);
  const html5AudioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<any>(null);

  // Initialize Curated Tracks
  useEffect(() => {
    fetch('/api/music-search')
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.tracks)) {
          setCuratedTracks(data.tracks);
          if (queue.length <= 1) {
            setQueue(data.tracks);
          }
        }
      })
      .catch(e => console.warn('Failed to load curated tracks:', e));
  }, []);

  // Save last played track
  useEffect(() => {
    try {
      localStorage.setItem('gepa_last_track', JSON.stringify(currentTrack));
    } catch (e) {}
  }, [currentTrack]);

  // Load YouTube Iframe API
  useEffect(() => {
    let isCancelled = false;

    const initYT = () => {
      if (isCancelled) return;
      if (window.YT && window.YT.Player) {
        if (!ytPlayerRef.current) {
          try {
            let targetEl = document.getElementById('ytAudioPlayer');
            if (!targetEl) {
              let wrap = document.getElementById('hiddenYtPlayerContainer');
              if (!wrap) {
                wrap = document.createElement('div');
                wrap.id = 'hiddenYtPlayerContainer';
                wrap.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;opacity:0;pointer-events:none;z-index:-9999;';
                wrap.setAttribute('aria-hidden', 'true');
                document.body.appendChild(wrap);
              }
              targetEl = document.createElement('div');
              targetEl.id = 'ytAudioPlayer';
              wrap.appendChild(targetEl);
            }

            ytPlayerRef.current = new window.YT.Player('ytAudioPlayer', {
              height: '1',
              width: '1',
              videoId: currentTrack.source === 'youtube' ? currentTrack.id : DEFAULT_TRACK.id,
              playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
                origin: window.location.origin
              },
              events: {
                onReady: (event: any) => {
                  try {
                    event.target.setVolume(volume);
                  } catch (e) {}
                },
                onStateChange: (event: any) => {
                  // 1 = playing, 2 = paused, 0 = ended
                  if (event.data === 1) {
                    setIsPlaying(true);
                  } else if (event.data === 2) {
                    setIsPlaying(false);
                  } else if (event.data === 0) {
                    if (isLooping) {
                      try {
                        event.target.seekTo(0);
                        event.target.playVideo();
                      } catch (e) {}
                    } else {
                      playNext();
                    }
                  }
                }
              }
            });
          } catch (e) {
            console.warn('YT player init error:', e);
          }
        }
      }
    };

    if (window.YT && window.YT.Player) {
      initYT();
    } else {
      window.onYouTubeIframeAPIReady = initYT;
      if (!document.getElementById('ytIframeScript')) {
        const tag = document.createElement('script');
        tag.id = 'ytIframeScript';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
    }

    return () => {
      isCancelled = true;
    };
  }, []);

  // Progress update timer
  useEffect(() => {
    if (isPlaying) {
      progressTimerRef.current = setInterval(() => {
        if (html5AudioRef.current && !html5AudioRef.current.paused) {
          setCurrentTime(html5AudioRef.current.currentTime || 0);
          setDuration(html5AudioRef.current.duration || 30);
        } else if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const curr = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || 0;
            setCurrentTime(curr);
            if (dur > 0) setDuration(dur);
          } catch (e) {}
        }
      }, 500);
    } else {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    }
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPlaying]);

  const playTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    setIsWidgetVisible(true);
    localStorage.removeItem('music_widget_hidden');

    // Add to queue if not present
    setQueue(prev => {
      const idx = prev.findIndex(t => t.id === track.id);
      if (idx >= 0) {
        setQueueIndex(idx);
        return prev;
      }
      const updated = [...prev, track];
      setQueueIndex(updated.length - 1);
      return updated;
    });

    if (track.previewUrl || track.source === 'itunes') {
      // Pause YouTube
      if (ytPlayerRef.current && ytPlayerRef.current.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      }
      if (html5AudioRef.current) {
        html5AudioRef.current.src = track.previewUrl || '';
        html5AudioRef.current.volume = isMuted ? 0 : volume / 100;
        html5AudioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    } else {
      // Play YouTube
      if (html5AudioRef.current) {
        html5AudioRef.current.pause();
      }
      if (ytPlayerRef.current && ytPlayerRef.current.loadVideoById) {
        try {
          ytPlayerRef.current.loadVideoById(track.id);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } catch (e) {
          console.warn('YT load error:', e);
        }
      }
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (html5AudioRef.current && !html5AudioRef.current.paused) {
        html5AudioRef.current.pause();
      }
      if (ytPlayerRef.current && ytPlayerRef.current.pauseVideo) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (e) {}
      }
      setIsPlaying(false);
    } else {
      if (currentTrack.previewUrl && html5AudioRef.current) {
        html5AudioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      } else if (ytPlayerRef.current && ytPlayerRef.current.playVideo) {
        try {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } catch (e) {}
      }
    }
  }, [isPlaying, currentTrack]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    const nextIdx = (queueIndex + 1) % queue.length;
    setQueueIndex(nextIdx);
    playTrack(queue[nextIdx]);
  }, [queue, queueIndex, playTrack]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;
    const prevIdx = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prevIdx);
    playTrack(queue[prevIdx]);
  }, [queue, queueIndex, playTrack]);

  const seekTo = useCallback((percent: number) => {
    const targetSec = (percent / 100) * duration;
    setCurrentTime(targetSec);
    if (html5AudioRef.current && html5AudioRef.current.duration) {
      html5AudioRef.current.currentTime = targetSec;
    } else if (ytPlayerRef.current && ytPlayerRef.current.seekTo) {
      try {
        ytPlayerRef.current.seekTo(targetSec, true);
      } catch (e) {}
    }
  }, [duration]);

  const setVolume = useCallback((val: number) => {
    setVolumeState(val);
    if (html5AudioRef.current) {
      html5AudioRef.current.volume = isMuted ? 0 : val / 100;
    }
    if (ytPlayerRef.current && ytPlayerRef.current.setVolume) {
      try {
        ytPlayerRef.current.setVolume(val);
      } catch (e) {}
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (html5AudioRef.current) {
      html5AudioRef.current.muted = nextMute;
    }
    if (ytPlayerRef.current) {
      try {
        if (nextMute && ytPlayerRef.current.mute) ytPlayerRef.current.mute();
        else if (!nextMute && ytPlayerRef.current.unMute) ytPlayerRef.current.unMute();
      } catch (e) {}
    }
  }, [isMuted]);

  const toggleLoop = useCallback(() => {
    setIsLooping(prev => !prev);
  }, []);

  const openModal = useCallback((tab?: 'nowPlayingTab' | 'searchTab' | 'curatedTab') => {
    if (tab) setActiveTab(tab);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const closeAndStopWidget = useCallback(() => {
    if (isPlaying) togglePlay();
    setIsWidgetVisible(false);
    setIsModalOpen(false);
    localStorage.setItem('music_widget_hidden', 'true');
  }, [isPlaying, togglePlay]);

  const restoreWidget = useCallback(() => {
    setIsWidgetVisible(true);
    localStorage.removeItem('music_widget_hidden');
    setIsModalOpen(true);
  }, []);

  const searchSongs = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/music-search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data && Array.isArray(data.tracks)) {
        setSearchResults(data.tracks);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.warn('Search songs error:', e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const upcomingTrack = queue.length > 1 ? queue[(queueIndex + 1) % queue.length] : null;

  return (
    <MusicContext.Provider
      value={{
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
        queue,
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
        restoreWidget,
        setActiveTab,
        searchSongs,
        setSearchQuery,
        widgetPosition,
        setWidgetPosition
      }}
    >
      {children}
      <audio ref={html5AudioRef} preload="auto" style={{ display: 'none' }} />
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
