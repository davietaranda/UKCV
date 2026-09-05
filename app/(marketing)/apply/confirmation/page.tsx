import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Request received | AI Job Application Tailor" };

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <main id="main-content" className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">Thanks — we&rsquo;ve received your request</h1>
      <p className="mt-4 text-muted-foreground">
        We&rsquo;ll review your CV and the job description and prepare your
        tailored application. There&rsquo;s nothing else you need to do right
        now.
      </p>
      {ref ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Reference: <span className="font-mono">{ref}</span>
        </p>
      ) : null}
      <div className="mt-8">
        <Link href="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    </main>
  );
}
