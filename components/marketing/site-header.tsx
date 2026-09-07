import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold tracking-tight"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="sm:hidden">CV Tailor</span>
          <span className="hidden sm:inline">AI Job Application Tailor</span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/#how-it-works"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            How it works
          </Link>
          <Link href="/#apply">
            <Button size="sm" className="whitespace-nowrap">
              <span className="sm:hidden">Get started</span>
              <span className="hidden sm:inline">Get My CV Tailored</span>
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
