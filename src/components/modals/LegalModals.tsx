import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" id="privacyModal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="support-modal modal-content" role="dialog" aria-modal="true" style={{ maxWidth: 520, textAlign: 'left' }}>
        <button className="modal-close" type="button" onClick={onClose}>×</button>
        <div className="modal-icon" style={{ background: 'var(--sage-100)', color: 'var(--sage-700)', width: 48, height: 48, fontSize: '1.3rem' }}>🔒</div>
        <p className="section-kicker">legal information</p>
        <h2 style={{ fontSize: '1.4rem', marginBottom: 12 }}>Privacy Policy</h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)', lineHeight: 1.6, maxHeight: 280, overflowY: 'auto', paddingRight: 5, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p>Terakhir diperbarui: 2026</p>
          <p>Gepa Corner ("kami") sangat menghargai privasi kamu. Halaman Kebijakan Privasi ini menjelaskan bagaimana informasi kamu dikumpulkan dan digunakan di <strong>gepacorner.my.id</strong>.</p>
          <p><strong>1. Informasi yang Kami Kumpulkan:</strong> Kami dapat mengumpulkan informasi dasar seperti username atau email yang kamu berikan saat mendaftar akun atau saat memberikan dukungan (traktiran) melalui payment gateway (Midtrans).</p>
          <p><strong>2. Penggunaan Informasi:</strong> Informasi yang dikumpulkan hanya digunakan untuk menampilkan nama di daftar Top Supporters (ranking), memproses transaksi, dan meningkatkan kenyamanan pengalamanmu di website ini.</p>
          <p><strong>3. Keamanan Data:</strong> Kami berkomitmen menjaga keamanan data kamu melalui integrasi sistem autentikasi terpercaya (Supabase) dan payment gateway resmi (Midtrans).</p>
        </div>
        <button className="modal-support-button" type="button" onClick={onClose} style={{ background: 'var(--sage-700)', marginTop: 20 }}>
          Tutup
        </button>
      </div>
    </div>
  );
};

export const TermsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" id="termsModal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="support-modal modal-content" role="dialog" aria-modal="true" style={{ maxWidth: 520, textAlign: 'left' }}>
        <button className="modal-close" type="button" onClick={onClose}>×</button>
        <div className="modal-icon" style={{ background: 'var(--sage-100)', color: 'var(--sage-700)', width: 48, height: 48, fontSize: '1.3rem' }}>📄</div>
        <p className="section-kicker">legal information</p>
        <h2 style={{ fontSize: '1.4rem', marginBottom: 12 }}>Terms of Service</h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)', lineHeight: 1.6, maxHeight: 280, overflowY: 'auto', paddingRight: 5, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p>Terakhir diperbarui: 2026</p>
          <p>Selamat datang di <strong>gepacorner.my.id</strong>. Dengan mengakses atau menggunakan website ini, kamu menyetujui syarat dan ketentuan berikut:</p>
          <p><strong>1. Sifat Dukungan (Traktiran):</strong> Segala bentuk dukungan finansial atau traktiran bersifat sukarela (opsional) dan tidak bersifat mengikat atau dapat dikembalikan (non-refundable).</p>
          <p><strong>2. Perilaku Pengguna:</strong> Pengguna dilarang menggunakan nama/username yang mengandung unsur SARA, kebencian, atau hal-hal menyinggung pada kolom dukungan atau leaderboard.</p>
          <p><strong>3. Perubahan Layanan:</strong> Kami berhak sewaktu-waktu mengubah atau memperbarui konten, fitur, maupun ketentuan yang ada di website ini tanpa pemberitahuan sebelumnya.</p>
        </div>
        <button className="modal-support-button" type="button" onClick={onClose} style={{ background: 'var(--sage-700)', marginTop: 20 }}>
          Tutup
        </button>
      </div>
    </div>
  );
};
