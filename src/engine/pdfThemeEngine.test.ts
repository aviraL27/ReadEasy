import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFNumber } from 'pdf-lib';
import { restylePdf, RESTYLE_THEMES } from './pdfThemeEngine';
import { generateSamplePdf } from './sampleDocument';

describe('PDF Theme Engine - Vector Color-Transfer Regression Tests', () => {
  it('should generate a valid vector sample PDF to test against', async () => {
    const sampleBytes = await generateSamplePdf();
    expect(sampleBytes).toBeInstanceOf(Uint8Array);
    expect(sampleBytes.byteLength).toBeGreaterThan(0);

    const doc = await PDFDocument.load(sampleBytes);
    expect(doc.getPageCount()).toBe(1);
  });

  for (const theme of RESTYLE_THEMES) {
    it(`should restyle PDF with "${theme.id}" theme, open cleanly, and assert its color-transfer state`, async () => {
      const sampleBytes = await generateSamplePdf();
      const originalSize = sampleBytes.byteLength;

      // 1. Process document through vector theme engine
      const result = await restylePdf(sampleBytes, {
        themeId: theme.id,
      });

      // 2. Assert output exists and retains near-identical file size (< 4KB delta, non-rasterized)
      expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
      expect(result.pageCount).toBe(1);
      const sizeDelta = result.newSize - originalSize;
      expect(sizeDelta).toBeLessThan(4000); // Only transfer-function dictionaries & streams added

      // 3. Assert document opens and parses cleanly without throwing
      const themedDoc = await PDFDocument.load(result.pdfBytes);
      expect(themedDoc.getPageCount()).toBe(1);

      const page = themedDoc.getPage(0);
      expect(page).toBeDefined();

      // 4. Assert graphics state and color-transfer state (/ExtGState /TR)
      const resources = page.node.Resources();
      expect(resources).toBeDefined();

      const extGState = resources?.lookup(PDFName.of('ExtGState'), PDFDict);
      expect(extGState).toBeDefined();

      // Find the ExtGState entry containing the transfer function (TR)
      let transferExtGState: PDFDict | null = null;
      if (extGState) {
        for (const [, valRef] of extGState.entries()) {
          const dict = themedDoc.context.lookup(valRef);
          if (dict instanceof PDFDict && dict.lookup(PDFName.of('TR'))) {
            transferExtGState = dict;
            break;
          }
        }
      }

      expect(transferExtGState).not.toBeNull();
      const trArray = transferExtGState!.lookup(PDFName.of('TR'));
      expect(trArray).toBeInstanceOf(PDFArray);

      // Verify 4-channel transfer functions (R, G, B, Identity/Preserve)
      const trFunctions = trArray as PDFArray;
      expect(trFunctions.size()).toBe(4);

      // Assert R channel transfer mapping (C0 -> C1)
      const rFunc = themedDoc.context.lookup(trFunctions.get(0)) as PDFDict;
      expect(rFunc).toBeInstanceOf(PDFDict);
      expect((rFunc.lookup(PDFName.of('FunctionType')) as PDFNumber).asNumber()).toBe(2);

      const rC0 = rFunc.lookup(PDFName.of('C0')) as PDFArray;
      const rC1 = rFunc.lookup(PDFName.of('C1')) as PDFArray;
      expect((rC0.get(0) as PDFNumber).asNumber()).toBeCloseTo(theme.pdfTransform.transferStart.r, 3);
      expect((rC1.get(0) as PDFNumber).asNumber()).toBeCloseTo(theme.pdfTransform.transferEnd.r, 3);

      // Assert G channel transfer mapping
      const gFunc = themedDoc.context.lookup(trFunctions.get(1)) as PDFDict;
      const gC0 = gFunc.lookup(PDFName.of('C0')) as PDFArray;
      const gC1 = gFunc.lookup(PDFName.of('C1')) as PDFArray;
      expect((gC0.get(0) as PDFNumber).asNumber()).toBeCloseTo(theme.pdfTransform.transferStart.g, 3);
      expect((gC1.get(0) as PDFNumber).asNumber()).toBeCloseTo(theme.pdfTransform.transferEnd.g, 3);

      // Assert B channel transfer mapping
      const bFunc = themedDoc.context.lookup(trFunctions.get(2)) as PDFDict;
      const bC0 = bFunc.lookup(PDFName.of('C0')) as PDFArray;
      const bC1 = bFunc.lookup(PDFName.of('C1')) as PDFArray;
      expect((bC0.get(0) as PDFNumber).asNumber()).toBeCloseTo(theme.pdfTransform.transferStart.b, 3);
      expect((bC1.get(0) as PDFNumber).asNumber()).toBeCloseTo(theme.pdfTransform.transferEnd.b, 3);
    });
  }
});
