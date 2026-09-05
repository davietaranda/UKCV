/** Generic fallback renderer for jsonb columns whose shape is finalised in
 * Phase 4 (AI output schemas). Once those schemas land, replace call sites
 * with purpose-built renderers (requirement lists, evidence cards, etc.). */
export function JsonPreview({ value }: { value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
