import React from 'react';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" id="locationModalOverlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="support-modal modal-content"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 480, textAlign: 'center', position: 'relative', zIndex: 101 }}
      >
        <button className="modal-close" type="button" onClick={onClose}>×</button>
        <div className="modal-icon">⌖</div>
        <p className="section-kicker">current base</p>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 6 }}>Bogor, Indonesia</h2>
        <p className="modal-description" style={{ marginBottom: 16 }}>
          Kota hujan yang nyaman buat mikir, berkarya, dan jalanin hari. ☕
        </p>
        <div style={{ width: '100%', height: 260, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <iframe
            title="Peta Bogor"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126748.56223840742!2d106.7470123041992!3d-6.597653700000005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69c5c14605ab41%3A0x2bb135ef0952047!2sBogor%2C%20Kota%20Bogor%2C%20Jawa%20Barat!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </div>
  );
};
