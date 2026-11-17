import React from 'react';
import { Heart } from 'lucide-react';
import { APP_VERSION } from '../version';

const GithubIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LinkedinIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="footer-bottom">
        <span>Your file is processed in your browser and never uploaded.</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>ReadEasy v{APP_VERSION}</span>
      </div>

      <div className="footer-creator">
        <span className="creator-text">
          built with <Heart size={12} className="heart-icon" aria-hidden="true" /> by <span className="creator-name">"apocalypse"</span>
        </span>
        <div className="creator-links">
          <a
            href="https://github.com/aviraL27"
            target="_blank"
            rel="noopener noreferrer"
            className="creator-icon-link"
            title="GitHub: aviraL27"
            aria-label="GitHub profile of aviraL27"
          >
            <GithubIcon size={14} />
          </a>
          <a
            href="https://www.linkedin.com/in/aviral-joshi-a98a67373"
            target="_blank"
            rel="noopener noreferrer"
            className="creator-icon-link"
            title="LinkedIn: Aviral Joshi"
            aria-label="LinkedIn profile of Aviral Joshi"
          >
            <LinkedinIcon size={14} />
          </a>
        </div>
      </div>
    </footer>
  );
};
