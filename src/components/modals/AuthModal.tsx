import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'reset';
}

const AVATAR_OPTIONS = [
  { emoji: '🐱', name: 'Kucing' },
  { emoji: '☕', name: 'Kopi' },
  { emoji: '🎮', name: 'Gamer' },
  { emoji: '🚀', name: 'Dreamer' },
  { emoji: '🎧', name: 'Music' },
  { emoji: '🦊', name: 'Fox' },
  { emoji: '⚡', name: 'Spark' },
  { emoji: '🌟', name: 'Bintang' }
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialTab = 'login' }) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [authTab, setAuthTab] = useState<'login' | 'register' | 'reset'>(initialTab);
  const [alert, setAlert] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Login inputs
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register inputs
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);

  // Reset inputs
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetTargetEmail, setResetTargetEmail] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  if (!isOpen) return null;

  // Password strength logic
  const calculateStrength = (pwd: string) => {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 6) s++;
    if (/[A-Z]/.test(pwd) || /[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd) && pwd.length >= 8) s++;
    return s;
  };

  const regStrength = calculateStrength(regPassword);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword) {
      setAlert({ msg: 'Email/username dan password wajib diisi.', type: 'error' });
      return;
    }

    setLoading(true);
    setAlert(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          identifier: loginIdentifier.trim(),
          password: loginPassword,
          rememberMe
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal masuk. Periksa kembali email/username dan password.');
      }

      login(data);
      showToast(`Selamat datang kembali, @${data.user?.username}! ✨`);
      onClose();
    } catch (err: any) {
      setAlert({ msg: err.message || 'Gagal masuk.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = regUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!regEmail || !regEmail.includes('@')) {
      setAlert({ msg: 'Masukkan alamat email yang valid.', type: 'error' });
      return;
    }
    if (cleanUsername.length < 3) {
      setAlert({ msg: 'Username minimal 3 karakter (hanya huruf, angka, underscore).', type: 'error' });
      return;
    }
    if (regPassword.length < 6) {
      setAlert({ msg: 'Password minimal 6 karakter.', type: 'error' });
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAlert({ msg: 'Konfirmasi password tidak cocok.', type: 'error' });
      return;
    }

    setLoading(true);
    setAlert(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email: regEmail.trim(),
          username: cleanUsername,
          password: regPassword,
          avatar: selectedAvatar.emoji
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Pendaftaran gagal. Silakan gunakan username/email lain.');
      }

      login(data);
      showToast(`Akun @${data.user?.username} berhasil dibuat! ✨`);
      onClose();
    } catch (err: any) {
      setAlert({ msg: err.message || 'Pendaftaran gagal.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!resetIdentifier.trim()) {
      setAlert({ msg: 'Masukkan email atau username terdaftar.', type: 'error' });
      return;
    }

    setLoading(true);
    setAlert(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request-reset-otp',
          identifier: resetIdentifier.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim instruksi pemulihan.');

      if (data.email || data.targetEmail) {
        setResetTargetEmail((data.email || data.targetEmail).trim().toLowerCase());
      }

      setResetStep(2);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);

      setAlert({ msg: data.message || 'Kode verifikasi telah dikirim ke email Anda.', type: 'success' });
    } catch (err: any) {
      setAlert({ msg: err.message || 'Gagal meminta kode reset.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!resetOtp.trim()) {
      setAlert({ msg: 'Masukkan kode verifikasi 6-digit.', type: 'error' });
      return;
    }
    if (resetNewPassword.length < 6) {
      setAlert({ msg: 'Kata sandi baru minimal 6 karakter.', type: 'error' });
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setAlert({ msg: 'Konfirmasi kata sandi tidak cocok.', type: 'error' });
      return;
    }

    setLoading(true);
    setAlert(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-reset-password',
          identifier: resetIdentifier.trim(),
          email: resetTargetEmail || undefined,
          code: resetOtp.trim(),
          otp: resetOtp.trim(),
          token: resetOtp.trim(),
          newPassword: resetNewPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengatur ulang kata sandi.');

      showToast('Kata sandi berhasil diperbarui! Silakan masuk. 🔐');
      setAuthTab('login');
      setLoginIdentifier(resetIdentifier);
      setLoginPassword('');
      setResetStep(1);
      setAlert({ msg: 'Kata sandi diperbarui. Silakan masuk.', type: 'success' });
    } catch (err: any) {
      setAlert({ msg: err.message || 'Verifikasi gagal.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay active" id="authModal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="support-modal modal-content"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 440, textAlign: 'left', padding: '26px 22px' }}
      >
        <button className="modal-close" type="button" onClick={onClose}>×</button>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--sage-100)',
              color: 'var(--sage-700)',
              fontSize: '1.3rem',
              marginBottom: 8
            }}
          >
            ✨
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 3 }}>Corner Account</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>
            Kelola identitas pendukung, riwayat traktiran, & leaderboard.
          </p>
        </div>

        {/* Tab switchers */}
        {authTab !== 'reset' && (
          <div className="auth-tabs" id="authSegmentTabs">
            <button
              type="button"
              className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
              onClick={() => { setAuthTab('login'); setAlert(null); }}
            >
              Masuk
            </button>
            <button
              type="button"
              className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
              onClick={() => { setAuthTab('register'); setAlert(null); }}
            >
              Daftar Akun
            </button>
          </div>
        )}

        {/* Alert Banner */}
        {alert && (
          <div
            id="authAlertBanner"
            className="auth-alert"
            style={{
              display: 'flex',
              background: alert.type === 'error' ? '#fef2f2' : '#ecfdf5',
              borderColor: alert.type === 'error' ? '#fca5a5' : '#a7f3d0',
              color: alert.type === 'error' ? '#991b1b' : '#065f46'
            }}
          >
            <span>{alert.type === 'error' ? '⚠️' : '✅'}</span>
            <span>{alert.msg}</span>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {authTab === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="auth-field">
              <label htmlFor="authLoginIdentifier">Email atau Username</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">👤</span>
                <input
                  type="text"
                  id="authLoginIdentifier"
                  className="auth-input"
                  placeholder="kamu@email.com atau username"
                  autoComplete="username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="authLoginPassword">Password</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">🔒</span>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  id="authLoginPassword"
                  className="auth-input has-toggle"
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-pwd-btn"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  title="Lihat password"
                >
                  👁️
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, fontSize: '0.8rem', color: 'var(--text-soft)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--sage-700)' }}
                />
                Ingat saya
              </label>
              <button
                type="button"
                onClick={() => { setAuthTab('reset'); setAlert(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--sage-700)', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer', font: 'inherit' }}
              >
                Lupa password?
              </button>
            </div>

            <button
              type="submit"
              className="modal-support-button"
              disabled={loading}
              style={{ background: 'var(--sage-700)', color: '#fff', marginTop: 2 }}
            >
              {loading ? 'Memproses...' : 'Masuk Sekarang →'}
            </button>
          </form>
        )}

        {/* 2. REGISTER FORM */}
        {authTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="auth-field">
              <label htmlFor="regEmailInput">Email Aktif</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">✉️</span>
                <input
                  type="email"
                  id="regEmailInput"
                  className="auth-input"
                  placeholder="nama@email.com"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="regUsernameInput">Username (Tampil di Leaderboard)</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">@</span>
                <input
                  type="text"
                  id="regUsernameInput"
                  className="auth-input"
                  maxLength={15}
                  placeholder="username_kamu"
                  autoComplete="username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="regPasswordInput">Password</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">🔒</span>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  id="regPasswordInput"
                  className="auth-input has-toggle"
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-pwd-btn"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  title="Lihat password"
                >
                  👁️
                </button>
              </div>
              <div className="pwd-strength-wrap">
                <div className="pwd-strength-bars">
                  <div className={`pwd-strength-segment ${regStrength >= 1 ? 'active' : ''}`}></div>
                  <div className={`pwd-strength-segment ${regStrength >= 2 ? 'active' : ''}`}></div>
                  <div className={`pwd-strength-segment ${regStrength >= 3 ? 'active' : ''}`}></div>
                </div>
                <span className="pwd-strength-label">
                  {regStrength === 0 ? '-' : regStrength === 1 ? 'Lemah' : regStrength === 2 ? 'Sedang' : 'Kuat'}
                </span>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="regConfirmPasswordInput">Konfirmasi Password</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">🔐</span>
                <input
                  type={showRegConfirm ? 'text' : 'password'}
                  id="regConfirmPasswordInput"
                  className="auth-input has-toggle"
                  placeholder="Ulangi password"
                  autoComplete="new-password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-pwd-btn"
                  onClick={() => setShowRegConfirm(!showRegConfirm)}
                  title="Lihat password"
                >
                  👁️
                </button>
              </div>
            </div>

            {/* Avatar Selector */}
            <div className="avatar-selector-label">
              <span>Pilih Avatar Pendukung:</span>
              <span style={{ color: 'var(--sage-700)' }}>{selectedAvatar.emoji} {selectedAvatar.name}</span>
            </div>
            <div className="avatar-grid-picker" id="regAvatarPicker">
              {AVATAR_OPTIONS.map((opt) => (
                <button
                  key={opt.name}
                  type="button"
                  className={`avatar-choice-btn ${selectedAvatar.name === opt.name ? 'selected' : ''}`}
                  onClick={() => setSelectedAvatar(opt)}
                >
                  <span className="emoji">{opt.emoji}</span>
                  <span className="name">{opt.name}</span>
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="modal-support-button"
              disabled={loading}
              style={{ background: 'var(--sage-700)', color: '#fff', marginTop: 2 }}
            >
              {loading ? 'Mendaftarkan...' : 'Daftar & Masuk Otomatis ✨'}
            </button>
          </form>
        )}

        {/* 3. RESET PASSWORD VIEW */}
        {authTab === 'reset' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {resetStep === 1 ? (
              <div>
                <div style={{ background: 'var(--sage-50)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 14, fontSize: '0.82rem', color: 'var(--text-soft)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>🔐 Pemulihan Kata Sandi Akun</strong>
                  Masukkan email atau username akun yang terdaftar. Kami akan mengirimkan instruksi dan kode verifikasi ke alamat email Anda.
                </div>
                <div className="auth-field">
                  <label htmlFor="resetIdentifierInput">Email atau Username Terdaftar</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">👤</span>
                    <input
                      type="text"
                      id="resetIdentifierInput"
                      className="auth-input"
                      placeholder="kamu@email.com atau username"
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-support-button"
                  disabled={loading}
                  style={{ background: 'var(--sage-700)', color: '#fff', marginTop: 6 }}
                  onClick={handleRequestOtp}
                >
                  {loading ? 'Mengirim...' : 'Kirim Instruksi & Kode Pemulihan ✉️'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => { setAuthTab('login'); setAlert(null); }}
                    style={{ background: 'none', border: 'none', fontSize: '0.82rem', color: 'var(--sage-700)', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ← Kembali ke Halaman Masuk
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: 'var(--sage-50)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: '0.82rem', color: 'var(--text-soft)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--sage-800)', display: 'block', marginBottom: 2 }}>✉️ Email Pemulihan Terkirim</strong>
                  Periksa inbox atau folder spam di <strong style={{ color: 'var(--text-main)' }}>{resetIdentifier}</strong>.<br />
                  <span style={{ fontSize: '0.75rem', display: 'block', marginTop: 4 }}>
                    Masukkan kode 6-digit pada kolom di bawah.
                  </span>
                </div>

                <div className="auth-field">
                  <label htmlFor="resetOtpInput" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Kode Verifikasi 6-Digit</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>Cek Inbox / Spam</span>
                  </label>
                  <div className="otp-input-wrapper">
                    <input
                      type="text"
                      id="resetOtpInput"
                      className="otp-input-field"
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="123456"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="resetNewPasswordInput">Kata Sandi Baru</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">🔒</span>
                    <input
                      type={showResetNewPassword ? 'text' : 'password'}
                      id="resetNewPasswordInput"
                      className="auth-input has-toggle"
                      placeholder="Minimal 6 karakter"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="toggle-pwd-btn"
                      onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                      title="Lihat password"
                    >
                      👁️
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="resetConfirmPasswordInput">Konfirmasi Kata Sandi Baru</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">🔐</span>
                    <input
                      type="password"
                      id="resetConfirmPasswordInput"
                      className="auth-input"
                      placeholder="Ulangi kata sandi baru"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 14px 0', fontSize: '0.78rem', color: 'var(--text-soft)' }}>
                  {countdown > 0 ? (
                    <span>Kirim ulang dalam <b>{countdown}</b>s</span>
                  ) : (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--sage-700)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={handleRequestOtp}
                    >
                      Kirim Ulang Kode 🔄
                    </button>
                  )}
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--text-soft)', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setResetStep(1)}
                  >
                    ← Ganti Akun
                  </button>
                </div>

                <button
                  type="button"
                  className="modal-support-button"
                  disabled={loading}
                  style={{ background: 'var(--sage-700)', color: '#fff' }}
                  onClick={handleVerifyOtp}
                >
                  {loading ? 'Menyimpan...' : 'Verifikasi & Simpan Kata Sandi Baru 🔐'}
                </button>

                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => { setAuthTab('login'); setResetStep(1); setAlert(null); }}
                    style={{ background: 'none', border: 'none', fontSize: '0.82rem', color: 'var(--sage-700)', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ← Batalkan & Kembali ke Halaman Masuk
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
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
