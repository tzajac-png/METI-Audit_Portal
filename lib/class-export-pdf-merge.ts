import {
  METI_LOGO_RED_RGB,
  metiRedRgbTuple,
  metiRedTintRgbTuple,
} from "@/lib/meti-export-brand";
import { sanitizeForPdfStandardFont } from "@/lib/pdf-text-safe";

function safeInputForPdf(input: ClassExportMergeInput): ClassExportMergeInput {
  return {
    programTitle: sanitizeForPdfStandardFont(input.programTitle),
    courseCode: sanitizeForPdfStandardFont(input.courseCode),
    courseDocumentUrl: input.courseDocumentUrl,
    dateLabel: sanitizeForPdfStandardFont(input.dateLabel),
    leadInstructor: sanitizeForPdfStandardFont(input.leadInstructor),
    location: sanitizeForPdfStandardFont(input.location),
    students: input.students.map((s) => ({
      name: sanitizeForPdfStandardFont(s.name),
      email: sanitizeForPdfStandardFont(s.email),
      classDate: sanitizeForPdfStandardFont(s.classDate),
      score: sanitizeForPdfStandardFont(s.score),
      phone: sanitizeForPdfStandardFont(s.phone),
    })),
  };
}

export type ClassExportStudentRow = {
  name: string;
  email: string;
  classDate: string;
  score: string;
  phone: string;
};

export type ClassExportMergeInput = {
  programTitle: string;
  courseCode: string;
  courseDocumentUrl: string | null;
  dateLabel: string;
  leadInstructor: string;
  location: string;
  students: ClassExportStudentRow[];
};

const LETTER = { w: 612, h: 792 } as const;

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function fetchLogoPngBytes(): Promise<Uint8Array | null> {
  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    const res = await fetch(`${base}/images/meti-class-export-logo.png`, {
      cache: "force-cache",
    });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function fetchCoursePdfBytesForExport(
  url: string | null,
): Promise<Uint8Array | null> {
  const u = url?.trim();
  if (!u) return null;
  try {
    const res = await fetch("/api/course-document-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: u }),
    });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function buildRosterPdfBytes(
  input: ClassExportMergeInput,
  redTuple: [number, number, number],
): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const textW = pageW - margin * 2;
  const BLACK: [number, number, number] = [18, 18, 22];
  const GRAY: [number, number, number] = [88, 88, 92];

  let y = margin;

  doc.setDrawColor(...redTuple);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  doc.setTextColor(...redTuple);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Student roster", margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${input.programTitle} - ${input.courseCode} - ${input.students.length} student${input.students.length === 1 ? "" : "s"}`,
    margin,
    y,
  );
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Name", "Email", "Class date", "Score", "Phone"]],
    body:
      input.students.length > 0
        ? input.students.map((s) => [
            s.name,
            s.email,
            s.classDate,
            s.score,
            s.phone,
          ])
        : [
            [
              "—",
              "No student sign-ups matched this course code yet.",
              "",
              "",
              "",
            ],
          ],
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: BLACK,
      lineColor: BLACK,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: redTuple,
      textColor: 255,
      fontStyle: "bold",
      lineColor: BLACK,
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: [252, 252, 252] },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 52 },
    },
  });

  const docExt = doc as typeof doc & { lastAutoTable?: { finalY: number } };
  let footY = (docExt.lastAutoTable?.finalY ?? y) + 10;
  const pageH = doc.internal.pageSize.getHeight();
  if (footY > pageH - 28) {
    doc.addPage();
    footY = margin;
  }
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const foot2 = doc.splitTextToSize(
    "Roster reflects METI portal data at export time. The course packet begins on page 1 of this file when embedded successfully.",
    textW,
  );
  doc.text(foot2, margin, footY);

  return new Uint8Array(doc.output("arraybuffer"));
}

export async function buildClassExportMergedPdf(
  input: ClassExportMergeInput,
): Promise<Uint8Array> {
  const safe = safeInputForPdf(input);

  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

  const redRgb = rgb(
    METI_LOGO_RED_RGB.r / 255,
    METI_LOGO_RED_RGB.g / 255,
    METI_LOGO_RED_RGB.b / 255,
  );
  const tint = metiRedTintRgbTuple();
  const tintRgb = rgb(tint[0] / 255, tint[1] / 255, tint[2] / 255);
  const blackRgb = rgb(0.07, 0.07, 0.09);
  const grayRgb = rgb(0.35, 0.35, 0.36);
  const redTuple = metiRedRgbTuple();

  const coursePdfBytes = await fetchCoursePdfBytesForExport(
    safe.courseDocumentUrl ?? null,
  );

  const merged = await PDFDocument.create();
  const pageW = LETTER.w;
  const pageH = LETTER.h;
  const margin = 48;
  const innerW = pageW - 2 * margin;
  const maxChars = Math.floor(innerW / 5.2);

  const page = merged.addPage([pageW, pageH]);
  const helv = await merged.embedFont(StandardFonts.Helvetica);
  const helvBold = await merged.embedFont(StandardFonts.HelveticaBold);

  const logoBytes = await fetchLogoPngBytes();
  let headerBottomFromTop = margin;

  if (logoBytes) {
    try {
      const logo = await merged.embedPng(logoBytes);
      const logoH = 52;
      const scale = logoH / logo.height;
      const logoW = logo.width * scale;
      const xRight = pageW - margin - logoW;
      const yBottom = pageH - margin - logoH;
      page.drawImage(logo, {
        x: xRight,
        y: yBottom,
        width: logoW,
        height: logoH,
      });
      headerBottomFromTop = Math.max(headerBottomFromTop, margin + logoH + 10);
    } catch {
      /* PNG incompatible with pdf-lib — fall through to text mark */
    }
  }
  if (headerBottomFromTop === margin) {
    page.drawText(sanitizeForPdfStandardFont("METI"), {
      x: pageW - margin - 72,
      y: pageH - margin - 14,
      size: 14,
      font: helvBold,
      color: redRgb,
    });
    page.drawText(sanitizeForPdfStandardFont("Michigan Emergency Training Institute"), {
      x: pageW - margin - 140,
      y: pageH - margin - 6,
      size: 7,
      font: helv,
      color: blackRgb,
    });
    headerBottomFromTop = margin + 36;
  }


  const lineY = pageH - headerBottomFromTop;
  page.drawLine({
    start: { x: margin, y: lineY },
    end: { x: pageW - margin, y: lineY },
    thickness: 1.2,
    color: redRgb,
  });

  let dTop = headerBottomFromTop + 8;
  const drawLine = (
    txt: string,
    size: number,
    bold: boolean,
    color = blackRgb,
  ) => {
    const yPdf = pageH - dTop - size;
    page.drawText(sanitizeForPdfStandardFont(txt), {
      x: margin,
      y: yPdf,
      size,
      font: bold ? helvBold : helv,
      color,
    });
    dTop += size + 6;
  };

  drawLine("Course documents", 15, true, redRgb);

  for (const ln of wrapLines(
    "Course packet appears below when we can download a PDF from your link. The original file is also available at the URL in the box.",
    maxChars,
  )) {
    drawLine(ln, 9.5, false, blackRgb);
  }

  drawLine("Class", 10, true, blackRgb);
  drawLine(`Program: ${safe.programTitle}`, 9.5, false, blackRgb);
  drawLine(`Course code: ${safe.courseCode}`, 9.5, false, blackRgb);
  drawLine(`Date: ${safe.dateLabel}`, 9.5, false, blackRgb);
  drawLine(`Lead instructor: ${safe.leadInstructor}`, 9.5, false, blackRgb);
  for (const ln of wrapLines(`Location: ${safe.location}`, maxChars)) {
    drawLine(ln, 9.5, false, blackRgb);
  }

  dTop += 4;
  const boxTopFromTop = dTop;
  const url = safe.courseDocumentUrl?.trim();

  if (url) {
    const urlLines = wrapLines(sanitizeForPdfStandardFont(url), maxChars - 4);
    const boxH = 26 + urlLines.length * 10;
    const boxY = pageH - boxTopFromTop - boxH;
    page.drawRectangle({
      x: margin,
      y: boxY,
      width: innerW,
      height: boxH,
      borderColor: redRgb,
      borderWidth: 1,
      color: tintRgb,
    });
    let ty = boxY + boxH - 14;
    page.drawText(sanitizeForPdfStandardFont("Course packet link"), {
      x: margin + 8,
      y: ty,
      size: 10,
      font: helvBold,
      color: redRgb,
    });
    ty -= 12;
    page.drawText(
      sanitizeForPdfStandardFont(
        "Open this URL in your browser if the embedded page does not load:",
      ),
      {
        x: margin + 8,
        y: ty,
        size: 8.5,
        font: helv,
        color: blackRgb,
      },
    );
    ty -= 11;
    for (const ul of urlLines) {
      page.drawText(sanitizeForPdfStandardFont(ul), {
        x: margin + 8,
        y: ty,
        size: 7,
        font: helv,
        color: blackRgb,
      });
      ty -= 9;
    }
    dTop = boxTopFromTop + boxH + 12;
  } else {
    drawLine(
      "No course document link on file for this class.",
      9.5,
      false,
      grayRgb,
    );
    dTop += 4;
  }

  const footerReserve = 72;
  const embedBottomFromTop = pageH - footerReserve;
  const embedGap = 8;
  let embedTopFromTop = dTop + embedGap;
  let embedAvailable = embedBottomFromTop - embedTopFromTop;

  if (embedAvailable < 120) {
    embedTopFromTop = Math.max(
      headerBottomFromTop + 140,
      pageH - footerReserve - 280,
    );
    embedAvailable = embedBottomFromTop - embedTopFromTop;
  }

  if (coursePdfBytes && embedAvailable > 80) {
    try {
      const donor = await PDFDocument.load(coursePdfBytes);
      const donorCount = donor.getPageCount();
      const p0 = donor.getPage(0);
      const iw = p0.getWidth();
      const ih = p0.getHeight();
      const [ep] = await merged.embedPdf(coursePdfBytes, [0]);
      const boxW = innerW;
      const boxPdfH = embedAvailable;
      const scale = Math.min(boxW / iw, boxPdfH / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const ox = margin + (boxW - dw) / 2;
      const oy = pageH - embedTopFromTop - dh;
      page.drawPage(ep, { x: ox, y: oy, width: dw, height: dh });

      for (let i = 1; i < donorCount; i++) {
        const [cp] = await merged.copyPages(donor, [i]);
        merged.addPage(cp);
      }
    } catch {
      const oy = pageH - embedTopFromTop - 40;
      page.drawText(
        sanitizeForPdfStandardFont(
          "Could not embed the course PDF (open the link above).",
        ),
        {
          x: margin,
          y: oy,
          size: 9,
          font: helv,
          color: grayRgb,
        },
      );
    }
  } else if (url && !coursePdfBytes) {
    const oy = pageH - embedTopFromTop - 24;
    page.drawText(
      sanitizeForPdfStandardFont(
        "Course link did not return a PDF for embedding (permissions or format). Use the URL in the box above.",
      ),
      {
        x: margin,
        y: oy,
        size: 9,
        font: helv,
        color: grayRgb,
      },
    );
  }

  const footLines = wrapLines(
    sanitizeForPdfStandardFont(
      `Exported ${new Date().toLocaleString()} - Page 1: METI cover and course packet when available. Student roster follows.`,
    ),
    maxChars + 10,
  );
  let fy = 22;
  for (const fl of footLines) {
    page.drawText(sanitizeForPdfStandardFont(fl), {
      x: margin,
      y: fy,
      size: 7.5,
      font: helv,
      color: grayRgb,
    });
    fy += 9;
  }

  const rosterBytes = await buildRosterPdfBytes(safe, redTuple);
  try {
    const rosterDoc = await PDFDocument.load(rosterBytes, {
      ignoreEncryption: true,
    });
    const rIdx = rosterDoc.getPageIndices();
    const rCopied = await merged.copyPages(rosterDoc, rIdx);
    for (const p of rCopied) {
      merged.addPage(p);
    }
  } catch {
    const fall = merged.addPage([pageW, pageH]);
    fall.drawText(
      sanitizeForPdfStandardFont(
        "The roster table could not be attached. Export again or copy roster from the course page.",
      ),
      {
        x: margin,
        y: pageH - margin - 40,
        size: 11,
        font: helv,
        color: grayRgb,
      },
    );
  }

  const total = merged.getPageCount();
  for (let i = 0; i < total; i++) {
    const pg = merged.getPage(i);
    const label = `Page ${i + 1} of ${total}`;
    const w = helv.widthOfTextAtSize(label, 8);
    pg.drawText(sanitizeForPdfStandardFont(label), {
      x: pageW - margin - w,
      y: 20,
      size: 8,
      font: helv,
      color: grayRgb,
    });
  }

  return merged.save();
}
