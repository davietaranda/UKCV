import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedDownloadUrl } from "@/lib/storage/r2";
import { sanitizeFilename } from "@/lib/validation/file";

// TEMPORARY — generates a real signed URL with the new filename param
// against a real request's real file, and returns the URL for direct
// inspection (not redirect) so the actual Content-Disposition response
// header can be checked. Delete right after use.
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requestId =
    new URL(request.url).searchParams.get("requestId") ?? "b50c52f4-f0de-4259-a60b-3efee9e10bb7";

  const admin = createAdminClient();
  const { data: requestRow } = await admin
    .from("requests")
    .select("customer_name")
    .eq("id", requestId)
    .maybeSingle();
  const { data: outputs } = await admin
    .from("outputs")
    .select("cv_pdf_path")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!requestRow || !outputs?.cv_pdf_path) {
    return NextResponse.json({ error: "no data", requestRow, outputs });
  }

  const filename = sanitizeFilename(`${requestRow.customer_name} - Tailored CV.pdf`);
  const url = await getSignedDownloadUrl(outputs.cv_pdf_path, 60, "attachment", filename);
  return NextResponse.json({ filename, url });
}
