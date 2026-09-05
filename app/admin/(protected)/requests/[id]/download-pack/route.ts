import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getAdminProfile } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { getObjectBytes } from "@/lib/storage/r2";
import { logger } from "@/lib/logger";

/** Bundles every available deliverable for a request (tailored CV PDF+DOCX,
 * cover letter) into one ZIP. Original CV is intentionally excluded — this
 * is the pack the admin hands to the customer, not an internal archive. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminProfile();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("requests")
    .select("customer_name")
    .eq("id", id)
    .maybeSingle();
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const { data: outputs } = await supabase
    .from("outputs")
    .select("cv_pdf_path, cv_docx_path, cover_letter_path")
    .eq("request_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!outputs || (!outputs.cv_pdf_path && !outputs.cv_docx_path && !outputs.cover_letter_path)) {
    return NextResponse.json({ error: "No generated documents yet" }, { status: 404 });
  }

  const zip = new JSZip();
  const files: Array<[string, string | null]> = [
    ["Tailored CV.pdf", outputs.cv_pdf_path],
    ["Tailored CV.docx", outputs.cv_docx_path],
    ["Cover Letter.pdf", outputs.cover_letter_path],
  ];

  let added = 0;
  for (const [name, key] of files) {
    if (!key) continue;
    try {
      const bytes = await getObjectBytes(key);
      zip.file(name, bytes);
      added += 1;
    } catch (err) {
      logger.error("Failed to add file to download pack", {
        requestId: id,
        key,
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  if (added === 0) {
    return NextResponse.json({ error: "Failed to build the download pack" }, { status: 500 });
  }

  const zipBytes = Uint8Array.from(await zip.generateAsync({ type: "nodebuffer" }));
  const safeName = request.customer_name.replace(/[^a-zA-Z0-9._-]/g, "_");

  return new NextResponse(new Blob([zipBytes]), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}-application-pack.zip"`,
    },
  });
}
