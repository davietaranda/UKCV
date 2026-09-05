import { NextResponse } from "next/server";
import { getAdminProfile } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignedDownloadUrl } from "@/lib/storage/r2";

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
  const typeParam = new URL(request.url).searchParams.get("type") ?? "original";
  if (!FILE_TYPES.includes(typeParam as FileType)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }
  const type = typeParam as FileType;

  const supabase = await createClient();
  const objectKey = await resolveObjectKey(supabase, id, type);

  if (!objectKey) {
    return NextResponse.json({ error: "File not found for this request" }, { status: 404 });
  }

  const signedUrl = await getSignedDownloadUrl(objectKey, 120);
  return NextResponse.redirect(signedUrl);
}

async function resolveObjectKey(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestId: string,
  type: FileType
): Promise<string | null> {
  if (type === "original") {
    const { data } = await supabase
      .from("cv_documents")
      .select("original_file_path")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.original_file_path ?? null;
  }

  const { data } = await supabase
    .from("outputs")
    .select("cv_pdf_path, cv_docx_path, cover_letter_path")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  if (type === "cv_pdf") return data.cv_pdf_path;
  if (type === "cv_docx") return data.cv_docx_path;
  return data.cover_letter_path;
}
