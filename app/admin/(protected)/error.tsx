"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

/**
 * Nested error boundary for everything under the authenticated admin shell.
 * Unlike the root error.tsx, this preserves the admin header/nav (from
 * app/admin/(protected)/layout.tsx) so a data-fetch failure on one page
 * doesn't strand the admin without a way to navigate elsewhere.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin UI error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <Alert variant="danger" className="max-w-md">
        Something went wrong loading this page. If the problem continues,
        mention this reference: {error.digest ?? "n/a"}.
      </Alert>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
