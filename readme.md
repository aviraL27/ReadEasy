# ReadEasy

Client-side document restyler that transforms PDFs and Office documents into high-contrast dark and paper themes without rasterization. Vector paths and font glyphs remain scalable curves, text remains selectable/searchable, and processed file size increases by less than 4 KB.

Zero server infrastructure. Processing occurs entirely in-browser memory.

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Client["Browser Sandbox (Zero External Requests)"]
        subgraph MainBundle["Initial Bundle (Split, <300 KB gzip)"]
            App["App.tsx (State Orchestrator)"]
            Drop["DropZone (Drag-and-Drop)"]
            Themes["ThemeSelector (4 Presets)"]
            Sample["sampleDocument.ts (Vector Generator)"]
            Binary["binary.ts (Header Verification)"]
        end

        subgraph LazyEngine["Lazy-Loaded Preview Engine (~1.7 MB on-demand)"]
            Lazy["lazyPreview.ts (Dynamic Import Wrapper)"]
            Preview["previewEngine.ts (PDF.js Canvas Renderer)"]
            Worker["pdf.worker.min.mjs (Dedicated Worker)"]
            CMaps["Local CMaps (public/cmaps/*.bcmap)"]
        end

        subgraph VectorEngines["Transformation Engines"]
            PdfEngine["pdfThemeEngine.ts (pdf-lib)"]
            OfficeEngine["officeThemeEngine.ts (JSZip)"]
        end

        BlobGen["In-Memory Blob URL Generator"]
        Anchor["Local File Download (<name>_<theme>.<ext>)"]
    end

    Drop --> Binary
    Binary --> App
    App --> Themes
    Themes -->|"Requires Page 1 Preview"| Lazy
    Lazy -->|"import()"| Preview
    Preview --> Worker
    Preview --> CMaps
    Themes -->|"User clicks Convert"| PdfEngine
    Themes -->|"DOCX / PPTX dropped"| OfficeEngine
    PdfEngine --> BlobGen
    OfficeEngine --> BlobGen
    BlobGen --> Anchor
```

---

## PDF Vector Transformation Pipeline

ReadEasy does not flatten pages to canvas bitmaps. It isolates the existing page streams and injects graphics state modifications directly into the PDF object tree:

```mermaid
flowchart LR
    subgraph PageNode["PDF Page Object (page.node)"]
        subgraph Contents["Normalized Content Array (Contents)"]
            direction TB
            S0["0: Background Stream\nq\nrgb(r,g,b) re f\nQ"]
            S1["1: Graphics State Enter\nq\n/ReadEasyTransfer gs"]
            S2["2..N: Original Content Streams\n(Preserved Text Operators, Paths, XObjects)"]
            SN["N+1: Graphics State Exit\nQ"]
        end

        subgraph ResourcesDict["Page Resources"]
            ExtGState["/ExtGState Dictionary"]
            TransferRef["/ReadEasyTransfer"]
            TRFunction["Type 2 Transfer Functions (TR)\n(RGB Color Remap Curves: C0 -> C1)"]
            
            ExtGState --> TransferRef
            TransferRef --> TRFunction
        end
    end

    S0 --> S1 --> S2 --> SN
    S1 -.->|"Applies gs"| TransferRef
```

### Stream Isolation Details
1. **`page.node.normalize()`**: Unifies single stream objects and arrays into a normalized `PDFArray`.
2. **Bounds Calculation**: Evaluates the bounding union of `MediaBox` and `CropBox` to prevent edge bleed across arbitrary PDF viewers.
3. **Background Injection**: A solid vector rectangle (`re f`) matching the target theme is prepended at index 0.
4. **Transfer State Enclosure**: A push operator (`q`) and `/ReadEasyTransfer gs` are injected at index 1, while a pop operator (`Q`) is appended at the end of the content stream array, preventing state leak.

---

## Office Document Architecture (DOCX & PPTX)

Office OpenXML files are ZIP archives containing XML definitions and binary media packages. ReadEasy restyles the styling nodes without altering the underlying document tree or embedded images.

```mermaid
flowchart LR
    subgraph OpenXML["OpenXML Archive (JSZip)"]
        subgraph DOCX["DOCX Processing"]
            D1["word/document.xml\nInject: <w:background w:color='...'/>\nRemap text run colors (<w:color>)"]
            D2["word/settings.xml\nInject: <w:displayBackgroundShape/>"]
            D3["word/styles.xml\nUpdate Default Normal Styles"]
        end

        subgraph PPTX["PPTX Processing"]
            P1["ppt/theme/theme1.xml\nRemap <a:clrScheme> (dk1, lt1, dk2, lt2)"]
            P2["ppt/slides/slide*.xml\nInject: <p:bg><p:bgPr><a:solidFill>..."]
            P3["ppt/slideMasters/slideMaster*.xml\nUpdate Master Backgrounds"]
        end

        subgraph Media["Untouched Binaries"]
            M1["word/media/* and ppt/media/*\n(Bitmaps preserved byte-for-byte)"]
        end
    end
```

---

## Theme Specifications

| Theme | UI Subtitle | Color Transfer Target | Background | Text Target |
|---|---|---|---|---|
| **Blackboard** | Dark Slate / Soft Chalk | Inverts white, floors darks | `#2B2B2B` | `#E5E5E5` |
| **Old Book** | Warm Cream / Sepia | Attenuates blue wavelengths | `#F4ECD8` | `#26221C` |
| **True Black** | OLED / High Contrast | Linear inversion ($1.0 \rightarrow 0.0$) | `#000000` | `#FFFFFF` |
| **Amber** | Retro Phosphor CRT | Amber phosphor curve | `#1A1A1A` | `#FFB000` |

---

## Technical Tradeoffs

| Factor | Canvas/Bitmap Rasterization | ReadEasy Vector Transformation |
|---|---|---|
| **Text Rendering** | Blurs and pixelates when zoomed | True mathematical Bézier curves at all scales |
| **File Size Delta** | $+10\text{ MB}$ to $+100\text{ MB}$ per document | $+500\text{ B}$ to $+3.5\text{ KB}$ total |
| **Text Selectability** | Lost (requires OCR to restore) | 100% native selection, copy, and Ctrl+F |
| **Processing Speed** | 1000–3000 ms per page | 5–15 ms per page |
| **Embedded Photos** | Unchanged | Luminance inverted in dark modes (Known vector limitation) |

> **Limitation Note**: Because full-page color transfer maps base luminance values, photographic images embedded in PDFs invert in dark modes. For DOCX/PPTX, embedded images reside in separate package parts (`media/*`) and remain completely untouched.

---

## Security & Self-Containment

- **No Remote Dependencies**: Character map files (`*.bcmap`) are bundled under `public/cmaps/`. No requests are made to third-party CDNs (such as jsDelivr or cdnjs).
- **Content Security Policy**: Enforced via `vercel.json` and `index.html`:
  ```
  default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';
  ```
- **Air-Gapped Processing**: All operations run inside Web Workers and main-thread JavaScript. No analytics, tracking pixels, or outbound telemetry.

---

## Repository Structure

```
├── public/
│   ├── cmaps/                     # 169 bundled offline character maps
│   └── favicon.svg                # Vector SVG icon
├── src/
│   ├── App.tsx                    # Main state machine
│   ├── index.css                  # Impeccable style tokens (monochrome)
│   ├── version.ts                 # Release version declaration
│   ├── components/
│   │   ├── Header.tsx             # Minimal brand header
│   │   ├── DropZone.tsx           # Drag-and-drop input & sample trigger
│   │   ├── ThemeSelector.tsx      # 4 theme configuration cards
│   │   ├── PreviewViewport.tsx    # Live Page 1 canvas preview & compare toggle
│   │   └── ActionBar.tsx          # Export trigger, progress, and file metadata
│   └── engine/
│       ├── binary.ts              # File header sanity checks & buffer cloning
│       ├── lazyPreview.ts         # Code-splitting dynamic import boundary
│       ├── previewEngine.ts       # PDF.js renderer with DPR retina scaling
│       ├── pdfThemeEngine.ts      # Vector PDF transform engine (pdf-lib)
│       ├── pdfThemeEngine.test.ts # Vitest regression suite for themes & ExtGState
│       ├── officeThemeEngine.ts   # JSZip XML engine for DOCX and PPTX
│       └── sampleDocument.ts      # Vector test document generator
├── vercel.json                    # Edge routing, headers, CSP, and caching
└── package.json                   # Dependencies and build scripts
```

---

## Development & Verification

```bash
# Install dependencies
npm install

# Run Vitest regression tests (validates all 4 themes & ExtGState /TR dictionaries)
npm run test

# Run development server
npm run dev

# Compile TypeScript and generate production bundle
npm run build

# Preview production build locally
npm run preview
```
