import React, { useState, useEffect } from 'react';

interface AboutProps {
  onOpenAgeModal: () => void;
  onOpenLocationModal: () => void;
  onOpenHobbyModal: () => void;
}

const BIRTH_DATE = new Date(2006, 4, 17, 0, 0, 0); // May 17, 2006

export const About: React.FC<AboutProps> = ({
  onOpenAgeModal,
  onOpenLocationModal,
  onOpenHobbyModal
}) => {
  const [displayAge, setDisplayAge] = useState('20 years');

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      let years = now.getFullYear() - BIRTH_DATE.getFullYear();
      const monthDiff = now.getMonth() - BIRTH_DATE.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < BIRTH_DATE.getDate())) {
        years--;
      }
      setDisplayAge(`${years} years`);
    };
    calc();
    const timer = setInterval(calc, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="section about-section" id="about">
      <div className="container">
        <div className="section-heading">
          <p className="section-kicker">a little about me</p>
          <h2>Nice to meet you.</h2>
          <p>Nothing too complicated. Just me, my interests, and the things I'm working towards.</p>
        </div>

        <div className="about-grid">
          <div className="about-story paper-card">
            <span className="card-number">01</span>
            <p className="about-text">Hai! Gue Gepa. Anak biasa yang punya banyak rencana, mimpi, dan proses panjang buat jadi versi terbaik dari diri sendiri.</p>
            <p className="about-text">Suka hal-hal simpel, gaming, teknologi, musik, dan hal-hal yang bikin hidup terasa lebih berarti.</p>
            <div className="quote-box">
              <span className="quote-mark">“</span>
              <p>Bukan tentang jadi yang terbaik, tapi jadi lebih baik dari kemarin. ☺</p>
            </div>
          </div>

          <div className="info-grid">
            <div
              className="info-card clickable-card"
              id="ageCard"
              role="button"
              tabIndex={0}
              onClick={onOpenAgeModal}
              onKeyDown={(e) => e.key === 'Enter' && onOpenAgeModal()}
              title="Klik untuk melihat hitungan umur real-time"
            >
              <span className="info-icon">⌁</span>
              <span className="info-label">Age</span>
              <strong id="ageDisplay">{displayAge}</strong>
            </div>

            <div
              className="info-card clickable-card"
              id="locationCard"
              role="button"
              tabIndex={0}
              onClick={onOpenLocationModal}
              onKeyDown={(e) => e.key === 'Enter' && onOpenLocationModal()}
              title="Klik untuk membuka peta Bogor"
            >
              <span className="info-icon">⌖</span>
              <span className="info-label">Based in</span>
              <strong>Bogor, Indonesia</strong>
            </div>

            <div
              className="info-card clickable-card"
              id="hobbyCard"
              role="button"
              tabIndex={0}
              onClick={onOpenHobbyModal}
              onKeyDown={(e) => e.key === 'Enter' && onOpenHobbyModal()}
              title="Klik untuk melihat hobi & ketertarikan"
            >
              <span className="info-icon">♡</span>
              <span className="info-label">Hobbies</span>
              <strong>Gaming, Movies, Tech</strong>
            </div>

            <div className="info-card">
              <span className="info-icon">✦</span>
              <span className="info-label">Dream</span>
              <strong>Big dreams, bigger actions.</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
