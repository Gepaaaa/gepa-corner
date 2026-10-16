import React, { useState, useEffect } from 'react';

interface AgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BIRTH_DATE = new Date(2006, 4, 17, 0, 0, 0); // May 17, 2006

export const AgeModal: React.FC<AgeModalProps> = ({ isOpen, onClose }) => {
  const [age, setAge] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      if (now < BIRTH_DATE) return;

      let years = now.getFullYear() - BIRTH_DATE.getFullYear();
      let months = now.getMonth() - BIRTH_DATE.getMonth();
      let days = now.getDate() - BIRTH_DATE.getDate();
      let hours = now.getHours() - BIRTH_DATE.getHours();
      let minutes = now.getMinutes() - BIRTH_DATE.getMinutes();
      let seconds = now.getSeconds() - BIRTH_DATE.getSeconds();

      if (seconds < 0) { minutes--; seconds += 60; }
      if (minutes < 0) { hours--; minutes += 60; }
      if (hours < 0) { days--; hours += 24; }
      if (days < 0) {
        months--;
        const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += previousMonth.getDate();
      }
      if (months < 0) { years--; months += 12; }

      setAge({ years, months, days, hours, minutes, seconds });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" id="ageModalOverlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="support-modal modal-content" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" onClick={onClose}>×</button>
        <div className="modal-icon">⌁</div>
        <p className="section-kicker">live counter</p>
        <h2>My Exact Age</h2>
        <div className="age-realtime-grid">
          <div className="age-box"><span>{age.years}</span><small>Years</small></div>
          <div className="age-box"><span>{age.months}</span><small>Months</small></div>
          <div className="age-box"><span>{age.days}</span><small>Days</small></div>
          <div className="age-box"><span>{age.hours}</span><small>Hours</small></div>
          <div className="age-box"><span>{age.minutes}</span><small>Minutes</small></div>
          <div className="age-box"><span>{age.seconds}</span><small>Seconds</small></div>
        </div>
      </div>
    </div>
  );
};
