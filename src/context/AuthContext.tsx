import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserSession, Donation } from '../types';

interface AuthContextType {
  session: UserSession | null;
  user: User | null;
  login: (sessionData: UserSession) => void;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
  syncProfileFromServer: (force?: boolean) => Promise<void>;
  userDonations: Donation[];
  fetchUserDonations: () => Promise<void>;
  isLoadingDonations: boolean;
}

const AUTH_STORAGE_KEY = 'gepa_corner_auth_session';
const ALT_STORAGE_KEY = 'gepa_auth_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(ALT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.user) return parsed;
      }
    } catch (e) {
      console.warn('Error reading saved session:', e);
    }
    return null;
  });

  const [userDonations, setUserDonations] = useState<Donation[]>([]);
  const [isLoadingDonations, setIsLoadingDonations] = useState(false);

  const saveSession = useCallback((sess: UserSession | null) => {
    setSession(sess);
    if (sess) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sess));
        localStorage.setItem(ALT_STORAGE_KEY, JSON.stringify(sess));
      } catch (e) {}
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(ALT_STORAGE_KEY);
      setUserDonations([]);
    }
  }, []);

  const login = useCallback((sessionData: UserSession) => {
    saveSession(sessionData);
  }, [saveSession]);

  const logout = useCallback(() => {
    saveSession(null);
  }, [saveSession]);

  const updateUser = useCallback((updatedFields: Partial<User>) => {
    setSession(prev => {
      if (!prev || !prev.user) return prev;
      const updated: UserSession = {
        ...prev,
        user: { ...prev.user, ...updatedFields }
      };
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
        localStorage.setItem(ALT_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}

      // Broadcast update across tabs
      try {
        const channel = new BroadcastChannel('gepa_user_sync_channel');
        channel.postMessage({ type: 'PROFILE_UPDATED', user: updated.user });
        channel.close();
      } catch (e) {}

      return updated;
    });
  }, []);

  const syncProfileFromServer = useCallback(async (force = false) => {
    if (!session || !session.user) return;
    try {
      const u = session.user;
      const targetUsername = u.username || '';
      const targetId = u.id || '';
      const token = session.accessToken || session.token;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`/api/auth?action=me&username=${encodeURIComponent(targetUsername)}&userId=${encodeURIComponent(targetId)}`, {
        headers,
        cache: 'no-store'
      });

      if (!res.ok) return;
      const data = await res.json();
      if (data && data.user) {
        let changed = false;
        const current = session.user;
        const incoming = data.user;

        if (incoming.avatar && incoming.avatar !== current.avatar) changed = true;
        if (incoming.bio !== undefined && incoming.bio !== current.bio) changed = true;
        if (incoming.phone !== undefined && incoming.phone !== current.phone) changed = true;

        if (changed) {
          updateUser({
            avatar: incoming.avatar || current.avatar,
            bio: incoming.bio !== undefined ? incoming.bio : current.bio,
            phone: incoming.phone !== undefined ? incoming.phone : current.phone
          });
        }
      }
    } catch (e) {
      console.warn('syncProfileFromServer fallback:', e);
    }
  }, [session, updateUser]);

  const fetchUserDonations = useCallback(async () => {
    if (!session || !session.user || !session.user.username) {
      setUserDonations([]);
      return;
    }
    setIsLoadingDonations(true);
    const username = session.user.username.replace(/^@/, '');
    const token = session.token || session.accessToken;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch(`/api/user-donations?username=${encodeURIComponent(username)}&userId=${encodeURIComponent(session.user.id || '')}`, {
        headers,
        cache: 'no-store'
      });

      let serverList: Donation[] = [];
      if (res.ok) {
        serverList = await res.json();
      }

      // Check local storage cached completed donations as well
      const localKey = 'gepa_user_donations_' + username.toLowerCase();
      let localList: Donation[] = [];
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) localList = JSON.parse(raw);
      } catch (e) {}

      // General completed donations
      let generalList: Donation[] = [];
      try {
        const rawGen = localStorage.getItem('gepa_completed_donations');
        if (rawGen) generalList = JSON.parse(rawGen);
      } catch (e) {}

      const map = new Map<string, Donation>();
      serverList.forEach(item => {
        const key = item.order_id || item.orderId;
        if (key) map.set(key, item);
      });

      [...localList, ...generalList].forEach(item => {
        const key = item.order_id || item.orderId;
        const u = String(item.username || '').replace(/^@/, '').toLowerCase();
        if (key && (!item.username || u === username.toLowerCase()) && !map.has(key)) {
          map.set(key, item);
        }
      });

      const merged = Array.from(map.values()).sort((a, b) => {
        const tA = new Date(a.transaction_time || a.createdAt || Date.now()).getTime();
        const tB = new Date(b.transaction_time || b.createdAt || Date.now()).getTime();
        return tB - tA;
      });

      setUserDonations(merged);
    } catch (err) {
      console.warn('Error fetching user donations:', err);
    } finally {
      setIsLoadingDonations(false);
    }
  }, [session]);

  // Multi-tab synchronization
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('gepa_user_sync_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'PROFILE_UPDATED' && event.data.user) {
          const incoming = event.data.user;
          setSession(prev => {
            if (prev?.user && prev.user.username.toLowerCase() === incoming.username?.toLowerCase()) {
              const updated = { ...prev, user: { ...prev.user, ...incoming } };
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
        }
      };
    } catch (e) {}

    const handleStorage = (e: StorageEvent) => {
      if ((e.key === AUTH_STORAGE_KEY || e.key === ALT_STORAGE_KEY) && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.user) {
            setSession(parsed);
          }
        } catch (err) {}
      } else if ((e.key === AUTH_STORAGE_KEY || e.key === ALT_STORAGE_KEY) && !e.newValue) {
        setSession(null);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Sync profile when tab becomes visible or focused
  useEffect(() => {
    const onFocus = () => syncProfileFromServer(true);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncProfileFromServer(true);
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [syncProfileFromServer]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        login,
        logout,
        updateUser,
        syncProfileFromServer,
        userDonations,
        fetchUserDonations,
        isLoadingDonations
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
