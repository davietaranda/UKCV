import { ACCEPTED_CV_EXTENSIONS } from "@/lib/validation/request";
import { MAX_CV_SIZE_BYTES, MAX_CV_SIZE_LABEL } from "@/lib/validation/cv-limits";

export type FileValidationResult =
  | { valid: true; detectedType: "pdf" | "docx" }
  | { valid: false; error: string };

/**
 * Validates an uploaded CV file against size, extension, and actual file
 * signature (magic bytes). The browser-declared MIME type is deliberately
 * not checked: it's spoofable, and mobile file pickers often report
 * `application/octet-stream` or a nonstandard type for perfectly valid
 * PDFs/DOCX files, which would reject them for no security benefit.
 */
export function validateCvFile(file: File, bytes: Uint8Array): FileValidationResult {
  if (file.size === 0) {
    return { valid: false, error: "The uploaded file is empty." };
  }
  if (file.size > MAX_CV_SIZE_BYTES) {
    return { valid: false, error: `File is too large (max ${MAX_CV_SIZE_LABEL}).` };
  }

  const extension = getExtension(file.name);
  if (!ACCEPTED_CV_EXTENSIONS.includes(extension)) {
    return { valid: false, error: "Only PDF and DOCX files are accepted." };
  }

  const signature = detectSignature(bytes);
  if (!signature) {
    return {
      valid: false,
      error: "The file doesn't look like a valid PDF or DOCX (failed signature check).",
    };
  }

  if (
    (signature === "pdf" && extension !== ".pdf") ||
    (signature === "docx" && extension !== ".docx")
  ) {
    return { valid: false, error: "The file extension doesn't match its actual content." };
  }

  return { valid: true, detectedType: signature };
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

/** %PDF for PDF; DOCX is a ZIP (PK\x03\x04) — good enough signal without a full zip parse. */
function detectSignature(bytes: Uint8Array): "pdf" | "docx" | null {
  if (bytes.length < 4) return null;
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "pdf";
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return "docx";
  }
  return null;
}

/** Strips path components and unsafe characters so a filename can be used
 * safely in a storage key or displayed back to an admin. */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150);
}
