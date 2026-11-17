import type { RenderPageOptions, RenderResult } from './previewEngine';

let previewEnginePromise: Promise<typeof import('./previewEngine')> | null = null;

/**
 * Dynamically loads the heavy PDF preview engine (pdfjs-dist + PDF worker ~1.27 MB)
 * on-demand so initial page load remains fast and lightweight.
 */
export function loadPreviewEngine(): Promise<typeof import('./previewEngine')> {
  if (!previewEnginePromise) {
    previewEnginePromise = import('./previewEngine');
  }
  return previewEnginePromise;
}

/**
 * Lazy wrapper around renderPdfPageToCanvas. Only loads pdfjs-dist when a preview
 * is actually rendered.
 */
export async function renderPdfPageToCanvasLazy(
  pdfData: ArrayBuffer | Uint8Array,
  options: RenderPageOptions
): Promise<RenderResult> {
  const engine = await loadPreviewEngine();
  return engine.renderPdfPageToCanvas(pdfData, options);
}

/**
 * Lazy wrapper around inspectPdf.
 */
export async function inspectPdfLazy(pdfData: ArrayBuffer | Uint8Array): Promise<{
  pageCount: number;
  encrypted: boolean;
}> {
  const engine = await loadPreviewEngine();
  return engine.inspectPdf(pdfData);
}
