import { PDFDocument, rgb, BlendMode } from 'pdf-lib';

export interface ThemeColor {
  r: number; // 0 to 1
  g: number; // 0 to 1
  b: number; // 0 to 1
}

export interface ThemeLayer {
  color: ThemeColor;
  blendMode: BlendMode;
  opacity?: number;
}

export type ThemeId = 'blackboard' | 'old-book' | 'true-black' | 'amber';

export interface RestyleTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  description: string;
  layers: ThemeLayer[];
  // Metadata for UI cards & preview simulation
  badgeText: string;
  previewBg: string;
  previewText: string;
  accentRgb: string;
  cssMixLayers: Array<{
    color: string;
    mixBlendMode: 'difference' | 'multiply' | 'lighten';
    opacity?: number;
  }>;
}

/**
 * Themes defined as a config array of layer lists ({color, blendMode}).
 * Adding a new theme requires exactly one config entry here.
 */
export const RESTYLE_THEMES: RestyleTheme[] = [
  {
    id: 'blackboard',
    name: 'Blackboard',
    subtitle: 'Dark Slate / Soft Chalk',
    description: 'Inverts white background to black, then softens contrast with a charcoal wash. Easy on tired eyes during nighttime reading.',
    badgeText: 'Difference + Lighten',
    previewBg: '#2b2b2b',
    previewText: '#e5e5e5',
    accentRgb: '43, 43, 43',
    layers: [
      {
        // Layer 1: Invert white background and dark text
        color: { r: 1, g: 1, b: 1 },
        blendMode: BlendMode.Difference,
      },
      {
        // Layer 2: Soften pure black background to #2b2b2b
        color: { r: 43 / 255, g: 43 / 255, b: 43 / 255 },
        blendMode: BlendMode.Lighten,
      },
    ],
    cssMixLayers: [
      { color: '#ffffff', mixBlendMode: 'difference' },
      { color: '#2b2b2b', mixBlendMode: 'lighten' },
    ],
  },
  {
    id: 'old-book',
    name: 'Old Book',
    subtitle: 'Warm Cream / Sepia',
    description: 'Warm parchment tint that cuts blue light. Ideal for long-form study, research papers, and daylight reading.',
    badgeText: 'Multiply',
    previewBg: '#f4ecd8',
    previewText: '#26221c',
    accentRgb: '244, 236, 216',
    layers: [
      {
        // Warm parchment overlay: #f4ecd8
        color: { r: 244 / 255, g: 236 / 255, b: 216 / 255 },
        blendMode: BlendMode.Multiply,
      },
    ],
    cssMixLayers: [
      { color: '#f4ecd8', mixBlendMode: 'multiply' },
    ],
  },
  {
    id: 'true-black',
    name: 'True Black',
    subtitle: 'OLED / High Contrast',
    description: 'Pure vector inversion. Produces pitch-black background (#000000) for maximum battery savings on OLED and deep contrast.',
    badgeText: 'Difference',
    previewBg: '#000000',
    previewText: '#ffffff',
    accentRgb: '0, 0, 0',
    layers: [
      {
        // Layer 1: Invert everything cleanly
        color: { r: 1, g: 1, b: 1 },
        blendMode: BlendMode.Difference,
      },
    ],
    cssMixLayers: [
      { color: '#ffffff', mixBlendMode: 'difference' },
    ],
  },
  {
    id: 'amber',
    name: 'Amber',
    subtitle: 'Retro Phosphor CRT',
    description: 'Warm monochrome amber glow on dark slate. Minimizes blue light emission to virtually zero for pitch-black rooms.',
    badgeText: 'Diff + Mult + Lighten',
    previewBg: '#1a1a1a',
    previewText: '#ffb000',
    accentRgb: '255, 176, 0',
    layers: [
      {
        // Layer 1: Invert
        color: { r: 1, g: 1, b: 1 },
        blendMode: BlendMode.Difference,
      },
      {
        // Layer 2: Tint with Amber #ffb000
        color: { r: 255 / 255, g: 176 / 255, b: 0 / 255 },
        blendMode: BlendMode.Multiply,
      },
      {
        // Layer 3: Floor dark background at #1a1a1a
        color: { r: 26 / 255, g: 26 / 255, b: 26 / 255 },
        blendMode: BlendMode.Lighten,
      },
    ],
    cssMixLayers: [
      { color: '#ffffff', mixBlendMode: 'difference' },
      { color: '#ffb000', mixBlendMode: 'multiply' },
      { color: '#1a1a1a', mixBlendMode: 'lighten' },
    ],
  },
];

export interface ProcessProgress {
  currentPage: number;
  totalPages: number;
  percentage: number;
  status: string;
}

export interface RestylePdfOptions {
  themeId: ThemeId;
  onProgress?: (progress: ProcessProgress) => void;
  // Hook for future V2 Smart Mode (operator rewriter)
  smartMode?: boolean;
}

export interface RestylePdfResult {
  pdfBytes: Uint8Array;
  originalSize: number;
  newSize: number;
  pageCount: number;
  durationMs: number;
}

/**
 * Applies vector blend mode overlays to all pages in a PDF document.
 * Wraps existing content streams in q/Q to prevent graphics state leak,
 * respects CropBox/MediaBox/rotation, and never rasterizes vector text.
 */
export async function restylePdf(
  inputData: ArrayBuffer | Uint8Array,
  options: RestylePdfOptions
): Promise<RestylePdfResult> {
  const startTime = performance.now();
  const originalSize = inputData.byteLength;

  const theme = RESTYLE_THEMES.find((t) => t.id === options.themeId);
  if (!theme) {
    throw new Error(`Theme "${options.themeId}" is not registered.`);
  }

  options.onProgress?.({
    currentPage: 0,
    totalPages: 0,
    percentage: 5,
    status: 'Parsing PDF structure...',
  });

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(inputData, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes('encrypt') || message.toLowerCase().includes('password')) {
      throw new Error(
        'This PDF is password-protected or encrypted. Please decrypt or unlock it before restyling.'
      );
    }
    throw new Error(`Failed to parse PDF document: ${message}`);
  }

  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  if (totalPages === 0) {
    throw new Error('The PDF document contains 0 pages.');
  }

  // Pre-acquire push/pop graphics state streams to wrap content cleanly
  const context = pdfDoc.context;
  const pushGStateStream = context.getPushGraphicsStateContentStream();
  const popGStateStream = context.getPopGraphicsStateContentStream();

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const pageNum = i + 1;

    options.onProgress?.({
      currentPage: pageNum,
      totalPages,
      percentage: Math.round(10 + (pageNum / totalPages) * 75),
      status: `Restyling vector page ${pageNum} of ${totalPages}...`,
    });

    // 1. Isolate original content stream graphics state:
    // Normalize turns single stream to PDFArray if needed, then wrapContentStreams
    // prepends `q` (save graphics state) and appends `Q` (restore graphics state).
    page.node.normalize();
    page.node.wrapContentStreams(pushGStateStream, popGStateStream);

    // 2. Compute full-page bounds covering both MediaBox and CropBox
    // This ensures no white margins or edges peek through regardless of viewer geometry
    const mediaBox = page.getMediaBox();
    const cropBox = page.getCropBox();

    const minX = Math.min(mediaBox.x, cropBox.x);
    const minY = Math.min(mediaBox.y, cropBox.y);
    const maxX = Math.max(mediaBox.x + mediaBox.width, cropBox.x + cropBox.width);
    const maxY = Math.max(mediaBox.y + mediaBox.height, cropBox.y + cropBox.height);

    const rectX = minX;
    const rectY = minY;
    const rectWidth = maxX - minX;
    const rectHeight = maxY - minY;

    // 3. Draw configured vector blend layers
    for (const layer of theme.layers) {
      page.drawRectangle({
        x: rectX,
        y: rectY,
        width: rectWidth,
        height: rectHeight,
        color: rgb(layer.color.r, layer.color.g, layer.color.b),
        blendMode: layer.blendMode,
        opacity: layer.opacity ?? 1,
      });
    }

    // Allow UI thread to breathe on large multi-page documents
    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  options.onProgress?.({
    currentPage: totalPages,
    totalPages,
    percentage: 92,
    status: 'Serializing restyled PDF bytes...',
  });

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const endTime = performance.now();

  options.onProgress?.({
    currentPage: totalPages,
    totalPages,
    percentage: 100,
    status: 'Complete',
  });

  return {
    pdfBytes,
    originalSize,
    newSize: pdfBytes.byteLength,
    pageCount: totalPages,
    durationMs: Math.round(endTime - startTime),
  };
}

/**
 * Renders a single-page restyled PDF in memory for instant high-fidelity live preview.
 */
export async function restyleSinglePageForPreview(
  inputData: ArrayBuffer | Uint8Array,
  themeId: ThemeId
): Promise<Uint8Array> {
  const originalDoc = await PDFDocument.load(inputData, {
    ignoreEncryption: false,
    updateMetadata: false,
  });

  const previewDoc = await PDFDocument.create();
  const [copiedPage] = await previewDoc.copyPages(originalDoc, [0]);
  previewDoc.addPage(copiedPage);

  const theme = RESTYLE_THEMES.find((t) => t.id === themeId) || RESTYLE_THEMES[0];
  const page = previewDoc.getPages()[0];

  const pushGState = previewDoc.context.getPushGraphicsStateContentStream();
  const popGState = previewDoc.context.getPopGraphicsStateContentStream();
  page.node.normalize();
  page.node.wrapContentStreams(pushGState, popGState);

  const mediaBox = page.getMediaBox();
  const cropBox = page.getCropBox();

  const minX = Math.min(mediaBox.x, cropBox.x);
  const minY = Math.min(mediaBox.y, cropBox.y);
  const maxX = Math.max(mediaBox.x + mediaBox.width, cropBox.x + cropBox.width);
  const maxY = Math.max(mediaBox.y + mediaBox.height, cropBox.y + cropBox.height);

  for (const layer of theme.layers) {
    page.drawRectangle({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      color: rgb(layer.color.r, layer.color.g, layer.color.b),
      blendMode: layer.blendMode,
      opacity: layer.opacity ?? 1,
    });
  }

  return await previewDoc.save();
}

/**
 * Architecture hook for future V2 Smart Mode:
 * Will decompress page content streams and rewrite color operators
 * (rg, RG, k, K, g, G) while leaving Do operators (images/XObjects) untouched.
 */
export interface SmartModeRewriteStrategy {
  version: '2.0';
  preserveImages: true;
  rewriteOperators: (streamText: string, theme: RestyleTheme) => string;
}
