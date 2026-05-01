import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { type PDFFont, PDFDocument, rgb, StandardFonts } from "pdf-lib";
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
    students: (input.students ?? []).map((s) => ({
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

/** IHDR width/height for PDF layout when embedding the same bytes in jsPDF. */
function readPngDimensions(bytes: Uint8Array): { w: number; h: number } | null {
  if (bytes.length < 32) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== sig[i]) return null;
  }
  const w =
    (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const h =
    (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1 || h > 16000) {
    return null;
  }
  return { w, h };
}

function wrapLinesToPdfWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const safe = sanitizeForPdfStandardFont(text);
  const words = safe.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  if (maxWidth < 24) {
    return wrapLines(safe, Math.max(8, Math.floor(maxWidth / 4)));
  }

  const lines: string[] = [];
  let line = "";
  const pushLine = () => {
    if (line) lines.push(line);
    line = "";
  };

  const breakLongWord = (word: string) => {
    let acc = "";
    for (const ch of word) {
      const next = acc + ch;
      if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) acc = next;
      else {
        if (acc) {
          lines.push(acc);
          acc = ch;
        } else {
          lines.push(ch);
          acc = "";
        }
      }
    }
    line = acc;
  };

  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(trial, fontSize) <= maxWidth) {
      line = trial;
    } else {
      pushLine();
      if (font.widthOfTextAtSize(w, fontSize) <= maxWidth) line = w;
      else breakLongWord(w);
    }
  }
  pushLine();
  return lines.length ? lines : [""];
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) {
      cur = next;
      continue;
    }
    if (cur) lines.push(cur);
    if (w.length <= maxChars) {
      cur = w;
    } else {
      let rest = w;
      while (rest.length > maxChars) {
        lines.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
      cur = rest;
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
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const logoBytesRoster = await fetchLogoPngBytes();

  let logoRw = 0;
  let logoRh = 0;
  if (logoBytesRoster?.length) {
    const dim = readPngDimensions(logoBytesRoster);
    const maxLw = 115;
    const maxLh = 44;
    if (dim) {
      const sc = Math.min(maxLw / dim.w, maxLh / dim.h);
      logoRw = dim.w * sc;
      logoRh = dim.h * sc;
    } else {
      logoRw = maxLw;
      logoRh = maxLh * 0.48;
    }
  }

  const headerTextW = Math.max(
    72,
    pageW - margin * 2 - (logoRw > 0 ? logoRw + 10 : 0),
  );
  const BLACK: [number, number, number] = [18, 18, 22];
  const GRAY: [number, number, number] = [88, 88, 92];

  let y = margin;

  doc.setDrawColor(...redTuple);
  doc.setLineWidth(0.6);
  const lineEndX = logoRw > 0 ? pageW - margin - logoRw - 8 : pageW - margin;
  doc.line(margin, y, lineEndX, y);
  y += 10;

  doc.setTextColor(...redTuple);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Student roster", margin, y, { maxWidth: headerTextW });
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "normal");
  const subtitle = `${input.programTitle} - ${input.courseCode} - ${input.students.length} student${input.students.length === 1 ? "" : "s"}`;
  const subLines = doc.splitTextToSize(subtitle, headerTextW);
  doc.text(subLines, margin, y);
  y += Math.max(10, 5 * subLines.length + 3);

  const tableTotalW = pageW - margin * 2;

  autoTable(doc, {
    startY: y,
    head: [["Name", "Email", "Class date", "Score", "Phone"]],
    tableWidth: tableTotalW,
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
              "-",
              "No student sign-ups matched this course code yet.",
              "",
              "",
              "",
            ],
          ],
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: BLACK,
      lineColor: BLACK,
      lineWidth: 0.15,
      overflow: "linebreak",
      valign: "top",
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
      0: { cellWidth: 30 },
      1: { cellWidth: 52 },
      2: { cellWidth: 26 },
      3: { cellWidth: 18 },
      4: { cellWidth: "auto" },
    },
    willDrawPage: () => {
      if (!logoBytesRoster?.length || logoRw <= 0) return;
      try {
        doc.addImage(
          logoBytesRoster,
          "PNG",
          pageW - margin - logoRw,
          margin,
          logoRw,
          logoRh,
        );
      } catch {
        /* invalid image for jsPDF */
      }
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
  const footNoteW = pageW - margin * 2;
  const foot2 = doc.splitTextToSize(
    "Roster reflects METI portal data at export time. The course packet begins on page 1 of this file when embedded successfully.",
    footNoteW,
  );
  doc.text(foot2, margin, footY);

  return new Uint8Array(doc.output("arraybuffer"));
}

export async function buildClassExportMergedPdf(
  input: ClassExportMergeInput,
): Promise<Uint8Array> {
  const safe = safeInputForPdf(input);

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

  const page = merged.addPage([pageW, pageH]);
  const helv = await merged.embedFont(StandardFonts.Helvetica);
  const helvBold = await merged.embedFont(StandardFonts.HelveticaBold);

  const logoBytes = await fetchLogoPngBytes();
  let headerBottomFromTop = margin;
  let logoWDrawn = 0;
  let logoHDrawn = 0;

  if (logoBytes) {
    try {
      const logo = await merged.embedPng(logoBytes);
      const maxLogoW = Math.min(248, innerW * 0.62);
      const maxLogoH = 66;
      const scale = Math.min(maxLogoW / logo.width, maxLogoH / logo.height);
      logoWDrawn = logo.width * scale;
      logoHDrawn = logo.height * scale;
      const xRight = pageW - margin - logoWDrawn;
      const yBottom = pageH - margin - logoHDrawn;
      page.drawImage(logo, {
        x: xRight,
        y: yBottom,
        width: logoWDrawn,
        height: logoHDrawn,
      });
      headerBottomFromTop = Math.max(
        headerBottomFromTop,
        margin + logoHDrawn + 14,
      );
    } catch {
      logoWDrawn = 0;
      logoHDrawn = 0;
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

  const textRight =
    pageW - margin - (logoWDrawn > 0 ? logoWDrawn + 18 : 0);
  const textAreaW = Math.max(176, textRight - margin);
  const lineEndX = logoWDrawn > 0 ? textRight : pageW - margin;

  const lineY = pageH - headerBottomFromTop;
  page.drawLine({
    start: { x: margin, y: lineY },
    end: { x: lineEndX, y: lineY },
    thickness: 1.2,
    color: redRgb,
  });

  let dTop = headerBottomFromTop + 8;

  const drawParagraph = (
    txt: string,
    size: number,
    bold: boolean,
    color = blackRgb,
  ) => {
    const font = bold ? helvBold : helv;
    const lines = wrapLinesToPdfWidth(txt, font, size, textAreaW);
    for (let i = 0; i < lines.length; i++) {
      const yPdf = pageH - dTop - size;
      page.drawText(sanitizeForPdfStandardFont(lines[i]), {
        x: margin,
        y: yPdf,
        size,
        font,
        color,
      });
      dTop += size + (i < lines.length - 1 ? 3.5 : 6);
    }
  };

  drawParagraph("Course documents", 15, true, redRgb);

  drawParagraph(
    "Course packet appears below when we can download a PDF from your link. The original file is also available at the URL in the box.",
    9.5,
    false,
    blackRgb,
  );

  drawParagraph("Class", 10, true, blackRgb);
  drawParagraph(`Program: ${safe.programTitle}`, 9.5, false, blackRgb);
  drawParagraph(`Course code: ${safe.courseCode}`, 9.5, false, blackRgb);
  drawParagraph(`Date: ${safe.dateLabel}`, 9.5, false, blackRgb);
  drawParagraph(`Lead instructor: ${safe.leadInstructor}`, 9.5, false, blackRgb);
  drawParagraph(`Location: ${safe.location}`, 9.5, false, blackRgb);

  dTop += 4;
  const boxTopFromTop = dTop;
  const url = safe.courseDocumentUrl?.trim();

  if (url) {
    const boxPad = 8;
    const innerBoxW = textAreaW - 2 * boxPad;
    const urlLines = wrapLinesToPdfWidth(
      sanitizeForPdfStandardFont(url),
      helv,
      7,
      Math.max(80, innerBoxW - 4),
    );
    const hintLines = wrapLinesToPdfWidth(
      "Open this URL in your browser if the embedded page does not load:",
      helv,
      8.5,
      Math.max(80, innerBoxW - 4),
    );
    const boxH =
      20 +
      12 +
      hintLines.length * 9.5 +
      6 +
      urlLines.length * 9 +
      12;
    const boxY = pageH - boxTopFromTop - boxH;
    page.drawRectangle({
      x: margin,
      y: boxY,
      width: textAreaW,
      height: boxH,
      borderColor: redRgb,
      borderWidth: 1,
      color: tintRgb,
    });
    let ty = boxY + boxH - 14;
    page.drawText(sanitizeForPdfStandardFont("Course packet link"), {
      x: margin + boxPad,
      y: ty,
      size: 10,
      font: helvBold,
      color: redRgb,
    });
    ty -= 12;
    for (const hl of hintLines) {
      page.drawText(sanitizeForPdfStandardFont(hl), {
        x: margin + boxPad,
        y: ty,
        size: 8.5,
        font: helv,
        color: blackRgb,
      });
      ty -= 9.5;
    }
    ty -= 2;
    for (const ul of urlLines) {
      page.drawText(sanitizeForPdfStandardFont(ul), {
        x: margin + boxPad,
        y: ty,
        size: 7,
        font: helv,
        color: blackRgb,
      });
      ty -= 9;
    }
    dTop = boxTopFromTop + boxH + 12;
  } else {
    drawParagraph(
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
      const boxW = textAreaW;
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
      const failLines = wrapLinesToPdfWidth(
        "Could not embed the course PDF (open the link above).",
        helv,
        9,
        textAreaW,
      );
      let oyCur = oy;
      for (const fl of failLines) {
        page.drawText(sanitizeForPdfStandardFont(fl), {
          x: margin,
          y: oyCur,
          size: 9,
          font: helv,
          color: grayRgb,
        });
        oyCur -= 11;
      }
    }
  } else if (url && !coursePdfBytes) {
    const oy = pageH - embedTopFromTop - 24;
    const msgLines = wrapLinesToPdfWidth(
      "Course link did not return a PDF for embedding (permissions or format). Use the URL in the box above.",
      helv,
      9,
      textAreaW,
    );
    let oyCur = oy;
    for (const ml of msgLines) {
      page.drawText(sanitizeForPdfStandardFont(ml), {
        x: margin,
        y: oyCur,
        size: 9,
        font: helv,
        color: grayRgb,
      });
      oyCur -= 11;
    }
  }

  const footLines = wrapLinesToPdfWidth(
    sanitizeForPdfStandardFont(
      `Exported ${new Date().toLocaleString()} - Page 1: METI cover and course packet when available. Student roster follows.`,
    ),
    helv,
    7.5,
    textAreaW,
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

  let rosterBytes: Uint8Array | null = null;
  try {
    rosterBytes = await buildRosterPdfBytes(safe, redTuple);
  } catch (err) {
    console.error("class PDF export: roster generation failed", err);
  }

  if (rosterBytes && rosterBytes.length > 0) {
    try {
      const rosterDoc = await PDFDocument.load(rosterBytes, {
        ignoreEncryption: true,
      });
      const rIdx = rosterDoc.getPageIndices();
      const rCopied = await merged.copyPages(rosterDoc, rIdx);
      for (const p of rCopied) {
        merged.addPage(p);
      }
    } catch (err) {
      console.error("class PDF export: roster merge failed", err);
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
  } else {
    const fall = merged.addPage([pageW, pageH]);
    fall.drawText(
      sanitizeForPdfStandardFont(
        "Student roster could not be generated. Cover and course pages above are still included.",
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

  return merged.save({
    updateFieldAppearances: false,
    addDefaultPage: false,
  });
}
