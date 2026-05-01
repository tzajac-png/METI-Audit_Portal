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

function safePdfSlug(s: string): string {
  const t = s.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
  return t.length > 0 ? t.slice(0, 72) : "class";
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
      const margin = 14;
      const textW = pageW - margin * 2;
      let y = 18;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`Class export — ${programTitle}`, margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
      y += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Course", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.text(`Code: ${courseCode}`, margin, y);
      y += 6;
      doc.text(`Date: ${dateLabel}`, margin, y);
      y += 6;
      doc.text(`Lead instructor: ${leadInstructor}`, margin, y);
      y += 6;
      const locLines = doc.splitTextToSize(`Location: ${location}`, textW);
      doc.text(locLines, margin, y);
      y += locLines.length * 5 + 8;

      if (courseDocumentUrl?.trim()) {
        const url = courseDocumentUrl.trim();
        doc.setFont("helvetica", "bold");
        doc.text("Course documents", margin, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        doc.textWithLink("Open course documents (clickable)", margin, y, {
          url,
        });
        y += 6;
        doc.setFontSize(8);
        const urlLines = doc.splitTextToSize(url, textW);
        doc.text(urlLines, margin, y);
        y += urlLines.length * 4 + 6;
        doc.setFontSize(11);
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.text("No course document link on file for this class.", margin, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
      }

      const tableStart = Math.min(y, 250);
      autoTable(doc, {
        startY: tableStart,
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
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [60, 15, 15],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        tableLineColor: [40, 40, 40],
        tableLineWidth: 0.1,
      });

      const docExt = doc as typeof doc & {
        lastAutoTable?: { finalY: number };
      };
      let footY = (docExt.lastAutoTable?.finalY ?? tableStart) + 8;
      const pageH = doc.internal.pageSize.getHeight();
      if (footY > pageH - 24) {
        doc.addPage();
        footY = 18;
      }
      doc.setFontSize(8);
      doc.setTextColor(90);
      doc.setFont("helvetica", "normal");
      const foot = doc.splitTextToSize(
        "Course packet files are not embedded in this PDF. Use the course documents link above to open the original file. Student roster reflects portal data at export time.",
        textW,
      );
      doc.text(foot, margin, footY);
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
