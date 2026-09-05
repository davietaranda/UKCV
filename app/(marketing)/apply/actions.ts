"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { submissionSchema } from "@/lib/validation/request";
import { validateCvFile, sanitizeFilename } from "@/lib/validation/file";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadObject, originalCvKey } from "@/lib/storage/r2";
import { getClientIp, hashIp } from "@/lib/security/rate-limit";
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

  const admin = createAdminClient();

  // Abuse guards: cap submissions per email per day, and separately per IP
  // per hour (catches the same person spamming different emails, without
  // needing external rate-limit infra). Neither is bulletproof against a
  // determined attacker — CAPTCHA is the next line of defence if abuse
  // shows up in practice.
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

  const clientIp = await getClientIp();
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
  const safeFilename = sanitizeFilename(cvFile.name);
  const objectKey = originalCvKey(requestId, safeFilename);

  try {
    await uploadObject(objectKey, Buffer.from(bytes), cvFile.type || "application/octet-stream");
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
    original_filename: safeFilename,
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
