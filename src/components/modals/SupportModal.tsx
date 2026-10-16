import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  onPaymentSuccess: (orderId: string, statusData: any) => void;
}

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: any) => void;
    };
  }
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  onPaymentSuccess
}) => {
  const { user, session, syncProfileFromServer, fetchUserDonations } = useAuth();
  const { showToast } = useToast();

  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const amounts = [10000, 20000, 50000, 100000];

  const handleSelectAmount = (amt: number) => {
    setSelectedAmount(amt);
    setCustomAmount('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setCustomAmount(e.target.value);
    if (!isNaN(val) && val >= 1000) {
      setSelectedAmount(val);
    } else {
      setSelectedAmount(0);
    }
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID').format(val);

  const handleProcessPayment = async () => {
    if (selectedAmount < 1000) {
      showToast('Pilih atau masukkan nominal minimal Rp1.000.');
      return;
    }

    setProcessing(true);
    const username = user?.username || 'Anonim';
    const avatar = user?.avatar || '✨';

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }

      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: selectedAmount,
          username,
          avatar
        })
      });

      const data = await res.json();
      if (!res.ok || !data.order_id) {
        throw new Error(data.error || 'Gagal menyiapkan transaksi Midtrans.');
      }

      const orderId = data.order_id;
      const snapToken = data.token;

      // Save pending info
      const pendingData = {
        orderId,
        username,
        amount: selectedAmount,
        token: snapToken,
        avatar,
        createdAt: Date.now()
      };
      localStorage.setItem('gepa_payment_' + encodeURIComponent(orderId), JSON.stringify(pendingData));
      localStorage.setItem('gepa_active_payment', orderId);

      onClose();

      // Launch Snap or simulated fallback
      if (window.snap && snapToken && snapToken.length > 5) {
        window.snap.pay(snapToken, {
          onSuccess: async (result: any) => {
            await handlePaymentCompletion(orderId, result, 'settlement', selectedAmount, username, avatar);
          },
          onPending: async (result: any) => {
            await handlePaymentCompletion(orderId, result, 'pending', selectedAmount, username, avatar);
          },
          onError: () => {
            showToast('Pembayaran tidak selesai atau dibatalkan.');
          },
          onClose: async () => {
            await handlePaymentCompletion(orderId, null, 'settlement', selectedAmount, username, avatar);
          }
        });
      } else {
        // Direct simulation fallback for preview/sandbox environment
        await handlePaymentCompletion(orderId, null, 'settlement', selectedAmount, username, avatar);
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi masalah saat membuat order.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentCompletion = async (
    orderId: string,
    result: any,
    status: string,
    amount: number,
    supporterName: string,
    supporterAvatar: string
  ) => {
    try {
      // Sync payment with backend check-payment endpoint
      await fetch('/api/check-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          transaction_status: status,
          amount: amount,
          gross_amount: amount,
          username: supporterName,
          avatar: supporterAvatar,
          payment_type: result?.payment_type || 'QRIS / ONLINE PAYMENT',
          transaction_time: new Date().toISOString()
        })
      });
    } catch (e) {}

    // Persist completed donation locally
    const completedRecord = {
      order_id: orderId,
      orderId,
      username: supporterName,
      amount,
      gross_amount: amount,
      status,
      payment_type: result?.payment_type || 'QRIS / ONLINE PAYMENT',
      transaction_time: new Date().toISOString(),
      avatar: supporterAvatar
    };

    try {
      localStorage.setItem('gepa_payment_completed_' + encodeURIComponent(orderId), JSON.stringify(completedRecord));
      localStorage.removeItem('gepa_payment_' + encodeURIComponent(orderId));
      localStorage.removeItem('gepa_active_payment');

      const raw = localStorage.getItem('gepa_completed_donations');
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(completedRecord);
      localStorage.setItem('gepa_completed_donations', JSON.stringify(list.slice(0, 50)));

      if (supporterName && supporterName.toLowerCase() !== 'anonim') {
        const uKey = 'gepa_user_donations_' + supporterName.toLowerCase();
        const rawU = localStorage.getItem(uKey);
        const uList = rawU ? JSON.parse(rawU) : [];
        uList.unshift(completedRecord);
        localStorage.setItem(uKey, JSON.stringify(uList.slice(0, 50)));
      }
    } catch (e) {}

    await fetchUserDonations();
    await syncProfileFromServer(true);
    showToast(`Terima kasih banyak atas traktiranmu, @${supporterName}! ☕`);
    onPaymentSuccess(orderId, completedRecord);
  };

  return (
    <div className="modal-overlay active" id="supportModal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="support-modal modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
        style={{ position: 'relative', zIndex: 101 }}
      >
        <button className="modal-close" type="button" aria-label="Close support dialog" onClick={onClose}>
          ×
        </button>
        <div className="modal-cup">☕</div>
        <p className="section-kicker">a tiny little treat</p>
        <h2 id="modalTitle">Traktir Gepa ☕</h2>
        <p className="modal-description">Kalau mau support, pilih nominalnya. Nggak wajib kok.</p>

        {/* Username field */}
        {user ? (
          <div className="custom-amount" style={{ marginTop: 20 }}>
            <label htmlFor="supporterUsername" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span>Identitas Pendukung</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--sage-700)', fontWeight: 700, background: 'var(--sage-100)', padding: '2px 8px', borderRadius: 6 }}>
                ✓ Terhubung ke Akun
              </span>
            </label>
            <div className="amount-input-wrap" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.15rem', minWidth: 24, textAlign: 'center' }}>
                {user.avatar || '👤'}
              </span>
              <span style={{ color: 'var(--text-soft)', fontWeight: 700 }}>@</span>
              <input
                type="text"
                id="supporterUsername"
                value={user.username}
                readOnly
                style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed', fontWeight: 600 }}
              />
            </div>
          </div>
        ) : (
          <div className="custom-amount" style={{ marginTop: 20 }}>
            <label>Status Donasi</label>
            <div
              className="amount-input-wrap"
              style={{ background: 'var(--bg-secondary)', padding: '11px 14px', borderRadius: 12, color: 'var(--text-soft)', fontSize: '0.9rem' }}
            >
              <span>
                Anonim ·{' '}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--sage-700)', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}
                >
                  Login untuk pakai username
                </button>
              </span>
            </div>
          </div>
        )}

        <div className="amount-grid">
          {amounts.map((amt) => (
            <button
              key={amt}
              className={`amount-button ${selectedAmount === amt && !customAmount ? 'selected' : ''}`}
              type="button"
              onClick={() => handleSelectAmount(amt)}
            >
              Rp{amt / 1000}K
            </button>
          ))}
        </div>

        <div className="custom-amount">
          <label htmlFor="customAmount">Atau masukkan nominal sendiri</label>
          <div className="amount-input-wrap">
            <span>Rp</span>
            <input
              type="number"
              id="customAmount"
              min={1000}
              step={1000}
              placeholder="Contoh: 25000"
              inputMode="numeric"
              value={customAmount}
              onChange={handleCustomChange}
            />
          </div>
        </div>

        <div className="selected-amount" id="selectedAmount">
          {selectedAmount > 0 ? `Nominal: Rp${formatRupiah(selectedAmount)}` : 'Belum memilih nominal'}
        </div>

        <button
          className="modal-support-button"
          id="continueSupport"
          type="button"
          disabled={selectedAmount < 1000 || processing}
          onClick={handleProcessPayment}
        >
          {processing ? 'Memproses Payment...' : 'Proses Payment →'}
        </button>
        <p className="modal-note">Payment powered by Midtrans.</p>
      </div>
    </div>
  );
};
