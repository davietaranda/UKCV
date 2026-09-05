import type { StructuredCV, TailoredCV } from "@/lib/ai/schemas";

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 rounded-md border border-border p-4">
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

/** Side-by-side original vs tailored — lets the admin verify the rewrite
 * against the source before approving (spec §6: "AI should assist, not
 * silently publish"). */
export function CvComparison({
  structuredCV,
  tailoredCV,
}: {
  structuredCV: StructuredCV;
  tailoredCV: TailoredCV;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Column title="Original profile">
          <p className="text-sm text-muted-foreground">
            {structuredCV.professionalProfile || "No profile in the original CV."}
          </p>
        </Column>
        <Column title="Tailored profile">
          <p className="text-sm">{tailoredCV.tailoredProfile}</p>
        </Column>
      </div>

      {tailoredCV.tailoredExperience.map((exp, i) => {
        const original = structuredCV.employment[i];
        return (
          <div key={i} className="flex flex-col gap-3 sm:flex-row">
            <Column title={`Original — ${original?.jobTitle ?? exp.jobTitle}`}>
              <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                {(original
                  ? [...original.responsibilities, ...original.achievements]
                  : []
                ).map((line, j) => (
                  <li key={j}>&bull; {line}</li>
                ))}
                {!original ? <li>No matching entry in the original CV.</li> : null}
              </ul>
            </Column>
            <Column title={`Tailored — ${exp.jobTitle}`}>
              <ul className="flex flex-col gap-1.5 text-sm">
                {exp.bullets.map((line, j) => (
                  <li key={j}>&bull; {line}</li>
                ))}
              </ul>
            </Column>
          </div>
        );
      })}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Column title="Original skills">
          <p className="text-sm text-muted-foreground">{structuredCV.skills.join(", ") || "—"}</p>
        </Column>
        <Column title="Tailored skills">
          <p className="text-sm">{tailoredCV.skills.join(", ") || "—"}</p>
        </Column>
      </div>
    </div>
  );
}
