import "server-only";

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

async function extractFromPdf(bytes: Uint8Array): Promise<string> {
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
