import React from 'react';
import { RESTYLE_THEMES, type ThemeId, type RestyleTheme } from '../engine/pdfThemeEngine';

interface ThemeSelectorProps {
  selectedThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  selectedThemeId,
  onSelectTheme,
}) => {
  return (
    <div className="theme-section">
      <div className="section-label">Select Visual Restyle Theme</div>
      <div className="theme-grid">
        {RESTYLE_THEMES.map((theme: RestyleTheme) => {
          const isSelected = theme.id === selectedThemeId;
          return (
            <button
              key={theme.id}
              type="button"
              className={`theme-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectTheme(theme.id)}
            >
              {/* Mini visual mockup box */}
              <div
                className="theme-preview-box"
                style={{ backgroundColor: theme.previewBg }}
              >
                <div
                  className="theme-preview-line"
                  style={{ backgroundColor: theme.previewText }}
                />
                <div
                  className="theme-preview-subline"
                  style={{ backgroundColor: theme.previewText }}
                />
                <div
                  className="theme-preview-text"
                  style={{ color: theme.previewText }}
                >
                  Aa Bb 123
                </div>
              </div>

              <div className="theme-card-header">
                <span className="theme-name">{theme.name}</span>
                <div className="theme-radio">
                  <div className="theme-radio-inner" />
                </div>
              </div>

              <div className="theme-subtitle">{theme.subtitle}</div>
              <div className="theme-desc">{theme.description}</div>

              <div>
                <span className="theme-recipe">{theme.badgeText}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
