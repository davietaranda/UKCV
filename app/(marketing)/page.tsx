import { Sparkles, ShieldCheck, Lock } from "lucide-react";
import { ApplyForm } from "@/components/marketing/apply-form";
import { Card } from "@/components/ui/card";
import { getPublicEnv } from "@/lib/env";

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Send us your CV and the job",
    description:
      "Upload your CV — or build one below if you don't have one yet — and paste the job description. No account needed.",
  },
  {
    step: "2",
    title: "We analyse the match",
    description:
      "We compare the role's requirements against your real experience — what matches, what's partial, what's missing.",
  },
  {
    step: "3",
    title: "Receive your tailored application",
    description:
      "A UK ATS-friendly CV rewritten around your actual experience, plus a cover letter or application answers depending on your package.",
  },
] as const;

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "No account needed" },
  { icon: Lock, label: "Private & secure" },
  { icon: Sparkles, label: "No invented experience" },
] as const;

export default async function HomePage() {
  const { NEXT_PUBLIC_TURNSTILE_SITE_KEY } = getPublicEnv();

  return (
    <main id="main-content" className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-12 pb-6">
        <div aria-hidden className="bg-hero-glow pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent-muted px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            UK ATS-friendly CV tailoring
          </span>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.08]">
            Turn your CV into a job-specific UK application
          </h1>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">
            Upload your CV, or build one below if you don&rsquo;t have one yet. Paste the
            job description and we&rsquo;ll tailor your application around your real
            experience.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-accent" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* The form itself — visible right on the landing page */}
      <section id="apply" className="border-t border-border bg-muted/50 px-6 py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">Get started</h2>
            <p className="mt-2 text-muted-foreground">Takes a few minutes — no account required.</p>
          </div>
          <Card className="mt-6 rounded-xl border-border/80 p-5 shadow-lg sm:p-8">
            <ApplyForm turnstileSiteKey={NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold">How it works</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {item.step}
                </span>
                <h3 className="mt-3 font-medium">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
