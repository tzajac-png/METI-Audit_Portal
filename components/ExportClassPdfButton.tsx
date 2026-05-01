"use client";

import { useCallback, useState } from "react";

export type ExportClassPdfStudentRow = {
  name: string;
  email: string;
  classDate: string;
  score: string;
  phone: string;
};

type Props = {
  programTitle: string;
  courseCode: string;
  courseDocumentUrl: string | null;
  dateLabel: string;
  leadInstructor: string;
  location: string;
  students: ExportClassPdfStudentRow[];
};

/** METI-style palette for PDF (red / black on white). */
const RED: [number, number, number] = [165, 28, 42];
const BLACK: [number, number, number] = [18, 18, 22];
const RED_TINT: [number, number, number] = [255, 240, 242];
const GRAY: [number, number, number] = [88, 88, 92];

const LOGO_PUBLIC_PATH = "/images/meti-class-export-logo.png";

function safePdfSlug(s: string): string {
  const t = s.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
  return t.length > 0 ? t.slice(0, 72) : "class";
}

async function fetchLogoAsDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_PUBLIC_PATH, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error("read logo"));
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function naturalSize(
  dataUrl: string,
): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export function ExportClassPdfButton({
  programTitle,
  courseCode,
  courseDocumentUrl,
  dateLabel,
  leadInstructor,
  location,
  students,
}: Props) {
  const [busy, setBusy] = useState(false);

  const onExport = useCallback(async () => {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 16;
      const textW = pageW - margin * 2;

      const logoDataUrl = await fetchLogoAsDataUrl();

      const drawLogo = async (
        yStart: number,
        maxWidthMm: number,
      ): Promise<number> => {
        let y = yStart;
        if (logoDataUrl) {
          const dim = await naturalSize(logoDataUrl);
          if (dim && dim.w > 0 && dim.h > 0) {
            const w = Math.min(maxWidthMm, textW);
            const h = (w * dim.h) / dim.w;
            doc.addImage(logoDataUrl, "PNG", margin, y, w, h);
            y += h + 5;
            return y;
          }
        }
        doc.setTextColor(...RED);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("METI", margin, y + 5);
        doc.setFontSize(8);
        doc.setTextColor(...BLACK);
        doc.text("Michigan Emergency Training Institute", margin, y + 11);
        y += 16;
        return y;
      };

      // ----- Page 1: Course documents -----
      let y = margin;
      y = await drawLogo(y, 95);

      doc.setDrawColor(...RED);
      doc.setLineWidth(0.6);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      doc.setTextColor(...RED);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("Course documents", margin, y);
      y += 9;

      doc.setTextColor(...BLACK);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Open the official course packet using the link below. This page is for reference; the file itself is not embedded.",
        margin,
        y,
      );
      y += 12;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Class", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(`Program: ${programTitle}`, margin, y);
      y += 5;
      doc.text(`Course code: ${courseCode}`, margin, y);
      y += 5;
      doc.text(`Date: ${dateLabel}`, margin, y);
      y += 5;
      doc.text(`Lead instructor: ${leadInstructor}`, margin, y);
      y += 5;
      const locLines = doc.splitTextToSize(`Location: ${location}`, textW);
      doc.text(locLines, margin, y);
      y += locLines.length * 5 + 10;

      if (courseDocumentUrl?.trim()) {
        const url = courseDocumentUrl.trim();
        const boxTop = y;
        const pad = 4;
        const innerW = textW - pad * 2;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        const titleH = 7;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const linkLineH = 7;
        doc.setFontSize(7.5);
        const urlLines = doc.splitTextToSize(url, innerW);
        const urlBlockH = urlLines.length * 4;
        const boxH = Math.max(32, titleH + linkLineH + urlBlockH + 18);
        doc.setFillColor(...RED_TINT);
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.25);
        doc.roundedRect(margin, boxTop - 4, textW, boxH, 2, 2, "FD");

        y = boxTop + 6;
        doc.setTextColor(...RED);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Course packet link", margin + pad, y);
        y += titleH;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.textWithLink("Open course documents (clickable)", margin + pad, y, {
          url,
        });
        y += linkLineH;
        doc.setFontSize(7.5);
        doc.setTextColor(...BLACK);
        doc.text(urlLines, margin + pad, y);
        y = boxTop + boxH + 10;
      } else {
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.2);
        doc.roundedRect(margin, y - 4, textW, 16, 2, 2, "FD");
        doc.setTextColor(...GRAY);
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text(
          "No course document link on file for this class in the roster.",
          margin + 4,
          y + 4,
        );
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        y += 22;
      }

      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      const p1Foot = doc.splitTextToSize(
        `Exported ${new Date().toLocaleString()} · Visit the link above for the full course PDF or Drive folder. The student roster is on the following page(s).`,
        textW,
      );
      doc.text(p1Foot, margin, pageH - 14);

      // ----- Page 2+: Student roster -----
      doc.addPage();
      y = margin;
      y = await drawLogo(y, 70);

      doc.setDrawColor(...RED);
      doc.setLineWidth(0.6);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      doc.setTextColor(...RED);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("Student roster", margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(...BLACK);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${programTitle} · ${courseCode} · ${students.length} student${students.length === 1 ? "" : "s"}`,
        margin,
        y,
      );
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [["Name", "Email", "Class date", "Score", "Phone"]],
        body:
          students.length > 0
            ? students.map((s) => [
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
          fillColor: RED,
          textColor: 255,
          fontStyle: "bold",
          lineColor: BLACK,
          lineWidth: 0.2,
        },
        alternateRowStyles: {
          fillColor: [252, 252, 252],
        },
        columnStyles: {
          0: { cellWidth: 36 },
          1: { cellWidth: 52 },
        },
      });

      const docExt = doc as typeof doc & {
        lastAutoTable?: { finalY: number };
      };
      let footY = (docExt.lastAutoTable?.finalY ?? y) + 10;
      if (footY > pageH - 28) {
        doc.addPage();
        footY = margin;
      }
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.setFont("helvetica", "normal");
      const foot2 = doc.splitTextToSize(
        "Roster reflects METI portal data at export time. For the course packet, use the link on page 1.",
        textW,
      );
      doc.text(foot2, margin, footY);

      const totalPages = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageW - margin,
          pageH - 10,
          { align: "right" },
        );
      }

      const fn = `${safePdfSlug(programTitle)}-${safePdfSlug(courseCode)}-export.pdf`;
      doc.save(fn);
    } catch (e) {
      console.error(e);
      alert(
        e instanceof Error
          ? `Could not create PDF: ${e.message}`
          : "Could not create PDF.",
      );
    } finally {
      setBusy(false);
    }
  }, [
    programTitle,
    courseCode,
    courseDocumentUrl,
    dateLabel,
    leadInstructor,
    location,
    students,
  ]);

  return (
    <button
      type="button"
      onClick={() => void onExport()}
      disabled={busy}
      className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-4 py-2 text-sm font-semibold text-emerald-100/95 transition hover:border-emerald-600/60 hover:bg-emerald-950/65 disabled:opacity-50"
    >
      {busy ? "Preparing PDF…" : "Export class PDF"}
    </button>
  );
}
