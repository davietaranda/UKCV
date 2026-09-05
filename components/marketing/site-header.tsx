import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          AI Job Application Tailor
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/#how-it-works"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            How it works
          </Link>
          <Link
            href="/#packages"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            Packages
          </Link>
          <Link href="/apply">
            <Button size="sm">Get My CV Tailored</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
