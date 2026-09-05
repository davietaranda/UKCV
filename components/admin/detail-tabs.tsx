"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DetailTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

/** Follows the WAI-ARIA tabs pattern: role="tablist"/"tab"/"tabpanel",
 * aria-selected, roving tabindex, and left/right/Home/End arrow-key
 * navigation between tabs. */
export function DetailTabs({ tabs }: { tabs: DetailTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === active));
  const activeTab = tabs[activeIndex] ?? tabs[0];
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusAndSelect = (index: number) => {
    const next = tabs[index];
    if (!next) return;
    setActive(next.id);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusAndSelect((index + 1) % tabs.length);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusAndSelect((index - 1 + tabs.length) % tabs.length);
        break;
      case "Home":
        event.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        event.preventDefault();
        focusAndSelect(tabs.length - 1);
        break;
    }
  };

  return (
    <div>
      <div role="tablist" aria-label="Request details" className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab, index) => {
          const selected = activeTab?.id === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`${baseId}-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                selected
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        id={`${baseId}-panel-${activeTab?.id}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${activeTab?.id}`}
        tabIndex={0}
        className="py-6 focus-visible:outline-none"
      >
        {activeTab?.content}
      </div>
    </div>
  );
}
