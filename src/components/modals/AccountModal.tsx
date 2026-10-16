import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Donation } from '../../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSupport: () => void;
  onSelectInvoice: (orderId: string, donation?: Donation) => void;
}

const PRESET_AVATARS = ['🐱', '☕', '🎮', '🚀', '🎧', '🦊', '⚡', '🌟', '👑', '🔥'];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onOpenSupport,
  onSelectInvoice
}) => {
  const { user, session, logout, updateUser, userDonations, fetchUserDonations } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'security'>('profile');

  // Profile fields
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('👤');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || '');
      setBio(user.bio || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || '👤');
      fetchUserDonations();
    }
  }, [isOpen, user, fetchUserDonations]);

  if (!isOpen || !user) return null;

  const isImageUrl = (val: string) => {
    return typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image'));
  };

  // Calculations
  const totalAmount = userDonations.reduce((sum, d) => sum + (Number(d.amount || d.gross_amount) || 0), 0);
  const txCount = userDonations.length;

  const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID').format(val);

  const getTier = () => {
    if (totalAmount >= 100000) return { label: '👑 VIP Legend Supporter', bg: '#d97706' };
    if (totalAmount >= 20000) return { label: '🥈 Supporter Aktif', bg: 'var(--sage-700)' };
    if (totalAmount > 0) return { label: '🥉 Sahabat Corner', bg: 'var(--sage-600)' };
    return { label: '✨ Pendukung Baru', bg: 'var(--sage-500)' };
  };

  const tier = getTier();

  // Compress image from local device via Canvas
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Pilih file gambar valid (JPG, PNG, atau WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran file maksimal 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 256;
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;

        canvas.width = maxDim;
        canvas.height = maxDim;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, startX, startY, size, size, 0, 0, maxDim, maxDim);
          const dataUrl = canvas.toDataURL('image/webp', 0.85);
          setAvatar(dataUrl);
          showToast('Foto profil dipilih dari galeri! Jangan lupa simpan perubahan. 📸');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: session?.token ? `Bearer ${session.token}` : ''
        },
        body: JSON.stringify({
          action: 'update-profile',
          userId: user.id,
          username: cleanUsername || user.username,
          bio: bio.trim(),
          phone: phone.trim(),
          avatar: avatar
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan profil.');

      updateUser({
        username: cleanUsername || user.username,
        bio: bio.trim(),
        phone: phone.trim(),
        avatar: avatar
      });

      showToast('Profil berhasil disimpan! ✨');
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-password',
          userId: user.id,
          oldPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah password.');

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(data.message || 'Password berhasil diubah! 🔐');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    showToast('Berhasil keluar dari akun.');
    onClose();
  };

  return (
    <div className="modal-overlay active" id="accountModal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="support-modal modal-content"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 480, textAlign: 'left', padding: '26px 22px' }}
      >
        <button className="modal-close" type="button" onClick={onClose}>×</button>

        {/* Profile Hero */}
        <div className="acc-profile-hero">
          <div className="acc-hero-avatar-wrap">
            <div
              className="acc-hero-avatar"
              id="accHeroAvatar"
              style={{
                overflow: 'hidden',
                width: 68,
                height: 68,
                borderRadius: '50%',
                border: '3px solid var(--sage-200)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--sage-100)',
                margin: '0 auto 10px'
              }}
            >
              {isImageUrl(avatar) ? (
                <img
                  src={avatar}
                  alt={user.username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                <span style={{ fontSize: '2rem' }}>{avatar || '👤'}</span>
              )}
            </div>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 2, textAlign: 'center' }}>
            @{user.username}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', fontStyle: 'italic', marginBottom: 4, textAlign: 'center' }}>
            {user.bio ? `"${user.bio}"` : '"Sahabat Corner"'}
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginBottom: 6, textAlign: 'center' }}>
            {user.email || `${user.username}@gepacorner.my.id`}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="acc-badge-tier" style={{ display: 'inline-block', background: tier.bg, color: '#fff' }}>
              <span>{tier.label}</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="acc-stats-row">
          <div className="acc-stat-box">
            <div className="acc-stat-val">Rp{formatRupiah(totalAmount)}</div>
            <div className="acc-stat-lbl">Total Traktiran</div>
          </div>
          <div className="acc-stat-box">
            <div className="acc-stat-val">{txCount}x</div>
            <div className="acc-stat-lbl">Frekuensi</div>
          </div>
          <div className="acc-stat-box">
            <div className="acc-stat-val">{txCount > 0 ? 'Aktif' : '-'}</div>
            <div className="acc-stat-lbl">Status</div>
          </div>
        </div>

        {/* Tab switchers */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: 4, borderRadius: 12, marginBottom: 16, border: '1px solid var(--border)', gap: 4 }}>
          <button
            type="button"
            className="acc-tab"
            style={{
              flex: 1,
              padding: 9,
              border: 'none',
              background: activeTab === 'profile' ? 'var(--sage-700)' : 'transparent',
              color: activeTab === 'profile' ? '#fff' : 'var(--text-soft)',
              fontWeight: 600,
              borderRadius: 9,
              cursor: 'pointer',
              fontSize: '0.82rem'
            }}
            onClick={() => setActiveTab('profile')}
          >
            Profil & Ekspresi
          </button>
          <button
            type="button"
            className="acc-tab"
            style={{
              flex: 1,
              padding: 9,
              border: 'none',
              background: activeTab === 'history' ? 'var(--sage-700)' : 'transparent',
              color: activeTab === 'history' ? '#fff' : 'var(--text-soft)',
              fontWeight: 600,
              borderRadius: 9,
              cursor: 'pointer',
              fontSize: '0.82rem'
            }}
            onClick={() => setActiveTab('history')}
          >
            Riwayat Traktir
          </button>
          <button
            type="button"
            className="acc-tab"
            style={{
              flex: 1,
              padding: 9,
              border: 'none',
              background: activeTab === 'security' ? 'var(--sage-700)' : 'transparent',
              color: activeTab === 'security' ? '#fff' : 'var(--text-soft)',
              fontWeight: 600,
              borderRadius: 9,
              cursor: 'pointer',
              fontSize: '0.82rem'
            }}
            onClick={() => setActiveTab('security')}
          >
            Keamanan & Sesi
          </button>
        </div>

        {/* CONTENT 1: PROFILE */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="auth-field" style={{ marginBottom: 0 }}>
              <label htmlFor="accUsernameInput">Username (Tampil di Leaderboard)</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">@</span>
                <input
                  type="text"
                  id="accUsernameInput"
                  className="auth-input"
                  maxLength={15}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field" style={{ marginBottom: 0 }}>
              <label htmlFor="accBioInput">Bio / Status Supporter (Maks 60 Karakter)</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">💬</span>
                <input
                  type="text"
                  id="accBioInput"
                  className="auth-input"
                  maxLength={60}
                  placeholder="Contoh: Coffee lover & supporter setia Gepa ☕"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field" style={{ marginBottom: 0 }}>
              <label htmlFor="accPhoneInput">Nomor WhatsApp (Opsional)</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">📱</span>
                <input
                  type="text"
                  id="accPhoneInput"
                  className="auth-input"
                  placeholder="08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Upload Avatar */}
            <div style={{ background: 'var(--sage-50)', border: '1.5px dashed var(--sage-300)', borderRadius: 14, padding: 14, textAlign: 'center', marginTop: 4 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--sage-800)', marginBottom: 4 }}>
                📸 Foto Profil dari Galeri
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-soft)', marginBottom: 10 }}>
                Pilih foto dari galeri HP atau komputer. Foto akan dioptimasi otomatis dan tersimpan permanen di ranking.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                <button
                  type="button"
                  className="button button-primary"
                  style={{ padding: '7px 16px', fontSize: '0.8rem', borderRadius: 10, cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 Pilih Foto dari Galeri
                </button>
                {isImageUrl(avatar) && (
                  <button
                    type="button"
                    style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '7px 12px', fontSize: '0.75rem', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => { setAvatar('🐱'); showToast('Foto profil direset.'); }}
                  >
                    🗑️ Reset Foto
                  </button>
                )}
              </div>
            </div>

            {/* Custom URL */}
            <details style={{ marginTop: 2, fontSize: '0.8rem', color: 'var(--text-soft)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--sage-700)', padding: '4px 0' }}>
                🔗 Atau masukkan tautan / URL gambar
              </summary>
              <div className="auth-field" style={{ marginTop: 8, marginBottom: 0 }}>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">🖼️</span>
                  <input
                    type="url"
                    className="auth-input"
                    placeholder="https://domain.com/foto-kamu.png"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    style={{ background: 'var(--sage-700)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer' }}
                    onClick={() => {
                      if (customAvatarUrl) {
                        setAvatar(customAvatarUrl);
                        showToast('URL gambar diterapkan.');
                      }
                    }}
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </details>

            {/* Avatar presets */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Atau Pilih Karakter Avatar:
              </label>
              <div className="avatar-grid-picker">
                {PRESET_AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`avatar-choice-btn ${avatar === emoji ? 'selected' : ''}`}
                    onClick={() => setAvatar(emoji)}
                  >
                    <span className="emoji">{emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="modal-support-button"
              disabled={savingProfile}
              style={{ background: 'var(--sage-700)', color: '#fff', marginTop: 4 }}
              onClick={handleSaveProfile}
            >
              {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan ✨'}
            </button>
          </div>
        )}

        {/* CONTENT 2: HISTORY */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: 4 }}>
              Setiap traktiran kamu tercatat di bawah ini. Klik transaksi untuk membuka bukti invoice resmi.
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
              {userDonations.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-soft)', padding: '25px 15px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>☕</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 4 }}>
                    Belum Ada Riwayat Traktir
                  </div>
                  <p style={{ fontSize: '0.8rem', margin: '0 0 14px 0' }}>
                    Traktir Gepa kopi pertamamu untuk mulai mengumpulkan riwayat & masuk ke leaderboard!
                  </p>
                </div>
              ) : (
                userDonations.map((item, idx) => (
                  <div
                    key={item.order_id || idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 10,
                      marginBottom: 8,
                      border: '1px solid var(--border)',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      onClose();
                      onSelectInvoice(item.order_id || item.orderId || '', item);
                    }}
                    title="Klik untuk membuka bukti invoice resmi"
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                        Rp{formatRupiah(item.amount || item.gross_amount || 0)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)', marginTop: 2 }}>
                        {item.order_id ? `${item.order_id} · ` : ''}
                        {new Date(item.transaction_time || item.createdAt || Date.now()).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.72rem', padding: '4px 8px', background: 'var(--sage-700)', color: '#fff', borderRadius: 6, fontWeight: 600 }}>
                        ✓ Sukses
                      </span>
                      <button
                        type="button"
                        style={{ padding: '4px 8px', border: '1px solid var(--border)', background: 'var(--sage-50)', borderRadius: 6, fontSize: '0.72rem', cursor: 'pointer', color: 'var(--sage-800)', fontWeight: 600 }}
                      >
                        Invoice 📄
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="modal-support-button"
              style={{ background: 'var(--sage-800)', color: '#fff', marginTop: 8 }}
              onClick={() => {
                onClose();
                onOpenSupport();
              }}
            >
              Traktir Gepa Lagi ☕
            </button>
          </div>
        )}

        {/* CONTENT 3: SECURITY & SESSION */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--sage-50)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: 'var(--sage-800)', fontSize: '0.92rem', marginBottom: 10 }}>
                🔐 Ubah Password Akun
              </div>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="auth-field" style={{ marginBottom: 0 }}>
                  <label htmlFor="oldPwd">Password Saat Ini</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">🔒</span>
                    <input
                      type="password"
                      id="oldPwd"
                      className="auth-input"
                      placeholder="Masukkan password saat ini"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-field" style={{ marginBottom: 0 }}>
                  <label htmlFor="newPwd">Password Baru</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">🔑</span>
                    <input
                      type="password"
                      id="newPwd"
                      className="auth-input"
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-field" style={{ marginBottom: 0 }}>
                  <label htmlFor="confirmPwd">Konfirmasi Password Baru</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">✨</span>
                    <input
                      type="password"
                      id="confirmPwd"
                      className="auth-input"
                      placeholder="Ulangi password baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="modal-support-button"
                  disabled={changingPassword}
                  style={{ background: 'var(--sage-700)', color: '#fff', marginTop: 4 }}
                >
                  {changingPassword ? 'Memperbarui...' : 'Perbarui Password 🔐'}
                </button>
              </form>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, fontSize: '0.85rem', color: 'var(--text-soft)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>Status Sesi Perangkat</div>
              <p style={{ margin: 0, lineHeight: 1.45 }}>
                Kamu terhubung secara aman di browser ini. Traktiran kamu otomatis terhubung ke identitas akun ini.
              </p>
            </div>

            <button
              type="button"
              className="modal-support-button"
              style={{ background: '#dc2626', color: '#fff', marginTop: 0 }}
              onClick={handleLogout}
            >
              Keluar dari Akun (Logout)
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 15, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-soft)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
