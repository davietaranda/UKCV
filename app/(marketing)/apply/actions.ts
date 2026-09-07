"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { submissionSchema, builtCvSchema, type BuiltCv } from "@/lib/validation/request";
import { validateCvFile, sanitizeFilename } from "@/lib/validation/file";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadObject, originalCvKey } from "@/lib/storage/r2";
import { getClientIp, hashIp } from "@/lib/security/rate-limit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { renderBuiltCvPdf, builtCvToStructuredCV } from "@/lib/documents/cv-builder";
import type { StructuredCV } from "@/lib/ai/schemas";
import { logger } from "@/lib/logger";

export type ApplyState = { error?: string; fieldErrors?: Record<string, string> };

const MAX_SUBMISSIONS_PER_EMAIL_PER_DAY = 3;
const MAX_SUBMISSIONS_PER_IP_PER_HOUR = 5;

export async function submitRequest(
  _prevState: ApplyState,
  formData: FormData
): Promise<ApplyState> {
  const parsed = submissionSchema.safeParse({
    customerName: formData.get("customerName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    company: formData.get("company") ?? "",
    jobTitle: formData.get("jobTitle") ?? "",
    jobUrl: formData.get("jobUrl") ?? "",
    jobDescription: formData.get("jobDescription"),
    packageId: formData.get("packageId"),
    urgency: formData.get("urgency") ?? "",
    consent: formData.get("consent"),
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    // A filled honeypot fails validation like anything else — no distinct
    // "you're a bot" message, so a scraper learns nothing from the response.
    return { error: "Please check the highlighted fields and try again.", fieldErrors };
  }

  const clientIp = await getClientIp();

  const turnstileOk = await verifyTurnstileToken(
    formData.get("cf-turnstile-response") as string | null,
    clientIp
  );
  if (!turnstileOk) {
    return { error: "Verification failed. Please try again." };
  }

  // Two ways to provide a CV: upload an existing file, or build one from
  // scratch via the structured form (for applicants with no CV yet) — see
  // components/marketing/apply-form.tsx and lib/documents/cv-builder.ts.
  const cvMode = formData.get("cvMode") === "build" ? "build" : "upload";

  let cvBytes: Uint8Array;
  let cvContentType: string;
  let cvFilename: string;
  let prebuiltStructuredCV: StructuredCV | undefined;

  if (cvMode === "build") {
    let builtCvInput: unknown;
    try {
      builtCvInput = JSON.parse(String(formData.get("builtCv") ?? ""));
    } catch {
      return { error: "Something went wrong reading your CV details. Please try again." };
    }
    const builtCvParsed = builtCvSchema.safeParse(builtCvInput);
    if (!builtCvParsed.success) {
      return {
        error: builtCvParsed.error.issues[0]?.message ?? "Please check your CV details and try again.",
      };
    }

    const contact = {
      customerName: String(formData.get("customerName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: (formData.get("phone") as string) || null,
    };

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await renderBuiltCvPdf(builtCvParsed.data, contact);
    } catch (err) {
      logger.error("Built CV rendering failed", {
        message: err instanceof Error ? err.message : "unknown",
      });
      return { error: "We couldn't generate your CV. Please try again." };
    }

    cvBytes = pdfBuffer;
    cvContentType = "application/pdf";
    cvFilename = `${sanitizeFilename(contact.customerName || "candidate")}-cv.pdf`;
    prebuiltStructuredCV = builtCvToStructuredCV(builtCvParsed.data, contact);
  } else {
    const cvFile = formData.get("cv");
    if (!(cvFile instanceof File) || cvFile.size === 0) {
      return { error: "Please attach your CV (PDF or DOCX)." };
    }

    const arrayBuffer = await cvFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const fileValidation = validateCvFile(cvFile, bytes);
    if (!fileValidation.valid) {
      return { error: fileValidation.error };
    }

    cvBytes = bytes;
    cvContentType = cvFile.type || "application/octet-stream";
    cvFilename = sanitizeFilename(cvFile.name);
  }

  const admin = createAdminClient();

  // Abuse guards: cap submissions per email per day, and separately per IP
  // per hour (catches the same person spamming different emails, without
  // needing external rate-limit infra). Neither is bulletproof against a
  // determined attacker on its own, which is what the Turnstile check above
  // is for.
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: emailCount, error: emailCountError } = await admin
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("email", parsed.data.email)
    .gte("created_at", oneDayAgo);

  if (emailCountError) {
    logger.error("Failed to check email rate limit", { message: emailCountError.message });
    return { error: "Something went wrong. Please try again in a moment." };
  }
  if ((emailCount ?? 0) >= MAX_SUBMISSIONS_PER_EMAIL_PER_DAY) {
    return {
      error: "You've reached the daily limit for submissions from this email. Please try again tomorrow.",
    };
  }

  const ipHash = clientIp ? hashIp(clientIp) : null;

  if (ipHash) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: ipCount, error: ipCountError } = await admin
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);

    if (ipCountError) {
      logger.error("Failed to check IP rate limit", { message: ipCountError.message });
      return { error: "Something went wrong. Please try again in a moment." };
    }
    if ((ipCount ?? 0) >= MAX_SUBMISSIONS_PER_IP_PER_HOUR) {
      return { error: "Too many submissions from this connection. Please try again later." };
    }
  }

  const requestId = randomUUID();
  const objectKey = originalCvKey(requestId, cvFilename);

  try {
    await uploadObject(objectKey, Buffer.from(cvBytes), cvContentType);
  } catch (err) {
    logger.error("CV upload to storage failed", {
      requestId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return { error: "We couldn't upload your CV. Please try again." };
  }

  const { error: insertError } = await admin.from("requests").insert({
    id: requestId,
    customer_name: parsed.data.customerName,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    job_title: parsed.data.jobTitle || null,
    company: parsed.data.company || null,
    job_url: parsed.data.jobUrl || null,
    job_description: parsed.data.jobDescription,
    package: parsed.data.packageId,
    urgency: parsed.data.urgency || null,
    ip_hash: ipHash,
    status: "new",
  });

  if (insertError) {
    logger.error("Failed to create request row", { requestId, message: insertError.message });
    return { error: "Something went wrong saving your request. Please try again." };
  }

  const { error: cvInsertError } = await admin.from("cv_documents").insert({
    request_id: requestId,
    original_file_path: objectKey,
    original_filename: cvFilename,
    ...(prebuiltStructuredCV ? { structured_cv: prebuiltStructuredCV } : {}),
  });

  if (cvInsertError) {
    logger.error("Failed to create cv_documents row", {
      requestId,
      message: cvInsertError.message,
    });
    return { error: "Something went wrong saving your request. Please try again." };
  }

  logger.info("Request submitted", { requestId, package: parsed.data.packageId });

  redirect(`/apply/confirmation?ref=${requestId.slice(0, 8)}`);
}

export type PreviewBuiltCvResult = { pdf: string } | { error: string };

/**
 * Renders a preview PDF for the "build a CV" form without saving anything —
 * called directly from the client (components/marketing/apply-form.tsx),
 * not via a form action. Deliberately looser validation than submitRequest
 * (e.g. no consent/job-description checks): this only needs enough to
 * render a document, since nothing here is persisted.
 */
export async function previewBuiltCv(
  builtCvInput: unknown,
  contactInput: { customerName: unknown; email: unknown; phone: unknown }
): Promise<PreviewBuiltCvResult> {
  const builtCvParsed = builtCvSchema.safeParse(builtCvInput);
  if (!builtCvParsed.success) {
    return { error: builtCvParsed.error.issues[0]?.message ?? "Please check your CV details." };
  }

  const contact = {
    customerName: String(contactInput.customerName ?? "").trim() || "Your Name",
    email: String(contactInput.email ?? "").trim(),
    phone: String(contactInput.phone ?? "").trim() || null,
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderBuiltCvPdf(builtCvParsed.data, contact);
  } catch (err) {
    logger.error("Built CV preview rendering failed", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return { error: "We couldn't generate a preview. Please try again." };
  }

  return { pdf: pdfBuffer.toString("base64") };
}

// Re-exported so the client form can share the exact same shape it posts as
// the "builtCv" hidden field, without importing a server-only module.
export type { BuiltCv };
