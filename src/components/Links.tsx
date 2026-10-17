import React from 'react';

export const Links: React.FC = () => {
  return (
    <section className="section links-section" id="links">
      <div className="container">
        <div className="section-heading">
          <p className="section-kicker">find me around</p>
          <h2>My Links.</h2>
          <p>Some places where you can find me, my content, or things I'm currently into.</p>
        </div>
        <div className="links-list">
          <a
            href="https://whatsapp.com/channel/0029Vb6pu0S7tkj4IRcKyM44"
            target="_blank"
            rel="noopener noreferrer"
            className="link-card"
          >
            <div className="link-icon whatsapp-link-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.5 11.7a8.5 8.5 0 0 1-12.5 7.5L3 20.5l1.3-4.8A8.5 8.5 0 1 1 20.5 11.7Z"></path>
                <path d="M8.4 8.1c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.3.1.5-.1.7l-.5.6c-.1.2-.2.3 0 .6.3.6 1.2 1.9 2.7 2.6.3.2.5.1.7-.1l.7-.8c.2-.2.4-.2.7-.1l1.5.7c.3.1.4.3.4.5 0 .4-.2 1.2-.6 1.4-.4.3-1 .5-1.7.4-1.1-.2-2.4-.8-3.7-2-1.2-1.1-2-2.3-2.5-3.2-.5-.9-.6-1.6-.4-2.5.1-.4.3-.8.4-1Z"></path>
              </svg>
            </div>
            <div className="link-info">
              <strong>WhatsApp Channel</strong>
              <span>Updates, random thoughts & little things.</span>
            </div>
            <span className="link-arrow">↗</span>
          </a>

          <a
            href="https://www.instagram.com/argheeva_?stkn=MWIxa2o3ZnB5dDBrOQ=="
            target="_blank"
            rel="noopener noreferrer"
            className="link-card"
          >
            <div className="link-icon instagram-icon">◎</div>
            <div className="link-info">
              <strong>Instagram</strong>
              <span>Random moments, photos & little updates.</span>
            </div>
            <span className="link-arrow">↗</span>
          </a>

          <a
            href="https://www.tiktok.com/@argheeva?_r=1&_t=ZS-99eyKDmtMns"
            target="_blank"
            rel="noopener noreferrer"
            className="link-card"
          >
            <div className="link-icon tiktok-icon">♪</div>
            <div className="link-info">
              <strong>TikTok</strong>
              <span>Short videos, random stuff & fun.</span>
            </div>
            <span className="link-arrow">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
};
