"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { ArrowRight, CheckCircle2, UploadCloud } from "lucide-react";
import { submitRequest, previewBuiltCv, type ApplyState } from "@/app/(marketing)/apply/actions";
import {
  CvBuilderFields,
  emptyBuiltCvDraft,
  draftToBuiltCv,
  type BuiltCvDraft,
} from "@/components/marketing/cv-builder-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { PACKAGES } from "@/lib/packages";
import { cn } from "@/lib/utils";

const initialState: ApplyState = {};

function base64ToBlobUrl(base64: string, type: string): string {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type }));
}

export function ApplyForm({
  initialPackageId,
  turnstileSiteKey,
}: {
  initialPackageId?: string;
  turnstileSiteKey?: string;
}) {
  const [state, formAction, isPending] = useActionState(submitRequest, initialState);
  const [selectedPackage, setSelectedPackage] = useState(
    PACKAGES.find((p) => p.id === initialPackageId)?.id ?? PACKAGES[0].id
  );
  const [cvMode, setCvMode] = useState<"upload" | "build">("upload");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [builtCvDraft, setBuiltCvDraft] = useState<BuiltCvDraft>(emptyBuiltCvDraft);
  const [previewStatus, setPreviewStatus] = useState<"idle" | "loading" | "error">("idle");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldError = (name: string) => state.fieldErrors?.[name];

  async function handlePreview() {
    // Must open the tab synchronously, in the same tick as the click — a
    // window.open() called after an `await` (i.e. once the server action
    // resolves) is indistinguishable from an unsolicited popup to most
    // browsers and gets silently blocked. Opened blank, then navigated to
    // the real blob URL once the PDF comes back.
    const previewTab = window.open("about:blank", "_blank");
    setPreviewStatus("loading");
    setPreviewError(null);
    const fd = new FormData(formRef.current ?? undefined);
    const result = await previewBuiltCv(draftToBuiltCv(builtCvDraft), {
      customerName: fd.get("customerName"),
      email: fd.get("email"),
      phone: fd.get("phone"),
    });
    if ("error" in result) {
      setPreviewStatus("error");
      setPreviewError(result.error);
      previewTab?.close();
      return;
    }
    setPreviewStatus("idle");
    const url = base64ToBlobUrl(result.pdf, "application/pdf");
    if (previewTab) {
      previewTab.location.href = url;
    } else {
      // Popup was blocked even on the synchronous open (very strict blocker
      // settings) — fall back to navigating the current tab so the preview
      // is still reachable, rather than silently doing nothing.
      window.location.href = url;
    }
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-10" noValidate>
      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}

      {/* Honeypot — real users never see or fill this in. Any non-empty
          value on submit is treated as a bot signal (lib/validation/request.ts). */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field blank</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Your CV</h2>

        <div
          className="inline-flex w-fit gap-1 rounded-full border border-border bg-muted p-1"
          role="tablist"
          aria-label="How would you like to provide your CV?"
        >
          <button
            type="button"
            role="tab"
            aria-selected={cvMode === "upload"}
            onClick={() => setCvMode("upload")}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:text-sm",
              cvMode === "upload"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="sm:hidden">Upload CV</span>
            <span className="hidden sm:inline">I have a CV to upload</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={cvMode === "build"}
            onClick={() => setCvMode("build")}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:text-sm",
              cvMode === "build"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="sm:hidden">No CV yet</span>
            <span className="hidden sm:inline">I don&rsquo;t have a CV yet</span>
          </button>
        </div>

        {cvMode === "upload" ? (
          <div>
            <Label htmlFor="cv">Upload your CV (PDF or DOCX, max 8MB)</Label>
            <div
              className={cn(
                "relative flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
                selectedFileName
                  ? "border-accent/50 bg-accent-muted/40"
                  : "border-border bg-muted/40 hover:border-accent/40 hover:bg-accent-muted/40"
              )}
            >
              {selectedFileName ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-accent" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">{selectedFileName}</p>
                  <p className="text-xs text-muted-foreground">Click to choose a different file</p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-accent">Click to choose a file</span> or drag it here
                  </p>
                </>
              )}
              <input
                id="cv"
                name="cv"
                type="file"
                required={cvMode === "upload"}
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setSelectedFileName(e.target.files?.[0]?.name ?? null)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              No CV yet? Fill in what you can below and we&rsquo;ll build you a clean,
              ATS-friendly CV to start from — an admin can refine it further before
              anything is delivered.
            </p>
            <CvBuilderFields value={builtCvDraft} onChange={setBuiltCvDraft} />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={previewStatus === "loading"}
              >
                {previewStatus === "loading" ? "Generating preview..." : "Preview my CV (PDF)"}
              </Button>
              {previewStatus === "error" && previewError ? (
                <span className="text-sm text-danger">{previewError}</span>
              ) : null}
            </div>
            <input type="hidden" name="builtCv" value={JSON.stringify(draftToBuiltCv(builtCvDraft))} />
          </div>
        )}
        <input type="hidden" name="cvMode" value={cvMode} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">The job you&rsquo;re applying for</h2>
        <div>
          <Label htmlFor="jobDescription">Job description</Label>
          <Textarea
            id="jobDescription"
            name="jobDescription"
            required
            minLength={100}
            rows={10}
            placeholder="Paste the full job description here..."
          />
          {fieldError("jobDescription") ? (
            <p className="mt-1 text-sm text-danger">{fieldError("jobDescription")}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="company">Company (optional)</Label>
            <Input id="company" name="company" />
          </div>
          <div>
            <Label htmlFor="jobTitle">Job title (optional)</Label>
            <Input id="jobTitle" name="jobTitle" />
          </div>
          <div>
            <Label htmlFor="jobUrl">Job URL (optional)</Label>
            <Input id="jobUrl" name="jobUrl" type="url" placeholder="https://..." />
            {fieldError("jobUrl") ? (
              <p className="mt-1 text-sm text-danger">{fieldError("jobUrl")}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="customerName">Full name</Label>
            <Input id="customerName" name="customerName" required autoComplete="name" />
            {fieldError("customerName") ? (
              <p className="mt-1 text-sm text-danger">{fieldError("customerName")}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
            {fieldError("email") ? (
              <p className="mt-1 text-sm text-danger">{fieldError("email")}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="phone">Phone / WhatsApp (optional)</Label>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" />
          </div>
          <div>
            <Label htmlFor="urgency">Urgency (optional)</Label>
            <Select id="urgency" name="urgency" defaultValue="">
              <option value="">Not specified</option>
              <option value="standard">Standard</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Choose a package</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PACKAGES.map((pkg) => (
            <label
              key={pkg.id}
              className={cn(
                "relative flex cursor-pointer flex-col gap-2 rounded-xl border p-4 text-sm transition-all",
                selectedPackage === pkg.id
                  ? "border-accent bg-accent-muted shadow-sm ring-1 ring-accent"
                  : "border-border hover:border-accent/30 hover:shadow-sm"
              )}
            >
              <input
                type="radio"
                name="packageId"
                value={pkg.id}
                checked={selectedPackage === pkg.id}
                onChange={() => setSelectedPackage(pkg.id)}
                className="sr-only"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{pkg.name}</span>
                {selectedPackage === pkg.id ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                ) : null}
              </div>
              <p className="text-muted-foreground">{pkg.description}</p>
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="consent" required className="mt-1 accent-accent" />
          <span>
            I consent to my CV and job details being processed (including by
            automated analysis) to prepare a tailored application, as described
            in the{" "}
            <Link href="/privacy" className="text-accent underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {fieldError("consent") ? (
          <p className="text-sm text-danger">{fieldError("consent")}</p>
        ) : null}
      </section>

      {/* Only rendered once the client sets up a Turnstile widget (see
          NEXT_PUBLIC_TURNSTILE_SITE_KEY in .env.example) — CAPTCHA is
          opt-in, not required for the form to work. */}
      {turnstileSiteKey ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
        </>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending} className="gap-2">
        {isPending ? "Submitting..." : "Submit my request"}
        {isPending ? null : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </form>
  );
}
