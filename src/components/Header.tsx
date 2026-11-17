import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="site-header">
      <div className="brand-group">
        <h1 className="brand-title">ReadEasy</h1>
        <span className="brand-badge">Vector Native</span>
        <span className="brand-tagline">Client-side document restyler</span>
      </div>
    </header>
  );
};
