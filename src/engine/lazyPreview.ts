import type { RenderPageOptions, RenderResult } from './previewEngine';
import '../polyfills';

let previewEnginePromise: Promise<typeof import('./previewEngine')> | null = null;

async function fetchEngineWithRetry(retries = 2, delayMs = 600): Promise<typeof import('./previewEngine')> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await import('./previewEngine');
    } catch (err) {
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, delayMs * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Failed to load preview engine');
}

/**
 * Dynamically loads the heavy PDF preview engine (pdfjs-dist + PDF worker ~1.27 MB)
 * on-demand so initial page load remains fast and lightweight.
 * Retries on transient network failures and clears cached promise on error.
 */
export function loadPreviewEngine(): Promise<typeof import('./previewEngine')> {
  if (!previewEnginePromise) {
    previewEnginePromise = fetchEngineWithRetry().catch((err) => {
      // Clear cached rejected promise so subsequent user attempts can retry
      previewEnginePromise = null;
      throw err;
    });
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
