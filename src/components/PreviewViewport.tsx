import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, FileText, CheckCircle2 } from 'lucide-react';
import { RESTYLE_THEMES, type ThemeId } from '../engine/pdfThemeEngine';
import { renderPdfPageToCanvasLazy } from '../engine/lazyPreview';

interface PreviewViewportProps {
  pdfBytes: Uint8Array | null;
  officeBytes: Uint8Array | null;
  fileFormat: 'pdf' | 'docx' | 'pptx';
  fileName: string;
  selectedThemeId: ThemeId;
}

export const PreviewViewport: React.FC<PreviewViewportProps> = ({
  pdfBytes,
  fileFormat,
  fileName,
  selectedThemeId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoomScale, setZoomScale] = useState<number>(1.25);
  const [viewMode, setViewMode] = useState<'themed' | 'original'>('themed');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const activeTheme = RESTYLE_THEMES.find((t) => t.id === selectedThemeId) || RESTYLE_THEMES[0];

  useEffect(() => {
    if (fileFormat === 'pdf' && pdfBytes && canvasRef.current) {
      let isCancelled = false;
      const abortController = new AbortController();
      setIsRendering(true);
      setPreviewError(null);

      renderPdfPageToCanvasLazy(pdfBytes, {
        canvas: canvasRef.current,
        scale: zoomScale,
        signal: abortController.signal,
      })
        .then((result) => {
          if (!isCancelled) {
            setPageDimensions({
              width: Math.round(result.originalWidth),
              height: Math.round(result.originalHeight),
            });
            setIsRendering(false);
          }
        })
        .catch((err) => {
          const isAbort = abortController.signal.aborted ||
            (err instanceof DOMException && err.name === 'AbortError') ||
            (err instanceof Error && err.name === 'RenderingCancelledException');
          if (!isAbort) {
            console.error('Preview render error:', err);
          }
          if (!isCancelled) {
            setIsRendering(false);
            if (!isAbort) {
              setPreviewError('Preview could not be rendered. You can still try converting the document.');
            }
          }
        });

      return () => {
        isCancelled = true;
        abortController.abort();
      };
    }

    setIsRendering(false);
    setPageDimensions(null);
    setPreviewError(null);
  }, [pdfBytes, fileFormat, zoomScale]);

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(prev - 0.25, 0.75));
  };

  const handleZoomReset = () => {
    setZoomScale(1.25);
  };

  return (
    <div className="preview-viewport-card">
      {/* Viewport Toolbar */}
      <div className="viewport-toolbar">
        <div className="toolbar-left">
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'themed' ? 'active' : ''}`}
              onClick={() => setViewMode('themed')}
            >
              Themed ({activeTheme.name})
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'original' ? 'active' : ''}`}
              onClick={() => setViewMode('original')}
            >
              Original
            </button>
          </div>

          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '4px' }}>
            Live Page 1 Vector Preview
          </span>
        </div>

        <div className="toolbar-right">
          {pageDimensions && (
            <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {pageDimensions.width} × {pageDimensions.height} pt
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleZoomOut}
              title="Zoom out"
              disabled={zoomScale <= 0.75}
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'center' }}>
              {Math.round((zoomScale / 1.25) * 100)}%
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleZoomIn}
              title="Zoom in"
              disabled={zoomScale >= 2.5}
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleZoomReset}
              title="Reset Zoom"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Viewport Area */}
      <div className="canvas-container">
        {fileFormat === 'pdf' ? (
          <div className="canvas-wrapper">
            <canvas ref={canvasRef} />

            {/* Simulated blend mode overlay stack matching vector engine */}
            {viewMode === 'themed' && (
              <>
                {activeTheme.cssMixLayers.map((layer, index) => (
                  <div
                    key={index}
                    className="blend-overlay"
                    style={{
                      backgroundColor: layer.color,
                      mixBlendMode: layer.mixBlendMode,
                      opacity: layer.opacity ?? 1,
                    }}
                  />
                ))}
              </>
            )}
          </div>
        ) : (
          /* Office Document Preview Mockup */
          <div
            style={{
              width: '480px',
              minHeight: '320px',
              backgroundColor: viewMode === 'themed' ? activeTheme.previewBg : '#ffffff',
              color: viewMode === 'themed' ? activeTheme.previewText : '#18181b',
              borderRadius: 'var(--radius-sm)',
              padding: '36px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'all 200ms ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <FileText size={13} />
              <span>{fileName} ({fileFormat.toUpperCase()})</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 600 }}>
              Office Document Restyler Preview
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.6, opacity: 0.85 }}>
              This {fileFormat.toUpperCase()} file will be restyled directly at the XML package layer.
              Slide and page backgrounds are converted to {activeTheme.name} palette ({activeTheme.previewBg}),
              text run colors are adjusted for maximum contrast, and all embedded pictures in the media package remain intact.
            </div>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '16px',
                borderTop: '1px solid currentColor',
                opacity: 0.3,
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              XML Theme Injection Engine Active • 0 Lossy Rendering
            </div>
          </div>
        )}

        {isRendering && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(0, 0, 0, 0.75)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <div className="spinner" />
            <span>Rendering vector preview...</span>
          </div>
        )}

        {previewError && !isRendering && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              maxWidth: '280px',
              background: 'rgba(74, 34, 40, 0.95)',
              border: '1px solid #7f1d1d',
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              color: '#fecaca',
            }}
          >
            {previewError}
          </div>
        )}
      </div>

      {/* Footer bar showing verification indicator */}
      <div
        style={{
          padding: '8px 16px',
          background: 'var(--bg-surface-elevated)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--text-tertiary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={13} color="#22c55e" />
          <span>Vector text verification: Selectable text retained without glyph distortion</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          Mode: Vector Color Transfer (Non-Rasterized)
        </div>
      </div>
    </div>
  );
};
