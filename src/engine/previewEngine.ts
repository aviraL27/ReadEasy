import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker in Vite
try {
  // Use unpkg/cdnjs fallback or Vite asset URL
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (e) {
  console.warn('Could not set PDF worker URL via import.meta.url, fallback will be used', e);
}

export interface RenderPageOptions {
  canvas: HTMLCanvasElement;
  scale?: number;
}

export interface RenderResult {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

/**
 * Renders page 1 of a PDF onto an HTML5 Canvas using PDF.js.
 */
export async function renderPdfPageToCanvas(
  pdfData: ArrayBuffer | Uint8Array,
  options: RenderPageOptions
): Promise<RenderResult> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/',
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(1);

  const desiredScale = options.scale ?? 1.5;
  const viewport = page.getViewport({ scale: desiredScale });

  const canvas = options.canvas;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get 2d canvas context');
  }

  // Adjust for high-DPI displays (Retina)
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  context.save();
  context.scale(dpr, dpr);

  // Clear canvas with neutral white
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, viewport.width, viewport.height);

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  };

  await page.render(renderContext).promise;
  context.restore();

  const unscaledViewport = page.getViewport({ scale: 1 });

  return {
    width: viewport.width,
    height: viewport.height,
    originalWidth: unscaledViewport.width,
    originalHeight: unscaledViewport.height,
  };
}

/**
 * Extracts metadata (page count, title if any) quickly from PDF bytes.
 */
export async function inspectPdf(pdfData: ArrayBuffer | Uint8Array): Promise<{
  pageCount: number;
  encrypted: boolean;
}> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const doc = await loadingTask.promise;
    return {
      pageCount: doc.numPages,
      encrypted: false,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes('password') || message.toLowerCase().includes('encrypt')) {
      return { pageCount: 0, encrypted: true };
    }
    throw err;
  }
}
