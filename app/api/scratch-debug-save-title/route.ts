import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { structuredCVSchema } from "@/lib/ai/schemas";
import type { StructuredCV } from "@/lib/ai/schemas";

// TEMPORARY — diagnoses "editing the professional title and saving doesn't
// persist" by replicating saveTailoredCvEdits' exact update logic against
// the admin client (bypassing the session-cookie dependency that a bare
// curl request can't satisfy), to isolate whether the schema/data shape
// itself is the problem. Delete right after use.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requestId = url.searchParams.get("requestId") ?? "b50c52f4-f0de-4259-a60b-3efee9e10bb7";
  const testValue = `DEBUG TITLE ${Date.now()}`;

  const admin = createAdminClient();

  const { data: cvDocRow, error: fetchError } = await admin
    .from("cv_documents")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError || !cvDocRow?.structured_cv) {
    return NextResponse.json({ error: "no cv_documents row", fetchError });
  }

  const currentStructured = cvDocRow.structured_cv as unknown as StructuredCV;
  const updatedStructured: StructuredCV = {
    ...currentStructured,
    professionalTitle: testValue,
  };

  const validated = structuredCVSchema.safeParse(updatedStructured);
  if (!validated.success) {
    return NextResponse.json({
      error: "schema validation failed",
      issues: validated.error.issues,
    });
  }

  const { error: updateError } = await admin
    .from("cv_documents")
    .update({ structured_cv: validated.data })
    .eq("id", cvDocRow.id);

  const { data: after } = await admin
    .from("cv_documents")
    .select("structured_cv")
    .eq("id", cvDocRow.id)
    .maybeSingle();

  return NextResponse.json({
    testValue,
    updateError,
    beforeProfessionalTitle: currentStructured.professionalTitle,
    afterProfessionalTitle: (after?.structured_cv as { professionalTitle?: unknown } | null)
      ?.professionalTitle,
    persisted:
      (after?.structured_cv as { professionalTitle?: unknown } | null)?.professionalTitle ===
      testValue,
  });
}
