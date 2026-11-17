import React, { useRef, useState } from 'react';
import { UploadCloud, AlertCircle, Sparkles } from 'lucide-react';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  onLoadSample: () => void;
  errorMessage: string | null;
  isLoadingSample: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelect,
  onLoadSample,
  errorMessage,
  isLoadingSample,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndPassFile(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndPassFile(file);
    }
  };

  const validateAndPassFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'pptx') {
      alert('Please upload a PDF document (or DOCX / PPTX file).');
      return;
    }
    onFileSelect(file);
  };

  return (
    <div>
      <div
        className={`dropzone ${isDragOver ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />

        <div className="dropzone-icon">
          <UploadCloud size={20} strokeWidth={1.75} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          <div className="dropzone-title">Drop your document here, or click to browse</div>
          <div className="dropzone-sub">
            Restyles vector documents into eye-friendly dark and paper themes without rasterization.
            Text stays 100% searchable, selectable, and sharp at any zoom.
          </div>
        </div>

        <div className="dropzone-pills">
          <span className="format-pill">PDF (Vector)</span>
          <span className="format-pill">DOCX (v2)</span>
          <span className="format-pill">PPTX (v2)</span>
        </div>

        <div className="sample-action" onClick={(e) => e.stopPropagation()}>
          <Sparkles size={13} />
          <span>No document handy?</span>
          <button
            type="button"
            className="sample-link"
            onClick={onLoadSample}
            disabled={isLoadingSample}
          >
            {isLoadingSample ? 'Generating sample...' : 'Try with interactive sample PDF'}
          </button>
        </div>
      </div>

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
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
