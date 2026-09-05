import "server-only";

import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { CvContent } from "@/lib/documents/cv-content";

/**
 * UK CV layout per spec §8/§24: single column, no photo/graphics/icons,
 * standard section headings, ATS-readable structure, minimal colour.
 * Uses PDF's built-in Helvetica so no font is fetched at render time.
 */
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.4,
    color: "#1a1a1a",
  },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    marginBottom: 4,
  },
  contactLine: {
    fontSize: 9.5,
    color: "#4b5563",
    marginBottom: 16,
  },
  section: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 3,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 10.5,
  },
  skillsRow: {
    fontSize: 10.5,
  },
  entry: {
    marginBottom: 10,
  },
  entryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  entryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
  },
  entrySubtitle: {
    fontSize: 10.5,
  },
  entryDate: {
    fontSize: 9.5,
    color: "#4b5563",
  },
  bulletRow: {
    flexDirection: "row",
    marginTop: 3,
  },
  bulletMarker: {
    width: 10,
    fontSize: 10.5,
  },
  bulletText: {
    flex: 1,
    fontSize: 10.5,
  },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section} wrap>
      <Text style={styles.sectionHeading}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow} wrap={false}>
      <Text style={styles.bulletMarker}>{"•"}</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

export function CvPdfDocument({ content }: { content: CvContent }) {
  return (
    <Document title={`${content.name} - CV`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{content.name}</Text>
        {content.contactParts.length > 0 ? (
          <Text style={styles.contactLine}>{content.contactParts.join("  |  ")}</Text>
        ) : null}

        {content.profile ? (
          <Section title="Professional Profile">
            <Text style={styles.paragraph}>{content.profile}</Text>
          </Section>
        ) : null}

        {content.skills.length > 0 ? (
          <Section title="Key Skills">
            <Text style={styles.skillsRow}>{content.skills.join("  •  ")}</Text>
          </Section>
        ) : null}

        {content.experience.length > 0 ? (
          <Section title="Professional Experience">
            {content.experience.map((exp, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryTitle}>
                    {exp.jobTitle}
                    {exp.employer ? `, ${exp.employer}` : ""}
                  </Text>
                  {exp.dateRange ? <Text style={styles.entryDate}>{exp.dateRange}</Text> : null}
                </View>
                {exp.bullets.map((b, j) => (
                  <Bullet key={j} text={b} />
                ))}
              </View>
            ))}
          </Section>
        ) : null}

        {content.education.length > 0 ? (
          <Section title="Education">
            {content.education.map((ed, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryTitle}>{ed.qualification}</Text>
                  {ed.date ? <Text style={styles.entryDate}>{ed.date}</Text> : null}
                </View>
                <Text style={styles.entrySubtitle}>{ed.institution}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        {content.certifications.length > 0 ? (
          <Section title="Certifications">
            {content.certifications.map((c, i) => (
              <Bullet key={i} text={c} />
            ))}
          </Section>
        ) : null}

        {content.additionalInfo.length > 0 ? (
          <Section title="Additional Information">
            <Text style={styles.paragraph}>{content.additionalInfo.join("  •  ")}</Text>
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}

export async function renderCvPdf(content: CvContent): Promise<Buffer> {
  return renderToBuffer(<CvPdfDocument content={content} />);
}
