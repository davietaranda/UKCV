import "server-only";

import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.5,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 24,
  },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    marginBottom: 4,
  },
  contactLine: {
    fontSize: 9.5,
    color: "#4b5563",
  },
  date: {
    marginTop: 16,
    marginBottom: 16,
    fontSize: 10.5,
  },
  paragraph: {
    marginBottom: 12,
  },
});

export interface CoverLetterPdfProps {
  name: string;
  contactParts: string[];
  date: string;
  paragraphs: string[];
}

export function CoverLetterPdfDocument({ name, contactParts, date, paragraphs }: CoverLetterPdfProps) {
  return (
    <Document title={`${name} - Cover Letter`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{name}</Text>
          {contactParts.length > 0 ? (
            <Text style={styles.contactLine}>{contactParts.join("  |  ")}</Text>
          ) : null}
        </View>
        <Text style={styles.date}>{date}</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

export async function renderCoverLetterPdf(props: CoverLetterPdfProps): Promise<Buffer> {
  return renderToBuffer(<CoverLetterPdfDocument {...props} />);
}
