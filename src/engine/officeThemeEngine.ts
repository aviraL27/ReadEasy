import JSZip from 'jszip';
import type { ThemeId } from './pdfThemeEngine';
import { copyBytes } from './binary';

export interface OfficeThemePalette {
  bgHex: string;
  textHex: string;
  mutedHex: string;
  accentHex: string;
}

export const OFFICE_THEME_PALETTES: Record<ThemeId, OfficeThemePalette> = {
  blackboard: {
    bgHex: '2B2B2B',
    textHex: 'E5E5E5',
    mutedHex: 'A3A3A3',
    accentHex: '60A5FA',
  },
  'old-book': {
    bgHex: 'F4ECD8',
    textHex: '26221C',
    mutedHex: '57534E',
    accentHex: 'B45309',
  },
  'true-black': {
    bgHex: '000000',
    textHex: 'FFFFFF',
    mutedHex: 'A1A1AA',
    accentHex: '38BDF8',
  },
  amber: {
    bgHex: '1A1A1A',
    textHex: 'FFB000',
    mutedHex: 'D97706',
    accentHex: 'F59E0B',
  },
};

export interface OfficeRestyleResult {
  fileBytes: Uint8Array;
  originalSize: number;
  newSize: number;
  format: 'docx' | 'pptx';
  durationMs: number;
}

async function openOfficePackage(
  inputData: ArrayBuffer | Uint8Array,
  requiredDocumentPart: string,
  format: 'DOCX' | 'PPTX'
): Promise<JSZip> {
  let zip: JSZip;

  try {
    // Do not let a ZIP implementation take ownership of application state.
    zip = await JSZip.loadAsync(copyBytes(inputData));
  } catch {
    throw new Error(`The selected .${format.toLowerCase()} file is not a readable Office ZIP package.`);
  }

  if (!zip.file('[Content_Types].xml') || !zip.file(requiredDocumentPart)) {
    throw new Error(`The selected file is not a valid ${format} document.`);
  }

  return zip;
}

/**
 * Restyles a DOCX file directly at the XML level via JSZip.
 * Sets document background (<w:background>), enables displayBackgroundShape in settings,
 * and updates run text colors while preserving embedded images untouched.
 */
export async function restyleDocx(
  inputData: ArrayBuffer | Uint8Array,
  themeId: ThemeId
): Promise<OfficeRestyleResult> {
  const startTime = performance.now();
  const originalSize = inputData.byteLength;
  const palette = OFFICE_THEME_PALETTES[themeId];

  const zip = await openOfficePackage(inputData, 'word/document.xml', 'DOCX');

  // 1. Update word/document.xml
  const docXmlFile = zip.file('word/document.xml');
  if (docXmlFile) {
    let xml = await docXmlFile.async('string');

    // Remove existing background tag if present
    xml = xml.replace(/<w:background[^>]*\/>/g, '');

    // Inject <w:background w:color="HEX"/> right before <w:body>
    const bgTag = `<w:background w:color="${palette.bgHex}"/>`;
    if (xml.includes('<w:body>')) {
      xml = xml.replace('<w:body>', `${bgTag}<w:body>`);
    } else if (xml.includes('<w:body ')) {
      xml = xml.replace(/<w:body([^>]*)>/, `${bgTag}<w:body$1>`);
    }

    // Replace auto or black text colors with theme text color
    xml = xml.replace(/<w:color w:val="(000000|auto)"\s*\/>/gi, `<w:color w:val="${palette.textHex}"/>`);

    zip.file('word/document.xml', xml);
  }

  // 2. Update word/settings.xml to display background shape
  const settingsFile = zip.file('word/settings.xml');
  if (settingsFile) {
    let settingsXml = await settingsFile.async('string');
    if (!settingsXml.includes('displayBackgroundShape')) {
      if (settingsXml.includes('</w:settings>')) {
        settingsXml = settingsXml.replace('</w:settings>', '<w:displayBackgroundShape/></w:settings>');
      }
      zip.file('word/settings.xml', settingsXml);
    }
  }

  // 3. Update word/styles.xml text default colors
  const stylesFile = zip.file('word/styles.xml');
  if (stylesFile) {
    let stylesXml = await stylesFile.async('string');
    stylesXml = stylesXml.replace(/<w:color w:val="(000000|auto)"\s*\/>/gi, `<w:color w:val="${palette.textHex}"/>`);
    zip.file('word/styles.xml', stylesXml);
  }

  const outputBytes = await zip.generateAsync({ type: 'uint8array' });
  const endTime = performance.now();

  return {
    fileBytes: outputBytes,
    originalSize,
    newSize: outputBytes.byteLength,
    format: 'docx',
    durationMs: Math.round(endTime - startTime),
  };
}

/**
 * Restyles a PPTX presentation directly at the XML level via JSZip.
 * Modifies slide master, slide backgrounds, and theme color schemes.
 * Keeps all media in ppt/media/* untouched.
 */
export async function restylePptx(
  inputData: ArrayBuffer | Uint8Array,
  themeId: ThemeId
): Promise<OfficeRestyleResult> {
  const startTime = performance.now();
  const originalSize = inputData.byteLength;
  const palette = OFFICE_THEME_PALETTES[themeId];

  const zip = await openOfficePackage(inputData, 'ppt/presentation.xml', 'PPTX');

  // 1. Update theme color scheme if ppt/theme/theme1.xml exists
  const themeFile = zip.file('ppt/theme/theme1.xml');
  if (themeFile) {
    let themeXml = await themeFile.async('string');

    // Replace dk1 with text color and lt1 with background color
    themeXml = themeXml.replace(
      /<a:dk1>[\s\S]*?<\/a:dk1>/,
      `<a:dk1><a:srgbClr val="${palette.textHex}"/></a:dk1>`
    );
    themeXml = themeXml.replace(
      /<a:lt1>[\s\S]*?<\/a:lt1>/,
      `<a:lt1><a:srgbClr val="${palette.bgHex}"/></a:lt1>`
    );
    themeXml = themeXml.replace(
      /<a:dk2>[\s\S]*?<\/a:dk2>/,
      `<a:dk2><a:srgbClr val="${palette.mutedHex}"/></a:dk2>`
    );
    themeXml = themeXml.replace(
      /<a:lt2>[\s\S]*?<\/a:lt2>/,
      `<a:lt2><a:srgbClr val="${palette.bgHex}"/></a:lt2>`
    );

    zip.file('ppt/theme/theme1.xml', themeXml);
  }

  // 2. Inject slide background into every slide XML
  const slideRegex = /^ppt\/slides\/slide\d+\.xml$/;
  const slideFiles = Object.keys(zip.files).filter((name) => slideRegex.test(name));

  for (const slideName of slideFiles) {
    const file = zip.file(slideName);
    if (!file) continue;

    let slideXml = await file.async('string');

    // Construct solid fill background
    const bgNode = `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${palette.bgHex}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`;

    if (slideXml.includes('<p:bg>')) {
      slideXml = slideXml.replace(/<p:bg>[\s\S]*?<\/p:bg>/, bgNode);
    } else if (slideXml.includes('<p:cSld>')) {
      slideXml = slideXml.replace('<p:cSld>', `<p:cSld>${bgNode}`);
    } else if (slideXml.includes('<p:cSld ')) {
      slideXml = slideXml.replace(/<p:cSld([^>]*)>/, `<p:cSld$1>${bgNode}`);
    }

    // Replace black or dark text run fills
    slideXml = slideXml.replace(
      /<a:solidFill><a:srgbClr val="(000000|1F1F1F|262626)"\s*\/?><\/a:solidFill>/gi,
      `<a:solidFill><a:srgbClr val="${palette.textHex}"/></a:solidFill>`
    );

    zip.file(slideName, slideXml);
  }

  // 3. Update slide master backgrounds if present
  const masterRegex = /^ppt\/slideMasters\/slideMaster\d+\.xml$/;
  const masterFiles = Object.keys(zip.files).filter((name) => masterRegex.test(name));

  for (const masterName of masterFiles) {
    const file = zip.file(masterName);
    if (!file) continue;

    let masterXml = await file.async('string');
    const bgNode = `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${palette.bgHex}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`;

    if (masterXml.includes('<p:bg>')) {
      masterXml = masterXml.replace(/<p:bg>[\s\S]*?<\/p:bg>/, bgNode);
    } else if (masterXml.includes('<p:cSld>')) {
      masterXml = masterXml.replace('<p:cSld>', `<p:cSld>${bgNode}`);
    } else if (masterXml.includes('<p:cSld ')) {
      masterXml = masterXml.replace(/<p:cSld([^>]*)>/, `<p:cSld$1>${bgNode}`);
    }

    zip.file(masterName, masterXml);
  }

  const outputBytes = await zip.generateAsync({ type: 'uint8array' });
  const endTime = performance.now();

  return {
    fileBytes: outputBytes,
    originalSize,
    newSize: outputBytes.byteLength,
    format: 'pptx',
    durationMs: Math.round(endTime - startTime),
  };
}
