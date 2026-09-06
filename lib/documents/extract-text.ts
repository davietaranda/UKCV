import "server-only";
import CSSMatrix from "@thednp/dommatrix";
// @ts-expect-error - no bundled type declarations for this subpath
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

const EXTRACTION_TIMEOUT_MS = 30_000;

/**
 * Raw text extraction from an uploaded CV, prior to any AI processing.
 * Document *generation* (producing the tailored PDF/DOCX) is Phase 5 — this
 * is only the read side, required as an input to CV extraction (Phase 4).
 *
 * Bounded by a timeout: a crafted/pathological PDF or DOCX (a "zip/PDF
 * bomb") could otherwise hang the parser and tie up the server process
 * indefinitely. The 8MB upload cap (lib/validation/file.ts) limits size,
 * this limits parse time.
 */
export async function extractTextFromCv(
  bytes: Uint8Array,
  detectedType: "pdf" | "docx"
): Promise<string> {
  const extraction = detectedType === "pdf" ? extractFromPdf(bytes) : extractFromDocx(bytes);
  return withTimeout(extraction, EXTRACTION_TIMEOUT_MS, "Document parsing timed out.");
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * pdf-parse's Node code path (via pdfjs-dist's legacy build) references
 * DOMMatrix — a browser global with no Node equivalent — at module init
 * time, even for plain text extraction with no rendering involved. It tries
 * to auto-polyfill this by feature-detecting `process.getBuiltinModule`
 * (real, but Node 22+/20.16+ only); when that's unavailable the polyfill
 * silently no-ops and every PDF extraction crashes with "DOMMatrix is not
 * defined". A bundler-shimmed `require` can't reliably stand in for that
 * (Turbopack's `require` doesn't resolve arbitrary Node builtins by dynamic
 * string id), so polyfill DOMMatrix itself directly with a real spec
 * implementation instead of depending on the runtime or the bundler.
 */
function ensureDOMMatrixPolyfill() {
  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = CSSMatrix as unknown as typeof DOMMatrix;
  }
}

/**
 * pdfjs-dist normally parses PDFs on a background Worker thread; in Node it
 * falls back to running the worker code on the main thread instead ("fake
 * worker"), which it sets up by dynamically `import()`-ing its own
 * pdf.worker.mjs file by a runtime path string. Turbopack can't statically
 * analyse that dynamic path, so the bundled output never includes the
 * worker chunk and the import 404s ("Setting up fake worker failed").
 * pdfjs-dist checks `globalThis.pdfjsWorker` before attempting that dynamic
 * import, so pre-populating it via a normal static import (which Turbopack
 * *can* bundle) skips the broken path entirely.
 */
function ensurePdfWorkerPolyfill() {
  const g = globalThis as unknown as { pdfjsWorker?: unknown };
  if (!g.pdfjsWorker) {
    g.pdfjsWorker = pdfjsWorker;
  }
}

async function extractFromPdf(bytes: Uint8Array): Promise<string> {
  ensureDOMMatrixPolyfill();
  ensurePdfWorkerPolyfill();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(bytes) });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}

async function extractFromDocx(bytes: Uint8Array): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return result.value.trim();
}
