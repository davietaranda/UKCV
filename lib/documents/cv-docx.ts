import "server-only";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { CvContent } from "@/lib/documents/cv-content";

const DARK = "1A1A1A";
const GREY = "4B5563";

function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: DARK, space: 4 },
    },
    children: [
      new TextRun({ text: title.toUpperCase(), bold: true, size: 20, color: DARK }),
    ],
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 21, color: DARK })],
  });
}

export async function renderCvDocx(content: CvContent): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: content.name, bold: true, size: 40, color: DARK })],
    }),
  ];

  if (content.contactParts.length > 0) {
    children.push(
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({ text: content.contactParts.join("  |  "), size: 19, color: GREY }),
        ],
      })
    );
  }

  if (content.profile) {
    children.push(
      sectionHeading("Professional Profile"),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: content.profile, size: 21, color: DARK })],
      })
    );
  }

  if (content.skills.length > 0) {
    children.push(
      sectionHeading("Key Skills"),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: content.skills.join("  •  "), size: 21, color: DARK })],
      })
    );
  }

  if (content.experience.length > 0) {
    children.push(sectionHeading("Professional Experience"));
    for (const exp of content.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 20 },
          alignment: AlignmentType.LEFT,
          tabStops: [{ type: "right", position: 9350 }],
          children: [
            new TextRun({
              text: `${exp.jobTitle}${exp.employer ? `, ${exp.employer}` : ""}`,
              bold: true,
              size: 21,
              color: DARK,
            }),
            ...(exp.dateRange
              ? [new TextRun({ text: `\t${exp.dateRange}`, size: 19, color: GREY })]
              : []),
          ],
        })
      );
      for (const bullet of exp.bullets) {
        children.push(bulletParagraph(bullet));
      }
    }
  }

  if (content.education.length > 0) {
    children.push(sectionHeading("Education"));
    for (const ed of content.education) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 0 },
          tabStops: [{ type: "right", position: 9350 }],
          children: [
            new TextRun({ text: ed.qualification, bold: true, size: 21, color: DARK }),
            ...(ed.date ? [new TextRun({ text: `\t${ed.date}`, size: 19, color: GREY })] : []),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: ed.institution, size: 21, color: DARK })],
        })
      );
    }
  }

  if (content.certifications.length > 0) {
    children.push(sectionHeading("Certifications"));
    for (const cert of content.certifications) {
      children.push(bulletParagraph(cert));
    }
  }

  if (content.additionalInfo.length > 0) {
    children.push(
      sectionHeading("Additional Information"),
      new Paragraph({
        children: [
          new TextRun({ text: content.additionalInfo.join("  •  "), size: 21, color: DARK }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
