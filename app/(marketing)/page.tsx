import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PACKAGES } from "@/lib/packages";

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Send us your CV and the job",
    description:
      "Upload your existing CV (PDF or DOCX) and paste the job description you're applying to. No account needed.",
  },
  {
    step: "2",
    title: "We analyse the match",
    description:
      "We compare the role's requirements against your real experience — what genuinely matches, what's a partial fit, and what's missing.",
  },
  {
    step: "3",
    title: "Receive your tailored application",
    description:
      "You get a UK ATS-friendly CV rewritten around your actual experience, plus a cover letter or application answers depending on your package.",
  },
] as const;

const WHY_TAILOR = [
  {
    title: "Generic CVs get filtered out",
    description:
      "Applicant tracking systems and recruiters scan for role-specific evidence. A CV written for one job rarely reads well for another.",
  },
  {
    title: "We work from what's actually on your CV",
    description:
      "Nothing is invented. If a requirement isn't backed by your CV, we mark it as a gap rather than fabricate an answer.",
  },
  {
    title: "Human review before delivery",
    description:
      "Every tailored application is checked by an administrator before it reaches you — AI assists, it doesn't publish unsupervised.",
  },
] as const;

const FAQS = [
  {
    q: "Will this guarantee me an interview?",
    a: "No. We can't guarantee interviews, employment, or any specific ATS score — no service honestly can. What we do is produce a UK ATS-friendly CV genuinely tailored to the role, based on your real experience.",
  },
  {
    q: "Will you add skills or experience I don't actually have?",
    a: "No. We only work with what's on your CV. Where the job asks for something your CV doesn't support, we'll flag it rather than invent it.",
  },
  {
    q: "What file formats do you accept?",
    a: "PDF and DOCX, up to 8MB.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. You submit your details once — we don't require sign-up.",
  },
  {
    q: "Is my CV kept private?",
    a: "Yes. Your documents are stored privately, accessible only to our admin team for the purpose of preparing your application, and deleted after our retention period. See our Privacy Policy for details.",
  },
] as const;

export default function HomePage() {
  return (
    <main id="main-content" className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center px-6 py-24 text-center">
        <p className="text-sm font-medium text-accent">UK ATS-friendly CV tailoring</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Turn your CV into a job-specific UK application
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Upload your existing CV and paste the job description. We tailor your
          application around the experience you already have — no invented
          qualifications, no guesswork.
        </p>
        <div className="mt-8">
          <Link href="/apply">
            <Button size="lg">Get My CV Tailored</Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border bg-muted px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold">How it works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="rounded-lg border border-border bg-card p-6">
                <span className="text-sm font-semibold text-accent">Step {item.step}</span>
                <h3 className="mt-2 font-medium">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why tailor */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold">Why tailor your CV</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {WHY_TAILOR.map((item) => (
              <div key={item.title}>
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example transformation */}
      <section className="border-t border-border bg-muted px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold">Example transformation</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            An illustrative example — not a real customer&rsquo;s CV.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Before — generic bullet point
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  &ldquo;Responsible for handling customer queries and general admin
                  tasks.&rdquo;
                </p>
              </CardContent>
            </Card>
            <Card className="border-accent">
              <CardHeader>
                <CardTitle className="text-sm text-accent">
                  After — tailored to a Customer Success role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  &ldquo;Resolved customer queries via phone and email, maintaining
                  accurate case records and supporting day-to-day administrative
                  processes.&rdquo;
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold">Packages</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {PACKAGES.map((pkg) => (
              <Card key={pkg.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-6">
                  <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                    {pkg.deliverables.map((d) => (
                      <li key={d} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        {d}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/apply?package=${pkg.id}`}>
                    <Button variant="outline" className="w-full">
                      Choose {pkg.name}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-muted px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-semibold">Frequently asked questions</h2>
          <div className="mt-10 flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {FAQS.map((item) => (
              <details key={item.q} className="group p-5">
                <summary className="cursor-pointer list-none font-medium marker:content-none">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy / trust */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold">Your CV is handled privately</h2>
          <p className="mt-3 text-muted-foreground">
            Your documents are stored in private cloud storage, used only to prepare
            your tailored application, and deleted after our retention period. Read
            the full details in our{" "}
            <Link href="/privacy" className="text-accent underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border px-6 py-20 text-center">
        <h2 className="text-2xl font-semibold">Ready to tailor your CV?</h2>
        <p className="mt-2 text-muted-foreground">
          It takes a few minutes to submit — no account required.
        </p>
        <div className="mt-6">
          <Link href="/apply">
            <Button size="lg">Get My CV Tailored</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
