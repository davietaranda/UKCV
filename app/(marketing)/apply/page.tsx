import { ApplyForm } from "@/components/marketing/apply-form";

export const metadata = { title: "Get My CV Tailored | AI Job Application Tailor" };

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string }>;
}) {
  const { package: initialPackageId } = await searchParams;

  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Get your CV tailored</h1>
      <p className="mt-2 text-muted-foreground">
        No account needed. Fill in the details below and we&rsquo;ll take it
        from there.
      </p>
      <div className="mt-10">
        <ApplyForm initialPackageId={initialPackageId} />
      </div>
    </main>
  );
}
