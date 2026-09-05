import { getSupportEmail } from "@/lib/env";

export const metadata = { title: "Privacy Policy | AI Job Application Tailor" };

export default function PrivacyPage() {
  const supportEmail = getSupportEmail();
  const contactLine = supportEmail
    ? `email us at ${supportEmail}`
    : "use the contact details provided when your request was confirmed";

  return (
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 4 September 2026</p>

      <div className="prose mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-lg font-semibold">What we collect</h2>
          <p className="mt-2 text-muted-foreground">
            When you submit a request, we collect your name, email address, and
            optionally your phone number, along with your CV file and the job
            description, company, job title, and job URL you provide. We do not
            require you to create an account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">How we use it</h2>
          <p className="mt-2 text-muted-foreground">
            Your CV and the job description are used solely to prepare your
            tailored CV and any other application materials you request. This
            involves automated analysis (using Google&rsquo;s Gemini API) and
            review by our administrator before anything is delivered to you. We
            do not use your data to train AI models, and we do not sell or share
            your personal data with third parties for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Where it&rsquo;s stored</h2>
          <p className="mt-2 text-muted-foreground">
            Your original CV and generated documents are stored in a private
            cloud storage bucket that is not publicly accessible. Access is
            limited to our administrator and is only ever provided via
            time-limited, signed links.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Retention and deletion</h2>
          <p className="mt-2 text-muted-foreground">
            We retain your documents and request details for a limited period
            after delivery in order to answer follow-up questions, after which
            they are deleted. If you would like your data deleted sooner,{" "}
            {contactLine} and we will action the request.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Your rights</h2>
          <p className="mt-2 text-muted-foreground">
            You can ask us what data we hold about you, ask us to correct it, or
            ask us to delete it at any time — {contactLine}.
          </p>
        </section>
      </div>
    </main>
  );
}
