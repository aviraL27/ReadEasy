import {
  PDFDocument,
  PDFArray,
  type PDFPage,
  fill,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  setFillingRgbColor,
  setGraphicsState,
} from 'pdf-lib';
import { copyBytes, hasPdfHeader } from './binary';

export interface ThemeColor {
  r: number; // 0 to 1
  g: number; // 0 to 1
  b: number; // 0 to 1
}

/**
 * A per-channel linear transfer function. Each source channel is mapped from
 * `transferStart` at source value 0 to `transferEnd` at source value 1.
 */
export interface PdfColorTransform {
  background: ThemeColor;
  transferStart: ThemeColor;
  transferEnd: ThemeColor;
}

export type ThemeId = 'blackboard' | 'old-book' | 'true-black' | 'amber';

export interface RestyleTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  description: string;
  pdfTransform: PdfColorTransform;
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
    badgeText: 'Vector Color Remap',
    previewBg: '#2b2b2b',
    previewText: '#e5e5e5',
    accentRgb: '43, 43, 43',
    pdfTransform: {
      background: { r: 43 / 255, g: 43 / 255, b: 43 / 255 },
      transferStart: { r: 1, g: 1, b: 1 },
      transferEnd: { r: 43 / 255, g: 43 / 255, b: 43 / 255 },
    },
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
    badgeText: 'Vector Sepia Remap',
    previewBg: '#f4ecd8',
    previewText: '#26221c',
    accentRgb: '244, 236, 216',
    pdfTransform: {
      background: { r: 244 / 255, g: 236 / 255, b: 216 / 255 },
      transferStart: { r: 0, g: 0, b: 0 },
      transferEnd: { r: 244 / 255, g: 236 / 255, b: 216 / 255 },
    },
    cssMixLayers: [
      { color: '#f4ecd8', mixBlendMode: 'multiply' },
    ],
  },
  {
    id: 'true-black',
    name: 'True Black',
    subtitle: 'OLED / High Contrast',
    description: 'Pure vector inversion. Produces pitch-black background (#000000) for maximum battery savings on OLED and deep contrast.',
    badgeText: 'Vector Inversion',
    previewBg: '#000000',
    previewText: '#ffffff',
    accentRgb: '0, 0, 0',
    pdfTransform: {
      background: { r: 0, g: 0, b: 0 },
      transferStart: { r: 1, g: 1, b: 1 },
      transferEnd: { r: 0, g: 0, b: 0 },
    },
    cssMixLayers: [
      { color: '#ffffff', mixBlendMode: 'difference' },
    ],
  },
  {
    id: 'amber',
    name: 'Amber',
    subtitle: 'Retro Phosphor CRT',
    description: 'Warm monochrome amber glow on dark slate. Minimizes blue light emission to virtually zero for pitch-black rooms.',
    badgeText: 'Vector Amber Remap',
    previewBg: '#1a1a1a',
    previewText: '#ffb000',
    accentRgb: '255, 176, 0',
    pdfTransform: {
      background: { r: 26 / 255, g: 26 / 255, b: 26 / 255 },
      transferStart: { r: 1, g: 176 / 255, b: 26 / 255 },
      transferEnd: { r: 26 / 255, g: 26 / 255, b: 26 / 255 },
    },
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

function getPageBounds(page: PDFPage) {
  const mediaBox = page.getMediaBox();
  const cropBox = page.getCropBox();
  const minX = Math.min(mediaBox.x, cropBox.x);
  const minY = Math.min(mediaBox.y, cropBox.y);
  const maxX = Math.max(mediaBox.x + mediaBox.width, cropBox.x + cropBox.width);
  const maxY = Math.max(mediaBox.y + mediaBox.height, cropBox.y + cropBox.height);

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Insert a solid background, then wrap the original page content in a PDF
 * transfer-function graphics state. Unlike Difference/Lighten blend overlays,
 * this uses standard colour transfer functions and renders consistently in
 * Chrome, Acrobat, and PDF.js while keeping every source path and glyph vector.
 */
function applyPdfColorTransform(page: PDFPage, transform: PdfColorTransform): void {
  const context = page.doc.context;
  const bounds = getPageBounds(page);

  const createFunction = (start: number, end: number) =>
    context.register(
      context.obj({
        FunctionType: 2,
        Domain: [0, 1],
        Range: [0, 1],
        C0: [start],
        C1: [end],
        N: 1,
      })
    );

  const transferFunctions = [
    createFunction(transform.transferStart.r, transform.transferEnd.r),
    createFunction(transform.transferStart.g, transform.transferEnd.g),
    createFunction(transform.transferStart.b, transform.transferEnd.b),
    // PDF transfer-function arrays contain four entries; RGB renderers use
    // the first three and the fourth preserves the remaining component.
    createFunction(0, 1),
  ];
  const graphicsState = context.register(
    context.obj({ Type: 'ExtGState', TR: transferFunctions })
  );

  // normalize creates a q/Q pair around the original streams. We place our
  // background before those streams and transfer state immediately around them.
  page.node.normalize();
  const graphicsStateName = page.node.newExtGState('ReadEasyTransfer', graphicsState);
  const contents = page.node.Contents();
  if (!(contents instanceof PDFArray)) {
    throw new Error('Unable to normalize the PDF page content streams.');
  }
  const background = context.register(
    context.contentStream([
      pushGraphicsState(),
      setFillingRgbColor(transform.background.r, transform.background.g, transform.background.b),
      rectangle(bounds.x, bounds.y, bounds.width, bounds.height),
      fill(),
      popGraphicsState(),
    ])
  );
  const transferStart = context.register(
    context.contentStream([pushGraphicsState(), setGraphicsState(graphicsStateName)])
  );
  const transferEnd = context.register(context.contentStream([popGraphicsState()]));

  contents.insert(0, background);
  contents.insert(1, transferStart);
  contents.push(transferEnd);
}

/**
 * Restyles all pages with vector-preserving PDF transfer functions. The source
 * content remains searchable/selectable; only its paint colours are remapped.
 */
export async function restylePdf(
  inputData: ArrayBuffer | Uint8Array,
  options: RestylePdfOptions
): Promise<RestylePdfResult> {
  const startTime = performance.now();
  const originalSize = inputData.byteLength;

  if (!hasPdfHeader(inputData instanceof Uint8Array ? inputData : new Uint8Array(inputData))) {
    throw new Error('The selected file does not contain a valid PDF header.');
  }

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
    // Keep the caller's byte array immutable. This also makes the engine safe
    // if a PDF library changes its input-buffer ownership in a future release.
    pdfDoc = await PDFDocument.load(copyBytes(inputData), {
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

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const pageNum = i + 1;

    options.onProgress?.({
      currentPage: pageNum,
      totalPages,
      percentage: Math.round(10 + (pageNum / totalPages) * 75),
      status: `Restyling vector page ${pageNum} of ${totalPages}...`,
    });

    applyPdfColorTransform(page, theme.pdfTransform);

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
  if (!hasPdfHeader(inputData instanceof Uint8Array ? inputData : new Uint8Array(inputData))) {
    throw new Error('The selected file does not contain a valid PDF header.');
  }

  const originalDoc = await PDFDocument.load(copyBytes(inputData), {
    ignoreEncryption: false,
    updateMetadata: false,
  });

  const previewDoc = await PDFDocument.create();
  const [copiedPage] = await previewDoc.copyPages(originalDoc, [0]);
  previewDoc.addPage(copiedPage);

  const theme = RESTYLE_THEMES.find((t) => t.id === themeId) || RESTYLE_THEMES[0];
  const page = previewDoc.getPages()[0];

  applyPdfColorTransform(page, theme.pdfTransform);

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
