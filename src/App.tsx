import React, { useState } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { ThemeSelector } from './components/ThemeSelector';
import { PreviewViewport } from './components/PreviewViewport';
import { ActionBar } from './components/ActionBar';
import { generateSamplePdf } from './engine/sampleDocument';
import {
  restylePdf,
  type ThemeId,
  type ProcessProgress,
  type RestylePdfResult,
} from './engine/pdfThemeEngine';
import {
  restyleDocx,
  restylePptx,
  type OfficeRestyleResult,
} from './engine/officeThemeEngine';
import { inspectPdf } from './engine/previewEngine';
import { FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileFormat, setFileFormat] = useState<'pdf' | 'docx' | 'pptx'>('pdf');
  const [pageCount, setPageCount] = useState<number>(1);
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('blackboard');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProcessProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // File loading & validation
  const handleFileSelect = async (selectedFile: File) => {
    setErrorMessage(null);
    setDownloadSuccess(null);

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    let format: 'pdf' | 'docx' | 'pptx' = 'pdf';

    if (ext === 'docx') format = 'docx';
    else if (ext === 'pptx') format = 'pptx';
    else if (ext === 'pdf') format = 'pdf';
    else {
      setErrorMessage('Unsupported format. Please upload a PDF, DOCX, or PPTX file.');
      return;
    }

    if (selectedFile.size > 120 * 1024 * 1024) {
      setErrorMessage('File exceeds 120 MB. Browser memory may be constrained for very large files.');
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      if (format === 'pdf') {
        const info = await inspectPdf(bytes);
        if (info.encrypted) {
          setErrorMessage('This PDF is password-protected or encrypted. Please unlock it before restyling.');
          return;
        }
        setPageCount(info.pageCount);
      } else {
        setPageCount(1);
      }

      setFile(selectedFile);
      setFileBytes(bytes);
      setFileName(selectedFile.name);
      setFileFormat(format);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Could not read file: ${msg}`);
    }
  };

  // Generate & load in-browser sample document
  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    setErrorMessage(null);
    setDownloadSuccess(null);

    try {
      const sampleBytes = await generateSamplePdf();
      setFile(null); // Indicates virtual sample
      setFileBytes(sampleBytes);
      setFileName('Quantum_State_Formulation.pdf');
      setFileFormat('pdf');
      setPageCount(1);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to generate sample document.');
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Restyle and download
  const handleConvertAndDownload = async () => {
    if (!fileBytes) return;

    setIsProcessing(true);
    setProgress({ currentPage: 0, totalPages: pageCount, percentage: 0, status: 'Initializing...' });
    setErrorMessage(null);
    setDownloadSuccess(null);

    try {
      let outputBytes: Uint8Array;
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}_${selectedThemeId}.${fileFormat}`;

      if (fileFormat === 'pdf') {
        const result: RestylePdfResult = await restylePdf(fileBytes, {
          themeId: selectedThemeId,
          onProgress: (p) => setProgress(p),
        });
        outputBytes = result.pdfBytes;
      } else if (fileFormat === 'docx') {
        setProgress({ currentPage: 1, totalPages: 1, percentage: 50, status: 'Restyling Word XML package...' });
        const result: OfficeRestyleResult = await restyleDocx(fileBytes, selectedThemeId);
        outputBytes = result.fileBytes;
      } else {
        setProgress({ currentPage: 1, totalPages: 1, percentage: 50, status: 'Restyling PowerPoint theme & slides...' });
        const result: OfficeRestyleResult = await restylePptx(fileBytes, selectedThemeId);
        outputBytes = result.fileBytes;
      }

      const mimeType =
        fileFormat === 'pdf'
          ? 'application/pdf'
          : fileFormat === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

      const blob = new Blob([outputBytes as unknown as BlobPart], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setDownloadSuccess(`Successfully restyled and downloaded "${downloadName}".`);
    } catch (err: unknown) {
      console.error('Conversion failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Conversion failed: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileBytes(null);
    setFileName('');
    setPageCount(1);
    setProgress(null);
    setErrorMessage(null);
    setDownloadSuccess(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="app-container">
      <Header />

      {/* Main Flow: Drop Zone or Workspace */}
      {!fileBytes ? (
        <DropZone
          onFileSelect={handleFileSelect}
          onLoadSample={handleLoadSample}
          errorMessage={errorMessage}
          isLoadingSample={isLoadingSample}
        />
      ) : (
        <div>
          {/* File Information Bar */}
          <div className="file-bar">
            <div className="file-info">
              <div className="file-icon-box">
                <FileText size={16} />
              </div>
              <div>
                <div className="file-name" title={fileName}>
                  {fileName}
                </div>
                <div className="file-stats">
                  <span>{fileFormat.toUpperCase()}</span>
                  <span>•</span>
                  <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
                  <span>•</span>
                  <span>{formatFileSize(fileBytes.byteLength)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleReset}
              disabled={isProcessing}
            >
              Change Document
            </button>
          </div>

          {/* Known Limitation Note */}
          <div className="limitation-card">
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#e4e4e7' }} />
            <div>
              <div className="limitation-title">Notice on Vector Dark Themes & Embedded Photos</div>
              <div>
                Because blend modes invert underlying luminosity to maintain 100% vector text acuity,
                embedded photographic images and multi-colored raster diagrams will also appear color-inverted.
                Pure vector text and graphics remain razor sharp and fully selectable.
                A V2 Smart Mode content-stream rewriter is designed to leave raster images untouched.
              </div>
            </div>
          </div>

          {/* 4 Theme Cards */}
          <ThemeSelector
            selectedThemeId={selectedThemeId}
            onSelectTheme={(id) => setSelectedThemeId(id)}
          />

          {/* Live Page 1 Preview Viewport */}
          <div className="preview-stage">
            <PreviewViewport
              pdfBytes={fileBytes}
              officeBytes={fileBytes}
              fileFormat={fileFormat}
              fileName={fileName}
              selectedThemeId={selectedThemeId}
            />
          </div>

          {/* Convert and Download Action Bar */}
          <ActionBar
            originalFileName={fileName}
            originalSizeBytes={fileBytes.byteLength}
            selectedThemeId={selectedThemeId}
            fileFormat={fileFormat}
            isProcessing={isProcessing}
            progress={progress}
            onConvertAndDownload={handleConvertAndDownload}
            onReset={handleReset}
          />

          {/* Download feedback notification */}
          {downloadSuccess && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                backgroundColor: '#121814',
                border: '1px solid #1e3a29',
                borderRadius: 'var(--radius-md)',
                color: '#4ade80',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                backgroundColor: '#1f1315',
                border: '1px solid #4a2228',
                borderRadius: 'var(--radius-md)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-bottom">
          <span>Your file is processed in your browser and never uploaded.</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>ReadEasy</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
