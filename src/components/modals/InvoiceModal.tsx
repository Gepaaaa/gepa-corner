import React from 'react';
import { useToast } from '../../context/ToastContext';
import { Donation } from '../../types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  donationData: Donation | null;
  onScrollToRanking: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  orderId,
  donationData,
  onScrollToRanking
}) => {
  const { showToast } = useToast();

  if (!isOpen || !orderId) return null;

  const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID').format(val);

  const amount = Number(donationData?.amount || donationData?.gross_amount || 0);
  const username = donationData?.username?.replace(/^@/, '') || 'Supporter';
  const status = (donationData?.status || 'settlement').toUpperCase();
  const paymentType = (donationData?.payment_type || donationData?.paymentType || 'ONLINE PAYMENT').toUpperCase();
  const time = donationData?.transaction_time
    ? new Date(donationData.transaction_time).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }) + ' WIB'
    : new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';

  const handleCopy = () => {
    const text = `
=== INVOICE DUKUNGAN GEPA CORNER ===
Order ID   : ${orderId}
Supporter  : @${username}
Nominal    : Rp${formatRupiah(amount)}
Status     : ${status}
Metode     : ${paymentType}
Waktu      : ${time}
Terima kasih banyak atas dukungannya! ☕
====================================
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      showToast('Bukti invoice berhasil disalin ke clipboard! 📋');
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay active" id="invoiceModal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="support-modal modal-content"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 480, textAlign: 'left', padding: '28px 24px' }}
      >
        <button className="modal-close" type="button" onClick={onClose}>×</button>
        <div className="modal-icon" style={{ background: 'var(--sage-100)', color: 'var(--sage-700)' }}>📄</div>
        <p className="section-kicker">transaction receipt</p>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Detail Invoice & Bukti</h2>
        <p className="modal-description" style={{ marginBottom: 14 }}>
          Berikut adalah informasi status transaksi dan invoice dukungan kamu.
        </p>

        <div
          id="invThankYouNote"
          style={{
            background: 'var(--sage-100)',
            color: 'var(--sage-800)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '11px 14px',
            marginBottom: 16,
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>✨</span>
          <span>Makasih banyak atas traktiranmu! Dukungan kamu bikin hari Gepa lebih hangat. ☺</span>
        </div>

        <div
          style={{
            background: 'var(--sage-50)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 18,
            fontSize: '0.85rem',
            color: 'var(--text-soft)'
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: 'var(--sage-700)',
              marginBottom: 10,
              borderBottom: '1px solid var(--border)',
              paddingBottom: 6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>🧾 Bukti Traktiran Resmi</span>
            <span
              id="invStatusBadge"
              style={{
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'var(--sage-700)',
                color: '#fff'
              }}
            >
              {status}
            </span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div><strong>Supporter:</strong> @<span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{username}</span></div>
            <div><strong>Order ID:</strong> <span style={{ fontFamily: 'monospace' }}>{orderId}</span></div>
            <div><strong>Status:</strong> <span style={{ fontWeight: 700 }}>{status}</span></div>
            <div><strong>Nominal:</strong> <span style={{ fontWeight: 700, color: 'var(--sage-800)' }}>Rp{formatRupiah(amount)}</span></div>
            <div><strong>Metode Pembayaran:</strong> <span>{paymentType}</span></div>
            <div><strong>Waktu Transaksi:</strong> <span>{time}</span></div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="modal-support-button"
            type="button"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border)', marginTop: 0, flex: 1, minWidth: 120 }}
            onClick={handleCopy}
          >
            Salin Bukti 📋
          </button>
          <button
            className="modal-support-button"
            type="button"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border)', marginTop: 0, flex: 1, minWidth: 120 }}
            onClick={handlePrint}
          >
            Cetak 🖨️
          </button>
          <button
            className="modal-support-button"
            type="button"
            style={{ background: 'var(--sage-600)', marginTop: 0, flex: 1, minWidth: 120 }}
            onClick={() => {
              onClose();
              onScrollToRanking();
            }}
          >
            Lihat Ranking 🏆
          </button>
          <button
            className="modal-support-button"
            type="button"
            style={{ background: 'var(--sage-700)', marginTop: 0, flex: 1, minWidth: 100 }}
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
