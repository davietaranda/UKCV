import { getSupportEmail } from "@/lib/env";

export const metadata = { title: "Terms | AI Job Application Tailor" };

export default function TermsPage() {
  const supportEmail = getSupportEmail();

  return (
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 4 September 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-lg font-semibold">The service</h2>
          <p className="mt-2 text-muted-foreground">
            We produce a tailored CV, and optionally a cover letter and
            application answers, based on the CV and job description you
            submit. Every tailored application is reviewed by an administrator
            before delivery.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">What we don&rsquo;t promise</h2>
          <p className="mt-2 text-muted-foreground">
            We do not guarantee that you will be shortlisted, interviewed, or
            hired, and we do not guarantee any particular ATS compatibility
            score. We do not claim endorsement by, or compatibility guarantees
            with, any specific job board or employer. Our output only ever
            reflects experience genuinely present in the CV you provide — we
            do not invent qualifications, employers, or achievements on your
            behalf.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Your responsibilities</h2>
          <p className="mt-2 text-muted-foreground">
            You confirm that the CV and information you submit are your own
            and accurate to the best of your knowledge. You are responsible
            for reviewing the final documents before using them in a job
            application.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Data processing</h2>
          <p className="mt-2 text-muted-foreground">
            By submitting a request you consent to us processing your CV and
            job details, including via automated analysis, as described in
            our Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-2 text-muted-foreground">
            {supportEmail
              ? `Questions about these terms can be sent to ${supportEmail}.`
              : "Questions about these terms can be sent using the contact details provided when your request was confirmed."}
          </p>
        </section>
      </div>
    </main>
  );
}
