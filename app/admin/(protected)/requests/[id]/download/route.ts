import { NextResponse } from "next/server";
import { getAdminProfile } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignedDownloadUrl } from "@/lib/storage/r2";
import { sanitizeFilename } from "@/lib/validation/file";

const FILE_TYPES = ["original", "cv_pdf", "cv_docx", "cover_letter"] as const;
type FileType = (typeof FILE_TYPES)[number];

/** Redirects to a short-lived signed R2 URL for one of a request's files.
 * Never returns or logs the raw object key/URL to the client beyond this
 * one-time redirect. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminProfile();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type") ?? "original";
  if (!FILE_TYPES.includes(typeParam as FileType)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }
  const type = typeParam as FileType;
  // ?preview=1 renders the file in the browser (works for PDFs) instead of
  // saving straight to disk — see the Preview links next to Download.
  const disposition = url.searchParams.get("preview") === "1" ? "inline" : "attachment";

  const supabase = await createClient();

  const { data: requestRow } = await supabase
    .from("requests")
    .select("customer_name")
    .eq("id", id)
    .maybeSingle();
  if (!requestRow) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const resolved = await resolveObjectKey(supabase, id, type);
  if (!resolved) {
    return NextResponse.json({ error: "File not found for this request" }, { status: 404 });
  }

  const filename = sanitizeFilename(
    `${requestRow.customer_name} - ${DOWNLOAD_LABELS[type]}${resolved.extension}`
  );
  const signedUrl = await getSignedDownloadUrl(resolved.key, 120, disposition, filename);
  return NextResponse.redirect(signedUrl);
}

const DOWNLOAD_LABELS: Record<FileType, string> = {
  original: "Original CV",
  cv_pdf: "Tailored CV",
  cv_docx: "Tailored CV",
  cover_letter: "Cover Letter",
};

async function resolveObjectKey(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestId: string,
  type: FileType
): Promise<{ key: string; extension: string } | null> {
  if (type === "original") {
    const { data } = await supabase
      .from("cv_documents")
      .select("original_file_path, original_filename")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.original_file_path) return null;
    const dot = data.original_filename?.lastIndexOf(".") ?? -1;
    const extension = dot > -1 ? data.original_filename!.slice(dot) : "";
    return { key: data.original_file_path, extension };
  }

  const { data } = await supabase
    .from("outputs")
    .select("cv_pdf_path, cv_docx_path, cover_letter_path")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  if (type === "cv_pdf") return data.cv_pdf_path ? { key: data.cv_pdf_path, extension: ".pdf" } : null;
  if (type === "cv_docx") return data.cv_docx_path ? { key: data.cv_docx_path, extension: ".docx" } : null;
  return data.cover_letter_path ? { key: data.cover_letter_path, extension: ".pdf" } : null;
}
