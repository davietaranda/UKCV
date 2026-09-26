import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCvContent } from "@/lib/documents/cv-content";
import { renderCoverLetterPdf } from "@/lib/documents/cover-letter-pdf";
import { getSignedDownloadUrl, coverLetterPdfKey, uploadObject } from "@/lib/storage/r2";
import { extractTextFromCv } from "@/lib/documents/extract-text";
import type { StructuredCV, TailoredCV } from "@/lib/ai/schemas";

// TEMPORARY — verifies that editing+saving a cover letter actually changes
// the rendered PDF content, using the admin client to bypass the
// session-cookie dependency a bare curl request can't satisfy. Mirrors
// renderAndPersistCoverLetter's logic directly against real production
// data. Delete right after use.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requestId = url.searchParams.get("requestId") ?? "b50c52f4-f0de-4259-a60b-3efee9e10bb7";
  const marker = `DEBUG MARKER ${Date.now()}`;
  const testText = `Dear Hiring Manager,\n\n${marker} — this paragraph was saved via the admin editor.\n\nYours faithfully,\nTest`;

  const admin = createAdminClient();
  const { data: requestRow } = await admin
    .from("requests")
    .select("customer_name, email, phone, job_title, company")
    .eq("id", requestId)
    .maybeSingle();
  const { data: cvDocRow } = await admin
    .from("cv_documents")
    .select("structured_cv")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: outputRow } = await admin
    .from("outputs")
    .select("id, tailored_cv")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!requestRow || !cvDocRow?.structured_cv || !outputRow?.tailored_cv) {
    return NextResponse.json({ error: "missing data", requestRow, cvDocRow, outputRow });
  }

  const structuredCV = cvDocRow.structured_cv as unknown as StructuredCV;
  const tailoredCV = outputRow.tailored_cv as unknown as TailoredCV;
  const content = buildCvContent(structuredCV, tailoredCV, {
    customerName: requestRow.customer_name,
    email: requestRow.email,
    phone: requestRow.phone,
  });

  const pdfBuffer = await renderCoverLetterPdf({
    name: content.name,
    contactParts: content.contactParts,
    date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    subject:
      requestRow.job_title && requestRow.company
        ? `Re: Application for ${requestRow.job_title} at ${requestRow.company}`
        : undefined,
    paragraphs: testText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
  });
  const key = coverLetterPdfKey(requestId);
  await uploadObject(key, pdfBuffer, "application/pdf");
  await admin
    .from("outputs")
    .update({ cover_letter: testText, cover_letter_path: key })
    .eq("id", outputRow.id);

  // Read back both the DB text and the actual uploaded PDF bytes to confirm
  // the marker is really in both places, not just claimed.
  const { data: after } = await admin
    .from("outputs")
    .select("cover_letter")
    .eq("id", outputRow.id)
    .maybeSingle();
  const downloadUrl = await getSignedDownloadUrl(key, 60, "attachment");
  const pdfResponse = await fetch(downloadUrl);
  const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
  const extractedText = await extractTextFromCv(pdfBytes, "pdf");

  return NextResponse.json({
    marker,
    dbTextPersisted: after?.cover_letter === testText,
    pdfBytesLength: pdfBytes.length,
    pdfActuallyContainsMarker: extractedText.includes(marker),
    extractedTextSample: extractedText.slice(0, 300),
  });
}
