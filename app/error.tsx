"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side log only — never surface stack traces or internals to users.
    console.error("Unhandled UI error", error.digest ?? error.message);
  }, [error]);

  return (
    <main id="main-content" className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        Please try again. If the problem continues, contact support and
        mention this reference: {error.digest ?? "n/a"}.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
