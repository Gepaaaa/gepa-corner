import React from 'react';

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPrivacy, onOpenTerms }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <a href="#home" className="brand">
            <span className="brand-dot"></span>Gepa
          </a>
          <p>Thanks for visiting! ☺</p>
        </div>
        <div className="footer-right">
          <div className="footer-links-tiny">
            <button
              type="button"
              onClick={onOpenPrivacy}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={onOpenTerms}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}
            >
              Terms of Service
            </button>
          </div>
          <span>Made with patience & a little caffeine.</span>
          <span>© <span id="currentYear">{year}</span> Gepa</span>
        </div>
      </div>
    </footer>
  );
};
