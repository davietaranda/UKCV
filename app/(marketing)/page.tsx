import { ApplyForm } from "@/components/marketing/apply-form";
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
    q: "What if I don't have a CV yet?",
    a: "Choose “I don't have a CV yet” in the form below and fill in what you can — we'll build you a clean, ATS-friendly CV to start from.",
  },
  {
    q: "Is my CV kept private?",
    a: "Yes. Your documents are stored privately, used only to prepare your application, and deleted after our retention period. See our Privacy Policy for details.",
  },
] as const;

export default async function HomePage() {
  const { NEXT_PUBLIC_TURNSTILE_SITE_KEY } = getPublicEnv();

  return (
    <main id="main-content" className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center px-6 pt-16 pb-8 text-center">
        <p className="text-sm font-medium text-accent">UK ATS-friendly CV tailoring</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Turn your CV into a job-specific UK application
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Upload your CV, or build one below if you don&rsquo;t have one yet. Paste the
          job description and we&rsquo;ll tailor your application around your real
          experience — no account needed.
        </p>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-border bg-muted px-6 py-10">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step}>
              <span className="text-sm font-semibold text-accent">Step {item.step}</span>
              <h3 className="mt-1 font-medium">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The form itself — visible right on the landing page */}
      <section id="apply" className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-semibold">Get started</h2>
          <div className="mt-8">
            <ApplyForm turnstileSiteKey={NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-muted px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-semibold">Frequently asked questions</h2>
          <div className="mt-8 flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
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
    </main>
  );
}
