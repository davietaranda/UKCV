"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitRequest, type ApplyState } from "@/app/(marketing)/apply/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { PACKAGES } from "@/lib/packages";
import { cn } from "@/lib/utils";

const initialState: ApplyState = {};

export function ApplyForm({ initialPackageId }: { initialPackageId?: string }) {
  const [state, formAction, isPending] = useActionState(submitRequest, initialState);
  const [selectedPackage, setSelectedPackage] = useState(
    PACKAGES.find((p) => p.id === initialPackageId)?.id ?? PACKAGES[0].id
  );
  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="flex flex-col gap-10" noValidate>
      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}

      {/* Honeypot — real users never see or fill this in. Any non-empty
          value on submit is treated as a bot signal (lib/validation/request.ts). */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field blank</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Your CV</h2>
        <div>
          <Label htmlFor="cv">Upload your CV (PDF or DOCX, max 8MB)</Label>
          <input
            id="cv"
            name="cv"
            type="file"
            required
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="block w-full rounded-md border border-border bg-background text-sm file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-medium"
          />
        </div>
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
                "flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-sm transition-colors",
                selectedPackage === pkg.id
                  ? "border-accent bg-accent-muted"
                  : "border-border hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="packageId"
                  value={pkg.id}
                  checked={selectedPackage === pkg.id}
                  onChange={() => setSelectedPackage(pkg.id)}
                  className="accent-accent"
                />
                <span className="font-medium">{pkg.name}</span>
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

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit my request"}
      </Button>
    </form>
  );
}
