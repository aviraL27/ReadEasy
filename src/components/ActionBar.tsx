import React from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { RESTYLE_THEMES, type ThemeId, type ProcessProgress } from '../engine/pdfThemeEngine';

interface ActionBarProps {
  originalFileName: string;
  originalSizeBytes: number;
  selectedThemeId: ThemeId;
  fileFormat: 'pdf' | 'docx' | 'pptx';
  isProcessing: boolean;
  progress: ProcessProgress | null;
  onConvertAndDownload: () => void;
  onReset: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  originalFileName,
  originalSizeBytes,
  selectedThemeId,
  fileFormat,
  isProcessing,
  progress,
  onConvertAndDownload,
  onReset,
}) => {
  const activeTheme = RESTYLE_THEMES.find((t) => t.id === selectedThemeId) || RESTYLE_THEMES[0];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const baseName = originalFileName.replace(/\.[^/.]+$/, '');
  const downloadFileName = `${baseName}_${activeTheme.id}.${fileFormat}`;

  return (
    <div className="action-card">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="action-stats">
          <div className="action-stats-title">
            Output File: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{downloadFileName}</span>
          </div>
          <div className="action-stats-detail">
            Original: {formatFileSize(originalSizeBytes)} • Estimated Delta: ~ +1 KB • Text Fidelity: 100% Vector
          </div>
        </div>

        {isProcessing && progress && (
          <div className="progress-container">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="progress-label">
              <span>{progress.status}</span>
              <span>{progress.percentage}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="action-btn-group">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onReset}
          disabled={isProcessing}
        >
          <RotateCcw size={14} />
          <span>New File</span>
        </button>

        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onConvertAndDownload}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <div className="spinner" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>Convert & Download</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
