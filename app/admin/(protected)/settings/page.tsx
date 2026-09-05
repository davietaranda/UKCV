import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAdminProfile } from "@/lib/admin/auth";
import { getExpiredRequests } from "@/lib/admin/retention";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { PACKAGES } from "@/lib/packages";
import { PurgeExpiredButton } from "@/components/admin/purge-expired-button";

export default async function AdminSettingsPage() {
  const profile = await getAdminProfile();
  if (!profile) redirect("/admin/login");

  const env = getServerEnv();
  const supabase = await createClient();
  const expired = await getExpiredRequests(supabase, env.RETENTION_DAYS);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your admin sign-in details.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p>{profile.email}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data retention</CardTitle>
          <CardDescription>
            Configured via the RETENTION_DAYS environment variable. Applies to
            requests that have reached Delivered or Archived — in-flight
            requests are never auto-deleted regardless of age.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>
            Delivered/archived requests are retained for {env.RETENTION_DAYS}{" "}
            days after their last update, then eligible for deletion.
          </p>
          <p className="text-muted-foreground">
            {expired.length} request{expired.length === 1 ? " is" : "s are"} currently past
            the retention period.
          </p>
          <PurgeExpiredButton count={expired.length} />
          <p className="text-xs text-muted-foreground">
            In production, wire GET /api/cron/retention (protected by
            CRON_SECRET) to a scheduled trigger — e.g. Vercel Cron — to run
            this automatically instead of manually.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Packages</CardTitle>
          <CardDescription>
            Configured centrally in lib/packages.ts — shown here read-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          {PACKAGES.map((pkg) => (
            <div key={pkg.id} className="rounded-md border border-border p-4">
              <p className="font-medium">{pkg.name}</p>
              <p className="text-muted-foreground">{pkg.description}</p>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {pkg.deliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
