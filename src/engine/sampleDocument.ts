import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Creates a clean, vector-rich sample document in-browser for immediate testing.
 * Features vector headers, paragraphs, styled callout boxes, and technical tables.
 */
export async function generateSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 in points
  const { width, height } = page.getSize();

  const fontHelvetica = await doc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontCourier = await doc.embedFont(StandardFonts.Courier);

  // Top header rule
  page.drawLine({
    start: { x: 50, y: height - 50 },
    end: { x: width - 50, y: height - 50 },
    thickness: 1.5,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Document Title
  page.drawText('Quantum Computing: Vector State Formulation', {
    x: 50,
    y: height - 85,
    size: 20,
    font: fontHelveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText('TECHNICAL SPECIFICATION // RESEARCH NOTE #2026-B', {
    x: 50,
    y: height - 105,
    size: 9,
    font: fontCourier,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Abstract callout box
  page.drawRectangle({
    x: 50,
    y: height - 190,
    width: width - 100,
    height: 65,
    borderColor: rgb(0.75, 0.75, 0.75),
    borderWidth: 1,
    color: rgb(0.97, 0.97, 0.97),
  });

  page.drawText('ABSTRACT & PRIVACY ASSURANCE', {
    x: 65,
    y: height - 145,
    size: 9.5,
    font: fontHelveticaBold,
    color: rgb(0.15, 0.15, 0.15),
  });

  page.drawText(
    'This document is restyled entirely inside your browser using mathematical blend modes.\nNo rasterization is applied: all glyphs remain infinitely scalable vectors, and text selection\nis 100% preserved. Zero bytes are uploaded to any remote server.',
    {
      x: 65,
      y: height - 165,
      size: 9,
      font: fontHelvetica,
      lineHeight: 13,
      color: rgb(0.25, 0.25, 0.25),
    }
  );

  // Section 1
  page.drawText('1. Vector State Vector Transformations', {
    x: 50,
    y: height - 225,
    size: 13,
    font: fontHelveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const body1 = 
    'A state space representation allows seamless manipulation of arbitrary high-dimensional\n' +
    'tensors. In conventional PDF color spaces (DeviceRGB, DeviceCMYK, and DeviceGray), pages\n' +
    'are rendered onto an implicit white canvas. By injecting graphics state operators (q/Q)\n' +
    'and appending difference and lighten transfer functions, dark modes are realized without\n' +
    'lossy image re-compression.';

  page.drawText(body1, {
    x: 50,
    y: height - 250,
    size: 10,
    font: fontHelvetica,
    lineHeight: 15,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Vector Table / Grid diagram
  const tableY = height - 370;
  page.drawRectangle({
    x: 50,
    y: tableY,
    width: width - 100,
    height: 90,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  // Table header fill
  page.drawRectangle({
    x: 50,
    y: tableY + 65,
    width: width - 100,
    height: 25,
    color: rgb(0.92, 0.92, 0.92),
  });

  page.drawText('Theme Recipe', { x: 65, y: tableY + 72, size: 9, font: fontHelveticaBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Vector Blend Stack', { x: 200, y: tableY + 72, size: 9, font: fontHelveticaBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Eye Strain Reduction', { x: 380, y: tableY + 72, size: 9, font: fontHelveticaBold, color: rgb(0.1, 0.1, 0.1) });

  page.drawText('Blackboard', { x: 65, y: tableY + 45, size: 9, font: fontHelvetica, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Difference(White) + Lighten(#2B2B2B)', { x: 200, y: tableY + 45, size: 8.5, font: fontCourier, color: rgb(0.3, 0.3, 0.3) });
  page.drawText('High (Night / Bedtime)', { x: 380, y: tableY + 45, size: 9, font: fontHelvetica, color: rgb(0.2, 0.2, 0.2) });

  page.drawText('Old Book', { x: 65, y: tableY + 20, size: 9, font: fontHelvetica, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Multiply(#F4ECD8 Warm Cream)', { x: 200, y: tableY + 20, size: 8.5, font: fontCourier, color: rgb(0.3, 0.3, 0.3) });
  page.drawText('Natural (Study / Focus)', { x: 380, y: tableY + 20, size: 9, font: fontHelvetica, color: rgb(0.2, 0.2, 0.2) });

  // Section 2
  page.drawText('2. Preserved Text Acuity & Selectability', {
    x: 50,
    y: height - 495,
    size: 13,
    font: fontHelveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const body2 =
    'When zooming to 800% or viewing on Retina 4K displays, vector glyph outlines remain\n' +
    'flawlessly sharp. Unlike naive screenshot or raster conversions, file sizes increase by\n' +
    'less than 1 KB, and full document searchability is preserved for all PDF readers.';

  page.drawText(body2, {
    x: 50,
    y: height - 520,
    size: 10,
    font: fontHelvetica,
    lineHeight: 15,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Footer
  page.drawLine({
    start: { x: 50, y: 55 },
    end: { x: width - 50, y: 55 },
    thickness: 0.75,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText('ReadEasy Client-Side Vector Engine // Page 1 of 1', {
    x: 50,
    y: 40,
    size: 8,
    font: fontCourier,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await doc.save();
}
