import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RankingData, RankingItem } from '../types';

interface SupportProps {
  onOpenSupportModal: () => void;
  onOpenAccountModal: () => void;
  onOpenAuthModal: () => void;
  initialRankingData?: RankingData;
}

export const Support: React.FC<SupportProps> = ({
  onOpenSupportModal,
  onOpenAccountModal,
  onOpenAuthModal,
  initialRankingData
}) => {
  const { user } = useAuth();
  const [activeRankTab, setActiveRankTab] = useState<'daily' | 'weekly' | 'lifetime'>('daily');

  const getInitialRankData = (): RankingData => {
    if (initialRankingData) return initialRankingData;
    if (typeof window !== 'undefined' && (window as unknown as { __INITIAL_DATA__?: { leaderboard?: RankingData } }).__INITIAL_DATA__?.leaderboard) {
      return (window as unknown as { __INITIAL_DATA__: { leaderboard: RankingData } }).__INITIAL_DATA__.leaderboard;
    }
    return { daily: [], weekly: [], lifetime: [] };
  };

  const initialData = getInitialRankData();
  const hasInitialData = initialData.daily.length > 0 || initialData.weekly.length > 0 || initialData.lifetime.length > 0;

  const [rankingData, setRankingData] = useState<RankingData>(initialData);
  const [loading, setLoading] = useState(!hasInitialData);

  const fetchRankings = async () => {
    try {
      const res = await fetch('/api/ranking', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setRankingData({
            daily: data.daily || [],
            weekly: data.weekly || [],
            lifetime: data.lifetime || []
          });
        }
      }
    } catch (e) {
      console.warn('Failed to fetch rankings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
    const interval = setInterval(fetchRankings, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID').format(val);
  };

  const currentList = rankingData[activeRankTab] || [];

  return (
    <section className="section support-section" id="support">
      <div className="container">
        <div className="support-grid">
          <div className="support-card">
            <div className="support-decoration" aria-hidden="true">
              <span>✦</span><span>♡</span><span>☼</span>
            </div>
            <div className="support-content">
              <p className="section-kicker">totally optional</p>
              <h2>Support Me <span>(Optional)</span></h2>
              <p>Kalau kamu suka dengan apa yang gue bikin, dan mau traktir, boleh banget.</p>
              <button
                className="button button-support"
                id="supportButton"
                type="button"
                onClick={onOpenSupportModal}
              >
                ☕ Dukung Gue →
              </button>
            </div>
            <div className="support-cup" aria-hidden="true">☕</div>
          </div>

          <div className="ranking-card">
            <div className="ranking-header">
              <h3>🏆 Top Supporters</h3>
              <div className="ranking-tabs">
                <button
                  className={`rank-tab ${activeRankTab === 'daily' ? 'active' : ''}`}
                  onClick={() => setActiveRankTab('daily')}
                  type="button"
                >
                  Daily
                </button>
                <button
                  className={`rank-tab ${activeRankTab === 'weekly' ? 'active' : ''}`}
                  onClick={() => setActiveRankTab('weekly')}
                  type="button"
                >
                  Weekly
                </button>
                <button
                  className={`rank-tab ${activeRankTab === 'lifetime' ? 'active' : ''}`}
                  onClick={() => setActiveRankTab('lifetime')}
                  type="button"
                >
                  Lifetime
                </button>
              </div>
            </div>
            <div className="ranking-body">
              <ul className="ranking-list" id="rankingList">
                {loading ? (
                  <li className="ranking-loading">Memuat ranking...</li>
                ) : currentList.length === 0 ? (
                  <li style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-soft)', fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>☕</div>
                    <div>Belum ada supporter di periode ini.</div>
                    <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Jadilah yang pertama mendukung Gepa! ✨</div>
                  </li>
                ) : (
                  currentList.map((item: RankingItem, index: number) => {
                    const isTop1 = index === 0;
                    const isTop2 = index === 1;
                    const isTop3 = index === 2;
                    const rankMedal = isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `${index + 1}.`;
                    const avatarVal = item.avatar || '✨';
                    const isImg = avatarVal.startsWith('http') || avatarVal.startsWith('data:image');

                    return (
                      <li
                        key={index}
                        className={`ranking-item ${isTop1 ? 'rank-1' : isTop2 ? 'rank-2' : isTop3 ? 'rank-3' : ''}`}
                      >
                        <div className="rank-left">
                          <span className="rank-badge">{rankMedal}</span>
                          <span className="rank-avatar">
                            {isImg ? (
                              <img src={avatarVal} alt={item.username} />
                            ) : (
                              <span>{avatarVal}</span>
                            )}
                          </span>
                          <div className="rank-user-info">
                            <span className="rank-username">@{item.username}</span>
                            {item.txCount > 1 && (
                              <span className="rank-tx-count">{item.txCount}x traktir</span>
                            )}
                          </div>
                        </div>
                        <div className="rank-right">
                          <strong className="rank-amount">Rp{formatRupiah(item.totalAmount)}</strong>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Akun & Riwayat Supporter Banner Note */}
        <div
          className="paper-card"
          style={{
            marginTop: '25px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            background: 'var(--sage-50)',
            border: '1px solid var(--border)',
            borderRadius: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '1.8rem' }}>☕</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                Kelola Profil & Cek Riwayat Traktiran
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>
                Lihat invoice resmi, ganti foto profil leaderboard, atau kelola akun langsung di Dashboard Akun.
              </div>
            </div>
          </div>
          <button
            type="button"
            id="openAccountDashboardShortcut"
            className="button button-primary"
            style={{ padding: '10px 20px', fontSize: '0.85rem', borderRadius: '12px', whiteSpace: 'nowrap' }}
            onClick={() => {
              if (user) onOpenAccountModal();
              else onOpenAuthModal();
            }}
          >
            Buka Dashboard Akun ✨
          </button>
        </div>
      </div>
    </section>
  );
};
