import { notFound } from "next/navigation";
import Link from "next/link";
import { getRequestDetail } from "@/lib/admin/requests";
import { getAIRunsForRequest } from "@/lib/admin/ai-runs";
import { StatusBadge } from "@/components/admin/status-badge";
import { MatchScore } from "@/components/admin/match-score";
import { StatusActions } from "@/components/admin/status-actions";
import { ProcessRequestButton } from "@/components/admin/process-request-button";
import { GenerateAnswersForm } from "@/components/admin/generate-answers-form";
import { AiRunsLog } from "@/components/admin/ai-runs-log";
import { MatchList } from "@/components/admin/match-list";
import { TruthGuardFlags } from "@/components/admin/truth-guard-flags";
import { CvComparison } from "@/components/admin/cv-comparison";
import { TailoredCvEditor } from "@/components/admin/tailored-cv-editor";
import { RegenerateCoverLetterButton } from "@/components/admin/regenerate-cover-letter-button";
import { DeleteRequestButton } from "@/components/admin/delete-request-button";
import { DetailTabs, type DetailTab } from "@/components/admin/detail-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { JsonPreview } from "@/components/admin/json-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPackageById } from "@/lib/packages";
import type { StructuredCV, TailoredCV, EvidenceMatchItem, TruthGuardFlag } from "@/lib/ai/schemas";

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, aiRuns] = await Promise.all([getRequestDetail(id), getAIRunsForRequest(id)]);
  if (!detail) notFound();

  const { request, cvDocument, jobAnalysis, matching, outputs } = detail;
  const pkg = getPackageById(request.package);

  // Certifications and Additional Information pass through from
  // structured_cv to the rendered CV unchanged by the AI tailoring stage
  // (see cv-content.ts's buildCvContent) — computed here so the editor can
  // show and save exactly what's actually displayed.
  const structuredCvForEditing = cvDocument?.structured_cv as unknown as StructuredCV | undefined;
  const editableCertifications = structuredCvForEditing?.certifications ?? [];
  const editableAdditionalInfo = structuredCvForEditing
    ? [
        ...structuredCvForEditing.languages,
        ...structuredCvForEditing.memberships,
        ...structuredCvForEditing.awards,
        ...structuredCvForEditing.publications,
        ...structuredCvForEditing.other,
      ]
    : [];

  const tabs: DetailTab[] = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-2 pt-6 text-sm">
                <h3 className="font-medium">Customer</h3>
                <Field label="Name" value={request.customer_name} />
                <Field label="Email" value={request.email} />
                <Field label="Phone" value={request.phone} />
                <Field
                  label="Consent given"
                  value={new Date(request.consent_given_at).toLocaleString("en-GB")}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-2 pt-6 text-sm">
                <h3 className="font-medium">Job</h3>
                <Field label="Job title" value={request.job_title} />
                <Field label="Company" value={request.company} />
                <Field label="Job URL" value={request.job_url} />
                <Field label="Package" value={request.package} />
                <Field label="Urgency" value={request.urgency} />
              </CardContent>
            </Card>
          </div>
          <Card className="border-danger/30">
            <CardContent className="flex flex-col gap-2 pt-6">
              <h3 className="text-sm font-medium text-danger">Danger zone</h3>
              <p className="text-sm text-muted-foreground">
                Permanently deletes the CV, generated documents, and every
                record for this request from storage and the database.
              </p>
              <div className="mt-2">
                <DeleteRequestButton requestId={request.id} customerName={request.customer_name} />
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: "original-cv",
      label: "Original CV",
      content: cvDocument ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{cvDocument.original_filename}</p>
            <div className="flex gap-2">
              {cvDocument.original_filename?.toLowerCase().endsWith(".pdf") ? (
                <a
                  href={`/admin/requests/${request.id}/download?preview=1`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="ghost" size="sm">
                    Preview
                  </Button>
                </a>
              ) : null}
              <a href={`/admin/requests/${request.id}/download`} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  Download original
                </Button>
              </a>
            </div>
          </div>
          {cvDocument.extracted_text ? (
            <pre className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-relaxed">
              {cvDocument.extracted_text}
            </pre>
          ) : cvDocument.structured_cv ? (
            // Built via the "no CV yet" form (components/marketing/cv-builder-fields.tsx):
            // structured_cv came directly from the applicant, so there's no raw text to
            // extract and lib/ai/pipeline.ts's Run AI Analysis skips that step entirely.
            <p className="text-sm text-muted-foreground">
              Built directly from the applicant&rsquo;s CV form — no text extraction needed.
            </p>
          ) : (
            <EmptyState
              title="Not yet extracted"
              description="Click Process Request above to extract text from this CV."
            />
          )}
          {cvDocument.structured_cv ? (
            <div>
              <h3 className="mb-2 text-sm font-medium">
                Structured CV {cvDocument.extracted_text ? "(AI-extracted)" : "(from CV builder)"}
              </h3>
              <JsonPreview value={cvDocument.structured_cv} />
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState title="No CV on file" />
      ),
    },
    {
      id: "job",
      label: "Job",
      content: (
        <pre className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-relaxed">
          {request.job_description}
        </pre>
      ),
    },
    {
      id: "analysis",
      label: "Analysis",
      content: (
        <div className="flex flex-col gap-6">
          {jobAnalysis ? (
            <div className="flex flex-col gap-4">
              <JsonPreview value={jobAnalysis.requirements} />
              <JsonPreview value={jobAnalysis.responsibilities} />
              <JsonPreview value={jobAnalysis.keywords} />
              <JsonPreview value={jobAnalysis.skills} />
              <JsonPreview value={jobAnalysis.qualifications} />
            </div>
          ) : (
            <EmptyState
              title="Not yet analysed"
              description="Click Process Request above to extract the CV, analyse the job, and match evidence."
            />
          )}
          <div>
            <h3 className="mb-2 text-sm font-medium">AI run log</h3>
            <AiRunsLog runs={aiRuns} />
          </div>
        </div>
      ),
    },
    {
      id: "matching",
      label: "Matching",
      content: matching ? (
        <MatchList
          strongMatches={(matching.strong_matches as unknown as EvidenceMatchItem[]) ?? []}
          partialMatches={(matching.partial_matches as unknown as EvidenceMatchItem[]) ?? []}
          missingRequirements={
            (matching.missing_requirements as unknown as EvidenceMatchItem[]) ?? []
          }
        />
      ) : (
        <EmptyState
          title="Not yet matched"
          description="Click Process Request above to extract the CV, analyse the job, and match evidence."
        />
      ),
    },
    {
      id: "tailored-cv",
      label: "Tailored CV",
      content: (
        <div className="flex flex-col gap-6">
          {outputs?.tailored_cv && cvDocument?.structured_cv ? (
            <>
              <div className="flex gap-3">
                <div className="flex-1">
                  <FileRow
                    label="PDF"
                    available={!!outputs.cv_pdf_path}
                    href={`/admin/requests/${request.id}/download?type=cv_pdf`}
                    previewHref={`/admin/requests/${request.id}/download?type=cv_pdf&preview=1`}
                  />
                </div>
                <div className="flex-1">
                  <FileRow
                    label="DOCX"
                    available={!!outputs.cv_docx_path}
                    href={`/admin/requests/${request.id}/download?type=cv_docx`}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Edit tailored content</h3>
                <TailoredCvEditor
                  requestId={request.id}
                  tailoredCV={outputs.tailored_cv as unknown as TailoredCV}
                  certifications={editableCertifications}
                  additionalInfo={editableAdditionalInfo}
                />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Original vs tailored</h3>
                <CvComparison
                  structuredCV={cvDocument.structured_cv as unknown as StructuredCV}
                  tailoredCV={outputs.tailored_cv as unknown as TailoredCV}
                />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Truth Guard</h3>
                <TruthGuardFlags
                  flags={(outputs.truth_guard_flags as unknown as TruthGuardFlag[]) ?? []}
                />
              </div>
            </>
          ) : (
            <EmptyState
              title="Not yet generated"
              description="Click Process Request above to generate this."
            />
          )}
        </div>
      ),
    },
    {
      id: "cover-letter",
      label: "Cover Letter",
      content: !pkg?.includesCoverLetter ? (
        <EmptyState
          title="Not included in this package"
          description={`The "${pkg?.name ?? request.package}" package doesn't include a cover letter.`}
        />
      ) : outputs?.cover_letter ? (
        <div className="flex flex-col gap-4">
          <FileRow
            label="Cover Letter (PDF)"
            available={!!outputs.cover_letter_path}
            href={`/admin/requests/${request.id}/download?type=cover_letter`}
            previewHref={`/admin/requests/${request.id}/download?type=cover_letter&preview=1`}
          />
          <RegenerateCoverLetterButton requestId={request.id} />
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-relaxed">
            {outputs.cover_letter}
          </pre>
        </div>
      ) : (
        <EmptyState
          title="Not yet generated"
          description="Process Request (top of page) also produces the cover letter for this package."
        />
      ),
    },
    {
      id: "application-answers",
      label: "Application Answers",
      content: !pkg?.includesApplicationAnswers ? (
        <EmptyState
          title="Not included in this package"
          description={`The "${pkg?.name ?? request.package}" package doesn't include application answers.`}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <GenerateAnswersForm requestId={request.id} />
          {outputs?.application_answers ? (
            <JsonPreview value={outputs.application_answers} />
          ) : (
            <EmptyState
              title="No answers yet"
              description="Add questions above and generate answers grounded in this CV."
            />
          )}
        </div>
      ),
    },
    {
      id: "files",
      label: "Files",
      content: (
        <div className="flex flex-col gap-4">
          {outputs?.cv_pdf_path || outputs?.cv_docx_path || outputs?.cover_letter_path ? (
            <a href={`/admin/requests/${request.id}/download-pack`}>
              <Button size="sm">Download complete pack (ZIP)</Button>
            </a>
          ) : null}
          <div className="flex flex-col gap-3">
            <FileRow
              label="Original CV"
              available
              href={`/admin/requests/${request.id}/download`}
              previewHref={
                cvDocument?.original_filename?.toLowerCase().endsWith(".pdf")
                  ? `/admin/requests/${request.id}/download?preview=1`
                  : undefined
              }
            />
            <FileRow
              label="Tailored CV (PDF)"
              available={!!outputs?.cv_pdf_path}
              href={`/admin/requests/${request.id}/download?type=cv_pdf`}
              previewHref={`/admin/requests/${request.id}/download?type=cv_pdf&preview=1`}
            />
            <FileRow
              label="Tailored CV (DOCX)"
              available={!!outputs?.cv_docx_path}
              href={`/admin/requests/${request.id}/download?type=cv_docx`}
            />
            <FileRow
              label="Cover Letter (PDF)"
              available={!!outputs?.cover_letter_path}
              href={`/admin/requests/${request.id}/download?type=cover_letter`}
              previewHref={`/admin/requests/${request.id}/download?type=cover_letter&preview=1`}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/requests" className="text-sm text-accent hover:underline">
          &larr; Back to requests
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{request.customer_name}</h1>
          <p className="text-sm text-muted-foreground">{request.email}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            <MatchScore score={request.match_score} />
          </div>
          <StatusActions requestId={request.id} currentStatus={request.status} />
          <ProcessRequestButton requestId={request.id} />
        </div>
      </div>

      <DetailTabs tabs={tabs} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value || "—"}</span>
    </div>
  );
}

function FileRow({
  label,
  available,
  href,
  previewHref,
}: {
  label: string;
  available: boolean;
  href?: string;
  /** Set only for files a browser can actually render inline (PDFs) — DOCX
   * has no native browser renderer, so there's no meaningful preview for
   * it, just Download. */
  previewHref?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
      <span className="text-sm">{label}</span>
      {available && href ? (
        <div className="flex gap-2">
          {previewHref ? (
            <a href={previewHref} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm">
                Preview
              </Button>
            </a>
          ) : null}
          <a href={href} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              Download
            </Button>
          </a>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">Not generated yet</span>
      )}
    </div>
  );
}
